"""从最终冻结 Hero 派生上海电影艺术中心 Massing v2 候选。"""

from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys
from typing import Any

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import create_film_art_center_massing_model as legacy


ROOT = Path(__file__).resolve().parents[1]
HERO_GENERATOR = ROOT / "scripts/create_xinhua_road_models.py"
HERO_BLEND = ROOT / "assets/models/source/xinhua-road/film-art-center.blend"
HERO_GLB = ROOT / "public/models/xinhua-road/film-art-center.glb"
LEGACY_MASSING_GLB = (
    ROOT / "public/models/tiers/xinhua-road/massing/film-art-center-massing.glb"
)
OUTPUT_BLEND = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/massing-v2/"
    / "film-art-center-massing.blend"
)
OUTPUT_GLB = (
    ROOT
    / "public/models/tiers/xinhua-road/massing-v2/"
    / "film-art-center-massing.glb"
)
BUILD_RECORD = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/massing-v2/"
    / "film-art-center-massing.json"
)
PREVIEW_DIR = ROOT / "test_artifacts/film-art-center-massing-v2"
HERO_GENERATOR_SHA256 = (
    "324be84a32ed3d43ff0bc1ceaca040e8e46f68aff21151b1bafa4ae524f6f3c6"
)
HERO_BLEND_SHA256 = (
    "f58952f3bf4c086fb09afdbda4efdc264a124a74a12e6f63e7a9c70f3d3359b8"
)
HERO_GLB_SHA256 = (
    "33daaaf003b47b705e03c95d2fe2ac0973b815079753f868c95c3b0f2f9b8e1b"
)
LEGACY_MASSING_GLB_SHA256 = (
    "c89791dc3978b317cc2f8807a77f7a84b5c596f8d4cd01c1cffd05090e9584a6"
)
MASSING_CACHE_VERSION = "20260726-film-art-massing-v2-current-hero-1"
AUTHORED_METERS_PER_SCENE_UNIT = 2.7

# Massing 的所有建筑参数都来自当前冻结 Hero 的同名构件。
FROZEN_HERO_PARAMETERS = {
    "groundCore": {
        "center": [0, 0.55, 1.9],
        "dimensions": [15.8, 9.3, 3.8],
    },
    "secondCore": {
        "center": [0, 0.55, 5.45],
        "dimensions": [15.8, 9.3, 3.3],
    },
    "thirdCore": {
        "center": [0, 0.55, 9.05],
        "dimensions": [15.4, 9.0, 3.45],
    },
    "groundVeranda": {
        "center": [0, -5.25, 0.18],
        "dimensions": [17.2, 2.65, 0.36],
    },
    "secondVeranda": {
        "center": [0, -5.18, 3.82],
        "dimensions": [17.25, 2.85, 0.28],
    },
    "galleryRoof": {
        "center": [0, -5.02, 7.08],
        "width": 17.25,
        "depth": 2.85,
        "height": 0.88,
        "overhang": 0.52,
        "upturn": 0.34,
        "segments": 18,
    },
    "mainRoof": {
        "center": [0, 0.48, 10.78],
        "width": 17.55,
        "depth": 10.65,
        "height": 2.92,
        "overhang": 0.92,
        "upturn": 0.72,
        "segments": 22,
    },
    "glassWings": {
        "centerX": [-9.78, 9.78],
        "centerY": -0.5,
        "centerZ": 1.28,
        "dimensions": [3.35, 8.25, 2.55],
    },
}


def sha256(path: Path) -> str:
    return legacy.sha256(path)


def validate_current_hero_lineage() -> None:
    current = {
        "generator": sha256(HERO_GENERATOR),
        "blend": sha256(HERO_BLEND),
        "glb": sha256(HERO_GLB),
    }
    expected = {
        "generator": HERO_GENERATOR_SHA256,
        "blend": HERO_BLEND_SHA256,
        "glb": HERO_GLB_SHA256,
    }
    if current != expected:
        raise RuntimeError(
            f"最终 Hero lineage 已变化，禁止继续派生：current={current}, "
            f"expected={expected}"
        )
    if sha256(LEGACY_MASSING_GLB) != LEGACY_MASSING_GLB_SHA256:
        raise RuntimeError("历史 Massing 已变化，禁止覆盖或基于漂移资产比较")


