"""为上生新所和华山绿地的 12 个 OSM footprint 生成独立 Massing 资产。"""

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
INVENTORY_PATH = (
    ROOT / "docs/research/data/xinhua-building-inventory-20260724-185400.json"
)
LANDMARKS_PATH = ROOT / "app/scene/xinhua-landmarks-data.json"
SPEC_PATH = (
    ROOT / "docs/research/shangsheng-huashan-clean-massing-geometry-spec.json"
)
SOURCE_DIR = (
    ROOT / "assets/models/source/tiers/shangsheng-huashan/massing"
)
RUNTIME_DIR = ROOT / "public/models/tiers/shangsheng-huashan/massing"
PREVIEW_DIR = (
    ROOT / "test_artifacts/all-models/massing/shangsheng-huashan"
)
RECORD_DIR = (
    ROOT / "docs/research/build-records/tiers/shangsheng-huashan/massing"
)
MANIFEST_PATH = (
    ROOT / "docs/research/shangsheng-huashan-massing-manifest.json"
)
AUDITED_AT = "2026-07-25"
AUTHORED_METERS_PER_SCENE_UNIT = 2.7

WAY_CONTRACTS = {
    864847856: {
        "scope": "shangsheng",
    },
    864847877: {
        "scope": "shangsheng",
    },
    864847881: {
        "scope": "shangsheng",
    },
    864847883: {
        "scope": "shangsheng",
    },
    864847892: {
        "scope": "shangsheng",
    },
    1364679201: {
        "scope": "shangsheng",
    },
    1364679204: {
        "scope": "shangsheng",
    },
    1364679205: {
        "scope": "shangsheng",
    },
    1368808689: {
        "scope": "shangsheng",
    },
    1368808690: {
        "scope": "shangsheng",
    },
    1537478450: {
        "scope": "shangsheng",
    },
    743778426: {
        "scope": "huashan",
    },
}


def parse_arguments() -> argparse.Namespace:
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--way",
        type=int,
        help="只生成一个 OSM way；省略时生成全部 12 项",
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
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(collection):
            if datablock.users == 0:
                collection.remove(datablock)


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
    if len(cleaned) < 3 or abs(signed_area(cleaned)) < 1e-6:
        raise ValueError("无效 footprint")
    if signed_area(cleaned) < 0:
        cleaned.reverse()
    return cleaned


