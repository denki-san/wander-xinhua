"""Deterministically build a stylized WebGL-ready Wukang Mansion asset."""

from pathlib import Path
import math
import bpy

ROOT = Path(__file__).resolve().parents[2]
GLB = ROOT / "public/models/building-evidence-lab/wukang-mansion.glb"
BLEND = ROOT / "research/source/wukang-mansion.blend"
PREVIEW = ROOT / "research/previews/test_wukang-mansion_preview.png"
PARTS = []


def mat(name, color, rough=0.82, metallic=0.0):
    result = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    result.diffuse_color = (*color, 1)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = rough
    shader.inputs["Metallic"].default_value = metallic
    return result


BRICK = mat("warm brick", (0.55, 0.24, 0.15))
BRICK_LIGHT = mat("sunlit brick", (0.68, 0.34, 0.23))
STONE = mat("limestone", (0.69, 0.68, 0.61))
TRIM = mat("cream trim", (0.78, 0.76, 0.68))
ROOF = mat("flat charcoal roof", (0.13, 0.15, 0.15))
GLASS = mat("blue grey glass", (0.19, 0.29, 0.31), 0.3)
IRON = mat("dark balcony iron", (0.08, 0.10, 0.10), 0.46, 0.2)


def add_box(name, xyz, size, material, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=xyz)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new("soft edges", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.data.materials.append(material)
    PARTS.append(obj)
    return obj


def add_cylinder(name, xyz, radius, depth, material, vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=xyz)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    PARTS.append(obj)
    return obj


def add_arch(name, x, y, z):
    # Stone pier + curved archivolt. The dark opening remains legible at gameplay distance.
    add_box(f"{name}-opening", (x, y, z), (1.45, 0.18, 2.15), GLASS, 0.04)
    add_box(f"{name}-left-pier", (x - 0.83, y - 0.02, z - 0.18), (0.22, 0.36, 2.6), STONE, 0.03)
    add_box(f"{name}-right-pier", (x + 0.83, y - 0.02, z - 0.18), (0.22, 0.36, 2.6), STONE, 0.03)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.74, minor_radius=0.13, major_segments=16, minor_segments=6,
                                    location=(x, y - 0.08, z + 0.9), rotation=(math.pi / 2, 0, 0))
    torus = bpy.context.object
    torus.name = f"{name}-archivolt"
    torus.data.materials.append(STONE)
    PARTS.append(torus)


def build():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    # Long body plus the signature rounded prow.
    add_box("stone arcade base", (0, 0, 1.65), (35.5, 8.0, 3.3), STONE, 0.18)
    add_box("brick residential body", (0, 0, 10.2), (35.5, 7.9, 13.8), BRICK, 0.16)
    add_cylinder("rounded stone prow", (-17.75, 0, 1.65), 4.0, 3.3, STONE, 40)
    add_cylinder("rounded brick prow", (-17.75, 0, 10.2), 3.96, 13.8, BRICK_LIGHT, 40)
    add_box("flat roof", (0, 0, 17.25), (35.3, 7.7, 0.36), ROOF, 0.12)
    add_cylinder("rounded prow roof", (-17.75, 0, 17.25), 3.88, 0.4, ROOF, 40)

    for z in (3.35, 15.55, 16.55):
        add_box(f"long cornice {z}", (0, -4.06, z), (35.8, 0.32, 0.34), TRIM, 0.08)
        add_cylinder(f"prow cornice {z}", (-17.75, 0, z), 4.08, 0.34, TRIM, 40)

    # Street-facing long elevation.
    for bay in range(15):
        x = -15.7 + bay * 2.22
        add_arch(f"arcade-{bay:02}", x, -4.08, 1.72)
        for floor in range(7):
            z = 4.45 + floor * 1.78
            add_box(f"window-{floor:02}-{bay:02}", (x, -4.04, z), (0.86, 0.18, 1.18), GLASS, 0.035)
            add_box(f"sill-{floor:02}-{bay:02}", (x, -4.19, z - 0.7), (1.04, 0.36, 0.14), TRIM, 0.03)
            if bay % 2 == 1:
                add_box(f"balcony-slab-{floor:02}-{bay:02}", (x, -4.48, z - 0.56), (1.55, 0.82, 0.15), TRIM, 0.04)
                add_box(f"balcony-rail-{floor:02}-{bay:02}", (x, -4.84, z - 0.18), (1.48, 0.07, 0.62), IRON, 0.02)
                add_box(f"balcony-left-{floor:02}-{bay:02}", (x - 0.72, -4.6, z - 0.18), (0.06, 0.42, 0.62), IRON)
                add_box(f"balcony-right-{floor:02}-{bay:02}", (x + 0.72, -4.6, z - 0.18), (0.06, 0.42, 0.62), IRON)

    # Rounded prow reads through stacked windows and wraparound balconies.
    for floor in range(7):
        z = 4.45 + floor * 1.78
        for angle in (-55, -25, 0, 25, 55):
            a = math.radians(angle)
            x = -17.75 - math.cos(a) * 3.98
            y = math.sin(a) * 3.98
            window = add_box(f"prow-window-{floor}-{angle}", (x, y, z), (0.92, 0.16, 1.2), GLASS, 0.035)
            window.rotation_euler[2] = -a
        if floor in (0, 2, 4, 6):
            add_cylinder(f"prow balcony slab {floor}", (-17.75, 0, z - 0.62), 4.35, 0.14, TRIM, 40)
            add_cylinder(f"prow balcony rail {floor}", (-17.75, 0, z - 0.14), 4.38, 0.05, IRON, 40)

    # Simplified rooftop/service masses visible in aerial references.
    add_box("rear roof service wing", (6.2, 1.2, 18.05), (15.0, 4.2, 1.25), ROOF, 0.12)
    for x in (-8, 0, 9):
        add_box(f"chimney-{x}", (x, 0.8, 18.1), (0.65, 0.65, 1.45), STONE, 0.08)


def export():
    GLB.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    # Preserve the editable, named parts in the Blend source, then collapse the
    # runtime copy by material so the browser receives a compact draw-call set.
    merged = []
    material_groups = [
        (
            material,
            [
                obj for obj in PARTS
                if obj.type == "MESH" and obj.data.materials and obj.data.materials[0] == material
            ],
        )
        for material in (BRICK, BRICK_LIGHT, STONE, TRIM, ROOF, GLASS, IRON)
    ]
    for material, candidates in material_groups:
        if not candidates:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for obj in candidates:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = candidates[0]
        bpy.ops.object.join()
        candidates[0].name = f"runtime-{material.name}"
        merged.append(candidates[0])
    PARTS[:] = merged
    bpy.ops.object.select_all(action="DESELECT")
    for obj in merged:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(GLB), export_format="GLB", use_selection=True,
                              export_yup=True, export_apply=True, export_materials="EXPORT")


def preview():
    world = bpy.context.scene.world
    world.color = (0.055, 0.07, 0.075)
    bpy.ops.object.light_add(type="AREA", location=(-15, -18, 26))
    bpy.context.object.data.energy = 1700
    bpy.context.object.data.shape = "DISK"
    bpy.context.object.data.size = 12
    bpy.ops.object.light_add(type="AREA", location=(18, 8, 14))
    bpy.context.object.data.energy = 900
    bpy.context.object.data.size = 10
    bpy.ops.object.camera_add(location=(-37, -35, 25))
    camera = bpy.context.object
    direction = mathutils.Vector((-2, 0, 9)) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 54
    bpy.context.scene.camera = camera
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW)
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    import mathutils
    build()
    export()
    preview()
