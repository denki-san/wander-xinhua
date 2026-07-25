"""生成设施原型 Massing 的联系表与逐资产证据三联图。"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_DIR = (
    ROOT / "test_artifacts/all-models/massing/facility-prototypes"
)
PARSER = argparse.ArgumentParser()
PARSER.add_argument("--output-dir", type=Path, default=ARTIFACT_DIR)
ARGS = PARSER.parse_args()
OUTPUT_DIR = ARGS.output_dir.resolve()
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
MANIFEST = json.loads(
    (ROOT / "docs/research/facility-prototypes-massing-manifest.json").read_text(
        encoding="utf-8"
    )
)
ASSET_IDS = [asset["outputSlug"] for asset in MANIFEST["assets"]]
THUMBNAIL = (400, 260)
LABEL_HEIGHT = 46
COLUMNS = 3

REFERENCE_BY_ASSET = {
    "shangsheng-fountain-osm-1364679202": (
        "docs/research/assets/poi-references/shangsheng-xinsuo/"
        "shangsheng-navy-club-fountain-plaza-2022.jpeg",
        "site fountain family only; not bound to this OSM way",
    ),
    "shangsheng-fountain-osm-1364679203": (
        "docs/research/assets/poi-references/shangsheng-xinsuo/"
        "shangsheng-navy-club-fountain-plaza-2022.jpeg",
        "site fountain family only; not bound to this OSM way",
    ),
    "shangsheng-main-entry": (
        "docs/research/assets/poi-references/shangsheng-xinsuo/"
        "yanan-road-entrance.jpg",
        "direct subject photo; dimensions remain runtime estimates",
    ),
    "huashan-basketball-court": (
        "docs/research/assets/poi-references/huashan-greenland/"
        "huashan-basketball-court-entry-2025.jpg",
        "direct entry photo; full boundary and yaw overlay pending",
    ),
    "huashan-happiness-corner": (
        "docs/research/assets/poi-references/huashan-greenland/"
        "huashan-happiness-corner-canonical-2026.jpg",
        "direct canonical subject evidence",
    ),
    "xingfuli-reflecting-pool-hardscape": (
        "docs/research/assets/poi-references/xingfuli/water-lane.jpg",
        "direct water-lane evidence; dimensions are not surveyed",
    ),
    "xingfuli-mixed-paving": (
        "docs/research/assets/poi-references/xingfuli/"
        "xingfuli-smartshanghai-03-2021.jpeg",
        "direct paving language; exact module size unknown",
    ),
    "xingfuli-vertical-garden": (
        "docs/research/assets/poi-references/xingfuli/"
        "xingfuli-government-main-lane-vertical-garden-2023.jpg",
        "direct canonical subject evidence; side and full length unknown",
    ),
    "one-square-metre-action": (
        "docs/research/assets/poi-references/one-square-metre-action/"
        "one-square-metre-action-workshop-2025.jpg",
        "program context only; does not prove game-installation shape",
    ),
}


def load_font(size: int) -> ImageFont.ImageFont:
    for path in (
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def fit_image(path: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, "#1b2224")
    canvas.paste(
        image,
        ((size[0] - image.width) // 2, (size[1] - image.height) // 2),
    )
    return canvas


def placeholder(size: tuple[int, int], text: str) -> Image.Image:
    image = Image.new("RGB", size, "#242c2e")
    draw = ImageDraw.Draw(image)
    font = load_font(24)
    lines = ["NO DEDICATED SUBJECT PHOTO", text]
    y = size[1] // 2 - 38
    for line in lines:
        box = draw.textbbox((0, 0), line, font=font)
        draw.text(
            ((size[0] - (box[2] - box[0])) // 2, y),
            line,
            fill="#d9d4c6",
            font=font,
        )
        y += 42
    return image


def preview_path(asset_id: str, direction: str) -> Path:
    if direction == "threejs":
        return (
            ARTIFACT_DIR
            / f"test_{asset_id}-massing-threejs-isolated.png"
        )
    if direction == "map":
        return ARTIFACT_DIR / f"test_{asset_id}-massing-threejs-map.png"
    return ARTIFACT_DIR / f"test_{asset_id}-massing-{direction}.png"


def build_contact_sheet(direction: str) -> Path:
    rows = math.ceil(len(ASSET_IDS) / COLUMNS)
    sheet = Image.new(
        "RGB",
        (
            THUMBNAIL[0] * COLUMNS,
            (THUMBNAIL[1] + LABEL_HEIGHT) * rows,
        ),
        "#15191c",
    )
    draw = ImageDraw.Draw(sheet)
    font = load_font(17)
    for index, asset_id in enumerate(ASSET_IDS):
        image = fit_image(preview_path(asset_id, direction), THUMBNAIL)
        column = index % COLUMNS
        row = index // COLUMNS
        x = column * THUMBNAIL[0]
        y = row * (THUMBNAIL[1] + LABEL_HEIGHT)
        sheet.paste(image, (x, y))
        draw.text(
            (x + 10, y + THUMBNAIL[1] + 9),
            asset_id,
            fill="#f0eee8",
            font=font,
        )
    output = (
        OUTPUT_DIR
        / f"test_facility-prototypes-massing-{direction}-contact-sheet.png"
    )
    sheet.save(output, optimize=True)
    return output


def build_triptych(asset_id: str) -> Path:
    panel = (500, 340)
    title_height = 44
    note_height = 58
    gap = 12
    width = panel[0] * 3 + gap * 2
    height = title_height + panel[1] + note_height
    sheet = Image.new("RGB", (width, height), "#15191c")
    draw = ImageDraw.Draw(sheet)
    title_font = load_font(22)
    note_font = load_font(16)
    headings = ["Reference evidence", "Blender canonical", "Three.js runtime"]
    reference = REFERENCE_BY_ASSET.get(asset_id)
    if reference:
        reference_image = fit_image(ROOT / reference[0], panel)
        evidence_note = reference[1]
    else:
        evidence_note = (
            "public search found no dedicated subject photo; fallback Massing only"
        )
        reference_image = placeholder(panel, "explicitly recorded in search log")
    images = [
        reference_image,
        fit_image(preview_path(asset_id, "canonical"), panel),
        fit_image(preview_path(asset_id, "threejs"), panel),
    ]
    for index, image in enumerate(images):
        x = index * (panel[0] + gap)
        sheet.paste(image, (x, title_height))
        draw.text((x + 10, 9), headings[index], fill="#f0eee8", font=title_font)
    draw.text(
        (10, title_height + panel[1] + 10),
        f"{asset_id} · {evidence_note}",
        fill="#d9d4c6",
        font=note_font,
    )
    output = (
        OUTPUT_DIR
        / f"test_{asset_id}-massing-reference-blender-threejs-triptych.png"
    )
    sheet.save(output, optimize=True)
    return output


for preview_direction in ("canonical", "side", "threejs", "map"):
    print(build_contact_sheet(preview_direction))

for facility_asset_id in ASSET_IDS:
    print(build_triptych(facility_asset_id))
