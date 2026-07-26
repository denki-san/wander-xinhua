"""使用211弄九个已绑定 OSM footprint 生成保守 Massing v3。"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
import struct
from typing import Any

import bmesh
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
BINDING_PATH = ROOT / "docs/research/xinhua-villas-211-osm-binding.json"
MAP_PATH = ROOT / "app/scene/xinhua-map-data.json"
OSM_PATH = ROOT / "docs/research/data/xinhua-buildings-osm-20260725-074802.json"
BLEND_PATH = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/massing-v3"
    / "xinhua-villas-211-massing.blend"
)
GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/massing-v3"
    / "xinhua-villas-211-massing.glb"
)
PREVIEW_DIR = ROOT / "test_artifacts/all-models/massing-v3/xinhua-villas-211"
CANONICAL_PATH = PREVIEW_DIR / "test_xinhua-villas-211-massing-v3-canonical.png"
SIDE_PATH = PREVIEW_DIR / "test_xinhua-villas-211-massing-v3-side-depth.png"
ENTRANCE_PATH = PREVIEW_DIR / "test_xinhua-villas-211-massing-v3-entrance.png"
RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/massing-v3"
    / "xinhua-villas-211-massing.json"
)
INTEGRATION_PATH = (
    ROOT / "docs/research/xinhua-villas-211-massing-v3-integration-candidate.json"
)
ASSET_ID = "building:xinhua-road:xinhua-villas-211"
EAVE_HEIGHT = 2.85
RIDGE_HEIGHT = 3.55


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


def make_material() -> bpy.types.Material:
    material = bpy.data.materials.new("xinhua-villas-211-massing-clay")
    color = (0.57, 0.45, 0.32, 1.0)
    material.diffuse_color = color
    material.roughness = 0.92
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled is not None:
        principled.inputs["Base Color"].default_value = color
        principled.inputs["Roughness"].default_value = 0.92
    return material


def project_wgs84(
    longitude: float,
    latitude: float,
    map_meta: dict[str, Any],
) -> tuple[float, float]:
    center_longitude, center_latitude = map_meta["centerWgs84"]
    meters_per_scene_unit = float(map_meta["metersPerSceneUnit"])
    meters_per_longitude_degree = (
        111_320 * math.cos(math.radians(center_latitude))
    )
    return (
        (longitude - center_longitude)
        * meters_per_longitude_degree
        / meters_per_scene_unit,
        -(latitude - center_latitude) * 110_540 / meters_per_scene_unit,
    )


def world_to_registry_local(
    world_point: tuple[float, float],
    placement: dict[str, Any],
) -> tuple[float, float]:
    position_x, position_z = placement["position"]
    scale = float(placement["scale"])
    yaw = float(placement["yaw"])
    dx = (world_point[0] - position_x) / scale
    dz = (world_point[1] - position_z) / scale
    cosine = math.cos(yaw)
    sine = math.sin(yaw)
    return (
        cosine * dx - sine * dz,
        sine * dx + cosine * dz,
    )


def recalculate_normals(mesh: bpy.types.Mesh) -> None:
    editable = bmesh.new()
    editable.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(editable, faces=editable.faces)
    editable.to_mesh(mesh)
    editable.free()
    mesh.update()


def add_footprint_massing(
    way_id: int,
    footprint: list[tuple[float, float]],
    surface: bpy.types.Material,
) -> bpy.types.Object:
    count = len(footprint)
    center = sum((Vector(point) for point in footprint), Vector((0.0, 0.0))) / count

    vertices = [(x, y, 0.0) for x, y in footprint]
    vertices.extend((x, y, EAVE_HEIGHT) for x, y in footprint)
    roof_apex_index = len(vertices)
    vertices.append((center.x, center.y, RIDGE_HEIGHT))

    faces: list[tuple[int, ...]] = [
        tuple(reversed(range(count))),
    ]
    for index in range(count):
        following = (index + 1) % count
        faces.append((index, following, following + count, index + count))
        # 任意 OSM polygon 使用浅坡封闭三角扇，避免长轴 ridge quad 因顶点环向
        # 不一致而产生自交或背面孔洞。屋顶只表达 Massing 层级，不声称真实背坡。
        faces.append((index + count, following + count, roof_apex_index))

    mesh = bpy.data.meshes.new(f"xinhua-villas-211-way-{way_id}-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    recalculate_normals(mesh)
    obj = bpy.data.objects.new(f"xinhua-villas-211-way-{way_id}", mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(surface)
    obj["asset_id"] = ASSET_ID
    obj["tier"] = "massing"
    obj["source_way_id"] = way_id
    obj["house_number"] = "unknown"
    obj["geometry_evidence"] = "raw-osm-footprint"
    obj["height_evidence"] = "inferred-uniform-two-storey-proxy"
    return obj


def load_footprints() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    binding = json.loads(BINDING_PATH.read_text(encoding="utf-8"))
    map_data = json.loads(MAP_PATH.read_text(encoding="utf-8"))
    osm_data = json.loads(OSM_PATH.read_text(encoding="utf-8"))
    ways = {
        int(element["id"]): element
        for element in osm_data["elements"]
        if element.get("type") == "way"
    }
    footprints: list[dict[str, Any]] = []
    for member in binding["members"]:
        way_id = int(member["sourceWayId"])
        way = ways[way_id]
        geometry = way["geometry"]
        if geometry[0] == geometry[-1]:
            geometry = geometry[:-1]
        world_footprint = [
            project_wgs84(point["lon"], point["lat"], map_data["meta"])
            for point in geometry
        ]
        local_footprint = [
            world_to_registry_local(point, binding["registryPlacement"])
            for point in world_footprint
        ]
        footprints.append(
            {
                "sourceWayId": way_id,
                "osmBuildingTag": way["tags"]["building"],
                "worldFootprint": world_footprint,
                "localFootprint": local_footprint,
            }
        )
    return binding, footprints


def add_preview_helpers() -> None:
    ground_material = bpy.data.materials.new("test-ground")
    ground_material.diffuse_color = (0.24, 0.28, 0.24, 1.0)
    bpy.ops.mesh.primitive_plane_add(size=150.0, location=(0.0, 2.0, -0.03))
    ground = bpy.context.active_object
    ground.name = "test-ground"
    ground.data.materials.append(ground_material)

    human_material = bpy.data.materials.new("test-human")
    human_material.diffuse_color = (0.12, 0.18, 0.22, 1.0)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=16,
        radius=0.12,
        depth=0.48,
        location=(-20.0, -19.0, 0.24),
    )
    bpy.context.active_object.name = "test-human-body"
    bpy.context.active_object.data.materials.append(human_material)
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=16,
        ring_count=8,
        radius=0.12,
        location=(-20.0, -19.0, 0.6),
    )
    bpy.context.active_object.name = "test-human-head"
    bpy.context.active_object.data.materials.append(human_material)

    bpy.ops.object.light_add(type="SUN", location=(15.0, -20.0, 34.0))
    sun = bpy.context.active_object
    sun.name = "test-sun"
    sun.rotation_euler = (math.radians(26), 0.0, math.radians(34))
    sun.data.energy = 2.1
    bpy.ops.object.light_add(type="AREA", location=(-28.0, -18.0, 28.0))
    fill = bpy.context.active_object
    fill.name = "test-fill"
    fill.data.energy = 1050.0
    fill.data.shape = "DISK"
    fill.data.size = 22.0


def look_at(camera: bpy.types.Object, target: tuple[float, float, float]) -> None:
    camera.rotation_euler = (
        Vector(target) - camera.location
    ).to_track_quat("-Z", "Y").to_euler()


def render_preview(
    location: tuple[float, float, float],
    target: tuple[float, float, float],
    output: Path,
    lens: float,
) -> None:
    bpy.ops.object.camera_add(location=location)
    camera = bpy.context.active_object
    camera.name = f"test-camera-{output.stem}"
    camera.data.lens = lens
    look_at(camera, target)
    bpy.context.scene.camera = camera
    bpy.context.scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)


def configure_render() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (0.05, 0.06, 0.07)
    scene.view_settings.look = "AgX - Medium High Contrast"


def inspect_glb(path: Path) -> dict[str, Any]:
    binary = path.read_bytes()
    if binary[:4] != b"glTF":
        raise ValueError("导出文件不是 GLB")
    offset = 12
    gltf: dict[str, Any] | None = None
    while offset < len(binary):
        chunk_length, chunk_type = struct.unpack_from("<II", binary, offset)
        offset += 8
        chunk = binary[offset : offset + chunk_length]
        offset += chunk_length
        if chunk_type == 0x4E4F534A:
            gltf = json.loads(chunk.decode("utf-8").rstrip("\x00 "))
            break
    if gltf is None:
        raise ValueError("GLB 缺少 JSON chunk")

    accessors = gltf.get("accessors", [])
    triangles = 0
    bounds_min = [math.inf, math.inf, math.inf]
    bounds_max = [-math.inf, -math.inf, -math.inf]
    for mesh in gltf.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            index_accessor = primitive.get("indices")
            if index_accessor is not None:
                triangles += int(accessors[index_accessor]["count"]) // 3
            else:
                position_accessor = primitive["attributes"]["POSITION"]
                triangles += int(accessors[position_accessor]["count"]) // 3
            position_accessor = accessors[primitive["attributes"]["POSITION"]]
            for axis in range(3):
                bounds_min[axis] = min(
                    bounds_min[axis],
                    float(position_accessor["min"][axis]),
                )
                bounds_max[axis] = max(
                    bounds_max[axis],
                    float(position_accessor["max"][axis]),
                )
    return {
        "sha256": file_sha256(path),
        "bytes": path.stat().st_size,
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
        "rootTransformsNormalized": all(
            "translation" not in node
            and "rotation" not in node
            and "scale" not in node
            and "matrix" not in node
            for node in gltf.get("nodes", [])
        ),
    }


def rounded_footprint(
    footprint: list[tuple[float, float]],
) -> list[list[float]]:
    return [[round(x, 6), round(z, 6)] for x, z in footprint]


def local_aabb(footprint: list[tuple[float, float]]) -> dict[str, float]:
    x_values = [point[0] for point in footprint]
    z_values = [point[1] for point in footprint]
    return {
        "minX": round(min(x_values), 6),
        "maxX": round(max(x_values), 6),
        "minZ": round(min(z_values), 6),
        "maxZ": round(max(z_values), 6),
    }


def write_records(
    binding: dict[str, Any],
    footprints: list[dict[str, Any]],
    glb: dict[str, Any],
) -> None:
    preview_records = {
        "canonical": {
            "path": str(CANONICAL_PATH.relative_to(ROOT)),
            "sha256": file_sha256(CANONICAL_PATH),
            "bytes": CANONICAL_PATH.stat().st_size,
        },
        "side": {
            "path": str(SIDE_PATH.relative_to(ROOT)),
            "sha256": file_sha256(SIDE_PATH),
            "bytes": SIDE_PATH.stat().st_size,
        },
        "entrance": {
            "path": str(ENTRANCE_PATH.relative_to(ROOT)),
            "sha256": file_sha256(ENTRANCE_PATH),
            "bytes": ENTRANCE_PATH.stat().st_size,
        },
    }
    children = [
        {
            "name": f"xinhua-villas-211-way-{item['sourceWayId']}",
            "sourceWayId": item["sourceWayId"],
            "houseNumber": "unknown",
            "osmBuildingTag": item["osmBuildingTag"],
            "worldFootprint": rounded_footprint(item["worldFootprint"]),
            "runtimeLocalFootprint": rounded_footprint(item["localFootprint"]),
            "localObstacleCandidate": {
                "id": f"way-{item['sourceWayId']}",
                **local_aabb(item["localFootprint"]),
            },
        }
        for item in footprints
    ]
    record = {
        "schemaVersion": 1,
        "assetId": ASSET_ID,
        "tier": "massing",
        "batch": "osm-footprint-bound-v3",
        "generatedAt": "2026-07-26",
        "status": "headless-built-pending-main-window-mcp1-and-runtime-map",
        "generator": str(Path(__file__).resolve().relative_to(ROOT)),
        "binding": str(BINDING_PATH.relative_to(ROOT)),
        "placement": binding["registryPlacement"],
        "lineage": {
            "supersededRecoverySha256": binding["recoveryCandidate"]["sha256"],
            "supersededRecoveryMethod": binding["recoveryCandidate"]["method"],
            "replacementReason": "raw-osm-per-way-binding-replaces-unverified-legacy-voxel-remesh",
        },
        "scope": {
            "includedWayIds": [item["sourceWayId"] for item in footprints],
            "houseNumbers": "unknown",
            "excludedContent": binding["scope"]["excluded"],
        },
        "heightContract": {
            "eaveSceneUnits": EAVE_HEIGHT,
            "ridgeSceneUnits": RIDGE_HEIGHT,
            "source": "inferred-uniform-two-storey-proxy",
            "surveyed": False,
        },
        "children": children,
        "outputs": {
            "blend": {
                "path": str(BLEND_PATH.relative_to(ROOT)),
                "sha256": file_sha256(BLEND_PATH),
                "bytes": BLEND_PATH.stat().st_size,
            },
            "glb": str(GLB_PATH.relative_to(ROOT)),
            "previews": preview_records,
        },
        "glb": glb,
        "mapCalibration": binding["mapCalibration"],
        "gates": {
            "evidence": "pass-conservative-massing-footprints-only",
            "headlessBuild": "pass",
            "glbAudit": "pending-explicit-command",
            "mcp1": "pending-main-window-batch",
            "mapGeometry": "pass-analytic-candidate",
            "runtimeMap": "pending-main-window-scoped-qa",
            "hero": "blocked-evidence",
            "identity": "blocked-evidence",
        },
    }
    RECORD_PATH.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    local_bounds = {
        "minX": min(
            child["localObstacleCandidate"]["minX"] for child in children
        ),
        "maxX": max(
            child["localObstacleCandidate"]["maxX"] for child in children
        ),
        "minZ": min(
            child["localObstacleCandidate"]["minZ"] for child in children
        ),
        "maxZ": max(
            child["localObstacleCandidate"]["maxZ"] for child in children
        ),
    }
    integration = {
        "schemaVersion": 1,
        "assetId": "xinhua-villas-211",
        "tier": "massing",
        "status": "candidate-pending-main-window-mcp1-and-runtime-map",
        "model": "/models/tiers/xinhua-road/massing-v3/xinhua-villas-211-massing.glb",
        "modelSourcePath": str(GLB_PATH.relative_to(ROOT)),
        "modelSha256": glb["sha256"],
        "cacheVersion": glb["sha256"][:12],
        "placement": {
            **binding["registryPlacement"],
            "keepUnchanged": True,
        },
        "localBounds": local_bounds,
        "localObstacles": [
            child["localObstacleCandidate"] for child in children
        ],
        "memberIdentity": "unknown-do-not-invent",
        "mapCalibration": binding["mapCalibration"],
        "fastManifestCandidate": {
            "tests": [
                "scripts/test_xinhua_villas_211_massing_map_gate.mjs",
                "tests/test_model_detail_upgrade.test.mjs",
                "tests/test_xinhua_road_models.test.mjs",
            ],
            "glbs": [
                "public/models/xinhua-road/xinhua-villas-211.glb",
                str(GLB_PATH.relative_to(ROOT)),
            ],
            "runtimeRoutes": [
                "/?start=villas&cameraQa=1&qaAutoStart=1",
                "/?start=villas&qaModelId=xinhua-villas-211&qaModelTier=massing&cameraQa=1&qaAutoStart=1",
            ],
        },
        "sharedHookInstructions": [
            "Only qaModelId=xinhua-villas-211 and qaModelTier=massing may select this candidate.",
            "Keep the current position, yaw, scale, start and forward for first runtime calibration.",
            "Use the nine local obstacle candidates separately; never replace them with one compound AABB.",
            "Do not promote to production until main-window MCP1 and real Three.js map acceptance pass.",
        ],
        "gates": record["gates"],
    }
    INTEGRATION_PATH.write_text(
        json.dumps(integration, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    binding, footprints = load_footprints()
    reset_scene()
    for directory in (
        BLEND_PATH.parent,
        GLB_PATH.parent,
        PREVIEW_DIR,
        RECORD_PATH.parent,
    ):
        directory.mkdir(parents=True, exist_ok=True)

    surface = make_material()
    model_objects = [
        add_footprint_massing(
            item["sourceWayId"],
            item["localFootprint"],
            surface,
        )
        for item in footprints
    ]

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH), compress=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in model_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = model_objects[0]
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
    )

    configure_render()
    add_preview_helpers()
    render_preview(
        (43.0, -98.0, 35.0),
        (-4.0, 3.0, 2.2),
        CANONICAL_PATH,
        55.0,
    )
    render_preview(
        (-84.0, 2.0, 26.0),
        (-3.0, 2.0, 2.0),
        SIDE_PATH,
        55.0,
    )
    render_preview(
        (-8.0, -49.0, 11.0),
        (-9.0, -2.0, 1.8),
        ENTRANCE_PATH,
        52.0,
    )

    glb = inspect_glb(GLB_PATH)
    write_records(binding, footprints, glb)
    print(
        json.dumps(
            {
                "blend": str(BLEND_PATH),
                "glb": str(GLB_PATH),
                "sha256": glb["sha256"],
                "bytes": glb["bytes"],
                "triangles": glb["triangles"],
                "nodes": glb["nodes"],
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
