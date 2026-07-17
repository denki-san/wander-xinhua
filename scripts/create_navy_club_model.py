"""根据公开照片制作上生·新所海军俱乐部与泳池的独立 WebGL 资产。

照片只用于人工判断结构、比例和颜色，不会进入模型、贴图或部署产物。
主要参考：澎湃新闻、上海导航、SmartShanghai 的公开页面照片。
"""

from __future__ import annotations

import math
import os
import sys
from collections import defaultdict
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_GLB = ROOT / "public/models/shangsheng/navy-club-pool.glb"
SOURCE_BLEND = ROOT / "assets/models/source/navy-club-pool.blend"
PREVIEW_PNG = ROOT / "test_artifacts/test_navy_club_preview.png"

POOL_MIN_X = -22.9
POOL_MAX_X = -18.4
POOL_MIN_Y = -5.6
POOL_MAX_Y = 5.05
POOL_CENTER_X = (POOL_MIN_X + POOL_MAX_X) / 2
POOL_CENTER_Y = (POOL_MIN_Y + POOL_MAX_Y) / 2

ASSET_OBJECTS: list[bpy.types.Object] = []


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def hex_color(value: str) -> tuple[float, float, float, float]:
    value = value.lstrip("#")
    return tuple(int(value[index:index + 2], 16) / 255 for index in (0, 2, 4)) + (1.0,)


