#!/usr/bin/env python3
"""Build the four remaining playable-faction battle rosters and review sheets."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
KEYED = ROOT / ".pixel-work/remaining-rosters-keyed"
OUTPUT = ROOT / "public/assets/battle-units"
REVIEW = ROOT / ".pixel-work/review"

PALETTES = {
    "wound-wrights": [
        (22, 20, 19), (38, 34, 31), (57, 52, 47), (80, 74, 67),
        (103, 103, 101), (132, 134, 132), (164, 168, 166), (198, 202, 198),
        (226, 226, 214), (246, 241, 218),
        (22, 42, 67), (31, 64, 101), (43, 88, 137), (60, 116, 168),
        (84, 146, 191), (128, 178, 209),
        (77, 27, 24), (112, 35, 30), (151, 46, 37), (194, 68, 48),
        (75, 50, 29), (105, 72, 38), (139, 98, 45), (177, 131, 58),
        (211, 166, 78), (239, 207, 126),
    ],
    "vespiary": [
        (18, 17, 14), (31, 29, 23), (48, 44, 34), (68, 61, 45),
        (91, 76, 45), (119, 91, 42), (151, 111, 42), (187, 137, 43),
        (221, 170, 57), (244, 204, 96), (255, 229, 139),
        (88, 42, 18), (121, 57, 19), (158, 76, 20), (196, 101, 23),
        (229, 135, 31), (248, 175, 54),
        (117, 109, 86), (151, 143, 116), (183, 176, 148),
        (211, 205, 176), (237, 232, 204), (249, 246, 224),
    ],
    "hagwood": [
        (18, 19, 17), (31, 32, 28), (48, 48, 41), (67, 65, 54),
        (87, 82, 67), (108, 100, 80), (134, 124, 99), (163, 153, 126),
        (194, 185, 158), (224, 216, 190), (244, 239, 218),
        (35, 50, 33), (49, 70, 42), (68, 91, 52), (92, 112, 67),
        (75, 45, 29), (105, 64, 36), (139, 88, 45), (174, 119, 61),
        (82, 20, 32), (119, 27, 43), (158, 39, 56), (195, 57, 70),
    ],
    "wildergrass": [
        (20, 19, 17), (35, 32, 27), (52, 47, 39), (72, 65, 53),
        (94, 85, 69), (119, 108, 88), (149, 138, 114), (181, 171, 146),
        (214, 205, 179), (240, 232, 204),
        (75, 47, 25), (102, 65, 29), (135, 88, 35), (170, 116, 44),
        (204, 151, 61), (232, 187, 91), (247, 219, 139),
        (75, 22, 21), (108, 29, 27), (145, 39, 33), (184, 56, 40),
        (202, 92, 39), (229, 130, 42), (248, 176, 58),
    ],
}

ROSTERS = {
    "wound-wrights": [
        ("tinSoldier", "tin-soldier-transparent.png", 128, 1.00, "T1 · TIN SOLDIER"),
        ("hobbyKnight", "hobby-knight-transparent.png", 128, 1.00, "T2 · HOBBY KNIGHT"),
        ("marionette", "marionette-transparent.png", 128, 1.02, "T3 · MARIONETTE"),
        ("stuffedSentinel", "stuffed-sentinel-transparent.png", 192, 1.02, "T4 · STUFFED SENTINEL"),
        ("woodenColossus", "wooden-colossus-transparent.png", 192, 1.02, "T5 · WOODEN COLOSSUS"),
        ("reliquaryArk", "reliquary-ark-transparent.png", 192, 1.02, "T6 · RELIQUARY ARK"),
    ],
    "vespiary": [
        ("larvalTide", "larval-tide-transparent-v2.png", 128, 1.00, "T1 · LARVAL TIDE"),
        ("paperWaspLancers", "paper-wasp-lancers-transparent.png", 128, 1.00, "T2 · PAPER-WASP LANCERS"),
        ("silkSpinners", "silk-spinners-transparent.png", 128, 1.02, "T3 · SILK-SPINNERS"),
        ("amberCarriers", "amber-carriers-transparent.png", 128, 1.02, "T4 · AMBER-CARRIERS"),
        ("dragonflyCavalry", "dragonfly-cavalry-transparent.png", 128, 1.00, "T5 · DRAGONFLY CAVALRY"),
        ("halfWokenQueen", "half-woken-queen-transparent.png", 192, 1.02, "T6 · HALF-WOKEN QUEEN"),
    ],
    "hagwood": [
        ("crowChorus", "crow-chorus-transparent.png", 128, 1.00, "T1 · CROW CHORUS"),
        ("fencePostFamiliars", "fence-post-familiars-transparent.png", 128, 1.00, "T2 · FENCE-POST FAMILIARS"),
        ("besomRiders", "besom-riders-transparent.png", 128, 1.00, "T3 · BESOM RIDERS"),
        ("rusalka", "rusalka-transparent.png", 128, 1.02, "T4 · RUSALKA"),
        ("leshy", "leshy-transparent.png", 128, 1.02, "T5 · LESHY"),
        ("walkingHut", "walking-hut-transparent.png", 192, 1.02, "T6 · THE WALKING HUT"),
    ],
    "wildergrass": [
        ("outriders", "outriders-transparent.png", 128, 1.00, "T1 · OUTRIDERS"),
        ("drumCallers", "drum-callers-transparent.png", 128, 1.00, "T2 · DRUM-CALLERS"),
        ("ashmaneWolves", "ashmane-wolves-transparent.png", 128, 1.00, "T3 · ASHMANE WOLVES"),
        ("aurochsHerd", "aurochs-herd-transparent.png", 192, 1.02, "T4 · AUROCHS HERD"),
        ("grassSerpent", "grass-serpent-transparent.png", 128, 1.00, "T5 · GRASS-SERPENT"),
        ("thunderbird", "thunderbird-transparent.png", 192, 1.02, "T6 · THUNDERBIRD"),
    ],
}


def nearest(palette, color):
    return min(palette, key=lambda candidate: sum(
        (color[index] - candidate[index]) ** 2 for index in range(3)
    ))


def sprite(faction: str, source_name: str, width: int, zoom: float) -> Image.Image:
    source = Image.open(KEYED / faction / source_name).convert("RGBA")
    hard_alpha = source.getchannel("A").point(lambda value: 255 if value >= 96 else 0)
    bounds = hard_alpha.getbbox()
    if not bounds:
        raise ValueError(f"No visible subject in {source_name}")
    subject = source.crop(bounds)
    scale = min((width - 8) / subject.width, 112 / subject.height) * zoom
    size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
    subject = subject.resize(size, Image.Resampling.LANCZOS)
    pixels = subject.load()
    palette = PALETTES[faction]
    for y in range(subject.height):
        for x in range(subject.width):
            red, green, blue, alpha_value = pixels[x, y]
            pixels[x, y] = (*nearest(palette, (red, green, blue)), 255) \
                if alpha_value >= 96 else (0, 0, 0, 0)
    canvas = Image.new("RGBA", (width, 128), (0, 0, 0, 0))
    canvas.alpha_composite(subject, ((width - subject.width) // 2, 120 - subject.height))
    return canvas


def contact_sheet(faction: str, sprites: dict[str, Image.Image]) -> None:
    card_width, card_height = 500, 390
    sheet = Image.new("RGB", (card_width * 3, card_height * 2), "#101510")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=20)
    small = ImageFont.load_default(size=14)
    for index, (unit, _source, _width, _zoom, label) in enumerate(ROSTERS[faction]):
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
    sheet.save(REVIEW / f"{faction}-roster.png", optimize=True)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    REVIEW.mkdir(parents=True, exist_ok=True)
    for faction, roster in ROSTERS.items():
        sprites = {
            unit: sprite(faction, source, width, zoom)
            for unit, source, width, zoom, _label in roster
        }
        for unit, image in sprites.items():
            image.save(OUTPUT / f"{unit}.png", optimize=True)
        contact_sheet(faction, sprites)
        print(f"Built {faction}: {len(sprites)} sprites")


if __name__ == "__main__":
    main()
