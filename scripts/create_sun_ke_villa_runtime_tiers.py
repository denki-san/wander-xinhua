"""从已验收的孙科别墅 Hero master 派生 Identity 与 Massing 运行时层级。

脚本只读取现有可编辑 Hero `.blend`，不会覆盖 Hero GLB、Hero `.blend` 或其他资产。
三个层级共享原点、2.7 米单位、local -Y 正面与 OSM 碰撞语义。
"""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path
import sys

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
HERO_BLEND = ROOT / "assets" / "models" / "source" / "sun-ke-villa.blend"
HERO_GLB = ROOT / "public" / "models" / "shangsheng" / "sun-ke-villa.glb"
OUTPUT_DIR = ROOT / "public" / "models" / "shangsheng"
PREVIEW_DIR = ROOT / "test_artifacts"

TIER_OUTPUTS = {
    "identity": OUTPUT_DIR / "sun-ke-villa-identity.glb",
    "massing": OUTPUT_DIR / "sun-ke-villa-massing.glb",
}

TIER_PREVIEWS = {
    tier: {
        "canonical": PREVIEW_DIR / f"test_sun_ke_villa_{tier}_canonical_preview.png",
        "side": PREVIEW_DIR / f"test_sun_ke_villa_{tier}_side_preview.png",
        "entrance": PREVIEW_DIR / f"test_sun_ke_villa_{tier}_entrance_preview.png",
    }
    for tier in TIER_OUTPUTS
}

CAMERA_VIEWS = {
    "canonical": ((0.1, -13.8, 3.85), (-0.05, -0.15, 2.08), 55),
    "side": ((10.2, -11.6, 4.55), (0.0, -0.05, 2.05), 56),
    "entrance": ((-7.8, 10.2, 4.65), (-0.85, 0.75, 1.95), 58),
}

MASSING_EXACT_NAMES = {
    "central-residence",
    "central-tiled-roof",
    "front-dormer",
    "front-dormer-roof",
    "lower-west-wing",
    "main-chimney",
    "main-chimney-cap",
    "north-east-low-wing",
    "north-east-low-wing-roof",
    "north-porch-column-0",
    "north-porch-column-1",
    "north-porch-gable-roof",
    "north-porch-gable-wall",
    "north-porch-slab",
    "rounded-east-tower",
    "tower-eave-tile-band",
    "tower-low-curved-roof",
    "west-wing-tiled-roof",
}

IDENTITY_OMIT_FRAGMENTS = (
    "tile-rib",
    "ridge-cap",
    "_sill",
    "_threshold",
    "_jamb-return",
    "garden-entry-step",
    "garden-low-hedge",
    "garden-downpipe",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--tier",
        choices=("identity", "massing", "all"),
        default="all",
        help="要派生的运行时层级，默认同时生成 Identity 与 Massing。",
    )
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    return parser.parse_args(argv)


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def source_meshes() -> list[bpy.types.Object]:
    return sorted(
        (
            obj
            for obj in bpy.data.objects
            if obj.type == "MESH" and not obj.name.startswith("test_")
        ),
        key=lambda obj: obj.name,
    )


def keep_identity(name: str) -> bool:
    if any(fragment in name for fragment in IDENTITY_OMIT_FRAGMENTS):
        return False
    if name.startswith("garden-balcony-baluster-"):
        # 保留稀疏但连续的阳台竖杆节奏，删除交错的细竖杆。
        return int(name.rsplit("-", 1)[1]) % 2 == 0
    return True


def keep_massing(name: str) -> bool:
    if name in MASSING_EXACT_NAMES:
        return True
    # 三联尖券是正立面关键开口；Massing 只保留厚券轮廓与开口深度。
    if name.startswith("garden-pointed-portal-"):
        return name.endswith("_stone-surround") or name.endswith("_deep-recess")
    # 正立面二层连续圆拱只保留轮廓，维持关键开口节奏。
    if name.startswith("garden-upper-round-window-"):
        return name.endswith("_stone-surround") or name.endswith("_glass")
    # 北入口保留门洞、山墙门廊和拱带，维持通道语义与纵深。
    if name.startswith("north-main-door_"):
        return name.endswith("_stone-surround") or name.endswith("_glass")
    if name.startswith("north-porch-round-entry-arch-"):
        return True
    return False


