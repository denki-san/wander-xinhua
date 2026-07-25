"""确定性生成邬达克纪念馆 V2 的 Hero、Identity 与 Massing。

本脚本只写入 stable asset ID ``hudec-memorial`` 的三档产物，不会遍历或
覆盖 requested-pois 中的其他建筑。参考照片仅用于几何判断，不进入 GLB。
"""

from __future__ import annotations

import math
import sys
from pathlib import Path
from typing import Callable

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import create_xinhua_road_models as base


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "public/models/requested-pois"
SOURCE_DIR = ROOT / "assets/models/source/requested-pois"
PREVIEW_DIR = ROOT / "test_artifacts"
STABLE_ASSET_ID = "hudec-memorial"
AUTHORED_SCALE = 0.72


def scale_asset_geometry(factor: float) -> None:
    """把旧版设计空间烘焙为 2.7 米/单位的正式 authored units。"""
    for obj in base.ASSET_OBJECTS:
        obj.location *= factor
        obj.scale *= factor
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        obj.select_set(False)


def massing_materials() -> dict[str, bpy.types.Material]:
    return {
        "plaster": base.material("邬达克体块暖白灰泥", "#d6d0c1"),
        "timber": base.material("邬达克体块深木构", "#3a3733"),
        "roof": base.material("邬达克体块红褐瓦", "#73564b"),
        "brick": base.material("邬达克体块红砖", "#8a5547"),
        "glass": base.material("邬达克体块深玻璃", "#4f625f", roughness=0.45),
    }


def add_open_entrance_porch(
    prefix: str,
    center_x: float,
    front_y: float,
    base_z: float,
    plaster: bpy.types.Material,
    roof: bpy.types.Material,
) -> None:
    """以两侧墙肢而非实心方盒表达可进入门廊。"""
    side_width = 0.52
    porch_width = 2.8
    porch_depth = 1.75
    wall_height = 2.25
    for side, x in (
        ("left", center_x - porch_width / 2 + side_width / 2),
        ("right", center_x + porch_width / 2 - side_width / 2),
    ):
        base.add_box(
            f"{prefix}-{side}",
            (x, front_y, base_z + wall_height / 2),
            (side_width, porch_depth, wall_height),
            plaster,
            bevel=0.055,
        )
    base.add_box(
        f"{prefix}-lintel",
        (center_x, front_y, base_z + wall_height - 0.22),
        (porch_width, porch_depth, 0.44),
        plaster,
        bevel=0.05,
    )
    base.add_gable_roof(
        f"{prefix}-roof",
        (center_x, front_y, base_z + wall_height),
        porch_width + 0.5,
        porch_depth + 0.55,
        1.75,
        roof,
        ridge_axis="Y",
    )


def build_massing() -> None:
    """证据支持的体块、屋顶层级、烟囱、入口开口与低玻璃翼。"""
    mat = massing_materials()

    # OSM 外包络是场地级证据。浅底板只用于地面基准，不作为整院碰撞。
    base.add_box(
        "hudec-v2-ground-datum",
        (0.0, -0.35, 0.06),
        (17.5, 15.0, 0.12),
        mat["plaster"],
        bevel=0.08,
    )

    # Canonical 正立面位于 local -Y。主屋顶屋脊必须与正立面平行。
    base.add_box(
        "hudec-v2-main-body",
        (-0.35, 0.65, 2.9),
        (12.1, 7.0, 5.8),
        mat["plaster"],
        bevel=0.09,
    )
    base.add_gable_roof(
        "hudec-v2-main-roof",
        (-0.35, 0.65, 5.8),
        13.1,
        8.2,
        4.0,
        mat["roof"],
        ridge_axis="X",
    )
    base.add_box(
        "hudec-v2-main-dormer",
        (2.0, -1.15, 7.05),
        (2.0, 1.0, 1.45),
        mat["plaster"],
        bevel=0.045,
    )
    base.add_gable_roof(
        "hudec-v2-main-dormer-roof",
        (2.0, -1.15, 7.75),
        2.35,
        1.4,
        0.72,
        mat["roof"],
        ridge_axis="Y",
    )

    # 官方西后侧照片证明一段与主屋垂直的全高半木构端翼。
    base.add_box(
        "hudec-v2-end-wing",
        (4.75, 1.35, 2.65),
        (3.3, 6.7, 5.3),
        mat["plaster"],
        bevel=0.075,
    )
    base.add_gable_roof(
        "hudec-v2-end-wing-roof",
        (4.75, 1.35, 5.3),
        4.2,
        7.4,
        3.1,
        mat["roof"],
        ridge_axis="Y",
    )

    # 西后侧的低玻璃翼和坡顶是建筑纵深身份，而不是庭院装饰。
    base.add_box(
        "hudec-v2-low-glass-wing",
        (-4.7, 3.25, 1.15),
        (4.2, 3.1, 2.3),
        mat["glass"],
        bevel=0.055,
    )
    base.add_gable_roof(
        "hudec-v2-low-glass-wing-roof",
        (-4.7, 3.25, 2.3),
        4.8,
        3.7,
        1.45,
        mat["roof"],
        ridge_axis="X",
    )

    add_open_entrance_porch(
        "hudec-v2-entrance-porch",
        2.65,
        -3.55,
        0.12,
        mat["plaster"],
        mat["roof"],
    )

    # Massing 将三联烟囱合并为可读体块；Hero 再表达分缝和冠部。
    base.add_box(
        "hudec-v2-chimney-mass",
        (-4.35, 2.15, 8.1),
        (2.0, 1.65, 5.0),
        mat["brick"],
        bevel=0.055,
    )
    base.add_box(
        "hudec-v2-chimney-crown",
        (-4.35, 2.15, 10.65),
        (2.35, 2.0, 0.38),
        mat["brick"],
        bevel=0.04,
    )

    # 入口街墙分段保留中央通路，不使用场地级大碰撞盒。
    for side, x in (("left", -5.9), ("right", 5.9)):
        base.add_box(
            f"hudec-v2-street-wall-{side}",
            (x, -6.55, 0.82),
            (5.0, 0.54, 1.64),
            mat["brick"],
            bevel=0.055,
        )

    scale_asset_geometry(AUTHORED_SCALE)


