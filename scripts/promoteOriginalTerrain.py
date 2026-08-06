#!/usr/bin/env python3
"""Review and promote original native PixelLab terrain materials without resampling."""

from pathlib import Path
import html
import os
import shutil

from PIL import Image, ImageDraw, ImageStat


ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / ".pixel-work" / "pixelgen" / "homm2-retirement"
OUTPUT = ROOT / "public" / "assets" / "terrain"
NATIVE = OUTPUT / "original-native"
REVIEW = ROOT / ".pixel-work" / "review"
TILE = 32
FAMILIES = (
    "grass", "snow", "water", "dirt", "beach", "plains", "swamp", "volcanic", "desert",
)
JOB_FAMILIES = {
    "homm2-retirement-core": ("grass", "snow", "water"),
    "homm2-retirement-bridges": ("dirt", "beach", "plains"),
    "homm2-retirement-showcase": ("swamp", "volcanic", "desert"),
}

# Candidate numbers are one-based and are recorded here as the deterministic selection authority.
SELECTIONS = {
    "grass": (1, 1),
    "snow": (2, 2),
    "water": (2, 1),
    "dirt": (1, 2),
    "beach": (1, 1),
    "plains": (2, 1),
    "swamp": (2, 2),
    "volcanic": (1, 2),
    "desert": (2, 2),
}


def load_native(path: Path) -> Image.Image:
    if not path.is_file():
        raise SystemExit(f"missing PixelLab candidate {path.relative_to(ROOT)}")
    with Image.open(path) as source:
        image = source.convert("RGBA")
    if image.size != (TILE, TILE):
        raise SystemExit(f"{path.relative_to(ROOT)} is {image.size}, expected 32x32")
    if image.getchannel("A").getextrema() != (255, 255):
        raise SystemExit(f"{path.relative_to(ROOT)} is not fully opaque")
    return image


def candidate_path(family: str, variant: int, candidate: int) -> Path:
    return WORK / f"{family}-{variant}" / f"candidate-{candidate}.png"


def build_candidate_review() -> None:
    # Four 3x3 repeats per family: two candidates for each of two independent variants.
    repeat = TILE * 3
    gap = 8
    label = 18
    sheet = Image.new("RGBA", (4 * repeat + 5 * gap, len(FAMILIES) * (repeat + label + gap) + gap),
                      (31, 35, 37, 255))
    draw = ImageDraw.Draw(sheet)
    for row, family in enumerate(FAMILIES):
        top = gap + row * (repeat + label + gap)
        draw.text((gap, top), family, fill=(245, 238, 215, 255))
        for column, (variant, candidate) in enumerate(((0, 1), (0, 2), (1, 1), (1, 2))):
            image = load_native(candidate_path(family, variant, candidate))
            field = Image.new("RGBA", (repeat, repeat))
            for y in range(3):
                for x in range(3):
                    field.alpha_composite(image, (x * TILE, y * TILE))
            sheet.alpha_composite(field, (gap + column * (repeat + gap), top + label))
    REVIEW.mkdir(parents=True, exist_ok=True)
    sheet.save(REVIEW / "original-terrain-candidates-repeat.png", optimize=True)


def write_contact_sheets() -> None:
    style = ("<style>body{font:13px system-ui;background:#777;margin:20px}"
             ".grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}"
             "article{background:#222;color:#eee;padding:10px}h2{font-size:12px}"
             ".light,.dark{display:inline-grid;place-items:center;width:96px;height:96px;margin:4px}"
             ".light{background:#ddd}.dark{background:#182019}img{image-rendering:pixelated;"
             "max-width:192px;max-height:192px;transform:scale(2)}</style>")
    for job, families in JOB_FAMILIES.items():
        destination = ROOT / "assets" / "jobs" / f"{job}-candidates.html"
        cards = []
        for family in families:
            for variant in range(2):
                for candidate in range(1, 3):
                    path = candidate_path(family, variant, candidate)
                    load_native(path)
                    relative = os.path.relpath(path, destination.parent).replace(os.sep, "/")
                    label = html.escape(f"{family}:{variant} · {candidate}")
                    source = html.escape(relative)
                    cards.append(f'<article><h2>{label}</h2><div class="light"><img src="{source}"></div>'
                                 f'<div class="dark"><img src="{source}"></div></article>')
        destination.write_text("<!doctype html><meta charset=\"utf-8\">"
                               "<title>PixelLab candidates</title>" + style
                               + '<main class="grid">' + "".join(cards) + "</main>",
                               encoding="utf-8")


def match_mean(source: Image.Image, target: Image.Image) -> Image.Image:
    source_mean = ImageStat.Stat(source.convert("RGB")).mean
    target_mean = ImageStat.Stat(target.convert("RGB")).mean
    deltas = [target_mean[index] - source_mean[index] for index in range(3)]
    matched = Image.new("RGBA", source.size)
    pixels = []
    for y in range(source.height):
        for x in range(source.width):
            red, green, blue, alpha = source.getpixel((x, y))
            pixels.append((max(0, min(255, round(red + deltas[0]))),
                           max(0, min(255, round(green + deltas[1]))),
                           max(0, min(255, round(blue + deltas[2]))), alpha))
    matched.putdata(pixels)
    return matched


def build_pattern(family: str, variants: tuple[Image.Image, Image.Image]) -> Image.Image:
    pattern = Image.new("RGBA", (9 * TILE, 9 * TILE))
    salt = sum(ord(character) for character in family)
    composed_variants = (variants[0], match_mean(variants[1], variants[0]))
    for y in range(9):
        for x in range(9):
            index = ((x * 7) ^ (y * 11) ^ salt) & 1
            pattern.alpha_composite(composed_variants[index], (x * TILE, y * TILE))
    return pattern


def promote() -> None:
    NATIVE.mkdir(parents=True, exist_ok=True)
    fields: list[Image.Image] = []
    for family in FAMILIES:
        variants = []
        for variant, candidate in enumerate(SELECTIONS[family]):
            source = candidate_path(family, variant, candidate)
            image = load_native(source)
            shutil.copyfile(source, NATIVE / f"{family}-{variant}.png")
            variants.append(image)
        pattern = build_pattern(family, (variants[0], variants[1]))
        pattern.save(OUTPUT / f"original-showcase-{family}.png", optimize=True)
        fields.append(pattern)

    review = Image.new("RGBA", (3 * 288, 3 * 288), (31, 35, 37, 255))
    for index, field in enumerate(fields):
        review.alpha_composite(field, ((index % 3) * 288, (index // 3) * 288))
    REVIEW.mkdir(parents=True, exist_ok=True)
    review.save(REVIEW / "original-terrain-selections-native.png", optimize=True)
    print(f"ok promoted {len(FAMILIES) * 2} native PixelLab terrain cells and {len(FAMILIES)} original patterns")


def main() -> None:
    build_candidate_review()
    write_contact_sheets()
    promote()


if __name__ == "__main__":
    main()
