"""从 OSM footprint 生成新华路街道普通建筑的确定性分块 Massing。"""

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
SOURCE_DIR = ROOT / "assets/models/source/tiers/osm-ordinary/massing"
RUNTIME_DIR = ROOT / "public/models/tiers/osm-ordinary/massing"
PREVIEW_DIR = ROOT / "test_artifacts/all-models/massing/osm-ordinary"
RECORD_DIR = (
    ROOT / "docs/research/build-records/tiers/osm-ordinary/massing"
)
MANIFEST_PATH = ROOT / "docs/research/osm-ordinary-massing-manifest.json"
AUDITED_AT = "2026-07-25"
GRID_MIN = -360.0
GRID_SIZE = 180.0
GRID_COUNT = 4


def parse_arguments() -> argparse.Namespace:
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--chunk",
        help="只生成指定 chunk，例如 r2c1；省略时生成全部非空 chunk",
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
            collection.remove(datablock)


def chunk_id_for(position: list[float]) -> str:
    x, z = position
    column = max(
        0,
        min(GRID_COUNT - 1, math.floor((x - GRID_MIN) / GRID_SIZE)),
    )
    row = max(
        0,
        min(GRID_COUNT - 1, math.floor((z - GRID_MIN) / GRID_SIZE)),
    )
    return f"r{row}c{column}"


def chunk_origin(chunk_id: str) -> tuple[float, float]:
    row = int(chunk_id[1])
    column = int(chunk_id[3])
    return (
        GRID_MIN + column * GRID_SIZE + GRID_SIZE * 0.5,
        GRID_MIN + row * GRID_SIZE + GRID_SIZE * 0.5,
    )


def node_name(asset_id: str) -> str:
    return asset_id.removeprefix("building:xinhua:")


def signed_area(points: list[tuple[float, float]]) -> float:
    return sum(
        x0 * y1 - x1 * y0
        for (x0, y0), (x1, y1) in zip(points, points[1:] + points[:1])
    ) * 0.5


def clean_points(
    footprint: list[list[float]],
    origin: tuple[float, float],
) -> list[tuple[float, float]]:
    points = [
        (round(point[0] - origin[0], 6), round(point[1] - origin[1], 6))
        for point in footprint
    ]
    if len(points) > 1 and points[0] == points[-1]:
        points.pop()
    deduplicated: list[tuple[float, float]] = []
    for point in points:
        if not deduplicated or point != deduplicated[-1]:
            deduplicated.append(point)
    if len(deduplicated) < 3 or abs(signed_area(deduplicated)) < 1e-6:
        raise ValueError("footprint 不是有效多边形")
    if signed_area(deduplicated) < 0:
        deduplicated.reverse()
    return deduplicated


def build_extruded_building(
    building: dict[str, Any],
    origin: tuple[float, float],
    material: bpy.types.Material,
) -> tuple[bpy.types.Object, int]:
    points = clean_points(building["positioning"]["footprint"], origin)
    height = float(building["positioning"]["heightSceneUnits"])
    bottom = [(x, y, 0.0) for x, y in points]
    top = [(x, y, height) for x, y in points]
    vertices = bottom + top
    count = len(points)
    faces: list[tuple[int, ...]] = [
        tuple(reversed(range(count))),
        tuple(range(count, count * 2)),
    ]
    for index in range(count):
        next_index = (index + 1) % count
        faces.append(
            (
                index,
                next_index,
                count + next_index,
                count + index,
            )
        )

    mesh = bpy.data.meshes.new(f"{node_name(building['id'])}-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(node_name(building["id"]), mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(material)
    obj["asset_id"] = building["id"]
    obj["tier"] = "massing"
    obj["evidence_geometry"] = "observed-osm-footprint"
    obj["evidence_height"] = building["positioning"]["scaleEvidence"]["vertical"]
    obj["runtime_fallback_height"] = bool(
        building["positioning"]["runtimeFallbackHeight"]
    )
    obj["height_scene_units"] = round(height, 6)
    obj["osm_type"] = building["osm"]["type"]
    obj["osm_id"] = int(building["osm"]["id"])
    triangle_count = 4 * count - 4
    return obj, triangle_count


def configure_scene(chunk_id: str, origin: tuple[float, float]) -> None:
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
    scene["asset_package"] = "osm-ordinary-buildings"
    scene["chunk_id"] = chunk_id
    scene["chunk_origin_x"] = origin[0]
    scene["chunk_origin_z"] = origin[1]
    scene["tier"] = "massing"
    scene["authored_meters_per_scene_unit"] = 2.7


def material_for_chunk(chunk_id: str) -> bpy.types.Material:
    digest = hashlib.sha256(chunk_id.encode("utf8")).digest()
    material = bpy.data.materials.new(f"{chunk_id}-massing-material")
    material.diffuse_color = (
        0.52 + digest[0] / 255 * 0.08,
        0.57 + digest[1] / 255 * 0.08,
        0.61 + digest[2] / 255 * 0.08,
        1.0,
    )
    material.roughness = 0.94
    material.metallic = 0.0
    return material


def export_glb(path: Path, mesh_objects: list[bpy.types.Object]) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in mesh_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objects[0]
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
    )


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


