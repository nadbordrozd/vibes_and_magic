#!/usr/bin/env python3
"""Promote selected native PixelLab rocky mountains without resampling production pixels."""

from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/assets/decorations"
REVIEW = ROOT / ".pixel-work/review/rocky-mountain-native-contact.png"

SELECTIONS = {
    "mountain-rocky-knoll-1.png": (
        ".pixel-work/pixelgen/mountain-rocky-native-family/knoll-1/candidate-1.png", (64, 64)),
    "mountain-rocky-knoll-2.png": (
        ".pixel-work/pixelgen/mountain-rocky-native-family/knoll-2/candidate-1.png", (64, 64)),
    "mountain-rocky-knoll-3.png": (
        ".pixel-work/pixelgen/mountain-rocky-native-family/knoll-3/candidate-2.png", (64, 64)),
    "mountain-rocky-knoll-4.png": (
        ".pixel-work/pixelgen/mountain-rocky-native-family/knoll-4/candidate-1.png", (64, 64)),
    "mountain-rocky-ridge-1.png": (
        ".pixel-work/pixelgen/mountain-rocky-native-family/ridge-1/candidate-2.png", (96, 96)),
    "mountain-rocky-ridge-2.png": (
        ".pixel-work/pixelgen/mountain-rocky-native-family/ridge-2/candidate-2.png", (96, 96)),
    "mountain-rocky-ridge-3.png": (
        ".pixel-work/pixelgen/mountain-rocky-native-family/ridge-3/candidate-1.png", (96, 96)),
    "mountain-rocky-ridge-4.png": (
        ".pixel-work/pixelgen/mountain-rocky-native-family/ridge-4/candidate-1.png", (96, 96)),
    "mountain-rocky-massif-1.png": (
        ".pixel-work/pixelgen/mountain-rocky-native-family/massif-1/candidate-1.png", (160, 112)),
    "mountain-rocky-massif-2.png": (
        ".pixel-work/pixelgen/mountain-rocky-native-family/massif-2/candidate-2.png", (160, 112)),
}

ROCK = [
    (24, 28, 31), (34, 39, 43), (46, 52, 57), (59, 65, 69),
    (73, 79, 81), (89, 94, 94), (107, 111, 108), (128, 130, 123),
    (151, 150, 138), (181, 177, 158),
]
MOSS = [
    (31, 43, 31), (42, 56, 36), (55, 70, 42), (70, 84, 49),
    (87, 99, 59), (107, 116, 71),
]


def ramp(value: int, colors: list[tuple[int, int, int]]) -> tuple[int, int, int]:
    index = min(len(colors) - 1, max(0, value * len(colors) // 256))
    return colors[index]


def remove_disconnected_specks(image: Image.Image) -> None:
    pixels = image.load()
    opaque = {(x, y) for y in range(image.height) for x in range(image.width)
              if pixels[x, y][3] >= 128}
    components: list[set[tuple[int, int]]] = []
    while opaque:
        frontier = [opaque.pop()]
        component = set(frontier)
        while frontier:
            x, y = frontier.pop()
            for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if neighbor in opaque:
                    opaque.remove(neighbor)
                    component.add(neighbor)
                    frontier.append(neighbor)
        components.append(component)
    if not components:
        return
    keep = max(components, key=len)
    for component in components:
        if component is keep:
            continue
        for x, y in component:
            pixels[x, y] = (0, 0, 0, 0)


def stoneify(source: Path, expected: tuple[int, int]) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    if image.size != expected:
        raise ValueError(f"{source}: {image.size} is not native {expected}")
    if not image.getchannel("A").getbbox():
        raise ValueError(f"{source}: empty silhouette")

    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, opacity = pixels[x, y]
            if opacity < 128:
                pixels[x, y] = (0, 0, 0, 0)
                continue
            light = round(red * 0.28 + green * 0.57 + blue * 0.15)
            mossy = green > red * 1.12 and green > blue * 1.08 and light < 145
            color = ramp(min(255, round(light * 1.08)), MOSS if mossy else ROCK)
            pixels[x, y] = (*color, 255)

    remove_disconnected_specks(image)
    box = image.getchannel("A").getbbox()
    assert box is not None
    shift = image.height - box[3]
    if shift:
        moved = Image.new("RGBA", image.size, (0, 0, 0, 0))
        moved.alpha_composite(image, (0, shift))
        image = moved
    if image.size != expected:
        raise AssertionError("production image was resampled")
    return image


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    REVIEW.parent.mkdir(parents=True, exist_ok=True)
    promoted: list[tuple[str, Image.Image]] = []
    for filename, (relative, expected) in SELECTIONS.items():
        image = stoneify(ROOT / relative, expected)
        image.save(OUTPUT / filename)
        promoted.append((filename, image))

    columns, card_w, card_h, scale = 2, 420, 300, 3
    rows = (len(promoted) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * card_w, rows * card_h), (15, 19, 20))
    draw = ImageDraw.Draw(sheet)
    for index, (filename, image) in enumerate(promoted):
        left = index % columns * card_w
        top = index // columns * card_h
        draw.text((left + 12, top + 9), filename, fill=(238, 231, 204))
        for panel, background in enumerate(((55, 122, 54), (224, 220, 199))):
            x = left + 12 + panel * 200
            y = top + 34
            draw.rectangle((x, y, x + 188, y + 252), fill=background)
            shown = image.resize(
                (image.width * scale, image.height * scale), Image.Resampling.NEAREST)
            sheet.paste(shown, (x + (188 - shown.width) // 2, y + 244 - shown.height), shown)
    sheet.save(REVIEW)
    print(f"ok {len(promoted)} native rocky mountain pieces · no production resampling")
    print(REVIEW)


if __name__ == "__main__":
    main()
