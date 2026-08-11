#!/usr/bin/env python3
"""Bake helper-keyed spell-effect sources into native icons and review sheets."""

from __future__ import annotations

import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CANVAS = 32
MAX_SUBJECT = 28


def bake(source: Path) -> Image.Image:
    keyed = Image.open(source).convert("RGBA")
    alpha = keyed.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
    keyed.putalpha(alpha)
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError(f"No visible subject in {source}")
    subject = keyed.crop(bounds)
    scale = min(MAX_SUBJECT / subject.width, MAX_SUBJECT / subject.height)
    size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
    subject = subject.resize(size, Image.Resampling.NEAREST)
    alpha = subject.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
    rgb = subject.convert("RGB").quantize(colors=40, method=Image.Quantize.MEDIANCUT).convert("RGB")
    subject = rgb.convert("RGBA")
    subject.putalpha(alpha)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.alpha_composite(subject, ((CANVAS - subject.width) // 2, (CANVAS - subject.height) // 2))
    return canvas


def checkerboard(size: tuple[int, int], cell: int) -> Image.Image:
    board = Image.new("RGB", size, "#e7dfca")
    draw = ImageDraw.Draw(board)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill="#bec6b4")
    return board


def sheet(requests: list[dict], finals: dict[str, Image.Image], scale: int, path: Path) -> None:
    columns, card_w, card_h = 5, 180, 78 if scale == 1 else 142
    rows = (len(requests) + columns - 1) // columns
    result = Image.new("RGB", (columns * card_w, rows * card_h), "#111711")
    draw = ImageDraw.Draw(result)
    font = ImageFont.load_default(size=12)
    for index, request in enumerate(requests):
        left, top = index % columns * card_w, index // columns * card_h
        draw.rectangle((left + 3, top + 3, left + card_w - 3, top + card_h - 3),
                       fill="#1b231b", outline="#c7a950")
        asset_id = request["assets"][0].replace("spell-effect-icon:", "")
        icon = finals[asset_id].resize((32 * scale, 32 * scale), Image.Resampling.NEAREST)
        board = checkerboard(icon.size, max(1, 4 * scale))
        board.paste(icon, (0, 0), icon)
        result.paste(board, (left + 8, top + 28))
        draw.text((left + 8, top + 9), asset_id, fill="#f0d878", font=font)
        draw.text((left + 48 * scale if scale == 1 else left + 112, top + 35),
                  f"{32 * scale}px review", fill="#aebaa9", font=font)
    path.parent.mkdir(parents=True, exist_ok=True)
    result.save(path, optimize=True)


def main() -> None:
    requests: list[dict] = []
    for number in (1, 2, 3):
        job = json.loads((ROOT / f"assets/jobs/spell-effect-icons-{number}-built-in.json").read_text())
        requests.extend(job["requests"])
    finals: dict[str, Image.Image] = {}
    for request in requests:
        asset_id = request["assets"][0].replace("spell-effect-icon:", "")
        keyed = ROOT / ".pixel-work/spell-effect-icons/keyed" / f"{asset_id}.png"
        target = ROOT / request["final"]
        image = bake(keyed)
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, optimize=True)
        finals[asset_id] = image
        histogram = image.getchannel("A").histogram()
        print(f"{asset_id}: transparent={histogram[0]} opaque={histogram[255]} partial={sum(histogram[1:255])}")
    review = ROOT / ".pixel-work/review/spell-effect-icons"
    sheet(requests, finals, 1, review / "native-contact-sheet.png")
    sheet(requests, finals, 3, review / "3x-contact-sheet.png")


if __name__ == "__main__":
    main()
