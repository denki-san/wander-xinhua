"""确定性生成新华路315号 subject-specific Massing、三视图与 build record。"""

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
    / "house-315-massing.blend"
)
GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/massing-v2"
    / "house-315-massing.glb"
)
FIRST_BUILD_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/massing-v2"
    / "test_house-315-massing-first.glb"
)
PREVIEW_DIR = ROOT / "test_artifacts/all-models/massing-v2/house-315"
CANONICAL_PATH = PREVIEW_DIR / "test_house-315-massing-canonical.png"
SIDE_PATH = PREVIEW_DIR / "test_house-315-massing-side-depth.png"
ENTRANCE_PATH = PREVIEW_DIR / "test_house-315-massing-entrance.png"
RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/massing-v2"
    / "house-315-massing.json"
)

RUNTIME_POSITION = [-23.03, 85.67]
RUNTIME_YAW = -0.38
RUNTIME_SCALE = 0.9
AUTHORED_FRONT = "local-negative-y"
SCENE_UNIT_METERS = 2.7
HUMAN_METERS = 1.8
HUMAN_SCENE_UNITS = HUMAN_METERS / SCENE_UNIT_METERS


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
) -> bpy.types.Material:
    surface = bpy.data.materials.new(name)
    surface.diffuse_color = color
    surface.roughness = 0.94
    return surface


def add_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    surface: bpy.types.Material,
    *,
    rotation_y: float = 0.0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dimensions
    obj.rotation_euler[1] = rotation_y
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
    roof_surface: bpy.types.Material,
    gable_surface: bpy.types.Material,
    *,
    ridge_axis: str,
) -> bpy.types.Object:
    """创建有实体山墙的双坡屋顶；屋脊方向使用 X 或 Y。"""

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
        roof_faces = {0, 1, 4}
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
        roof_faces = {0, 1, 4}
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
    obj.data.materials.append(roof_surface)
    obj.data.materials.append(gable_surface)
    for index, polygon in enumerate(obj.data.polygons):
        polygon.material_index = 0 if index in roof_faces else 1
    return obj


def add_split_wall_volume(
    name: str,
    center: tuple[float, float],
    width: float,
    depth: float,
    eave_z: float,
    brick_height: float,
    brick: bpy.types.Material,
    plaster: bpy.types.Material,
) -> list[bpy.types.Object]:
    """用两层简单盒体表达照片中持续可见的上白下红墙体分区。"""

    cx, cy = center
    lower = add_box(
        f"{name}-brick-base",
        (cx, cy, brick_height / 2),
        (width, depth, brick_height),
        brick,
    )
    upper_height = eave_z - brick_height
    upper = add_box(
        f"{name}-plaster-upper",
        (cx, cy, brick_height + upper_height / 2),
        (width, depth, upper_height),
        plaster,
    )
    return [lower, upper]


def add_half_timber_front(
    center_x: float,
    front_y: float,
    eave_z: float,
    ridge_z: float,
    span: float,
    timber: bpy.types.Material,
) -> list[bpy.types.Object]:
    """只在 canonical 正面加入远景可读的中央木构识别线。"""

    depth = 0.08
    objects = [
        add_box(
            "central-gable-timber-horizontal",
            (center_x, front_y, eave_z + 0.35),
            (span * 0.88, depth, 0.13),
            timber,
        ),
        add_box(
            "central-gable-timber-vertical",
            (center_x, front_y, (eave_z + ridge_z) / 2),
            (0.14, depth, ridge_z - eave_z),
            timber,
        ),
    ]
    rise = ridge_z - eave_z
    half_run = span * 0.42
    beam_length = math.sqrt(rise * rise + half_run * half_run)
    angle = math.atan2(rise, half_run)
    z_center = eave_z + rise / 2
    objects.extend(
        [
            add_box(
                "central-gable-timber-left-rake",
                (center_x - half_run / 2, front_y, z_center),
                (beam_length, depth, 0.12),
                timber,
                rotation_y=-angle,
            ),
            add_box(
                "central-gable-timber-right-rake",
                (center_x + half_run / 2, front_y, z_center),
                (beam_length, depth, 0.12),
                timber,
                rotation_y=angle,
            ),
        ]
    )
    return objects


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
    scene["asset_id"] = "house-315"
    scene["tier"] = "massing"
    scene["authored_front"] = AUTHORED_FRONT
    scene["scene_unit_meters"] = SCENE_UNIT_METERS
    scene["runtime_position_baseline"] = RUNTIME_POSITION
    scene["runtime_yaw_baseline"] = RUNTIME_YAW
    scene["runtime_scale_baseline"] = RUNTIME_SCALE
    scene["map_calibration"] = "pending-main-window"
    scene["identity_allowed"] = False