def validate_frozen_parameters() -> None:
    """防止复用旧造型时只更新 SHA 文本而没有冻结真实 Hero 参数。"""
    source = HERO_GENERATOR.read_text(encoding="utf8")
    required_fragments = [
        'add_box("art-center-ground-core", (0, 0.55, 1.9), '
        "(15.8, 9.3, 3.8)",
        'add_box("art-center-second-core", (0, 0.55, 5.45), '
        "(15.8, 9.3, 3.3)",
        'add_box("art-center-third-core", (0, 0.55, 9.05), '
        "(15.4, 9.0, 3.45)",
        'add_upturned_hip_roof("art-center-gallery-roof", '
        "(0, -5.02, 7.08), 17.25, 2.85, 0.88",
        'add_upturned_hip_roof("art-center-main-roof", '
        "(0, 0.48, 10.78), 17.55, 10.65, 2.92",
        'add_box(f"art-center-glass-wing-{side}", '
        "(x, -0.5, 1.28), (3.35, 8.25, 2.55)",
    ]
    missing = [fragment for fragment in required_fragments if fragment not in source]
    if missing:
        raise RuntimeError(f"最终 Hero 冻结参数已变化：{missing}")


def configure_scene() -> None:
    legacy.configure_scene()
    scene = bpy.context.scene
    scene["tier"] = "massing-v2"
    scene["derived_from_hero_glb_sha256"] = HERO_GLB_SHA256
    scene["derived_from_hero_blend_sha256"] = HERO_BLEND_SHA256
    scene["derived_from_hero_generator_sha256"] = HERO_GENERATOR_SHA256
    scene["lineage_method"] = "current-final-hero-frozen-parameter-simplification"


def render_previews(camera: bpy.types.Object) -> dict[str, dict[str, Any]]:
    views = {
        "canonical": ((3.0, -43.0, 8.0), (0.0, -0.5, 6.3), 54),
        "side": ((34.0, -28.0, 9.0), (1.0, 0.0, 6.1), 52),
        "entrance": ((10.0, -48.0, 4.8), (0.0, -0.8, 5.7), 56),
    }
    outputs: dict[str, dict[str, Any]] = {}
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    for view, (location, target, lens) in views.items():
        camera.location = location
        camera.data.lens = lens
        camera.rotation_euler = (
            Vector(target) - camera.location
        ).to_track_quat("-Z", "Y").to_euler()
        path = PREVIEW_DIR / f"test_film-art-center-massing-v2_{view}.png"
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


def dimensions(bounds: dict[str, list[float]]) -> list[float]:
    return [
        round(bounds["max"][axis] - bounds["min"][axis], 6)
        for axis in range(3)
    ]


def vector_delta(current: list[float], comparison: list[float]) -> list[float]:
    return [
        round(current[axis] - comparison[axis], 6)
        for axis in range(3)
    ]


def run_external_audit() -> dict[str, Any]:
    command = [
        "python3",
        "scripts/audit_glb.py",
        str(OUTPUT_GLB.relative_to(ROOT)),
        "--forbid-images",
        "--max-nodes",
        "2",
    ]
    result = subprocess.run(
        command,
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"外部 GLB 审计失败：stdout={result.stdout}, stderr={result.stderr}"
        )
    return {
        "command": " ".join(command),
        "status": "pass",
        "stdout": result.stdout.strip(),
    }


