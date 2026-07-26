"""从已通过 MCP2 的邬达克纪念馆 Hero v2 派生 Identity v1。"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import math
from pathlib import Path
import struct
import sys
from types import ModuleType
from typing import Any

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
AUDITED_AT = "2026-07-26"
HERO_GENERATOR_PATH = ROOT / "scripts/create_hudec_memorial_v2.py"
HERO_BLEND_PATH = (
    ROOT / "assets/models/source/requested-pois/hudec-memorial-v2-hero.blend"
)
HERO_GLB_PATH = (
    ROOT / "public/models/requested-pois/hudec-memorial-v2-hero.glb"
)
HERO_RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/hero/"
    / "hudec-memorial-v2-hero.json"
)
MCP2_RECORD_PATH = ROOT / "docs/research/hudec-memorial-blender-mcp-gates-v2.json"
BRIEF_PATH = ROOT / "docs/research/hudec-memorial-v2-model-brief.md"
MANIFEST_PATH = ROOT / "docs/research/hudec-memorial-v2-reference-manifest.json"

HERO_GENERATOR_SHA256 = (
    "aa09dabb3017a521025e6c2a46b8fe4e1acc31713fab21973049fe69de56c82c"
)
HERO_BLEND_SHA256 = (
    "4fe426b4a670ad3f2bd50f020195b366599a100b11cfc0f83bfdc6fb8b50b28d"
)
HERO_GLB_SHA256 = (
    "598b2ba19e2412d7a592836d45066c787a7cf1eac347a6a6c5d790c12ffabff5"
)
HERO_RECORD_SHA256 = (
    "da07f28999f87de3ee5e2be50769bdfa4503af6edf932eec02738b9d3b9e07ef"
)
MCP2_RECORD_SHA256 = (
    "45d97bf5800e82cf55afa2947b97e20ececb9667fcda59c6ea4b56442c1598a3"
)
BRIEF_SHA256 = (
    "ef0fc4ae1023180adee808c7a3e0ae86a2804c70443be5b30e933df2dcda1da7"
)
MANIFEST_SHA256 = (
    "8ac58e9721863c0c9d8407c5eda21809f9b37d03fc3b69a65b194521d8caa675"
)

BLEND_PATH = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/identity-v1/"
    / "hudec-memorial-identity.blend"
)
GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/identity-v1/"
    / "hudec-memorial-identity.glb"
)
PREVIEW_DIR = ROOT / "test_artifacts/all-models/identity-v1/hudec-memorial"
RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/identity-v1/"
    / "hudec-memorial-identity.json"
)

AUTHORED_UNIT_METERS = 2.7
AUTHORED_SCALE = 0.72
RUNTIME_POSITION = [92.535374, -132.52181]
RUNTIME_YAW = 0.153486288
RUNTIME_SCALE = 0.88
FRONT_DIRECTION = "-Y"
GROUND_DATUM = 0.0
FIXED_CAMERAS = {
    "canonical": {
        "location": [-15.5, 23.0, 12.0],
        "target": [-0.1, 1.0, 4.45],
        "lensMm": 56,
    },
    "side": {
        "location": [21.0, 17.0, 10.8],
        "target": [-0.8, 1.2, 4.35],
        "lensMm": 54,
    },
    "entrance": {
        "location": [8.2, -17.0, 6.2],
        "target": [1.3, -1.35, 2.55],
        "lensMm": 58,
    },
}
IDENTITY_BUDGET = {
    "maxNodes": 2,
    "maxMeshes": 2,
    "maxTriangles": 12000,
    "maxMaterials": 9,
    "maxImages": 0,
    "maxTextures": 0,
    "maxBytes": 700000,
}
HERO_BASELINE = {
    "bytes": 1565920,
    "triangles": 22760,
    "materials": 11,
}


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def file_evidence(path: Path) -> dict[str, Any]:
    return {
        "path": str(path.relative_to(ROOT)),
        "sha256": file_sha256(path),
        "bytes": path.stat().st_size,
    }


def load_hero_module() -> ModuleType:
    sys.path.insert(0, str(HERO_GENERATOR_PATH.parent))
    spec = importlib.util.spec_from_file_location(
        "hudec_memorial_frozen_hero_v2",
        HERO_GENERATOR_PATH,
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("无法加载冻结的邬达克纪念馆 Hero v2 generator")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


HERO = load_hero_module()
BASE = HERO.base


def preflight() -> tuple[dict[str, Any], dict[str, Any]]:
    expected = {
        HERO_GENERATOR_PATH: HERO_GENERATOR_SHA256,
        HERO_BLEND_PATH: HERO_BLEND_SHA256,
        HERO_GLB_PATH: HERO_GLB_SHA256,
        HERO_RECORD_PATH: HERO_RECORD_SHA256,
        MCP2_RECORD_PATH: MCP2_RECORD_SHA256,
        BRIEF_PATH: BRIEF_SHA256,
        MANIFEST_PATH: MANIFEST_SHA256,
    }
    for path, expected_sha256 in expected.items():
        if not path.exists() or file_sha256(path) != expected_sha256:
            raise RuntimeError(f"Identity preflight SHA 不匹配：{path}")

    hero_record = json.loads(HERO_RECORD_PATH.read_text(encoding="utf8"))
    mcp2_record = json.loads(MCP2_RECORD_PATH.read_text(encoding="utf8"))
    if hero_record.get("status") != "mcp2-pass-identity-authorized":
        raise RuntimeError("Hero build record 尚未授权 Identity 派生")
    if mcp2_record.get("mcp2", {}).get("status") != "pass":
        raise RuntimeError("Hero 尚未通过 MCP2")
    if (
        mcp2_record.get("identityAuthorization", {}).get("frozenHeroSha256")
        != HERO_GLB_SHA256
        or not mcp2_record.get("identityAuthorization", {}).get("authorized")
    ):
        raise RuntimeError("MCP2 record 的冻结 Hero 或 Identity 授权不一致")
    contract = hero_record["lineage"]["sharedContract"]
    if (
        contract.get("origin") != [0, 0, 0]
        or contract.get("frontDirection") != FRONT_DIRECTION
        or contract.get("groundDatum") != GROUND_DATUM
        or contract.get("authoredScale") != AUTHORED_SCALE
        or contract.get("runtimePlacement", {}).get("position")
        != RUNTIME_POSITION
        or contract.get("runtimePlacement", {}).get("yaw") != RUNTIME_YAW
        or contract.get("runtimePlacement", {}).get("scale") != RUNTIME_SCALE
    ):
        raise RuntimeError("Hero origin / front / map contract 已漂移")
    return hero_record, mcp2_record


def identity_materials() -> dict[str, bpy.types.Material]:
    return {
        "plaster": BASE.material("HudecIdentity_WarmPlaster", "#d8d0bd"),
        "timber": BASE.material("HudecIdentity_DarkTimber", "#292522"),
        "roof": BASE.material("HudecIdentity_MutedRoofTile", "#65463d"),
        "brick": BASE.material("HudecIdentity_RedBrick", "#82483c"),
        "glass": BASE.material(
            "HudecIdentity_DeepGlass",
            "#435a59",
            roughness=0.36,
        ),
        "frame": BASE.material("HudecIdentity_WindowFrame", "#30302d"),
        "wood": BASE.material("HudecIdentity_EntranceWood", "#704f3e"),
        "stone": BASE.material("HudecIdentity_EntranceStone", "#a79e8c"),
    }


def add_identity_window(
    name: str,
    *,
    x: float,
    y: float,
    z: float,
    width: float,
    height: float,
    axis: str,
    mat: dict[str, bpy.types.Material],
) -> None:
    """用大窗面与十字分格替代 Hero 的密集窗框和五金。"""
    if axis == "Y":
        BASE.add_box(
            f"{name}-frame",
            (x, y, z),
            (width + 0.16, 0.12, height + 0.16),
            mat["frame"],
            bevel=0.022,
        )
        BASE.add_box(
            f"{name}-glass",
            (x, y - 0.075, z),
            (width, 0.045, height),
            mat["glass"],
            bevel=0.012,
        )
        BASE.add_box(
            f"{name}-vertical",
            (x, y - 0.105, z),
            (0.055, 0.045, height),
            mat["frame"],
        )
        BASE.add_box(
            f"{name}-horizontal",
            (x, y - 0.105, z),
            (width, 0.045, 0.055),
            mat["frame"],
        )
        return
    BASE.add_box(
        f"{name}-frame",
        (x, y, z),
        (0.12, width + 0.16, height + 0.16),
        mat["frame"],
        bevel=0.022,
    )
    BASE.add_box(
        f"{name}-glass",
        (x + 0.075, y, z),
        (0.045, width, height),
        mat["glass"],
        bevel=0.012,
    )
    BASE.add_box(
        f"{name}-vertical",
        (x + 0.105, y, z),
        (0.045, 0.055, height),
        mat["frame"],
    )
    BASE.add_box(
        f"{name}-horizontal",
        (x + 0.105, y, z),
        (0.045, width, 0.055),
        mat["frame"],
    )


def add_identity_front_timber(mat: bpy.types.Material) -> None:
    """保留宽幅半木构的大开间节奏，减少重复斜撑。"""
    face_y = -2.89
    verticals = (-5.55, -3.65, -1.75, 0.15, 2.05, 3.95, 5.5)
    for index, x in enumerate(verticals):
        BASE.add_beam(
            f"hudec-identity-front-timber-vertical-{index}",
            (x, face_y, 0.32),
            (x, face_y, 5.55),
            0.13,
            mat,
        )
    for index, z in enumerate((0.42, 2.95, 5.42)):
        BASE.add_beam(
            f"hudec-identity-front-timber-horizontal-{index}",
            (verticals[0], face_y, z),
            (verticals[-1], face_y, z),
            0.14,
            mat,
        )
    for index in (0, 2, 4):
        left = verticals[index]
        right = verticals[index + 1]
        BASE.add_beam(
            f"hudec-identity-front-timber-lower-diagonal-{index}",
            (left, face_y, 0.5),
            (right, face_y, 2.85),
            0.115,
            mat,
        )
        BASE.add_beam(
            f"hudec-identity-front-timber-upper-diagonal-{index}",
            (left, face_y, 5.3),
            (right, face_y, 3.08),
            0.105,
            mat,
        )


def build_identity() -> None:
    mat = identity_materials()
    HERO.build_massing(
        materials=mat,
        include_site_contract=False,
        apply_authored_scale=False,
    )
    add_identity_front_timber(mat["timber"])

    for floor, z in enumerate((1.55, 4.12)):
        for column, x in enumerate((-4.7, -2.75, -0.8, 1.0, 4.75)):
            if floor == 0 and x > 0.5:
                continue
            add_identity_window(
                f"hudec-identity-front-window-{floor}-{column}",
                x=x,
                y=-2.96,
                z=z,
                width=0.92 if floor == 0 else 0.84,
                height=1.48 if floor == 0 else 1.25,
                axis="Y",
                mat=mat,
            )
    for floor, z in enumerate((1.55, 3.95)):
        for column, y in enumerate((-0.65, 1.15, 2.95)):
            add_identity_window(
                f"hudec-identity-end-window-{floor}-{column}",
                x=6.63,
                y=y,
                z=z,
                width=0.78,
                height=1.34,
                axis="X",
                mat=mat,
            )
    for name, x, y, z, width, height in (
        ("main", 2.0, -1.68, 7.1, 1.05, 0.9),
        ("rear", 0.65, 2.91, 7.32, 1.1, 0.92),
    ):
        add_identity_window(
            f"hudec-identity-{name}-dormer-window",
            x=x,
            y=y,
            z=z,
            width=width,
            height=height,
            axis="Y",
            mat=mat,
        )

    BASE.add_box(
        "hudec-identity-entrance-door-frame",
        (2.65, -2.94, 1.37),
        (1.42, 0.18, 2.66),
        mat["timber"],
        bevel=0.045,
    )
    BASE.add_box(
        "hudec-identity-entrance-door",
        (2.65, -3.055, 1.37),
        (1.18, 0.09, 2.42),
        mat["wood"],
        bevel=0.035,
    )
    BASE.add_stairs(
        "hudec-identity-entrance-step",
        (2.65, -4.43),
        2.55,
        3,
        0.42,
        0.92,
        mat["stone"],
    )

    # 三联烟囱保留独立砖带和冠部，不合并为单根方柱。
    for index, x in enumerate((-4.72, -3.95, -3.18)):
        BASE.add_box(
            f"hudec-identity-chimney-band-{index}",
            (x, 2.275, 10.35),
            (0.63, 0.07, 0.11),
            mat["brick"],
            bevel=0.012,
        )
        BASE.add_box(
            f"hudec-identity-chimney-crown-{index}",
            (x, 2.85, 12.34),
            (0.82, 1.46, 0.18),
            mat["brick"],
            bevel=0.025,
        )

    # 只保留主屋和端翼的屋脊读形；移除 Hero 密集瓦垄。
    BASE.add_beam(
        "hudec-identity-main-roof-ridge",
        (-6.9, 0.65, 10.3),
        (6.2, 0.65, 10.3),
        0.12,
        mat["roof"],
    )
    BASE.add_beam(
        "hudec-identity-end-wing-roof-ridge",
        (4.7, -2.65, 9.0),
        (4.7, 5.15, 9.0),
        0.12,
        mat["roof"],
    )
    for index, z in enumerate((0.42, 1.42, 2.35)):
        BASE.add_beam(
            f"hudec-identity-low-wing-horizontal-{index}",
            (-6.05, 5.25, z),
            (-1.45, 5.25, z),
            0.105,
            mat["frame"],
        )
    HERO.scale_asset_geometry(AUTHORED_SCALE)


def parse_glb(path: Path) -> dict[str, Any]:
    contents = path.read_bytes()
    if contents[:4] != b"glTF" or struct.unpack_from("<I", contents, 4)[0] != 2:
        raise RuntimeError("Identity 输出不是 glTF 2.0")
    json_length = struct.unpack_from("<I", contents, 12)[0]
    data = json.loads(contents[20 : 20 + json_length].decode("utf8"))
    triangles = 0
    primitives = 0
    bounds_min = [math.inf, math.inf, math.inf]
    bounds_max = [-math.inf, -math.inf, -math.inf]
    for mesh in data.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            primitives += 1
            position = data["accessors"][primitive["attributes"]["POSITION"]]
            index = primitive.get("indices")
            accessor = position if index is None else data["accessors"][index]
            triangles += accessor["count"] // 3
            for axis in range(3):
                bounds_min[axis] = min(bounds_min[axis], position["min"][axis])
                bounds_max[axis] = max(bounds_max[axis], position["max"][axis])
    return {
        "path": str(path.relative_to(ROOT)),
        "sha256": file_sha256(path),
        "bytes": len(contents),
        "nodes": len(data.get("nodes", [])),
        "meshes": len(data.get("meshes", [])),
        "primitives": primitives,
        "triangles": triangles,
        "materials": len(data.get("materials", [])),
        "materialNames": [
            material.get("name") for material in data.get("materials", [])
        ],
        "images": len(data.get("images", [])),
        "textures": len(data.get("textures", [])),
        "animations": len(data.get("animations", [])),
        "skins": len(data.get("skins", [])),
        "bounds": {
            "min": [round(value, 6) for value in bounds_min],
            "max": [round(value, 6) for value in bounds_max],
        },
        "transformedNodes": [
            node.get("name")
            for node in data.get("nodes", [])
            if any(
                key in node
                for key in ("translation", "rotation", "scale", "matrix")
            )
        ],
        "rootExtras": data.get("nodes", [{}])[0].get("extras", {}),
    }


def render_fixed_views() -> dict[str, dict[str, Any]]:
    camera, _ = HERO.add_preview_environment()
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
    background.inputs["Color"].default_value = (0.69, 0.76, 0.78, 1.0)
    background.inputs["Strength"].default_value = 0.65
    scene.view_settings.look = "AgX - Medium High Contrast"
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    outputs = {}
    for name, view in FIXED_CAMERAS.items():
        camera.location = view["location"]
        camera.data.lens = view["lensMm"]
        camera.rotation_euler = (
            Vector(view["target"]) - camera.location
        ).to_track_quat("-Z", "Y").to_euler()
        output = PREVIEW_DIR / f"test_hudec-memorial-identity-v1_{name}.png"
        scene.render.filepath = str(output)
        bpy.ops.render.render(write_still=True)
        outputs[name] = {
            **file_evidence(output),
            "camera": view,
            "visualReview": "pending-human-inspection",
        }
    return outputs


def validate_budget(audit: dict[str, Any]) -> None:
    for metric, maximum in (
        ("nodes", IDENTITY_BUDGET["maxNodes"]),
        ("meshes", IDENTITY_BUDGET["maxMeshes"]),
        ("triangles", IDENTITY_BUDGET["maxTriangles"]),
        ("materials", IDENTITY_BUDGET["maxMaterials"]),
        ("images", IDENTITY_BUDGET["maxImages"]),
        ("textures", IDENTITY_BUDGET["maxTextures"]),
        ("bytes", IDENTITY_BUDGET["maxBytes"]),
    ):
        if audit[metric] > maximum:
            raise RuntimeError(f"Identity 超出预算：{metric}={audit[metric]}")
    if audit["transformedNodes"]:
        raise RuntimeError(f"Identity 根节点未归一化：{audit['transformedNodes']}")


def write_build_record(
    *,
    hero_record: dict[str, Any],
    audit: dict[str, Any],
    previews: dict[str, dict[str, Any]],
    previous_glb_sha256: str | None,
) -> None:
    hero_bounds = hero_record["structure"]["bounds"]
    reduction = {
        "identityToHeroTriangleRatio": round(
            audit["triangles"] / HERO_BASELINE["triangles"],
            6,
        ),
        "identityToHeroByteRatio": round(
            audit["bytes"] / HERO_BASELINE["bytes"],
            6,
        ),
        "triangleReductionRatio": round(
            1 - audit["triangles"] / HERO_BASELINE["triangles"],
            6,
        ),
        "byteReductionRatio": round(
            1 - audit["bytes"] / HERO_BASELINE["bytes"],
            6,
        ),
        "materialReduction": HERO_BASELINE["materials"] - audit["materials"],
    }
    deterministic = previous_glb_sha256 == audit["sha256"]
    record = {
        "version": 1,
        "auditedAt": AUDITED_AT,
        "assetId": "hudec-memorial",
        "tier": "identity",
        "versionName": "identity-v1",
        "status": "headless-candidate-mcp3-pending",
        "generator": file_evidence(Path(__file__)),
        "buildCommand": (
            "/Applications/Blender.app/Contents/MacOS/Blender --background "
            "--factory-startup --python-exit-code 1 "
            "--python scripts/create_hudec_memorial_identity_v1.py"
        ),
        "blenderVersion": "5.2.0 LTS",
        "derivedFrom": {
            "heroMcp2": "pass-main-window-xhigh",
            "heroMcp2Record": file_evidence(MCP2_RECORD_PATH),
            "heroBuildRecord": file_evidence(HERO_RECORD_PATH),
            "heroGenerator": file_evidence(HERO_GENERATOR_PATH),
            "heroEditableSource": file_evidence(HERO_BLEND_PATH),
            "heroRuntimeAsset": file_evidence(HERO_GLB_PATH),
            "heroGlbSha256": HERO_GLB_SHA256,
            "method": "sha-pinned-frozen-hero-parameter-subset-reconstruction",
        },
        "continuity": {
            "origin": [0, 0, 0],
            "frontDirection": FRONT_DIRECTION,
            "groundDatum": GROUND_DATUM,
            "authoredUnitMeters": AUTHORED_UNIT_METERS,
            "authoredScale": AUTHORED_SCALE,
            "runtimePosition": RUNTIME_POSITION,
            "runtimeYaw": RUNTIME_YAW,
            "runtimeScale": RUNTIME_SCALE,
            "passageContract": "shared-split-obstacles-entrance-clear",
            "heroBounds": hero_bounds,
            "identityBounds": audit["bounds"],
            "mapContractChanged": False,
        },
        "identityCues": {
            "preserved": [
                "steep-layered-main-end-and-porch-roofs",
                "front-and-rear-dormers-with-readable-windows",
                "wide-front-and-end-gable-half-timber",
                "three-independent-tall-chimney-flues-and-crowns",
                "gabled-open-entrance-porch-door-and-steps",
                "low-glass-west-rear-wing-and-coarse-frame",
            ],
            "deliberateLosses": [
                "dense-roof-ribs",
                "repeated-fine-window-jamb-sill-cap-and-hardware",
                "half-of-repeated-front-diagonal-braces",
                "repeated-chimney-brick-bands",
                "fine-door-hardware",
            ],
        },
        "scope": {
            "included": "hudec-memorial-building-identity-only",
            "excluded": [
                "trees",
                "hedges",
                "planting",
                "courtyard slab",
                "street walls",
                "signage",
                "lighting",
                "weathervane and independent decoration",
                "other buildings",
                "shared registry",
                "shared runtime",
                "Fast manifest",
            ],
        },
        "budget": {
            "contract": IDENTITY_BUDGET,
            "heroBaseline": HERO_BASELINE,
            "reduction": reduction,
            "status": "pass",
        },
        "determinism": {
            "previousGlbSha256": previous_glb_sha256,
            "currentGlbSha256": audit["sha256"],
            "sameGlbSha256": deterministic,
            "status": (
                "pass-two-consecutive-runs-byte-identical"
                if deterministic
                else "pending-second-run"
            ),
        },
        "outputs": {
            "blend": file_evidence(BLEND_PATH),
            "glb": audit,
        },
        "previews": previews,
        "triptych": {
            "path": (
                "test_artifacts/all-models/identity-v1/hudec-memorial/"
                "test_hudec-memorial-identity-v1_"
                "reference_blender_threejs_triptych.png"
            ),
            "status": "generated-after-final-headless-run",
            "thirdPanel": "explicit-main-window-mcp3-and-threejs-pending-slate",
        },
        "validation": {
            "headlessBuild": "pass",
            "glbAudit": "pass-internal",
            "fixedViews": "pending-human-inspection",
            "mcp3": "pending-main-window-xhigh",
            "threeJs": "not-run",
            "performanceClaim": "none",
            "overall": "headless-candidate-mcp3-pending",
        },
    }
    RECORD_PATH.parent.mkdir(parents=True, exist_ok=True)
    RECORD_PATH.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )


def main() -> None:
    hero_record, _ = preflight()
    for directory in (
        BLEND_PATH.parent,
        GLB_PATH.parent,
        PREVIEW_DIR,
        RECORD_PATH.parent,
    ):
        directory.mkdir(parents=True, exist_ok=True)
    previous_glb_sha256 = file_sha256(GLB_PATH) if GLB_PATH.exists() else None

    BASE.clear_scene()
    build_identity()
    source_parts = len(BASE.ASSET_OBJECTS)
    BASE.merge_asset_objects("hudec-memorial-identity")
    root = BASE.ASSET_OBJECTS[0]
    root["stable_asset_id"] = "hudec-memorial"
    root["quality_tier"] = "identity-v1"
    root["derived_from_hero_glb_sha256"] = HERO_GLB_SHA256
    root["derived_from_mcp2_record_sha256"] = MCP2_RECORD_SHA256
    root["authored_unit_meters"] = AUTHORED_UNIT_METERS
    root["authored_scale"] = AUTHORED_SCALE
    root["front_direction"] = FRONT_DIRECTION
    root["ground_datum"] = GROUND_DATUM
    root["runtime_position"] = RUNTIME_POSITION
    root["runtime_yaw"] = RUNTIME_YAW
    root["runtime_scale"] = RUNTIME_SCALE
    root["passage_contract"] = "shared-split-obstacles-entrance-clear"
    root["source_parts"] = source_parts
    root["generator"] = "scripts/create_hudec_memorial_identity_v1.py"

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_extras=True,
        export_texcoords=False,
    )
    audit = parse_glb(GLB_PATH)
    validate_budget(audit)
    previews = render_fixed_views()
    write_build_record(
        hero_record=hero_record,
        audit=audit,
        previews=previews,
        previous_glb_sha256=previous_glb_sha256,
    )
    print(
        "邬达克纪念馆 Identity v1 生成完成："
        f"source_parts={source_parts}, triangles={audit['triangles']}, "
        f"materials={audit['materials']}, bytes={audit['bytes']}, "
        f"sha256={audit['sha256']}"
    )


if __name__ == "__main__":
    main()