def build_model() -> bpy.types.Object:
    """按 canonical、俯瞰和入口证据重建，不读取旧 Hero 或 Recovery voxel。"""

    plaster = make_material(
        "house-315-massing-warm-roughcast",
        (0.74, 0.70, 0.60, 1.0),
    )
    brick = make_material(
        "house-315-massing-muted-red-brick",
        (0.38, 0.16, 0.11, 1.0),
    )
    roof = make_material(
        "house-315-massing-muted-red-tile",
        (0.34, 0.12, 0.08, 1.0),
    )
    timber = make_material(
        "house-315-massing-dark-timber",
        (0.075, 0.065, 0.055, 1.0),
    )
    objects: list[bpy.types.Object] = []

    # 俯瞰中贯穿左右的主屋体，正面为 local -Y。
    objects.extend(
        add_split_wall_volume(
            "main-spine",
            (0.0, 0.55),
            13.4,
            5.4,
            3.05,
            1.12,
            brick,
            plaster,
        )
    )
    objects.append(
        add_gable_roof(
            "main-spine-steep-roof",
            (0.0, 0.55),
            13.9,
            5.9,
            3.05,
            5.75,
            roof,
            plaster,
            ridge_axis="X",
        )
    )

    # canonical 中央高山墙：前出、屋脊沿纵深，构成最强轮廓锚点。
    central_x = -1.9
    central_y = -0.95
    central_width = 5.15
    central_depth = 7.2
    central_eave = 3.65
    central_ridge = 6.95
    objects.extend(
        add_split_wall_volume(
            "central-projecting-gable",
            (central_x, central_y),
            central_width,
            central_depth,
            central_eave,
            1.22,
            brick,
            plaster,
        )
    )
    objects.append(
        add_gable_roof(
            "central-projecting-steep-roof",
            (central_x, central_y),
            central_depth + 0.45,
            central_width + 0.45,
            central_eave,
            central_ridge,
            roof,
            plaster,
            ridge_axis="Y",
        )
    )
    objects.extend(
        add_half_timber_front(
            central_x,
            central_y - (central_depth + 0.45) / 2 - 0.025,
            central_eave,
            central_ridge,
            central_width,
            timber,
        )
    )

    # 俯瞰右侧较长纵向翼，轮廓低于中央高山墙。
    right_x = 5.15
    right_y = 0.65
    right_width = 3.75
    right_depth = 7.45
    right_eave = 3.0
    right_ridge = 5.55
    objects.extend(
        add_split_wall_volume(
            "right-long-wing",
            (right_x, right_y),
            right_width,
            right_depth,
            right_eave,
            1.12,
            brick,
            plaster,
        )
    )
    objects.append(
        add_gable_roof(
            "right-long-wing-steep-roof",
            (right_x, right_y),
            right_depth + 0.4,
            right_width + 0.4,
            right_eave,
            right_ridge,
            roof,
            plaster,
            ridge_axis="Y",
        )
    )

    # 左后侧较小翼只保留俯瞰可见体量，不添加不可见开口。
    left_x = -5.35
    left_y = 2.25
    left_width = 4.25
    left_depth = 4.2
    left_eave = 2.55
    left_ridge = 4.45
    objects.extend(
        add_split_wall_volume(
            "left-rear-short-wing",
            (left_x, left_y),
            left_width,
            left_depth,
            left_eave,
            1.0,
            brick,
            plaster,
        )
    )
    objects.append(
        add_gable_roof(
            "left-rear-short-roof",
            (left_x, left_y),
            left_width + 0.4,
            left_depth + 0.4,
            left_eave,
            left_ridge,
            roof,
            plaster,
            ridge_axis="X",
        )
    )

    model = join_objects(objects, "house-315-massing")
    model["stable_asset_id"] = "house-315"
    model["tier"] = "massing"
    model["authored_front"] = AUTHORED_FRONT
    model["scene_unit_meters"] = SCENE_UNIT_METERS
    model["source_geometry"] = (
        "official-2023-canonical;jfdaily-image-242-aerial;"
        "jfdaily-image-244-entrance"
    )
    model["not_derived_from"] = (
        "legacy-hero;recovery-voxel-massing;ordinary-osm"
    )
    model["subject_specific_cues"] = (
        "connected-steep-roofs;central-projecting-half-timber-gable;"
        "white-over-red-facade;asymmetric-long-right-and-short-left-wings"
    )
    model["construction_year"] = "unknown-conflict-1930-vs-1949"
    model["identity_allowed"] = False
    return model


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
        "skins": len(gltf.get("skins", [])),
        "triangles": triangles,
        "bounds": {
            "min": [round(value, 6) for value in bounds_min],
            "max": [round(value, 6) for value in bounds_max],
        },
        "transformedNodes": transformed_nodes,
    }


