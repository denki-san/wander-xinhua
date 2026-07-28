"""把 Meshy Agent 网页候选编译为漫步新华的可编辑低模街景资产。

原始 GLB 是外置不可变证据的工作副本。本生成器只创建新的 .blend、GLB、预览和
build record，不覆盖任何 Meshy 原始文件。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys
from typing import Any

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
PACKAGE_SLUG = "meshy-agent-street-assets"
REPOSITORY_RAW_DIR = (
    ROOT / "test_artifacts/test_meshy_agent_batch_20260728/raw_exports"
)
FINAL_SNAPSHOT_ID = "2026-07-28-meshy-agent-street-assets-final-2ca6310"
ARCHIVED_RAW_DIR = (
    Path("/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots")
    / FINAL_SNAPSHOT_ID
    / "repository/test_artifacts/test_meshy_agent_batch_20260728/raw_exports"
)
SOURCE_DIR = ROOT / "assets/models/source/nonbuilding" / PACKAGE_SLUG
RUNTIME_DIR = ROOT / "public/models/nonbuilding" / PACKAGE_SLUG
PREVIEW_DIR = ROOT / "test_artifacts/nonbuilding" / PACKAGE_SLUG
RECORD_DIR = ROOT / "docs/research/build-records/nonbuilding" / PACKAGE_SLUG
MANIFEST_PATH = ROOT / "docs/research/meshy-agent-street-assets-model-manifest.json"
REFERENCE_MANIFEST = "docs/research/meshy-agent-street-assets-reference-manifest.json"
MODEL_BRIEF = "docs/research/meshy-agent-street-assets-model-brief.md"
DECISION_LOG = "docs/research/meshy-agent-street-assets-decision-log.md"
GENERATOR_PATH = "scripts/create_meshy_agent_street_asset_models.py"
EVIDENCE_SNAPSHOT = "2026-07-28-2ca6310"
AUDITED_AT = "2026-07-28"


PALETTE = {
    "bark": (0.22, 0.115, 0.055, 1.0),
    "foliage-dark": (0.12, 0.29, 0.14, 1.0),
    "foliage-warm": (0.42, 0.38, 0.13, 1.0),
    "metal-dark": (0.055, 0.075, 0.068, 1.0),
    "lamp-warm": (0.82, 0.48, 0.16, 1.0),
    "wood": (0.28, 0.115, 0.055, 1.0),
    "planter": (0.20, 0.22, 0.21, 1.0),
    "soil": (0.105, 0.055, 0.028, 1.0),
    "stone": (0.26, 0.285, 0.28, 1.0),
    "silver": (0.42, 0.46, 0.45, 1.0),
    "blue": (0.12, 0.30, 0.38, 1.0),
    "coral": (0.64, 0.20, 0.14, 1.0),
    "ac-shell": (0.55, 0.54, 0.49, 1.0),
}


def asset(
    slug: str,
    filename: str,
    source_sha256: str,
    target_dimensions: tuple[float, float, float],
    max_triangles: int,
    max_materials: int,
    max_bytes: int,
    use: str,
    max_instances: int,
    recognizers: list[str],
    material_rule: str,
    decimate_target: int | None = None,
    wall_anchor: bool = False,
) -> dict[str, Any]:
    return {
        "slug": slug,
        "assetId": f"shared:street-asset:{slug}",
        "filename": filename,
        "sourceSha256": source_sha256,
        "targetDimensionsMeters": list(target_dimensions),
        "budget": {
            "maxTriangles": max_triangles,
            "maxNodes": 3,
            "maxMaterials": max_materials,
            "maxImages": 0,
            "maxTextures": 0,
            "maxBinaryBytes": max_bytes,
        },
        "use": use,
        "maxInstances": max_instances,
        "recognizers": recognizers,
        "materialRule": material_rule,
        "decimateTarget": decimate_target,
        "wallAnchor": wall_anchor,
    }


ASSETS = [
    asset(
        "plane-tree-straight-sparse",
        "Meshy_AI_plane_tree_straight_s_0727170449_generate.glb",
        "5dcb00753acd3cf9275374be31583a9c8a03e2baf4920a74466a549929497708",
        (7.148438, 5.898438, 10.0),
        4000,
        3,
        900_000,
        "近景行道树候选；正式高重复版前最多四个实例",
        4,
        ["单一连续主干", "疏松分层树冠", "叶簇间可见空隙"],
        "tree",
        3900,
    ),
    asset(
        "lane-lamp-short-arm",
        "Meshy_AI_lane_lamp_short_arm_0727170548_generate.glb",
        "5e4cde3a41eb9be1cd52ffedefac06b538d263e112ef4a0838609fe083993ef7",
        (1.069687, 0.574219, 3.36),
        1500,
        2,
        256_000,
        "里弄重复路灯",
        24,
        ["细长灯杆", "约半米短臂", "克制八边形灯罩"],
        "lamp",
        1450,
    ),
    asset(
        "slatted-bench-backrest",
        "Meshy_AI_slatted_bench_remesh2_0727170635_generate.glb",
        "fce50d3baebc35a8e2b127985b9dece96f2bd2bacfcc13c46724afbaa388f066",
        (2.08, 0.82, 0.93),
        2500,
        3,
        256_000,
        "店前与水边可复用长椅",
        12,
        ["可见条板缝", "深灰金属支架", "四个可信落地点"],
        "bench",
    ),
    asset(
        "street-planter-long",
        "Meshy_AI_street_planter_remesh_0727170718_generate.glb",
        "63a20265f78a5abf81b13fc070f773efe4a818ef923ea87524f15a0b28634337",
        (1.40, 0.54, 0.55),
        1500,
        4,
        192_000,
        "店前与水边通用花箱",
        16,
        ["清晰槽口", "可见土层", "两至三团叶簇"],
        "planter",
    ),
    asset(
        "stone-bollard-squat",
        "Meshy_AI_stone_bollard_remesh__0727165819_generate.glb",
        "b40a2cc2c8a95ace03730eb660abf149cbec26fd8f1f7ed3d4c1fad6d55d86da",
        (0.60, 0.52, 0.75),
        500,
        1,
        96_000,
        "入口与边界高重复石桩",
        32,
        ["矮方轮廓", "不规则侧面", "斜切顶面"],
        "stone",
    ),
    asset(
        "shanghai-dual-classification-bin",
        "Meshy_AI_shanghai_dual_classif_0727170748_generate.glb",
        "93ad9c582c19540aa9a98af13258fd76bd88483b3ba12b85d4358d72dadb6ea7",
        (0.90, 0.46, 0.91),
        1200,
        3,
        192_000,
        "沿街高重复双分类垃圾桶",
        20,
        ["双投口", "中缝", "银灰与低饱和蓝分区"],
        "bin",
        1150,
    ),
    asset(
        "cantilever-cafe-umbrella",
        "Meshy_AI_cantilever_cafe_umbre_0727170809_generate.glb",
        "aa05ecb11f89262277a11c485d1ecec4ffbba7a43baa924789e123f44b027532",
        (2.80, 2.80, 2.57),
        2000,
        2,
        256_000,
        "餐饮外摆悬臂伞",
        8,
        ["方形伞面", "侧置支架与悬臂", "低矮配重底座"],
        "umbrella",
        1900,
    ),
    asset(
        "outdoor-dining-dark-wood",
        "Meshy_AI_outdoor_dining_remesh_0727170828_generate.glb",
        "71436018e7f5cec12a62dd5e7646814db7729c35f8f63e763d59b5b234728a6a",
        (2.40, 2.20, 0.90),
        3000,
        2,
        320_000,
        "一桌两椅可移动组合",
        8,
        ["单张长方桌", "两把椅子相对", "全部腿独立落地"],
        "dining",
    ),
    asset(
        "vintage-step-through-bicycle",
        "Meshy_AI_vintage_step_through__0727171113_generate.glb",
        "234d0dc8e8b5b8301c6df5e7b97d5361ca9b270721156d43cecf57dff3a488b9",
        (1.76, 0.60, 1.10),
        5000,
        3,
        700_000,
        "少量近景身份道具",
        4,
        ["两轮闭环", "弯梁车架", "前篮、后架与挡泥板"],
        "bicycle",
        4900,
    ),
    asset(
        "wall-ac-outdoor-unit",
        "Meshy_AI_wall_ac_remesh2_1200_0727171203_generate.glb",
        "cd53a937eaeb1d530c9e1965ab718829e110ed94af844665c837d337b23e8ba9",
        (0.80, 0.32, 0.55),
        1000,
        2,
        160_000,
        "立面高重复生活细节",
        24,
        ["闭合箱体", "单个大风扇圆环", "百叶与双托架"],
        "ac",
        950,
        True,
    ),
]


def parse_arguments() -> argparse.Namespace:
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset", help="只生成一个 asset slug")
    parser.add_argument(
        "--source-root",
        type=Path,
        help="Meshy 原始 GLB 目录；未指定时依次查找仓库工作副本与外置最终快照",
    )
    return parser.parse_args(arguments)


def resolve_source_dir(explicit_source_root: Path | None) -> Path:
    candidates = (
        [explicit_source_root]
        if explicit_source_root is not None
        else [REPOSITORY_RAW_DIR, ARCHIVED_RAW_DIR]
    )
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved.is_dir():
            return resolved
    searched = ", ".join(str(candidate) for candidate in candidates)
    raise FileNotFoundError(
        "找不到 Meshy 原始证据目录。请挂载不可变快照或传入 "
        f"--source-root；已检查：{searched}"
    )


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def configure_scene() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (0.025, 0.028, 0.026)
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.image_settings.color_mode = "RGBA"

    bpy.ops.object.light_add(type="AREA", location=(4.5, -5.5, 7.0))
    key = bpy.context.active_object
    key.name = "test-key-light"
    key.data.energy = 950
    key.data.shape = "DISK"
    key.data.size = 5.0
    key.rotation_euler = (math.radians(25), 0, math.radians(35))

    bpy.ops.object.light_add(type="AREA", location=(-4.0, -2.0, 4.0))
    fill = bpy.context.active_object
    fill.name = "test-fill-light"
    fill.data.energy = 520
    fill.data.size = 4.0
    fill.rotation_euler = (math.radians(60), 0, math.radians(-55))

    bpy.ops.object.light_add(type="AREA", location=(0, 4.5, 5.0))
    rim = bpy.context.active_object
    rim.name = "test-rim-light"
    rim.data.energy = 650
    rim.data.size = 3.5
    rim.rotation_euler = (math.radians(-55), 0, math.radians(180))


def make_material(slug: str, label: str) -> bpy.types.Material:
    material = bpy.data.materials.new(f"{slug}-{label}")
    material.diffuse_color = PALETTE[label]
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = PALETTE[label]
    shader.inputs["Roughness"].default_value = 0.78
    shader.inputs["Metallic"].default_value = (
        0.28 if label in {"metal-dark", "silver", "blue"} else 0.0
    )
    return material


def import_source(
    asset_data: dict[str, Any],
    source_dir: Path,
) -> bpy.types.Object:
    source = source_dir / asset_data["filename"]
    if not source.is_file():
        raise FileNotFoundError(source)
    actual_sha = file_sha256(source)
    if actual_sha != asset_data["sourceSha256"]:
        raise RuntimeError(
            f"{asset_data['slug']} 源 SHA 不匹配：{actual_sha}"
        )

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(source))
    imported = [obj for obj in bpy.data.objects if obj not in before]
    meshes = [obj for obj in imported if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"{asset_data['slug']} 没有导入 mesh")

    for obj in meshes:
        world = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = world

    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    result = bpy.context.active_object
    result.name = asset_data["slug"]
    result.data.name = f"{asset_data['slug']}-mesh"
    result.parent = None
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

    for obj in imported:
        if obj != result and obj.name in bpy.data.objects:
            bpy.data.objects.remove(obj, do_unlink=True)
    return result


def triangle_count(obj: bpy.types.Object) -> int:
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def decimate(obj: bpy.types.Object, target: int | None) -> dict[str, Any]:
    before = triangle_count(obj)
    if not target or before <= target:
        return {"before": before, "target": target, "after": before, "applied": False}
    modifier = obj.modifiers.new("controlled-visible-low-decimate", "DECIMATE")
    modifier.decimate_type = "COLLAPSE"
    modifier.ratio = max(0.01, min(1.0, target / before))
    modifier.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    after = triangle_count(obj)
    return {"before": before, "target": target, "after": after, "applied": True}


def apply_object_transform(obj: bpy.types.Object) -> bpy.types.Object:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.select_set(False)
    return obj


def add_box(
    name: str,
    dimensions: tuple[float, float, float],
    location: tuple[float, float, float],
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dimensions
    return apply_object_transform(obj)


def add_cylinder(
    name: str,
    radius: float,
    depth: float,
    location: tuple[float, float, float],
    vertices: int = 8,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        end_fill_type="NGON",
        location=location,
    )
    obj = bpy.context.active_object
    obj.name = name
    return apply_object_transform(obj)


def add_cone(
    name: str,
    radius1: float,
    radius2: float,
    depth: float,
    location: tuple[float, float, float],
    vertices: int = 8,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        end_fill_type="NGON",
        location=location,
    )
    obj = bpy.context.active_object
    obj.name = name
    return apply_object_transform(obj)


def add_cylinder_between(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius: float,
    vertices: int = 8,
) -> bpy.types.Object:
    first = Vector(start)
    second = Vector(end)
    direction = second - first
    obj = add_cylinder(
        name,
        radius,
        direction.length,
        tuple((first + second) * 0.5),
        vertices,
    )
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return apply_object_transform(obj)


def add_ico_cluster(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=2,
        radius=1,
        location=location,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    obj.rotation_euler = (
        math.radians((len(name) * 11) % 23),
        math.radians((len(name) * 17) % 29),
        math.radians((len(name) * 7) % 31),
    )
    return apply_object_transform(obj)


def add_torus_wheel(
    name: str,
    location: tuple[float, float, float],
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_segments=16,
        minor_segments=4,
        location=location,
        major_radius=0.31,
        minor_radius=0.018,
        rotation=(math.radians(90), 0, 0),
    )
    obj = bpy.context.active_object
    obj.name = name
    return apply_object_transform(obj)


def join_parts(slug: str, parts: list[bpy.types.Object]) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    result = bpy.context.active_object
    result.name = slug
    result.data.name = f"{slug}-mesh"
    result.parent = None
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return result


def build_plane_tree(asset_data: dict[str, Any]) -> bpy.types.Object:
    parts = [
        add_cone("trunk", 0.38, 0.24, 5.4, (0, 0, 2.7), 9),
        add_cylinder_between("branch-left", (0, 0, 4.1), (-1.55, 0.05, 6.25), 0.13, 7),
        add_cylinder_between("branch-right", (0, 0, 4.25), (1.55, -0.05, 6.45), 0.12, 7),
        add_cylinder_between("branch-top", (0, 0, 4.7), (0.15, 0, 8.25), 0.11, 7),
    ]
    clusters = [
        ((-1.75, 0.05, 5.9), (1.35, 0.92, 0.74)),
        ((1.65, -0.08, 6.1), (1.28, 0.88, 0.72)),
        ((-0.85, 0.05, 7.15), (1.45, 0.95, 0.78)),
        ((0.95, -0.04, 7.35), (1.40, 0.92, 0.76)),
        ((-0.15, 0.02, 8.45), (1.38, 0.90, 0.78)),
        ((0.72, -0.02, 9.25), (1.05, 0.82, 0.62)),
        ((-0.78, 0.04, 9.10), (1.00, 0.80, 0.60)),
    ]
    parts.extend(
        add_ico_cluster(f"canopy-{index}", center, scale)
        for index, (center, scale) in enumerate(clusters)
    )
    asset_data["buildMode"] = "meshy-silhouette-guided-deterministic-rebuild"
    return join_parts(asset_data["slug"], parts)


def build_lane_lamp(asset_data: dict[str, Any]) -> bpy.types.Object:
    parts = [
        add_cylinder("base-low", 0.16, 0.10, (-0.32, 0, 0.05), 10),
        add_cylinder("base-high", 0.105, 0.20, (-0.32, 0, 0.20), 10),
        add_cylinder("pole", 0.045, 2.80, (-0.32, 0, 1.68), 10),
        add_cylinder_between("short-arm", (-0.32, 0, 3.02), (0.34, 0, 3.02), 0.04, 8),
        add_cylinder_between("hanger", (0.34, 0, 3.02), (0.34, 0, 2.82), 0.028, 8),
        add_cone("lantern-roof", 0.16, 0.055, 0.16, (0.34, 0, 2.75), 8),
        add_cone("lantern-body", 0.105, 0.145, 0.28, (0.34, 0, 2.55), 8),
        add_cone("lantern-cap", 0.08, 0.03, 0.12, (0.34, 0, 2.35), 8),
    ]
    asset_data["buildMode"] = "meshy-silhouette-guided-deterministic-rebuild"
    return join_parts(asset_data["slug"], parts)


def build_dual_bin(asset_data: dict[str, Any]) -> bpy.types.Object:
    parts = [
        add_box("body", (0.90, 0.46, 0.70), (0, 0, 0.35)),
        add_box("top", (0.90, 0.46, 0.18), (0, 0, 0.79)),
        add_box("left-opening", (0.30, 0.025, 0.105), (-0.22, -0.242, 0.76)),
        add_box("right-opening", (0.30, 0.025, 0.105), (0.22, -0.242, 0.76)),
        add_box("centre-seam", (0.025, 0.025, 0.72), (0, -0.243, 0.36)),
        add_box("foot-left", (0.15, 0.32, 0.03), (-0.27, 0, 0.015)),
        add_box("foot-right", (0.15, 0.32, 0.03), (0.27, 0, 0.015)),
    ]
    asset_data["buildMode"] = "meshy-silhouette-guided-deterministic-rebuild"
    return join_parts(asset_data["slug"], parts)


def build_umbrella(asset_data: dict[str, Any]) -> bpy.types.Object:
    vertices = [
        (-1.4, -1.4, 2.30),
        (1.4, -1.4, 2.30),
        (1.4, 1.4, 2.30),
        (-1.4, 1.4, 2.30),
        (0, 0, 2.57),
    ]
    faces = [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)]
    mesh = bpy.data.meshes.new("umbrella-canopy-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    canopy = bpy.data.objects.new("canopy", mesh)
    bpy.context.collection.objects.link(canopy)
    parts = [
        canopy,
        add_box("valance-front", (2.80, 0.045, 0.12), (0, -1.40, 2.27)),
        add_box("valance-back", (2.80, 0.045, 0.12), (0, 1.40, 2.27)),
        add_box("valance-left", (0.045, 2.80, 0.12), (-1.40, 0, 2.27)),
        add_box("valance-right", (0.045, 2.80, 0.12), (1.40, 0, 2.27)),
        add_box("weighted-base", (0.68, 0.68, 0.11), (-1.15, 0, 0.055)),
        add_cylinder("side-pole", 0.055, 2.28, (-1.15, 0, 1.20), 8),
        add_cylinder_between("cantilever-arm", (-1.15, 0, 2.30), (0, 0, 2.50), 0.048, 8),
        add_cylinder_between("canopy-drop", (0, 0, 2.50), (0, 0, 2.30), 0.035, 8),
        add_cylinder_between("brace", (-1.15, 0, 1.65), (-0.35, 0, 2.42), 0.035, 8),
    ]
    asset_data["buildMode"] = "meshy-silhouette-guided-deterministic-rebuild"
    return join_parts(asset_data["slug"], parts)


def build_bicycle(asset_data: dict[str, Any]) -> bpy.types.Object:
    rear = (-0.56, 0, 0.34)
    front = (0.56, 0, 0.34)
    crank = (-0.05, 0, 0.40)
    seat = (-0.18, 0, 0.78)
    head_low = (0.34, 0, 0.53)
    head_high = (0.42, 0, 0.84)
    parts = [
        add_torus_wheel("rear-wheel", rear),
        add_torus_wheel("front-wheel", front),
        add_cylinder_between("rear-stay-a", rear, seat, 0.026, 8),
        add_cylinder_between("rear-stay-b", rear, crank, 0.026, 8),
        add_cylinder_between("down-tube", crank, head_low, 0.032, 8),
        add_cylinder_between("step-through", seat, head_low, 0.030, 8),
        add_cylinder_between("seat-tube", crank, seat, 0.030, 8),
        add_cylinder_between("front-fork", front, head_high, 0.024, 8),
        add_cylinder_between("handle-stem", head_high, (0.47, 0, 0.98), 0.024, 8),
        add_cylinder_between("handlebar", (0.47, -0.18, 0.98), (0.47, 0.18, 0.98), 0.024, 8),
        add_box("seat", (0.25, 0.16, 0.055), (-0.21, 0, 0.82)),
        add_box("basket-bottom", (0.30, 0.34, 0.035), (0.62, 0, 0.66)),
        add_cylinder_between("basket-post-fl", (0.48, -0.15, 0.66), (0.48, -0.15, 0.86), 0.012, 5),
        add_cylinder_between("basket-post-fr", (0.76, -0.15, 0.66), (0.76, -0.15, 0.86), 0.012, 5),
        add_cylinder_between("basket-post-bl", (0.48, 0.15, 0.66), (0.48, 0.15, 0.86), 0.012, 5),
        add_cylinder_between("basket-post-br", (0.76, 0.15, 0.66), (0.76, 0.15, 0.86), 0.012, 5),
        add_cylinder_between("basket-rail-front", (0.48, -0.15, 0.86), (0.76, -0.15, 0.86), 0.012, 5),
        add_cylinder_between("basket-rail-back", (0.48, 0.15, 0.86), (0.76, 0.15, 0.86), 0.012, 5),
        add_cylinder_between("basket-rail-left", (0.48, -0.15, 0.86), (0.48, 0.15, 0.86), 0.012, 5),
        add_cylinder_between("basket-rail-right", (0.76, -0.15, 0.86), (0.76, 0.15, 0.86), 0.012, 5),
        add_box("rear-rack", (0.44, 0.27, 0.035), (-0.48, 0, 0.68)),
        add_cylinder_between("rack-left", (-0.60, -0.11, 0.67), rear, 0.016, 6),
        add_cylinder_between("rack-right", (-0.60, 0.11, 0.67), rear, 0.016, 6),
        add_cylinder_between("pedal-axle", (-0.05, -0.13, 0.40), (-0.05, 0.13, 0.40), 0.016, 6),
    ]
    asset_data["buildMode"] = "meshy-silhouette-guided-deterministic-rebuild"
    return join_parts(asset_data["slug"], parts)


def build_dining(asset_data: dict[str, Any]) -> bpy.types.Object:
    parts = [
        add_box("tabletop", (1.70, 0.78, 0.085), (0, 0, 0.68)),
        add_box("table-leg-fl", (0.055, 0.055, 0.64), (-0.72, -0.29, 0.32)),
        add_box("table-leg-fr", (0.055, 0.055, 0.64), (0.72, -0.29, 0.32)),
        add_box("table-leg-bl", (0.055, 0.055, 0.64), (-0.72, 0.29, 0.32)),
        add_box("table-leg-br", (0.055, 0.055, 0.64), (0.72, 0.29, 0.32)),
    ]
    for prefix, y, back_y in (
        ("front-chair", -0.82, -1.03),
        ("back-chair", 0.82, 1.03),
    ):
        parts.extend(
            [
                add_box(f"{prefix}-seat", (0.58, 0.48, 0.065), (0, y, 0.45)),
                add_box(f"{prefix}-back", (0.58, 0.065, 0.40), (0, back_y, 0.70)),
                add_box(f"{prefix}-leg-lf", (0.045, 0.045, 0.44), (-0.24, y - 0.16, 0.22)),
                add_box(f"{prefix}-leg-rf", (0.045, 0.045, 0.44), (0.24, y - 0.16, 0.22)),
                add_box(f"{prefix}-leg-lb", (0.045, 0.045, 0.44), (-0.24, y + 0.16, 0.22)),
                add_box(f"{prefix}-leg-rb", (0.045, 0.045, 0.44), (0.24, y + 0.16, 0.22)),
            ]
        )
    asset_data["buildMode"] = "meshy-silhouette-guided-deterministic-rebuild"
    return join_parts(asset_data["slug"], parts)


def build_wall_ac(asset_data: dict[str, Any]) -> bpy.types.Object:
    parts = [
        add_box("shell", (0.80, 0.30, 0.46), (0, 0, 0.31)),
        add_box("left-bracket", (0.12, 0.30, 0.055), (-0.24, 0, 0.055)),
        add_box("right-bracket", (0.12, 0.30, 0.055), (0.24, 0, 0.055)),
    ]
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=20,
        radius=0.185,
        depth=0.028,
        location=(-0.13, -0.164, 0.32),
        rotation=(math.radians(90), 0, 0),
    )
    fan_ring = bpy.context.active_object
    fan_ring.name = "fan-ring"
    parts.append(apply_object_transform(fan_ring))
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=16,
        radius=0.055,
        depth=0.034,
        location=(-0.13, -0.168, 0.32),
        rotation=(math.radians(90), 0, 0),
    )
    fan_hub = bpy.context.active_object
    fan_hub.name = "fan-hub"
    parts.append(apply_object_transform(fan_hub))
    for index in range(5):
        parts.append(
            add_box(
                f"louver-{index}",
                (0.18, 0.028, 0.025),
                (0.26, -0.165, 0.19 + index * 0.065),
            )
        )
    asset_data["buildMode"] = "meshy-silhouette-guided-deterministic-rebuild"
    return join_parts(asset_data["slug"], parts)


REBUILDERS = {
    "plane-tree-straight-sparse": build_plane_tree,
    "lane-lamp-short-arm": build_lane_lamp,
    "shanghai-dual-classification-bin": build_dual_bin,
    "cantilever-cafe-umbrella": build_umbrella,
    "outdoor-dining-dark-wood": build_dining,
    "vintage-step-through-bicycle": build_bicycle,
    "wall-ac-outdoor-unit": build_wall_ac,
}


def local_bounds(obj: bpy.types.Object) -> tuple[Vector, Vector]:
    minimum = Vector((math.inf, math.inf, math.inf))
    maximum = Vector((-math.inf, -math.inf, -math.inf))
    for vertex in obj.data.vertices:
        co = vertex.co
        minimum.x = min(minimum.x, co.x)
        minimum.y = min(minimum.y, co.y)
        minimum.z = min(minimum.z, co.z)
        maximum.x = max(maximum.x, co.x)
        maximum.y = max(maximum.y, co.y)
        maximum.z = max(maximum.z, co.z)
    return minimum, maximum


def fit_dimensions_and_origin(
    obj: bpy.types.Object,
    asset_data: dict[str, Any],
) -> dict[str, list[float]]:
    minimum, maximum = local_bounds(obj)
    current = maximum - minimum
    target = Vector(asset_data["targetDimensionsMeters"])
    if min(current) <= 0:
        raise RuntimeError(f"{asset_data['slug']} 包围盒退化：{list(current)}")
    obj.scale = (
        target.x / current.x,
        target.y / current.y,
        target.z / current.z,
    )
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    minimum, maximum = local_bounds(obj)
    if asset_data["wallAnchor"]:
        shift = Vector(
            (
                -(minimum.x + maximum.x) * 0.5,
                -maximum.y,
                -(minimum.z + maximum.z) * 0.5,
            )
        )
        origin_meaning = "wall-back-center"
    else:
        shift = Vector(
            (
                -(minimum.x + maximum.x) * 0.5,
                -(minimum.y + maximum.y) * 0.5,
                -minimum.z,
            )
        )
        origin_meaning = "ground-envelope-center"
    for vertex in obj.data.vertices:
        vertex.co += shift
    obj.data.update()
    obj.location = (0, 0, 0)
    obj.rotation_euler = (0, 0, 0)
    obj.scale = (1, 1, 1)
    minimum, maximum = local_bounds(obj)
    return {
        "min": [round(value, 6) for value in minimum],
        "max": [round(value, 6) for value in maximum],
        "originMeaning": origin_meaning,
    }


def polygon_center(mesh: bpy.types.Mesh, polygon: bpy.types.MeshPolygon) -> Vector:
    total = Vector((0, 0, 0))
    for index in polygon.vertices:
        total += mesh.vertices[index].co
    return total / max(1, len(polygon.vertices))


def assign_materials(obj: bpy.types.Object, asset_data: dict[str, Any]) -> list[str]:
    material_sets = {
        "tree": ["bark", "foliage-dark", "foliage-warm"],
        "lamp": ["metal-dark", "lamp-warm"],
        "bench": ["metal-dark", "wood"],
        "planter": ["planter", "soil", "foliage-dark", "foliage-warm"],
        "stone": ["stone"],
        "bin": ["silver", "blue", "metal-dark"],
        "umbrella": ["metal-dark", "coral"],
        "dining": ["metal-dark", "wood"],
        "bicycle": ["metal-dark", "foliage-dark", "wood"],
        "ac": ["ac-shell", "metal-dark"],
    }
    labels = material_sets[asset_data["materialRule"]]
    obj.data.materials.clear()
    for label in labels:
        obj.data.materials.append(make_material(asset_data["slug"], label))

    minimum, maximum = local_bounds(obj)
    size = maximum - minimum
    rule = asset_data["materialRule"]
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
        center = polygon_center(obj.data, polygon)
        nx = (center.x - minimum.x) / max(size.x, 1e-6)
        ny = (center.y - minimum.y) / max(size.y, 1e-6)
        nz = (center.z - minimum.z) / max(size.z, 1e-6)
        if rule == "tree":
            trunk_zone = nz < 0.56 and abs(nx - 0.5) < 0.17
            polygon.material_index = 0 if trunk_zone else 1 + (polygon.index % 5 == 0)
        elif rule == "lamp":
            polygon.material_index = (
                1 if 0.66 < nz < 0.86 and nx > 0.55 else 0
            )
        elif rule == "bench":
            polygon.material_index = 1 if nz > 0.34 else 0
        elif rule == "planter":
            if nz > 0.48:
                polygon.material_index = 2 + (polygon.index % 4 == 0)
            elif nz > 0.36 and polygon.normal.z > 0.25:
                polygon.material_index = 1
            else:
                polygon.material_index = 0
        elif rule == "stone":
            polygon.material_index = 0
        elif rule == "bin":
            if nz > 0.72 and polygon.normal.z > -0.2:
                polygon.material_index = 2
            else:
                polygon.material_index = 1 if nx > 0.51 else 0
        elif rule == "umbrella":
            polygon.material_index = 1 if nz > 0.72 else 0
        elif rule == "dining":
            polygon.material_index = 1 if nz > 0.38 else 0
        elif rule == "bicycle":
            if nz < 0.48:
                polygon.material_index = 0
            elif nx > 0.68 and nz > 0.52:
                polygon.material_index = 2
            else:
                polygon.material_index = 1
        elif rule == "ac":
            front_zone = ny < 0.035 and 0.08 < nx < 0.92 and 0.08 < nz < 0.92
            polygon.material_index = 1 if front_zone else 0
    obj.data.update()
    return labels


def scene_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
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


def add_preview_surface(
    asset_data: dict[str, Any],
    obj: bpy.types.Object,
) -> bpy.types.Object:
    minimum, maximum = scene_bounds([obj])
    span = max(maximum.x - minimum.x, maximum.y - minimum.y, 0.7)
    if asset_data["wallAnchor"]:
        bpy.ops.mesh.primitive_plane_add(
            size=span * 2.6,
            location=(0, 0.015, 0),
            rotation=(math.radians(90), 0, 0),
        )
    else:
        bpy.ops.mesh.primitive_plane_add(
            size=span * 2.6,
            location=(0, 0, -0.006),
        )
    surface = bpy.context.active_object
    surface.name = "test-preview-surface"
    material = bpy.data.materials.new("test-preview-surface-material")
    material.diffuse_color = (0.11, 0.12, 0.115, 1)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (0.11, 0.12, 0.115, 1)
    shader.inputs["Roughness"].default_value = 0.92
    surface.data.materials.append(material)
    return surface


def render_preview(
    obj: bpy.types.Object,
    direction: str,
    path: Path,
    wall_anchor: bool,
) -> None:
    minimum, maximum = scene_bounds([obj])
    center = (minimum + maximum) * 0.5
    width = maximum.x - minimum.x
    depth = maximum.y - minimum.y
    height = maximum.z - minimum.z
    span = max(width, depth, height, 0.35)
    if direction == "canonical":
        offset = Vector((span * 1.10, -span * 1.55, span * 0.82))
        scale = span * 1.23
        target = center
    elif direction == "side":
        offset = Vector((-span * 1.50, -span * 0.42, span * 0.68))
        scale = span * 1.25
        target = center
    else:
        offset = Vector((span * 0.72, -span * 1.42, span * 0.50))
        scale = span * 0.78
        target = Vector((center.x, center.y, minimum.z + height * 0.60))
    if wall_anchor:
        target.z = 0

    bpy.ops.object.camera_add(location=target + offset)
    camera = bpy.context.active_object
    camera.name = f"test-{direction}-camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = scale
    camera.rotation_euler = (
        target - camera.location
    ).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)


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


def parse_glb(path: Path) -> dict[str, Any]:
    contents = path.read_bytes()
    if contents[:4] != b"glTF" or struct.unpack_from("<I", contents, 4)[0] != 2:
        raise RuntimeError(f"{path} 不是 glTF 2.0 GLB")
    json_length = struct.unpack_from("<I", contents, 12)[0]
    gltf = json.loads(contents[20 : 20 + json_length].decode("utf8"))
    triangles = 0
    bounds_min = [math.inf, math.inf, math.inf]
    bounds_max = [-math.inf, -math.inf, -math.inf]
    for mesh in gltf.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            accessor_index = primitive.get(
                "indices", primitive["attributes"]["POSITION"]
            )
            triangles += gltf["accessors"][accessor_index]["count"] // 3
            position = gltf["accessors"][primitive["attributes"]["POSITION"]]
            for axis in range(3):
                bounds_min[axis] = min(bounds_min[axis], position["min"][axis])
                bounds_max[axis] = max(bounds_max[axis], position["max"][axis])
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
        "materials": len(gltf.get("materials", [])),
        "images": len(gltf.get("images", [])),
        "textures": len(gltf.get("textures", [])),
        "animations": len(gltf.get("animations", [])),
        "skins": len(gltf.get("skins", [])),
        "triangles": triangles,
        "bounds": {
            "min": [round(value, 6) for value in bounds_min],
            "max": [round(value, 6) for value in bounds_max],
            "size": [
                round(bounds_max[i] - bounds_min[i], 6) for i in range(3)
            ],
        },
        "transformedNodes": transformed_nodes,
    }


def verify_budget(asset_data: dict[str, Any], audit: dict[str, Any]) -> None:
    failures = []
    budget = asset_data["budget"]
    for key, maximum in (
        ("triangles", budget["maxTriangles"]),
        ("nodes", budget["maxNodes"]),
        ("materials", budget["maxMaterials"]),
        ("images", budget["maxImages"]),
        ("textures", budget["maxTextures"]),
        ("bytes", budget["maxBinaryBytes"]),
    ):
        if audit[key] > maximum:
            failures.append(f"{key}={audit[key]}>{maximum}")
    if audit["animations"]:
        failures.append(f"animations={audit['animations']}>0")
    if audit["skins"]:
        failures.append(f"skins={audit['skins']}>0")
    if audit["transformedNodes"]:
        failures.append(f"transformedNodes={audit['transformedNodes']}")
    if not asset_data["wallAnchor"] and abs(audit["bounds"]["min"][1]) > 0.0002:
        failures.append(f"groundMinY={audit['bounds']['min'][1]}")
    if failures:
        raise RuntimeError(
            f"{asset_data['slug']} 超出 visible-low 合同：" + ", ".join(failures)
        )


def generate(
    asset_data: dict[str, Any],
    source_dir: Path,
) -> dict[str, Any]:
    reset_scene()
    configure_scene()
    obj = import_source(asset_data, source_dir)
    if asset_data["slug"] in REBUILDERS:
        bpy.data.objects.remove(obj, do_unlink=True)
        obj = REBUILDERS[asset_data["slug"]](asset_data)
        current_triangles = triangle_count(obj)
        decimation = {
            "before": current_triangles,
            "target": asset_data["decimateTarget"],
            "after": current_triangles,
            "applied": False,
            "reason": "Meshy Remesh failed twice; used silhouette-guided deterministic rebuild",
        }
    else:
        asset_data["buildMode"] = "direct-meshy-geometry-controlled-processing"
        decimation = decimate(obj, asset_data["decimateTarget"])
    fitted_bounds = fit_dimensions_and_origin(obj, asset_data)
    materials = assign_materials(obj, asset_data)

    obj["asset_id"] = asset_data["assetId"]
    obj["source"] = "Meshy Agent web candidate"
    obj["source_sha256"] = asset_data["sourceSha256"]
    obj["evidence_snapshot"] = EVIDENCE_SNAPSHOT
    obj["runtime_tier"] = "visible-low"
    obj["use"] = asset_data["use"]
    obj["max_instances"] = asset_data["maxInstances"]
    obj["origin_contract"] = fitted_bounds["originMeaning"]
    obj["front"] = "-Y"

    slug = asset_data["slug"]
    blend_path = SOURCE_DIR / f"{slug}.blend"
    glb_path = RUNTIME_DIR / f"{slug}-visible-low.glb"
    canonical_path = PREVIEW_DIR / f"test_{slug}-canonical.png"
    side_path = PREVIEW_DIR / f"test_{slug}-side.png"
    detail_path = PREVIEW_DIR / f"test_{slug}-detail.png"
    record_path = RECORD_DIR / f"{slug}-visible-low.json"

    export_glb(glb_path, obj)
    audit = parse_glb(glb_path)
    verify_budget(asset_data, audit)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    blend_sha = file_sha256(blend_path)

    preview_surface = add_preview_surface(asset_data, obj)
    render_preview(obj, "canonical", canonical_path, asset_data["wallAnchor"])
    render_preview(obj, "side", side_path, asset_data["wallAnchor"])
    render_preview(obj, "detail", detail_path, asset_data["wallAnchor"])
    bpy.data.objects.remove(preview_surface, do_unlink=True)

    record = {
        "version": 1,
        "auditedAt": AUDITED_AT,
        "assetId": asset_data["assetId"],
        "slug": slug,
        "family": "shared-street-asset",
        "status": "blender-glb-generated-visual-and-runtime-qa-pending",
        "sourceRoute": "meshy-agent-web-no-api",
        "source": {
            "file": (
                "test_artifacts/test_meshy_agent_batch_20260728/raw_exports/"
                + asset_data["filename"]
            ),
            "sha256": asset_data["sourceSha256"],
            "evidenceSnapshot": EVIDENCE_SNAPSHOT,
            "immutable": True,
        },
        "modelBrief": MODEL_BRIEF,
        "referenceManifest": REFERENCE_MANIFEST,
        "decisionLog": DECISION_LOG,
        "generator": GENERATOR_PATH,
        "buildCommand": (
            "/opt/homebrew/bin/blender --background --python "
            f"{GENERATOR_PATH} -- --asset {slug}"
        ),
        "use": asset_data["use"],
        "maxInstances": asset_data["maxInstances"],
        "recognizers": asset_data["recognizers"],
        "targetDimensionsMeters": asset_data["targetDimensionsMeters"],
        "fittedBlenderBounds": fitted_bounds,
        "decimation": decimation,
        "buildMode": asset_data["buildMode"],
        "sharedPaletteMaterials": materials,
        "texturePolicy": "shared-flat-materials-zero-images-zero-textures",
        "originContract": {
            "meaning": fitted_bounds["originMeaning"],
            "origin": [0, 0, 0],
            "blenderUp": "Z",
            "runtimeUp": "Y",
            "blenderFront": "-Y",
            "worldPlacementBaked": False,
        },
        "budget": asset_data["budget"],
        "outputs": {
            "blend": str(blend_path.relative_to(ROOT)),
            "blendSha256": blend_sha,
            "glb": str(glb_path.relative_to(ROOT)),
            "previews": {
                "canonical": str(canonical_path.relative_to(ROOT)),
                "canonicalSha256": file_sha256(canonical_path),
                "side": str(side_path.relative_to(ROOT)),
                "sideSha256": file_sha256(side_path),
                "detail": str(detail_path.relative_to(ROOT)),
                "detailSha256": file_sha256(detail_path),
            },
        },
        "glb": audit,
        "gates": {
            "sourceSha": "passed",
            "blenderBuild": "passed",
            "glbStructure": "passed",
            "budget": "passed",
            "visual": "pending-independent-review",
            "runtime": "pending",
            "productionMap": "not-integrated",
        },
    }
    record_path.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )
    return record


def write_manifest(records: list[dict[str, Any]]) -> None:
    manifest = {
        "version": 1,
        "generatedAt": AUDITED_AT,
        "status": "visible-low-generated-visual-and-runtime-qa-pending",
        "package": PACKAGE_SLUG,
        "assetCount": len(records),
        "sourceRoute": "meshy-agent-web-no-api",
        "evidenceSnapshot": EVIDENCE_SNAPSHOT,
        "modelBrief": MODEL_BRIEF,
        "referenceManifest": REFERENCE_MANIFEST,
        "decisionLog": DECISION_LOG,
        "generator": GENERATOR_PATH,
        "totalGlbBytes": sum(record["glb"]["bytes"] for record in records),
        "totalTriangles": sum(record["glb"]["triangles"] for record in records),
        "zeroImageTextureAssetCount": sum(
            record["glb"]["images"] == 0 and record["glb"]["textures"] == 0
            for record in records
        ),
        "rootTransformCleanAssetCount": sum(
            not record["glb"]["transformedNodes"] for record in records
        ),
        "runtimeIntegration": "isolated-qa-only",
        "productionRegistry": "intentionally-not-modified",
        "assets": records,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )


def main() -> None:
    args = parse_arguments()
    source_dir = resolve_source_dir(args.source_root)
    selected = [
        item for item in ASSETS if not args.asset or item["slug"] == args.asset
    ]
    if not selected:
        raise SystemExit(f"未知资产：{args.asset}")
    for directory in (SOURCE_DIR, RUNTIME_DIR, PREVIEW_DIR, RECORD_DIR):
        directory.mkdir(parents=True, exist_ok=True)
    records = [generate(item, source_dir) for item in selected]
    if args.asset:
        existing = []
        if MANIFEST_PATH.is_file():
            existing = json.loads(MANIFEST_PATH.read_text(encoding="utf8")).get(
                "assets", []
            )
        by_slug = {record["slug"]: record for record in existing}
        by_slug[records[0]["slug"]] = records[0]
        ordered = [
            by_slug[item["slug"]]
            for item in ASSETS
            if item["slug"] in by_slug
        ]
        write_manifest(ordered)
    else:
        write_manifest(records)
    print(
        f"Meshy Agent 街景资产生成完成：{len(records)} 件，"
        f"{sum(record['glb']['triangles'] for record in records)} triangles"
    )


if __name__ == "__main__":
    main()
