#!/usr/bin/env python3
"""Promote connected PixelLab backbones and irregular terrain-facing forms."""

from pathlib import Path

from promoteRockyMountains import stoneify


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "assets" / "decorations"
SELECTIONS = {
    "mountain-rocky-backbone-1.png": (
        ".pixel-work/pixelgen/mountain-rocky-connected-backbones/"
        "backbone-compact/candidate-1.png"
    ),
    "mountain-rocky-backbone-2.png": (
        ".pixel-work/pixelgen/mountain-rocky-connected-backbones/"
        "backbone-compact/candidate-2.png"
    ),
    "mountain-rocky-backbone-3.png": (
        ".pixel-work/pixelgen/mountain-rocky-backbone-variety/"
        "backbone-b/candidate-1.png"
    ),
    "mountain-rocky-backbone-4.png": (
        ".pixel-work/pixelgen/mountain-rocky-backbone-variety/"
        "backbone-b/candidate-2.png"
    ),
    "mountain-rocky-backbone-5.png": (
        ".pixel-work/pixelgen/mountain-rocky-backbone-variety/"
        "backbone-b/candidate-3.png"
    ),
    "mountain-rocky-backbone-6.png": (
        ".pixel-work/pixelgen/mountain-rocky-backbone-variety/"
        "backbone-c/candidate-2.png"
    ),
    "mountain-rocky-backbone-7.png": (
        ".pixel-work/pixelgen/mountain-rocky-backbone-variety/"
        "backbone-d/candidate-1.png"
    ),
    "mountain-rocky-backbone-8.png": (
        ".pixel-work/pixelgen/mountain-rocky-backbone-variety/"
        "backbone-d/candidate-2.png"
    ),
}


def hash_value(seed: int, value: int) -> int:
    result = (seed ^ (value * 0x45D9F3B)) & 0xFFFFFFFF
    result = ((result >> 16) ^ result) * 0x45D9F3B & 0xFFFFFFFF
    return (result >> 16) ^ result


def irregular_boundary(image, variant: int):
    """Remove pixels to expose terrain at the front and sides; never resample."""
    result = image.copy()
    pixels = result.load()
    width, height = result.size

    # Transparent side margins vary every few rows. The mountain still occupies more than 90%
    # of its six-tile canvas, but no vertical canvas edge can become a ruler-straight cliff.
    left_centre = 76 + hash_value(variant * 101 + 17, 0) % 34
    right_centre = 76 + hash_value(variant * 103 + 29, 0) % 34
    for y in range(height):
        left = 6 + min(8, abs(y - left_centre) // 5) \
            + hash_value(variant * 107 + 31, y // 5) % 2
        right = 6 + min(8, abs(y - right_centre) // 5) \
            + hash_value(variant * 109 + 37, y // 6) % 2
        for x in range(left):
            pixels[x, y] = (0, 0, 0, 0)
        for x in range(width - right, width):
            pixels[x, y] = (0, 0, 0, 0)

    # A transparent margin alone merely moves a vertical cut inward. Turn both outer ends into
    # low shoulders: only near-ground rock survives at the canvas edge, and the visible height
    # rises over roughly one tile before reaching the untouched mountain. Two-cell compositor
    # overlap hides these tapers at joins but exposes them naturally against flat terrain.
    left_taper = 34 + hash_value(variant * 127 + 41, 0) % 11
    right_taper = 34 + hash_value(variant * 131 + 47, 0) % 11
    left_outer_top = 106 + hash_value(variant * 137 + 53, 0) % 9
    right_outer_top = 106 + hash_value(variant * 139 + 59, 0) % 9
    inner_top = 47 + hash_value(variant * 149 + 61, 0) % 10
    for x in range(6, 6 + left_taper):
        progress = (x - 6) / left_taper
        threshold = round(left_outer_top * (1 - progress) + inner_top * progress)
        threshold += hash_value(variant * 151 + 67, x // 4) % 3 - 1
        for y in range(max(0, threshold)):
            pixels[x, y] = (0, 0, 0, 0)
    right_start = width - 7
    for x in range(right_start, right_start - right_taper, -1):
        progress = (right_start - x) / right_taper
        threshold = round(right_outer_top * (1 - progress) + inner_top * progress)
        threshold += hash_value(variant * 157 + 71, x // 4) % 3 - 1
        for y in range(max(0, threshold)):
            pixels[x, y] = (0, 0, 0, 0)

    # A coarse, gently interpolated profile cuts 2–7px of stone from most of the bottom. Three
    # short, variant-specific toe clusters remain bottom-anchored so the obstacle feels grounded
    # without drawing a full-width horizontal baseline.
    step = 8
    nodes = [2 + hash_value(variant * 211 + 43, index) % 6
             for index in range(width // step + 2)]
    toe_centres = [
        24 + hash_value(variant * 307 + 5, 0) % 32,
        80 + hash_value(variant * 307 + 7, 1) % 32,
        144 + hash_value(variant * 307 + 11, 2) % 28,
    ]
    for x in range(width):
        node = x // step
        fraction = (x % step) / step
        inset = round(nodes[node] * (1 - fraction) + nodes[node + 1] * fraction)
        for centre in toe_centres:
            distance = abs(x - centre)
            if distance <= 10:
                # A seven-pixel toe touches the baseline, with shallow shoulders around it.
                inset = min(inset, max(0, (distance - 3) // 2))
        cutoff = height - 1 - inset
        for y in range(cutoff + 1, height):
            pixels[x, y] = (0, 0, 0, 0)

    alpha = result.getchannel("A")
    if alpha.getbbox() is None:
        raise ValueError(f"boundary {variant} became empty")
    bottom_pixels = sum(alpha.getpixel((x, height - 1)) >= 128 for x in range(width))
    side_pixels = sum(alpha.getpixel((0, y)) >= 128 or alpha.getpixel((width - 1, y)) >= 128
                      for y in range(height))
    if not 1 <= bottom_pixels <= width // 4:
        raise ValueError(f"boundary {variant} has {bottom_pixels} opaque bottom pixels")
    if side_pixels:
        raise ValueError(f"boundary {variant} still touches a side canvas edge")
    return result


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for variant, (filename, relative) in enumerate(SELECTIONS.items(), start=1):
        image = stoneify(ROOT / relative, (192, 128))
        image.save(OUTPUT / filename)
        boundary = irregular_boundary(image, variant)
        boundary.save(OUTPUT / f"mountain-rocky-boundary-{variant}.png")
    print(f"ok {len(SELECTIONS)} full + {len(SELECTIONS)} irregular rocky backbones"
          " · native 192x128 · no resampling")


if __name__ == "__main__":
    main()
