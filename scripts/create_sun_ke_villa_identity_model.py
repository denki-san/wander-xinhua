"""从冻结的孙科别墅 Hero master 派生可编辑 Identity Blend 与运行时 GLB。

本脚本只读取 Hero Blend，不修改 Hero GLB、Hero Blend 或任何 Hold 资产。
Identity 保留完整体块和关键身份构件，删除逐片屋瓦、密集分格与景观细节。
"""

from __future__ import annotations

import hashlib
import json
import math
import struct
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
HERO_BLEND = ROOT / "assets/models/source/sun-ke-villa.blend"
HERO_GLB = ROOT / "public/models/shangsheng/sun-ke-villa.glb"
HERO_BUILD_RECORD = (
    ROOT
    / "docs/research/build-records/tiers/sun-ke-villa/hero/sun-ke-villa-hero.json"
)
OUTPUT_BLEND = (
    ROOT
    / "assets/models/source/tiers/sun-ke-villa/identity/sun-ke-villa-identity.blend"
)
OUTPUT_GLB = (
    ROOT / "public/models/tiers/sun-ke-villa/identity/sun-ke-villa-identity.glb"
)
PREVIEW_DIR = ROOT / "test_artifacts/all-models/identity/sun-ke-villa"
CANONICAL_PREVIEW = PREVIEW_DIR / "test_sun-ke-villa-identity-canonical.png"
SIDE_PREVIEW = PREVIEW_DIR / "test_sun-ke-villa-identity-side.png"
NORTH_PREVIEW = PREVIEW_DIR / "test_sun-ke-villa-identity-north.png"
BUILD_RECORD = (
    ROOT
    / "docs/research/build-records/tiers/sun-ke-villa/identity/"
    / "sun-ke-villa-identity.json"
)

IDENTITY_BUDGET = {
    "maxTriangles": 6500,
    "maxNodes": 1,
    "maxMaterials": 7,
    "maxImages": 0,
    "maxBytes": 600_000,
}

KEEP_EXACT = {
    "central-residence",
    "central-tiled-roof",
    "lower-west-wing",
    "west-wing-tiled-roof",
    "rounded-east-tower",
    "tower-low-curved-roof",
    "tower-eave-tile-band",
    "north-east-low-wing",
    "north-east-low-wing-roof",
    "front-dormer",
    "front-dormer-roof",
    "main-chimney",
    "main-chimney-cap",
    "garden-balcony-slab",
    "garden-balcony-top-rail",
    "garden-balcony-bottom-rail",
    "garden-string-course",
    "garden-entry-step-0",
    "garden-entry-step-1",
    "garden-pointed-portal-1_rear-entry-door",
    "west-wing-diamond-panel",
    "north-porch-column-0",
    "north-porch-column-1",
    "north-porch-column-cap-0",
    "north-porch-column-cap-1",
    "north-porch-gable-wall",
    "north-porch-gable-roof",
    "north-porch-slab",
    "north-porte-cochere-rear-column-0",
    "north-porte-cochere-rear-column-1",
    "north-porte-cochere-side-beam-left",
    "north-porte-cochere-side-beam-right",
    "north-main-door_glass",
    "north-main-door_stone-surround",
    "front-dormer-window_glass",
    "front-dormer-window_stone-surround",
}

for index in (0, 3, 6, 9, 12, 14):
    KEEP_EXACT.add(f"garden-balcony-baluster-{index:02d}")

for portal in range(3):
    KEEP_EXACT.update(
        {
            f"garden-pointed-portal-{portal}_deep-recess",
            f"garden-pointed-portal-{portal}_stone-surround",
        }
    )

for window in range(4):
    KEEP_EXACT.update(
        {
            f"garden-upper-round-window-{window}_glass",
            f"garden-upper-round-window-{window}_stone-surround",
        }
    )

for segment in range(9):
    KEEP_EXACT.add(f"north-porch-round-entry-arch-{segment:02d}")

