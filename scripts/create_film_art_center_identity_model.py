"""从通过 MCP2 的冻结 Hero 派生上海电影艺术中心 Identity 资产。"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
import struct
import sys
from typing import Any

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import create_xinhua_road_models as road


ROOT = Path(__file__).resolve().parents[1]
HERO_GENERATOR = ROOT / "scripts/create_xinhua_road_models.py"
HERO_BLEND = ROOT / "assets/models/source/xinhua-road/film-art-center.blend"
HERO_GLB = ROOT / "public/models/xinhua-road/film-art-center.glb"
HERO_BUILD_RECORD = ROOT / "docs/research/build-records/film-art-center.json"
OUTPUT_BLEND = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/identity/"
    / "film-art-center-identity.blend"
)
OUTPUT_GLB = (
    ROOT
    / "public/models/tiers/xinhua-road/identity/"
    / "film-art-center-identity.glb"
)
BUILD_RECORD = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/identity/"
    / "film-art-center-identity.json"
)
PREVIEW_DIR = ROOT / "test_artifacts"
HERO_GENERATOR_SHA256 = (
    "324be84a32ed3d43ff0bc1ceaca040e8e46f68aff21151b1bafa4ae524f6f3c6"
)
HERO_BLEND_SHA256 = (
    "f58952f3bf4c086fb09afdbda4efdc264a124a74a12e6f63e7a9c70f3d3359b8"
)
HERO_GLB_SHA256 = (
    "33daaaf003b47b705e03c95d2fe2ac0973b815079753f868c95c3b0f2f9b8e1b"
)
HERO_BUILD_RECORD_SHA256 = (
    "ed22cf283a0e6306b9f26e33e43560aadec457acad7338d854fba3f4ec18282a"
)
IDENTITY_CACHE_VERSION = "20260725-film-art-identity-1"
AUTHORED_METERS_PER_SCENE_UNIT = 2.7


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_glb(path: Path) -> dict[str, Any]:
    contents = path.read_bytes()
    if contents[:4] != b"glTF" or struct.unpack_from("<I", contents, 4)[0] != 2:
        raise RuntimeError(f"{path} 不是 glTF 2.0")
    json_length = struct.unpack_from("<I", contents, 12)[0]
    gltf = json.loads(contents[20 : 20 + json_length].decode("utf8"))
    triangles = 0
    bounds_min = [math.inf, math.inf, math.inf]
    bounds_max = [-math.inf, -math.inf, -math.inf]
    texcoord_primitives = 0
    for mesh in gltf.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            accessor_index = primitive.get("indices")
            if accessor_index is None:
                accessor_index = primitive["attributes"]["POSITION"]
            triangles += gltf["accessors"][accessor_index]["count"] // 3
            position = gltf["accessors"][primitive["attributes"]["POSITION"]]
            for axis in range(3):
                bounds_min[axis] = min(bounds_min[axis], position["min"][axis])
                bounds_max[axis] = max(bounds_max[axis], position["max"][axis])
            if "TEXCOORD_0" in primitive["attributes"]:
                texcoord_primitives += 1
    transformed_nodes = [
        node.get("name")
        for node in gltf.get("nodes", [])
        if any(key in node for key in ("translation", "rotation", "scale", "matrix"))
    ]
    return {
        "sha256": sha256(path),
        "bytes": len(contents),
        "nodes": len(gltf.get("nodes", [])),
        "meshes": len(gltf.get("meshes", [])),
        "materials": len(gltf.get("materials", [])),
        "images": len(gltf.get("images", [])),
        "textures": len(gltf.get("textures", [])),
        "texcoordPrimitives": texcoord_primitives,
        "triangles": triangles,
        "bounds": {
            "min": [round(value, 6) for value in bounds_min],
            "max": [round(value, 6) for value in bounds_max],
        },
        "transformedNodes": transformed_nodes,
    }


def validate_hero_lineage() -> None:
    expected = {
        "generator": HERO_GENERATOR_SHA256,
        "blend": HERO_BLEND_SHA256,
        "glb": HERO_GLB_SHA256,
        "buildRecord": HERO_BUILD_RECORD_SHA256,
    }
    current = {
        "generator": sha256(HERO_GENERATOR),
        "blend": sha256(HERO_BLEND),
        "glb": sha256(HERO_GLB),
        "buildRecord": sha256(HERO_BUILD_RECORD),
    }
    if current != expected:
        raise RuntimeError(
            "Hero lineage 已变化，禁止继续派生 Identity："
            f"expected={expected}, current={current}"
        )


def configure_scene() -> None:
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = AUTHORED_METERS_PER_SCENE_UNIT


def add_identity_window(
    name: str,
    x: float,
    y: float,
    z: float,
    width: float,
    height: float,
    dark: bpy.types.Material,
    glass: bpy.types.Material,
) -> None:
    road.add_box(
        f"{name}-recess",
        (x, y, z),
        (width, 0.18, height),
        dark,
        bevel=0.035,
    )
    road.add_box(
        f"{name}-glass",
        (x, y - 0.11, z),
        (width * 0.84, 0.06, height * 0.86),
        glass,
        bevel=0.02,
    )
    road.add_box(
        f"{name}-mullion",
        (x, y - 0.155, z),
        (0.055, 0.045, height * 0.82),
        dark,
        bevel=0.01,
    )
    road.add_box(
        f"{name}-transom",
        (x, y - 0.155, z),
        (width * 0.8, 0.045, 0.055),
        dark,
        bevel=0.01,
    )


def build_identity() -> None:
    """保留 Hero 的主体专属轮廓、双层柱廊、中央凉廊和入口身份。"""
    wall = road.material("艺术中心 Identity 暖白墙", "#e7e1d3")
    white = road.material("艺术中心 Identity 白色构件", "#f0ecdf")
    roof = road.material(
        "艺术中心 Identity 朱红屋瓦",
        "#a94f34",
        roughness=0.72,
    )
    ridge = road.material(
        "艺术中心 Identity 暗红屋脊",
        "#6c3028",
        roughness=0.74,
    )
    dark = road.material("艺术中心 Identity 深色构件", "#303b38")
    glass = road.material(
        "艺术中心 Identity 深青玻璃",
        "#405754",
        roughness=0.42,
        alpha=0.88,
    )
    stone = road.material("艺术中心 Identity 浅灰石材", "#aaa79e")
    gold = road.material(
        "艺术中心 Identity 入口金字",
        "#e7ad68",
        emission_strength=0.3,
    )

    # 三层主楼沿用冻结 Hero 尺寸；正面退进和阴影层级不可退化为单一盒体。
    road.add_box(
        "film-art-identity-ground-core",
        (0, 0.55, 1.9),
        (15.8, 9.3, 3.8),
        wall,
        bevel=0.12,
    )
    road.add_box(
        "film-art-identity-second-core",
        (0, 0.55, 5.45),
        (15.8, 9.3, 3.3),
        wall,
        bevel=0.11,
    )
    road.add_box(
        "film-art-identity-third-core",
        (0, 0.55, 9.05),
        (15.4, 9.0, 3.45),
        wall,
        bevel=0.12,
    )

    road.add_box(
        "film-art-identity-ground-veranda",
        (0, -5.25, 0.18),
        (17.2, 2.65, 0.36),
        stone,
        bevel=0.06,
    )
    road.add_box(
        "film-art-identity-ground-shadow",
        (0, -4.28, 1.95),
        (15.1, 0.24, 2.72),
        dark,
        bevel=0.035,
    )
    road.add_box(
        "film-art-identity-ground-beam",
        (0, -5.76, 3.58),
        (17.15, 0.42, 0.46),
        white,
        bevel=0.05,
    )
    road.add_box(
        "film-art-identity-second-floor",
        (0, -5.18, 3.82),
        (17.25, 2.85, 0.28),
        white,
        bevel=0.05,
    )
    road.add_box(
        "film-art-identity-second-shadow",
        (0, -4.28, 5.45),
        (15.1, 0.24, 2.3),
        dark,
        bevel=0.035,
    )
    road.add_box(
        "film-art-identity-second-beam",
        (0, -5.72, 6.98),
        (17.25, 0.46, 0.44),
        white,
        bevel=0.05,
    )

    column_positions = (-7.15, -4.8, -2.4, -1.1, 1.1, 2.4, 4.8, 7.15)
    for floor, (z, height) in enumerate(((1.9, 3.25), (5.46, 2.76))):
        for index, x in enumerate(column_positions):
            road.add_cylinder(
                f"film-art-identity-column-{floor}-{index}",
                (x, -5.75, z),
                0.18,
                height,
                white,
                vertices=12,
            )
            road.add_box(
                f"film-art-identity-column-cap-{floor}-{index}",
                (x, -5.75, z + height / 2 - 0.12),
                (0.52, 0.46, 0.2),
                white,
                bevel=0.035,
            )

    road.add_box(
        "film-art-identity-balustrade-bottom",
        (0, -6.12, 4.05),
        (17.0, 0.2, 0.22),
        white,
        bevel=0.035,
    )
    road.add_box(
        "film-art-identity-balustrade-top",
        (0, -6.12, 4.82),
        (17.0, 0.24, 0.2),
        white,
        bevel=0.035,
    )
    for index in range(17):
        x = -8.05 + 16.1 * index / 16
        road.add_box(
            f"film-art-identity-balustrade-post-{index}",
            (x, -6.12, 4.43),
            (0.16, 0.2, 0.74),
            white,
            bevel=0.02,
        )

    for floor, (z, height) in enumerate(((1.92, 2.26), (5.48, 1.92))):
        for bay, x in enumerate((-6.45, -4.3, -2.15, 0, 2.15, 4.3, 6.45)):
            if floor == 0 and bay == 3:
                continue
            if floor == 0:
                add_identity_window(
                    f"film-art-identity-front-{floor}-{bay}",
                    x,
                    -4.43,
                    z,
                    1.42,
                    height,
                    dark,
                    glass,
                )
            else:
                road.add_box(
                    f"film-art-identity-gallery-opening-{bay}",
                    (x, -4.43, z),
                    (1.58, 0.2, height),
                    dark,
                    bevel=0.03,
                )

    road.add_box(
        "film-art-identity-upper-loggia",
        (0, -4.22, 9.0),
        (4.65, 0.3, 1.92),
        dark,
        bevel=0.07,
    )
    for index, x in enumerate((-2.35, -1.52, 1.52, 2.35)):
        road.add_box(
            f"film-art-identity-loggia-post-{index}",
            (x, -4.45, 9.0),
            (0.18, 0.25, 1.94),
            white,
            bevel=0.035,
        )
    road.add_box(
        "film-art-identity-loggia-rail-top",
        (0, -4.55, 8.92),
        (4.25, 0.2, 0.16),
        white,
        bevel=0.025,
    )
    road.add_box(
        "film-art-identity-loggia-rail-bottom",
        (0, -4.55, 8.34),
        (4.25, 0.2, 0.16),
        white,
        bevel=0.025,
    )
    for index, (x, width, height) in enumerate(
        (
            (-6.45, 1.18, 2.05),
            (-4.25, 1.68, 1.72),
            (4.25, 1.68, 1.72),
            (6.45, 1.18, 2.05),
        )
    ):
        add_identity_window(
            f"film-art-identity-upper-window-{index}",
            x,
            -4.1,
            9.0,
            width,
            height,
            dark,
            glass,
        )

    # 双重起翘红檐、稀疏瓦垄和暗红檐下节奏是远中景的身份骨架。
    road.add_upturned_hip_roof(
        "film-art-identity-gallery-roof",
        (0, -5.02, 7.08),
        17.25,
        2.85,
        0.88,
        roof,
        overhang=0.52,
        upturn=0.34,
        segments=16,
    )
    road.add_upturned_roof_ridges(
        "film-art-identity-gallery-ridges",
        (0, -5.02),
        18.15,
        3.65,
        7.08,
        0.88,
        ridge,
        upturn=0.34,
        rows=8,
    )
    road.add_box(
        "film-art-identity-gallery-eave-shadow",
        (0, -6.68, 7.08),
        (18.1, 0.38, 0.28),
        ridge,
        bevel=0.04,
    )
    for index in range(11):
        x = -8.0 + 16.0 * index / 10
        road.add_box(
            f"film-art-identity-gallery-bracket-{index}",
            (x, -6.48, 6.8),
            (0.28, 0.5, 0.4),
            ridge,
            bevel=0.035,
        )

    road.add_upturned_hip_roof(
        "film-art-identity-main-roof",
        (0, 0.48, 10.78),
        17.55,
        10.65,
        2.92,
        roof,
        overhang=0.92,
        upturn=0.72,
        segments=18,
    )
    road.add_upturned_roof_ridges(
        "film-art-identity-main-ridges",
        (0, 0.48),
        19.2,
        12.35,
        10.78,
        2.92,
        ridge,
        upturn=0.72,
        rows=9,
    )
    road.add_box(
        "film-art-identity-main-eave-shadow",
        (0, -5.56, 10.76),
        (19.25, 0.46, 0.34),
        ridge,
        bevel=0.05,
    )
    for index in range(13):
        x = -8.55 + 17.1 * index / 12
        road.add_box(
            f"film-art-identity-main-bracket-{index}",
            (x, -5.35, 10.48),
            (0.26, 0.5, 0.38),
            ridge,
            bevel=0.035,
        )

    # 入口保留黑底金字、台阶、成对卧狮与灯，不以通用门洞替代。
    road.add_box(
        "film-art-identity-entry",
        (0, -4.5, 1.58),
        (2.05, 0.22, 2.7),
        dark,
        bevel=0.04,
    )
    road.add_box(
        "film-art-identity-sign",
        (0, -5.99, 3.22),
        (4.25, 0.16, 0.54),
        dark,
        bevel=0.055,
    )
    identity_name = road.add_text_label(
        "film-art-identity-name",
        "新华两佰",
        (0, -6.1, 3.22),
        0.38,
        0.035,
        gold,
        bevel=0.006,
        letter_spacing=1.0,
    )
    identity_name.scale.x = -1
    bpy.context.view_layer.objects.active = identity_name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    road.add_stairs(
        "film-art-identity-stair",
        (0, -6.35),
        3.65,
        4,
        0.58,
        1.75,
        stone,
    )
    for index, x in enumerate((-2.25, 2.25)):
        road.add_icosphere(
            f"film-art-identity-lion-body-{index}",
            (x, -7.0, 0.72),
            (0.48, 0.62, 0.46),
            stone,
            subdivisions=1,
        )
        road.add_icosphere(
            f"film-art-identity-lion-head-{index}",
            (x, -7.26, 1.08),
            (0.3, 0.34, 0.32),
            stone,
            subdivisions=1,
        )
        road.add_box(
            f"film-art-identity-entry-light-{index}",
            (x * 0.76, -5.98, 2.72),
            (0.22, 0.22, 0.42),
            gold,
            bevel=0.045,
        )

    for side, x in (("left", -9.78), ("right", 9.78)):
        road.add_box(
            f"film-art-identity-glass-wing-{side}",
            (x, -0.5, 1.28),
            (3.35, 8.25, 2.55),
            glass,
            bevel=0.1,
        )
        road.add_box(
            f"film-art-identity-glass-wing-roof-{side}",
            (x, -0.5, 2.62),
            (3.55, 8.45, 0.18),
            dark,
            bevel=0.035,
        )
        for row, y in enumerate((-2.7, -0.5, 1.7)):
            road.add_box(
                f"film-art-identity-glass-wing-mullion-{side}-{row}",
                (x, y, 1.32),
                (3.5, 0.08, 2.4),
                dark,
                bevel=0.015,
            )


def add_review_rig() -> bpy.types.Object:
    road.add_box(
        "test_identity_preview_ground",
        (0, 0, -0.08),
        (26, 22, 0.16),
        road.material("测试 Identity 地面", "#d8d5ca"),
        asset=False,
    )
    # 1.8 m / 2.7 = 0.666667 场景单位，仅用于尺度审查。
    road.add_box(
        "test_identity_human_proxy",
        (7.4, -7.1, 1.8 / AUTHORED_METERS_PER_SCENE_UNIT / 2),
        (0.2, 0.2, 1.8 / AUTHORED_METERS_PER_SCENE_UNIT),
        road.material("测试 Identity 人物", "#365f78"),
        asset=False,
    )
    bpy.ops.object.camera_add()
    camera = bpy.context.active_object
    camera.name = "test_identity_camera"
    bpy.context.scene.camera = camera
    bpy.ops.object.light_add(type="AREA", location=(-10, -16, 25))
    key = bpy.context.active_object
    key.name = "test_identity_key"
    key.data.energy = 1900
    key.data.size = 22
    bpy.ops.object.light_add(type="AREA", location=(18, 10, 14))
    fill = bpy.context.active_object
    fill.name = "test_identity_fill"
    fill.data.energy = 850
    fill.data.size = 18
    return camera


def render_previews(camera: bpy.types.Object) -> dict[str, dict[str, Any]]:
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.58, 0.68, 0.72, 1)
    background.inputs["Strength"].default_value = 0.6
    scene.view_settings.look = "AgX - Medium High Contrast"
    views = {
        "canonical": ((3, -43, 8), (0, -0.5, 6.3), 54),
        "side": ((34, -28, 9), (1, 0, 6.1), 52),
        "entrance": ((10, -48, 4.8), (0, -0.8, 5.7), 56),
    }
    outputs: dict[str, dict[str, Any]] = {}
    for view, (location, target, lens) in views.items():
        camera.location = location
        camera.data.lens = lens
        camera.rotation_euler = (
            Vector(target) - camera.location
        ).to_track_quat("-Z", "Y").to_euler()
        path = (
            PREVIEW_DIR
            / f"test_film-art-center-identity_{view}_preview.png"
        )
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        outputs[view] = {
            "path": str(path.relative_to(ROOT)),
            "sha256": sha256(path),
            "bytes": path.stat().st_size,
            "camera": list(location),
            "target": list(target),
            "lensMm": lens,
        }
    return outputs


def write_build_record(
    audit: dict[str, Any],
    previews: dict[str, dict[str, Any]],
) -> None:
    record = {
        "version": 1,
        "auditedAt": "2026-07-25",
        "assetId": "building:xinhua-road:film-art-center",
        "tier": "identity",
        "status": "headless-candidate-mcp3-pending",
        "generator": {
            "path": "scripts/create_film_art_center_identity_model.py",
            "command": (
                "/Applications/Blender.app/Contents/MacOS/Blender --background "
                "--factory-startup --python-exit-code 1 "
                "--python scripts/create_film_art_center_identity_model.py"
            ),
            "blenderVersion": "5.2.0 LTS",
        },
        "derivedFrom": {
            "method": (
                "deterministic-simplification-preserving-"
                "subject-specific-cues"
            ),
            "heroGenerator": str(HERO_GENERATOR.relative_to(ROOT)),
            "heroGeneratorSha256": HERO_GENERATOR_SHA256,
            "heroBlend": str(HERO_BLEND.relative_to(ROOT)),
            "heroBlendSha256": HERO_BLEND_SHA256,
            "heroGlb": str(HERO_GLB.relative_to(ROOT)),
            "heroGlbSha256": HERO_GLB_SHA256,
            "heroBuildRecord": str(HERO_BUILD_RECORD.relative_to(ROOT)),
            "heroBuildRecordSha256": HERO_BUILD_RECORD_SHA256,
            "heroGate": "mcp2-pass",
        },
        "contract": {
            "authoredMetersPerSceneUnit": AUTHORED_METERS_PER_SCENE_UNIT,
            "frontDirection": "-Y",
            "groundDatum": 0,
            "origin": [0, 0, 0],
            "position": [47.5, 81.5],
            "yaw": 2.761592653589793,
            "scale": 1,
            "humanProxy": {
                "meters": 1.8,
                "sceneUnits": round(
                    1.8 / AUTHORED_METERS_PER_SCENE_UNIT,
                    6,
                ),
                "saved": False,
                "exported": False,
            },
            "preservedCues": [
                "full-width upturned main roof",
                "second red gallery roof",
                "double veranda depth, columns and white balustrade",
                "upper central recessed loggia and symmetric window rhythm",
                "black and gold Xinhua 200 sign, paired lions and entrance lights",
                "low glass side wings",
            ],
            "deliberateLosses": [
                "dense Hero roof-rib count",
                "full eight-character Hero sign replaced by the evidence-backed four-character Xinhua 200 name",
                "side and rear window completeness",
                "fine door hardware and drainage",
                "lawn, shrubs, paving grid and lawn lights",
            ],
            "forbiddenSubstitute": "arts-cluster-generic-proxy",
        },
        "holdBoundary": {
            "trees": "untouched",
            "decor": "untouched",
            "ordinaryOsm": "not-imported",
            "globalMassing": "untouched",
            "facilityAndSharedPrototypes": "not-imported",
            "otherBuildings": "untouched",
        },
        "outputs": {
            "blend": str(OUTPUT_BLEND.relative_to(ROOT)),
            "blendSha256": sha256(OUTPUT_BLEND),
            "blendBytes": OUTPUT_BLEND.stat().st_size,
            "glb": str(OUTPUT_GLB.relative_to(ROOT)),
            "cacheVersion": IDENTITY_CACHE_VERSION,
            "previews": previews,
        },
        "glb": audit,
        "budgets": {
            "maxNodes": 4,
            "maxTriangles": 24000,
            "maxMaterials": 8,
            "maxImages": 0,
            "maxBytes": 1600000,
        },
        "gates": {
            "headlessBuild": "pass",
            "glbAudit": "pending-external-audit",
            "deterministicGlb": "pending-second-build",
            "mcp3": "pending",
            "threeTierRuntime": "blocked-until-mcp3",
        },
    }
    BUILD_RECORD.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )


def main() -> None:
    validate_hero_lineage()
    for directory in (
        OUTPUT_BLEND.parent,
        OUTPUT_GLB.parent,
        BUILD_RECORD.parent,
        PREVIEW_DIR,
    ):
        directory.mkdir(parents=True, exist_ok=True)
    road.clear_scene()
    configure_scene()
    build_identity()
    source_object_count = len(road.ASSET_OBJECTS)
    road.merge_asset_objects("film-art-center-identity")
    asset = road.ASSET_OBJECTS[0]
    asset["asset_id"] = "building:xinhua-road:film-art-center"
    asset["tier"] = "identity"
    asset["derived_from_hero_glb_sha256"] = HERO_GLB_SHA256
    asset["authored_meters_per_scene_unit"] = AUTHORED_METERS_PER_SCENE_UNIT
    asset["front_direction"] = "-Y"
    asset["ground_datum"] = 0.0
    asset["source_object_count"] = source_object_count
    asset["forbidden_substitute"] = "arts-cluster-generic-proxy"
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
    bpy.ops.object.select_all(action="DESELECT")
    asset.select_set(True)
    bpy.context.view_layer.objects.active = asset
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_extras=True,
        export_texcoords=road.asset_uses_image_textures(),
    )
    audit = parse_glb(OUTPUT_GLB)
    if audit["transformedNodes"]:
        raise RuntimeError(
            f"Identity GLB 节点存在未烘焙变换：{audit['transformedNodes']}"
        )
    if audit["images"] or audit["textures"] or audit["texcoordPrimitives"]:
        raise RuntimeError("Identity 不允许图片、贴图或未使用 TEXCOORD")
    if (
        audit["nodes"] > 4
        or audit["triangles"] > 24000
        or audit["materials"] > 8
        or audit["bytes"] > 1600000
    ):
        raise RuntimeError(f"Identity 超出预算：{audit}")
    camera = add_review_rig()
    previews = render_previews(camera)
    write_build_record(audit, previews)
    print(
        "上海电影艺术中心 Identity 生成完成："
        f"{source_object_count} source objects, "
        f"{audit['triangles']} triangles, {audit['bytes']} bytes, "
        f"sha256={audit['sha256']}"
    )


if __name__ == "__main__":
    main()
