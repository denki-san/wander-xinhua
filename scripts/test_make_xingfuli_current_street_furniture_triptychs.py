"""生成幸福里当前街具的参考 / Blender / Three.js 三联对照图。"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_DIR = (
    ROOT
    / "docs/research/assets/nonbuilding-evidence-pilot"
    / "xingfuli-current-street-furniture"
)
ARTIFACT_DIR = (
    ROOT / "test_artifacts/nonbuilding/xingfuli-current-street-furniture"
)

CELL_WIDTH = 560
CELL_HEIGHT = 560
LABEL_HEIGHT = 56
GAP = 18
MARGIN = 24
BACKGROUND = "#eeeae0"
INK = "#1d2a24"
MUTED = "#6e7772"

ASSETS = [
    {
        "slug": "xingfuli-pointed-entry-bollard",
        "reference": EVIDENCE_DIR / "xingfuli-entry-bollards-2026.webp",
        "referenceCenter": (0.58, 0.82),
    },
    {
        "slug": "xingfuli-water-edge-stone-seat-round",
        "reference": EVIDENCE_DIR / "xingfuli-water-edge-furniture-2026.webp",
        "referenceCenter": (0.68, 0.84),
    },
    {
        "slug": "xingfuli-water-edge-stone-seat-long",
        "reference": EVIDENCE_DIR / "xingfuli-stone-seat-family-2026.webp",
        "referenceCenter": (0.72, 0.58),
    },
    {
        "slug": "xingfuli-water-edge-slim-planter",
        "reference": EVIDENCE_DIR / "xingfuli-water-edge-furniture-2026.webp",
        "referenceCenter": (0.50, 0.68),
    },
]


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    )
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def fitted(
    path: Path,
    centering: tuple[float, float] = (0.5, 0.5),
) -> Image.Image:
    with Image.open(path) as source:
        return ImageOps.fit(
            source.convert("RGB"),
            (CELL_WIDTH, CELL_HEIGHT),
            method=Image.Resampling.LANCZOS,
            centering=centering,
        )


def make_triptych(asset: dict[str, object]) -> Path:
    slug = str(asset["slug"])
    sources = [
        (
            "REFERENCE",
            Path(asset["reference"]),
            asset["referenceCenter"],
        ),
        (
            "BLENDER CANONICAL",
            ARTIFACT_DIR / f"test_{slug}-canonical.png",
            (0.5, 0.5),
        ),
        (
            "THREE.JS RUNTIME · 4 M",
            ARTIFACT_DIR / f"test_{slug}-webgl.png",
            (0.36, 0.58),
        ),
    ]
    width = MARGIN * 2 + CELL_WIDTH * 3 + GAP * 2
    height = MARGIN * 2 + LABEL_HEIGHT + CELL_HEIGHT + 48
    canvas = Image.new("RGB", (width, height), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    title_font = font(24)
    label_font = font(17)
    note_font = font(14)
    draw.text((MARGIN, 14), slug, fill=INK, font=title_font)

    for index, (label, path, centering) in enumerate(sources):
        x = MARGIN + index * (CELL_WIDTH + GAP)
        y = MARGIN + LABEL_HEIGHT
        image = fitted(path, centering=centering)
        canvas.paste(image, (x, y))
        draw.rectangle(
            (x, y, x + CELL_WIDTH - 1, y + CELL_HEIGHT - 1),
            outline="#c7c4ba",
            width=2,
        )
        draw.text((x + 12, y + 12), label, fill="#f7f4eb", font=label_font)
    draw.text(
        (MARGIN, height - 33),
        "Evidence is research-only; reference photos are not embedded in the GLB.",
        fill=MUTED,
        font=note_font,
    )
    output = ARTIFACT_DIR / f"test_{slug}-triptych.png"
    canvas.save(output, optimize=True)
    return output


def make_contact_sheet(outputs: list[Path]) -> Path:
    thumb_width = 850
    thumb_height = 350
    width = MARGIN * 2 + thumb_width * 2 + GAP
    height = MARGIN * 2 + 50 + thumb_height * 2 + GAP
    canvas = Image.new("RGB", (width, height), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    draw.text(
        (MARGIN, 14),
        "Xingfuli current street furniture · evidence triptychs",
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
        image_x = x + (thumb_width - image.width) // 2
        image_y = y + (thumb_height - image.height) // 2
        canvas.paste(image, (image_x, image_y))
    target = ARTIFACT_DIR / "test_xingfuli-current-street-furniture-triptych-contact-sheet.png"
    canvas.save(target, optimize=True)
    return target


def main() -> None:
    outputs = [make_triptych(asset) for asset in ASSETS]
    outputs.append(make_contact_sheet(outputs))
    for output in outputs:
        print(output.relative_to(ROOT))


if __name__ == "__main__":
    main()