for window in (0, 2):
    for level in (0, 1):
        KEEP_EXACT.update(
            {
                f"tower-window-{level}-{window}_glass",
                f"tower-window-{level}-{window}_stone-surround",
            }
        )

for window in (0, 1):
    KEEP_EXACT.update(
        {
            f"west-wing-window-{window}_glass",
            f"west-wing-window-{window}_stone-surround",
        }
    )

for window in (0, 2):
    KEEP_EXACT.update(
        {
            f"north-upper-pointed-window-{window}_glass",
            f"north-upper-pointed-window-{window}_stone-surround",
        }
    )

for window in (0, 1):
    KEEP_EXACT.update(
        {
            f"north-low-pointed-window-{window}_glass",
            f"north-low-pointed-window-{window}_stone-surround",
        }
    )

SIGNATURE_PREFIXES = {
    "gardenTriplePointedPortal": ("garden-pointed-portal-",),
    "gardenUpperRoundWindows": ("garden-upper-round-window-",),
    "gardenBalcony": ("garden-balcony-",),
    "roundedEastTower": ("rounded-east-tower", "tower-window-"),
    "northPorch": ("north-porch-", "north-main-door_"),
    "roofAndChimney": (
        "central-tiled-roof",
        "tower-low-curved-roof",
        "main-chimney",
    ),
}


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def assert_frozen_hero() -> dict:
    record = json.loads(HERO_BUILD_RECORD.read_text())
    frozen_master = record.get("frozenMaster", {})
    expected_glb_sha = frozen_master.get("glb", {}).get("sha256")
    expected_blend_sha = frozen_master.get("blend", {}).get("sha256")
    lineage_id = record.get("lineageId")
    if (
        record.get("status") != "complete-master-frozen"
        or not lineage_id
        or not expected_glb_sha
        or not expected_blend_sha
    ):
        raise RuntimeError("Hero build record 未冻结，禁止派生 Identity")
    if file_sha256(HERO_GLB) != expected_glb_sha:
        raise RuntimeError("Hero GLB SHA 已漂移，禁止派生 Identity")
    if file_sha256(HERO_BLEND) != expected_blend_sha:
        raise RuntimeError("Hero Blend SHA 已漂移，禁止派生 Identity")
    return record


def retain_identity_objects() -> list[bpy.types.Object]:
    retained: list[bpy.types.Object] = []
    for obj in list(bpy.data.objects):
        if obj.type == "MESH" and obj.name in KEEP_EXACT:
            retained.append(obj)
            continue
        bpy.data.objects.remove(obj, do_unlink=True)
    missing_exact = sorted(name for name in KEEP_EXACT if name not in {obj.name for obj in retained})
    if missing_exact:
        raise RuntimeError(f"Hero 缺少 Identity 派生对象：{missing_exact}")
    for cue, prefixes in SIGNATURE_PREFIXES.items():
        if not any(
            any(obj.name.startswith(prefix) for prefix in prefixes)
            for obj in retained
        ):
            raise RuntimeError(f"Identity 缺少身份构件：{cue}")
    return sorted(retained, key=lambda obj: obj.name)


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


def add_preview_environment() -> bpy.types.Object:
    ground_material = bpy.data.materials.new("test_IdentityPreviewGround")
    ground_material.diffuse_color = (0.32, 0.35, 0.33, 1)
    bpy.ops.mesh.primitive_plane_add(size=34, location=(0, 0, -0.015))
    ground = bpy.context.object
    ground.name = "test_identity_preview_ground"
    ground.data.materials.append(ground_material)

    bpy.ops.object.light_add(type="AREA", location=(-4.8, -6.6, 10.5))
    key_light = bpy.context.object
    key_light.name = "test_identity_key_light"
    key_light.data.energy = 1050
    key_light.data.shape = "DISK"
    key_light.data.size = 5.5

    bpy.ops.object.light_add(type="AREA", location=(7.0, 2.8, 6.5))
    fill_light = bpy.context.object
    fill_light.name = "test_identity_fill_light"
    fill_light.data.energy = 720
    fill_light.data.size = 4.0

    bpy.ops.object.light_add(type="AREA", location=(-4.5, 8.0, 8.5))
    rear_light = bpy.context.object
    rear_light.name = "test_identity_rear_light"
    rear_light.data.energy = 980
    rear_light.data.size = 5.0

    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.name = "test_identity_camera"
    camera.data.lens = 54
    camera.data.sensor_width = 36
    bpy.context.scene.camera = camera

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.color = (0.46, 0.50, 0.50)
    return camera


