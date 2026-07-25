"""合成 Rain 鼻头、鼻翼与嘴唇修改前后的固定机位对照图。"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
INPUT_DIR = ROOT / "test_artifacts"
OUTPUT = INPUT_DIR / "test_rain_face_refinement_comparison.png"
CELL = 720
HEADER = 90
GUTTER = 16
STATES = (("current", "CURRENT"), ("refined", "REFINED"))


def font(size: int):
    for candidate in (
        Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
        Path("/System/Library/Fonts/Helvetica.ttc"),
    ):
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


canvas = Image.new(
    "RGB",
    (CELL * 2 + GUTTER * 3, HEADER + CELL * 2 + GUTTER * 3),
    "#e8f0f3",
)
draw = ImageDraw.Draw(canvas)
title_font = font(32)
small_font = font(19)

for column, (state, label) in enumerate(STATES):
    x = GUTTER + column * (CELL + GUTTER)
    draw.rounded_rectangle(
        (x, GUTTER, x + CELL, HEADER - 2),
        radius=16,
        fill="#314858" if state == "refined" else "#587386",
    )
    draw.text((x + 26, GUTTER + 16), label, font=title_font, fill="white")
    draw.text(
        (x + CELL - 165, GUTTER + 28),
        "FRONT / SIDE",
        font=small_font,
        fill="#d9e7ed",
    )
    for row, direction in enumerate(("front", "side")):
        image = Image.open(
            INPUT_DIR / f"test_rain_face_refinement_{state}_{direction}.png"
        ).convert("RGB")
        y = HEADER + GUTTER + row * (CELL + GUTTER)
        canvas.paste(image, (x, y))

canvas.save(OUTPUT)
print(OUTPUT)
