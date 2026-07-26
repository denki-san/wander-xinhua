"""只读审计新华路口袋公园 Identity v1 的 editable Blend。"""

from __future__ import annotations

import json
import math

import bpy
from mathutils import Vector


HERO_GLB_SHA256 = (
    "c6ef6f107e3c1b6555784858dea2e46da8813e68aec589d04d0d3c10aeb8a7c7"
)
EXPECTED_OBJECTS = {
    "xinhua-pocket-park-identity-left-wall",
    "xinhua-pocket-park-identity-right-wall",
    "xinhua-pocket-park-identity-entrance-header",
}
EXPECTED_MATERIALS = {
    "xinhua-pocket-park-identity-mirror",
    "xinhua-pocket-park-identity-weathering-steel",
    "xinhua-pocket-park-identity-dark-seam",
}
FORBIDDEN_TOKENS = (
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
    "decoration",
)


def close(actual: float, expected: float, tolerance: float = 1e-5) -> bool:
    return abs(float(actual) - expected) <= tolerance


def object_bounds(obj: bpy.types.Object) -> tuple[Vector, Vector]:
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return (
        Vector(tuple(min(corner[axis] for corner in corners) for axis in range(3))),
        Vector(tuple(max(corner[axis] for corner in corners) for axis in range(3))),
    )


mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
names = {obj.name for obj in mesh_objects}
if names != EXPECTED_OBJECTS:
    raise RuntimeError(f"Identity Blend 对象集合异常：{sorted(names)}")
if any(obj.type in {"CAMERA", "LIGHT"} for obj in bpy.context.scene.objects):
    raise RuntimeError("Identity Blend 不得保存 Camera 或 Light")

lowered = " ".join(
    [obj.name for obj in bpy.context.scene.objects]
    + [material.name for material in bpy.data.materials]
).lower()
for token in FORBIDDEN_TOKENS:
    if token in lowered:
        raise RuntimeError(f"Identity Blend 含范围外 token：{token}")
if any(obj.name.startswith("test-") for obj in bpy.context.scene.objects):
    raise RuntimeError("Identity Blend 保存了 QA-only 预览物体")

materials = {material.name for material in bpy.data.materials}
if materials != EXPECTED_MATERIALS:
    raise RuntimeError(f"Identity Blend 材质集合异常：{sorted(materials)}")

for obj in mesh_objects:
    if any(abs(float(value)) > 1e-6 for value in obj.location):
        raise RuntimeError(f"{obj.name} location 未归零")
    if any(abs(float(value)) > 1e-6 for value in obj.rotation_euler):
        raise RuntimeError(f"{obj.name} rotation 未归零")
    if any(not close(float(value), 1.0) for value in obj.scale):
        raise RuntimeError(f"{obj.name} scale 未应用")
    if obj.get("tier") != "identity" or obj.get("version") != "identity-v1":
        raise RuntimeError(f"{obj.name} tier/version extras 异常")
    if obj.get("derived_from_hero_glb_sha256") != HERO_GLB_SHA256:
        raise RuntimeError(f"{obj.name} Hero lineage extras 异常")
    if (
        obj.get("mcp3_status") != "pending-main-window-xhigh"
        or obj.get("runtime_integrated") is not False
    ):
        raise RuntimeError(f"{obj.name} 冒充 MCP3 或 runtime pass")

all_corners = [
    obj.matrix_world @ Vector(corner)
    for obj in mesh_objects
    for corner in obj.bound_box
]
bounds_min = [
    min(float(corner[axis]) for corner in all_corners)
    for axis in range(3)
]
bounds_max = [
    max(float(corner[axis]) for corner in all_corners)
    for axis in range(3)
]
expected_min = [-0.84, -4.6, 0.0]
expected_max = [0.84, 4.6, 1.66]
for actual, expected in zip(bounds_min, expected_min, strict=True):
    if not close(actual, expected):
        raise RuntimeError(f"Identity Blend 最小包络异常：{bounds_min}")
for actual, expected in zip(bounds_max, expected_max, strict=True):
    if not close(actual, expected):
        raise RuntimeError(f"Identity Blend 最大包络异常：{bounds_max}")

left = bpy.data.objects["xinhua-pocket-park-identity-left-wall"]
right = bpy.data.objects["xinhua-pocket-park-identity-right-wall"]
header = bpy.data.objects["xinhua-pocket-park-identity-entrance-header"]
left_min, left_max = object_bounds(left)
right_min, right_max = object_bounds(right)
header_min, _ = object_bounds(header)
if left_max.x > -0.68 + 1e-5 or right_min.x < 0.68 - 1e-5:
    raise RuntimeError("Identity 双墙侵入冻结中心通路")
if header_min.z < 1.33 - 1e-5:
    raise RuntimeError("Identity 入口横梁侵入地面通路")

polygon_count = sum(len(obj.data.polygons) for obj in mesh_objects)
if polygon_count != 336:
    raise RuntimeError(f"Identity Blend 面数异常：{polygon_count}")
if not all(
    math.isfinite(float(value))
    for obj in mesh_objects
    for vertex in obj.data.vertices
    for value in vertex.co
):
    raise RuntimeError("Identity Blend 含非有限顶点")

scene = bpy.context.scene
if (
    scene.get("hero_mcp2") != "pass-main-window-xhigh"
    or scene.get("mcp3") != "pending-main-window-xhigh"
    or scene.get("runtime_integrated") is not False
    or scene.get("shared_registry_modified") is not False
    or scene.get("shared_runtime_modified") is not False
    or scene.get("fast_manifest_modified") is not False
):
    raise RuntimeError("Identity Blend 场景门级或共享范围标记异常")

print(
    json.dumps(
        {
            "status": "pass",
            "objects": sorted(names),
            "materials": sorted(materials),
            "polygons": polygon_count,
            "bounds": {"min": bounds_min, "max": bounds_max},
            "centerPassageLocalWidth": float(right_min.x - left_max.x),
            "mcp3": "pending-main-window-xhigh",
            "runtime": "pending-main-window",
        },
        ensure_ascii=False,
    )
)
