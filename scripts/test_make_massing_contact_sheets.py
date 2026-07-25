"""把 14 个 Massing 固定视角预览拼成可审查的联系表。"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PREVIEW_DIR = ROOT / "test_artifacts/all-models/massing"
ASSETS = [
    "shanghai-cinema",
    "film-art-center",
    "one-step-garden",
    "xinhua-villas-211",
    "xinhua-villas-329",
    "house-315",
    "villa-le-bec",
    "shanghai-orchestra",
    "hudec-memorial",
    "xinhua-pocket-park",
    "xinhua-community-center",
    "debi-fahua-525",
    "fahua-heritage",
    "fics-xinhua-365",
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
    rows = math.ceil(len(ASSETS) / COLUMNS)
    sheet = Image.new(
        "RGB",
        (THUMBNAIL[0] * COLUMNS, (THUMBNAIL[1] + LABEL_HEIGHT) * rows),
        "#15191c",
    )
    draw = ImageDraw.Draw(sheet)
    font = load_font()
    for index, slug in enumerate(ASSETS):
        path = PREVIEW_DIR / f"test_{slug}-massing-{direction}.png"
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
            slug,
            fill="#f0eee8",
            font=font,
        )
    output = PREVIEW_DIR / f"test_xinhua-road-massing-{direction}-contact-sheet.png"
    sheet.save(output, optimize=True)
    return output


for preview_direction in ("canonical", "side", "threejs"):
    print(build_sheet(preview_direction).relative_to(ROOT))
