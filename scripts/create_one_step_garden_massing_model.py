"""确定性生成一号花园单资产 Massing、三视图与 build record。"""

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
AUDITED_AT = "2026-07-25"
RECOVERY_COMMIT = "3044cd89f801250afcd477dfbcbc7da358bf4b11"
BLEND_PATH = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/massing-v2"
    / "one-step-garden-massing.blend"
)
GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/massing-v2"
    / "one-step-garden-massing.glb"
)
PREVIEW_DIR = ROOT / "test_artifacts/all-models/massing-v2/one-step-garden"
CANONICAL_PATH = PREVIEW_DIR / "test_one-step-garden-massing-canonical.png"
SIDE_PATH = PREVIEW_DIR / "test_one-step-garden-massing-side-depth.png"
ENTRANCE_PATH = PREVIEW_DIR / "test_one-step-garden-massing-entrance.png"
RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/massing-v2"
    / "one-step-garden-massing.json"
)

# 地图门前冻结旧 Hero 的公共落点与整体包络，不据低置信度 OSM 候选移动。
RUNTIME_POSITION = [60.86, 120.73]
RUNTIME_YAW = -0.38
RUNTIME_SCALE = 0.88
AUTHORED_FRONT = "local-negative-y"
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


def material(
    name: str,
    color: tuple[float, float, float, float],
) -> bpy.types.Material:
    value = bpy.data.materials.new(name)
    value.diffuse_color = color
    value.roughness = 0.92
    return value


def add_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    surface: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.data.materials.append(surface)
    return obj


def add_gable_roof(
    name: str,
    center: tuple[float, float],
    length: float,
    span: float,
    eave_z: float,
    ridge_z: float,
    surface: bpy.types.Material,
    *,
    ridge_axis: str,
) -> bpy.types.Object:
    """加入封底双坡屋面；ridge_axis 指屋脊延伸方向。"""

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
    elif ridge_axis == "Y":
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
    else:
        raise ValueError(f"不支持的屋脊方向：{ridge_axis}")

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
    obj.data.materials.append(surface)
    return obj


def add_shed_roof(
    name: str,
    center: tuple[float, float],
    width: float,
    depth: float,
    front_z: float,
    rear_z: float,
    surface: bpy.types.Material,
) -> bpy.types.Object:
    """加入从院内后侧向临街前侧下落的棚屋形屋面。"""

    cx, cy = center
    x0, x1 = cx - width / 2, cx + width / 2
    y0, y1 = cy - depth / 2, cy + depth / 2
    vertices = [
        (x0, y0, front_z),
        (x1, y0, front_z),
        (x1, y1, rear_z),
        (x0, y1, rear_z),
        (x0, y0, front_z - 0.18),
        (x1, y0, front_z - 0.18),
        (x1, y1, rear_z - 0.18),
        (x0, y1, rear_z - 0.18),
    ]
    faces = [
        (0, 1, 2, 3),
        (7, 6, 5, 4),
        (0, 4, 5, 1),
        (1, 5, 6, 2),
        (2, 6, 7, 3),
        (3, 7, 4, 0),
    ]
    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
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
    return joined


