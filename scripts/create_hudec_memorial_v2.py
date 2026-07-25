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
        "timber": base.material("邬达克体块深木构", "#292724"),
        "roof": base.material("邬达克体块红褐瓦", "#5d4037"),
        "brick": base.material("邬达克体块红砖", "#7a4035"),
        "glass": base.material("邬达克体块深玻璃", "#3f5554", roughness=0.42),
    }


def add_shed_roof(
    name: str,
    *,
    center_x: float,
    inner_y: float,
    outer_y: float,
    width: float,
    inner_z: float,
    outer_z: float,
    thickness: float,
    mat: bpy.types.Material,
) -> None:
    """生成从主屋向庭院下降的单坡屋面，避免低翼退化成独立小房子。"""
    half_width = width / 2
    vertices = [
        (center_x - half_width, inner_y, inner_z),
        (center_x + half_width, inner_y, inner_z),
        (center_x - half_width, outer_y, outer_z),
        (center_x + half_width, outer_y, outer_z),
        (center_x - half_width, inner_y, inner_z - thickness),
        (center_x + half_width, inner_y, inner_z - thickness),
        (center_x - half_width, outer_y, outer_z - thickness),
        (center_x + half_width, outer_y, outer_z - thickness),
    ]
    faces = [
        (0, 2, 3, 1),
        (4, 5, 7, 6),
        (0, 1, 5, 4),
        (2, 6, 7, 3),
        (0, 4, 6, 2),
        (1, 3, 7, 5),
    ]
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    base.register(obj, mat)


