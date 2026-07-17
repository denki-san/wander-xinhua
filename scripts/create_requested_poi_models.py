"""生成本轮新增 POI 的可编辑 Blender 源文件、GLB 与固定机位预览。

照片只用于人工提炼轮廓、材质和识别构件，不作为贴图进入运行时资产。
模型沿用项目比例：1 Blender 单位 = 1 场景单位 = 2.7 米。
"""

from __future__ import annotations

import math
import sys
from pathlib import Path
from typing import Callable

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import create_xinhua_road_models as base


ROOT = Path(__file__).resolve().parents[1]
base.OUTPUT_DIR = ROOT / "public/models/requested-pois"
base.SOURCE_DIR = ROOT / "assets/models/source/requested-pois"
base.PREVIEW_DIR = ROOT / "test_artifacts"


def add_front_windows(
    prefix: str,
    *,
    center_x: float,
    front_y: float,
    width: float,
    floors: int,
    columns: int,
    floor_height: float,
    frame: bpy.types.Material,
    glass: bpy.types.Material,
    base_z: float = 1.45,
    skip: set[tuple[int, int]] | None = None,
) -> None:
    """为偏移建筑生成规则窗阵。"""
    skipped = skip or set()
    usable = width - 1.4
    for floor in range(floors):
        for column in range(columns):
            if (floor, column) in skipped:
                continue
            x = center_x - usable / 2 + usable * (column + 0.5) / columns
            base.add_window(
                f"{prefix}-{floor}-{column}",
                x,
                front_y,
                base_z + floor * floor_height,
                max(0.5, usable / columns * 0.54),
                floor_height * 0.52,
                "Y",
                frame,
                glass,
            )


def add_hexagon(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    mat: bpy.types.Material,
) -> None:
    """制作面向建筑正立面的六边形识别构件。"""
    base.add_cylinder(
        name,
        location,
        radius,
        0.16,
        mat,
        vertices=6,
        rotation=(math.pi / 2, 0, 0),
    )


def add_bamboo_cluster(
    prefix: str,
    center: tuple[float, float],
    stem: bpy.types.Material,
    leaf: bpy.types.Material,
    *,
    count: int = 7,
) -> None:
    """用细竹秆和扁长叶团表现庭院竹林。"""
    cx, cy = center
    for index in range(count):
        angle = index * 2.399
        radius = 0.18 + (index % 3) * 0.2
        x = cx + math.cos(angle) * radius
        y = cy + math.sin(angle) * radius
        height = 2.9 + (index % 4) * 0.34
        base.add_cylinder(
            f"{prefix}-stem-{index}",
            (x, y, height / 2),
            0.045,
            height,
            stem,
            vertices=8,
        )
        for leaf_index, z in enumerate((height * 0.58, height * 0.76, height * 0.9)):
            base.add_icosphere(
                f"{prefix}-leaf-{index}-{leaf_index}",
                (
                    x + (-0.28 if leaf_index % 2 else 0.28),
                    y + (0.08 if index % 2 else -0.08),
                    z,
                ),
                (0.42, 0.13, 0.11),
                leaf,
                subdivisions=1,
            )


