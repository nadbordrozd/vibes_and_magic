#!/usr/bin/env python3
"""Bake four retained built-in mine sources into native hard-alpha map sprites."""

from __future__ import annotations

from hashlib import sha256
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/sources/mines"
OUTPUT = ROOT / "public/assets/mines"
REVIEW = ROOT / ".pixel-work/review/mines/mine-sprites-contact-sheet.png"
CANVAS = (64, 96)
MAX_SUBJECT = (60, 92)

MINES = {
    "gold": {"label": "Gold quarry", "key": (18, 241, 21)},
    "iron": {"label": "Iron headframe", "key": (19, 243, 17)},
    # The generated source includes a detached presentation pile at far left. Production keeps
    # the complete shelter, sawbench, crosscut saw and right blocking stack as one site silhouette.
    "timber": {
        "label": "Timber saw yard", "key": (233, 12, 219),
        "crop": (500, 150, 1320, 970),
    },
    "essence": {"label": "Essence stitchwell", "key": (16, 242, 15)},
}


def remove_chroma(image: Image.Image, key: tuple[int, int, int]) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = []
    for red, green, blue, _alpha in rgba.get_flattened_data():
        distance = ((red - key[0]) ** 2 + (green - key[1]) ** 2
                    + (blue - key[2]) ** 2) ** .5
        pixels.append((red, green, blue, 0 if distance <= 110 else 255))
    rgba.putdata(pixels)
    return rgba


def bake(stem: str, config: dict) -> Image.Image:
    source = Image.open(SOURCE / f"{stem}-source.png")
    if crop := config.get("crop"):
        source = source.crop(crop)
    keyed = remove_chroma(source, config["key"])
    bounds = keyed.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError(f"No visible mine subject in {stem} source")
    subject = keyed.crop(bounds)
    scale = min(MAX_SUBJECT[0] / subject.width, MAX_SUBJECT[1] / subject.height)
    size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
    subject = subject.resize(size, Image.Resampling.NEAREST)

    alpha = subject.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
    rgb = subject.convert("RGB").quantize(
        colors=48, method=Image.Quantize.MEDIANCUT,
    ).convert("RGB")
    # Quantization can pull a surviving antialias pixel back toward the key. Re-key the reduced
    # palette so the deterministic final cannot retain a one-pixel chroma fringe.
    reduced_alpha = []
    for (red, green, blue), visible in zip(
        rgb.get_flattened_data(), alpha.get_flattened_data(), strict=True,
    ):
        distance = ((red - config["key"][0]) ** 2 + (green - config["key"][1]) ** 2
                    + (blue - config["key"][2]) ** 2) ** .5
        reduced_alpha.append(0 if visible and distance <= 120 else visible)
    alpha.putdata(reduced_alpha)
    subject = rgb.convert("RGBA")
    subject.putalpha(alpha)

    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    canvas.alpha_composite(subject, ((CANVAS[0] - subject.width) // 2,
                                     CANVAS[1] - subject.height))
    return canvas


def checkerboard(size: tuple[int, int], cell: int = 12) -> Image.Image:
    board = Image.new("RGB", size, "#e7dfca")
    draw = ImageDraw.Draw(board)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill="#bec6b4")
    return board


def contact_sheet(sprites: dict[str, Image.Image]) -> None:
    card_width, card_height = 360, 500
    sheet = Image.new("RGB", (card_width * 2, card_height * 2), "#111711")
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.load_default(size=20)
    small_font = ImageFont.load_default(size=13)
    for index, (stem, config) in enumerate(MINES.items()):
        left, top = index % 2 * card_width, index // 2 * card_height
        draw.rectangle((left + 8, top + 8, left + card_width - 8, top + card_height - 8),
                       fill="#1b231b", outline="#c7a950", width=2)
        draw.text((left + 20, top + 18), config["label"], fill="#f0d878", font=title_font)
        native = sprites[stem]
        enlarged = native.resize((256, 384), Image.Resampling.NEAREST)
        board = checkerboard(enlarged.size)
        board.paste(enlarged, (0, 0), enlarged)
        sheet.paste(board, (left + 52, top + 54))
        contact_y = top + 54 + 64 * 4
        draw.line((left + 52, contact_y, left + 308, contact_y), fill="#e2624f", width=2)
        draw.rectangle((left + 52, contact_y, left + 180, top + 438),
                       outline="#58b9db", width=2)
        draw.text((left + 20, top + 454),
                  "64x96 RGBA | contact y=64..95 | entrance (0,0)",
                  fill="#aebaa9", font=small_font)
    REVIEW.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(REVIEW, optimize=True)


def stats(image: Image.Image) -> tuple[int, int, tuple[int, int, int, int]]:
    alpha = image.getchannel("A")
    histogram = alpha.histogram()
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("Mine has no visible pixels")
    return histogram[0], sum(histogram[1:255]), bounds


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    sprites = {stem: bake(stem, config) for stem, config in MINES.items()}
    for stem, image in sprites.items():
        target = OUTPUT / f"{stem}.png"
        image.save(target, optimize=True)
        transparent, partial, bounds = stats(image)
        digest = sha256(target.read_bytes()).hexdigest()
        print(f"{stem}: {image.width}x{image.height} bbox={bounds} "
              f"transparent={transparent} partial={partial} sha256={digest}")
    contact_sheet(sprites)
    print(REVIEW.relative_to(ROOT))


if __name__ == "__main__":
    main()
