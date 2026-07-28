"""生成 Meshy 证据、Blender 和 Three.js 运行时三联对照图。"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "test_artifacts/test_meshy_agent_batch_20260728/selected_previews"
OUTPUT_DIR = ROOT / "test_artifacts/nonbuilding/meshy-agent-street-assets"

CELL_WIDTH = 560
CELL_HEIGHT = 560
LABEL_HEIGHT = 56
GAP = 18
MARGIN = 24
BACKGROUND = "#eeeae0"
INK = "#1d2a24"
MUTED = "#6e7772"

ASSETS = [
    ("plane-tree-straight-sparse", 24),
    ("lane-lamp-short-arm", 10),
    ("slatted-bench-backrest", 5),
    ("street-planter-long", 5),
    ("stone-bollard-squat", 4),
    ("shanghai-dual-classification-bin", 4),
    ("cantilever-cafe-umbrella", 10),
    ("outdoor-dining-dark-wood", 6),
    ("vintage-step-through-bicycle", 5),
    ("wall-ac-outdoor-unit", 5),
]


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for candidate in (
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def fitted(path: Path, centering: tuple[float, float]) -> Image.Image:
    with Image.open(path) as source:
        return ImageOps.fit(
            source.convert("RGB"),
            (CELL_WIDTH, CELL_HEIGHT),
            method=Image.Resampling.LANCZOS,
            centering=centering,
        )


def make_triptych(slug: str, distance_meters: int) -> Path:
    sources = [
        (
            "MESHY SELECTED EVIDENCE",
            SOURCE_DIR / f"test_{slug}_selected.png",
            (0.50, 0.50),
        ),
        (
            "BLENDER CANONICAL",
            OUTPUT_DIR / f"test_{slug}-canonical.png",
            (0.50, 0.50),
        ),
        (
            f"THREE.JS RUNTIME · {distance_meters} M",
            OUTPUT_DIR / f"test_{slug}-webgl.png",
            (0.50, 0.52),
        ),
    ]
    width = MARGIN * 2 + CELL_WIDTH * 3 + GAP * 2
    height = MARGIN * 2 + LABEL_HEIGHT + CELL_HEIGHT + 48
    canvas = Image.new("RGB", (width, height), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    draw.text((MARGIN, 14), slug, fill=INK, font=font(24))

    for index, (label, path, centering) in enumerate(sources):
        if not path.is_file():
            raise FileNotFoundError(path)
        x = MARGIN + index * (CELL_WIDTH + GAP)
        y = MARGIN + LABEL_HEIGHT
        image = fitted(path, centering)
        canvas.paste(image, (x, y))
        draw.rectangle(
            (x, y, x + CELL_WIDTH - 1, y + CELL_HEIGHT - 1),
            outline="#c7c4ba",
            width=2,
        )
        draw.rectangle((x, y, x + CELL_WIDTH, y + 44), fill="#1d2a24")
        draw.text((x + 12, y + 11), label, fill="#f7f4eb", font=font(17))

    draw.text(
        (MARGIN, height - 33),
        "Meshy export is immutable evidence; Blender and runtime outputs are deterministic derivatives.",
        fill=MUTED,
        font=font(14),
    )
    output = OUTPUT_DIR / f"test_{slug}-triptych.png"
    canvas.save(output, optimize=True)
    return output


def make_contact_sheet(outputs: list[Path]) -> Path:
    thumb_width = 850
    thumb_height = 350
    width = MARGIN * 2 + thumb_width * 2 + GAP
    height = MARGIN * 2 + 50 + thumb_height * 5 + GAP * 4
    canvas = Image.new("RGB", (width, height), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    draw.text(
        (MARGIN, 14),
        "Meshy Agent street assets · evidence / Blender / runtime",
        fill=INK,
        font=font(24),
    )
    for index, output in enumerate(outputs):
        with Image.open(output) as source:
            image = ImageOps.contain(
                source.convert("RGB"),
                (thumb_width, thumb_height),
                method=Image.Resampling.LANCZOS,
            )
        x = MARGIN + (index % 2) * (thumb_width + GAP)
        y = MARGIN + 50 + (index // 2) * (thumb_height + GAP)
        canvas.paste(
            image,
            (
                x + (thumb_width - image.width) // 2,
                y + (thumb_height - image.height) // 2,
            ),
        )
    target = OUTPUT_DIR / "test_meshy-agent-street-assets-triptych-contact-sheet.png"
    canvas.save(target, optimize=True)
    return target


def main() -> None:
    outputs = [make_triptych(slug, distance) for slug, distance in ASSETS]
    outputs.append(make_contact_sheet(outputs))
    for output in outputs:
        print(output.relative_to(ROOT))


if __name__ == "__main__":
    main()
