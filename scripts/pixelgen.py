#!/usr/bin/env python3
"""Quiet, reproducible PixelLab batch runner for docs/31_PIXEL_ART.md jobs."""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
import io
import json
import os
from pathlib import Path
import sys
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from PIL import Image
import pixellab


BASE_URL = "https://api.pixellab.ai/v2"
SYNC_ENDPOINTS = {
    "create-image-pixflux": "generate_image_pixflux",
    "create-image-pixen": "generate_image_pixen",
    "create-image-bitforge": "generate_image_bitforge",
}
ASYNC_ENDPOINTS = {
    "generate-image-v2",
    "map-objects",
    "create-character-with-8-directions",
    "create-character-v3",
    "generate-8-rotations-v3",
    "create-tileset",
}


class JobError(RuntimeError):
    pass


def safe_path(root: Path, value: str) -> Path:
    path = (root / value).resolve()
    if path != root and root not in path.parents:
        raise JobError(f"path leaves project root: {value}")
    return path


def image_data(path: Path, data_url: bool = False) -> dict[str, str]:
    image_format = "png" if path.suffix.lower() == ".png" else "jpeg"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    if data_url:
        encoded = f"data:image/{image_format};base64,{encoded}"
    return {"type": "base64", "base64": encoded, "format": image_format}


def decode_image(value: str) -> bytes | None:
    if value.startswith("data:image/") and "," in value:
        return base64.b64decode(value.split(",", 1)[1])
    if value.startswith("http://") or value.startswith("https://"):
        request = Request(value, headers={
            "Accept": "image/png,image/jpeg,image/*;q=0.9,*/*;q=0.1",
            "User-Agent": "PixelLab-pixelgen/1.0",
        })
        with urlopen(request, timeout=60) as response:
            return response.read()
    try:
        raw = base64.b64decode(value, validate=True)
        return raw if raw.startswith(b"\x89PNG") or raw.startswith(b"\xff\xd8") else None
    except (ValueError, base64.binascii.Error):
        return None


def collect_images(value: Any, label: str = "image") -> list[tuple[str, bytes]]:
    found: list[tuple[str, bytes]] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_label = key if key not in {"base64", "image", "image_data", "data_url"} else label
            if isinstance(child, str) and (key in {
                "base64", "image", "image_data", "data_url", "url", "image_url",
            } or key.endswith("_url") or label == "rotation_urls"):
                decoded = decode_image(child)
                if decoded:
                    found.append((child_label, decoded))
                    continue
            found.extend(collect_images(child, child_label))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(collect_images(child, f"{label}-{index + 1}"))
    return found


def request_json(
    method: str, url: str, client: pixellab.Client,
    payload: dict[str, Any] | None = None, timeout: int = 90,
) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    # The published SDK currently exposes the synchronous image endpoints but not
    # the v2 async map/character/tileset methods. Reuse its configured transport
    # identity and extend only those missing official endpoints here.
    request = Request(url, data=body, method=method, headers={
        # pixellab 1.0.5's auth_headers() calls a nonexistent access_token();
        # headers() is the SDK's secret-key Bearer header used by its own endpoints.
        **client.headers(),
        "Content-Type": "application/json",
        "Accept": "application/json",
    })
    try:
        with urlopen(request, timeout=timeout) as response:
            return json.load(response)
    except HTTPError as error:
        detail = error.read(2000).decode("utf-8", "replace")
        raise JobError(f"PixelLab HTTP {error.code}: {detail}") from error
    except URLError as error:
        raise JobError(f"PixelLab network error: {error.reason}") from error


def poll_job(job_id: str, client: pixellab.Client, timeout: int) -> dict[str, Any]:
    deadline = time.monotonic() + timeout
    delay = 3.0
    while time.monotonic() < deadline:
        response = request_json("GET", f"{BASE_URL}/background-jobs/{job_id}", client)
        status = str(response.get("status", "")).lower()
        if status in {"completed", "succeeded", "success"}:
            return response.get("last_response") or response
        if status in {"failed", "error", "cancelled", "canceled"}:
            last = response.get("last_response") or {}
            detail = last.get("error") or last.get("detail") or last.get("message")
            raise JobError(f"background job {job_id} {status}{f': {detail}' if detail else ''}")
        time.sleep(delay)
        delay = min(12.0, delay * 1.5)
    raise JobError(f"background job {job_id} timed out after {timeout}s")