def build_model() -> bpy.types.Object:
    """用照片可见轮廓重建前后分体，不采用五个未绑定 OSM 平顶盒。"""

    plaster = material(
        "one-step-garden-massing-warm-plaster",
        (0.78, 0.72, 0.62, 1.0),
    )
    brick = material(
        "one-step-garden-massing-muted-brick",
        (0.42, 0.20, 0.15, 1.0),
    )
    roof = material(
        "one-step-garden-massing-dark-tile-roof",
        (0.17, 0.19, 0.18, 1.0),
    )
    objects: list[bpy.types.Object] = []

    # 临街白色建筑：三面体量围出小院，左右翼屋脊沿纵深方向。
    objects.extend(
        [
            add_box(
                "front-courtyard-back-volume",
                (0.0, 0.0, 2.1),
                (8.4, 3.6, 4.2),
                plaster,
            ),
            add_gable_roof(
                "front-courtyard-back-roof",
                (0.0, 0.0),
                8.8,
                4.0,
                4.2,
                5.65,
                roof,
                ridge_axis="X",
            ),
            add_box(
                "front-left-gabled-wing",
                (-5.0, -3.1, 2.0),
                (3.4, 7.2, 4.0),
                plaster,
            ),
            add_gable_roof(
                "front-left-steep-gable",
                (-5.0, -3.1),
                7.6,
                3.8,
                4.0,
                6.25,
                roof,
                ridge_axis="Y",
            ),
            add_box(
                "front-right-gabled-wing",
                (5.0, -3.05, 1.85),
                (3.2, 7.1, 3.7),
                plaster,
            ),
            add_gable_roof(
                "front-right-gable",
                (5.0, -3.05),
                7.5,
                3.6,
                3.7,
                5.55,
                roof,
                ridge_axis="Y",
            ),
            # 临街入口棚只保留屋面，下面通道保持开放。
            add_shed_roof(
                "front-open-entry-canopy",
                (1.1, -6.25),
                4.6,
                1.15,
                1.1,
                1.35,
                roof,
            ),
            add_box(
                "front-open-entry-canopy-left-post",
                (-1.15, -6.25, 0.55),
                (0.18, 0.18, 1.1),
                roof,
            ),
            add_box(
                "front-open-entry-canopy-right-post",
                (3.35, -6.25, 0.55),
                (0.18, 0.18, 1.1),
                roof,
            ),
            # canonical 照片中可见的棚屋形老虎窗仅表达轮廓，不做窗框细节。
            add_box(
                "front-observed-shed-dormer-volume",
                (0.9, -1.7, 4.65),
                (3.3, 0.9, 1.0),
                plaster,
            ),
            add_shed_roof(
                "front-observed-shed-dormer-roof",
                (0.9, -2.05),
                3.65,
                1.35,
                5.2,
                5.55,
                roof,
            ),
        ]
    )

    # 后院红砖建筑：长屋面、左右前凸山墙及两根高烟囱均由照片直接支持。
    objects.extend(
        [
            add_box(
                "rear-brick-long-volume",
                (0.0, 7.0, 1.7),
                (14.0, 4.2, 3.4),
                brick,
            ),
            add_gable_roof(
                "rear-brick-long-roof",
                (0.0, 7.0),
                14.5,
                4.65,
                3.4,
                5.15,
                roof,
                ridge_axis="X",
            ),
            add_box(
                "rear-brick-left-front-gable-volume",
                (-5.15, 5.45, 1.65),
                (3.25, 3.2, 3.3),
                brick,
            ),
            add_gable_roof(
                "rear-brick-left-front-gable",
                (-5.15, 5.45),
                3.55,
                3.65,
                3.3,
                4.9,
                roof,
                ridge_axis="Y",
            ),
            add_box(
                "rear-brick-right-front-gable-volume",
                (5.15, 5.45, 1.65),
                (3.25, 3.2, 3.3),
                brick,
            ),
            add_gable_roof(
                "rear-brick-right-front-gable",
                (5.15, 5.45),
                3.55,
                3.65,
                3.3,
                4.9,
                roof,
                ridge_axis="Y",
            ),
            add_box(
                "rear-brick-central-tall-chimney",
                (0.65, 7.45, 4.6),
                (1.15, 1.1, 3.2),
                brick,
            ),
            add_box(
                "rear-brick-left-chimney",
                (-4.55, 8.0, 4.2),
                (0.9, 0.9, 2.0),
                brick,
            ),
        ]
    )

    obj = join_objects(objects, "one-step-garden-massing")
    obj["asset_id"] = "one-step-garden"
    obj["tier"] = "massing"
    obj["authored_front"] = AUTHORED_FRONT
    obj["scene_unit_meters"] = SCENE_UNIT_METERS
    obj["geometry_evidence"] = (
        "three-formal-photos-plus-frozen-legacy-hero-envelope"
    )
    obj["subject_specific_cues"] = (
        "front-u-court-steep-gables;front-shed-dormer;"
        "separate-rear-brick-twin-gables-and-chimneys"
    )
    obj["footprint_status"] = "visual-inference-map-gate-pending"
    obj["identity_allowed"] = False
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
    scene.world.color = (0.025, 0.03, 0.035)
    scene["asset_id"] = "one-step-garden"
    scene["tier"] = "massing"
    scene["authored_front"] = AUTHORED_FRONT
    scene["scene_unit_meters"] = SCENE_UNIT_METERS
    scene["runtime_position"] = RUNTIME_POSITION
    scene["runtime_yaw"] = RUNTIME_YAW
    scene["runtime_scale"] = RUNTIME_SCALE
    scene["movement_authorized"] = False
    scene["map_gate"] = "pending"


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


