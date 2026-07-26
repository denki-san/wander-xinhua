"""从已验收 Hero Blend 真实删减幸福里东楼的隔离谱系候选。

本脚本不写入既有 Hero/Identity/Massing 路径；它先校验只读父档 SHA，
再仅删除对象，形成 Hero -> Identity v2 -> Massing v2 可审计链路。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import create_xingfuli_models as legacy


ROOT = Path(__file__).resolve().parents[1]
GENERATOR_PATH = Path(__file__).resolve()
LAYOUT_PATH = ROOT / "app/scene/xingfuli-layout.json"
REFERENCE_MANIFEST = "docs/research/xingfuli-reference-manifest.json"
SOURCE_BASE = ROOT / "assets/models/source/tiers/xingfuli"
OUTPUT_BASE = ROOT / "public/models/tiers/xingfuli"
PREVIEW_BASE = ROOT / "test_artifacts/all-models"

CONTRACT = {
    "identity-v2": {
        "parent_glb": "xingfuli-east.glb",
        "parent_blend": "xingfuli-east.blend",
        "parent_tier": "hero",
        "expected_objects": 142,
    },
    "massing-v2": {
        "parent_glb": "xingfuli-east-identity-v2.glb",
        "parent_blend": "xingfuli-east-identity-v2.blend",
        "parent_tier": "identity-v2",
        "expected_objects": 90,
    },
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description="生成幸福里东楼 lineage v2 候选")
    parser.add_argument("--tier", choices=sorted(CONTRACT), required=True)
    parser.add_argument("--parent-glb", type=Path, required=True)
    parser.add_argument("--parent-blend", type=Path, required=True)
    parser.add_argument("--expected-parent-glb-sha256", required=True)
    parser.add_argument("--expected-parent-blend-sha256", required=True)
    parser.add_argument("--source-commit", required=True)
    return parser.parse_args(values)


def validate(item: argparse.Namespace) -> dict[str, str]:
    rule = CONTRACT[item.tier]
    if item.parent_glb.name != rule["parent_glb"]:
        raise ValueError("父级 GLB 文件名不符合严格谱系合同")
    if item.parent_blend.name != rule["parent_blend"]:
        raise ValueError("父级 Blend 文件名不符合严格谱系合同")
    if not re.fullmatch(r"[a-f0-9]{40}", item.source_commit):
        raise ValueError("source commit 必须是完整 40 位 SHA")
    committed = subprocess.check_output(
        ["git", "show", f"{item.source_commit}:scripts/{GENERATOR_PATH.name}"], cwd=ROOT
    )
    if hashlib.sha256(committed).hexdigest() != sha256(GENERATOR_PATH):
        raise ValueError("当前生成器与 source commit 不一致")
    actual_glb = sha256(item.parent_glb.resolve())
    actual_blend = sha256(item.parent_blend.resolve())
    if actual_glb != item.expected_parent_glb_sha256:
        raise ValueError("父级 GLB SHA 不匹配")
    if actual_blend != item.expected_parent_blend_sha256:
        raise ValueError("父级 Blend SHA 不匹配")
    return {
        "parentGlbSha256": actual_glb,
        "parentBlendSha256": actual_blend,
        "generatorSha256": sha256(GENERATOR_PATH),
        "layoutSha256": sha256(LAYOUT_PATH),
        "sourceCommit": item.source_commit,
    }


def remove(obj: bpy.types.Object) -> None:
    mesh = obj.data if obj.type == "MESH" else None
    bpy.data.objects.remove(obj, do_unlink=True)
    if mesh is not None and mesh.users == 0:
        bpy.data.meshes.remove(mesh)


def identity_reason(name: str) -> str | None:
    # lane base 与入口矩阵墙决定 Hero 的外包络、地面接触和入口边界；
    # v2 只删减细节，不能让 tier 切换时缩短可见场地边界。
    if "-material-" in name or "-glass-spandrel-" in name:
        return "remove-hero-material-detail"
    return None


def massing_reason(name: str) -> str | None:
    if "-sill-" in name:
        return "remove-identity-sill"
    match = re.fullmatch(r"(.+)-window-(\d+)-(\d+)", name)
    if match:
        building_id, _floor, column = match.groups()
        layout = json.loads(LAYOUT_PATH.read_text(encoding="utf-8"))
        building = next(row for row in layout["buildings"] if row["id"] == building_id)
        if int(column) >= max(3, int(building["width"] / 4.1)):
            return "reduce-identity-window-columns"
    return None


def clean_data() -> None:
    for blocks in (bpy.data.meshes, bpy.data.materials):
        for block in list(blocks):
            if block.users == 0:
                blocks.remove(block)


def render_street(slug: str, directory: Path) -> None:
    camera = bpy.context.scene.camera
    camera.location = (41.5, -31.0, 2.6)
    target = (31.0, -7.0, 4.5)
    camera.data.lens = 50
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.render.filepath = str(directory / f"test_{slug}_street_preview.png")
    bpy.ops.render.render(write_still=True)


def derive(item: argparse.Namespace, lineage: dict[str, str]) -> dict:
    rule = CONTRACT[item.tier]
    bpy.ops.wm.open_mainfile(filepath=str(item.parent_blend.resolve()))
    original = sorted(obj.name for obj in bpy.context.scene.objects if obj.type == "MESH")
    removed: list[dict[str, str]] = []
    for obj in list(bpy.context.scene.objects):
        if obj.type != "MESH":
            remove(obj)
            continue
        reason = identity_reason(obj.name) if item.tier == "identity-v2" else massing_reason(obj.name)
        if reason:
            removed.append({"name": obj.name, "reason": reason})
            remove(obj)
    clean_data()
    retained = sorted(obj.name for obj in bpy.context.scene.objects if obj.type == "MESH")
    if len(retained) != rule["expected_objects"]:
        raise ValueError(f"删减对象数 {len(retained)} 不等于合同 {rule['expected_objects']}")
    if set(original) != set(retained) | {entry["name"] for entry in removed}:
        raise ValueError("父级对象集合没有被完整分解")

    slug = f"xingfuli-east-{item.tier}"
    source_dir = SOURCE_BASE / item.tier
    output_dir = OUTPUT_BASE / item.tier
    preview_dir = PREVIEW_BASE / item.tier / "xingfuli-east" / "headless"
    source_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    preview_dir.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    for key, value in {
        "asset": "xingfuli-east", "tier": item.tier,
        "derivation": "strict-parent-blend-object-reduction", "parent_tier": rule["parent_tier"],
        "parent_glb_sha256": lineage["parentGlbSha256"], "parent_blend_sha256": lineage["parentBlendSha256"],
        "generator_sha256": lineage["generatorSha256"], "layout_sha256": lineage["layoutSha256"],
        "source_commit": lineage["sourceCommit"], "reference_manifest": REFERENCE_MANIFEST,
        "reference_photos_embedded": False,
    }.items():
        scene[key] = value
    blend_path = source_dir / f"{slug}.blend"
    glb_path = output_dir / f"{slug}.glb"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    legacy.ASSET_OBJECTS[:] = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    legacy.PREVIEW_DIR = preview_dir
    legacy.render_views(slug)
    render_street(slug, preview_dir)
    legacy.merge_for_export(slug, len(retained), item.tier, "east")
    merged = legacy.ASSET_OBJECTS[0]
    for key, value in scene.items():
        if key.startswith(("asset", "tier", "derivation", "parent_", "generator_", "layout_", "source_", "reference_")):
            merged[key] = value
    bpy.ops.object.select_all(action="DESELECT")
    merged.select_set(True)
    bpy.context.view_layer.objects.active = merged
    bpy.ops.export_scene.gltf(filepath=str(glb_path), export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_materials="EXPORT", export_extras=True)
    return {
        "assetId": "xingfuli-east", "tier": item.tier, "parentTier": rule["parent_tier"],
        "parentObjects": len(original), "retainedObjects": len(retained), "removedObjects": len(removed),
        "removedByReason": {reason: sum(row["reason"] == reason for row in removed) for reason in sorted({row["reason"] for row in removed})},
        "blend": {"path": str(blend_path.relative_to(ROOT)), "sha256": sha256(blend_path), "bytes": blend_path.stat().st_size},
        "glb": {"path": str(glb_path.relative_to(ROOT)), "sha256": sha256(glb_path), "bytes": glb_path.stat().st_size},
        "previews": [str((preview_dir / f"test_{slug}_{view}_preview.png").relative_to(ROOT)) for view in ("canonical", "side", "street")],
        "lineage": lineage,
    }


def main() -> None:
    item = args()
    print("XINGFULI_EAST_LINEAGE_V2=" + json.dumps(derive(item, validate(item)), ensure_ascii=False))


if __name__ == "__main__":
    main()