def add_extruded_polygon(
    way_id: int,
    points: list[tuple[float, float]],
    height: float,
    material: bpy.types.Material,
    extras: dict[str, Any],
) -> tuple[bpy.types.Object, int]:
    points = clean_points(points)
    count = len(points)
    vertices = (
        [(x, z, 0.0) for x, z in points]
        + [(x, z, height) for x, z in points]
    )
    faces: list[tuple[int, ...]] = [
        tuple(reversed(range(count))),
        tuple(range(count, count * 2)),
    ]
    for index in range(count):
        next_index = (index + 1) % count
        faces.append((index, next_index, count + next_index, count + index))
    mesh = bpy.data.meshes.new(f"osm-way-{way_id}-massing-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(f"osm-way-{way_id}-massing", mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(material)
    for key, value in extras.items():
        obj[key] = value
    return obj, 4 * count - 4


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


def configure_scene(
    way_id: int,
    runtime_position: list[float],
    runtime_yaw: float,
    contract: dict[str, Any],
) -> None:
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
    scene.world.color = (0.03, 0.04, 0.045)
    scene["asset_id"] = f"building:{contract['scope']}:osm-way-{way_id}"
    scene["tier"] = "massing"
    scene["batch"] = "shangsheng-huashan-exact-footprint"
    scene["geometry_spec"] = str(SPEC_PATH.relative_to(ROOT))
    scene["source_way_id"] = way_id
    scene["runtime_position"] = runtime_position
    scene["runtime_yaw"] = runtime_yaw
    scene["runtime_scale"] = [1.0, 1.0, 1.0]
    scene["placement_locked"] = True


def create_material(way_id: int, scope: str) -> bpy.types.Material:
    digest = hashlib.sha256(str(way_id).encode("utf8")).digest()
    base = (0.66, 0.68, 0.64) if scope == "huashan" else (0.67, 0.61, 0.55)
    material = bpy.data.materials.new(f"osm-way-{way_id}-massing-material")
    material.diffuse_color = (
        min(0.82, base[0] + digest[0] / 255 * 0.06),
        min(0.82, base[1] + digest[1] / 255 * 0.06),
        min(0.82, base[2] + digest[2] / 255 * 0.06),
        1,
    )
    material.roughness = 0.95
    return material


def create_named_material(
    name: str,
    color: tuple[float, float, float, float],
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.roughness = 0.95
    return material


def add_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.data.materials.append(material)
    return obj


def add_cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    material: bpy.types.Material,
    *,
    vertices: int = 12,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        end_fill_type="NGON",
        location=location,
    )
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.data.materials.append(material)
    return obj


def add_cone(
    name: str,
    location: tuple[float, float, float],
    radius_bottom: float,
    radius_top: float,
    depth: float,
    material: bpy.types.Material,
    *,
    vertices: int = 12,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_bottom,
        radius2=radius_top,
        depth=depth,
        end_fill_type="NGON",
        location=location,
    )
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.data.materials.append(material)
    return obj


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
        faces = [
            (0, 1, 5, 4),
            (3, 4, 5, 2),
            (0, 4, 3),
            (1, 2, 5),
            (0, 3, 2, 1),
        ]
    else:
        vertices = [
            (-span / 2, -length / 2, eave_z),
            (span / 2, -length / 2, eave_z),
            (span / 2, length / 2, eave_z),
            (-span / 2, length / 2, eave_z),
            (0.0, -length / 2, ridge_z),
            (0.0, length / 2, ridge_z),
        ]
        faces = [
            (0, 4, 5, 3),
            (1, 2, 5, 4),
            (0, 1, 4),
            (3, 5, 2),
            (0, 3, 2, 1),
        ]
    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(
        [(x + cx, y + cy, z) for x, y, z in vertices],
        [],
        faces,
    )
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def join_objects(
    objects: list[bpy.types.Object],
    name: str,
) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = name
    joined.data.name = f"{name}-mesh"
    return joined


def triangle_count(obj: bpy.types.Object) -> int:
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def build_sun_ke_villa_massing(
    way_id: int,
    local_points: list[tuple[float, float]],
    extras: dict[str, Any],
) -> tuple[bpy.types.Object, int]:
    """构建可辨认但保持低预算的孙科别墅 Massing。

    OSM 多边形只负责主体落点；照片确认的北侧 porte-cochère 允许越出主体
    矩形，并以独立立柱和屋顶保留覆盖车道净空。
    """
    wall = create_named_material(
        "sun-ke-villa-massing-wall",
        (0.66, 0.60, 0.53, 1.0),
    )
    roof = create_named_material(
        "sun-ke-villa-massing-roof",
        (0.43, 0.20, 0.13, 1.0),
    )
    objects: list[bpy.types.Object] = []

    footprint, _ = add_extruded_polygon(
        way_id,
        local_points,
        0.06,
        wall,
        {
            **extras,
            "geometry_evidence": (
                "observed-osm-main-footprint-plus-photo-supported-major-volumes"
            ),
            "massing_shape": "structured-named-landmark",
            "porte_cochere_passage": "open-between-local-column-obstacles",
        },
    )
    footprint.name = "sun-ke-villa-exact-osm-footprint-socle"
    objects.append(footprint)

    # 主次体块与 Hero master 使用同一原点、朝向和关键包络。
    objects.extend(
        [
            add_box(
                "sun-ke-villa-central-residence",
                (-0.42, 0.0, 1.84),
                (4.95, 4.08, 3.68),
                wall,
            ),
            add_box(
                "sun-ke-villa-lower-west-wing",
                (-2.92, -0.08, 1.34),
                (1.82, 3.72, 2.68),
                wall,
            ),
            add_cylinder(
                "sun-ke-villa-rounded-east-tower",
                (2.18, -0.58, 1.82),
                1.23,
                3.64,
                wall,
            ),
            add_gable_roof(
                "sun-ke-villa-central-gable-roof",
                (-0.42, 0.0),
                5.18,
                4.34,
                3.68,
                4.46,
                roof,
                ridge_axis="X",
            ),
            add_gable_roof(
                "sun-ke-villa-west-wing-gable-roof",
                (-2.92, -0.08),
                2.04,
                3.92,
                2.68,
                3.13,
                roof,
                ridge_axis="X",
            ),
            add_cone(
                "sun-ke-villa-tower-low-roof",
                (2.18, -0.58, 3.83),
                1.29,
                0.96,
                0.34,
                roof,
            ),
            add_box(
                "sun-ke-villa-front-dormer",
                (-0.54, -1.27, 3.91),
                (1.02, 0.72, 0.92),
                wall,
            ),
            add_gable_roof(
                "sun-ke-villa-front-dormer-roof",
                (-0.54, -1.27),
                1.18,
                0.88,
                4.35,
                4.67,
                roof,
                ridge_axis="X",
            ),
            add_box(
                "sun-ke-villa-main-chimney",
                (1.04, 0.58, 4.39),
                (0.45, 0.40, 1.32),
                wall,
            ),
        ]
    )

    # 北侧门廊沿 +Blender Y 外挑；只建柱、梁和屋顶，不封死中间车道。
    porch_center_x = -1.22
    porch_front_y = 4.58
    porch_rear_y = 2.14
    porch_center_y = (porch_front_y + porch_rear_y) * 0.5
    porch_length = porch_front_y - porch_rear_y + 0.48
    for x in (-2.10, -0.34):
        objects.append(
            add_box(
                f"sun-ke-villa-porte-cochere-front-column-{x}",
                (x, porch_front_y, 1.08),
                (0.40, 0.40, 2.16),
                wall,
            )
        )
        objects.append(
            add_box(
                f"sun-ke-villa-porte-cochere-rear-column-{x}",
                (x, 2.48, 1.08),
                (0.32, 0.32, 2.16),
                wall,
            )
        )
    objects.extend(
        [
            add_box(
                "sun-ke-villa-porte-cochere-left-beam",
                (-2.10, porch_center_y, 2.20),
                (0.24, porch_length, 0.24),
                wall,
            ),
            add_box(
                "sun-ke-villa-porte-cochere-right-beam",
                (-0.34, porch_center_y, 2.20),
                (0.24, porch_length, 0.24),
                wall,
            ),
            add_gable_roof(
                "sun-ke-villa-porte-cochere-gable-roof",
                (porch_center_x, porch_center_y),
                porch_length + 0.22,
                2.74,
                2.35,
                3.18,
                roof,
                ridge_axis="Y",
            ),
        ]
    )

    obj = join_objects(objects, f"osm-way-{way_id}-massing")
    for key, value in extras.items():
        obj[key] = value
    obj["geometry_evidence"] = (
        "observed-osm-main-footprint-plus-photo-supported-major-volumes"
    )
    obj["massing_shape"] = "structured-named-landmark"
    obj["porte_cochere_passage"] = "open-between-local-column-obstacles"
    return obj, triangle_count(obj)


def add_preview_ground(objects: list[bpy.types.Object]) -> None:
    minimum, maximum = scene_bounds(objects)
    center = (minimum + maximum) * 0.5
    size = max(maximum.x - minimum.x, maximum.y - minimum.y, 2.0) * 1.35
    bpy.ops.mesh.primitive_plane_add(
        size=size,
        location=(center.x, center.y, -0.025),
    )
    ground = bpy.context.active_object
    ground.name = "test-preview-ground"
    material = bpy.data.materials.new("test-preview-ground-material")
    material.diffuse_color = (0.14, 0.17, 0.18, 1)
    ground.data.materials.append(material)


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
    camera.data.ortho_scale = span * 2.0
    camera.rotation_euler = (
        center - camera.location
    ).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)


