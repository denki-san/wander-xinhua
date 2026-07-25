"""把 12 张核心建筑 Massing 运行时截图合成为独立审查联系表。"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SCREENSHOT_DIR = (
    ROOT / "test_artifacts/all-models/massing/shangsheng-huashan"
)
WAY_IDS = [
    864847856,
    864847877,
    864847881,
    864847883,
    864847892,
    1364679201,
    1364679204,
    1364679205,
    1368808689,
    1368808690,
    1537478450,
    743778426,
]
OUTPUT_PATH = SCREENSHOT_DIR / (
    "test_shangsheng-huashan-massing-threejs-contact-sheet.png"
)
CELL_WIDTH = 320
CELL_HEIGHT = 205
IMAGE_HEIGHT = 180


def main() -> None:
    canvas = Image.new("RGB", (CELL_WIDTH * 4, CELL_HEIGHT * 3), "#202729")
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default(size=15)
    for index, way_id in enumerate(WAY_IDS):
        path = SCREENSHOT_DIR / (
            f"test_osm-way-{way_id}-massing-threejs-isolated.png"
        )
        screenshot = Image.open(path).convert("RGB")
        screenshot.thumbnail((CELL_WIDTH, IMAGE_HEIGHT), Image.Resampling.LANCZOS)
        column = index % 4
        row = index // 4
        left = column * CELL_WIDTH
        top = row * CELL_HEIGHT
        canvas.paste(screenshot, (left, top))
        draw.rectangle(
            (left, top + IMAGE_HEIGHT, left + CELL_WIDTH, top + CELL_HEIGHT),
            fill="#202729",
        )
        draw.text(
            (left + 8, top + IMAGE_HEIGHT + 4),
            f"OSM way {way_id}",
            fill="#f1ede3",
            font=font,
        )
    canvas.save(OUTPUT_PATH)
    print(OUTPUT_PATH.relative_to(ROOT))


if __name__ == "__main__":
    main()
