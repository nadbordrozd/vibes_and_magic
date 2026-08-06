#!/usr/bin/env python3
"""Build native-size PixelLab init guides from approved rocky mountain sprites.

The source pixels are never resized. Heavy overlap creates a single continuous
silhouette for PixelLab to reinterpret as a joined mountain backbone.
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DECORATIONS = ROOT / "public" / "assets" / "decorations"
OUTPUT = ROOT / "assets" / "guides" / "rocky-mountain-backbone-init.png"
COMPACT_OUTPUT = ROOT / "assets" / "guides" / "rocky-mountain-backbone-compact-init.png"
VARIETY_OUTPUTS = (
    ROOT / "assets" / "guides" / "rocky-mountain-backbone-variety-b-init.png",
    ROOT / "assets" / "guides" / "rocky-mountain-backbone-variety-c-init.png",
    ROOT / "assets" / "guides" / "rocky-mountain-backbone-variety-d-init.png",
)


def composite(canvas: Image.Image, name: str, x: int, y: int) -> None:
    sprite = Image.open(DECORATIONS / name).convert("RGBA")
    canvas.alpha_composite(sprite, (x, y))


def save_compact_guide(
    output: Path, placements: tuple[tuple[str, int, int], ...],
) -> None:
    canvas = Image.new("RGBA", (192, 128), (0, 0, 0, 0))
    for name, x, y in placements:
        composite(canvas, name, x, y)
    canvas.save(output)


def main() -> None:
    canvas = Image.new("RGBA", (256, 160), (0, 0, 0, 0))

    # Rear crests first, foreground massifs last. Every source stays at its
    # final native resolution; negative and overflowing coordinates only crop.
    composite(canvas, "mountain-rocky-ridge-3.png", -12, 34)
    composite(canvas, "mountain-rocky-ridge-3.png", 72, 27)
    composite(canvas, "mountain-rocky-ridge-3.png", 164, 39)
    composite(canvas, "mountain-rocky-massif-2.png", -34, 48)
    composite(canvas, "mountain-rocky-massif-1.png", 42, 43)
    composite(canvas, "mountain-rocky-massif-2.png", 132, 48)
    composite(canvas, "mountain-rocky-ridge-1.png", 180, 64)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT)

    save_compact_guide(COMPACT_OUTPUT, (
        ("mountain-rocky-ridge-3.png", -10, 20),
        ("mountain-rocky-ridge-3.png", 72, 14),
        ("mountain-rocky-ridge-3.png", 138, 23),
        ("mountain-rocky-massif-2.png", -42, 16),
        ("mountain-rocky-massif-1.png", 26, 16),
        ("mountain-rocky-massif-2.png", 92, 16),
    ))
    save_compact_guide(VARIETY_OUTPUTS[0], (
        ("mountain-rocky-ridge-2.png", -18, 25),
        ("mountain-rocky-ridge-4.png", 48, 11),
        ("mountain-rocky-ridge-1.png", 116, 24),
        ("mountain-rocky-massif-1.png", -54, 16),
        ("mountain-rocky-massif-2.png", 18, 16),
        ("mountain-rocky-massif-1.png", 92, 16),
    ))
    save_compact_guide(VARIETY_OUTPUTS[1], (
        ("mountain-rocky-ridge-1.png", -28, 26),
        ("mountain-rocky-ridge-3.png", 34, 8),
        ("mountain-rocky-ridge-2.png", 106, 20),
        ("mountain-rocky-ridge-4.png", 158, 27),
        ("mountain-rocky-massif-2.png", -66, 16),
        ("mountain-rocky-massif-1.png", 4, 16),
        ("mountain-rocky-massif-2.png", 78, 16),
        ("mountain-rocky-massif-1.png", 148, 16),
    ))
    save_compact_guide(VARIETY_OUTPUTS[2], (
        ("mountain-rocky-ridge-4.png", -20, 18),
        ("mountain-rocky-ridge-1.png", 42, 26),
        ("mountain-rocky-ridge-3.png", 104, 9),
        ("mountain-rocky-ridge-2.png", 162, 25),
        ("mountain-rocky-massif-1.png", -72, 16),
        ("mountain-rocky-massif-2.png", -2, 16),
        ("mountain-rocky-massif-1.png", 68, 16),
        ("mountain-rocky-massif-2.png", 140, 16),
    ))


if __name__ == "__main__":
    main()
