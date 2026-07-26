"""从已验收 Rain Blend 生成不覆盖生产资产的原创亚洲脸 A/B 候选。"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "test_artifacts"
FACE_OBJECTS = ("Rain_eye", "Rain_eyelashes", "Rain_eyebrows")

VARIANTS = {
    "base": {
        "eye_geometry_scale": 1.0,
        "eyelid_vertical_scale": 1.0,
        "eye_recede": 0.0,
        "brow_vertical_scale": 1.0,
        "brow_lower": 0.0,
        "cheek_width": 0.0,
        "jaw_width": 0.0,
        "nose_recede": 0.0,
        "bridge_recede": 0.0,
        "face_depth_recede": 0.0,
    },
    "a": {
        "eye_geometry_scale": 0.82,
        "eyelid_vertical_scale": 0.88,
        "eye_recede": 0.003,
        "brow_vertical_scale": 0.76,
        "brow_lower": 0.007,
        "cheek_width": 0.075,
        "jaw_width": 0.055,
        "nose_recede": 0.015,
        "bridge_recede": 0.011,
        "face_depth_recede": 0.007,
    },
    "b": {
        "eye_geometry_scale": 0.70,
        "eyelid_vertical_scale": 0.80,
        "eye_recede": 0.006,
        "brow_vertical_scale": 0.66,
        "brow_lower": 0.01,
        "cheek_width": 0.11,
        "jaw_width": 0.08,
        "nose_recede": 0.022,
        "bridge_recede": 0.017,
        "face_depth_recede": 0.01,
    },
}


def gaussian(value: float, center: float, width: float) -> float:
    return math.exp(-((value - center) / width) ** 2)


def deform_head(params: dict[str, float]) -> None:
    """只改面部轮廓、颧颊和鼻梁，不改头盖、耳朵、颈部与拓扑。"""
    head = bpy.data.objects["Rain_head"]
    for vertex in head.data.vertices:
        co = vertex.co
        front_weight = max(0.0, min(1.0, (-co.y - 0.035) / 0.12))
        face_height_weight = gaussian(co.z, 1.415, 0.125)

        cheek_weight = (
            gaussian(co.z, 1.405, 0.065)
            * gaussian(abs(co.x), 0.074, 0.055)
            * front_weight
        )
        jaw_weight = (
            gaussian(co.z, 1.335, 0.055)
            * gaussian(abs(co.x), 0.065, 0.06)
            * front_weight
        )
        co.x *= (
            1.0
            + params["cheek_width"] * cheek_weight
            + params["jaw_width"] * jaw_weight
        )

        eye_socket_weight = max(
            gaussian(co.x, -0.055, 0.033),
            gaussian(co.x, 0.055, 0.033),
        ) * gaussian(co.z, 1.468, 0.055) * front_weight
        eyelid_scale = 1.0 - (
            1.0 - params["eyelid_vertical_scale"]
        ) * eye_socket_weight
        co.z = 1.468 + (co.z - 1.468) * eyelid_scale

        central_weight = gaussian(co.x, 0.0, 0.037)
        nose_tip_weight = (
            central_weight
            * gaussian(co.z, 1.415, 0.042)
            * front_weight
        )
        bridge_weight = (
            gaussian(co.x, 0.0, 0.032)
            * gaussian(co.z, 1.47, 0.07)
            * front_weight
        )
        co.y += (
            params["nose_recede"] * nose_tip_weight
            + params["bridge_recede"] * bridge_weight
            + params["face_depth_recede"] * face_height_weight * front_weight
        )
    head.data.update()


def reshape_eye_area(params: dict[str, float]) -> None:
    """压低眼裂和眉弓高度，保持双眼间距、虹膜中心与中性眼角方向。"""
    eye_center_z = 1.468
    brow_center_z = 1.502
    for object_name in FACE_OBJECTS:
        obj = bpy.data.objects[object_name]
        center_z = brow_center_z if object_name == "Rain_eyebrows" else eye_center_z
        if object_name == "Rain_eyebrows":
            scale = params["brow_vertical_scale"]
        elif object_name == "Rain_eye":
            scale = params["eye_geometry_scale"]
        else:
            scale = params["eyelid_vertical_scale"]
        lower = (
            params["brow_lower"]
            if object_name == "Rain_eyebrows"
            else 0.0
        )
        for vertex in obj.data.vertices:
            vertex.co.z = center_z + (vertex.co.z - center_z) * scale - lower
            if object_name in {"Rain_eye", "Rain_eyelashes"}:
                vertex.co.y += params["eye_recede"]
        obj.data.update()


def look_at(camera, target: Vector) -> None:
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()


def render_face(variant: str, direction: str) -> None:
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
    scene.render.resolution_x = 620
    scene.render.resolution_y = 620
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False

    camera_data = bpy.data.cameras.new(f"Test_Rain_Face_{variant}_{direction}_Camera")
    camera = bpy.data.objects.new(f"Test_Rain_Face_{variant}_{direction}_Camera", camera_data)
    scene.collection.objects.link(camera)
    target = Vector((0.0, -0.015, 1.455))
    if direction == "front":
        camera.location = Vector((0.23, -0.84, 1.49))
        camera_data.lens = 72
    else:
        camera.location = Vector((0.70, -0.015, 1.47))
        camera_data.lens = 76
    look_at(camera, target)
    scene.camera = camera
    scene.render.filepath = str(
        OUTPUT_DIR / f"test_rain_face_v3_{variant}_{direction}.png"
    )
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)
    bpy.data.cameras.remove(camera_data)


def selected_variant() -> str:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if len(args) != 2 or args[0] != "--variant" or args[1] not in VARIANTS:
        raise ValueError("用法：-- --variant base|a|b")
    return args[1]


def main() -> None:
    variant = selected_variant()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    params = VARIANTS[variant]
    if variant != "base":
        deform_head(params)
        reshape_eye_area(params)
        bpy.data.objects["Rain_head"][f"rain_face_variant_{variant}"] = dict(params)
        bpy.ops.wm.save_as_mainfile(
            filepath=str(OUTPUT_DIR / f"test_rain_face_v3_variant_{variant}.blend")
        )
    render_face(variant, "front")
    render_face(variant, "side")
    print(f"RAIN_FACE_VARIANT={variant}")


main()
