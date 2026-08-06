#!/usr/bin/env python3
"""Build fresh native A1 composition guides; these are PixelLab inputs, never shipped art."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "guides"
SIZE = 32

PALETTES = {
    "meadow": [(92, 116, 57), (101, 126, 62), (113, 134, 68), (82, 103, 52)],
    "deepwood": [(48, 62, 39), (55, 70, 43), (63, 76, 46), (69, 62, 39)],
    "mountain": [(104, 105, 99), (118, 117, 108), (91, 94, 91), (128, 126, 114)],
    "water": [(48, 86, 99), (54, 96, 108), (64, 105, 113), (43, 78, 92)],
}

A3_PALETTES = {
    "ashsteppe-south": [(119, 101, 72), (132, 111, 76), (98, 91, 72), (71, 69, 61)],
    "barrowfield-default": [(137, 136, 119), (151, 148, 127), (120, 123, 112), (164, 155, 127)],
    "deepwood-mossy": [(43, 60, 42), (54, 73, 48), (68, 85, 53), (75, 69, 47)],
    "hush-north": [(190, 203, 202), (207, 215, 210), (163, 184, 189), (181, 194, 192)],
    "lacquerFlats-default": [(112, 74, 69), (127, 82, 73), (91, 66, 65), (139, 91, 77)],
    "meadow-coastal": [(84, 119, 68), (98, 134, 76), (111, 139, 76), (73, 104, 66)],
    "mire-coastal": [(57, 77, 66), (64, 91, 76), (52, 83, 84), (75, 90, 69)],
    "mosswold-mossy": [(72, 103, 63), (84, 116, 70), (64, 91, 58), (91, 111, 68)],
    "mountain-snowcap": [(113, 119, 121), (137, 143, 141), (91, 101, 106), (168, 171, 163)],
    "water-coastal": [(42, 83, 101), (49, 94, 110), (59, 106, 116), (36, 72, 91)],
}


def coordinate_hash(seed: int, x: int, y: int) -> int:
    value = (seed ^ ((x + 1) * 0x9E3779B1) ^ ((y + 1) * 0x85EBCA6B)) & 0xFFFFFFFF
    value ^= value >> 16
    value = (value * 0x7FEB352D) & 0xFFFFFFFF
    value ^= value >> 15
    return value


def guide(name: str, seed: int) -> None:
    palette = PALETTES[name]
    pixels = [palette[0]] * (SIZE * SIZE)
    for y in range(SIZE):
        for x in range(SIZE):
            # Hash a torus: opposite-edge pixels share coordinates while the interior
            # remains irregular, avoiding both seams and mirrored/checker structure.
            wrapped_x = 0 if x == SIZE - 1 else x
            wrapped_y = 0 if y == SIZE - 1 else y
            noise = coordinate_hash(seed, wrapped_x, wrapped_y) % 100
            index = 1 if noise < 9 else 2 if noise < 15 else 3 if noise < 18 else 0
            if name == "water" and (x + 2 * y) % 17 in {0, 1}:
                index = 2
            elif name == "mountain" and (2 * x - y) % 23 == 0:
                index = 3
            pixels[y * SIZE + x] = palette[index]
    image = Image.new("RGBA", (SIZE, SIZE))
    image.putdata([(*color, 255) for color in pixels])
    image.save(OUT / f"a1-{name}-base.png")


def landscape_meadow_guide() -> None:
    """Build one broad continuous material guide with no cell-scale motifs."""
    size = 256
    # Rich meadow values sampled by eye from the approved H2-era target: deep
    # blue-green shadows, a clear grassy middle and warm yellow-green catches.
    # The previous olive-only guide made the terrain and storybook objects look
    # as though they belonged to different games.
    palette = [
        (48, 105, 48),
        (39, 84, 43),
        (61, 125, 51),
        (76, 145, 58),
        (103, 158, 69),
        (134, 158, 75),
        (105, 89, 49),
    ]
    pixels = [palette[0]] * (size * size)
    for y in range(size):
        for x in range(size):
            wrapped_x = 0 if x == size - 1 else x
            wrapped_y = 0 if y == size - 1 else y
            noise = coordinate_hash(91420, wrapped_x, wrapped_y) % 1000
            # Fine clustered variation only. The previous low-frequency sine
            # field painted large circular "bushes" into the lawn; at map scale
            # those were as distracting as visible square cells.
            neighbor = coordinate_hash(61423, wrapped_x // 3, wrapped_y // 3) % 1000
            if noise < 26 or neighbor < 18:
                index = 1
            elif noise < 76 or 18 <= neighbor < 56:
                index = 3
            elif noise < 103:
                index = 4
            elif noise < 114:
                index = 5
            elif noise < 121:
                index = 6
            else:
                index = 0
            pixels[y * size + x] = palette[index]
    image = Image.new("RGBA", (size, size))
    image.putdata([(*color, 255) for color in pixels])
    image.save(OUT / "landscape-meadow-field.png")


def a3_guide(name: str, seed: int) -> None:
    palette = A3_PALETTES[name]
    pixels = [palette[0]] * (SIZE * SIZE)
    for y in range(SIZE):
        for x in range(SIZE):
            wrapped_x = 0 if x == SIZE - 1 else x
            wrapped_y = 0 if y == SIZE - 1 else y
            noise = coordinate_hash(seed, wrapped_x, wrapped_y) % 100
            index = 1 if noise < 8 else 2 if noise < 14 else 3 if noise < 17 else 0
            if name.startswith("water-") and (x + 2 * y) % 19 in {0, 1}:
                index = 2
            pixels[y * SIZE + x] = palette[index]
    image = Image.new("RGBA", (SIZE, SIZE))
    image.putdata([(*color, 255) for color in pixels])
    image.save(OUT / f"a3-{name}.png")


def mountain_range_guide() -> None:
    """Make a value/silhouette guide for a two-cell, tall granite prop."""
    image = Image.new("RGBA", (64, 96), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    dark = (54, 57, 58, 255)
    shadow = (74, 77, 77, 255)
    middle = (96, 98, 95, 255)
    light = (121, 120, 112, 255)

    # Three close, blunt crags with a broad full-width ground contact. Avoid the
    # tall triangular silhouette that image models tend to turn into snowy Alps.
    draw.polygon([(0, 78), (8, 58), (17, 50), (24, 63), (31, 38),
                  (39, 53), (46, 45), (57, 61), (63, 75), (63, 95), (0, 95)], fill=dark)
    draw.polygon([(3, 77), (10, 60), (17, 52), (16, 75), (8, 89)], fill=middle)
    draw.polygon([(17, 77), (31, 40), (30, 75), (24, 90)], fill=light)
    draw.polygon([(31, 40), (40, 58), (38, 79), (30, 75)], fill=shadow)
    draw.polygon([(38, 78), (47, 47), (47, 76), (42, 89)], fill=middle)
    draw.polygon([(47, 47), (58, 63), (63, 78), (54, 91), (47, 76)], fill=shadow)
    draw.polygon([(0, 78), (8, 89), (21, 84), (31, 91), (43, 86),
                  (54, 92), (63, 80), (63, 95), (0, 95)], fill=shadow)
    image.save(OUT / "a1-mountain-range.png")


def overlay_guides() -> None:
    center = (15, 15)
    endpoints = {"n": (15, 0), "e": (31, 15), "s": (15, 31), "w": (0, 15)}
    road = (145, 111, 63, 255)
    edge = (102, 76, 46, 255)
    masks = ["e", "es", "esw", "ew", "n", "ne", "ns", "nw", "s", "sw", "w"]
    for mask in masks:
        image = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        for direction in mask:
            draw.line([center, endpoints[direction]], fill=edge, width=8)
        for direction in mask:
            draw.line([center, endpoints[direction]], fill=road, width=6)
        if len(mask) == 1:
            draw.ellipse((12, 12, 18, 18), fill=road)
        else:
            draw.rectangle((12, 12, 18, 18), fill=road)
        image.save(OUT / f"a2-road-{mask}.png")

    seam = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    seam_pixels = seam.load()
    for x in range(32):
        if x % 5 not in {3, 4}:
            seam_pixels[x, x] = (137, 98, 169, 255)
            if x < 31:
                seam_pixels[x, x + 1] = (91, 71, 127, 255)
    seam.save(OUT / "a2-seam.png")


def flat_decoration_guides() -> None:
    grain = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    grain_pixels = grain.load()
    for offset in (0, 5, 10):
        for step in range(9):
            if step not in {3, 7}:
                x, y = 7 + step + offset, 12 + step // 3
                if x < 29:
                    grain_pixels[x, y] = (169, 104, 91, 255)
    grain.save(OUT / "a4-lacquer-grain-lines.png")

    ridge = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(ridge)
    draw.polygon([(5, 20), (10, 17), (22, 18), (27, 21), (22, 24), (9, 23)],
                 fill=(74, 105, 58, 255))
    draw.line([(7, 22), (24, 22)], fill=(43, 65, 42, 255), width=2)
    for x in range(9, 25, 4):
        draw.point((x, 19), fill=(127, 139, 84, 255))
    ridge.save(OUT / "a4-mosswold-stitched-ridge.png")

    block = Image.new("RGBA", (64, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(block)
    draw.polygon([(4, 10), (18, 3), (59, 8), (46, 15)], fill=(151, 93, 68, 255))
    draw.polygon([(4, 10), (46, 15), (46, 29), (4, 24)], fill=(116, 65, 58, 255))
    draw.polygon([(46, 15), (59, 8), (59, 22), (46, 29)], fill=(83, 57, 57, 255))
    block.save(OUT / "a4-obstacle-block.png")


def mine_guides() -> None:
    """Build 2x1 visitable-site guides with a reserved lower-left entrance."""
    palettes = {
        "gold": ((79, 59, 43, 255), (145, 105, 48, 255), (190, 161, 91, 255)),
        "timber": ((64, 47, 36, 255), (120, 78, 43, 255), (169, 120, 65, 255)),
        "iron": ((48, 53, 56, 255), (83, 91, 92, 255), (139, 124, 99, 255)),
        "essence": ((55, 52, 73, 255), (83, 91, 137, 255), (105, 151, 177, 255)),
    }
    for name, (dark, middle, light) in palettes.items():
        image = Image.new("RGBA", (64, 80), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        if name == "essence":
            # A broad raised basin whose foreground-left break is the legal approach.
            draw.polygon([(5, 58), (18, 45), (48, 43), (62, 54), (62, 72),
                          (48, 79), (29, 75), (24, 66), (12, 70), (5, 67)], fill=dark)
            draw.polygon([(10, 57), (21, 49), (47, 48), (57, 55), (48, 66),
                          (28, 65), (23, 60)], fill=middle)
            draw.polygon([(18, 54), (44, 52), (51, 57), (44, 62), (25, 61)], fill=light)
            draw.polygon([(8, 63), (20, 62), (24, 68), (27, 78), (14, 73), (8, 69)],
                         fill=(0, 0, 0, 0))
        else:
            # Right-hand structure blocks the second cell; left-hand arch is explicit and open.
            draw.polygon([(25, 32), (43, 20), (61, 31), (61, 75), (29, 79),
                          (25, 70)], fill=dark)
            draw.polygon([(29, 34), (43, 24), (57, 33), (45, 42)], fill=light)
            draw.polygon([(29, 36), (45, 43), (45, 75), (29, 72)], fill=middle)
            draw.polygon([(45, 43), (57, 34), (57, 72), (45, 75)], fill=dark)
            # Braced mine/camp mouth wholly inside the lower-left 32x32 entrance tile.
            draw.polygon([(3, 78), (3, 56), (8, 48), (25, 48), (31, 56),
                          (31, 78), (25, 78), (25, 58), (21, 53), (11, 53),
                          (8, 59), (8, 78)], fill=dark)
            draw.line([(8, 49), (25, 49), (30, 56)], fill=light, width=3)
            draw.line([(8, 51), (8, 77)], fill=middle, width=3)
            draw.line([(25, 51), (25, 77)], fill=middle, width=3)
            if name == "timber":
                for y in (63, 68, 73):
                    draw.rounded_rectangle((40, y, 62, y + 4), radius=2, fill=light)
        image.save(OUT / f"b2-mine-{name}.png")


def camera_lock_timber_guide() -> None:
    """Front-facing 2x1 silhouette guide with a horizontal ground contact."""
    image = Image.new("RGBA", (64, 80), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    ink = (48, 35, 27, 255)
    timber = (112, 72, 39, 255)
    light = (171, 119, 62, 255)
    roof = (102, 67, 48, 255)

    # Broad front elevation; the shallow offset on the roof communicates the
    # slight overhead camera without turning the footprint into a diamond.
    draw.rectangle((5, 35, 59, 75), fill=ink)
    draw.rectangle((8, 38, 56, 74), fill=timber)
    draw.polygon([(3, 37), (11, 21), (52, 21), (61, 37)], fill=ink)
    draw.polygon([(7, 34), (14, 24), (50, 24), (57, 34)], fill=roof)
    draw.line([(14, 24), (50, 24)], fill=light, width=2)
    # Legal approach is the lower-left 32px cell, shown by the only open arch.
    draw.rectangle((9, 50, 28, 75), fill=ink)
    draw.rounded_rectangle((13, 54, 25, 79), radius=5, fill=(0, 0, 0, 0))
    draw.line([(31, 39), (31, 75)], fill=light, width=2)
    draw.line([(45, 39), (45, 75)], fill=ink, width=2)
    for y in (59, 66, 73):
        draw.rounded_rectangle((39, y, 62, y + 4), radius=2, fill=light)
        draw.point((59, y + 2), fill=ink)
    # One straight horizontal contact line; there is deliberately no lawn.
    draw.line([(5, 76), (63, 76)], fill=ink, width=2)
    image.save(OUT / "landscape-timber-front.png")

    # Bitforge requires a style image matching the requested output dimensions.
    # This crop contains the H2 timber yard and nearby natural materials; it is
    # a generation reference only, never shipped or drawn by the game.
    homm = Image.open(ROOT / "docs" / "h2 adventure map.png").convert("RGB")
    homm.crop((100, 190, 340, 490)).resize(
        (64, 80), Image.Resampling.LANCZOS
    ).save(OUT / "landscape-h2-timber-style-64x80.png")


def camera_lock_landmark_guides() -> None:
    """Build frontal range-segment and castle guides for the camera-lock proof."""
    mountain = Image.new("RGBA", (64, 160), (0, 0, 0, 0))
    draw = ImageDraw.Draw(mountain)
    dark = (65, 57, 49, 255)
    middle = (112, 92, 70, 255)
    light = (164, 132, 91, 255)
    # The ridge enters and leaves the canvas so adjacent copies overlap into a
    # range rather than reading as repeated self-contained mountain islands.
    draw.polygon([(0, 78), (10, 69), (18, 33), (28, 75), (39, 18),
                  (49, 70), (58, 51), (63, 67), (63, 154), (0, 154)], fill=dark)
    draw.polygon([(0, 80), (10, 71), (18, 35), (20, 112), (10, 149), (0, 152)], fill=middle)
    draw.polygon([(20, 110), (39, 20), (39, 115), (29, 153), (12, 151)], fill=light)
    draw.polygon([(39, 20), (50, 72), (48, 122), (39, 115)], fill=middle)
    draw.polygon([(48, 121), (58, 53), (63, 69), (63, 154), (54, 150)], fill=middle)
    draw.line([(0, 154), (63, 154)], fill=dark, width=3)
    mountain.resize((128, 160), Image.Resampling.NEAREST).save(
        OUT / "landscape-mountain-segment-front.png"
    )

    mountain_b = Image.new("RGBA", (64, 160), (0, 0, 0, 0))
    draw = ImageDraw.Draw(mountain_b)
    draw.polygon([(0, 66), (9, 53), (18, 72), (29, 22), (39, 61),
                  (50, 37), (59, 76), (63, 69), (63, 154), (0, 154)], fill=dark)
    draw.polygon([(0, 68), (9, 55), (18, 74), (18, 118), (8, 151), (0, 152)], fill=middle)
    draw.polygon([(18, 117), (29, 24), (31, 118), (24, 153), (8, 151)], fill=light)
    draw.polygon([(30, 24), (40, 63), (40, 126), (31, 118)], fill=middle)
    draw.polygon([(40, 125), (50, 39), (59, 78), (63, 71), (63, 154), (51, 151)], fill=light)
    draw.line([(0, 154), (63, 154)], fill=dark, width=3)
    mountain_b.resize((128, 160), Image.Resampling.NEAREST).save(
        OUT / "landscape-mountain-segment-b-front.png"
    )

    castle = Image.new("RGBA", (96, 128), (0, 0, 0, 0))
    draw = ImageDraw.Draw(castle)
    ink = (54, 48, 42, 255)
    stone = (151, 145, 128, 255)
    stone_light = (197, 187, 158, 255)
    roof = (105, 60, 47, 255)
    draw.rectangle((4, 58, 91, 123), fill=ink)
    draw.rectangle((8, 62, 87, 121), fill=stone)
    for left, right, top in ((5, 28, 38), (68, 91, 38), (34, 62, 18)):
        draw.rectangle((left, top + 16, right, 122), fill=ink)
        draw.rectangle((left + 3, top + 19, right - 3, 120), fill=stone)
        draw.polygon([(left - 2, top + 18), ((left + right) // 2, top),
                      (right + 2, top + 18)], fill=roof)
        draw.line([(left + 1, top + 18), (right - 1, top + 18)], fill=stone_light, width=2)
    # One legal gate, dead-centre in the bottom-centre footprint tile.
    draw.rounded_rectangle((39, 91, 57, 127), radius=8, fill=ink)
    draw.rectangle((43, 103, 53, 127), fill=(20, 22, 20, 255))
    for x in (16, 76):
        draw.rectangle((x, 74, x + 5, 87), fill=ink)
    draw.line([(4, 123), (91, 123)], fill=ink, width=3)
    castle.save(OUT / "landscape-castle-front.png")

    homm = Image.open(ROOT / "docs" / "h2 adventure map.png").convert("RGB")
    mountain_style = homm.crop((0, 300, 400, 800)).resize(
        (128, 160), Image.Resampling.LANCZOS
    ).convert("RGBA")
    isolated_rock = []
    for red, green, blue, _alpha in mountain_style.get_flattened_data():
        vegetation = green > red * 1.06 and green > blue * 1.08
        saturated_marker = (red > green * 1.45 and red > blue * 1.7) \
            or (blue > red * 1.25 and blue > green * 1.2) \
            or (red > 145 and green > 110 and blue < 55)
        isolated_rock.append((red, green, blue, 0 if vegetation or saturated_marker else 255))
    mountain_style.putdata(isolated_rock)
    mountain_style.save(OUT / "landscape-h2-mountain-style-128x160.png")
    castle_crop = homm.crop((360, 30, 660, 250)).resize(
        (96, 70), Image.Resampling.LANCZOS
    ).convert("RGBA")
    isolated = []
    for red, green, blue, _alpha in castle_crop.get_flattened_data():
        # Remove the meadow/forest surrounding the reference castle. The style
        # channel should teach masonry and roofs, not reproduce a map scene.
        meadow = green > red * 1.12 and green > blue * 1.10
        path = red > green * 1.16 and red > blue * 1.45 and green > 38
        alpha = 0 if meadow or path else 255
        isolated.append((red, green, blue, alpha))
    castle_crop.putdata(isolated)
    castle_style = Image.new("RGBA", (96, 128), (0, 0, 0, 0))
    castle_style.alpha_composite(castle_crop, (0, 29))
    castle_style.save(OUT / "landscape-h2-castle-style-96x128.png")


def cute_landscape_style_guides() -> None:
    """Exact-size, unmasked style crops from the supplied HoMM2 map reference."""
    homm = Image.open(ROOT / "docs" / "h2 adventure map.png").convert("RGB")
    crops = {
        # Keep a little surrounding meadow so PixelLab sees how the subjects sit
        # in the world; these are style inputs, not composition silhouettes.
        "landscape-cute-castle-style-96x128.png": ((358, 142, 510, 334), (96, 128)),
        "landscape-cute-mountain-style-160x128.png": ((686, 438, 846, 560), (160, 128)),
        "landscape-cute-hero-style-32x48.png": ((402, 295, 449, 365), (32, 48)),
    }
    for filename, (box, size) in crops.items():
        homm.crop(box).resize(size, Image.Resampling.LANCZOS).save(OUT / filename)


def castle_style_guide() -> None:
    """Make an exact-size, non-shipped Bitforge style input from the approved B sheet."""
    source = Image.open(ROOT / "assets" / "references" / "b-adventure-objects-style-lock.png").convert("RGBA")
    # The lower-left crooked hut contains the selective outline, roof, and timber treatment
    # needed for the Hagwood probe, without importing the central generic stone castle.
    crop = source.crop((35, 740, 505, 1220)).resize((96, 128), Image.Resampling.LANCZOS)
    pixels = []
    for red, green, blue, alpha in crop.get_flattened_data():
        # Remove the pale reference-sheet field. This input is never promoted as game art.
        if red > 205 and green > 185 and blue > 150 and max(red, green, blue) - min(red, green, blue) < 75:
            pixels.append((red, green, blue, 0))
        else:
            pixels.append((red, green, blue, alpha))
    crop.putdata(pixels)
    crop.save(OUT / "b3-hagwood-style.png")


def doc33_mountain_scatter_guides() -> None:
    """Exact-size references for the first doc-33 overlap-family batch; never shipped art."""
    source = Image.open(
        ROOT / "public" / "assets" / "review" / "landscape-cute-mountain.png"
    ).convert("RGBA")
    visible = source.crop(source.getchannel("A").getbbox())
    scale = min(30 / visible.width, 43 / visible.height)
    visible = visible.resize(
        (round(visible.width * scale), round(visible.height * scale)),
        Image.Resampling.LANCZOS,
    )
    style = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
    style.alpha_composite(visible, ((32 - visible.width) // 2, 46 - visible.height))
    style.save(OUT / "doc33-granite-scatter-style-32x48.png")

    terrain = Image.open(
        ROOT / "public" / "assets" / "terrain" / "mountain-granite-0.png"
    ).convert("RGBA")
    color = Image.new("RGBA", (32, 48), (0, 0, 0, 255))
    color.alpha_composite(terrain, (0, 0))
    color.alpha_composite(terrain.crop((0, 0, 32, 16)), (0, 32))
    color.save(OUT / "doc33-granite-scatter-color-32x48.png")

    snowcap = Image.open(
        ROOT / "public" / "assets" / "terrain" / "mountain-snowcap-0.png"
    ).convert("RGBA")
    snowcap_color = Image.new("RGBA", (32, 48), (0, 0, 0, 255))
    snowcap_color.alpha_composite(snowcap, (0, 0))
    snowcap_color.alpha_composite(snowcap.crop((0, 0, 32, 16)), (0, 32))
    snowcap_color.save(OUT / "doc33-snowcap-scatter-color-32x48.png")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for index, name in enumerate(PALETTES):
        guide(name, 7310 + index)
        print(f"ok guide {name} 32x32")
    landscape_meadow_guide()
    print("ok guide landscape meadow 256x256")
    mountain_range_guide()
    print("ok guide mountain-range 64x96")
    overlay_guides()
    print("ok guides overlays 12x32x32")
    flat_decoration_guides()
    print("ok guides flat decorations and Block")
    mine_guides()
    print("ok guides b2 mines 4x64x80")
    camera_lock_timber_guide()
    print("ok guide landscape timber front 64x80")
    camera_lock_landmark_guides()
    print("ok guides landscape mountains 2x128x160 and castle 96x128")
    cute_landscape_style_guides()
    print("ok guides cute landscape references castle 96x128 mountain 160x128 hero 32x48")
    castle_style_guide()
    print("ok guide b3 Hagwood style 96x128")
    doc33_mountain_scatter_guides()
    print("ok guides doc33 granite/snowcap scatter style/color 32x48")
    for index, name in enumerate(A3_PALETTES):
        a3_guide(name, 8310 + index)
    print("ok guides a3 terrain 10x32x32")


if __name__ == "__main__":
    main()
