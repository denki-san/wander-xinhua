"""把当前、A、B 的固定前斜视和侧视渲染合成为用户对照图。"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
INPUT_DIR = ROOT / "test_artifacts"
OUTPUT = INPUT_DIR / "test_rain_face_comparison_v3.png"
CELL_SIZE = 620
HEADER_HEIGHT = 86
GUTTER = 14
LABELS = [
    ("base", "CURRENT"),
    ("a", "A  VISIBLE"),
    ("b", "B  BOLD"),
]


def font(size: int):
    candidates = [
        Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
        Path("/System/Library/Fonts/Helvetica.ttc"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


canvas_width = CELL_SIZE * 3 + GUTTER * 4
canvas_height = HEADER_HEIGHT + CELL_SIZE * 2 + GUTTER * 3
canvas = Image.new("RGB", (canvas_width, canvas_height), "#e8f0f3")
draw = ImageDraw.Draw(canvas)
title_font = font(30)
small_font = font(18)

for column, (variant, label) in enumerate(LABELS):
    x = GUTTER + column * (CELL_SIZE + GUTTER)
    draw.rounded_rectangle(
        (x, GUTTER, x + CELL_SIZE, HEADER_HEIGHT - 2),
        radius=16,
        fill="#314858" if variant == "b" else "#587386",
    )
    draw.text((x + 24, GUTTER + 16), label, font=title_font, fill="white")
    draw.text(
        (x + CELL_SIZE - 150, GUTTER + 25),
        "FRONT / SIDE",
        font=small_font,
        fill="#d9e7ed",
    )
    for row, direction in enumerate(("front", "side")):
        image = Image.open(
            INPUT_DIR / f"test_rain_face_v3_{variant}_{direction}.png"
        ).convert("RGB")
        y = HEADER_HEIGHT + GUTTER + row * (CELL_SIZE + GUTTER)
        canvas.paste(image, (x, y))

canvas.save(OUTPUT, quality=95)
print(OUTPUT)
