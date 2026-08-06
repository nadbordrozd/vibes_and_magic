#!/usr/bin/env python3
"""Build the six shipped Hearthguard battle sprites and one labelled review sheet."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/assets/battle-units"
REVIEW = ROOT / ".pixel-work/review/hearthguard-roster.png"

PALETTE = [
    (23, 20, 18), (38, 31, 26), (56, 43, 32), (78, 55, 37),
    (102, 69, 41), (132, 86, 46), (162, 108, 57), (192, 137, 70),
    (224, 178, 91), (246, 215, 139), (255, 239, 190),
    (66, 20, 17), (91, 27, 21), (119, 36, 27), (150, 48, 34),
    (182, 67, 43), (211, 91, 54),
    (41, 42, 40), (62, 64, 60), (86, 87, 81), (116, 116, 105),
    (151, 149, 132), (190, 184, 157), (225, 216, 181),
    (86, 65, 36), (120, 91, 45), (157, 121, 56), (199, 158, 72),
]

GENERATED = {
    "yeoman": ("yeoman-source.png", 128, 1.00),
    "longbowman": ("longbowman-source.png", 128, 1.00),
    # Standards use compact combat compositions; the lance may leave the visual canvas. Fitting
    # every decorative tip was the reason the combatants looked like adventure-map miniatures.
    "bannerman": ("bannerman-combat-source.png", 128, 1.06),
    "lanceKnight": ("lance-knight-source.png", 192, 1.14),
    "oriflammeWarden": ("oriflamme-warden-combat-source.png", 128, 1.06),
    "oriflammeWyvern": ("oriflamme-wyvern-source.png", 192, 1.02),
}

LABELS = [
    ("yeoman", "T1 · YEOMAN"),
    ("longbowman", "T2 · LONGBOWMAN"),
    ("bannerman", "T3 · BANNERMAN"),
    ("lanceKnight", "T4 · LANCE KNIGHT"),
    ("oriflammeWarden", "T5 · ORIFLAMME WARDEN"),
    ("oriflammeWyvern", "T6 · ORIFLAMME WYVERN"),
]


def nearest(color):
    return min(PALETTE, key=lambda candidate: sum(
        (color[index] - candidate[index]) ** 2 for index in range(3)
    ))


def generated_sprite(source_name: str, width: int, zoom: float) -> Image.Image:
    source = Image.open(ROOT / "assets/sources/hearthguard-roster" / source_name).convert("RGBA")
    source_pixels = source.load()
    for y in range(source.height):
        for x in range(source.width):
            red, green, blue, alpha_value = source_pixels[x, y]
            if (alpha_value and red >= 45 and blue >= 45 \
                    and red > green * 1.25 and blue > green * 1.2):
                source_pixels[x, y] = (0, 0, 0, 0)
    alpha = source.getchannel("A")
    bounds = alpha.getbbox()
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
            pixels[x, y] = (*nearest((red, green, blue)), 255) if alpha_value >= 96 else (0, 0, 0, 0)
    canvas = Image.new("RGBA", (width, 128), (0, 0, 0, 0))
    canvas.alpha_composite(subject, ((width - subject.width) // 2, 120 - subject.height))
    return canvas


def build() -> dict[str, Image.Image]:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    REVIEW.parent.mkdir(parents=True, exist_ok=True)
    sprites: dict[str, Image.Image] = {}
    for unit, (source, width, zoom) in GENERATED.items():
        sprites[unit] = generated_sprite(source, width, zoom)
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
                       fill="#192019", outline="#8d7640", width=2)
        draw.text((left + 24, top + 24), label, fill="#f0d878", font=font)
        native = sprites[unit]
        scale = 2
        enlarged = native.resize((native.width * scale, native.height * scale), Image.Resampling.NEAREST)
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
    print(f"Built {len(built)} Hearthguard sprites")
    print(REVIEW)
