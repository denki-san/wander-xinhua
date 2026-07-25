"""生成证据充分的幸福里当前街具模型。

本生成器只处理本文件声明的四个场地专用资产，不写入正式地图 registry。
每个可编辑 Blender master 派生唯一 visible-low GLB；远距离由运行时隐藏。
"""

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
PACKAGE_SLUG = "xingfuli-current-street-furniture"
SOURCE_DIR = ROOT / "assets/models/source/nonbuilding" / PACKAGE_SLUG
RUNTIME_DIR = ROOT / "public/models/nonbuilding" / PACKAGE_SLUG
PREVIEW_DIR = ROOT / "test_artifacts/nonbuilding" / PACKAGE_SLUG
RECORD_DIR = ROOT / "docs/research/build-records/nonbuilding" / PACKAGE_SLUG
MANIFEST_PATH = (
    ROOT / "docs/research/xingfuli-current-street-furniture-model-manifest.json"
)
REFERENCE_MANIFEST = (
    "docs/research/"
    "xingfuli-current-street-furniture-reference-manifest.json"
)
MODEL_BRIEF = (
    "docs/research/xingfuli-current-street-furniture-model-brief.md"
)
DECISION_LOG = (
    "docs/research/xingfuli-current-street-furniture-decision-log.md"
)
GENERATOR_PATH = "scripts/create_xingfuli_current_street_furniture_models.py"
AUDITED_AT = "2026-07-25"
AUTHORED_METERS_PER_SCENE_UNIT = 2.7

COLORS = {
    "dark-stone": (0.075, 0.085, 0.082, 1.0),
    "gray-stone": (0.20, 0.22, 0.21, 1.0),
    "planter-metal": (0.29, 0.20, 0.13, 1.0),
    "soil": (0.10, 0.065, 0.040, 1.0),
    "foliage-dark": (0.13, 0.28, 0.11, 1.0),
    "foliage-light": (0.30, 0.48, 0.18, 1.0),
}

COMMON_SOURCES = [
    REFERENCE_MANIFEST,
    (
        "docs/research/assets/nonbuilding-evidence-pilot/"
        "xingfuli-current-street-furniture/"
        "xingfuli-water-edge-furniture-2026.webp"
    ),
    (
        "docs/research/assets/nonbuilding-evidence-pilot/"
        "xingfuli-current-street-furniture/"
        "xingfuli-stone-seat-family-2026.webp"
    ),
]


def prototype(
    slug: str,
    evidence: str,
    observed: list[str],
    recognizers: list[str],
    sources: list[str],
    target_dimensions: list[float],
    max_triangles: int = 1500,
) -> dict[str, Any]:
    return {
        "id": f"site:street-furniture:xingfuli:{slug}",
        "slug": slug,
        "family": "street-furniture",
        "siteBinding": "xingfuli",
        "evidence": evidence,
        "observed": observed,
        "inferred": [
            "Dimensions are visually estimated from people and paving modules.",
            "Unseen rear and underside construction remain conservative.",
            "Material family is inferred from colour and reflectance only.",
        ],
        "unknown": [
            "manufacturer and product model",
            "surveyed dimensions and exact material",
            "hidden fasteners, underside and drainage",
            "field condition after the 2025 post",
        ],
        "recognizers": recognizers,
        "sources": sources,
        "targetDimensionsSceneUnits": target_dimensions,
        "budget": {
            "maxTriangles": max_triangles,
            "maxNodes": 4,
            "maxMaterials": 4,
            "maxImages": 0,
            "maxBinaryBytes": 131072,
        },
    }