def write_build_record(
    audit: dict[str, Any],
    previews: dict[str, dict[str, Any]],
    previous_glb_sha256: str | None,
    external_audit: dict[str, Any],
) -> None:
    legacy_audit = legacy.parse_glb(LEGACY_MASSING_GLB)
    hero_audit = legacy.parse_glb(HERO_GLB)
    current_dimensions = dimensions(audit["bounds"])
    legacy_dimensions = dimensions(legacy_audit["bounds"])
    hero_dimensions = dimensions(hero_audit["bounds"])
    deterministic = previous_glb_sha256 == audit["sha256"]
    record = {
        "version": 2,
        "auditedAt": "2026-07-26",
        "assetId": "building:xinhua-road:film-art-center",
        "tier": "massing-v2",
        "status": "headless-lineage-candidate-mcp1-pending",
        "generator": {
            "path": "scripts/create_film_art_center_massing_v2_model.py",
            "sha256": sha256(Path(__file__)),
            "command": (
                "/Applications/Blender.app/Contents/MacOS/Blender --background "
                "--factory-startup --python-exit-code 1 "
                "--python scripts/create_film_art_center_massing_v2_model.py"
            ),
            "blenderVersion": "5.2.0 LTS",
        },
        "lineage": {
            "method": "current-final-hero-frozen-parameter-simplification",
            "heroGenerator": str(HERO_GENERATOR.relative_to(ROOT)),
            "heroGeneratorSha256": HERO_GENERATOR_SHA256,
            "heroBlend": str(HERO_BLEND.relative_to(ROOT)),
            "heroBlendSha256": HERO_BLEND_SHA256,
            "heroGlb": str(HERO_GLB.relative_to(ROOT)),
            "heroGlbSha256": HERO_GLB_SHA256,
            "heroGlbSha256AtDerivation": HERO_GLB_SHA256,
            "frozenParameters": FROZEN_HERO_PARAMETERS,
            "legacyMassing": {
                "path": str(LEGACY_MASSING_GLB.relative_to(ROOT)),
                "sha256": LEGACY_MASSING_GLB_SHA256,
                "decision": "preserved-history-do-not-overwrite",
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
                "roof ribs, finials and ridge ornaments",
                "window mullions and balustrade rhythm",
                "sign, lions, lights and fine entrance details",
                "lawn, shrubs and paving details",
            ],
        },
        "envelopeComparison": {
            "coordinateOrder": ["x", "y-up", "z-depth"],
            "currentMassingV2": {
                "bounds": audit["bounds"],
                "dimensions": current_dimensions,
            },
            "legacyMassing": {
                "bounds": legacy_audit["bounds"],
                "dimensions": legacy_dimensions,
                "dimensionDeltaCurrentMinusLegacy": vector_delta(
                    current_dimensions,
                    legacy_dimensions,
                ),
                "interpretation": (
                    "当前 Hero topology 修复未改变冻结建筑参数；"
                    "v2 与历史 Massing 的建筑包络应保持一致。"
                ),
            },
            "currentHeroFullExport": {
                "bounds": hero_audit["bounds"],
                "dimensions": hero_dimensions,
                "dimensionDeltaCurrentMassingMinusHero": vector_delta(
                    current_dimensions,
                    hero_dimensions,
                ),
                "comparisonBoundary": (
                    "Hero 完整导出包含草坪、路径、屋脊端饰等场地或细节；"
                    "Massing v2 只保留证据支持的建筑轮廓。"
                ),
            },
        },
        "holdBoundary": {
            "legacyMassing": "preserved",
            "trees": "untouched",
            "decor": "untouched",
            "ordinaryOsm": "not-imported",
            "globalMassing": "untouched",
            "otherBuildings": "untouched",
        },
        "outputs": {
            "blend": str(OUTPUT_BLEND.relative_to(ROOT)),
            "blendSha256": sha256(OUTPUT_BLEND),
            "blendBytes": OUTPUT_BLEND.stat().st_size,
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
            "glbAudit": "pass",
            "externalAudit": external_audit,
            "deterministicGlb": {
                "status": "pass" if deterministic else "pending-second-run",
                "previousSha256": previous_glb_sha256,
                "currentSha256": audit["sha256"],
                "byteIdentical": deterministic,
            },
            "mcp1": "pending-main-window-batch-review",
            "mapAcceptance": "not-reviewed-in-this-branch",
            "identityAllowed": False,
        },
    }
    BUILD_RECORD.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )


def main() -> None:
    validate_current_hero_lineage()
    validate_frozen_parameters()
    for directory in (
        OUTPUT_BLEND.parent,
        OUTPUT_GLB.parent,
        BUILD_RECORD.parent,
        PREVIEW_DIR,
    ):
        directory.mkdir(parents=True, exist_ok=True)
    previous_glb_sha256 = sha256(OUTPUT_GLB) if OUTPUT_GLB.exists() else None

    legacy.road.clear_scene()
    configure_scene()
    legacy.build_massing()
    source_object_count = len(legacy.road.ASSET_OBJECTS)
    legacy.road.merge_asset_objects("film-art-center-massing-v2")
    asset = legacy.road.ASSET_OBJECTS[0]
    asset["asset_id"] = "building:xinhua-road:film-art-center"
    asset["tier"] = "massing-v2"
    asset["derived_from_hero_glb_sha256"] = HERO_GLB_SHA256
    asset["derived_from_hero_blend_sha256"] = HERO_BLEND_SHA256
    asset["derived_from_hero_generator_sha256"] = HERO_GENERATOR_SHA256
    asset["lineage_method"] = "current-final-hero-frozen-parameter-simplification"
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

    audit = legacy.parse_glb(OUTPUT_GLB)
    if audit["transformedNodes"]:
        raise RuntimeError(f"GLB 节点存在未烘焙变换：{audit['transformedNodes']}")
    if audit["images"] or audit["textures"]:
        raise RuntimeError("Massing v2 不允许图片或贴图")
    if (
        audit["nodes"] > 2
        or audit["triangles"] > 4000
        or audit["materials"] > 6
        or audit["bytes"] > 300000
    ):
        raise RuntimeError(f"Massing v2 超出预算：{audit}")

    _, _, camera, _, _ = legacy.add_review_rig(legacy.road.ASSET_OBJECTS)
    previews = render_previews(camera)
    external_audit = run_external_audit()
    write_build_record(
        audit,
        previews,
        previous_glb_sha256,
        external_audit,
    )
    print(
        "上海电影艺术中心 Massing v2 生成完成："
        f"{source_object_count} source objects, {audit['triangles']} triangles, "
        f"{audit['bytes']} bytes, sha256={audit['sha256']}"
    )


if __name__ == "__main__":
    main()
