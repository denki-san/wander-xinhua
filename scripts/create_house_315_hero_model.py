"""从已通过地图门的 Massing 合同确定性生成 House315 Hero v2 候选。"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import math
from pathlib import Path
import struct
from typing import Any

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
AUDITED_AT = "2026-07-25"
MASSING_GENERATOR_PATH = ROOT / "scripts/create_house_315_massing_model.py"
MASSING_BLEND_PATH = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/massing-v2"
    / "house-315-massing.blend"
)
MASSING_GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/massing-v2"
    / "house-315-massing.glb"
)
MASSING_RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/massing-v2"
    / "house-315-massing.json"
)
MASSING_MAP_QA_PATH = ROOT / "docs/research/house-315-massing-map-qa.json"
MASSING_GENERATOR_SHA256 = (
    "45c69f7f20d412de3f8f6dd1afef679d4dff81db2e4c0675089f4f6c6af492cf"
)
MASSING_BLEND_SHA256 = (
    "dccd5ad4a5b47e56c08e19be53446a6cb3eb43dc17dc5e10231018a5206b532b"
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
BLEND_PATH = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/hero-v2"
    / "house-315-hero.blend"
)
GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/hero-v2"
    / "house-315-hero.glb"
)
FIRST_BUILD_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/hero-v2"
    / "test_house-315-hero-first.glb"
)
PREVIEW_DIR = ROOT / "test_artifacts/all-models/hero-v2/house-315"
CANONICAL_PATH = PREVIEW_DIR / "test_house-315-hero-v2-canonical.png"
SIDE_PATH = PREVIEW_DIR / "test_house-315-hero-v2-side-depth.png"
ENTRANCE_PATH = PREVIEW_DIR / "test_house-315-hero-v2-entrance.png"
RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/hero-v2"
    / "house-315-hero.json"
)

RUNTIME_POSITION = [-23.03, 85.67]
RUNTIME_YAW = -0.38
RUNTIME_SCALE = 0.9
AUTHORED_FRONT = "local-negative-y"
SCENE_UNIT_METERS = 2.7
HUMAN_METERS = 1.8
HUMAN_SCENE_UNITS = HUMAN_METERS / SCENE_UNIT_METERS
EXPECTED_BOUNDS = {
    "min": [-7.675, 0.0, -4.575],
    "max": [7.225, 6.982892, 4.84],
}
EXPECTED_MATERIAL_NAMES = {
    "house-315-hero-warm-roughcast",
    "house-315-hero-muted-red-brick",
    "house-315-hero-dark-red-tile",
    "house-315-hero-deep-half-timber",
    "house-315-hero-muted-glass",
    "house-315-hero-entrance-shadow",
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


def load_massing_generator() -> Any:
    spec = importlib.util.spec_from_file_location(
        "house_315_massing_source",
        MASSING_GENERATOR_PATH,
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("无法加载 House315 Massing generator")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


MASSING = load_massing_generator()


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def configure_material(
    surface: bpy.types.Material,
    name: str,
    color: tuple[float, float, float, float],
    *,
    roughness: float,
    metallic: float = 0.0,
) -> bpy.types.Material:
    surface.name = name
    surface.use_nodes = True
    surface.diffuse_color = color
    surface.roughness = roughness
    surface.metallic = metallic
    principled = next(
        (
            node
            for node in surface.node_tree.nodes
            if node.type == "BSDF_PRINCIPLED"
        ),
        None,
    )
    if principled is None:
        raise RuntimeError(f"{name} 缺少 Principled BSDF")
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = metallic
    return surface


def make_material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    roughness: float,
    metallic: float = 0.0,
) -> bpy.types.Material:
    return configure_material(
        bpy.data.materials.new(name),
        name,
        color,
        roughness=roughness,
        metallic=metallic,
    )


def add_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    surface: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    if any(value <= 0 for value in dimensions):
        raise ValueError(f"{name} 不能使用非正尺寸：{dimensions}")
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.data.materials.append(surface)
    return obj


def add_beam_between(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    thickness: float,
    surface: bpy.types.Material,
) -> bpy.types.Object:
    start_value = Vector(start)
    end_value = Vector(end)
    direction = end_value - start_value
    if direction.length <= 1e-6:
        raise ValueError(f"{name} 梁长为0")
    midpoint = (start_value + end_value) / 2
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=midpoint)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = (thickness, thickness, direction.length)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.data.materials.append(surface)
    return obj


def add_front_window(
    prefix: str,
    x: float,
    front_y: float,
    z: float,
    width: float,
    height: float,
    frame: bpy.types.Material,
    glass: bpy.types.Material,
    *,
    mullions: int = 1,
) -> list[bpy.types.Object]:
    depth = 0.035
    rail = 0.065
    objects = [
        add_box(
            f"{prefix}-glass",
            (x, front_y, z),
            (width, depth, height),
            glass,
        ),
        add_box(
            f"{prefix}-frame-left",
            (x - width / 2, front_y - 0.025, z),
            (rail, depth, height + rail),
            frame,
        ),
        add_box(
            f"{prefix}-frame-right",
            (x + width / 2, front_y - 0.025, z),
            (rail, depth, height + rail),
            frame,
        ),
        add_box(
            f"{prefix}-frame-top",
            (x, front_y - 0.025, z + height / 2),
            (width + rail, depth, rail),
            frame,
        ),
        add_box(
            f"{prefix}-frame-bottom",
            (x, front_y - 0.025, z - height / 2),
            (width + rail, depth, rail),
            frame,
        ),
        add_box(
            f"{prefix}-frame-horizontal",
            (x, front_y - 0.03, z),
            (width, depth, rail * 0.72),
            frame,
        ),
    ]
    for index in range(mullions):
        offset = width * (index + 1) / (mullions + 1) - width / 2
        objects.append(
            add_box(
                f"{prefix}-mullion-{index}",
                (x + offset, front_y - 0.03, z),
                (rail * 0.72, depth, height),
                frame,
            )
        )
    return objects


def add_side_window(
    prefix: str,
    side_x: float,
    y: float,
    z: float,
    width: float,
    height: float,
    frame: bpy.types.Material,
    glass: bpy.types.Material,
) -> list[bpy.types.Object]:
    depth = 0.035
    rail = 0.065
    objects = [
        add_box(
            f"{prefix}-glass",
            (side_x, y, z),
            (depth, width, height),
            glass,
        ),
        add_box(
            f"{prefix}-frame-front",
            (side_x + 0.025, y - width / 2, z),
            (depth, rail, height + rail),
            frame,
        ),
        add_box(
            f"{prefix}-frame-rear",
            (side_x + 0.025, y + width / 2, z),
            (depth, rail, height + rail),
            frame,
        ),
        add_box(
            f"{prefix}-frame-top",
            (side_x + 0.025, y, z + height / 2),
            (depth, width + rail, rail),
            frame,
        ),
        add_box(
            f"{prefix}-frame-bottom",
            (side_x + 0.025, y, z - height / 2),
            (depth, width + rail, rail),
            frame,
        ),
        add_box(
            f"{prefix}-mullion",
            (side_x + 0.03, y, z),
            (depth, rail * 0.72, height),
            frame,
        ),
    ]
    return objects


def roof_height(
    offset: float,
    half_span: float,
    eave_z: float,
    ridge_z: float,
) -> float:
    return eave_z + (ridge_z - eave_z) * (
        1.0 - abs(offset) / half_span
    )


def add_roof_ribs_axis_x(
    prefix: str,
    center: tuple[float, float],
    length: float,
    span: float,
    eave_z: float,
    ridge_z: float,
    surface: bpy.types.Material,
    *,
    count: int,
) -> list[bpy.types.Object]:
    cx, cy = center
    half_span = span / 2
    outer = half_span - 0.18
    inner = 0.14
    objects: list[bpy.types.Object] = []
    for index in range(count):
        x = cx - length / 2 + 0.32 + (length - 0.64) * index / (count - 1)
        for side, sign in (("front", -1.0), ("rear", 1.0)):
            outer_y = cy + sign * outer
            inner_y = cy + sign * inner
            objects.append(
                add_beam_between(
                    f"{prefix}-{side}-rib-{index}",
                    (
                        x,
                        outer_y,
                        roof_height(
                            outer,
                            half_span,
                            eave_z,
                            ridge_z,
                        )
                        + 0.025,
                    ),
                    (
                        x,
                        inner_y,
                        roof_height(
                            inner,
                            half_span,
                            eave_z,
                            ridge_z,
                        )
                        + 0.025,
                    ),
                    0.035,
                    surface,
                )
            )
    objects.append(
        add_box(
            f"{prefix}-ridge",
            (cx, cy, ridge_z - 0.02),
            (length - 0.28, 0.055, 0.055),
            surface,
        )
    )
    return objects


def add_roof_ribs_axis_y(
    prefix: str,
    center: tuple[float, float],
    length: float,
    span: float,
    eave_z: float,
    ridge_z: float,
    surface: bpy.types.Material,
    *,
    count: int,
) -> list[bpy.types.Object]:
    cx, cy = center
    half_span = span / 2
    outer = half_span - 0.18
    inner = 0.14
    objects: list[bpy.types.Object] = []
    for index in range(count):
        y = cy - length / 2 + 0.32 + (length - 0.64) * index / (count - 1)
        for side, sign in (("left", -1.0), ("right", 1.0)):
            outer_x = cx + sign * outer
            inner_x = cx + sign * inner
            objects.append(
                add_beam_between(
                    f"{prefix}-{side}-rib-{index}",
                    (
                        outer_x,
                        y,
                        roof_height(
                            outer,
                            half_span,
                            eave_z,
                            ridge_z,
                        )
                        + 0.025,
                    ),
                    (
                        inner_x,
                        y,
                        roof_height(
                            inner,
                            half_span,
                            eave_z,
                            ridge_z,
                        )
                        + 0.025,
                    ),
                    0.035,
                    surface,
                )
            )
    objects.append(
        add_box(
            f"{prefix}-ridge",
            (cx, cy, ridge_z - 0.02),
            (0.055, length - 0.28, 0.055),
            surface,
        )
    )
    return objects


def configure_shell_materials(
    shell: bpy.types.Object,
) -> dict[str, bpy.types.Material]:
    mapping = {
        "house-315-massing-warm-roughcast": (
            "house-315-hero-warm-roughcast",
            (0.73, 0.69, 0.60, 1.0),
            0.9,
        ),
        "house-315-massing-muted-red-brick": (
            "house-315-hero-muted-red-brick",
            (0.42, 0.18, 0.12, 1.0),
            0.88,
        ),
        "house-315-massing-muted-red-tile": (
            "house-315-hero-dark-red-tile",
            (0.30, 0.085, 0.055, 1.0),
            0.78,
        ),
        "house-315-massing-dark-timber": (
            "house-315-hero-deep-half-timber",
            (0.055, 0.045, 0.038, 1.0),
            0.76,
        ),
    }
    values: dict[str, bpy.types.Material] = {}
    for surface in shell.data.materials:
        if surface.name not in mapping:
            raise RuntimeError(f"未知 Massing 材质：{surface.name}")
        name, color, roughness = mapping[surface.name]
        values[name] = configure_material(
            surface,
            name,
            color,
            roughness=roughness,
        )
    return values


def build_model() -> tuple[bpy.types.Object, list[str]]:
    """复用已验收 Massing source，增加证据支持的建筑细节。"""

    shell = MASSING.build_model()
    materials = configure_shell_materials(shell)
    plaster = materials["house-315-hero-warm-roughcast"]
    brick = materials["house-315-hero-muted-red-brick"]
    roof = materials["house-315-hero-dark-red-tile"]
    timber = materials["house-315-hero-deep-half-timber"]
    glass = make_material(
        "house-315-hero-muted-glass",
        (0.16, 0.24, 0.23, 1.0),
        roughness=0.38,
    )
    shadow = make_material(
        "house-315-hero-entrance-shadow",
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

    # 中央高山墙：入口、上层小窗和更完整的半木构分格。
    central_x = -1.9
    central_wall_front = -4.575
    include(
        add_front_window(
            "house315-central-tall-entry",
            central_x,
            central_wall_front,
            1.8,
            1.06,
            2.55,
            timber,
            shadow,
            mullions=2,
        )
    )
    include(
        add_front_window(
            "house315-central-left-window",
            central_x - 1.58,
            central_wall_front,
            2.05,
            0.78,
            1.16,
            timber,
            glass,
        )
    )
    include(
        add_front_window(
            "house315-central-right-window",
            central_x + 1.56,
            central_wall_front,
            2.05,
            0.78,
            1.16,
            timber,
            glass,
        )
    )
    include(
        add_front_window(
            "house315-central-upper-window",
            central_x,
            -4.785,
            5.25,
            0.84,
            0.62,
            timber,
            glass,
        )
    )
    include(
        add_box(
            "house315-address-binding-unlettered-plaque",
            (central_x + 0.82, central_wall_front - 0.035, 1.18),
            (0.28, 0.025, 0.2),
            plaster,
        )
    )
    for name, z, width in (
        ("lower", 4.18, 4.05),
        ("upper", 4.82, 3.12),
    ):
        include(
            add_box(
                f"house315-central-timber-{name}-horizontal",
                (central_x, -4.815, z),
                (width, 0.045, 0.075),
                timber,
            )
        )
    for index, x in enumerate((central_x - 1.28, central_x + 1.28)):
        include(
            add_box(
                f"house315-central-timber-post-{index}",
                (x, -4.815, 4.28),
                (0.075, 0.045, 1.22),
                timber,
            )
        )
    include(
        add_beam_between(
            "house315-central-timber-brace-left",
            (central_x - 1.9, -4.8, 3.72),
            (central_x - 0.22, -4.8, 4.78),
            0.07,
            timber,
        )
    )
    include(
        add_beam_between(
            "house315-central-timber-brace-right",
            (central_x + 1.9, -4.8, 3.72),
            (central_x + 0.22, -4.8, 4.78),
            0.07,
            timber,
        )
    )

    # 临街可见的上白下红开口节奏；隐藏背面不添加细节。
    for index, x in enumerate((-5.95, -5.05, 1.35, 2.25)):
        include(
            add_front_window(
                f"house315-main-spine-front-window-{index}",
                x,
                -2.18,
                1.92,
                0.62,
                1.05,
                timber,
                glass,
            )
        )
    for index, x in enumerate((4.35, 5.95)):
        include(
            add_front_window(
                f"house315-right-wing-front-window-{index}",
                x,
                -3.105,
                1.92,
                0.68,
                1.12,
                timber,
                glass,
            )
        )
    include(
        add_front_window(
            "house315-right-wing-gable-window",
            5.15,
            -3.305,
            4.05,
            0.72,
            0.72,
            timber,
            glass,
        )
    )
    for index, y in enumerate((-1.6, 0.15, 1.9)):
        include(
            add_side_window(
                f"house315-right-wing-side-window-{index}",
                7.055,
                y,
                1.9,
                0.74,
                1.08,
                timber,
                glass,
            )
        )

    # 俯瞰可见的长条棚屋形老虎窗，仅在主屋正坡增加低细节实体。
    include(
        add_box(
            "house315-main-shed-dormer-body",
            (2.0, -1.76, 4.1),
            (2.28, 0.58, 0.72),
            plaster,
        )
    )
    include(
        add_box(
            "house315-main-shed-dormer-roof",
            (2.0, -1.72, 4.49),
            (2.52, 0.82, 0.11),
            roof,
            rotation=(math.radians(-8.0), 0.0, 0.0),
        )
    )
    for index, x in enumerate((1.45, 2.0, 2.55)):
        include(
            add_front_window(
                f"house315-main-shed-dormer-window-{index}",
                x,
                -2.065,
                4.08,
                0.36,
                0.4,
                timber,
                glass,
                mullions=0,
            )
        )

    # Aerial 可见烟囱；不增加无证的背立面开口或场地构件。
    include(
        add_box(
            "house315-main-chimney",
            (3.35, 1.32, 5.45),
            (0.54, 0.54, 1.62),
            brick,
        )
    )
    include(
        add_box(
            "house315-main-chimney-cap",
            (3.35, 1.32, 6.28),
            (0.66, 0.66, 0.1),
            roof,
        )
    )

    # 屋面只加细瓦垄和屋脊，不改变 Massing 的外包络。
    include(
        add_roof_ribs_axis_x(
            "house315-main-roof-detail",
            (0.0, 0.55),
            13.9,
            5.9,
            3.05,
            5.75,
            roof,
            count=18,
        )
    )
    include(
        add_roof_ribs_axis_y(
            "house315-central-roof-detail",
            (-1.9, -0.95),
            7.65,
            5.6,
            3.65,
            6.95,
            roof,
            count=12,
        )
    )
    include(
        add_roof_ribs_axis_y(
            "house315-right-wing-roof-detail",
            (5.15, 0.65),
            7.85,
            4.15,
            3.0,
            5.55,
            roof,
            count=11,
        )
    )
    include(
        add_roof_ribs_axis_x(
            "house315-left-wing-roof-detail",
            (-5.35, 2.25),
            4.65,
            4.6,
            2.55,
            4.45,
            roof,
            count=8,
        )
    )

    # 建筑附着檐口线，保持在已验收包络内。
    include(
        add_box(
            "house315-main-front-eave-shadow",
            (0.0, -2.42, 3.035),
            (13.65, 0.055, 0.075),
            timber,
        )
    )
    include(
        add_box(
            "house315-central-front-eave-shadow",
            (-1.9, -4.805, 3.64),
            (5.38, 0.055, 0.075),
            timber,
        )
    )
    include(
        add_box(
            "house315-right-front-eave-shadow",
            (5.15, -3.285, 2.99),
            (4.02, 0.055, 0.075),
            timber,
        )
    )

    hero = MASSING.join_objects(objects, "house-315-hero")
    hero["stable_asset_id"] = "house-315"
    hero["tier"] = "hero"
    hero["version_name"] = "hero-v2"
    hero["authored_front"] = AUTHORED_FRONT
    hero["scene_unit_meters"] = SCENE_UNIT_METERS
    hero["derived_from_massing_glb_sha256"] = MASSING_GLB_SHA256
    hero["not_derived_from"] = (
        "legacy-hero;recovery-voxel-massing;ordinary-osm"
    )
    hero["subject_specific_cues"] = (
        "central-tall-half-timber-gable;transverse-main-ridge;"
        "asymmetric-right-long-and-left-short-wings;"
        "white-over-red-facade;tall-central-entrance"
    )
    hero["hidden_rear_detail"] = "unknown-low-detail"
    hero["street_gate_and_text_plaque"] = "omitted"
    hero["identity_allowed"] = False
    return hero, component_names


def configure_scene() -> None:
    MASSING.configure_scene()
    scene = bpy.context.scene
    scene["tier"] = "hero"
    scene["version_name"] = "hero-v2"
    scene["derived_from_massing_glb_sha256"] = MASSING_GLB_SHA256
    scene["massing_mcp1"] = "pass"
    scene["massing_map_gate"] = "formal-pass"
    scene["hero_mcp2"] = "pending-main-window"
    scene["identity_allowed"] = False
    scene["public_registry_modified"] = False


def export_glb(path: Path, obj: bpy.types.Object) -> None:
    MASSING.export_glb(path, obj)


COMPONENT_COUNTS = {
    "SCALAR": 1,
    "VEC2": 2,
    "VEC3": 3,
    "VEC4": 4,
}
COMPONENT_BYTES = {
    5120: 1,
    5121: 1,
    5122: 2,
    5123: 2,
    5125: 4,
    5126: 4,
}


def read_component(
    data: memoryview,
    offset: int,
    component_type: int,
) -> int | float:
    formats = {
        5120: "<b",
        5121: "<B",
        5122: "<h",
        5123: "<H",
        5125: "<I",
        5126: "<f",
    }
    return struct.unpack_from(formats[component_type], data, offset)[0]


def read_accessor(
    gltf: dict[str, Any],
    binary: memoryview,
    accessor_index: int,
) -> list[tuple[int | float, ...]]:
    accessor = gltf["accessors"][accessor_index]
    if "sparse" in accessor:
        raise RuntimeError("Hero v2 审计不支持 sparse accessor")
    view = gltf["bufferViews"][accessor["bufferView"]]
    component_count = COMPONENT_COUNTS[accessor["type"]]
    component_bytes = COMPONENT_BYTES[accessor["componentType"]]
    stride = view.get("byteStride", component_count * component_bytes)
    base = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    return [
        tuple(
            read_component(
                binary,
                base + item * stride + component * component_bytes,
                accessor["componentType"],
            )
            for component in range(component_count)
        )
        for item in range(accessor["count"])
    ]


def subtract(
    left: tuple[int | float, ...],
    right: tuple[int | float, ...],
) -> tuple[float, float, float]:
    return tuple(
        float(left[index]) - float(right[index])
        for index in range(3)
    )


def cross(
    left: tuple[float, float, float],
    right: tuple[float, float, float],
) -> tuple[float, float, float]:
    return (
        left[1] * right[2] - left[2] * right[1],
        left[2] * right[0] - left[0] * right[2],
        left[0] * right[1] - left[1] * right[0],
    )


def vector_length(value: tuple[float, float, float]) -> float:
    return math.sqrt(sum(component * component for component in value))


def parse_glb(path: Path) -> dict[str, Any]:
    contents = path.read_bytes()
    if contents[:4] != b"glTF" or struct.unpack_from("<I", contents, 4)[0] != 2:
        raise RuntimeError(f"{path} 不是 glTF 2.0")
    json_length = struct.unpack_from("<I", contents, 12)[0]
    gltf = json.loads(contents[20 : 20 + json_length].decode("utf8"))
    binary_header = 20 + json_length
    binary_length = struct.unpack_from("<I", contents, binary_header)[0]
    binary = memoryview(contents)[
        binary_header + 8 : binary_header + 8 + binary_length
    ]
    triangles = 0
    zero_area_triangles = 0
    non_finite_positions = 0
    invalid_indices = 0
    primitives_without_normals = 0
    zero_length_normals = 0
    non_unit_normals = 0
    orientation_mismatches = 0
    bounds_min = [math.inf, math.inf, math.inf]
    bounds_max = [-math.inf, -math.inf, -math.inf]
    material_factors: list[dict[str, Any]] = []
    for surface in gltf.get("materials", []):
        pbr = surface.get("pbrMetallicRoughness", {})
        material_factors.append(
            {
                "name": surface.get("name", "(unnamed)"),
                "baseColorFactor": [
                    round(float(component), 6)
                    for component in pbr.get(
                        "baseColorFactor",
                        [1.0, 1.0, 1.0, 1.0],
                    )
                ],
                "roughnessFactor": round(
                    float(pbr.get("roughnessFactor", 1.0)),
                    6,
                ),
                "metallicFactor": round(
                    float(pbr.get("metallicFactor", 1.0)),
                    6,
                ),
            }
        )
    for mesh in gltf.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            if primitive.get("mode", 4) != 4:
                raise RuntimeError("Hero v2 只允许 TRIANGLES primitive")
            positions = read_accessor(
                gltf,
                binary,
                primitive["attributes"]["POSITION"],
            )
            normals = (
                read_accessor(
                    gltf,
                    binary,
                    primitive["attributes"]["NORMAL"],
                )
                if "NORMAL" in primitive["attributes"]
                else None
            )
            if normals is None:
                primitives_without_normals += 1
            else:
                for normal in normals:
                    magnitude = vector_length(
                        tuple(float(component) for component in normal)
                    )
                    if magnitude <= 1e-8:
                        zero_length_normals += 1
                    elif abs(magnitude - 1.0) > 1e-4:
                        non_unit_normals += 1
            if "indices" in primitive:
                indices = [
                    int(value[0])
                    for value in read_accessor(
                        gltf,
                        binary,
                        primitive["indices"],
                    )
                ]
            else:
                indices = list(range(len(positions)))
            for position in positions:
                if any(not math.isfinite(float(value)) for value in position):
                    non_finite_positions += 1
            for index in range(0, len(indices), 3):
                triangle = indices[index : index + 3]
                if len(triangle) != 3 or any(
                    value < 0 or value >= len(positions)
                    for value in triangle
                ):
                    invalid_indices += 1
                    continue
                triangles += 1
                first, second, third = [
                    positions[value]
                    for value in triangle
                ]
                face = cross(
                    subtract(second, first),
                    subtract(third, first),
                )
                double_area = vector_length(face)
                if double_area <= 1e-10:
                    zero_area_triangles += 1
                    continue
                if normals is not None:
                    average_normal = tuple(
                        float(
                            sum(normals[value][axis] for value in triangle)
                        )
                        for axis in range(3)
                    )
                    average_length = vector_length(average_normal)
                    if average_length > 1e-8:
                        alignment = sum(
                            face[axis] * average_normal[axis]
                            for axis in range(3)
                        ) / (double_area * average_length)
                        if alignment < -1e-4:
                            orientation_mismatches += 1
            accessor = gltf["accessors"][primitive["attributes"]["POSITION"]]
            for axis in range(3):
                bounds_min[axis] = min(
                    bounds_min[axis],
                    accessor["min"][axis],
                )
                bounds_max[axis] = max(
                    bounds_max[axis],
                    accessor["max"][axis],
                )
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
        "primitives": sum(
            len(mesh.get("primitives", []))
            for mesh in gltf.get("meshes", [])
        ),
        "materials": len(gltf.get("materials", [])),
        "images": len(gltf.get("images", [])),
        "textures": len(gltf.get("textures", [])),
        "animations": len(gltf.get("animations", [])),
        "skins": len(gltf.get("skins", [])),
        "triangles": triangles,
        "topology": {
            "zeroAreaTriangles": zero_area_triangles,
            "nonFinitePositions": non_finite_positions,
            "invalidIndices": invalid_indices,
        },
        "normals": {
            "primitivesWithoutNormals": primitives_without_normals,
            "zeroLengthNormals": zero_length_normals,
            "nonUnitNormals": non_unit_normals,
            "orientationMismatches": orientation_mismatches,
        },
        "bounds": {
            "min": [round(value, 6) for value in bounds_min],
            "max": [round(value, 6) for value in bounds_max],
        },
        "materialFactors": material_factors,
        "transformedNodes": transformed_nodes,
    }


def inspect_blend_scene(obj: bpy.types.Object) -> dict[str, Any]:
    mesh = obj.data
    mesh.calc_loop_triangles()
    zero_area_polygons = sum(
        1 for polygon in mesh.polygons if polygon.area <= 1e-10
    )
    zero_area_triangles = 0
    non_finite_positions = 0
    non_finite_normals = 0
    orientation_mismatches = 0
    for vertex in mesh.vertices:
        if any(not math.isfinite(value) for value in vertex.co):
            non_finite_positions += 1
    for polygon in mesh.polygons:
        if any(not math.isfinite(value) for value in polygon.normal):
            non_finite_normals += 1
    for triangle in mesh.loop_triangles:
        first, second, third = [
            mesh.vertices[index].co
            for index in triangle.vertices
        ]
        face = (second - first).cross(third - first)
        if face.length <= 1e-10:
            zero_area_triangles += 1
            continue
        if face.normalized().dot(mesh.polygons[triangle.polygon_index].normal) < -1e-4:
            orientation_mismatches += 1
    bounds_min = [math.inf, math.inf, math.inf]
    bounds_max = [-math.inf, -math.inf, -math.inf]
    for vertex in mesh.vertices:
        value = obj.matrix_world @ vertex.co
        for axis in range(3):
            bounds_min[axis] = min(bounds_min[axis], value[axis])
            bounds_max[axis] = max(bounds_max[axis], value[axis])
    return {
        "objectCount": len(bpy.context.scene.objects),
        "meshObjects": len(
            [
                value
                for value in bpy.context.scene.objects
                if value.type == "MESH"
            ]
        ),
        "rootName": obj.name,
        "rootLocation": [round(value, 9) for value in obj.location],
        "rootRotationEuler": [
            round(value, 9) for value in obj.rotation_euler
        ],
        "rootScale": [round(value, 9) for value in obj.scale],
        "vertices": len(mesh.vertices),
        "polygons": len(mesh.polygons),
        "loopTriangles": len(mesh.loop_triangles),
        "materials": len(mesh.materials),
        "bounds": {
            "min": [round(value, 6) for value in bounds_min],
            "max": [round(value, 6) for value in bounds_max],
        },
        "zeroAreaPolygonsBelow1e10": zero_area_polygons,
        "zeroAreaTrianglesBelow1e10": zero_area_triangles,
        "nonFinitePositions": non_finite_positions,
        "nonFinitePolygonNormals": non_finite_normals,
        "trianglePolygonOrientationMismatches": orientation_mismatches,
        "previewHelpersSaved": False,
    }


def validate_audit(audit: dict[str, Any]) -> None:
    if audit["nodes"] != 1 or audit["meshes"] != 1:
        raise RuntimeError(f"Hero v2 必须为单节点单网格：{audit}")
    if audit["materials"] != len(EXPECTED_MATERIAL_NAMES):
        raise RuntimeError(f"Hero v2 材质数量异常：{audit}")
    names = {
        value["name"]
        for value in audit["materialFactors"]
    }
    if names != EXPECTED_MATERIAL_NAMES:
        raise RuntimeError(f"Hero v2 材质名称异常：{sorted(names)}")
    if (
        audit["images"]
        or audit["textures"]
        or audit["animations"]
        or audit["skins"]
    ):
        raise RuntimeError(f"Hero v2 不允许图片、贴图、动画或骨骼：{audit}")
    if audit["transformedNodes"]:
        raise RuntimeError(f"Hero v2 节点存在未烘焙 transform：{audit}")
    if audit["bytes"] > 3_500_000 or audit["triangles"] > 45_000:
        raise RuntimeError(f"Hero v2 超出预算：{audit}")
    for boundary in ("min", "max"):
        for actual, expected in zip(
            audit["bounds"][boundary],
            EXPECTED_BOUNDS[boundary],
            strict=True,
        ):
            if abs(actual - expected) > 1e-4:
                raise RuntimeError(
                    f"Hero v2 不得改变 Massing bounds：{audit['bounds']}"
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
        raise RuntimeError(f"Hero v2 拓扑或法线审计未通过：{audit}")


def validate_blend_audit(audit: dict[str, Any]) -> None:
    if audit["objectCount"] != 1 or audit["meshObjects"] != 1:
        raise RuntimeError(f"Hero v2 `.blend` 场景不纯净：{audit}")
    if (
        audit["rootLocation"] != [0.0, 0.0, 0.0]
        or audit["rootRotationEuler"] != [0.0, 0.0, 0.0]
        or audit["rootScale"] != [1.0, 1.0, 1.0]
    ):
        raise RuntimeError(f"Hero v2 `.blend` 根变换未归一：{audit}")
    if any(
        (
            audit["zeroAreaPolygonsBelow1e10"],
            audit["zeroAreaTrianglesBelow1e10"],
            audit["nonFinitePositions"],
            audit["nonFinitePolygonNormals"],
            audit["trianglePolygonOrientationMismatches"],
        )
    ):
        raise RuntimeError(f"Hero v2 `.blend` 拓扑未通过：{audit}")


def preflight() -> None:
    expected = {
        MASSING_GENERATOR_PATH: MASSING_GENERATOR_SHA256,
        MASSING_BLEND_PATH: MASSING_BLEND_SHA256,
        MASSING_GLB_PATH: MASSING_GLB_SHA256,
        LEGACY_BLEND_PATH: LEGACY_BLEND_SHA256,
        LEGACY_GLB_PATH: LEGACY_GLB_SHA256,
    }
    for path, sha256 in expected.items():
        if not path.exists() or file_sha256(path) != sha256:
            raise RuntimeError(f"Preflight SHA 不匹配：{path}")


def build_export(path: Path) -> tuple[bpy.types.Object, list[str]]:
    MASSING.reset_scene()
    configure_scene()
    obj, component_names = build_model()
    export_glb(path, obj)
    return obj, component_names


def write_record(
    glb_audit: dict[str, Any],
    blend_audit: dict[str, Any],
    blend_sha256: str,
    first_sha256: str,
    component_names: list[str],
) -> None:
    record = {
        "version": 1,
        "auditedAt": AUDITED_AT,
        "assetId": "house-315",
        "tier": "hero",
        "versionName": "hero-v2",
        "status": "candidate-awaiting-main-window-blender-mcp2",
        "generator": "scripts/create_house_315_hero_model.py",
        "generatorSha256": file_sha256(Path(__file__).resolve()),
        "buildCommand": (
            "/Applications/Blender.app/Contents/MacOS/Blender --background "
            "--python-exit-code 1 --python "
            "scripts/create_house_315_hero_model.py"
        ),
        "blenderVersion": "5.2.0 LTS",
        "derivedFrom": {
            "tier": "massing-v2",
            "generator": str(MASSING_GENERATOR_PATH.relative_to(ROOT)),
            "generatorSha256": MASSING_GENERATOR_SHA256,
            "editableSource": str(MASSING_BLEND_PATH.relative_to(ROOT)),
            "editableSourceSha256": MASSING_BLEND_SHA256,
            "runtimeAsset": str(MASSING_GLB_PATH.relative_to(ROOT)),
            "runtimeAssetSha256": MASSING_GLB_SHA256,
            "buildRecord": str(MASSING_RECORD_PATH.relative_to(ROOT)),
            "mcp1": "formal-pass",
            "mapQa": str(MASSING_MAP_QA_PATH.relative_to(ROOT)),
            "mapGate": "formal-pass",
        },
        "legacyHeroHold": {
            "disposition": "docs/research/house-315-hero-disposition.json",
            "editableSource": str(LEGACY_BLEND_PATH.relative_to(ROOT)),
            "editableSourceSha256": LEGACY_BLEND_SHA256,
            "runtimeAsset": str(LEGACY_GLB_PATH.relative_to(ROOT)),
            "runtimeAssetSha256": LEGACY_GLB_SHA256,
            "geometryReused": False,
            "overwritten": False,
            "deleted": False,
        },
        "notDerivedFrom": [
            "legacy Hero geometry",
            "Recovery voxel Massing",
            "ordinary OSM",
            "full-map massing",
            "other buildings",
        ],
        "evidence": {
            "modelBrief": "docs/research/house-315-model-brief.md",
            "referenceManifest": "docs/research/house-315-reference-manifest.json",
            "decisionLog": "docs/research/house-315-decision-log.md",
            "canonical": (
                "docs/research/assets/poi-references/house-315/"
                "house-315-front-official-2023.jpg"
            ),
            "sideDepth": (
                "docs/research/assets/poi-references/house-315/"
                "house-315-aerial-jfdaily-2026.jpg"
            ),
            "entrance": (
                "docs/research/assets/poi-references/house-315/"
                "house-315-entrance-jfdaily-2026.jpg"
            ),
            "addressBinding": (
                "docs/research/assets/poi-references/house-315/"
                "house-315-address-sign-jfdaily-2026.jpg"
            ),
        },
        "evidenceBoundary": {
            "observed": [
                "central tall projecting half-timber gable",
                "connected transverse steep red-tile roof",
                "asymmetric long right and short left-rear wings",
                "upper white roughcast over lower exposed red brick",
                "tall central opening and front gable relationship",
                "front roof dormer and visible chimney",
            ],
            "inferred": [
                "window subdivisions and low-detail side opening rhythm",
                "neutral unlettered plaque proxy beside central opening",
            ],
            "unknown": [
                "hidden rear openings and complete rear facade",
                "surveyed dimensions and exact construction year",
                "protected plaque text and logo",
            ],
            "omitted": [
                "street gate and freestanding door",
                "text or logo on plaque",
                "trees and vegetation",
                "full garden slab",
                "walls and fences",
                "lamps and planters",
                "decorative paving",
                "ordinary OSM and other buildings",
            ],
        },
        "identityCues": [
            "central tall half-timber gable with upper window",
            "transverse main ridge and asymmetric wing hierarchy",
            "white-over-red facade division",
            "tall central glazed entrance relationship",
            "front shed dormer and visible chimney",
        ],
        "originContract": {
            "authoredFront": AUTHORED_FRONT,
            "sceneUnitMeters": SCENE_UNIT_METERS,
            "groundDatum": 0,
            "runtimePosition": RUNTIME_POSITION,
            "runtimeYaw": RUNTIME_YAW,
            "runtimeScale": RUNTIME_SCALE,
            "localBounds": LOCAL_BOUNDS,
            "fixedCameras": FIXED_CAMERAS,
        },
        "collisionContract": {
            "source": "docs/research/house-315-massing-map-qa.json",
            "localBounds": LOCAL_BOUNDS,
            "localObstacles": LOCAL_OBSTACLES,
            "sameAsMassing": True,
            "entranceAndFrontRecessRemainOpen": True,
            "bakedCollisionGeometry": False,
        },
        "scope": {
            "buildingOnly": True,
            "sourceComponentCount": len(component_names),
            "sourceComponents": component_names,
            "forbiddenContentAbsent": [
                "trees",
                "shrubs",
                "grass",
                "garden slab",
                "walls",
                "fences",
                "street gate",
                "lamps",
                "planters",
                "decorative paving",
                "outdoor furniture",
                "other buildings",
            ],
        },
        "budget": {
            "maxNodes": 1,
            "maxTriangles": 45000,
            "maxMaterials": 6,
            "maxImages": 0,
            "maxBytes": 3500000,
        },
        "determinism": {
            "independentCleanSceneBuilds": 2,
            "firstGlbSha256": first_sha256,
            "secondGlbSha256": glb_audit["sha256"],
            "sameGlbSha256": first_sha256 == glb_audit["sha256"],
        },
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
            },
            "previews": {
                "canonical": {
                    "path": str(CANONICAL_PATH.relative_to(ROOT)),
                    "sha256": file_sha256(CANONICAL_PATH),
                    "bytes": CANONICAL_PATH.stat().st_size,
                },
                "sideDepth": {
                    "path": str(SIDE_PATH.relative_to(ROOT)),
                    "sha256": file_sha256(SIDE_PATH),
                    "bytes": SIDE_PATH.stat().st_size,
                },
                "entrance": {
                    "path": str(ENTRANCE_PATH.relative_to(ROOT)),
                    "sha256": file_sha256(ENTRANCE_PATH),
                    "bytes": ENTRANCE_PATH.stat().st_size,
                },
            },
        },
        "blendSceneAudit": blend_audit,
        "glb": glb_audit,
        "mcp2": {
            "status": "pending-main-window-serial-review",
            "requested": True,
            "passed": False,
            "qaRigSaved": False,
            "qaRigExported": False,
        },
        "identityAllowed": False,
        "threeJsRuntime": "not-run-before-mcp2",
        "publicRegistry": {
            "modified": False,
            "integration": "pending-main-window-after-mcp2",
        },
    }
    RECORD_PATH.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )


def main() -> None:
    for directory in (
        BLEND_PATH.parent,
        GLB_PATH.parent,
        PREVIEW_DIR,
        RECORD_PATH.parent,
    ):
        directory.mkdir(parents=True, exist_ok=True)

    preflight()
    build_export(FIRST_BUILD_PATH)
    first_sha256 = file_sha256(FIRST_BUILD_PATH)

    obj, component_names = build_export(GLB_PATH)
    second_sha256 = file_sha256(GLB_PATH)
    if first_sha256 != second_sha256:
        raise RuntimeError(
            f"Hero v2 双 clean build 不一致：{first_sha256} != {second_sha256}"
        )
    FIRST_BUILD_PATH.unlink(missing_ok=True)

    glb_audit = parse_glb(GLB_PATH)
    validate_audit(glb_audit)
    blend_audit = inspect_blend_scene(obj)
    validate_blend_audit(blend_audit)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    blend_sha256 = file_sha256(BLEND_PATH)

    helpers = MASSING.add_preview_context()
    for label, path, camera in (
        ("canonical", CANONICAL_PATH, FIXED_CAMERAS["canonical"]),
        ("side-depth", SIDE_PATH, FIXED_CAMERAS["sideDepth"]),
        ("entrance", ENTRANCE_PATH, FIXED_CAMERAS["entrance"]),
    ):
        MASSING.render_preview(
            path,
            tuple(camera["location"]),
            tuple(camera["target"]),
            float(camera["orthoScale"]),
            label,
        )
    for helper in helpers:
        bpy.data.objects.remove(helper, do_unlink=True)

    if (
        file_sha256(LEGACY_BLEND_PATH) != LEGACY_BLEND_SHA256
        or file_sha256(LEGACY_GLB_PATH) != LEGACY_GLB_SHA256
    ):
        raise RuntimeError("旧 Hero Hold 被意外修改")
    write_record(
        glb_audit,
        blend_audit,
        blend_sha256,
        first_sha256,
        component_names,
    )
    print(
        json.dumps(
            {
                "glb": glb_audit,
                "blend": blend_audit,
                "record": str(RECORD_PATH.relative_to(ROOT)),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
