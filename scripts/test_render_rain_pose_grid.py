from pathlib import Path

import bpy
from mathutils import Vector


OUTPUT_DIR = Path("/tmp/test_rain_pose_grid")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
FRAMES = [1, 200, 400, 600, 800, 1000, 1200, 1400, 1600]
CHARACTER_MESHES = {
    "GEO-rain_body",
    "GEO-rain_eye",
    "GEO-rain_eyebrows",
    "GEO-rain_eyelashes",
    "GEO-rain_hair_main",
    "GEO-rain_hair_ponytail",
    "GEO-rain_hair_strand",
    "GEO-rain_hairband",
    "GEO-rain_head",
    "GEO-rain_jeans",
    "GEO-rain_scarf",
    "GEO-rain_shoes",
    "GEO-rain_top",
}


scene = bpy.context.scene
rig = bpy.data.objects["RIG-Rain"]
rig.animation_data_create()
rig.animation_data.action = bpy.data.actions["Rain_WeightPaint"]

for obj in bpy.data.objects:
    obj.hide_render = obj.name not in CHARACTER_MESHES

camera_data = bpy.data.cameras.new("Test_Rain_Camera")
camera = bpy.data.objects.new("Test_Rain_Camera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera_data.lens = 58

scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.studio_light = "paint.sl"
scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_shadows = True
scene.display.shading.show_cavity = True
scene.display.shading.cavity_type = "WORLD"
scene.display.shading.curvature_ridge_factor = 1.4
scene.display.shading.curvature_valley_factor = 1.1
scene.display.shading.background_type = "WORLD"
scene.display.shading.background_color = (0.73, 0.82, 0.89)
scene.render.resolution_x = 360
scene.render.resolution_y = 480
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False


def visible_bounds():
    points = []
    for obj in bpy.data.objects:
        if obj.name not in CHARACTER_MESHES:
            continue
        points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    minimum = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
    maximum = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
    return minimum, maximum


for frame in FRAMES:
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    minimum, maximum = visible_bounds()
    center = (minimum + maximum) * 0.5
    height = max(0.1, maximum.z - minimum.z)
    distance = height * 2.35
    camera.location = center + Vector((distance * 0.28, -distance, height * 0.12))
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(OUTPUT_DIR / f"test_rain_pose_{frame:04d}.png")
    bpy.ops.render.render(write_still=True)
