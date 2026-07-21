"""生成上生·新所孙科别墅的可编辑 Blender 源文件与 WebGL GLB。

参考照片只用于结构、比例与材质判断，不读取照片纹理，也不把图片嵌入 GLB。
模型遵循项目约定：1 Blender 单位 = 1 场景单位 = 2.7 米，本地 -Y 为花园正立面。
"""

from __future__ import annotations

import math
import random
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_GLB = ROOT / "public" / "models" / "shangsheng" / "sun-ke-villa.glb"
SOURCE_BLEND = ROOT / "assets" / "models" / "source" / "sun-ke-villa.blend"
CANONICAL_PREVIEW = ROOT / "test_artifacts" / "test_sun_ke_villa_canonical_preview.png"
RIGHT_PREVIEW = ROOT / "test_artifacts" / "test_sun_ke_villa_right_front_preview.png"
NORTH_PREVIEW = ROOT / "test_artifacts" / "test_sun_ke_villa_north_entrance_preview.png"
BATCH_MASSING_PREVIEW = ROOT / "test_artifacts" / "test_sun_ke_villa_batch_01_massing_preview.png"
BATCH_IDENTITY_PREVIEW = ROOT / "test_artifacts" / "test_sun_ke_villa_batch_02_identity_materials_preview.png"
BATCH_SITE_PREVIEW = ROOT / "test_artifacts" / "test_sun_ke_villa_batch_03_site_preview.png"

SEED = 864847877
MODEL_X_SCALE = 1.0225
random.seed(SEED)

ASSET_OBJECTS: list[bpy.types.Object] = []


def hex_rgba(value: str, alpha: float = 1.0) -> tuple[float, float, float, float]:
    value = value.lstrip("#")
    channels = tuple(int(value[index : index + 2], 16) / 255 for index in (0, 2, 4))

    def to_linear(channel: float) -> float:
        if channel <= 0.04045:
            return channel / 12.92
        return ((channel + 0.055) / 1.055) ** 2.4

    return tuple(to_linear(channel) for channel in channels) + (alpha,)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)
    ASSET_OBJECTS.clear()


