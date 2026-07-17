"""根据公开照片人工归纳的造型特征，生成新华路地标与梧桐树 WebGL 资产。

公开照片只用于判断轮廓、比例、材质与构件，不进入模型、贴图或部署产物。
脚本可在 Blender 后台模式运行，并为每个资产同时保留 GLB、Blend 源文件和测试渲染图。
"""

from __future__ import annotations

import math
import os
import random
import sys
from pathlib import Path
from typing import Callable

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "public/models/xinhua-road"
SOURCE_DIR = ROOT / "assets/models/source/xinhua-road"
PREVIEW_DIR = ROOT / "test_artifacts"
CHINESE_FONT_CANDIDATES = (
    Path("/System/Library/Fonts/STHeiti Medium.ttc"),
    Path("/System/Library/Fonts/PingFang.ttc"),
    Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
    Path("C:/Windows/Fonts/msyh.ttc"),
)
ASSET_OBJECTS: list[bpy.types.Object] = []
MATERIALS: dict[str, bpy.types.Material] = {}


def resolve_chinese_font_path() -> Path:
    """优先使用显式字体路径，并为常见开发平台提供中文字体候选。"""
    configured = os.environ.get("XINHUA_FONT_PATH")
    candidates = (Path(configured).expanduser(),) if configured else CHINESE_FONT_CANDIDATES
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(
        "缺少中文建模字体；请安装 Noto Sans CJK，或通过 XINHUA_FONT_PATH 指定字体文件"
    )


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
        bpy.data.fonts,
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
    roughness: float = 0.78,
    metallic: float = 0.0,
    alpha: float = 1.0,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    key = f"{name}:{color}:{roughness}:{metallic}:{alpha}:{emission_strength}"
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
    if emission_strength:
        emission = shader.inputs.get("Emission Color") or shader.inputs.get("Emission")
        if emission:
            emission.default_value = rgba
        strength = shader.inputs.get("Emission Strength")
        if strength:
            strength.default_value = emission_strength
    if alpha < 1:
        result.surface_render_method = "DITHERED"
        result.use_transparency_overlap = False
    MATERIALS[key] = result
    return result


