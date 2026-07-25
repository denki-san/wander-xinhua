"""从冻结 Hero 参数派生上海电影艺术中心的正式 Massing 资产。"""

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
OUTPUT_BLEND = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/massing/film-art-center-massing.blend"
)
OUTPUT_GLB = (
    ROOT / "public/models/tiers/xinhua-road/massing/film-art-center-massing.glb"
)
BUILD_RECORD = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/massing/"
    / "film-art-center-massing.json"
)
PREVIEW_DIR = ROOT / "test_artifacts"
HERO_GLB_SHA256 = (
    "e4887f6d87771616bd0e57305c5e577dab6040bdc05d70b6aa19ffe3d39b0de6"
)
HERO_BLEND_SHA256 = (
    "32e27757001feeb1da31a2ada1fbfafc7c6f6a038d3f85ab408912973a2c8e0c"
)
MASSING_CACHE_VERSION = "20260725-film-art-massing-1"
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
    json_type = struct.unpack_from("<I", contents, 16)[0]
    if json_type != 0x4E4F534A:
        raise RuntimeError(f"{path} 缺少 GLB JSON")
    gltf = json.loads(contents[20 : 20 + json_length].decode("utf8"))
    triangles = 0
    bounds_min = [math.inf, math.inf, math.inf]
    bounds_max = [-math.inf, -math.inf, -math.inf]
    for mesh in gltf.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            index_accessor = primitive.get("indices")
            if index_accessor is None:
                index_accessor = primitive["attributes"]["POSITION"]
            triangles += gltf["accessors"][index_accessor]["count"] // 3
            position = gltf["accessors"][primitive["attributes"]["POSITION"]]
            for axis in range(3):
                bounds_min[axis] = min(bounds_min[axis], position["min"][axis])
                bounds_max[axis] = max(bounds_max[axis], position["max"][axis])
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
        "triangles": triangles,
        "bounds": {
            "min": [round(value, 6) for value in bounds_min],
            "max": [round(value, 6) for value in bounds_max],
        },
        "transformedNodes": transformed_nodes,
    }


def validate_hero_lineage() -> None:
    current = {
        "generator": sha256(HERO_GENERATOR),
        "blend": sha256(HERO_BLEND),
        "glb": sha256(HERO_GLB),
    }
    if current["blend"] != HERO_BLEND_SHA256 or current["glb"] != HERO_GLB_SHA256:
        raise RuntimeError(f"Hero lineage 已变化，禁止继续派生：{current}")


def build_massing() -> None:
    """保留证据支持的主轮廓、廊深、屋顶层级和关键开口。"""
    wall = road.material("艺术中心 Massing 暖白墙", "#ddd8cc")
    wall_light = road.material("艺术中心 Massing 白色构件", "#eee9de")
    roof = road.material("艺术中心 Massing 朱红屋瓦", "#9c4b35", roughness=0.76)
    shadow = road.material("艺术中心 Massing 关键开口", "#293331")
    glass = road.material(
        "艺术中心 Massing 深青玻璃",
        "#405754",
        roughness=0.55,
        alpha=0.9,
    )
    stone = road.material("艺术中心 Massing 浅灰石材", "#aaa79e")

    # 三层主楼沿用冻结 Hero 的尺寸与原点；每层分开，避免退化成单一高盒体。
    road.add_box(
        "film-art-massing-ground-core",
        (0, 0.55, 1.9),
        (15.8, 9.3, 3.8),
        wall,
        bevel=0.12,
    )
    road.add_box(
        "film-art-massing-second-core",
        (0, 0.55, 5.45),
        (15.8, 9.3, 3.3),
        wall,
        bevel=0.11,
    )
    road.add_box(
        "film-art-massing-third-core",
        (0, 0.55, 9.05),
        (15.4, 9.0, 3.45),
        wall,
        bevel=0.12,
    )

    # 双层前廊保留真实进深和连续柱列；中央入口仍是可辨识的凹口。
    road.add_box(
        "film-art-massing-ground-veranda",
        (0, -5.25, 0.18),
        (17.2, 2.65, 0.36),
        stone,
        bevel=0.06,
    )
    road.add_box(
        "film-art-massing-ground-opening",
        (0, -4.38, 1.95),
        (15.1, 0.28, 2.72),
        shadow,
        bevel=0.03,
    )
    road.add_box(
        "film-art-massing-second-floor",
        (0, -5.18, 3.82),
        (17.25, 2.85, 0.28),
        wall_light,
        bevel=0.05,
    )
    road.add_box(
        "film-art-massing-second-opening",
        (0, -4.38, 5.45),
        (15.1, 0.28, 2.3),
        shadow,
        bevel=0.03,
    )
    for floor, (z, height) in enumerate(((1.9, 3.25), (5.46, 2.76))):
        for index, x in enumerate(
            (-7.15, -4.8, -2.4, -1.1, 1.1, 2.4, 4.8, 7.15)
        ):
            road.add_box(
                f"film-art-massing-column-{floor}-{index}",
                (x, -5.75, z),
                (0.38, 0.38, height),
                wall_light,
                bevel=0.035,
            )
    road.add_box(
        "film-art-massing-entry-recess",
        (0, -4.5, 1.58),
        (2.25, 0.24, 2.72),
        shadow,
        bevel=0.04,
    )

    # 三层中央凉廊和两侧窗组只保留大尺度开口，不保留窗棂等 Hero 细节。
    road.add_box(
        "film-art-massing-upper-loggia",
        (0, -4.22, 9.0),
        (4.65, 0.32, 1.92),
        shadow,
        bevel=0.07,
    )
    for index, x in enumerate((-5.35, 5.35)):
        road.add_box(
            f"film-art-massing-upper-window-group-{index}",
            (x, -4.14, 9.0),
            (3.25, 0.26, 2.05),
            glass,
            bevel=0.04,
        )

    # 双重起翘屋顶是该主体在远景中不可丢失的轮廓。
    road.add_upturned_hip_roof(
        "film-art-massing-gallery-roof",
        (0, -5.02, 7.08),
        17.25,
        2.85,
        0.88,
        roof,
        overhang=0.52,
        upturn=0.34,
        segments=18,
    )
    road.add_upturned_hip_roof(
        "film-art-massing-main-roof",
        (0, 0.48, 10.78),
        17.55,
        10.65,
        2.92,
        roof,
        overhang=0.92,
        upturn=0.72,
        segments=22,
    )

    # 左右低玻璃连接体属于当前 Hero 的主场地轮廓，但不扩展为完整园区。
    for side, x in (("left", -9.78), ("right", 9.78)):
        road.add_box(
            f"film-art-massing-glass-wing-{side}",
            (x, -0.5, 1.28),
            (3.35, 8.25, 2.55),
            glass,
            bevel=0.1,
        )