def scene_bounds() -> tuple[Vector, Vector]:
    minimum = Vector((math.inf, math.inf, math.inf))
    maximum = Vector((-math.inf, -math.inf, -math.inf))
    for obj in base.ASSET_OBJECTS:
        for corner in obj.bound_box:
            point = obj.matrix_world @ Vector(corner)
            minimum.x = min(minimum.x, point.x)
            minimum.y = min(minimum.y, point.y)
            minimum.z = min(minimum.z, point.z)
            maximum.x = max(maximum.x, point.x)
            maximum.y = max(maximum.y, point.y)
            maximum.z = max(maximum.z, point.z)
    return minimum, maximum


def add_preview_environment() -> tuple[bpy.types.Object, bpy.types.Object]:
    minimum, maximum = scene_bounds()
    center = (minimum + maximum) * 0.5
    extent = max(maximum.x - minimum.x, maximum.y - minimum.y, maximum.z - minimum.z)
    base.add_box(
        "test-hudec-v2-preview-ground",
        (center.x, center.y, minimum.z - 0.07),
        (extent * 1.55, extent * 1.55, 0.14),
        base.material("测试地面", "#d8d2c5"),
        asset=False,
    )
    bpy.ops.object.camera_add()
    camera = bpy.context.active_object
    bpy.context.scene.camera = camera
    bpy.ops.object.light_add(type="AREA", location=(-6.0, -9.0, 15.0))
    key = bpy.context.active_object
    key.data.energy = 1800
    key.data.shape = "DISK"
    key.data.size = 9.0
    bpy.ops.object.light_add(type="AREA", location=(10.0, 4.0, 9.0))
    fill = bpy.context.active_object
    fill.data.energy = 900
    fill.data.size = 7.0
    return camera, key


def render_fixed_views(slug: str) -> None:
    """MCP 三道门与 Headless 回退共用同一组固定机位。"""
    camera, _ = add_preview_environment()
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.69, 0.76, 0.78, 1.0)
    background.inputs["Strength"].default_value = 0.65
    scene.view_settings.look = "AgX - Medium High Contrast"

    views = (
        (
            "canonical",
            (14.5, -25.0, 9.5),
            (0.0, 0.25, 3.9),
            54,
        ),
        (
            "side",
            (-20.0, 16.0, 10.5),
            (-0.5, 0.8, 4.2),
            54,
        ),
        (
            "entrance",
            (8.2, -17.0, 6.2),
            (1.3, -1.35, 2.55),
            58,
        ),
    )
    for suffix, location, target, lens in views:
        camera.location = location
        camera.data.lens = lens
        camera.rotation_euler = (
            Vector(target) - camera.location
        ).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(
            PREVIEW_DIR / f"test_{slug}_{suffix}_preview.png"
        )
        bpy.ops.render.render(write_still=True)


def export_stage(
    slug: str,
    builder: Callable[[], None],
    *,
    stage: str,
) -> None:
    base.clear_scene()
    builder()
    source_parts = len(base.ASSET_OBJECTS)
    base.merge_asset_objects(slug)
    root = base.ASSET_OBJECTS[0]
    root["stable_asset_id"] = STABLE_ASSET_ID
    root["quality_tier"] = stage
    root["authored_unit_meters"] = 2.7
    root["front_direction"] = "-Y"
    root["ground_datum"] = 0.0
    root["passage_contract"] = "shared-split-obstacles-entrance-clear"
    root["source_parts"] = source_parts
    root["generator"] = "scripts/create_hudec_memorial_v2.py"

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    root.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_DIR / f"{slug}.blend"))
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_DIR / f"{slug}.glb"),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_extras=True,
    )
    render_fixed_views(slug)
    print(
        f"{slug}: stage={stage}, source_parts={source_parts}, "
        f"bytes={(OUTPUT_DIR / f'{slug}.glb').stat().st_size}"
    )


def requested_stage() -> str:
    for argument in sys.argv:
        if argument.startswith("--stage="):
            return argument.removeprefix("--stage=")
    return "massing"


def main() -> None:
    stage = requested_stage()
    if stage != "massing":
        raise ValueError(
            "当前只开放 massing；完成 MCP 1 与真实地图校准后才允许 Hero/Identity"
        )
    export_stage(
        "hudec-memorial-massing",
        build_massing,
        stage="massing",
    )


if __name__ == "__main__":
    main()
