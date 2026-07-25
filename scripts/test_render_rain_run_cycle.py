"""渲染 Rain 跑步周期的 12 帧侧向检查图。"""

from __future__ import annotations

import sys
from pathlib import Path

import bpy
from mathutils import Vector


def argument(name: str, default: str) -> str:
    if "--" not in sys.argv:
        return default
    arguments = sys.argv[sys.argv.index("--") + 1:]
    if name not in arguments:
        return default
    return arguments[arguments.index(name) + 1]


output_dir = Path(argument("--output-dir", "/tmp/test_rain_run_cycle"))
zero_foot_location = "--zero-foot-location" in sys.argv
only_mesh = argument("--only-mesh", "")
rigid_feet_to_lower_leg = "--rigid-feet-to-lower-leg" in sys.argv
output_dir.mkdir(parents=True, exist_ok=True)

scene = bpy.context.scene
rig = bpy.data.objects["Rain_Summer_Rig"]
meshes = [obj for obj in bpy.data.objects if obj.type == "MESH" and obj.parent == rig]
if rigid_feet_to_lower_leg:
    body = bpy.data.objects["Rain_body"]
    shoes = bpy.data.objects["Rain_shoes"]
    for obj, vertices in (
        (body, [vertex for vertex in body.data.vertices if vertex.co.z < 0.35]),
        (shoes, list(shoes.data.vertices)),
    ):
        indices = [vertex.index for vertex in vertices]
        for group in obj.vertex_groups:
            group.remove(indices)
        groups = {
            side: obj.vertex_groups.get(f"LowerLeg.{side}")
            or obj.vertex_groups.new(name=f"LowerLeg.{side}")
            for side in ("L", "R")
        }
        for vertex in vertices:
            side = "L" if vertex.co.x >= 0 else "R"
            groups[side].add([vertex.index], 1.0, "REPLACE")
if only_mesh:
    for obj in meshes:
        obj.hide_render = obj.name != only_mesh
action = bpy.data.actions["Run"]
rig.animation_data_create()
rig.animation_data.action = action

camera_data = bpy.data.cameras.new("Test_Rain_Run_Cycle_Camera")
camera = bpy.data.objects.new("Test_Rain_Run_Cycle_Camera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera_data.lens = 62

scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.studio_light = "paint.sl"
scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_shadows = True
scene.display.shading.show_cavity = True
scene.display.shading.cavity_type = "WORLD"
scene.display.shading.background_type = "VIEWPORT"
scene.display.shading.background_color = (0.73, 0.82, 0.89)
scene.render.resolution_x = 320
scene.render.resolution_y = 400
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"


def evaluated_bounds() -> tuple[Vector, Vector]:
    points = [
        obj.matrix_world @ Vector(corner)
        for obj in meshes
        for corner in obj.bound_box
    ]
    minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    return minimum, maximum


start, end = (int(value) for value in action.frame_range)
frames = [
    round(start + (end - start) * index / 11)
    for index in range(12)
]
for index, frame in enumerate(frames):
    scene.frame_set(frame)
    if zero_foot_location:
        for side in ("L", "R"):
            rig.pose.bones[f"Foot.{side}"].location = Vector((0.0, 0.0, 0.0))
    bpy.context.view_layer.update()
    minimum, maximum = evaluated_bounds()
    center = (minimum + maximum) * 0.5
    height = max(0.1, maximum.z - minimum.z)
    distance = height * 2.18
    camera.location = center + Vector((distance, -distance * 0.08, height * 0.08))
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(output_dir / f"test_rain_run_{index:02d}_frame_{frame:02d}.png")
    bpy.ops.render.render(write_still=True)

print(f"RAIN_RUN_CYCLE={output_dir}")
