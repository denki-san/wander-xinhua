"""根据可复算 OSM 绑定生成德必法华525代表建筑 Massing v3 候选。"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
import struct
from typing import Any

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
BINDING_PATH = ROOT / "docs/research/debi-fahua-525-member-binding.json"
BRIEF_PATH = ROOT / "docs/research/debi-fahua-525-model-brief-v2.md"
BLEND_PATH = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/massing-v3"
    / "debi-fahua-525-massing.blend"
)
GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/massing-v3"
    / "debi-fahua-525-massing.glb"
)
PREVIEW_DIR = (
    ROOT
    / "test_artifacts/all-models/massing-v3/debi-fahua-525"
)
CANONICAL_PATH = PREVIEW_DIR / "test_debi-fahua-525-massing-v3-canonical.png"
SIDE_PATH = PREVIEW_DIR / "test_debi-fahua-525-massing-v3-side-depth.png"
ENTRANCE_PATH = PREVIEW_DIR / "test_debi-fahua-525-massing-v3-entrance-context.png"
RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/massing-v3"
    / "debi-fahua-525-massing.json"
)
ASSET_ID = "building:xinhua-road:debi-fahua-525"
SCENE_UNIT_METERS = 2.7


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
    return 0.5 * sum(
        x0 * y1 - x1 * y0
        for (x0, y0), (x1, y1) in zip(points, points[1:] + points[:1])
    )


def create_material() -> bpy.types.Material:
    material = bpy.data.materials.new("debi-fahua-525-massing-neutral")
    color = (0.69, 0.72, 0.73, 1.0)
    material.diffuse_color = color
    material.roughness = 0.92
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled is not None:
        principled.inputs["Base Color"].default_value = color
        principled.inputs["Roughness"].default_value = 0.92
    return material


def create_extruded_footprint(
    local_footprint: list[list[float]],
    height: float,
    material: bpy.types.Material,
) -> bpy.types.Object:
    # Binding 保存 GLB source XZ。Blender Y 在导出后对应 source -Z，
    # 因此这里显式翻转，避免运行时再镜像。
    points = [
        (float(source_x), -float(source_z))
        for source_x, source_z in local_footprint
    ]
    if signed_area(points) < 0:
        points.reverse()
    count = len(points)
    vertices = (
        [(x, y, 0.0) for x, y in points]
        + [(x, y, height) for x, y in points]
    )
    faces: list[tuple[int, ...]] = [
        tuple(reversed(range(count))),
        tuple(range(count, count * 2)),
    ]
    for index in range(count):
        next_index = (index + 1) % count
        faces.append((index, next_index, count + next_index, count + index))
    mesh = bpy.data.meshes.new("debi-fahua-525-massing-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new("debi-fahua-525-massing", mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    obj["asset_id"] = ASSET_ID
    obj["tier"] = "massing"
    obj["source_way_id"] = 864847922
    obj["binding_status"] = "bound-medium-secondary-map-corroborated"
    obj["height_evidence"] = "inferred-six-storey-not-surveyed"
    obj["open_courtyard"] = "negative-space-no-collision"
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


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


def scene_bounds(obj: bpy.types.Object) -> tuple[Vector, Vector]:
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    minimum = Vector((
        min(point.x for point in points),
        min(point.y for point in points),
        min(point.z for point in points),
    ))
    maximum = Vector((
        max(point.x for point in points),
        max(point.y for point in points),
        max(point.z for point in points),
    ))
    return minimum, maximum


def configure_preview_scene(obj: bpy.types.Object) -> None:
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
    scene.world.color = (0.035, 0.04, 0.045)
    minimum, maximum = scene_bounds(obj)
    center = (minimum + maximum) * 0.5
    span = max(maximum.x - minimum.x, maximum.y - minimum.y, 1.0)
    bpy.ops.mesh.primitive_plane_add(
        size=span * 1.45,
        location=(center.x, center.y, -0.025),
    )
    ground = bpy.context.active_object
    ground.name = "test-preview-ground"
    ground_material = bpy.data.materials.new("test-preview-ground-material")
    ground_material.diffuse_color = (0.13, 0.15, 0.16, 1.0)
    ground.data.materials.append(ground_material)


def render_preview(
    obj: bpy.types.Object,
    name: str,
    offset: tuple[float, float, float],
    output: Path,
) -> None:
    minimum, maximum = scene_bounds(obj)
    center = (minimum + maximum) * 0.5
    span = max(
        maximum.x - minimum.x,
        maximum.y - minimum.y,
        maximum.z - minimum.z,
        1.0,
    )
    camera_location = center + Vector(offset) * span
    bpy.ops.object.camera_add(location=camera_location)
    camera = bpy.context.active_object
    camera.name = f"test-{name}-camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = span * 1.35
    camera.rotation_euler = (
        center - camera.location
    ).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera
    bpy.context.scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)


def output_fingerprint(path: Path) -> dict[str, Any]:
    return {
        "path": str(path.relative_to(ROOT)),
        "sha256": file_sha256(path),
        "bytes": path.stat().st_size,
    }


def main() -> None:
    binding = json.loads(BINDING_PATH.read_text(encoding="utf8"))
    previous_glb_sha256 = file_sha256(GLB_PATH) if GLB_PATH.exists() else None
    for directory in (
        BLEND_PATH.parent,
        GLB_PATH.parent,
        PREVIEW_DIR,
        RECORD_PATH.parent,
    ):
        directory.mkdir(parents=True, exist_ok=True)

    reset_scene()
    material = create_material()
    member = binding["representativeMember"]
    candidate_height_local = (
        float(member["candidateHeightMeters"])
        / SCENE_UNIT_METERS
        / float(binding["registryPlacement"]["scale"])
    )
    obj = create_extruded_footprint(
        member["localFootprint"],
        candidate_height_local,
        material,
    )

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
    )
    audit = parse_glb(GLB_PATH)
    if audit["images"] or audit["textures"]:
        raise RuntimeError("Massing 不允许图片或贴图")
    if audit["transformedNodes"]:
        raise RuntimeError(f"GLB 节点存在未烘焙变换：{audit['transformedNodes']}")
    if (
        audit["nodes"] > 2
        or audit["meshes"] > 1
        or audit["materials"] > 1
        or audit["triangles"] > 80
        or audit["bytes"] > 32_000
    ):
        raise RuntimeError(f"Massing 超出预算：{audit}")

    bpy.context.scene["asset_id"] = ASSET_ID
    bpy.context.scene["tier"] = "massing"
    bpy.context.scene["source_way_id"] = 864847922
    bpy.context.scene["registry_position"] = binding["registryPlacement"]["position"]
    bpy.context.scene["registry_yaw"] = binding["registryPlacement"]["yaw"]
    bpy.context.scene["registry_scale"] = binding["registryPlacement"]["scale"]
    bpy.context.scene["map_acceptance"] = "blocked-road-overlap"
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

    configure_preview_scene(obj)
    render_preview(
        obj,
        "canonical",
        (0.92, -1.08, 0.64),
        CANONICAL_PATH,
    )
    render_preview(
        obj,
        "side-depth",
        (-1.08, -0.62, 0.58),
        SIDE_PATH,
    )
    render_preview(
        obj,
        "entrance-context",
        (0.18, 1.15, 0.34),
        ENTRANCE_PATH,
    )

    record = {
        "schemaVersion": 1,
        "assetId": ASSET_ID,
        "tier": "massing",
        "batch": "evidence-limited-v3",
        "generatedAt": "2026-07-26",
        "status": "candidate-mcp1-pending-map-road-overlap-blocked",
        "generator": str(Path(__file__).relative_to(ROOT)),
        "memberBinding": str(BINDING_PATH.relative_to(ROOT)),
        "modelBrief": str(BRIEF_PATH.relative_to(ROOT)),
        "sourceWayId": 864847922,
        "bindingStatus": member["bindingStatus"],
        "placement": binding["registryPlacement"],
        "height": {
            "candidateMeters": member["candidateHeightMeters"],
            "authoredLocalSceneUnits": round(candidate_height_local, 6),
            "status": member["heightEvidence"],
        },
        "coordinateValidation": binding["projectionValidation"],
        "roadClearance": binding["roadClearance"],
        "neighborCollision": binding["neighborCollision"],
        "openCourtyard": {
            "status": "preserved-as-negative-space",
            "siteSlab": False,
            "courtyardCollision": False,
            "exactPolygon": "unknown",
        },
        "outputs": {
            "blend": output_fingerprint(BLEND_PATH),
            "glb": output_fingerprint(GLB_PATH),
            "previews": {
                "canonical": output_fingerprint(CANONICAL_PATH),
                "sideDepth": output_fingerprint(SIDE_PATH),
                "entranceContext": output_fingerprint(ENTRANCE_PATH),
            },
        },
        "glb": audit,
        "reproducibility": {
            "previousGlbSha256": previous_glb_sha256,
            "currentGlbSha256": audit["sha256"],
            "matchesPrevious": (
                previous_glb_sha256 == audit["sha256"]
                if previous_glb_sha256 is not None
                else None
            ),
        },
        "gates": {
            "mcp1": "pending-main-window-batch-review",
            "mapGeometryCalibration": "pass",
            "formalMapAcceptance": (
                "blocked-fahuazhen-road-overlap-and-primary-membership-proof"
            ),
            "hero": "retained-legacy-no-rebuild",
            "identity": "blocked",
            "runtimePromotion": False,
        },
    }
    RECORD_PATH.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )
    print(json.dumps(record, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
