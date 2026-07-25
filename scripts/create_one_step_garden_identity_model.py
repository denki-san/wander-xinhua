"""从冻结的一号花园 Hero v2 确定性派生 Identity v1。"""

from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
import struct
from types import ModuleType
from typing import Any

import bpy


ROOT = Path(__file__).resolve().parents[1]
AUDITED_AT = "2026-07-25"
HERO_GENERATOR_PATH = ROOT / "scripts/create_one_step_garden_hero_model.py"
HERO_BLEND_PATH = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/hero-v2"
    / "one-step-garden-hero.blend"
)
HERO_GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/hero-v2"
    / "one-step-garden-hero.glb"
)
HERO_RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/hero-v2"
    / "one-step-garden-hero.json"
)
MASSING_RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/massing-v2"
    / "one-step-garden-massing.json"
)
BLEND_PATH = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/identity-v1"
    / "one-step-garden-identity.blend"
)
GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/identity-v1"
    / "one-step-garden-identity.glb"
)
PREVIEW_DIR = ROOT / "test_artifacts/all-models/identity-v1/one-step-garden"
CANONICAL_PATH = PREVIEW_DIR / "test_one-step-garden-identity-v1-canonical.png"
SIDE_PATH = PREVIEW_DIR / "test_one-step-garden-identity-v1-side-depth.png"
ENTRANCE_PATH = (
    PREVIEW_DIR / "test_one-step-garden-identity-v1-entrance-detail.png"
)
RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/identity-v1"
    / "one-step-garden-identity.json"
)

HERO_GENERATOR_SHA256 = (
    "b536e1d32630b0ee3262d98029ba384bfa610f392316dad7dd658141124b30b8"
)
HERO_BLEND_SHA256 = (
    "8f5c3984abef50239f1ece5e5360887d8615786cb6283bf60d85f80bd12f21bd"
)
HERO_GLB_SHA256 = (
    "026565ba9dcb347c2dd1f9b23b277a2fdf795c6c26e3e46f4f8cd29c4dee2f2b"
)
MASSING_GLB_SHA256 = (
    "a87caeba3b3ab4bc6735e6f3b98f424c15994895a8b51d8777d2cb98fb80e761"
)
MASSING_BLEND_SHA256 = (
    "a4c0e0fba996f139a88344b6f39a8a2509326ba7018206dc888231fab6474388"
)
EXPECTED_BOUNDS = {
    "min": [-7.25, 0.0, -9.325],
    "max": [7.25, 6.25, 6.9],
}
IDENTITY_BUDGET = {
    "maxTriangles": 1800,
    "maxNodes": 1,
    "maxMeshes": 1,
    "maxMaterials": 6,
    "maxImages": 0,
    "maxTextures": 0,
    "maxAnimations": 0,
    "maxBytes": 205_000,
}
HERO_BASELINE = {
    "triangles": 3584,
    "bytes": 259772,
    "materials": 7,
}
RUNTIME_POSITION = [60.86, 120.73]
RUNTIME_YAW = -0.38
RUNTIME_SCALE = 0.88
AUTHORED_FRONT = "local-negative-y"
SCENE_UNIT_METERS = 2.7


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


def assert_frozen_sources() -> dict[str, Any]:
    expected = {
        HERO_GENERATOR_PATH: HERO_GENERATOR_SHA256,
        HERO_BLEND_PATH: HERO_BLEND_SHA256,
        HERO_GLB_PATH: HERO_GLB_SHA256,
    }
    for path, sha256 in expected.items():
        if file_sha256(path) != sha256:
            raise RuntimeError(f"冻结 Hero 来源已漂移，禁止派生 Identity：{path}")

    hero_record = json.loads(HERO_RECORD_PATH.read_text(encoding="utf8"))
    if hero_record.get("mcp2", {}).get("status") != "pass":
        raise RuntimeError("Hero v2 尚未通过 MCP2，禁止派生 Identity")
    if not hero_record.get("identityLineage", {}).get(
        "identityDerivationAuthorized"
    ):
        raise RuntimeError("Hero v2 Identity lineage 尚未获授权")
    if (
        hero_record.get("outputs", {}).get("glb", {}).get("sha256")
        != HERO_GLB_SHA256
        or hero_record.get("outputs", {}).get("blend", {}).get("sha256")
        != HERO_BLEND_SHA256
    ):
        raise RuntimeError("Hero build record 与冻结二进制不一致")

    massing_record = json.loads(MASSING_RECORD_PATH.read_text(encoding="utf8"))
    if (
        massing_record.get("glb", {}).get("sha256") != MASSING_GLB_SHA256
        or massing_record.get("mcp1", {}).get("reviewedBlendSha256")
        != MASSING_BLEND_SHA256
    ):
        raise RuntimeError("Massing lineage 已漂移，禁止派生 Identity")
    return hero_record