def make_material(
    name: str,
    color: str,
    *,
    roughness: float = 0.82,
    metallic: float = 0.0,
    alpha: float = 1.0,
    emission: str | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    rgba = hex_color(color)
    material.diffuse_color = (*rgba[:3], alpha)
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = rgba
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Alpha"].default_value = alpha
    if emission:
        emission_input = shader.inputs.get("Emission Color") or shader.inputs.get("Emission")
        if emission_input:
            emission_input.default_value = hex_color(emission)
        strength_input = shader.inputs.get("Emission Strength")
        if strength_input:
            strength_input.default_value = emission_strength
    if alpha < 1:
        material.surface_render_method = "DITHERED"
        material.use_transparency_overlap = False
    return material


def register(obj: bpy.types.Object, material: bpy.types.Material, *, asset: bool = True) -> bpy.types.Object:
    obj.data.materials.append(material)
    if asset:
        ASSET_OBJECTS.append(obj)
    return obj


def add_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
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
        modifier = obj.modifiers.new("细腻倒角", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return register(obj, material, asset=asset)


def add_cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    material: bpy.types.Material,
    *,
    vertices: int = 16,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.active_object
    obj.name = name
    bevel = obj.modifiers.new("柱体柔边", "BEVEL")
    bevel.width = min(radius * 0.11, 0.025)
    bevel.segments = 2
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return register(obj, material)


def add_beam_between(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    thickness: float,
    material: bpy.types.Material,
    *,
    round_beam: bool = False,
) -> bpy.types.Object:
    start_vec = Vector(start)
    end_vec = Vector(end)
    vector = end_vec - start_vec
    midpoint = (start_vec + end_vec) * 0.5
    if round_beam:
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=thickness / 2, depth=vector.length, location=midpoint)
        obj = bpy.context.active_object
    else:
        bpy.ops.mesh.primitive_cube_add(location=midpoint)
        obj = bpy.context.active_object
        obj.dimensions = (thickness, thickness, vector.length)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = vector.to_track_quat("Z", "Y")
    return register(obj, material)


def add_arch_ring(
    name: str,
    center: tuple[float, float, float],
    opening_width: float,
    band: float,
    depth: float,
    material: bpy.types.Material,
    *,
    plane: str,
    segments: int = 14,
) -> bpy.types.Object:
    radius_inner = opening_width / 2
    radius_outer = radius_inner + band
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []

    def point(radius: float, angle: float, extrusion: float) -> tuple[float, float, float]:
        u = radius * math.cos(angle)
        height = radius * math.sin(angle)
        if plane == "Y":
            return center[0] + extrusion, center[1] + u, center[2] + height
        return center[0] + u, center[1] + extrusion, center[2] + height

    for side in (-depth / 2, depth / 2):
        for radius in (radius_outer, radius_inner):
            for index in range(segments + 1):
                angle = math.pi * index / segments
                vertices.append(point(radius, angle, side))

    count = segments + 1

    def idx(side: int, ring: int, index: int) -> int:
        return side * count * 2 + ring * count + index

    for index in range(segments):
        faces.append((idx(0, 0, index), idx(0, 0, index + 1), idx(0, 1, index + 1), idx(0, 1, index)))
        faces.append((idx(1, 1, index), idx(1, 1, index + 1), idx(1, 0, index + 1), idx(1, 0, index)))
        faces.append((idx(0, 0, index), idx(1, 0, index), idx(1, 0, index + 1), idx(0, 0, index + 1)))
        faces.append((idx(0, 1, index + 1), idx(1, 1, index + 1), idx(1, 1, index), idx(0, 1, index)))
    for end in (0, segments):
        faces.append((idx(0, 0, end), idx(0, 1, end), idx(1, 1, end), idx(1, 0, end)))

    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return register(obj, material)


def add_rope(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    sag: float,
    material: bpy.types.Material,
) -> None:
    samples = 6
    points: list[tuple[float, float, float]] = []
    for index in range(samples + 1):
        ratio = index / samples
        x = start[0] + (end[0] - start[0]) * ratio
        y = start[1] + (end[1] - start[1]) * ratio
        z = start[2] + (end[2] - start[2]) * ratio - math.sin(math.pi * ratio) * sag
        points.append((x, y, z))
    for index in range(samples):
        add_beam_between(f"{name}-{index}", points[index], points[index + 1], 0.028, material, round_beam=True)


def build_side_arcade(
    prefix: str,
    facade_x: float,
    backing_x: float,
    exterior_x: float,
    plaster: bpy.types.Material,
    stucco: bpy.types.Material,
    glass: bpy.types.Material,
    bronze: bpy.types.Material,
    rail: bpy.types.Material,
    terracotta: bpy.types.Material,
    light: bpy.types.Material,
) -> None:
    length = POOL_MAX_Y - POOL_MIN_Y
    bay_count = 7
    bay = length / bay_count
    opening = bay * 0.68
    outward = -1 if exterior_x < facade_x else 1

    # 拱廊后方的真实建筑体量，内侧保留进深，避免继续使用一堵贴脸平墙。
    mass_center_x = (backing_x + exterior_x) / 2
    add_box(f"{prefix}-mass", (mass_center_x, POOL_CENTER_Y, 2.82), (abs(exterior_x - backing_x), length + 0.55, 5.45), stucco, bevel=0.045)
    add_box(f"{prefix}-terrace", (facade_x + outward * 0.54, POOL_CENTER_Y, 0.095), (1.18, length + 0.42, 0.17), terracotta, bevel=0.025)
    add_box(f"{prefix}-upper-slab", (facade_x + outward * 0.58, POOL_CENTER_Y, 2.67), (1.28, length + 0.32, 0.16), plaster, bevel=0.028)
    add_box(f"{prefix}-cornice", (facade_x + outward * 0.08, POOL_CENTER_Y, 5.28), (0.31, length + 0.5, 0.28), plaster, bevel=0.035)
    add_box(f"{prefix}-parapet", (facade_x + outward * 0.54, POOL_CENTER_Y, 5.62), (1.22, length + 0.48, 0.38), stucco, bevel=0.025)

    for boundary in range(bay_count + 1):
        y = POOL_MIN_Y + boundary * bay
        for level in range(2):
            base_z = 0.18 + level * 2.58
            height = 2.18 if level == 0 else 2.02
            radius = 0.125 if level == 0 else 0.105
            add_cylinder(f"{prefix}-column-{level}-{boundary}", (facade_x, y, base_z + height / 2), radius, height, plaster, vertices=16)
            add_cylinder(f"{prefix}-base-{level}-{boundary}", (facade_x, y, base_z + 0.055), radius * 1.34, 0.11, plaster, vertices=16)
            add_cylinder(f"{prefix}-capital-{level}-{boundary}", (facade_x, y, base_z + height - 0.055), radius * 1.35, 0.11, plaster, vertices=16)

    for index in range(bay_count):
        y = POOL_MIN_Y + bay * (index + 0.5)
        for level in range(2):
            base_z = 0.18 + level * 2.58
            spring_z = base_z + (1.53 if level == 0 else 1.39)
            add_arch_ring(
                f"{prefix}-arch-{level}-{index}",
                (facade_x, y, spring_z),
                opening,
                0.13,
                0.22,
                plaster,
                plane="Y",
            )

        # 深色铜框玻璃门位于拱廊后方，形成照片里真实的纵深和店面节奏。
        door_x = backing_x - outward * 0.035
        add_box(f"{prefix}-door-frame-{index}", (door_x, y, 1.19), (0.09, opening * 0.78, 1.88), bronze, bevel=0.018)
        add_box(f"{prefix}-door-glass-{index}", (door_x - outward * 0.052, y, 1.18), (0.035, opening * 0.66, 1.68), glass)
        add_box(f"{prefix}-door-mullion-{index}", (door_x - outward * 0.075, y, 1.17), (0.028, 0.035, 1.64), bronze)
        add_box(f"{prefix}-transom-{index}", (door_x - outward * 0.075, y, 1.68), (0.028, opening * 0.68, 0.045), bronze)
        add_box(f"{prefix}-warm-light-{index}", (facade_x + outward * 0.5, y, 2.16), (0.08, opening * 0.62, 0.045), light, bevel=0.012)

        upper_x = backing_x - outward * 0.04
        add_box(f"{prefix}-upper-frame-{index}", (upper_x, y, 3.89), (0.085, opening * 0.76, 1.3), bronze, bevel=0.012)
        add_box(f"{prefix}-upper-glass-{index}", (upper_x - outward * 0.05, y, 3.89), (0.03, opening * 0.64, 1.12), glass)

        # 上层白色斜向栏杆是照片中识别度很高的细节。
        rail_x = facade_x - outward * 0.14
        y_min = y - opening * 0.47
        y_max = y + opening * 0.47
        add_beam_between(f"{prefix}-rail-top-{index}", (rail_x, y_min, 3.14), (rail_x, y_max, 3.14), 0.045, rail)
        add_beam_between(f"{prefix}-rail-bottom-{index}", (rail_x, y_min, 2.82), (rail_x, y_max, 2.82), 0.04, rail)
        for slat in range(5):
            ratio = (slat + 0.5) / 5
            slat_y = y_min + (y_max - y_min) * ratio
            add_beam_between(
                f"{prefix}-rail-slat-{index}-{slat}",
                (rail_x, slat_y - 0.1, 2.82),
                (rail_x, slat_y + 0.1, 3.14),
                0.035,
                rail,
            )


def build_end_arcade(
    plaster: bpy.types.Material,
    stucco: bpy.types.Material,
    glass: bpy.types.Material,
    bronze: bpy.types.Material,
    rail: bpy.types.Material,
    roof: bpy.types.Material,
    light: bpy.types.Material,
) -> None:
    facade_y = 5.33
    backing_y = 6.05
    width = 5.8
    bay_count = 3
    bay = width / bay_count
    opening = bay * 0.68
    add_box("end-mass", (POOL_CENTER_X, 6.75, 2.78), (width + 0.35, 2.6, 5.35), stucco, bevel=0.055)
    add_box("end-upper-slab", (POOL_CENTER_X, 5.72, 2.67), (width + 0.2, 0.95, 0.16), plaster, bevel=0.025)
    add_box("end-cornice", (POOL_CENTER_X, 5.23, 5.24), (width + 0.35, 0.3, 0.25), plaster, bevel=0.03)

    left = POOL_CENTER_X - width / 2
    for boundary in range(bay_count + 1):
        x = left + boundary * bay
        for level in range(2):
            base_z = 0.18 + level * 2.58
            height = 2.16 if level == 0 else 2.0
            add_cylinder(f"end-column-{level}-{boundary}", (x, facade_y, base_z + height / 2), 0.12, height, plaster, vertices=16)
    for index in range(bay_count):
        x = left + bay * (index + 0.5)
        for level in range(2):
            base_z = 0.18 + level * 2.58
            spring_z = base_z + (1.52 if level == 0 else 1.38)
            add_arch_ring(f"end-arch-{level}-{index}", (x, facade_y, spring_z), opening, 0.13, 0.22, plaster, plane="X")
        add_box(f"end-door-frame-{index}", (x, backing_y, 1.2), (opening * 0.78, 0.08, 1.9), bronze, bevel=0.018)
        add_box(f"end-door-glass-{index}", (x, backing_y - 0.05, 1.2), (opening * 0.66, 0.03, 1.7), glass)
        add_box(f"end-light-{index}", (x, 5.78, 2.15), (opening * 0.62, 0.07, 0.045), light, bevel=0.012)
        for slat in range(4):
            ratio = (slat + 0.5) / 4
            slat_x = x - opening * 0.46 + opening * 0.92 * ratio
            add_beam_between(
                f"end-rail-{index}-{slat}",
                (slat_x - 0.12, 5.15, 2.83),
                (slat_x + 0.12, 5.15, 3.15),
                0.035,
                rail,
            )
        # 照片端部可见三组红瓦坡顶，以独立小屋面强调节奏。
        for direction in (-1, 1):
            add_box(
                f"end-roof-{index}-{direction}",
                (x, 6.0 + direction * 0.31, 5.58),
                (bay * 0.9, 0.74, 0.09),
                roof,
                rotation=(math.radians(22) * direction, 0, 0),
                bevel=0.018,
            )


def build_pool(
    plaster: bpy.types.Material,
    water: bpy.types.Material,
    pool_bottom: bpy.types.Material,
    tile_blue: bpy.types.Material,
    tile_gold: bpy.types.Material,
    tile_dark: bpy.types.Material,
    terracotta: bpy.types.Material,
    bronze: bpy.types.Material,
    rope: bpy.types.Material,
) -> None:
    width = POOL_MAX_X - POOL_MIN_X
    length = POOL_MAX_Y - POOL_MIN_Y
    add_box("pool-foundation", (POOL_CENTER_X, POOL_CENTER_Y, 0.03), (width + 0.72, length + 0.72, 0.24), plaster, bevel=0.035)
    add_box("pool-bottom", (POOL_CENTER_X, POOL_CENTER_Y, 0.13), (width - 0.34, length - 0.34, 0.12), pool_bottom)
    add_box("pool-water", (POOL_CENTER_X, POOL_CENTER_Y, 0.245), (width - 0.42, length - 0.42, 0.035), water)

    # 多层池沿和马赛克纹样，取代原来的一块蓝色长方体。
    for side_x in (POOL_MIN_X - 0.18, POOL_MAX_X + 0.18):
        add_box(f"pool-coping-x-{side_x}", (side_x, POOL_CENTER_Y, 0.22), (0.34, length + 0.42, 0.16), plaster, bevel=0.025)
        add_box(f"pool-blue-band-x-{side_x}", (side_x + (0.13 if side_x < POOL_CENTER_X else -0.13), POOL_CENTER_Y, 0.17), (0.035, length - 0.04, 0.12), tile_blue)
        add_box(f"pool-gold-band-x-{side_x}", (side_x + (0.145 if side_x < POOL_CENTER_X else -0.145), POOL_CENTER_Y, 0.285), (0.025, length - 0.04, 0.045), tile_gold)
    for side_y in (POOL_MIN_Y - 0.18, POOL_MAX_Y + 0.18):
        add_box(f"pool-coping-y-{side_y}", (POOL_CENTER_X, side_y, 0.22), (width + 0.42, 0.34, 0.16), plaster, bevel=0.025)
        add_box(f"pool-blue-band-y-{side_y}", (POOL_CENTER_X, side_y + (0.13 if side_y < POOL_CENTER_Y else -0.13), 0.17), (width - 0.04, 0.035, 0.12), tile_blue)

    # 泳道线与端部横线在照片中非常醒目。
    for offset in (-1.34, 0.0, 1.34):
        add_box(f"pool-lane-{offset}", (POOL_CENTER_X + offset, POOL_CENTER_Y, 0.205), (0.055, length - 0.68, 0.018), tile_dark)
    for y in (POOL_MIN_Y + 1.1, POOL_MAX_Y - 1.1):
        add_box(f"pool-cross-line-{y}", (POOL_CENTER_X, y, 0.207), (width - 0.68, 0.055, 0.018), tile_dark)

    # 复原池边分段编号牌的几何节奏，不复制照片中的具体文字。
    for side_x, sign in ((POOL_MIN_X - 0.365, -1), (POOL_MAX_X + 0.365, 1)):
        for index, y in enumerate((POOL_MIN_Y + 2.1, POOL_CENTER_Y, POOL_MAX_Y - 2.1)):
            add_box(f"pool-number-panel-{sign}-{index}", (side_x, y, 0.34), (0.035, 0.56, 0.38), tile_gold, bevel=0.018)
            add_box(f"pool-number-inset-{sign}-{index}", (side_x - sign * 0.022, y, 0.34), (0.018, 0.38, 0.23), tile_dark, bevel=0.012)

    # 黄铜立柱和两层绳索让池沿近景不再空洞。
    post_y = [POOL_MIN_Y + 0.7 + index * (length - 1.4) / 5 for index in range(6)]
    for side_x, sign in ((POOL_MIN_X - 0.48, -1), (POOL_MAX_X + 0.48, 1)):
        for index, y in enumerate(post_y):
            add_cylinder(f"pool-post-{sign}-{index}", (side_x, y, 0.62), 0.055, 0.88, bronze, vertices=12)
            add_cylinder(f"pool-post-cap-{sign}-{index}", (side_x, y, 1.08), 0.09, 0.07, bronze, vertices=12)
        for index in range(len(post_y) - 1):
            for height, sag in ((0.92, 0.13), (0.64, 0.1)):
                add_rope(
                    f"pool-rope-{sign}-{index}-{height}",
                    (side_x, post_y[index], height),
                    (side_x, post_y[index + 1], height),
                    sag,
                    rope,
                )

    # 两端砖红色铺地，与照片中咖啡廊的地面保持同一色调。
    add_box("front-terracotta-deck", (POOL_CENTER_X, POOL_MIN_Y - 0.75, 0.1), (width + 1.2, 1.05, 0.15), terracotta, bevel=0.025)
    add_box("end-terracotta-deck", (POOL_CENTER_X, POOL_MAX_Y + 0.62, 0.1), (width + 1.2, 0.75, 0.15), terracotta, bevel=0.025)


def join_by_material() -> None:
    # 先按材质归并，再合成一个带多材质槽的运行时网格，减少节点与遍历成本。
    groups: dict[str, list[bpy.types.Object]] = defaultdict(list)
    for obj in list(ASSET_OBJECTS):
        if obj.type == "MESH" and obj.data.materials:
            groups[obj.data.materials[0].name].append(obj)

    ASSET_OBJECTS.clear()
    for material_name, objects in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        joined = bpy.context.active_object
        joined.name = f"NavyClub-{material_name}"
        ASSET_OBJECTS.append(joined)

    bpy.ops.object.select_all(action="DESELECT")
    for obj in ASSET_OBJECTS:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = ASSET_OBJECTS[0]
    bpy.ops.object.join()
    joined_asset = bpy.context.active_object
    joined_asset.name = "NavyClubPool"
    ASSET_OBJECTS.clear()
    ASSET_OBJECTS.append(joined_asset)


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_preview() -> None:
    world = bpy.context.scene.world
    world.color = (0.08, 0.12, 0.11)
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.48, 0.67, 0.64, 1)
    background.inputs["Strength"].default_value = 0.72

    preview_ground_material = make_material("PreviewGround", "#8f9984", roughness=1.0)
    add_box("preview-ground", (POOL_CENTER_X, POOL_CENTER_Y, -0.15), (20, 24, 0.2), preview_ground_material, asset=False)

    bpy.ops.object.light_add(type="AREA", location=(POOL_CENTER_X - 4, POOL_CENTER_Y - 4, 11))
    key = bpy.context.active_object
    key.name = "PreviewKey"
    key.data.energy = 1150
    key.data.shape = "DISK"
    key.data.size = 8
    look_at(key, (POOL_CENTER_X, POOL_CENTER_Y, 2.2))

    bpy.ops.object.light_add(type="AREA", location=(POOL_CENTER_X + 6, POOL_CENTER_Y + 3, 6))
    fill = bpy.context.active_object
    fill.name = "PreviewFill"
    fill.data.energy = 700
    fill.data.color = (1.0, 0.72, 0.48)
    fill.data.size = 6
    look_at(fill, (POOL_CENTER_X, POOL_CENTER_Y, 2.0))

    # 从泳池轴线正面取景，既能看到双层拱廊，也不会被两侧建筑体量遮住。
    bpy.ops.object.camera_add(location=(POOL_CENTER_X, POOL_MIN_Y - 13.1, 5.85))
    camera = bpy.context.active_object
    camera.name = "PreviewCamera"
    camera.data.lens = 46
    camera.data.sensor_width = 36
    look_at(camera, (POOL_CENTER_X, POOL_CENTER_Y + 0.9, 2.2))
    bpy.context.scene.camera = camera

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW_PNG)
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"


