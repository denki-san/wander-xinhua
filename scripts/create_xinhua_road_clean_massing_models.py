"""为独立审查失败的 8 个道路 POI 生成 footprint 驱动的干净 Massing v2。"""

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
PLACEMENT_PATH = ROOT / "app/scene/xinhua-road-landmarks-data.json"
SPEC_PATH = ROOT / "docs/research/xinhua-road-clean-massing-geometry-spec.json"
SOURCE_DIR = ROOT / "assets/models/source/tiers/xinhua-road/massing-v2"
RUNTIME_DIR = ROOT / "public/models/tiers/xinhua-road/massing-v2"
PREVIEW_DIR = ROOT / "test_artifacts/all-models/massing-v2"
RECORD_DIR = (
    ROOT / "docs/research/build-records/tiers/xinhua-road/massing-v2"
)
MANIFEST_PATH = ROOT / "docs/research/xinhua-road-clean-massing-manifest.json"
AUDITED_AT = "2026-07-25"
AUTHORED_METERS_PER_SCENE_UNIT = 2.7
FALLBACK_HEIGHT_METERS = 10.5


def parse_arguments() -> argparse.Namespace:
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset", help="只生成一个道路 POI；省略时生成全部 8 项")
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


def clean_points(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    deduplicated: list[tuple[float, float]] = []
    for point in points:
        rounded = (round(point[0], 6), round(point[1], 6))
        if not deduplicated or rounded != deduplicated[-1]:
            deduplicated.append(rounded)
    if len(deduplicated) > 1 and deduplicated[0] == deduplicated[-1]:
        deduplicated.pop()
    if len(deduplicated) < 3 or abs(signed_area(deduplicated)) < 1e-6:
        raise ValueError("无效 footprint")
    if signed_area(deduplicated) < 0:
        deduplicated.reverse()
    return deduplicated


def world_to_local(
    point: list[float],
    placement: dict[str, Any],
) -> tuple[float, float]:
    pivot_x, pivot_z = placement["position"]
    yaw = float(placement["yaw"])
    scale = float(placement["scale"])
    dx = float(point[0]) - pivot_x
    dz = float(point[1]) - pivot_z
    cosine = math.cos(yaw)
    sine = math.sin(yaw)
    return (
        (cosine * dx - sine * dz) / scale,
        (sine * dx + cosine * dz) / scale,
    )


def add_extruded_polygon(
    name: str,
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
        faces.append(
            (index, next_index, count + next_index, count + index)
        )
    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(material)
    for key, value in extras.items():
        obj[key] = value
    return obj, 4 * count - 4


def add_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
    extras: dict[str, Any],
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.data.materials.append(material)
    for key, value in extras.items():
        obj[key] = value
    return obj


def merge_objects(
    name: str,
    objects: list[bpy.types.Object],
    extras: dict[str, Any],
) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    merged = bpy.context.active_object
    merged.name = name
    for key, value in extras.items():
        merged[key] = value
    return merged


def build_pocket_park(
    material: bpy.types.Material,
) -> tuple[list[bpy.types.Object], list[dict[str, Any]]]:
    common = {
        "asset_id": "building:xinhua-road:xinhua-pocket-park",
        "tier": "massing",
        "geometry_evidence": "approximate-site-envelope",
        "map_binding": "not-a-building",
    }
    objects = [
        add_box(
            "path-slab",
            (0, 0, 0.055),
            (1.20, 9.00, 0.11),
            material,
            {**common, "child_role": "walkable-path"},
        ),
        add_box(
            "left-mirror-wall",
            (-0.76, 0, 0.72),
            (0.16, 9.20, 1.44),
            material,
            {**common, "child_role": "mirror-wall-preview"},
        ),
        add_box(
            "right-mirror-wall",
            (0.76, 0, 0.72),
            (0.16, 9.20, 1.44),
            material,
            {**common, "child_role": "mirror-wall-preview"},
        ),
        add_box(
            "left-planting-strip",
            (-0.57, 0.50, 0.18),
            (0.18, 7.20, 0.36),
            material,
            {**common, "child_role": "planting-strip-preview"},
        ),
        add_box(
            "right-planting-strip",
            (0.57, -0.50, 0.18),
            (0.18, 7.20, 0.36),
            material,
            {**common, "child_role": "planting-strip-preview"},
        ),
        add_box(
            "bench",
            (0.30, 1.20, 0.28),
            (0.50, 1.20, 0.56),
            material,
            {**common, "child_role": "bench-preview"},
        ),
    ]
    frame_parts = [
        add_box(
            "entrance-left",
            (-0.60, -4.40, 0.82),
            (0.12, 0.16, 1.64),
            material,
            common,
        ),
        add_box(
            "entrance-right",
            (0.60, -4.40, 0.82),
            (0.12, 0.16, 1.64),
            material,
            common,
        ),
        add_box(
            "entrance-top",
            (0, -4.40, 1.58),
            (1.32, 0.16, 0.16),
            material,
            common,
        ),
    ]
    objects.append(
        merge_objects(
            "entrance-frame",
            frame_parts,
            {**common, "child_role": "entrance-frame-preview"},
        )
    )
    children = [
        {
            "name": obj.name,
            "sourceWayId": None,
            "candidateRole": obj.get("child_role"),
            "geometryEvidence": "approximate-site-envelope",
        }
        for obj in objects
    ]
    return objects, children


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


def configure_scene(asset: dict[str, Any], placement: dict[str, Any]) -> None:
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
    scene["asset_id"] = f"building:xinhua-road:{asset['id']}"
    scene["tier"] = "massing"
    scene["batch"] = "clean-footprint-v2"
    scene["geometry_spec"] = str(SPEC_PATH.relative_to(ROOT))
    scene["placement_locked"] = True
    scene["runtime_position"] = placement["position"]
    scene["runtime_yaw"] = placement["yaw"]
    scene["runtime_scale"] = placement["scale"]


def create_material(slug: str) -> bpy.types.Material:
    digest = hashlib.sha256(slug.encode("utf8")).digest()
    material = bpy.data.materials.new(f"{slug}-clean-massing-material")
    material.diffuse_color = (
        0.52 + digest[0] / 255 * 0.08,
        0.56 + digest[1] / 255 * 0.08,
        0.59 + digest[2] / 255 * 0.08,
        1,
    )
    material.roughness = 0.95
    return material


def add_preview_ground(
    objects: list[bpy.types.Object],
) -> bpy.types.Object:
    minimum, maximum = scene_bounds(objects)
    center = (minimum + maximum) * 0.5
    size = max(maximum.x - minimum.x, maximum.y - minimum.y, 2.0) * 1.25
    bpy.ops.mesh.primitive_plane_add(
        size=size,
        location=(center.x, center.y, -0.025),
    )
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
        else Vector((-span * 1.08, -span * 0.64, span * 0.68))
    )
    bpy.ops.object.camera_add(location=center + offset)
    camera = bpy.context.active_object
    camera.name = f"test-{direction}-camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = span * 1.35
    camera.rotation_euler = (
        center - camera.location
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
        "triangles": triangles,
        "bounds": {
            "min": [round(value, 6) for value in bounds_min],
            "max": [round(value, 6) for value in bounds_max],
        },
        "transformedNodes": transformed_nodes,
    }


def generate_asset(
    asset: dict[str, Any],
    placement: dict[str, Any],
    inventory_by_way: dict[int, dict[str, Any]],
) -> dict[str, Any]:
    reset_scene()
    configure_scene(asset, placement)
    material = create_material(asset["id"])
    local_height = (
        FALLBACK_HEIGHT_METERS
        / AUTHORED_METERS_PER_SCENE_UNIT
        / float(placement["scale"])
    )
    children: list[dict[str, Any]] = []
    if asset["kind"] == "site-feature":
        objects, children = build_pocket_park(material)
    else:
        objects = []
        for way_id in asset["candidateWayIds"]:
            building = inventory_by_way.get(int(way_id))
            if building is None:
                raise KeyError(f"{asset['id']} 缺少 inventory way {way_id}")
            points = [
                world_to_local(point, placement)
                for point in building["positioning"]["footprint"]
            ]
            child_name = f"osm-way-{way_id}"
            obj, triangles = add_extruded_polygon(
                child_name,
                points,
                local_height,
                material,
                {
                    "asset_id": f"building:xinhua-road:{asset['id']}",
                    "tier": "massing",
                    "source_way_id": int(way_id),
                    "candidate_status": asset["candidateStatus"],
                    "geometry_evidence": "observed-osm-footprint",
                    "height_evidence": "unknown-runtime-fallback-not-evidence",
                    "map_binding": "pending",
                },
            )
            objects.append(obj)
            children.append(
                {
                    "name": child_name,
                    "sourceWayId": int(way_id),
                    "candidateRole": "unbound-member-candidate",
                    "geometryEvidence": "observed-osm-footprint",
                    "heightEvidence": "unknown-runtime-fallback-not-evidence",
                    "footprintAreaSqMeters": building["positioning"][
                        "footprintAreaSqMeters"
                    ],
                    "triangles": triangles,
                    "localFootprint": [
                        [round(x, 6), round(z, 6)] for x, z in points
                    ],
                }
            )

    slug = asset["id"]
    blend_path = SOURCE_DIR / f"{slug}-massing.blend"
    glb_path = RUNTIME_DIR / f"{slug}-massing.glb"
    canonical_path = PREVIEW_DIR / f"test_{slug}-massing-v2-canonical.png"
    side_path = PREVIEW_DIR / f"test_{slug}-massing-v2-side.png"
    record_path = RECORD_DIR / f"{slug}-massing.json"

    export_glb(glb_path, objects)
    audit = parse_glb(glb_path)
    if audit["images"] or audit["textures"]:
        raise RuntimeError(f"{slug} 不允许图片或贴图")
    if audit["transformedNodes"]:
        raise RuntimeError(f"{slug} GLB 节点存在未烘焙变换")
    if audit["bytes"] > 160_000 or audit["triangles"] > 1_200:
        raise RuntimeError(f"{slug} 超出 Massing 预算：{audit}")

    add_preview_ground(objects)
    render_preview(objects, "canonical", canonical_path)
    render_preview(objects, "side", side_path)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    record = {
        "version": 2,
        "auditedAt": AUDITED_AT,
        "assetId": f"building:xinhua-road:{slug}",
        "tier": "massing",
        "batch": "clean-footprint-v2",
        "status": "clean-massing-generated-runtime-and-map-gate-pending",
        "generator": "scripts/create_xinhua_road_clean_massing_models.py",
        "geometrySpec": str(SPEC_PATH.relative_to(ROOT)),
        "modelBrief": "docs/research/xinhua-road-massing-model-brief.md",
        "placement": {
            "position": placement["position"],
            "yaw": placement["yaw"],
            "scale": placement["scale"],
            "movementAuthorized": False,
        },
        "candidateStatus": asset["candidateStatus"],
        "membershipConfidence": asset["membershipConfidence"],
        "heightEvidence": {
            "previewMeters": FALLBACK_HEIGHT_METERS,
            "localSceneUnits": round(local_height, 6),
            "status": "unknown-runtime-fallback-not-evidence",
        },
        "unknown": asset["unknown"],
        "children": children,
        "outputs": {
            "blend": str(blend_path.relative_to(ROOT)),
            "glb": str(glb_path.relative_to(ROOT)),
            "previews": {
                "canonical": str(canonical_path.relative_to(ROOT)),
                "side": str(side_path.relative_to(ROOT)),
            },
        },
        "glb": audit,
        "runtimeGate": "pending-qaModelTier=massing-v2",
        "mapAcceptance": "pending",
        "identityAllowed": False,
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
    placement_data = json.loads(PLACEMENT_PATH.read_text(encoding="utf8"))
    spec = json.loads(SPEC_PATH.read_text(encoding="utf8"))
    inventory_by_way = {
        int(building["osm"]["id"]): building
        for building in inventory["buildings"]
        if building["osm"]["type"] == "way"
    }
    placements = {
        landmark["id"]: landmark for landmark in placement_data["landmarks"]
    }
    selected = [
        asset
        for asset in spec["assets"]
        if args.asset is None or asset["id"] == args.asset
    ]
    if not selected:
        raise ValueError(f"未知 asset：{args.asset}")
    records = [
        generate_asset(asset, placements[asset["id"]], inventory_by_way)
        for asset in selected
    ]
    if args.asset is None:
        manifest = {
            "version": 1,
            "generatedAt": AUDITED_AT,
            "status": "clean-massing-generated-runtime-and-map-gate-pending",
            "generator": "scripts/create_xinhua_road_clean_massing_models.py",
            "geometrySpec": str(SPEC_PATH.relative_to(ROOT)),
            "sourceInventory": str(INVENTORY_PATH.relative_to(ROOT)),
            "prototypeCount": len(records),
            "totalChildren": sum(len(record["children"]) for record in records),
            "totalGlbBytes": sum(record["glb"]["bytes"] for record in records),
            "totalTriangles": sum(
                record["glb"]["triangles"] for record in records
            ),
            "identityAllowed": False,
            "assets": records,
        }
        MANIFEST_PATH.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf8",
        )


if __name__ == "__main__":
    main()
