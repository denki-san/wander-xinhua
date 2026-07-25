"""根据329弄本地照片与 OSM 成员绑定生成单资产 Massing v3。"""

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
BINDING_PATH = ROOT / "docs/research/xinhua-villas-329-member-binding.json"
BLEND_PATH = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/massing-v3"
    / "xinhua-villas-329-massing.blend"
)
GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/massing-v3"
    / "xinhua-villas-329-massing.glb"
)
PREVIEW_DIR = (
    ROOT
    / "test_artifacts/all-models/massing-v3/xinhua-villas-329"
)
CANONICAL_PATH = PREVIEW_DIR / "test_xinhua-villas-329-massing-v3-canonical.png"
SIDE_PATH = PREVIEW_DIR / "test_xinhua-villas-329-massing-v3-side-depth.png"
ENTRANCE_PATH = PREVIEW_DIR / "test_xinhua-villas-329-massing-v3-entrance.png"
RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/massing-v3"
    / "xinhua-villas-329-massing.json"
)
SCENE_UNIT_METERS = 2.7
ASSET_ID = "building:xinhua-road:xinhua-villas-329"


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
    roughness: float = 0.9,
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


def rectangle_basis(
    footprint: list[list[float]],
) -> tuple[Vector, Vector, Vector, float, float]:
    """从四点 OSM footprint 提取中心、长轴、短轴与尺寸。"""

    points = [Vector((float(x), float(y))) for x, y in footprint]
    center = sum(points, Vector((0.0, 0.0))) / len(points)
    edges = [
        (points[(index + 1) % len(points)] - points[index])
        for index in range(len(points))
    ]
    long_edge = max(edges, key=lambda edge: edge.length)
    u_axis = long_edge.normalized()
    v_axis = Vector((-u_axis.y, u_axis.x))
    u_values = [(point - center).dot(u_axis) for point in points]
    v_values = [(point - center).dot(v_axis) for point in points]
    length = max(u_values) - min(u_values)
    width = max(v_values) - min(v_values)
    return center, u_axis, v_axis, length, width


def local_to_world(
    center: Vector,
    u_axis: Vector,
    v_axis: Vector,
    x_value: float,
    y_value: float,
    z_value: float,
) -> tuple[float, float, float]:
    point = center + u_axis * x_value + v_axis * y_value
    return (point.x, point.y, z_value)


def add_oriented_box(
    name: str,
    center: Vector,
    u_axis: Vector,
    length: float,
    width: float,
    height: float,
    z_bottom: float,
    surface: bpy.types.Material,
    *,
    offset_u: float = 0.0,
    offset_v: float = 0.0,
) -> bpy.types.Object:
    v_axis = Vector((-u_axis.y, u_axis.x))
    position = center + u_axis * offset_u + v_axis * offset_v
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(position.x, position.y, z_bottom + height / 2.0),
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = (length, width, height)
    obj.rotation_euler[2] = math.atan2(u_axis.y, u_axis.x)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.data.materials.append(surface)
    return obj


def add_gable_roof(
    name: str,
    center: Vector,
    u_axis: Vector,
    length: float,
    width: float,
    eave_z: float,
    ridge_z: float,
    surface: bpy.types.Material,
) -> bpy.types.Object:
    v_axis = Vector((-u_axis.y, u_axis.x))
    local_vertices = [
        (-length / 2, -width / 2, eave_z),
        (length / 2, -width / 2, eave_z),
        (length / 2, width / 2, eave_z),
        (-length / 2, width / 2, eave_z),
        (-length / 2, 0.0, ridge_z),
        (length / 2, 0.0, ridge_z),
    ]
    vertices = [
        local_to_world(center, u_axis, v_axis, x_value, y_value, z_value)
        for x_value, y_value, z_value in local_vertices
    ]
    faces = [
        (0, 1, 5, 4),
        (3, 4, 5, 2),
        (0, 4, 3),
        (1, 2, 5),
        (0, 3, 2, 1),
    ]
    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(surface)
    return obj


def add_hip_roof(
    name: str,
    center: Vector,
    u_axis: Vector,
    length: float,
    width: float,
    eave_z: float,
    ridge_z: float,
    surface: bpy.types.Material,
) -> bpy.types.Object:
    v_axis = Vector((-u_axis.y, u_axis.x))
    ridge_half = max(0.25, length * 0.24)
    local_vertices = [
        (-length / 2, -width / 2, eave_z),
        (length / 2, -width / 2, eave_z),
        (length / 2, width / 2, eave_z),
        (-length / 2, width / 2, eave_z),
        (-ridge_half, 0.0, ridge_z),
        (ridge_half, 0.0, ridge_z),
    ]
    vertices = [
        local_to_world(center, u_axis, v_axis, x_value, y_value, z_value)
        for x_value, y_value, z_value in local_vertices
    ]
    faces = [
        (0, 1, 5, 4),
        (3, 4, 5, 2),
        (0, 4, 3),
        (1, 2, 5),
        (0, 3, 2, 1),
    ]
    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(surface)
    return obj


