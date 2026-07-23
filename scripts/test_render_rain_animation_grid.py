from pathlib import Path

import bpy
from mathutils import Vector


OUTPUT_DIR = Path("/tmp/test_rain_animation_grid")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
ACTION_NAMES = ("Idle_Neutral", "Walk", "Run")


scene = bpy.context.scene
rig = bpy.data.objects["Rain_Summer_Rig"]
meshes = [obj for obj in bpy.data.objects if obj.type == "MESH" and obj.parent == rig]
rig.animation_data_create()

camera_data = bpy.data.cameras.new("Test_Rain_Animation_Camera")
camera = bpy.data.objects.new("Test_Rain_Animation_Camera", camera_data)
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
scene.display.shading.background_type = "VIEWPORT"
scene.display.shading.background_color = (0.73, 0.82, 0.89)
scene.render.resolution_x = 360
scene.render.resolution_y = 480
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"


def bounds():
    points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    minimum = Vector(tuple(min(point[index] for point in points) for index in range(3)))
    maximum = Vector(tuple(max(point[index] for point in points) for index in range(3)))
    return minimum, maximum


for action_name in ACTION_NAMES:
    action = bpy.data.actions[action_name]
    rig.animation_data.action = action
    start, end = (int(value) for value in action.frame_range)
    frames = [start, start + (end - start) // 3, start + (end - start) * 2 // 3]
    for index, frame in enumerate(frames):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        minimum, maximum = bounds()
        center = (minimum + maximum) * 0.5
        height = max(0.1, maximum.z - minimum.z)
        distance = height * 2.35
        camera.location = center + Vector((distance * 0.28, -distance, height * 0.12))
        camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(OUTPUT_DIR / f"test_rain_{action_name.lower()}_{index}.png")
        bpy.ops.render.render(write_still=True)
