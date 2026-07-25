"""从已过地图门的 Massing 合同确定性生成一号花园 Hero v2。"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
import struct
from typing import Any

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
AUDITED_AT = "2026-07-25"
MASSING_GLB_SHA256 = (
    "a87caeba3b3ab4bc6735e6f3b98f424c15994895a8b51d8777d2cb98fb80e761"
)
MASSING_BLEND_SHA256 = (
    "a4c0e0fba996f139a88344b6f39a8a2509326ba7018206dc888231fab6474388"
)
BLEND_PATH = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/hero-v2"
    / "one-step-garden-hero.blend"
)
GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/hero-v2"
    / "one-step-garden-hero.glb"
)
PREVIEW_DIR = ROOT / "test_artifacts/all-models/hero-v2/one-step-garden"
CANONICAL_PATH = (
    PREVIEW_DIR
    / "test_one-step-garden-hero-v2_mcp2_recheck_fixed_canonical.png"
)
SIDE_PATH = (
    PREVIEW_DIR
    / "test_one-step-garden-hero-v2_mcp2_recheck_fixed_side.png"
)
ENTRANCE_PATH = (
    PREVIEW_DIR
    / "test_one-step-garden-hero-v2_mcp2_recheck_fixed_entrance.png"
)
FAILED_MCP2_PREVIEW_PATHS = {
    "canonical": (
        PREVIEW_DIR
        / "test_one-step-garden-hero-v2_mcp2_recheck_canonical.png"
    ),
    "side": (
        PREVIEW_DIR
        / "test_one-step-garden-hero-v2_mcp2_recheck_side.png"
    ),
    "entrance": (
        PREVIEW_DIR
        / "test_one-step-garden-hero-v2_mcp2_recheck_entrance.png"
    ),
}
RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/hero-v2"
    / "one-step-garden-hero.json"
)

# 地图门前冻结旧 Hero 的公共落点与整体包络，不据低置信度 OSM 候选移动。
RUNTIME_POSITION = [60.86, 120.73]
RUNTIME_YAW = -0.38
RUNTIME_SCALE = 0.88
AUTHORED_FRONT = "local-negative-y"
SCENE_UNIT_METERS = 2.7
EXPECTED_HERO_MATERIAL_NAMES = {
    "one-step-garden-hero-warm-plaster",
    "one-step-garden-hero-muted-brick",
    "one-step-garden-hero-dark-tile-roof",
    "one-step-garden-hero-deep-half-timber",
    "one-step-garden-hero-window-frame",
    "one-step-garden-hero-muted-glass",
    "one-step-garden-hero-dark-door",
}


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(collection):
            if datablock.users == 0:
                collection.remove(datablock)


def material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    roughness: float = 0.88,
    metallic: float = 0.0,
) -> bpy.types.Material:
    value = bpy.data.materials.new(name)
    value.use_nodes = True
    value.diffuse_color = color
    value.roughness = roughness
    value.metallic = metallic
    principled = next(
        (
            node
            for node in value.node_tree.nodes
            if node.type == "BSDF_PRINCIPLED"
        ),
        None,
    )
    if principled is None:
        raise RuntimeError(f"{name} 缺少 Principled BSDF")
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = metallic
    return value


def add_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    surface: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.data.materials.append(surface)
    return obj


def add_gable_roof(
    name: str,
    center: tuple[float, float],
    length: float,
    span: float,
    eave_z: float,
    ridge_z: float,
    surface: bpy.types.Material,
    *,
    ridge_axis: str,
) -> bpy.types.Object:
    """加入封底双坡屋面；ridge_axis 指屋脊延伸方向。"""

    cx, cy = center
    if ridge_axis == "X":
        vertices = [
            (-length / 2, -span / 2, eave_z),
            (length / 2, -span / 2, eave_z),
            (length / 2, span / 2, eave_z),
            (-length / 2, span / 2, eave_z),
            (-length / 2, 0.0, ridge_z),
            (length / 2, 0.0, ridge_z),
        ]
        faces = [
            (0, 1, 5, 4),
            (3, 4, 5, 2),
            (0, 4, 3),
            (1, 2, 5),
            (0, 3, 2, 1),
        ]
    elif ridge_axis == "Y":
        vertices = [
            (-span / 2, -length / 2, eave_z),
            (span / 2, -length / 2, eave_z),
            (span / 2, length / 2, eave_z),
            (-span / 2, length / 2, eave_z),
            (0.0, -length / 2, ridge_z),
            (0.0, length / 2, ridge_z),
        ]
        faces = [
            (0, 4, 5, 3),
            (1, 2, 5, 4),
            (0, 1, 4),
            (3, 5, 2),
            (0, 3, 2, 1),
        ]
    else:
        raise ValueError(f"不支持的屋脊方向：{ridge_axis}")

    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(
        [(x + cx, y + cy, z) for x, y, z in vertices],
        [],
        faces,
    )
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(surface)
    return obj


def add_shed_roof(
    name: str,
    center: tuple[float, float],
    width: float,
    depth: float,
    front_z: float,
    rear_z: float,
    surface: bpy.types.Material,
) -> bpy.types.Object:
    """加入从院内后侧向临街前侧下落的棚屋形屋面。"""

    cx, cy = center
    x0, x1 = cx - width / 2, cx + width / 2
    y0, y1 = cy - depth / 2, cy + depth / 2
    vertices = [
        (x0, y0, front_z),
        (x1, y0, front_z),
        (x1, y1, rear_z),
        (x0, y1, rear_z),
        (x0, y0, front_z - 0.18),
        (x1, y0, front_z - 0.18),
        (x1, y1, rear_z - 0.18),
        (x0, y1, rear_z - 0.18),
    ]
    faces = [
        (0, 1, 2, 3),
        (7, 6, 5, 4),
        (0, 4, 5, 1),
        (1, 5, 6, 2),
        (2, 6, 7, 3),
        (3, 7, 4, 0),
    ]
    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(surface)
    return obj


def add_beam(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    thickness: float,
    depth: float,
    surface: bpy.types.Material,
) -> bpy.types.Object:
    """在两个三维点之间加入方截面木构，不制造零长度构件。"""

    start_vector = Vector(start)
    end_vector = Vector(end)
    direction = end_vector - start_vector
    length = direction.length
    if length <= 1e-6:
        raise ValueError(f"{name} 是零长度木构")
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(start_vector + end_vector) / 2)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (thickness, depth, length)
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.data.materials.append(surface)
    return obj


def add_gable_infill_y(
    name: str,
    center_x: float,
    center_y: float,
    span: float,
    eave_z: float,
    ridge_z: float,
    depth: float,
    surface: bpy.types.Material,
) -> bpy.types.Object:
    """用薄三棱柱覆盖纵向屋脊的前山墙端面。"""

    left = center_x - span / 2
    right = center_x + span / 2
    front = center_y - depth / 2
    back = center_y + depth / 2
    vertices = [
        (left, front, eave_z),
        (right, front, eave_z),
        (center_x, front, ridge_z),
        (left, back, eave_z),
        (right, back, eave_z),
        (center_x, back, ridge_z),
    ]
    faces = [
        (0, 1, 2),
        (3, 5, 4),
        (0, 3, 4, 1),
        (0, 2, 5, 3),
        (1, 4, 5, 2),
    ]
    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(surface)
    return obj


def add_window_y(
    prefix: str,
    center: tuple[float, float, float],
    width: float,
    height: float,
    frame: bpy.types.Material,
    glass: bpy.types.Material,
    *,
    mullions: int = 1,
) -> list[bpy.types.Object]:
    """加入朝 local -Y 的稳定窗框、玻璃和纵梃。"""

    x, y, z = center
    border = 0.09
    depth = 0.075
    objects = [
        add_box(f"{prefix}-glass", (x, y, z), (width, depth, height), glass),
        add_box(
            f"{prefix}-frame-left",
            (x - width / 2, y - 0.006, z),
            (border, depth + 0.025, height + border),
            frame,
        ),
        add_box(
            f"{prefix}-frame-right",
            (x + width / 2, y - 0.006, z),
            (border, depth + 0.025, height + border),
            frame,
        ),
        add_box(
            f"{prefix}-frame-top",
            (x, y - 0.006, z + height / 2),
            (width + border, depth + 0.025, border),
            frame,
        ),
        add_box(
            f"{prefix}-frame-bottom",
            (x, y - 0.006, z - height / 2),
            (width + border, depth + 0.025, border),
            frame,
        ),
        add_box(
            f"{prefix}-frame-mid",
            (x, y - 0.008, z),
            (width, depth + 0.03, border * 0.72),
            frame,
        ),
    ]
    for index in range(1, mullions + 1):
        offset = width * (index / (mullions + 1) - 0.5)
        objects.append(
            add_box(
                f"{prefix}-mullion-{index}",
                (x + offset, y - 0.008, z),
                (border * 0.72, depth + 0.03, height),
                frame,
            )
        )
    return objects


def add_window_x(
    prefix: str,
    center: tuple[float, float, float],
    width: float,
    height: float,
    frame: bpy.types.Material,
    glass: bpy.types.Material,
) -> list[bpy.types.Object]:
    """加入朝庭院侧向的窗框，width 沿 local Y。"""

    x, y, z = center
    border = 0.09
    depth = 0.075
    return [
        add_box(f"{prefix}-glass", (x, y, z), (depth, width, height), glass),
        add_box(
            f"{prefix}-frame-near",
            (x, y - width / 2, z),
            (depth + 0.025, border, height + border),
            frame,
        ),
        add_box(
            f"{prefix}-frame-far",
            (x, y + width / 2, z),
            (depth + 0.025, border, height + border),
            frame,
        ),
        add_box(
            f"{prefix}-frame-top",
            (x, y, z + height / 2),
            (depth + 0.025, width + border, border),
            frame,
        ),
        add_box(
            f"{prefix}-frame-bottom",
            (x, y, z - height / 2),
            (depth + 0.025, width + border, border),
            frame,
        ),
        add_box(
            f"{prefix}-frame-mid",
            (x, y, z),
            (depth + 0.03, width, border * 0.72),
            frame,
        ),
    ]


def add_door_y(
    prefix: str,
    center: tuple[float, float, float],
    width: float,
    height: float,
    frame: bpy.types.Material,
    door: bpy.types.Material,
) -> list[bpy.types.Object]:
    """加入不含商标文字的建筑门扇与外框。"""

    x, y, z = center
    border = 0.12
    depth = 0.09
    return [
        add_box(f"{prefix}-leaf", (x, y, z), (width, depth, height), door),
        add_box(
            f"{prefix}-frame-left",
            (x - width / 2, y - 0.012, z),
            (border, depth + 0.035, height + border),
            frame,
        ),
        add_box(
            f"{prefix}-frame-right",
            (x + width / 2, y - 0.012, z),
            (border, depth + 0.035, height + border),
            frame,
        ),
        add_box(
            f"{prefix}-frame-top",
            (x, y - 0.012, z + height / 2),
            (width + border, depth + 0.035, border),
            frame,
        ),
        add_box(
            f"{prefix}-door-midrail",
            (x, y - 0.018, z + 0.15),
            (width * 0.86, depth + 0.045, 0.08),
            frame,
        ),
    ]


def add_half_timber_y(
    prefix: str,
    center_x: float,
    front_y: float,
    width: float,
    base_z: float,
    top_z: float,
    surface: bpy.types.Material,
) -> list[bpy.types.Object]:
    """加入照片支持的深色半木构网格与两根斜撑。"""

    left = center_x - width / 2
    right = center_x + width / 2
    face_y = front_y - 0.055
    objects: list[bpy.types.Object] = []
    for index, z in enumerate((base_z + 0.12, (base_z + top_z) / 2, top_z - 0.12)):
        objects.append(
            add_box(
                f"{prefix}-horizontal-{index}",
                (center_x, face_y, z),
                (width, 0.11, 0.12),
                surface,
            )
        )
    for index, x in enumerate((left + 0.1, center_x, right - 0.1)):
        objects.append(
            add_box(
                f"{prefix}-vertical-{index}",
                (x, face_y, (base_z + top_z) / 2),
                (0.12, 0.11, top_z - base_z),
                surface,
            )
        )
    objects.extend(
        [
            add_beam(
                f"{prefix}-diagonal-left",
                (left + 0.12, face_y - 0.005, base_z + 0.15),
                (center_x - 0.12, face_y - 0.005, top_z - 0.15),
                0.11,
                0.115,
                surface,
            ),
            add_beam(
                f"{prefix}-diagonal-right",
                (right - 0.12, face_y - 0.005, base_z + 0.15),
                (center_x + 0.12, face_y - 0.005, top_z - 0.15),
                0.11,
                0.115,
                surface,
            ),
        ]
    )
    return objects


def join_objects(
    objects: list[bpy.types.Object],
    name: str,
) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = name
    joined.data.name = f"{name}-mesh"
    return joined


def build_model() -> bpy.types.Object:
    """从已过门 Massing 体量延伸建筑专属 Hero，不加入任何场地装饰。"""

    plaster = material(
        "one-step-garden-hero-warm-plaster",
        (0.82, 0.78, 0.69, 1.0),
    )
    brick = material(
        "one-step-garden-hero-muted-brick",
        (0.40, 0.16, 0.11, 1.0),
    )
    roof = material(
        "one-step-garden-hero-dark-tile-roof",
        (0.12, 0.15, 0.15, 1.0),
    )
    timber = material(
        "one-step-garden-hero-deep-half-timber",
        (0.045, 0.065, 0.06, 1.0),
    )
    frame = material(
        "one-step-garden-hero-window-frame",
        (0.035, 0.085, 0.075, 1.0),
    )
    glass = material(
        "one-step-garden-hero-muted-glass",
        (0.09, 0.19, 0.18, 1.0),
        roughness=0.38,
    )
    door = material(
        "one-step-garden-hero-dark-door",
        (0.18, 0.105, 0.065, 1.0),
    )
    objects: list[bpy.types.Object] = []

    # 临街白色建筑：三面体量围出小院，左右翼屋脊沿纵深方向。
    objects.extend(
        [
            add_box(
                "front-courtyard-back-volume",
                (0.0, 0.0, 2.1),
                (8.4, 3.6, 4.2),
                plaster,
            ),
            add_gable_roof(
                "front-courtyard-back-roof",
                (0.0, 0.0),
                8.8,
                4.0,
                4.2,
                5.65,
                roof,
                ridge_axis="X",
            ),
            add_box(
                "front-left-gabled-wing",
                (-5.0, -3.1, 2.0),
                (3.4, 7.2, 4.0),
                plaster,
            ),
            add_gable_roof(
                "front-left-steep-gable",
                (-5.0, -3.1),
                7.6,
                3.8,
                4.0,
                6.25,
                roof,
                ridge_axis="Y",
            ),
            add_box(
                "front-right-gabled-wing",
                (5.0, -3.05, 1.85),
                (3.2, 7.1, 3.7),
                plaster,
            ),
            add_gable_roof(
                "front-right-gable",
                (5.0, -3.05),
                7.5,
                3.6,
                3.7,
                5.55,
                roof,
                ridge_axis="Y",
            ),
            # 临街入口棚只保留屋面，下面通道保持开放。
            add_shed_roof(
                "front-open-entry-canopy",
                (1.1, -6.25),
                4.6,
                1.15,
                1.1,
                1.35,
                roof,
            ),
            add_box(
                "front-open-entry-canopy-left-post",
                (-1.15, -6.25, 0.55),
                (0.18, 0.18, 1.1),
                roof,
            ),
            add_box(
                "front-open-entry-canopy-right-post",
                (3.35, -6.25, 0.55),
                (0.18, 0.18, 1.1),
                roof,
            ),
            # canonical 照片中可见的棚屋形老虎窗仅表达轮廓，不做窗框细节。
            add_box(
                "front-observed-shed-dormer-volume",
                (0.9, -1.7, 4.65),
                (3.3, 0.9, 1.0),
                plaster,
            ),
            add_shed_roof(
                "front-observed-shed-dormer-roof",
                (0.9, -2.05),
                3.65,
                1.35,
                5.2,
                5.55,
                roof,
            ),
        ]
    )

    # 后院红砖建筑：长屋面、左右前凸山墙及两根高烟囱均由照片直接支持。
    objects.extend(
        [
            add_box(
                "rear-brick-long-volume",
                (0.0, 7.0, 1.7),
                (14.0, 4.2, 3.4),
                brick,
            ),
            add_gable_roof(
                "rear-brick-long-roof",
                (0.0, 7.0),
                14.5,
                4.65,
                3.4,
                5.15,
                roof,
                ridge_axis="X",
            ),
            add_box(
                "rear-brick-left-front-gable-volume",
                (-5.15, 5.45, 1.65),
                (3.25, 3.2, 3.3),
                brick,
            ),
            add_gable_roof(
                "rear-brick-left-front-gable",
                (-5.15, 5.45),
                3.55,
                3.65,
                3.3,
                4.9,
                roof,
                ridge_axis="Y",
            ),
            add_box(
                "rear-brick-right-front-gable-volume",
                (5.15, 5.45, 1.65),
                (3.25, 3.2, 3.3),
                brick,
            ),
            add_gable_roof(
                "rear-brick-right-front-gable",
                (5.15, 5.45),
                3.55,
                3.65,
                3.3,
                4.9,
                roof,
                ridge_axis="Y",
            ),
            add_box(
                "rear-brick-central-tall-chimney",
                (0.65, 7.45, 4.6),
                (1.15, 1.1, 3.2),
                brick,
            ),
            add_box(
                "rear-brick-left-chimney",
                (-4.55, 8.0, 4.2),
                (0.9, 0.9, 2.0),
                brick,
            ),
        ]
    )

    # 前部白色 U 形建筑：街道山墙、院内半木构和稳定门窗节奏。
    objects.extend(
        [
            add_gable_infill_y(
                "front-left-street-gable-infill",
                -5.0,
                -6.695,
                3.36,
                3.96,
                6.19,
                0.08,
                plaster,
            ),
            add_gable_infill_y(
                "front-right-street-gable-infill",
                5.0,
                -6.595,
                3.16,
                3.66,
                5.49,
                0.08,
                plaster,
            ),
            add_box(
                "front-left-roof-ridge",
                (-5.0, -3.1, 6.19),
                (0.13, 7.35, 0.12),
                roof,
            ),
            add_box(
                "front-right-roof-ridge",
                (5.0, -3.05, 5.49),
                (0.13, 7.25, 0.12),
                roof,
            ),
            add_box(
                "front-back-roof-ridge",
                (0.0, 0.0, 5.59),
                (8.55, 0.13, 0.12),
                roof,
            ),
        ]
    )
    objects.extend(
        add_half_timber_y(
            "front-left-street-timber",
            -5.0,
            -6.70,
            3.18,
            0.08,
            3.90,
            timber,
        )
    )
    objects.extend(
        add_half_timber_y(
            "front-right-street-timber",
            5.0,
            -6.60,
            2.98,
            0.08,
            3.60,
            timber,
        )
    )
    # 山墙三角区的中心竖木和两根坡向木构。
    objects.extend(
        [
            add_beam(
                "front-left-gable-center-timber",
                (-5.0, -6.75, 3.93),
                (-5.0, -6.75, 6.10),
                0.105,
                0.12,
                timber,
            ),
            add_beam(
                "front-left-gable-slope-timber-a",
                (-6.54, -6.75, 4.02),
                (-5.0, -6.75, 6.12),
                0.105,
                0.12,
                timber,
            ),
            add_beam(
                "front-left-gable-slope-timber-b",
                (-3.46, -6.75, 4.02),
                (-5.0, -6.75, 6.12),
                0.105,
                0.12,
                timber,
            ),
            add_beam(
                "front-right-gable-center-timber",
                (5.0, -6.65, 3.63),
                (5.0, -6.65, 5.40),
                0.10,
                0.12,
                timber,
            ),
            add_beam(
                "front-right-gable-slope-timber-a",
                (3.58, -6.65, 3.72),
                (5.0, -6.65, 5.42),
                0.10,
                0.12,
                timber,
            ),
            add_beam(
                "front-right-gable-slope-timber-b",
                (6.42, -6.65, 3.72),
                (5.0, -6.65, 5.42),
                0.10,
                0.12,
                timber,
            ),
        ]
    )
    for index, x in enumerate((-5.75, -4.25)):
        objects.extend(
            add_window_y(
                f"front-left-ground-window-{index}",
                (x, -6.765, 1.35),
                0.82,
                1.25,
                frame,
                glass,
                mullions=1,
            )
        )
    objects.extend(
        add_window_y(
            "front-left-gable-window",
            (-5.0, -6.77, 4.82),
            1.15,
            1.25,
            frame,
            glass,
            mullions=2,
        )
    )
    objects.extend(
        add_door_y(
            "front-right-main-door",
            (4.45, -6.68, 1.22),
            0.88,
            2.18,
            frame,
            door,
        )
    )
    objects.extend(
        add_window_y(
            "front-right-ground-window",
            (5.75, -6.67, 1.35),
            0.78,
            1.25,
            frame,
            glass,
        )
    )
    objects.extend(
        add_window_y(
            "front-right-gable-window",
            (5.0, -6.68, 4.35),
            1.05,
            1.12,
            frame,
            glass,
            mullions=2,
        )
    )

    # U 形前院内部：后墙与左右翼内侧均保留照片可见的半木构和窗门节奏。
    objects.extend(
        add_half_timber_y(
            "front-courtyard-back-timber",
            0.0,
            -1.80,
            8.05,
            0.08,
            4.08,
            timber,
        )
    )
    for floor, z in enumerate((1.15, 3.02)):
        for column, x in enumerate((-2.9, -0.98, 0.98, 2.9)):
            objects.extend(
                add_window_y(
                    f"front-courtyard-window-{floor}-{column}",
                    (x, -1.875, z),
                    0.82,
                    1.10 if floor == 0 else 0.92,
                    frame,
                    glass,
                    mullions=1,
                )
            )
    # 老虎窗照片显示连续多扇窄窗；主体盒和棚屋顶沿用 Massing。
    for index, x in enumerate((-0.30, 0.30, 0.90, 1.50, 2.10)):
        objects.extend(
            add_window_y(
                f"front-shed-dormer-window-{index}",
                (x, -2.19, 4.65),
                0.43,
                0.72,
                frame,
                glass,
                mullions=0,
            )
        )
    # 两翼面向院内的长窗与深木水平带。
    for side, x in (("left", -3.25), ("right", 3.35)):
        for rail, z in enumerate((1.02, 2.70, 3.58)):
            objects.append(
                add_box(
                    f"front-{side}-courtyard-timber-horizontal-{rail}",
                    (x, -3.05, z),
                    (0.11, 6.65, 0.11),
                    timber,
                )
            )
        for column, y in enumerate((-5.25, -3.65, -2.05, -0.55)):
            objects.append(
                add_box(
                    f"front-{side}-courtyard-timber-vertical-{column}",
                    (x, y, 2.30),
                    (0.11, 0.11, 2.65),
                    timber,
                )
            )
            objects.extend(
                add_window_x(
                    f"front-{side}-courtyard-window-{column}",
                    (x + (0.06 if side == "left" else -0.06), y, 1.55),
                    0.92,
                    1.12,
                    frame,
                    glass,
                )
            )

    # 后院红砖长屋：双山墙、花园向开口、长屋窗节奏与两根烟囱。
    objects.extend(
        [
            add_gable_infill_y(
                "rear-left-gable-brick-infill",
                -5.15,
                3.84,
                3.18,
                3.26,
                4.84,
                0.08,
                brick,
            ),
            add_gable_infill_y(
                "rear-right-gable-brick-infill",
                5.15,
                3.84,
                3.18,
                3.26,
                4.84,
                0.08,
                brick,
            ),
            add_box(
                "rear-long-roof-ridge",
                (0.0, 7.0, 5.09),
                (14.28, 0.13, 0.12),
                roof,
            ),
            add_box(
                "rear-left-gable-roof-ridge",
                (-5.15, 5.45, 4.84),
                (0.13, 3.38, 0.12),
                roof,
            ),
            add_box(
                "rear-right-gable-roof-ridge",
                (5.15, 5.45, 4.84),
                (0.13, 3.38, 0.12),
                roof,
            ),
            add_box(
                "rear-central-chimney-cap",
                (0.65, 7.45, 6.14),
                (1.34, 1.28, 0.12),
                brick,
            ),
            add_box(
                "rear-left-chimney-cap",
                (-4.55, 8.0, 5.14),
                (1.08, 1.08, 0.12),
                brick,
            ),
        ]
    )
    for index, x in enumerate((-2.45, 0.0, 2.45)):
        objects.extend(
            add_window_y(
                f"rear-long-garden-window-{index}",
                (x, 4.87, 1.55),
                1.0,
                1.35,
                frame,
                glass,
                mullions=2,
            )
        )
    objects.extend(
        add_door_y(
            "rear-left-gable-door",
            (-5.55, 3.77, 1.12),
            0.88,
            2.05,
            frame,
            door,
        )
    )
    objects.extend(
        add_window_y(
            "rear-left-gable-window",
            (-4.75, 3.76, 2.54),
            0.92,
            1.10,
            frame,
            glass,
            mullions=1,
        )
    )
    objects.extend(
        add_window_y(
            "rear-right-gable-ground-window",
            (5.15, 3.76, 1.45),
            1.15,
            1.35,
            frame,
            glass,
            mullions=2,
        )
    )
    objects.extend(
        add_window_y(
            "rear-right-gable-upper-window",
            (5.15, 3.76, 3.54),
            0.82,
            0.88,
            frame,
            glass,
            mullions=1,
        )
    )

    obj = join_objects(objects, "one-step-garden-hero")
    obj["asset_id"] = "one-step-garden"
    obj["tier"] = "hero"
    obj["version"] = "hero-v2"
    obj["authored_front"] = AUTHORED_FRONT
    obj["scene_unit_meters"] = SCENE_UNIT_METERS
    obj["derived_from_massing_glb_sha256"] = MASSING_GLB_SHA256
    obj["derived_from_massing_blend_sha256"] = MASSING_BLEND_SHA256
    obj["geometry_evidence"] = "three-formal-photos-plus-approved-massing-contract"
    obj["subject_specific_cues"] = (
        "front-u-court-deep-half-timber;steep-roofs-and-shed-dormer;"
        "separate-rear-brick-twin-gables-two-chimneys;stable-window-rhythm"
    )
    obj["footprint_status"] = "approved-massing-map-gate-pass"
    obj["scope_exclusions"] = (
        "trees;shrubs;grass;furniture;umbrellas;planters;lamps;"
        "fences;signage;decorative-paving;other-buildings"
    )
    obj["mcp2_status"] = "pending-main-window"
    obj["identity_allowed"] = False
    return obj


def scene_bounds(
    objects: list[bpy.types.Object],
) -> tuple[Vector, Vector]:
    minimum = Vector((math.inf, math.inf, math.inf))
    maximum = Vector((-math.inf, -math.inf, -math.inf))
    for obj in objects:
        for corner in obj.bound_box:
            point = obj.matrix_world @ Vector(corner)
            minimum.x = min(minimum.x, point.x)
            minimum.y = min(minimum.y, point.y)
            minimum.z = min(minimum.z, point.z)
            maximum.x = max(maximum.x, point.x)
            maximum.y = max(maximum.y, point.y)
            maximum.z = max(maximum.z, point.z)
    return minimum, maximum


def configure_scene() -> None:
    scene = bpy.context.scene
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    else:
        raise RuntimeError("当前 Blender 不支持 Eevee 正式预览")
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 768
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    if background is None:
        raise RuntimeError("Eevee 预览世界缺少 Background 节点")
    background.inputs["Color"].default_value = (0.055, 0.07, 0.08, 1.0)
    background.inputs["Strength"].default_value = 0.34
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.exposure = 0.75
    scene["asset_id"] = "one-step-garden"
    scene["tier"] = "hero"
    scene["version"] = "hero-v2"
    scene["authored_front"] = AUTHORED_FRONT
    scene["scene_unit_meters"] = SCENE_UNIT_METERS
    scene["derived_from_massing_glb_sha256"] = MASSING_GLB_SHA256
    scene["derived_from_massing_blend_sha256"] = MASSING_BLEND_SHA256
    scene["runtime_position"] = RUNTIME_POSITION
    scene["runtime_yaw"] = RUNTIME_YAW
    scene["runtime_scale"] = RUNTIME_SCALE
    scene["movement_authorized"] = False
    scene["map_gate"] = "pass"
    scene["mcp2_status"] = "pending-main-window"


def export_glb(path: Path, obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
    )


def add_preview_light(
    name: str,
    light_type: str,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
    energy: float,
    *,
    size: float = 5.0,
) -> bpy.types.Object:
    """加入不保存、不导出的固定 Eevee 灯光。"""

    data = bpy.data.lights.new(name=f"{name}-data", type=light_type)
    data.energy = energy
    if light_type == "AREA":
        data.shape = "DISK"
        data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (
        Vector(target) - obj.location
    ).to_track_quat("-Z", "Y").to_euler()
    return obj


def add_preview_context() -> list[bpy.types.Object]:
    """加入不保存、不导出的地面、人物、前向标记和 Eevee 灯光。"""

    helpers: list[bpy.types.Object] = []
    ground_surface = material(
        "test-hero-preview-ground-material",
        (0.11, 0.13, 0.14, 1.0),
    )
    human_surface = material(
        "test-hero-preview-human-material",
        (0.86, 0.48, 0.18, 1.0),
    )
    marker_surface = material(
        "test-hero-preview-front-marker-material",
        (0.20, 0.43, 0.58, 1.0),
    )
    bpy.ops.mesh.primitive_plane_add(size=30.0, location=(0.0, 1.2, -0.025))
    ground = bpy.context.active_object
    ground.name = "test-preview-ground"
    ground.data.materials.append(ground_surface)
    helpers.append(ground)

    # 1.8m / 2.7m = 0.6667 scene unit。
    body_height = 0.49
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=12,
        radius=0.11,
        depth=body_height,
        location=(0.0, -8.0, body_height / 2),
    )
    human_body = bpy.context.active_object
    human_body.name = "test-preview-human-body-1p8m"
    human_body.data.materials.append(human_surface)
    helpers.append(human_body)
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=12,
        ring_count=6,
        radius=0.09,
        location=(0.0, -8.0, 0.585),
    )
    human_head = bpy.context.active_object
    human_head.name = "test-preview-human-head-1p8m"
    human_head.data.materials.append(human_surface)
    helpers.append(human_head)

    # 蓝色薄板位于 local -Y，明确 authored front，不导出。
    marker = add_box(
        "test-preview-local-negative-y-front-marker",
        (0.0, -8.75, 0.03),
        (3.0, 0.18, 0.06),
        marker_surface,
    )
    helpers.append(marker)
    helpers.extend(
        [
            add_preview_light(
                "test-preview-key-light",
                "AREA",
                (10.0, -14.0, 18.0),
                (0.0, 0.0, 2.6),
                1250.0,
                size=8.0,
            ),
            add_preview_light(
                "test-preview-fill-light",
                "AREA",
                (-14.0, -1.0, 10.0),
                (0.0, 1.0, 2.4),
                850.0,
                size=10.0,
            ),
            add_preview_light(
                "test-preview-rim-light",
                "AREA",
                (6.0, 13.0, 15.0),
                (0.0, 3.0, 3.0),
                1100.0,
                size=7.0,
            ),
        ]
    )
    return helpers


def render_preview(
    path: Path,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
    ortho_scale: float,
    label: str,
) -> None:
    bpy.ops.object.camera_add(location=location)
    camera = bpy.context.active_object
    camera.name = f"test-{label}-camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = ortho_scale
    target_vector = Vector(target)
    camera.rotation_euler = (
        target_vector - camera.location
    ).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)


ACCESSOR_COMPONENTS = {
    "SCALAR": 1,
    "VEC2": 2,
    "VEC3": 3,
    "VEC4": 4,
}
COMPONENT_FORMATS = {
    5120: ("b", 1),
    5121: ("B", 1),
    5122: ("h", 2),
    5123: ("H", 2),
    5125: ("I", 4),
    5126: ("f", 4),
}


def read_accessor(
    gltf: dict[str, Any],
    binary: memoryview,
    accessor_index: int,
) -> list[list[float | int]]:
    accessor = gltf["accessors"][accessor_index]
    if "sparse" in accessor:
        raise RuntimeError("Hero v2 不允许 sparse accessor")
    view = gltf["bufferViews"][accessor["bufferView"]]
    component_count = ACCESSOR_COMPONENTS[accessor["type"]]
    component_format, component_bytes = COMPONENT_FORMATS[accessor["componentType"]]
    stride = view.get("byteStride", component_count * component_bytes)
    base = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    return [
        [
            struct.unpack_from(
                f"<{component_format}",
                binary,
                base + item_index * stride + component_index * component_bytes,
            )[0]
            for component_index in range(component_count)
        ]
        for item_index in range(accessor["count"])
    ]


def vector_subtract(a: list[float | int], b: list[float | int]) -> tuple[float, float, float]:
    return (
        float(a[0] - b[0]),
        float(a[1] - b[1]),
        float(a[2] - b[2]),
    )


def vector_cross(
    a: tuple[float, float, float],
    b: tuple[float, float, float],
) -> tuple[float, float, float]:
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def vector_length(value: tuple[float, float, float]) -> float:
    return math.sqrt(sum(component * component for component in value))


def inspect_blend_materials() -> list[dict[str, Any]]:
    """读取正式 master 内七个节点材质；排除未保存的预览 helper 材质。"""

    results = []
    for name in sorted(EXPECTED_HERO_MATERIAL_NAMES):
        value = bpy.data.materials.get(name)
        if value is None or value.node_tree is None:
            raise RuntimeError(f"Hero v2 .blend 缺少节点材质：{name}")
        principled = next(
            (
                node
                for node in value.node_tree.nodes
                if node.type == "BSDF_PRINCIPLED"
            ),
            None,
        )
        if principled is None:
            raise RuntimeError(f"Hero v2 .blend 缺少 Principled BSDF：{name}")
        results.append(
            {
                "name": name,
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
    return results


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
    normal_orientation_mismatches = 0
    zero_area_by_material: dict[str, int] = {}
    normal_mismatch_by_material: dict[str, int] = {}
    bounds_min = [math.inf, math.inf, math.inf]
    bounds_max = [-math.inf, -math.inf, -math.inf]
    for mesh in gltf.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            if primitive.get("mode", 4) != 4:
                raise RuntimeError("Hero v2 只允许 TRIANGLES primitive")
            positions = read_accessor(
                gltf,
                binary,
                primitive["attributes"]["POSITION"],
            )
            normal_accessor = primitive["attributes"].get("NORMAL")
            normals = (
                read_accessor(gltf, binary, normal_accessor)
                if normal_accessor is not None
                else None
            )
            if normals is None:
                primitives_without_normals += 1
            else:
                for normal in normals:
                    normal_length = vector_length(
                        (float(normal[0]), float(normal[1]), float(normal[2]))
                    )
                    if normal_length <= 1e-8:
                        zero_length_normals += 1
                    elif abs(normal_length - 1.0) > 1e-4:
                        non_unit_normals += 1
            if primitive.get("indices") is None:
                indices = list(range(len(positions)))
            else:
                indices = [
                    int(value[0])
                    for value in read_accessor(
                        gltf,
                        binary,
                        primitive["indices"],
                    )
                ]
            material_name = gltf.get("materials", [{}])[
                primitive.get("material", 0)
            ].get("name", "(none)")
            zero_area_by_material.setdefault(material_name, 0)
            normal_mismatch_by_material.setdefault(material_name, 0)
            for position in positions:
                if any(not math.isfinite(float(value)) for value in position):
                    non_finite_positions += 1
            for index in range(0, len(indices), 3):
                triangle = indices[index : index + 3]
                if len(triangle) != 3 or any(
                    vertex_index < 0 or vertex_index >= len(positions)
                    for vertex_index in triangle
                ):
                    invalid_indices += 1
                    continue
                triangles += 1
                a, b, c = [positions[vertex_index] for vertex_index in triangle]
                face = vector_cross(
                    vector_subtract(b, a),
                    vector_subtract(c, a),
                )
                double_area = vector_length(face)
                if double_area <= 1e-10:
                    zero_area_triangles += 1
                    zero_area_by_material[material_name] += 1
                    continue
                if normals is not None:
                    average_normal = tuple(
                        float(sum(normals[vertex_index][axis] for vertex_index in triangle))
                        for axis in range(3)
                    )
                    average_length = vector_length(average_normal)
                    if average_length > 1e-8:
                        alignment = sum(
                            face[axis] * average_normal[axis]
                            for axis in range(3)
                        ) / (double_area * average_length)
                        if alignment < -1e-4:
                            normal_orientation_mismatches += 1
                            normal_mismatch_by_material[material_name] += 1
            accessor = gltf["accessors"][primitive["attributes"]["POSITION"]]
            for axis in range(3):
                bounds_min[axis] = min(bounds_min[axis], accessor["min"][axis])
                bounds_max[axis] = max(bounds_max[axis], accessor["max"][axis])
    transformed_nodes = [
        node.get("name")
        for node in gltf.get("nodes", [])
        if any(key in node for key in ("translation", "rotation", "scale", "matrix"))
    ]
    material_factors = []
    for value in gltf.get("materials", []):
        pbr = value.get("pbrMetallicRoughness", {})
        material_factors.append(
            {
                "name": value.get("name", "(unnamed)"),
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
    return {
        "sha256": file_sha256(path),
        "bytes": len(contents),
        "nodes": len(gltf.get("nodes", [])),
        "meshes": len(gltf.get("meshes", [])),
        "materials": len(gltf.get("materials", [])),
        "images": len(gltf.get("images", [])),
        "textures": len(gltf.get("textures", [])),
        "animations": len(gltf.get("animations", [])),
        "triangles": triangles,
        "topology": {
            "zeroAreaTriangles": zero_area_triangles,
            "nonFinitePositions": non_finite_positions,
            "invalidIndices": invalid_indices,
            "zeroAreaByMaterial": {
                name: count
                for name, count in zero_area_by_material.items()
                if count
            },
        },
        "normals": {
            "primitivesWithoutNormals": primitives_without_normals,
            "zeroLengthNormals": zero_length_normals,
            "nonUnitNormals": non_unit_normals,
            "orientationMismatches": normal_orientation_mismatches,
            "mismatchByMaterial": {
                name: count
                for name, count in normal_mismatch_by_material.items()
                if count
            },
        },
        "bounds": {
            "min": [round(value, 6) for value in bounds_min],
            "max": [round(value, 6) for value in bounds_max],
        },
        "materialFactors": material_factors,
        "transformedNodes": transformed_nodes,
    }


def write_record(audit: dict[str, Any]) -> None:
    blend_materials = inspect_blend_materials()
    record = {
        "version": 1,
        "auditedAt": AUDITED_AT,
        "assetId": "one-step-garden",
        "tier": "hero",
        "versionName": "hero-v2",
        "status": (
            "headless-material-fix-pass-awaiting-main-window-mcp2-rereview"
        ),
        "generator": "scripts/create_one_step_garden_hero_model.py",
        "generatorSha256": file_sha256(Path(__file__).resolve()),
        "buildCommand": (
            "/Applications/Blender.app/Contents/MacOS/Blender --background "
            "--python-exit-code 1 --python "
            "scripts/create_one_step_garden_hero_model.py"
        ),
        "blenderVersion": "5.2.0 LTS",
        "derivedFrom": {
            "tier": "massing",
            "generator": "scripts/create_one_step_garden_massing_model.py",
            "editableSource": (
                "assets/models/source/tiers/xinhua-road/massing-v2/"
                "one-step-garden-massing.blend"
            ),
            "editableSourceSha256": MASSING_BLEND_SHA256,
            "runtimeAsset": (
                "public/models/tiers/xinhua-road/massing-v2/"
                "one-step-garden-massing.glb"
            ),
            "runtimeAssetSha256": MASSING_GLB_SHA256,
            "buildRecord": (
                "docs/research/build-records/tiers/xinhua-road/massing-v2/"
                "one-step-garden-massing.json"
            ),
            "mcp1": "pass",
            "mapGate": "pass",
        },
        "modelBrief": "docs/research/one-step-garden-model-brief.md",
        "referenceManifest": "docs/research/one-step-garden-reference-manifest.json",
        "heroDisposition": "docs/research/one-step-garden-hero-disposition.json",
        "evidenceSha256": [
            "006c5722562b8be2316f975d6e06e14c35cf507f875d474ea4696f527c25d3ff",
            "058998a95691b90af3562f2e3ef33092446f571fe8d63d7ac6b48b135a3587b0",
            "171889a9a41a5c9d9ecb2b04d3abb70a306f7a2ec143fdb9511ffc75b44334f9",
        ],
        "legacyHeroHold": {
            "editableSource": "assets/models/source/xinhua-road/one-step-garden.blend",
            "editableSourceSha256": (
                "5893234badecb648979adfc27de681b579ff3344ffe44ec5dbe3815751f8ffed"
            ),
            "runtimeAsset": "public/models/xinhua-road/one-step-garden.glb",
            "runtimeAssetSha256": (
                "a68b4e25a44e922af8d98cd4f2e0ee00486b93d94d08b005816e5ceea5b86627"
            ),
            "overwritten": False,
            "deleted": False,
        },
        "scope": {
            "included": [
                "front-white-u-shaped-half-timber-compound",
                "front-steep-tile-roofs",
                "front-shed-dormer-and-window-bank",
                "stable-building-window-and-door-rhythm",
                "separate-rear-red-brick-long-house",
                "rear-twin-gables-and-two-chimneys",
                "open-front-courtyard-and-front-rear-gap",
            ],
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
        "evidenceBoundary": {
            "observed": [
                "front white U-shaped courtyard relation",
                "front steep tiled gables",
                "front shed dormer",
                "separate rear red-brick volume",
                "rear long roof and two front gables",
                "rear central tall and left secondary chimneys",
                "front stable dark window rhythm",
            ],
            "inferred": [
                "exact depth and spacing",
                "unseen rear sides",
                "absolute height",
                "unseen window placement simplified from visible rhythm",
            ],
            "unknown": [
                "surveyed footprints",
                "OSM membership",
                "compass orientation",
                "rear facade and inter-building connection",
            ],
        },
        "placement": {
            "position": RUNTIME_POSITION,
            "yaw": RUNTIME_YAW,
            "runtimeScale": RUNTIME_SCALE,
            "movementAuthorized": False,
            "mapGate": "pass",
        },
        "scale": {
            "sceneUnitMeters": SCENE_UNIT_METERS,
            "previewHumanMeters": 1.8,
            "previewHumanSceneUnits": round(1.8 / SCENE_UNIT_METERS, 6),
            "heightStatus": "photo-and-legacy-envelope-inference-not-survey",
        },
        "canonicalFront": AUTHORED_FRONT,
        "identityAllowed": False,
        "mcp2": {
            "status": "material-fix-complete-awaiting-main-window-rereview",
            "requestedAfterCommit": True,
            "acceptedInteractiveChanges": [],
            "qaRigSaved": False,
            "qaRigExported": False,
            "firstAttempt": {
                "status": "blocked",
                "finding": (
                    "all-seven-Principled-Base-Color-values-were-default-gray"
                ),
                "cause": (
                    "generator-only-set-viewport-diffuse-color-and-workbench-"
                    "previews-did-not-prove-node-or-glb-materials"
                ),
                "failedEvidence": {
                    name: {
                        "path": str(path.relative_to(ROOT)),
                        "sha256": file_sha256(path),
                        "bytes": path.stat().st_size,
                        "dimensions": [1024, 768],
                    }
                    for name, path in FAILED_MCP2_PREVIEW_PATHS.items()
                },
                "acceptedInteractiveChanges": [],
                "qaRigSaved": False,
            },
            "fix": {
                "nodeMaterials": (
                    "use_nodes-plus-Principled-Base-Color-Roughness-Metallic"
                ),
                "formalPreviewEngine": "EEVEE",
                "glassPolicy": (
                    "opaque-muted-color-and-roughness-no-texture-no-invented-"
                    "transmission"
                ),
            },
            "gateRecord": "docs/research/one-step-garden-blender-mcp-gates.json",
            "identityRemainsBlocked": True,
        },
        "blendSceneAudit": {
            "objectCount": 1,
            "objects": ["one-step-garden-hero"],
            "types": ["MESH"],
            "rootLocation": [0, 0, 0],
            "rootRotation": [0, 0, 0],
            "rootScale": [1, 1, 1],
            "previewHelpersSaved": False,
            "previewEngine": "EEVEE",
        },
        "blendMaterialAudit": {
            "materialCount": len(blend_materials),
            "allUseNodes": all(
                value["useNodes"]
                for value in blend_materials
            ),
            "materials": blend_materials,
        },
        "determinism": {
            "sameCommandRuns": 2,
            "sameGlbSha256": True,
            "verification": "external-two-command-runs-on-2026-07-25",
        },
        "outputs": {
            "blend": {
                "path": str(BLEND_PATH.relative_to(ROOT)),
                "sha256": file_sha256(BLEND_PATH),
                "bytes": BLEND_PATH.stat().st_size,
            },
            "glb": {
                "path": str(GLB_PATH.relative_to(ROOT)),
                "sha256": audit["sha256"],
                "bytes": audit["bytes"],
                "cacheVersion": f"20260725-hero-{audit['sha256'][:8]}",
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
                "entranceDetail": {
                    "path": str(ENTRANCE_PATH.relative_to(ROOT)),
                    "sha256": file_sha256(ENTRANCE_PATH),
                    "bytes": ENTRANCE_PATH.stat().st_size,
                },
            },
        },
        "fixedCameras": {
            "canonical": {
                "location": [13.5, -23.5, 14.0],
                "target": [0.0, 0.0, 2.8],
                "orthoScale": 22.0,
                "direction": "street local-negative-y toward front volume",
            },
            "sideDepth": {
                "location": [-22.0, -4.0, 15.5],
                "target": [0.0, 2.0, 2.8],
                "orthoScale": 22.0,
                "direction": "west oblique showing front-rear separation",
            },
            "entrance": {
                "location": [7.0, -18.5, 8.5],
                "target": [0.0, -2.5, 2.2],
                "orthoScale": 14.5,
                "direction": "street oblique toward open entrance canopy",
            },
        },
        "collisionContract": {
            "source": "docs/research/one-step-garden-massing-map-qa.json",
            "localBounds": {
                "minX": -7.25,
                "maxX": 7.25,
                "minZ": -9.325,
                "maxZ": 6.9,
            },
            "localObstacles": [
                {"minX": -4.2, "maxX": 4.2, "minZ": -1.8, "maxZ": 1.8},
                {"minX": -6.7, "maxX": -3.3, "minZ": -0.5, "maxZ": 6.7},
                {"minX": 3.4, "maxX": 6.6, "minZ": -0.5, "maxZ": 6.6},
                {"minX": -1.24, "maxX": -1.06, "minZ": 6.16, "maxZ": 6.34},
                {"minX": 3.26, "maxX": 3.44, "minZ": 6.16, "maxZ": 6.34},
                {"minX": -7, "maxX": 7, "minZ": -9.1, "maxZ": -4.9},
                {"minX": -6.775, "maxX": -3.525, "minZ": -7.05, "maxZ": -3.85},
                {"minX": 3.525, "maxX": 6.775, "minZ": -7.05, "maxZ": -3.85},
            ],
            "entranceAndFrontRearGapRemainOpen": True,
        },
        "budget": {
            "maxTriangles": 62000,
            "maxNodes": 9,
            "maxMaterials": 12,
            "maxImages": 0,
            "maxBytes": 4800000,
        },
        "publicRegistry": {
            "modified": False,
            "integration": "pending-main-window-after-mcp2",
        },
        "glb": audit,
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

    reset_scene()
    configure_scene()
    obj = build_model()
    export_glb(GLB_PATH, obj)
    audit = parse_glb(GLB_PATH)
    if audit["nodes"] != 1 or audit["meshes"] != 1:
        raise RuntimeError(f"Hero v2 必须保持单节点单网格：{audit}")
    if audit["materials"] != 7:
        raise RuntimeError(f"Hero v2 材质语义分组异常：{audit}")
    material_by_name = {
        value["name"]: value
        for value in audit["materialFactors"]
    }
    if set(material_by_name) != EXPECTED_HERO_MATERIAL_NAMES:
        raise RuntimeError(
            f"Hero v2 GLB 材质名称或数量异常：{sorted(material_by_name)}"
        )
    unique_base_colors = {
        tuple(value["baseColorFactor"])
        for value in material_by_name.values()
    }
    if len(unique_base_colors) != len(EXPECTED_HERO_MATERIAL_NAMES):
        raise RuntimeError(f"Hero v2 GLB Base Color 未保持七层分组：{audit}")
    default_gray = (0.8, 0.8, 0.8, 1.0)
    if any(
        all(
            abs(actual - expected) <= 1e-6
            for actual, expected in zip(
                value["baseColorFactor"],
                default_gray,
                strict=True,
            )
        )
        for value in material_by_name.values()
    ):
        raise RuntimeError(f"Hero v2 GLB 仍含默认灰 Base Color：{audit}")
    if any(
        value["metallicFactor"] != 0.0
        or not 0.25 <= value["roughnessFactor"] <= 1.0
        for value in material_by_name.values()
    ):
        raise RuntimeError(f"Hero v2 GLB PBR 参数越出证据边界：{audit}")
    if audit["images"] or audit["textures"] or audit["animations"]:
        raise RuntimeError(f"Hero v2 不允许图片、贴图或动画：{audit}")
    if audit["transformedNodes"]:
        raise RuntimeError(f"Hero v2 GLB 节点存在未烘焙变换：{audit}")
    if audit["bytes"] > 4_800_000 or audit["triangles"] > 62_000:
        raise RuntimeError(f"Hero v2 超出预算：{audit}")
    if abs(audit["bounds"]["min"][1]) > 1e-5:
        raise RuntimeError(f"Hero v2 GLB 未接地：{audit['bounds']}")
    expected_bounds = {
        "min": [-7.25, 0.0, -9.325],
        "max": [7.25, 6.25, 6.9],
    }
    for boundary in ("min", "max"):
        for actual, expected in zip(
            audit["bounds"][boundary],
            expected_bounds[boundary],
            strict=True,
        ):
            if abs(actual - expected) > 1e-4:
                raise RuntimeError(
                    f"Hero v2 不得改变 Massing bounds：{audit['bounds']}"
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
        raise RuntimeError(f"Hero v2 拓扑或法线审计未通过：{audit}")

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    helpers = add_preview_context()
    render_preview(
        CANONICAL_PATH,
        (13.5, -23.5, 14.0),
        (0.0, 0.0, 2.8),
        22.0,
        "canonical",
    )
    render_preview(
        SIDE_PATH,
        (-22.0, -4.0, 15.5),
        (0.0, 2.0, 2.8),
        22.0,
        "side-depth",
    )
    render_preview(
        ENTRANCE_PATH,
        (7.0, -18.5, 8.5),
        (0.0, -2.5, 2.2),
        14.5,
        "entrance",
    )
    for helper in helpers:
        bpy.data.objects.remove(helper, do_unlink=True)
    write_record(audit)
    print(json.dumps(audit, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
