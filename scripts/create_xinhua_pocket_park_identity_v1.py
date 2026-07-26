"""从冻结且已通过 MCP2 的新华路口袋公园 Hero v2 派生 Identity v1。

Identity 直接抽取冻结 Hero 生成器产出的墙体轮廓和入口横梁，再减少纵向
采样站点、分缝和镜面材质数量。脚本不会加入植物、座椅、面板、灯光、
铺装、树木或装饰，也不会修改公共 registry、runtime 或 Fast manifest。
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import math
from pathlib import Path
import struct
import subprocess
from types import ModuleType
from typing import Any

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
AUDITED_AT = "2026-07-26"
ASSET_ID = "xinhua-pocket-park"
STABLE_ASSET_ID = "building:xinhua-road:xinhua-pocket-park"
SCENE_UNIT_METERS = 2.7
AUTHORED_FRONT = "local-negative-y"
GLB_FRONT = "local-positive-z"
RUNTIME_POSITION = [-57.421934309, 67.06298037]
RUNTIME_YAW = -0.398058989
RUNTIME_SCALE = 0.88

HERO_GENERATOR_PATH = ROOT / "scripts/create_xinhua_pocket_park_hero_v2.py"
HERO_BLEND_PATH = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/hero-v2"
    / "xinhua-pocket-park-hero.blend"
)
HERO_GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/hero-v2"
    / "xinhua-pocket-park-hero.glb"
)
HERO_RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/hero-v2"
    / "xinhua-pocket-park-hero.json"
)
HERO_MCP2_PATH = ROOT / "docs/research/xinhua-pocket-park-blender-mcp-gates-v2.json"
MASSING_GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/massing-v2"
    / "xinhua-pocket-park-massing.glb"
)
REFERENCE_PATH = (
    ROOT
    / "docs/research/assets/requested-poi-references"
    / "xinhua-pocket-park-canonical.jpg"
)
BRIEF_PATH = ROOT / "docs/research/xinhua-pocket-park-identity-v1-brief.md"

HERO_GENERATOR_SHA256 = (
    "61ad1d167749a6f817e12f4ad2991c800805e6c0f913b174df552f6c21548266"
)
HERO_BLEND_SHA256 = (
    "3510dd5676c5d3f65e2a5e88d12c309143671a1ff9248bd4d61d43381df2ef87"
)
HERO_GLB_SHA256 = (
    "c6ef6f107e3c1b6555784858dea2e46da8813e68aec589d04d0d3c10aeb8a7c7"
)
HERO_RECORD_SHA256 = (
    "f36ebab13e458b0fd60e6b819dc6d01de400289f470a1e153b701b57ab871fd5"
)
HERO_MCP2_SHA256 = (
    "4c0e987e677c59fb7eccdccf43de41202bf6b6d09353fac36f1c92418f7f5d0c"
)
MASSING_GLB_SHA256 = (
    "cc89e36e68397199d91684d3059c5c88410a7acc1b1c015398e05d8e57b15fa3"
)
HERO_TRIANGLES = 1152

BLEND_PATH = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/identity-v1"
    / "xinhua-pocket-park-identity.blend"
)
GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/identity-v1"
    / "xinhua-pocket-park-identity.glb"
)
RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/identity-v1"
    / "xinhua-pocket-park-identity.json"
)
PREVIEW_DIR = ROOT / "test_artifacts/all-models/identity-v1/xinhua-pocket-park"
CANONICAL_PATH = PREVIEW_DIR / "test_xinhua_pocket_park_identity_v1_canonical.png"
SIDE_PATH = PREVIEW_DIR / "test_xinhua_pocket_park_identity_v1_side.png"
DETAIL_PATH = PREVIEW_DIR / "test_xinhua_pocket_park_identity_v1_detail.png"
RUNTIME_INDEPENDENT_PATH = (
    PREVIEW_DIR
    / "test_xinhua_pocket_park_identity_v1_runtime_independent.png"
)
TRIPTYCH_PATH = PREVIEW_DIR / "test_xinhua_pocket_park_identity_v1_triptych.png"
TRIPTYCH_SCRIPT_PATH = (
    ROOT / "scripts/test_generate_xinhua_pocket_park_identity_v1_triptych.mjs"
)

EXPECTED_BOUNDS = {
    "min": [-0.84, 0.0, -4.6],
    "max": [0.84, 1.66, 4.6],
}
LOCAL_OBSTACLES = [
    {
        "role": "west-mirror-wall",
        "minX": -0.84,
        "maxX": -0.68,
        "minZ": -4.6,
        "maxZ": 4.6,
    },
    {
        "role": "east-mirror-wall",
        "minX": 0.68,
        "maxX": 0.84,
        "minZ": -4.6,
        "maxZ": 4.6,
    },
]
IDENTITY_PROFILE_INDICES = [0, 2, 4, 5, 6, 8, 10, 12]
EXPECTED_MATERIAL_NAMES = {
    "xinhua-pocket-park-identity-mirror",
    "xinhua-pocket-park-identity-weathering-steel",
    "xinhua-pocket-park-identity-dark-seam",
}
FORBIDDEN_NAME_TOKENS = (
    "plant",
    "grass",
    "tree",
    "bench",
    "rotating",
    "exhibition",
    "board",
    "signage",
    "ground-light",
    "paving",
    "path-slab",
    "decoration",
)
FIXED_CAMERAS = {
    "canonical": {
        "location": [5.8, -15.5, 5.2],
        "target": [0.0, 0.0, 0.78],
        "lens": 58.0,
    },
    "side": {
        "location": [18.0, -1.2, 5.2],
        "target": [0.0, 0.0, 0.78],
        "lens": 62.0,
    },
    "detail": {
        "location": [3.2, -10.6, 2.15],
        "target": [0.0, -2.1, 0.82],
        "lens": 62.0,
    },
    "runtime-independent": {
        "location": [-7.2, -12.5, 6.4],
        "target": [0.0, -0.2, 0.78],
        "lens": 62.0,
    },
}
IDENTITY_BUDGET = {
    "maximumNodes": 3,
    "maximumMeshes": 3,
    "maximumTriangles": 800,
    "maximumMaterials": 3,
    "maximumImages": 0,
    "maximumBytes": 120_000,
}


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def artifact_record(path: Path) -> dict[str, Any]:
    return {
        "path": str(path.relative_to(ROOT)),
        "sha256": file_sha256(path),
        "bytes": path.stat().st_size,
    }


def require_sha(path: Path, expected: str) -> None:
    actual = file_sha256(path)
    if actual != expected:
        raise RuntimeError(f"冻结输入 SHA 漂移：{path} {actual} != {expected}")


def preflight() -> dict[str, Any]:
    expected = {
        HERO_GENERATOR_PATH: HERO_GENERATOR_SHA256,
        HERO_BLEND_PATH: HERO_BLEND_SHA256,
        HERO_GLB_PATH: HERO_GLB_SHA256,
        HERO_RECORD_PATH: HERO_RECORD_SHA256,
        HERO_MCP2_PATH: HERO_MCP2_SHA256,
        MASSING_GLB_PATH: MASSING_GLB_SHA256,
    }
    for path, sha256 in expected.items():
        if not path.exists():
            raise RuntimeError(f"Identity 缺少冻结输入：{path}")
        require_sha(path, sha256)
    for path in (REFERENCE_PATH, BRIEF_PATH, TRIPTYCH_SCRIPT_PATH):
        if not path.exists():
            raise RuntimeError(f"Identity 缺少证据或生成入口：{path}")

    hero_record = json.loads(HERO_RECORD_PATH.read_text(encoding="utf8"))
    gate = json.loads(HERO_MCP2_PATH.read_text(encoding="utf8"))
    if (
        hero_record.get("outputs", {}).get("glb", {}).get("sha256")
        != HERO_GLB_SHA256
        or hero_record.get("outputs", {}).get("blend", {}).get("sha256")
        != HERO_BLEND_SHA256
        or hero_record.get("outputs", {}).get("glb", {}).get("triangles")
        != HERO_TRIANGLES
    ):
        raise RuntimeError("Hero build record 与冻结 Hero 二进制不一致")
    if (
        hero_record.get("validation", {}).get("mcp2")
        != "pass-main-window-xhigh"
        or not hero_record.get("validation", {}).get("identityAuthorized")
    ):
        raise RuntimeError("Hero build record 未授权 Identity 派生")
    if (
        gate.get("mcp2", {}).get("status") != "pass"
        or not gate.get("identityAuthorization", {}).get("authorized")
        or gate.get("identityAuthorization", {}).get("frozenHeroSha256")
        != HERO_GLB_SHA256
    ):
        raise RuntimeError("MCP2 v2 授权记录未冻结当前 Hero")
    return hero_record


def load_frozen_hero_module() -> ModuleType:
    specification = importlib.util.spec_from_file_location(
        "xinhua_pocket_park_frozen_hero",
        HERO_GENERATOR_PATH,
    )
    if specification is None or specification.loader is None:
        raise RuntimeError("无法加载冻结 Hero generator")
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


def extract_wall_profile(wall: bpy.types.Object) -> dict[str, list[float]]:
    """从 Hero 三条带 × 十二段的确定性网格读取十三个轮廓站点。"""

    coordinates = [tuple(float(value) for value in vertex.co) for vertex in wall.data.vertices]
    expected_minimum_vertices = 12 * 3 * 8
    if len(coordinates) < expected_minimum_vertices:
        raise RuntimeError(f"Hero 墙体拓扑不足，无法派生：{wall.name}")

    profile = {
        "y": [],
        "innerX": [],
        "mirrorTop": [],
        "steelTop": [],
        "wallTop": [],
    }
    for segment in range(12):
        base = segment * 24
        start_values = {
            "y": coordinates[base + 0][1],
            "innerX": coordinates[base + 1][0],
            "mirrorTop": coordinates[base + 5][2],
            "steelTop": coordinates[base + 13][2],
            "wallTop": coordinates[base + 21][2],
        }
        end_values = {
            "y": coordinates[base + 2][1],
            "innerX": coordinates[base + 2][0],
            "mirrorTop": coordinates[base + 6][2],
            "steelTop": coordinates[base + 14][2],
            "wallTop": coordinates[base + 22][2],
        }
        if segment == 0:
            for key, value in start_values.items():
                profile[key].append(value)
        for key, value in end_values.items():
            profile[key].append(value)

    if (
        abs(profile["y"][0] + 4.6) > 1e-5
        or abs(profile["y"][-1] - 4.6) > 1e-5
    ):
        raise RuntimeError(f"Hero 墙体纵向包络漂移：{profile['y']}")
    return profile


def extract_frozen_hero_geometry(
    hero: ModuleType,
) -> tuple[dict[str, dict[str, list[float]]], dict[str, Any]]:
    """构建冻结 Hero 内存场景，只抽取轮廓与入口横梁，不写回 Hero。"""

    hero.reset_scene()
    materials = [
        hero.make_material(
            "test-frozen-hero-mirror-light",
            (0.50, 0.60, 0.61, 1.0),
            roughness=0.13,
            metallic=0.82,
        ),
        hero.make_material(
            "test-frozen-hero-mirror-deep",
            (0.25, 0.34, 0.36, 1.0),
            roughness=0.17,
            metallic=0.76,
        ),
        hero.make_material(
            "test-frozen-hero-weathering-steel",
            (0.45, 0.21, 0.12, 1.0),
            roughness=0.58,
            metallic=0.30,
        ),
        hero.make_material(
            "test-frozen-hero-dark-seam",
            (0.055, 0.070, 0.072, 1.0),
            roughness=0.36,
            metallic=0.58,
        ),
    ]
    left = hero.build_wall("left", materials)
    right = hero.build_wall("right", materials)
    header = hero.build_entrance_header(materials)
    profiles = {
        "left": extract_wall_profile(left),
        "right": extract_wall_profile(right),
    }
    header_geometry = {
        "vertices": [
            tuple(float(value) for value in vertex.co)
            for vertex in header.data.vertices
        ],
        "faces": [
            tuple(int(value) for value in polygon.vertices)
            for polygon in header.data.polygons
        ],
    }
    if len(header_geometry["vertices"]) != 16 or len(header_geometry["faces"]) != 12:
        raise RuntimeError("Hero 入口横梁拓扑漂移")
    return profiles, header_geometry


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for value in list(collection):
            collection.remove(value)


def make_material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    roughness: float,
    metallic: float,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = color
    material.roughness = roughness
    material.metallic = metallic
    principled = next(
        (node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"),
        None,
    )
    if principled is None:
        raise RuntimeError(f"{name} 缺少 Principled BSDF")
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = metallic
    return material


class MeshBuilder:
    """为一个 Identity 组件累积封闭棱柱。"""

    def __init__(self, name: str, materials: list[bpy.types.Material]) -> None:
        self.name = name
        self.materials = materials
        self.vertices: list[tuple[float, float, float]] = []
        self.faces: list[tuple[int, ...]] = []
        self.material_indices: list[int] = []

    def add_prism(
        self,
        *,
        outer_x: tuple[float, float],
        inner_x: tuple[float, float],
        y: tuple[float, float],
        bottom_z: tuple[float, float],
        top_z: tuple[float, float],
        material_index: int,
    ) -> None:
        start = len(self.vertices)
        self.vertices.extend(
            [
                (outer_x[0], y[0], bottom_z[0]),
                (inner_x[0], y[0], bottom_z[0]),
                (inner_x[1], y[1], bottom_z[1]),
                (outer_x[1], y[1], bottom_z[1]),
                (outer_x[0], y[0], top_z[0]),
                (inner_x[0], y[0], top_z[0]),
                (inner_x[1], y[1], top_z[1]),
                (outer_x[1], y[1], top_z[1]),
            ]
        )
        self.faces.extend(
            [
                (start + 0, start + 3, start + 2, start + 1),
                (start + 4, start + 5, start + 6, start + 7),
                (start + 0, start + 1, start + 5, start + 4),
                (start + 3, start + 7, start + 6, start + 2),
                (start + 0, start + 4, start + 7, start + 3),
                (start + 1, start + 2, start + 6, start + 5),
            ]
        )
        self.material_indices.extend([material_index] * 6)

    def add_box(
        self,
        minimum: tuple[float, float, float],
        maximum: tuple[float, float, float],
        material_index: int,
    ) -> None:
        self.add_prism(
            outer_x=(minimum[0], minimum[0]),
            inner_x=(maximum[0], maximum[0]),
            y=(minimum[1], maximum[1]),
            bottom_z=(minimum[2], minimum[2]),
            top_z=(maximum[2], maximum[2]),
            material_index=material_index,
        )

    def finish(self, role: str) -> bpy.types.Object:
        mesh = bpy.data.meshes.new(f"{self.name}-mesh")
        mesh.from_pydata(self.vertices, [], self.faces)
        mesh.validate(verbose=True, clean_customdata=False)
        mesh.update(calc_edges=True)
        obj = bpy.data.objects.new(self.name, mesh)
        bpy.context.collection.objects.link(obj)
        for material in self.materials:
            mesh.materials.append(material)
        for polygon, material_index in zip(
            mesh.polygons,
            self.material_indices,
            strict=True,
        ):
            polygon.material_index = material_index
        obj["stable_asset_id"] = STABLE_ASSET_ID
        obj["asset_id"] = ASSET_ID
        obj["tier"] = "identity"
        obj["version"] = "identity-v1"
        obj["component_role"] = role
        obj["authored_front"] = AUTHORED_FRONT
        obj["glb_front"] = GLB_FRONT
        obj["scene_unit_meters"] = SCENE_UNIT_METERS
        obj["derived_from_hero_glb_sha256"] = HERO_GLB_SHA256
        obj["mcp3_status"] = "pending-main-window-xhigh"
        obj["runtime_integrated"] = False
        return obj


def build_identity_wall(
    side: str,
    profile: dict[str, list[float]],
    materials: list[bpy.types.Material],
) -> bpy.types.Object:
    """稀疏采样冻结 Hero 轮廓，保留双墙、钢带、镜面上缘与开放通路。"""

    if side not in {"left", "right"}:
        raise ValueError(side)
    builder = MeshBuilder(f"xinhua-pocket-park-identity-{side}-wall", materials)
    outer_x = -0.84 if side == "left" else 0.84
    selected = IDENTITY_PROFILE_INDICES
    for start_index, end_index in zip(selected[:-1], selected[1:], strict=True):
        outer = (outer_x, outer_x)
        inner = (
            profile["innerX"][start_index],
            profile["innerX"][end_index],
        )
        y = (profile["y"][start_index], profile["y"][end_index])
        builder.add_prism(
            outer_x=outer,
            inner_x=inner,
            y=y,
            bottom_z=(0.0, 0.0),
            top_z=(
                profile["mirrorTop"][start_index],
                profile["mirrorTop"][end_index],
            ),
            material_index=0,
        )
        builder.add_prism(
            outer_x=outer,
            inner_x=inner,
            y=y,
            bottom_z=(
                profile["mirrorTop"][start_index],
                profile["mirrorTop"][end_index],
            ),
            top_z=(
                profile["steelTop"][start_index],
                profile["steelTop"][end_index],
            ),
            material_index=1,
        )
        builder.add_prism(
            outer_x=outer,
            inner_x=inner,
            y=y,
            bottom_z=(
                profile["steelTop"][start_index],
                profile["steelTop"][end_index],
            ),
            top_z=(
                profile["wallTop"][start_index],
                profile["wallTop"][end_index],
            ),
            material_index=0,
        )

    for index in selected[1:-1]:
        seam_y = profile["y"][index]
        if side == "left":
            minimum_x, maximum_x = -0.705, -0.68
        else:
            minimum_x, maximum_x = 0.68, 0.705
        builder.add_box(
            (minimum_x, seam_y - 0.012, 0.0),
            (maximum_x, seam_y + 0.012, profile["wallTop"][index]),
            2,
        )
    return builder.finish(f"{side}-simplified-faceted-mirror-wall")


def build_identity_header(
    geometry: dict[str, Any],
    materials: list[bpy.types.Material],
) -> bpy.types.Object:
    """逐顶点复制冻结 Hero 入口横梁，避免 Identity 改变入口轮廓。"""

    builder = MeshBuilder(
        "xinhua-pocket-park-identity-entrance-header",
        materials,
    )
    builder.vertices = list(geometry["vertices"])
    builder.faces = list(geometry["faces"])
    builder.material_indices = [1] * len(builder.faces)
    return builder.finish("weathering-steel-entrance-header")


def configure_scene() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    if background is None:
        raise RuntimeError("预览世界缺少 Background")
    background.inputs["Color"].default_value = (0.045, 0.055, 0.06, 1.0)
    background.inputs["Strength"].default_value = 0.42
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0.6
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = SCENE_UNIT_METERS
    scene["stable_asset_id"] = STABLE_ASSET_ID
    scene["asset_id"] = ASSET_ID
    scene["tier"] = "identity"
    scene["version"] = "identity-v1"
    scene["derived_from_hero_glb_sha256"] = HERO_GLB_SHA256
    scene["hero_mcp2"] = "pass-main-window-xhigh"
    scene["mcp3"] = "pending-main-window-xhigh"
    scene["runtime_integrated"] = False
    scene["shared_registry_modified"] = False
    scene["shared_runtime_modified"] = False
    scene["fast_manifest_modified"] = False


def export_glb(path: Path, objects: list[bpy.types.Object]) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
    )


def add_preview_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    return obj


def add_preview_light(
    name: str,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
    energy: float,
    size: float,
) -> bpy.types.Object:
    data = bpy.data.lights.new(name=f"{name}-data", type="AREA")
    data.energy = energy
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
    """加入 QA-only 地面、1.8m 人物和灯光，不保存、不导出。"""

    ground_material = make_material(
        "test-identity-preview-ground-material",
        (0.10, 0.115, 0.12, 1.0),
        roughness=0.82,
        metallic=0.0,
    )
    human_material = make_material(
        "test-identity-preview-human-material",
        (0.84, 0.43, 0.19, 1.0),
        roughness=0.78,
        metallic=0.0,
    )
    helpers = [
        add_preview_box(
            "test-identity-preview-ground",
            (0.0, 0.0, -0.025),
            (8.0, 12.0, 0.05),
            ground_material,
        ),
        add_preview_box(
            "test-identity-preview-human-body-1p8m",
            (0.0, -3.2, 0.25),
            (0.18, 0.16, 0.50),
            human_material,
        ),
    ]
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=16,
        ring_count=8,
        radius=0.09,
        location=(0.0, -3.2, 0.585),
    )
    head = bpy.context.active_object
    head.name = "test-identity-preview-human-head-1p8m"
    head.data.materials.append(human_material)
    helpers.append(head)
    helpers.extend(
        [
            add_preview_light(
                "test-identity-preview-key",
                (5.5, -7.5, 8.5),
                (0.0, -0.5, 0.8),
                900.0,
                5.0,
            ),
            add_preview_light(
                "test-identity-preview-fill",
                (-5.0, -1.0, 5.0),
                (0.0, 0.0, 0.8),
                700.0,
                4.5,
            ),
            add_preview_light(
                "test-identity-preview-rim",
                (3.0, 6.5, 6.5),
                (0.0, 1.0, 0.9),
                1050.0,
                4.0,
            ),
        ]
    )
    return helpers


def render_preview(
    path: Path,
    camera_contract: dict[str, list[float] | float],
    label: str,
) -> None:
    location = tuple(float(value) for value in camera_contract["location"])
    target = tuple(float(value) for value in camera_contract["target"])
    bpy.ops.object.camera_add(location=location)
    camera = bpy.context.active_object
    camera.name = f"test-xinhua-pocket-park-identity-v1-{label}-camera"
    camera.data.type = "PERSP"
    camera.data.lens = float(camera_contract["lens"])
    camera.data.sensor_width = 36.0
    camera.rotation_euler = (
        Vector(target) - camera.location
    ).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)


def parse_glb(path: Path) -> dict[str, Any]:
    contents = path.read_bytes()
    if contents[:4] != b"glTF" or struct.unpack_from("<I", contents, 4)[0] != 2:
        raise RuntimeError(f"{path} 不是 glTF 2.0")
    json_length = struct.unpack_from("<I", contents, 12)[0]
    gltf = json.loads(contents[20 : 20 + json_length].decode("utf8"))
    triangles = 0
    primitives = 0
    bounds = {
        "min": [math.inf, math.inf, math.inf],
        "max": [-math.inf, -math.inf, -math.inf],
    }
    for mesh in gltf.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            primitives += 1
            position = gltf["accessors"][primitive["attributes"]["POSITION"]]
            indices = (
                gltf["accessors"][primitive["indices"]]
                if "indices" in primitive
                else position
            )
            triangles += indices["count"] // 3
            for axis in range(3):
                bounds["min"][axis] = min(bounds["min"][axis], position["min"][axis])
                bounds["max"][axis] = max(bounds["max"][axis], position["max"][axis])
    transformed_nodes = [
        node.get("name", f"node-{index}")
        for index, node in enumerate(gltf.get("nodes", []))
        if any(key in node for key in ("translation", "rotation", "scale", "matrix"))
    ]
    return {
        "bytes": len(contents),
        "nodes": len(gltf.get("nodes", [])),
        "meshes": len(gltf.get("meshes", [])),
        "primitives": primitives,
        "triangles": triangles,
        "materials": len(gltf.get("materials", [])),
        "materialNames": [
            material.get("name", "")
            for material in gltf.get("materials", [])
        ],
        "images": len(gltf.get("images", [])),
        "textures": len(gltf.get("textures", [])),
        "animations": len(gltf.get("animations", [])),
        "bounds": bounds,
        "transformedNodes": transformed_nodes,
        "nodeNames": [node.get("name", "") for node in gltf.get("nodes", [])],
        "nodeExtras": [node.get("extras", {}) for node in gltf.get("nodes", [])],
    }


def validate_glb(audit: dict[str, Any]) -> None:
    if audit["nodes"] != 3 or audit["meshes"] != 3:
        raise RuntimeError(f"Identity 必须保持三节点三网格：{audit}")
    if set(audit["materialNames"]) != EXPECTED_MATERIAL_NAMES:
        raise RuntimeError(f"Identity 材质语义异常：{audit}")
    if audit["images"] or audit["textures"] or audit["animations"]:
        raise RuntimeError(f"Identity 不允许图片、贴图或动画：{audit}")
    if audit["transformedNodes"]:
        raise RuntimeError(f"Identity 节点存在未烘焙变换：{audit}")
    if (
        audit["triangles"] >= HERO_TRIANGLES
        or audit["triangles"] > IDENTITY_BUDGET["maximumTriangles"]
        or audit["bytes"] > IDENTITY_BUDGET["maximumBytes"]
    ):
        raise RuntimeError(f"Identity 未降低拓扑或超出预算：{audit}")
    for boundary in ("min", "max"):
        for actual, expected in zip(
            audit["bounds"][boundary],
            EXPECTED_BOUNDS[boundary],
            strict=True,
        ):
            if abs(float(actual) - expected) > 1e-5:
                raise RuntimeError(f"Identity 改变 Hero 外包络：{audit['bounds']}")
    lowered = " ".join(audit["nodeNames"] + audit["materialNames"]).lower()
    for token in FORBIDDEN_NAME_TOKENS:
        if token in lowered:
            raise RuntimeError(f"Identity 含范围外构件 token：{token}")
    for extras in audit["nodeExtras"]:
        if (
            extras.get("stable_asset_id") != STABLE_ASSET_ID
            or extras.get("tier") != "identity"
            or extras.get("derived_from_hero_glb_sha256") != HERO_GLB_SHA256
            or extras.get("mcp3_status") != "pending-main-window-xhigh"
            or extras.get("runtime_integrated") is not False
        ):
            raise RuntimeError(f"Identity lineage / gate extras 异常：{extras}")


def run_triptych_builder() -> None:
    subprocess.run(["node", str(TRIPTYCH_SCRIPT_PATH)], cwd=ROOT, check=True)


def write_record(
    audit: dict[str, Any],
    objects: list[bpy.types.Object],
    hero_record: dict[str, Any],
) -> None:
    record = {
        "schemaVersion": 1,
        "assetId": ASSET_ID,
        "stableAssetId": STABLE_ASSET_ID,
        "tier": "identity",
        "version": "identity-v1",
        "generatedAt": AUDITED_AT,
        "status": "identity-v1-candidate-pending-main-window-xhigh-mcp3",
        "scope": {
            "modelAssets": 1,
            "runtimeInstancesCreated": 0,
            "sharedRegistryModified": False,
            "sharedRuntimeModified": False,
            "fastManifestModified": False,
            "excluded": [
                "plants and grass",
                "trees and decorations",
                "bench",
                "rotating exhibition or signage panels",
                "ground lights and tactile studs",
                "paving and path slabs",
                "adjacent buildings and full-map assets",
                "Recovery/Hold mutations",
            ],
        },
        "generator": {
            **artifact_record(Path(__file__).resolve()),
            "command": (
                "/Applications/Blender.app/Contents/MacOS/Blender "
                "--background --python-exit-code 1 "
                "--python scripts/create_xinhua_pocket_park_identity_v1.py"
            ),
            "blenderVersion": bpy.app.version_string,
            "singleAssetOnly": True,
        },
        "derivedFrom": {
            "heroGenerator": {
                "path": str(HERO_GENERATOR_PATH.relative_to(ROOT)),
                "sha256": HERO_GENERATOR_SHA256,
            },
            "heroEditableSource": {
                "path": str(HERO_BLEND_PATH.relative_to(ROOT)),
                "sha256": HERO_BLEND_SHA256,
            },
            "heroRuntimeAsset": {
                "path": str(HERO_GLB_PATH.relative_to(ROOT)),
                "sha256": HERO_GLB_SHA256,
                "triangles": HERO_TRIANGLES,
            },
            "heroBuildRecord": {
                "path": str(HERO_RECORD_PATH.relative_to(ROOT)),
                "sha256": HERO_RECORD_SHA256,
            },
            "heroMcp2Record": {
                "path": str(HERO_MCP2_PATH.relative_to(ROOT)),
                "sha256": HERO_MCP2_SHA256,
                "status": "pass-main-window-xhigh",
            },
            "massingRuntimeAsset": {
                "path": str(MASSING_GLB_PATH.relative_to(ROOT)),
                "sha256": MASSING_GLB_SHA256,
            },
            "profileExtraction": {
                "source": "in-memory output from frozen Hero generator",
                "heroProfileStationsPerWall": 13,
                "identityProfileStationsPerWall": len(IDENTITY_PROFILE_INDICES),
                "selectedHeroProfileIndices": IDENTITY_PROFILE_INDICES,
                "entranceHeader": "exact frozen Hero vertex and face copy",
            },
            "heroStatus": hero_record["status"],
        },
        "evidence": {
            "brief": {
                "path": str(BRIEF_PATH.relative_to(ROOT)),
                "sha256": file_sha256(BRIEF_PATH),
            },
            "canonicalReference": {
                "path": str(REFERENCE_PATH.relative_to(ROOT)),
                "sha256": file_sha256(REFERENCE_PATH),
                "usage": "research-only-not-embedded",
            },
            "preservedIdentityCues": [
                "paired continuous faceted mirror walls",
                "weathering-steel wave bands",
                "mirror upper silhouette",
                "weathering-steel entrance header",
                "open center passage",
            ],
            "deliberateLosses": [
                "13 Hero wall profile stations reduced to 8 Identity stations",
                "11 Hero seams per wall reduced to 6 Identity seams per wall",
                "two alternating Hero mirror materials merged to one Identity mirror material",
                "fine sub-panel variation omitted",
            ],
        },
        "contract": {
            "sceneUnitMeters": SCENE_UNIT_METERS,
            "authoredFront": AUTHORED_FRONT,
            "glbFront": GLB_FRONT,
            "origin": [0.0, 0.0, 0.0],
            "groundY": 0.0,
            "runtimePosition": RUNTIME_POSITION,
            "runtimeYaw": RUNTIME_YAW,
            "runtimeScale": RUNTIME_SCALE,
            "authoredEnvelope": {
                "widthSceneUnits": 1.68,
                "lengthSceneUnits": 9.2,
                "widthMetersAtRuntime": 3.99168,
                "lengthMetersAtRuntime": 21.8592,
            },
            "localObstacles": LOCAL_OBSTACLES,
            "centerPassage": {
                "minimumLocalWidthSceneUnits": 1.36,
                "runtimeWidthSceneUnits": 1.1968,
                "runtimeWidthMeters": 3.23136,
                "groundLevelCrossingObjects": 0,
            },
            "fixedCameras": FIXED_CAMERAS,
        },
        "outputs": {
            "blend": artifact_record(BLEND_PATH),
            "glb": {**artifact_record(GLB_PATH), **audit},
            "previews": {
                "canonical": artifact_record(CANONICAL_PATH),
                "side": artifact_record(SIDE_PATH),
                "detail": artifact_record(DETAIL_PATH),
                "runtimeIndependent": artifact_record(RUNTIME_INDEPENDENT_PATH),
            },
            "triptych": {
                **artifact_record(TRIPTYCH_PATH),
                "panels": [
                    "reference-research-only",
                    "frozen-hero-mcp2-pass",
                    "identity-v1-headless-candidate-mcp3-runtime-pending",
                ],
            },
        },
        "sourceBlend": {
            "objectNames": sorted(obj.name for obj in objects),
            "meshObjectCount": len(objects),
            "qaObjectsSaved": 0,
            "editable": True,
        },
        "budget": {
            **IDENTITY_BUDGET,
            "heroTriangles": HERO_TRIANGLES,
            "topologyReductionRequired": True,
        },
        "validation": {
            "headlessBuild": "pass",
            "glbAudit": "pass",
            "fixedCameraPreviews": "pass-generated-runtime-independent",
            "heroMcp2": "pass-retained-main-window-xhigh",
            "mcp3": "pending-main-window-xhigh",
            "threeJsIdentity": "pending-main-window",
            "fallbackPerformanceCollision": "pending-main-window",
            "runtimeClaimed": False,
            "performanceClaimed": False,
        },
    }
    RECORD_PATH.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )


def main() -> None:
    hero_record = preflight()
    for directory in (BLEND_PATH.parent, GLB_PATH.parent, RECORD_PATH.parent, PREVIEW_DIR):
        directory.mkdir(parents=True, exist_ok=True)

    hero = load_frozen_hero_module()
    profiles, header_geometry = extract_frozen_hero_geometry(hero)
    reset_scene()
    configure_scene()
    materials = [
        make_material(
            "xinhua-pocket-park-identity-mirror",
            (0.39, 0.49, 0.50, 1.0),
            roughness=0.16,
            metallic=0.80,
        ),
        make_material(
            "xinhua-pocket-park-identity-weathering-steel",
            (0.45, 0.21, 0.12, 1.0),
            roughness=0.58,
            metallic=0.30,
        ),
        make_material(
            "xinhua-pocket-park-identity-dark-seam",
            (0.055, 0.070, 0.072, 1.0),
            roughness=0.36,
            metallic=0.58,
        ),
    ]
    objects = [
        build_identity_wall("left", profiles["left"], materials),
        build_identity_wall("right", profiles["right"], materials),
        build_identity_header(header_geometry, materials),
    ]
    for obj in objects:
        if any(token in obj.name.lower() for token in FORBIDDEN_NAME_TOKENS):
            raise RuntimeError(f"范围外对象进入 Identity：{obj.name}")

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_glb(GLB_PATH, objects)
    audit = parse_glb(GLB_PATH)
    validate_glb(audit)

    helpers = add_preview_context()
    render_preview(CANONICAL_PATH, FIXED_CAMERAS["canonical"], "canonical")
    render_preview(SIDE_PATH, FIXED_CAMERAS["side"], "side")
    render_preview(DETAIL_PATH, FIXED_CAMERAS["detail"], "detail")
    render_preview(
        RUNTIME_INDEPENDENT_PATH,
        FIXED_CAMERAS["runtime-independent"],
        "runtime-independent",
    )
    for helper in helpers:
        bpy.data.objects.remove(helper, do_unlink=True)

    run_triptych_builder()
    write_record(audit, objects, hero_record)
    print(json.dumps(audit, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