def build_hudec_memorial() -> None:
    plaster = base.material("邬达克暖白灰泥", "#ddd8c8")
    timber = base.material("邬达克深色木构", "#3b342f")
    roof = base.material("邬达克深灰瓦", "#4a4844")
    roof_ridge = base.material("邬达克屋脊", "#343532")
    brick = base.material("邬达克红砖", "#8d5545")
    brick_dark = base.material("邬达克深砖", "#6d4036")
    frame = base.material("邬达克窗框", "#34413d")
    glass = base.material("邬达克玻璃", "#536a64", roughness=0.42)
    stone = base.material("邬达克庭院石", "#aaa599")
    metal = base.material("邬达克铁艺", "#2e3634", roughness=0.45, metallic=0.45)
    green = base.material("邬达克绿篱", "#536d4c")
    green_light = base.material("邬达克浅绿", "#71825d")
    bark = base.material("邬达克庭院树干", "#76634f")
    wood = base.material("邬达克门", "#72503c")

    base.add_box("hudec-courtyard", (0, -0.8, 0.08), (17.5, 15.5, 0.16), stone, bevel=0.12)
    base.add_box("hudec-main", (-1.0, 1.5, 3.35), (10.8, 7.2, 6.7), plaster, bevel=0.12)
    base.add_box("hudec-east-wing", (4.8, 2.4, 2.65), (4.3, 5.5, 5.3), plaster, bevel=0.1)
    base.add_gable_roof("hudec-main-roof", (-1.0, 1.5, 6.7), 12.2, 8.5, 3.9, roof)
    base.add_gable_roof("hudec-wing-roof", (4.8, 2.4, 5.3), 5.3, 6.7, 2.7, roof)
    base.add_gable_roof_ribs(
        "hudec-main-roof-detail",
        (-1.0, 1.5),
        12.2,
        8.5,
        6.7,
        3.9,
        roof_ridge,
        count=17,
    )
    base.add_half_timber("hudec-timber-left", -2.16, 4.1, 3.4, 2.7, timber, center_x=-3.6)
    base.add_half_timber("hudec-timber-right", -2.16, 4.1, 3.4, 2.7, timber, center_x=1.6)
    for floor, z in enumerate((1.45, 4.15)):
        for column, x in enumerate((-4.6, -2.2, 0.2, 2.6)):
            if floor == 0 and column == 2:
                continue
            base.add_window(f"hudec-window-{floor}-{column}", x, -2.17, z, 0.78, 1.45, "Y", frame, glass)
    base.add_detailed_door("hudec-door", (0.2, -2.34, 1.45), 1.35, 2.65, timber, wood, metal)
    base.add_box("hudec-porch", (0.2, -3.08, 2.0), (3.0, 1.6, 3.9), plaster, bevel=0.09)
    base.add_gable_roof("hudec-porch-roof", (0.2, -3.1, 3.95), 3.6, 2.1, 2.0, roof)
    base.add_detailed_door("hudec-porch-door", (0.2, -3.95, 1.4), 1.22, 2.55, timber, wood, metal)
    for x, height in ((-5.0, 4.4), (3.7, 3.7)):
        base.add_box(f"hudec-chimney-{x}", (x, 2.5, 7.8), (1.05, 1.1, height), brick, bevel=0.055)
        base.add_box(f"hudec-chimney-cap-{x}", (x, 2.5, 7.8 + height / 2), (1.35, 1.35, 0.22), brick_dark, bevel=0.045)
    # 正立面红砖拱门以深砖门框、墙柱和门洞形成照片中的街侧轮廓。
    base.add_box("hudec-front-wall-left", (-5.7, -6.7, 1.0), (5.5, 0.62, 2.0), brick, bevel=0.07)
    base.add_box("hudec-front-wall-right", (5.7, -6.7, 1.0), (5.5, 0.62, 2.0), brick, bevel=0.07)
    for x in (-2.2, 2.2):
        base.add_box(f"hudec-gate-pillar-{x}", (x, -6.7, 1.55), (0.85, 0.85, 3.1), brick, bevel=0.06)
    base.add_box("hudec-gate-beam", (0, -6.7, 2.8), (5.0, 0.72, 0.52), brick_dark, bevel=0.08)
    base.add_railing("hudec-gate-left", (-1.75, -6.78), (-0.12, -6.78), 0.18, 1.85, metal, posts=6)
    base.add_railing("hudec-gate-right", (0.12, -6.78), (1.75, -6.78), 0.18, 1.85, metal, posts=6)
    base.add_elliptical_cylinder("hudec-round-planter", (-4.9, -3.7, 0.35), (2.0, 1.55), 0.7, brick, vertices=36, bevel=0.07)
    base.add_garden_tree("hudec-garden-tree", (-4.9, -3.7), bark, green, variant=1)
    for index, x in enumerate((-7.4, -6.4, 6.4, 7.4)):
        base.add_icosphere(f"hudec-hedge-{index}", (x, -4.5, 0.72), (0.7, 1.45, 0.72), green_light, subdivisions=1)


