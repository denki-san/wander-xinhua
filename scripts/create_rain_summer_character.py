"""将 Blender Studio Rain 转为新华盛夏绘本的 WebGL 候选角色。"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
FALLBACK_SOURCE = Path("/tmp/test_rain_source/rain_v01.blend")
SOURCE_BLEND = ROOT / "assets/models/source/character/rain-source/rain_v01.blend"
ANIMATION_GLB = ROOT / "public/models/character/urban-wanderer.glb"
OUTPUT_BLEND = ROOT / "assets/models/source/character/rain-summer-wanderer.blend"
OUTPUT_GLB = ROOT / "public/models/character/rain-summer-wanderer.glb"
BUILD_RECORD = ROOT / "docs/research/build-records/rain-summer-wanderer.json"
PREVIEW_DIR = ROOT / "test_artifacts"

SOURCE_MESH_NAMES = {
    "GEO-rain_body",
    "GEO-rain_eye",
    "GEO-rain_eyebrows",
    "GEO-rain_eyelashes",
    "GEO-rain_hair_main",
    "GEO-rain_hair_strand",
    "GEO-rain_head",
    "GEO-rain_jeans",
    "GEO-rain_scarf",
    "GEO-rain_shoes",
    "GEO-rain_top",
}

TARGET_TO_SOURCE_BONE = {
    "Hips": "DEF-Pelvis",
    "Abdomen": "DEF-Spine1",
    "Torso": "DEF-Spine2",
    "Chest": "DEF-Spine4",
    "Neck": "DEF-Neck",
    "Head": "DEF-Head_Top",
    "Shoulder.L": "DEF-Clavicle.L",
    "UpperArm.L": "DEF-Upperarm1.L",
    "LowerArm.L": "DEF-Forearm1.L",
    "Wrist.L": "DEF-Hand.L",
    "Shoulder.R": "DEF-Clavicle.R",
    "UpperArm.R": "DEF-Upperarm1.R",
    "LowerArm.R": "DEF-Forearm1.R",
    "Wrist.R": "DEF-Hand.R",
    "UpperLeg.L": "DEF-Thigh1.L",
    "LowerLeg.L": "DEF-Shin1.L",
    "Foot.L": "DEF-Foot.L",
    "PT.L": "DEF-Toe.L",
    "UpperLeg.R": "DEF-Thigh1.R",
    "LowerLeg.R": "DEF-Shin1.R",
    "Foot.R": "DEF-Foot.R",
    "PT.R": "DEF-Toe.R",
}

for side in ("L", "R"):
    for finger in ("Index", "Middle", "Ring", "Pinky"):
        for segment in range(1, 5):
            TARGET_TO_SOURCE_BONE[f"{finger}{segment}.{side}"] = f"DEF-{finger}{segment}.{side}"
    for segment in range(1, 4):
        TARGET_TO_SOURCE_BONE[f"Thumb{segment}.{side}"] = f"DEF-Thumb{segment}.{side}"


def ensure_source_loaded() -> None:
    if "RIG-Rain" in bpy.data.objects:
        return
    source = SOURCE_BLEND if SOURCE_BLEND.exists() else FALLBACK_SOURCE
    if not source.exists():
        raise FileNotFoundError(
            "缺少 Rain 源文件。请将 rain_v01.blend 放到 "
            f"{SOURCE_BLEND}，或把已校验的临时源放到 {FALLBACK_SOURCE}。"
        )
    bpy.ops.wm.open_mainfile(filepath=str(source))


def make_material(name: str, color: str, roughness: float = 0.86):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.diffuse_color = (*hex_to_rgb(color), 1.0)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    principled = nodes.new("ShaderNodeBsdfPrincipled")
    principled.inputs["Base Color"].default_value = (*hex_to_rgb(color), 1.0)
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = 0.0
    material.node_tree.links.new(principled.outputs["BSDF"], output.inputs["Surface"])
    return material


def hex_to_rgb(value: str):
    value = value.lstrip("#")
    return tuple(int(value[index:index + 2], 16) / 255 for index in (0, 2, 4))


def palette():
    return {
        "skin": make_material("Rain_Skin", "#9b664d", 0.92),
        "hair": make_material("Rain_Hair", "#2c211f", 0.94),
        "hairband": make_material("Rain_Hairband", "#cf725f", 0.88),
        "top": make_material("Rain_Top", "#fff0cf", 0.96),
        "scarf": make_material("Rain_Scarf", "#65a6a0", 0.9),
        "jeans": make_material("Rain_Jeans", "#52698a", 0.94),
        "shoe": make_material("Rain_Shoes", "#a96045", 0.9),
        "cream": make_material("Rain_Cream_Detail", "#f5e1bd", 0.92),
        "eye_white": make_material("Rain_Eye_White", "#fff8e8", 0.74),
        "eye_iris": make_material("Rain_Eye_Iris", "#5a9d9c", 0.7),
        "eye_dark": make_material("Rain_Eye_Dark", "#172525", 0.8),
    }


def move_to_collection(obj, collection) -> None:
    for source_collection in list(obj.users_collection):
        source_collection.objects.unlink(obj)
    collection.objects.link(obj)


def apply_object_transform(obj) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)


def create_low_ponytail(collection, materials):
    """用贴近后颈的短束低马尾替换水平高马尾，并保持 Head 刚性绑定。"""
    lobes = []
    lobe_specs = (
        ((0.0, 0.084, 1.443), (0.034, 0.041, 0.055), -0.07),
        ((0.004, 0.089, 1.385), (0.026, 0.032, 0.043), 0.05),
    )
    for index, (location, scale, rotation_z) in enumerate(lobe_specs):
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=2,
            radius=1.0,
            location=location,
            rotation=(math.radians(-8), 0, rotation_z),
        )
        lobe = bpy.context.active_object
        lobe.name = f"Rain_hair_low_ponytail_lobe_{index}"
        lobe.scale = scale
        move_to_collection(lobe, collection)
        apply_object_transform(lobe)
        lobe.data.materials.append(materials["hair"])
        lobes.append(lobe)

    bpy.ops.object.select_all(action="DESELECT")
    for lobe in lobes:
        lobe.select_set(True)
    bpy.context.view_layer.objects.active = lobes[0]
    bpy.ops.object.join()
    ponytail = bpy.context.active_object
    ponytail.name = "Rain_hair_low_ponytail"
    ponytail.data.name = "Rain_hair_low_ponytail_Mesh"

    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.024,
        minor_radius=0.007,
        major_segments=14,
        minor_segments=6,
        location=(0.0, 0.076, 1.486),
        rotation=(math.radians(78), 0, 0),
    )
    hairband = bpy.context.active_object
    hairband.name = "Rain_hairband_low"
    hairband.data.name = "Rain_hairband_low_Mesh"
    move_to_collection(hairband, collection)
    apply_object_transform(hairband)
    hairband.data.materials.append(materials["hairband"])
    return [ponytail, hairband]


def apply_modifier(obj, modifier) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.hide_set(False)
    obj.hide_viewport = False
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    try:
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    except RuntimeError as error:
        print(f"跳过无法应用的修改器 {obj.name}/{modifier.name}: {error}")
        obj.modifiers.remove(modifier)


def duplicate_render_mesh(source, collection):
    clone = source.copy()
    clone.data = source.data.copy()
    clone.animation_data_clear()
    collection.objects.link(clone)
    clone.name = source.name.replace("GEO-rain", "Rain")
    clone.data.name = f"{clone.name}_Mesh"
    clone.hide_render = False
    clone.hide_set(False)
    clone.hide_viewport = False

    # 运行时不输出电影级表情形态键；先移除它们，才能确定性应用镜像、遮罩和 Lattice。
    if clone.data.shape_keys:
        clone.shape_key_clear()

    # 在静止姿势应用造型修改器；原电影控制骨架和修正平滑不进入运行时。
    for modifier in list(clone.modifiers):
        if modifier.type in {"ARMATURE", "CORRECTIVE_SMOOTH", "SUBSURF", "NODES"}:
            clone.modifiers.remove(modifier)
        else:
            apply_modifier(clone, modifier)
    return clone


def mapped_weight_group(obj_name: str, source_group: str) -> str | None:
    if obj_name in {"Rain_eye", "Rain_eyebrows", "Rain_eyelashes"}:
        return "Head"
    if obj_name.startswith("Rain_hair"):
        return "Head"
    if obj_name == "Rain_head":
        if source_group == "DEF-Neck":
            return "Neck"
        if source_group.startswith("DEF-Clavicle"):
            return "Shoulder.L" if source_group.endswith(".L") else "Shoulder.R"
        if source_group in {"DEF-Spine3", "DEF-Spine4"}:
            return "Chest"
        if source_group.startswith("DEF-"):
            return "Head"
        return None
    if obj_name == "Rain_scarf":
        if "Scarf" in source_group or source_group in {"DEF-Neck", "head"}:
            return "Neck"
        if source_group.startswith("DEF-Clavicle"):
            return "Shoulder.L" if source_group.endswith(".L") else "Shoulder.R"
        if source_group.startswith("DEF-Spine"):
            return "Chest"
        return None

    exact = {source: target for target, source in TARGET_TO_SOURCE_BONE.items()}
    if source_group in exact:
        return exact[source_group]
    if not source_group.startswith("DEF-"):
        return None

    side = ".L" if source_group.endswith(".L") else ".R" if source_group.endswith(".R") else ""
    if "Upperarm" in source_group:
        return f"UpperArm{side}" if side else None
    if "Forearm" in source_group:
        return f"LowerArm{side}" if side else None
    if "Clavicle" in source_group:
        return f"Shoulder{side}" if side else None
    if "Thumb" in source_group:
        return f"Thumb1{side}" if side else None
    if "Thigh" in source_group or "Hip" in source_group:
        return f"UpperLeg{side}" if side else "Hips"
    if "Shin" in source_group or "Ankle" in source_group:
        return f"LowerLeg{side}" if side else None
    if source_group.startswith("DEF-Spine1"):
        return "Abdomen"
    if source_group.startswith("DEF-Spine2"):
        return "Torso"
    if source_group.startswith("DEF-Spine"):
        return "Chest"
    if source_group.startswith("DEF-Pelvis"):
        return "Hips"
    return None


def rebuild_vertex_groups(obj) -> None:
    source_names = {group.index: group.name for group in obj.vertex_groups}
    mapped_by_vertex = []
    for vertex in obj.data.vertices:
        if obj.name == "Rain_shoes":
            # 鞋面是刚性构件。电影级源骨架把鞋分散绑定到脚踝、脚掌和脚趾，
            # 直接压缩到游戏骨架会在抬腿时把鞋拉成长条；按原权重左右归属后，
            # 整只鞋刚性跟随对应脚掌，保留造型并避免跨关节剪切。
            side_weights = {"L": 0.0, "R": 0.0}
            for membership in vertex.groups:
                source_name = source_names[membership.group]
                if source_name.endswith(".L"):
                    side_weights["L"] += membership.weight
                elif source_name.endswith(".R"):
                    side_weights["R"] += membership.weight
            if side_weights["L"] == side_weights["R"]:
                side = "L" if vertex.co.x >= 0 else "R"
            else:
                side = max(side_weights, key=side_weights.get)
            mapped_by_vertex.append({f"Foot.{side}": 1.0})
            continue

        weights: dict[str, float] = {}
        for membership in vertex.groups:
            target = mapped_weight_group(obj.name, source_names[membership.group])
            if target:
                weights[target] = weights.get(target, 0.0) + membership.weight
        if not weights:
            fallback = "Head" if any(token in obj.name for token in ("head", "hair", "eye")) else "Hips"
            weights[fallback] = 1.0
        total = sum(weights.values())
        mapped_by_vertex.append({name: value / total for name, value in weights.items()})

    obj.vertex_groups.clear()
    groups = {
        name: obj.vertex_groups.new(name=name)
        for name in sorted({name for weights in mapped_by_vertex for name in weights})
    }
    for vertex, weights in zip(obj.data.vertices, mapped_by_vertex):
        for name, weight in weights.items():
            groups[name].add([vertex.index], weight, "REPLACE")


def assign_materials(obj, materials) -> None:
    material_indices = [polygon.material_index for polygon in obj.data.polygons]
    obj.data.materials.clear()
    if obj.name == "Rain_eye":
        for key in ("eye_white", "eye_iris", "eye_dark"):
            obj.data.materials.append(materials[key])
    elif obj.name in {"Rain_eyebrows", "Rain_eyelashes", "Rain_hair_main", "Rain_hair_ponytail", "Rain_hair_strand"}:
        obj.data.materials.append(materials["hair"])
    elif obj.name == "Rain_hairband":
        obj.data.materials.append(materials["hairband"])
    elif obj.name in {"Rain_body", "Rain_head"}:
        obj.data.materials.append(materials["skin"])
        if obj.name == "Rain_body":
            obj.data.materials.append(materials["skin"])
    elif obj.name == "Rain_top":
        obj.data.materials.append(materials["top"])
    elif obj.name == "Rain_scarf":
        obj.data.materials.append(materials["scarf"])
    elif obj.name == "Rain_jeans":
        obj.data.materials.append(materials["jeans"])
    elif obj.name == "Rain_shoes":
        for key in ("shoe", "cream", "cream", "cream"):
            obj.data.materials.append(materials[key])

    # 应用修改器后材质索引可能超出新槽位，统一夹紧避免导出黑面。
    max_index = max(0, len(obj.data.materials) - 1)
    for polygon, original_index in zip(obj.data.polygons, material_indices):
        polygon.material_index = min(original_index, max_index)


def decimate_for_runtime(obj) -> None:
    ratios = {
        "Rain_head": 0.88,
        "Rain_shoes": 0.82,
        "Rain_eye": 0.9,
        "Rain_jeans": 0.92,
    }
    ratio = ratios.get(obj.name)
    if not ratio:
        return
    modifier = obj.modifiers.new("Rain_Runtime_Decimate", "DECIMATE")
    modifier.ratio = ratio
    modifier.use_collapse_triangulate = True
    apply_modifier(obj, modifier)


def import_animation_rig():
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ANIMATION_GLB))
    imported = [obj for obj in bpy.data.objects if obj not in before]
    armatures = [obj for obj in imported if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"预期一个动画骨架，实际为 {len(armatures)}")
    rig = armatures[0]
    rig.name = "Rain_Summer_Rig"
    rig.data.name = "Rain_Summer_Rig"
    for obj in imported:
        if obj != rig and obj.type == "MESH":
            bpy.data.objects.remove(obj, do_unlink=True)
    return rig


def align_animation_rig(target_rig, source_rig) -> None:
    source_bones = source_rig.data.bones
    target_rig.data.pose_position = "REST"
    bpy.context.view_layer.objects.active = target_rig
    target_rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    edit_bones = target_rig.data.edit_bones
    for bone in edit_bones:
        bone.use_connect = False
        source_name = TARGET_TO_SOURCE_BONE.get(bone.name)
        if source_name and source_name in source_bones:
            source = source_bones[source_name]
            bone.head = source.head_local
            bone.tail = source.tail_local

    pelvis = source_bones["DEF-Pelvis"]
    if "Root" in edit_bones:
        edit_bones["Root"].head = Vector((pelvis.head_local.x, pelvis.head_local.y, 0))
        edit_bones["Root"].tail = Vector((pelvis.head_local.x, pelvis.head_local.y, max(0.1, pelvis.head_local.z * 0.45)))
    if "Body" in edit_bones:
        edit_bones["Body"].head = edit_bones["Root"].head
        edit_bones["Body"].tail = pelvis.head_local
    bpy.ops.object.mode_set(mode="OBJECT")
    target_rig.data.pose_position = "POSE"


def attach_meshes(meshes, rig) -> None:
    for obj in meshes:
        rebuild_vertex_groups(obj)
        modifier = obj.modifiers.new("Rain_Summer_Rig", "ARMATURE")
        modifier.object = rig
        obj.parent = rig


def validate_vertex_groups(meshes, rig) -> None:
    bone_names = {bone.name for bone in rig.data.bones}
    unknown = {
        obj.name: sorted(group.name for group in obj.vertex_groups if group.name not in bone_names)
        for obj in meshes
    }
    unknown = {name: groups for name, groups in unknown.items() if groups}
    if unknown:
        raise RuntimeError(f"存在没有对应骨骼的顶点组: {unknown}")


def clean_scene(keep_objects) -> None:
    for obj in list(bpy.data.objects):
        if obj not in keep_objects:
            bpy.data.objects.remove(obj, do_unlink=True)
    for action in list(bpy.data.actions):
        if action.name not in {"Idle_Neutral", "Walk", "Run"}:
            bpy.data.actions.remove(action)
    for image in list(bpy.data.images):
        bpy.data.images.remove(image)


def character_bounds(meshes):
    points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    minimum = Vector(tuple(min(point[index] for point in points) for index in range(3)))
    maximum = Vector(tuple(max(point[index] for point in points) for index in range(3)))
    return minimum, maximum


def render_preview(meshes, direction: str, filepath: Path) -> None:
    scene = bpy.context.scene
    minimum, maximum = character_bounds(meshes)
    center = (minimum + maximum) * 0.5
    height = maximum.z - minimum.z
    distance = height * 2.25
    camera_data = bpy.data.cameras.new(f"Test_Rain_{direction}_Camera")
    camera = bpy.data.objects.new(f"Test_Rain_{direction}_Camera", camera_data)
    scene.collection.objects.link(camera)
    camera_data.lens = 58
    offset = Vector((distance * 0.28, -distance, height * 0.1)) if direction == "canonical" else Vector((distance, 0, height * 0.08))
    camera.location = center + offset
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = camera
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.studio_light = "paint.sl"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.display.shading.background_type = "VIEWPORT"
    scene.display.shading.background_color = hex_to_rgb("#b8d6e5")
    scene.render.resolution_x = 720
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(filepath)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)
    bpy.data.cameras.remove(camera_data)


def export_glb(meshes, rig) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_skins=True,
        export_def_bones=True,
        export_morph=False,
        export_apply=False,
        export_yup=True,
    )


def parse_glb(path: Path):
    data = path.read_bytes()
    json_length = int.from_bytes(data[12:16], "little")
    document = json.loads(data[20:20 + json_length])
    triangles = 0
    for mesh in document.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            accessor = document["accessors"][primitive["indices"]]
            triangles += accessor["count"] // 3
    return data, document, triangles


def write_build_record(meshes) -> None:
    data, document, triangles = parse_glb(OUTPUT_GLB)
    minimum, maximum = character_bounds(meshes)
    output_sha = hashlib.sha256(data).hexdigest()
    record = {
        "asset": "rain-summer-wanderer",
        "source": {
            "title": "Rain v1 character rig",
            "creator": "Blender Animation Studio",
            "license": "CC-BY",
            "requiredCredit": "Rain Rig © Blender Foundation | cloud.blender.org",
            "archiveSha256": "e216ce06621bb4ba34b226119ff437b24cf27a0efc80bbdea2c6f8f918a17c2c",
        },
        "generator": "scripts/create_rain_summer_character.py",
        "blender": bpy.app.version_string,
        "output": {
            "blend": str(OUTPUT_BLEND.relative_to(ROOT)),
            "glb": str(OUTPUT_GLB.relative_to(ROOT)),
            "sha256": output_sha,
            "cacheVersion": output_sha[:12],
            "bytes": len(data),
            "triangles": triangles,
            "nodes": len(document.get("nodes", [])),
            "meshes": len(document.get("meshes", [])),
            "materials": len(document.get("materials", [])),
            "images": len(document.get("images", [])),
            "skins": len(document.get("skins", [])),
            "animations": [animation.get("name") for animation in document.get("animations", [])],
            "bounds": {"min": list(minimum), "max": list(maximum)},
        },
        "status": "candidate",
        "runtimeGate": "pending fresh style-lab desktop/mobile review",
    }
    BUILD_RECORD.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    ensure_source_loaded()
    OUTPUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    BUILD_RECORD.parent.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    source_rig = bpy.data.objects["RIG-Rain"]
    source_rig.data.pose_position = "REST"
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()

    candidate_collection = bpy.data.collections.new("Rain_Summer_Candidate")
    bpy.context.scene.collection.children.link(candidate_collection)
    materials = palette()
    meshes = []
    for name in sorted(SOURCE_MESH_NAMES):
        source = bpy.data.objects[name]
        clone = duplicate_render_mesh(source, candidate_collection)
        assign_materials(clone, materials)
        decimate_for_runtime(clone)
        meshes.append(clone)
    meshes.extend(create_low_ponytail(candidate_collection, materials))

    animation_rig = import_animation_rig()
    align_animation_rig(animation_rig, source_rig)
    attach_meshes(meshes, animation_rig)
    validate_vertex_groups(meshes, animation_rig)
    clean_scene(set(meshes) | {animation_rig})

    render_preview(meshes, "canonical", PREVIEW_DIR / "test_rain_summer_character_canonical.png")
    render_preview(meshes, "side", PREVIEW_DIR / "test_rain_summer_character_side.png")
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
    export_glb(meshes, animation_rig)
    write_build_record(meshes)
    print(f"RAIN_SUMMER_CHARACTER={OUTPUT_GLB}")


if __name__ == "__main__":
    main()