def scene_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    minimum = Vector((math.inf, math.inf, math.inf))
    maximum = Vector((-math.inf, -math.inf, -math.inf))
    for obj in objects:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            for axis in range(3):
                minimum[axis] = min(minimum[axis], world[axis])
                maximum[axis] = max(maximum[axis], world[axis])
    return minimum, maximum


def configure_scene() -> None:
    scene = bpy.context.scene
    scene["asset_id"] = "building:xinhua-road:film-art-center"
    scene["tier"] = "massing"
    scene["derived_from_hero_glb_sha256"] = HERO_GLB_SHA256
    scene["derived_from_hero_blend_sha256"] = HERO_BLEND_SHA256
    scene["authored_meters_per_scene_unit"] = AUTHORED_METERS_PER_SCENE_UNIT
    scene["front_direction"] = "-Y"
    scene["ground_datum"] = 0.0
    scene["runtime_position"] = [47.5, 81.5]
    scene["runtime_yaw"] = 2.761592653589793
    scene["runtime_scale"] = 1.0
    scene["placement_locked"] = True
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.58, 0.68, 0.72, 1.0)
    background.inputs["Strength"].default_value = 0.6
    scene.view_settings.look = "AgX - Medium High Contrast"
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"


def add_review_rig(asset_objects: list[bpy.types.Object]) -> tuple[bpy.types.Object, ...]:
    minimum, maximum = scene_bounds(asset_objects)
    center = (minimum + maximum) * 0.5
    extent = max(maximum.x - minimum.x, maximum.y - minimum.y)
    ground = road.add_box(
        "test-preview-ground",
        (center.x, center.y, -0.08),
        (extent * 1.45, extent * 1.45, 0.16),
        road.material("测试地面", "#d8d5ca"),
        asset=False,
    )
    # 1.8 米人物按 2.7 米/场景单位换算为 2/3 单位，仅作为视觉尺标。
    proxy = road.add_cylinder(
        "test-human-scale-1p8m",
        (4.15, -8.2, 1.0 / 3.0),
        0.12,
        2.0 / 3.0,
        road.material("测试人物", "#35566f"),
        vertices=12,
        asset=False,
    )
    bpy.ops.object.camera_add()
    camera = bpy.context.active_object
    camera.name = "test-film-art-massing-camera"
    bpy.context.scene.camera = camera
    bpy.ops.object.light_add(type="AREA", location=(-8.0, -18.0, 24.0))
    key = bpy.context.active_object
    key.name = "test-film-art-massing-key"
    key.data.energy = 1900
    key.data.shape = "DISK"
    key.data.size = 18
    bpy.ops.object.light_add(type="AREA", location=(18.0, 8.0, 12.0))
    fill = bpy.context.active_object
    fill.name = "test-film-art-massing-fill"
    fill.data.energy = 850
    fill.data.size = 15
    return ground, proxy, camera, key, fill