def build_xinhua_pocket_park() -> None:
    paving = base.material("口袋公园洗石路", "#bcb8ad")
    paving_dark = base.material("口袋公园铺装缝", "#8f908a")
    mirror = base.material("口袋公园镜面墙", "#9ca9a8", roughness=0.16, metallic=0.78)
    steel = base.material("口袋公园耐候钢", "#9a5740", roughness=0.58, metallic=0.24)
    wood = base.material("口袋公园座椅木", "#765a45")
    dark = base.material("口袋公园深色金属", "#333b39", metallic=0.42)
    green = base.material("口袋公园深绿", "#4f714f")
    pink = base.material("口袋公园粉黛草", "#b9878c")
    yellow = base.material("口袋公园展板黄", "#d7a24d")
    blue = base.material("口袋公园展板蓝", "#537f89")
    coral = base.material("口袋公园展板红", "#b76252")

    base.add_box("pocket-ground", (0, 0, 0.08), (4.2, 9.2, 0.16), paving, bevel=0.18)
    # 曲折路径以短段串联，中央全程保持可行走。
    path_centers = ((-0.25, -3.45), (0.25, -1.75), (-0.12, 0), (0.28, 1.8), (-0.18, 3.55))
    for index, (x, y) in enumerate(path_centers):
        base.add_box(
            f"pocket-path-{index}",
            (x, y, 0.17),
            (2.25, 1.95, 0.08),
            paving,
            bevel=0.42,
            rotation=(0, 0, (-0.07 if index % 2 else 0.07)),
        )
    for side, x in (("left", -1.95), ("right", 1.95)):
        for index in range(6):
            y = -3.75 + index * 1.5
            height = 2.45 + 0.2 * math.sin(index * 1.3)
            base.add_box(
                f"pocket-mirror-{side}-{index}",
                (x, y, height / 2),
                (0.16, 1.35, height),
                mirror,
                bevel=0.035,
                rotation=(0, 0, (0.035 if (index + (side == "left")) % 2 else -0.035)),
            )
    # 耐候钢入口框顶边略有起伏，形成狭长空间的明确入口。
    for x in (-1.92, 1.92):
        base.add_box(f"pocket-entry-post-{x}", (x, -4.5, 1.7), (0.24, 0.28, 3.4), steel, bevel=0.05)
    base.add_beam("pocket-entry-wave-a", (-1.92, -4.5, 3.35), (0, -4.5, 3.72), 0.22, steel)
    base.add_beam("pocket-entry-wave-b", (0, -4.5, 3.72), (1.92, -4.5, 3.42), 0.22, steel)
    base.add_bench("pocket-bench", (0.75, -3.45), 1.55, wood, dark, rotation_z=0.08)
    colors = (yellow, blue, coral, blue)
    for index, y in enumerate((-2.0, -0.45, 1.1, 2.65)):
        base.add_cylinder(f"pocket-board-pole-{index}", (-1.45, y, 1.0), 0.04, 1.85, dark, vertices=10)
        base.add_box(f"pocket-board-{index}", (-1.38, y, 1.55), (0.14, 0.92, 1.02), colors[index], bevel=0.08)
    for index, y in enumerate((-2.85, -1.1, 0.65, 2.3, 3.75)):
        side = -1 if index % 2 == 0 else 1
        x = side * 1.35
        base.add_icosphere(f"pocket-grass-green-{index}", (x, y, 0.58), (0.65, 0.72, 0.58), green, subdivisions=1)
        base.add_icosphere(f"pocket-grass-pink-{index}", (x * 0.93, y + 0.18, 0.92), (0.5, 0.58, 0.65), pink, subdivisions=1)
    base.add_paving_grid("pocket-paving-detail", (0, 0), 3.8, 8.7, 0.215, paving_dark, columns=4, rows=12)