def endpoint_result(
    endpoint: str, payload: dict[str, Any], client: pixellab.Client, timeout: int,
    receipt_path: Path | None = None,
) -> list[tuple[str, bytes]]:
    # The official 1.0.5 client still models the old USD-only usage response and
    # raises after successful current-generation calls return generation units.
    # Keep its supported secret/header configuration, but decode documented v2
    # responses ourselves for both synchronous and asynchronous endpoints.
    response = request_json(
        "POST", f"{BASE_URL}/{endpoint}", client, payload,
        timeout=timeout if endpoint in SYNC_ENDPOINTS else 90,
    )
    if receipt_path:
        receipt_path.parent.mkdir(parents=True, exist_ok=True)
        receipt_path.write_text(json.dumps({
            "endpoint": endpoint,
            **{key: value for key, value in response.items()
               if key.endswith("_id") or key == "status"},
        }, indent=2) + "\n", encoding="utf-8")
    if "background_job_id" in response:
        result = poll_job(str(response["background_job_id"]), client, timeout)
    else:
        result = response
    images = collect_images(result)
    if images:
        return images
    identifiers = {**response, **result}
    if receipt_path:
        receipt_path.write_text(json.dumps({
            "endpoint": endpoint, "status": "completed",
            **{key: value for key, value in identifiers.items() if key.endswith("_id")},
        }, indent=2) + "\n", encoding="utf-8")
    resource = None
    if endpoint == "create-tileset" and "tileset_id" in identifiers:
        resource = request_json("GET", f"{BASE_URL}/tilesets/{identifiers['tileset_id']}", client)
    elif "object_id" in identifiers:
        resource = request_json("GET", f"{BASE_URL}/map-objects/{identifiers['object_id']}", client)
    elif "character_id" in identifiers:
        resource = request_json("GET", f"{BASE_URL}/characters/{identifiers['character_id']}", client)
    if resource:
        images = collect_images(resource)
    return images


def recovered_resource_result(
    endpoint: str, resource_id: str, client: pixellab.Client,
) -> list[tuple[str, bytes]]:
    if endpoint == "create-tileset":
        resource = request_json("GET", f"{BASE_URL}/tilesets/{resource_id}", client)
    elif endpoint == "map-objects":
        resource = request_json("GET", f"{BASE_URL}/map-objects/{resource_id}", client)
    elif endpoint.startswith("create-character") or endpoint == "generate-8-rotations-v3":
        resource = request_json("GET", f"{BASE_URL}/characters/{resource_id}", client)
    else:
        raise JobError(f"{endpoint} does not expose a recoverable resource")
    return collect_images(resource)


def payload_for(request: dict[str, Any], root: Path, seed: int) -> dict[str, Any]:
    size = request.get("generation_size", request["size"])
    payload: dict[str, Any] = {
        "description": request["prompt"],
        "image_size": {"width": size[0], "height": size[1]},
        "seed": seed,
        **request.get("parameters", {}),
    }
    endpoint = request["endpoint"]
    if endpoint == "create-tileset":
        payload.pop("description")
        payload.pop("image_size")
        payload["tile_size"] = {"width": size[0], "height": size[1]}
    for reference in request.get("references", []):
        path = safe_path(root, reference["file"])
        parameter = reference.get("parameter", "style_image")
        # The current map-object worker still expects the legacy data-URL form,
        # while current Pixflux rejects that prefix and expects raw base64.
        payload[parameter] = image_data(path, data_url=endpoint == "map-objects")
    return payload


def validate_job(job: dict[str, Any], root: Path) -> None:
    if job.get("version") != 1 or not isinstance(job.get("requests"), list):
        raise JobError("job must have version 1 and a requests array")
    if job.get("status", "ready") not in {"ready", "staged"}:
        raise JobError("job status must be ready or staged")
    ids: set[str] = set()
    for request in job["requests"]:
        required = {"id", "assets", "prompt", "endpoint", "size", "candidates", "output"}
        missing = required - request.keys()
        if missing:
            raise JobError(f"request missing {', '.join(sorted(missing))}")
        if request["id"] in ids:
            raise JobError(f"duplicate request id {request['id']}")
        ids.add(request["id"])
        if not isinstance(request["assets"], list) or not request["assets"] \
                or not all(isinstance(value, str) and value for value in request["assets"]):
            raise JobError(f"{request['id']} must declare one or more asset ids")
        if request["endpoint"] not in set(SYNC_ENDPOINTS) | ASYNC_ENDPOINTS:
            raise JobError(f"unsupported endpoint {request['endpoint']}")
        variation_count = request.get("variations_from_single_request")
        single_variation_request = request["endpoint"] == "generate-image-v2" \
            and request["candidates"] == 1 \
            and isinstance(variation_count, int) and variation_count >= 2
        if not single_variation_request and not (2 <= request["candidates"] <= 3):
            raise JobError(
                f"{request['id']} must request 2 or 3 candidates, or declare one "
                "generate-image-v2 request with variations_from_single_request"
            )
        resource_ids = request.get("resource_ids")
        if resource_ids is not None and (not isinstance(resource_ids, list)
                or len(resource_ids) != request["candidates"]
                or not all(isinstance(value, str) and value for value in resource_ids)):
            raise JobError(f"{request['id']} resource_ids must match candidate count")
        if len(request["size"]) != 2 or any(not isinstance(value, int) or value <= 0 for value in request["size"]):
            raise JobError(f"{request['id']} has invalid size")
        safe_path(root, request["output"])
        for reference in request.get("references", []):
            path = safe_path(root, reference["file"])
            if not path.is_file() and not reference.get("deferred"):
                raise JobError(f"{request['id']} reference missing: {reference['file']}")


