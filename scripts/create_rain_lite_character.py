"""从已验收的 Rain Hero 确定性派生轻量 Identity 运行时资产。"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
SOURCE_BLEND = ROOT / "assets/models/source/character/rain-summer-wanderer.blend"
SOURCE_GLB = ROOT / "public/models/character/rain-summer-wanderer.glb"
OUTPUT_BLEND = ROOT / "assets/models/source/character/rain-summer-wanderer-identity.blend"
OUTPUT_GLB = ROOT / "public/models/character/rain-summer-wanderer-identity.glb"
BUILD_RECORD = ROOT / "docs/research/build-records/rain-summer-wanderer-identity.json"
PREVIEW_DIR = ROOT / "test_artifacts"

TARGET_TRIANGLES = 9_000
TARGET_BYTES = 650_000

# 第三人称距离下优先保留身份轮廓、服装色块和动画；面部、鞋与裤子的内部细分优先压缩。
DECIMATE_RATIOS = {
    "Rain_body": 0.17,
    "Rain_eye": 0.12,
    "Rain_eyebrows": 0.35,
    "Rain_eyelashes": 0.25,
    "Rain_hair_main": 0.18,
    "Rain_hair_strand": 0.30,
    "Rain_head": 0.10,
    "Rain_jeans": 0.13,
    "Rain_scarf": 0.25,
    "Rain_shoes": 0.08,
    "Rain_top": 0.25,
    "Rain_hair_low_ponytail": 1.0,
    "Rain_hairband_low": 1.0,
}


def hex_to_rgb(value: str):
    value = value.lstrip("#")
    return tuple(int(value[index:index + 2], 16) / 255 for index in (0, 2, 4))


def mesh_triangles(obj) -> int:
    return sum(max(0, len(polygon.vertices) - 2) for polygon in obj.data.polygons)


def character_bounds(meshes):
    points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    minimum = Vector(tuple(min(point[index] for point in points) for index in range(3)))
    maximum = Vector(tuple(max(point[index] for point in points) for index in range(3)))
    return minimum, maximum


def apply_decimation(obj, ratio: float) -> None:
    if ratio >= 0.999:
        return
    modifier = obj.modifiers.new("Rain_Identity_Decimate", "DECIMATE")
    modifier.ratio = ratio
    modifier.use_collapse_triangulate = True
    # 减面必须位于 Armature 前，避免把某一动画帧烘焙到基础网格。
    obj.modifiers.move(len(obj.modifiers) - 1, 0)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def render_preview(meshes, direction: str, filepath: Path) -> None:
    scene = bpy.context.scene
    minimum, maximum = character_bounds(meshes)
    center = (minimum + maximum) * 0.5
    height = maximum.z - minimum.z
    distance = height * 2.25
    camera_data = bpy.data.cameras.new(f"Test_Rain_Identity_{direction}_Camera")
    camera = bpy.data.objects.new(f"Test_Rain_Identity_{direction}_Camera", camera_data)
    scene.collection.objects.link(camera)
    camera_data.lens = 58
    offset = (
        Vector((distance * 0.28, -distance, height * 0.1))
        if direction == "canonical"
        else Vector((distance, 0, height * 0.08))
    )
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


def main() -> None:
    if not SOURCE_BLEND.exists() or not SOURCE_GLB.exists():
        raise FileNotFoundError("缺少已验收的 Rain Hero Blend 或 GLB，不能派生 Identity。")

    OUTPUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    BUILD_RECORD.parent.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    source_sha = hashlib.sha256(SOURCE_GLB.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE_BLEND))
    rig = bpy.data.objects.get("Rain_Summer_Rig")
    if rig is None or rig.type != "ARMATURE":
        raise RuntimeError("Rain Hero Blend 缺少 Rain_Summer_Rig。")
    rig.data.pose_position = "REST"
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()

    meshes = sorted(
        [
            obj
            for obj in bpy.data.objects
            if obj.type == "MESH" and (obj.parent == rig or obj.name in DECIMATE_RATIOS)
        ],
        key=lambda item: item.name,
    )
    before = {obj.name: mesh_triangles(obj) for obj in meshes}
    for obj in meshes:
        apply_decimation(obj, DECIMATE_RATIOS.get(obj.name, 0.35))
    bpy.context.view_layer.update()
    after = {obj.name: mesh_triangles(obj) for obj in meshes}

    render_preview(
        meshes,
        "canonical",
        PREVIEW_DIR / "test_rain_identity_canonical.png",
    )
    render_preview(
        meshes,
        "side",
        PREVIEW_DIR / "test_rain_identity_side.png",
    )
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
    export_glb(meshes, rig)

    data, document, triangles = parse_glb(OUTPUT_GLB)
    minimum, maximum = character_bounds(meshes)
    output_sha = hashlib.sha256(data).hexdigest()
    animations = [animation.get("name") for animation in document.get("animations", [])]
    required_animations = {"Idle_Neutral", "Walk", "Run"}
    if not required_animations.issubset(set(animations)):
        raise RuntimeError(f"Identity 动画不完整：{animations}")
    if triangles > TARGET_TRIANGLES:
        raise RuntimeError(f"Identity 超出三角面预算：{triangles} > {TARGET_TRIANGLES}")
    if len(data) > TARGET_BYTES:
        raise RuntimeError(f"Identity 超出体积预算：{len(data)} > {TARGET_BYTES}")

    record = {
        "asset": "rain-summer-wanderer-identity",
        "tier": "Identity",
        "source": {
            "asset": "rain-summer-wanderer",
            "blend": str(SOURCE_BLEND.relative_to(ROOT)),
            "glb": str(SOURCE_GLB.relative_to(ROOT)),
            "sha256": source_sha,
            "license": "CC-BY",
            "requiredCredit": "Rain Rig © Blender Foundation | cloud.blender.org",
        },
        "generator": "scripts/create_rain_lite_character.py",
        "blender": bpy.app.version_string,
        "optimization": {
            "method": "deterministic per-mesh decimation before the Armature modifier",
            "ratios": DECIMATE_RATIOS,
            "trianglesBeforeByMesh": before,
            "trianglesAfterByMesh": after,
            "identityCuesPreserved": [
                "compact low ponytail and warm hairband",
                "teal scarf and cream sleeveless top",
                "blue jeans, brown shoes and Rain body silhouette",
            ],
        },
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
            "animations": animations,
            "bounds": {"min": list(minimum), "max": list(maximum)},
        },
        "budgets": {
            "maxBytes": TARGET_BYTES,
            "maxTriangles": TARGET_TRIANGLES,
            "maxNodes": 80,
            "maxMeshes": 13,
            "maxMaterials": 11,
            "maxImages": 0,
        },
        "validation": {
            "blenderCanonical": "test_artifacts/test_rain_identity_canonical.png",
            "blenderSide": "test_artifacts/test_rain_identity_side.png",
            "runtimeGate": "pending actual Three.js weak-network validation",
        },
        "status": "candidate",
    }
    BUILD_RECORD.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(record["output"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