def make_material(
    name: str,
    color: str,
    roughness: float,
    *,
    alpha: float = 1.0,
    metallic: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = hex_rgba(color, alpha)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = hex_rgba(color, alpha)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Alpha"].default_value = alpha
    if alpha < 1.0:
        material.diffuse_color = hex_rgba(color, alpha)
        if hasattr(material, "surface_render_method"):
            material.surface_render_method = "DITHERED"
        material.use_transparency_overlap = False
    return material


def register(obj: bpy.types.Object, material: bpy.types.Material) -> bpy.types.Object:
    obj.data.materials.append(material)
    ASSET_OBJECTS.append(obj)
    return obj


def apply_bevel(obj: bpy.types.Object, width: float, segments: int = 2) -> None:
    if width <= 0:
        return
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    modifier = obj.modifiers.new(name="Soft architectural edges", type="BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)


def add_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    bevel: float = 0.0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_bevel(obj, bevel)
    return register(obj, material)


def add_cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    material: bpy.types.Material,
    *,
    vertices: int = 16,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        end_fill_type="NGON",
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    for polygon in obj.data.polygons:
        polygon.use_smooth = polygon.normal.z < 0.95
    return register(obj, material)


def add_cone(
    name: str,
    location: tuple[float, float, float],
    radius_bottom: float,
    radius_top: float,
    depth: float,
    material: bpy.types.Material,
    *,
    vertices: int = 16,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_bottom,
        radius2=radius_top,
        depth=depth,
        end_fill_type="NGON",
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    for polygon in obj.data.polygons:
        polygon.use_smooth = polygon.normal.z < 0.95
    return register(obj, material)


def add_torus(
    name: str,
    location: tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    material: bpy.types.Material,
    *,
    major_segments: int = 16,
    minor_segments: int = 5,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=major_segments,
        minor_segments=minor_segments,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    return register(obj, material)


def add_beam_between(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius: float,
    material: bpy.types.Material,
    *,
    vertices: int = 6,
) -> bpy.types.Object:
    start_vector = Vector(start)
    end_vector = Vector(end)
    direction = end_vector - start_vector
    midpoint = (start_vector + end_vector) * 0.5
    obj = add_cylinder(
        name,
        tuple(midpoint),
        radius,
        direction.length,
        material,
        vertices=vertices,
    )
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction.normalized())
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    obj.select_set(False)
    return obj


def add_profile(
    name: str,
    outline: list[tuple[float, float]],
    depth: float,
    location: tuple[float, float, float],
    material: bpy.types.Material,
    *,
    rotation_z: float = 0.0,
) -> bpy.types.Object:
    """把本地 XZ 平面的轮廓沿 Y 挤出，适合制作拱窗和尖券。"""
    half = depth * 0.5
    vertices = [(x, -half, z) for x, z in outline] + [(x, half, z) for x, z in outline]
    count = len(outline)
    faces: list[tuple[int, ...]] = []
    faces.append(tuple(range(count - 1, -1, -1)))
    faces.append(tuple(range(count, count * 2)))
    for index in range(count):
        following = (index + 1) % count
        faces.append((index, following, count + following, count + index))
    mesh = bpy.data.meshes.new(f"{name}_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler.z = rotation_z
    return register(obj, material)


def arch_outline(width: float, height: float, *, pointed: bool, segments: int = 12) -> list[tuple[float, float]]:
    if pointed:
        spring = height * 0.56
        return [
            (-width * 0.5, 0.0),
            (width * 0.5, 0.0),
            (width * 0.5, spring),
            (0.0, height),
            (-width * 0.5, spring),
        ]
    radius = width * 0.5
    spring = height - radius
    outline = [(-width * 0.5, 0.0), (width * 0.5, 0.0), (width * 0.5, spring)]
    for index in range(1, segments + 1):
        angle = math.pi * index / segments
        outline.append((math.cos(angle) * radius, spring + math.sin(angle) * radius))
    return outline


def rotated_offset(x: float, y: float, rotation_z: float) -> tuple[float, float]:
    return (
        x * math.cos(rotation_z) - y * math.sin(rotation_z),
        x * math.sin(rotation_z) + y * math.cos(rotation_z),
    )


def add_arch_window(
    name: str,
    center_x: float,
    plane_y: float,
    bottom_z: float,
    width: float,
    height: float,
    trim: bpy.types.Material,
    glass: bpy.types.Material,
    frame: bpy.types.Material,
    *,
    pointed: bool = False,
    outside_sign: float = -1.0,
    rotation_z: float = 0.0,
) -> None:
    trim_outline = arch_outline(width, height, pointed=pointed)
    glass_width = width * 0.76
    glass_height = height * 0.82
    glass_outline = arch_outline(glass_width, glass_height, pointed=pointed)
    add_profile(
        f"{name}_stone-surround",
        trim_outline,
        0.09,
        (center_x, plane_y, bottom_z),
        trim,
        rotation_z=rotation_z,
    )
    normal_x, normal_y = rotated_offset(0.0, outside_sign * 0.065, rotation_z)
    add_profile(
        f"{name}_glass",
        glass_outline,
        0.025,
        (center_x + normal_x, plane_y + normal_y, bottom_z + height * 0.05),
        glass,
        rotation_z=rotation_z,
    )

    bar_y = outside_sign * 0.085
    vertical_x, vertical_y = rotated_offset(0.0, bar_y, rotation_z)
    add_box(
        f"{name}_mullion",
        (center_x + vertical_x, plane_y + vertical_y, bottom_z + height * 0.46),
        (0.045, 0.035, height * 0.72),
        frame,
        rotation=(0.0, 0.0, rotation_z),
        bevel=0.008,
    )
    horizontal_x, horizontal_y = rotated_offset(0.0, bar_y * 1.01, rotation_z)
    add_box(
        f"{name}_transom",
        (center_x + horizontal_x, plane_y + horizontal_y, bottom_z + height * 0.42),
        (width * 0.68, 0.035, 0.045),
        frame,
        rotation=(0.0, 0.0, rotation_z),
        bevel=0.007,
    )
    sill_x, sill_y = rotated_offset(0.0, outside_sign * 0.09, rotation_z)
    add_box(
        f"{name}_sill",
        (center_x + sill_x, plane_y + sill_y, bottom_z + 0.01),
        (width * 1.12, 0.2, 0.08),
        trim,
        rotation=(0.0, 0.0, rotation_z),
        bevel=0.014,
    )


def add_pointed_portico_recess(
    name: str,
    center_x: float,
    plane_y: float,
    bottom_z: float,
    width: float,
    height: float,
    trim: bpy.types.Material,
    recess: bpy.types.Material,
    door: bpy.types.Material,
    *,
    has_door: bool = False,
) -> None:
    """用深色凹槽与厚券边表现开放门廊，不复用带玻璃和窗棂的拱窗。"""
    outer_outline = arch_outline(width, height, pointed=True)
    inner_width = width * 0.74
    inner_height = height * 0.84
    inner_outline = arch_outline(inner_width, inner_height, pointed=True)
    add_profile(
        f"{name}_stone-surround",
        outer_outline,
        0.12,
        (center_x, plane_y, bottom_z),
        trim,
    )
    # 深色面位于券边外侧，覆盖实体墙面中央，只露出厚石材边；不生成玻璃或窗棂。
    add_profile(
        f"{name}_deep-recess",
        inner_outline,
        0.035,
        (center_x, plane_y - 0.082, bottom_z + height * 0.035),
        recess,
    )
    for side in (-1, 1):
        add_box(
            f"{name}_jamb-return-{side:+d}",
            (center_x + side * inner_width * 0.49, plane_y - 0.015, bottom_z + inner_height * 0.33),
            (0.065, 0.34, inner_height * 0.58),
            trim,
            bevel=0.01,
        )
    add_box(
        f"{name}_threshold",
        (center_x, plane_y - 0.09, bottom_z + 0.025),
        (inner_width * 1.04, 0.30, 0.05),
        trim,
        bevel=0.008,
    )
    if has_door:
        add_box(
            f"{name}_rear-entry-door",
            (center_x, plane_y - 0.108, bottom_z + inner_height * 0.31),
            (inner_width * 0.48, 0.035, inner_height * 0.62),
            door,
            bevel=0.012,
        )


def add_gable_roof(
    name: str,
    center: tuple[float, float],
    length: float,
    span: float,
    eave_z: float,
    ridge_z: float,
    material: bpy.types.Material,
    *,
    ridge_axis: str = "X",
    rib_material: bpy.types.Material | None = None,
    rib_step: float = 0.42,
) -> bpy.types.Object:
    cx, cy = center
    if ridge_axis == "X":
        vertices = [
            (-length / 2, -span / 2, eave_z),
            (length / 2, -span / 2, eave_z),
            (length / 2, span / 2, eave_z),
            (-length / 2, span / 2, eave_z),
            (-length / 2, 0.0, ridge_z),
            (length / 2, 0.0, ridge_z),
        ]
        faces = [(0, 1, 5, 4), (3, 4, 5, 2), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)]
    else:
        vertices = [
            (-span / 2, -length / 2, eave_z),
            (span / 2, -length / 2, eave_z),
            (span / 2, length / 2, eave_z),
            (-span / 2, length / 2, eave_z),
            (0.0, -length / 2, ridge_z),
            (0.0, length / 2, ridge_z),
        ]
        faces = [(0, 4, 5, 3), (1, 2, 5, 4), (0, 1, 4), (3, 5, 2), (0, 3, 2, 1)]
    vertices = [(x + cx, y + cy, z) for x, y, z in vertices]
    mesh = bpy.data.meshes.new(f"{name}_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    register(obj, material)

    if rib_material:
        if ridge_axis == "X":
            count = max(2, round(length / rib_step))
            for index in range(count + 1):
                x = cx - length / 2 + length * index / count
                add_beam_between(
                    f"{name}_front-tile-rib-{index:02d}",
                    (x, cy - span / 2, eave_z + 0.025),
                    (x, cy, ridge_z + 0.025),
                    0.018,
                    rib_material,
                )
                add_beam_between(
                    f"{name}_rear-tile-rib-{index:02d}",
                    (x, cy + span / 2, eave_z + 0.025),
                    (x, cy, ridge_z + 0.025),
                    0.018,
                    rib_material,
                )
            add_beam_between(
                f"{name}_ridge-cap",
                (cx - length / 2, cy, ridge_z + 0.04),
                (cx + length / 2, cy, ridge_z + 0.04),
                0.045,
                rib_material,
                vertices=8,
            )
        else:
            count = max(2, round(length / rib_step))
            for index in range(count + 1):
                y = cy - length / 2 + length * index / count
                add_beam_between(
                    f"{name}_left-tile-rib-{index:02d}",
                    (cx - span / 2, y, eave_z + 0.025),
                    (cx, y, ridge_z + 0.025),
                    0.018,
                    rib_material,
                )
                add_beam_between(
                    f"{name}_right-tile-rib-{index:02d}",
                    (cx + span / 2, y, eave_z + 0.025),
                    (cx, y, ridge_z + 0.025),
                    0.018,
                    rib_material,
                )
            add_beam_between(
                f"{name}_ridge-cap",
                (cx, cy - length / 2, ridge_z + 0.04),
                (cx, cy + length / 2, ridge_z + 0.04),
                0.045,
                rib_material,
                vertices=8,
            )
    return obj


def add_round_arch_band(
    name: str,
    center_x: float,
    plane_y: float,
    spring_z: float,
    radius: float,
    material: bpy.types.Material,
    *,
    segments: int = 9,
) -> None:
    """用分段券石梁形成真正的圆拱轮廓，避免用两根斜梁冒充拱门。"""
    points = []
    for index in range(segments + 1):
        angle = math.pi - math.pi * index / segments
        points.append((center_x + math.cos(angle) * radius, plane_y, spring_z + math.sin(angle) * radius))
    for index in range(segments):
        add_beam_between(
            f"{name}-{index:02d}",
            points[index],
            points[index + 1],
            0.095,
            material,
            vertices=8,
        )


def build_massing(materials: dict[str, bpy.types.Material]) -> None:
    wall = materials["wall"]
    wall_shade = materials["wall_shade"]
    roof = materials["roof"]

    add_box("central-residence", (-0.42, 0.0, 1.84), (4.95, 4.08, 3.68), wall, bevel=0.055)
    add_box("lower-west-wing", (-2.92, -0.08, 1.34), (1.82, 3.72, 2.68), wall_shade, bevel=0.05)
    add_cylinder("rounded-east-tower", (2.18, -0.58, 1.82), 1.23, 3.64, wall, vertices=20)

    add_gable_roof(
        "central-tiled-roof",
        (-0.42, 0.0),
        5.18,
        4.34,
        3.68,
        4.46,
        roof,
        ridge_axis="X",
        rib_material=roof,
    )
    add_gable_roof(
        "west-wing-tiled-roof",
        (-2.92, -0.08),
        2.04,
        3.92,
        2.68,
        3.13,
        roof,
        ridge_axis="X",
        rib_material=roof,
        rib_step=0.38,
    )
    add_cone("tower-low-curved-roof", (2.18, -0.58, 3.79), 1.29, 1.17, 0.22, roof, vertices=20)
    add_torus("tower-eave-tile-band", (2.18, -0.58, 3.66), 1.24, 0.055, roof, major_segments=20)

    # 正面屋顶中央可见的小突出体块。
    add_box("front-dormer", (-0.54, -1.27, 3.91), (1.02, 0.72, 0.92), wall, bevel=0.035)
    add_gable_roof(
        "front-dormer-roof",
        (-0.54, -1.27),
        1.18,
        0.88,
        4.35,
        4.67,
        roof,
        ridge_axis="X",
        rib_material=roof,
        rib_step=0.36,
    )

    # 官方照片可见意大利式烟囱；位置为视觉推定，不声称精确测绘。
    add_box("main-chimney", (1.04, 0.58, 4.30), (0.45, 0.40, 1.32), wall_shade, bevel=0.025)
    add_box("main-chimney-cap", (1.04, 0.58, 4.98), (0.62, 0.56, 0.14), materials["trim"], bevel=0.025)


def build_garden_facade(materials: dict[str, bpy.types.Material]) -> None:
    trim = materials["trim"]
    glass = materials["glass"]
    frame = materials["frame"]

    front_y = -2.075
    # 一层三联尖券门廊：孙科别墅最重要的正立面识别构件。
    for index, x in enumerate((-1.62, -0.42, 0.78)):
        add_pointed_portico_recess(
            f"garden-pointed-portal-{index}",
            x,
            front_y - 0.045,
            0.20,
            0.92,
            1.72,
            trim,
            frame,
            materials["path"],
            has_door=index == 1,
        )

    # 二层连续圆拱落地窗与弧形阳台。
    for index, x in enumerate((-1.78, -0.88, 0.02, 0.92)):
        add_arch_window(
            f"garden-upper-round-window-{index}",
            x,
            front_y - 0.05,
            2.18,
            0.69,
            1.26,
            trim,
            glass,
            frame,
            outside_sign=-1.0,
        )

    add_box("garden-balcony-slab", (-0.43, -2.32, 2.16), (3.55, 0.50, 0.13), trim, bevel=0.035)
    add_box("garden-balcony-top-rail", (-0.43, -2.62, 2.88), (3.50, 0.055, 0.075), frame, bevel=0.018)
    add_box("garden-balcony-bottom-rail", (-0.43, -2.60, 2.28), (3.45, 0.045, 0.055), frame, bevel=0.012)
    for index in range(15):
        x = -2.10 + index * 3.34 / 14
        lean = 0.10 * math.sin(index * 0.9)
        add_box(
            f"garden-balcony-baluster-{index:02d}",
            (x, -2.61, 2.58),
            (0.035, 0.035, 0.61),
            frame,
            rotation=(0.0, lean, 0.0),
            bevel=0.007,
        )

    # 左翼低窗与窗间浅色菱形装饰。
    for index, x in enumerate((-3.36, -2.74)):
        add_arch_window(
            f"west-wing-window-{index}",
            x,
            -1.955,
            0.58,
            0.58,
            1.28,
            trim,
            glass,
            frame,
            outside_sign=-1.0,
        )
    add_box(
        "west-wing-diamond-panel",
        (-3.05, -2.005, 1.30),
        (0.34, 0.055, 0.34),
        trim,
        rotation=(0.0, math.pi / 4, 0.0),
        bevel=0.025,
    )

    # 塔楼三个方向的弧顶窄窗；沿圆角表面旋转，避免平面贴片感。
    tower_center = Vector((2.18, -0.58, 0.0))
    for floor, bottom in enumerate((0.45, 2.08)):
        for index, theta in enumerate((math.radians(220), math.radians(270), math.radians(320))):
            radius = 1.225
            x = tower_center.x + math.cos(theta) * radius
            y = tower_center.y + math.sin(theta) * radius
            add_arch_window(
                f"tower-window-{floor}-{index}",
                x,
                y,
                bottom,
                0.54,
                1.13 if floor == 0 else 1.03,
                trim,
                glass,
                frame,
                pointed=floor == 0,
                outside_sign=1.0,
                rotation_z=theta - math.pi / 2,
            )

    # 中央水平腰线帮助正面各体块在玩家距离保持分层。
    add_box("garden-string-course", (-0.42, -2.11, 2.05), (4.84, 0.15, 0.12), trim, bevel=0.018)

    # 小老虎窗开口。
    add_arch_window(
        "front-dormer-window",
        -0.54,
        -1.65,
        3.78,
        0.52,
        0.63,
        trim,
        glass,
        frame,
        outside_sign=-1.0,
    )


def build_site_details(materials: dict[str, bpy.types.Material]) -> None:
    """增加可步行前庭的台阶与低花篱；草坪不进入模型碰撞。"""
    for index in range(3):
        add_box(
            f"garden-entry-step-{index}",
            (-0.42, -2.28 - index * 0.15, 0.045 + index * 0.055),
            (1.38 + index * 0.22, 0.34, 0.09 + index * 0.02),
            materials["path"],
            bevel=0.018,
        )
    for index, x in enumerate((-2.82, 1.34)):
        add_box(
            f"garden-low-hedge-{index}",
            (x, -2.30, 0.30),
            (1.08, 0.45, 0.45),
            materials["green"],
            bevel=0.16,
        )


def build_north_entrance(materials: dict[str, bpy.types.Material]) -> None:
    wall = materials["wall"]
    trim = materials["trim"]
    glass = materials["glass"]
    frame = materials["frame"]
    roof = materials["roof"]

    rear_y = 2.075
    # 后侧上层连续尖拱窗组，来自北入口参考图。
    for index, x in enumerate((-0.25, 0.48, 1.21)):
        add_arch_window(
            f"north-upper-pointed-window-{index}",
            x,
            rear_y + 0.045,
            2.10,
            0.52,
            1.17,
            trim,
            glass,
            frame,
            pointed=True,
            outside_sign=1.0,
        )

    # 北侧主门与山墙门廊。
    add_arch_window(
        "north-main-door",
        -1.25,
        rear_y + 0.05,
        0.16,
        0.94,
        1.72,
        trim,
        glass,
        frame,
        outside_sign=1.0,
    )
    add_box("north-porch-slab", (-1.22, 2.33, 0.10), (2.25, 0.86, 0.20), materials["path"], bevel=0.025)
    for index, x in enumerate((-2.05, -0.40)):
        add_box(
            f"north-porch-column-{index}",
            (x, 2.48, 1.05),
            (0.34, 0.34, 2.10),
            wall,
            bevel=0.055,
        )
        add_box(
            f"north-porch-column-cap-{index}",
            (x, 2.48, 2.07),
            (0.48, 0.48, 0.14),
            trim,
            bevel=0.025,
        )
    add_box("north-porch-gable-wall", (-1.22, 2.28, 2.35), (2.18, 0.42, 0.64), wall, bevel=0.035)
    add_gable_roof(
        "north-porch-gable-roof",
        (-1.22, 2.24),
        1.02,
        2.44,
        2.62,
        3.15,
        roof,
        ridge_axis="Y",
        rib_material=roof,
        rib_step=0.32,
    )
    add_round_arch_band("north-porch-round-entry-arch", -1.22, 2.68, 1.42, 0.82, trim)

    # 被照片确认的低侧翼与小尖拱窗，增强背面完整性。
    add_box("north-east-low-wing", (2.18, 1.30, 1.15), (1.42, 1.58, 2.30), wall, bevel=0.045)
    add_gable_roof(
        "north-east-low-wing-roof",
        (2.18, 1.30),
        1.60,
        1.78,
        2.30,
        2.72,
        roof,
        ridge_axis="X",
        rib_material=roof,
        rib_step=0.36,
    )
    for index, x in enumerate((1.82, 2.48)):
        add_arch_window(
            f"north-low-pointed-window-{index}",
            x,
            2.105,
            0.48,
            0.43,
            0.94,
            trim,
            glass,
            frame,
            pointed=True,
            outside_sign=1.0,
        )


def build_side_details(materials: dict[str, bpy.types.Material]) -> None:
    frame = materials["frame"]
    # 不补写照片未确认的侧立面窗；只保留正面照片明确可见的深色落水管。
    for index, x in enumerate((-2.10, 1.45)):
        add_cylinder(
            f"garden-downpipe-{index}",
            (x, -2.15, 1.70),
            0.045,
            3.35,
            frame,
            vertices=8,
        )


def add_preview_environment() -> bpy.types.Camera:
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, -0.035))
    ground = bpy.context.object
    ground.name = "test_preview_ground"
    ground_material = make_material("PreviewGround", "#A9A28E", 0.98)
    ground.data.materials.append(ground_material)

    bpy.ops.object.light_add(type="AREA", location=(-5.5, -7.5, 10.5))
    key = bpy.context.object
    key.name = "test_preview_key"
    key.data.energy = 1450
    key.data.shape = "DISK"
    key.data.size = 6.0

    bpy.ops.object.light_add(type="AREA", location=(7.0, 4.0, 7.5))
    fill = bpy.context.object
    fill.name = "test_preview_fill"
    fill.data.energy = 720
    fill.data.size = 5.0

    bpy.ops.object.light_add(type="SUN", location=(0, 0, 10))
    sun = bpy.context.object
    sun.name = "test_preview_sun"
    sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(-32))
    sun.data.energy = 2.0
    sun.data.angle = math.radians(18)

    bpy.ops.object.camera_add(location=(0, -14, 6.2))
    camera = bpy.context.object
    camera.name = "test_preview_camera"
    camera.data.lens = 54
    camera.data.sensor_width = 36
    bpy.context.scene.camera = camera

    scene = bpy.context.scene
    # Blender 5.2 的 Eevee 枚举恢复为 BLENDER_EEVEE；运行前不硬编码旧版 NEXT 名称。
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.color = hex_rgba("#BEC8C8")[:3]
    return camera


def point_camera(camera: bpy.types.Object, location: tuple[float, float, float], target: tuple[float, float, float]) -> None:
    camera.location = location
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def render_preview(
    camera: bpy.types.Object,
    path: Path,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
    lens: float,
) -> None:
    point_camera(camera, location, target)
    camera.data.lens = lens
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def apply_global_x_scale(factor: float) -> None:
    """围绕模型原点沿世界 X 轴校准宽度，保持分层对象可编辑。"""
    for obj in ASSET_OBJECTS:
        world_matrix = obj.matrix_world.copy()
        local_from_world = world_matrix.inverted()
        for vertex in obj.data.vertices:
            world_position = world_matrix @ vertex.co
            world_position.x *= factor
            vertex.co = local_from_world @ world_position


def join_asset_objects() -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in ASSET_OBJECTS:
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    active = ASSET_OBJECTS[0]
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.join()
    active.name = "SunKeVilla_Runtime"
    active.data.name = "SunKeVilla_Runtime_Mesh"
    active["asset_id"] = "sun-ke-villa"
    active["osm_way_id"] = 864847877
    active["meters_per_scene_unit"] = 2.7
    active["canonical_front"] = "local -Y"
    active["reference_manifest"] = "docs/research/sun-ke-villa-reference-manifest.json"
    active["reference_images_embedded"] = False
    ASSET_OBJECTS.clear()
    ASSET_OBJECTS.append(active)
    return active


def export_glb(asset: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    asset.select_set(True)
    bpy.context.view_layer.objects.active = asset
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
    )


def main() -> None:
    reset_scene()
    OUTPUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    SOURCE_BLEND.parent.mkdir(parents=True, exist_ok=True)
    CANONICAL_PREVIEW.parent.mkdir(parents=True, exist_ok=True)

    materials = {
        "wall": make_material("SunKe_StuccoWarm", "#B7A48D", 0.96),
        "wall_shade": make_material("SunKe_StuccoShade", "#9F8E7A", 0.97),
        "trim": make_material("SunKe_WarmStoneTrim", "#D1BE9E", 0.91),
        "roof": make_material("SunKe_TerracottaRoof", "#824B38", 0.94),
        "glass": make_material("SunKe_DeepTealGlass", "#334847", 0.24, alpha=0.82),
        "frame": make_material("SunKe_DarkIronAndWood", "#302D29", 0.68, metallic=0.08),
        "green": make_material("SunKe_GardenGreen", "#536D49", 0.96),
        "path": make_material("SunKe_BrickPath", "#8A6048", 0.94),
    }

    camera = add_preview_environment()

    build_massing(materials)
    render_preview(camera, BATCH_MASSING_PREVIEW, (0.1, -13.8, 3.85), (-0.05, -0.15, 2.08), 55)

    build_garden_facade(materials)
    build_north_entrance(materials)
    build_side_details(materials)
    render_preview(camera, BATCH_IDENTITY_PREVIEW, (0.1, -13.8, 3.85), (-0.05, -0.15, 2.08), 55)

    build_site_details(materials)
    render_preview(camera, BATCH_SITE_PREVIEW, (0.1, -13.8, 3.85), (-0.05, -0.15, 2.08), 55)

    apply_global_x_scale(MODEL_X_SCALE)

    # 在合并前保存可编辑、分层的源文件；运行时导出随后在内存中合并。
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_BLEND))

    asset = join_asset_objects()
    export_glb(asset)

    render_preview(camera, CANONICAL_PREVIEW, (0.1, -13.8, 3.85), (-0.05, -0.15, 2.08), 55)
    render_preview(camera, RIGHT_PREVIEW, (10.2, -11.6, 4.55), (0.0, -0.05, 2.05), 56)
    render_preview(camera, NORTH_PREVIEW, (-7.8, 10.2, 4.65), (-0.85, 0.75, 1.95), 58)

    print(f"GLB: {OUTPUT_GLB}")
    print(f"Blend: {SOURCE_BLEND}")
    print(f"Canonical preview: {CANONICAL_PREVIEW}")
    print(f"Right-front preview: {RIGHT_PREVIEW}")
    print(f"North entrance preview: {NORTH_PREVIEW}")


if __name__ == "__main__":
    main()
