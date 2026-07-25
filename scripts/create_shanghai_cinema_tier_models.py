"""从冻结的上海影城 Hero recipe 生成正式的结构化运行时层级资产。

当前只开放 Massing：保留真实占地、丝带正立面、玻璃鼓体、后塔楼、
侧翼和室外楼梯等主要层级，删除窗格、夹具、文字和街道装饰。
Identity 必须等 Massing 的 Blender MCP 与地图校准门通过后再开放。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
import sys
from datetime import datetime, timezone
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import create_xinhua_road_models as hero  # noqa: E402


HERO_GENERATOR = ROOT / "scripts/create_xinhua_road_models.py"
HERO_BLEND = ROOT / "assets/models/source/xinhua-road/shanghai-cinema.blend"
HERO_GLB = ROOT / "public/models/xinhua-road/shanghai-cinema.glb"
HERO_BUILD_RECORD = ROOT / "docs/research/build-records/shanghai-cinema.json"

MASSING_BLEND = (
    ROOT
    / "assets/models/source/tiers/shanghai-cinema/massing/"
    / "shanghai-cinema-massing.blend"
)
MASSING_GLB = (
    ROOT
    / "public/models/tiers/shanghai-cinema/massing/"
    / "shanghai-cinema-massing.glb"
)
MASSING_BUILD_RECORD = (
    ROOT
    / "docs/research/build-records/tiers/shanghai-cinema/massing/"
    / "shanghai-cinema-massing.json"
)
MASSING_PREVIEW_DIR = ROOT / "test_artifacts/all-models/massing/shanghai-cinema"

EXPECTED_HERO = {
    "generatorSha256": "6ea5fc19f98f6339d83063bafea9c0edd66ca07d2bb171be08f61d63fed3488d",
    "blendSha256": "fbb13fdb89169101c97bda0f3e5ba9644c70743aa85bd810368b365969db8fd8",
    "glbSha256": "c4d557038677c9c48577636843fb784b496f4a92fc9ea6bbb1d5ca78e822c062",
}

MASSING_BUDGET = {
    "maxTriangles": 12_000,
    "maxNodes": 1,
    "maxMaterials": 3,
    "maxImages": 0,
    "maxBytes": 1_500_000,
}

MASSING_EXACT = {
    "cinema-glass-core",
    "cinema-lower-ribbon-lip",
    "cinema-main-ribbon",
    "cinema-right-glass-wing",
    "cinema-right-cantilever",
    "cinema-right-terrace-base",
    "cinema-left-glass-wing",
    "cinema-left-cantilever",
    "cinema-left-terrace-base",
    "cinema-right-upper-side",
    "cinema-oculus-reveal",
    "cinema-left-drum",
    "cinema-left-drum-base",
    "cinema-left-drum-crown",
    "cinema-tower-core",
    "cinema-tower-left-frame",
    "cinema-tower-right-frame",
    "cinema-tower-top-frame",
}

MASSING_PREFIXES = (
    "cinema-entry-step-",
    "cinema-stair-massing-step-",
)

SIGNATURE_CUES = {
    "asymmetricRibbonFacade": ("cinema-main-ribbon",),
    "leftGlassDrum": ("cinema-left-drum", "cinema-left-drum-crown"),
    "setbackTower": ("cinema-tower-core", "cinema-tower-top-frame"),
    "externalStair": ("cinema-stair-massing-step-",),
    "openEntrance": ("cinema-entry-step-", "cinema-glass-core"),
}

FIXED_VIEWS = {
    "canonical": {
        "camera": [12.0, -50.0, 7.0],
        "target": [0.0, -0.6, 6.2],
        "lensMm": 48,
    },
    "side": {
        "camera": [39.0, -34.0, 8.5],
        "target": [4.0, -0.2, 6.5],
        "lensMm": 52,
    },
    "entrance": {
        "camera": [14.0, -57.0, 5.5],
        "target": [0.0, -0.8, 5.8],
        "lensMm": 52,
    },
}

METERS_PER_SCENE_UNIT = 2.7
HUMAN_HEIGHT_METERS = 1.75


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def file_evidence(path: Path) -> dict:
    return {
        "path": str(path.relative_to(ROOT)),
        "sha256": file_sha256(path),
        "bytes": path.stat().st_size,
    }


def assert_frozen_hero_recipe() -> dict:
    record = json.loads(HERO_BUILD_RECORD.read_text())
    actual = {
        "generatorSha256": file_sha256(HERO_GENERATOR),
        "blendSha256": file_sha256(HERO_BLEND),
        "glbSha256": file_sha256(HERO_GLB),
    }
    if actual != EXPECTED_HERO:
        raise RuntimeError(
            "上海影城 Hero recipe 或二进制已漂移，禁止派生 tier："
            f"expected={EXPECTED_HERO}, actual={actual}"
        )
    if record.get("outputs", {}).get("sha256") != actual["glbSha256"]:
        raise RuntimeError("上海影城 Hero build record 与当前 GLB 不一致")
    return record


def keep_for_massing(name: str) -> bool:
    return name in MASSING_EXACT or name.startswith(MASSING_PREFIXES)


def mesh_triangles(obj: bpy.types.Object) -> int:
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def world_bounds(objects: list[bpy.types.Object]) -> dict:
    minimum = Vector((math.inf, math.inf, math.inf))
    maximum = Vector((-math.inf, -math.inf, -math.inf))
    for obj in objects:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            for axis in range(3):
                minimum[axis] = min(minimum[axis], world[axis])
                maximum[axis] = max(maximum[axis], world[axis])
    return {
        "min": list(minimum),
        "max": list(maximum),
        "size": [maximum[axis] - minimum[axis] for axis in range(3)],
    }


def replace_stair_with_massing_steps() -> dict:
    """把 32 级 Hero 楼梯按四级一组聚合为 8 级清晰体块。"""
    detailed_steps = sorted(
        (
            obj
            for obj in hero.ASSET_OBJECTS
            if obj.name.startswith("cinema-stair-step-")
        ),
        key=lambda obj: int(obj.name.rsplit("-", 1)[1]),
    )
    detailed_cheeks = [
        obj
        for obj in hero.ASSET_OBJECTS
        if obj.name.startswith("cinema-stair-outer-cheek-")
    ]
    if len(detailed_steps) != 32:
        raise RuntimeError(f"Hero 室外楼梯级数漂移：{len(detailed_steps)} != 32")
    source_material = detailed_steps[0].data.materials[0]
    added_names: list[str] = []
    for group_index in range(0, len(detailed_steps), 4):
        group = detailed_steps[group_index : group_index + 4]
        bounds = world_bounds(group)
        center = tuple(
            (bounds["min"][axis] + bounds["max"][axis]) * 0.5
            for axis in range(3)
        )
        dimensions = tuple(bounds["size"])
        added = hero.add_box(
            f"cinema-stair-massing-step-{group_index // 4}",
            center,
            dimensions,
            source_material,
            bevel=0.0,
        )
        added_names.append(added.name)
    removed = detailed_steps + detailed_cheeks
    removed_names = [obj.name for obj in removed]
    for obj in removed:
        if obj in hero.ASSET_OBJECTS:
            hero.ASSET_OBJECTS.remove(obj)
        bpy.data.objects.remove(obj, do_unlink=True)
    return {
        "sourceStepCount": len(detailed_steps),
        "sourceCheekCount": len(detailed_cheeks),
        "groupSize": 4,
        "outputStepCount": len(added_names),
        "addedObjects": added_names,
        "removedObjects": sorted(removed_names),
    }


def decimate_signature_surfaces(objects: list[bpy.types.Object]) -> dict:
    """只简化连续曲面，保留体块边界与语义对象。"""
    ratios = {
        "cinema-main-ribbon": 0.55,
        "cinema-lower-ribbon-lip": 0.55,
        "cinema-left-drum-crown": 0.50,
        "cinema-left-drum-base": 0.50,
        "cinema-glass-core": 0.60,
        "cinema-left-drum": 0.60,
        "cinema-oculus-reveal": 0.60,
    }
    result: dict[str, dict] = {}
    by_name = {obj.name: obj for obj in objects}
    for name, ratio in ratios.items():
        obj = by_name[name]
        before = mesh_triangles(obj)
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        modifier = obj.modifiers.new("Massing_SemanticDecimate", "DECIMATE")
        modifier.decimate_type = "COLLAPSE"
        modifier.ratio = ratio
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.select_set(False)
        after = mesh_triangles(obj)
        result[name] = {
            "ratio": ratio,
            "trianglesBefore": before,
            "trianglesAfter": after,
        }
    return result


def clamp_meshes_to_ground(objects: list[bpy.types.Object]) -> int:
    """把任何低于 Z=0 的顶点压到统一地面基准，不平移整个构件。"""
    clamped = 0
    for obj in objects:
        inverse = obj.matrix_world.inverted()
        for vertex in obj.data.vertices:
            world = obj.matrix_world @ vertex.co
            if world.z < 0:
                world.z = 0
                vertex.co = inverse @ world
                clamped += 1
        obj.data.update()
    return clamped


def replace_with_tier_materials(objects: list[bpy.types.Object]) -> None:
    opaque = hero.material("Massing_Opaque", "#c9c7c0", roughness=0.84)
    glass = hero.material(
        "Massing_Glass", "#55767a", roughness=0.34, metallic=0.02, alpha=0.82
    )
    site = hero.material("Massing_Site", "#8f8b82", roughness=0.92)
    for obj in objects:
        obj.data.materials.clear()
        if obj.name.startswith(("cinema-entry-step-", "cinema-stair-massing-step-")):
            obj.data.materials.append(site)
        elif "glass" in obj.name or obj.name in {
            "cinema-left-drum",
            "cinema-tower-core",
        }:
            obj.data.materials.append(glass)
        else:
            obj.data.materials.append(opaque)


def retain_massing_objects() -> tuple[list[bpy.types.Object], list[str]]:
    generated = [obj for obj in hero.ASSET_OBJECTS if obj.type == "MESH"]
    retained = [obj for obj in generated if keep_for_massing(obj.name)]
    retained_names = {obj.name for obj in retained}
    missing = sorted(MASSING_EXACT - retained_names)
    if missing:
        raise RuntimeError(f"Hero recipe 缺少 Massing 必需构件：{missing}")
    for cue, prefixes in SIGNATURE_CUES.items():
        if not any(
            any(obj.name == prefix or obj.name.startswith(prefix) for prefix in prefixes)
            for obj in retained
        ):
            raise RuntimeError(f"Massing 缺少身份体块：{cue}")
    removed_names = sorted(obj.name for obj in generated if obj not in retained)
    for obj in list(bpy.data.objects):
        if obj.type == "MESH" and obj not in retained:
            bpy.data.objects.remove(obj, do_unlink=True)
    hero.ASSET_OBJECTS[:] = sorted(retained, key=lambda obj: obj.name)
    return hero.ASSET_OBJECTS, removed_names


def purge_orphans() -> None:
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.cameras,
        bpy.data.lights,
        bpy.data.materials,
        bpy.data.images,
    ):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def set_object_metadata(objects: list[bpy.types.Object], hero_record: dict) -> None:
    for obj in objects:
        obj["asset_id"] = "shanghai-cinema"
        obj["tier"] = "massing"
        obj["derived_from_hero_glb_sha256"] = EXPECTED_HERO["glbSha256"]
        obj["derived_from_hero_blend_sha256"] = EXPECTED_HERO["blendSha256"]
        obj["derived_from_hero_generator_sha256"] = EXPECTED_HERO["generatorSha256"]
        obj["source_lineage_id"] = (
            f"shanghai-cinema-hero-{EXPECTED_HERO['glbSha256'][:12]}"
        )
        obj["meters_per_scene_unit"] = METERS_PER_SCENE_UNIT
        obj["canonical_front"] = "local -Y"
        obj["ground_datum"] = 0.0
        obj["runtime_x_mirrored"] = True
        obj["reference_images_embedded"] = False
        obj["collision_intent"] = "three independent footprint obstacles; entrance open"
        obj["hero_cache_version"] = hero_record["outputs"]["cacheVersion"]


def merge_for_runtime(objects: list[bpy.types.Object]) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    merged = objects[0]
    bpy.context.view_layer.objects.active = merged
    bpy.ops.object.join()
    merged.name = "ShanghaiCinema_Massing_Runtime"
    merged.data.name = "ShanghaiCinema_Massing_Runtime_Mesh"
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    hero.ASSET_OBJECTS[:] = [merged]
    return merged


def export_runtime_glb(asset: bpy.types.Object) -> None:
    """仅在 GLB 导出阶段执行与 Hero 相同的 X 镜像。"""
    bpy.ops.object.select_all(action="DESELECT")
    asset.select_set(True)
    bpy.context.view_layer.objects.active = asset
    mesh = asset.data
    mesh.transform(Matrix.Scale(-1.0, 4, Vector((1.0, 0.0, 0.0))))
    mesh.flip_normals()
    mesh.update()
    bpy.ops.export_scene.gltf(
        filepath=str(MASSING_GLB),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
    )
    mesh.transform(Matrix.Scale(-1.0, 4, Vector((1.0, 0.0, 0.0))))
    mesh.flip_normals()
    mesh.update()


def add_preview_environment() -> bpy.types.Object:
    ground_material = hero.material("test_MassingGround", "#77756f", roughness=0.96)
    person_material = hero.material("test_HumanScale", "#cc6f42", roughness=0.74)
    hero.add_box(
        "test_massing_preview_ground",
        (0, 0.7, -0.06),
        (44, 32, 0.12),
        ground_material,
        asset=False,
    )
    hero.add_box(
        "test_massing_human_scale",
        (-16.0, -8.2, (HUMAN_HEIGHT_METERS / METERS_PER_SCENE_UNIT) * 0.5),
        (
            0.46 / METERS_PER_SCENE_UNIT,
            0.32 / METERS_PER_SCENE_UNIT,
            HUMAN_HEIGHT_METERS / METERS_PER_SCENE_UNIT,
        ),
        person_material,
        bevel=0.08,
        asset=False,
    )
    bpy.ops.object.light_add(type="AREA", location=(-14.0, -18.0, 25.0))
    key = bpy.context.object
    key.name = "test_massing_key_light"
    key.data.energy = 1800
    key.data.shape = "DISK"
    key.data.size = 18.0
    bpy.ops.object.light_add(type="AREA", location=(22.0, 8.0, 13.0))
    fill = bpy.context.object
    fill.name = "test_massing_fill_light"
    fill.data.energy = 900
    fill.data.size = 14.0
    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.name = "test_massing_camera"
    camera.data.sensor_width = 36
    bpy.context.scene.camera = camera

    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.52, 0.59, 0.62, 1)
    background.inputs["Strength"].default_value = 0.7
    return camera


def render_fixed_views(camera: bpy.types.Object) -> dict[str, dict]:
    evidence: dict[str, dict] = {}
    for name, view in FIXED_VIEWS.items():
        camera.location = view["camera"]
        camera.data.lens = view["lensMm"]
        camera.rotation_euler = (
            Vector(view["target"]) - camera.location
        ).to_track_quat("-Z", "Y").to_euler()
        path = MASSING_PREVIEW_DIR / f"test_shanghai-cinema-massing-{name}.png"
        bpy.context.scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        evidence[name] = {
            **view,
            **file_evidence(path),
            "observationDirection": "toward asset canonical local -Y facade",
        }
    return evidence


def audit_glb(path: Path) -> dict:
    contents = path.read_bytes()
    if contents[:4] != b"glTF":
        raise RuntimeError("Massing 输出不是 GLB")
    json_length = struct.unpack_from("<I", contents, 12)[0]
    gltf = json.loads(contents[20 : 20 + json_length].decode("utf8"))
    triangles = 0
    primitives = 0
    bounds_min = [math.inf, math.inf, math.inf]
    bounds_max = [-math.inf, -math.inf, -math.inf]
    for mesh in gltf.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            primitives += 1
            if primitive.get("mode", 4) != 4:
                raise RuntimeError("Massing 含非三角形 primitive")
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
        "sha256": file_sha256(path),
        "bytes": len(contents),
        "nodes": len(gltf.get("nodes", [])),
        "meshes": len(gltf.get("meshes", [])),
        "primitives": primitives,
        "triangles": triangles,
        "materials": len(gltf.get("materials", [])),
        "materialNames": [
            material.get("name") for material in gltf.get("materials", [])
        ],
        "images": len(gltf.get("images", [])),
        "textures": len(gltf.get("textures", [])),
        "animations": len(gltf.get("animations", [])),
        "skins": len(gltf.get("skins", [])),
        "bounds": {
            "min": bounds_min,
            "max": bounds_max,
            "size": [
                bounds_max[axis] - bounds_min[axis] for axis in range(3)
            ],
        },
        "transformedNodes": transformed_nodes,
        "extras": gltf.get("nodes", [{}])[0].get("extras", {}),
    }


def assert_budget(audit: dict) -> None:
    checks = {
        "triangles": audit["triangles"] <= MASSING_BUDGET["maxTriangles"],
        "nodes": audit["nodes"] <= MASSING_BUDGET["maxNodes"],
        "materials": audit["materials"] <= MASSING_BUDGET["maxMaterials"],
        "images": audit["images"] <= MASSING_BUDGET["maxImages"],
        "bytes": audit["bytes"] <= MASSING_BUDGET["maxBytes"],
        "rootTransform": not audit["transformedNodes"],
        "groundDatum": abs(audit["bounds"]["min"][1]) <= 0.001,
    }
    failed = sorted(name for name, passed in checks.items() if not passed)
    if failed:
        raise RuntimeError(f"Massing 预算或结构审计失败：{failed}; audit={audit}")


def write_build_record(
    hero_record: dict,
    retained_names: list[str],
    removed_names: list[str],
    stair_simplification: dict,
    surface_simplification: dict,
    clamped_vertices: int,
    editable_bounds: dict,
    preview_evidence: dict,
    audit: dict,
) -> None:
    record = {
        "schemaVersion": 3,
        "assetId": "shanghai-cinema",
        "tier": "massing",
        "status": "generated-massing-blender-mcp-pending",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "lineageId": f"shanghai-cinema-massing-{audit['sha256'][:12]}",
        "generator": {
            **file_evidence(Path(__file__).resolve()),
            "command": (
                "/Applications/Blender.app/Contents/MacOS/Blender --background "
                "--python-exit-code 1 "
                "--python scripts/create_shanghai_cinema_tier_models.py "
                "-- --tier massing"
            ),
            "blenderVersion": bpy.app.version_string,
        },
        "sourceHero": {
            "buildRecord": str(HERO_BUILD_RECORD.relative_to(ROOT)),
            "cacheVersion": hero_record["outputs"]["cacheVersion"],
            "generator": file_evidence(HERO_GENERATOR),
            "blend": file_evidence(HERO_BLEND),
            "glb": file_evidence(HERO_GLB),
        },
        "derivation": {
            "method": "semantic-component-selection-from-frozen-hero-recipe",
            "runtimeIdentityTier": False,
            "retainedObjectCount": len(retained_names),
            "retainedObjects": retained_names,
            "removedObjectCount": len(removed_names),
            "removedObjects": removed_names,
            "stairSimplification": stair_simplification,
            "surfaceSimplification": surface_simplification,
            "groundClampedVertices": clamped_vertices,
            "signatureCues": SIGNATURE_CUES,
            "materials": ["Massing_Opaque", "Massing_Glass", "Massing_Site"],
            "excludedSiteContext": [
                "cinema-plaza",
                "cinema-plaza-grid-*",
                "street planters, benches, lights and foliage",
            ],
        },
        "contract": {
            "metersPerSceneUnit": METERS_PER_SCENE_UNIT,
            "origin": [0, 0, 0],
            "pivot": "shared Hero local origin",
            "canonicalFront": "local -Y",
            "runtimeXMirrored": True,
            "groundDatumBlenderZ": 0,
            "editableBoundsBlender": editable_bounds,
            "collisionIntent": (
                "reuse three independent cinema footprint obstacles; "
                "keep entrance plaza and circulation openings passable"
            ),
            "humanScaleReference": {
                "heightMeters": HUMAN_HEIGHT_METERS,
                "heightSceneUnits": HUMAN_HEIGHT_METERS / METERS_PER_SCENE_UNIT,
                "previewObject": "test_massing_human_scale",
            },
        },
        "outputs": {
            "blend": file_evidence(MASSING_BLEND),
            "glb": file_evidence(MASSING_GLB),
            "previews": preview_evidence,
        },
        "audit": audit,
        "budget": MASSING_BUDGET,
        "gates": {
            "evidenceAndBrief": "passed-existing",
            "deterministicGeneration": "passed",
            "glbStructuralAudit": "passed",
            "blenderMcpMassingReview": "pending",
            "threeJsMapCalibration": "pending",
            "heroMasterReview": "pending-retain-existing-hero",
            "identityDerivation": "blocked-until-prior-gates-pass",
            "threeTierRuntime": "pending",
        },
        "supersedesWithoutDeleting": {
            "blend": (
                "assets/models/source/tiers/xinhua-road/massing/"
                "shanghai-cinema-massing.blend"
            ),
            "glb": (
                "public/models/tiers/xinhua-road/massing/"
                "shanghai-cinema-massing.glb"
            ),
            "buildRecord": (
                "docs/research/build-records/tiers/xinhua-road/massing/"
                "shanghai-cinema-massing.json"
            ),
            "oldStatus": "provisional-voxel-remesh-migration-input",
        },
    }
    MASSING_BUILD_RECORD.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n"
    )


def build_massing() -> None:
    hero_record = assert_frozen_hero_recipe()
    for path in (
        MASSING_BLEND.parent,
        MASSING_GLB.parent,
        MASSING_BUILD_RECORD.parent,
        MASSING_PREVIEW_DIR,
    ):
        path.mkdir(parents=True, exist_ok=True)

    hero.clear_scene()
    hero.build_shanghai_cinema()
    generated_count = len(hero.ASSET_OBJECTS)
    stair_simplification = replace_stair_with_massing_steps()
    retained, removed_names = retain_massing_objects()
    removed_names = sorted(
        set(removed_names) | set(stair_simplification["removedObjects"])
    )
    retained_names = [obj.name for obj in retained]
    if generated_count <= len(retained_names):
        raise RuntimeError("Massing 没有删除任何 Hero 细节，派生规则异常")
    replace_with_tier_materials(retained)
    surface_simplification = decimate_signature_surfaces(retained)
    clamped_vertices = clamp_meshes_to_ground(retained)
    editable_bounds = world_bounds(retained)
    if abs(editable_bounds["min"][2]) > 0.001:
        raise RuntimeError(f"Massing Blender ground datum 不为 0：{editable_bounds}")
    set_object_metadata(retained, hero_record)
    purge_orphans()

    # 保存可编辑、语义化的 canonical Blend；正式运行时合并不回写源文件。
    bpy.ops.wm.save_as_mainfile(filepath=str(MASSING_BLEND))

    runtime_asset = merge_for_runtime(retained)
    set_object_metadata([runtime_asset], hero_record)
    export_runtime_glb(runtime_asset)
    camera = add_preview_environment()
    preview_evidence = render_fixed_views(camera)
    audit = audit_glb(MASSING_GLB)
    assert_budget(audit)
    write_build_record(
        hero_record,
        retained_names,
        removed_names,
        stair_simplification,
        surface_simplification,
        clamped_vertices,
        editable_bounds,
        preview_evidence,
        audit,
    )
    print(
        json.dumps(
            {
                "assetId": "shanghai-cinema",
                "tier": "massing",
                "retainedObjects": len(retained_names),
                "removedObjects": len(removed_names),
                "audit": audit,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--tier",
        choices=("massing",),
        required=True,
        help="Identity 需等待 Massing 与地图门通过后再开放。",
    )
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else [])
    if args.tier == "massing":
        build_massing()


if __name__ == "__main__":
    main()
