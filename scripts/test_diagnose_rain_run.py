"""逐帧检查 Rain 跑步动画中的裤脚异常形变。"""

from __future__ import annotations

import json
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "test_artifacts/test_rain_run_diagnosis.json"
RIG_NAME = "Rain_Summer_Rig"
MESH_NAME = "Rain_jeans"


rig = bpy.data.objects[RIG_NAME]
mesh = bpy.data.objects[MESH_NAME]
action = bpy.data.actions["Run"]
rig.animation_data_create()
rig.animation_data.action = action

rest_coordinates = [vertex.co.copy() for vertex in mesh.data.vertices]
source_groups = {group.index: group.name for group in mesh.vertex_groups}
vertex_groups = {
    vertex.index: [
        {
            "name": source_groups[membership.group],
            "weight": round(membership.weight, 6),
        }
        for membership in vertex.groups
    ]
    for vertex in mesh.data.vertices
}

start, end = (int(value) for value in action.frame_range)
frames = []
for frame in range(start, end + 1):
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
    evaluated_mesh = evaluated.to_mesh()
    world_coordinates = [
        evaluated.matrix_world @ vertex.co
        for vertex in evaluated_mesh.vertices
    ]
    lowest = sorted(
        range(len(world_coordinates)),
        key=lambda index: world_coordinates[index].z,
    )[:12]
    frames.append(
        {
            "frame": frame,
            "ankleJoints": {
                side: {
                    "lowerLegTail": [
                        round(value, 6)
                        for value in rig.pose.bones[f"LowerLeg.{side}"].tail
                    ],
                    "footHead": [
                        round(value, 6)
                        for value in rig.pose.bones[f"Foot.{side}"].head
                    ],
                    "gap": round(
                        (
                            rig.pose.bones[f"LowerLeg.{side}"].tail
                            - rig.pose.bones[f"Foot.{side}"].head
                        ).length,
                        6,
                    ),
                    "footLocation": [
                        round(value, 6)
                        for value in rig.pose.bones[f"Foot.{side}"].location
                    ],
                }
                for side in ("L", "R")
            },
            "minimumZ": round(min(point.z for point in world_coordinates), 6),
            "maximumZ": round(max(point.z for point in world_coordinates), 6),
            "lowestVertices": [
                {
                    "index": index,
                    "world": [round(value, 6) for value in world_coordinates[index]],
                    "rest": [round(value, 6) for value in rest_coordinates[index]],
                    "groups": vertex_groups[index],
                }
                for index in lowest
            ],
        }
    )
    evaluated.to_mesh_clear()

report = {
    "action": action.name,
    "frameRange": [start, end],
    "mesh": mesh.name,
    "vertexCount": len(mesh.data.vertices),
    "restBounds": {
        "min": [
            round(min(vertex.co[axis] for vertex in mesh.data.vertices), 6)
            for axis in range(3)
        ],
        "max": [
            round(max(vertex.co[axis] for vertex in mesh.data.vertices), 6)
            for axis in range(3)
        ],
    },
    "lowerCuffCounts": {
        str(threshold): sum(
            1 for vertex in mesh.data.vertices if vertex.co.z <= threshold
        )
        for threshold in (0.24, 0.25, 0.26, 0.27, 0.28, 0.30, 0.32)
    },
    "lowestRestVertices": [
        {
            "index": vertex.index,
            "rest": [round(value, 6) for value in vertex.co],
            "groups": vertex_groups[vertex.index],
        }
        for vertex in sorted(mesh.data.vertices, key=lambda item: item.co.z)[:40]
    ],
    "groups": sorted(group.name for group in mesh.vertex_groups),
    "suspiciousGroups": {
        group_name: [
            {
                "index": vertex.index,
                "rest": [round(value, 6) for value in vertex.co],
                "weight": next(
                    round(membership.weight, 6)
                    for membership in vertex.groups
                    if source_groups[membership.group] == group_name
                ),
            }
            for vertex in mesh.data.vertices
            if any(
                source_groups[membership.group] == group_name
                for membership in vertex.groups
            )
        ]
        for group_name in ("Pinky1.L", "Pinky1.R", "Torso")
        if group_name in {group.name for group in mesh.vertex_groups}
    },
    "frames": frames,
}
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"RAIN_RUN_DIAGNOSIS={OUTPUT}")