PROTOTYPES = [
    prototype(
        "xingfuli-pointed-entry-bollard",
        "observed-current-xingfuli-entry",
        [
            "The current entrance image repeatedly shows a dark square shaft "
            "with a four-slope pointed cap.",
            "People and repeated instances support a knee-to-thigh-height scale "
            "range and separated placement.",
        ],
        [
            "dark square shaft",
            "four-slope pointed cap",
            "slightly wider low plinth",
        ],
        [
            REFERENCE_MANIFEST,
            (
                "docs/research/assets/nonbuilding-evidence-pilot/"
                "xingfuli-current-street-furniture/"
                "xingfuli-entry-bollards-2026.webp"
            ),
        ],
        [0.16, 0.16, 0.30],
        200,
    ),
    prototype(
        "xingfuli-water-edge-stone-seat-round",
        "observed-current-xingfuli-water-edge",
        [
            "The water-edge images show low, dark, near-spherical furniture.",
            "A close instance supports a subtly flattened ground contact.",
        ],
        [
            "near-spherical silhouette",
            "flattened ground contact",
            "subtle low-frequency asymmetry",
        ],
        COMMON_SOURCES,
        [0.23, 0.23, 0.21],
        600,
    ),
    prototype(
        "xingfuli-water-edge-stone-seat-long",
        "observed-current-xingfuli-water-edge",
        [
            "Multiple water-edge views show a low elongated rounded seat.",
            "Repeated instances support rounded ends and a gently flattened top.",
        ],
        [
            "elongated capsule silhouette",
            "rounded unequal ends",
            "low gently flattened sitting surface",
        ],
        COMMON_SOURCES,
        [0.48, 0.24, 0.17],
        800,
    ),
    prototype(
        "xingfuli-water-edge-slim-planter",
        "observed-current-xingfuli-water-edge",
        [
            "Several water-lane views repeatedly show slim rectangular planters.",
            "The closest view supports a raised rim, visible soil and unequal "
            "plant heights.",
        ],
        [
            "slim rectangular metal trough",
            "raised rim and visible soil",
            "three unequal deterministic plant clusters",
        ],
        [
            REFERENCE_MANIFEST,
            (
                "docs/research/assets/nonbuilding-evidence-pilot/"
                "xingfuli-current-street-furniture/"
                "xingfuli-water-lane-planters-2026.webp"
            ),
            (
                "docs/research/assets/nonbuilding-evidence-pilot/"
                "xingfuli-current-street-furniture/"
                "xingfuli-water-lane-planters-depth-2026.webp"
            ),
            (
                "docs/research/assets/nonbuilding-evidence-pilot/"
                "xingfuli-current-street-furniture/"
                "xingfuli-water-edge-furniture-2026.webp"
            ),
            (
                "docs/research/assets/nonbuilding-evidence-pilot/"
                "xingfuli-current-street-furniture/"
                "xingfuli-water-edge-planters-2026.webp"
            ),
        ],
        [0.39, 0.14, 0.32],
        1200,
    ),
]


def parse_arguments() -> argparse.Namespace:
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset", help="只生成一个冻结范围内的 slug")
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


def configure_scene(prototype_data: dict[str, Any]) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.studio_light = "paint.sl"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.display.shading.background_type = "WORLD"
    scene.display.shading.show_specular_highlight = True
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (0.055, 0.065, 0.070)
    scene["asset_id"] = prototype_data["id"]
    scene["site_binding"] = "xingfuli"
    scene["source_tier"] = "editable-hero-master"
    scene["runtime_tier"] = "visible-low"
    scene["runtime_states"] = "visible-low,hidden"
    scene["model_brief"] = MODEL_BRIEF
    scene["reference_manifest"] = REFERENCE_MANIFEST
    scene["authored_meters_per_scene_unit"] = (
        AUTHORED_METERS_PER_SCENE_UNIT
    )
    scene["origin_contract"] = "ground-center"
    scene["runtime_integration"] = "isolated-qa-only"
    scene["building_tiers"] = (
        "not-applicable-by-nonbuilding-two-state-contract"
    )


def material(
    slug: str,
    key: str,
    roughness: float | None = None,
    metallic: float | None = None,
) -> bpy.types.Material:
    value = bpy.data.materials.new(f"{slug}-{key}-material")
    color = COLORS[key]
    value.diffuse_color = color
    if roughness is None:
        roughness = 0.70 if "stone" in key else 0.60
    if metallic is None:
        metallic = 0.0 if "stone" in key or "foliage" in key else 0.35
    value.roughness = roughness
    value.metallic = metallic
    value.use_nodes = True
    principled = value.node_tree.nodes.get("Principled BSDF")
    if principled is None:
        raise RuntimeError(f"{value.name} 缺少 Principled BSDF")
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = metallic
    return value