def add_preview_context() -> list[bpy.types.Object]:
    """加入不导出、不保存的地面、1.8m 人物尺标和正面标记。"""

    ground_surface = make_material(
        "test-house-315-preview-ground",
        (0.10, 0.12, 0.13, 1.0),
    )
    human_surface = make_material(
        "test-house-315-preview-human",
        (0.88, 0.48, 0.16, 1.0),
    )
    marker_surface = make_material(
        "test-house-315-preview-front-marker",
        (0.18, 0.42, 0.62, 1.0),
    )
    helpers: list[bpy.types.Object] = []
    bpy.ops.mesh.primitive_plane_add(size=28.0, location=(0.0, 0.0, -0.025))
    ground = bpy.context.active_object
    ground.name = "test-house-315-preview-ground"
    ground.data.materials.append(ground_surface)
    helpers.append(ground)

    body_height = 0.5
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=12,
        radius=0.105,
        depth=body_height,
        location=(-5.9, -5.0, body_height / 2),
    )
    body = bpy.context.active_object
    body.name = "test-house-315-human-body-1p8m"
    body.data.materials.append(human_surface)
    helpers.append(body)
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=12,
        ring_count=6,
        radius=(HUMAN_SCENE_UNITS - body_height) / 2,
        location=(
            -5.9,
            -5.0,
            body_height + (HUMAN_SCENE_UNITS - body_height) / 2,
        ),
    )
    head = bpy.context.active_object
    head.name = "test-house-315-human-head-1p8m"
    head.data.materials.append(human_surface)
    helpers.append(head)

    marker = add_box(
        "test-house-315-local-negative-y-front-marker",
        (0.0, -5.5, 0.035),
        (3.2, 0.2, 0.07),
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
    camera.name = f"test-house-315-{label}-camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = ortho_scale
    camera.rotation_euler = (
        Vector(target) - camera.location
    ).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)