def export_glb(path: Path, obj: bpy.types.Object) -> None:
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
    if contents[:4] != b"glTF" or struct.unpack_from("<I", contents, 4)[0] != 2:
        raise RuntimeError(f"{path} 不是 glTF 2.0")
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
    return {
        "sha256": file_sha256(path),
        "bytes": len(contents),
        "nodes": len(gltf.get("nodes", [])),
        "meshes": len(gltf.get("meshes", [])),
        "materials": len(gltf.get("materials", [])),
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


def runtime_lookup(
    landmarks: dict[str, Any],
) -> dict[int, dict[str, Any]]:
    shangsheng = landmarks["shangshengXinsuo"]
    lookup = {
        int(building["id"]): {
            "scope": "shangsheng",
            "sitePosition": shangsheng["position"],
            "localPosition": building["position"],
        }
        for building in shangsheng["buildings"]
    }
    huashan = landmarks["huashanGreenland"]
    service = huashan["serviceBuilding"]
    lookup[int(service["osmWayId"])] = {
        "scope": "huashan",
        "sitePosition": huashan["position"],
        "localPosition": service["position"],
    }
    return lookup


def generate_asset(
    way_id: int,
    building: dict[str, Any],
    runtime: dict[str, Any],
    spec_building: dict[str, Any],
) -> dict[str, Any]:
    contract = WAY_CONTRACTS[way_id]
    if contract["scope"] != runtime["scope"]:
        raise RuntimeError(f"way {way_id} scope 与 runtime 不一致")
    reset_scene()
    geometry = spec_building["geometry"]
    height_spec = spec_building["height"]
    evidence_gate = spec_building["evidenceGate"]
    canonical_front = evidence_gate.get("canonicalFront", "unknown-plan-only")
    local_position = geometry["placementPivotCollectionLocalXZ"]
    runtime_yaw = float(geometry["runtimeYawRadians"])
    if any(
        abs(float(actual) - float(expected)) > 0.0002
        for actual, expected in zip(local_position, runtime["localPosition"])
    ):
        raise RuntimeError(f"way {way_id} spec pivot 与 runtime 不一致")
    configure_scene(way_id, local_position, runtime_yaw, contract)
    material = create_material(way_id, contract["scope"])
    collection_position = runtime["sitePosition"]
    cosine = math.cos(runtime_yaw)
    sine = math.sin(runtime_yaw)
    local_points: list[tuple[float, float]] = []
    for point in building["positioning"]["footprint"]:
        dx = float(point[0]) - collection_position[0] - local_position[0]
        dz = float(point[1]) - collection_position[1] - local_position[1]
        local_x = cosine * dx - sine * dz
        local_z = sine * dx + cosine * dz
        # glTF 会把 Blender Y 映射到 Three.js -Z，因此这里预先取反。
        local_points.append((local_x, -local_z))
    height_scene_units = float(height_spec["previewHeightSceneUnits"])
    asset_id = f"building:{contract['scope']}:osm-way-{way_id}"
    extras = {
        "asset_id": asset_id,
        "tier": "massing",
        "source_way_id": way_id,
        "geometry_evidence": "observed-osm-footprint",
        "height_evidence": height_spec["source"],
        "authored_front": canonical_front,
        "authored_footprint_axis": "-BlenderY",
        "exported_footprint_axis": "ThreeZ",
        "runtime_correction_scale_z": 1,
        "identity_allowed": False,
    }
    if way_id == 864847877:
        bpy.data.materials.remove(material)
        obj, triangles = build_sun_ke_villa_massing(
            way_id,
            local_points,
            extras,
        )
    else:
        obj, triangles = add_extruded_polygon(
            way_id,
            local_points,
            height_scene_units,
            material,
            extras,
        )

    slug = f"osm-way-{way_id}"
    blend_path = SOURCE_DIR / f"{slug}-massing.blend"
    glb_path = RUNTIME_DIR / f"{slug}-massing.glb"
    canonical_path = PREVIEW_DIR / f"test_{slug}-massing-canonical.png"
    side_path = PREVIEW_DIR / f"test_{slug}-massing-side.png"
    record_path = RECORD_DIR / f"{slug}-massing.json"

    export_glb(glb_path, obj)
    audit = parse_glb(glb_path)
    if audit["images"] or audit["textures"] or audit["animations"]:
        raise RuntimeError(f"{slug} 不允许图片、贴图或动画")
    if audit["transformedNodes"]:
        raise RuntimeError(f"{slug} GLB 节点存在未烘焙变换")
    expected_materials = 2 if way_id == 864847877 else 1
    if (
        audit["nodes"] != 1
        or audit["meshes"] != 1
        or audit["materials"] != expected_materials
    ):
        raise RuntimeError(f"{slug} 结构预算失败：{audit}")
    byte_budget = 96_000 if way_id == 864847877 else 32_768
    triangle_budget = 1_200 if way_id == 864847877 else 256
    if audit["bytes"] > byte_budget or audit["triangles"] > triangle_budget:
        raise RuntimeError(f"{slug} 超出 Massing 预算：{audit}")
    if abs(audit["bounds"]["min"][1]) > 1e-5:
        raise RuntimeError(f"{slug} GLB 未接地：{audit['bounds']}")

    add_preview_ground([obj])
    render_preview([obj], "canonical", canonical_path)
    render_preview([obj], "side", side_path)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    roundtrip_errors = []
    for source, (local_x, blender_y) in zip(
        building["positioning"]["footprint"],
        local_points,
    ):
        three_z = -blender_y
        world_x = (
            collection_position[0]
            + local_position[0]
            + cosine * local_x
            + sine * three_z
        )
        world_z = (
            collection_position[1]
            + local_position[1]
            - sine * local_x
            + cosine * three_z
        )
        roundtrip_errors.append(
            math.hypot(world_x - source[0], world_z - source[1])
        )
    maximum_roundtrip_error = max(roundtrip_errors)
    if maximum_roundtrip_error > 0.0002:
        raise RuntimeError(
            f"{slug} footprint roundtrip 偏移 {maximum_roundtrip_error:.8f}"
        )

    record = {
        "version": 1,
        "auditedAt": AUDITED_AT,
        "assetId": asset_id,
        "tier": "massing",
        "batch": (
            "sun-ke-villa-structured-named-landmark"
            if way_id == 864847877
            else "shangsheng-huashan-exact-footprint"
        ),
        "status": "generated-blender-mcp-review-pending",
        "generator": "scripts/create_shangsheng_huashan_massing_models.py",
        "modelBrief": (
            "docs/research/shangsheng-huashan-massing-model-brief.md"
        ),
        "geometrySpec": str(SPEC_PATH.relative_to(ROOT)),
        "sourceWayId": way_id,
        "sourceFootprint": building["positioning"]["footprint"],
        "localFootprint": [
            [round(x, 6), round(z, 6)] for x, z in clean_points(local_points)
        ],
        "footprintAreaSqMeters": building["positioning"][
            "footprintAreaSqMeters"
        ],
        "trianglesFromPolygon": (
            4 * len(clean_points(local_points)) - 4
        ),
        "trianglesTotal": triangles,
        "massingGeometry": (
            {
                "type": "structured-named-landmark",
                "majorVolumes": [
                    "exact-osm-main-footprint-socle",
                    "central-residence",
                    "lower-west-wing",
                    "rounded-east-tower",
                    "staggered-gable-roofs",
                    "front-dormer",
                    "chimney",
                    "north-protruding-porte-cochere",
                ],
                "walkableVoid": (
                    "porte-cochere-center-lane-open-between-local-columns"
                ),
                "projectionEvidence": (
                    "user-provided-north-porte-cochere-reference-20260725"
                ),
            }
            if way_id == 864847877
            else {
                "type": "exact-footprint-extrusion",
            }
        ),
        "placement": {
            "sitePosition": runtime["sitePosition"],
            "localPosition": local_position,
            "worldPivot": [
                collection_position[0] + local_position[0],
                collection_position[1] + local_position[1],
            ],
            "sourceCentroid": geometry["geometryCentroidAuthoredWorldXZ"],
            "maximumVertexRoundtripErrorSceneUnits": round(
                maximum_roundtrip_error,
                8,
            ),
            "yaw": runtime_yaw,
            "runtimeScale": [1, 1, 1],
            "movementAuthorized": False,
        },
        "heightEvidence": {
            "meters": height_spec["previewHeightMeters"],
            "sceneUnits": round(height_scene_units, 6),
            "measuredHeightMeters": height_spec["measuredHeightMeters"],
            "source": height_spec["source"],
            "isEvidence": height_spec["isEvidence"],
            "status": height_spec["status"],
        },
        "canonicalFront": canonical_front,
        "evidenceGate": evidence_gate,
        "identityAllowed": False,
        "mapAcceptance": "pending-blender-mcp-and-runtime-review",
        "runtimeGate": "pending",
        "outputs": {
            "blend": str(blend_path.relative_to(ROOT)),
            "glb": str(glb_path.relative_to(ROOT)),
            "previews": {
                "canonical": str(canonical_path.relative_to(ROOT)),
                "side": str(side_path.relative_to(ROOT)),
            },
        },
        "glb": audit,
    }
    record_path.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )
    return record