def add_preview_camera(
    objects: list[bpy.types.Object],
    direction: str,
) -> bpy.types.Object:
    minimum, maximum = scene_bounds(objects)
    center = (minimum + maximum) * 0.5
    span = max(maximum.x - minimum.x, maximum.y - minimum.y, 1.0)
    camera_offset = (
        Vector((span * 0.68, -span * 0.78, span * 0.72))
        if direction == "canonical"
        else Vector((-span * 0.78, span * 0.62, span * 0.58))
    )
    bpy.ops.object.camera_add(location=center + camera_offset)
    camera = bpy.context.active_object
    camera.name = f"test-{direction}-camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = span * 1.38
    target = center + Vector((0.0, 0.0, (maximum.z - minimum.z) * 0.08))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera
    return camera


def add_preview_ground(
    objects: list[bpy.types.Object],
) -> bpy.types.Object:
    minimum, maximum = scene_bounds(objects)
    center = (minimum + maximum) * 0.5
    size = max(maximum.x - minimum.x, maximum.y - minimum.y) * 1.14
    bpy.ops.mesh.primitive_plane_add(
        size=size,
        location=(center.x, center.y, -0.025),
    )
    ground = bpy.context.active_object
    ground.name = "test-preview-ground"
    material = bpy.data.materials.new("test-preview-ground-material")
    material.diffuse_color = (0.14, 0.17, 0.18, 1.0)
    ground.data.materials.append(material)
    return ground


def parse_glb(path: Path) -> dict[str, Any]:
    contents = path.read_bytes()
    if contents[:4] != b"glTF" or struct.unpack_from("<I", contents, 4)[0] != 2:
        raise RuntimeError(f"{path} 不是 glTF 2.0 GLB")
    json_length = struct.unpack_from("<I", contents, 12)[0]
    json_type = struct.unpack_from("<I", contents, 16)[0]
    if json_type != 0x4E4F534A:
        raise RuntimeError(f"{path} 缺少 GLB JSON 数据块")
    gltf = json.loads(contents[20 : 20 + json_length].decode("utf8"))
    triangles = 0
    bounds_min = [math.inf, math.inf, math.inf]
    bounds_max = [-math.inf, -math.inf, -math.inf]
    for mesh in gltf.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            accessor_index = primitive.get("indices")
            if accessor_index is None:
                accessor_index = primitive["attributes"]["POSITION"]
            triangles += gltf["accessors"][accessor_index]["count"] // 3
            position_accessor = gltf["accessors"][
                primitive["attributes"]["POSITION"]
            ]
            for axis in range(3):
                bounds_min[axis] = min(
                    bounds_min[axis],
                    position_accessor["min"][axis],
                )
                bounds_max[axis] = max(
                    bounds_max[axis],
                    position_accessor["max"][axis],
                )

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
        "nodeNames": [node.get("name") for node in gltf.get("nodes", [])],
    }


def relative(path: Path) -> str:
    return str(path.relative_to(ROOT))


