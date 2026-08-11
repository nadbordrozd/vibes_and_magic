#!/usr/bin/env python3
"""Bake keyed built-in image sources into native collectible sprites and review sheets."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
CANVAS = 32
MAX_SUBJECT = 28


def parse_hex(value: str) -> tuple[int, int, int]:
    value = value.removeprefix("#")
    if len(value) != 6:
        raise ValueError(f"Invalid chroma key: {value}")
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))


def remove_chroma(image: Image.Image, key: tuple[int, int, int]) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = []
    for red, green, blue, _alpha in rgba.getdata():
        distance = ((red - key[0]) ** 2 + (green - key[1]) ** 2 + (blue - key[2]) ** 2) ** .5
        pixels.append((red, green, blue, 0 if distance <= 64 else 255))
    rgba.putdata(pixels)
    return rgba


def bake(source: Path, key: tuple[int, int, int]) -> Image.Image:
    keyed = remove_chroma(Image.open(source), key)
    bounds = keyed.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError(f"No visible subject in {source}")
    subject = keyed.crop(bounds)
    scale = min(MAX_SUBJECT / subject.width, MAX_SUBJECT / subject.height)
    size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
    subject = subject.resize(size, Image.Resampling.NEAREST)

    # A small adaptive palette keeps generated texture legible instead of turning it into
    # sub-pixel noise. Alpha remains deliberately hard for deterministic map/UI edges.
    alpha = subject.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
    rgb = subject.convert("RGB").quantize(colors=40, method=Image.Quantize.MEDIANCUT).convert("RGB")
    subject = rgb.convert("RGBA")
    subject.putalpha(alpha)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.alpha_composite(subject, ((CANVAS - subject.width) // 2, (CANVAS - subject.height) // 2))
    return canvas


def checkerboard(size: tuple[int, int], cell: int = 8) -> Image.Image:
    board = Image.new("RGB", size, "#e7dfca")
    draw = ImageDraw.Draw(board)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill="#bec6b4")
    return board


def review_sheet(requests: list[dict], finals: dict[str, Image.Image], group: str, path: Path) -> None:
    chosen = [request for request in requests if request.get("catalog_group") == group]
    columns, card_w, card_h = 5, 240, 290
    rows = (len(chosen) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * card_w, max(1, rows) * card_h), "#111711")
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.load_default(size=16)
    tiny_font = ImageFont.load_default(size=12)
    for index, request in enumerate(chosen):
        left, top = index % columns * card_w, index // columns * card_h
        draw.rectangle((left + 6, top + 6, left + card_w - 6, top + card_h - 6),
                       fill="#1b231b", outline="#c7a950")
        draw.text((left + 14, top + 14), request["catalog_key"], fill="#f0d878", font=title_font)
        original = Image.open(ROOT / request["output"]).convert("RGB")
        original.thumbnail((208, 150), Image.Resampling.NEAREST)
        sheet.paste(original, (left + (card_w - original.width) // 2, top + 42))
        final = finals[request["catalog_key"]].resize((96, 96), Image.Resampling.NEAREST)
        board = checkerboard((96, 96))
        board.paste(final, (0, 0), final)
        sheet.paste(board, (left + 72, top + 184))
        draw.text((left + 14, top + 270), "source + 32px final (3x)", fill="#aebaa9", font=tiny_font)
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--job", required=True)
    args = parser.parse_args()
    job_path = ROOT / args.job
    job = json.loads(job_path.read_text())
    requests = job["requests"]
    finals: dict[str, Image.Image] = {}
    alpha_stats: dict[str, dict] = {}
    for request in requests:
        source = ROOT / request["output"]
        target = ROOT / request["final"]
        image = bake(source, parse_hex(request["chroma_key"]))
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, optimize=True)
        finals[request["catalog_key"]] = image
        alpha = image.getchannel("A")
        histogram = alpha.histogram()
        bounds = alpha.getbbox()
        key = parse_hex(request["chroma_key"])
        fringe = sum(1 for red, green, blue, visible in image.getdata()
                     if visible and ((red - key[0]) ** 2 + (green - key[1]) ** 2
                                     + (blue - key[2]) ** 2) ** .5 <= 72)
        alpha_stats[request["catalog_key"]] = {
            "transparent": histogram[0], "opaque": histogram[255],
            "partial": sum(histogram[1:255]), "bbox": list(bounds) if bounds else None,
            "transparent_corners": sum(alpha.getpixel(point) == 0 for point in
                                       [(0, 0), (31, 0), (0, 31), (31, 31)]),
            "chroma_fringe_pixels": fringe,
        }
        print(f'{request["catalog_key"]}: 32x32 transparent={histogram[0]} '
              f'partial={sum(histogram[1:255])} bbox={bounds}')
    review_root = ROOT / ".pixel-work/review/collectibles" / job["collectible_family"]
    for group in sorted({request["catalog_group"] for request in requests}):
        review_sheet(requests, finals, group, review_root / f"{group}-contact-sheet.png")
    provenance_path = ROOT / "assets/provenance" / f'{job["collectible_family"]}-sprite-generation.json'
    if provenance_path.exists():
        provenance = json.loads(provenance_path.read_text())
        for selection in provenance["selections"]:
            selection["alpha"] = alpha_stats[selection["catalog_key"]]
        provenance_path.write_text(json.dumps(provenance, indent=2) + "\n")


if __name__ == "__main__":
    main()
