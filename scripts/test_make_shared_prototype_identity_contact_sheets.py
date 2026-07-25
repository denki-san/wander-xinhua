"""为 8 个共享原型 Identity 双视角生成可审查联系表。"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_DIR = (
    ROOT / "test_artifacts/all-models/identity/shared-prototypes"
)
MANIFEST = json.loads(
    (
        ROOT / "docs/research/shared-prototypes-identity-manifest.json"
    ).read_text(encoding="utf8")
)
SLUGS = [asset["slug"] for asset in MANIFEST["assets"]]


def load_font(size: int) -> ImageFont.ImageFont:
    for path in (
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


def make_sheet(direction: str) -> Path:
    columns = 4
    rows = 2
    image_size = (350, 350)
    label_height = 46
    sheet = Image.new(
        "RGB",
        (
            image_size[0] * columns,
            (image_size[1] + label_height) * rows,
        ),
        "#161b1d",
    )
    draw = ImageDraw.Draw(sheet)
    font = load_font(16)
    for index, slug in enumerate(SLUGS):
        source = fit_image(
            ARTIFACT_DIR / f"test_{slug}-identity-{direction}.png",
            image_size,
        )
        column = index % columns
        row = index // columns
        x = column * image_size[0]
        y = row * (image_size[1] + label_height)
        sheet.paste(source, (x, y))
        draw.text(
            (x + 12, y + image_size[1] + 11),
            slug,
            fill="#f0f1ed",
            font=font,
        )
    output = (
        ARTIFACT_DIR
        / f"test_shared-prototypes-identity-{direction}-contact-sheet.png"
    )
    sheet.save(output, optimize=True)
    return output


for view in ("canonical", "side"):
    print(make_sheet(view))