def point_camera(
    camera: bpy.types.Object,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
) -> None:
    camera.location = location
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat(
        "-Z", "Y"
    ).to_euler()


def render_preview(
    camera: bpy.types.Object,
    path: Path,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
    lens: float,
) -> None:
    point_camera(camera, location, target)
    camera.data.lens = lens
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def join_identity_objects(
    objects: list[bpy.types.Object],
    hero_record: dict,
) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    active = objects[0]
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.join()
    active.name = "SunKeVilla_Identity_Runtime"
    active.data.name = "SunKeVilla_Identity_Runtime_Mesh"
    active["asset_id"] = "sun-ke-villa"
    active["tier"] = "identity"
    frozen_master = hero_record["frozenMaster"]
    active["derived_from_hero_glb_sha256"] = frozen_master["glb"]["sha256"]
    active["derived_from_hero_blend_sha256"] = frozen_master["blend"]["sha256"]
    active["source_lineage_id"] = hero_record["lineageId"]
    active["meters_per_scene_unit"] = 2.7
    active["canonical_front"] = "local -Y"
    active["reference_images_embedded"] = False
    return active


def export_glb(asset: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    asset.select_set(True)
    bpy.context.view_layer.objects.active = asset
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
    )


def audit_glb(path: Path) -> dict:
    contents = path.read_bytes()
    if contents[:4] != b"glTF":
        raise RuntimeError("Identity 输出不是 GLB")
    json_length = struct.unpack_from("<I", contents, 12)[0]
    gltf = json.loads(contents[20 : 20 + json_length].decode("utf8"))
    triangles = 0
    bounds_min = [math.inf, math.inf, math.inf]
    bounds_max = [-math.inf, -math.inf, -math.inf]
    primitives = 0
    for mesh in gltf.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            primitives += 1
            if primitive.get("mode", 4) != 4:
                raise RuntimeError("Identity 含非三角形 primitive")
            accessor_index = primitive.get("indices")
            if accessor_index is None:
                accessor_index = primitive["attributes"]["POSITION"]
            triangles += gltf["accessors"][accessor_index]["count"] // 3
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
        "materials": len(gltf.get("materials", [])),
        "materialNames": [
            material.get("name") for material in gltf.get("materials", [])
        ],
        "images": len(gltf.get("images", [])),
        "textures": len(gltf.get("textures", [])),
        "animations": len(gltf.get("animations", [])),
        "skins": len(gltf.get("skins", [])),
        "triangles": triangles,
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


def file_evidence(path: Path) -> dict:
    return {
        "path": str(path.relative_to(ROOT)),
        "sha256": file_sha256(path),
        "bytes": path.stat().st_size,
    }


