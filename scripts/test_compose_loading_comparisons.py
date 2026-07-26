"""组合 Rain Identity 三联图与弱网加载前后对照图。"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "test_artifacts"
TEMP = Path("/private/tmp")


def font(size: int):
    candidates = [
        Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
        Path("/System/Library/Fonts/Helvetica.ttc"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def contain(path: Path, size: tuple[int, int], background="#d9e4e8"):
    image = Image.open(path).convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, background)
    canvas.paste(
        image,
        ((size[0] - image.width) // 2, (size[1] - image.height) // 2),
    )
    return canvas


def labeled_panel(path: Path, label: str, size: tuple[int, int]):
    label_height = 58
    panel = Image.new("RGB", (size[0], size[1] + label_height), "#f6edd2")
    panel.paste(contain(path, size), (0, label_height))
    draw = ImageDraw.Draw(panel)
    draw.text((18, 14), label, fill="#243735", font=font(24))
    return panel


def compose_identity_three_way():
    entries = [
        (
            ROOT / "docs/research/assets/character-references/rain-v1-rig-preview.png",
            "Reference",
        ),
        (ARTIFACTS / "test_rain_identity_canonical.png", "Blender Identity"),
        (
            ARTIFACTS
            / "test_loading_optimized_weak_cover_final_after_700ms.png",
            "Three.js +700 ms",
        ),
    ]
    panels = [labeled_panel(path, label, (540, 675)) for path, label in entries]
    output = Image.new("RGB", (sum(panel.width for panel in panels), panels[0].height), "#243735")
    x = 0
    for panel in panels:
        output.paste(panel, (x, 0))
        x += panel.width
    output.save(ARTIFACTS / "test_rain_identity_three_way_comparison.png", quality=94)


def compose_loading_comparison():
    entries = [
        (
            TEMP / "test_loading_weak_after_700ms.png",
            "Baseline +700 ms",
        ),
        (
            ARTIFACTS / "test_loading_optimized_weak_cover_final_after_700ms.png",
            "Optimized +700 ms",
        ),
        (
            TEMP / "test_loading_weak_after_8s.png",
            "Baseline +8 s",
        ),
        (
            ARTIFACTS / "test_loading_optimized_weak_cover_final_after_8s.png",
            "Optimized +8 s",
        ),
        (
            TEMP / "test_loading_weak_after_25s.png",
            "Baseline +25 s",
        ),
        (
            ARTIFACTS / "test_loading_optimized_weak_cover_final_hero_visible.png",
            "Optimized Hero +22.8 s",
        ),
    ]
    panels = [labeled_panel(path, label, (390, 844)) for path, label in entries]
    output = Image.new("RGB", (panels[0].width * 2, panels[0].height * 3), "#243735")
    for index, panel in enumerate(panels):
        output.paste(panel, ((index % 2) * panel.width, (index // 2) * panel.height))
    output.save(ARTIFACTS / "test_loading_weak_comparison.png", quality=94)


if __name__ == "__main__":
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    compose_identity_three_way()
    compose_loading_comparison()
