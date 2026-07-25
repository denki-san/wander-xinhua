"""把普通 OSM 建筑分块 Massing 预览拼成联系表。"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PREVIEW_DIR = ROOT / "test_artifacts/all-models/massing/osm-ordinary"
CHUNKS = [
    "r0c1",
    "r0c2",
    "r0c3",
    "r1c0",
    "r1c1",
    "r1c2",
    "r1c3",
    "r2c0",
    "r2c1",
    "r2c2",
    "r2c3",
    "r3c0",
    "r3c1",
    "r3c2",
]
THUMBNAIL = (360, 270)
LABEL_HEIGHT = 34
COLUMNS = 4


def load_font() -> ImageFont.ImageFont:
    for path in (
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ):
        if Path(path).exists():
            return ImageFont.truetype(path, 18)
    return ImageFont.load_default()


def build_sheet(direction: str) -> Path:
    rows = math.ceil(len(CHUNKS) / COLUMNS)
    sheet = Image.new(
        "RGB",
        (THUMBNAIL[0] * COLUMNS, (THUMBNAIL[1] + LABEL_HEIGHT) * rows),
        "#15191c",
    )
    draw = ImageDraw.Draw(sheet)
    font = load_font()
    for index, chunk_id in enumerate(CHUNKS):
        path = (
            PREVIEW_DIR
            / f"test_osm-ordinary-{chunk_id}-massing-{direction}.png"
        )
        image = Image.open(path).convert("RGB")
        image.thumbnail(THUMBNAIL, Image.Resampling.LANCZOS)
        column = index % COLUMNS
        row = index // COLUMNS
        cell_x = column * THUMBNAIL[0]
        cell_y = row * (THUMBNAIL[1] + LABEL_HEIGHT)
        image_x = cell_x + (THUMBNAIL[0] - image.width) // 2
        image_y = cell_y + (THUMBNAIL[1] - image.height) // 2
        sheet.paste(image, (image_x, image_y))
        draw.text(
            (cell_x + 10, cell_y + THUMBNAIL[1] + 6),
            chunk_id,
            fill="#f0eee8",
            font=font,
        )
    output = (
        PREVIEW_DIR
        / f"test_osm-ordinary-massing-{direction}-contact-sheet.png"
    )
    sheet.save(output, optimize=True)
    return output


for preview_direction in ("canonical", "side"):
    print(build_sheet(preview_direction).relative_to(ROOT))