def main() -> None:
    hero_record = assert_frozen_hero()
    OUTPUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    BUILD_RECORD.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.open_mainfile(filepath=str(HERO_BLEND))
    retained = retain_identity_objects()
    retained_names = [obj.name for obj in retained]
    purge_orphans()

    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))

    identity = join_identity_objects(retained, hero_record)
    export_glb(identity)

    camera = add_preview_environment()
    render_preview(
        camera,
        CANONICAL_PREVIEW,
        (0.1, -13.8, 3.85),
        (-0.05, -0.15, 2.08),
        55,
    )
    render_preview(
        camera,
        SIDE_PREVIEW,
        (10.2, -11.6, 4.55),
        (0.0, -0.05, 2.05),
        56,
    )
    render_preview(
        camera,
        NORTH_PREVIEW,
        (-9.2, 13.4, 5.1),
        (-0.90, 2.05, 1.78),
        56,
    )

    glb = audit_glb(OUTPUT_GLB)
    budget_checks = {
        "triangles": glb["triangles"] <= IDENTITY_BUDGET["maxTriangles"],
        "nodes": glb["nodes"] <= IDENTITY_BUDGET["maxNodes"],
        "materials": glb["materials"] <= IDENTITY_BUDGET["maxMaterials"],
        "images": glb["images"] <= IDENTITY_BUDGET["maxImages"],
        "bytes": glb["bytes"] <= IDENTITY_BUDGET["maxBytes"],
    }
    if not all(budget_checks.values()):
        raise RuntimeError(f"Identity 超出预算：{budget_checks}")
    if glb["transformedNodes"]:
        raise RuntimeError("Identity GLB 根变换未归一化")

    cue_objects = {
        cue: [
            name
            for name in retained_names
            if any(name.startswith(prefix) for prefix in prefixes)
        ]
        for cue, prefixes in SIGNATURE_PREFIXES.items()
    }

    record = {
        "version": 1,
        "generatedAt": "2026-07-25T13:00:00+08:00",
        "assetId": "sun-ke-villa",
        "tier": "identity",
        "status": "generated-from-frozen-hero-runtime-pending",
        "generator": file_evidence(Path(__file__).resolve()),
        "derivedFrom": {
            "heroBuildRecord": str(HERO_BUILD_RECORD.relative_to(ROOT)),
            "heroLineageId": hero_record["lineageId"],
            "heroGlbSha256": hero_record["frozenMaster"]["glb"]["sha256"],
            "heroBlendSha256": hero_record["frozenMaster"]["blend"]["sha256"],
            "heroBuildRecordSha256": file_sha256(HERO_BUILD_RECORD),
            "verifiedFrozenStatus": hero_record["status"],
        },
        "derivationPolicy": {
            "method": "open-frozen-hero-blend-retain-whitelisted-objects",
            "selectedObjectCount": len(retained_names),
            "selectedObjects": retained_names,
            "removed": [
                "逐条屋瓦 ribs",
                "密集门窗 mullion/transom/sill",
                "落水管、绿篱和非身份场地细节",
                "重复塔楼与后立面窗组",
            ],
            "manualRemodeling": False,
        },
        "signatureCues": cue_objects,
        "outputs": {
            "blend": file_evidence(OUTPUT_BLEND),
            "glb": file_evidence(OUTPUT_GLB),
            "previews": {
                "canonical": file_evidence(CANONICAL_PREVIEW),
                "side": file_evidence(SIDE_PREVIEW),
                "north": file_evidence(NORTH_PREVIEW),
            },
        },
        "glb": glb,
        "budgets": {
            "contract": IDENTITY_BUDGET,
            "checks": budget_checks,
            "status": "pass",
        },
        "mapTransform": {
            "position": "same-as-hero-and-massing",
            "rotation": "same-as-hero-and-massing",
            "runtimeScale": [1, 1, 1],
            "collision": "reuse-osm-way-864847877",
        },
        "runtimeAcceptance": "pending",
        "formalIdentityPass": False,
        "limitations": [
            "Identity 已从冻结 Hero 派生，但三档真实页面、fallback 与性能验收前仍是 provisional。",
            "高度继续沿用 Massing 记录的推断值，不升级为现场测量。",
        ],
        "nextGate": "integrate-and-run-all-tier-runtime-acceptance",
    }
    BUILD_RECORD.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n"
    )
    print(
        json.dumps(
            {
                "status": record["status"],
                "identityGlb": str(OUTPUT_GLB),
                "identityBlend": str(OUTPUT_BLEND),
                "glb": glb,
                "budgetChecks": budget_checks,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
