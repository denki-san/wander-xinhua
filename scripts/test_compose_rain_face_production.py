"""合成正式 Rain 面部前斜视与侧视证据图。"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
INPUT_DIR = ROOT / "test_artifacts"
OUTPUT = INPUT_DIR / "test_rain_face_production_comparison.png"
CELL = 720
HEADER = 86
GUTTER = 16


def font(size: int):
    path = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")
    return ImageFont.truetype(str(path), size=size) if path.exists() else ImageFont.load_default()


canvas = Image.new("RGB", (CELL * 2 + GUTTER * 3, HEADER + CELL + GUTTER * 2), "#e8f0f3")
draw = ImageDraw.Draw(canvas)
for column, (direction, label) in enumerate((("front", "FINAL FRONT"), ("side", "FINAL SIDE"))):
    x = GUTTER + column * (CELL + GUTTER)
    draw.rounded_rectangle((x, GUTTER, x + CELL, HEADER - 2), radius=16, fill="#314858")
    draw.text((x + 26, GUTTER + 16), label, font=font(32), fill="white")
    image = Image.open(INPUT_DIR / f"test_rain_face_production_{direction}.png").convert("RGB")
    canvas.paste(image, (x, HEADER + GUTTER))
canvas.save(OUTPUT)
print(OUTPUT)