def register(obj: bpy.types.Object, mat: bpy.types.Material, *, asset: bool = True) -> bpy.types.Object:
    if getattr(obj, "data", None) and hasattr(obj.data, "materials"):
        obj.data.materials.append(mat)
    if asset:
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
    asset: bool = True,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("柔和倒角", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return register(obj, mat, asset=asset)


def add_text_label(
    name: str,
    text: str,
    location: tuple[float, float, float],
    size: float,
    depth: float,
    mat: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (math.pi / 2, 0.0, 0.0),
    bevel: float = 0.025,
    letter_spacing: float = 1.0,
) -> bpy.types.Object:
    """把建筑名称转成可随 GLB 导出的立体网格文字，不依赖网页字体或贴图。"""
    font = bpy.data.fonts.load(str(resolve_chinese_font_path()), check_existing=True)
    bpy.ops.object.text_add(location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.body = text
    obj.data.font = font
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = size
    # 系统中文字体默认曲线采样过密；WebGL 门头在当前尺寸下 1 级采样已能保持清晰字形。
    obj.data.resolution_u = 1
    obj.data.render_resolution_u = 1
    obj.data.extrude = depth
    obj.data.bevel_depth = bevel
    obj.data.bevel_resolution = 1
    obj.data.space_character = letter_spacing
    obj.data.fill_mode = "BOTH"
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    converted = bpy.context.active_object
    converted.name = name
    # Blender 字体在当前竖直朝向下，网页端会从背面看到水平镜像；
    # 以对象原点翻转本地 X，保持字序和位置不变，让正面朝向街道。
    converted.scale.x = -1
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return register(converted, mat)


def add_cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    mat: bpy.types.Material,
    *,
    vertices: int = 16,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    asset: bool = True,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    bevel = obj.modifiers.new("柱体柔边", "BEVEL")
    bevel.width = min(radius * 0.09, 0.035)
    bevel.segments = 2
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return register(obj, mat, asset=asset)


def add_tapered_cylinder(
    name: str,
    location: tuple[float, float, float],
    radius_bottom: float,
    radius_top: float,
    depth: float,
    mat: bpy.types.Material,
    *,
    vertices: int = 12,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_bottom,
        radius2=radius_top,
        depth=depth,
        location=location,
    )
    obj = bpy.context.active_object
    obj.name = name
    return register(obj, mat)


def add_beam(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    thickness: float,
    mat: bpy.types.Material,
    *,
    round_beam: bool = False,
) -> bpy.types.Object:
    start_vec = Vector(start)
    end_vec = Vector(end)
    direction = end_vec - start_vec
    midpoint = (start_vec + end_vec) * 0.5
    if round_beam:
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=thickness / 2, depth=direction.length, location=midpoint)
        obj = bpy.context.active_object
    else:
        bpy.ops.mesh.primitive_cube_add(location=midpoint)
        obj = bpy.context.active_object
        obj.dimensions = (thickness, thickness, direction.length)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    return register(obj, mat)


def add_icosphere(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    *,
    subdivisions: int = 2,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return register(obj, mat)


def add_gable_roof(
    name: str,
    location: tuple[float, float, float],
    width: float,
    depth: float,
    height: float,
    mat: bpy.types.Material,
    *,
    ridge_axis: str = "Y",
) -> bpy.types.Object:
    x = width / 2
    y = depth / 2
    if ridge_axis == "Y":
        vertices = [(-x, -y, 0), (x, -y, 0), (-x, y, 0), (x, y, 0), (0, -y, height), (0, y, height)]
        faces = [(0, 1, 4), (2, 5, 3), (0, 4, 5, 2), (1, 3, 5, 4), (0, 2, 3, 1)]
    else:
        vertices = [(-x, -y, 0), (x, -y, 0), (-x, y, 0), (x, y, 0), (-x, 0, height), (x, 0, height)]
        faces = [(0, 4, 2), (1, 3, 5), (0, 1, 5, 4), (2, 4, 5, 3), (0, 2, 3, 1)]
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata([(vx + location[0], vy + location[1], vz + location[2]) for vx, vy, vz in vertices], [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return register(obj, mat)


def add_hip_roof(
    name: str,
    location: tuple[float, float, float],
    width: float,
    depth: float,
    height: float,
    mat: bpy.types.Material,
    *,
    overhang: float = 0.55,
) -> bpy.types.Object:
    w = width / 2 + overhang
    d = depth / 2 + overhang
    ridge = max(0.25, width * 0.14)
    vertices = [
        (-w, -d, 0), (w, -d, 0), (w, d, 0), (-w, d, 0),
        (-ridge, 0, height), (ridge, 0, height),
    ]
    faces = [(0, 1, 5, 4), (1, 2, 5), (2, 3, 4, 5), (3, 0, 4), (0, 3, 2, 1)]
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata([(x + location[0], y + location[1], z + location[2]) for x, y, z in vertices], [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return register(obj, mat)


def add_window(
    name: str,
    x: float,
    y: float,
    z: float,
    width: float,
    height: float,
    wall_axis: str,
    frame: bpy.types.Material,
    glass: bpy.types.Material,
    *,
    depth: float = 0.12,
) -> None:
    if wall_axis == "Y":
        add_box(f"{name}-frame", (x, y, z), (width + 0.16, depth, height + 0.16), frame, bevel=0.025)
        outward_y = y + math.copysign(depth * 0.55, y or 1)
        mullion_y = y + math.copysign(depth * 0.8, y or 1)
        add_box(f"{name}-glass", (x, outward_y, z), (width, depth * 0.45, height), glass)
        add_box(f"{name}-vertical", (x, mullion_y, z), (0.055, depth * 0.5, height), frame)
        add_box(f"{name}-horizontal", (x, mullion_y, z), (width, depth * 0.5, 0.055), frame)
    else:
        add_box(f"{name}-frame", (x, y, z), (depth, width + 0.16, height + 0.16), frame, bevel=0.025)
        outward_x = x + math.copysign(depth * 0.55, x or 1)
        mullion_x = x + math.copysign(depth * 0.8, x or 1)
        add_box(f"{name}-glass", (outward_x, y, z), (depth * 0.45, width, height), glass)
        add_box(f"{name}-vertical", (mullion_x, y, z), (depth * 0.5, 0.055, height), frame)
        add_box(f"{name}-horizontal", (mullion_x, y, z), (depth * 0.5, width, 0.055), frame)


def add_front_window_grid(
    prefix: str,
    width: float,
    front_y: float,
    floors: int,
    columns: int,
    base_z: float,
    floor_height: float,
    frame: bpy.types.Material,
    glass: bpy.types.Material,
    *,
    margin: float = 1.0,
) -> None:
    usable = width - margin * 2
    for floor in range(floors):
        for column in range(columns):
            x = -usable / 2 + usable * (column + 0.5) / columns
            add_window(
                f"{prefix}-{floor}-{column}",
                x,
                front_y,
                base_z + floor * floor_height,
                usable / columns * 0.55,
                floor_height * 0.48,
                "Y",
                frame,
                glass,
            )


def add_stairs(prefix: str, center: tuple[float, float], width: float, steps: int, rise: float, run: float, mat: bpy.types.Material) -> None:
    for index in range(steps):
        add_box(
            f"{prefix}-{index}",
            (center[0], center[1] - index * run / steps, rise * (index + 1) / (2 * steps)),
            (width, run / steps + 0.04, rise * (index + 1) / steps),
            mat,
            bevel=0.025,
        )


def add_gable_roof_ribs(
    prefix: str,
    center: tuple[float, float],
    width: float,
    depth: float,
    base_z: float,
    height: float,
    mat: bpy.types.Material,
    *,
    count: int = 15,
    ridge_axis: str = "Y",
) -> None:
    """用独立瓦垄和正脊让大块屋面在近景中保持真实尺度。"""
    cx, cy = center
    if ridge_axis == "Y":
        for index in range(count):
            y = cy - depth / 2 + depth * (index + 0.5) / count
            add_beam(f"{prefix}-tile-left-{index}", (cx - width / 2, y, base_z), (cx, y, base_z + height), 0.075, mat, round_beam=True)
            add_beam(f"{prefix}-tile-right-{index}", (cx, y, base_z + height), (cx + width / 2, y, base_z), 0.075, mat, round_beam=True)
        add_beam(f"{prefix}-ridge", (cx, cy - depth / 2 - 0.2, base_z + height + 0.04), (cx, cy + depth / 2 + 0.2, base_z + height + 0.04), 0.19, mat, round_beam=True)
    else:
        for index in range(count):
            x = cx - width / 2 + width * (index + 0.5) / count
            add_beam(f"{prefix}-tile-front-{index}", (x, cy - depth / 2, base_z), (x, cy, base_z + height), 0.075, mat, round_beam=True)
            add_beam(f"{prefix}-tile-back-{index}", (x, cy, base_z + height), (x, cy + depth / 2, base_z), 0.075, mat, round_beam=True)
        add_beam(f"{prefix}-ridge", (cx - width / 2 - 0.2, cy, base_z + height + 0.04), (cx + width / 2 + 0.2, cy, base_z + height + 0.04), 0.19, mat, round_beam=True)


def add_hip_roof_ridges(
    prefix: str,
    center: tuple[float, float],
    width: float,
    depth: float,
    base_z: float,
    height: float,
    mat: bpy.types.Material,
    *,
    rows: int = 9,
) -> None:
    cx, cy = center
    ridge_half = max(0.25, width * 0.14)
    ridge_z = base_z + height
    add_beam(f"{prefix}-main-ridge", (cx - ridge_half, cy, ridge_z), (cx + ridge_half, cy, ridge_z), 0.2, mat, round_beam=True)
    for corner_index, (x, y, ridge_x) in enumerate((
        (cx - width / 2, cy - depth / 2, cx - ridge_half),
        (cx + width / 2, cy - depth / 2, cx + ridge_half),
        (cx - width / 2, cy + depth / 2, cx - ridge_half),
        (cx + width / 2, cy + depth / 2, cx + ridge_half),
    )):
        add_beam(f"{prefix}-corner-ridge-{corner_index}", (x, y, base_z), (ridge_x, cy, ridge_z), 0.15, mat, round_beam=True)
    # 前后坡增加顺坡瓦垄，侧坡则由角脊与檐口形成清晰边界。
    for index in range(rows):
        x = cx - width * 0.38 + width * 0.76 * (index + 0.5) / rows
        ridge_x = max(cx - ridge_half, min(cx + ridge_half, x))
        add_beam(f"{prefix}-front-row-{index}", (x, cy - depth / 2, base_z), (ridge_x, cy, ridge_z), 0.065, mat, round_beam=True)
        add_beam(f"{prefix}-back-row-{index}", (ridge_x, cy, ridge_z), (x, cy + depth / 2, base_z), 0.065, mat, round_beam=True)


def add_gutters_and_downpipes(
    prefix: str,
    center: tuple[float, float],
    width: float,
    depth: float,
    eave_z: float,
    mat: bpy.types.Material,
    *,
    down_to: float = 0.35,
) -> None:
    cx, cy = center
    for side, y in (("front", cy - depth / 2), ("back", cy + depth / 2)):
        add_beam(f"{prefix}-gutter-{side}", (cx - width / 2, y, eave_z), (cx + width / 2, y, eave_z), 0.105, mat, round_beam=True)
    for index, (x, y) in enumerate(((cx - width / 2, cy - depth / 2), (cx + width / 2, cy + depth / 2))):
        add_beam(f"{prefix}-downpipe-{index}", (x, y, eave_z), (x, y, down_to), 0.1, mat, round_beam=True)


def add_railing(
    prefix: str,
    start: tuple[float, float],
    end: tuple[float, float],
    base_z: float,
    height: float,
    mat: bpy.types.Material,
    *,
    posts: int = 10,
) -> None:
    add_beam(f"{prefix}-top", (start[0], start[1], base_z + height), (end[0], end[1], base_z + height), 0.09, mat, round_beam=True)
    add_beam(f"{prefix}-mid", (start[0], start[1], base_z + height * 0.46), (end[0], end[1], base_z + height * 0.46), 0.055, mat, round_beam=True)
    for index in range(posts + 1):
        ratio = index / posts
        x = start[0] + (end[0] - start[0]) * ratio
        y = start[1] + (end[1] - start[1]) * ratio
        add_beam(f"{prefix}-post-{index}", (x, y, base_z), (x, y, base_z + height), 0.055, mat, round_beam=True)


def add_detailed_door(
    prefix: str,
    center: tuple[float, float, float],
    width: float,
    height: float,
    frame: bpy.types.Material,
    panel: bpy.types.Material,
    metal: bpy.types.Material,
) -> None:
    x, y, z = center
    add_box(f"{prefix}-outer-frame", (x, y, z), (width + 0.28, 0.2, height + 0.25), frame, bevel=0.055)
    add_box(f"{prefix}-door", (x, y - 0.13, z), (width, 0.12, height), panel, bevel=0.045)
    add_box(f"{prefix}-center-rail", (x, y - 0.205, z), (0.08, 0.05, height * 0.9), frame, bevel=0.018)
    for column in (-0.25, 0.25):
        for row in (-0.28, 0.28):
            add_box(
                f"{prefix}-panel-{column}-{row}",
                (x + column * width, y - 0.205, z + row * height),
                (width * 0.34, 0.045, height * 0.28),
                frame,
                bevel=0.025,
            )
    add_cylinder(f"{prefix}-handle", (x + width * 0.28, y - 0.26, z), 0.045, 0.16, metal, vertices=14, rotation=(math.pi / 2, 0, 0))


def add_planter(
    prefix: str,
    center: tuple[float, float],
    size: tuple[float, float],
    pot: bpy.types.Material,
    foliage: bpy.types.Material,
    *,
    height: float = 0.75,
) -> None:
    x, y = center
    add_box(f"{prefix}-pot", (x, y, height * 0.32), (size[0], size[1], height * 0.64), pot, bevel=0.12)
    clusters = max(2, round(size[0] / 0.7))
    for index in range(clusters):
        px = x - size[0] * 0.36 + size[0] * 0.72 * (index + 0.5) / clusters
        add_icosphere(f"{prefix}-plant-{index}", (px, y, height * 0.85), (size[0] / clusters * 0.7, size[1] * 0.48, height * 0.5), foliage, subdivisions=1)


def add_garden_tree(
    prefix: str,
    location: tuple[float, float],
    trunk: bpy.types.Material,
    foliage: bpy.types.Material,
    *,
    variant: int = 0,
) -> None:
    """用可见分枝和多个不规则叶团构成庭院树，避免退化成圆球加圆柱。"""
    x, y = location
    trunk_height = (2.9, 3.2, 2.7)[variant % 3]
    add_tapered_cylinder(f"{prefix}-trunk", (x, y, trunk_height / 2), 0.24, 0.14, trunk_height, trunk, vertices=14)
    branch_ends = (
        ((-1.15, -0.15, 4.1), (0.95, 0.2, 4.25), (-0.2, 0.75, 4.55)),
        ((-0.9, 0.25, 4.25), (1.25, -0.1, 4.0), (0.35, 0.85, 4.7)),
        ((-1.05, 0.2, 3.95), (0.8, -0.35, 4.2), (0.15, 0.9, 4.4)),
    )[variant % 3]
    fork = (x, y, trunk_height - 0.25)
    for index, (dx, dy, end_z) in enumerate(branch_ends):
        end = (x + dx, y + dy, end_z)
        add_beam(f"{prefix}-branch-{index}", fork, end, 0.16 - index * 0.018, trunk, round_beam=True)
    crown_specs = (
        (-1.05, 0.0, 4.35, 1.05, 0.86, 0.92),
        (0.95, 0.1, 4.45, 1.12, 0.9, 0.98),
        (-0.15, 0.78, 4.75, 1.0, 0.82, 0.92),
        (0.1, -0.62, 4.3, 1.0, 0.78, 0.86),
        (0.0, 0.05, 5.05, 0.92, 0.78, 0.82),
    )
    for index, (dx, dy, z, sx, sy, sz) in enumerate(crown_specs):
        skew = (variant - 1) * 0.12 * (index % 2)
        add_icosphere(f"{prefix}-crown-{index}", (x + dx + skew, y + dy, z), (sx, sy, sz), foliage, subdivisions=2)


def add_bench(
    prefix: str,
    center: tuple[float, float],
    width: float,
    wood: bpy.types.Material,
    metal: bpy.types.Material,
    *,
    rotation_z: float = 0.0,
) -> None:
    x, y = center
    for offset in (-0.16, 0.16):
        add_box(f"{prefix}-seat-{offset}", (x, y + offset, 0.55), (width, 0.22, 0.12), wood, bevel=0.045, rotation=(0, 0, rotation_z))
    add_box(f"{prefix}-back", (x, y + 0.27, 0.92), (width, 0.12, 0.62), wood, bevel=0.05, rotation=(0, 0, rotation_z))
    for leg in (-width * 0.34, width * 0.34):
        add_box(f"{prefix}-leg-{leg}", (x + leg, y, 0.3), (0.12, 0.55, 0.6), metal, bevel=0.035, rotation=(0, 0, rotation_z))


def add_cafe_set(
    prefix: str,
    center: tuple[float, float],
    table: bpy.types.Material,
    chair: bpy.types.Material,
    *,
    umbrella: bpy.types.Material | None = None,
) -> None:
    x, y = center
    add_cylinder(f"{prefix}-table-top", (x, y, 0.78), 0.62, 0.1, table, vertices=24)
    add_cylinder(f"{prefix}-table-leg", (x, y, 0.4), 0.07, 0.75, table, vertices=12)
    for index, angle in enumerate((0, math.pi / 2, math.pi, math.pi * 1.5)):
        cx = x + math.cos(angle) * 1.0
        cy = y + math.sin(angle) * 1.0
        add_box(f"{prefix}-chair-seat-{index}", (cx, cy, 0.52), (0.52, 0.48, 0.09), chair, bevel=0.05, rotation=(0, 0, angle))
        add_box(f"{prefix}-chair-back-{index}", (cx + math.cos(angle) * 0.2, cy + math.sin(angle) * 0.2, 0.85), (0.48, 0.1, 0.65), chair, bevel=0.05, rotation=(0, 0, angle))
        add_beam(f"{prefix}-chair-leg-a-{index}", (cx - 0.18, cy, 0.48), (cx - 0.18, cy, 0.08), 0.055, chair, round_beam=True)
        add_beam(f"{prefix}-chair-leg-b-{index}", (cx + 0.18, cy, 0.48), (cx + 0.18, cy, 0.08), 0.055, chair, round_beam=True)
    if umbrella:
        add_cylinder(f"{prefix}-umbrella-pole", (x, y, 1.75), 0.055, 3.4, table, vertices=12)
        bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=1.8, radius2=0.18, depth=0.52, location=(x, y, 3.2))
        canopy = bpy.context.active_object
        canopy.name = f"{prefix}-umbrella"
        register(canopy, umbrella)


def add_lamp_post(
    prefix: str,
    location: tuple[float, float],
    metal: bpy.types.Material,
    light: bpy.types.Material,
    *,
    height: float = 2.8,
) -> None:
    x, y = location
    add_cylinder(f"{prefix}-pole", (x, y, height / 2), 0.075, height, metal, vertices=14)
    add_box(f"{prefix}-cap", (x, y, height + 0.05), (0.42, 0.42, 0.16), metal, bevel=0.06)
    add_box(f"{prefix}-light", (x, y, height - 0.18), (0.28, 0.28, 0.42), light, bevel=0.045)


def add_paving_grid(
    prefix: str,
    center: tuple[float, float],
    width: float,
    depth: float,
    z: float,
    mat: bpy.types.Material,
    *,
    columns: int = 8,
    rows: int = 6,
) -> None:
    cx, cy = center
    for column in range(1, columns):
        x = cx - width / 2 + width * column / columns
        add_box(f"{prefix}-vertical-{column}", (x, cy, z), (0.035, depth, 0.018), mat)
    for row in range(1, rows):
        y = cy - depth / 2 + depth * row / rows
        add_box(f"{prefix}-horizontal-{row}", (cx, y, z), (width, 0.035, 0.018), mat)


def add_brick_courses(
    prefix: str,
    front_y: float,
    width: float,
    height: float,
    mat: bpy.types.Material,
    *,
    start_z: float = 0.35,
    spacing: float = 0.42,
) -> None:
    rows = max(1, int((height - start_z) / spacing))
    for row in range(rows):
        z = start_z + row * spacing
        add_box(f"{prefix}-course-{row}", (0, front_y, z), (width, 0.045, 0.04), mat, bevel=0.012)


def add_corner_quoin(
    prefix: str,
    x: float,
    y: float,
    height: float,
    mat: bpy.types.Material,
    *,
    block_height: float = 0.46,
) -> None:
    blocks = int(height / block_height)
    for index in range(blocks):
        width = 0.72 if index % 2 == 0 else 0.52
        add_box(f"{prefix}-{index}", (x, y, block_height * (index + 0.5)), (width, 0.16, block_height * 0.82), mat, bevel=0.025)


def add_elliptical_cylinder(
    name: str,
    location: tuple[float, float, float],
    radii: tuple[float, float],
    depth: float,
    mat: bpy.types.Material,
    *,
    vertices: int = 64,
    bevel: float = 0.0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=1, depth=depth, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (radii[0], radii[1], 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("椭圆柔边", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return register(obj, mat)


def add_elliptical_wall_band(
    name: str,
    center: tuple[float, float],
    radii: tuple[float, float],
    thickness: float,
    base_z: float,
    height: float,
    mat: bpy.types.Material,
    *,
    segments: int = 72,
    wave: float = 0.0,
) -> bpy.types.Object:
    """生成有真实厚度的连续椭圆环带，用于照片中的流动白色外壳。"""
    cx, cy = center
    rx, ry = radii
    inner_rx = max(0.1, rx - thickness)
    inner_ry = max(0.1, ry - thickness)
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    for index in range(segments):
        angle = math.pi * 2 * index / segments
        lower = base_z + wave * (0.55 * math.sin(angle * 2 - 0.45) + 0.2 * math.cos(angle * 3))
        upper = base_z + height + wave * (0.38 * math.cos(angle - 0.35) + 0.18 * math.sin(angle * 2.4))
        cosine = math.cos(angle)
        sine = math.sin(angle)
        vertices.extend((
            (cx + rx * cosine, cy + ry * sine, lower),
            (cx + rx * cosine, cy + ry * sine, upper),
            (cx + inner_rx * cosine, cy + inner_ry * sine, lower),
            (cx + inner_rx * cosine, cy + inner_ry * sine, upper),
        ))
    for index in range(segments):
        current = index * 4
        following = ((index + 1) % segments) * 4
        faces.extend((
            (current, following, following + 1, current + 1),
            (current + 2, current + 3, following + 3, following + 2),
            (current + 1, following + 1, following + 3, current + 3),
            (current, current + 2, following + 2, following),
        ))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bevel = obj.modifiers.new("环带柔边", "BEVEL")
    bevel.width = 0.075
    bevel.segments = 2
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return register(obj, mat)


def build_shanghai_cinema() -> None:
    white = material("影城象牙白", "#e8e5dd")
    white_shadow = material("影城阴影白", "#c8c9c3")
    glass = material("影城玻璃", "#4f7779", roughness=0.28, metallic=0.08, alpha=0.72)
    dark = material("影城深框", "#26393b", roughness=0.45)
    warm = material("影城灯光", "#e9ad67", emission_strength=0.75)
    paving = material("影城广场", "#aaa59a")
    silver = material("影城金属", "#8d9b99", roughness=0.36, metallic=0.55)
    glass_light = material("影城浅玻璃", "#79a0a0", roughness=0.22, metallic=0.05, alpha=0.62)
    planter = material("影城花池", "#777b75")
    foliage = material("影城绿植", "#4d7155")
    wood = material("影城座椅木", "#967257")
    paving_line = material("影城铺装缝", "#777b76")
    joint = material("影城板缝", "#73827f")
    add_box("cinema-plaza", (0, -1.2, 0.12), (38, 26, 0.24), paving, bevel=0.12)
    # 照片中的主体是椭圆玻璃大厅与连续白色环带，不再使用矩形盒体近似。
    add_elliptical_cylinder("cinema-glass-core", (0, 0.1, 3.45), (13.75, 6.9), 6.7, glass, vertices=72, bevel=0.16)
    add_elliptical_wall_band("cinema-flowing-band", (0, 0.1), (15.1, 8.15), 1.42, 3.45, 4.2, white, segments=84, wave=0.52)
    add_elliptical_wall_band("cinema-band-shadow", (0, 0.1), (14.0, 7.05), 0.18, 3.28, 0.32, white_shadow, segments=84, wave=0.18)
    add_elliptical_wall_band("cinema-roof-lip", (0, 0.1), (15.35, 8.4), 1.58, 7.55, 0.42, white_shadow, segments=84, wave=0.16)
    # 玻璃幕墙沿椭圆前半圈布置真实竖梃，横梃则使用薄环带连续收口。
    for index in range(25):
        angle = math.pi + math.pi * index / 24
        x = 13.85 * math.cos(angle)
        y = 0.1 + 7.0 * math.sin(angle)
        add_cylinder(f"cinema-glass-mullion-{index}", (x, y, 2.2), 0.055, 4.25, silver, vertices=12)
    for index, z in enumerate((1.25, 2.55, 3.85)):
        add_elliptical_wall_band(f"cinema-glass-transom-{index}", (0, 0.1), (13.92, 7.07), 0.08, z, 0.075, silver, segments=72)
    # 左侧圆形放映厅与开放格栅取自正面照片的高识别度轮廓。
    add_elliptical_cylinder("cinema-upper-drum", (-8.0, 0.7, 7.4), (4.45, 3.75), 4.5, glass_light, vertices=56, bevel=0.12)
    add_elliptical_wall_band("cinema-upper-drum-base", (-8.0, 0.7), (4.9, 4.2), 0.6, 5.08, 0.42, white, segments=64)
    add_elliptical_wall_band("cinema-upper-drum-roof", (-8.0, 0.7), (5.05, 4.35), 0.72, 9.55, 0.45, white, segments=64)
    for index in range(13):
        angle = math.pi + math.pi * index / 12
        x = -8.0 + 4.5 * math.cos(angle)
        y = 0.7 + 3.8 * math.sin(angle)
        add_cylinder(f"cinema-upper-mullion-{index}", (x, y, 7.38), 0.055, 4.1, silver, vertices=12)
    for index, angle in enumerate([math.radians(195 + value * 9) for value in range(12)]):
        start = (-8.0 + 4.3 * math.cos(angle), 0.7 + 3.6 * math.sin(angle), 9.82)
        end = (-8.0 + 6.2 * math.cos(angle), 0.7 + 5.1 * math.sin(angle), 10.15)
        add_beam(f"cinema-upper-pergola-{index}", start, end, 0.12, white_shadow, round_beam=True)
    # 后方塔楼保留圆角白框、密集窗格与顶部挑檐，避免成为无细节背景盒子。
    add_box("cinema-tower", (6.3, 4.9, 8.65), (9.2, 4.8, 11.9), white_shadow, bevel=0.72)
    add_box("cinema-tower-inset", (6.3, 2.43, 8.75), (7.35, 0.16, 7.65), glass, bevel=0.08)
    for column in range(7):
        x = 3.3 + column
        add_box(f"cinema-tower-vertical-{column}", (x, 2.31, 8.75), (0.11, 0.08, 7.55), white, bevel=0.02)
    for row in range(6):
        z = 5.65 + row * 1.2
        add_box(f"cinema-tower-horizontal-{row}", (6.3, 2.3, z), (7.25, 0.08, 0.11), white, bevel=0.02)
    add_box("cinema-tower-top", (6.3, 2.75, 14.62), (10.0, 5.6, 0.48), white, bevel=0.22)
    # 右侧弧形楼梯沿前场抬升，逐级踏步、内外扶手和立柱均可在步行视角读出。
    outer_points: list[tuple[float, float, float]] = []
    inner_points: list[tuple[float, float, float]] = []
    for index in range(24):
        angle = math.radians(-96 + index * 4.25)
        step_z = 0.24 + index * 0.19
        radius = 6.2
        x = 9.4 + math.cos(angle) * radius
        y = -0.3 + math.sin(angle) * radius
        add_box(f"cinema-spiral-step-{index}", (x, y, step_z), (2.35, 0.68, 0.18), white, bevel=0.065, rotation=(0, 0, angle + math.pi / 2))
        outer_points.append((9.4 + math.cos(angle) * 7.0, -0.3 + math.sin(angle) * 7.0, step_z + 1.0))
        inner_points.append((9.4 + math.cos(angle) * 5.35, -0.3 + math.sin(angle) * 5.35, step_z + 1.0))
    for index in range(len(outer_points) - 1):
        add_beam(f"cinema-stair-outer-rail-{index}", outer_points[index], outer_points[index + 1], 0.085, silver, round_beam=True)
        add_beam(f"cinema-stair-inner-rail-{index}", inner_points[index], inner_points[index + 1], 0.085, silver, round_beam=True)
        add_beam(f"cinema-stair-outer-stringer-{index}", (outer_points[index][0], outer_points[index][1], outer_points[index][2] - 0.9), (outer_points[index + 1][0], outer_points[index + 1][1], outer_points[index + 1][2] - 0.9), 0.16, white_shadow, round_beam=True)
        if index % 2 == 0:
            add_beam(f"cinema-stair-post-{index}", (outer_points[index][0], outer_points[index][1], outer_points[index][2] - 0.9), outer_points[index], 0.055, silver, round_beam=True)
    # 首层入口、雨棚、柱列与抽象字标按照照片的横向节奏布置。
    add_box("cinema-entrance-canopy", (0, -7.65, 3.15), (19.8, 2.1, 0.24), white, bevel=0.14)
    add_box("cinema-canopy-glass", (0, -8.0, 3.02), (18.8, 1.35, 0.08), glass_light, bevel=0.05)
    for index, x in enumerate((-8.6, -4.3, 0, 4.3, 8.6)):
        add_cylinder(f"cinema-canopy-column-{index}", (x, -7.95, 1.55), 0.1, 3.0, silver, vertices=18)
    for index, x in enumerate((-8.0, -4.0, 0, 4.0, 8.0)):
        add_detailed_door(f"cinema-door-{index}", (x, -7.08, 1.35), 1.75, 2.55, silver, dark, silver)
        add_box(f"cinema-door-light-{index}", (x, -7.34, 2.72), (1.45, 0.06, 0.08), warm)
    add_text_label("cinema-name", "上海影城", (0, -8.23, 6.2), 1.3, 0.11, white_shadow, bevel=0.045, letter_spacing=1.08)
    for index, x in enumerate((-12.8, -10.8, 11.2)):
        add_cylinder(f"cinema-flagpole-{index}", (x, -10.0, 3.7), 0.055, 7.2, silver, vertices=16)
        add_box(f"cinema-flag-{index}", (x + 0.65, -10.0, 6.6), (1.3, 0.055, 0.72), warm if index == 0 else white_shadow, bevel=0.04)
    for index, x in enumerate((-13.0, -7.0, 7.0, 13.0)):
        add_planter(f"cinema-planter-{index}", (x, -10.25), (2.8, 1.1), planter, foliage, height=0.7)
    add_bench("cinema-bench-left", (-9.0, -11.2), 3.4, wood, silver)
    add_bench("cinema-bench-right", (9.0, -11.2), 3.4, wood, silver)
    add_paving_grid("cinema-plaza-grid", (0, -2.0), 37.0, 24.0, 0.248, paving_line, columns=14, rows=10)


def build_film_art_center() -> None:
    wall = material("艺术中心白墙", "#e1ded2")
    roof = material("艺术中心屋顶", "#394641")
    trim = material("艺术中心檐口", "#b79c70")
    frame = material("艺术中心窗框", "#3f524d")
    glass = material("艺术中心玻璃", "#58716e", roughness=0.42)
    stone = material("艺术中心石材", "#a9a69c")
    ridge = material("艺术中心屋脊", "#273530")
    wood = material("艺术中心门扇", "#705343")
    metal = material("艺术中心金属", "#88734f", roughness=0.42, metallic=0.4)
    warm = material("艺术中心灯笼", "#d48a4e", emission_strength=0.65)
    foliage = material("艺术中心花木", "#4b6d50")
    stone_light = material("艺术中心浅石", "#c4beb0")
    add_box("art-center-main", (0, 0.8, 4.25), (15.8, 10.2, 8.5), wall, bevel=0.18)
    add_box("art-center-portico", (0, -5.55, 2.55), (6.2, 2.1, 5.1), wall, bevel=0.12)
    for x in (-2.45, -0.82, 0.82, 2.45):
        add_cylinder(f"art-center-column-{x}", (x, -6.48, 2.45), 0.23, 4.65, stone, vertices=18)
        add_box(f"art-center-column-base-{x}", (x, -6.48, 0.22), (0.65, 0.65, 0.2), stone, bevel=0.04)
    add_stairs("art-center-stair", (0, -7.2), 7.2, 5, 0.65, 2.1, stone)
    add_front_window_grid("art-center-window", 15.8, -4.37, 3, 5, 1.35, 2.55, frame, glass, margin=1.2)
    add_hip_roof("art-center-lower-roof", (0, 0.7, 8.5), 17.0, 11.8, 2.2, roof, overhang=0.85)
    add_box("art-center-upper", (0, 0.7, 9.45), (8.2, 6.5, 2.0), wall, bevel=0.12)
    add_hip_roof("art-center-upper-roof", (0, 0.7, 10.45), 9.4, 7.6, 1.65, roof, overhang=0.8)
    # 四角小挑檐强化中式屋顶的起翘感。
    for x in (-8.3, 8.3):
        for y in (-5.65, 6.95):
            add_box(f"art-center-upturn-{x}-{y}", (x, y, 9.05), (1.25, 0.32, 0.22), trim, bevel=0.08, rotation=(0, 0, math.copysign(0.18, x)))
    add_box("art-center-sign", (0, -6.72, 4.35), (5.4, 0.16, 0.62), frame, bevel=0.08)
    add_text_label("art-center-name", "上海电影艺术中心", (0, -6.84, 4.35), 0.43, 0.055, stone_light, bevel=0.018, letter_spacing=0.92)
    add_hip_roof_ridges("art-center-lower-detail", (0, 0.7), 18.7, 13.5, 8.5, 2.2, ridge, rows=13)
    add_hip_roof_ridges("art-center-upper-detail", (0, 0.7), 11.0, 9.2, 10.45, 1.65, ridge, rows=9)
    add_gutters_and_downpipes("art-center-drain", (0, 0.7), 17.9, 12.7, 8.58, metal, down_to=0.45)
    for index, x in enumerate((-6.8, -5.55, -4.3, -3.05, -1.8, 1.8, 3.05, 4.3, 5.55, 6.8)):
        add_box(f"art-center-bracket-{index}", (x, -5.45, 8.35), (0.42, 0.82, 0.38), trim, bevel=0.075, rotation=(0, 0, math.radians(8 if index % 2 else -8)))
    for floor, z in enumerate((1.35, 3.9, 6.45)):
        for column, x in enumerate((-5.8, -2.9, 0, 2.9, 5.8)):
            add_box(f"art-center-sill-{floor}-{column}", (x, -4.48, z - 0.76), (1.45, 0.28, 0.16), stone_light, bevel=0.04)
    # 侧立面继续窗格节奏，避免只有正面一张“贴皮”。
    for side, x in (("left", -7.96), ("right", 7.96)):
        for floor, z in enumerate((1.45, 4.05, 6.55)):
            for row, y in enumerate((-1.5, 1.2, 3.9)):
                add_window(f"art-center-side-{side}-{floor}-{row}", x, y, z, 1.1, 1.35, "X", frame, glass)
    add_detailed_door("art-center-main-door", (0, -6.72, 1.65), 2.7, 3.15, stone_light, wood, metal)
    add_railing("art-center-stair-left", (-3.65, -6.6), (-3.65, -8.2), 0.4, 1.0, metal, posts=6)
    add_railing("art-center-stair-right", (3.65, -6.6), (3.65, -8.2), 0.4, 1.0, metal, posts=6)
    for index, x in enumerate((-3.1, 3.1)):
        add_cylinder(f"art-center-lion-base-{index}", (x, -8.05, 0.28), 0.58, 0.5, stone_light, vertices=20)
        add_icosphere(f"art-center-lion-body-{index}", (x, -8.05, 0.92), (0.55, 0.7, 0.65), stone_light, subdivisions=2)
        add_icosphere(f"art-center-lion-head-{index}", (x, -8.28, 1.5), (0.38, 0.42, 0.42), stone_light, subdivisions=2)
    for index, x in enumerate((-2.9, 2.9)):
        add_box(f"art-center-lantern-{index}", (x, -6.85, 3.45), (0.34, 0.34, 0.5), warm, bevel=0.08)
        add_cylinder(f"art-center-lantern-cap-{index}", (x, -6.85, 3.77), 0.24, 0.1, metal, vertices=16)
    add_planter("art-center-planter-left", (-6.1, -7.15), (2.5, 1.2), stone, foliage, height=0.85)
    add_planter("art-center-planter-right", (6.1, -7.15), (2.5, 1.2), stone, foliage, height=0.85)


def add_half_timber(
    prefix: str,
    front_y: float,
    width: float,
    base_z: float,
    height: float,
    timber: bpy.types.Material,
    *,
    center_x: float = 0.0,
) -> None:
    left = center_x - width / 2
    right = center_x + width / 2
    add_beam(f"{prefix}-beam-left", (left, front_y, base_z), (left, front_y, base_z + height), 0.16, timber)
    add_beam(f"{prefix}-beam-right", (right, front_y, base_z), (right, front_y, base_z + height), 0.16, timber)
    add_beam(f"{prefix}-beam-mid", (center_x, front_y, base_z), (center_x, front_y, base_z + height), 0.14, timber)
    add_beam(f"{prefix}-beam-top", (left, front_y, base_z + height), (right, front_y, base_z + height), 0.16, timber)
    add_beam(f"{prefix}-diag-a", (left, front_y, base_z), (center_x, front_y, base_z + height), 0.13, timber)
    add_beam(f"{prefix}-diag-b", (right, front_y, base_z), (center_x, front_y, base_z + height), 0.13, timber)


def build_one_step_garden() -> None:
    plaster = material("一尺花园粗抹灰", "#d7c5a2")
    roof = material("一尺花园红瓦", "#8f4f3d")
    timber = material("一尺花园木构", "#463b33")
    frame = material("一尺花园窗框", "#283b38")
    glass = material("一尺花园玻璃", "#4f706c", roughness=0.38, alpha=0.78)
    dark = material("一尺花园店招", "#252b29")
    stone = material("一尺花园庭院", "#9f9b8e")
    green = material("一尺花园灌木", "#4f7154")
    metal = material("一尺花园金属", "#59605a", roughness=0.48, metallic=0.35)
    wood = material("一尺花园户外木", "#8b6a50")
    tile_ridge = material("一尺花园瓦垄", "#6f3d32")
    green_light = material("一尺花园浅绿", "#70865b")
    warm = material("一尺花园庭院灯", "#efb66f", emission_strength=0.7)
    paving_line = material("一尺花园铺装缝", "#777a72")
    add_box("garden-courtyard", (0, -1.2, 0.1), (20, 16, 0.2), stone, bevel=0.12)
    add_box("garden-main", (-1.6, 1.0, 3.4), (12.8, 8.8, 6.8), plaster, bevel=0.16)
    add_box("garden-wing", (5.5, -0.8, 2.65), (5.4, 6.5, 5.3), plaster, bevel=0.14)
    add_gable_roof("garden-main-roof", (-1.6, 1.0, 6.8), 14.2, 10.1, 3.1, roof)
    add_gable_roof("garden-wing-roof", (5.5, -0.8, 5.3), 6.5, 7.6, 2.0, roof)
    add_half_timber("garden-timber", -3.48, 7.2, 3.5, 3.0, timber, center_x=-1.6)
    add_front_window_grid("garden-window", 12.8, -3.48, 2, 4, 1.45, 2.55, frame, glass, margin=1.1)
    # 弧形露台由连续短段构成，避免使用一块直板。
    for index in range(11):
        angle = math.radians(205 + index * 13)
        x = 4.8 + math.cos(angle) * 4.1
        y = -3.2 + math.sin(angle) * 1.35
        add_box(f"garden-balcony-{index}", (x, y, 4.05), (0.75, 0.8, 0.18), plaster, bevel=0.06, rotation=(0, 0, angle + math.pi / 2))
        add_cylinder(f"garden-rail-{index}", (x, y - 0.38, 4.62), 0.035, 0.95, timber, vertices=10)
    add_box("garden-sign", (3.6, -5.45, 1.05), (5.0, 0.28, 1.55), dark, bevel=0.12)
    add_text_label("garden-name", "一尺花园", (3.6, -5.62, 1.08), 0.58, 0.07, warm, bevel=0.022, letter_spacing=1.0)
    for x in (-8.0, -6.5, 7.8, 9.0):
        add_icosphere(f"garden-shrub-{x}", (x, -4.4, 0.65), (0.75, 0.65, 0.75), green, subdivisions=1)
    add_gable_roof_ribs("garden-main-roof-detail", (-1.6, 1.0), 14.2, 10.1, 6.8, 3.1, tile_ridge, count=17)
    add_gable_roof_ribs("garden-wing-roof-detail", (5.5, -0.8), 6.5, 7.6, 5.3, 2.0, tile_ridge, count=11)
    add_gutters_and_downpipes("garden-main-drain", (-1.6, 1.0), 14.2, 10.1, 6.88, metal, down_to=0.3)
    add_box("garden-chimney", (-5.2, 2.1, 8.15), (1.05, 1.0, 3.3), plaster, bevel=0.08)
    add_box("garden-chimney-cap", (-5.2, 2.1, 9.85), (1.38, 1.32, 0.22), tile_ridge, bevel=0.06)
    add_detailed_door("garden-main-door", (1.5, -3.62, 1.45), 1.55, 2.7, timber, frame, metal)
    for floor, z in enumerate((1.45, 4.0)):
        for column, x in enumerate((-5.0, -2.5, 0, 2.5, 5.0)):
            add_box(f"garden-sill-{floor}-{column}", (x, -3.6, z - 0.75), (1.15, 0.3, 0.15), plaster, bevel=0.04)
    # 弧形露台上缘再连接连续栏杆，消除“散落立柱”感。
    balcony_points: list[tuple[float, float, float]] = []
    for index in range(11):
        angle = math.radians(205 + index * 13)
        balcony_points.append((4.8 + math.cos(angle) * 4.1, -3.2 + math.sin(angle) * 1.35 - 0.38, 4.98))
    for index in range(len(balcony_points) - 1):
        add_beam(f"garden-balcony-top-rail-{index}", balcony_points[index], balcony_points[index + 1], 0.085, metal, round_beam=True)
    add_cafe_set("garden-cafe-a", (-5.7, -6.0), metal, wood, umbrella=roof)
    add_cafe_set("garden-cafe-b", (-1.6, -6.3), metal, wood)
    add_cafe_set("garden-cafe-c", (7.0, -6.3), metal, wood, umbrella=roof)
    add_planter("garden-planter-left", (-8.7, -2.1), (1.8, 1.0), plaster, green_light, height=0.8)
    add_planter("garden-planter-right", (8.8, -2.0), (1.8, 1.0), plaster, green_light, height=0.8)
    for index, x in enumerate((-8.8, -4.4, 4.4, 8.8)):
        add_lamp_post(f"garden-lamp-{index}", (x, -7.4), metal, warm, height=2.5)
    add_railing("garden-fence-left", (-9.6, -7.7), (-9.6, 4.5), 0.15, 1.2, metal, posts=14)
    add_railing("garden-fence-right", (9.6, -7.7), (9.6, 4.5), 0.15, 1.2, metal, posts=14)
    add_paving_grid("garden-paving-detail", (0, -2.2), 19.0, 14.0, 0.215, paving_line, columns=12, rows=10)


def add_small_villa(
    prefix: str,
    center: tuple[float, float],
    rotation_z: float,
    style: int,
    wall: bpy.types.Material,
    roof: bpy.types.Material,
    brick: bpy.types.Material,
    frame: bpy.types.Material,
    glass: bpy.types.Material,
) -> None:
    x, y = center
    body_mat = wall if style != 1 else brick
    add_box(f"{prefix}-body", (x, y, 2.5), (7.2, 6.0, 5.0), body_mat, bevel=0.14, rotation=(0, 0, rotation_z))
    if style == 2:
        add_cylinder(f"{prefix}-round-tower", (x - 3.25, y - 1.2, 2.8), 1.8, 5.6, wall, vertices=24)
        bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=2.15, radius2=0, depth=2.4, location=(x - 3.25, y - 1.2, 6.8))
        register(bpy.context.active_object, roof)
    else:
        add_gable_roof(f"{prefix}-roof", (x, y, 5.0), 8.2, 7.1, 2.6 if style == 0 else 1.9, roof)
    front_y = y - 3.05
    for floor in range(2):
        for column in range(3):
            wx = x - 2.2 + column * 2.2
            add_window(f"{prefix}-window-{floor}-{column}", wx, front_y, 1.35 + floor * 2.2, 0.9, 1.15, "Y", frame, glass)
            add_box(f"{prefix}-sill-{floor}-{column}", (wx, front_y - 0.08, 0.7 + floor * 2.2), (1.18, 0.3, 0.14), wall, bevel=0.035)
            if style == 1:
                add_box(f"{prefix}-shutter-left-{floor}-{column}", (wx - 0.62, front_y - 0.11, 1.35 + floor * 2.2), (0.28, 0.12, 1.2), frame, bevel=0.035)
                add_box(f"{prefix}-shutter-right-{floor}-{column}", (wx + 0.62, front_y - 0.11, 1.35 + floor * 2.2), (0.28, 0.12, 1.2), frame, bevel=0.035)
    add_detailed_door(f"{prefix}-door", (x, front_y - 0.1, 1.25), 1.15, 2.3, wall, frame, roof)
    add_stairs(f"{prefix}-steps", (x, front_y - 0.55), 1.9, 3, 0.36, 1.0, wall)
    if style == 0:
        add_half_timber(f"{prefix}-timber", front_y - 0.08, 5.8, 2.7, 2.25, frame, center_x=x)
    if style != 2:
        roof_height = 2.6 if style == 0 else 1.9
        add_gable_roof_ribs(f"{prefix}-roof-detail", (x, y), 8.2, 7.1, 5.0, roof_height, roof, count=11)
        add_gutters_and_downpipes(f"{prefix}-drain", (x, y), 8.2, 7.1, 5.08, frame, down_to=0.25)
        chimney_x = x + (2.4 if style == 0 else -2.4)
        add_box(f"{prefix}-chimney", (chimney_x, y + 0.8, 6.6), (0.75, 0.75, 2.8), brick, bevel=0.06)
        add_box(f"{prefix}-chimney-cap", (chimney_x, y + 0.8, 8.05), (1.0, 1.0, 0.18), roof, bevel=0.045)
    else:
        # 圆形“蛋糕房”增加环窗和檐口节奏。
        for index in range(8):
            angle = math.pi * 2 * index / 8
            wx = x - 3.25 + math.cos(angle) * 1.82
            wy = y - 1.2 + math.sin(angle) * 1.82
            add_box(f"{prefix}-tower-window-{index}", (wx, wy, 3.15), (0.6, 0.16, 1.15), frame, bevel=0.05, rotation=(0, 0, angle))
        add_cylinder(f"{prefix}-tower-cornice", (x - 3.25, y - 1.2, 5.55), 1.96, 0.24, wall, vertices=32)
    if style == 1:
        add_box(f"{prefix}-balcony-slab", (x, front_y - 0.55, 3.15), (4.8, 1.25, 0.18), wall, bevel=0.06)
        add_railing(f"{prefix}-balcony-rail", (x - 2.25, front_y - 1.1), (x + 2.25, front_y - 1.1), 3.24, 0.85, frame, posts=9)


def build_xinhua_villas() -> None:
    wall = material("外国弄堂灰泥", "#d7d0bd")
    roof = material("外国弄堂屋顶", "#7f4b3b")
    brick = material("外国弄堂砖墙", "#9b674f")
    frame = material("外国弄堂深窗框", "#3d4841")
    glass = material("外国弄堂玻璃", "#526d68")
    lane = material("外国弄堂路面", "#8f918b")
    gate = material("外国弄堂门楼", "#b9ad98")
    green = material("外国弄堂绿篱", "#47694e")
    metal = material("外国弄堂铁艺", "#353f3b", roughness=0.45, metallic=0.45)
    wood = material("外国弄堂庭院木", "#8b6a51")
    warm = material("外国弄堂路灯", "#e8aa62", emission_strength=0.7)
    foliage_light = material("外国弄堂浅绿", "#6f8758")
    stone_light = material("外国弄堂浅石", "#c2b8a5")
    paving_line = material("外国弄堂铺装缝", "#737871")
    # 马蹄形支路使用三段铺装表达，入口朝街道。
    add_box("villas-lane-entry", (0, -9.4, 0.08), (5.2, 12.5, 0.16), lane, bevel=0.22)
    add_box("villas-lane-back", (0, 7.4, 0.08), (26, 4.8, 0.16), lane, bevel=0.22)
    add_box("villas-lane-left", (-11.0, 1.0, 0.08), (4.0, 13.0, 0.16), lane, bevel=0.22)
    add_box("villas-lane-right", (11.0, 1.0, 0.08), (4.0, 13.0, 0.16), lane, bevel=0.22)
    placements = [(-8.5, -4.0, 0.06, 0), (8.5, -3.5, -0.08, 1), (-7.5, 10.0, 0.08, 2), (7.2, 10.2, -0.05, 0)]
    for index, (x, y, rot, style) in enumerate(placements):
        add_small_villa(f"villa-{index}", (x, y), rot, style, wall, roof, brick, frame, glass)
    add_box("villas-gate-left", (-3.0, -15.1, 1.25), (1.25, 1.25, 2.5), gate, bevel=0.12)
    add_box("villas-gate-right", (3.0, -15.1, 1.25), (1.25, 1.25, 2.5), gate, bevel=0.12)
    add_box("villas-gate-beam", (0, -15.1, 2.85), (7.2, 0.85, 0.65), gate, bevel=0.1)
    add_text_label("villas-name", "新华别墅", (0, -15.56, 2.86), 0.52, 0.075, metal, bevel=0.02, letter_spacing=1.02)
    add_box("villas-guardhouse", (5.7, -12.8, 1.25), (3.0, 3.2, 2.5), wall, bevel=0.12)
    add_hip_roof("villas-guardhouse-roof", (5.7, -12.8, 2.5), 3.6, 3.8, 1.0, roof, overhang=0.25)
    add_window("villas-guardhouse-window", 5.7, -14.43, 1.45, 1.25, 1.1, "Y", frame, glass)
    add_detailed_door("villas-guardhouse-door", (6.55, -11.18, 1.15), 0.85, 2.1, wall, frame, metal)
    for x in (-13.5, -5.0, 5.0, 13.5):
        add_box(f"villas-hedge-{x}", (x, -11.0, 0.7), (3.5, 1.1, 1.4), green, bevel=0.35)
    add_railing("villas-entry-fence-left", (-13.8, -15.0), (-3.65, -15.0), 0.18, 1.35, metal, posts=16)
    add_railing("villas-entry-fence-right", (3.65, -15.0), (13.8, -15.0), 0.18, 1.35, metal, posts=16)
    add_railing("villas-gate-leaf-left", (-2.35, -15.15), (-0.2, -15.15), 0.25, 1.75, metal, posts=6)
    add_railing("villas-gate-leaf-right", (0.2, -15.15), (2.35, -15.15), 0.25, 1.75, metal, posts=6)
    for index, (x, y) in enumerate(((-9.0, -8.0), (9.0, -7.7), (-11.2, 5.0), (11.2, 5.0), (-2.8, 8.0), (2.8, 8.0))):
        add_lamp_post(f"villas-lamp-{index}", (x, y), metal, warm, height=2.7)
    for index, (x, y) in enumerate(((-13.4, -5.0), (13.2, -4.0), (-12.5, 11.5), (12.8, 11.0))):
        add_garden_tree(f"villas-garden-tree-{index}", (x, y), wood, foliage_light, variant=index % 3)
    add_planter("villas-planter-left", (-5.4, -13.1), (2.5, 1.0), stone_light, foliage_light, height=0.7)
    add_planter("villas-planter-right", (1.0, -13.1), (2.5, 1.0), stone_light, foliage_light, height=0.7)
    add_bench("villas-bench", (0, 5.6), 3.0, wood, metal)
    add_paving_grid("villas-entry-grid", (0, -9.4), 5.0, 12.0, 0.172, paving_line, columns=4, rows=12)


def build_house_315() -> None:
    brick = material("315红砖", "#98624e")
    brick_dark = material("315深砖缝", "#71483d")
    plaster = material("315白灰泥", "#d8d4c8")
    roof = material("315红瓦", "#844837")
    tile_ridge = material("315深瓦垄", "#63372f")
    frame = material("315深窗框", "#39443d")
    glass = material("315玻璃", "#536c66")
    stone = material("315基座", "#9d9587")
    stone_light = material("315浅石材", "#c3baa9")
    metal = material("315铁艺", "#303a36", roughness=0.44, metallic=0.48)
    wood = material("315门廊木", "#765440")
    foliage = material("315花园绿植", "#526f4e")
    warm = material("315入口灯", "#eab16a", emission_strength=0.75)
    paving_line = material("315铺装缝", "#77766f")
    add_box("house315-garden", (0, -1.4, 0.1), (18.5, 16.2, 0.2), stone, bevel=0.14)
    add_box("house315-ground", (0, 0, 1.6), (12.5, 8.4, 3.2), brick, bevel=0.12)
    add_box("house315-upper", (-1.0, 0.2, 4.15), (10.5, 8.0, 2.3), plaster, bevel=0.1)
    add_box("house315-front-gable", (-3.2, -4.15, 4.35), (4.8, 1.5, 3.3), plaster, bevel=0.08)
    add_gable_roof("house315-main-roof", (-1.0, 0.2, 5.3), 12.4, 9.5, 3.4, roof)
    add_gable_roof("house315-cross-roof", (-3.2, -1.0, 5.85), 5.8, 8.2, 3.0, roof, ridge_axis="X")
    add_box("house315-chimney", (4.2, 0.8, 7.4), (1.0, 1.0, 3.6), brick, bevel=0.08)
    for floor, z in enumerate((1.45, 4.0)):
        for column, x in enumerate((-4.2, -1.4, 1.4, 4.2)):
            if floor == 0 and column in (1, 3):
                continue
            add_window(f"house315-window-{floor}-{column}", x, -4.27, z, 1.05, 1.35, "Y", frame, glass)
            add_box(f"house315-sill-{floor}-{column}", (x, -4.36, z - 0.76), (1.32, 0.3, 0.15), stone_light, bevel=0.04)
            if column in (0, 2):
                add_box(f"house315-shutter-left-{floor}-{column}", (x - 0.68, -4.39, z), (0.28, 0.12, 1.42), frame, bevel=0.035)
                add_box(f"house315-shutter-right-{floor}-{column}", (x + 0.68, -4.39, z), (0.28, 0.12, 1.42), frame, bevel=0.035)
    add_box("house315-bay", (3.4, -4.65, 2.05), (3.2, 1.2, 3.8), plaster, bevel=0.08)
    for index, x in enumerate((2.55, 3.4, 4.25)):
        add_window(f"house315-bay-window-{index}", x, -5.3, 2.15, 0.62, 1.6, "Y", frame, glass)
    add_hip_roof("house315-bay-roof", (3.4, -4.65, 3.98), 3.8, 1.75, 0.72, roof, overhang=0.2)
    add_gable_roof_ribs("house315-main-roof-detail", (-1.0, 0.2), 12.4, 9.5, 5.3, 3.4, tile_ridge, count=17)
    add_gable_roof_ribs("house315-cross-roof-detail", (-3.2, -1.0), 5.8, 8.2, 5.85, 3.0, tile_ridge, count=11, ridge_axis="X")
    add_gutters_and_downpipes("house315-main-drain", (-1.0, 0.2), 12.4, 9.5, 5.38, metal, down_to=0.28)
    add_box("house315-chimney-cap", (4.2, 0.8, 9.28), (1.35, 1.35, 0.22), tile_ridge, bevel=0.06)
    for index, x in enumerate((3.92, 4.48)):
        add_cylinder(f"house315-chimney-pot-{index}", (x, 0.8, 9.65), 0.16, 0.68, tile_ridge, vertices=14)
    add_half_timber("house315-front-timber", -4.93, 4.25, 3.1, 2.9, frame, center_x=-3.2)
    add_brick_courses("house315-brick-detail", -4.24, 12.3, 3.05, brick_dark, start_z=0.45, spacing=0.38)
    add_detailed_door("house315-main-door", (-1.4, -4.38, 1.42), 1.4, 2.65, stone_light, wood, metal)
    add_stairs("house315-step", (-1.4, -5.15), 2.9, 4, 0.52, 1.5, stone_light)
    add_box("house315-porch-canopy", (-1.4, -4.95, 3.0), (3.5, 1.65, 0.2), wood, bevel=0.08, rotation=(math.radians(-7), 0, 0))
    for index, x in enumerate((-2.78, -0.02)):
        add_cylinder(f"house315-porch-column-{index}", (x, -5.43, 1.48), 0.12, 2.85, stone_light, vertices=16)
        add_box(f"house315-porch-base-{index}", (x, -5.43, 0.18), (0.42, 0.42, 0.35), stone_light, bevel=0.04)
    add_railing("house315-front-fence-left", (-8.7, -8.8), (-2.9, -8.8), 0.18, 1.3, metal, posts=12)
    add_railing("house315-front-fence-right", (0.1, -8.8), (8.7, -8.8), 0.18, 1.3, metal, posts=16)
    add_railing("house315-gate-left", (-2.8, -8.82), (-1.45, -8.82), 0.2, 1.55, metal, posts=5)
    add_railing("house315-gate-right", (-1.35, -8.82), (0.0, -8.82), 0.2, 1.55, metal, posts=5)
    for index, x in enumerate((-3.05, 0.25)):
        add_lamp_post(f"house315-entry-lamp-{index}", (x, -8.72), metal, warm, height=2.35)
    add_planter("house315-planter-left", (-6.5, -6.4), (2.6, 1.1), stone_light, foliage, height=0.78)
    add_planter("house315-planter-right", (6.5, -6.4), (2.6, 1.1), stone_light, foliage, height=0.78)
    add_paving_grid("house315-entry-paving", (-1.4, -6.7), 3.3, 4.0, 0.215, paving_line, columns=4, rows=7)


def build_villa_le_bec() -> None:
    wall = material("LeBec白墙", "#e3ded0")
    roof = material("LeBec红瓦", "#8c4c3b")
    green = material("LeBec绿窗", "#314d43")
    glass = material("LeBec玻璃", "#4d6b65", roughness=0.34)
    awning = material("LeBec雨棚", "#202b28")
    paving = material("LeBec露台", "#a7a196")
    warm = material("LeBec暖光", "#e6a85f", emission_strength=0.8)
    foliage = material("LeBec庭院绿植", "#4f704e")
    foliage_light = material("LeBec浅绿植", "#71845b")
    tile_ridge = material("LeBec深瓦垄", "#6b392f")
    metal = material("LeBec铁艺", "#303936", roughness=0.42, metallic=0.5)
    outdoor_wood = material("LeBec户外木", "#8a6549")
    stone_light = material("LeBec浅石材", "#c6beae")
    umbrella = material("LeBec遮阳伞", "#6f443a")
    paving_line = material("LeBec铺装缝", "#79766e")
    add_box("lebec-patio", (0, -3.2, 0.1), (19, 14, 0.2), paving, bevel=0.12)
    add_box("lebec-main", (0, 1.0, 3.2), (13.8, 8.8, 6.4), wall, bevel=0.16)
    add_gable_roof("lebec-roof", (0, 1.0, 6.4), 15.3, 10.2, 2.8, roof)
    add_box("lebec-bay", (0, -3.85, 4.0), (4.4, 1.6, 3.8), wall, bevel=0.12)
    add_hip_roof("lebec-bay-roof", (0, -3.9, 5.9), 5.0, 2.3, 0.9, roof, overhang=0.25)
    for floor, z in enumerate((1.55, 4.15)):
        for column, x in enumerate((-4.5, 0.0, 4.5)):
            add_window(f"lebec-window-{floor}-{column}", x, -3.48 if x else -4.7, z, 1.25 if x else 2.3, 1.45, "Y", green, glass)
            add_box(f"lebec-sill-{floor}-{column}", (x, (-3.58 if x else -4.82), z - 0.82), (1.55 if x else 2.6, 0.28, 0.15), stone_light, bevel=0.04)
            if x:
                add_box(f"lebec-shutter-left-{floor}-{column}", (x - 0.78, -3.62, z), (0.3, 0.12, 1.48), green, bevel=0.035)
                add_box(f"lebec-shutter-right-{floor}-{column}", (x + 0.78, -3.62, z), (0.3, 0.12, 1.48), green, bevel=0.035)
    for side, x in (("left", -6.96), ("right", 6.96)):
        for floor, z in enumerate((1.55, 4.15)):
            for row, y in enumerate((-1.7, 0.8, 3.3)):
                add_window(f"lebec-side-{side}-{floor}-{row}", x, y, z, 1.15, 1.38, "X", green, glass)
                sill_x = x + (-0.1 if x < 0 else 0.1)
                add_box(f"lebec-side-sill-{side}-{floor}-{row}", (sill_x, y, z - 0.78), (0.28, 1.45, 0.14), stone_light, bevel=0.035)
    add_detailed_door("lebec-door", (-2.0, -3.58, 1.35), 1.45, 2.5, stone_light, green, metal)
    add_box("lebec-awning", (-2.0, -4.1, 2.6), (3.4, 1.3, 0.18), awning, bevel=0.08, rotation=(math.radians(-8), 0, 0))
    add_box("lebec-sign", (3.0, -3.7, 2.75), (3.5, 0.18, 0.55), awning, bevel=0.08)
    add_text_label("lebec-name", "VILLA LE BEC", (3.0, -3.82, 2.76), 0.38, 0.055, warm, bevel=0.016, letter_spacing=0.88)
    add_gable_roof_ribs("lebec-roof-detail", (0, 1.0), 15.3, 10.2, 6.4, 2.8, tile_ridge, count=19)
    add_hip_roof_ridges("lebec-bay-roof-detail", (0, -3.9), 5.4, 2.7, 5.9, 0.9, tile_ridge, rows=7)
    add_gutters_and_downpipes("lebec-main-drain", (0, 1.0), 15.3, 10.2, 6.48, metal, down_to=0.3)
    add_box("lebec-chimney", (-5.1, 2.1, 7.9), (1.0, 1.0, 3.4), wall, bevel=0.07)
    add_box("lebec-chimney-cap", (-5.1, 2.1, 9.7), (1.35, 1.35, 0.22), tile_ridge, bevel=0.06)
    for index, x in enumerate((-5.38, -4.82)):
        add_cylinder(f"lebec-chimney-pot-{index}", (x, 2.1, 10.05), 0.15, 0.62, tile_ridge, vertices=14)
    add_box("lebec-bay-balcony", (0, -4.65, 3.05), (4.9, 1.75, 0.18), stone_light, bevel=0.06)
    add_railing("lebec-bay-balcony-rail", (-2.2, -5.46), (2.2, -5.46), 3.15, 0.85, metal, posts=11)
    # 黑色雨棚以可读的支架和前缘收边重建，而不是只留一块悬空薄板。
    for index, x in enumerate((-3.4, -2.7, -2.0, -1.3, -0.6)):
        add_beam(f"lebec-awning-rib-{index}", (x, -3.5, 2.78), (x, -4.72, 2.53), 0.07, metal, round_beam=True)
    add_beam("lebec-awning-front-edge", (-3.55, -4.72, 2.53), (-0.45, -4.72, 2.53), 0.12, metal, round_beam=True)
    add_stairs("lebec-entry-step", (-2.0, -4.35), 2.4, 3, 0.34, 1.1, stone_light)
    for index, x in enumerate((-5.4, -2.3, 2.0, 5.2)):
        add_cafe_set(f"lebec-cafe-{index}", (x, -7.2), metal, outdoor_wood, umbrella=umbrella if index in (0, 3) else None)
        add_box(f"lebec-light-{x}", (x, -4.35, 2.15), (0.16, 0.16, 0.28), warm, bevel=0.05)
    for x in (-7.8, 7.8):
        add_icosphere(f"lebec-green-{x}", (x, -5.1, 0.85), (1.0, 0.8, 1.0), foliage, subdivisions=1)
    # 露台灯串、花箱和酒桶建立餐厅花园的真实使用尺度。
    for index, x in enumerate((-7.2, 7.2)):
        add_cylinder(f"lebec-string-post-{index}", (x, -6.0, 1.8), 0.07, 3.6, metal, vertices=12)
    add_beam("lebec-string-wire", (-7.2, -6.0, 3.5), (7.2, -6.0, 3.5), 0.035, metal, round_beam=True)
    for index, x in enumerate((-6.0, -4.0, -2.0, 0, 2.0, 4.0, 6.0)):
        add_icosphere(f"lebec-string-bulb-{index}", (x, -6.0, 3.38 - 0.18 * (1 - abs(x) / 6)), (0.09, 0.09, 0.12), warm, subdivisions=1)
    add_planter("lebec-planter-left", (-8.2, -2.5), (1.5, 4.0), stone_light, foliage_light, height=0.8)
    add_planter("lebec-planter-right", (8.2, -2.5), (1.5, 4.0), stone_light, foliage_light, height=0.8)
    for index, x in enumerate((6.1, 7.05)):
        add_cylinder(f"lebec-wine-barrel-{index}", (x, -5.1, 0.62), 0.48, 0.9, outdoor_wood, vertices=20, rotation=(math.pi / 2, 0, 0))
        for ring, y in enumerate((-5.43, -4.77)):
            add_cylinder(f"lebec-barrel-ring-{index}-{ring}", (x, y, 0.62), 0.5, 0.055, metal, vertices=20, rotation=(math.pi / 2, 0, 0))
    add_railing("lebec-fence-left", (-9.1, -9.4), (-9.1, 2.8), 0.16, 1.15, metal, posts=15)
    add_railing("lebec-fence-right", (9.1, -9.4), (9.1, 2.8), 0.16, 1.15, metal, posts=15)
    add_paving_grid("lebec-paving-detail", (0, -4.0), 18.4, 12.8, 0.215, paving_line, columns=14, rows=10)


def add_wave_roof(
    name: str,
    width: float,
    depth: float,
    base_z: float,
    mat: bpy.types.Material,
    *,
    center_y: float = 0.0,
) -> None:
    columns = 20
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    for row, y in enumerate((center_y - depth / 2, center_y + depth / 2)):
        for index in range(columns + 1):
            x = -width / 2 + width * index / columns
            z = base_z + 0.55 * math.sin(index / columns * math.pi * 2.2) + 0.28 * math.sin(index / columns * math.pi * 5)
            vertices.append((x, y, z))
    for index in range(columns):
        faces.append((index, index + 1, columns + 2 + index, columns + 1 + index))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    solidify = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(solidify)
    register(solidify, mat)
    modifier = solidify.modifiers.new("曲面厚度", "SOLIDIFY")
    modifier.thickness = 0.24
    modifier.offset = 0
    bpy.context.view_layer.objects.active = solidify
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def build_orchestra() -> None:
    heritage = material("民族乐团历史墙", "#c8b99f")
    roof = material("民族乐团旧屋顶", "#715044")
    modern = material("民族乐团曲面", "#d7d2c4")
    strings = material("民族乐团弦杆", "#8b775e", metallic=0.15)
    frame = material("民族乐团窗框", "#354743")
    glass = material("民族乐团玻璃", "#466966", roughness=0.3, alpha=0.75)
    stone = material("民族乐团广场", "#99998f")
    stone_light = material("民族乐团浅石", "#c5bdad")
    roof_ridge = material("民族乐团屋脊", "#564039")
    modern_shadow = material("民族乐团曲面阴影", "#aaa99f")
    metal = material("民族乐团金属", "#384440", roughness=0.4, metallic=0.52)
    warm = material("民族乐团线性灯", "#e8ae69", emission_strength=0.8)
    foliage = material("民族乐团绿植", "#526f51")
    wood = material("民族乐团座椅木", "#8b6a50")
    paving_line = material("民族乐团铺装缝", "#74766f")
    add_box("orchestra-plaza", (0, -2.0, 0.1), (27, 20, 0.2), stone, bevel=0.15)
    add_box("orchestra-heritage", (0, 3.2, 3.7), (17.5, 9.2, 7.4), heritage, bevel=0.14)
    add_hip_roof("orchestra-heritage-roof", (0, 3.2, 7.4), 19, 10.6, 2.4, roof, overhang=0.65)
    add_front_window_grid("orchestra-old-window", 17.5, -1.45, 2, 5, 1.55, 2.8, frame, glass, margin=1.2)
    add_box("orchestra-modern-glass", (0, -5.0, 2.4), (22.5, 5.2, 4.8), glass, bevel=0.16)
    add_wave_roof("orchestra-wave-roof", 24.5, 6.7, 5.62, modern, center_y=-5.0)
    add_wave_roof("orchestra-wave-roof-shadow", 23.8, 6.15, 5.95, modern_shadow, center_y=-5.0)
    add_hip_roof_ridges("orchestra-old-roof-detail", (0, 3.2), 20.3, 11.9, 7.4, 2.4, roof_ridge, rows=15)
    add_gutters_and_downpipes("orchestra-old-drain", (0, 3.2), 19.7, 11.3, 7.48, metal, down_to=0.3)
    add_box("orchestra-chimney", (6.2, 4.4, 8.6), (1.0, 1.0, 3.2), heritage, bevel=0.07)
    add_box("orchestra-chimney-cap", (6.2, 4.4, 10.3), (1.32, 1.32, 0.22), roof_ridge, bevel=0.05)
    for side, x in (("left", -8.82), ("right", 8.82)):
        for floor, z in enumerate((1.55, 4.35)):
            for row, y in enumerate((1.0, 3.5, 6.0)):
                add_window(f"orchestra-old-side-{side}-{floor}-{row}", x, y, z, 1.1, 1.45, "X", frame, glass)
    # 双层波浪屋盖下以密集弦杆和幕墙分格形成主要识别点。
    for index in range(33):
        x = -10.7 + index * 21.4 / 32
        top_z = 5.57 + 0.55 * math.sin(index / 32 * math.pi * 2.2) + 0.28 * math.sin(index / 32 * math.pi * 5)
        lean = math.sin(index * 0.9) * 0.28
        add_beam(f"orchestra-string-{index}", (x, -7.72, 0.35), (x + lean, -7.72, top_z), 0.055, strings, round_beam=True)
    add_beam("orchestra-string-band-low", (-10.9, -7.74, 1.38), (10.9, -7.74, 1.38), 0.06, metal, round_beam=True)
    add_beam("orchestra-string-band-high", (-10.9, -7.74, 3.55), (10.9, -7.74, 3.55), 0.06, metal, round_beam=True)
    for index in range(24):
        x = -10.8 + index * 21.6 / 23
        add_box(f"orchestra-glass-mullion-{index}", (x, -7.63, 2.35), (0.065, 0.13, 4.45), frame, bevel=0.015)
    for index, z in enumerate((1.05, 2.35, 3.65)):
        add_box(f"orchestra-glass-transom-{index}", (0, -7.65, z), (22.0, 0.12, 0.065), frame, bevel=0.015)
    add_detailed_door("orchestra-entry", (0, -7.78, 1.5), 3.7, 2.85, stone_light, glass, metal)
    add_box("orchestra-entry-canopy", (0, -8.15, 3.25), (6.8, 1.35, 0.2), modern, bevel=0.08)
    for index, x in enumerate((-2.75, 2.75)):
        add_cylinder(f"orchestra-entry-column-{index}", (x, -8.45, 1.55), 0.11, 3.0, metal, vertices=16)
    add_stairs("orchestra-entry-step", (0, -8.25), 6.2, 4, 0.46, 1.55, stone_light)
    add_box("orchestra-wayfinding", (-8.1, -8.2, 1.25), (2.5, 0.3, 2.35), frame, bevel=0.1)
    for index in range(5):
        add_box(f"orchestra-wayfinding-mark-{index}", (-8.1, -8.38, 1.85 - index * 0.3), (1.7 - index * 0.16, 0.06, 0.08), warm, bevel=0.02)
    add_box("orchestra-nameplate", (-5.2, -7.78, 4.48), (8.2, 0.18, 0.72), frame, bevel=0.08)
    add_text_label("orchestra-name", "上海民族乐团", (-5.2, -7.91, 4.49), 0.5, 0.06, warm, bevel=0.018, letter_spacing=0.95)
    add_bench("orchestra-bench-left", (-7.4, -10.0), 3.4, wood, metal)
    add_bench("orchestra-bench-right", (7.4, -10.0), 3.4, wood, metal)
    add_planter("orchestra-planter-left", (-10.4, -9.4), (2.3, 1.2), stone_light, foliage, height=0.78)
    add_planter("orchestra-planter-right", (10.4, -9.4), (2.3, 1.2), stone_light, foliage, height=0.78)
    for index, x in enumerate((-6.0, -3.0, 3.0, 6.0)):
        add_box(f"orchestra-linear-light-{index}", (x, -9.85, 0.24), (2.2, 0.1, 0.08), warm, bevel=0.025)
    add_paving_grid("orchestra-paving-detail", (0, -3.4), 26.0, 18.2, 0.215, paving_line, columns=16, rows=12)


def build_xinhua_mansion() -> None:
    brick = material("新华公馆红砖", "#9a604b")
    brick_dark = material("新华公馆深砖", "#76493d")
    trim = material("新华公馆白窗套", "#d6d0c1")
    roof = material("新华公馆深屋顶", "#4d4942")
    frame = material("新华公馆窗框", "#34423d")
    glass = material("新华公馆玻璃", "#526a64")
    paving = material("新华公馆庭院", "#979589")
    green = material("新华公馆绿篱", "#4d6c4d")
    green_light = material("新华公馆浅绿", "#71845d")
    brick_line = material("新华公馆砖缝", "#71483e")
    metal = material("新华公馆铁艺", "#313b38", roughness=0.43, metallic=0.5)
    wood = material("新华公馆门廊木", "#795640")
    stone_light = material("新华公馆浅石", "#c5bcaa")
    roof_ridge = material("新华公馆屋脊", "#353633")
    warm = material("新华公馆门灯", "#e8ad67", emission_strength=0.78)
    paving_line = material("新华公馆铺装缝", "#74756e")
    add_box("mansion-courtyard", (0, -1.5, 0.1), (23, 18, 0.2), paving, bevel=0.12)
    add_box("mansion-main", (0, 2.0, 3.6), (15.5, 9.8, 7.2), brick, bevel=0.12)
    add_box("mansion-wing-left", (-7.7, 3.6, 2.7), (5.2, 6.8, 5.4), brick_dark, bevel=0.1)
    add_gable_roof("mansion-main-roof", (0, 2.0, 7.2), 17.2, 11.2, 3.0, roof)
    add_gable_roof("mansion-wing-roof", (-7.7, 3.6, 5.4), 6.3, 8.0, 2.0, roof)
    for floor, z in enumerate((1.65, 4.25)):
        for column, x in enumerate((-5.8, -2.9, 0, 2.9, 5.8)):
            if floor == 0 and column == 2:
                continue
            add_window(f"mansion-window-{floor}-{column}", x, -2.96, z, 1.05, 1.45, "Y", trim, glass)
            add_box(f"mansion-sill-{floor}-{column}", (x, -3.08, z - 0.82), (1.35, 0.34, 0.16), trim, bevel=0.04)
    add_detailed_door("mansion-door", (0, -3.2, 1.5), 1.7, 2.75, trim, wood, metal)
    for x in (-5.4, 0, 5.4):
        add_box(f"mansion-dormer-{x}", (x, -0.3, 7.85), (2.1, 2.0, 1.8), brick, bevel=0.08)
        add_gable_roof(f"mansion-dormer-roof-{x}", (x, -0.3, 8.75), 2.7, 2.5, 1.05, roof)
    add_box("mansion-chimney", (5.2, 3.2, 8.1), (1.1, 1.1, 3.4), brick_dark, bevel=0.06)
    add_box("mansion-wall-left", (-7.0, -7.8, 1.15), (8.5, 0.75, 2.3), brick, bevel=0.08)
    add_box("mansion-wall-right", (7.0, -7.8, 1.15), (8.5, 0.75, 2.3), brick, bevel=0.08)
    add_box("mansion-gate-left", (-2.2, -7.8, 1.7), (1.1, 1.1, 3.4), trim, bevel=0.08)
    add_box("mansion-gate-right", (2.2, -7.8, 1.7), (1.1, 1.1, 3.4), trim, bevel=0.08)
    add_box("mansion-gate-beam", (0, -7.8, 3.25), (5.6, 0.8, 0.62), trim, bevel=0.1)
    add_text_label("mansion-name", "新华公馆", (0, -8.23, 3.27), 0.5, 0.07, frame, bevel=0.02, letter_spacing=1.0)
    for x in (-10.2, -8.8, 8.8, 10.2):
        add_box(f"mansion-hedge-{x}", (x, -5.9, 0.75), (1.2, 3.0, 1.5), green, bevel=0.38)
    add_gable_roof_ribs("mansion-main-roof-detail", (0, 2.0), 17.2, 11.2, 7.2, 3.0, roof_ridge, count=21)
    add_gable_roof_ribs("mansion-wing-roof-detail", (-7.7, 3.6), 6.3, 8.0, 5.4, 2.0, roof_ridge, count=11)
    add_gutters_and_downpipes("mansion-main-drain", (0, 2.0), 17.2, 11.2, 7.28, metal, down_to=0.28)
    add_box("mansion-chimney-cap", (5.2, 3.2, 9.88), (1.45, 1.45, 0.22), roof_ridge, bevel=0.06)
    for index, x in enumerate((4.9, 5.5)):
        add_cylinder(f"mansion-chimney-pot-{index}", (x, 3.2, 10.23), 0.16, 0.62, roof_ridge, vertices=14)
    add_brick_courses("mansion-brick-detail", -2.94, 15.3, 7.0, brick_line, start_z=0.42, spacing=0.4)
    add_corner_quoin("mansion-quoin-left", -7.62, -3.04, 7.0, trim)
    add_corner_quoin("mansion-quoin-right", 7.62, -3.04, 7.0, trim)
    for index, x in enumerate((-5.4, 0, 5.4)):
        add_window(f"mansion-dormer-window-{index}", x, -1.33, 7.9, 1.0, 1.05, "Y", trim, glass)
        add_box(f"mansion-dormer-sill-{index}", (x, -1.43, 7.32), (1.32, 0.28, 0.14), trim, bevel=0.035)
    add_box("mansion-porch-canopy", (0, -3.88, 3.35), (4.5, 1.75, 0.22), stone_light, bevel=0.08)
    add_gable_roof("mansion-porch-roof", (0, -3.9, 3.47), 4.8, 2.05, 1.0, roof, ridge_axis="Y")
    for index, x in enumerate((-1.72, 1.72)):
        add_cylinder(f"mansion-porch-column-{index}", (x, -4.25, 1.62), 0.13, 3.1, trim, vertices=18)
        add_box(f"mansion-porch-base-{index}", (x, -4.25, 0.24), (0.48, 0.48, 0.45), stone_light, bevel=0.05)
    add_stairs("mansion-entry-step", (0, -4.5), 4.4, 4, 0.5, 1.6, stone_light)
    add_railing("mansion-gate-leaf-left", (-1.65, -7.92), (-0.15, -7.92), 0.22, 1.75, metal, posts=6)
    add_railing("mansion-gate-leaf-right", (0.15, -7.92), (1.65, -7.92), 0.22, 1.75, metal, posts=6)
    add_box("mansion-wall-cap-left", (-7.0, -7.8, 2.36), (8.8, 0.95, 0.2), stone_light, bevel=0.06)
    add_box("mansion-wall-cap-right", (7.0, -7.8, 2.36), (8.8, 0.95, 0.2), stone_light, bevel=0.06)
    for index, x in enumerate((-2.2, 2.2)):
        add_lamp_post(f"mansion-gate-lamp-{index}", (x, -7.92), metal, warm, height=3.1)
    add_planter("mansion-planter-left", (-5.1, -5.0), (3.2, 1.15), stone_light, green_light, height=0.82)
    add_planter("mansion-planter-right", (5.1, -5.0), (3.2, 1.15), stone_light, green_light, height=0.82)
    add_bench("mansion-courtyard-bench", (6.6, -1.2), 3.1, wood, metal)
    add_paving_grid("mansion-paving-detail", (0, -2.1), 22.0, 16.5, 0.215, paving_line, columns=14, rows=12)


def build_plane_tree(variant: int) -> None:
    rng = random.Random(9107 + variant * 103)
    bark = material("梧桐树皮", "#8d826e")
    bark_light = material("梧桐树皮浅斑", "#b9ae90")
    bark_dark = material("梧桐树皮深斑", "#6f675b")
    leaves = [
        material("梧桐叶深", "#436b49"),
        material("梧桐叶中", "#5d7d4f"),
        material("梧桐叶浅", "#78905b"),
    ]
    trunk_height = (4.6, 4.2, 4.4)[variant]
    trunk_x = (0.0, 0.15, -0.18)[variant]
    add_tapered_cylinder("tree-trunk", (trunk_x, 0, trunk_height / 2), 0.42, 0.25, trunk_height, bark, vertices=14)
    # 用不规则浅深色片段表现悬铃木斑驳树皮，而不是单一棕色圆柱。
    for index in range(10):
        angle = rng.random() * math.pi * 2
        z = 0.55 + rng.random() * (trunk_height - 0.8)
        radius = 0.40 - z / trunk_height * 0.14
        x = trunk_x + math.cos(angle) * (radius + 0.012)
        y = math.sin(angle) * (radius + 0.012)
        add_box(
            f"tree-bark-patch-{index}",
            (x, y, z),
            (0.14 + rng.random() * 0.12, 0.035, 0.25 + rng.random() * 0.34),
            bark_light if index % 3 else bark_dark,
            bevel=0.035,
            rotation=(0, 0, angle),
        )
    if variant == 0:
        branch_ends = [(-2.2, 0.2, 7.1), (2.25, -0.1, 7.35), (-0.6, 1.7, 7.8), (0.8, -1.65, 7.4)]
    elif variant == 1:
        branch_ends = [(-1.0, 0.1, 7.4), (2.8, -0.2, 7.0), (3.4, 0.7, 7.9), (0.8, -1.8, 7.3)]
    else:
        branch_ends = [(-2.5, 0.0, 7.0), (2.4, 0.1, 7.1), (-1.7, 1.5, 7.8), (1.6, -1.45, 7.7), (0.0, 0.3, 8.3)]
    fork = (trunk_x, 0, trunk_height - 0.2)
    for index, end in enumerate(branch_ends):
        mid = (
            fork[0] + (end[0] - fork[0]) * 0.48,
            fork[1] + (end[1] - fork[1]) * 0.48,
            fork[2] + (end[2] - fork[2]) * 0.52,
        )
        add_beam(f"tree-branch-{index}-a", fork, mid, 0.34, bark, round_beam=True)
        add_beam(f"tree-branch-{index}-b", mid, end, 0.22, bark, round_beam=True)
        twig_a = (end[0] - 0.65 + rng.random() * 0.3, end[1] + 0.55, end[2] + 0.65)
        twig_b = (end[0] + 0.65 - rng.random() * 0.3, end[1] - 0.5, end[2] + 0.5)
        add_beam(f"tree-twig-{index}-a", end, twig_a, 0.105, bark_dark, round_beam=True)
        add_beam(f"tree-twig-{index}-b", end, twig_b, 0.1, bark_dark, round_beam=True)
    crown_centers = list(branch_ends)
    crown_centers.extend([
        (-1.35 + variant * 0.25, 0.95, 8.15),
        (1.25 + variant * 0.35, 0.8, 8.3),
        (0.1 + variant * 0.2, -0.75, 8.6),
    ])
    for index, center in enumerate(crown_centers):
        scale = (
            1.35 + rng.random() * 0.55,
            1.05 + rng.random() * 0.45,
            0.85 + rng.random() * 0.4,
        )
        add_icosphere(f"tree-crown-{index}", center, scale, leaves[index % len(leaves)], subdivisions=2)


BUILDERS: list[tuple[str, Callable[[], None]]] = [
    ("shanghai-cinema", build_shanghai_cinema),
    ("film-art-center", build_film_art_center),
    ("one-step-garden", build_one_step_garden),
    ("xinhua-villas", build_xinhua_villas),
    ("house-315", build_house_315),
    ("villa-le-bec", build_villa_le_bec),
    ("shanghai-orchestra", build_orchestra),
    ("xinhua-mansion", build_xinhua_mansion),
    ("plane-tree-a", lambda: build_plane_tree(0)),
    ("plane-tree-b", lambda: build_plane_tree(1)),
    ("plane-tree-c", lambda: build_plane_tree(2)),
]


def merge_asset_objects(slug: str) -> None:
    """合并同一资产的网格节点，保留材质槽并显著降低网页端 draw call。"""
    meshes = [obj for obj in ASSET_OBJECTS if obj.type == "MESH"]
    if len(meshes) < 2:
        return
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    merged = bpy.context.active_object
    merged.name = slug
    ASSET_OBJECTS[:] = [merged]


def render_preview(slug: str) -> None:
    if not ASSET_OBJECTS:
        return
    min_corner = Vector((math.inf, math.inf, math.inf))
    max_corner = Vector((-math.inf, -math.inf, -math.inf))
    for obj in ASSET_OBJECTS:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            min_corner.x = min(min_corner.x, world.x)
            min_corner.y = min(min_corner.y, world.y)
            min_corner.z = min(min_corner.z, world.z)
            max_corner.x = max(max_corner.x, world.x)
            max_corner.y = max(max_corner.y, world.y)
            max_corner.z = max(max_corner.z, world.z)
    center = (min_corner + max_corner) * 0.5
    extent = max(max_corner.x - min_corner.x, max_corner.y - min_corner.y, max_corner.z - min_corner.z)
    ground = add_box("test-preview-ground", (center.x, center.y, min_corner.z - 0.08), (extent * 1.5, extent * 1.5, 0.16), material("测试地面", "#d8d5ca"), asset=False)
    ground.is_shadow_catcher = False
    bpy.ops.object.camera_add(location=(center.x + extent * 1.05, center.y - extent * 1.35, center.z + extent * 0.82))
    camera = bpy.context.active_object
    camera.data.lens = 52
    camera.rotation_euler = (Vector(center) - camera.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera
    bpy.ops.object.light_add(type="AREA", location=(center.x - extent * 0.4, center.y - extent * 0.8, center.z + extent * 1.4))
    key = bpy.context.active_object
    key.data.energy = 2600
    key.data.shape = "DISK"
    key.data.size = extent * 0.9
    bpy.ops.object.light_add(type="AREA", location=(center.x + extent * 0.9, center.y + extent * 0.4, center.z + extent * 0.6))
    fill = bpy.context.active_object
    fill.data.energy = 1200
    fill.data.size = extent * 0.7
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.72, 0.79, 0.82, 1.0)
    background.inputs["Strength"].default_value = 0.72
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.filepath = str(PREVIEW_DIR / f"test_{slug}_preview.png")
    bpy.ops.render.render(write_still=True)


def export_asset(slug: str, builder: Callable[[], None]) -> dict[str, int | str]:
    clear_scene()
    builder()
    source_object_count = len(ASSET_OBJECTS)
    merge_asset_objects(slug)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    for obj in ASSET_OBJECTS:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = ASSET_OBJECTS[0]
    output_glb = OUTPUT_DIR / f"{slug}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(output_glb),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
    )
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_DIR / f"{slug}.blend"))
    render_preview(slug)
    return {
        "slug": slug,
        "objects": source_object_count,
        "runtimeNodes": len(ASSET_OBJECTS),
        "bytes": output_glb.stat().st_size,
    }


def main() -> None:
    results = [export_asset(slug, builder) for slug, builder in BUILDERS]
    print("新华路资产生成完成：")
    for result in results:
        print(
            f"- {result['slug']}: {result['objects']} source objects, "
            f"{result['runtimeNodes']} runtime node, {result['bytes']} bytes"
        )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # Blender 后台执行时保留完整错误栈。
        print(f"生成失败：{error}", file=sys.stderr)
        raise
