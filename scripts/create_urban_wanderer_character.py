"""生成《新华漫游志》的中性城市漫游者。

角色使用 Quaternius Ultimate Modular Men Pack 的 CC0 模块重新组合：
Suit 的短发头部、Casual_Hoodie 的上装、Casual_2 的长裤和运动鞋。
所有模块共用同一骨架，并把待机、行走、奔跑动作嵌入单个运行时 GLB。
"""

from __future__ import annotations

from pathlib import Path

import bmesh
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets/models/source/character/quaternius-modular-men"
SOURCE_CASUAL = SOURCE_DIR / "Casual_2.gltf"
SOURCE_HOODIE = SOURCE_DIR / "Casual_Hoodie.gltf"
SOURCE_SUIT = SOURCE_DIR / "Suit.gltf"
OUTPUT_BLEND = ROOT / "assets/models/source/character/urban-wanderer.blend"
OUTPUT_GLB = ROOT / "public/models/character/urban-wanderer.glb"
OUTPUT_PREVIEW = ROOT / "assets/models/source/character/urban-wanderer-preview.png"

ANIMATION_NAMES = {"Idle_Neutral", "Walk", "Run"}


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def hex_color(value: str) -> tuple[float, float, float, float]:
    value = value.lstrip("#")
    rgb = tuple(int(value[index:index + 2], 16) / 255 for index in (0, 2, 4))
    return (*rgb, 1.0)


