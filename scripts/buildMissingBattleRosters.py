#!/usr/bin/env python3
"""Build the Gloaming Court, Seamborn, and Driftfolk battle sprites."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
KEYED = ROOT / ".pixel-work/missing-rosters-keyed"
OUTPUT = ROOT / "public/assets/battle-units"
REVIEW = ROOT / ".pixel-work/review"

PALETTES = {
    "gloaming-court": [
        (17, 16, 18), (29, 27, 31), (45, 41, 47), (64, 58, 65),
        (84, 77, 84), (109, 102, 108), (139, 132, 137), (173, 167, 169),
        (207, 201, 198), (235, 228, 216), (249, 242, 225),
        (42, 18, 43), (65, 24, 67), (91, 31, 91), (123, 39, 116),
        (157, 55, 139), (188, 83, 161),
        (89, 54, 20), (124, 78, 24), (161, 106, 31), (198, 143, 45),
        (229, 184, 72), (247, 219, 132),
    ],
    "seamborn": [
        (20, 20, 19), (34, 34, 32), (50, 50, 47), (68, 67, 62),
        (88, 85, 78), (111, 106, 96), (137, 130, 116), (165, 157, 140),
        (194, 185, 166), (222, 213, 192), (241, 233, 213),
        (66, 43, 27), (91, 59, 32), (120, 79, 38), (151, 104, 48),
        (183, 134, 65), (214, 170, 94),
        (35, 49, 58), (48, 67, 78), (66, 88, 99), (91, 112, 120),
        (102, 68, 27), (141, 95, 31), (184, 132, 43), (224, 174, 67),
    ],
    "driftfolk": [
        (16, 20, 21), (26, 33, 35), (39, 49, 52), (54, 68, 72),
        (70, 88, 93), (89, 109, 114), (113, 133, 137), (141, 158, 160),
        (174, 188, 187), (207, 216, 208), (235, 237, 222),
        (20, 43, 54), (27, 61, 75), (37, 82, 96), (51, 105, 118),
        (72, 130, 139), (104, 157, 160),
        (54, 40, 28), (79, 56, 34), (106, 76, 41), (137, 101, 51),
        (171, 132, 68), (206, 169, 96), (234, 207, 148),
        (111, 77, 25), (151, 105, 31), (194, 143, 43), (229, 184, 72),
    ],
}

ROSTERS = {
    "gloaming-court": [
        ("mirrorBound", "mirror-bound-transparent.png", 128, "MIRROR-BOUND"),
        ("maskedDuelist", "masked-duelist-transparent.png", 128, "MASKED DUELIST"),
        ("hearthHound", "hearth-hound-transparent.png", 128, "HEARTH-HOUND"),
        ("waxServitor", "wax-servitor-transparent.png", 128, "WAX SERVITOR"),
        ("standingMirror", "standing-mirror-transparent.png", 128, "STANDING MIRROR"),
    ],
    "seamborn": [
        ("sleeper", "sleeper-transparent.png", 256, "THE SLEEPER · 3 HEX"),
        ("siegeWall", "siege-wall-transparent.png", 128, "WALL SECTION"),
        ("siegeRam", "siege-ram-transparent.png", 192, "RAM · 2 HEX"),
        ("watchtower", "watchtower-transparent.png", 128, "WATCHTOWER"),
        ("makerWall", "maker-wall-transparent.png", 128, "MAKER'S WALL"),
    ],
    "driftfolk": [
        ("sirens", "sirens-transparent.png", 128, "SIRENS"),
        ("drownedCrew", "drowned-crew-transparent.png", 128, "DROWNED CREW"),
        ("hullTurtle", "hull-turtle-transparent.png", 192, "HULL-TURTLE · 2 HEX"),
        ("lanternAngler", "lantern-angler-transparent.png", 128, "LANTERN-ANGLER"),
    ],
}


def nearest(palette, color):
    return min(palette, key=lambda candidate: sum(
        (color[index] - candidate[index]) ** 2 for index in range(3)
    ))


def sprite(family: str, source_name: str, width: int) -> Image.Image:
    source = Image.open(KEYED / family / source_name).convert("RGBA")
    hard_alpha = source.getchannel("A").point(lambda value: 255 if value >= 96 else 0)
    bounds = hard_alpha.getbbox()
    if not bounds:
        raise ValueError(f"No visible subject in {source_name}")
    subject = source.crop(bounds)
    scale = min((width - 8) / subject.width, 112 / subject.height)
    size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
    subject = subject.resize(size, Image.Resampling.LANCZOS)
    pixels = subject.load()
    palette = PALETTES[family]
    for y in range(subject.height):
        for x in range(subject.width):
            red, green, blue, alpha = pixels[x, y]
            pixels[x, y] = (*nearest(palette, (red, green, blue)), 255) \
                if alpha >= 96 else (0, 0, 0, 0)
    canvas = Image.new("RGBA", (width, 128), (0, 0, 0, 0))
    canvas.alpha_composite(subject, ((width - subject.width) // 2, 120 - subject.height))
    return canvas


def contact_sheet(family: str, sprites: dict[str, Image.Image]) -> None:
    card_width, card_height = 500, 390
    sheet = Image.new("RGB", (card_width * 3, card_height * 2), "#101510")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=20)
    small = ImageFont.load_default(size=14)
    for index, (unit, _source, _width, label) in enumerate(ROSTERS[family]):
        left = index % 3 * card_width
        top = index // 3 * card_height
        draw.rectangle((left + 10, top + 10, left + card_width - 10, top + card_height - 10),
                       fill="#192019", outline="#b79d57", width=2)
        draw.text((left + 24, top + 24), label, fill="#f0d878", font=font)
        native = sprites[unit]
        enlarged = native.resize((native.width * 2, native.height * 2), Image.Resampling.NEAREST)
        sprite_left = left + (card_width - enlarged.width) // 2
        sprite_top = top + 76 + (268 - enlarged.height) // 2
        draw.rectangle((max(left + 20, sprite_left - 12), top + 66,
                        min(left + card_width - 20, sprite_left + enlarged.width + 12), top + 350),
                       fill="#d8d1b7", outline="#3f4e3d")
        sheet.paste(enlarged, (sprite_left, sprite_top), enlarged)
        draw.text((left + card_width - 88, top + card_height - 32),
                  f"{native.width}×{native.height}", fill="#8f9a8b", font=small)
    sheet.save(REVIEW / f"{family}-roster.png", optimize=True)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    REVIEW.mkdir(parents=True, exist_ok=True)
    for family, roster in ROSTERS.items():
        sprites = {
            unit: sprite(family, source, width)
            for unit, source, width, _label in roster
        }
        for unit, image in sprites.items():
            image.save(OUTPUT / f"{unit}.png", optimize=True)
        contact_sheet(family, sprites)
        print(f"Built {family}: {len(sprites)} sprites")


if __name__ == "__main__":
    main()