def duplicate_for_tier(
    source_objects: list[bpy.types.Object],
    tier: str,
) -> list[bpy.types.Object]:
    keep = keep_identity if tier == "identity" else keep_massing
    duplicates: list[bpy.types.Object] = []
    for source in source_objects:
        if not keep(source.name):
            continue
        duplicate = source.copy()
        duplicate.data = source.data.copy()
        duplicate.name = f"{tier}_{source.name}"
        duplicate.hide_render = False
        duplicate.hide_set(False)
        bpy.context.scene.collection.objects.link(duplicate)
        duplicates.append(duplicate)
    if not duplicates:
        raise RuntimeError(f"{tier} 没有可导出的几何对象")
    return duplicates


def join_tier_objects(
    objects: list[bpy.types.Object],
    tier: str,
    hero_sha256: str,
) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    active = objects[0]
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.join()
    active.name = f"SunKeVilla_{tier.title()}"
    active.data.name = f"SunKeVilla_{tier.title()}_Mesh"
    active["asset_id"] = "sun-ke-villa"
    active["runtime_tier"] = tier
    active["derived_from"] = "sun-ke-villa-hero"
    active["derived_from_sha256"] = hero_sha256
    active["osm_way_id"] = 864847877
    active["meters_per_scene_unit"] = 2.7
    active["canonical_front"] = "local -Y"
    active["ground_datum"] = 0.0
    active["reference_manifest"] = "docs/research/sun-ke-villa-reference-manifest.json"
    active["reference_images_embedded"] = False
    return active


def export_glb(asset: bpy.types.Object, path: Path) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    asset.select_set(True)
    bpy.context.view_layer.objects.active = asset
    bpy.ops.export_scene.gltf(
        filepath=str(path),
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


def point_camera(
    camera: bpy.types.Object,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
) -> None:
    camera.location = location
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def render_previews(tier: str, asset: bpy.types.Object) -> None:
    camera = bpy.data.objects.get("test_preview_camera")
    if camera is None or camera.type != "CAMERA":
        raise RuntimeError("Hero master 缺少固定机位 test_preview_camera")
    bpy.context.scene.camera = camera
    asset.hide_render = False
    for view, (location, target, lens) in CAMERA_VIEWS.items():
        point_camera(camera, location, target)
        camera.data.lens = lens
        bpy.context.scene.render.filepath = str(TIER_PREVIEWS[tier][view])
        bpy.ops.render.render(write_still=True)


def delete_object(obj: bpy.types.Object) -> None:
    bpy.data.objects.remove(obj, do_unlink=True)


def build_tier(
    tier: str,
    source_objects: list[bpy.types.Object],
    hero_sha256: str,
) -> None:
    for source in source_objects:
        source.hide_render = True
        source.hide_set(True)
    duplicates = duplicate_for_tier(source_objects, tier)
    asset = join_tier_objects(duplicates, tier, hero_sha256)
    export_glb(asset, TIER_OUTPUTS[tier])
    render_previews(tier, asset)
    print(f"{tier.title()} GLB: {TIER_OUTPUTS[tier]}")
    for view, path in TIER_PREVIEWS[tier].items():
        print(f"{tier.title()} {view}: {path}")
    delete_object(asset)


def main() -> None:
    args = parse_args()
    if not HERO_BLEND.is_file() or not HERO_GLB.is_file():
        raise FileNotFoundError("孙科别墅 Hero master 或 Hero GLB 不存在")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    hero_sha256 = file_sha256(HERO_GLB)
    bpy.ops.wm.open_mainfile(filepath=str(HERO_BLEND))
    source_objects = source_meshes()
    print(f"Retained Hero SHA-256: {hero_sha256}")
    print(f"Hero source mesh objects: {len(source_objects)}")
    tiers = ("identity", "massing") if args.tier == "all" else (args.tier,)
    for tier in tiers:
        build_tier(tier, source_objects, hero_sha256)


if __name__ == "__main__":
    main()