def build_xinhua_community_center() -> None:
    white = base.material("社区中心暖白墙", "#dedbd0")
    tile = base.material("社区中心白方砖", "#c8c9c3")
    silver = base.material("社区中心银灰门斗", "#777f7e", roughness=0.38, metallic=0.52)
    frame = base.material("社区中心深灰窗框", "#333c3a")
    glass = base.material("社区中心玻璃", "#536b68", roughness=0.34)
    orange = base.material("社区中心大橘子", "#e67a37")
    wood = base.material("社区中心花箱木", "#9a7453")
    green = base.material("社区中心草坪", "#617b54")
    green_light = base.material("社区中心花园", "#82915f")
    blue = base.material("社区中心运动角", "#4b869c")
    dark = base.material("社区中心玩具屋", "#2f3735")
    paving = base.material("社区中心铺装", "#aaa89f")
    warm = base.material("社区中心室内暖光", "#f0bd78", emission_strength=0.45)

    base.add_box("community-lawn", (0, 0.5, 0.06), (20, 16, 0.12), green, bevel=0.18)
    base.add_box("community-forecourt", (0, -4.8, 0.13), (16, 5.6, 0.14), paving, bevel=0.14)
    base.add_box("community-main", (0, 1.9, 2.35), (13.8, 7.2, 4.7), white, bevel=0.12)
    base.add_box("community-tile-wing", (4.8, -1.75, 2.2), (4.1, 0.28, 4.15), tile, bevel=0.04)
    add_front_windows(
        "community-window",
        center_x=0,
        front_y=-1.73,
        width=13.8,
        floors=2,
        columns=5,
        floor_height=2.2,
        frame=frame,
        glass=glass,
        base_z=1.2,
        skip={(0, 2), (1, 2)},
    )
    base.add_box("community-vestibule", (0, -2.95, 3.0), (3.0, 2.55, 6.0), silver, bevel=0.08)
    base.add_box("community-vestibule-glass", (0, -4.24, 1.7), (2.35, 0.12, 3.15), glass, bevel=0.04)
    base.add_box("community-vestibule-cap", (0, -3.0, 6.12), (3.35, 2.8, 0.24), silver, bevel=0.06)
    base.add_text_label("community-number", "4", (0, -4.34, 4.7), 0.95, 0.08, orange, bevel=0.028)
    # 用橙色圆形几何替代照片图形贴图，保留“大橘子”识别语义。
    for index, x in enumerate((-4.85, -3.75, 3.8, 4.85)):
        base.add_cylinder(
            f"community-orange-{index}",
            (x, -1.91, 2.8 if index % 2 else 1.4),
            0.36 if index % 2 else 0.48,
            0.1,
            orange,
            vertices=24,
            rotation=(math.pi / 2, 0, 0),
        )
    # 无障碍坡道采用薄斜板与栏杆，可步行区域不进入碰撞。
    ramp = base.add_box(
        "community-ramp",
        (-3.25, -4.3, 0.32),
        (4.7, 1.45, 0.25),
        paving,
        bevel=0.06,
        rotation=(0, 0.065, 0),
    )
    ramp["walkable"] = True
    base.add_railing("community-ramp-rail", (-5.4, -4.9), (-1.1, -4.9), 0.25, 0.95, silver, posts=7)
    base.add_planter("community-planter-left", (-5.7, -3.2), (2.2, 1.0), wood, green_light, height=0.72)
    base.add_planter("community-planter-right", (5.7, -3.2), (2.2, 1.0), wood, green_light, height=0.72)
    base.add_box("community-sports-court", (-5.2, 5.4, 0.16), (6.8, 4.1, 0.18), blue, bevel=0.18)
    # 林下玩具交换屋。
    base.add_box("community-toy-house", (6.3, 5.0, 1.45), (4.3, 3.4, 2.9), dark, bevel=0.12)
    base.add_box("community-toy-glass", (6.3, 3.25, 1.45), (3.45, 0.12, 2.25), glass, bevel=0.04)
    for index, x in enumerate((5.15, 6.3, 7.45)):
        base.add_box(f"community-toy-shelf-{index}", (x, 3.16, 1.35), (0.08, 0.08, 1.8), wood)
    base.add_box("community-toy-light", (6.3, 3.08, 2.45), (2.8, 0.05, 0.12), warm, bevel=0.025)


