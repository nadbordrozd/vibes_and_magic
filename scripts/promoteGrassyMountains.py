#!/usr/bin/env python3
"""Promote selected native PixelLab mountains without resampling production pixels."""

from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/assets/decorations"
REVIEW = ROOT / ".pixel-work/review/grassy-mountain-native-contact.png"

SELECTIONS = {
    "mountain-granite-knoll-1.png": (
        ".pixel-work/pixelgen/mountain-grassy-native-family/knoll-1/candidate-1.png", (64, 64)),
    "mountain-granite-knoll-2.png": (
        ".pixel-work/pixelgen/mountain-grassy-native-family/knoll-2/candidate-1.png", (64, 64)),
    "mountain-granite-knoll-3.png": (
        ".pixel-work/pixelgen/mountain-grassy-native-family/knoll-3/candidate-2.png", (64, 64)),
    "mountain-granite-knoll-4.png": (
        ".pixel-work/pixelgen/mountain-grassy-native-family/knoll-4/candidate-2.png", (64, 64)),
    "mountain-granite-ridge-1.png": (
        ".pixel-work/pixelgen/grassy-mountain-native-probe-v2/folded-ridge/candidate-1.png", (96, 96)),
    "mountain-granite-ridge-2.png": (
        ".pixel-work/pixelgen/grassy-mountain-native-probe-v2/horseshoe-ridge/candidate-1.png", (96, 96)),
    "mountain-granite-ridge-3.png": (
        ".pixel-work/pixelgen/mountain-grassy-native-family/ridge-3/candidate-1.png", (96, 96)),
    "mountain-granite-ridge-4.png": (
        ".pixel-work/pixelgen/mountain-grassy-native-family/ridge-4/candidate-1.png", (96, 96)),
    "mountain-granite-massif-1.png": (
        ".pixel-work/pixelgen/mountain-grassy-native-family/massif-1/candidate-2.png", (160, 112)),
    "mountain-granite-massif-2.png": (
        ".pixel-work/pixelgen/mountain-grassy-native-family/massif-2/candidate-2.png", (160, 112)),
}

GREEN = [
    (15, 43, 22), (20, 57, 25), (26, 72, 29), (32, 87, 33),
    (40, 101, 38), (49, 115, 43), (61, 129, 50), (76, 143, 58),
    (94, 156, 69), (116, 169, 82),
]
STONE = [(118, 111, 78), (145, 136, 94), (174, 164, 116), (207, 196, 145)]


def ramp(value: int, colors: list[tuple[int, int, int]]) -> tuple[int, int, int]:
    index = min(len(colors) - 1, max(0, value * len(colors) // 256))
    return colors[index]


def remove_disconnected_specks(image: Image.Image) -> None:
    """Keep the one connected landform; PixelLab occasionally emits a detached one-pixel fleck."""
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


def grassify(source: Path, expected: tuple[int, int]) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    if image.size != expected:
        raise ValueError(f"{source}: {image.size} is not native {expected}")
    alpha = image.getchannel("A")
    box = alpha.getbbox()
    if not box:
        raise ValueError(f"{source}: empty silhouette")

    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, opacity = pixels[x, y]
            if opacity < 128:
                pixels[x, y] = (0, 0, 0, 0)
                continue
            light = round(red * 0.28 + green * 0.57 + blue * 0.15)
            already_green = green > red * 1.07 and green > blue * 1.12
            # Bright original ridge strokes remain sparse exposed stone; every shadow and mid-plane
            # becomes turf, making the family read green first without flattening its folds.
            if light >= 168 and not already_green:
                color = ramp((light - 150) * 2, STONE)
            else:
                color = ramp(min(255, round(light * 1.18)), GREEN)
            pixels[x, y] = (*color, 255)

    remove_disconnected_specks(image)

    # PixelLab sometimes leaves one or two transparent rows below a correct silhouette. Translate
    # down inside the unchanged canvas; never crop or resize production art.
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
        image = grassify(ROOT / relative, expected)
        image.save(OUTPUT / filename)
        promoted.append((filename, image))

    columns, card_w, card_h, scale = 2, 420, 300, 3
    rows = (len(promoted) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * card_w, rows * card_h), (15, 19, 16))
    draw = ImageDraw.Draw(sheet)
    for index, (filename, image) in enumerate(promoted):
        left = index % columns * card_w
        top = index // columns * card_h
        draw.text((left + 12, top + 9), filename, fill=(238, 231, 204))
        for panel, background in enumerate(((48, 116, 48), (224, 220, 199))):
            x = left + 12 + panel * 200
            y = top + 34
            draw.rectangle((x, y, x + 188, y + 252), fill=background)
            shown = image.resize(
                (image.width * scale, image.height * scale), Image.Resampling.NEAREST)
            sheet.paste(shown, (x + (188 - shown.width) // 2, y + 244 - shown.height), shown)
    sheet.save(REVIEW)
    print(f"ok {len(promoted)} native grassy mountain pieces · no production resampling")
    print(REVIEW)


if __name__ == "__main__":
    main()
