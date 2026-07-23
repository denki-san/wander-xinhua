"""生成幸福里三段式 Blender / GLB 硬表面资产。

公开照片只用于人工判断轮廓、比例、材料与构件，不会作为贴图进入模型。
灰模与最终资产使用不同文件名，避免后续批次覆盖已通过的阶段证据。
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
LAYOUT_PATH = ROOT / "app/scene/xingfuli-layout.json"
OUTPUT_DIR = ROOT / "public/models/xingfuli"
SOURCE_DIR = ROOT / "assets/models/source/xingfuli"
PREVIEW_DIR = ROOT / "test_artifacts"
FLOOR_HEIGHT = 2.08

SEGMENT_RANGES = {
    "west": (-47.0, -22.0),
    "center": (-22.0, 22.0),
    "east": (22.0, 47.0),
}

ASSET_OBJECTS: list[bpy.types.Object] = []
MATERIALS: dict[str, bpy.types.Material] = {}


def parse_arguments() -> argparse.Namespace:
    script_args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description="生成幸福里三段式资产")
    parser.add_argument("--segment", choices=["west", "center", "east", "all"], required=True)
    parser.add_argument(
        "--stage",
        choices=["massing", "identity", "materials", "site", "final"],
        required=True,
    )
    return parser.parse_args(script_args)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    ASSET_OBJECTS.clear()
    MATERIALS.clear()
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def hex_color(value: str) -> tuple[float, float, float, float]:
    value = value.lstrip("#")
    return tuple(int(value[index:index + 2], 16) / 255 for index in (0, 2, 4)) + (1.0,)


def material(
    name: str,
    color: str,
    *,
    roughness: float = 0.8,
    metallic: float = 0.0,
    alpha: float = 1.0,
) -> bpy.types.Material:
    key = f"{name}:{color}:{roughness}:{metallic}:{alpha}"
    if key in MATERIALS:
        return MATERIALS[key]
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    rgba = hex_color(color)
    result.diffuse_color = (*rgba[:3], alpha)
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = rgba
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Alpha"].default_value = alpha
    if alpha < 1:
        result.surface_render_method = "DITHERED"
        result.use_transparency_overlap = False
    MATERIALS[key] = result
    return result


def palette(stage: str) -> dict[str, bpy.types.Material]:
    # 灰模/identity 保留已验收色值；materials 起按实景证据收紧冷暖、粗糙度和材质对比。
    refined = stage in {"materials", "site", "final"}
    return {
        "warm_white": material("暖白抹灰", "#ebe7dc" if refined else "#e9e7de", roughness=0.9),
        "cool_white": material("冷白抹灰", "#d5d8d3" if refined else "#dfe1dc", roughness=0.88),
        "silver": material("银灰金属", "#929c9a" if refined else "#a4aaa7", roughness=0.56, metallic=0.2),
        "charcoal": material("深炭框架", "#293735" if refined else "#31413e", roughness=0.64, metallic=0.1),
        "glass": material("蓝灰玻璃", "#638b90" if refined else "#739b9e", roughness=0.29, alpha=0.74),
        "wood": material("暖木格栅", "#8d5f43" if refined else "#986a4c", roughness=0.82),
        "brick": material("低饱和红砖", "#934c3d" if refined else "#9b5544", roughness=0.9),
        "stone": material("灰石铺地", "#92928c" if refined else "#aaa9a1", roughness=0.95),
        "pool": material("水池深石", "#394b47" if refined else "#46534f", roughness=0.82),
        "mural": material("抽象珊瑚色块", "#bd5a48" if refined else "#c8624f", roughness=0.86),
        "brick_dark": material("红砖阴缝", "#693d36", roughness=0.93),
        "stone_light": material("浅灰石材", "#bbb9af", roughness=0.94),
    }


def register(obj: bpy.types.Object, mat: bpy.types.Material) -> bpy.types.Object:
    obj.data.materials.append(mat)
    ASSET_OBJECTS.append(obj)
    return obj


def add_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    mat: bpy.types.Material,
    *,
    bevel: float = 0.0,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("证据边缘倒角", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return register(obj, mat)


def add_cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    mat: bpy.types.Material,
    *,
    vertices: int = 12,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
    )
    obj = bpy.context.active_object
    obj.name = name
    return register(obj, mat)


def building_material(feature: str, mats: dict[str, bpy.types.Material]) -> bpy.types.Material:
    if feature == "pavilion":
        return mats["silver"]
    if feature == "timber":
        return mats["cool_white"]
    if feature == "mural":
        return mats["cool_white"]
    return mats["warm_white"]


def add_storefront_band(building: dict, mats: dict[str, bpy.types.Material], *, detailed: bool) -> None:
    side_sign = -1 if building["side"] == "north" else 1
    front_y = building["z"] + side_sign * (building["depth"] / 2 + 0.035)
    width = building["width"]
    add_box(
        f"{building['id']}-storefront-recess",
        (building["x"], front_y, 1.28),
        (width - 0.38, 0.18, 1.78),
        mats["charcoal"],
        bevel=0.035,
    )
    add_box(
        f"{building['id']}-storefront-glass",
        (building["x"], front_y + side_sign * 0.11, 1.28),
        (width - 0.72, 0.055, 1.48),
        mats["glass"],
    )
    unit_count = max(3, round(width / 4.2))
    for index in range(1, unit_count):
        x = building["x"] - width / 2 + width * index / unit_count
        add_box(
            f"{building['id']}-storefront-mullion-{index}",
            (x, front_y + side_sign * 0.15, 1.28),
            (0.08, 0.09, 1.52),
            mats["charcoal"],
        )
    add_box(
        f"{building['id']}-storefront-canopy",
        (building["x"], front_y + side_sign * 0.34, 2.22),
        (width - 0.22, 0.72 if detailed else 0.48, 0.18),
        mats["charcoal"],
        bevel=0.025,
    )


def add_upper_openings(building: dict, mats: dict[str, bpy.types.Material], *, detailed: bool) -> None:
    side_sign = -1 if building["side"] == "north" else 1
    front_y = building["z"] + side_sign * (building["depth"] / 2 + 0.07)
    columns = max(3, int(building["width"] / (2.6 if detailed else 4.1)))
    window_width = building["width"] / columns * (0.72 if detailed else 0.62)
    for floor in range(1, building["floors"]):
        center_z = 1.38 + floor * FLOOR_HEIGHT
        for column in range(columns):
            x = building["x"] - building["width"] / 2 + building["width"] * (column + 0.5) / columns
            add_box(
                f"{building['id']}-window-{floor}-{column}",
                (x, front_y, center_z),
                (window_width, 0.13, 1.02),
                mats["glass"],
                bevel=0.02,
            )
            if detailed:
                add_box(
                    f"{building['id']}-sill-{floor}-{column}",
                    (x, front_y + side_sign * 0.04, center_z - 0.58),
                    (window_width + 0.12, 0.22, 0.09),
                    mats["cool_white"],
                )


def add_feature_mass(building: dict, mats: dict[str, bpy.types.Material], *, detailed: bool) -> None:
    feature = building["feature"]
    side_sign = -1 if building["side"] == "north" else 1
    height = building["floors"] * FLOOR_HEIGHT + 0.4
    front_y = building["z"] + side_sign * building["depth"] / 2
    if feature == "bay":
        x = building["x"] + building["width"] * 0.24
        add_box(
            f"{building['id']}-silver-bay",
            (x, front_y + side_sign * 0.48, 4.25),
            (4.45, 1.0, 4.75),
            mats["silver"],
            bevel=0.1,
        )
        for floor in range(2, 4):
            add_box(
                f"{building['id']}-bay-window-{floor}",
                (x, front_y + side_sign * 1.01, 1.36 + floor * FLOOR_HEIGHT),
                (3.72, 0.06, 0.76),
                mats["glass"],
            )
    elif feature == "balcony":
        for floor in range(1, building["floors"]):
            for x_offset in (-building["width"] * 0.27, building["width"] * 0.27):
                x = building["x"] + x_offset
                z = 1.2 + floor * FLOOR_HEIGHT
                add_box(
                    f"{building['id']}-balcony-slab-{floor}-{x_offset}",
                    (x, front_y + side_sign * 0.42, z - 0.58),
                    (2.75, 0.86, 0.16),
                    mats["cool_white"],
                )
                if detailed:
                    add_box(
                        f"{building['id']}-balcony-rail-{floor}-{x_offset}",
                        (x, front_y + side_sign * 0.82, z - 0.12),
                        (2.58, 0.08, 0.72),
                        mats["charcoal"],
                    )
    elif feature == "glass":
        x = building["x"] + building["width"] / 2 - 2.65
        add_box(
            f"{building['id']}-glass-corner",
            (x, front_y + side_sign * 0.58, 3.45),
            (5.35, 1.32, 4.7),
            mats["glass"],
            bevel=0.08,
        )
        for offset in (-2.12, -1.06, 0.0, 1.06, 2.12):
            add_box(
                f"{building['id']}-glass-mullion-{offset}",
                (x + offset, front_y + side_sign * 1.27, 3.45),
                (0.09, 0.08, 4.6),
                mats["charcoal"],
            )
        if detailed:
            add_cylinder(
                f"{building['id']}-roof-water-tank",
                (building["x"] - 3.2, building["z"], height + 1.1),
                1.1,
                1.45,
                mats["silver"],
                vertices=16,
            )
    elif feature == "pavilion":
        add_box(
            f"{building['id']}-roof-pavilion",
            (building["x"] + 1.1, building["z"], height + 0.82),
            (7.9, 4.8, 1.28),
            mats["glass"],
            bevel=0.07,
        )
        add_box(
            f"{building['id']}-roof-pavilion-cap",
            (building["x"] + 1.1, building["z"], height + 1.5),
            (8.45, 5.25, 0.18),
            mats["charcoal"],
        )
    elif feature == "timber":
        group_center_x = building["x"] + 6.5
        count = 18 if detailed else 9
        spacing = 0.43 if detailed else 0.86
        for index in range(count):
            x = group_center_x + (index - (count - 1) / 2) * spacing
            add_box(
                f"{building['id']}-timber-slat-{index}",
                (x, front_y + side_sign * 0.34, height * 0.56),
                (0.13 if detailed else 0.2, 0.26, height * 0.65),
                mats["wood"],
            )
        # 红砖竖向窗体来自中段照片，是南侧长体量的重要非通用身份。
        add_box(
            f"{building['id']}-brick-window-volume",
            (building["x"] - 7.7, front_y + side_sign * 0.35, height * 0.58),
            (3.25, 0.72, height * 0.72),
            mats["brick"],
            bevel=0.06,
        )
        for floor in range(1, building["floors"]):
            add_box(
                f"{building['id']}-brick-window-{floor}",
                (building["x"] - 7.7, front_y + side_sign * 0.75, 1.38 + floor * FLOOR_HEIGHT),
                (2.45, 0.06, 0.95),
                mats["glass"],
            )
    elif feature == "mural":
        # 只保留原创抽象色块，不复刻实景品牌或墙绘。
        end_x = building["x"] - building["width"] / 2 - 0.05
        add_box(
            f"{building['id']}-west-identity-wall",
            (end_x, building["z"], 2.65),
            (0.2, building["depth"] - 0.6, 4.85),
            mats["charcoal"],
        )
        if detailed:
            for index, (y, z) in enumerate(((-2.5, 1.6), (0.0, 2.7), (2.3, 3.8))):
                add_box(
                    f"{building['id']}-abstract-panel-{index}",
                    (end_x - 0.12, building["z"] + y, z),
                    (0.08, 1.65, 0.76),
                    mats["mural"],
                    rotation=(0.0, 0.0, (index - 1) * 0.11),
                )


def add_material_details(building: dict, mats: dict[str, bpy.types.Material]) -> None:
    """只用几何与紧凑色板表达材质语法，不引入照片或品牌贴图。"""
    feature = building["feature"]
    side_sign = -1 if building["side"] == "north" else 1
    front_y = building["z"] + side_sign * (building["depth"] / 2 + 0.23)
    height = building["floors"] * FLOOR_HEIGHT + 0.4

    # 首层入口、门楣与横向分缝让七栋店面在同一语言内保持不同节奏。
    entrance_x = building["x"] + building["width"] * (-0.23 if building["side"] == "north" else 0.23)
    add_box(
        f"{building['id']}-material-entry-frame",
        (entrance_x, front_y + side_sign * 0.015, 1.17),
        (1.58, 0.11, 1.72),
        mats["charcoal"],
        bevel=0.025,
    )
    add_box(
        f"{building['id']}-material-entry-glass",
        (entrance_x, front_y + side_sign * 0.075, 1.17),
        (1.34, 0.035, 1.5),
        mats["glass"],
    )
    add_box(
        f"{building['id']}-material-entry-divider",
        (entrance_x, front_y + side_sign * 0.1, 1.17),
        (0.055, 0.045, 1.52),
        mats["charcoal"],
    )
    fascia_material = mats["wood"] if feature == "timber" else mats["silver"] if feature in {"glass", "pavilion"} else mats["stone_light"]
    add_box(
        f"{building['id']}-material-fascia",
        (building["x"], front_y + side_sign * 0.02, 2.2),
        (building["width"] - 0.58, 0.12, 0.2),
        fascia_material,
        bevel=0.02,
    )

    for floor in range(1, building["floors"]):
        add_box(
            f"{building['id']}-material-stringcourse-{floor}",
            (building["x"], front_y - side_sign * 0.16, 0.56 + floor * FLOOR_HEIGHT),
            (building["width"] - 0.48, 0.1, 0.08),
            mats["stone_light"],
        )

    if feature == "timber":
        brick_x = building["x"] - 7.7
        brick_front_y = building["z"] + side_sign * (building["depth"] / 2 + 0.75)
        # 远距离也能读出的红砖横向阴缝；不使用高频图片纹理。
        for course in range(9):
            add_box(
                f"{building['id']}-brick-course-{course}",
                (brick_x, brick_front_y + side_sign * 0.015, 1.15 + course * 0.61),
                (3.08, 0.045, 0.045),
                mats["brick_dark"],
            )
    elif feature == "glass":
        corner_x = building["x"] + building["width"] / 2 - 2.65
        for floor in range(1, building["floors"]):
            add_box(
                f"{building['id']}-glass-spandrel-{floor}",
                (corner_x, front_y + side_sign * 0.72, 0.55 + floor * FLOOR_HEIGHT),
                (5.22, 0.08, 0.16),
                mats["silver"],
            )
    elif feature == "bay":
        bay_x = building["x"] + building["width"] * 0.24
        for offset in (-1.72, 1.72):
            add_box(
                f"{building['id']}-bay-edge-fin-{offset}",
                (bay_x + offset, front_y + side_sign * 0.92, 4.25),
                (0.09, 0.18, 4.52),
                mats["charcoal"],
            )
    elif feature == "balcony":
        for floor in range(1, building["floors"]):
            rail_z = 1.08 + floor * FLOOR_HEIGHT
            for x_offset in (-building["width"] * 0.27, building["width"] * 0.27):
                for post in range(5):
                    add_box(
                        f"{building['id']}-balcony-post-{floor}-{x_offset}-{post}",
                        (
                            building["x"] + x_offset - 1.08 + post * 0.54,
                            front_y + side_sign * 0.52,
                            rail_z,
                        ),
                        (0.045, 0.07, 0.68),
                        mats["charcoal"],
                    )


def add_building(building: dict, mats: dict[str, bpy.types.Material], stage: str) -> None:
    detailed = stage != "massing"
    height = building["floors"] * FLOOR_HEIGHT + 0.4
    add_box(
        f"{building['id']}-body",
        (building["x"], building["z"], 0.22 + height / 2),
        (building["width"], building["depth"], height),
        building_material(building["feature"], mats),
        bevel=0.1,
    )
    add_box(
        f"{building['id']}-parapet",
        (building["x"], building["z"], 0.22 + height - 0.02),
        (building["width"] + 0.18, building["depth"] + 0.18, 0.28),
        mats["charcoal"],
        bevel=0.025,
    )
    add_storefront_band(building, mats, detailed=detailed)
    add_upper_openings(building, mats, detailed=detailed)
    add_feature_mass(building, mats, detailed=detailed)
    if stage in {"materials", "site", "final"}:
        add_material_details(building, mats)


def building_belongs_to_segment(building: dict, segment: str) -> bool:
    # 跨越中心与东段的南侧长建筑归入东段，避免切断其连续木格栅身份。
    if building["id"] == "south-east-entry":
        return segment == "east"
    center = building["x"]
    low, high = SEGMENT_RANGES[segment]
    return low <= center < high or (segment == "east" and math.isclose(center, high))


def add_segment_site(segment: str, mats: dict[str, bpy.types.Material], stage: str) -> None:
    low, high = SEGMENT_RANGES[segment]
    center_x = (low + high) / 2
    add_box(
        f"{segment}-lane-base",
        (center_x, -7.0, 0.18),
        (high - low, 14.0, 0.18),
        mats["stone"],
    )
    if stage not in {"site", "final"}:
        return
    if segment == "center":
        # 只建硬质池壳；水、喷泉和池中树继续由运行时负责。
        add_box("center-pool-base", (16.5, -3.95, 0.32), (18.0, 2.15, 0.34), mats["pool"], bevel=0.035)
        for side in (-1, 1):
            add_box(
                f"center-pool-coping-{side}",
                (16.5, -3.95 + side * 1.0, 0.56),
                (18.25, 0.22, 0.13),
                mats["pool"],
            )
        for index in range(7):
            add_box(
                f"center-bridge-plank-{index}",
                (12.6 + (index - 3) * 0.34, -3.95, 0.65),
                (0.28, 2.9, 0.13),
                mats["wood"],
            )
    if segment == "east":
        # 番禺路入口右侧白色矩阵墙沿街巷长轴布置，不能横向封堵公共通道。
        add_box("east-entry-matrix-wall", (43.3, -12.7, 2.35), (6.8, 0.34, 4.5), mats["cool_white"], bevel=0.04)
        for row in range(3):
            for column in range(2):
                add_box(
                    f"east-entry-matrix-recess-{row}-{column}",
                    (40.95 + row * 1.75, -12.5, 1.45 + column * 1.75),
                    (0.82, 0.08, 0.62),
                    mats["charcoal"],
                )


def build_segment(segment: str, stage: str) -> None:
    layout = json.loads(LAYOUT_PATH.read_text(encoding="utf-8"))
    mats = palette(stage)
    add_segment_site(segment, mats, stage)
    for building in layout["buildings"]:
        if building_belongs_to_segment(building, segment):
            add_building(building, mats, stage)


def scene_bounds() -> tuple[Vector, Vector]:
    minimum = Vector((math.inf, math.inf, math.inf))
    maximum = Vector((-math.inf, -math.inf, -math.inf))
    for obj in ASSET_OBJECTS:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            for axis in range(3):
                minimum[axis] = min(minimum[axis], world[axis])
                maximum[axis] = max(maximum[axis], world[axis])
    return minimum, maximum


def add_preview_environment(extent: float) -> None:
    ground_material = material("测试预览地面", "#d8d5ca", roughness=0.95)
    bpy.ops.mesh.primitive_cube_add(location=(0.0, -7.0, -0.08))
    ground = bpy.context.active_object
    ground.name = "test-preview-ground"
    ground.dimensions = (extent * 1.6, extent * 0.72, 0.14)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ground.data.materials.append(ground_material)
    bpy.ops.object.light_add(type="AREA", location=(-20.0, -32.0, 38.0))
    key = bpy.context.active_object
    key.data.energy = 3600
    key.data.size = 34.0
    bpy.ops.object.light_add(type="AREA", location=(28.0, 12.0, 22.0))
    fill = bpy.context.active_object
    fill.data.energy = 1800
    fill.data.size = 28.0


def configure_render() -> None:
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.69, 0.76, 0.78, 1.0)
    background.inputs["Strength"].default_value = 0.72
    scene.view_settings.look = "AgX - Medium High Contrast"


def render_views(slug: str, *, master: bool = False) -> None:
    minimum, maximum = scene_bounds()
    extent = max(maximum.x - minimum.x, maximum.y - minimum.y, maximum.z - minimum.z)
    add_preview_environment(extent)
    configure_render()
    bpy.ops.object.camera_add()
    camera = bpy.context.active_object
    camera.data.lens = 54
    bpy.context.scene.camera = camera
    if master:
        views = (
            ("canonical", (-54.0, -8.0, 5.4), (12.0, -7.0, 3.5), 58),
            ("side", (0.0, -58.0, 26.0), (5.0, -7.0, 3.2), 58),
            ("street", (-26.0, -7.0, 2.25), (18.0, -6.8, 2.8), 62),
        )
    else:
        center = (minimum + maximum) * 0.5
        views = (
            ("canonical", (center.x - extent * 0.82, center.y - extent * 0.34, center.z + extent * 0.23), (center.x, center.y, center.z * 0.72), 55),
            ("side", (center.x + extent * 0.18, center.y - extent * 0.72, center.z + extent * 0.38), (center.x, center.y, center.z * 0.7), 52),
            ("street", (minimum.x - 1.0, -12.7, 2.25), (maximum.x, -6.8, 2.8), 60),
        )
    for suffix, location, target, lens in views:
        camera.location = location
        camera.data.lens = lens
        camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
        bpy.context.scene.render.filepath = str(PREVIEW_DIR / f"test_{slug}_{suffix}_preview.png")
        bpy.ops.render.render(write_still=True)
    if master:
        # 对照机位贴近实景 canonical：人眼高度、沿 +X 观察，水池占右前景。
        bpy.context.scene.render.resolution_x = 900
        bpy.context.scene.render.resolution_y = 1100
        camera.location = (4.2, -1.45, 1.72)
        camera.data.lens = 46
        comparison_target = (29.0, -4.7, 2.15)
        camera.rotation_euler = (Vector(comparison_target) - camera.location).to_track_quat("-Z", "Y").to_euler()
        bpy.context.scene.render.filepath = str(PREVIEW_DIR / f"test_{slug}_comparison_preview.png")
        bpy.ops.render.render(write_still=True)


def merge_for_export(slug: str, source_object_count: int, stage: str, segment: str) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in ASSET_OBJECTS:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = ASSET_OBJECTS[0]
    bpy.ops.object.join()
    merged = bpy.context.active_object
    merged.name = slug
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    merged["asset"] = "xingfuli"
    merged["segment"] = segment
    merged["stage"] = stage
    merged["source_object_count"] = source_object_count
    merged["reference_manifest"] = "docs/research/xingfuli-reference-manifest.json"
    merged["reference_photos_embedded"] = False
    ASSET_OBJECTS[:] = [merged]


def export_segment(segment: str, stage: str) -> dict[str, int | str]:
    clear_scene()
    build_segment(segment, stage)
    source_object_count = len(ASSET_OBJECTS)
    slug = f"xingfuli-{segment}" if stage == "final" else f"xingfuli-{segment}-{stage}"
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_DIR / f"{slug}.blend"))
    render_views(slug)
    merge_for_export(slug, source_object_count, stage, segment)
    bpy.ops.object.select_all(action="DESELECT")
    ASSET_OBJECTS[0].select_set(True)
    bpy.context.view_layer.objects.active = ASSET_OBJECTS[0]
    output_path = OUTPUT_DIR / f"{slug}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_extras=True,
    )
    return {
        "segment": segment,
        "stage": stage,
        "objects": source_object_count,
        "bytes": output_path.stat().st_size,
    }


def render_master(stage: str) -> None:
    clear_scene()
    for segment in ("west", "center", "east"):
        build_segment(segment, stage)
    render_views(f"xingfuli-{stage}-master", master=True)


def main() -> None:
    args = parse_arguments()
    segments = ("west", "center", "east") if args.segment == "all" else (args.segment,)
    results = [export_segment(segment, args.stage) for segment in segments]
    if args.segment == "all":
        render_master(args.stage)
    print("幸福里资产生成完成：")
    for result in results:
        print(
            f"- {result['segment']} / {result['stage']}: "
            f"{result['objects']} source objects, {result['bytes']} bytes"
        )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"生成失败：{error}", file=sys.stderr)
        raise
