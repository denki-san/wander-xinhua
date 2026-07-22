"""生成上海影城混合渲染试验中的轻量身份轮廓 GLB。

完整建筑仍由既有 ``create_xinhua_road_models.py`` 生成。本脚本只保留无法由
Three.js 基础几何准确表达的白色丝带、椭圆开洞收边和左侧鼓体环带，用于验证
“程序化主体 + 实例化重复构件 + 轻量身份 GLB”的真实运行时架构。
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from create_xinhua_road_models import (
    ASSET_OBJECTS,
    add_cinema_ribbon_surface,
    add_elliptical_wall_band,
    add_vertical_ellipse_disc,
    add_vertical_ellipse_reveal,
    cinema_front_y,
    clear_scene,
    material,
    merge_asset_objects,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_GLB = ROOT / "public/models/xinhua-road/shanghai-cinema-hybrid-identity.glb"
OUTPUT_BLEND = ROOT / "assets/models/source/xinhua-road/shanghai-cinema-hybrid-identity.blend"
PREVIEW_DIR = ROOT / "test_artifacts"


def build_identity_geometry() -> None:
    """仅建立上海影城不可替代的轮廓构件。"""
    white = material("影城象牙白", "#e4e1da", roughness=0.72)
    white_shadow = material("影城阴影白", "#cfd0ca", roughness=0.82)
    glass_light = material("影城浅玻璃", "#79a2a5", roughness=0.2, metallic=0.04, alpha=0.58)

    add_elliptical_wall_band(
        "cinema-lower-ribbon-lip",
        (0, 0.35),
        (15.15, 7.25),
        0.72,
        3.82,
        0.34,
        white_shadow,
        segments=88,
        wave=0.08,
    )
    add_cinema_ribbon_surface("cinema-main-ribbon", white)

    hole_front_y = cinema_front_y(8.05) - 0.035
    add_vertical_ellipse_reveal(
        "cinema-oculus-reveal",
        (8.05, hole_front_y, 6.55),
        (4.35, 1.5),
        0.42,
        0.2,
        white_shadow,
    )
    add_vertical_ellipse_disc(
        "cinema-oculus-glass",
        (8.05, hole_front_y + 0.44, 6.55),
        (4.1, 1.3),
        glass_light,
    )

    # 鼓体本身由网页椭圆柱生成，只保留上下两条非标准椭圆环带。
    add_elliptical_wall_band(
        "cinema-left-drum-base",
        (-9.8, 0.8),
        (4.78, 3.78),
        0.5,
        5.0,
        0.42,
        white,
        segments=68,
    )
    add_elliptical_wall_band(
        "cinema-left-drum-crown",
        (-9.8, 0.8),
        (5.15, 4.05),
        0.58,
        10.65,
        0.38,
        white,
        segments=68,
    )


def render_preview() -> None:
    """输出 canonical 与侧向固定机位，证明轻量 GLB 保留身份轮廓。"""
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.55, 0.67, 0.72, 1.0)
    background.inputs["Strength"].default_value = 0.55
    scene.view_settings.look = "AgX - Medium High Contrast"

    bpy.ops.object.camera_add()
    camera = bpy.context.active_object
    scene.camera = camera
    bpy.ops.object.light_add(type="AREA", location=(-11.0, -18.0, 26.0))
    key = bpy.context.active_object
    key.data.energy = 1500
    key.data.size = 24
    bpy.ops.object.light_add(type="AREA", location=(20.0, 12.0, 14.0))
    fill = bpy.context.active_object
    fill.data.energy = 600
    fill.data.size = 18

    views = (
        ("canonical", (12.0, -50.0, 7.0), (0.0, -0.6, 6.2), 48),
        ("side", (39.0, -34.0, 8.5), (4.0, -0.2, 6.5), 52),
    )
    for suffix, location, target, lens in views:
        camera.location = location
        camera.data.lens = lens
        camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(
            PREVIEW_DIR / f"test_shanghai-cinema-hybrid-identity_{suffix}_preview.png"
        )
        bpy.ops.render.render(write_still=True)


def export_identity() -> None:
    clear_scene()
    build_identity_geometry()
    source_parts = len(ASSET_OBJECTS)
    merge_asset_objects("shanghai-cinema-hybrid-identity")
    identity = ASSET_OBJECTS[0]
    identity["runtime_x_mirrored"] = True
    identity["hybrid_role"] = "unique-silhouette"
    identity["source_parts"] = source_parts

    OUTPUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))

    # 与现有上海影城 GLB 保持同一运行时轴向约定。
    mesh = identity.data
    mesh.transform(Matrix.Scale(-1.0, 4, Vector((1.0, 0.0, 0.0))))
    mesh.flip_normals()
    mesh.update()
    bpy.ops.object.select_all(action="DESELECT")
    identity.select_set(True)
    bpy.context.view_layer.objects.active = identity
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_extras=True,
    )

    # 固定机位预览使用 canonical 左右关系。
    mesh.transform(Matrix.Scale(-1.0, 4, Vector((1.0, 0.0, 0.0))))
    mesh.flip_normals()
    mesh.update()
    render_preview()
    print(
        f"上海影城轻量身份 GLB 生成完成：{source_parts} 个源构件，"
        f"{OUTPUT_GLB.stat().st_size} bytes"
    )


if __name__ == "__main__":
    export_identity()
