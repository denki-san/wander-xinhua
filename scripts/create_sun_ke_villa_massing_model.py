"""确定性生成孙科别墅单资产 Massing、预览与 build record。"""

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
WAY_ID = 864847877
AUDITED_AT = "2026-07-25"
BLEND_PATH = (
    ROOT
    / "assets/models/source/tiers/sun-ke-villa/massing/sun-ke-villa-massing.blend"
)
GLB_PATH = (
    ROOT
    / "public/models/tiers/sun-ke-villa/massing/sun-ke-villa-massing.glb"
)
PREVIEW_DIR = ROOT / "test_artifacts/all-models/massing/sun-ke-villa"
CANONICAL_PATH = PREVIEW_DIR / "test_sun-ke-villa-massing-canonical.png"
SIDE_PATH = PREVIEW_DIR / "test_sun-ke-villa-massing-side.png"
RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/sun-ke-villa/massing"
    / "sun-ke-villa-massing.json"
)

# 从 recovery commit 3044cd8 的 exact-footprint 生成记录提取。
LOCAL_FOOTPRINT = [
    (-3.91582, -2.762559),
    (3.913068, -2.76667),
    (3.91577, 2.76465),
    (-3.913157, 2.76466),
]
SOURCE_FOOTPRINT = [
    [47.624717, -160.136277],
    [55.453257, -160.21404],
    [55.507173, -154.682982],
    [47.678246, -154.609295],
]
SITE_POSITION = [8.3149, -147.5366]
LOCAL_POSITION = [43.2515, -9.8836]
RUNTIME_YAW = 0.009414
WORLD_PIVOT = [51.5664, -157.4202]


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


def create_named_material(
    name: str,
    color: tuple[float, float, float, float],
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.roughness = 0.95
    return material


def add_extruded_polygon(
    points: list[tuple[float, float]],
    height: float,
    material: bpy.types.Material,
    extras: dict[str, Any],
) -> bpy.types.Object:
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
    mesh = bpy.data.meshes.new(f"osm-way-{WAY_ID}-massing-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(f"osm-way-{WAY_ID}-massing", mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(material)
    for key, value in extras.items():
        obj[key] = value
    return obj


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
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=12,
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
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=12,
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


def build_model() -> bpy.types.Object:
    wall = create_named_material(
        "sun-ke-villa-massing-wall",
        (0.66, 0.60, 0.53, 1.0),
    )
    roof = create_named_material(
        "sun-ke-villa-massing-roof",
        (0.43, 0.20, 0.13, 1.0),
    )
    extras = {
        "asset_id": "building:shangsheng:osm-way-864847877",
        "tier": "massing",
        "source_way_id": WAY_ID,
        "geometry_evidence": "observed-osm-footprint",
        "height_evidence": (
            "sun-ke-villa-three-view-visual-inference-plus-existing-v2-envelope"
        ),
        "authored_front": "garden-facade-local-three-plus-z-world-south-facing",
        "authored_footprint_axis": "-BlenderY",
        "exported_footprint_axis": "ThreeZ",
        "runtime_correction_scale_z": 1,
        "identity_allowed": False,
    }
    objects: list[bpy.types.Object] = []
    footprint = add_extruded_polygon(
        LOCAL_FOOTPRINT,
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
            ),
            add_gable_roof(
                "sun-ke-villa-west-wing-gable-roof",
                (-2.92, -0.08),
                2.04,
                3.92,
                2.68,
                3.13,
                roof,
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
            ),
            add_box(
                "sun-ke-villa-main-chimney",
                (1.04, 0.58, 4.39),
                (0.45, 0.40, 1.32),
                wall,
            ),
        ]
    )

    # 北侧门廊沿 +Blender Y 外挑；只保留柱、梁和屋顶，中间车道贯通。
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

    obj = join_objects(objects, f"osm-way-{WAY_ID}-massing")
    for key, value in extras.items():
        obj[key] = value
    obj["geometry_evidence"] = (
        "observed-osm-main-footprint-plus-photo-supported-major-volumes"
    )
    obj["massing_shape"] = "structured-named-landmark"
    obj["porte_cochere_passage"] = "open-between-local-column-obstacles"
    return obj


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


