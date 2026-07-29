#!/usr/bin/env python3
from __future__ import annotations
"""生成梧桐树位置优化的固定尺寸对照图。"""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


PANEL_SIZE = (640, 430)
HEADER_HEIGHT = 52


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def fitted(image: Image.Image) -> Image.Image:
    return ImageOps.fit(
        image.convert("RGB"),
        PANEL_SIZE,
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )


def labeled_panel(image: Image.Image, label: str) -> Image.Image:
    panel = Image.new("RGB", (PANEL_SIZE[0], PANEL_SIZE[1] + HEADER_HEIGHT), "#17211d")
    panel.paste(fitted(image), (0, HEADER_HEIGHT))
    draw = ImageDraw.Draw(panel)
    draw.text((20, 12), label, fill="#f3ead2", font=font(24))
    return panel


def compose(items: list[tuple[Image.Image, str]], output: Path) -> None:
    panels = [labeled_panel(image, label) for image, label in items]
    canvas = Image.new(
        "RGB",
        (PANEL_SIZE[0] * len(panels), PANEL_SIZE[1] + HEADER_HEIGHT),
        "#17211d",
    )
    for index, panel in enumerate(panels):
        canvas.paste(panel, (index * PANEL_SIZE[0], 0))
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reference-triptych", required=True)
    parser.add_argument("--blender", required=True)
    parser.add_argument("--baseline", required=True)
    parser.add_argument("--candidate", required=True)
    parser.add_argument("--weak", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    reference_triptych = Image.open(args.reference_triptych)
    third_width = reference_triptych.width // 3
    reference = reference_triptych.crop(
        (third_width, 0, third_width * 2, reference_triptych.height),
    )
    blender = Image.open(args.blender)
    baseline = Image.open(args.baseline)
    candidate = Image.open(args.candidate)
    weak = Image.open(args.weak)
    output_dir = Path(args.output_dir)

    compose(
        [
            (reference, "参考实景（研究证据）"),
            (blender, "Blender V4（模型未变）"),
            (candidate, "Three.js V5（最终树位）"),
        ],
        output_dir / "test_plane_tree_placement_v5_reference_blender_threejs.png",
    )
    compose(
        [
            (baseline, "修改前：83 棵 / 试验段 20"),
            (candidate, "修改后：79 棵 / 试验段 16"),
        ],
        output_dir / "test_plane_tree_placement_v5_before_after.png",
    )
    compose(
        [
            (candidate, "标准档：Identity"),
            (weak, "弱网档：Massing"),
        ],
        output_dir / "test_plane_tree_placement_v5_standard_weak.png",
    )


if __name__ == "__main__":
    main()
