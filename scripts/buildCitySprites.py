#!/usr/bin/env python3
"""Bake six keyed city sources into native 160x160 RGBA sprites and a review sheet."""

from __future__ import annotations

from hashlib import sha256
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
KEYED = ROOT / ".pixel-work/cities-keyed"
OUTPUT = ROOT / "public/assets/cities"
REVIEW = ROOT / ".pixel-work/review/cities/city-sprites-contact-sheet.png"
CANVAS_SIZE = (160, 160)
MAX_SUBJECT_SIZE = (156, 156)

CITIES = {
    "hearthguard": "Hearthguard",
    "wound-wrights": "Wound-Wrights",
    "unfinished": "The Unfinished",
    "vespiary": "The Vespiary",
    "hagwood": "The Hagwood",
    "wildergrass": "Wildergrass Clans",
}


def bake(stem: str) -> Image.Image:
    source = Image.open(KEYED / f"{stem}-city-transparent.png").convert("RGBA")
    hard_alpha = source.getchannel("A").point(lambda value: 255 if value >= 96 else 0)
    bounds = hard_alpha.getbbox()
    if bounds is None:
        raise ValueError(f"No visible city in {stem} source")

    subject = source.crop(bounds)
    scale = min(MAX_SUBJECT_SIZE[0] / subject.width, MAX_SUBJECT_SIZE[1] / subject.height)
    size = (
        max(1, round(subject.width * scale)),
        max(1, round(subject.height * scale)),
    )
    # The generated sources already contain deliberate hard pixel clusters. Nearest-neighbour
    # reduction preserves those clusters instead of inventing antialiased colours at map scale.
    subject = subject.resize(size, Image.Resampling.NEAREST)
    alpha = subject.getchannel("A").point(lambda value: 255 if value >= 96 else 0)
    subject.putalpha(alpha)

    canvas = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    canvas.alpha_composite(subject, ((CANVAS_SIZE[0] - subject.width) // 2,
                                     CANVAS_SIZE[1] - subject.height))
    return canvas


def checkerboard(size: tuple[int, int], cell: int = 8) -> Image.Image:
    board = Image.new("RGB", size, "#e7dfca")
    pixels = board.load()
    for y in range(size[1]):
        for x in range(size[0]):
            if (x // cell + y // cell) % 2:
                pixels[x, y] = (190, 198, 180)
    return board


def contact_sheet(sprites: dict[str, Image.Image]) -> None:
    card_width, card_height = 520, 610
    sheet = Image.new("RGB", (card_width * 3, card_height * 2), "#111711")
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.load_default(size=22)
    small_font = ImageFont.load_default(size=15)
    for index, (stem, label) in enumerate(CITIES.items()):
        left = index % 3 * card_width
        top = index // 3 * card_height
        draw.rectangle((left + 10, top + 10, left + card_width - 10, top + card_height - 10),
                       fill="#1b231b", outline="#c7a950", width=2)
        draw.text((left + 24, top + 22), label, fill="#f0d878", font=title_font)
        native = sprites[stem]
        enlarged = native.resize((480, 480), Image.Resampling.NEAREST)
        board = checkerboard(enlarged.size)
        board.paste(enlarged, (0, 0), enlarged)
        sheet.paste(board, (left + 20, top + 66))
        draw.line((left + 20, top + 66 + 96 * 3, left + 500, top + 66 + 96 * 3),
                  fill="#e2624f", width=2)
        draw.line((left + 20 + 64 * 3, top + 66 + 128 * 3,
                   left + 20 + 96 * 3, top + 66 + 128 * 3), fill="#58b9db", width=3)
        draw.text((left + 24, top + 560),
                  "160x160 RGBA | contact y=96..159 | entrance tile (2,1)",
                  fill="#aebaa9", font=small_font)
    REVIEW.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(REVIEW, optimize=True)


def stats(image: Image.Image) -> tuple[int, int, tuple[int, int, int, int]]:
    alpha = image.getchannel("A")
    histogram = alpha.histogram()
    transparent = histogram[0]
    partial = sum(histogram[1:255])
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("City has no visible pixels")
    return transparent, partial, bounds


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    sprites = {stem: bake(stem) for stem in CITIES}
    for stem, image in sprites.items():
        target = OUTPUT / f"{stem}-city.png"
        image.save(target, optimize=True)
        transparent, partial, bounds = stats(image)
        digest = sha256(target.read_bytes()).hexdigest()
        print(f"{stem}: {image.width}x{image.height} bbox={bounds} "
              f"transparent={transparent} partial={partial} sha256={digest}")
    contact_sheet(sprites)
    print(REVIEW.relative_to(ROOT))


if __name__ == "__main__":
    main()