def build_chunk(
    chunk_id: str,
    buildings: list[dict[str, Any]],
    inventory_sha: str,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    reset_scene()
    origin = chunk_origin(chunk_id)
    configure_scene(chunk_id, origin)
    material = material_for_chunk(chunk_id)
    mesh_objects: list[bpy.types.Object] = []
    instance_records: list[dict[str, Any]] = []
    expected_triangles = 0

    for building in sorted(buildings, key=lambda item: item["id"]):
        obj, triangles = build_extruded_building(building, origin, material)
        mesh_objects.append(obj)
        expected_triangles += triangles
        instance_records.append(
            {
                "id": building["id"],
                "chunkId": chunk_id,
                "nodeName": obj.name,
                "runtimeGroupPosition": [origin[0], 0.0, origin[1]],
                "authoredPosition": building["positioning"]["authoredPosition"],
                "footprint": building["positioning"]["footprint"],
                "footprintAreaSqMeters": building["positioning"][
                    "footprintAreaSqMeters"
                ],
                "heightMeters": building["positioning"]["heightMeters"],
                "heightSceneUnits": building["positioning"]["heightSceneUnits"],
                "runtimeFallbackHeight": building["positioning"][
                    "runtimeFallbackHeight"
                ],
                "geometryEvidence": "observed-osm-footprint",
                "heightEvidence": building["positioning"]["scaleEvidence"][
                    "vertical"
                ],
                "photoEvidenceStatus": "photo-evidence-unavailable-for-massing",
                "massing": "generated-footprint-extrusion",
                "identity": building["tierStrategy"]["identity"],
                "hero": building["tierStrategy"]["hero"],
                "runtimeGate": "pending-qaOsmBuildings=massing",
            }
        )

    for directory in (SOURCE_DIR, RUNTIME_DIR, PREVIEW_DIR, RECORD_DIR):
        directory.mkdir(parents=True, exist_ok=True)
    source_path = SOURCE_DIR / f"osm-ordinary-{chunk_id}-massing.blend"
    glb_path = RUNTIME_DIR / f"osm-ordinary-{chunk_id}-massing.glb"
    bpy.ops.wm.save_as_mainfile(filepath=str(source_path))
    export_glb(glb_path, mesh_objects)

    previews: dict[str, str] = {}
    ground = add_preview_ground(mesh_objects)
    for direction in ("canonical", "side"):
        camera = add_preview_camera(mesh_objects, direction)
        preview_path = (
            PREVIEW_DIR / f"test_osm-ordinary-{chunk_id}-massing-{direction}.png"
        )
        bpy.context.scene.render.filepath = str(preview_path)
        bpy.ops.render.render(write_still=True)
        previews[direction] = relative(preview_path)
        bpy.data.objects.remove(camera, do_unlink=True)
    bpy.data.objects.remove(ground, do_unlink=True)

    audit = parse_glb(glb_path)
    if audit["nodes"] != len(buildings) or audit["meshes"] != len(buildings):
        raise RuntimeError(f"{chunk_id} 节点/网格数量与实例数不一致")
    if audit["materials"] != 1 or audit["images"] or audit["textures"]:
        raise RuntimeError(f"{chunk_id} 不符合单材质、无贴图 Massing 合同")
    if audit["triangles"] != expected_triangles:
        raise RuntimeError(
            f"{chunk_id} 三角面不一致：{audit['triangles']} != {expected_triangles}"
        )
    if audit["transformedNodes"]:
        raise RuntimeError(
            f"{chunk_id} 存在未烘焙节点变换：{audit['transformedNodes']}"
        )
    expected_nodes = [record["nodeName"] for record in instance_records]
    if sorted(audit["nodeNames"]) != sorted(expected_nodes):
        raise RuntimeError(f"{chunk_id} GLB node names 与实例记录不一致")

    absolute_x = [
        point[0]
        for building in buildings
        for point in building["positioning"]["footprint"]
    ]
    absolute_z = [
        point[1]
        for building in buildings
        for point in building["positioning"]["footprint"]
    ]
    record_path = RECORD_DIR / f"osm-ordinary-{chunk_id}-massing.json"
    record = {
        "version": 1,
        "auditedAt": AUDITED_AT,
        "assetPackage": "osm-ordinary-buildings",
        "chunkId": chunk_id,
        "tier": "massing",
        "status": "blender-and-glb-generated-runtime-gate-pending",
        "generator": "scripts/create_osm_ordinary_massing_models.py",
        "sourceInventory": relative(INVENTORY_PATH),
        "sourceInventorySha256": inventory_sha,
        "buildingCount": len(buildings),
        "chunkOrigin": [origin[0], 0.0, origin[1]],
        "absoluteFootprintBounds": {
            "minX": round(min(absolute_x), 6),
            "maxX": round(max(absolute_x), 6),
            "minZ": round(min(absolute_z), 6),
            "maxZ": round(max(absolute_z), 6),
        },
        "heightEvidence": {
            "levelsDerived": sum(
                not building["positioning"]["runtimeFallbackHeight"]
                for building in buildings
            ),
            "runtimeFallbackUnknown": sum(
                building["positioning"]["runtimeFallbackHeight"]
                for building in buildings
            ),
        },
        "outputs": {
            "blend": relative(source_path),
            "glb": relative(glb_path),
            "previews": previews,
        },
        "glb": {
            key: value
            for key, value in audit.items()
            if key not in ("nodeNames", "transformedNodes")
        },
        "rootTransforms": {
            "transformedNodeCount": len(audit["transformedNodes"]),
            "status": "ok",
        },
        "qualityBoundary": {
            "observed": ["OSM footprint"],
            "inferred": ["levels-derived or runtime fallback height"],
            "unknown": ["facade", "rear", "roof", "entrance", "surveyed height"],
        },
        "runtimeGate": "pending-qaOsmBuildings=massing",
    }
    record_path.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )
    chunk_manifest = {
        "chunkId": chunk_id,
        "buildingCount": len(buildings),
        "origin": [origin[0], 0.0, origin[1]],
        "blend": relative(source_path),
        "glb": relative(glb_path),
        "buildRecord": relative(record_path),
        "previews": previews,
        "glbSha256": audit["sha256"],
        "glbBytes": audit["bytes"],
        "triangles": audit["triangles"],
        "runtimeGate": "pending-qaOsmBuildings=massing",
    }
    return chunk_manifest, instance_records


