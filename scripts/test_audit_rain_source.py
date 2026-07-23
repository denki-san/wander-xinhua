import json

import bpy


def mesh_metrics(obj, depsgraph):
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        return {
            "vertices": len(mesh.vertices),
            "polygons": len(mesh.polygons),
            "triangles": sum(max(0, len(poly.vertices) - 2) for poly in mesh.polygons),
            "materials": [slot.material.name if slot.material else None for slot in obj.material_slots],
            "modifiers": [modifier.type for modifier in obj.modifiers if modifier.show_viewport],
        }
    finally:
        evaluated.to_mesh_clear()


depsgraph = bpy.context.evaluated_depsgraph_get()
meshes = {
    obj.name: mesh_metrics(obj, depsgraph)
    for obj in bpy.data.objects
    if obj.type == "MESH" and not obj.hide_get() and not obj.hide_viewport
}
armatures = {
    obj.name: {
        "bones": len(obj.data.bones),
        "deformBones": sum(1 for bone in obj.data.bones if bone.use_deform),
        "visible": not obj.hide_get() and not obj.hide_viewport,
    }
    for obj in bpy.data.objects
    if obj.type == "ARMATURE"
}
actions = [
    {
        "name": action.name,
        "frameRange": [float(value) for value in action.frame_range],
        "slots": len(action.slots) if hasattr(action, "slots") else None,
    }
    for action in bpy.data.actions
]
report = {
    "blender": bpy.app.version_string,
    "scenes": [scene.name for scene in bpy.data.scenes],
    "collections": [collection.name for collection in bpy.data.collections],
    "visibleMeshes": meshes,
    "visibleTotals": {
        "objects": len(meshes),
        "vertices": sum(item["vertices"] for item in meshes.values()),
        "triangles": sum(item["triangles"] for item in meshes.values()),
    },
    "armatures": armatures,
    "actions": actions,
    "materials": len(bpy.data.materials),
    "images": [
        {
            "name": image.name,
            "size": list(image.size),
            "filepath": image.filepath,
            "packed": image.packed_file is not None,
        }
        for image in bpy.data.images
        if image.name != "Render Result"
    ],
    "missingFiles": list(bpy.data.libraries),
}
print("RAIN_SOURCE_AUDIT=" + json.dumps(report, ensure_ascii=False, sort_keys=True))
