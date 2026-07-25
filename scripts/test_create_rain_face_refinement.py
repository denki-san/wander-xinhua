"""只针对 Rain 的鼻头、鼻翼与嘴唇生成精确候选，不触碰其他五官。"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "test_artifacts"
OUTPUT_BLEND = OUTPUT_DIR / "test_rain_face_refined.blend"


def gaussian(value: float, center: float, width: float) -> float:
    return math.exp(-((value - center) / width) ** 2)


def refine_requested_features() -> None:
    """收窄鼻翼、减小鼻头并压薄嘴唇，保持眼眉与脸部轮廓完全不变。"""
    head = bpy.data.objects["Rain_head"]
    for vertex in head.data.vertices:
        co = vertex.co
        front_weight = max(0.0, min(1.0, (-co.y - 0.06) / 0.11))

        nose_height = gaussian(co.z, 1.414, 0.042)
        nose_center = gaussian(co.x, 0.0, 0.046)
        nose_wing = (
            gaussian(abs(co.x), 0.035, 0.024)
            * gaussian(co.z, 1.401, 0.028)
            * front_weight
        )
        co.x *= 1.0 - 0.12 * nose_wing
        co.y += 0.007 * nose_height * nose_center * front_weight

        lip_weight = (
            gaussian(co.z, 1.349, 0.038)
            * gaussian(co.x, 0.0, 0.074)
            * front_weight
        )
        lip_scale = 1.0 - 0.22 * lip_weight
        co.z = 1.349 + (co.z - 1.349) * lip_scale
        co.y += 0.0025 * lip_weight

    head["rain_face_refinement_candidate"] = {
        "nose_wing_width_reduction": 0.12,
        "nose_tip_recede": 0.007,
        "lip_height_reduction": 0.22,
        "lip_recede": 0.0025,
    }
    head.data.update()


def look_at(camera, target: Vector) -> None:
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()


def render_face(state: str, direction: str) -> None:
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

    camera_data = bpy.data.cameras.new(f"Test_Rain_Refinement_{state}_{direction}")
    camera = bpy.data.objects.new(
        f"Test_Rain_Refinement_{state}_{direction}",
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
        OUTPUT_DIR / f"test_rain_face_refinement_{state}_{direction}.png"
    )
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)
    bpy.data.cameras.remove(camera_data)


OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
render_face("current", "front")
render_face("current", "side")
refine_requested_features()
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
render_face("refined", "front")
render_face("refined", "side")
print(f"RAIN_FACE_REFINEMENT={OUTPUT_BLEND}")