def validate_audit(audit: dict[str, Any]) -> None:
    if audit["nodes"] != 1 or audit["meshes"] != 1:
        raise RuntimeError(f"Massing 必须为单节点单网格：{audit}")
    if audit["materials"] != 4:
        raise RuntimeError(f"Massing 材质语义异常：{audit}")
    if audit["images"] or audit["textures"] or audit["animations"] or audit["skins"]:
        raise RuntimeError(f"Massing 不允许图片、贴图、动画或骨骼：{audit}")
    if audit["transformedNodes"]:
        raise RuntimeError(f"Massing GLB 节点存在未烘焙变换：{audit}")
    if audit["bytes"] > 350_000 or audit["triangles"] > 4_000:
        raise RuntimeError(f"Massing 超出 Brief 预算：{audit}")
    if abs(audit["bounds"]["min"][1]) > 1e-5:
        raise RuntimeError(f"Massing GLB 未接地：{audit['bounds']}")


def write_record(
    audit: dict[str, Any],
    first_sha: str,
    blend_sha: str,
) -> None:
    record = {
        "version": 1,
        "auditedAt": AUDITED_AT,
        "assetId": "building:xinhua-road:house-315",
        "tier": "massing-v2",
        "status": "candidate-awaiting-blender-mcp-1",
        "recoveryCommitReadOnly": RECOVERY_COMMIT,
        "generator": "scripts/create_house_315_massing_model.py",
        "generatorSha256": file_sha256(Path(__file__).resolve()),
        "modelBrief": "docs/research/house-315-model-brief.md",
        "referenceManifest": "docs/research/house-315-reference-manifest.json",
        "decisionLog": "docs/research/house-315-decision-log.md",
        "evidenceGate": "passed-for-subject-specific-massing-only",
        "evidenceSha256": [
            "6f479e2d9505f8817457eaa7af8c1033790bfd16c864ab13287086d0c1943c00",
            "bc3e964ea39c3c47235dac171b438e95e4b7f6c03397229bf44d343d7ac4a095",
            "4598dfd65b7a361d1e2643ed602e832516e34284dad49a0ae18cd65dcf929a93",
            "f72e564587e32f0dafe1652fbd4f9f803911f661f0235bf5795a9b61e64cc051",
            "78581fafb11ff48f917f186c67370cc6b03d624e208776638f314d885c9da883",
        ],
        "sourceViews": {
            "canonical": "official-2023 street-facing front",
            "sideDepth": "Jiefang Daily Image 242 aerial",
            "subjectBinding": "Jiefang Daily Image 243 address sign",
            "entrance": "Jiefang Daily Image 244 entrance",
            "exteriorDetail": "Jiefang Daily Image 245 exact legacy-byte match",
        },
        "recoveryMassingDecision": {
            "extracted": False,
            "reusedGeometry": False,
            "reason": (
                "Recovery candidate was a voxel remesh of the extrapolated legacy "
                "Hero and was not checked component-by-component against Image 242."
            ),
        },
        "massingGeometry": {
            "mainSpine": "transverse connected steep roof",
            "centralProjectingGable": "tall front-facing half-timber anchor",
            "rightLongWing": "lower longitudinal steep-roof wing",
            "leftRearShortWing": "smaller lower wing visible in aerial",
            "facadeDivision": "white upper wall over muted red-brick base",
            "omitted": [
                "trees",
                "vegetation",
                "lawn",
                "walls",
                "gate",
                "lamps",
                "planters",
                "paving",
                "ordinary OSM",
                "unseen rear openings",
            ],
        },
        "evidenceBoundary": {
            "observed": [
                "connected steep roof hierarchy",
                "central projecting tall gable",
                "asymmetric right long and left short wings",
                "white-over-red facade division",
                "dark half-timber central gable",
            ],
            "inferred": [
                "relative width, depth and ridge heights from image ratios",
                "closed low-detail rear mass",
            ],
            "unknown": [
                "construction year because sources conflict between 1930 and 1949",
                "surveyed dimensions",
                "hidden rear openings",
                "map-space compass",
                "authoritative footprint and final placement",
            ],
        },
        "placement": {
            "positionBaseline": RUNTIME_POSITION,
            "yawBaseline": RUNTIME_YAW,
            "runtimeScaleBaseline": RUNTIME_SCALE,
            "movementAuthorized": False,
            "mapCalibration": "pending-main-window",
        },
        "scale": {
            "sceneUnitMeters": SCENE_UNIT_METERS,
            "previewHumanMeters": HUMAN_METERS,
            "previewHumanSceneUnits": round(HUMAN_SCENE_UNITS, 6),
            "previewProxyExported": False,
            "heightStatus": "photo-ratio-inference-not-survey",
        },
        "canonicalFront": AUTHORED_FRONT,
        "constructionYear": "unknown-source-conflict-1930-vs-1949",
        "identityAllowed": False,
        "heroAllowed": False,
        "mcp1": {
            "status": "pending-main-window-authorization",
            "qaRigSaved": False,
            "qaRigExported": False,
        },
        "mapCalibration": "pending-after-mcp-1",
        "threeJsRuntime": "not-run-candidate-not-integrated",
        "blendSceneAudit": {
            "sha256": blend_sha,
            "objectCount": 1,
            "objects": ["house-315-massing"],
            "types": ["MESH"],
            "rootLocation": [0, 0, 0],
            "rootRotation": [0, 0, 0],
            "rootScale": [1, 1, 1],
            "previewHelpersSaved": False,
        },
        "determinism": {
            "independentSceneBuilds": 2,
            "firstGlbSha256": first_sha,
            "secondGlbSha256": audit["sha256"],
            "sameGlbSha256": first_sha == audit["sha256"],
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
                "location": [3.5, -26.0, 11.0],
                "target": [-0.3, 0.0, 2.8],
                "orthoScale": 18.5,
            },
            "sideDepth": {
                "location": [21.0, -16.0, 14.5],
                "target": [0.0, 0.5, 3.1],
                "orthoScale": 18.5,
            },
            "entrance": {
                "location": [7.5, -19.0, 8.5],
                "target": [-1.3, -1.5, 3.0],
                "orthoScale": 13.5,
            },
        },
        "glb": audit,
    }
    RECORD_PATH.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )


