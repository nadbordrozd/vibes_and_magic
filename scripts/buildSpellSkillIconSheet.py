#!/usr/bin/env python3
"""Compose selected native PixelLab icon variations for one-look review; never alters assets."""

from __future__ import annotations

import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path.cwd()
selections = json.loads((ROOT / "assets/iconSelections.json").read_text())
jobs = {}
for path in sorted((ROOT / "assets/jobs").glob("e[12]-*-icons-*.json")):
    for request in json.loads(path.read_text())["requests"]:
        jobs[request["assets"][0]] = request

font = None
cell_w, cell_h, columns = 180, 84, 5
entries = selections["entries"]
rows = (len(entries) + columns - 1) // columns
sheet = Image.new("RGBA", (cell_w * columns, cell_h * rows), (18, 23, 19, 255))
draw = ImageDraw.Draw(sheet)
for index, entry in enumerate(entries):
    request = jobs[entry["id"]]
    candidate = ROOT / request["output"] / f"candidate-1-images-{entry['variation']}.png"
    icon = Image.open(candidate).convert("RGBA")
    x, y = (index % columns) * cell_w, (index // columns) * cell_h
    if index % 2:
        draw.rectangle((x, y, x + cell_w - 1, y + cell_h - 1), fill=(24, 31, 25, 255))
    enlarged = icon.resize((64, 64), Image.Resampling.NEAREST)
    sheet.alpha_composite(enlarged, (x + 8, y + 8))
    label = entry["id"].replace("spell-icon:", "").replace("skill-icon:", "")
    draw.text((x + 78, y + 22), label, fill=(232, 224, 200, 255), font=font)
    draw.text((x + 78, y + 42), f"v{entry['variation']} · 32x32", fill=(148, 157, 143, 255), font=font)

output = ROOT / ".pixel-work/review/spell-skill-icons/complete-selected-icon-sheet.png"
output.parent.mkdir(parents=True, exist_ok=True)
sheet.save(output)
print(f"wrote {len(entries)} selected icons to {output.relative_to(ROOT)}")