def add_round_volume(
    name: str,
    center: Vector,
    u_axis: Vector,
    radius: float,
    height: float,
    z_bottom: float,
    surface: bpy.types.Material,
    *,
    offset_u: float,
) -> bpy.types.Object:
    position = center + u_axis * offset_u
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=20,
        radius=radius,
        depth=height,
        location=(position.x, position.y, z_bottom + height / 2.0),
    )
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.data.materials.append(surface)
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
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return joined


def build_member(
    member: dict[str, Any],
    surfaces: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    number = member["houseNumber"]
    # binding 保存 GLB source XZ；Blender 导出时会把 Blender Y 写成 -Z。
    # 因此这里显式转换，避免把 sourceZ 误当作 Blender Y 后在地图中镜像漂移。
    footprint = [
        [float(source_x), -float(source_z)]
        for source_x, source_z in member["localFootprint"]
    ]
    contract = member["modelContract"]
    center, u_axis, v_axis, length, width = rectangle_basis(footprint)
    eave_height = float(contract["eaveHeight"])
    ridge_height = float(contract["ridgeHeight"])
    kind = contract["kind"]
    body_length = max(1.0, length * 0.94)
    body_width = max(1.0, width * 0.92)
    objects: list[bpy.types.Object] = []

    base_length = body_length
    base_offset_u = 0.0
    if kind == "round-cake-villa":
        base_length = body_length * 0.68
        base_offset_u = -body_length * 0.16
    objects.append(
        add_oriented_box(
            f"member-{number}-observed-osm-body",
            center,
            u_axis,
            base_length,
            body_width,
            eave_height,
            0.0,
            surfaces["plaster"],
            offset_u=base_offset_u,
        ),
    )

    if kind == "round-cake-villa":
        objects.append(
            add_hip_roof(
                f"member-{number}-low-tile-roof",
                center,
                u_axis,
                body_length * 1.03,
                body_width * 1.04,
                eave_height,
                ridge_height,
                surfaces["roof"],
            ),
        )
        objects.append(
            add_round_volume(
                f"member-{number}-round-principal-volume",
                center,
                u_axis,
                min(body_width * 0.31, body_length * 0.24),
                eave_height * 0.94,
                0.0,
                surfaces["plaster"],
                offset_u=body_length * 0.29,
            ),
        )
        objects.append(
            add_oriented_box(
                f"member-{number}-tall-chimney",
                center,
                u_axis,
                max(0.55, body_length * 0.08),
                max(0.55, body_width * 0.10),
                ridge_height + 1.0,
                0.0,
                surfaces["brick"],
                offset_u=-body_length * 0.18,
                offset_v=body_width * 0.2,
            ),
        )
    elif kind == "upper-pavilion-villa":
        objects.append(
            add_hip_roof(
                f"member-{number}-tile-roof",
                center,
                u_axis,
                body_length * 1.03,
                body_width * 1.04,
                eave_height,
                eave_height + 0.65,
                surfaces["roof"],
            ),
        )
        objects.append(
            add_oriented_box(
                f"member-{number}-dark-upper-pavilion",
                center,
                u_axis,
                body_length * 0.46,
                body_width * 0.72,
                ridge_height - eave_height + 0.15,
                eave_height,
                surfaces["frame"],
                offset_u=body_length * 0.12,
            ),
        )
        objects.append(
            add_oriented_box(
                f"member-{number}-low-entrance-canopy",
                center,
                u_axis,
                body_length * 0.32,
                body_width * 0.22,
                0.22,
                eave_height * 0.56,
                surfaces["roof"],
                offset_v=-body_width * 0.35,
            ),
        )
    elif kind == "front-gabled-lanting":
        objects.append(
            add_gable_roof(
                f"member-{number}-front-gable",
                center,
                u_axis,
                body_length * 1.03,
                body_width * 1.04,
                eave_height,
                ridge_height,
                surfaces["roof"],
            ),
        )
        objects.append(
            add_oriented_box(
                f"member-{number}-shallow-entry-canopy",
                center,
                u_axis,
                body_length * 0.38,
                body_width * 0.2,
                0.2,
                eave_height * 0.53,
                surfaces["roof"],
                offset_v=-body_width * 0.36,
            ),
        )
    else:
        objects.append(
            add_gable_roof(
                f"member-{number}-evidence-limited-roof",
                center,
                u_axis,
                body_length * 1.02,
                body_width * 1.03,
                eave_height,
                ridge_height,
                surfaces["roof"],
            ),
        )

    joined = join_objects(objects, f"xinhua-villas-329-member-{number}")
    joined["asset_id"] = ASSET_ID
    joined["tier"] = "massing"
    joined["house_number"] = number
    joined["source_way_id"] = int(member["sourceWayId"])
    joined["binding_status"] = member["bindingStatus"]
    joined["geometry_evidence"] = "observed-osm-footprint-plus-local-photo-silhouette"
    joined["unknown_faces_omitted"] = True
    return joined


def add_preview_helpers() -> None:
    ground = make_material("test-ground", (0.24, 0.27, 0.23, 1.0))
    bpy.ops.mesh.primitive_plane_add(size=120.0, location=(0.0, 0.0, -0.03))
    bpy.context.active_object.name = "test-ground"
    bpy.context.active_object.data.materials.append(ground)

    proxy = make_material("test-human", (0.16, 0.22, 0.27, 1.0))
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=16,
        radius=0.12,
        depth=0.48,
        location=(-2.5, -19.0, 0.24),
    )
    bpy.context.active_object.name = "test-human-proxy"
    bpy.context.active_object.data.materials.append(proxy)
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=16,
        ring_count=8,
        radius=0.12,
        location=(-2.5, -19.0, 0.6),
    )
    bpy.context.active_object.name = "test-human-head"
    bpy.context.active_object.data.materials.append(proxy)

    bpy.ops.object.light_add(type="SUN", location=(12.0, -18.0, 30.0))
    sun = bpy.context.active_object
    sun.name = "test-sun"
    sun.rotation_euler = (math.radians(28), 0.0, math.radians(32))
    sun.data.energy = 2.2
    bpy.ops.object.light_add(type="AREA", location=(-10.0, -18.0, 24.0))
    area = bpy.context.active_object
    area.name = "test-fill"
    area.data.energy = 950.0
    area.data.shape = "DISK"
    area.data.size = 18.0