def build_export(path: Path) -> bpy.types.Object:
    reset_scene()
    configure_scene()
    model = build_model()
    export_glb(path, model)
    return model


def main() -> None:
    for directory in (
        BLEND_PATH.parent,
        GLB_PATH.parent,
        PREVIEW_DIR,
        RECORD_PATH.parent,
    ):
        directory.mkdir(parents=True, exist_ok=True)

    build_export(FIRST_BUILD_PATH)
    first_sha = file_sha256(FIRST_BUILD_PATH)

    model = build_export(GLB_PATH)
    second_sha = file_sha256(GLB_PATH)
    if first_sha != second_sha:
        raise RuntimeError(
            f"确定性双构建失败：first={first_sha}, second={second_sha}"
        )
    FIRST_BUILD_PATH.unlink(missing_ok=True)

    audit = parse_glb(GLB_PATH)
    validate_audit(audit)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    blend_sha = file_sha256(BLEND_PATH)

    helpers = add_preview_context()
    render_preview(
        CANONICAL_PATH,
        (3.5, -26.0, 11.0),
        (-0.3, 0.0, 2.8),
        18.5,
        "canonical",
    )
    render_preview(
        SIDE_PATH,
        (21.0, -16.0, 14.5),
        (0.0, 0.5, 3.1),
        18.5,
        "side-depth",
    )
    render_preview(
        ENTRANCE_PATH,
        (7.5, -19.0, 8.5),
        (-1.3, -1.5, 3.0),
        13.5,
        "entrance",
    )
    for helper in helpers:
        bpy.data.objects.remove(helper, do_unlink=True)

    write_record(audit, first_sha, blend_sha)
    print(json.dumps(audit, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