def save_candidate(
    data: bytes, path: Path, expected: tuple[int, int],
    repack_transparent_padding: bool = False,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(io.BytesIO(data)) as image:
        image.load()
        if image.size != expected:
            if not repack_transparent_padding:
                raise JobError(
                    f"returned image is {image.width}x{image.height}, "
                    f"expected {expected[0]}x{expected[1]}"
                )
            rgba = image.convert("RGBA")
            alpha_box = rgba.getchannel("A").getbbox()
            if not alpha_box:
                raise JobError("returned image has no visible pixels")
            visible = rgba.crop(alpha_box)
            if visible.width > expected[0] or visible.height > expected[1]:
                raise JobError(
                    f"visible pixels are {visible.width}x{visible.height}, "
                    f"cannot repack into {expected[0]}x{expected[1]} without scaling"
                )
            image = Image.new("RGBA", expected, (0, 0, 0, 0))
            left = (expected[0] - visible.width) // 2
            top = max(0, expected[1] - 4 - visible.height)
            image.alpha_composite(visible, (left, top))
        image.convert("RGBA").save(path, format="PNG")


def write_contact_sheet(path: Path, root: Path, rows: list[tuple[str, Path]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    cards = []
    for label, image_path in rows:
        relative = os.path.relpath(image_path, path.parent).replace(os.sep, "/")
        cards.append(
            f'<article><h2>{html.escape(label)}</h2><div class="light"><img src="{html.escape(relative)}"></div>'
            f'<div class="dark"><img src="{html.escape(relative)}"></div></article>'
        )
    document = """<!doctype html><meta charset=\"utf-8\"><title>PixelLab candidates</title>
<style>body{font:13px system-ui;background:#777;margin:20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}article{background:#222;color:#eee;padding:10px}h2{font-size:12px}.light,.dark{display:inline-grid;place-items:center;width:96px;height:96px;margin:4px}.light{background:#ddd}.dark{background:#182019}img{image-rendering:pixelated;max-width:192px;max-height:192px;transform:scale(2)}</style>
<main class=\"grid\">""" + "".join(cards) + "</main>"
    path.write_text(document, encoding="utf-8")


def run() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("job", type=Path)
    parser.add_argument("--check-auth", action="store_true",
                        help="verify that a PixelLab credential reaches pixelgen without making a request")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--recover", action="store_true",
                        help="fetch recorded resource_ids without submitting new generation")
    parser.add_argument("--only", action="append", default=[], metavar="REQUEST_ID",
                        help="run only the named request (repeatable)")
    parser.add_argument("--candidate", action="append", type=int, default=[], metavar="NUMBER",
                        help="run or recover only this one-based candidate (repeatable)")
    parser.add_argument("--timeout", type=int, default=900)
    args = parser.parse_args()
    root = Path.cwd().resolve()
    job_path = args.job.resolve()
    if args.check_auth:
        secret = os.environ.get("PIXELLAB_API_KEY") or os.environ.get("PIXELLAB_SECRET")
        if not secret:
            raise JobError("PIXELLAB_API_KEY or PIXELLAB_SECRET is not set")
        # Constructing the official client verifies the credential form without contacting PixelLab.
        pixellab.Client(secret=secret)
        print("ok PixelLab credential available to pixelgen")
        return 0
    if job_path.is_dir():
        if not args.dry_run:
            raise JobError("directory input is validation-only; submit one small batch at a time")
        paths = sorted(job_path.glob("*.json"))
        if not paths:
            raise JobError(f"no JSON jobs found in {job_path}")
        total = 0
        staged = 0
        for path in paths:
            catalog_job = json.loads(path.read_text(encoding="utf-8"))
            validate_job(catalog_job, root)
            total += len(catalog_job["requests"])
            staged += int(catalog_job.get("status") == "staged")
        print(f"ok catalog dry-run {len(paths)} jobs {total} requests {staged} staged")
        return 0
    job = json.loads(job_path.read_text(encoding="utf-8"))
    validate_job(job, root)
    selected_requests = [request for request in job["requests"]
                         if not args.only or request["id"] in args.only]
    missing_only = sorted(set(args.only) - {request["id"] for request in selected_requests})
    if missing_only:
        raise JobError(f"--only request not found: {', '.join(missing_only)}")
    if args.candidate and any(number < 1 or number > 3 for number in args.candidate):
        raise JobError("--candidate must be between 1 and 3")
    if args.dry_run:
        for request in selected_requests:
            status = " staged" if job.get("status") == "staged" else ""
            count = request.get("variations_from_single_request", request["candidates"])
            kind = "variations" if "variations_from_single_request" in request else "candidates"
            print(f"ok {request['id']} dry-run{status} {count} {kind} {request['size'][0]}x{request['size'][1]}")
        return 0

    if job.get("status") == "staged":
        reason = job.get("blocked_by", "a required prior batch")
        raise JobError(f"job is staged: {reason}")

    secret = os.environ.get("PIXELLAB_API_KEY") or os.environ.get("PIXELLAB_SECRET")
    if not secret:
        raise JobError("PIXELLAB_API_KEY or PIXELLAB_SECRET is not set")
    # The official client owns credential parsing and Bearer header construction;
    # request_json extends it over the current documented v2 response schemas.
    client = pixellab.Client(secret=secret)
    sheet = safe_path(root, job.get("contact_sheet", str(job_path.with_name(f"{job_path.stem}-candidates.html").relative_to(root))))
    sheet_rows: list[tuple[str, Path]] = []
    failed = False
    for request in selected_requests:
        try:
            expected = (request["size"][0], request["size"][1])
            candidate_dir = safe_path(root, request["output"])
            saved: list[Path] = []
            fingerprints: set[str] = set()
            for candidate in range(request["candidates"]):
                if args.candidate and candidate + 1 not in args.candidate:
                    continue
                receipt_path = candidate_dir / f"candidate-{candidate + 1}.receipt.json"
                if args.recover:
                    resource_ids = request.get("resource_ids")
                    if resource_ids:
                        resource_id = resource_ids[candidate]
                    elif receipt_path.is_file():
                        receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
                        if request["endpoint"] == "generate-image-v2" \
                                and receipt.get("background_job_id"):
                            result = poll_job(
                                str(receipt["background_job_id"]), client, args.timeout,
                            )
                            images = collect_images(result)
                            resource_id = ""
                        else:
                            images = []
                        resource_id = next((str(receipt[key]) for key in (
                            "character_id", "tileset_id", "object_id",
                        ) if receipt.get(key)), "")
                        if not resource_id and not images:
                            raise JobError(f"{receipt_path}: no recoverable resource id")
                    else:
                        raise JobError("--recover requires resource_ids or candidate receipts")
                    if resource_id:
                        images = recovered_resource_result(
                            request["endpoint"], resource_id, client,
                        )
                else:
                    seed = int(request.get("seed", 0)) + candidate
                    payload = payload_for(request, root, seed)
                    images = endpoint_result(
                        request["endpoint"], payload, client, args.timeout,
                        receipt_path,
                    )
                for frame, data in images:
                    fingerprint = hashlib.sha256(data).hexdigest()
                    if fingerprint in fingerprints:
                        continue
                    fingerprints.add(fingerprint)
                    suffix = f"-{frame}" if len(images) > 1 else ""
                    output = candidate_dir / f"candidate-{candidate + 1}{suffix}.png"
                    save_candidate(
                        data, output, expected,
                        bool(request.get("repack_transparent_padding", False)),
                    )
                    saved.append(output)
                    sheet_rows.append((f"{request['id']} · {candidate + 1}{suffix}", output))
            if not saved:
                raise JobError("PixelLab returned no decodable images")
            expected_variations = request.get("variations_from_single_request")
            if expected_variations is not None and len(saved) != expected_variations:
                raise JobError(
                    f"PixelLab returned {len(saved)} variations, expected {expected_variations}"
                )
            result_kind = "variations" if expected_variations is not None else "candidates"
            print(f"ok {request['id']} {len(saved)} {result_kind} {expected[0]}x{expected[1]}")
        except Exception as error:  # one failed asset must not hide the rest of the batch
            failed = True
            print(f"FAIL {request['id']}: {error}", file=sys.stderr)
    write_contact_sheet(sheet, root, sheet_rows)
    return 1 if failed else 0


if __name__ == "__main__":
    try:
        raise SystemExit(run())
    except (JobError, json.JSONDecodeError, OSError) as error:
        print(f"FAIL pixelgen: {error}", file=sys.stderr)
        raise SystemExit(1)