def add_massing_half_timber(
    prefix: str,
    *,
    center_x: float,
    face_y: float,
    width: float,
    height: float,
    mat: bpy.types.Material,
) -> None:
    """在官方照片可见的端山墙上保留最小但可识别的半木构骨架。"""
    bottom = 0.35
    top = height - 0.2
    left = center_x - width / 2 + 0.22
    right = center_x + width / 2 - 0.22
    middle = center_x
    for name, x in (("left", left), ("middle", middle), ("right", right)):
        base.add_beam(
            f"{prefix}-vertical-{name}",
            (x, face_y, bottom),
            (x, face_y, top),
            0.16,
            mat,
        )
    for index, z in enumerate((2.0, 3.75, top)):
        base.add_beam(
            f"{prefix}-horizontal-{index}",
            (left, face_y, z),
            (right, face_y, z),
            0.16,
            mat,
        )
    base.add_beam(
        f"{prefix}-lower-diagonal-left",
        (left, face_y, bottom),
        (middle, face_y, 2.0),
        0.15,
        mat,
    )
    base.add_beam(
        f"{prefix}-lower-diagonal-right",
        (right, face_y, bottom),
        (middle, face_y, 2.0),
        0.15,
        mat,
    )
    base.add_beam(
        f"{prefix}-upper-diagonal-left",
        (left, face_y, 3.75),
        (middle, face_y, top),
        0.15,
        mat,
    )
    base.add_beam(
        f"{prefix}-upper-diagonal-right",
        (right, face_y, 3.75),
        (middle, face_y, top),
        0.15,
        mat,
    )


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
    # 地图校准建议使用 runtime scale=0.88。入口净宽必须在该缩放下仍满足
    # 2 × (PLAYER_RADIUS 0.48 + collisionMargin 0.2) = 1.36 scene unit。
    # 3.25 生成器设计单位经 AUTHORED_SCALE 后的真实墙间隙为 1.5912，
    # runtime scale=0.88 后为 1.400256，保留约 0.04 的合法中心线余量。
    porch_width = 3.25
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
        4.5,
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
    base.add_box(
        "hudec-v2-rear-dormer",
        (0.65, 2.35, 7.25),
        (2.15, 1.05, 1.55),
        mat["plaster"],
        bevel=0.045,
    )
    add_shed_roof(
        "hudec-v2-rear-dormer-roof",
        center_x=0.65,
        inner_y=1.72,
        outer_y=2.98,
        width=2.55,
        inner_z=8.22,
        outer_z=7.98,
        thickness=0.2,
        mat=mat["roof"],
    )

    # 官方西后侧照片证明一段与主屋垂直的全高半木构端翼。
    base.add_box(
        "hudec-v2-end-wing",
        (4.7, 1.25, 2.7),
        (3.8, 7.0, 5.4),
        mat["plaster"],
        bevel=0.075,
    )
    base.add_gable_roof(
        "hudec-v2-end-wing-roof",
        (4.7, 1.25, 5.4),
        4.7,
        7.8,
        3.6,
        mat["roof"],
        ridge_axis="Y",
    )
    add_massing_half_timber(
        "hudec-v2-end-gable-timber",
        center_x=4.7,
        face_y=4.79,
        width=3.8,
        height=5.4,
        mat=mat["timber"],
    )

    # 西后侧的低玻璃翼和坡顶是建筑纵深身份，而不是庭院装饰。
    base.add_box(
        "hudec-v2-low-glass-wing",
        (-3.75, 3.55, 1.25),
        (5.0, 3.35, 2.5),
        mat["glass"],
        bevel=0.055,
    )
    add_shed_roof(
        "hudec-v2-low-glass-wing-roof",
        center_x=-3.75,
        inner_y=1.82,
        outer_y=5.3,
        width=5.6,
        inner_z=4.25,
        outer_z=2.72,
        thickness=0.26,
        mat=mat["roof"],
    )
    for index, x in enumerate((-5.45, -4.3, -3.15, -2.0)):
        base.add_beam(
            f"hudec-v2-low-wing-frame-{index}",
            (x, 5.24, 0.25),
            (x, 5.24, 2.48),
            0.13,
            mat["timber"],
        )
    base.add_beam(
        "hudec-v2-low-wing-frame-top",
        (-6.0, 5.24, 2.42),
        (-1.5, 5.24, 2.42),
        0.13,
        mat["timber"],
    )

    add_open_entrance_porch(
        "hudec-v2-entrance-porch",
        2.65,
        -3.55,
        0.12,
        mat["plaster"],
        mat["roof"],
    )

    # 官方照片直接证明白色烟囱塔和三支独立高砖烟道；即使在 Massing
    # 也不能退化成单一通用方柱。
    base.add_box(
        "hudec-v2-chimney-tower",
        (-3.95, 2.85, 4.75),
        (2.85, 2.5, 9.3),
        mat["plaster"],
        bevel=0.055,
    )
    for index, x in enumerate((-4.72, -3.95, -3.18)):
        base.add_box(
            f"hudec-v2-chimney-flue-{index}",
            (x, 2.85, 10.75),
            (0.56, 1.12, 3.1),
            mat["brick"],
            bevel=0.035,
        )
        base.add_box(
            f"hudec-v2-chimney-flue-cap-{index}",
            (x, 2.85, 12.38),
            (0.68, 1.3, 0.18),
            mat["brick"],
            bevel=0.025,
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
    fill.data.energy = 650
    fill.data.size = 7.0

    # 1.8 m / 2.7 m = 0.667 场景单位。代理只参与固定机位比例检查，
    # asset=False 保证不会进入 Blend 的资产列表或导出的 GLB。
    proxy = base.material("测试1.8米人物代理", "#c77847")
    base.add_cylinder(
        "test-human-1_8m-body",
        (5.2, 3.5, minimum.z + 0.25),
        0.075,
        0.5,
        proxy,
        vertices=12,
        asset=False,
    )
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=16,
        ring_count=8,
        radius=0.083,
        location=(5.2, 3.5, minimum.z + 0.583),
    )
    head = bpy.context.active_object
    head.name = "test-human-1_8m-head"
    base.register(head, proxy, asset=False)
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
            (-15.5, 23.0, 12.0),
            (-0.1, 1.0, 4.45),
            56,
        ),
        (
            "side",
            (21.0, 17.0, 10.8),
            (-0.8, 1.2, 4.35),
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
