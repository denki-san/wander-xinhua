"""在 Blender 中审计新华路口袋公园 Hero v2 的可编辑源文件。"""

from __future__ import annotations

import json
import math

import bpy


EXPECTED_OBJECTS = {
    "xinhua-pocket-park-hero-left-wall",
    "xinhua-pocket-park-hero-right-wall",
    "xinhua-pocket-park-hero-entrance-header",
}
FORBIDDEN = (
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

mesh_objects = [
    obj
    for obj in bpy.context.scene.objects
    if obj.type == "MESH"
]
names = {obj.name for obj in mesh_objects}
if names != EXPECTED_OBJECTS:
    raise RuntimeError(f"Hero v2 源对象异常：{sorted(names)}")
if any(
    token in obj.name.lower()
    for obj in mesh_objects
    for token in FORBIDDEN
):
    raise RuntimeError(f"Hero v2 源文件含范围外对象：{sorted(names)}")
if any(obj.type in {"CAMERA", "LIGHT"} for obj in bpy.context.scene.objects):
    raise RuntimeError("Hero v2 源文件不得保存 QA 相机或灯光")
if any(
    value not in {0.0, 1.0}
    for obj in mesh_objects
    for value in (
        *obj.location,
        *obj.rotation_euler,
        *obj.scale,
    )
):
    # 位置和旋转必须全 0，缩放必须全 1；下面逐项给出更精确错误。
    for obj in mesh_objects:
        if any(abs(value) > 1e-8 for value in (*obj.location, *obj.rotation_euler)):
            raise RuntimeError(f"{obj.name} 位置或旋转未烘焙")
        if any(abs(value - 1.0) > 1e-8 for value in obj.scale):
            raise RuntimeError(f"{obj.name} 缩放未烘焙")

world_points = [
    obj.matrix_world @ vertex.co
    for obj in mesh_objects
    for vertex in obj.data.vertices
]
bounds = {
    "min": [
        min(point.x for point in world_points),
        min(point.y for point in world_points),
        min(point.z for point in world_points),
    ],
    "max": [
        max(point.x for point in world_points),
        max(point.y for point in world_points),
        max(point.z for point in world_points),
    ],
}
expected = {
    "min": [-0.84, -4.6, 0.0],
    "max": [0.84, 4.6, 1.66],
}
for boundary in ("min", "max"):
    for actual, wanted in zip(bounds[boundary], expected[boundary], strict=True):
        if not math.isclose(actual, wanted, abs_tol=1e-6):
            raise RuntimeError(f"Hero v2 Blend bounds 异常：{bounds}")
if any(
    obj.get("derived_from_massing_glb_sha256")
    != "cc89e36e68397199d91684d3059c5c88410a7acc1b1c015398e05d8e57b15fa3"
    for obj in mesh_objects
):
    raise RuntimeError("Hero v2 Blend 缺少 Massing lineage")
if bpy.context.scene.get("hero_mcp2") != "pending-main-window-xhigh":
    raise RuntimeError("Hero v2 Blend 不得提前声称 MCP2")

print(
    json.dumps(
        {
            "status": "pass",
            "objects": sorted(names),
            "bounds": bounds,
            "materials": sorted(
                {
                    slot.material.name
                    for obj in mesh_objects
                    for slot in obj.material_slots
                    if slot.material
                }
            ),
        },
        ensure_ascii=False,
    )
)
