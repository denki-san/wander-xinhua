"""为共享原型 Massing 双视角生成可审查联系表。"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "test_artifacts/all-models/massing/shared-prototypes"
SLUGS = [
    "xinhua-plane-tree",
    "shangsheng-campus-tree",
    "huashan-canopy-tree",
    "huashan-understory",
    "road-edge-shrub",
    "lane-lamp-short-arm",
    "cantilever-umbrella",
    "outdoor-table-set",
    "slatted-bench",
    "rectangular-planter",
    "shanghai-dual-classification-bin",
    "irregular-stone-bollard",
]


def make_sheet(direction: str) -> None:
    columns = 4
    rows = 3
    cell_width = 360
    cell_height = 390
    image_size = 330
    sheet = Image.new(
        "RGB",
        (columns * cell_width, rows * cell_height),
        "#161b1d",
    )
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=16)
    for index, slug in enumerate(SLUGS):
        source = Image.open(
            SOURCE_DIR / f"test_{slug}-massing-{direction}.png"
        ).convert("RGB")
        source.thumbnail((image_size, image_size))
        column = index % columns
        row = index // columns
        x = column * cell_width + (cell_width - source.width) // 2
        y = row * cell_height + 10
        sheet.paste(source, (x, y))
        draw.text(
            (column * cell_width + 14, row * cell_height + 350),
            slug,
            fill="#f0f1ed",
            font=font,
        )
    output = SOURCE_DIR / (
        f"test_shared-prototypes-massing-{direction}-contact-sheet.png"
    )
    sheet.save(output)


for view in ("canonical", "side"):
    make_sheet(view)
