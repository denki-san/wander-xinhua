"""从既有上海影城 Hero / Hybrid Identity 参数生成正式 Massing 资产。"""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from create_shanghai_cinema_hybrid_identity import build_identity_geometry
from create_xinhua_road_models import (
    ASSET_OBJECTS,
    add_box,
    add_elliptical_cylinder,
    clear_scene,
    material,
    merge_asset_objects,
)


ROOT = Path(__file__).resolve().parents[1]
HERO_GLB = ROOT / "public/models/xinhua-road/shanghai-cinema.glb"
IDENTITY_GLB = ROOT / "public/models/xinhua-road/shanghai-cinema-hybrid-identity.glb"
OUTPUT_GLB = ROOT / "public/models/xinhua-road/shanghai-cinema-massing.glb"
OUTPUT_BLEND = ROOT / "assets/models/source/xinhua-road/shanghai-cinema-massing.blend"
PREVIEW_DIR = ROOT / "test_artifacts"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_massing_geometry() -> None:
    """复用既有丝带与开洞，并补齐足以校准地图的主要体量。"""
    paving = material("影城Massing广场", "#aaa69d", roughness=0.92)
    white = material("影城Massing象牙白", "#e4e1da", roughness=0.72)
    glass = material(
        "影城Massing玻璃",
        "#4f7478",
        roughness=0.25,
        metallic=0.06,
        alpha=0.7,
    )
    glass_light = material(
        "影城Massing浅玻璃",
        "#79a2a5",
        roughness=0.2,
        metallic=0.04,
        alpha=0.58,
    )

    # 主丝带、椭圆开洞和鼓体环带直接复用已通过生产审查的 Hybrid Identity。
    build_identity_geometry()

    # 广场薄片锁定 Hero 的原点、地面基准与 38 × 26 场景单位占地包络。
    add_box(
        "cinema-massing-ground-datum",
        (0, -1.2, 0.12),
        (38, 26, 0.24),
        paving,
        bevel=0.12,
    )
    add_elliptical_cylinder(
        "cinema-massing-glass-core",
        (0, 0.35, 2.45),
        (14.25, 6.65),
        4.65,
        glass,
        vertices=48,
        bevel=0.1,
    )

    # 两侧纵深、挑檐和右侧上层体块复用 Hero 的正式尺寸，不新增装饰。
    for side_name, side_sign in (("right", 1), ("left", -1)):
        add_box(
            f"cinema-massing-{side_name}-wing",
            (side_sign * 11.45, 4.15, 2.35),
            (3.45, 10.8, 4.3),
            glass,
            bevel=0.12,
        )
        add_box(
            f"cinema-massing-{side_name}-cantilever",
            (side_sign * 12.15, 4.0, 4.62),
            (4.25, 11.95, 0.36),
            white,
            bevel=0.1,
        )
    add_box(
        "cinema-massing-right-upper-side",
        (13.0, 5.25, 7.45),
        (0.42, 7.25, 3.5),
        white,
        bevel=0.1,
    )

    # 鼓体和退后的塔楼是远景轮廓的关键层级，保持 Hero 的正式位置和高度。
    add_elliptical_cylinder(
        "cinema-massing-left-drum",
        (-9.8, 0.8, 7.9),
        (4.45, 3.45),
        5.6,
        glass_light,
        vertices=40,
        bevel=0.08,
    )
    add_box(
        "cinema-massing-tower-core",
        (7.4, 5.2, 10.3),
        (7.35, 4.05, 12.4),
        glass,
        bevel=0.18,
    )
    add_box(
        "cinema-massing-tower-left-frame",
        (3.55, 5.2, 10.225),
        (0.58, 4.35, 13.35),
        white,
        bevel=0.23,
    )
    add_box(
        "cinema-massing-tower-right-frame",
        (11.25, 5.2, 10.225),
        (0.58, 4.35, 13.35),
        white,
        bevel=0.23,
    )
    add_box(
        "cinema-massing-tower-top-frame",
        (7.4, 5.2, 16.85),
        (8.3, 4.4, 0.75),
        white,
        bevel=0.35,
    )


def setup_review_scene() -> bpy.types.Object:
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.55, 0.67, 0.72, 1.0)
    background.inputs["Strength"].default_value = 0.55
    scene.view_settings.look = "AgX - Medium High Contrast"

    bpy.ops.object.camera_add()
    camera = bpy.context.active_object
    camera.name = "test_shanghai_cinema_massing_camera"
    scene.camera = camera
    for name, location, energy, size in (
        ("test_shanghai_cinema_massing_key", (-11, -18, 26), 1600, 24),
        ("test_shanghai_cinema_massing_fill", (20, 12, 14), 650, 18),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.active_object
        light.name = name
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
    return camera


def render_previews() -> None:
    camera = setup_review_scene()
    views = (
        ("canonical", (12, -50, 7), (0, -0.6, 6.2), 48),
        ("side", (39, -34, 8.5), (4, -0.2, 6.5), 52),
        ("entrance", (8, -28, 4.4), (1, -1.8, 5.6), 50),
    )
    for suffix, location, target, lens in views:
        camera.location = location
        camera.data.lens = lens
        camera.rotation_euler = (
            Vector(target) - camera.location
        ).to_track_quat("-Z", "Y").to_euler()
        bpy.context.scene.render.filepath = str(
            PREVIEW_DIR / f"test_shanghai-cinema-massing_{suffix}_preview.png"
        )
        bpy.ops.render.render(write_still=True)


def export_massing() -> None:
    if not HERO_GLB.exists() or not IDENTITY_GLB.exists():
        raise FileNotFoundError("必须保留既有 Hero 与 Hybrid Identity 才能派生 Massing")

    clear_scene()
    build_massing_geometry()
    source_parts = len(ASSET_OBJECTS)
    merge_asset_objects("shanghai-cinema-massing")
    massing = ASSET_OBJECTS[0]
    massing["stable_asset_id"] = "shanghai-cinema"
    massing["runtime_tier"] = "massing"
    massing["derived_from_hero_sha256"] = sha256_file(HERO_GLB)
    massing["derived_from_identity_sha256"] = sha256_file(IDENTITY_GLB)
    massing["runtime_x_mirrored"] = True
    massing["authored_unit"] = "1 scene unit = 2.7 m"
    massing["front_direction"] = "local -Y"
    massing["ground_datum"] = "z=0"
    massing["source_parts"] = source_parts
    massing["collision_semantics"] = (
        "shared app/scene/xinhua-road-landmarks-data.json localObstacles"
    )

    OUTPUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))

    # 与既有 Hero / Identity 完全一致：Blend 保持 canonical，GLB 导出前临时镜像 X。
    mesh = massing.data
    mesh.transform(Matrix.Scale(-1.0, 4, Vector((1.0, 0.0, 0.0))))
    mesh.flip_normals()
    mesh.update()
    bpy.ops.object.select_all(action="DESELECT")
    massing.select_set(True)
    bpy.context.view_layer.objects.active = massing
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_extras=True,
    )

    mesh.transform(Matrix.Scale(-1.0, 4, Vector((1.0, 0.0, 0.0))))
    mesh.flip_normals()
    mesh.update()
    render_previews()
    print(
        f"上海影城 Massing 生成完成：{source_parts} 个同源构件，"
        f"{OUTPUT_GLB.stat().st_size} bytes"
    )


if __name__ == "__main__":
    export_massing()