def main() -> None:
    clear_scene()

    plaster = make_material("PlasterWhite", "#e9e4d9", roughness=0.92)
    stucco = make_material("WarmGreyStucco", "#88877e", roughness=0.96)
    glass = make_material("DeepTealGlass", "#315657", roughness=0.28, metallic=0.06, alpha=0.86)
    bronze = make_material("AgedBronze", "#806044", roughness=0.48, metallic=0.48)
    rail = make_material("PaintedMetal", "#d6d3c8", roughness=0.72, metallic=0.08)
    terracotta = make_material("Terracotta", "#a85f42", roughness=0.94)
    roof = make_material("TerracottaRoof", "#8f4d39", roughness=0.9)
    light = make_material("WarmArcadeLight", "#f1c67a", roughness=0.42, emission="#f6c66d", emission_strength=3.5)
    water = make_material("PoolWater", "#58bfc4", roughness=0.16, metallic=0.08, alpha=0.76)
    pool_bottom = make_material("PoolBottom", "#b7ddd5", roughness=0.86)
    tile_blue = make_material("MosaicBlue", "#1f5860", roughness=0.78)
    tile_gold = make_material("MosaicGold", "#a5753e", roughness=0.82)
    tile_dark = make_material("MosaicDark", "#173c40", roughness=0.84)
    rope = make_material("Rope", "#a88e67", roughness=1.0)

    build_side_arcade(
        "west",
        facade_x=-23.15,
        backing_x=-23.86,
        exterior_x=-27.95,
        plaster=plaster,
        stucco=stucco,
        glass=glass,
        bronze=bronze,
        rail=rail,
        terracotta=terracotta,
        light=light,
    )
    build_side_arcade(
        "east",
        facade_x=-18.18,
        backing_x=-17.47,
        exterior_x=-14.48,
        plaster=plaster,
        stucco=stucco,
        glass=glass,
        bronze=bronze,
        rail=rail,
        terracotta=terracotta,
        light=light,
    )
    build_end_arcade(plaster, stucco, glass, bronze, rail, roof, light)
    build_pool(plaster, water, pool_bottom, tile_blue, tile_gold, tile_dark, terracotta, bronze, rope)
    join_by_material()

    OUTPUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    SOURCE_BLEND.parent.mkdir(parents=True, exist_ok=True)
    PREVIEW_PNG.parent.mkdir(parents=True, exist_ok=True)
    setup_preview()

    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_BLEND))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in ASSET_OBJECTS:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = ASSET_OBJECTS[0]
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )

    bpy.context.scene.render.filepath = str(PREVIEW_PNG)
    bpy.ops.render.render(write_still=True)
    print(f"GLB: {OUTPUT_GLB}")
    print(f"Blend: {SOURCE_BLEND}")
    print(f"Preview: {PREVIEW_PNG}")


if __name__ == "__main__":
    # Blender 会把 `--` 后的参数留给脚本；当前生成器不需要额外参数。
    sys.argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    main()