def build_debi_fahua_525() -> None:
    white = base.material("德必525白色框架", "#d9d9d2")
    gray = base.material("德必525灰墙", "#777d79")
    frame = base.material("德必525深框", "#333a39")
    glass = base.material("德必525玻璃", "#506766", roughness=0.32)
    steel = base.material("德必525黑钢", "#2c3433", roughness=0.4, metallic=0.48)
    orange = base.material("德必525导视橙", "#c97543")
    paving = base.material("德必525条石", "#a9a79f")
    water = base.material("德必525鱼池", "#416b70", roughness=0.2, metallic=0.15)
    bamboo = base.material("德必525竹秆", "#728359")
    leaf = base.material("德必525竹叶", "#4f714d")
    ginkgo = base.material("德必525银杏叶", "#8a9255")
    bark = base.material("德必525古树干", "#74614d")
    stone = base.material("德必525缘石", "#77736a")
    wood = base.material("德必525庭院木", "#8a684e")

    base.add_box("debi-site", (0, 0, 0.08), (28, 24, 0.16), paving, bevel=0.16)
    base.add_box("debi-main", (3.7, 4.8, 7.0), (11.0, 8.6, 14.0), gray, bevel=0.1)
    # 白色巨型竖框覆盖深色玻璃底，形成照片中最强的六层识别轮廓。
    base.add_box("debi-glass-wall", (3.7, 0.43, 7.0), (10.2, 0.15, 13.2), glass)
    for x in (-1.45, 0.15, 1.75, 3.35, 4.95, 6.55, 8.15):
        base.add_box(f"debi-vertical-frame-{x}", (x, 0.28, 7.0), (0.32, 0.35, 14.1), white, bevel=0.04)
    for floor in range(7):
        z = floor * 2.05
        base.add_box(f"debi-floor-frame-{floor}", (3.35, 0.26, z), (10.1, 0.34, 0.28), white, bevel=0.035)
    # 外置折返楼梯。
    stair_x = 9.75
    for floor in range(5):
        z0 = 0.8 + floor * 2.35
        start = (stair_x, 2.1 if floor % 2 else 7.4, z0)
        end = (stair_x, 7.4 if floor % 2 else 2.1, z0 + 2.0)
        base.add_beam(f"debi-external-stair-{floor}", start, end, 0.34, steel)
        base.add_beam(
            f"debi-external-stair-rail-{floor}",
            (start[0] + 0.42, start[1], start[2] + 0.75),
            (end[0] + 0.42, end[1], end[2] + 0.75),
            0.08,
            white,
            round_beam=True,
        )
        base.add_box(f"debi-stair-landing-{floor}", (stair_x, end[1], end[2]), (2.2, 1.3, 0.22), steel, bevel=0.04)
    base.add_box("debi-low-wing-left", (-8.0, 3.6, 2.35), (8.8, 7.4, 4.7), white, bevel=0.11)
    base.add_box("debi-low-wing-back", (-3.0, 9.4, 2.0), (17.0, 4.0, 4.0), white, bevel=0.1)
    add_front_windows(
        "debi-wing-window",
        center_x=-8.0,
        front_y=-0.16,
        width=8.8,
        floors=2,
        columns=4,
        floor_height=2.1,
        frame=frame,
        glass=glass,
        base_z=1.25,
    )
    base.add_text_label("debi-roof-name", "法华525", (3.5, 0.02, 13.2), 0.72, 0.08, white, bevel=0.025)
    # 四进庭院的核心元素：竹林、鱼池、古银杏与缘石。
    base.add_box("debi-fish-pond", (-1.6, -3.3, 0.24), (5.4, 3.1, 0.28), water, bevel=0.35)
    base.add_box("debi-pond-edge", (-1.6, -3.3, 0.12), (6.0, 3.7, 0.22), stone, bevel=0.22)
    base.add_box("debi-fish-pond-inner", (-1.6, -3.3, 0.26), (5.4, 3.1, 0.3), water, bevel=0.32)
    add_bamboo_cluster("debi-bamboo-left", (-6.7, -3.8), bamboo, leaf, count=8)
    add_bamboo_cluster("debi-bamboo-right", (4.3, -4.5), bamboo, leaf, count=7)
    base.add_garden_tree("debi-ginkgo-a", (-10.5, -4.8), bark, ginkgo, variant=0)
    base.add_garden_tree("debi-ginkgo-b", (8.0, -5.3), bark, ginkgo, variant=2)
    base.add_elliptical_cylinder("debi-heritage-stone", (-7.7, -7.9, 1.0), (1.3, 0.65), 2.0, stone, vertices=28, bevel=0.16)
    base.add_text_label("debi-stone-name", "缘石", (-7.7, -8.58, 1.2), 0.38, 0.055, orange, bevel=0.018)
    base.add_bench("debi-courtyard-bench", (3.2, -7.4), 3.0, wood, steel)


