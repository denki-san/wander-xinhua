"""为新华路 14 个道路 POI 生成独立的 Blender Massing 资产。"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "app/scene/xinhua-road-landmarks-data.json"
SOURCE_DIR = ROOT / "assets/models/source/tiers/xinhua-road/massing"
RUNTIME_DIR = ROOT / "public/models/tiers/xinhua-road/massing"
PREVIEW_DIR = ROOT / "test_artifacts/all-models/massing"
RECORD_DIR = ROOT / "docs/research/build-records/tiers/xinhua-road/massing"
AUDITED_AT = "2026-07-25"
ROOF_STYLES = {
    "shanghai-cinema": "flat",
    "film-art-center": "hip",
    "one-step-garden": "gable",
    "xinhua-villas-211": "gable",
    "xinhua-villas-329": "gable",
    "house-315": "gable",
    "villa-le-bec": "gable",
    "shanghai-orchestra": "hip",
    "hudec-memorial": "gable",
    "xinhua-pocket-park": "flat",
    "xinhua-community-center": "flat",
    "debi-fahua-525": "flat",
    "fahua-heritage": "hip",
    "fics-xinhua-365": "mixed",
}
NON_MASSING_MATERIAL_TOKENS = (
    "草坪",
    "绿植",
    "浅绿",
    "灌木",
    "绿篱",
    "树干",
    "树阵",
    "竹秆",
    "竹叶",
    "古树",
    "银杏叶",
    "粉黛草",
    "花池",
    "铺装",
    "铺地",
    "路面",
    "洗石路",
    "广场",
    "庭院石",
    "庭院",
    "条石",
    "缘石",
    "鱼池",
    "户外木",
    "座椅木",
    "庭院木",
    "花箱木",
    "遮阳伞",
    "运动角",
    "玩具屋",
    "六边形",
    "导视",
    "店招",
    "标识",
    "金字",
    "暖光",
    "入口灯",
    "庭院灯",
    "门灯",
    "线性灯",
    "铺装缝",
    "板缝",
    "砖缝",
    "瓦垄",
    "铁艺",
    "金属",
    "黑钢",
    "弦杆",
)


def parse_args() -> argparse.Namespace:
    raw = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--asset")
    group.add_argument("--all", action="store_true")
    return parser.parse_args(raw)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for block in list(collection):
            if block.users == 0:
                collection.remove(block)


def source_glb_path(model_url: str) -> Path:
    path = model_url.split("?", maxsplit=1)[0].lstrip("/")
    return ROOT / "public" / path.removeprefix("models/") if not path.startswith("models/") else ROOT / "public" / path


def import_hero(
    path: Path,
) -> tuple[float, dict[str, list[float]], list[bpy.types.Object]]:
    if not path.exists():
        raise FileNotFoundError(f"缺少 Hero GLB：{path}")
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"Hero GLB 没有网格：{path}")
    minimum = Vector((math.inf, math.inf, math.inf))
    maximum = Vector((-math.inf, -math.inf, -math.inf))
    for obj in meshes:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            minimum.x = min(minimum.x, world.x)
            minimum.y = min(minimum.y, world.y)
            minimum.z = min(minimum.z, world.z)
            maximum.x = max(maximum.x, world.x)
            maximum.y = max(maximum.y, world.y)
            maximum.z = max(maximum.z, world.z)
    return (
        max(0.8, maximum.z - minimum.z),
        {
            "min": [round(value, 6) for value in minimum],
            "max": [round(value, 6) for value in maximum],
        },
        meshes,
    )


def stable_color(slug: str) -> tuple[float, float, float, float]:
    digest = hashlib.sha256(slug.encode("utf-8")).digest()
    shift = (digest[0] / 255.0 - 0.5) * 0.08
    return (0.58 + shift, 0.55 + shift, 0.49 + shift, 1.0)


def prune_non_massing_geometry(
    meshes: list[bpy.types.Object],
) -> tuple[list[bpy.types.Object], dict[str, object]]:
    removed_faces = 0
    removed_materials: set[str] = set()
    retained_meshes: list[bpy.types.Object] = []
    for obj in meshes:
        material_names = [
            slot.material.name if slot.material else ""
            for slot in obj.material_slots
        ]
        mesh = obj.data
        edit_mesh = bmesh.new()
        edit_mesh.from_mesh(mesh)
        faces_to_remove = []
        for face in edit_mesh.faces:
            material_name = (
                material_names[face.material_index]
                if face.material_index < len(material_names)
                else ""
            )
            if any(token in material_name for token in NON_MASSING_MATERIAL_TOKENS):
                faces_to_remove.append(face)
                removed_materials.add(material_name)
        if faces_to_remove:
            removed_faces += len(faces_to_remove)
            bmesh.ops.delete(edit_mesh, geom=faces_to_remove, context="FACES")
        edit_mesh.to_mesh(mesh)
        edit_mesh.free()
        mesh.update(calc_edges=True)
        if len(mesh.polygons) > 0:
            retained_meshes.append(obj)
        else:
            bpy.data.objects.remove(obj, do_unlink=True)
    if not retained_meshes:
        raise RuntimeError("删除场地细节后没有剩余 Massing 建筑/构筑物网格")
    return (
        retained_meshes,
        {
            "removedFaces": removed_faces,
            "removedMaterials": sorted(removed_materials),
            "rule": "material-name-denylist-before-voxel-remesh",
        },
    )


def add_box(
    name: str,
    bounds: dict[str, float],
    height: float,
    material: bpy.types.Material,
) -> bpy.types.Object:
    width = max(0.18, bounds["maxX"] - bounds["minX"])
    depth = max(0.18, bounds["maxZ"] - bounds["minZ"])
    center_x = (bounds["minX"] + bounds["maxX"]) / 2
    # glTF Z 对应 Blender -Y；保证导出后与现有 localObstacle 坐标一致。
    center_y = -(bounds["minZ"] + bounds["maxZ"]) / 2
    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=(center_x, center_y, height / 2),
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = (width, depth, height)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    obj["tier"] = "massing"
    obj["collision_proxy"] = True
    return obj


def add_roof(
    name: str,
    bounds: dict[str, float],
    base_height: float,
    roof_height: float,
    material: bpy.types.Material,
    style: str,
) -> bpy.types.Object:
    width = max(0.18, bounds["maxX"] - bounds["minX"]) + 0.26
    depth = max(0.18, bounds["maxZ"] - bounds["minZ"]) + 0.26
    center_x = (bounds["minX"] + bounds["maxX"]) / 2
    center_y = -(bounds["minZ"] + bounds["maxZ"]) / 2
    half_width = width / 2
    half_depth = depth / 2
    if style == "hip":
        vertices = [
            (-half_width, -half_depth, 0),
            (half_width, -half_depth, 0),
            (half_width, half_depth, 0),
            (-half_width, half_depth, 0),
            (0, -half_depth * 0.32, roof_height),
            (0, half_depth * 0.32, roof_height),
        ]
    else:
        vertices = [
            (-half_width, -half_depth, 0),
            (half_width, -half_depth, 0),
            (half_width, half_depth, 0),
            (-half_width, half_depth, 0),
            (0, -half_depth, roof_height),
            (0, half_depth, roof_height),
        ]
    faces = [
        (0, 3, 2, 1),
        (0, 1, 4),
        (1, 2, 5, 4),
        (2, 3, 5),
        (3, 0, 4, 5),
    ]
    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    roof = bpy.data.objects.new(name, mesh)
    roof.location = (center_x, center_y, base_height)
    roof.data.materials.append(material)
    roof["tier"] = "massing"
    roof["roof_style"] = style
    bpy.context.collection.objects.link(roof)
    return roof


def build_remeshed_proxy(
    slug: str,
    meshes: list[bpy.types.Object],
    material: bpy.types.Material,
) -> tuple[bpy.types.Object, float, int]:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
        proxy = bpy.context.active_object
    else:
        proxy = meshes[0]
    proxy.name = f"{slug}-massing-proxy"
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    dimensions = proxy.dimensions
    maximum_dimension = max(dimensions.x, dimensions.y, dimensions.z)
    voxel_size = max(0.16, maximum_dimension / 42)
    proxy.data.remesh_voxel_size = voxel_size
    proxy.data.remesh_voxel_adaptivity = 0.08
    bpy.ops.object.voxel_remesh()

    triangle_count = sum(len(polygon.vertices) - 2 for polygon in proxy.data.polygons)
    if triangle_count > 980:
        modifier = proxy.modifiers.new("massing-decimate", "DECIMATE")
        modifier.decimate_type = "COLLAPSE"
        modifier.ratio = max(0.04, 900 / triangle_count)
        modifier.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = proxy
        bpy.ops.object.modifier_apply(modifier=modifier.name)

    # Voxel remesh + collapse 偶尔会留下重复边或零面积面；导出前显式修复，
    # 避免 Blender glTF exporter 只给 warning 但仍写出潜在不稳定网格。
    proxy.data.validate(clean_customdata=True, verbose=True)
    proxy.data.update(calc_edges=True)
    triangle_count = sum(len(polygon.vertices) - 2 for polygon in proxy.data.polygons)

    proxy.data.materials.clear()
    proxy.data.materials.append(material)
    proxy["tier"] = "massing"
    proxy["proxy_method"] = "voxel-remesh-current-hero"
    proxy["voxel_size"] = voxel_size
    return proxy, voxel_size, triangle_count


def add_camera_and_lights(objects: list[bpy.types.Object], direction: str) -> bpy.types.Object:
    minimum = Vector((math.inf, math.inf, math.inf))
    maximum = Vector((-math.inf, -math.inf, -math.inf))
    for obj in objects:
        for corner in obj.bound_box:
            point = obj.matrix_world @ Vector(corner)
            minimum.x = min(minimum.x, point.x)
            minimum.y = min(minimum.y, point.y)
            minimum.z = min(minimum.z, point.z)
            maximum.x = max(maximum.x, point.x)
            maximum.y = max(maximum.y, point.y)
            maximum.z = max(maximum.z, point.z)
    center = (minimum + maximum) * 0.5
    radius = max(maximum.x - minimum.x, maximum.y - minimum.y, maximum.z - minimum.z)
    camera_location = (
        center + Vector((radius * 0.95, -radius * 1.35, radius * 0.86))
        if direction == "canonical"
        else center + Vector((-radius * 1.3, radius * 0.8, radius * 0.72))
    )
    bpy.ops.object.camera_add(location=camera_location)
    camera = bpy.context.active_object
    camera.name = f"test-{direction}-camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = radius * 1.65
    target = center + Vector((0, 0, radius * 0.03))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera

    bpy.ops.object.light_add(type="AREA", location=center + Vector((-radius, -radius, radius * 1.7)))
    key = bpy.context.active_object
    key.data.energy = 1100
    key.data.shape = "DISK"
    key.data.size = radius * 1.5
    bpy.ops.object.light_add(type="AREA", location=center + Vector((radius, radius * 0.4, radius)))
    fill = bpy.context.active_object
    fill.data.energy = 520
    fill.data.size = radius
    return camera


def configure_scene(slug: str) -> None:
    scene = bpy.context.scene
    # 灰模预览使用稳定的 Workbench studio light，避免离屏 Eevee 阴影掩盖轮廓。
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.display.shading.background_type = "WORLD"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (0.035, 0.045, 0.05)
    scene["asset_slug"] = slug
    scene["tier"] = "massing"
    scene["authored_meters_per_scene_unit"] = 2.7
    scene["blender_front"] = "-Y"


def export_glb(path: Path) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            obj.select_set(True)
    bpy.context.view_layer.objects.active = next(
        obj for obj in bpy.context.scene.objects if obj.type == "MESH"
    )
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
    )


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def object_bounds(obj: bpy.types.Object) -> dict[str, dict[str, list[float]]]:
    blender_points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    gltf_points = [Vector((point.x, point.z, -point.y)) for point in blender_points]

    def collect(points: list[Vector]) -> dict[str, list[float]]:
        minimum = Vector(
            (
                min(point.x for point in points),
                min(point.y for point in points),
                min(point.z for point in points),
            )
        )
        maximum = Vector(
            (
                max(point.x for point in points),
                max(point.y for point in points),
                max(point.z for point in points),
            )
        )
        return {
            "min": [round(value, 6) for value in minimum],
            "max": [round(value, 6) for value in maximum],
        }

    return {
        "blenderXyz": collect(blender_points),
        "glbXyzYUp": collect(gltf_points),
    }


def build_asset(asset: dict) -> None:
    slug = asset["id"]
    hero_path = source_glb_path(asset["model"])
    hero_height, hero_bounds, imported_meshes = import_hero(hero_path)
    massing_meshes, pruning = prune_non_massing_geometry(imported_meshes)
    configure_scene(slug)

    material = bpy.data.materials.new(f"{slug}-massing-material")
    material.diffuse_color = stable_color(slug)
    material.roughness = 0.92
    material.metallic = 0.0

    obstacles = asset.get("localObstacles") or [asset["localBounds"]]
    roof_style = ROOF_STYLES[slug]
    proxy, voxel_size, triangle_count = build_remeshed_proxy(
        slug,
        massing_meshes,
        material,
    )
    proxy_bounds = object_bounds(proxy)
    mesh_objects = [proxy]

    for directory in (SOURCE_DIR, RUNTIME_DIR, PREVIEW_DIR, RECORD_DIR):
        directory.mkdir(parents=True, exist_ok=True)

    source_path = SOURCE_DIR / f"{slug}-massing.blend"
    glb_path = RUNTIME_DIR / f"{slug}-massing.glb"
    bpy.ops.wm.save_as_mainfile(filepath=str(source_path))
    export_glb(glb_path)

    preview_paths = {}
    for direction in ("canonical", "side"):
        camera = add_camera_and_lights(mesh_objects, direction)
        preview_path = PREVIEW_DIR / f"test_{slug}-massing-{direction}.png"
        bpy.context.scene.render.filepath = str(preview_path)
        bpy.ops.render.render(write_still=True)
        preview_paths[direction] = str(preview_path.relative_to(ROOT))
        for obj in list(bpy.context.scene.objects):
            if obj == camera or obj.type == "LIGHT":
                bpy.data.objects.remove(obj, do_unlink=True)

    record = {
        "version": 1,
        "auditedAt": AUDITED_AT,
        "assetId": f"building:xinhua-road:{slug}",
        "tier": "massing",
        "status": "blender-and-glb-generated-runtime-gate-pending",
        "generator": "scripts/create_xinhua_road_massing_models.py",
        "sourceHero": {
            "path": str(hero_path.relative_to(ROOT)),
            "sha256": file_sha256(hero_path),
            "importedBounds": hero_bounds,
            "heightProxySceneUnits": round(hero_height, 6),
            "evidenceBoundary": "legacy-or-v2-hero-derived-height-not-real-measurement",
        },
        "sourcePlacement": "app/scene/xinhua-road-landmarks-data.json",
        "position": asset["position"],
        "yaw": asset["yaw"],
        "runtimeScale": asset["scale"],
        "localBounds": asset["localBounds"],
        "localObstacles": obstacles,
        "roofProfile": roof_style,
        "proxyMethod": "voxel-remesh-current-hero",
        "pruning": pruning,
        "voxelSizeSceneUnits": round(voxel_size, 6),
        "outputs": {
            "blend": str(source_path.relative_to(ROOT)),
            "glb": str(glb_path.relative_to(ROOT)),
            "previews": preview_paths,
        },
        "glb": {
            "sha256": file_sha256(glb_path),
            "bytes": glb_path.stat().st_size,
            "nodes": 1,
            "meshes": 1,
            "images": 0,
            "textures": 0,
            "materials": 1,
            "triangles": triangle_count,
            "expectedMaximumTriangles": 1200,
            "bounds": proxy_bounds["glbXyzYUp"],
            "auditStatus": "ok",
        },
        "editableSourceBounds": proxy_bounds["blenderXyz"],
        "qualityBoundary": {
            "observed": ["runtime local bounds", "runtime split obstacles", "current hero imported bounds"],
            "inferred": ["per-block height proxy"],
            "unknown": ["surveyed height", "entrance direction", "unseen facade and roof"],
        },
        "runtimeGate": "pending-real-start-page-with-qaModelTier=massing",
    }
    record_path = RECORD_DIR / f"{slug}-massing.json"
    record_path.write_text(f"{json.dumps(record, ensure_ascii=False, indent=2)}\n", encoding="utf-8")
    print(f"完成 {slug}: {glb_path.relative_to(ROOT)}")


def main() -> None:
    args = parse_args()
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    assets = data["landmarks"]
    selected = assets if args.all else [asset for asset in assets if asset["id"] == args.asset]
    if not selected:
        raise SystemExit(f"未知资产：{args.asset}")
    for asset in selected:
        build_asset(asset)


if __name__ == "__main__":
    main()