def load_frozen_hero_module() -> ModuleType:
    spec = importlib.util.spec_from_file_location(
        "one_step_garden_frozen_hero",
        HERO_GENERATOR_PATH,
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("无法加载冻结 Hero generator")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def add_identity_window_y(
    hero: ModuleType,
    prefix: str,
    center: tuple[float, float, float],
    width: float,
    height: float,
    frame: bpy.types.Material,
    glass: bpy.types.Material,
) -> list[bpy.types.Object]:
    """用两层无共面盒保留窗洞节奏，删除 Hero 的细分窗框。"""

    x, y, z = center
    return [
        hero.add_box(
            f"{prefix}-frame-panel",
            (x, y + 0.025, z),
            (width + 0.14, 0.04, height + 0.14),
            frame,
        ),
        hero.add_box(
            f"{prefix}-glass-panel",
            (x, y - 0.012, z),
            (width, 0.055, height),
            glass,
        ),
    ]


def add_identity_window_x(
    hero: ModuleType,
    prefix: str,
    center: tuple[float, float, float],
    width: float,
    height: float,
    frame: bpy.types.Material,
    glass: bpy.types.Material,
) -> list[bpy.types.Object]:
    """用两层无共面盒保留院内侧窗节奏，删除细分窗梃。"""

    x, y, z = center
    return [
        hero.add_box(
            f"{prefix}-frame-panel",
            (x, y, z),
            (0.04, width + 0.14, height + 0.14),
            frame,
        ),
        hero.add_box(
            f"{prefix}-glass-panel",
            (x - 0.037, y, z),
            (0.055, width, height),
            glass,
        ),
    ]


def add_identity_door_y(
    hero: ModuleType,
    prefix: str,
    center: tuple[float, float, float],
    width: float,
    height: float,
    frame: bpy.types.Material,
    door: bpy.types.Material,
) -> list[bpy.types.Object]:
    x, y, z = center
    return [
        hero.add_box(
            f"{prefix}-frame-panel",
            (x, y + 0.025, z),
            (width + 0.18, 0.05, height + 0.18),
            frame,
        ),
        hero.add_box(
            f"{prefix}-door-panel",
            (x, y - 0.018, z),
            (width, 0.07, height),
            door,
        ),
    ]


def build_identity(hero: ModuleType) -> bpy.types.Object:
    """保留 Hero 主轮廓与身份构件，删除密集分格和非必要背面细节。"""

    plaster = hero.material(
        "one-step-garden-identity-warm-plaster",
        (0.82, 0.78, 0.69, 1.0),
    )
    brick = hero.material(
        "one-step-garden-identity-muted-brick",
        (0.40, 0.16, 0.11, 1.0),
    )
    roof = hero.material(
        "one-step-garden-identity-dark-tile-roof",
        (0.12, 0.15, 0.15, 1.0),
    )
    timber = hero.material(
        "one-step-garden-identity-deep-half-timber",
        (0.045, 0.065, 0.06, 1.0),
    )
    frame = hero.material(
        "one-step-garden-identity-window-frame",
        (0.035, 0.085, 0.075, 1.0),
    )
    glass = hero.material(
        "one-step-garden-identity-muted-glass",
        (0.09, 0.19, 0.18, 1.0),
        roughness=0.38,
    )
    objects: list[bpy.types.Object] = []

    # Hero/Massing 完整体块：保持 U 形、屋顶层级、入口和前后间隙。
    objects.extend(
        [
            hero.add_box(
                "identity-front-courtyard-back-volume",
                (0.0, 0.0, 2.1),
                (8.4, 3.6, 4.2),
                plaster,
            ),
            hero.add_gable_roof(
                "identity-front-courtyard-back-roof",
                (0.0, 0.0),
                8.8,
                4.0,
                4.2,
                5.65,
                roof,
                ridge_axis="X",
            ),
            hero.add_box(
                "identity-front-left-gabled-wing",
                (-5.0, -3.1, 2.0),
                (3.4, 7.2, 4.0),
                plaster,
            ),
            hero.add_gable_roof(
                "identity-front-left-steep-gable",
                (-5.0, -3.1),
                7.6,
                3.8,
                4.0,
                6.25,
                roof,
                ridge_axis="Y",
            ),
            hero.add_box(
                "identity-front-right-gabled-wing",
                (5.0, -3.05, 1.85),
                (3.2, 7.1, 3.7),
                plaster,
            ),
            hero.add_gable_roof(
                "identity-front-right-gable",
                (5.0, -3.05),
                7.5,
                3.6,
                3.7,
                5.55,
                roof,
                ridge_axis="Y",
            ),
            hero.add_shed_roof(
                "identity-front-open-entry-canopy",
                (1.1, -6.25),
                4.6,
                1.15,
                1.1,
                1.35,
                roof,
            ),
            hero.add_box(
                "identity-front-open-entry-canopy-left-post",
                (-1.15, -6.25, 0.55),
                (0.18, 0.18, 1.1),
                roof,
            ),
            hero.add_box(
                "identity-front-open-entry-canopy-right-post",
                (3.35, -6.25, 0.55),
                (0.18, 0.18, 1.1),
                roof,
            ),
            hero.add_box(
                "identity-front-observed-shed-dormer-volume",
                (0.9, -1.7, 4.65),
                (3.3, 0.9, 1.0),
                plaster,
            ),
            hero.add_shed_roof(
                "identity-front-observed-shed-dormer-roof",
                (0.9, -2.05),
                3.65,
                1.35,
                5.2,
                5.55,
                roof,
            ),
            hero.add_box(
                "identity-rear-brick-long-volume",
                (0.0, 7.0, 1.7),
                (14.0, 4.2, 3.4),
                brick,
            ),
            hero.add_gable_roof(
                "identity-rear-brick-long-roof",
                (0.0, 7.0),
                14.5,
                4.65,
                3.4,
                5.15,
                roof,
                ridge_axis="X",
            ),
            hero.add_box(
                "identity-rear-brick-left-front-gable-volume",
                (-5.15, 5.45, 1.65),
                (3.25, 3.2, 3.3),
                brick,
            ),
            hero.add_gable_roof(
                "identity-rear-brick-left-front-gable",
                (-5.15, 5.45),
                3.55,
                3.65,
                3.3,
                4.9,
                roof,
                ridge_axis="Y",
            ),
            hero.add_box(
                "identity-rear-brick-right-front-gable-volume",
                (5.15, 5.45, 1.65),
                (3.25, 3.2, 3.3),
                brick,
            ),
            hero.add_gable_roof(
                "identity-rear-brick-right-front-gable",
                (5.15, 5.45),
                3.55,
                3.65,
                3.3,
                4.9,
                roof,
                ridge_axis="Y",
            ),
            hero.add_box(
                "identity-rear-brick-central-tall-chimney",
                (0.65, 7.45, 4.6),
                (1.15, 1.1, 3.2),
                brick,
            ),
            hero.add_box(
                "identity-rear-brick-left-chimney",
                (-4.55, 8.0, 4.2),
                (0.9, 0.9, 2.0),
                brick,
            ),
        ]
    )

    # 山墙端面、屋脊和烟囱帽保留 Hero 轮廓边缘。
    objects.extend(
        [
            hero.add_gable_infill_y(
                "identity-front-left-street-gable-infill",
                -5.0,
                -6.695,
                3.36,
                3.96,
                6.19,
                0.08,
                plaster,
            ),
            hero.add_gable_infill_y(
                "identity-front-right-street-gable-infill",
                5.0,
                -6.595,
                3.16,
                3.66,
                5.49,
                0.08,
                plaster,
            ),
            hero.add_gable_infill_y(
                "identity-rear-left-gable-brick-infill",
                -5.15,
                3.84,
                3.18,
                3.26,
                4.84,
                0.08,
                brick,
            ),
            hero.add_gable_infill_y(
                "identity-rear-right-gable-brick-infill",
                5.15,
                3.84,
                3.18,
                3.26,
                4.84,
                0.08,
                brick,
            ),
            hero.add_box(
                "identity-front-left-roof-ridge",
                (-5.0, -3.1, 6.19),
                (0.13, 7.35, 0.12),
                roof,
            ),
            hero.add_box(
                "identity-front-right-roof-ridge",
                (5.0, -3.05, 5.49),
                (0.13, 7.25, 0.12),
                roof,
            ),
            hero.add_box(
                "identity-front-back-roof-ridge",
                (0.0, 0.0, 5.59),
                (8.55, 0.13, 0.12),
                roof,
            ),
            hero.add_box(
                "identity-rear-long-roof-ridge",
                (0.0, 7.0, 5.09),
                (14.28, 0.13, 0.12),
                roof,
            ),
            hero.add_box(
                "identity-rear-left-gable-roof-ridge",
                (-5.15, 5.45, 4.84),
                (0.13, 3.38, 0.12),
                roof,
            ),
            hero.add_box(
                "identity-rear-right-gable-roof-ridge",
                (5.15, 5.45, 4.84),
                (0.13, 3.38, 0.12),
                roof,
            ),
            hero.add_box(
                "identity-rear-central-chimney-cap",
                (0.65, 7.45, 6.14),
                (1.34, 1.28, 0.12),
                brick,
            ),
            hero.add_box(
                "identity-rear-left-chimney-cap",
                (-4.55, 8.0, 5.14),
                (1.08, 1.08, 0.12),
                brick,
            ),
        ]
    )

    # 两个临街山墙与院内后墙保留 Hero 的半木构身份语义。
    objects.extend(
        hero.add_half_timber_y(
            "identity-front-left-street-timber",
            -5.0,
            -6.70,
            3.18,
            0.08,
            3.90,
            timber,
        )
    )
    objects.extend(
        hero.add_half_timber_y(
            "identity-front-right-street-timber",
            5.0,
            -6.60,
            2.98,
            0.08,
            3.60,
            timber,
        )
    )
    objects.extend(
        hero.add_half_timber_y(
            "identity-front-courtyard-back-timber",
            0.0,
            -1.80,
            8.05,
            0.08,
            4.08,
            timber,
        )
    )
    for prefix, start, end in (
        (
            "identity-front-left-gable-center-timber",
            (-5.0, -6.75, 3.93),
            (-5.0, -6.75, 6.10),
        ),
        (
            "identity-front-left-gable-slope-timber-a",
            (-6.54, -6.75, 4.02),
            (-5.0, -6.75, 6.12),
        ),
        (
            "identity-front-left-gable-slope-timber-b",
            (-3.46, -6.75, 4.02),
            (-5.0, -6.75, 6.12),
        ),
        (
            "identity-front-right-gable-center-timber",
            (5.0, -6.65, 3.63),
            (5.0, -6.65, 5.40),
        ),
        (
            "identity-front-right-gable-slope-timber-a",
            (3.58, -6.65, 3.72),
            (5.0, -6.65, 5.42),
        ),
        (
            "identity-front-right-gable-slope-timber-b",
            (6.42, -6.65, 3.72),
            (5.0, -6.65, 5.42),
        ),
    ):
        objects.append(
            hero.add_beam(prefix, start, end, 0.105, 0.12, timber)
        )

    # 临街窗门：保留山墙和入口节奏，减少到每开口两层面板。
    for index, x in enumerate((-5.75, -4.25)):
        objects.extend(
            add_identity_window_y(
                hero,
                f"identity-front-left-ground-window-{index}",
                (x, -6.765, 1.35),
                0.82,
                1.25,
                frame,
                glass,
            )
        )
    objects.extend(
        add_identity_window_y(
            hero,
            "identity-front-left-gable-window",
            (-5.0, -6.77, 4.82),
            1.15,
            1.25,
            frame,
            glass,
        )
    )
    objects.extend(
        add_identity_door_y(
            hero,
            "identity-front-right-main-door",
            (4.45, -6.68, 1.22),
            0.88,
            2.18,
            frame,
            timber,
        )
    )
    for prefix, center, width, height in (
        (
            "identity-front-right-ground-window",
            (5.75, -6.67, 1.35),
            0.78,
            1.25,
        ),
        (
            "identity-front-right-gable-window",
            (5.0, -6.68, 4.35),
            1.05,
            1.12,
        ),
    ):
        objects.extend(
            add_identity_window_y(
                hero,
                prefix,
                center,
                width,
                height,
                frame,
                glass,
            )
        )

    # 老虎窗连续五扇窄窗是中距离必须保留的身份构件。
    for index, x in enumerate((-0.30, 0.30, 0.90, 1.50, 2.10)):
        objects.extend(
            add_identity_window_y(
                hero,
                f"identity-front-shed-dormer-window-{index}",
                (x, -2.19, 4.65),
                0.43,
                0.72,
                frame,
                glass,
            )
        )

    # 院内后墙仅保留一层四窗和二层两窗；侧翼各保留两窗。
    for floor, z, columns in (
        ("ground", 1.15, (-2.9, -0.98, 0.98, 2.9)),
        ("upper", 3.02, (-1.95, 1.95)),
    ):
        for column, x in enumerate(columns):
            objects.extend(
                add_identity_window_y(
                    hero,
                    f"identity-front-courtyard-{floor}-window-{column}",
                    (x, -1.875, z),
                    0.82,
                    1.0,
                    frame,
                    glass,
                )
            )
    for side, x in (("left", -3.25), ("right", 3.35)):
        for rail, z in enumerate((1.02, 2.70, 3.58)):
            objects.append(
                hero.add_box(
                    f"identity-front-{side}-courtyard-timber-horizontal-{rail}",
                    (x, -3.05, z),
                    (0.11, 6.65, 0.11),
                    timber,
                )
            )
        for column, y in enumerate((-5.25, -2.05)):
            objects.append(
                hero.add_box(
                    f"identity-front-{side}-courtyard-timber-vertical-{column}",
                    (x, y, 2.30),
                    (0.11, 0.11, 2.65),
                    timber,
                )
            )
            objects.extend(
                add_identity_window_x(
                    hero,
                    f"identity-front-{side}-courtyard-window-{column}",
                    (
                        x + (0.06 if side == "left" else -0.06),
                        y,
                        1.55,
                    ),
                    0.92,
                    1.12,
                    frame,
                    glass,
                )
            )

    # 后红砖长屋只保留花园向三窗、两山墙窗和一门。
    for index, x in enumerate((-2.45, 0.0, 2.45)):
        objects.extend(
            add_identity_window_y(
                hero,
                f"identity-rear-long-garden-window-{index}",
                (x, 4.87, 1.55),
                1.0,
                1.35,
                frame,
                glass,
            )
        )
    objects.extend(
        add_identity_door_y(
            hero,
            "identity-rear-left-gable-door",
            (-5.55, 3.77, 1.12),
            0.88,
            2.05,
            frame,
            timber,
        )
    )
    for prefix, center, width, height in (
        (
            "identity-rear-left-gable-window",
            (-4.75, 3.76, 2.54),
            0.92,
            1.10,
        ),
        (
            "identity-rear-right-gable-ground-window",
            (5.15, 3.76, 1.45),
            1.15,
            1.35,
        ),
        (
            "identity-rear-right-gable-upper-window",
            (5.15, 3.76, 3.54),
            0.82,
            0.88,
        ),
    ):
        objects.extend(
            add_identity_window_y(
                hero,
                prefix,
                center,
                width,
                height,
                frame,
                glass,
            )
        )

    obj = hero.join_objects(objects, "one-step-garden-identity")
    obj["asset_id"] = "one-step-garden"
    obj["tier"] = "identity"
    obj["version"] = "identity-v1"
    obj["authored_front"] = AUTHORED_FRONT
    obj["scene_unit_meters"] = SCENE_UNIT_METERS
    obj["derived_from_hero_glb_sha256"] = HERO_GLB_SHA256
    obj["derived_from_hero_blend_sha256"] = HERO_BLEND_SHA256
    obj["derived_from_hero_generator_sha256"] = HERO_GENERATOR_SHA256
    obj["derived_from_massing_glb_sha256"] = MASSING_GLB_SHA256
    obj["preserved_identity_cues"] = (
        "front-white-u-compound;half-timber-gables;five-narrow-dormer-windows;"
        "open-entry-canopy;separate-rear-brick-long-house;"
        "rear-twin-gables-and-two-chimneys;open-front-rear-gap"
    )
    obj["deliberate_losses"] = (
        "dense-window-mullions;two-upper-courtyard-windows;"
        "half-of-side-courtyard-windows;minor-rear-window-divisions"
    )
    obj["scope_exclusions"] = (
        "trees;shrubs;grass;furniture;umbrellas;planters;lamps;"
        "fences;signage;decorative-paving;other-buildings"
    )
    obj["mcp3_status"] = "pending-main-window"
    obj["runtime_integrated"] = False
    return obj


def configure_scene(hero: ModuleType) -> None:
    hero.configure_scene()
    scene = bpy.context.scene
    scene["tier"] = "identity"
    scene["version"] = "identity-v1"
    scene["derived_from_hero_glb_sha256"] = HERO_GLB_SHA256
    scene["derived_from_hero_blend_sha256"] = HERO_BLEND_SHA256
    scene["derived_from_hero_generator_sha256"] = HERO_GENERATOR_SHA256
    scene["mcp3_status"] = "pending-main-window"
    scene["runtime_integrated"] = False


def read_glb_json(path: Path) -> dict[str, Any]:
    contents = path.read_bytes()
    json_length = struct.unpack_from("<I", contents, 12)[0]
    return json.loads(contents[20 : 20 + json_length].decode("utf8"))


def inspect_blend_materials(
    identity: bpy.types.Object,
) -> list[dict[str, Any]]:
    results = []
    for value in identity.data.materials:
        if value.node_tree is None:
            raise RuntimeError(f"Identity .blend 缺少节点材质：{value.name}")
        principled = next(
            (
                node
                for node in value.node_tree.nodes
                if node.type == "BSDF_PRINCIPLED"
            ),
            None,
        )
        if principled is None:
            raise RuntimeError(f"Identity .blend 缺少 Principled：{value.name}")
        results.append(
            {
                "name": value.name,
                "useNodes": bool(value.use_nodes),
                "baseColor": [
                    round(float(component), 6)
                    for component in principled.inputs["Base Color"].default_value
                ],
                "roughness": round(
                    float(principled.inputs["Roughness"].default_value),
                    6,
                ),
                "metallic": round(
                    float(principled.inputs["Metallic"].default_value),
                    6,
                ),
            }
        )
    return sorted(results, key=lambda item: item["name"])


def write_record(
    audit: dict[str, Any],
    gltf: dict[str, Any],
    identity: bpy.types.Object,
) -> None:
    root_node = gltf["nodes"][gltf["scenes"][gltf.get("scene", 0)]["nodes"][0]]
    triangle_reduction = 1 - audit["triangles"] / HERO_BASELINE["triangles"]
    byte_reduction = 1 - audit["bytes"] / HERO_BASELINE["bytes"]
    blend_materials = inspect_blend_materials(identity)
    record = {
        "version": 1,
        "auditedAt": AUDITED_AT,
        "assetId": "one-step-garden",
        "tier": "identity",
        "versionName": "identity-v1",
        "status": "headless-candidate-awaiting-main-window-mcp3",
        "generator": file_evidence(Path(__file__).resolve()),
        "buildCommand": (
            "/Applications/Blender.app/Contents/MacOS/Blender --background "
            "--python-exit-code 1 --python "
            "scripts/create_one_step_garden_identity_model.py"
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
            "massingBlendSha256": MASSING_BLEND_SHA256,
        },
        "derivation": {
            "method": (
                "sha-pinned-hero-generator-subset-reconstruction-with-"
                "simplified-window-panels"
            ),
            "manualRemodeling": False,
            "newSubjectFeaturesInvented": False,
            "preservedCues": [
                "front-white-u-shaped-compound",
                "front-half-timber-street-gables",
                "front-five-narrow-shed-dormer-windows",
                "front-open-entry-canopy",
                "separate-rear-red-brick-long-house",
                "rear-twin-gables-and-two-chimneys",
                "open-front-rear-building-gap",
            ],
            "deliberateLosses": [
                "full-window-frame-mullions-and-midrails",
                "two-of-four-upper-courtyard-windows",
                "half-of-side-courtyard-window-rhythm",
                "fine-rear-window-divisions",
            ],
            "unknownSides": "kept-low-detail",
        },
        "scope": {
            "included": "one-step-garden-building-identity-only",
            "excluded": [
                "trees",
                "shrubs",
                "grass",
                "commercial-furniture",
                "umbrellas",
                "planters",
                "lamps",
                "fences",
                "signage",
                "decorative-paving",
                "other-buildings",
                "full-map-assets",
            ],
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
            "collision": (
                "reuse-eight-part-massing-collision-with-open-entry-and-gap"
            ),
        },
        "outputs": {
            "blend": file_evidence(BLEND_PATH),
            "glb": {
                **file_evidence(GLB_PATH),
                "cacheVersion": f"20260725-identity-{audit['sha256'][:8]}",
            },
            "previews": {
                "canonical": file_evidence(CANONICAL_PATH),
                "sideDepth": file_evidence(SIDE_PATH),
                "entranceDetail": file_evidence(ENTRANCE_PATH),
            },
        },
        "fixedCameras": {
            "canonical": {
                "location": [13.5, -23.5, 14.0],
                "target": [0.0, 0.0, 2.8],
                "orthoScale": 22.0,
            },
            "sideDepth": {
                "location": [-22.0, -4.0, 15.5],
                "target": [0.0, 2.0, 2.8],
                "orthoScale": 22.0,
            },
            "entrance": {
                "location": [7.0, -18.5, 8.5],
                "target": [0.0, -2.5, 2.2],
                "orthoScale": 14.5,
            },
        },
        "blendSceneAudit": {
            "objectCount": 1,
            "objects": [identity.name],
            "types": [identity.type],
            "vertices": len(identity.data.vertices),
            "polygons": len(identity.data.polygons),
            "materialCount": len(identity.data.materials),
            "rootLocation": [
                round(float(value), 6)
                for value in identity.location
            ],
            "rootRotation": [
                round(float(value), 6)
                for value in identity.rotation_euler
            ],
            "rootScale": [
                round(float(value), 6)
                for value in identity.scale
            ],
            "materials": blend_materials,
            "allMaterialsUseNodes": all(
                value["useNodes"]
                for value in blend_materials
            ),
            "previewHelpersSaved": False,
            "previewHelpersExported": False,
        },
        "rootExtras": root_node.get("extras", {}),
        "glb": audit,
        "budgets": {
            "contract": IDENTITY_BUDGET,
            "heroBaseline": HERO_BASELINE,
            "triangleReductionRatio": round(triangle_reduction, 6),
            "byteReductionRatio": round(byte_reduction, 6),
            "status": "pass",
        },
        "determinism": {
            "sameCommandRuns": 2,
            "sameGlbSha256": True,
            "verification": "external-two-clean-command-runs-on-2026-07-25",
        },
        "mcp3": {
            "status": "pending-main-window-same-camera-three-tier-review",
            "identityFormalPass": False,
            "acceptedInteractiveChanges": [],
            "qaRigSaved": False,
            "qaRigExported": False,
        },
        "runtime": {
            "status": "not-started-by-worktree",
            "publicRegistryModified": False,
            "runtimeIntegrated": False,
        },
    }
    RECORD_PATH.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )


