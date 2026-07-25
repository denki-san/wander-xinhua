"""输出 Rain 面部相关网格的结构与空间范围，供候选脸型参数化使用。"""

from __future__ import annotations

import bpy
from mathutils import Vector


def world_bounds(obj):
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return {
        "min": tuple(round(min(point[index] for point in points), 4) for index in range(3)),
        "max": tuple(round(max(point[index] for point in points), 4) for index in range(3)),
    }


for obj in sorted(bpy.data.objects, key=lambda item: item.name):
    if obj.type != "MESH" or not any(
        token in obj.name.lower()
        for token in ("head", "eye", "brow", "lash", "hair", "teeth", "tongue")
    ):
        continue
    print(
        "RAIN_FACE_OBJECT",
        {
            "name": obj.name,
            "vertices": len(obj.data.vertices),
            "bounds": world_bounds(obj),
            "location": tuple(round(value, 4) for value in obj.location),
            "rotation": tuple(round(value, 4) for value in obj.rotation_euler),
            "scale": tuple(round(value, 4) for value in obj.scale),
            "materials": [slot.material.name if slot.material else None for slot in obj.material_slots],
            "shape_keys": (
                [key.name for key in obj.data.shape_keys.key_blocks]
                if obj.data.shape_keys
                else []
            ),
        },
    )
