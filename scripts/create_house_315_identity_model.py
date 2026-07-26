"""从已通过 MCP2 的 House315 Hero v2 确定性派生 Identity v1。"""

from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
from types import ModuleType
from typing import Any

import bpy


ROOT = Path(__file__).resolve().parents[1]
AUDITED_AT = "2026-07-25"

HERO_GENERATOR_PATH = ROOT / "scripts/create_house_315_hero_model.py"
HERO_BLEND_PATH = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/hero-v2"
    / "house-315-hero.blend"
)
HERO_GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/hero-v2"
    / "house-315-hero.glb"
)
HERO_RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/hero-v2"
    / "house-315-hero.json"
)
HERO_GENERATOR_SHA256 = (
    "61e3aa5188e6aba14e0eabf58aa1cd19ba0980b812b62b79dc894d52cccd068f"
)
HERO_BLEND_SHA256 = (
    "2750b3c876fa651ce1fd0ed09f8e9a5557804b8e2783839f6ed63a740cd756b6"
)
HERO_GLB_SHA256 = (
    "ad414549bf6953bdeffe9b43d56b589101becf1a8c9efb57ac34446eac92f964"
)
MASSING_GLB_SHA256 = (
    "e9d62cfc7ffba69145d62508656a033a873e5769171414aff2124f7320389832"
)
LEGACY_BLEND_PATH = ROOT / "assets/models/source/xinhua-road/house-315.blend"
LEGACY_GLB_PATH = ROOT / "public/models/xinhua-road/house-315.glb"
LEGACY_BLEND_SHA256 = (
    "2e3a30f75dc57f9702edd712201840368ca9b4f0b405f4d21284a2e4bd6edcd2"
)
LEGACY_GLB_SHA256 = (
    "9d407a35c10bfa232d2a5a91ecae4886a9b146cdabec801319c7dc5530b67b07"
)
PUBLIC_REGISTRY_PATH = ROOT / "app/scene/xinhua-road-landmarks-data.json"
PUBLIC_REGISTRY_SHA256 = (
    "eccba9706ef88456ee6616ff9f44bc6f41ec8ac76d3f09478d08f7f58b5527e6"
)
SHARED_GENERATOR_PATH = ROOT / "scripts/create_xinhua_road_models.py"
SHARED_GENERATOR_SHA256 = (
    "6ea5fc19f98f6339d83063bafea9c0edd66ca07d2bb171be08f61d63fed3488d"
)

BLEND_PATH = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/identity-v1"
    / "house-315-identity.blend"
)
GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/identity-v1"
    / "house-315-identity.glb"
)
FIRST_BUILD_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/identity-v1"
    / "test_house-315-identity-first.glb"
)
PREVIEW_DIR = ROOT / "test_artifacts/all-models/identity-v1/house-315"
CANONICAL_PATH = PREVIEW_DIR / "test_house-315-identity-v1-canonical.png"
SIDE_PATH = PREVIEW_DIR / "test_house-315-identity-v1-side-depth.png"
ENTRANCE_PATH = PREVIEW_DIR / "test_house-315-identity-v1-entrance.png"
RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/identity-v1"
    / "house-315-identity.json"
)
LINEAGE_PATH = ROOT / "docs/research/house-315-tier-lineage.json"

