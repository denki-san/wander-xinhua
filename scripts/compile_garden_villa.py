"""从最小 Building DSL 确定性编译 garden-villa Massing 或 Low-poly Master。"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys
from typing import Any

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
ASSET_OBJECTS: list[bpy.types.Object] = []


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="编译 garden-villa Building DSL")
    parser.add_argument("--dsl", required=True, type=Path)
    parser.add_argument("--stage", required=True, choices=("massing", "master"))
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    return parser.parse_args(argv)


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


def srgb_channel_to_linear(channel: float) -> float:
    if channel <= 0.04045:
        return channel / 12.92
    return ((channel + 0.055) / 1.055) ** 2.4


def hex_rgba(value: str, alpha: float = 1.0) -> tuple[float, float, float, float]:
    value = value.lstrip("#")
    if len(value) != 6:
        raise ValueError(f"颜色必须是六位十六进制：{value}")
    channels = [
        srgb_channel_to_linear(int(value[index : index + 2], 16) / 255)
        for index in (0, 2, 4)
    ]
    return channels[0], channels[1], channels[2], alpha


def make_material(
    name: str,
    contract: dict[str, Any],
) -> bpy.types.Material:
    alpha = float(contract.get("alpha", 1.0))
    color = hex_rgba(contract["color"], alpha)
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.roughness = float(contract["roughness"])
    material.metallic = float(contract.get("metallic", 0.0))
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    if shader is None:
        raise RuntimeError(f"{name} 缺少 Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = material.roughness
    shader.inputs["Metallic"].default_value = material.metallic
    shader.inputs["Alpha"].default_value = alpha
    if alpha < 1.0 and hasattr(material, "surface_render_method"):
        material.surface_render_method = "DITHERED"
    return material


def register(
    obj: bpy.types.Object,
    material: bpy.types.Material | None = None,
) -> bpy.types.Object:
    if material is not None:
        obj.data.materials.append(material)
    ASSET_OBJECTS.append(obj)
    return obj


def add_box(
    name: str,
    center: tuple[float, float, float],
    size: tuple[float, float, float],
    material: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    if any(value <= 0 for value in size):
        raise ValueError(f"{name} 不能使用非正尺寸：{size}")
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=center, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return register(obj, material)


def add_cylinder(
    name: str,
    center: tuple[float, float, float],
    radius: float,
    height: float,
    material: bpy.types.Material,
    *,
    segments: int,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=segments,
        radius=radius,
        depth=height,
        end_fill_type="NGON",
        location=center,
    )
    obj = bpy.context.object
    obj.name = name
    return register(obj, material)


def add_torus(
    name: str,
    center: tuple[float, float, float],
    radius: float,
    thickness: float,
    material: bpy.types.Material,
    *,
    segments: int,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius,
        minor_radius=thickness,
        major_segments=segments,
        minor_segments=4,
        location=center,
    )
    obj = bpy.context.object
    obj.name = name
    return register(obj, material)


def add_profile(
    name: str,
    outline: list[tuple[float, float]],
    depth: float,
    center: tuple[float, float, float],
    material: bpy.types.Material,
    *,
    rotation_z: float = 0.0,
) -> bpy.types.Object:
    """把本地 XZ 轮廓沿 Y 挤出。"""

    half = depth * 0.5
    vertices = [(x, -half, z) for x, z in outline]
    vertices += [(x, half, z) for x, z in outline]
    count = len(outline)
    faces: list[tuple[int, ...]] = [
        tuple(range(count - 1, -1, -1)),
        tuple(range(count, count * 2)),
    ]
    for index in range(count):
        following = (index + 1) % count
        faces.append((index, following, count + following, count + index))
    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = center
    obj.rotation_euler.z = rotation_z
    return register(obj, material)


def add_beam_between(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    thickness: float,
    material: bpy.types.Material,
) -> bpy.types.Object:
    start_vector = Vector(start)
    end_vector = Vector(end)
    direction = end_vector - start_vector
    if direction.length <= 0:
        raise ValueError(f"{name} 的梁端点重合")
    midpoint = (start_vector + end_vector) * 0.5
    obj = add_box(
        name,
        tuple(midpoint),
        (thickness, thickness, direction.length),
        material,
    )
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(
        direction.normalized(),
    )
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    obj.select_set(False)
    return obj


def arch_outline(
    width: float,
    height: float,
    *,
    pointed: bool,
    segments: int = 10,
) -> list[tuple[float, float]]:
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
    spring = max(0.0, height - radius)
    outline = [
        (-width * 0.5, 0.0),
        (width * 0.5, 0.0),
        (width * 0.5, spring),
    ]
    for index in range(1, segments + 1):
        angle = math.pi * index / segments
        outline.append(
            (
                math.cos(angle) * radius,
                spring + math.sin(angle) * radius,
            )
        )
    return outline


def rotate_xy(x: float, y: float, angle: float) -> tuple[float, float]:
    return (
        x * math.cos(angle) - y * math.sin(angle),
        x * math.sin(angle) + y * math.cos(angle),
    )


def material_for(
    role: str,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Material:
    if role not in materials:
        raise ValueError(f"DSL 引用了未声明的材质角色：{role}")
    return materials[role]


def build_volume(
    volume: dict[str, Any],
    materials: dict[str, bpy.types.Material],
) -> None:
    center_x, center_y = (float(value) for value in volume["center"])
    base_height = float(volume.get("baseHeight", 0.0))
    height = float(volume["height"])
    primary = material_for(volume["material"], materials)
    lower_height = volume.get("lowerHeight")
    lower_role = volume.get("lowerMaterial")

    def add_part(
        suffix: str,
        part_base: float,
        part_height: float,
        surface: bpy.types.Material,
    ) -> None:
        z = part_base + part_height * 0.5
        if volume["type"] == "box":
            width, depth = (float(value) for value in volume["size"])
            add_box(
                f"{volume['id']}-{suffix}",
                (center_x, center_y, z),
                (width, depth, part_height),
                surface,
            )
        elif volume["type"] == "cylinder":
            add_cylinder(
                f"{volume['id']}-{suffix}",
                (center_x, center_y, z),
                float(volume["radius"]),
                part_height,
                surface,
                segments=int(volume.get("segments", 16)),
            )
        else:
            raise ValueError(f"不支持的 volume type：{volume['type']}")

    if lower_height is not None or lower_role is not None:
        if lower_height is None or lower_role is None:
            raise ValueError(f"{volume['id']} 的 lowerHeight/lowerMaterial 必须成对出现")
        lower_height_value = float(lower_height)
        if lower_height_value >= height:
            raise ValueError(f"{volume['id']} 的 lowerHeight 必须小于总高度")
        add_part(
            "lower",
            base_height,
            lower_height_value,
            material_for(lower_role, materials),
        )
        add_part(
            "upper",
            base_height + lower_height_value,
            height - lower_height_value,
            primary,
        )
    else:
        add_part("body", base_height, height, primary)


def add_gable_roof(
    roof: dict[str, Any],
    materials: dict[str, bpy.types.Material],
) -> None:
    center_x, center_y = (float(value) for value in roof["center"])
    length = float(roof["length"])
    span = float(roof["span"])
    eave = float(roof["eaveHeight"])
    ridge = float(roof["ridgeHeight"])
    axis = roof.get("ridgeAxis", "X")
    if ridge <= eave:
        raise ValueError(f"{roof['id']} 的 ridgeHeight 必须高于 eaveHeight")
    if axis == "X":
        vertices = [
            (-length / 2, -span / 2, eave),
            (length / 2, -span / 2, eave),
            (length / 2, span / 2, eave),
            (-length / 2, span / 2, eave),
            (-length / 2, 0.0, ridge),
            (length / 2, 0.0, ridge),
        ]
        faces = [
            (0, 1, 5, 4),
            (3, 4, 5, 2),
            (0, 4, 3),
            (1, 2, 5),
            (0, 3, 2, 1),
        ]
        roof_faces = {0, 1, 4}
    elif axis == "Y":
        vertices = [
            (-span / 2, -length / 2, eave),
            (span / 2, -length / 2, eave),
            (span / 2, length / 2, eave),
            (-span / 2, length / 2, eave),
            (0.0, -length / 2, ridge),
            (0.0, length / 2, ridge),
        ]
        faces = [
            (0, 4, 5, 3),
            (1, 2, 5, 4),
            (0, 1, 4),
            (3, 5, 2),
            (0, 3, 2, 1),
        ]
        roof_faces = {0, 1, 4}
    else:
        raise ValueError(f"{roof['id']} 的 ridgeAxis 只支持 X / Y")
    mesh = bpy.data.meshes.new(f"{roof['id']}-mesh")
    mesh.from_pydata(
        [
            (x + center_x, y + center_y, z)
            for x, y, z in vertices
        ],
        [],
        faces,
    )
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(roof["id"], mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material_for(roof["material"], materials))
    gable_role = roof.get("gableMaterial")
    if gable_role:
        obj.data.materials.append(material_for(gable_role, materials))
        for index, polygon in enumerate(obj.data.polygons):
            polygon.material_index = 0 if index in roof_faces else 1
    register(obj)


def add_shed_roof(
    roof: dict[str, Any],
    materials: dict[str, bpy.types.Material],
) -> None:
    """生成一侧高、一侧低的通用单坡屋面楔体。"""

    center_x, center_y = (float(value) for value in roof["center"])
    length = float(roof["length"])
    span = float(roof["span"])
    eave = float(roof["eaveHeight"])
    ridge = float(roof["ridgeHeight"])
    axis = roof.get("ridgeAxis", "X")
    high_side = roof.get("highSide")
    if ridge <= eave:
        raise ValueError(f"{roof['id']} 的 ridgeHeight 必须高于 eaveHeight")

    if axis == "X":
        if high_side not in {"positiveY", "negativeY"}:
            raise ValueError(
                f"{roof['id']} 的 ridgeAxis=X 只支持 positiveY / negativeY",
            )
        vertices = [
            (-length / 2, -span / 2, eave),
            (length / 2, -span / 2, eave),
            (-length / 2, span / 2, eave),
            (length / 2, span / 2, eave),
            (-length / 2, span / 2, ridge),
            (length / 2, span / 2, ridge),
        ]
        faces = [
            (0, 1, 5, 4),
            (2, 4, 5, 3),
            (0, 4, 2),
            (1, 3, 5),
            (0, 2, 3, 1),
        ]
        if high_side == "negativeY":
            vertices = [(x, -y, z) for x, y, z in vertices]
            faces = [tuple(reversed(face)) for face in faces]
    elif axis == "Y":
        if high_side not in {"positiveX", "negativeX"}:
            raise ValueError(
                f"{roof['id']} 的 ridgeAxis=Y 只支持 positiveX / negativeX",
            )
        vertices = [
            (-span / 2, -length / 2, eave),
            (-span / 2, length / 2, eave),
            (span / 2, -length / 2, eave),
            (span / 2, length / 2, eave),
            (span / 2, -length / 2, ridge),
            (span / 2, length / 2, ridge),
        ]
        faces = [
            (0, 4, 5, 1),
            (2, 3, 5, 4),
            (0, 2, 4),
            (1, 5, 3),
            (0, 1, 3, 2),
        ]
        if high_side == "negativeX":
            vertices = [(-x, y, z) for x, y, z in vertices]
            faces = [tuple(reversed(face)) for face in faces]
    else:
        raise ValueError(f"{roof['id']} 的 ridgeAxis 只支持 X / Y")

    mesh = bpy.data.meshes.new(f"{roof['id']}-mesh")
    mesh.from_pydata(
        [
            (x + center_x, y + center_y, z)
            for x, y, z in vertices
        ],
        [],
        faces,
    )
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(roof["id"], mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material_for(roof["material"], materials))
    fascia_role = roof.get("gableMaterial")
    if fascia_role:
        obj.data.materials.append(material_for(fascia_role, materials))
        for index, polygon in enumerate(obj.data.polygons):
            polygon.material_index = 0 if index in {0, 4} else 1
    register(obj)


def add_hipped_roof(
    roof: dict[str, Any],
    materials: dict[str, bpy.types.Material],
) -> None:
    center_x, center_y = (float(value) for value in roof["center"])
    eave = float(roof["eaveHeight"])
    ridge = float(roof["ridgeHeight"])
    surface = material_for(roof["material"], materials)
    if ridge <= eave:
        raise ValueError(f"{roof['id']} 的 ridgeHeight 必须高于 eaveHeight")
    if roof.get("shape", "rect") == "round":
        radius = float(roof["radius"])
        top_radius = float(roof.get("topRadius", 0.0))
        height = ridge - eave
        bpy.ops.mesh.primitive_cone_add(
            vertices=int(roof.get("segments", 16)),
            radius1=radius,
            radius2=top_radius,
            depth=height,
            end_fill_type="NGON",
            location=(center_x, center_y, eave + height * 0.5),
        )
        obj = bpy.context.object
        obj.name = roof["id"]
        register(obj, surface)
        return

    length = float(roof["length"])
    span = float(roof["span"])
    axis = roof.get("ridgeAxis", "X")
    ridge_length = float(
        roof.get("ridgeLength", max(0.0, length - span))
    )
    if axis == "X":
        base = [
            (-length / 2, -span / 2, eave),
            (length / 2, -span / 2, eave),
            (length / 2, span / 2, eave),
            (-length / 2, span / 2, eave),
        ]
        ridge_points = [
            (-ridge_length / 2, 0.0, ridge),
            (ridge_length / 2, 0.0, ridge),
        ]
    else:
        base = [
            (-span / 2, -length / 2, eave),
            (span / 2, -length / 2, eave),
            (span / 2, length / 2, eave),
            (-span / 2, length / 2, eave),
        ]
        ridge_points = [
            (0.0, -ridge_length / 2, ridge),
            (0.0, ridge_length / 2, ridge),
        ]
    vertices = base + ridge_points
    faces = [
        (0, 1, 5, 4),
        (3, 4, 5, 2),
        (0, 4, 3),
        (1, 2, 5),
        (0, 3, 2, 1),
    ]
    mesh = bpy.data.meshes.new(f"{roof['id']}-mesh")
    mesh.from_pydata(
        [
            (x + center_x, y + center_y, z)
            for x, y, z in vertices
        ],
        [],
        faces,
    )
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(roof["id"], mesh)
    bpy.context.collection.objects.link(obj)
    register(obj, surface)


def build_roof(
    roof: dict[str, Any],
    materials: dict[str, bpy.types.Material],
) -> None:
    if roof["type"] == "gable":
        add_gable_roof(roof, materials)
    elif roof["type"] == "hipped":
        add_hipped_roof(roof, materials)
    elif roof["type"] == "shed":
        add_shed_roof(roof, materials)
    elif roof["type"] == "flat":
        center_x, center_y = (float(value) for value in roof["center"])
        add_box(
            roof["id"],
            (
                center_x,
                center_y,
                (
                    float(roof["eaveHeight"])
                    + float(roof["ridgeHeight"])
                )
                * 0.5,
            ),
            (
                float(roof["length"]),
                float(roof["span"]),
                float(roof["ridgeHeight"]) - float(roof["eaveHeight"]),
            ),
            material_for(roof["material"], materials),
        )
    else:
        raise ValueError(f"不支持的 roof type：{roof['type']}")


def add_rect_opening(
    opening: dict[str, Any],
    materials: dict[str, bpy.types.Material],
    *,
    id_suffix: str = "",
    anchor_override: tuple[float, float, float] | None = None,
) -> None:
    anchor = anchor_override or tuple(float(value) for value in opening["anchor"])
    x, y, bottom = anchor
    width = float(opening["width"])
    height = float(opening["height"])
    angle = math.radians(float(opening.get("rotationDegrees", 0.0)))
    outside_sign = float(opening.get("outsideSign", -1))
    normal_x, normal_y = rotate_xy(0.0, outside_sign * 0.055, angle)
    trim = material_for(opening.get("trimMaterial", "trim"), materials)
    panel = material_for(opening["material"], materials)
    frame = material_for(opening.get("frameMaterial", "trim"), materials)
    prefix = f"{opening['id']}{id_suffix}"
    add_box(
        f"{prefix}-panel",
        (x + normal_x, y + normal_y, bottom + height * 0.5),
        (width * 0.84, 0.045, height * 0.84),
        panel,
        rotation=(0.0, 0.0, angle),
    )
    thickness = max(0.055, min(width, height) * 0.075)
    for side in (-1.0, 1.0):
        offset_x, offset_y = rotate_xy(side * width * 0.5, 0.0, angle)
        add_box(
            f"{prefix}-jamb-{side:+.0f}",
            (x + offset_x, y + offset_y, bottom + height * 0.5),
            (thickness, 0.1, height + thickness),
            trim,
            rotation=(0.0, 0.0, angle),
        )
    for level, z in (
        ("sill", bottom),
        ("head", bottom + height),
    ):
        add_box(
            f"{prefix}-{level}",
            (x, y, z),
            (width + thickness, 0.11, thickness),
            trim,
            rotation=(0.0, 0.0, angle),
        )
    add_box(
        f"{prefix}-mullion",
        (x + normal_x * 1.2, y + normal_y * 1.2, bottom + height * 0.49),
        (max(0.035, thickness * 0.55), 0.04, height * 0.68),
        frame,
        rotation=(0.0, 0.0, angle),
    )


def add_arch_opening(
    opening: dict[str, Any],
    materials: dict[str, bpy.types.Material],
    *,
    id_suffix: str = "",
    anchor_override: tuple[float, float, float] | None = None,
) -> None:
    anchor = anchor_override or tuple(float(value) for value in opening["anchor"])
    x, y, bottom = anchor
    width = float(opening["width"])
    height = float(opening["height"])
    angle = math.radians(float(opening.get("rotationDegrees", 0.0)))
    outside_sign = float(opening.get("outsideSign", -1))
    trim = material_for(opening.get("trimMaterial", "trim"), materials)
    panel = material_for(opening["material"], materials)
    frame = material_for(opening.get("frameMaterial", "trim"), materials)
    prefix = f"{opening['id']}{id_suffix}"
    normal_x, normal_y = rotate_xy(0.0, outside_sign * 0.07, angle)
    outer = arch_outline(width, height, pointed=bool(opening.get("pointed", False)))
    inner = arch_outline(
        width * 0.76,
        height * 0.82,
        pointed=bool(opening.get("pointed", False)),
    )
    add_profile(
        f"{prefix}-surround",
        outer,
        0.11,
        (x, y, bottom),
        trim,
        rotation_z=angle,
    )
    add_profile(
        f"{prefix}-panel",
        inner,
        0.045,
        (
            x + normal_x,
            y + normal_y,
            bottom + height * 0.055,
        ),
        panel,
        rotation_z=angle,
    )
    if not opening.get("open", False):
        add_box(
            f"{prefix}-mullion",
            (
                x + normal_x * 1.2,
                y + normal_y * 1.2,
                bottom + height * 0.43,
            ),
            (0.045, 0.035, height * 0.68),
            frame,
            rotation=(0.0, 0.0, angle),
        )
        add_box(
            f"{prefix}-transom",
            (
                x + normal_x * 1.2,
                y + normal_y * 1.2,
                bottom + height * 0.4,
            ),
            (width * 0.62, 0.035, 0.045),
            frame,
            rotation=(0.0, 0.0, angle),
        )


def build_opening(
    opening: dict[str, Any],
    materials: dict[str, bpy.types.Material],
) -> None:
    if opening["type"] == "rect-window":
        add_rect_opening(opening, materials)
        return
    if opening["type"] == "arched-opening":
        add_arch_opening(opening, materials)
        return
    if opening["type"] != "window-row":
        raise ValueError(f"不支持的 opening type：{opening['type']}")
    count = int(opening["count"])
    spacing = float(opening["spacing"])
    anchor_x, anchor_y, anchor_z = (
        float(value) for value in opening["anchor"]
    )
    angle = math.radians(float(opening.get("rotationDegrees", 0.0)))
    for index in range(count):
        local_x = (index - (count - 1) * 0.5) * spacing
        offset_x, offset_y = rotate_xy(local_x, 0.0, angle)
        anchor = (anchor_x + offset_x, anchor_y + offset_y, anchor_z)
        if "pointed" in opening:
            add_arch_opening(
                opening,
                materials,
                id_suffix=f"-{index:02d}",
                anchor_override=anchor,
            )
        else:
            add_rect_opening(
                opening,
                materials,
                id_suffix=f"-{index:02d}",
                anchor_override=anchor,
            )


def build_timber_gable(
    feature: dict[str, Any],
    materials: dict[str, bpy.types.Material],
) -> None:
    x, y, _ = (float(value) for value in feature["anchor"])
    span = float(feature["span"])
    eave = float(feature["eaveHeight"])
    ridge = float(feature["ridgeHeight"])
    surface = material_for(feature["material"], materials)
    depth = 0.1
    add_box(
        f"{feature['id']}-horizontal",
        (x, y, eave + 0.34),
        (span * 0.88, depth, 0.13),
        surface,
    )
    add_box(
        f"{feature['id']}-vertical",
        (x, y, (eave + ridge) * 0.5),
        (0.14, depth, ridge - eave),
        surface,
    )
    rise = ridge - eave
    half_run = span * 0.42
    add_beam_between(
        f"{feature['id']}-left-rake",
        (x - half_run, y, eave),
        (x, y, ridge),
        0.12,
        surface,
    )
    add_beam_between(
        f"{feature['id']}-right-rake",
        (x, y, ridge),
        (x + half_run, y, eave),
        0.12,
        surface,
    )


def build_balcony(
    feature: dict[str, Any],
    materials: dict[str, bpy.types.Material],
) -> None:
    x, y, z = (float(value) for value in feature["anchor"])
    width = float(feature["width"])
    depth = float(feature["length"])
    rail_height = float(feature["height"])
    metal = material_for(feature["material"], materials)
    trim = material_for(feature.get("trimMaterial", "trim"), materials)
    add_box(
        f"{feature['id']}-slab",
        (x, y, z),
        (width, depth, 0.12),
        trim,
    )
    rail_y = y - depth * 0.58
    add_box(
        f"{feature['id']}-top-rail",
        (x, rail_y, z + rail_height),
        (width, 0.055, 0.07),
        metal,
    )
    add_box(
        f"{feature['id']}-bottom-rail",
        (x, rail_y, z + 0.16),
        (width, 0.045, 0.05),
        metal,
    )
    count = max(4, round(width / 0.24))
    for index in range(count + 1):
        rail_x = x - width * 0.5 + width * index / count
        add_box(
            f"{feature['id']}-baluster-{index:02d}",
            (rail_x, rail_y, z + rail_height * 0.52),
            (0.035, 0.04, rail_height * 0.86),
            metal,
        )


def build_round_tower_feature(
    feature: dict[str, Any],
    materials: dict[str, bpy.types.Material],
) -> None:
    center_x, center_y = (float(value) for value in feature["center"])
    radius = float(feature["radius"])
    height = float(feature["height"])
    trim = material_for(feature.get("trimMaterial", "trim"), materials)
    add_torus(
        f"{feature['id']}-lower-band",
        (center_x, center_y, height * 0.5),
        radius + 0.035,
        0.045,
        trim,
        segments=20,
    )
    add_torus(
        f"{feature['id']}-eave-band",
        (center_x, center_y, height - 0.02),
        radius + 0.035,
        0.055,
        trim,
        segments=20,
    )
    for floor, bottom in enumerate((0.46, 2.12)):
        for index, degrees in enumerate(feature["windowAnglesDegrees"]):
            angle = math.radians(float(degrees))
            window_x = center_x + math.cos(angle) * (radius + 0.045)
            window_y = center_y + math.sin(angle) * (radius + 0.045)
            opening = {
                "id": f"{feature['id']}-window-{floor}-{index}",
                "type": "arched-opening",
                "anchor": [window_x, window_y, bottom],
                "width": 0.42,
                "height": 0.88 if floor == 0 else 0.82,
                "rotationDegrees": math.degrees(angle) + 90,
                "outsideSign": -1,
                "pointed": floor == 0,
                "open": False,
                "material": feature["material"],
                "trimMaterial": feature.get("trimMaterial", "trim"),
                "frameMaterial": feature.get("frameMaterial", "metal"),
            }
            add_arch_opening(opening, materials)


def build_chimney(
    feature: dict[str, Any],
    materials: dict[str, bpy.types.Material],
) -> None:
    x, y, base = (float(value) for value in feature["anchor"])
    width, depth, height = (float(value) for value in feature["size"])
    surface = material_for(feature["material"], materials)
    trim = material_for(feature.get("trimMaterial", feature["material"]), materials)
    add_box(
        f"{feature['id']}-body",
        (x, y, base + height * 0.5),
        (width, depth, height),
        surface,
    )
    add_box(
        f"{feature['id']}-cap",
        (x, y, base + height + 0.06),
        (width * 1.28, depth * 1.28, 0.12),
        trim,
    )


def build_porte_cochere(
    feature: dict[str, Any],
    materials: dict[str, bpy.types.Material],
) -> None:
    center_x, front_y, _ = (
        float(value) for value in feature["anchor"]
    )
    width = float(feature["width"])
    height = float(feature["height"])
    wall = material_for(feature["material"], materials)
    trim = material_for(feature.get("trimMaterial", "trim"), materials)
    eave = height - 0.83
    add_profile(
        f"{feature['id']}-front-gable",
        [
            (-width * 0.5, 0.0),
            (width * 0.5, 0.0),
            (0.0, height - eave),
        ],
        0.26,
        (center_x, front_y, eave),
        wall,
    )
    opening = {
        "id": f"{feature['id']}-front-arch",
        "type": "arched-opening",
        "anchor": [center_x, front_y - 0.15, 0.48],
        "width": width * 0.66,
        "height": 1.72,
        "rotationDegrees": 0,
        "outsideSign": 1,
        "pointed": False,
        "open": True,
        "material": "shadow",
        "trimMaterial": feature.get("trimMaterial", "trim"),
        "frameMaterial": feature.get("trimMaterial", "trim"),
    }
    add_arch_opening(opening, materials)
    for index, (column_x, column_y) in enumerate(feature.get("columns", [])):
        add_box(
            f"{feature['id']}-column-cap-{index}",
            (float(column_x), float(column_y), 2.17),
            (0.54, 0.54, 0.14),
            trim,
        )


def build_trim_band(
    feature: dict[str, Any],
    materials: dict[str, bpy.types.Material],
) -> None:
    x, y, z = (float(value) for value in feature["anchor"])
    angle = math.radians(float(feature.get("rotationDegrees", 0.0)))
    add_box(
        feature["id"],
        (x, y, z),
        (
            float(feature["width"]),
            float(feature["length"]),
            float(feature["height"]),
        ),
        material_for(feature["material"], materials),
        rotation=(0.0, 0.0, angle),
    )


def build_feature(
    feature: dict[str, Any],
    materials: dict[str, bpy.types.Material],
) -> None:
    feature_type = feature["type"]
    if feature_type == "timber-gable":
        build_timber_gable(feature, materials)
    elif feature_type == "balcony":
        build_balcony(feature, materials)
    elif feature_type == "round-tower":
        build_round_tower_feature(feature, materials)
    elif feature_type == "chimney":
        build_chimney(feature, materials)
    elif feature_type == "porte-cochere":
        build_porte_cochere(feature, materials)
    elif feature_type == "trim-band":
        build_trim_band(feature, materials)
    else:
        raise ValueError(f"不支持的 feature type：{feature_type}")


def scene_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    minimum = Vector((math.inf, math.inf, math.inf))
    maximum = Vector((-math.inf, -math.inf, -math.inf))
    for obj in objects:
        for corner in obj.bound_box:
            point = obj.matrix_world @ Vector(corner)
            minimum.x = min(minimum.x, point.x)
            minimum.y = min(minimum.y, point.y)
            minimum.z = min(minimum.z, point.z)
            maximum.x = max(maximum.x, point.x)
            maximum.y = max(maximum.y, point.y)
            maximum.z = max(maximum.z, point.z)
    return minimum, maximum


def configure_scene(
    dsl: dict[str, Any],
    stage: str,
    profile: dict[str, Any],
) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.display.shading.background_type = "WORLD"
    resolution_x, resolution_y = profile["preview"]["resolution"]
    scene.render.resolution_x = int(resolution_x)
    scene.render.resolution_y = int(resolution_y)
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = hex_rgba(profile["preview"]["background"])[:3]
    scene["asset_id"] = dsl["assetId"]
    scene["archetype"] = dsl["archetype"]
    scene["stage"] = stage
    scene["authored_front"] = dsl["coordinateContract"]["front"]
    scene["scene_unit_meters"] = dsl["coordinateContract"]["sceneUnitMeters"]
    scene["ground_datum"] = dsl["coordinateContract"]["groundDatum"]
    scene["dsl_schema_version"] = dsl["schemaVersion"]


def add_preview_context(
    profile: dict[str, Any],
) -> list[bpy.types.Object]:
    minimum, maximum = scene_bounds(ASSET_OBJECTS)
    span = max(maximum.x - minimum.x, maximum.y - minimum.y)
    palette = profile["preview"]
    helpers: list[bpy.types.Object] = []
    ground_material = make_material(
        "test-building-engine-ground",
        {"color": palette["ground"], "roughness": 1, "metallic": 0},
    )
    human_material = make_material(
        "test-building-engine-human",
        {"color": palette["human"], "roughness": 0.9, "metallic": 0},
    )
    marker_material = make_material(
        "test-building-engine-front-marker",
        {"color": palette["frontMarker"], "roughness": 0.9, "metallic": 0},
    )
    bpy.ops.mesh.primitive_plane_add(
        size=max(18.0, span * 1.7),
        location=(0.0, 0.0, -0.025),
    )
    ground = bpy.context.object
    ground.name = "test-building-engine-ground"
    ground.data.materials.append(ground_material)
    helpers.append(ground)
    human_height = float(profile["readability"]["humanHeightSceneUnits"])
    human_x = minimum.x + span * 0.12
    human_y = minimum.y - max(0.7, span * 0.05)
    body_height = human_height * 0.75
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=10,
        radius=human_height * 0.15,
        depth=body_height,
        location=(human_x, human_y, body_height * 0.5),
    )
    body = bpy.context.object
    body.name = "test-building-engine-human-body"
    body.data.materials.append(human_material)
    helpers.append(body)
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=2,
        radius=human_height * 0.13,
        location=(human_x, human_y, body_height + human_height * 0.12),
    )
    head = bpy.context.object
    head.name = "test-building-engine-human-head"
    head.data.materials.append(human_material)
    helpers.append(head)
    marker_width = max(2.2, span * 0.22)
    marker = add_box(
        "test-building-engine-local-negative-y-marker",
        (0.0, minimum.y - 0.4, 0.035),
        (marker_width, 0.18, 0.07),
        marker_material,
    )
    ASSET_OBJECTS.remove(marker)
    helpers.append(marker)
    return helpers


def render_previews(
    dsl: dict[str, Any],
    stage: str,
    preview_dir: Path,
    profile: dict[str, Any],
) -> list[dict[str, Any]]:
    helpers = add_preview_context(profile)
    outputs: list[dict[str, Any]] = []
    for view_name, camera_contract in dsl["runtime"]["cameras"].items():
        bpy.ops.object.camera_add(
            location=tuple(float(value) for value in camera_contract["position"]),
        )
        camera = bpy.context.object
        camera.name = f"test-{dsl['assetId']}-{stage}-{view_name}-camera"
        camera.data.type = "ORTHO"
        camera.data.ortho_scale = float(camera_contract["orthoScale"])
        target = Vector(
            tuple(float(value) for value in camera_contract["target"])
        )
        camera.rotation_euler = (
            target - camera.location
        ).to_track_quat("-Z", "Y").to_euler()
        bpy.context.scene.camera = camera
        path = (
            preview_dir
            / f"test_{dsl['assetId']}-{stage}-{view_name}.png"
        )
        path.parent.mkdir(parents=True, exist_ok=True)
        bpy.context.scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        outputs.append(
            {
                "view": view_name,
                "path": str(path.relative_to(ROOT)),
                "sha256": sha256(path),
                "bytes": path.stat().st_size,
            }
        )
        bpy.data.objects.remove(camera, do_unlink=True)
    for helper in helpers:
        if helper.name in bpy.data.objects:
            bpy.data.objects.remove(helper, do_unlink=True)
    return outputs


def join_for_export(asset_id: str, stage: str) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in ASSET_OBJECTS:
        if obj.name not in bpy.data.objects:
            continue
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = f"{asset_id}-{stage}"
    joined.data.name = f"{asset_id}-{stage}-mesh"
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return joined


def geometry_integrity(obj: bpy.types.Object) -> dict[str, Any]:
    if obj.type != "MESH":
        raise ValueError("导出根对象必须是 Mesh")
    mesh = obj.data
    mesh.calc_loop_triangles()
    zero_area = 0
    non_finite = 0
    for vertex in mesh.vertices:
        if not all(math.isfinite(value) for value in vertex.co):
            non_finite += 1
    for triangle in mesh.loop_triangles:
        points = [mesh.vertices[index].co for index in triangle.vertices]
        area = (points[1] - points[0]).cross(points[2] - points[0]).length * 0.5
        if area < 1e-10:
            zero_area += 1
    return {
        "vertices": len(mesh.vertices),
        "polygons": len(mesh.polygons),
        "triangles": len(mesh.loop_triangles),
        "zeroAreaTriangles": zero_area,
        "nonFinitePositions": non_finite,
        "status": "ok" if zero_area == 0 and non_finite == 0 else "failed",
    }


def export_glb(path: Path, obj: bpy.types.Object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
    )


def parse_glb(path: Path) -> dict[str, Any]:
    contents = path.read_bytes()
    if len(contents) < 20 or contents[:4] != b"glTF":
        raise RuntimeError(f"{path} 不是有效 GLB")
    version, declared_length = struct.unpack_from("<II", contents, 4)
    if version != 2 or declared_length != len(contents):
        raise RuntimeError(f"{path} 的 GLB header 无效")
    json_length, json_type = struct.unpack_from("<II", contents, 12)
    if json_type != 0x4E4F534A:
        raise RuntimeError(f"{path} 第一 chunk 不是 JSON")
    document = json.loads(
        contents[20 : 20 + json_length].decode("utf-8").rstrip(" \t\r\n\0")
    )
    triangles = 0
    primitives = 0
    bounds_min = [math.inf, math.inf, math.inf]
    bounds_max = [-math.inf, -math.inf, -math.inf]
    for mesh in document.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            primitives += 1
            indices = primitive.get("indices")
            if indices is None:
                indices = primitive["attributes"]["POSITION"]
            triangles += document["accessors"][indices]["count"] // 3
            accessor = document["accessors"][primitive["attributes"]["POSITION"]]
            for axis in range(3):
                bounds_min[axis] = min(bounds_min[axis], accessor["min"][axis])
                bounds_max[axis] = max(bounds_max[axis], accessor["max"][axis])
    transformed_nodes = [
        node.get("name")
        for node in document.get("nodes", [])
        if any(key in node for key in ("translation", "rotation", "scale", "matrix"))
    ]
    return {
        "sha256": sha256(path),
        "bytes": len(contents),
        "nodes": len(document.get("nodes", [])),
        "meshes": len(document.get("meshes", [])),
        "primitives": primitives,
        "triangles": triangles,
        "materials": len(document.get("materials", [])),
        "images": len(document.get("images", [])),
        "textures": len(document.get("textures", [])),
        "animations": len(document.get("animations", [])),
        "skins": len(document.get("skins", [])),
        "bounds": {
            "min": [round(value, 6) for value in bounds_min],
            "max": [round(value, 6) for value in bounds_max],
        },
        "transformedNodes": transformed_nodes,
    }


def validate_audit(
    audit: dict[str, Any],
    integrity: dict[str, Any],
    budget: dict[str, Any],
) -> None:
    violations: list[str] = []
    if audit["nodes"] > int(budget["maxNodes"]):
        violations.append("nodes")
    if audit["triangles"] > int(budget["maxTriangles"]):
        violations.append("triangles")
    if audit["materials"] > int(budget["maxMaterials"]):
        violations.append("materials")
    if audit["images"] > int(budget["maxImages"]):
        violations.append("images")
    if audit["bytes"] > int(budget["maxBytes"]):
        violations.append("bytes")
    if audit["textures"] or audit["animations"] or audit["skins"]:
        violations.append("texture-animation-skin-policy")
    if audit["transformedNodes"]:
        violations.append("root-transform")
    if abs(float(audit["bounds"]["min"][1])) > 1e-5:
        violations.append("ground-datum")
    if integrity["status"] != "ok":
        violations.append("geometry-integrity")
    if violations:
        raise RuntimeError(
            f"GLB / geometry 自动检查失败：{','.join(violations)}；"
            f"audit={audit} integrity={integrity}"
        )


def build_collision_contract(
    dsl: dict[str, Any],
    dsl_sha: str,
    output_path: Path,
) -> dict[str, Any]:
    value = {
        "schemaVersion": 1,
        "assetId": dsl["assetId"],
        "archetype": dsl["archetype"],
        "dslSha256": dsl_sha,
        "coordinateContract": dsl["coordinateContract"],
        "obstacles": dsl["collision"]["obstacles"],
        "requiredOpenPaths": dsl["collision"]["requiredOpenPaths"],
    }
    write_json(output_path, value)
    return {
        "path": str(output_path.relative_to(ROOT)),
        "sha256": sha256(output_path),
        "obstacleCount": len(value["obstacles"]),
        "openPathCount": len(value["requiredOpenPaths"]),
    }


def main() -> None:
    args = parse_arguments()
    dsl_path = args.dsl.resolve()
    if ROOT not in dsl_path.parents:
        raise ValueError("DSL 必须位于当前仓库")
    dsl = json.loads(dsl_path.read_text(encoding="utf-8"))
    if dsl.get("archetype") != "garden-villa":
        raise ValueError("本 Compiler 只支持 garden-villa")
    profile_path = (
        ROOT
        / "building-engine/art-profiles"
        / f"{dsl['artProfile']}.json"
    )
    profile = json.loads(profile_path.read_text(encoding="utf-8"))
    if dsl["coordinateContract"] != profile["coordinateContract"]:
        raise ValueError("DSL 坐标合同与 Art Profile 不一致")
    asset_id = dsl["assetId"]
    stage = args.stage
    source_dir = (
        ROOT / "assets/models/source/building-engine-spike" / asset_id
    )
    public_dir = ROOT / "public/models/building-engine-spike" / asset_id
    record_dir = (
        ROOT / "docs/research/build-records/building-engine-spike" / asset_id
    )
    preview_dir = ROOT / "test_artifacts/building-engine-spike" / asset_id
    source_dir.mkdir(parents=True, exist_ok=True)
    public_dir.mkdir(parents=True, exist_ok=True)
    record_dir.mkdir(parents=True, exist_ok=True)
    preview_dir.mkdir(parents=True, exist_ok=True)
    blend_path = source_dir / f"{asset_id}-{stage}.blend"
    glb_path = public_dir / f"{asset_id}-{stage}.glb"
    record_path = record_dir / f"{stage}.json"
    collision_path = public_dir / f"{asset_id}-collision.json"

    reset_scene()
    palette = profile["palette"]
    materials = {
        role: make_material(
            f"{asset_id}-{role}-{token}",
            palette[token],
        )
        for role, token in dsl["materials"].items()
    }
    for volume in dsl["massing"]["volumes"]:
        build_volume(volume, materials)
    for roof in dsl["massing"]["roofs"]:
        build_roof(roof, materials)
    if stage == "master":
        for opening in dsl["master"]["openings"]:
            build_opening(opening, materials)
        for feature in dsl["master"]["features"]:
            build_feature(feature, materials)
    configure_scene(dsl, stage, profile)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    editable_object_count = len(ASSET_OBJECTS)
    previews = render_previews(dsl, stage, preview_dir, profile)
    joined = join_for_export(asset_id, stage)
    joined["stable_asset_id"] = asset_id
    joined["archetype"] = dsl["archetype"]
    joined["stage"] = stage
    joined["authored_front"] = dsl["coordinateContract"]["front"]
    joined["scene_unit_meters"] = dsl["coordinateContract"]["sceneUnitMeters"]
    joined["ground_datum"] = dsl["coordinateContract"]["groundDatum"]
    joined["dsl_sha256"] = sha256(dsl_path)
    integrity = geometry_integrity(joined)
    export_glb(glb_path, joined)
    audit = parse_glb(glb_path)
    validate_audit(audit, integrity, dsl["budgets"][stage])
    dsl_sha = sha256(dsl_path)
    collision = build_collision_contract(dsl, dsl_sha, collision_path)
    lineage: dict[str, Any] = {
        "dslSha256": dsl_sha,
        "artProfileSha256": sha256(profile_path),
        "compilerSha256": sha256(Path(__file__).resolve()),
    }
    if stage == "master":
        massing_record_path = record_dir / "massing.json"
        if not massing_record_path.exists():
            raise RuntimeError("Master 缺少同一 DSL 的 Massing build record")
        massing_record = json.loads(
            massing_record_path.read_text(encoding="utf-8")
        )
        if massing_record["lineage"]["dslSha256"] != dsl_sha:
            raise RuntimeError("Master 与当前 Massing 的 DSL SHA 不一致")
        lineage["derivedFromMassing"] = {
            "record": str(massing_record_path.relative_to(ROOT)),
            "glbSha256": massing_record["outputs"]["glb"]["sha256"],
        }
    record = {
        "schemaVersion": 1,
        "assetId": asset_id,
        "archetype": dsl["archetype"],
        "stage": stage,
        "status": "built-auto-qa-pass",
        "blenderVersion": bpy.app.version_string,
        "generator": {
            "path": str(Path(__file__).resolve().relative_to(ROOT)),
            "sha256": sha256(Path(__file__).resolve()),
        },
        "inputs": {
            "dsl": {
                "path": str(dsl_path.relative_to(ROOT)),
                "sha256": dsl_sha,
            },
            "artProfile": {
                "path": str(profile_path.relative_to(ROOT)),
                "sha256": sha256(profile_path),
            },
        },
        "lineage": lineage,
        "editableObjectCount": editable_object_count,
        "outputs": {
            "blend": {
                "path": str(blend_path.relative_to(ROOT)),
                "sha256": sha256(blend_path),
                "bytes": blend_path.stat().st_size,
            },
            "glb": {
                "path": str(glb_path.relative_to(ROOT)),
                **audit,
            },
            "collision": collision,
            "previews": previews,
        },
        "geometryIntegrity": integrity,
        "budget": dsl["budgets"][stage],
        "mcpReview": {
            "status": "not-run-addon-unavailable",
            "fallback": "headless-fixed-camera-previews",
        },
        "nextGate": (
            "massing-calibration-review"
            if stage == "massing"
            else "final-comparison-review"
        ),
    }
    write_json(record_path, record)
    print(
        json.dumps(
            {
                "status": "ok",
                "assetId": asset_id,
                "stage": stage,
                "glb": record["outputs"]["glb"],
                "record": str(record_path.relative_to(ROOT)),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
