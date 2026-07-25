"""只读复算旧 House315 Hero `.blend` 的网格结构与法线完整性。"""

import json
import math

import bpy
from mathutils import Vector


objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
result = {
    "objects": [],
    "totals": {
        "meshObjects": len(objects),
        "vertices": 0,
        "polygons": 0,
        "loopTriangles": 0,
        "materials": len(bpy.data.materials),
        "zeroAreaPolygonsBelow1e10": 0,
        "zeroAreaTrianglesBelow1e10": 0,
        "nonFinitePositions": 0,
        "nonFinitePolygonNormals": 0,
        "nonFiniteTriangleNormals": 0,
        "trianglePolygonOrientationMismatches": 0,
    },
    "bounds": {
        "min": [math.inf, math.inf, math.inf],
        "max": [-math.inf, -math.inf, -math.inf],
    },
}

for obj in objects:
    mesh = obj.data
    mesh.calc_loop_triangles()
    object_result = {
        "name": obj.name,
        "location": [round(value, 9) for value in obj.location],
        "rotationEuler": [round(value, 9) for value in obj.rotation_euler],
        "scale": [round(value, 9) for value in obj.scale],
        "vertices": len(mesh.vertices),
        "polygons": len(mesh.polygons),
        "loopTriangles": len(mesh.loop_triangles),
        "materialSlots": [slot.name for slot in mesh.materials],
        "zeroAreaPolygonsBelow1e10": 0,
        "zeroAreaTrianglesBelow1e10": 0,
        "nonFinitePositions": 0,
        "nonFinitePolygonNormals": 0,
        "nonFiniteTriangleNormals": 0,
        "trianglePolygonOrientationMismatches": 0,
    }

    for vertex in mesh.vertices:
        world = obj.matrix_world @ vertex.co
        for axis in range(3):
            result["bounds"]["min"][axis] = min(
                result["bounds"]["min"][axis], world[axis]
            )
            result["bounds"]["max"][axis] = max(
                result["bounds"]["max"][axis], world[axis]
            )
        if any(not math.isfinite(value) for value in vertex.co):
            object_result["nonFinitePositions"] += 1

    for polygon in mesh.polygons:
        if polygon.area <= 1e-10:
            object_result["zeroAreaPolygonsBelow1e10"] += 1
        if any(not math.isfinite(value) for value in polygon.normal):
            object_result["nonFinitePolygonNormals"] += 1

    for triangle in mesh.loop_triangles:
        a, b, c = [mesh.vertices[index].co for index in triangle.vertices]
        face = (b - a).cross(c - a)
        double_area = face.length
        if double_area <= 1e-10:
            object_result["zeroAreaTrianglesBelow1e10"] += 1
            continue
        if any(not math.isfinite(value) for value in triangle.normal):
            object_result["nonFiniteTriangleNormals"] += 1
            continue
        polygon_normal = mesh.polygons[triangle.polygon_index].normal
        if face.normalized().dot(Vector(polygon_normal)) < -1e-4:
            object_result["trianglePolygonOrientationMismatches"] += 1

    result["objects"].append(object_result)
    for key in (
        "vertices",
        "polygons",
        "loopTriangles",
        "zeroAreaPolygonsBelow1e10",
        "zeroAreaTrianglesBelow1e10",
        "nonFinitePositions",
        "nonFinitePolygonNormals",
        "nonFiniteTriangleNormals",
        "trianglePolygonOrientationMismatches",
    ):
        result["totals"][key] += object_result[key]

result["bounds"]["min"] = [round(value, 9) for value in result["bounds"]["min"]]
result["bounds"]["max"] = [round(value, 9) for value in result["bounds"]["max"]]
print("TEST_HOUSE_315_BLEND_AUDIT=" + json.dumps(result, ensure_ascii=False))