def render_previews(camera: bpy.types.Object) -> dict[str, dict[str, Any]]:
    views = {
        "canonical": ((3.0, -43.0, 8.0), (0.0, -0.5, 6.3), 54),
        "side": ((34.0, -28.0, 9.0), (1.0, 0.0, 6.1), 52),
        "entrance": ((10.0, -48.0, 4.8), (0.0, -0.8, 5.7), 56),
    }
    outputs: dict[str, dict[str, Any]] = {}
    for view, (location, target, lens) in views.items():
        camera.location = location
        camera.data.lens = lens
        camera.rotation_euler = (
            Vector(target) - camera.location
        ).to_track_quat("-Z", "Y").to_euler()
        path = PREVIEW_DIR / f"test_film-art-center-massing_{view}_preview.png"
        bpy.context.scene.render.filepath = str(path)
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
        "tier": "massing",
        "status": "headless-candidate-mcp1-pending",
        "generator": {
            "path": "scripts/create_film_art_center_massing_model.py",
            "command": (
                "/Applications/Blender.app/Contents/MacOS/Blender --background "
                "--factory-startup "
                "--python-exit-code 1 "
                "--python scripts/create_film_art_center_massing_model.py"
            ),
            "blenderVersion": "5.2.0 LTS",
        },
        "lineage": {
            "method": "deterministic-simplification-of-frozen-hero-parameters",
            "heroGenerator": str(HERO_GENERATOR.relative_to(ROOT)),
            "heroGeneratorSha256": sha256(HERO_GENERATOR),
            "heroBlend": str(HERO_BLEND.relative_to(ROOT)),
            "heroBlendSha256": HERO_BLEND_SHA256,
            "heroGlb": str(HERO_GLB.relative_to(ROOT)),
            "heroGlbSha256": HERO_GLB_SHA256,
            "recoveryMassingCandidate": {
                "commit": "3044cd89f801250afcd477dfbcbc7da358bf4b11",
                "sha256": (
                    "4b925b2dad96894e7feda2b925962781fcd532d675657a9f17a96467458b0941"
                ),
                "decision": "rejected-generic-box-map-binding-blocked",
            },
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
                "sceneUnits": round(1.8 / AUTHORED_METERS_PER_SCENE_UNIT, 6),
                "exported": False,
            },
            "preservedCues": [
                "three-storey horizontal main volume",
                "full-width upturned main roof",
                "second red gallery roof and double veranda depth",
                "upper central recessed loggia",
                "low glass side wings",
            ],
            "deliberateLosses": [
                "roof ribs and ridge ornaments",
                "window mullions and balustrade rhythm",
                "sign, lions, lights and fine entrance details",
                "lawn, shrubs and paving details",
            ],
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
            "glb": str(OUTPUT_GLB.relative_to(ROOT)),
            "cacheVersion": MASSING_CACHE_VERSION,
            "previews": previews,
        },
        "glb": audit,
        "budgets": {
            "maxNodes": 2,
            "maxTriangles": 4000,
            "maxMaterials": 6,
            "maxImages": 0,
            "maxBytes": 300000,
        },
        "gates": {
            "headlessBuild": "pass",
            "glbAudit": "pending-external-audit",
            "mcp1": "pending",
            "mapAcceptance": "blocked-until-mcp1",
            "identityAllowed": False,
        },
    }
    BUILD_RECORD.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )


def main() -> None:
    validate_hero_lineage()
    for directory in (OUTPUT_BLEND.parent, OUTPUT_GLB.parent, BUILD_RECORD.parent):
        directory.mkdir(parents=True, exist_ok=True)
    road.clear_scene()
    configure_scene()
    build_massing()
    source_object_count = len(road.ASSET_OBJECTS)
    road.merge_asset_objects("film-art-center-massing")
    asset = road.ASSET_OBJECTS[0]
    asset["asset_id"] = "building:xinhua-road:film-art-center"
    asset["tier"] = "massing"
    asset["derived_from_hero_glb_sha256"] = HERO_GLB_SHA256
    asset["authored_meters_per_scene_unit"] = AUTHORED_METERS_PER_SCENE_UNIT
    asset["front_direction"] = "-Y"
    asset["ground_datum"] = 0.0
    asset["source_object_count"] = source_object_count
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
    )
    audit = parse_glb(OUTPUT_GLB)
    if audit["transformedNodes"]:
        raise RuntimeError(f"GLB 节点存在未烘焙变换：{audit['transformedNodes']}")
    if audit["images"] or audit["textures"]:
        raise RuntimeError("Massing 不允许图片或贴图")
    if (
        audit["nodes"] > 2
        or audit["triangles"] > 4000
        or audit["materials"] > 6
        or audit["bytes"] > 300000
    ):
        raise RuntimeError(f"Massing 超出预算：{audit}")
    _, _, camera, _, _ = add_review_rig(road.ASSET_OBJECTS)
    previews = render_previews(camera)
    write_build_record(audit, previews)
    print(
        "上海电影艺术中心 Massing 生成完成："
        f"{source_object_count} source objects, {audit['triangles']} triangles, "
        f"{audit['bytes']} bytes, sha256={audit['sha256']}"
    )


if __name__ == "__main__":
    main()