def look_at(camera: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


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
            if primitive.get("mode", 4) != 4:
                continue
            index_accessor = primitive.get("indices")
            if index_accessor is not None:
                triangles += int(accessors[index_accessor]["count"]) // 3
            else:
                position_accessor = primitive["attributes"]["POSITION"]
                triangles += int(accessors[position_accessor]["count"]) // 3
            position_accessor = accessors[primitive["attributes"]["POSITION"]]
            if "min" in position_accessor and "max" in position_accessor:
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


def configure_render() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (0.045, 0.055, 0.07)
    scene.view_settings.look = "AgX - Medium High Contrast"


def main() -> None:
    binding = json.loads(BINDING_PATH.read_text(encoding="utf-8"))
    reset_scene()
    for output_dir in (
        BLEND_PATH.parent,
        GLB_PATH.parent,
        PREVIEW_DIR,
        RECORD_PATH.parent,
    ):
        output_dir.mkdir(parents=True, exist_ok=True)

    surfaces = {
        "plaster": make_material(
            "xinhua-villas-329-massing-warm-plaster",
            (0.62, 0.53, 0.39, 1.0),
        ),
        "roof": make_material(
            "xinhua-villas-329-massing-muted-tile",
            (0.28, 0.13, 0.09, 1.0),
        ),
        "frame": make_material(
            "xinhua-villas-329-massing-dark-frame",
            (0.10, 0.12, 0.11, 1.0),
        ),
        "brick": make_material(
            "xinhua-villas-329-massing-chimney-brick",
            (0.38, 0.18, 0.12, 1.0),
        ),
    }
    model_objects = [
        build_member(member, surfaces)
        for member in binding["members"]
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
    )

    configure_render()
    add_preview_helpers()
    render_preview(
        (35.0, -49.0, 16.0),
        (-3.0, -1.5, 2.6),
        CANONICAL_PATH,
        51.0,
    )
    render_preview(
        (-48.0, -24.0, 15.0),
        (-3.0, -1.5, 2.8),
        SIDE_PATH,
        54.0,
    )
    render_preview(
        (18.0, -43.0, 10.0),
        (-1.0, -4.0, 2.5),
        ENTRANCE_PATH,
        58.0,
    )

    glb = inspect_glb(GLB_PATH)
    child_records = []
    for member in binding["members"]:
        x_values = [point[0] for point in member["localFootprint"]]
        source_z_values = [point[1] for point in member["localFootprint"]]
        child_records.append(
            {
                "name": f"xinhua-villas-329-member-{member['houseNumber']}",
                "sourceWayId": member["sourceWayId"],
                "houseNumber": member["houseNumber"],
                "bindingStatus": member["bindingStatus"],
                "geometryEvidence": "observed-osm-footprint-plus-local-photo-silhouette",
                "localFootprintCoordinateSpace": binding["coordinateContract"][
                    "authoredCoordinateSpace"
                ],
                "localFootprint": member["localFootprint"],
                "sourceFootprintAabb": {
                    "minX": round(min(x_values), 6),
                    "maxX": round(max(x_values), 6),
                    "minZ": round(min(source_z_values), 6),
                    "maxZ": round(max(source_z_values), 6),
                },
                "observedCues": member["modelContract"]["observedCues"],
                "omittedUnknowns": member["modelContract"]["omittedUnknowns"],
            },
        )
    record = {
        "schemaVersion": 1,
        "assetId": ASSET_ID,
        "tier": "massing",
        "batch": "evidence-bound-v3",
        "generatedAt": "2026-07-26",
        "status": "headless-built-pending-main-window-mcp1-and-map-gate",
        "generator": "scripts/create_xinhua_villas_329_massing_model.py",
        "memberBinding": str(BINDING_PATH.relative_to(ROOT)),
        "modelBrief": "docs/research/xinhua-villas-329-model-brief.md",
        "sourceEvidence": {
            "xhsDirectory": "docs/research/assets/xhs-xinhua-villas-329-20260725",
            "officialMembers": [
                "docs/research/assets/poi-references/xinhua-villas-329/xinhua-villas-329-17-official-2024.jpg",
                "docs/research/assets/poi-references/xinhua-villas-329/xinhua-villas-329-38-official-2025.jpg",
            ],
        },
        "placement": {
            **binding["registryPlacement"],
            "authoredFront": "compound-member-specific-facing-unknown",
        },
        "coordinateValidation": {
            "source": binding["coordinateContract"]["source"],
            "mapMetadata": binding["coordinateContract"]["mapMetadata"],
            "authoredCoordinateSpace": binding["coordinateContract"][
                "authoredCoordinateSpace"
            ],
            "maximumWorldVertexErrorSceneUnits": binding[
                "worldProjectionValidation"
            ]["maximumErrorSceneUnits"],
            "toleranceSceneUnits": binding["worldProjectionValidation"][
                "toleranceSceneUnits"
            ],
            "status": binding["worldProjectionValidation"]["status"],
        },
        "scope": {
            "includedHouseNumbers": [
                member["houseNumber"] for member in binding["members"]
            ],
            "excludedWayIds": [
                candidate["sourceWayId"]
                for candidate in binding["excludedCandidates"]
            ],
            "excludedContent": [
                "evidence-unbound adjacent way/864493245",
                "trees and vegetation",
                "street furniture and decoration",
                "unmapped members 17, 32乙, 38 and 231",
                "unknown rear-face detail",
            ],
        },
        "children": child_records,
        "outputs": {
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
        "blend": {
            "sha256": file_sha256(BLEND_PATH),
            "bytes": BLEND_PATH.stat().st_size,
            "blenderVersion": bpy.app.version_string,
            "editable": True,
            "savedQaHelpers": False,
        },
        "glb": glb,
        "budgets": {
            "maxNodes": 8,
            "maxTriangles": 2000,
            "maxMaterials": 4,
            "maxImages": 0,
            "maxBytes": 220000,
        },
        "gates": {
            "evidence": "pass-conservative-massing-only",
            "headlessBuild": "pass",
            "glbStructure": "pending-explicit-audit-command",
            "mcp1": "pending-main-window-batch",
            "runtimeGate": "pending-main-window-scoped-qa",
            "mapAcceptance": "pending-main-window-scoped-qa",
            "heroAuthorized": False,
            "identityAuthorized": False,
        },
        "lineage": {
            "recoveryCheckpointCommit": "bdc038d4685ab94e4c78af1dfd83adb3ee8460b0",
            "recoveryMassingSha256": "f7ade44ba879dead433abd006603a613520af730d9a2a35dada412b99a0c3819",
            "change": "Rebuilt four evidence-bound members from raw OSM WGS84 projection and retained way/864493245 as evidence-unbound adjacent.",
        },
    }
    RECORD_PATH.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(record, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