def main() -> None:
    args = parse_arguments()
    for directory in (SOURCE_DIR, RUNTIME_DIR, PREVIEW_DIR, RECORD_DIR):
        directory.mkdir(parents=True, exist_ok=True)
    inventory = json.loads(INVENTORY_PATH.read_text(encoding="utf8"))
    landmarks = json.loads(LANDMARKS_PATH.read_text(encoding="utf8"))
    spec = json.loads(SPEC_PATH.read_text(encoding="utf8"))
    inventory_by_way = {
        int(building["osm"]["id"]): building
        for building in inventory["buildings"]
        if building["osm"]["type"] == "way"
    }
    runtime_by_way = runtime_lookup(landmarks)
    spec_by_way = {
        int(building["osmWayId"]): building
        for collection in spec["collections"]
        for building in collection["buildings"]
    }
    selected = [
        way_id
        for way_id in WAY_CONTRACTS
        if args.way is None or way_id == args.way
    ]
    if not selected:
        raise ValueError(f"未知 OSM way：{args.way}")
    records = [
        generate_asset(
            way_id,
            inventory_by_way[way_id],
            runtime_by_way[way_id],
            spec_by_way[way_id],
        )
        for way_id in selected
    ]
    if args.way is None:
        manifest = {
            "version": 1,
            "generatedAt": AUDITED_AT,
            "status": "generated-runtime-and-independent-review-pending",
            "generator": (
                "scripts/create_shangsheng_huashan_massing_models.py"
            ),
            "modelBrief": (
                "docs/research/shangsheng-huashan-massing-model-brief.md"
            ),
            "geometrySpec": str(SPEC_PATH.relative_to(ROOT)),
            "sourceInventory": str(INVENTORY_PATH.relative_to(ROOT)),
            "assetCount": len(records),
            "totalGlbBytes": sum(record["glb"]["bytes"] for record in records),
            "totalTriangles": sum(
                record["glb"]["triangles"] for record in records
            ),
            "formalMassingPassCount": 0,
            "identityAllowedCount": 0,
            "assets": records,
        }
        MANIFEST_PATH.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf8",
        )
    else:
        # 单资产迁移只替换对应记录，完整保留 hold/backlog 的其余 11 项。
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf8"))
        record_by_way = {
            int(record["sourceWayId"]): record
            for record in manifest["assets"]
        }
        record_by_way[args.way] = records[0]
        manifest["assets"] = [
            record_by_way[int(record["sourceWayId"])]
            for record in manifest["assets"]
        ]
        manifest["totalGlbBytes"] = sum(
            record["glb"]["bytes"] for record in manifest["assets"]
        )
        manifest["totalTriangles"] = sum(
            record["glb"]["triangles"] for record in manifest["assets"]
        )
        manifest["activeAssetUpdate"] = {
            "sourceWayId": args.way,
            "scope": "active-31-minimal-pilot",
            "holdAssetsRegenerated": False,
        }
        MANIFEST_PATH.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf8",
        )


if __name__ == "__main__":
    main()
