#!/usr/bin/env python3
"""Build authored adventure-map guardian sprites from generated keyed sources."""

from collections import Counter
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
KEYED = ROOT / ".pixel-work/guardian-keyed"
COMBAT = ROOT / "public/assets/battle-units"
OUTPUT = ROOT / "public/assets/guardian-units"
REVIEW = ROOT / ".pixel-work/review/guardian-roster.png"

UNITS = [
    "yeoman", "bannerman", "oriflammeWarden", "tinSoldier", "marionette",
    "woodenColossus", "boneChoir", "silkSpinners", "ashmaneWolves",
    "maskedDuelist", "mirrorBound", "waxServitor", "hearthHound", "sleeper",
    "sirens", "drownedCrew", "hullTurtle", "lanternAngler",
]


def palette_for(unit: str) -> list[tuple[int, int, int]]:
    image = Image.open(COMBAT / f"{unit}.png").convert("RGBA")
    colors = Counter(
        (red, green, blue)
        for red, green, blue, alpha in image.getdata()
        if alpha >= 128
    )
    return [color for color, _count in colors.most_common(28)]


def nearest(palette: list[tuple[int, int, int]], color: tuple[int, int, int]):
    return min(palette, key=lambda candidate: sum(
        (color[index] - candidate[index]) ** 2 for index in range(3)
    ))


def build(unit: str) -> Image.Image:
    source = Image.open(KEYED / f"{unit}-transparent.png").convert("RGBA")
    alpha = source.getchannel("A").point(lambda value: 255 if value >= 96 else 0)
    bounds = alpha.getbbox()
    if not bounds:
        raise ValueError(f"No visible guardian subject for {unit}")
    subject = source.crop(bounds)
    scale = min(30 / subject.width, 44 / subject.height)
    size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
    subject = subject.resize(size, Image.Resampling.LANCZOS)
    palette = palette_for(unit)
    pixels = subject.load()
    for y in range(subject.height):
        for x in range(subject.width):
            red, green, blue, pixel_alpha = pixels[x, y]
            pixels[x, y] = (*nearest(palette, (red, green, blue)), 255) \
                if pixel_alpha >= 96 else (0, 0, 0, 0)
    canvas = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
    canvas.alpha_composite(subject, ((32 - subject.width) // 2, 46 - subject.height))
    return canvas


def contact_sheet(sprites: dict[str, Image.Image]) -> None:
    columns, rows = 6, 3
    card_width, card_height = 180, 190
    sheet = Image.new("RGB", (columns * card_width, rows * card_height), "#101510")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=14)
    for index, unit in enumerate(UNITS):
        left = index % columns * card_width
        top = index // columns * card_height
        draw.rectangle((left + 5, top + 5, left + card_width - 5, top + card_height - 5),
                       fill="#476735", outline="#bda85f", width=2)
        sprite = sprites[unit].resize((128, 192), Image.Resampling.NEAREST)
        sheet.paste(sprite, (left + 26, top - 10), sprite)
        draw.rectangle((left + 8, top + 162, left + card_width - 8, top + 184), fill="#111811")
        draw.text((left + card_width / 2, top + 173), unit,
                  fill="#f0dfaa", font=font, anchor="mm")
    REVIEW.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(REVIEW, optimize=True)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    sprites = {unit: build(unit) for unit in UNITS}
    for unit, sprite in sprites.items():
        sprite.save(OUTPUT / f"{unit}.png", optimize=True)
    contact_sheet(sprites)
    print(f"Built {len(sprites)} authored guardian sprites")


if __name__ == "__main__":
    main()
