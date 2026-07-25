"""生成 14 个设施原型语义对应的 15 个确定性 Massing 资产。"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys
from typing import Any, Callable

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
SPEC_PATH = ROOT / "docs/research/facility-prototypes-massing-geometry-spec.json"
REFERENCE_MANIFEST_PATH = (
    ROOT / "docs/research/facility-prototypes-reference-manifest.json"
)
SOURCE_DIR = ROOT / "assets/models/source/tiers/facility-prototypes/massing"
RUNTIME_DIR = ROOT / "public/models/tiers/facility-prototypes/massing"
PREVIEW_DIR = ROOT / "test_artifacts/all-models/massing/facility-prototypes"
RECORD_DIR = (
    ROOT / "docs/research/build-records/tiers/facility-prototypes/massing"
)
MANIFEST_PATH = ROOT / "docs/research/facility-prototypes-massing-manifest.json"
BRIEF_PATH = "docs/research/facility-prototypes-massing-model-brief.md"
GENERATOR_PATH = "scripts/create_facility_prototype_massing_models.py"
AUDITED_AT = "2026-07-25"
AUTHORED_METERS_PER_SCENE_UNIT = 2.7

MATERIAL_COLORS = {
    "neutral": (0.58, 0.61, 0.57, 1.0),
    "dark": (0.17, 0.23, 0.21, 1.0),
    "wood": (0.46, 0.30, 0.20, 1.0),
    "water": (0.24, 0.54, 0.57, 1.0),
    "green": (0.16, 0.34, 0.27, 1.0),
    "court": (0.18, 0.40, 0.54, 1.0),
    "pink": (0.82, 0.31, 0.40, 1.0),
    "light": (0.76, 0.75, 0.68, 1.0),
    "gold": (0.84, 0.57, 0.16, 1.0),
}


def parse_arguments() -> argparse.Namespace:
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--asset",
        help=(
            "只生成指定输出 slug；喷泉使用 "
            "shangsheng-fountain-osm-<way-id>"
        ),
    )
    return parser.parse_args(arguments)


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(collection):
            if datablock.users == 0:
                collection.remove(datablock)


def create_material(name: str, color_key: str) -> bpy.types.Material:
    material = bpy.data.materials.new(f"{name}-{color_key}-massing-material")
    color = MATERIAL_COLORS[color_key]
    material.diffuse_color = color
    material.roughness = 0.92
    material.metallic = 0.0
    # 仅设置 diffuse_color 在当前 Blender glTF exporter 中会退化为默认 0.8 灰。
    # Principled BSDF 才是 GLB PBR baseColor 的权威来源。
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled is None:
        raise RuntimeError(f"{material.name} 缺少 Principled BSDF")
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Roughness"].default_value = 0.92
    principled.inputs["Metallic"].default_value = 0.0
    return material


def add_cube(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def add_cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    vertices: int = 8,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
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
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def add_cone(
    name: str,
    location: tuple[float, float, float],
    radius_one: float,
    radius_two: float,
    depth: float,
    vertices: int,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_one,
        radius2=radius_two,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def add_torus(
    name: str,
    location: tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    major_segments: int = 12,
    minor_segments: int = 3,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=major_segments,
        minor_segments=minor_segments,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def add_ico(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=1,
        radius=1,
        location=location,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def add_branch(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius: float,
    vertices: int = 6,
) -> bpy.types.Object:
    start_vector = Vector(start)
    end_vector = Vector(end)
    direction = end_vector - start_vector
    midpoint = (start_vector + end_vector) * 0.5
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=direction.length,
        location=midpoint,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def signed_area(points: list[tuple[float, float]]) -> float:
    return sum(
        x0 * y1 - x1 * y0
        for (x0, y0), (x1, y1) in zip(points, points[1:] + points[:1])
    ) * 0.5


def clean_points(
    points: list[tuple[float, float]],
) -> list[tuple[float, float]]:
    cleaned: list[tuple[float, float]] = []
    for point in points:
        rounded = (round(point[0], 6), round(point[1], 6))
        if not cleaned or rounded != cleaned[-1]:
            cleaned.append(rounded)
    if len(cleaned) > 1 and cleaned[0] == cleaned[-1]:
        cleaned.pop()
    if len(cleaned) < 3 or abs(signed_area(cleaned)) < 1e-7:
        raise ValueError("无效多边形")
    if signed_area(cleaned) < 0:
        cleaned.reverse()
    return cleaned


def add_extruded_polygon(
    name: str,
    points: list[tuple[float, float]],
    height: float,
    base_z: float = 0.0,
) -> bpy.types.Object:
    points = clean_points(points)
    count = len(points)
    vertices = (
        [(x, y, base_z) for x, y in points]
        + [(x, y, base_z + height) for x, y in points]
    )
    faces: list[tuple[int, ...]] = [
        tuple(reversed(range(count))),
        tuple(range(count, count * 2)),
    ]
    for index in range(count):
        next_index = (index + 1) % count
        faces.append((index, next_index, count + next_index, count + index))
    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def add_flat_ring(
    name: str,
    outer_x: float,
    outer_y: float,
    inner_x: float,
    inner_y: float,
    height: float,
    segments: int = 16,
) -> bpy.types.Object:
    outer = [
        (
            math.cos(index * math.tau / segments) * outer_x,
            math.sin(index * math.tau / segments) * outer_y,
        )
        for index in range(segments)
    ]
    inner = [
        (
            math.cos(index * math.tau / segments) * inner_x,
            math.sin(index * math.tau / segments) * inner_y,
        )
        for index in range(segments)
    ]
    vertices = [
        (x, y, z)
        for z in (0.0, height)
        for ring in (outer, inner)
        for x, y in ring
    ]
    faces: list[tuple[int, int, int, int]] = []
    outer_bottom = 0
    inner_bottom = segments
    outer_top = segments * 2
    inner_top = segments * 3
    for index in range(segments):
        nxt = (index + 1) % segments
        faces.extend(
            [
                (
                    outer_bottom + index,
                    outer_bottom + nxt,
                    outer_top + nxt,
                    outer_top + index,
                ),
                (
                    inner_bottom + nxt,
                    inner_bottom + index,
                    inner_top + index,
                    inner_top + nxt,
                ),
                (
                    outer_top + index,
                    outer_top + nxt,
                    inner_top + nxt,
                    inner_top + index,
                ),
                (
                    outer_bottom + nxt,
                    outer_bottom + index,
                    inner_bottom + index,
                    inner_bottom + nxt,
                ),
            ]
        )
    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def heart_outline(scale: float) -> list[tuple[float, float]]:
    points = [
        (0.0, -2.25),
        (-1.45, -0.85),
        (-2.25, 0.15),
        (-2.38, 1.28),
        (-1.72, 2.25),
        (-0.78, 2.42),
        (0.0, 1.58),
        (0.78, 2.42),
        (1.72, 2.25),
        (2.38, 1.28),
        (2.25, 0.15),
        (1.45, -0.85),
    ]
    return [(x * scale, z * scale) for x, z in points]


def add_heart_ring(
    name: str,
    depth_center: float,
    scale: float,
    band: float = 0.16,
    depth: float = 0.12,
) -> bpy.types.Object:
    outer = heart_outline(scale)
    inner = heart_outline(scale - band)
    count = len(outer)
    vertices: list[tuple[float, float, float]] = []
    for y in (depth_center - depth * 0.5, depth_center + depth * 0.5):
        vertices.extend((x, y, z + 2.25 * scale) for x, z in outer)
        vertices.extend((x, y, z + 2.25 * scale) for x, z in inner)
    faces: list[tuple[int, int, int, int]] = []
    outer_front = 0
    inner_front = count
    outer_back = count * 2
    inner_back = count * 3
    for index in range(count):
        nxt = (index + 1) % count
        faces.extend(
            [
                (
                    outer_front + index,
                    outer_front + nxt,
                    inner_front + nxt,
                    inner_front + index,
                ),
                (
                    outer_back + nxt,
                    outer_back + index,
                    inner_back + index,
                    inner_back + nxt,
                ),
                (
                    outer_front + index,
                    outer_back + index,
                    outer_back + nxt,
                    outer_front + nxt,
                ),
                (
                    inner_front + nxt,
                    inner_back + nxt,
                    inner_back + index,
                    inner_front + index,
                ),
            ]
        )
    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def join_group(
    output_slug: str,
    group_name: str,
    parts: list[bpy.types.Object],
    material: bpy.types.Material,
) -> bpy.types.Object:
    if not parts:
        raise RuntimeError(f"{output_slug}:{group_name} 没有几何")
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.data.materials.clear()
        part.data.materials.append(material)
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = f"{output_slug}-{group_name}-massing"
    obj.data.name = f"{output_slug}-{group_name}-massing-mesh"
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def build_wayfinding(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    parts = [
        add_cone("totem-post", (0, 0, 1.75), 0.62, 0.48, 3.5, 6),
    ]
    for index, (x, z, yaw) in enumerate(
        [(-0.62, 0.92, -math.pi / 2), (0.62, 1.55, math.pi / 2), (-0.62, 2.18, -math.pi / 2)]
    ):
        parts.append(
            add_cone(
                f"totem-arrow-{index}",
                (x, 0, z),
                0.34,
                0.0,
                1.22,
                3,
                (0, math.pi / 2, yaw),
            )
        )
    return {"neutral": parts}


def build_cafe(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    frame = [
        add_cylinder("cafe-roof", (0, 0, 2.72), 3.4, 0.30, 6),
    ]
    for index in range(6):
        angle = index * math.tau / 6
        frame.append(
            add_cylinder(
                f"cafe-column-{index}",
                (math.cos(angle) * 2.65, math.sin(angle) * 2.65, 1.36),
                0.11,
                2.72,
                6,
            )
        )
    kiosk = [add_cylinder("cafe-kiosk", (0, 0, 0.56), 1.62, 1.12, 8)]
    return {"neutral": frame, "dark": kiosk}


def build_bicycle(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    parts: list[bpy.types.Object] = []
    for index in range(7):
        x = (index - 3) * 0.78
        parts.extend(
            [
                add_cube(
                    f"bike-hoop-{index}-left",
                    (x, -0.47, 0.52),
                    (0.09, 0.09, 1.04),
                ),
                add_cube(
                    f"bike-hoop-{index}-right",
                    (x, 0.47, 0.52),
                    (0.09, 0.09, 1.04),
                ),
                add_cube(
                    f"bike-hoop-{index}-top",
                    (x, 0, 1.02),
                    (0.09, 1.03, 0.09),
                ),
            ]
        )
    return {"neutral": parts}


def build_reading(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    terrace = [add_flat_ring("reading-ring", 4.8, 4.8, 2.7, 2.7, 0.18, 8)]
    for index in range(8):
        angle = index * math.tau / 8
        terrace.append(
            add_cube(
                f"reading-seat-{index}",
                (math.cos(angle) * 3.65, math.sin(angle) * 3.65, 0.42),
                (1.35, 0.46, 0.18),
                (0, 0, angle + math.pi / 2),
            )
        )
    center = [
        add_cylinder("reading-center", (0, 0, 0.86), 1.42, 1.72, 8),
        add_cube(
            "reading-top",
            (0, -0.12, 1.78),
            (1.85, 1.24, 0.12),
            (0.16, 0, 0),
        ),
    ]
    return {"neutral": terrace, "dark": center}


def centered_footprint(instance: dict[str, Any]) -> list[tuple[float, float]]:
    center_x = float(instance["position"][0])
    center_y = float(instance["position"][2])
    return [
        (float(point[0]) - center_x, float(point[1]) - center_y)
        for point in instance["footprint"]
    ]


def build_fountain(asset: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    return {
        # 当前只有 OSM amenity + footprint；园区照片不能逐一绑定两个 way。
        # 因此只保留齐平中性 footprint，不把整面误画成静水池或高池沿。
        "neutral": [
            add_extruded_polygon(
                f"fountain-{asset['osmWayId']}-footprint",
                centered_footprint(asset["instance"]),
                0.06,
            )
        ]
    }


def build_main_entry(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    parts = [
        add_cube("entry-top", (0, 0, 3.08), (8.72, 2.13, 0.18)),
        add_cube("entry-left-post", (-4.12, 0, 1.55), (0.28, 1.76, 3.10)),
        add_cube("entry-right-post", (4.12, 0, 1.55), (0.28, 1.76, 3.10)),
    ]
    for index, x in enumerate((-1.7, 0.0, 1.7)):
        parts.append(
            add_cube(
                f"entry-inner-support-{index}",
                (x, 0, 1.55),
                (0.16, 1.74, 3.10),
                (0, 0, (-0.12, 0, 0.12)[index]),
            )
        )
    return {"dark": parts}


def build_pond(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    water = [
        add_extruded_polygon(
            "pond-water",
            [
                (
                    math.cos(index * math.tau / 24) * 9.4,
                    math.sin(index * math.tau / 24) * 4.5,
                )
                for index in range(24)
            ],
            0.06,
        ),
        add_flat_ring("pond-bank", 9.95, 5.05, 9.4, 4.5, 0.12, 24),
    ]
    bridge = [
        add_cube(
            "pond-bridge-deck",
            (0.4, 0, 0.18),
            (17.22, 1.62, 0.16),
            (0, 0, 0.13),
        ),
        add_cube(
            "pond-left-rail",
            (0.4, -0.76, 0.76),
            (17.2, 0.10, 0.10),
            (0, 0, 0.13),
        ),
        add_cube(
            "pond-right-rail",
            (0.4, 0.76, 0.76),
            (17.2, 0.10, 0.10),
            (0, 0, 0.13),
        ),
    ]
    for index, x in enumerate((-7.6, -5.1, -2.6, 0.0, 2.6, 5.1, 7.6)):
        for side in (-0.76, 0.76):
            bridge.append(
                add_cube(
                    f"pond-rail-post-{index}-{side}",
                    (x + 0.4, side, 0.45),
                    (0.08, 0.08, 0.62),
                    (0, 0, 0.13),
                )
            )
    return {"water": water, "wood": bridge}


def build_basketball(asset: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    footprint = centered_footprint(asset["instance"])
    court = [add_extruded_polygon("basketball-osm-pentagon", footprint, 0.10)]
    minimum_x = min(point[0] for point in footprint)
    maximum_x = max(point[0] for point in footprint)
    minimum_y = min(point[1] for point in footprint)
    maximum_y = max(point[1] for point in footprint)
    fence: list[bpy.types.Object] = []
    gate_edge = max(
        range(len(footprint)),
        key=lambda index: (
            footprint[(index + 1) % len(footprint)][0] - footprint[index][0]
        ) ** 2
        + (
            footprint[(index + 1) % len(footprint)][1] - footprint[index][1]
        ) ** 2,
    )
    for index, start in enumerate(footprint):
        end = footprint[(index + 1) % len(footprint)]
        dx = end[0] - start[0]
        dy = end[1] - start[1]
        length = math.hypot(dx, dy)
        angle = math.atan2(dy, dx)
        center_x = (start[0] + end[0]) * 0.5
        center_y = (start[1] + end[1]) * 0.5
        if index == gate_edge:
            segment_length = max(0.6, length * 0.36)
            for sign in (-1, 1):
                offset = sign * length * 0.32
                fence.append(
                    add_cube(
                        f"basketball-fence-gate-edge-{sign}",
                        (
                            center_x + math.cos(angle) * offset,
                            center_y + math.sin(angle) * offset,
                            2.45,
                        ),
                        (segment_length, 0.08, 0.10),
                        (0, 0, angle),
                    )
                )
            for sign in (-1, 1):
                offset = sign * length * 0.14
                fence.append(
                    add_cube(
                        f"basketball-gate-post-{sign}",
                        (
                            center_x + math.cos(angle) * offset,
                            center_y + math.sin(angle) * offset,
                            1.35,
                        ),
                        (0.10, 0.10, 2.7),
                    )
                )
        else:
            fence.extend(
                [
                    add_cube(
                        f"basketball-fence-top-{index}",
                        (center_x, center_y, 2.45),
                        (length, 0.08, 0.10),
                        (0, 0, angle),
                    ),
                    add_cube(
                        f"basketball-fence-post-{index}",
                        (start[0], start[1], 1.25),
                        (0.10, 0.10, 2.5),
                    ),
                ]
            )
    hoop_y = (minimum_y + maximum_y) * 0.5
    hoop_x = minimum_x + 0.62
    fence.extend(
        [
            add_cylinder(
                "basketball-confirmed-hoop-post",
                (hoop_x, hoop_y, 1.45),
                0.08,
                2.9,
                8,
            ),
            add_cube(
                "basketball-confirmed-backboard",
                (hoop_x + 0.20, hoop_y, 2.62),
                (0.10, 1.28, 0.95),
            ),
            add_torus(
                "basketball-confirmed-hoop",
                (hoop_x + 0.38, hoop_y, 2.34),
                0.28,
                0.035,
                10,
                3,
                (math.pi / 2, 0, 0),
            ),
        ]
    )
    return {"court": court, "green": fence}


def build_bird(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    parts = [add_cube("bird-pergola-base", (0, 0, 0.08), (5.2, 2.2, 0.16))]
    for index in range(9):
        root_x = -2.35 + index * 0.5875
        crown_x = -3.7 + index * 0.925
        height = 2.0 + math.sin(index / 8 * math.pi) * 2.35
        parts.append(
            add_branch(
                f"bird-pergola-open-rod-{index}",
                (root_x, 0, 0.16),
                (crown_x, 0, height),
                0.045,
                6,
            )
        )
    return {"green": parts}


def build_happiness(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    hearts = [
        add_heart_ring("happiness-heart-front", -0.62, 1.00),
        add_heart_ring("happiness-heart-middle", 0.00, 0.98),
        add_heart_ring("happiness-heart-back", 0.62, 0.96),
    ]
    seating = [
        add_cube("happiness-step-low", (2.0, 2.0, 0.18), (5.3, 2.1, 0.36)),
        add_cube("happiness-step-mid", (2.0, 2.45, 0.54), (4.5, 1.2, 0.36)),
        add_cube("happiness-step-high", (2.0, 2.82, 0.90), (3.6, 0.7, 0.36)),
    ]
    planters = [
        add_extruded_polygon(
            "happiness-left-curved-planter",
            [(-4.2, 0.5), (-2.5, 0.2), (-1.8, 1.1), (-2.7, 2.0), (-4.5, 1.7)],
            0.78,
        ),
        add_extruded_polygon(
            "happiness-right-curved-planter",
            [(3.4, 0.0), (5.2, 0.5), (5.4, 1.8), (4.0, 2.3), (3.0, 1.4)],
            0.88,
        ),
    ]
    return {"pink": hearts + seating, "light": planters}


def build_reflecting(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    hardscape = [
        add_cube("pool-base", (0, 0, 0.17), (18.0, 2.15, 0.34)),
        add_cube("pool-left-rim", (0, -1.0, 0.56), (18.25, 0.22, 0.13)),
        add_cube("pool-right-rim", (0, 1.0, 0.56), (18.25, 0.22, 0.13)),
    ]
    bridge = [
        add_cube(
            f"pool-bridge-board-{index}",
            (-3.9 + (index - 3) * 0.34, 0, 0.65),
            (0.28, 2.90, 0.13),
        )
        for index in range(7)
    ]
    return {"dark": hardscape, "wood": bridge}


def build_paving(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    return {"neutral": [add_cube("mixed-paving-slab", (0, -7, 0.05), (94, 14, 0.10))]}


def build_vertical(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    return {
        "green": [
            add_cube("vertical-garden-wall", (0, 0, 3.75), (1.15, 8.2, 7.5)),
            add_cube("vertical-garden-base", (0.39, 0, 1.0), (0.77, 8.2, 2.0)),
        ]
    }


def build_action(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    gold = [
        add_cube("action-platform", (0, 0, 0.06), (2.35, 2.35, 0.12)),
        add_torus(
            "action-outer-ring",
            (0, 0, 0.14),
            1.45,
            0.09,
            12,
            3,
        ),
        add_cube("action-info-board", (0, -0.82, 1.22), (1.65, 0.12, 0.92)),
        add_cube("action-floating-sign", (0, 0, 2.45), (1.15, 0.22, 0.78)),
    ]
    accent: list[bpy.types.Object] = []
    for index, (x, y) in enumerate(
        [(-0.94, -0.94), (0.94, -0.94), (-0.94, 0.94), (0.94, 0.94)]
    ):
        accent.extend(
            [
                add_cube(
                    f"action-planter-{index}",
                    (x, y, 0.28),
                    (0.52, 0.52, 0.48),
                ),
                add_ico(
                    f"action-foliage-{index}",
                    (x, y, 0.70),
                    (0.38, 0.38, 0.38),
                ),
            ]
        )
    return {"gold": gold, "green": accent}


BUILDERS: dict[str, Callable[[dict[str, Any]], dict[str, list[bpy.types.Object]]]] = {
    "shangsheng-wayfinding-totem": build_wayfinding,
    "shangsheng-cafe-pavilion": build_cafe,
    "shangsheng-bicycle-parking": build_bicycle,
    "shangsheng-reading-terrace": build_reading,
    "shangsheng-fountain": build_fountain,
    "shangsheng-main-entry": build_main_entry,
    "huashan-pond-boardwalk": build_pond,
    "huashan-basketball-court": build_basketball,
    "huashan-bird-pergola": build_bird,
    "huashan-happiness-corner": build_happiness,
    "xingfuli-reflecting-pool-hardscape": build_reflecting,
    "xingfuli-mixed-paving": build_paving,
    "xingfuli-vertical-garden": build_vertical,
    "one-square-metre-action": build_action,
}


def build_assets(spec: dict[str, Any]) -> list[dict[str, Any]]:
    assets: list[dict[str, Any]] = []
    for prototype in spec["prototypes"]:
        semantic_slug = prototype["id"].split(":")[-1]
        if semantic_slug == "shangsheng-fountain":
            for instance in prototype["instances"]:
                way_id = int(instance["osmWayId"])
                assets.append(
                    {
                        "semantic": prototype,
                        "semanticSlug": semantic_slug,
                        "outputSlug": f"shangsheng-fountain-osm-{way_id}",
                        "instance": instance,
                        "osmWayId": way_id,
                    }
                )
        else:
            assets.append(
                {
                    "semantic": prototype,
                    "semanticSlug": semantic_slug,
                    "outputSlug": semantic_slug,
                    "instance": prototype["instances"][0],
                }
            )
    return assets


def scene_bounds(
    objects: list[bpy.types.Object],
) -> tuple[Vector, Vector]:
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


def configure_scene(asset: dict[str, Any]) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.display.shading.background_type = "WORLD"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (0.035, 0.043, 0.045)
    scene["asset_id"] = asset["semantic"]["id"]
    scene["output_slug"] = asset["outputSlug"]
    scene["tier"] = "massing"
    scene["model_brief"] = BRIEF_PATH
    scene["geometry_spec"] = str(SPEC_PATH.relative_to(ROOT))
    scene["reference_manifest"] = str(REFERENCE_MANIFEST_PATH.relative_to(ROOT))
    scene["authored_meters_per_scene_unit"] = AUTHORED_METERS_PER_SCENE_UNIT
    scene["origin_contract"] = "ground-center"
    scene["world_placement_baked"] = False
    scene["formal_massing_pass"] = False


def add_preview_ground(objects: list[bpy.types.Object]) -> bpy.types.Object:
    minimum, maximum = scene_bounds(objects)
    span = max(maximum.x - minimum.x, maximum.y - minimum.y, 1.6)
    bpy.ops.mesh.primitive_plane_add(size=span * 1.6, location=(0, 0, -0.025))
    ground = bpy.context.active_object
    ground.name = "test-preview-ground"
    material = bpy.data.materials.new("test-preview-ground-material")
    material.diffuse_color = (0.14, 0.17, 0.18, 1)
    ground.data.materials.append(material)
    return ground


def render_preview(
    objects: list[bpy.types.Object],
    direction: str,
    path: Path,
) -> None:
    minimum, maximum = scene_bounds(objects)
    center = (minimum + maximum) * 0.5
    span = max(
        maximum.x - minimum.x,
        maximum.y - minimum.y,
        maximum.z - minimum.z,
        1.0,
    )
    offset = (
        Vector((span * 0.95, -span * 1.18, span * 0.78))
        if direction == "canonical"
        else Vector((-span * 1.08, span * 0.64, span * 0.68))
    )
    bpy.ops.object.camera_add(location=center + offset)
    camera = bpy.context.active_object
    camera.name = f"test-{direction}-camera"
    camera.data.type = "ORTHO"
    framing_scale = (
        1.78
        if bpy.context.scene.get("output_slug")
        in {"xingfuli-vertical-garden", "one-square-metre-action"}
        else 1.42
    )
    camera.data.ortho_scale = span * framing_scale
    target = center + Vector((0, 0, (maximum.z - minimum.z) * 0.03))
    camera.rotation_euler = (
        target - camera.location
    ).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)


def export_glb(path: Path, objects: list[bpy.types.Object]) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
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
    if contents[:4] != b"glTF" or struct.unpack_from("<I", contents, 4)[0] != 2:
        raise RuntimeError(f"{path} 不是 glTF 2.0 GLB")
    json_length = struct.unpack_from("<I", contents, 12)[0]
    json_type = struct.unpack_from("<I", contents, 16)[0]
    if json_type != 0x4E4F534A:
        raise RuntimeError(f"{path} 缺少 GLB JSON")
    gltf = json.loads(contents[20 : 20 + json_length].decode("utf8"))
    triangles = 0
    bounds_min = [math.inf, math.inf, math.inf]
    bounds_max = [-math.inf, -math.inf, -math.inf]
    for mesh in gltf.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            index = primitive.get("indices")
            if index is None:
                index = primitive["attributes"]["POSITION"]
            triangles += gltf["accessors"][index]["count"] // 3
            accessor = gltf["accessors"][primitive["attributes"]["POSITION"]]
            for axis in range(3):
                bounds_min[axis] = min(bounds_min[axis], accessor["min"][axis])
                bounds_max[axis] = max(bounds_max[axis], accessor["max"][axis])
    transformed_nodes = [
        node.get("name")
        for node in gltf.get("nodes", [])
        if any(key in node for key in ("translation", "rotation", "scale", "matrix"))
    ]
    material_base_colors = {
        material.get("name", f"material-{index}"): (
            material.get("pbrMetallicRoughness", {}).get("baseColorFactor")
        )
        for index, material in enumerate(gltf.get("materials", []))
    }
    return {
        "sha256": file_sha256(path),
        "bytes": len(contents),
        "nodes": len(gltf.get("nodes", [])),
        "meshes": len(gltf.get("meshes", [])),
        "materials": len(gltf.get("materials", [])),
        "materialBaseColors": material_base_colors,
        "images": len(gltf.get("images", [])),
        "textures": len(gltf.get("textures", [])),
        "animations": len(gltf.get("animations", [])),
        "triangles": triangles,
        "bounds": {
            "min": [round(value, 6) for value in bounds_min],
            "max": [round(value, 6) for value in bounds_max],
        },
        "transformedNodes": transformed_nodes,
    }


def verify_budget(
    slug: str,
    audit: dict[str, Any],
    budget: dict[str, Any],
) -> None:
    checks = {
        "triangles": (audit["triangles"], int(budget["maxTriangles"])),
        "nodes": (audit["nodes"], int(budget["maxNodes"])),
        "materials": (audit["materials"], int(budget["maxMaterials"])),
        "images": (audit["images"], int(budget["maxImages"])),
        "bytes": (audit["bytes"], int(budget["maxBinaryBytes"])),
    }
    failures = [
        f"{key}={actual}>{maximum}"
        for key, (actual, maximum) in checks.items()
        if actual > maximum
    ]
    if audit["textures"]:
        failures.append(f"textures={audit['textures']}>0")
    default_export_gray = [0.800000011920929] * 3 + [1]
    if not audit["materialBaseColors"]:
        failures.append("materialBaseColors=missing")
    for material_name, base_color in audit["materialBaseColors"].items():
        if base_color is None:
            failures.append(f"{material_name}.baseColorFactor=missing")
        elif all(
            math.isclose(value, default, abs_tol=1e-6)
            for value, default in zip(base_color, default_export_gray)
        ):
            failures.append(f"{material_name}.baseColorFactor=default-export-gray")
    if audit["animations"]:
        failures.append(f"animations={audit['animations']}>0")
    if audit["transformedNodes"]:
        failures.append(f"transformedNodes={audit['transformedNodes']}")
    if failures:
        raise RuntimeError(f"{slug} 超出 Massing 合同：{', '.join(failures)}")


def quality_boundary(asset: dict[str, Any]) -> dict[str, Any]:
    evidence = asset["semantic"]["existingEvidence"]
    observed = list(evidence.get("observed", []))
    inferred = [
        "Massing component dimensions are simplified from the documented runtime envelope.",
        "No world placement, yaw, collision proxy or site terrain is baked into this GLB.",
    ]
    unknown = [
        "surveyed dimensions",
        "2026-later field changes",
    ]
    if asset["semanticSlug"] == "shangsheng-fountain":
        inferred = [
            "The neutral flush polygon preserves only the OSM footprint.",
            "No continuous water plane, high rim or jet layout is claimed.",
        ]
        unknown.extend([
            "per-way fountain family binding",
            "water state",
            "rim and nozzle form",
        ])
    if asset["semanticSlug"] == "huashan-happiness-corner":
        inferred = [
            "Heart-ring depth spacing and terrace dimensions are visual calibration values, not survey data.",
            "Curved planters use low-poly footprint proxies; seasonal planting is excluded.",
        ]
        unknown.extend(["rear structure", "map pivot and yaw overlay", "terrain grade"])
    if asset["semanticSlug"] == "huashan-basketball-court":
        inferred.append(
            "Fence height, entrance width and confirmed-end basket dimensions remain inferred."
        )
        unknown.extend(["second basket", "photo-to-OSM orientation overlay"])
    if asset["semanticSlug"] == "one-square-metre-action":
        observed = [
            "Current product source is the geometry and interaction authority.",
            "Public activity images prove program context only, not installation shape.",
        ]
        inferred = [
            "Static Massing omits runtime Float motion and click hit-area behavior."
        ]
        unknown.extend(["runtime float envelope after placement transform"])
    return {
        "classification": evidence["classification"],
        "observed": observed,
        "inferred": inferred,
        "unknown": unknown,
        "sources": evidence["sources"],
    }


def generate(asset: dict[str, Any]) -> dict[str, Any]:
    reset_scene()
    configure_scene(asset)
    groups = BUILDERS[asset["semanticSlug"]](asset)
    objects: list[bpy.types.Object] = []
    for group_name, parts in groups.items():
        material = create_material(asset["outputSlug"], group_name)
        objects.append(join_group(asset["outputSlug"], group_name, parts, material))
    for obj in objects:
        obj["asset_id"] = asset["semantic"]["id"]
        obj["output_slug"] = asset["outputSlug"]
        obj["tier"] = "massing"
        obj["evidence_classification"] = asset["semantic"]["existingEvidence"][
            "classification"
        ]
        obj["identity_allowed"] = bool(
            asset["semantic"]["identityGate"]["mayEnterIdentity"]
        )
        obj["formal_massing_pass"] = False

    slug = asset["outputSlug"]
    blend_path = SOURCE_DIR / f"{slug}-massing.blend"
    glb_path = RUNTIME_DIR / f"{slug}-massing.glb"
    canonical_path = PREVIEW_DIR / f"test_{slug}-massing-canonical.png"
    side_path = PREVIEW_DIR / f"test_{slug}-massing-side.png"
    record_path = RECORD_DIR / f"{slug}-massing.json"

    export_glb(glb_path, objects)
    audit = parse_glb(glb_path)
    verify_budget(slug, audit, asset["semantic"]["budget"])
    add_preview_ground(objects)
    render_preview(objects, "canonical", canonical_path)
    render_preview(objects, "side", side_path)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    identity_gate = asset["semantic"]["identityGate"]
    record = {
        "version": 1,
        "auditedAt": AUDITED_AT,
        "assetId": asset["semantic"]["id"],
        "semanticSlug": asset["semanticSlug"],
        "outputSlug": slug,
        "tier": "massing",
        "status": "blender-glb-generated-runtime-gate-pending",
        "formalMassingPass": False,
        "modelBrief": BRIEF_PATH,
        "geometrySpec": str(SPEC_PATH.relative_to(ROOT)),
        "referenceManifest": str(REFERENCE_MANIFEST_PATH.relative_to(ROOT)),
        "generator": GENERATOR_PATH,
        "instance": asset["instance"],
        "osmWayId": asset.get("osmWayId"),
        "originContract": {
            "origin": [0, 0, 0],
            "meaning": "prototype-ground-center",
            "blenderUp": "Z",
            "runtimeUp": "Y",
            "worldPlacementBaked": False,
            "authoredMetersPerSceneUnit": AUTHORED_METERS_PER_SCENE_UNIT,
            "surveyedMeters": False,
        },
        "budget": asset["semantic"]["budget"],
        "outputs": {
            "blend": str(blend_path.relative_to(ROOT)),
            "glb": str(glb_path.relative_to(ROOT)),
            "previews": {
                "canonical": str(canonical_path.relative_to(ROOT)),
                "side": str(side_path.relative_to(ROOT)),
            },
        },
        "glb": audit,
        "qualityBoundary": quality_boundary(asset),
        "identityGate": identity_gate,
        "runtimeGate": {
            "status": "pending",
            "gallery": "not-integrated-in-this-task",
            "mapPlacement": "not-validated-in-this-task",
            "collisionAndPassage": "not-validated-in-this-task",
        },
    }
    if asset["semanticSlug"] == "huashan-happiness-corner":
        record["supersedes"] = {
            "forbiddenLegacyForm": "three-portals-plus-discrete-flower-clusters",
            "replacementEvidence": (
                "2026 official multi-view pink concentric heart rings, "
                "tiered seating and curved light planters"
            ),
        }
    if asset["semanticSlug"] == "huashan-basketball-court":
        record["basketEvidenceBoundary"] = {
            "generated": "one photographed green cantilever basket silhouette",
            "notGeneratedAsConfirmed": "second basket",
        }
    if asset["semanticSlug"] == "one-square-metre-action":
        record["productOriginalTrack"] = True
        record["publicImagesUsedForGeometry"] = False
    record_path.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )
    return record


def write_manifest(records: list[dict[str, Any]]) -> None:
    manifest = {
        "version": 1,
        "generatedAt": AUDITED_AT,
        "status": "massing-generated-runtime-and-independent-review-pending",
        "formalMassingPassCount": 0,
        "semanticPrototypeCount": len({record["assetId"] for record in records}),
        "assetCount": len(records),
        "fountainInstanceAssetCount": sum(
            record["semanticSlug"] == "shangsheng-fountain"
            for record in records
        ),
        "modelBrief": BRIEF_PATH,
        "geometrySpec": str(SPEC_PATH.relative_to(ROOT)),
        "referenceManifest": str(REFERENCE_MANIFEST_PATH.relative_to(ROOT)),
        "generator": GENERATOR_PATH,
        "totalGlbBytes": sum(record["glb"]["bytes"] for record in records),
        "totalTriangles": sum(record["glb"]["triangles"] for record in records),
        "zeroImageTextureAssetCount": sum(
            record["glb"]["images"] == 0 and record["glb"]["textures"] == 0
            for record in records
        ),
        "rootTransformCleanAssetCount": sum(
            not record["glb"]["transformedNodes"] for record in records
        ),
        "runtimeIntegration": "intentionally-not-performed",
        "assets": records,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )


def main() -> None:
    args = parse_arguments()
    # 产物由确定性生成器覆盖；关闭 Blender 自动 .blend1 备份，避免重复批次污染。
    bpy.context.preferences.filepaths.save_version = 0
    for directory in (SOURCE_DIR, RUNTIME_DIR, PREVIEW_DIR, RECORD_DIR):
        directory.mkdir(parents=True, exist_ok=True)
    spec = json.loads(SPEC_PATH.read_text(encoding="utf8"))
    assets = build_assets(spec)
    selected = [
        asset
        for asset in assets
        if args.asset is None or asset["outputSlug"] == args.asset
    ]
    if not selected:
        available = ", ".join(asset["outputSlug"] for asset in assets)
        raise ValueError(f"未知 asset slug：{args.asset}；可用值：{available}")
    records = [generate(asset) for asset in selected]
    if args.asset is None:
        if len(records) != 15 or len({record["assetId"] for record in records}) != 14:
            raise RuntimeError("批次计数不符合 14 个语义 / 15 个资产合同")
        write_manifest(records)


if __name__ == "__main__":
    main()