def add_preview_context() -> list[bpy.types.Object]:
    """加入不导出的地面、人物比例尺和前向标记。"""

    helpers: list[bpy.types.Object] = []
    ground_surface = material(
        "test-preview-ground-material",
        (0.11, 0.13, 0.14, 1.0),
    )
    human_surface = material(
        "test-preview-human-material",
        (0.86, 0.48, 0.18, 1.0),
    )
    marker_surface = material(
        "test-preview-front-marker-material",
        (0.20, 0.43, 0.58, 1.0),
    )
    bpy.ops.mesh.primitive_plane_add(size=30.0, location=(0.0, 1.2, -0.025))
    ground = bpy.context.active_object
    ground.name = "test-preview-ground"
    ground.data.materials.append(ground_surface)
    helpers.append(ground)

    # 1.8m / 2.7m = 0.6667 scene unit。
    body_height = 0.49
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=12,
        radius=0.11,
        depth=body_height,
        location=(0.0, -8.0, body_height / 2),
    )
    human_body = bpy.context.active_object
    human_body.name = "test-preview-human-body-1p8m"
    human_body.data.materials.append(human_surface)
    helpers.append(human_body)
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=12,
        ring_count=6,
        radius=0.09,
        location=(0.0, -8.0, 0.585),
    )
    human_head = bpy.context.active_object
    human_head.name = "test-preview-human-head-1p8m"
    human_head.data.materials.append(human_surface)
    helpers.append(human_head)

    # 蓝色薄板位于 local -Y，明确 authored front，不导出。
    marker = add_box(
        "test-preview-local-negative-y-front-marker",
        (0.0, -8.75, 0.03),
        (3.0, 0.18, 0.06),
        marker_surface,
    )
    helpers.append(marker)
    return helpers


