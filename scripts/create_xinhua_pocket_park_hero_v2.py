"""确定性生成新华路口袋公园 V2 Hero 候选。

本脚本只写入 ``xinhua-pocket-park`` 的独立 Hero 产物。它严格继承已通过
MCP1 的 Recovery Massing 原点、方向和 1.68 × 9.20 authored 包络，只制作
照片直接支持的双侧折面镜墙、耐候钢起伏带、入口顶框和结构分缝。

植物代理、座椅、旋转展板、地灯、铺装和其他装饰明确不进入本候选。
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
import struct
import subprocess
from typing import Any

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
AUDITED_AT = "2026-07-26"
ASSET_ID = "xinhua-pocket-park"
STABLE_ASSET_ID = "building:xinhua-road:xinhua-pocket-park"
SCENE_UNIT_METERS = 2.7
RUNTIME_POSITION = [-57.421934309, 67.06298037]
RUNTIME_YAW = -0.398058989
RUNTIME_SCALE = 0.88
AUTHORED_FRONT = "local-negative-y"
GLB_FRONT = "local-positive-z"

MASSING_BLEND_PATH = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/massing-v2"
    / "xinhua-pocket-park-massing.blend"
)
MASSING_GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/massing-v2"
    / "xinhua-pocket-park-massing.glb"
)
MASSING_RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/massing-v2"
    / "xinhua-pocket-park-massing.json"
)
MASSING_MCP1_PATH = ROOT / "docs/research/xinhua-pocket-park-blender-mcp-gates.json"
MASSING_MAP_PATH = ROOT / "docs/research/xinhua-pocket-park-massing-map-qa.json"
MASSING_RUNTIME_PATH = ROOT / "docs/research/xinhua-pocket-park-threejs-runtime-qa.json"
REFERENCE_MANIFEST_PATH = (
    ROOT / "docs/research/xinhua-pocket-park-reference-manifest.json"
)
BRIEF_PATH = ROOT / "docs/research/xinhua-pocket-park-model-brief.md"

MASSING_BLEND_SHA256 = (
    "40488f7394cd734fc67493d54cb7c44e7c3f55ccf14454d7d27e16b1ca183d27"
)
MASSING_GLB_SHA256 = (
    "cc89e36e68397199d91684d3059c5c88410a7acc1b1c015398e05d8e57b15fa3"
)
MASSING_RECORD_SHA256 = (
    "982b7768f9e2f8e800461bcfbb8cb28028d1200dad3fb03192c687cffbd6de8a"
)
MASSING_MCP1_SHA256 = (
    "097f49a975ec1ca54bb6e24188c4fcca4f273c40e752e8c21ebd532e02a20ef6"
)
MASSING_MAP_SHA256 = (
    "cac9c1993a9eb2ffa7680d91622ba4576704dba3274e1af859c6a7236ea83d9b"
)

BLEND_PATH = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/hero-v2"
    / "xinhua-pocket-park-hero.blend"
)
GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/hero-v2"
    / "xinhua-pocket-park-hero.glb"
)
PREVIEW_DIR = ROOT / "test_artifacts/all-models/hero-v2/xinhua-pocket-park"
CANONICAL_PATH = PREVIEW_DIR / "test_xinhua_pocket_park_hero_v2_canonical.png"
SIDE_PATH = PREVIEW_DIR / "test_xinhua_pocket_park_hero_v2_side.png"
ENTRANCE_PATH = PREVIEW_DIR / "test_xinhua_pocket_park_hero_v2_entrance.png"
TRIPTYCH_PATH = PREVIEW_DIR / "test_xinhua_pocket_park_hero_v2_triptych.png"
TRIPTYCH_SCRIPT_PATH = (
    ROOT / "scripts/test_generate_xinhua_pocket_park_hero_v2_triptych.mjs"
)
RECORD_PATH = (
    ROOT
    / "docs/research/build-records/tiers/xinhua-road/hero-v2"
    / "xinhua-pocket-park-hero.json"
)

EXPECTED_BOUNDS = {
    "min": [-0.84, 0.0, -4.6],
    "max": [0.84, 1.66, 4.6],
}
EXPECTED_MATERIAL_NAMES = {
    "xinhua-pocket-park-hero-mirror-light",
    "xinhua-pocket-park-hero-mirror-deep",
    "xinhua-pocket-park-hero-weathering-steel",
    "xinhua-pocket-park-hero-dark-seam",
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
    "ground",
)
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
    "entrance": {
        "location": [3.4, -10.8, 2.2],
        "target": [0.0, -1.8, 0.66],
        "lens": 55.0,
    },
}


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require_sha(path: Path, expected: str) -> None:
    actual = file_sha256(path)
    if actual != expected:
        raise RuntimeError(f"{path} SHA 不匹配：{actual} != {expected}")


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for data in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for value in list(data):
            data.remove(value)


def make_material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    roughness: float,
    metallic: float,
) -> bpy.types.Material:
    surface = bpy.data.materials.new(name)
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


class MeshBuilder:
    """为一个可编辑源对象累积多材质棱柱。"""

    def __init__(
        self,
        name: str,
        materials: list[bpy.types.Material],
    ) -> None:
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
        """加入沿廊道方向可折转、上下缘可起伏的封闭棱柱。"""

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
        for surface in self.materials:
            mesh.materials.append(surface)
        for polygon, material_index in zip(
            mesh.polygons,
            self.material_indices,
            strict=True,
        ):
            polygon.material_index = material_index
        obj["stable_asset_id"] = STABLE_ASSET_ID
        obj["asset_id"] = ASSET_ID
        obj["tier"] = "hero"
        obj["version_name"] = "hero-v2"
        obj["component_role"] = role
        obj["authored_front"] = AUTHORED_FRONT
        obj["glb_front"] = GLB_FRONT
        obj["scene_unit_meters"] = SCENE_UNIT_METERS
        obj["derived_from_massing_glb_sha256"] = MASSING_GLB_SHA256
        obj["mcp2_status"] = "pending-main-window-xhigh"
        obj["identity_allowed"] = False
        return obj


def build_wall(
    side: str,
    materials: list[bpy.types.Material],
) -> bpy.types.Object:
    """按照片中的折面镜墙、耐候钢带和上部镜面轮廓生成单侧建筑本体。"""

    if side not in {"left", "right"}:
        raise ValueError(side)
    sign = -1.0 if side == "left" else 1.0
    builder = MeshBuilder(f"xinhua-pocket-park-hero-{side}-wall", materials)
    y_values = [
        -4.6,
        -3.85,
        -3.1,
        -2.35,
        -1.6,
        -0.85,
        0.0,
        0.85,
        1.6,
        2.35,
        3.1,
        3.85,
        4.6,
    ]
    fold_offsets = [
        0.0,
        0.032,
        0.014,
        0.044,
        0.020,
        0.039,
        0.010,
        0.034,
        0.018,
        0.041,
        0.015,
        0.030,
        0.0,
    ]
    mirror_lower = [
        0.98,
        1.02,
        0.96,
        1.05,
        1.00,
        1.08,
        1.02,
        1.06,
        0.98,
        1.04,
        1.00,
        1.06,
        1.00,
    ]
    steel_top = [
        1.22,
        1.30,
        1.25,
        1.38,
        1.32,
        1.40,
        1.31,
        1.36,
        1.28,
        1.39,
        1.30,
        1.37,
        1.25,
    ]
    wall_top = [
        1.48,
        1.56,
        1.50,
        1.62,
        1.55,
        1.66,
        1.57,
        1.63,
        1.53,
        1.64,
        1.56,
        1.61,
        1.48,
    ]

    outer_x = sign * 0.84
    inner_x = [
        sign * (0.68 + offset)
        for offset in fold_offsets
    ]
    for index in range(len(y_values) - 1):
        y = (y_values[index], y_values[index + 1])
        outer = (outer_x, outer_x)
        inner = (inner_x[index], inner_x[index + 1])
        # 入口向内观察时，交错深浅镜面使折面节奏可读，但不改变实体边界。
        mirror_material = 0 if (index + (side == "right")) % 2 == 0 else 1
        builder.add_prism(
            outer_x=outer,
            inner_x=inner,
            y=y,
            bottom_z=(0.0, 0.0),
            top_z=(mirror_lower[index], mirror_lower[index + 1]),
            material_index=mirror_material,
        )
        builder.add_prism(
            outer_x=outer,
            inner_x=inner,
            y=y,
            bottom_z=(mirror_lower[index], mirror_lower[index + 1]),
            top_z=(steel_top[index], steel_top[index + 1]),
            material_index=2,
        )
        builder.add_prism(
            outer_x=outer,
            inner_x=inner,
            y=y,
            bottom_z=(steel_top[index], steel_top[index + 1]),
            top_z=(wall_top[index], wall_top[index + 1]),
            material_index=1 if mirror_material == 0 else 0,
        )

    # 分缝位于墙厚内部，不侵入 ±0.68 的中心开放边界。
    for index in range(1, len(y_values) - 1):
        seam_y = y_values[index]
        if side == "left":
            minimum_x, maximum_x = -0.705, -0.68
        else:
            minimum_x, maximum_x = 0.68, 0.705
        builder.add_box(
            (minimum_x, seam_y - 0.012, 0.0),
            (maximum_x, seam_y + 0.012, wall_top[index]),
            3,
        )
    return builder.finish(f"{side}-faceted-mirror-wall")


def build_entrance_header(
    materials: list[bpy.types.Material],
) -> bpy.types.Object:
    """生成只位于人头上方的耐候钢起伏入口顶框，中心地面保持全开。"""

    builder = MeshBuilder("xinhua-pocket-park-hero-entrance-header", materials)
    # 两段顶框在中心升高，最高点继承 Massing 的 1.66 authored 高度。
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []
    material_indices: list[int] = []
    profiles = [
        (-0.84, 1.34, 1.50),
        (0.0, 1.43, 1.66),
        (0.84, 1.33, 1.49),
    ]
    for index in range(2):
        start = len(vertices)
        x0, bottom0, top0 = profiles[index]
        x1, bottom1, top1 = profiles[index + 1]
        vertices.extend(
            [
                (x0, -4.6, bottom0),
                (x1, -4.6, bottom1),
                (x1, -4.36, bottom1),
                (x0, -4.36, bottom0),
                (x0, -4.6, top0),
                (x1, -4.6, top1),
                (x1, -4.36, top1),
                (x0, -4.36, top0),
            ]
        )
        faces.extend(
            [
                (start + 0, start + 3, start + 2, start + 1),
                (start + 4, start + 5, start + 6, start + 7),
                (start + 0, start + 1, start + 5, start + 4),
                (start + 3, start + 7, start + 6, start + 2),
                (start + 0, start + 4, start + 7, start + 3),
                (start + 1, start + 2, start + 6, start + 5),
            ]
        )
        material_indices.extend([2] * 6)
    builder.vertices = vertices
    builder.faces = faces
    builder.material_indices = material_indices
    return builder.finish("weathering-steel-entrance-header")


def configure_scene() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    if background is None:
        raise RuntimeError("预览世界缺少 Background 节点")
    background.inputs["Color"].default_value = (0.045, 0.055, 0.06, 1.0)
    background.inputs["Strength"].default_value = 0.42
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0.6
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = SCENE_UNIT_METERS
    scene["stable_asset_id"] = STABLE_ASSET_ID
    scene["asset_id"] = ASSET_ID
    scene["tier"] = "hero"
    scene["version_name"] = "hero-v2"
    scene["scene_unit_meters"] = SCENE_UNIT_METERS
    scene["authored_front"] = AUTHORED_FRONT
    scene["glb_front"] = GLB_FRONT
    scene["derived_from_massing_glb_sha256"] = MASSING_GLB_SHA256
    scene["massing_mcp1"] = "pass-retained"
    scene["massing_map_geometry"] = "pass-retained"
    scene["massing_runtime_camera"] = "main-window-fix-in-progress"
    scene["hero_mcp2"] = "pending-main-window-xhigh"
    scene["identity_allowed"] = False
    scene["public_registry_modified"] = False


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


def add_preview_material(
    name: str,
    color: tuple[float, float, float, float],
) -> bpy.types.Material:
    return make_material(name, color, roughness=0.82, metallic=0.0)


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
    light_type: str,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
    energy: float,
    *,
    size: float,
) -> bpy.types.Object:
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
    """加入不保存、不导出的地面、1.8m 人物比例代理和灯光。"""

    helpers: list[bpy.types.Object] = []
    ground_material = add_preview_material(
        "test-preview-ground-material",
        (0.10, 0.115, 0.12, 1.0),
    )
    human_material = add_preview_material(
        "test-preview-human-material",
        (0.84, 0.43, 0.19, 1.0),
    )
    ground = add_preview_box(
        "test-preview-ground",
        (0.0, 0.0, -0.025),
        (8.0, 12.0, 0.05),
        ground_material,
    )
    helpers.append(ground)

    # 1.8m / 2.7m = 0.6667 scene unit；仅用于入口预览比例，不进入源文件。
    body = add_preview_box(
        "test-preview-human-body-1p8m",
        (0.0, -3.2, 0.25),
        (0.18, 0.16, 0.50),
        human_material,
    )
    helpers.append(body)
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=16,
        ring_count=8,
        radius=0.09,
        location=(0.0, -3.2, 0.585),
    )
    head = bpy.context.active_object
    head.name = "test-preview-human-head-1p8m"
    head.data.materials.append(human_material)
    helpers.append(head)
    helpers.extend(
        [
            add_preview_light(
                "test-preview-key-light",
                "AREA",
                (5.5, -7.5, 8.5),
                (0.0, -0.5, 0.8),
                900.0,
                size=5.0,
            ),
            add_preview_light(
                "test-preview-fill-light",
                "AREA",
                (-5.0, -1.0, 5.0),
                (0.0, 0.0, 0.8),
                700.0,
                size=4.5,
            ),
            add_preview_light(
                "test-preview-rim-light",
                "AREA",
                (3.0, 6.5, 6.5),
                (0.0, 1.0, 0.9),
                1050.0,
                size=4.0,
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
    camera.name = f"test-xinhua-pocket-park-hero-v2-{label}-camera"
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
                bounds["min"][axis] = min(
                    bounds["min"][axis],
                    position["min"][axis],
                )
                bounds["max"][axis] = max(
                    bounds["max"][axis],
                    position["max"][axis],
                )
    transformed_nodes = [
        node.get("name", f"node-{index}")
        for index, node in enumerate(gltf.get("nodes", []))
        if any(
            key in node
            for key in ("translation", "rotation", "scale", "matrix")
        )
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
        "nodeNames": [
            node.get("name", "")
            for node in gltf.get("nodes", [])
        ],
        "nodeExtras": [
            node.get("extras", {})
            for node in gltf.get("nodes", [])
        ],
    }


def validate_glb(audit: dict[str, Any]) -> None:
    if audit["nodes"] != 3 or audit["meshes"] != 3:
        raise RuntimeError(f"Hero v2 必须保持三节点三网格：{audit}")
    if set(audit["materialNames"]) != EXPECTED_MATERIAL_NAMES:
        raise RuntimeError(f"Hero v2 材质语义异常：{audit}")
    if audit["images"] or audit["textures"] or audit["animations"]:
        raise RuntimeError(f"Hero v2 不允许图片、贴图或动画：{audit}")
    if audit["transformedNodes"]:
        raise RuntimeError(f"Hero v2 节点存在未烘焙变换：{audit}")
    if audit["triangles"] > 2500 or audit["bytes"] > 650000:
        raise RuntimeError(f"Hero v2 超出预算：{audit}")
    for boundary in ("min", "max"):
        for actual, expected in zip(
            audit["bounds"][boundary],
            EXPECTED_BOUNDS[boundary],
            strict=True,
        ):
            if abs(float(actual) - expected) > 1e-5:
                raise RuntimeError(
                    "Hero v2 不得改变 Massing 的原点和外包络："
                    f"{audit['bounds']}"
                )
    lowered = " ".join(
        audit["nodeNames"] + audit["materialNames"]
    ).lower()
    for token in FORBIDDEN_NAME_TOKENS:
        if token in lowered:
            raise RuntimeError(f"Hero v2 含范围外构件 token：{token}")
    for extras in audit["nodeExtras"]:
        if extras.get("stable_asset_id") != STABLE_ASSET_ID:
            raise RuntimeError(f"Hero v2 stable asset ID 缺失：{audit}")
        if extras.get("derived_from_massing_glb_sha256") != MASSING_GLB_SHA256:
            raise RuntimeError(f"Hero v2 Massing lineage 缺失：{audit}")


def run_triptych_builder() -> None:
    subprocess.run(
        ["node", str(TRIPTYCH_SCRIPT_PATH)],
        cwd=ROOT,
        check=True,
    )


def artifact_record(path: Path) -> dict[str, Any]:
    return {
        "path": str(path.relative_to(ROOT)),
        "sha256": file_sha256(path),
        "bytes": path.stat().st_size,
    }


def write_record(audit: dict[str, Any], objects: list[bpy.types.Object]) -> None:
    generator_record = artifact_record(Path(__file__).resolve())
    record = {
        "schemaVersion": 1,
        "assetId": ASSET_ID,
        "stableAssetId": STABLE_ASSET_ID,
        "tier": "hero",
        "version": "hero-v2",
        "generatedAt": AUDITED_AT,
        "status": "candidate-pending-main-window-xhigh-mcp2",
        "scope": {
            "modelAssets": 1,
            "runtimeInstancesCreated": 0,
            "identityCreated": False,
            "sharedRegistryModified": False,
            "sharedRuntimeModified": False,
            "fastManifestModified": False,
            "excluded": [
                "planting proxies",
                "bench",
                "rotating exhibition panels",
                "ground lights",
                "paving and path slab",
                "trees and decorations",
                "full-map assets",
                "Recovery/Hold mutations",
            ],
        },
        "generator": {
            **generator_record,
            "command": (
                "/Applications/Blender.app/Contents/MacOS/Blender "
                "--background --python-exit-code 1 "
                "--python scripts/create_xinhua_pocket_park_hero_v2.py"
            ),
            "blenderVersion": bpy.app.version_string,
            "singleAssetOnly": True,
        },
        "lineage": {
            "derivedFromTier": "massing-v2",
            "massingBlend": {
                "path": str(MASSING_BLEND_PATH.relative_to(ROOT)),
                "sha256": MASSING_BLEND_SHA256,
            },
            "massingGlb": {
                "path": str(MASSING_GLB_PATH.relative_to(ROOT)),
                "sha256": MASSING_GLB_SHA256,
            },
            "massingBuildRecord": {
                "path": str(MASSING_RECORD_PATH.relative_to(ROOT)),
                "sha256": MASSING_RECORD_SHA256,
            },
            "massingMcp1": {
                "path": str(MASSING_MCP1_PATH.relative_to(ROOT)),
                "sha256": MASSING_MCP1_SHA256,
                "status": "pass-retained",
            },
            "massingMap": {
                "path": str(MASSING_MAP_PATH.relative_to(ROOT)),
                "sha256": MASSING_MAP_SHA256,
                "geometry": "pass-retained",
                "camera": "main-window-fix-in-progress",
            },
            "legacyHeroUsedAsGeometrySource": False,
        },
        "evidence": {
            "referenceManifest": {
                "path": str(REFERENCE_MANIFEST_PATH.relative_to(ROOT)),
                "sha256": file_sha256(REFERENCE_MANIFEST_PATH),
            },
            "brief": {
                "path": str(BRIEF_PATH.relative_to(ROOT)),
                "sha256": file_sha256(BRIEF_PATH),
            },
            "observedIdentityCues": [
                "paired continuous faceted mirror walls",
                "weathering-steel wave band",
                "mirror upper silhouette above the steel band",
                "weathering-steel entrance header",
                "vertical mirror-panel seams",
            ],
            "unknownKeptUnmodeled": [
                "surveyed irregular width profile",
                "rear termination outside the accepted envelope",
                "exact facade offsets and panel module dimensions",
                "current planting and movable furnishing layout",
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
        },
        "outputs": {
            "blend": artifact_record(BLEND_PATH),
            "glb": {
                **artifact_record(GLB_PATH),
                **audit,
            },
            "previews": {
                "canonical": artifact_record(CANONICAL_PATH),
                "side": artifact_record(SIDE_PATH),
                "entrance": artifact_record(ENTRANCE_PATH),
            },
            "triptych": {
                **artifact_record(TRIPTYCH_PATH),
                "panels": [
                    "reference-research-only",
                    "blender-hero-v2-candidate",
                    "threejs-accepted-massing-hero-runtime-pending",
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
            "maximumNodes": 6,
            "maximumTriangles": 2500,
            "maximumMaterials": 4,
            "maximumImages": 0,
            "maximumBytes": 650000,
        },
        "validation": {
            "headlessBuild": "pass",
            "glbAudit": "pass",
            "fixedCameraFallback": "pass-generated-not-mcp2",
            "mcp2": "pending-main-window-xhigh",
            "identityAuthorized": False,
            "heroRuntime": "pending-after-mcp2-and-main-window-integration",
            "performanceClaimed": False,
        },
    }
    RECORD_PATH.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )


def main() -> None:
    for path in (
        MASSING_BLEND_PATH,
        MASSING_GLB_PATH,
        MASSING_RECORD_PATH,
        MASSING_MCP1_PATH,
        MASSING_MAP_PATH,
        MASSING_RUNTIME_PATH,
        REFERENCE_MANIFEST_PATH,
        BRIEF_PATH,
        TRIPTYCH_SCRIPT_PATH,
    ):
        if not path.exists():
            raise RuntimeError(f"缺少 Hero 前置输入：{path}")
    require_sha(MASSING_BLEND_PATH, MASSING_BLEND_SHA256)
    require_sha(MASSING_GLB_PATH, MASSING_GLB_SHA256)
    require_sha(MASSING_RECORD_PATH, MASSING_RECORD_SHA256)
    require_sha(MASSING_MCP1_PATH, MASSING_MCP1_SHA256)
    require_sha(MASSING_MAP_PATH, MASSING_MAP_SHA256)

    for directory in (
        BLEND_PATH.parent,
        GLB_PATH.parent,
        PREVIEW_DIR,
        RECORD_PATH.parent,
    ):
        directory.mkdir(parents=True, exist_ok=True)

    reset_scene()
    configure_scene()
    materials = [
        make_material(
            "xinhua-pocket-park-hero-mirror-light",
            (0.50, 0.60, 0.61, 1.0),
            roughness=0.13,
            metallic=0.82,
        ),
        make_material(
            "xinhua-pocket-park-hero-mirror-deep",
            (0.25, 0.34, 0.36, 1.0),
            roughness=0.17,
            metallic=0.76,
        ),
        make_material(
            "xinhua-pocket-park-hero-weathering-steel",
            (0.45, 0.21, 0.12, 1.0),
            roughness=0.58,
            metallic=0.30,
        ),
        make_material(
            "xinhua-pocket-park-hero-dark-seam",
            (0.055, 0.070, 0.072, 1.0),
            roughness=0.36,
            metallic=0.58,
        ),
    ]
    objects = [
        build_wall("left", materials),
        build_wall("right", materials),
        build_entrance_header(materials),
    ]
    for obj in objects:
        if any(token in obj.name.lower() for token in FORBIDDEN_NAME_TOKENS):
            raise RuntimeError(f"范围外对象进入 Hero：{obj.name}")
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_glb(GLB_PATH, objects)
    audit = parse_glb(GLB_PATH)
    validate_glb(audit)

    helpers = add_preview_context()
    render_preview(CANONICAL_PATH, FIXED_CAMERAS["canonical"], "canonical")
    render_preview(SIDE_PATH, FIXED_CAMERAS["side"], "side")
    render_preview(ENTRANCE_PATH, FIXED_CAMERAS["entrance"], "entrance")
    for helper in helpers:
        bpy.data.objects.remove(helper, do_unlink=True)

    run_triptych_builder()
    write_record(audit, objects)
    print(json.dumps(audit, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