def build_fahua_heritage() -> None:
    stone = base.material("法华遗韵灰石", "#97938a")
    stone_light = base.material("法华遗韵浅石", "#b4afa3")
    plaque = base.material("法华遗韵深褐展板", "#51433a")
    gold = base.material("法华遗韵金字", "#c6a35d", metallic=0.25)
    roof = base.material("法华遗韵灰瓦", "#565752")
    roof_ridge = base.material("法华遗韵瓦脊", "#3e403d")
    paving = base.material("法华遗韵铺地", "#aaa69b")

    base.add_box("heritage-ground", (0, 0, 0.08), (15.5, 4.2, 0.16), paving, bevel=0.1)
    for index, x in enumerate((-5.5, -2.35, 2.35, 5.5)):
        width = 0.72 if abs(x) < 3 else 0.62
        base.add_box(f"heritage-pillar-{index}", (x, 0, 2.75), (width, 0.78, 5.5), stone, bevel=0.055)
        base.add_box(f"heritage-pillar-base-{index}", (x, 0, 0.22), (1.0, 1.12, 0.42), stone_light, bevel=0.05)
        base.add_box(f"heritage-pillar-cap-{index}", (x, 0, 5.45), (1.08, 1.02, 0.34), stone_light, bevel=0.05)
    base.add_box("heritage-main-beam", (0, 0, 5.25), (5.35, 0.82, 0.72), stone, bevel=0.06)
    base.add_box("heritage-main-plaque", (0, -0.47, 5.35), (3.9, 0.12, 0.82), plaque, bevel=0.04)
    base.add_text_label("heritage-title", "法华遗韵", (0, -0.58, 5.35), 0.55, 0.055, gold, bevel=0.018)
    for side, x in (("left", -4.0), ("right", 4.0)):
        base.add_box(f"heritage-side-beam-{side}", (x, 0, 4.25), (3.0, 0.7, 0.55), stone, bevel=0.05)
        base.add_gable_roof(
            f"heritage-side-roof-{side}",
            (x, 0, 4.52),
            3.6,
            1.8,
            0.8,
            roof,
            ridge_axis="X",
        )
        base.add_gable_roof_ribs(
            f"heritage-side-roof-detail-{side}",
            (x, 0),
            3.6,
            1.8,
            4.52,
            0.8,
            roof_ridge,
            count=7,
            ridge_axis="X",
        )
        base.add_box(f"heritage-panel-{side}", (x, 0.48, 2.15), (2.55, 0.22, 2.55), plaque, bevel=0.05)
        for row in range(4):
            base.add_box(
                f"heritage-panel-line-{side}-{row}",
                (x, 0.61, 1.4 + row * 0.5),
                (1.75 - row * 0.13, 0.04, 0.055),
                gold,
                bevel=0.012,
            )
    # 柱头云纹以成对小圆盘和短梁抽象表现，避免高面数雕刻。
    for index, x in enumerate((-5.5, -2.35, 2.35, 5.5)):
        base.add_cylinder(
            f"heritage-cloud-{index}-a",
            (x - 0.32, -0.48, 4.85),
            0.24,
            0.12,
            stone_light,
            vertices=16,
            rotation=(math.pi / 2, 0, 0),
        )
        base.add_cylinder(
            f"heritage-cloud-{index}-b",
            (x + 0.32, -0.48, 4.85),
            0.24,
            0.12,
            stone_light,
            vertices=16,
            rotation=(math.pi / 2, 0, 0),
        )


