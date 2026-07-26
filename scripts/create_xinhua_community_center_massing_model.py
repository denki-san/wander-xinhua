"""依据官方照片与目标 OSM footprint 生成新华社区营造中心 Massing v2。"""

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
BINDING_PATH = ROOT / "docs/research/xinhua-community-center-osm-binding.json"
BLEND_PATH = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/massing-v2"
    / "xinhua-community-center-massing.blend"
)
GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/massing-v2"
    / "xinhua-community-center-massing.glb"
)
PREVIEW_DIR = (
    ROOT
    / "test_artifacts/all-models/massing-v2/xinhua-community-center"
)
CANONICAL_PATH = PREVIEW_DIR / "test_xinhua-community-center-massing-v2-canonical.png"
SIDE_PATH = PREVIEW_DIR / "test_xinhua-community-center-massing-v2-side-depth.png"
ENTRANCE_PATH = PREVIEW_DIR / "test_xinhua-community-center-massing-v2-entrance.png"
RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/massing-v2"
    / "xinhua-community-center-massing.json"
)


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


def make_material(
    name: str,
    color: tuple[float, float, float, float],
    roughness: float,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.roughness = roughness
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled is not None:
        principled.inputs["Base Color"].default_value = color
        principled.inputs["Roughness"].default_value = roughness
    return material


def add_polygon_prism(
    name: str,
    footprint_xz: list[list[float]],
    z_bottom: float,
    height: float,
    material: bpy.types.Material,
) -> bpy.types.Object:
    """把运行时 XZ 映射到 Blender X/Y，由共享 renderer 完成唯一 Z 翻转。"""

    count = len(footprint_xz)
    vertices = [
        (float(x_value), float(z_value), z_bottom)
        for x_value, z_value in footprint_xz
    ]
    vertices.extend(
        (float(x_value), float(z_value), z_bottom + height)
        for x_value, z_value in footprint_xz
    )
    faces: list[tuple[int, ...]] = [
        tuple(reversed(range(count))),
        tuple(range(count, count * 2)),
    ]
    for index in range(count):
        next_index = (index + 1) % count
        faces.append((index, next_index, next_index + count, index + count))

    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def add_box(
    name: str,
    center_xz: tuple[float, float],
    size_xz: tuple[float, float],
    z_bottom: float,
    height: float,
    material: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(
            center_xz[0],
            center_xz[1],
            z_bottom + height / 2,
        ),
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = (size_xz[0], size_xz[1], height)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.data.materials.append(material)
    return obj


def join_building(objects: list[bpy.types.Object]) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    building = bpy.context.active_object
    building.name = "xinhua-community-center-massing-v2"
    building["asset_id"] = "building:xinhua-road:xinhua-community-center"
    building["tier"] = "massing"
    building["source_osm_way"] = "864493234"
    building["source_poi_node"] = "13765678129"
    building["blender_source_front"] = "local-positive-y"
    building["raw_gltf_front"] = "local-negative-z"
    building["renderer_scale_z"] = -1
    building["runtime_front"] = "local-positive-z"
    building["reference_images_embedded"] = False
    return building


def look_at(camera: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_preview() -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.display.shading.light = "STUDIO"
    scene.display.shading.studio_light = "rim.sl"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.world.color = (0.035, 0.045, 0.055)

    bpy.ops.object.camera_add()
    camera = bpy.context.active_object
    camera.name = "test_xinhua-community-center-camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 15.6
    scene.camera = camera

    bpy.ops.mesh.primitive_plane_add(size=45, location=(0, 0, -0.015))
    ground = bpy.context.active_object
    ground.name = "test_xinhua-community-center-ground"
    ground.data.materials.append(
        make_material("test-preview-ground", (0.08, 0.1, 0.12, 1), 1.0)
    )
    return camera


def render_view(
    camera: bpy.types.Object,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
    output: Path,
    ortho_scale: float,
) -> None:
    camera.location = location
    camera.data.ortho_scale = ortho_scale
    look_at(camera, target)
    bpy.context.scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)


def read_glb_json(path: Path) -> dict[str, Any]:
    data = path.read_bytes()
    if data[:4] != b"glTF":
        raise RuntimeError("导出的文件不是 GLB")
    offset = 12
    while offset < len(data):
        chunk_length, chunk_type = struct.unpack_from("<II", data, offset)
        offset += 8
        chunk = data[offset : offset + chunk_length]
        offset += chunk_length
        if chunk_type == 0x4E4F534A:
            return json.loads(chunk.rstrip(b"\0 ").decode("utf-8"))
    raise RuntimeError("GLB 缺少 JSON chunk")


def glb_summary(path: Path) -> dict[str, Any]:
    document = read_glb_json(path)
    accessors = document.get("accessors", [])
    triangles = 0
    position_bounds: list[tuple[list[float], list[float]]] = []
    for mesh in document.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            index_accessor = primitive.get("indices")
            if index_accessor is not None:
                triangles += accessors[index_accessor]["count"] // 3
            position_accessor = primitive.get("attributes", {}).get("POSITION")
            if position_accessor is not None:
                accessor = accessors[position_accessor]
                position_bounds.append((accessor["min"], accessor["max"]))

    bounds_min = [
        min(bounds[0][axis] for bounds in position_bounds)
        for axis in range(3)
    ]
    bounds_max = [
        max(bounds[1][axis] for bounds in position_bounds)
        for axis in range(3)
    ]
    roots_normalized = all(
        all(field not in node for field in ("translation", "rotation", "scale", "matrix"))
        for node in document.get("nodes", [])
    )
    return {
        "sha256": file_sha256(path),
        "bytes": path.stat().st_size,
        "nodes": len(document.get("nodes", [])),
        "meshes": len(document.get("meshes", [])),
        "materials": len(document.get("materials", [])),
        "images": len(document.get("images", [])),
        "textures": len(document.get("textures", [])),
        "triangles": triangles,
        "bounds": {
            "min": [round(value, 6) for value in bounds_min],
            "max": [round(value, 6) for value in bounds_max],
        },
        "rootTransformsNormalized": roots_normalized,
    }


def write_build_record(binding: dict[str, Any]) -> None:
    glb = glb_summary(GLB_PATH)
    record = {
        "version": 2,
        "auditedAt": "2026-07-26",
        "assetId": "building:xinhua-road:xinhua-community-center",
        "tier": "massing",
        "status": "headless-pass-map-calibrated-candidate-mcp1-pending",
        "scope": {
            "buildingOnly": True,
            "includedOsmWays": [864493234],
            "excludedDecorTreesAndFullMap": True,
            "sharedFilesModified": False,
        },
        "evidence": {
            "manifest": "docs/research/xinhua-community-center-reference-manifest.json",
            "canonical": "docs/research/assets/requested-poi-references/xinhua-community-center-front.jpg",
            "sideDepth": "unknown",
            "entrance": "supported-by-canonical",
            "massingAuthorized": True,
            "identityAuthorized": False,
            "heroAuthorized": False,
        },
        "sourceData": {
            "osmBinding": str(BINDING_PATH.relative_to(ROOT)),
            "sourcePoiNode": "node/13765678129",
            "sourceBuildingWay": "way/864493234",
            "sourceAccessRoad": "way/577252269",
            "referenceOnly": True,
            "embeddedInGlb": False,
            "axisConversion": {
                "blenderSource": "x-runtime-x_y-runtime-z",
                "gltfExport": "blender-y-to-raw-gltf-negative-z",
                "renderer": "GlbModel primitive scale [1,1,-1]",
                "runtime": "single-renderer-z-flip-restores-binding-xz",
            },
        },
        "runtimePlacementCandidate": binding["runtimePlacementCandidate"],
        "mapCalibration": {
            "maximumVertexWorldErrorSceneUnits": 0.0001,
            "measuredMaximumVertexWorldErrorSceneUnits": 0,
            "roadBoundaryToCenterlineSceneUnits": binding["frontAccessRoad"][
                "buildingBoundaryToCenterlineSceneUnits"
            ],
            "roadBoundaryToCenterlineMeters": binding["frontAccessRoad"][
                "buildingBoundaryToCenterlineMeters"
            ],
            "closestNeighborGapSceneUnits": binding["neighborClearance"][
                "minimumBoundaryGapSceneUnits"
            ],
            "closestNeighborGapMeters": binding["neighborClearance"][
                "minimumBoundaryGapMeters"
            ],
            "overlapCount": 0,
            "roadSurfaceWidthKnown": False,
        },
        "massingGeometry": {
            "heightEvidence": "two-storey-photo-boundary-not-surveyed",
            "mainHeightSceneUnits": 2.6,
            "parapetHeightSceneUnits": 0.22,
            "portalHeightSceneUnits": 2.95,
            "observed": [
                "two-storey-low-white-building",
                "flat-roof-and-parapet",
                "central-tall-silver-metal-portal",
                "dark-glass-entrance",
            ],
            "unknown": [
                "surveyed-height",
                "side-and-rear-facades",
                "roof-equipment",
                "toy-house-placement",
            ],
            "omitted": [
                "trees",
                "garden",
                "sports-corner",
                "toy-exchange-house",
                "signage-text",
                "decor",
            ],
        },
        "collisionCandidate": {
            "mainFootprint": binding["runtimePlacementCandidate"]["localFootprint"],
            "localBounds": binding["runtimePlacementCandidate"]["localBounds"],
            "frontEntranceCollision": "visual-portal-not-added-to-building-blocker",
            "sideGapWalkable": False,
            "formalRuntimeCollisionGate": "pending-main-window",
        },
        "outputs": {
            "generator": str(Path(__file__).resolve().relative_to(ROOT)),
            "blend": str(BLEND_PATH.relative_to(ROOT)),
            "glb": str(GLB_PATH.relative_to(ROOT)),
            "previews": {
                "canonical": {
                    "path": str(CANONICAL_PATH.relative_to(ROOT)),
                    "sha256": file_sha256(CANONICAL_PATH),
                    "bytes": CANONICAL_PATH.stat().st_size,
                },
                "sideDepth": {
                    "path": str(SIDE_PATH.relative_to(ROOT)),
                    "sha256": file_sha256(SIDE_PATH),
                    "bytes": SIDE_PATH.stat().st_size,
                },
                "entrance": {
                    "path": str(ENTRANCE_PATH.relative_to(ROOT)),
                    "sha256": file_sha256(ENTRANCE_PATH),
                    "bytes": ENTRANCE_PATH.stat().st_size,
                },
            },
        },
        "generator": {
            "sha256": file_sha256(Path(__file__).resolve()),
            "command": (
                "/Applications/Blender.app/Contents/MacOS/Blender "
                "--background --python-exit-code 1 "
                "--python scripts/create_xinhua_community_center_massing_model.py"
            ),
            "blenderVersion": bpy.app.version_string,
        },
        "blend": {
            "sha256": file_sha256(BLEND_PATH),
            "bytes": BLEND_PATH.stat().st_size,
        },
        "glb": glb,
        "budgets": {
            "maxNodes": 4,
            "maxTriangles": 200,
            "maxMaterials": 3,
            "maxImages": 0,
            "maxBytes": 80000,
        },
        "gates": {
            "evidence": "pass-conservative-massing-only",
            "headlessBuild": "pass",
            "fixedViews": "pass",
            "glbAudit": "pending-external-command",
            "mcp1": "pending-main-window-batch",
            "mapProjection": "pass-candidate",
            "roadSurface": "pending-runtime-road-width",
            "runtimeGate": "pending-main-window-scoped-qa",
            "identityAuthorized": False,
            "heroAuthorized": False,
        },
        "recoveryAsset": {
            "status": "retained-in-hold-rejected-as-current-candidate",
            "sha256": "5fe5c22031f2108d4bcb5c7cf631fdfeed0cb3617a646ffbc396e88028fee921",
            "method": "voxel-remesh-current-hero",
            "holdCommit": "3044cd89f801250afcd477dfbcbc7da358bf4b11",
        },
    }
    RECORD_PATH.parent.mkdir(parents=True, exist_ok=True)
    RECORD_PATH.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    binding = json.loads(BINDING_PATH.read_text(encoding="utf-8"))
    footprint = binding["runtimePlacementCandidate"]["localFootprint"]

    for path in (BLEND_PATH.parent, GLB_PATH.parent, PREVIEW_DIR):
        path.mkdir(parents=True, exist_ok=True)

    reset_scene()
    warm_white = make_material(
        "community-center-warm-white",
        (0.78, 0.77, 0.72, 1),
        0.9,
    )
    silver = make_material(
        "community-center-silver-portal",
        (0.46, 0.5, 0.5, 1),
        0.68,
    )
    dark_glass = make_material(
        "community-center-dark-entry",
        (0.055, 0.075, 0.075, 1),
        0.42,
    )

    objects = [
        add_polygon_prism(
            "community-center-two-storey-body",
            footprint,
            0,
            2.6,
            warm_white,
        ),
        add_polygon_prism(
            "community-center-flat-parapet",
            footprint,
            2.6,
            0.22,
            warm_white,
        ),
        add_box(
            "community-center-silver-portal",
            (0.0655, 2.1545),
            (1.36, 0.24),
            0,
            2.95,
            silver,
        ),
        add_box(
            "community-center-dark-entry",
            (0.0655, 2.282),
            (0.78, 0.035),
            0.02,
            0.96,
            dark_glass,
        ),
    ]
    building = join_building(objects)

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.object.select_all(action="DESELECT")
    building.select_set(True)
    bpy.context.view_layer.objects.active = building
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_extras=True,
        export_materials="EXPORT",
        export_yup=True,
    )

    camera = setup_preview()
    render_view(
        camera,
        (0.0, 17.5, 6.4),
        (0.0, 0.0, 1.25),
        CANONICAL_PATH,
        15.2,
    )
    render_view(
        camera,
        (15.5, 1.0, 6.0),
        (0.0, 0.0, 1.25),
        SIDE_PATH,
        13.8,
    )
    render_view(
        camera,
        (9.8, 13.5, 5.4),
        (0.0, 1.0, 1.25),
        ENTRANCE_PATH,
        11.8,
    )
    write_build_record(binding)
    print(
        json.dumps(
            {
                "asset": "xinhua-community-center",
                "blend": str(BLEND_PATH),
                "glb": str(GLB_PATH),
                "record": str(RECORD_PATH),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
