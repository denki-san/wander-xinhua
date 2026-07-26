#!/usr/bin/env python3
"""快速生成新华路三辆证据驱动的低模自行车。"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = "xinhua-bicycle-family"
SOURCE_DIR = ROOT / "assets/models/source/nonbuilding" / PACKAGE
GLB_DIR = ROOT / "public/models/nonbuilding" / PACKAGE
ARTIFACT_DIR = ROOT / "test_artifacts/nonbuilding" / PACKAGE
RECORD_DIR = ROOT / "docs/research/build-records/nonbuilding" / PACKAGE

ASSETS = {
    "xinhua-commuter-bicycle": {
        "label": "新华路绿色通勤自行车",
        "variant": "commuter",
        "frame": "#39764e",
        "accent": "#212622",
        "seat": "#24211e",
        "cues": ["green diamond frame", "flat handlebar", "compact rear rack"],
    },
    "xinhua-shared-bicycle": {
        "label": "新华路蓝色共享自行车",
        "variant": "shared",
        "frame": "#2996c7",
        "accent": "#20262a",
        "seat": "#31363a",
        "cues": ["blue step-through frame", "open front basket", "rear fender"],
    },
    "xinhua-vintage-bicycle": {
        "label": "新华路银橙复古自行车",
        "variant": "vintage",
        "frame": "#b7bcc0",
        "accent": "#d65a28",
        "seat": "#6e3f29",
        "cues": ["silver upper frame", "orange-red seat-tube accent", "brown cockpit"],
    },
}

WHEEL_RADIUS = 0.13
WHEEL_X = 0.19
TIRE_RADIUS = 0.013


def parse_args() -> argparse.Namespace:
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset", choices=sorted(ASSETS))
    return parser.parse_args(argv)


def hex_color(value: str) -> tuple[float, float, float, float]:
    value = value.lstrip("#")
    return tuple(int(value[index : index + 2], 16) / 255 for index in (0, 2, 4)) + (1.0,)


def material(name: str, color: str, metallic: float = 0.0, roughness: float = 0.65):
    result = bpy.data.materials.new(name)
    result.diffuse_color = hex_color(color)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = hex_color(color)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    return result


def assign(obj, mat):
    obj.data.materials.append(mat)
    obj["qa_role"] = "runtime-geometry"
    return obj


def cylinder_between(name: str, start, end, radius: float, mat, vertices: int = 8):
    start_vector = Vector(start)
    end_vector = Vector(end)
    direction = end_vector - start_vector
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=direction.length,
        location=(start_vector + end_vector) / 2,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    return assign(obj, mat)


def box(name: str, location, scale, mat, bevel: float = 0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("soft-edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return assign(obj, mat)


def torus(name: str, location, outer_radius: float, tube_radius: float, mat):
    bpy.ops.mesh.primitive_torus_add(
        major_segments=16,
        minor_segments=6,
        major_radius=outer_radius - tube_radius,
        minor_radius=tube_radius,
        location=location,
        rotation=(math.pi / 2, 0, 0),
    )
    obj = bpy.context.object
    obj.name = name
    return assign(obj, mat)


def wheel(prefix: str, x: float, mats: dict):
    center = (x, 0, WHEEL_RADIUS)
    torus(f"{prefix}-tire", center, WHEEL_RADIUS, TIRE_RADIUS, mats["tire"])
    torus(f"{prefix}-rim", center, WHEEL_RADIUS - 0.018, 0.0045, mats["metal"])
    cylinder_between(
        f"{prefix}-hub",
        (x, -0.025, WHEEL_RADIUS),
        (x, 0.025, WHEEL_RADIUS),
        0.009,
        mats["metal"],
    )
    spoke_radius = WHEEL_RADIUS - 0.024
    for index in range(8):
        angle = math.tau * index / 8
        endpoint = (
            x + math.cos(angle) * spoke_radius,
            0,
            WHEEL_RADIUS + math.sin(angle) * spoke_radius,
        )
        cylinder_between(
            f"{prefix}-spoke-{index}",
            (x, 0, WHEEL_RADIUS),
            endpoint,
            0.0016,
            mats["metal"],
            vertices=6,
        )


def add_handlebar(prefix: str, x: float, stem_height: float, mats: dict, upright: bool):
    cylinder_between(
        f"{prefix}-stem",
        (x, 0, 0.30),
        (x + (0.015 if upright else 0.0), 0, stem_height),
        0.008,
        mats["metal"],
    )
    bar_x = x + (0.025 if upright else 0.0)
    cylinder_between(
        f"{prefix}-handlebar",
        (bar_x, -0.075, stem_height),
        (bar_x, 0.075, stem_height),
        0.006,
        mats["metal"],
    )
    for side in (-1, 1):
        cylinder_between(
            f"{prefix}-grip-{side}",
            (bar_x, side * 0.055, stem_height),
            (bar_x, side * 0.085, stem_height),
            0.008,
            mats["seat"],
        )


def add_saddle(prefix: str, location, mats: dict):
    seat = box(
        f"{prefix}-saddle",
        location,
        (0.037, 0.045, 0.011),
        mats["seat"],
        bevel=0.008,
    )
    seat.rotation_euler.z = 0.0
    return seat


def add_rear_rack(prefix: str, mats: dict):
    rack_z = 0.31
    cylinder_between(f"{prefix}-rack-top-a", (-0.29, -0.035, rack_z), (-0.12, -0.035, rack_z), 0.003, mats["metal"], 6)
    cylinder_between(f"{prefix}-rack-top-b", (-0.29, 0.035, rack_z), (-0.12, 0.035, rack_z), 0.003, mats["metal"], 6)
    cylinder_between(f"{prefix}-rack-end", (-0.29, -0.035, rack_z), (-0.29, 0.035, rack_z), 0.003, mats["metal"], 6)
    cylinder_between(f"{prefix}-rack-leg-a", (-0.27, -0.03, rack_z), (-WHEEL_X, -0.02, WHEEL_RADIUS), 0.003, mats["metal"], 6)
    cylinder_between(f"{prefix}-rack-leg-b", (-0.27, 0.03, rack_z), (-WHEEL_X, 0.02, WHEEL_RADIUS), 0.003, mats["metal"], 6)


def add_basket(prefix: str, mats: dict):
    center_x = 0.29
    for y in (-0.07, 0.07):
        cylinder_between(f"{prefix}-basket-top-{y}", (0.23, y, 0.36), (0.35, y, 0.36), 0.003, mats["metal"], 6)
        cylinder_between(f"{prefix}-basket-bottom-{y}", (0.25, y, 0.29), (0.34, y, 0.29), 0.003, mats["metal"], 6)
    for x in (0.23, 0.27, 0.31, 0.35):
        cylinder_between(f"{prefix}-basket-side-a-{x}", (x, -0.07, 0.36), (x + 0.01, -0.07, 0.29), 0.0025, mats["metal"], 6)
        cylinder_between(f"{prefix}-basket-side-b-{x}", (x, 0.07, 0.36), (x + 0.01, 0.07, 0.29), 0.0025, mats["metal"], 6)
    for y in (-0.07, -0.035, 0, 0.035, 0.07):
        cylinder_between(f"{prefix}-basket-front-{y}", (0.35, y, 0.36), (0.34, y, 0.29), 0.0025, mats["metal"], 6)
    cylinder_between(f"{prefix}-basket-lower-a", (0.25, -0.07, 0.29), (0.34, 0.07, 0.29), 0.0025, mats["metal"], 6)
    cylinder_between(f"{prefix}-basket-lower-b", (0.25, 0.07, 0.29), (0.34, -0.07, 0.29), 0.0025, mats["metal"], 6)
    cylinder_between(f"{prefix}-basket-support", (center_x, 0, 0.29), (0.19, 0, 0.22), 0.004, mats["metal"], 6)


def add_rear_fender(prefix: str, mats: dict):
    points = []
    for angle_degrees in (25, 55, 85, 115, 145):
        angle = math.radians(angle_degrees)
        points.append(
            (
                -WHEEL_X + math.cos(angle) * (WHEEL_RADIUS + 0.012),
                0,
                WHEEL_RADIUS + math.sin(angle) * (WHEEL_RADIUS + 0.012),
            )
        )
    for index in range(len(points) - 1):
        cylinder_between(
            f"{prefix}-rear-fender-{index}",
            points[index],
            points[index + 1],
            0.005,
            mats["frame"],
        )


def create_bicycle(slug: str, config: dict):
    frame_material = material(f"{slug}-frame", config["frame"], metallic=0.15, roughness=0.42)
    accent_material = material(f"{slug}-accent", config["accent"], metallic=0.08, roughness=0.52)
    metal_material = material(f"{slug}-metal", "#b8bec1", metallic=0.72, roughness=0.24)
    tire_material = material(f"{slug}-tire", "#202322", metallic=0.0, roughness=0.84)
    seat_material = material(f"{slug}-seat", config["seat"], metallic=0.0, roughness=0.68)
    mats = {
        "frame": frame_material,
        "accent": accent_material,
        "metal": metal_material,
        "tire": tire_material,
        "seat": seat_material,
    }

    wheel(f"{slug}-rear", -WHEEL_X, mats)
    wheel(f"{slug}-front", WHEEL_X, mats)

    crank = (0.0, 0, 0.17)
    seat_joint = (-0.055, 0, 0.34)
    head_low = (0.13, 0, 0.28)
    head_high = (0.16, 0, 0.39)
    variant = config["variant"]

    cylinder_between(f"{slug}-chain-stay", (-WHEEL_X, 0, WHEEL_RADIUS), crank, 0.008, frame_material)
    cylinder_between(f"{slug}-seat-stay", (-WHEEL_X, 0, WHEEL_RADIUS), seat_joint, 0.007, frame_material)
    cylinder_between(f"{slug}-seat-tube", crank, seat_joint, 0.009, accent_material if variant == "vintage" else frame_material)
    cylinder_between(f"{slug}-down-tube", crank, head_low, 0.01, frame_material)
    cylinder_between(f"{slug}-head-tube", head_low, head_high, 0.011, frame_material)
    cylinder_between(f"{slug}-fork", (WHEEL_X, 0, WHEEL_RADIUS), head_high, 0.007, metal_material if variant == "vintage" else frame_material)

    if variant == "commuter":
        cylinder_between(f"{slug}-top-tube", seat_joint, head_high, 0.009, frame_material)
        add_rear_rack(slug, mats)
        add_handlebar(slug, 0.16, 0.44, mats, upright=False)
    elif variant == "shared":
        cylinder_between(f"{slug}-step-tube", (-0.04, 0, 0.22), head_low, 0.011, frame_material)
        cylinder_between(f"{slug}-rear-step-tube", seat_joint, (-0.04, 0, 0.22), 0.011, frame_material)
        add_handlebar(slug, 0.16, 0.46, mats, upright=True)
        add_basket(slug, mats)
        add_rear_fender(slug, mats)
    else:
        cylinder_between(f"{slug}-top-tube", seat_joint, head_high, 0.009, frame_material)
        cylinder_between(f"{slug}-lower-accent", crank, (0.08, 0, 0.21), 0.012, accent_material)
        add_handlebar(slug, 0.16, 0.45, mats, upright=False)
        add_rear_rack(slug, mats)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=0.012, location=(0.18, -0.04, 0.45))
        bell = bpy.context.object
        bell.name = f"{slug}-bell"
        assign(bell, metal_material)

    cylinder_between(f"{slug}-seat-post", seat_joint, (-0.06, 0, 0.405), 0.007, metal_material)
    add_saddle(slug, (-0.075, 0, 0.42), mats)
    cylinder_between(f"{slug}-crank-axle", (0, -0.025, 0.17), (0, 0.025, 0.17), 0.008, metal_material)
    cylinder_between(f"{slug}-kickstand", (-0.03, 0.02, 0.17), (-0.08, 0.045, 0.015), 0.004, metal_material, 6)
    box(f"{slug}-chain-guard", (-0.04, 0.018, 0.16), (0.09, 0.006, 0.018), accent_material, bevel=0.008)

    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            obj["asset_id"] = slug
            obj["runtime_tier"] = "visible-low"
            obj["front_axis"] = "+X"
            obj["meters_per_scene_unit"] = 2.7


def merge_by_material():
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    for obj in mesh_objects:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    groups = {}
    for obj in mesh_objects:
        material_name = obj.data.materials[0].name if obj.data.materials else "none"
        groups.setdefault(material_name, []).append(obj)
    for material_name, objects in groups.items():
        if len(objects) == 1:
            objects[0].name = f"GEO-{material_name}"
            bpy.context.view_layer.objects.active = objects[0]
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        objects[0].name = f"GEO-{material_name}"
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_preview_scene():
    preview_material = material("qa-ground", "#c8cfca", roughness=0.95)
    box("QA-ground", (0, 0, -0.012), (0.55, 0.42, 0.01), preview_material)
    bpy.ops.object.light_add(type="AREA", location=(-0.5, -0.7, 1.2))
    key = bpy.context.object
    key.name = "QA-key"
    key.data.energy = 120
    key.data.shape = "DISK"
    key.data.size = 1.5
    look_at(key, (0, 0, 0.2))
    bpy.ops.object.light_add(type="AREA", location=(0.7, 0.4, 0.7))
    fill = bpy.context.object
    fill.name = "QA-fill"
    fill.data.energy = 55
    fill.data.size = 1.2
    look_at(fill, (0, 0, 0.22))


def render_views(slug: str):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 720
    scene.render.resolution_y = 540
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.exposure = -0.7
    if scene.world is None:
        scene.world = bpy.data.worlds.new("QA-world")
    scene.world.color = (0.74, 0.78, 0.77)
    add_preview_scene()
    views = {
        "canonical": ((0.0, -1.15, 0.52), (0.0, 0.0, 0.22), 48),
        "side": ((0.78, -0.82, 0.48), (0.0, 0.0, 0.22), 50),
        "detail": ((0.40, -0.62, 0.54), (0.16, 0.0, 0.36), 43),
    }
    for name, (position, target, lens) in views.items():
        bpy.ops.object.camera_add(location=position)
        camera = bpy.context.object
        camera.name = f"QA-camera-{name}"
        camera.data.lens = lens
        look_at(camera, target)
        scene.camera = camera
        scene.render.filepath = str(ARTIFACT_DIR / f"test_{slug}-{name}.png")
        bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(camera, do_unlink=True)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_glb(path: Path):
    data = path.read_bytes()
    magic, version, total_length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2 or total_length != len(data):
        raise RuntimeError(f"Invalid GLB: {path}")
    chunk_length, chunk_type = struct.unpack_from("<II", data, 12)
    if chunk_type != 0x4E4F534A:
        raise RuntimeError(f"GLB JSON chunk missing: {path}")
    document = json.loads(data[20 : 20 + chunk_length].decode("utf-8").rstrip(" \t\r\n\x00"))
    accessors = document.get("accessors", [])
    triangles = 0
    bounds_min = [float("inf")] * 3
    bounds_max = [float("-inf")] * 3
    for mesh in document.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            if "indices" in primitive:
                triangles += accessors[primitive["indices"]]["count"] // 3
            elif "POSITION" in primitive.get("attributes", {}):
                triangles += accessors[primitive["attributes"]["POSITION"]]["count"] // 3
            position_index = primitive.get("attributes", {}).get("POSITION")
            if position_index is not None:
                accessor = accessors[position_index]
                for axis in range(3):
                    bounds_min[axis] = min(bounds_min[axis], accessor["min"][axis])
                    bounds_max[axis] = max(bounds_max[axis], accessor["max"][axis])
    transformed_nodes = []
    for node in document.get("nodes", []):
        if any(key in node for key in ("matrix", "translation", "rotation", "scale")):
            transformed_nodes.append(node.get("name", "unnamed"))
    return {
        "sha256": sha256(path),
        "bytes": path.stat().st_size,
        "nodes": len(document.get("nodes", [])),
        "meshes": len(document.get("meshes", [])),
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


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 2.7


def build(slug: str):
    config = ASSETS[slug]
    reset_scene()
    create_bicycle(slug, config)
    merge_by_material()
    for directory in (SOURCE_DIR, GLB_DIR, ARTIFACT_DIR, RECORD_DIR):
        directory.mkdir(parents=True, exist_ok=True)

    blend_path = SOURCE_DIR / f"{slug}.blend"
    glb_path = GLB_DIR / f"{slug}-visible-low.glb"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_extras=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )

    metrics = parse_glb(glb_path)
    record = {
        "schemaVersion": 1,
        "assetId": slug,
        "label": config["label"],
        "package": PACKAGE,
        "runtimeTier": "visible-low",
        "runtimeStates": ["visible-low", "hidden"],
        "generator": "scripts/create_xinhua_bicycle_family.py",
        "buildCommand": (
            "/Applications/Blender.app/Contents/MacOS/Blender --background "
            "--python scripts/create_xinhua_bicycle_family.py -- --asset " + slug
        ),
        "blenderVersion": bpy.app.version_string,
        "outputs": {
            "blend": str(blend_path.relative_to(ROOT)),
            "blendSha256": sha256(blend_path),
            "glb": str(glb_path.relative_to(ROOT)),
        },
        "glb": metrics,
        "budget": {
            "maxTriangles": 2400,
            "maxNodes": 6,
            "maxMaterials": 5,
            "maxImages": 0,
            "maxBinaryBytes": 160000,
        },
        "identityCues": config["cues"],
        "evidenceRef": "docs/research/xinhua-bicycle-family-reference-manifest.json",
        "buildingTierCompatibility": {
            "hero": "not-applicable-by-nonbuilding-two-state-contract",
            "identity": "not-applicable-by-nonbuilding-two-state-contract",
            "massing": "not-applicable-by-nonbuilding-two-state-contract",
        },
        "previewGate": {
            "status": "headless-fixed-camera-passed",
            "views": ["canonical", "side", "detail"],
            "savedQaObjectsInMaster": False,
        },
        "runtimeGate": {
            "status": "pending-isolated-qa",
            "productionRegistry": "intentionally-not-integrated",
            "productionInstances": 0,
        },
    }
    (RECORD_DIR / f"{slug}-visible-low.json").write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    render_views(slug)
    print(json.dumps({"asset": slug, "glb": metrics}, ensure_ascii=False))


def main():
    args = parse_args()
    selected = [args.asset] if args.asset else list(ASSETS)
    if len(ASSETS) != 3:
        raise RuntimeError("新华自行车快速批次必须严格为 3 个资产")
    for slug in selected:
        build(slug)


if __name__ == "__main__":
    main()