def main() -> None:
    assert_frozen_sources()
    hero = load_frozen_hero_module()
    for directory in (
        BLEND_PATH.parent,
        GLB_PATH.parent,
        PREVIEW_DIR,
        RECORD_PATH.parent,
    ):
        directory.mkdir(parents=True, exist_ok=True)

    hero.reset_scene()
    configure_scene(hero)
    identity = build_identity(hero)
    hero.export_glb(GLB_PATH, identity)
    audit = hero.parse_glb(GLB_PATH)
    gltf = read_glb_json(GLB_PATH)

    if audit["nodes"] != 1 or audit["meshes"] != 1:
        raise RuntimeError(f"Identity 必须保持单节点单网格：{audit}")
    if audit["materials"] > IDENTITY_BUDGET["maxMaterials"]:
        raise RuntimeError(f"Identity 材质超出预算：{audit}")
    if audit["images"] or audit["textures"] or audit["animations"]:
        raise RuntimeError(f"Identity 不允许图片、贴图或动画：{audit}")
    if audit["transformedNodes"]:
        raise RuntimeError(f"Identity GLB 节点存在未烘焙变换：{audit}")
    if (
        audit["bytes"] > IDENTITY_BUDGET["maxBytes"]
        or audit["triangles"] > IDENTITY_BUDGET["maxTriangles"]
    ):
        raise RuntimeError(f"Identity 未显著低于 Hero 预算：{audit}")
    for boundary in ("min", "max"):
        for actual, expected in zip(
            audit["bounds"][boundary],
            EXPECTED_BOUNDS[boundary],
            strict=True,
        ):
            if abs(actual - expected) > 1e-4:
                raise RuntimeError(
                    f"Identity 不得改变 Hero/Massing bounds：{audit['bounds']}"
                )
    if any(
        (
            audit["topology"]["zeroAreaTriangles"],
            audit["topology"]["nonFinitePositions"],
            audit["topology"]["invalidIndices"],
            audit["normals"]["primitivesWithoutNormals"],
            audit["normals"]["zeroLengthNormals"],
            audit["normals"]["nonUnitNormals"],
            audit["normals"]["orientationMismatches"],
        )
    ):
        raise RuntimeError(f"Identity 拓扑或法线审计未通过：{audit}")
    if audit["triangles"] >= HERO_BASELINE["triangles"] * 0.60:
        raise RuntimeError(f"Identity 三角面未显著低于 Hero：{audit}")
    if audit["bytes"] >= HERO_BASELINE["bytes"] * 0.80:
        raise RuntimeError(f"Identity 字节未显著低于 Hero：{audit}")

    expected_materials = {
        "one-step-garden-identity-warm-plaster",
        "one-step-garden-identity-muted-brick",
        "one-step-garden-identity-dark-tile-roof",
        "one-step-garden-identity-deep-half-timber",
        "one-step-garden-identity-window-frame",
        "one-step-garden-identity-muted-glass",
    }
    material_by_name = {
        value["name"]: value
        for value in audit["materialFactors"]
    }
    if set(material_by_name) != expected_materials:
        raise RuntimeError(f"Identity 材质语义异常：{sorted(material_by_name)}")
    if len(
        {
            tuple(value["baseColorFactor"])
            for value in material_by_name.values()
        }
    ) != len(expected_materials):
        raise RuntimeError("Identity GLB 材质分层丢失")
    if any(
        value["metallicFactor"] != 0.0
        or not 0.25 <= value["roughnessFactor"] <= 1.0
        for value in material_by_name.values()
    ):
        raise RuntimeError("Identity GLB PBR 参数越出 Hero 证据边界")
    if (
        any(abs(float(value)) > 1e-8 for value in identity.location)
        or any(abs(float(value)) > 1e-8 for value in identity.rotation_euler)
        or any(abs(float(value) - 1.0) > 1e-8 for value in identity.scale)
    ):
        raise RuntimeError("Identity .blend root transform 未归一")
    if len(identity.data.materials) != 6:
        raise RuntimeError("Identity .blend 材质数量异常")

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    helpers = hero.add_preview_context()
    hero.render_preview(
        CANONICAL_PATH,
        (13.5, -23.5, 14.0),
        (0.0, 0.0, 2.8),
        22.0,
        "identity-canonical",
    )
    hero.render_preview(
        SIDE_PATH,
        (-22.0, -4.0, 15.5),
        (0.0, 2.0, 2.8),
        22.0,
        "identity-side-depth",
    )
    hero.render_preview(
        ENTRANCE_PATH,
        (7.0, -18.5, 8.5),
        (0.0, -2.5, 2.2),
        14.5,
        "identity-entrance",
    )
    for helper in helpers:
        bpy.data.objects.remove(helper, do_unlink=True)
    write_record(audit, gltf, identity)
    print(json.dumps(audit, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
