"""为 8 个道路 POI 干净 Massing v2 生成双视角联系表。"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "test_artifacts/all-models/massing-v2"
SLUGS = [
    "film-art-center",
    "one-step-garden",
    "xinhua-villas-329",
    "villa-le-bec",
    "shanghai-orchestra",
    "xinhua-pocket-park",
    "debi-fahua-525",
    "fics-xinhua-365",
]


def make_sheet(direction: str) -> None:
    columns = 4
    rows = 2
    cell_width = 480
    cell_height = 410
    image_size = 450
    sheet = Image.new(
        "RGB",
        (columns * cell_width, rows * cell_height),
        "#161b1d",
    )
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=17)
    for index, slug in enumerate(SLUGS):
        source = Image.open(
            SOURCE_DIR / f"test_{slug}-massing-v2-{direction}.png"
        ).convert("RGB")
        source.thumbnail((image_size, 350))
        column = index % columns
        row = index // columns
        x = column * cell_width + (cell_width - source.width) // 2
        y = row * cell_height + 8
        sheet.paste(source, (x, y))
        draw.text(
            (column * cell_width + 14, row * cell_height + 370),
            slug,
            fill="#f0f1ed",
            font=font,
        )
    sheet.save(
        SOURCE_DIR
        / f"test_xinhua-road-clean-massing-v2-{direction}-contact-sheet.png"
    )


for view in ("canonical", "side"):
    make_sheet(view)
