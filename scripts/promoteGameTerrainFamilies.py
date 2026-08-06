#!/usr/bin/env python3
"""Promote selected native PixelLab game-terrain candidates without resampling."""

from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / ".pixel-work" / "pixelgen"
OUTPUT = ROOT / "public" / "assets" / "terrain" / "game-native"
TILE = 32

FAMILIES = {
    "deepwood": {
        "wang": "game-terrain-native-wang/deepwood",
        "details": {"micro": ("deepwood-micro", 1)},
    },
    "mosswold": {
        "wang": "game-terrain-native-wang/mosswold",
        "details": {"micro": ("mosswold-micro", 1), "macro": ("mosswold-macro", 2)},
    },
    "ashsteppe": {
        "wang": "game-terrain-native-wang-retry/ashsteppe",
        "details": {"micro": ("ashsteppe-micro", 1)},
    },
    "barrowfield": {
        "wang": "game-terrain-native-wang/barrowfield",
        "details": {"micro": ("barrowfield-micro", 2)},
    },
    "lacquer-flats": {
        "wang": "game-terrain-native-wang-retry/lacquer-flats",
        "details": {"micro": ("lacquer-flats-micro", 2), "macro": ("lacquer-flats-macro", 2)},
    },
    "mire": {
        "wang": "game-terrain-native-wang/mire",
        "details": {"micro": ("mire-micro", 1)},
    },
}


def native(path: Path) -> None:
    with Image.open(path) as image:
        if image.size != (TILE, TILE):
            raise SystemExit(f"{path.relative_to(ROOT)} is {image.size}, expected 32x32")


def main() -> None:
    details_root = WORK / "game-terrain-native-details-retry"
    promoted = 0
    for family, selection in FAMILIES.items():
        destination = OUTPUT / family
        destination.mkdir(parents=True, exist_ok=True)
        strip = Image.new("RGBA", (16 * TILE, TILE))
        wang_root = WORK / str(selection["wang"])
        for index in range(1, 17):
            source = wang_root / f"candidate-2-tiles-{index}.png"
            # Pixelgen deduplicates identical frames across candidates. Barrowfield's selected
            # interior 13 is byte-identical to the first candidate and therefore has no second file.
            if not source.is_file():
                source = wang_root / f"candidate-1-tiles-{index}.png"
            if not source.is_file():
                raise SystemExit(f"missing selected Wang cell {source.relative_to(ROOT)}")
            native(source)
            target = destination / f"wang-{index:02}.png"
            shutil.copyfile(source, target)
            with Image.open(source) as image:
                strip.paste(image.convert("RGBA"), ((index - 1) * TILE, 0))
            promoted += 1
        strip.save(destination / "wang-strip.png", optimize=True)

        for role, (folder, candidate) in selection["details"].items():
            source = details_root / folder / f"candidate-{candidate}.png"
            native(source)
            shutil.copyfile(source, destination / f"detail-{role}.png")
            promoted += 1

    print(f"ok promoted {promoted} selected native PixelLab game-terrain cells across {len(FAMILIES)} families")


if __name__ == "__main__":
    main()
