#!/usr/bin/env python3
"""Deterministically key, crop, palette-limit, and hard-alpha hero-dashboard sources."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT = ROOT / "assets/sources/hero-dashboard"
FINAL_ROOT = ROOT / ".pixel-work/hero-dashboard/final"
PUBLISH_ROOT = ROOT / "public/assets/hero-dashboard"
WORK_ROOT = ROOT / ".pixel-work/hero-dashboard"
REVIEW_ROOT = ROOT / ".pixel-work/review/hero-dashboard"
FAMILIES = {
    "portraits": (96, 90),
    "specialties": (32, 28),
    "primary-stats": (32, 28),
    "vitals": (32, 28),
}


def chroma_distance(pixel: tuple[int, int, int], key: tuple[int, int, int]) -> int:
    return max(abs(pixel[0] - key[0]), abs(pixel[1] - key[1]), abs(pixel[2] - key[2]))


def bake(source: Path, target: Path, native: int, fit: int) -> None:
    image = Image.open(source).convert("RGB")
    # Top corners remain chroma even when a provider lets a bust touch the lower source edge.
    corners = [image.getpixel((0, 0)), image.getpixel((image.width - 1, 0))]
    key = tuple(sum(pixel[index] for pixel in corners) // 4 for index in range(3))
    red, green, blue = image.split()
    if key[1] > key[0] + 80 and key[1] > key[2] + 80:
        dominance = ImageChops.subtract(green, ImageChops.lighter(red, blue))
    elif key[0] > key[1] + 80 and key[2] > key[1] + 80:
        dominance = ImageChops.subtract(ImageChops.darker(red, blue), green)
    else:
        raise ValueError(f"{source}: unsupported non-green/non-magenta chroma key {key}")
    # Generated backgrounds vary in brightness, so key on channel dominance rather than distance.
    alpha = dominance.point(lambda value: 0 if value >= 16 else 255)
    rgba = image.convert("RGBA")
    rgba.putalpha(alpha)
    bbox = alpha.getbbox()
    if not bbox:
        raise ValueError(f"{source}: chroma removal found no subject")
    crop = rgba.crop(bbox)
    scale = min(fit / crop.width, fit / crop.height)
    size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
    reduced = crop.resize(size, Image.Resampling.LANCZOS)
    reduced_alpha = reduced.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
    rgb = reduced.convert("RGB").quantize(colors=64, method=Image.Quantize.MEDIANCUT,
                                            dither=Image.Dither.NONE).convert("RGB")
    reduced = Image.merge("RGBA", (*rgb.split(), reduced_alpha))
    canvas = Image.new("RGBA", (native, native))
    canvas.alpha_composite(reduced, ((native - size[0]) // 2, (native - size[1]) // 2))
    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target, optimize=False)


def checker(size: tuple[int, int], square: int = 8) -> Image.Image:
    image = Image.new("RGB", size, "#e8e4d5")
    pixels = image.load()
    for y in range(size[1]):
        for x in range(size[0]):
            if (x // square + y // square) % 2:
                pixels[x, y] = (201, 207, 194)
    return image


def contact_sheet(paths: list[Path], output: Path, scale: int, thumbnail: int | None = None) -> None:
    columns = 6
    display_w = thumbnail or max(Image.open(path).width for path in paths) * scale
    display_h = thumbnail or max(Image.open(path).height for path in paths) * scale
    cell_w = display_w + 12
    cell_h = display_h + 28
    rows = (len(paths) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * cell_w, rows * cell_h), "#18201b")
    from PIL import ImageDraw
    draw = ImageDraw.Draw(sheet)
    for index, path in enumerate(paths):
        x = (index % columns) * cell_w
        y = (index // columns) * cell_h
        image = Image.open(path).convert("RGBA")
        display_size = (display_w, display_h) if thumbnail else (image.width * scale, image.height * scale)
        bg = checker(display_size, max(2, 8 * scale))
        enlarged = image.resize(display_size,
                                 Image.Resampling.LANCZOS if thumbnail else Image.Resampling.NEAREST)
        bg.paste(enlarged, (0, 0), enlarged)
        sheet.paste(bg, (x + 6, y + 20))
        draw.text((x + 6, y + 4), path.stem, fill="#f1d45c")
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, optimize=False)


def build() -> None:
    for family, (native, fit) in FAMILIES.items():
        sources = sorted((SOURCE_ROOT / family).glob("*-source.png"))
        for source in sources:
            name = source.name.removesuffix("-source.png") + ".png"
            bake(source, FINAL_ROOT / family / name, native, fit)
    finals = [path for family in FAMILIES for path in sorted((FINAL_ROOT / family).glob("*.png"))]
    sources = [path for family in FAMILIES for path in sorted((SOURCE_ROOT / family).glob("*-source.png"))]
    contact_sheet(sources, REVIEW_ROOT / "source-contact-sheet.png", 1, 160)
    contact_sheet(finals, REVIEW_ROOT / "native-contact-sheet.png", 1)
    contact_sheet(finals, REVIEW_ROOT / "3x-contact-sheet.png", 3)
    portraits = sorted((FINAL_ROOT / "portraits").glob("*.png"))
    icons = [path for family in ("specialties", "primary-stats", "vitals")
             for path in sorted((FINAL_ROOT / family).glob("*.png"))]
    contact_sheet(portraits, REVIEW_ROOT / "portraits-native-contact-sheet.png", 1)
    contact_sheet(portraits, REVIEW_ROOT / "portraits-3x-contact-sheet.png", 3)
    contact_sheet(icons, REVIEW_ROOT / "icons-native-contact-sheet.png", 1)
    contact_sheet(icons, REVIEW_ROOT / "icons-3x-contact-sheet.png", 3)


def promote() -> None:
    for family in FAMILIES:
        sources = sorted((FINAL_ROOT / family).glob("*.png"))
        if not sources:
            raise ValueError(f"{family}: deterministic finals are missing; run build first")
        target_dir = PUBLISH_ROOT / family
        target_dir.mkdir(parents=True, exist_ok=True)
        for source in sources:
            shutil.copyfile(source, target_dir / source.name)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["build", "promote"])
    if parser.parse_args().command == "build":
        build()
    else:
        promote()