def main() -> None:
    arguments = parse_arguments()
    inventory = json.loads(INVENTORY_PATH.read_text(encoding="utf8"))
    inventory_sha = file_sha256(INVENTORY_PATH)
    ordinary = [
        building
        for building in inventory["buildings"]
        if building["role"] == "ordinary-building"
    ]
    if len(ordinary) != 864:
        raise RuntimeError(f"普通建筑应为 864，实际 {len(ordinary)}")

    grouped: dict[str, list[dict[str, Any]]] = {}
    for building in ordinary:
        grouped.setdefault(
            chunk_id_for(building["positioning"]["authoredPosition"]),
            [],
        ).append(building)
    selected = (
        [arguments.chunk]
        if arguments.chunk
        else sorted(grouped)
    )
    if any(chunk not in grouped for chunk in selected):
        raise RuntimeError(f"不存在或为空的 chunk：{selected}")

    chunk_manifests: list[dict[str, Any]] = []
    instances: list[dict[str, Any]] = []
    for chunk_id in selected:
        chunk_manifest, chunk_instances = build_chunk(
            chunk_id,
            grouped[chunk_id],
            inventory_sha,
        )
        chunk_manifests.append(chunk_manifest)
        instances.extend(chunk_instances)
        print(
            f"{chunk_id}: {chunk_manifest['buildingCount']} buildings, "
            f"{chunk_manifest['triangles']} triangles, "
            f"{chunk_manifest['glbBytes']} bytes"
        )

    if arguments.chunk:
        print("单 chunk 生成完成；完整 manifest 仅在全量运行时重建")
        return

    manifest = {
        "version": 1,
        "generatedAt": AUDITED_AT,
        "status": "massing-generated-runtime-gate-pending",
        "scope": {
            "role": "ordinary-building",
            "buildingCount": len(ordinary),
            "chunkCount": len(chunk_manifests),
            "sourceInventory": relative(INVENTORY_PATH),
            "sourceInventorySha256": inventory_sha,
            "coordinateContract": {
                "metersPerSceneUnit": 2.7,
                "gridMin": GRID_MIN,
                "gridSize": GRID_SIZE,
                "gridCount": GRID_COUNT,
                "runtimeGlbScale": [1, 1, -1],
            },
        },
        "qualityBoundary": {
            "geometry": "observed-osm-footprint",
            "height": "13 levels-derived across full inventory; remaining runtime fallback explicitly unknown",
            "photoEvidence": "unavailable-for-massing; required before asset-specific Identity or Hero",
            "mapBinding": "inventory-only; named/core overlap dedup pending",
        },
        "chunks": sorted(chunk_manifests, key=lambda item: item["chunkId"]),
        "instances": sorted(instances, key=lambda item: item["id"]),
    }
    if len(manifest["instances"]) != 864:
        raise RuntimeError("完整 manifest 必须覆盖 864 个普通建筑")
    if len({item["id"] for item in manifest["instances"]}) != 864:
        raise RuntimeError("普通建筑 stable ID 不唯一")
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )
    print(f"manifest: {relative(MANIFEST_PATH)}")


if __name__ == "__main__":
    main()
