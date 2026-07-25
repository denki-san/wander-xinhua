import json
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "test_artifacts/test_rain_summer_weight_audit.json"

TARGETS = {
    "Rain_body",
    "Rain_head",
    "Rain_eye",
    "Rain_hair_main",
    "Rain_hair_ponytail",
    "Rain_hair_strand",
    "Rain_top",
    "Rain_scarf",
    "Rain_jeans",
    "Rain_shoes",
}


def used_groups(obj):
    totals = {group.index: 0.0 for group in obj.vertex_groups}
    for vertex in obj.data.vertices:
        for membership in vertex.groups:
            totals[membership.group] = totals.get(membership.group, 0.0) + membership.weight
    return [
        {"name": obj.vertex_groups[index].name, "weight": round(weight, 3)}
        for index, weight in sorted(totals.items(), key=lambda item: item[1], reverse=True)
        if weight > 0.01
    ]


report = {
    obj.name: used_groups(obj)
    for obj in bpy.data.objects
    if obj.type == "MESH" and obj.name in TARGETS
}
if not report:
    raise RuntimeError("没有找到优化后的 Rain 网格，权重审计不能返回空报告")

body = bpy.data.objects.get("Rain_body")
shoes = bpy.data.objects.get("Rain_shoes")
violations = []
if body:
    group_names = {group.index: group.name for group in body.vertex_groups}
    for vertex in body.data.vertices:
        if vertex.co.z >= 0.35:
            continue
        expected = "LowerLeg.L" if vertex.co.x >= 0 else "LowerLeg.R"
        weights = {
            group_names[membership.group]: membership.weight
            for membership in vertex.groups
            if membership.weight > 1e-6
        }
        if set(weights) != {expected} or abs(weights[expected] - 1.0) > 1e-6:
            violations.append(vertex.index)
report["_constraints"] = {
    "bodyFeetAndShoesRigidToLowerLeg": not violations,
    "rigidFootViolationCount": len(violations),
    "rigidFootViolationVertices": violations[:20],
}
if shoes:
    group_names = {group.index: group.name for group in shoes.vertex_groups}
    for vertex in shoes.data.vertices:
        expected = "LowerLeg.L" if vertex.co.x >= 0 else "LowerLeg.R"
        weights = {
            group_names[membership.group]: membership.weight
            for membership in vertex.groups
            if membership.weight > 1e-6
        }
        if set(weights) != {expected} or abs(weights[expected] - 1.0) > 1e-6:
            violations.append(vertex.index)
    report["_constraints"] = {
        "bodyFeetAndShoesRigidToLowerLeg": not violations,
        "rigidFootViolationCount": len(violations),
        "rigidFootViolationVertices": violations[:20],
    }

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("RAIN_WEIGHT_AUDIT=" + json.dumps(report, ensure_ascii=False, sort_keys=True))
