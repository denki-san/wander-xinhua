"""渲染正式 Rain 的面部前斜视与侧视，验证鼻唇和深色毛发修改。"""

from __future__ import annotations

from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "test_artifacts"


def look_at(camera, target: Vector) -> None:
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()


def render(direction: str) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.studio_light = "paint.sl"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.display.shading.background_type = "VIEWPORT"
    scene.display.shading.background_color = (0.45, 0.59, 0.67)
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"

    camera_data = bpy.data.cameras.new(f"Test_Rain_Production_Face_{direction}")
    camera = bpy.data.objects.new(
        f"Test_Rain_Production_Face_{direction}",
        camera_data,
    )
    scene.collection.objects.link(camera)
    target = Vector((0.0, -0.015, 1.43))
    if direction == "front":
        camera.location = Vector((0.18, -0.78, 1.46))
        camera_data.lens = 78
    else:
        camera.location = Vector((0.66, -0.015, 1.45))
        camera_data.lens = 82
    look_at(camera, target)
    scene.camera = camera
    scene.render.filepath = str(
        OUTPUT_DIR / f"test_rain_face_production_{direction}.png"
    )
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)
    bpy.data.cameras.remove(camera_data)


head = bpy.data.objects["Rain_head"]
hair = bpy.data.materials["Rain_Hair"]
iris = bpy.data.materials["Rain_Eye_Iris"]
if head.get("rain_face_refinement_version") != 1:
    raise RuntimeError("正式 Blend 缺少 Rain 面部精修版本标记")
if hair.get("rain_hair_color_version") != 2:
    raise RuntimeError("正式 Blend 缺少 Rain 深色毛发版本标记")
if iris.get("rain_iris_color_version") != 1:
    raise RuntimeError("正式 Blend 缺少 Rain 棕色虹膜版本标记")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
render("front")
render("side")
print("RAIN_FACE_PRODUCTION_RENDER=ok")