def build_fics_xinhua_365() -> None:
    # 先复用已验证的新华公馆细节，再将其放入完整园区东侧。
    base.build_xinhua_mansion()
    for obj in list(base.ASSET_OBJECTS):
        obj.location.x += 12.0
        obj.location.y -= 2.0

    white = base.material("FICS白色工业楼", "#d8d9d3")
    brick = base.material("FICS红砖", "#925948")
    red = base.material("FICS红色艺术墙", "#a84e43")
    frame = base.material("FICS深色框架", "#303a39")
    glass = base.material("FICS玻璃", "#516b69", roughness=0.34)
    orange = base.material("FICS橙色楼梯", "#da743e")
    yellow = base.material("FICS六边形黄", "#e0ad45")
    coral = base.material("FICS六边形红", "#bd5d4d")
    purple = base.material("FICS六边形紫", "#78627c")
    paving = base.material("FICS广场铺地", "#aaa89f")
    paving_dark = base.material("FICS铺装缝", "#777b76")
    green = base.material("FICS树阵", "#597650")
    green_light = base.material("FICS浅绿", "#7f8d60")
    bark = base.material("FICS树干", "#77634e")
    roof = base.material("FICS深灰屋顶", "#484a47")
    warm = base.material("FICS标识暖白", "#f2dfad", emission_strength=0.38)
    steel = base.material("FICS黑钢", "#2c3433", roughness=0.4, metallic=0.46)

    campus_ground = base.add_box("fics-campus-ground", (0, 0, 0.05), (48, 45, 0.1), paving, bevel=0.18)
    # 合并时让场地基座成为活动对象，确保 GLB 节点原点留在园区中心，
    # 避免复用新华公馆后的偏移被保留为隐藏节点变换。
    base.ASSET_OBJECTS.remove(campus_ground)
    base.ASSET_OBJECTS.insert(0, campus_ground)
    # 西北白色主楼：大尺度白框、深玻璃和屋顶标识。
    base.add_box("fics-main", (-13.5, 8.2, 6.2), (15.5, 11.0, 12.4), white, bevel=0.11)
    base.add_box("fics-main-glass", (-13.5, 2.62, 6.2), (14.4, 0.18, 11.4), glass)
    for x in (-19.8, -17.3, -14.8, -12.3, -9.8, -7.3):
        base.add_box(f"fics-main-frame-{x}", (x, 2.48, 6.2), (0.32, 0.32, 12.3), white, bevel=0.035)
    for floor in range(6):
        base.add_box(
            f"fics-main-floor-{floor}",
            (-13.5, 2.46, 1.0 + floor * 2.05),
            (14.6, 0.3, 0.24),
            white,
            bevel=0.03,
        )
    base.add_text_label("fics-roof-logo", "FICS 365", (-13.5, 2.28, 11.5), 0.78, 0.08, warm, bevel=0.025)
    # 南侧红色艺术楼。
    base.add_box("fics-red-building", (-13.0, -9.0, 4.5), (16.0, 8.0, 9.0), red, bevel=0.11)
    add_front_windows(
        "fics-red-window",
        center_x=-13.0,
        front_y=-13.05,
        width=16.0,
        floors=4,
        columns=6,
        floor_height=2.0,
        frame=frame,
        glass=glass,
        base_z=1.25,
    )
    # 北侧保留的工业长楼。
    base.add_box("fics-industrial-wing", (-4.5, 18.0, 3.9), (29.0, 7.2, 7.8), brick, bevel=0.1)
    base.add_gable_roof("fics-industrial-roof", (-4.5, 18.0, 7.8), 30.2, 8.4, 2.0, roof, ridge_axis="X")
    add_front_windows(
        "fics-industrial-window",
        center_x=-4.5,
        front_y=14.35,
        width=29.0,
        floors=3,
        columns=10,
        floor_height=2.15,
        frame=frame,
        glass=glass,
        base_z=1.2,
    )
    # 中央广场保持开放，只放置可绕行树阵和低坐凳。
    base.add_box("fics-central-square", (-2.0, 1.8, 0.14), (18.0, 15.0, 0.18), paving, bevel=0.15)
    base.add_paving_grid("fics-square-detail", (-2.0, 1.8), 17.0, 14.0, 0.245, paving_dark, columns=12, rows=10)
    for index, (x, y) in enumerate(((-7.5, -1.8), (-3.5, -1.2), (0.5, -0.8), (-7.0, 5.5), (-2.5, 6.2))):
        base.add_garden_tree(f"fics-tree-{index}", (x, y), bark, green if index % 2 else green_light, variant=index % 3)
    # 六边形彩色识别构件集中在主楼入口一侧。
    hex_colors = (yellow, coral, orange, purple)
    for index, (x, z) in enumerate(((-18.6, 2.0), (-17.2, 3.0), (-15.8, 2.0), (-14.4, 3.0), (-13.0, 2.0), (-11.6, 3.0))):
        add_hexagon(f"fics-hex-{index}", (x, 2.25, z), 0.58, hex_colors[index % len(hex_colors)])
    # 橙色室外楼梯位于白色主楼东侧。
    for floor in range(4):
        z0 = 0.65 + floor * 2.35
        start = (-5.3, 4.0 if floor % 2 else 11.6, z0)
        end = (-5.3, 11.6 if floor % 2 else 4.0, z0 + 1.95)
        base.add_beam(f"fics-orange-stair-{floor}", start, end, 0.38, orange)
        base.add_box(f"fics-orange-landing-{floor}", (-5.3, end[1], end[2]), (2.0, 1.35, 0.22), orange, bevel=0.04)
        base.add_beam(
            f"fics-orange-rail-{floor}",
            (-4.85, start[1], start[2] + 0.72),
            (-4.85, end[1], end[2] + 0.72),
            0.075,
            steel,
            round_beam=True,
        )
    base.add_bench("fics-bench-a", (-3.5, 8.4), 3.2, brick, steel)
    base.add_bench("fics-bench-b", (2.3, 7.8), 3.2, brick, steel)


BUILDERS: list[tuple[str, Callable[[], None]]] = [
    ("hudec-memorial", build_hudec_memorial),
    ("xinhua-pocket-park", build_xinhua_pocket_park),
    ("xinhua-community-center", build_xinhua_community_center),
    ("debi-fahua-525", build_debi_fahua_525),
    ("fahua-heritage", build_fahua_heritage),
    ("fics-xinhua-365", build_fics_xinhua_365),
]


def main() -> None:
    requested = {
        argument.removeprefix("--asset=")
        for argument in sys.argv
        if argument.startswith("--asset=")
    }
    builders = [
        (slug, builder)
        for slug, builder in BUILDERS
        if not requested or slug in requested
    ]
    missing = requested - {slug for slug, _ in builders}
    if missing:
        raise ValueError(f"未知资产：{', '.join(sorted(missing))}")
    results = [base.export_asset(slug, builder) for slug, builder in builders]
    print("新增 POI 资产生成完成：")
    for result in results:
        print(
            f"- {result['slug']}: {result['objects']} source objects, "
            f"{result['runtimeNodes']} runtime node, {result['bytes']} bytes"
        )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"生成失败：{error}", file=sys.stderr)
        raise
