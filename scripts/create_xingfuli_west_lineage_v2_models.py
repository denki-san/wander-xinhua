"""从已验收父档真实删减幸福里西楼 Identity v2 / Massing v2。

本脚本不会写入既有 Hero、Identity 或 Massing 路径。每次构建先核验父级
GLB、Blend、生成器提交和布局指纹，再从父级 Blend 删除明确的细节对象。
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

# Blender 5.2 的 `--python relative/path.py` 不保证把脚本目录加入模块搜索路径。
sys.path.insert(0, str(Path(__file__).resolve().parent))
import create_xingfuli_models as legacy


ROOT = Path(__file__).resolve().parents[1]
GENERATOR_PATH = Path(__file__).resolve()
LAYOUT_PATH = ROOT / "app/scene/xingfuli-layout.json"
REFERENCE_MANIFEST = "docs/research/xingfuli-west-reference-manifest.json"
SOURCE_BASE = ROOT / "assets/models/source/tiers/xingfuli"
OUTPUT_BASE = ROOT / "public/models/tiers/xingfuli"
PREVIEW_BASE = ROOT / "test_artifacts/all-models"

EXPECTED_PARENT_NAMES = {
    "identity-v2": {
        "glb": "xingfuli-west.glb",
        "blend": "xingfuli-west.blend",
        "parentTier": "hero",
        "expectedObjects": 69,
    },
    "massing-v2": {
        "glb": "xingfuli-west-identity-v2.glb",
        "blend": "xingfuli-west-identity-v2.blend",
        "parentTier": "identity-v2",
        "expectedObjects": 34,
    },
}


def parse_arguments() -> argparse.Namespace:
    script_args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(
        description="从父级资产真实删减幸福里西楼 lineage v2 候选",
    )
    parser.add_argument("--tier", choices=sorted(EXPECTED_PARENT_NAMES), required=True)
    parser.add_argument("--parent-glb", type=Path, required=True)
    parser.add_argument("--parent-blend", type=Path, required=True)
    parser.add_argument("--expected-parent-glb-sha256", required=True)
    parser.add_argument("--expected-parent-blend-sha256", required=True)
    parser.add_argument("--source-commit", required=True)
    return parser.parse_args(script_args)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_sha(label: str, path: Path, expected: str) -> str:
    resolved = path.resolve()
    actual = sha256(resolved)
    if actual != expected:
        raise ValueError(f"{label} SHA 不匹配：{actual} != {expected}")
    return actual


def git_blob_sha256(commit: str, relative_path: str) -> str:
    blob = subprocess.check_output(
        ["git", "show", f"{commit}:{relative_path}"],
        cwd=ROOT,
    )
    return hashlib.sha256(blob).hexdigest()


def validate_inputs(args: argparse.Namespace) -> dict[str, str]:
    contract = EXPECTED_PARENT_NAMES[args.tier]
    if args.parent_glb.name != contract["glb"]:
        raise ValueError(f"{args.tier} 父级 GLB 必须是 {contract['glb']}")
    if args.parent_blend.name != contract["blend"]:
        raise ValueError(f"{args.tier} 父级 Blend 必须是 {contract['blend']}")
    if not re.fullmatch(r"[a-f0-9]{40}", args.source_commit):
        raise ValueError("source commit 必须是完整40位 Git SHA")

    generator_sha = sha256(GENERATOR_PATH)
    committed_generator_sha = git_blob_sha256(
        args.source_commit,
        "scripts/create_xingfuli_west_lineage_v2_models.py",
    )
    if generator_sha != committed_generator_sha:
        raise ValueError("当前生成器与 source commit 不一致，禁止生成不可追溯候选")

    return {
        "parentGlbSha256": validate_sha(
            "父级 GLB",
            args.parent_glb,
            args.expected_parent_glb_sha256,
        ),
        "parentBlendSha256": validate_sha(
            "父级 Blend",
            args.parent_blend,
            args.expected_parent_blend_sha256,
        ),
        "generatorSha256": generator_sha,
        "layoutSha256": sha256(LAYOUT_PATH),
        "sourceCommit": args.source_commit,
    }


def remove_object(obj: bpy.types.Object) -> None:
    mesh = obj.data if obj.type == "MESH" else None
    bpy.data.objects.remove(obj, do_unlink=True)
    if mesh is not None and mesh.users == 0:
        bpy.data.meshes.remove(mesh)


def identity_removal_reason(name: str) -> str | None:
    if "-material-" in name:
        return "remove-hero-material-detail"
    return None


def massing_removal_reason(name: str) -> str | None:
    if "-sill-" in name:
        return "remove-identity-sill"
    if name.startswith("south-west-abstract-panel-"):
        return "remove-identity-abstract-panel-detail"

    match = re.fullmatch(r"(.+)-window-(\d+)-(\d+)", name)
    if match and int(match.group(3)) >= 4:
        return "reduce-identity-window-columns"
    return None


def clean_unused_data() -> None:
    for datablocks in (bpy.data.meshes, bpy.data.materials):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def derive_child(args: argparse.Namespace, lineage: dict[str, str]) -> dict:
    contract = EXPECTED_PARENT_NAMES[args.tier]
    bpy.ops.wm.open_mainfile(filepath=str(args.parent_blend.resolve()))

    original_meshes = sorted(
        obj.name for obj in bpy.context.scene.objects if obj.type == "MESH"
    )
    removed = []
    for obj in list(bpy.context.scene.objects):
        if obj.type != "MESH":
            remove_object(obj)
            continue
        reason = (
            identity_removal_reason(obj.name)
            if args.tier == "identity-v2"
            else massing_removal_reason(obj.name)
        )
        if reason is not None:
            removed.append({"name": obj.name, "reason": reason})
            remove_object(obj)

    clean_unused_data()
    retained = sorted(
        obj.name for obj in bpy.context.scene.objects if obj.type == "MESH"
    )
    if len(retained) != contract["expectedObjects"]:
        raise ValueError(
            f"{args.tier} 删减后对象数 {len(retained)}，"
            f"预期 {contract['expectedObjects']}"
        )
    if set(original_meshes) != set(retained) | {entry["name"] for entry in removed}:
        raise ValueError("父级对象集合未被完整分解为 retained + removed")

    slug = f"xingfuli-west-{args.tier}"
    source_dir = SOURCE_BASE / args.tier
    output_dir = OUTPUT_BASE / args.tier
    preview_dir = PREVIEW_BASE / args.tier / "xingfuli-west" / "headless"
    source_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    preview_dir.mkdir(parents=True, exist_ok=True)

    scene = bpy.context.scene
    scene["asset"] = "xingfuli-west"
    scene["tier"] = args.tier
    scene["derivation"] = "strict-parent-blend-object-reduction"
    scene["parent_tier"] = contract["parentTier"]
    scene["parent_glb_sha256"] = lineage["parentGlbSha256"]
    scene["parent_blend_sha256"] = lineage["parentBlendSha256"]
    scene["generator_sha256"] = lineage["generatorSha256"]
    scene["layout_sha256"] = lineage["layoutSha256"]
    scene["source_commit"] = lineage["sourceCommit"]
    scene["reference_manifest"] = REFERENCE_MANIFEST
    scene["reference_photos_embedded"] = False
    scene["user_original_photos_status"] = "pending-original-files-not-reviewed"

    blend_path = source_dir / f"{slug}.blend"
    glb_path = output_dir / f"{slug}.glb"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    legacy.ASSET_OBJECTS[:] = [
        obj for obj in bpy.context.scene.objects if obj.type == "MESH"
    ]
    legacy.PREVIEW_DIR = preview_dir
    legacy.render_views(slug)
    legacy.merge_for_export(slug, len(retained), args.tier, "west")
    merged = legacy.ASSET_OBJECTS[0]
    merged["asset"] = "xingfuli-west"
    merged["tier"] = args.tier
    merged["derivation"] = "strict-parent-blend-object-reduction"
    merged["parent_tier"] = contract["parentTier"]
    merged["parent_glb_sha256"] = lineage["parentGlbSha256"]
    merged["parent_blend_sha256"] = lineage["parentBlendSha256"]
    merged["generator_sha256"] = lineage["generatorSha256"]
    merged["layout_sha256"] = lineage["layoutSha256"]
    merged["source_commit"] = lineage["sourceCommit"]
    merged["reference_manifest"] = REFERENCE_MANIFEST
    merged["reference_photos_embedded"] = False
    merged["user_original_photos_status"] = "pending-original-files-not-reviewed"
    merged["removed_object_count"] = len(removed)

    bpy.ops.object.select_all(action="DESELECT")
    merged.select_set(True)
    bpy.context.view_layer.objects.active = merged
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_extras=True,
    )

    return {
        "assetId": "xingfuli-west",
        "tier": args.tier,
        "parentTier": contract["parentTier"],
        "parentObjects": len(original_meshes),
        "retainedObjects": len(retained),
        "removedObjects": len(removed),
        "removedByReason": {
            reason: sum(entry["reason"] == reason for entry in removed)
            for reason in sorted({entry["reason"] for entry in removed})
        },
        "blend": {
            "path": str(blend_path.relative_to(ROOT)),
            "sha256": sha256(blend_path),
            "bytes": blend_path.stat().st_size,
        },
        "glb": {
            "path": str(glb_path.relative_to(ROOT)),
            "sha256": sha256(glb_path),
            "bytes": glb_path.stat().st_size,
        },
        "previews": [
            str((preview_dir / f"test_{slug}_{view}_preview.png").relative_to(ROOT))
            for view in ("canonical", "side", "street")
        ],
        "lineage": lineage,
    }


def main() -> None:
    args = parse_arguments()
    lineage = validate_inputs(args)
    result = derive_child(args, lineage)
    print("XINGFULI_WEST_LINEAGE_V2=" + json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"生成失败：{error}", file=sys.stderr)
        raise