def add_cube(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    rotation: tuple[float, float, float] = (0, 0, 0),
    bevel_width: float = 0.0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if bevel_width > 0:
        modifier = obj.modifiers.new(f"{name}-edge-softening", "BEVEL")
        modifier.width = bevel_width
        modifier.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj


def add_cone(
    name: str,
    location: tuple[float, float, float],
    radius_one: float,
    radius_two: float,
    depth: float,
    vertices: int,
    rotation: tuple[float, float, float] = (0, 0, 0),
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


def add_ico(
    name: str,
    scale: tuple[float, float, float],
    subdivisions: int,
    ground_clamp: float | None = None,
    top_clamp: float | None = None,
    asymmetry: float = 0.0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions,
        radius=1,
        location=(0, 0, 0),
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for index, vertex in enumerate(obj.data.vertices):
        if asymmetry:
            vertex.co.x *= 1 + asymmetry * math.sin(index * 1.713)
            vertex.co.y *= 1 + asymmetry * 0.7 * math.cos(index * 2.117)
            vertex.co.z *= 1 + asymmetry * 0.4 * math.sin(index * 0.937)
        if ground_clamp is not None:
            vertex.co.z = max(vertex.co.z, ground_clamp)
        if top_clamp is not None:
            vertex.co.z = min(vertex.co.z, top_clamp)
    minimum_z = min(vertex.co.z for vertex in obj.data.vertices)
    for vertex in obj.data.vertices:
        vertex.co.z -= minimum_z
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    obj.data.update()
    return obj


def add_tapered_branch(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius_start: float,
    radius_end: float,
    vertices: int = 6,
) -> bpy.types.Object:
    start_vector = Vector(start)
    end_vector = Vector(end)
    direction = end_vector - start_vector
    midpoint = (start_vector + end_vector) * 0.5
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_start,
        radius2=radius_end,
        depth=direction.length,
        location=midpoint,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def join_group(
    slug: str,
    group_name: str,
    parts: list[bpy.types.Object],
    group_material: bpy.types.Material,
) -> bpy.types.Object:
    if not parts:
        raise RuntimeError(f"{slug}:{group_name} 没有几何")
    for part in parts:
        part.data.materials.clear()
        part.data.materials.append(group_material)
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    if len(parts) > 1:
        bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = f"{slug}-{group_name}"
    obj.data.name = f"{slug}-{group_name}-mesh"
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def build_bollard(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    body = [
        add_cube(
            "bollard-low-plinth",
            (0, 0, 0.015),
            (0.17, 0.17, 0.03),
            bevel_width=0.006,
        ),
        add_cube(
            "bollard-square-shaft",
            (0, 0, 0.125),
            (0.15, 0.15, 0.20),
            bevel_width=0.005,
        ),
        add_cone(
            "bollard-pointed-cap",
            (0, 0, 0.255),
            0.1061,
            0.0,
            0.09,
            4,
            (0, 0, math.pi / 4),
        ),
    ]
    return {"dark-stone": body}


def build_round_seat(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    seat = add_ico(
        "round-seat-body",
        (0.115, 0.115, 0.115),
        3,
        ground_clamp=-0.095,
        asymmetry=0.018,
    )
    return {"dark-stone": [seat]}


def build_long_seat(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    seat = add_ico(
        "long-seat-body",
        (0.24, 0.12, 0.10),
        3,
        ground_clamp=-0.070,
        top_clamp=0.095,
        asymmetry=0.022,
    )
    return {"dark-stone": [seat]}


def build_planter(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    metal = [
        add_cube(
            "planter-body",
            (0, 0, 0.050),
            (0.34, 0.12, 0.10),
            bevel_width=0.006,
        ),
        add_cube(
            "planter-rim-front",
            (0, -0.061, 0.101),
            (0.355, 0.012, 0.026),
            bevel_width=0.003,
        ),
        add_cube(
            "planter-rim-back",
            (0, 0.061, 0.101),
            (0.355, 0.012, 0.026),
            bevel_width=0.003,
        ),
        add_cube(
            "planter-rim-left",
            (-0.174, 0, 0.101),
            (0.012, 0.11, 0.026),
            bevel_width=0.003,
        ),
        add_cube(
            "planter-rim-right",
            (0.174, 0, 0.101),
            (0.012, 0.11, 0.026),
            bevel_width=0.003,
        ),
    ]
    soil = [
        add_cube(
            "planter-visible-soil",
            (0, 0, 0.103),
            (0.32, 0.09, 0.012),
        )
    ]
    foliage_dark: list[bpy.types.Object] = []
    foliage_light: list[bpy.types.Object] = []
    cluster_specs = [
        (-0.115, -0.006, 0.185, 0.085, 0.045, 0.070, "dark"),
        (0.000, 0.008, 0.215, 0.095, 0.050, 0.100, "light"),
        (0.120, -0.004, 0.180, 0.080, 0.043, 0.065, "dark"),
    ]
    for index, (x, y, z, sx, sy, sz, palette) in enumerate(cluster_specs):
        leaves = add_ico(
            f"planter-leaves-{index}",
            (sx, sy, sz),
            1,
            asymmetry=0.055,
        )
        leaf_minimum = min(vertex.co.z for vertex in leaves.data.vertices)
        leaf_maximum = max(vertex.co.z for vertex in leaves.data.vertices)
        leaf_height = leaf_maximum - leaf_minimum
        leaf_bottom = z - leaf_height * 0.5
        leaves.location = (x, y, leaf_bottom)
        bpy.ops.object.select_all(action="DESELECT")
        leaves.select_set(True)
        bpy.context.view_layer.objects.active = leaves
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        stem = add_tapered_branch(
            f"planter-stem-{index}",
            (x, y, 0.108),
            (
                x + 0.008 * (index - 1),
                y,
                max(0.130, leaf_bottom + 0.025),
            ),
            0.008,
            0.004,
            6,
        )
        target = foliage_dark if palette == "dark" else foliage_light
        target.extend([stem, leaves])
    return {
        "planter-metal": metal,
        "soil": soil,
        "foliage-dark": foliage_dark,
        "foliage-light": foliage_light,
    }


BUILDERS: dict[
    str,
    Callable[[dict[str, Any]], dict[str, list[bpy.types.Object]]],
] = {
    "xingfuli-pointed-entry-bollard": build_bollard,
    "xingfuli-water-edge-stone-seat-round": build_round_seat,
    "xingfuli-water-edge-stone-seat-long": build_long_seat,
    "xingfuli-water-edge-slim-planter": build_planter,
}


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


def add_preview_ground(objects: list[bpy.types.Object]) -> bpy.types.Object:
    minimum, maximum = scene_bounds(objects)
    span = max(maximum.x - minimum.x, maximum.y - minimum.y, 0.55)
    bpy.ops.mesh.primitive_plane_add(size=span * 2.6, location=(0, 0, -0.006))
    ground = bpy.context.active_object
    ground.name = "test-preview-ground"
    ground_material = bpy.data.materials.new("test-preview-ground-material")
    ground_material.diffuse_color = (0.19, 0.21, 0.22, 1)
    ground.data.materials.append(ground_material)
    return ground


def render_preview(
    objects: list[bpy.types.Object],
    direction: str,
    path: Path,
) -> None:
    minimum, maximum = scene_bounds(objects)
    center = (minimum + maximum) * 0.5
    width = maximum.x - minimum.x
    depth = maximum.y - minimum.y
    height = maximum.z - minimum.z
    span = max(width, depth, height, 0.24)
    if direction == "canonical":
        offset = Vector((span * 1.10, -span * 1.45, span * 0.86))
        ortho_multiplier = 1.34
    elif direction == "side":
        offset = Vector((-span * 1.45, -span * 0.74, span * 0.72))
        ortho_multiplier = 1.36
    else:
        offset = Vector((span * 0.36, -span * 1.55, span * 0.45))
        ortho_multiplier = 1.16
    bpy.ops.object.camera_add(location=center + offset)
    camera = bpy.context.active_object
    camera.name = f"test-{direction}-camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = span * ortho_multiplier
    target = center + Vector((0, 0, height * 0.015))
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
    if struct.unpack_from("<I", contents, 16)[0] != 0x4E4F534A:
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
        material_data.get("name", f"material-{index}"): (
            material_data.get("pbrMetallicRoughness", {}).get("baseColorFactor")
        )
        for index, material_data in enumerate(gltf.get("materials", []))
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
        "skins": len(gltf.get("skins", [])),
        "triangles": triangles,
        "bounds": {
            "min": [round(value, 6) for value in bounds_min],
            "max": [round(value, 6) for value in bounds_max],
        },
        "transformedNodes": transformed_nodes,
    }


def verify_budget(
    prototype_data: dict[str, Any],
    audit: dict[str, Any],
) -> None:
    budget = prototype_data["budget"]
    failures = []
    for key, maximum in (
        ("triangles", budget["maxTriangles"]),
        ("nodes", budget["maxNodes"]),
        ("materials", budget["maxMaterials"]),
        ("images", budget["maxImages"]),
        ("bytes", budget["maxBinaryBytes"]),
    ):
        if audit[key] > maximum:
            failures.append(f"{key}={audit[key]}>{maximum}")
    if audit["textures"]:
        failures.append(f"textures={audit['textures']}>0")
    if audit["animations"]:
        failures.append(f"animations={audit['animations']}>0")
    if audit["skins"]:
        failures.append(f"skins={audit['skins']}>0")
    if audit["transformedNodes"]:
        failures.append(f"transformedNodes={audit['transformedNodes']}")
    if audit["bounds"]["min"][1] < -0.0001:
        failures.append(f"runtimeGroundMinY={audit['bounds']['min'][1]}<0")
    if not audit["materialBaseColors"]:
        failures.append("materialBaseColors=missing")
    if failures:
        raise RuntimeError(
            f"{prototype_data['slug']} 超出 visible-low 合同："
            + ", ".join(failures)
        )


def generate(prototype_data: dict[str, Any]) -> dict[str, Any]:
    reset_scene()
    configure_scene(prototype_data)
    groups = BUILDERS[prototype_data["slug"]](prototype_data)
    objects = [
        join_group(
            prototype_data["slug"],
            group_name,
            parts,
            material(prototype_data["slug"], group_name),
        )
        for group_name, parts in groups.items()
    ]
    for obj in objects:
        obj["asset_id"] = prototype_data["id"]
        obj["site_binding"] = "xingfuli"
        obj["source_tier"] = "editable-hero-master"
        obj["runtime_tier"] = "visible-low"
        obj["evidence"] = prototype_data["evidence"]

    slug = prototype_data["slug"]
    blend_path = SOURCE_DIR / f"{slug}.blend"
    glb_path = RUNTIME_DIR / f"{slug}-visible-low.glb"
    canonical_path = PREVIEW_DIR / f"test_{slug}-canonical.png"
    side_path = PREVIEW_DIR / f"test_{slug}-side.png"
    detail_path = PREVIEW_DIR / f"test_{slug}-detail.png"
    record_path = RECORD_DIR / f"{slug}-visible-low.json"

    export_glb(glb_path, objects)
    audit = parse_glb(glb_path)
    verify_budget(prototype_data, audit)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    blend_sha256 = file_sha256(blend_path)

    preview_ground = add_preview_ground(objects)
    render_preview(objects, "canonical", canonical_path)
    render_preview(objects, "side", side_path)
    render_preview(objects, "detail", detail_path)
    bpy.data.objects.remove(preview_ground, do_unlink=True)

    record = {
        "version": 1,
        "auditedAt": AUDITED_AT,
        "assetId": prototype_data["id"],
        "slug": slug,
        "family": prototype_data["family"],
        "siteBinding": prototype_data["siteBinding"],
        "status": "blender-glb-generated-runtime-qa-pending",
        "sourceTier": "editable-hero-master",
        "runtimeTier": "visible-low",
        "runtimeStates": ["visible-low", "hidden"],
        "buildingTierCompatibility": {
            "hero": "editable-master-only",
            "identity": "not-applicable-by-nonbuilding-two-state-contract",
            "massing": "not-applicable-by-nonbuilding-two-state-contract",
        },
        "modelBrief": MODEL_BRIEF,
        "referenceManifest": REFERENCE_MANIFEST,
        "decisionLog": DECISION_LOG,
        "generator": GENERATOR_PATH,
        "buildCommand": (
            "/opt/homebrew/bin/blender --background --python "
            f"{GENERATOR_PATH} -- --asset {slug}"
        ),
        "evidence": prototype_data["evidence"],
        "recognizers": prototype_data["recognizers"],
        "qualityBoundary": {
            "observed": prototype_data["observed"],
            "inferred": prototype_data["inferred"],
            "unknown": prototype_data["unknown"],
            "sources": prototype_data["sources"],
        },
        "originContract": {
            "origin": [0, 0, 0],
            "meaning": "asset-ground-center",
            "blenderUp": "Z",
            "runtimeUp": "Y",
            "blenderFront": "-Y",
            "worldPlacementBaked": False,
            "authoredMetersPerSceneUnit": AUTHORED_METERS_PER_SCENE_UNIT,
            "surveyedMeters": False,
        },
        "targetDimensionsSceneUnits": prototype_data[
            "targetDimensionsSceneUnits"
        ],
        "budget": prototype_data["budget"],
        "outputs": {
            "blend": str(blend_path.relative_to(ROOT)),
            "blendSha256": blend_sha256,
            "glb": str(glb_path.relative_to(ROOT)),
            "previews": {
                "canonical": str(canonical_path.relative_to(ROOT)),
                "side": str(side_path.relative_to(ROOT)),
                "detail": str(detail_path.relative_to(ROOT)),
            },
        },
        "glb": audit,
        "runtimeGate": {
            "status": "pending",
            "qaRoute": f"/nonbuilding-evidence-qa?asset={slug}",
            "productionRegistry": "intentionally-not-integrated",
            "productionManifest": "intentionally-not-modified",
            "mapPlacement": "not-performed",
            "collision": "not-performed",
            "twoStateDistanceCheck": "pending",
            "performance": "pending",
        },
        "mcpGate": {
            "status": "pending",
            "masterSceneRead": False,
            "viewportReview": False,
            "generatorWritebackRequired": True,
        },
    }
    record_path.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )
    return record


def write_manifest(records: list[dict[str, Any]]) -> None:
    manifest = {
        "version": 1,
        "generatedAt": AUDITED_AT,
        "status": "visible-low-generated-runtime-qa-pending",
        "package": PACKAGE_SLUG,
        "assetCount": len(records),
        "runtimeStates": ["visible-low", "hidden"],
        "modelBrief": MODEL_BRIEF,
        "referenceManifest": REFERENCE_MANIFEST,
        "decisionLog": DECISION_LOG,
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
        "runtimeIntegration": "isolated-qa-only",
        "productionRegistry": "intentionally-not-modified",
        "productionManifest": "intentionally-not-modified",
        "assets": records,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )


def main() -> None:
    args = parse_arguments()
    for directory in (SOURCE_DIR, RUNTIME_DIR, PREVIEW_DIR, RECORD_DIR):
        directory.mkdir(parents=True, exist_ok=True)
    selected = [
        prototype_data
        for prototype_data in PROTOTYPES
        if args.asset is None or prototype_data["slug"] == args.asset
    ]
    if not selected:
        available = ", ".join(item["slug"] for item in PROTOTYPES)
        raise ValueError(f"未知资产：{args.asset}；可用：{available}")
    records = [generate(prototype_data) for prototype_data in selected]
    if args.asset is None:
        if len(records) != 4:
            raise RuntimeError("幸福里当前街具批次必须严格为 4 个资产")
        write_manifest(records)


if __name__ == "__main__":
    main()