RUNTIME_POSITION = [-23.03, 85.67]
RUNTIME_YAW = -0.38
RUNTIME_SCALE = 0.9
AUTHORED_FRONT = "local-negative-y"
SCENE_UNIT_METERS = 2.7
EXPECTED_BOUNDS = {
    "min": [-7.675, 0.0, -4.575],
    "max": [7.225, 6.982892, 4.84],
}
FIXED_CAMERAS = {
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
}
LOCAL_BOUNDS = {
    "minX": -7.675,
    "maxX": 7.225,
    "minZ": -4.575,
    "maxZ": 4.84,
}
LOCAL_OBSTACLES = [
    {"minX": -6.7, "maxX": 6.7, "minZ": -3.5, "maxZ": 2.4},
    {"minX": -4.475, "maxX": 0.675, "minZ": -2.65, "maxZ": 4.55},
    {"minX": 3.275, "maxX": 7.025, "minZ": -4.375, "maxZ": 3.075},
    {"minX": -7.475, "maxX": -3.225, "minZ": -4.35, "maxZ": -0.15},
]
EXPECTED_MATERIAL_NAMES = {
    "house-315-identity-warm-roughcast",
    "house-315-identity-muted-red-brick",
    "house-315-identity-dark-red-tile",
    "house-315-identity-deep-half-timber",
    "house-315-identity-muted-glass",
    "house-315-identity-entrance-shadow",
}
IDENTITY_BUDGET = {
    "maxNodes": 1,
    "maxMeshes": 1,
    "maxTriangles": 1600,
    "maxMaterials": 6,
    "maxImages": 0,
    "maxTextures": 0,
    "maxAnimations": 0,
    "maxBytes": 165_000,
}
HERO_BASELINE = {
    "triangles": 2936,
    "bytes": 212908,
    "materials": 6,
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


def load_frozen_hero_module() -> ModuleType:
    spec = importlib.util.spec_from_file_location(
        "house_315_frozen_hero",
        HERO_GENERATOR_PATH,
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("无法加载冻结的 House315 Hero generator")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


HERO = load_frozen_hero_module()


def preflight() -> dict[str, Any]:
    expected = {
        HERO_GENERATOR_PATH: HERO_GENERATOR_SHA256,
        HERO_BLEND_PATH: HERO_BLEND_SHA256,
        HERO_GLB_PATH: HERO_GLB_SHA256,
        LEGACY_BLEND_PATH: LEGACY_BLEND_SHA256,
        LEGACY_GLB_PATH: LEGACY_GLB_SHA256,
        PUBLIC_REGISTRY_PATH: PUBLIC_REGISTRY_SHA256,
        SHARED_GENERATOR_PATH: SHARED_GENERATOR_SHA256,
    }
    for path, sha256 in expected.items():
        if not path.exists() or file_sha256(path) != sha256:
            raise RuntimeError(f"Identity preflight SHA 不匹配：{path}")

    hero_record = json.loads(HERO_RECORD_PATH.read_text(encoding="utf8"))
    if hero_record.get("mcp2", {}).get("status") != "pass":
        raise RuntimeError("Hero v2 尚未通过 MCP2，禁止派生 Identity")
    if not hero_record.get("identityLineage", {}).get(
        "identityDerivationAuthorized"
    ):
        raise RuntimeError("Hero v2 Identity lineage 尚未获授权")
    if (
        hero_record.get("outputs", {}).get("blend", {}).get("sha256")
        != HERO_BLEND_SHA256
        or hero_record.get("outputs", {}).get("glb", {}).get("sha256")
        != HERO_GLB_SHA256
        or hero_record.get("derivedFrom", {}).get("runtimeAssetSha256")
        != MASSING_GLB_SHA256
    ):
        raise RuntimeError("Hero build record 与冻结二进制 lineage 不一致")
    if (
        hero_record.get("originContract", {}).get("fixedCameras")
        != FIXED_CAMERAS
        or hero_record.get("originContract", {}).get("runtimePosition")
        != RUNTIME_POSITION
        or hero_record.get("originContract", {}).get("runtimeYaw")
        != RUNTIME_YAW
        or hero_record.get("originContract", {}).get("runtimeScale")
        != RUNTIME_SCALE
        or hero_record.get("collisionContract", {}).get("localBounds")
        != LOCAL_BOUNDS
        or hero_record.get("collisionContract", {}).get("localObstacles")
        != LOCAL_OBSTACLES
    ):
        raise RuntimeError("Hero origin / placement / collision contract 已漂移")
    return hero_record


def configure_shell_materials(
    shell: bpy.types.Object,
) -> dict[str, bpy.types.Material]:
    mapping = {
        "house-315-massing-warm-roughcast": (
            "house-315-identity-warm-roughcast",
            (0.73, 0.69, 0.60, 1.0),
            0.9,
        ),
        "house-315-massing-muted-red-brick": (
            "house-315-identity-muted-red-brick",
            (0.42, 0.18, 0.12, 1.0),
            0.88,
        ),
        "house-315-massing-muted-red-tile": (
            "house-315-identity-dark-red-tile",
            (0.30, 0.085, 0.055, 1.0),
            0.78,
        ),
        "house-315-massing-dark-timber": (
            "house-315-identity-deep-half-timber",
            (0.055, 0.045, 0.038, 1.0),
            0.76,
        ),
    }
    values: dict[str, bpy.types.Material] = {}
    for surface in shell.data.materials:
        if surface.name not in mapping:
            raise RuntimeError(f"未知 Massing 材质：{surface.name}")
        name, color, roughness = mapping[surface.name]
        values[name] = HERO.configure_material(
            surface,
            name,
            color,
            roughness=roughness,
        )
    return values


def add_front_panel(
    prefix: str,
    x: float,
    front_y: float,
    z: float,
    width: float,
    height: float,
    frame: bpy.types.Material,
    glass: bpy.types.Material,
) -> list[bpy.types.Object]:
    return [
        HERO.add_box(
            f"{prefix}-frame",
            (x, front_y + 0.018, z),
            (width + 0.12, 0.035, height + 0.12),
            frame,
        ),
        HERO.add_box(
            f"{prefix}-glass",
            (x, front_y - 0.018, z),
            (width, 0.035, height),
            glass,
        ),
    ]


def add_side_panel(
    prefix: str,
    side_x: float,
    y: float,
    z: float,
    width: float,
    height: float,
    frame: bpy.types.Material,
    glass: bpy.types.Material,
) -> list[bpy.types.Object]:
    return [
        HERO.add_box(
            f"{prefix}-frame",
            (side_x - 0.018, y, z),
            (0.035, width + 0.12, height + 0.12),
            frame,
        ),
        HERO.add_box(
            f"{prefix}-glass",
            (side_x + 0.018, y, z),
            (0.035, width, height),
            glass,
        ),
    ]


def build_identity() -> tuple[bpy.types.Object, list[str]]:
    """重建 Hero 的证据子集，不读取旧 Hero、Recovery 或 OSM geometry。"""

    shell = HERO.MASSING.build_model()
    materials = configure_shell_materials(shell)
    plaster = materials["house-315-identity-warm-roughcast"]
    brick = materials["house-315-identity-muted-red-brick"]
    roof = materials["house-315-identity-dark-red-tile"]
    timber = materials["house-315-identity-deep-half-timber"]
    glass = HERO.make_material(
        "house-315-identity-muted-glass",
        (0.16, 0.24, 0.23, 1.0),
        roughness=0.38,
    )
    shadow = HERO.make_material(
        "house-315-identity-entrance-shadow",
        (0.025, 0.03, 0.028, 1.0),
        roughness=0.82,
    )

    objects: list[bpy.types.Object] = [shell]
    component_names: list[str] = ["approved-massing-shell"]

    def include(values: list[bpy.types.Object] | bpy.types.Object) -> None:
        if isinstance(values, list):
            objects.extend(values)
            component_names.extend(value.name for value in values)
        else:
            objects.append(values)
            component_names.append(values.name)

    central_x = -1.9

    # 最高优先级 cue：高入口、中央半木构山墙和上层小窗。
    include(
        add_front_panel(
            "house315-identity-central-tall-entry",
            central_x,
            -4.62,
            1.8,
            1.06,
            2.55,
            timber,
            shadow,
        )
    )
    for name, x in (
        ("left", central_x - 1.58),
        ("right", central_x + 1.56),
    ):
        include(
            add_front_panel(
                f"house315-identity-central-{name}-window",
                x,
                -4.62,
                2.05,
                0.78,
                1.16,
                timber,
                glass,
            )
        )
    include(
        add_front_panel(
            "house315-identity-central-upper-window",
            central_x,
            -4.80,
            5.25,
            0.84,
            0.62,
            timber,
            glass,
        )
    )
    include(
        HERO.add_box(
            "house315-identity-address-binding-unlettered-plaque",
            (central_x + 0.82, -4.62, 1.18),
            (0.28, 0.025, 0.2),
            plaster,
        )
    )
    for name, z, width in (
        ("lower", 4.18, 4.05),
        ("upper", 4.82, 3.12),
    ):
        include(
            HERO.add_box(
                f"house315-identity-central-timber-{name}-horizontal",
                (central_x, -4.81, z),
                (width, 0.04, 0.075),
                timber,
            )
        )
    for index, x in enumerate((central_x - 1.28, central_x + 1.28)):
        include(
            HERO.add_box(
                f"house315-identity-central-timber-post-{index}",
                (x, -4.81, 4.28),
                (0.075, 0.04, 1.22),
                timber,
            )
        )
    include(
        HERO.add_beam_between(
            "house315-identity-central-timber-brace-left",
            (central_x - 1.9, -4.80, 3.72),
            (central_x - 0.22, -4.80, 4.78),
            0.07,
            timber,
        )
    )
    include(
        HERO.add_beam_between(
            "house315-identity-central-timber-brace-right",
            (central_x + 1.9, -4.80, 3.72),
            (central_x + 0.22, -4.80, 4.78),
            0.07,
            timber,
        )
    )

    # 公开面的主要窗组保持数量关系；细窗棂和大部分侧窗主动丢失。
    for index, x in enumerate((-5.95, -5.05, 1.35, 2.25)):
        include(
            add_front_panel(
                f"house315-identity-main-front-window-{index}",
                x,
                -2.22,
                1.92,
                0.62,
                1.05,
                timber,
                glass,
            )
        )
    for index, x in enumerate((4.35, 5.95)):
        include(
            add_front_panel(
                f"house315-identity-right-front-window-{index}",
                x,
                -3.15,
                1.92,
                0.68,
                1.12,
                timber,
                glass,
            )
        )
    include(
        add_front_panel(
            "house315-identity-right-gable-window",
            5.15,
            -3.33,
            4.05,
            0.72,
            0.72,
            timber,
            glass,
        )
    )
    for index, y in enumerate((-1.4, 1.4)):
        include(
            add_side_panel(
                f"house315-identity-right-side-window-{index}",
                7.08,
                y,
                1.9,
                0.74,
                1.08,
                timber,
                glass,
            )
        )

    # 主屋老虎窗、烟囱与低密度屋脊保留轮廓，删除 Hero 的密集瓦垄。
    include(
        HERO.add_box(
            "house315-identity-main-shed-dormer-body",
            (2.0, -1.76, 4.1),
            (2.28, 0.58, 0.72),
            plaster,
        )
    )
    include(
        HERO.add_box(
            "house315-identity-main-shed-dormer-roof",
            (2.0, -1.72, 4.49),
            (2.52, 0.82, 0.11),
            roof,
            rotation=(-0.13962634, 0.0, 0.0),
        )
    )
    for index, x in enumerate((1.45, 2.0, 2.55)):
        include(
            add_front_panel(
                f"house315-identity-dormer-window-{index}",
                x,
                -2.065,
                4.08,
                0.36,
                0.4,
                timber,
                glass,
            )
        )
    include(
        HERO.add_box(
            "house315-identity-main-chimney",
            (3.35, 1.32, 5.45),
            (0.54, 0.54, 1.62),
            brick,
        )
    )
    include(
        HERO.add_box(
            "house315-identity-main-chimney-cap",
            (3.35, 1.32, 6.28),
            (0.66, 0.66, 0.1),
            roof,
        )
    )
    for name, location, dimensions in (
        ("main", (0.0, 0.55, 5.71), (13.6, 0.055, 0.055)),
        ("central", (-1.9, -0.95, 6.955), (0.055, 7.35, 0.05)),
        ("right", (5.15, 0.65, 5.52), (0.055, 7.55, 0.055)),
        ("left", (-5.35, 2.25, 4.42), (4.35, 0.055, 0.055)),
    ):
        include(
            HERO.add_box(
                f"house315-identity-{name}-roof-ridge",
                location,
                dimensions,
                roof,
            )
        )
    for name, location, dimensions in (
        ("main", (0.0, -2.42, 3.035), (13.65, 0.055, 0.075)),
        ("central", (-1.9, -4.805, 3.64), (5.38, 0.055, 0.075)),
        ("right", (5.15, -3.285, 2.99), (4.02, 0.055, 0.075)),
    ):
        include(
            HERO.add_box(
                f"house315-identity-{name}-front-eave",
                location,
                dimensions,
                timber,
            )
        )

    identity = HERO.MASSING.join_objects(objects, "house-315-identity")
    identity["stable_asset_id"] = "house-315"
    identity["tier"] = "identity"
    identity["version_name"] = "identity-v1"
    identity["authored_front"] = AUTHORED_FRONT
    identity["scene_unit_meters"] = SCENE_UNIT_METERS
    identity["derived_from_hero_glb_sha256"] = HERO_GLB_SHA256
    identity["derived_from_hero_blend_sha256"] = HERO_BLEND_SHA256
    identity["derived_from_hero_generator_sha256"] = HERO_GENERATOR_SHA256
    identity["derived_from_massing_glb_sha256"] = MASSING_GLB_SHA256
    identity["preserved_identity_cues"] = (
        "central-tall-half-timber-gable;transverse-main-ridge;"
        "asymmetric-right-long-and-left-short-wings;"
        "white-over-red-facade;tall-central-entrance;major-window-groups"
    )
    identity["deliberate_losses"] = (
        "dense-roof-ribs;fine-window-mullions;"
        "one-of-three-right-side-windows;minor-facade-divisions"
    )
    identity["hidden_rear_detail"] = "unknown-low-detail"
    identity["not_derived_from"] = (
        "legacy-hero;recovery-voxel-massing;ordinary-osm"
    )
    identity["scope_exclusions"] = (
        "garden;walls;fences;street-gate;lamps;planters;paving;"
        "trees;shrubs;grass;outdoor-furniture;signage;other-buildings"
    )
    identity["mcp3_status"] = "pending-main-window"
    identity["runtime_integrated"] = False
    return identity, component_names


def configure_scene() -> None:
    HERO.MASSING.configure_scene()
    scene = bpy.context.scene
    scene["tier"] = "identity"
    scene["version_name"] = "identity-v1"
    scene["derived_from_hero_glb_sha256"] = HERO_GLB_SHA256
    scene["hero_mcp2"] = "pass"
    scene["identity_mcp3"] = "pending-main-window"
    scene["runtime_integrated"] = False
    scene["public_registry_modified"] = False


def validate_glb_audit(audit: dict[str, Any]) -> None:
    if audit["nodes"] != 1 or audit["meshes"] != 1:
        raise RuntimeError(f"Identity 必须为单节点单网格：{audit}")
    names = {value["name"] for value in audit["materialFactors"]}
    if names != EXPECTED_MATERIAL_NAMES:
        raise RuntimeError(f"Identity 材质异常：{sorted(names)}")
    if audit["materials"] != len(EXPECTED_MATERIAL_NAMES):
        raise RuntimeError(f"Identity 材质数量异常：{audit}")
    if (
        audit["images"]
        or audit["textures"]
        or audit["animations"]
        or audit["skins"]
    ):
        raise RuntimeError(f"Identity 不允许图片、贴图、动画或骨骼：{audit}")
    if audit["transformedNodes"]:
        raise RuntimeError(f"Identity 存在未烘焙 transform：{audit}")
    if (
        audit["triangles"] > IDENTITY_BUDGET["maxTriangles"]
        or audit["bytes"] > IDENTITY_BUDGET["maxBytes"]
    ):
        raise RuntimeError(f"Identity 超出预算：{audit}")
    if (
        audit["triangles"] >= HERO_BASELINE["triangles"] * 0.6
        or audit["bytes"] >= HERO_BASELINE["bytes"] * 0.8
    ):
        raise RuntimeError(f"Identity 相对 Hero 简化不足：{audit}")
    for boundary in ("min", "max"):
        for actual, expected in zip(
            audit["bounds"][boundary],
            EXPECTED_BOUNDS[boundary],
            strict=True,
        ):
            if abs(actual - expected) > 1e-4:
                raise RuntimeError(
                    f"Identity 不得改变 Hero bounds：{audit['bounds']}"
                )
    failures = (
        audit["topology"]["zeroAreaTriangles"],
        audit["topology"]["nonFinitePositions"],
        audit["topology"]["invalidIndices"],
        audit["normals"]["primitivesWithoutNormals"],
        audit["normals"]["zeroLengthNormals"],
        audit["normals"]["nonUnitNormals"],
        audit["normals"]["orientationMismatches"],
    )
    if any(failures):
        raise RuntimeError(f"Identity 拓扑或法线审计失败：{audit}")


def inspect_blend_scene(obj: bpy.types.Object) -> dict[str, Any]:
    audit = HERO.inspect_blend_scene(obj)
    audit["minimumPolygonArea"] = round(
        min(polygon.area for polygon in obj.data.polygons),
        9,
    )
    audit["allMaterialsUseNodes"] = all(
        surface.use_nodes for surface in obj.data.materials
    )
    return audit


def validate_blend_audit(audit: dict[str, Any]) -> None:
    if audit["objectCount"] != 1 or audit["meshObjects"] != 1:
        raise RuntimeError(f"Identity `.blend` 场景不纯净：{audit}")
    if (
        audit["rootLocation"] != [0.0, 0.0, 0.0]
        or audit["rootRotationEuler"] != [0.0, 0.0, 0.0]
        or audit["rootScale"] != [1.0, 1.0, 1.0]
    ):
        raise RuntimeError(f"Identity `.blend` 根变换未归一：{audit}")
    if not audit["allMaterialsUseNodes"]:
        raise RuntimeError(f"Identity `.blend` 材质未全部启用 node：{audit}")
    failures = (
        audit["zeroAreaPolygonsBelow1e10"],
        audit["zeroAreaTrianglesBelow1e10"],
        audit["nonFinitePositions"],
        audit["nonFinitePolygonNormals"],
        audit["trianglePolygonOrientationMismatches"],
    )
    if any(failures):
        raise RuntimeError(f"Identity `.blend` 拓扑失败：{audit}")


def build_export(path: Path) -> tuple[bpy.types.Object, list[str]]:
    HERO.MASSING.reset_scene()
    configure_scene()
    obj, component_names = build_identity()
    HERO.export_glb(path, obj)
    return obj, component_names


def make_record(
    hero_record: dict[str, Any],
    glb_audit: dict[str, Any],
    blend_audit: dict[str, Any],
    blend_sha256: str,
    first_sha256: str,
    component_names: list[str],
) -> dict[str, Any]:
    triangle_ratio = round(
        glb_audit["triangles"] / HERO_BASELINE["triangles"],
        6,
    )
    byte_ratio = round(
        glb_audit["bytes"] / HERO_BASELINE["bytes"],
        6,
    )
    return {
        "version": 1,
        "auditedAt": AUDITED_AT,
        "assetId": "house-315",
        "tier": "identity",
        "versionName": "identity-v1",
        "status": "candidate-awaiting-main-window-mcp3",
        "generator": file_evidence(Path(__file__).resolve()),
        "buildCommand": (
            "/Applications/Blender.app/Contents/MacOS/Blender --background "
            "--python-exit-code 1 --python "
            "scripts/create_house_315_identity_model.py"
        ),
        "blenderVersion": "5.2.0 LTS",
        "derivedFrom": {
            "tier": "hero",
            "heroMcp2": "pass",
            "heroBuildRecord": str(HERO_RECORD_PATH.relative_to(ROOT)),
            "heroGenerator": file_evidence(HERO_GENERATOR_PATH),
            "heroEditableSource": file_evidence(HERO_BLEND_PATH),
            "heroRuntimeAsset": file_evidence(HERO_GLB_PATH),
            "heroGlbSha256": HERO_GLB_SHA256,
            "heroBlendSha256": HERO_BLEND_SHA256,
            "heroGeneratorSha256": HERO_GENERATOR_SHA256,
            "massingGlbSha256": MASSING_GLB_SHA256,
            "method": (
                "sha-pinned-hero-generator-subset-reconstruction-"
                "over-approved-massing-shell"
            ),
        },
        "continuity": {
            "origin": "pass-shared-zero-origin",
            "bounds": "pass-exact-hero-and-massing-bounds",
            "authoredFront": AUTHORED_FRONT,
            "groundDatum": 0,
            "sceneUnitMeters": SCENE_UNIT_METERS,
            "runtimePosition": RUNTIME_POSITION,
            "runtimeYaw": RUNTIME_YAW,
            "runtimeScale": RUNTIME_SCALE,
            "localBounds": LOCAL_BOUNDS,
            "collision": {
                "sameAsHeroAndMassing": True,
                "localObstacles": LOCAL_OBSTACLES,
                "entranceAndFrontRecessRemainOpen": True,
            },
        },
        "identityCues": {
            "preserved": [
                "central-tall-half-timber-gable-and-upper-window",
                "transverse-main-ridge",
                "asymmetric-long-right-and-short-left-rear-wings",
                "white-over-red-facade-division",
                "tall-central-entrance-and-major-window-groups",
                "front-shed-dormer-and-visible-chimney",
            ],
            "deliberateLosses": [
                "dense-roof-ribs",
                "fine-window-mullions-and-horizontal-divisions",
                "one-of-three-visible-right-side-windows",
                "minor-facade-and-eave-divisions",
            ],
            "unknownRear": "held-at-low-detail",
        },
        "scope": {
            "included": "house-315-building-identity-only",
            "sourceComponentCount": len(component_names),
            "sourceComponents": component_names,
            "excluded": [
                "legacy Hero geometry",
                "Recovery geometry",
                "ordinary OSM",
                "full-map assets",
                "garden slab",
                "walls",
                "fences",
                "street gate",
                "lamps",
                "planters",
                "decorative paving",
                "trees",
                "shrubs",
                "grass",
                "outdoor furniture",
                "commercial signage",
                "other buildings",
            ],
        },
        "budgets": {
            "contract": IDENTITY_BUDGET,
            "heroBaseline": HERO_BASELINE,
            "identityToHeroTriangleRatio": triangle_ratio,
            "identityToHeroByteRatio": byte_ratio,
            "triangleReductionRatio": round(1 - triangle_ratio, 6),
            "byteReductionRatio": round(1 - byte_ratio, 6),
            "status": "pass",
        },
        "determinism": {
            "independentCleanSceneBuilds": 2,
            "firstGlbSha256": first_sha256,
            "secondGlbSha256": glb_audit["sha256"],
            "sameGlbSha256": first_sha256 == glb_audit["sha256"],
        },
        "fixedCameras": FIXED_CAMERAS,
        "outputs": {
            "blend": {
                "path": str(BLEND_PATH.relative_to(ROOT)),
                "sha256": blend_sha256,
                "bytes": BLEND_PATH.stat().st_size,
            },
            "glb": {
                "path": str(GLB_PATH.relative_to(ROOT)),
                "sha256": glb_audit["sha256"],
                "bytes": glb_audit["bytes"],
                "cacheVersion": (
                    f"20260725-identity-{glb_audit['sha256'][:8]}"
                ),
            },
            "previews": {
                "canonical": file_evidence(CANONICAL_PATH),
                "sideDepth": file_evidence(SIDE_PATH),
                "entrance": file_evidence(ENTRANCE_PATH),
            },
        },
        "blendSceneAudit": blend_audit,
        "glb": glb_audit,
        "mcp3": {
            "status": "pending-main-window-same-camera-three-tier-review",
            "identityFormalPass": False,
            "acceptedInteractiveChanges": [],
            "qaRigSaved": False,
            "qaRigExported": False,
        },
        "runtime": {
            "status": "not-started-by-worktree",
            "runtimeAuthorized": False,
            "runtimeExecutionStarted": False,
            "publicRegistryModified": False,
            "runtimeIntegrated": False,
        },
        "sourceHeroGate": {
            "status": hero_record["mcp2"]["status"],
            "identityDerivationAuthorized": hero_record["identityLineage"][
                "identityDerivationAuthorized"
            ],
            "identityDerivationStartedByThisBuild": True,
        },
    }


def make_lineage(
    record: dict[str, Any],
    hero_record: dict[str, Any],
) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "assetId": "house-315",
        "activeScope": "exact-18-building-program-house-315-only",
        "recordedAt": AUDITED_AT,
        "status": "candidate-awaiting-main-window-mcp3",
        "sourceGate": {
            "gate": "mcp2-hero-visual-review",
            "status": "pass",
            "authority": "docs/research/house-315-blender-mcp-gates.json#heroGate",
            "reviewedHeroGlbSha256": HERO_GLB_SHA256,
            "identityDerivationAuthorized": True,
        },
        "continuityContract": {
            "origin": [0, 0, 0],
            "authoredFront": AUTHORED_FRONT,
            "groundDatum": 0,
            "sceneUnitMeters": SCENE_UNIT_METERS,
            "runtimePlacement": {
                "position": RUNTIME_POSITION,
                "yaw": RUNTIME_YAW,
                "scale": RUNTIME_SCALE,
                "movementAuthorized": False,
            },
            "glbBounds": EXPECTED_BOUNDS,
            "collision": {
                "localBounds": LOCAL_BOUNDS,
                "localObstacles": LOCAL_OBSTACLES,
            },
        },
        "tiers": {
            "massing": {
                "version": "massing-v2",
                "runtimeAsset": {
                    "path": hero_record["derivedFrom"]["runtimeAsset"],
                    "sha256": MASSING_GLB_SHA256,
                },
                "gates": {
                    "mcp1": "pass",
                    "threeJsMapCalibration": "pass",
                },
            },
            "hero": {
                "version": "hero-v2",
                "generator": file_evidence(HERO_GENERATOR_PATH),
                "editableSource": file_evidence(HERO_BLEND_PATH),
                "runtimeAsset": file_evidence(HERO_GLB_PATH),
                "gates": {"mcp2": "pass"},
            },
            "identity": {
                "version": "identity-v1",
                "derivedFromHeroGlbSha256": HERO_GLB_SHA256,
                "generator": record["generator"],
                "editableSource": record["outputs"]["blend"],
                "runtimeAsset": {
                    **record["outputs"]["glb"],
                    "triangles": record["glb"]["triangles"],
                    "materials": record["glb"]["materials"],
                    "images": record["glb"]["images"],
                    "textures": record["glb"]["textures"],
                    "animations": record["glb"]["animations"],
                },
                "buildRecord": str(RECORD_PATH.relative_to(ROOT)),
                "preservedCues": record["identityCues"]["preserved"],
                "deliberateLosses": record["identityCues"][
                    "deliberateLosses"
                ],
                "budget": record["budgets"],
                "determinism": record["determinism"],
                "gates": {
                    "mcp3": "pending-main-window",
                    "identityFormalPass": False,
                },
            },
        },
        "threeTierGate": {
            "status": "candidate-awaiting-main-window-mcp3",
            "sameOrigin": True,
            "sameBounds": True,
            "sameAuthoredFront": True,
            "sameRuntimePlacement": True,
            "sameCollisionSemantics": True,
            "sameCameraViewSet": True,
            "identityBudgetPass": True,
            "formalPass": False,
        },
        "scope": {
            "buildingOnly": True,
            "excluded": record["scope"]["excluded"],
            "legacyHeroDisposition": "hold-read-only-rollback-only",
            "legacyHeroOverwritten": False,
        },
        "runtime": {
            "status": "not-started-by-worktree",
            "runtimeAuthorized": False,
            "runtimeExecutionStarted": False,
            "publicRegistryModified": False,
            "runtimeIntegrated": False,
        },
    }


def main() -> None:
    for directory in (
        BLEND_PATH.parent,
        GLB_PATH.parent,
        PREVIEW_DIR,
        RECORD_PATH.parent,
    ):
        directory.mkdir(parents=True, exist_ok=True)

    hero_record = preflight()

    build_export(FIRST_BUILD_PATH)
    first_sha256 = file_sha256(FIRST_BUILD_PATH)

    obj, component_names = build_export(GLB_PATH)
    second_sha256 = file_sha256(GLB_PATH)
    if first_sha256 != second_sha256:
        raise RuntimeError(
            "Identity 双 clean build SHA 不一致："
            f"{first_sha256} != {second_sha256}"
        )
    FIRST_BUILD_PATH.unlink(missing_ok=True)

    glb_audit = HERO.parse_glb(GLB_PATH)
    validate_glb_audit(glb_audit)
    blend_audit = inspect_blend_scene(obj)
    validate_blend_audit(blend_audit)

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    blend_sha256 = file_sha256(BLEND_PATH)

    helpers = HERO.MASSING.add_preview_context()
    for label, path, camera in (
        ("canonical", CANONICAL_PATH, FIXED_CAMERAS["canonical"]),
        ("side-depth", SIDE_PATH, FIXED_CAMERAS["sideDepth"]),
        ("entrance", ENTRANCE_PATH, FIXED_CAMERAS["entrance"]),
    ):
        HERO.MASSING.render_preview(
            path,
            tuple(camera["location"]),
            tuple(camera["target"]),
            float(camera["orthoScale"]),
            label,
        )
    for helper in helpers:
        bpy.data.objects.remove(helper, do_unlink=True)

    record = make_record(
        hero_record,
        glb_audit,
        blend_audit,
        blend_sha256,
        first_sha256,
        component_names,
    )
    RECORD_PATH.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )
    LINEAGE_PATH.write_text(
        json.dumps(
            make_lineage(record, hero_record),
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf8",
    )

    postflight = {
        LEGACY_BLEND_PATH: LEGACY_BLEND_SHA256,
        LEGACY_GLB_PATH: LEGACY_GLB_SHA256,
        PUBLIC_REGISTRY_PATH: PUBLIC_REGISTRY_SHA256,
        SHARED_GENERATOR_PATH: SHARED_GENERATOR_SHA256,
        HERO_GENERATOR_PATH: HERO_GENERATOR_SHA256,
        HERO_BLEND_PATH: HERO_BLEND_SHA256,
        HERO_GLB_PATH: HERO_GLB_SHA256,
    }
    for path, sha256 in postflight.items():
        if file_sha256(path) != sha256:
            raise RuntimeError(f"Identity 构建意外修改冻结文件：{path}")

    print(
        json.dumps(
            {
                "glb": glb_audit,
                "blend": blend_audit,
                "record": str(RECORD_PATH.relative_to(ROOT)),
                "lineage": str(LINEAGE_PATH.relative_to(ROOT)),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