def import_gltf(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


def find_object(
    objects: list[bpy.types.Object],
    *,
    kind: str,
    name: str | None = None,
) -> bpy.types.Object:
    matches = [
        obj for obj in objects
        if obj.type == kind and (name is None or obj.name == name)
    ]
    if not matches:
        raise RuntimeError(f"没有找到导入对象：type={kind}, name={name}")
    return matches[0]


def remove_object(obj: bpy.types.Object) -> None:
    if obj.name in bpy.data.objects:
        bpy.data.objects.remove(obj, do_unlink=True)


def keep_only_meshes(
    imported: list[bpy.types.Object],
    keep: set[bpy.types.Object],
) -> None:
    for obj in imported:
        if obj.type == "MESH" and obj not in keep:
            remove_object(obj)


def retarget_mesh(
    mesh: bpy.types.Object,
    source_armature: bpy.types.Object,
    target_armature: bpy.types.Object,
) -> None:
    for modifier in mesh.modifiers:
        if modifier.type == "ARMATURE" and modifier.object == source_armature:
            modifier.object = target_armature
    mesh.parent = target_armature


def material_base_name(material: bpy.types.Material | None) -> str:
    if material is None:
        return ""
    return material.name.split(".")[0]


def set_material_color(
    material: bpy.types.Material,
    color: str,
    *,
    roughness: float,
) -> None:
    rgba = hex_color(color)
    material.use_nodes = True
    material.diffuse_color = rgba
    shader = material.node_tree.nodes.get("Principled BSDF")
    if shader:
        shader.inputs["Base Color"].default_value = rgba
        shader.inputs["Roughness"].default_value = roughness
        shader.inputs["Metallic"].default_value = 0.0


def style_module(
    obj: bpy.types.Object,
    palette: dict[str, tuple[str, float]],
    *,
    soften_normals: bool = False,
    weld_vertices: bool = False,
) -> None:
    for slot in obj.material_slots:
        original = slot.material
        if not original:
            continue
        base_name = material_base_name(original)
        material = original.copy()
        material.name = f"Material_{obj.name}_{base_name}"
        slot.material = material
        if base_name in palette:
            color, roughness = palette[base_name]
            set_material_color(material, color, roughness=roughness)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    # 当前配色只使用材质常量；移除未使用的 UV、顶点色和切线来源，
    # 可减少 GLB 体积，也避免旧资源中的退化切线在导出时产生非有限值。
    for uv_layer in list(obj.data.uv_layers):
        obj.data.uv_layers.remove(uv_layer)
    for color_attribute in list(obj.data.color_attributes):
        obj.data.color_attributes.remove(color_attribute)
    if soften_normals:
        custom_normal = obj.data.attributes.get("custom_normal")
        if custom_normal:
            obj.data.attributes.remove(custom_normal)
        sharp_edge = obj.data.attributes.get("sharp_edge")
        if sharp_edge:
            obj.data.attributes.remove(sharp_edge)
        for edge in obj.data.edges:
            edge.use_edge_sharp = False
        obj.data.update(calc_edges=True)
    if weld_vertices:
        # Quaternius 源 glTF 为每个硬法线三角面复制了大量同位置顶点。
        # 先移除已经不使用的 UV/顶点色，再焊接完全重合的顶点，才能让
        # 平滑法线真正跨越相邻三角面，减少人物身上的“色块拼片”。
        mesh = obj.data
        editable_mesh = bmesh.new()
        editable_mesh.from_mesh(mesh)
        bmesh.ops.remove_doubles(
            editable_mesh,
            verts=list(editable_mesh.verts),
            dist=0.00001,
        )
        editable_mesh.to_mesh(mesh)
        editable_mesh.free()
        mesh.validate(clean_customdata=True)
        mesh.update(calc_edges=True)
        for polygon in mesh.polygons:
            polygon.use_smooth = True
    obj.hide_render = False
    obj.visible_shadow = True


def refine_head(head: bpy.types.Object) -> None:
    """轻微收窄头部并压低眼睛高度，保持写意且避免民族特征漫画化。"""
    for vertex in head.data.vertices:
        vertex.co.x *= 0.965

    eye_material_indices = {
        index for index, material in enumerate(head.data.materials)
        if material_base_name(material) == "Eye"
    }
    eye_vertex_indices = {
        vertex_index
        for polygon in head.data.polygons
        if polygon.material_index in eye_material_indices
        for vertex_index in polygon.vertices
    }
    if eye_vertex_indices:
        center_z = sum(head.data.vertices[index].co.z for index in eye_vertex_indices) / len(eye_vertex_indices)
        for index in eye_vertex_indices:
            vertex = head.data.vertices[index]
            vertex.co.z = center_z + (vertex.co.z - center_z) * 0.76
    head.data.validate(clean_customdata=True)
    head.data.update(calc_edges=True)


def remove_unused_actions(target_armature: bpy.types.Object) -> None:
    if target_armature.animation_data:
        target_armature.animation_data.action = None
    for action in list(bpy.data.actions):
        if action.name not in ANIMATION_NAMES:
            bpy.data.actions.remove(action)
    idle = bpy.data.actions.get("Idle_Neutral")
    if idle:
        target_armature.animation_data_create()
        target_armature.animation_data.action = idle


def assemble_character() -> tuple[bpy.types.Object, list[bpy.types.Object]]:
    suit_objects = import_gltf(SOURCE_SUIT)
    target_armature = find_object(suit_objects, kind="ARMATURE")
    head = find_object(suit_objects, kind="MESH", name="Suit_Head")
    keep_only_meshes(suit_objects, {head})

    casual_objects = import_gltf(SOURCE_CASUAL)
    casual_armature = find_object(casual_objects, kind="ARMATURE")
    lower = find_object(casual_objects, kind="MESH", name="Casual2_Legs")
    shoes = find_object(casual_objects, kind="MESH", name="Casual2_Feet")
    keep_only_meshes(casual_objects, {lower, shoes})
    retarget_mesh(lower, casual_armature, target_armature)
    retarget_mesh(shoes, casual_armature, target_armature)
    remove_object(casual_armature)

    hoodie_objects = import_gltf(SOURCE_HOODIE)
    hoodie_armature = find_object(hoodie_objects, kind="ARMATURE")
    upper = find_object(hoodie_objects, kind="MESH", name="Casual_Body")
    keep_only_meshes(hoodie_objects, {upper})
    retarget_mesh(upper, hoodie_armature, target_armature)
    remove_object(hoodie_armature)

    head.name = "Slot_Head_Default"
    upper.name = "Slot_Upper_Default"
    lower.name = "Slot_Lower_Default"
    shoes.name = "Slot_Shoes_Default"

    refine_head(head)
    skin_palette = {
        "Skin": ("#7a4a35", 0.78),
        "Eyebrows": ("#050505", 0.9),
        "Hair": ("#050606", 0.88),
        "Eye": ("#080503", 0.72),
    }
    style_module(
        head,
        skin_palette,
        soften_normals=True,
        weld_vertices=True,
    )
    style_module(
        upper,
        {
            "Skin": skin_palette["Skin"],
            "Purple": ("#34433f", 0.92),
            "White": ("#5a5650", 0.88),
        },
        soften_normals=True,
        weld_vertices=True,
    )
    style_module(
        lower,
        {
            "LightBlue": ("#10191e", 0.9),
        },
        soften_normals=True,
        weld_vertices=True,
    )
    style_module(
        shoes,
        {
            "Red_Dark": ("#37342e", 0.86),
            "White": ("#8a8378", 0.9),
            "LightBrown": ("#37342e", 0.86),
        },
        soften_normals=True,
        weld_vertices=True,
    )

    target_armature.name = "Urban_Wanderer_Rig"
    remove_unused_actions(target_armature)
    return target_armature, [head, upper, lower, shoes]


def make_material(
    name: str,
    color: str,
    *,
    roughness: float = 0.9,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    set_material_color(material, color, roughness=roughness)
    return material


def setup_preview() -> None:
    world = bpy.context.scene.world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = hex_color("#d8d5ce")
        background.inputs["Strength"].default_value = 0.46

    ground_material = make_material("Preview_Ground", "#bdbab3", roughness=0.96)
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0.0, 0.0, -0.008))
    ground = bpy.context.active_object
    ground.name = "Preview_Ground"
    ground.data.materials.append(ground_material)

    bpy.ops.object.light_add(type="AREA", location=(-3.3, -4.4, 5.2))
    key = bpy.context.active_object
    key.name = "Preview_Key"
    key.data.energy = 520
    key.data.shape = "DISK"
    key.data.size = 4.4

    bpy.ops.object.light_add(type="AREA", location=(3.2, 1.7, 3.4))
    fill = bpy.context.active_object
    fill.name = "Preview_Fill"
    fill.data.energy = 250
    fill.data.size = 3.6

    bpy.ops.object.light_add(type="AREA", location=(0.0, 3.4, 4.3))
    rim = bpy.context.active_object
    rim.name = "Preview_Rim"
    rim.data.energy = 390
    rim.data.color = (0.76, 0.86, 1.0)
    rim.data.size = 3.0

    bpy.ops.object.camera_add(location=(2.55, -4.6, 2.18))
    camera = bpy.context.active_object
    camera.name = "Preview_Camera"
    camera.data.lens = 66
    camera.data.sensor_width = 36
    direction = Vector((0.0, 0.0, 0.93)) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 1024
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(OUTPUT_PREVIEW)
    scene.view_settings.look = "AgX - Medium High Contrast"


def export_asset(
    armature: bpy.types.Object,
    character_modules: list[bpy.types.Object],
) -> None:
    OUTPUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PREVIEW.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.outliner.orphans_purge(do_recursive=True)
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
    bpy.ops.render.render(write_still=True)

    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    for obj in character_modules:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_skins=True,
        export_yup=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_attributes=False,
    )


def main() -> None:
    clear_scene()
    armature, modules = assemble_character()
    setup_preview()
    export_asset(armature, modules)


if __name__ == "__main__":
    main()
