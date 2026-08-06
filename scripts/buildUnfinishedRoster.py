#!/usr/bin/env python3
"""Build the six Unfinished battle sprites and a labelled native-scale review sheet."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / ".pixel-work/unfinished-roster-keyed"
OUTPUT = ROOT / "public/assets/battle-units"
REVIEW = ROOT / ".pixel-work/review/unfinished-roster.png"

# Shared bone/linen/candle palette. The fixed palette keeps the six independently generated source
# paintings coherent once they are reduced to combat resolution.
PALETTE = [
    (24, 21, 18), (39, 34, 29), (56, 49, 41), (76, 66, 54), (98, 86, 70),
    (123, 108, 88), (150, 134, 111), (178, 163, 138), (205, 193, 169),
    (228, 220, 198), (246, 240, 220),
    (61, 58, 52), (82, 79, 71), (108, 105, 94), (139, 135, 120),
    (171, 166, 148), (201, 196, 176),
    (72, 48, 29), (96, 65, 35), (123, 84, 42), (151, 106, 49),
    (181, 132, 57), (210, 162, 70), (235, 193, 92), (250, 221, 133),
    (91, 52, 28), (129, 68, 31), (176, 91, 34), (222, 126, 42), (250, 174, 61),
]

GENERATED = {
    "candleWisps": ("candle-wisps-transparent.png", 128, 1.00),
    "couriers": ("couriers-transparent.png", 128, 1.02),
    "sentries": ("sentries-transparent.png", 128, 1.04),
    "boneChoir": ("bone-choir-transparent.png", 128, 1.00),
    "brides": ("brides-transparent.png", 128, 1.02),
    "ferry": ("ferry-transparent.png", 192, 1.02),
}

LABELS = [
    ("candleWisps", "T1 · CANDLE-WISPS"),
    ("couriers", "T2 · COURIERS"),
    ("sentries", "T3 · SENTRIES"),
    ("boneChoir", "T4 · BONE CHOIR"),
    ("brides", "T5 · THE BRIDES"),
    ("ferry", "T6 · THE FERRY"),
]


def nearest(color):
    return min(PALETTE, key=lambda candidate: sum(
        (color[index] - candidate[index]) ** 2 for index in range(3)
    ))


def generated_sprite(source_name: str, width: int, zoom: float) -> Image.Image:
    source = Image.open(SOURCE / source_name).convert("RGBA")
    bounds = source.getchannel("A").getbbox()
    if not bounds:
        raise ValueError(f"No visible subject in {source_name}")
    subject = source.crop(bounds)
    scale = min((width - 8) / subject.width, 112 / subject.height) * zoom
    size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
    subject = subject.resize(size, Image.Resampling.LANCZOS)
    pixels = subject.load()
    for y in range(subject.height):
        for x in range(subject.width):
            red, green, blue, alpha_value = pixels[x, y]
            pixels[x, y] = (*nearest((red, green, blue)), 255) \
                if alpha_value >= 96 else (0, 0, 0, 0)
    canvas = Image.new("RGBA", (width, 128), (0, 0, 0, 0))
    canvas.alpha_composite(subject, ((width - subject.width) // 2, 120 - subject.height))
    return canvas


def build() -> dict[str, Image.Image]:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    REVIEW.parent.mkdir(parents=True, exist_ok=True)
    sprites = {
        unit: generated_sprite(source, width, zoom)
        for unit, (source, width, zoom) in GENERATED.items()
    }
    for unit, sprite in sprites.items():
        sprite.save(OUTPUT / f"{unit}.png", optimize=True)
    return sprites


def contact_sheet(sprites: dict[str, Image.Image]):
    card_width, card_height = 500, 390
    sheet = Image.new("RGB", (card_width * 3, card_height * 2), "#101510")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=20)
    small = ImageFont.load_default(size=14)
    for index, (unit, label) in enumerate(LABELS):
        left = index % 3 * card_width
        top = index // 3 * card_height
        draw.rectangle((left + 10, top + 10, left + card_width - 10, top + card_height - 10),
                       fill="#192019", outline="#b79d57", width=2)
        draw.text((left + 24, top + 24), label, fill="#f0d878", font=font)
        native = sprites[unit]
        enlarged = native.resize((native.width * 2, native.height * 2), Image.Resampling.NEAREST)
        sprite_left = left + (card_width - enlarged.width) // 2
        sprite_top = top + 76 + (268 - enlarged.height) // 2
        draw.rectangle((sprite_left - 12, top + 66,
                        sprite_left + enlarged.width + 12, top + 350),
                       fill="#d8d1b7", outline="#3f4e3d")
        sheet.paste(enlarged, (sprite_left, sprite_top), enlarged)
        draw.text((left + card_width - 88, top + card_height - 32),
                  f"{native.width}×{native.height}", fill="#8f9a8b", font=small)
    sheet.save(REVIEW, optimize=True)


if __name__ == "__main__":
    built = build()
    contact_sheet(built)
    print(f"Built {len(built)} Unfinished sprites")
    print(REVIEW)