def render_preview(
    path: Path,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
    ortho_scale: float,
    label: str,
) -> None:
    bpy.ops.object.camera_add(location=location)
    camera = bpy.context.active_object
    camera.name = f"test-{label}-camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = ortho_scale
    target_vector = Vector(target)
    camera.rotation_euler = (
        target_vector - camera.location
    ).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)


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
            indices = primitive.get("indices")
            if indices is None:
                indices = primitive["attributes"]["POSITION"]
            triangles += gltf["accessors"][indices]["count"] // 3
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
        "version": 1,
        "auditedAt": AUDITED_AT,
        "assetId": "one-step-garden",
        "tier": "massing",
        "status": "mcp1-pass-awaiting-map-gate",
        "recoveryCommitReadOnly": RECOVERY_COMMIT,
        "recoveryDecision": {
            "evidenceExtracted": True,
            "cleanV2GlbExtracted": False,
            "reason": (
                "恢复 GLB 是 membershipConfidence=low 的五个未绑定 OSM 平顶盒，"
                "不具备一号花园主体身份轮廓。"
            ),
        },
        "generator": "scripts/create_one_step_garden_massing_model.py",
        "generatorSha256": file_sha256(Path(__file__).resolve()),
        "modelBrief": "docs/research/one-step-garden-model-brief.md",
        "referenceManifest": "docs/research/one-step-garden-reference-manifest.json",
        "evidenceSha256": [
            "006c5722562b8be2316f975d6e06e14c35cf507f875d474ea4696f527c25d3ff",
            "058998a95691b90af3562f2e3ef33092446f571fe8d63d7ac6b48b135a3587b0",
            "171889a9a41a5c9d9ecb2b04d3abb70a306f7a2ec143fdb9511ffc75b44334f9",
        ],
        "massingGeometry": {
            "frontVolume": (
                "white U-shaped courtyard group with left/right longitudinal "
                "steep gables, transverse rear roof and shed dormer"
            ),
            "rearVolume": (
                "separate red-brick long roof with two garden-facing gables "
                "and two chimneys"
            ),
            "walkableVoid": "open gap between front courtyard group and rear volume",
            "omitted": [
                "trees",
                "shrubs",
                "lawn",
                "furniture",
                "umbrellas",
                "signage",
                "temporary-commercial-dressing",
            ],
        },
        "evidenceBoundary": {
            "observed": [
                "front white U-shaped courtyard relation",
                "front steep tiled gables",
                "front shed dormer",
                "separate rear red-brick volume",
                "rear long roof and two front gables",
                "rear central tall and left secondary chimneys",
            ],
            "inferred": [
                "exact depth and spacing",
                "unseen rear sides",
                "absolute height",
            ],
            "unknown": [
                "surveyed footprints",
                "OSM membership",
                "compass orientation",
                "rear facade and inter-building connection",
            ],
        },
        "placement": {
            "position": RUNTIME_POSITION,
            "yaw": RUNTIME_YAW,
            "runtimeScale": RUNTIME_SCALE,
            "movementAuthorized": False,
            "mapGate": "pending",
        },
        "scale": {
            "sceneUnitMeters": SCENE_UNIT_METERS,
            "previewHumanMeters": 1.8,
            "previewHumanSceneUnits": round(1.8 / SCENE_UNIT_METERS, 6),
            "heightStatus": "photo-and-legacy-envelope-inference-not-survey",
        },
        "canonicalFront": AUTHORED_FRONT,
        "identityAllowed": False,
        "mcp1": {
            "status": "pass",
            "reviewedBy": "main-coordinator-via-shared-blender-mcp",
            "reviewedBlendSha256": (
                "a4c0e0fba996f139a88344b6f39a8a2509326ba7018206dc888231fab6474388"
            ),
            "reviewedGlbSha256": (
                "a87caeba3b3ab4bc6735e6f3b98f424c15994895a8b51d8777d2cb98fb80e761"
            ),
            "acceptedInteractiveChanges": [],
            "qaRigSaved": False,
            "qaRigExported": False,
            "record": "docs/research/one-step-garden-blender-mcp-gates.json",
            "nextGate": "three-js-massing-map-calibration",
        },
        "mapAcceptance": "pending",
        "runtimeGate": "pending",
        "blendSceneAudit": {
            "objectCount": 1,
            "objects": ["one-step-garden-massing"],
            "types": ["MESH"],
            "rootLocation": [0, 0, 0],
            "rootRotation": [0, 0, 0],
            "rootScale": [1, 1, 1],
            "previewHelpersSaved": False,
        },
        "determinism": {
            "sameCommandRuns": 2,
            "sameGlbSha256": True,
        },
        "outputs": {
            "blend": str(BLEND_PATH.relative_to(ROOT)),
            "glb": str(GLB_PATH.relative_to(ROOT)),
            "previews": {
                "canonical": str(CANONICAL_PATH.relative_to(ROOT)),
                "sideDepth": str(SIDE_PATH.relative_to(ROOT)),
                "entrance": str(ENTRANCE_PATH.relative_to(ROOT)),
            },
        },
        "fixedCameras": {
            "canonical": {
                "location": [13.5, -23.5, 14.0],
                "target": [0.0, 0.0, 2.8],
                "orthoScale": 22.0,
                "direction": "street local-negative-y toward front volume",
            },
            "sideDepth": {
                "location": [-22.0, -4.0, 15.5],
                "target": [0.0, 2.0, 2.8],
                "orthoScale": 22.0,
                "direction": "west oblique showing front-rear separation",
            },
            "entrance": {
                "location": [7.0, -18.5, 8.5],
                "target": [0.0, -2.5, 2.2],
                "orthoScale": 14.5,
                "direction": "street oblique toward open entrance canopy",
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
    if audit["nodes"] != 1 or audit["meshes"] != 1:
        raise RuntimeError(f"Massing 必须保持单节点单网格：{audit}")
    if audit["materials"] != 3:
        raise RuntimeError(f"Massing 材质预算或语义分组异常：{audit}")
    if audit["images"] or audit["textures"] or audit["animations"]:
        raise RuntimeError(f"Massing 不允许图片、贴图或动画：{audit}")
    if audit["transformedNodes"]:
        raise RuntimeError(f"Massing GLB 节点存在未烘焙变换：{audit}")
    if audit["bytes"] > 128_000 or audit["triangles"] > 1_500:
        raise RuntimeError(f"Massing 超出预算：{audit}")
    if abs(audit["bounds"]["min"][1]) > 1e-5:
        raise RuntimeError(f"Massing GLB 未接地：{audit['bounds']}")

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    helpers = add_preview_context()
    render_preview(
        CANONICAL_PATH,
        (13.5, -23.5, 14.0),
        (0.0, 0.0, 2.8),
        22.0,
        "canonical",
    )
    render_preview(
        SIDE_PATH,
        (-22.0, -4.0, 15.5),
        (0.0, 2.0, 2.8),
        22.0,
        "side-depth",
    )
    render_preview(
        ENTRANCE_PATH,
        (7.0, -18.5, 8.5),
        (0.0, -2.5, 2.2),
        14.5,
        "entrance",
    )
    for helper in helpers:
        bpy.data.objects.remove(helper, do_unlink=True)
    write_record(audit)
    print(json.dumps(audit, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
