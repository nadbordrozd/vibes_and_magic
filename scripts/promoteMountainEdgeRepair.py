#!/usr/bin/env python3
"""Bake selected built-in mountain sources into native hard-alpha rocky sprites."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/sources/mountain-edge-repair"
OUTPUT = ROOT / "public/assets/decorations"
REVIEW = ROOT / ".pixel-work/review/mountain-edge-repair-native-contact.png"
PROVENANCE = ROOT / "assets/provenance/mountain-edge-repair.json"
JOB = ROOT / "assets/jobs/mountain-edge-repair-built-in.json"

ROCK = [
    (24, 28, 31), (34, 39, 43), (46, 52, 57), (59, 65, 69),
    (73, 79, 81), (89, 94, 94), (107, 111, 108), (128, 130, 123),
    (151, 150, 138), (181, 177, 158),
]
MOSS = [
    (31, 43, 31), (42, 56, 36), (55, 70, 42), (70, 84, 49),
    (87, 99, 59), (107, 116, 71),
]


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def text_digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def ramp(value: int, colors: list[tuple[int, int, int]]) -> tuple[int, int, int]:
    index = min(len(colors) - 1, max(0, value * len(colors) // 256))
    return colors[index]


def remove_disconnected_specks(image: Image.Image) -> None:
    pixels = image.load()
    opaque = {(x, y) for y in range(image.height) for x in range(image.width)
              if pixels[x, y][3] == 255}
    components: list[set[tuple[int, int]]] = []
    while opaque:
        frontier = [opaque.pop()]
        component = set(frontier)
        while frontier:
            x, y = frontier.pop()
            for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if neighbor in opaque:
                    opaque.remove(neighbor)
                    component.add(neighbor)
                    frontier.append(neighbor)
        components.append(component)
    if not components:
        return
    keep = max(components, key=len)
    for component in components:
        if component is keep:
            continue
        for x, y in component:
            pixels[x, y] = (0, 0, 0, 0)


def bake(source: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    alpha = image.getchannel("A")
    box = alpha.getbbox()
    if box is None:
        raise ValueError(f"{source}: empty chroma extraction")
    subject = image.crop(box)
    available = (size[0] - 2, size[1] - 2)
    scale = min(available[0] / subject.width, available[1] / subject.height)
    resized = subject.resize(
        (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((size[0] - resized.width) // 2, size[1] - resized.height))

    pixels = canvas.load()
    for y in range(canvas.height):
        for x in range(canvas.width):
            red, green, blue, opacity = pixels[x, y]
            if opacity < 128:
                pixels[x, y] = (0, 0, 0, 0)
                continue
            light = round(red * 0.28 + green * 0.57 + blue * 0.15)
            mossy = green > red * 1.08 and green > blue * 1.05 and light < 150
            pixels[x, y] = (*ramp(min(255, round(light * 1.06)), MOSS if mossy else ROCK), 255)
    remove_disconnected_specks(canvas)
    final_box = canvas.getchannel("A").getbbox()
    if final_box is None:
        raise ValueError(f"{source}: empty baked silhouette")
    if final_box[0] == 0 or final_box[2] == size[0]:
        raise ValueError(f"{source}: baked silhouette touches a vertical canvas side")
    if final_box[3] != size[1]:
        raise ValueError(f"{source}: baked silhouette is not bottom anchored")
    if any(value not in (0, 255) for value in canvas.getchannel("A").get_flattened_data()):
        raise ValueError(f"{source}: baked silhouette is not hard alpha")
    return canvas


def main() -> None:
    job = json.loads(JOB.read_text(encoding="utf-8"))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    REVIEW.parent.mkdir(parents=True, exist_ok=True)
    promoted: list[tuple[dict, Image.Image, Path]] = []
    provenance = {
        "version": 1,
        "provider": "OpenAI built-in image_gen",
        "mode": "built-in chroma-key generation plus deterministic local bake",
        "job": str(JOB.relative_to(ROOT)),
        "assets": [],
        "rejectedVariants": [],
    }
    for rejected in job.get("rejected_variants", []):
        provenance["rejectedVariants"].append({
            **rejected,
            "promptSha256": text_digest(rejected["prompt"]),
            "providerOutputSha256": digest(ROOT / rejected["providerOutput"]),
            "transparentSourceSha256": digest(ROOT / rejected["transparentSource"]),
            "bakedReviewSha256": digest(ROOT / rejected["bakedReview"]),
        })
    for request in job["requests"]:
        transparent = ROOT / request["transparentSource"]
        keyed = ROOT / request["output"]
        target = ROOT / request["final"]
        image = bake(transparent, tuple(request["size"]))
        image.save(target)
        reference = ROOT / request["references"][0]["file"]
        provenance["assets"].append({
            "id": request["id"],
            "promptSha256": text_digest(request["prompt"]),
            "providerOutput": request["output"],
            "providerOutputSha256": digest(keyed),
            "transparentSource": request["transparentSource"],
            "transparentSourceSha256": digest(transparent),
            "reference": request["references"][0]["file"],
            "referenceSha256": digest(reference),
            "target": request["final"],
            "finalSha256": digest(target),
            "size": request["size"],
            "alphaBake": "remove_chroma_key border/soft-matte 12/220/despill, then LANCZOS fit, alpha>=128, fixed rocky palette, largest 4-connected component, bottom anchor",
        })
        promoted.append((request, image, target))
    PROVENANCE.write_text(json.dumps(provenance, indent=2) + "\n", encoding="utf-8")

    scale = 3
    card_w, card_h = 432, 328
    sheet = Image.new("RGB", (card_w * 4, card_h * 2), (15, 19, 20))
    draw = ImageDraw.Draw(sheet)
    for index, (request, image, _target) in enumerate(promoted):
        left = index % 4 * card_w
        top = index // 4 * card_h
        draw.text((left + 8, top + 8), request["id"].removeprefix("decoration:mountain:"),
                  fill=(238, 231, 204))
        shown = image.resize((image.width * scale, image.height * scale), Image.Resampling.NEAREST)
        for panel, background in enumerate(((55, 122, 54), (224, 220, 199))):
            x = left + 8 + panel * 208
            y = top + 32
            draw.rectangle((x, y, x + 200, y + 288), fill=background)
            sheet.paste(shown, (x + (200 - shown.width) // 2, y + 288 - shown.height), shown)
    sheet.save(REVIEW)
    print(f"ok {len(promoted)} built-in mountain edge variants · hard alpha · fixed palette")
    print(REVIEW)
    print(PROVENANCE)


if __name__ == "__main__":
    main()