def configure_scene() -> None:
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
    scene["asset_id"] = "building:shangsheng:osm-way-864847877"
    scene["tier"] = "massing"
    # 为了让独立生成器逐字节重现 recovery GLB，保留当时导出的 scene extras。
    # 这两个字符串只是二进制 lineage，不会读取批量 generator 或 12 栋 spec。
    scene["batch"] = "shangsheng-huashan-exact-footprint"
    scene["geometry_spec"] = (
        "docs/research/shangsheng-huashan-clean-massing-geometry-spec.json"
    )
    scene["source_way_id"] = WAY_ID
    scene["runtime_position"] = LOCAL_POSITION
    scene["runtime_yaw"] = RUNTIME_YAW
    scene["runtime_scale"] = [1.0, 1.0, 1.0]
    scene["placement_locked"] = True


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


def write_record(audit: dict[str, Any]) -> None:
    record = {
        "version": 2,
        "auditedAt": AUDITED_AT,
        "assetId": "building:shangsheng:osm-way-864847877",
        "stableId": "sun-ke-villa",
        "tier": "massing",
        "status": "formal-pass-recovered-and-single-asset-reproduced",
        "recoveredFromCommit": "3044cd89f801250afcd477dfbcbc7da358bf4b11",
        "recoveryCompatibilitySceneMetadata": {
            "batch": "shangsheng-huashan-exact-footprint",
            "geometrySpec": (
                "docs/research/shangsheng-huashan-clean-massing-geometry-spec.json"
            ),
            "note": (
                "仅为逐字节复现 recovery GLB 的 scene extras；独立生成不读取"
                "批量 generator 或 12 栋 geometry spec"
            ),
        },
        "generator": "scripts/create_sun_ke_villa_massing_model.py",
        "generatorSha256": file_sha256(Path(__file__).resolve()),
        "modelBrief": "docs/research/sun-ke-villa-model-brief.md",
        "sourceWayId": WAY_ID,
        "sourceFootprint": SOURCE_FOOTPRINT,
        "localFootprint": [list(point) for point in clean_points(LOCAL_FOOTPRINT)],
        "massingGeometry": {
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
        },
        "placement": {
            "sitePosition": SITE_POSITION,
            "localPosition": LOCAL_POSITION,
            "worldPivot": WORLD_PIVOT,
            "yaw": RUNTIME_YAW,
            "runtimeScale": [1, 1, 1],
            "movementAuthorized": False,
        },
        "heightEvidence": {
            "meters": 13.635,
            "sceneUnits": 5.05,
            "source": (
                "sun-ke-villa-three-view-visual-inference-plus-existing-v2-envelope"
            ),
            "status": "visual-inference-not-survey",
        },
        "canonicalFront": "garden-facade-local-three-plus-z-world-south-facing",
        "identityAllowed": False,
        "mapAcceptance": "formal-pass",
        "runtimeGate": "formal-pass",
        "qaRecords": {
            "blenderMcp": "docs/research/sun-ke-villa-blender-mcp-gates-v2.json",
            "map": "docs/research/sun-ke-villa-massing-map-qa-v2.json",
            "runtime": "docs/research/sun-ke-villa-three-tier-runtime-qa-v3.json",
        },
        "outputs": {
            "blend": str(BLEND_PATH.relative_to(ROOT)),
            "glb": str(GLB_PATH.relative_to(ROOT)),
            "previews": {
                "canonical": str(CANONICAL_PATH.relative_to(ROOT)),
                "side": str(SIDE_PATH.relative_to(ROOT)),
            },
        },
        "glb": audit,
    }
    RECORD_PATH.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )


def main() -> None:
    for directory in (
        BLEND_PATH.parent,
        GLB_PATH.parent,
        PREVIEW_DIR,
        RECORD_PATH.parent,
    ):
        directory.mkdir(parents=True, exist_ok=True)
    reset_scene()
    configure_scene()
    obj = build_model()
    export_glb(GLB_PATH, obj)
    audit = parse_glb(GLB_PATH)
    if audit["nodes"] != 1 or audit["meshes"] != 1 or audit["materials"] != 2:
        raise RuntimeError(f"Massing 结构预算失败：{audit}")
    if audit["images"] or audit["textures"] or audit["animations"]:
        raise RuntimeError(f"Massing 不允许图片、贴图或动画：{audit}")
    if audit["transformedNodes"]:
        raise RuntimeError(f"Massing GLB 节点存在未烘焙变换：{audit}")
    if audit["bytes"] > 96_000 or audit["triangles"] > 1_200:
        raise RuntimeError(f"Massing 超出预算：{audit}")
    if abs(audit["bounds"]["min"][1]) > 1e-5:
        raise RuntimeError(f"Massing GLB 未接地：{audit['bounds']}")

    add_preview_ground([obj])
    render_preview([obj], "canonical", CANONICAL_PATH)
    render_preview([obj], "side", SIDE_PATH)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    write_record(audit)
    print(json.dumps(audit, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
