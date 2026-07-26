"""将 CC BY 共享单车扫描优化为无品牌的 WebGL 静态资产。"""

import argparse
import colorsys
import json
import math
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (
    ROOT
    / "assets/models/source/nonbuilding/xinhua-bicycle-family/original/blue_bike_3d_scan.glb"
)
SOURCE_BLEND = (
    ROOT
    / "assets/models/source/nonbuilding/xinhua-bicycle-family/xinhua-shared-bicycle-scan-optimized.blend"
)
OUTPUT_GLB = (
    ROOT
    / "public/models/nonbuilding/xinhua-bicycle-family/xinhua-shared-bicycle-visible-low.glb"
)
RENDER_DIR = ROOT / "test_artifacts/nonbuilding/xinhua-bicycle-family/source-scan-optimized"
BUILD_RECORD = (
    ROOT
    / "docs/research/build-records/nonbuilding/xinhua-bicycle-family/"
    "xinhua-shared-bicycle-source-scan-optimized.json"
)

TARGET_TRIANGLES = 14500
TARGET_LENGTH_METERS = 1.75
METERS_PER_SCENE_UNIT = 2.7


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--target-triangles", type=int, default=TARGET_TRIANGLES)
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    return parser.parse_args(arguments)


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def triangles(mesh: bpy.types.Mesh) -> int:
    return sum(max(0, len(poly.vertices) - 2) for poly in mesh.polygons)


def make_material(
    name: str,
    color: tuple[float, float, float, float],
    roughness: float,
    metallic: float,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return material


def sample_polygon_color(
    mesh: bpy.types.Mesh,
    polygon: bpy.types.MeshPolygon,
    pixels: list[float],
    width: int,
    height: int,
) -> tuple[float, float, float]:
    uv_layer = mesh.uv_layers.active
    if uv_layer is None:
        return (0.45, 0.48, 0.50)

    samples = []
    for loop_index in polygon.loop_indices:
        uv = uv_layer.data[loop_index].uv
        x = min(width - 1, max(0, int((uv.x % 1.0) * (width - 1))))
        y = min(height - 1, max(0, int((uv.y % 1.0) * (height - 1))))
        offset = (y * width + x) * 4
        samples.append((pixels[offset], pixels[offset + 1], pixels[offset + 2]))

    count = max(1, len(samples))
    return tuple(sum(sample[channel] for sample in samples) / count for channel in range(3))


def classify_color(color: tuple[float, float, float]) -> int:
    red, green, blue = color
    hue, saturation, value = colorsys.rgb_to_hsv(red, green, blue)
    del hue

    if value < 0.29 or (value < 0.43 and saturation < 0.24):
        return 1
    if blue > red * 1.18 and blue > green * 0.96 and saturation > 0.22:
        return 0
    if saturation < 0.20 and value > 0.55:
        return 2
    return 3


def remove_scanned_ground(obj: bpy.types.Object) -> int:
    mesh = obj.data
    minimum_z = min(vertex.co.z for vertex in mesh.vertices)
    maximum_z = max(vertex.co.z for vertex in mesh.vertices)
    cutoff = minimum_z + (maximum_z - minimum_z) * 0.085

    editable = bmesh.new()
    editable.from_mesh(mesh)
    editable.faces.ensure_lookup_table()
    floor_faces = [
        face
        for face in editable.faces
        if max(vertex.co.z for vertex in face.verts) < cutoff
        and abs(face.normal.z) > 0.58
        and face.calc_area() > 0.00004
    ]
    removed = len(floor_faces)
    bmesh.ops.delete(editable, geom=floor_faces, context="FACES")
    editable.to_mesh(mesh)
    editable.free()
    mesh.update()
    return removed


def replace_branded_texture_with_material_classes(obj: bpy.types.Object) -> dict[str, int]:
    source_image = next(
        (image for image in bpy.data.images if image.name == "Image_0"),
        None,
    )
    if source_image is None:
        raise RuntimeError("原始扫描缺少 Image_0，无法进行无字材质分类")

    width, height = source_image.size
    pixels = list(source_image.pixels[:])
    mesh = obj.data

    materials = [
        make_material("BikeBlue", (0.025, 0.43, 0.67, 1.0), 0.56, 0.03),
        make_material("RubberCharcoal", (0.025, 0.035, 0.045, 1.0), 0.82, 0.0),
        make_material("WornMetal", (0.30, 0.35, 0.38, 1.0), 0.52, 0.34),
        make_material("WeatheredFrame", (0.20, 0.27, 0.30, 1.0), 0.68, 0.12),
    ]

    counts = {material.name: 0 for material in materials}
    assignments = []
    for polygon in mesh.polygons:
        material_index = classify_color(
            sample_polygon_color(mesh, polygon, pixels, width, height)
        )
        assignments.append(material_index)
        counts[materials[material_index].name] += 1

    mesh.materials.clear()
    for material in materials:
        mesh.materials.append(material)
    for polygon, material_index in zip(mesh.polygons, assignments, strict=True):
        polygon.material_index = material_index

    for image in list(bpy.data.images):
        bpy.data.images.remove(image)
    return counts


def apply_spatial_material_overrides(obj: bpy.types.Object) -> dict[str, int]:
    mesh = obj.data
    wheel_centers = [Vector((-0.60, 0.0, 0.36)), Vector((0.60, 0.0, 0.36))]
    wheel_radius = 0.34
    wheel_band = 0.055

    for polygon in mesh.polygons:
        center = polygon.center
        on_tire = any(
            abs(
                math.hypot(
                    center.x - wheel_center.x,
                    center.z - wheel_center.z,
                )
                - wheel_radius
            )
            < wheel_band
            and abs(center.y) < 0.34
            for wheel_center in wheel_centers
        )
        on_saddle = 0.02 < center.x < 0.50 and center.z > 0.82 and abs(center.y) < 0.30
        on_grip = center.x < -0.20 and center.z > 0.98
        if on_tire or on_saddle or on_grip:
            polygon.material_index = 1

    counts = {material.name: 0 for material in mesh.materials}
    for polygon in mesh.polygons:
        counts[mesh.materials[polygon.material_index].name] += 1
    return counts


def optimize_geometry(obj: bpy.types.Object, target_triangles: int) -> tuple[int, int]:
    before = triangles(obj.data)
    ratio = min(1.0, max(0.01, target_triangles / before))
    modifier = obj.modifiers.new("WebGLDecimate", "DECIMATE")
    modifier.decimate_type = "COLLAPSE"
    modifier.ratio = ratio
    modifier.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    after = triangles(obj.data)
    return before, after


def normalize_asset(obj: bpy.types.Object) -> None:
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    minimum = Vector(
        (
            min(point.x for point in corners),
            min(point.y for point in corners),
            min(point.z for point in corners),
        )
    )
    maximum = Vector(
        (
            max(point.x for point in corners),
            max(point.y for point in corners),
            max(point.z for point in corners),
        )
    )
    length = maximum.x - minimum.x
    scale = TARGET_LENGTH_METERS / length
    obj.scale *= scale
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    minimum = Vector(
        (
            min(point.x for point in corners),
            min(point.y for point in corners),
            min(point.z for point in corners),
        )
    )
    maximum = Vector(
        (
            max(point.x for point in corners),
            max(point.y for point in corners),
            max(point.z for point in corners),
        )
    )
    obj.location -= Vector(
        (
            (minimum.x + maximum.x) / 2,
            (minimum.y + maximum.y) / 2,
            minimum.z,
        )
    )
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    obj.name = "XinhuaSharedBicycle"
    obj.data.name = "XinhuaSharedBicycleMesh"


def convert_to_project_units(obj: bpy.types.Object) -> None:
    obj.scale *= 1.0 / METERS_PER_SCENE_UNIT
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)


def look_at(camera: bpy.types.Object, target: Vector) -> None:
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()


def add_render_environment() -> tuple[bpy.types.Object, bpy.types.Object]:
    world = bpy.data.worlds.new("PreviewWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.72, 0.77, 0.82, 1.0)
    background.inputs["Strength"].default_value = 0.36

    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, -0.012))
    ground = bpy.context.object
    ground.name = "PreviewGround"
    ground.data.materials.append(
        make_material("PreviewGroundMaterial", (0.19, 0.22, 0.25, 1.0), 0.88, 0.0)
    )

    bpy.ops.object.light_add(type="AREA", location=(-3.4, -4.2, 5.2))
    key = bpy.context.object
    key.data.energy = 620
    key.data.shape = "DISK"
    key.data.size = 4.2
    key.rotation_euler = (math.radians(23), 0, math.radians(-38))

    bpy.ops.object.light_add(type="AREA", location=(3.5, 2.2, 2.8))
    fill = bpy.context.object
    fill.data.energy = 280
    fill.data.size = 3.0
    fill.rotation_euler = (math.radians(62), 0, math.radians(140))

    bpy.ops.object.light_add(type="AREA", location=(0.2, 2.8, 4.8))
    rim = bpy.context.object
    rim.data.energy = 360
    rim.data.size = 2.0
    rim.rotation_euler = (math.radians(30), 0, math.radians(175))

    camera_data = bpy.data.cameras.new("PreviewCamera")
    camera = bpy.data.objects.new("PreviewCamera", camera_data)
    bpy.context.scene.collection.objects.link(camera)
    bpy.context.scene.camera = camera
    camera.data.lens = 55

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.35
    return ground, camera


def render_views(camera: bpy.types.Object) -> None:
    RENDER_DIR.mkdir(parents=True, exist_ok=True)
    views = {
        "test_xinhua_shared_bicycle_canonical.png": (
            Vector((0.0, -1.32, 0.48)),
            Vector((0.0, 0.0, 0.27)),
            62,
        ),
        "test_xinhua_shared_bicycle_side.png": (
            Vector((-0.98, -1.17, 0.70)),
            Vector((0.0, 0.0, 0.26)),
            62,
        ),
        "test_xinhua_shared_bicycle_detail.png": (
            Vector((-0.76, -0.89, 0.59)),
            Vector((-0.18, 0.0, 0.34)),
            72,
        ),
    }
    for filename, (position, target, lens) in views.items():
        camera.location = position
        camera.data.lens = lens
        look_at(camera, target)
        bpy.context.scene.render.filepath = str(RENDER_DIR / filename)
        bpy.ops.render.render(write_still=True)


def export_asset(obj: bpy.types.Object, ground: bpy.types.Object) -> None:
    OUTPUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    ground.hide_render = True
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="EXPORT",
    )


def write_build_record(
    source: Path,
    before: int,
    after: int,
    material_counts: dict[str, int],
) -> None:
    import hashlib

    def sha256(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()

    BUILD_RECORD.parent.mkdir(parents=True, exist_ok=True)
    record = {
        "asset": "xinhua-shared-bicycle",
        "status": "candidate-for-isolated-qa",
        "source": {
            "path": str(source.relative_to(ROOT)),
            "sha256": sha256(source),
            "license": "Creative Commons Attribution",
            "creator": "Ye Hang (@YeHang)",
        },
        "derivative": {
            "path": str(OUTPUT_GLB.relative_to(ROOT)),
            "sha256": sha256(OUTPUT_GLB),
            "bytes": OUTPUT_GLB.stat().st_size,
            "trianglesBefore": before,
            "trianglesAfter": after,
            "materials": material_counts,
            "embeddedImages": 0,
            "brandingPolicy": "Original albedo removed; broad material classes only.",
            "states": ["visible-low", "hidden"],
        },
    }
    BUILD_RECORD.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    args = parse_args()
    source = args.source.resolve()
    if not source.exists():
        raise FileNotFoundError(source)

    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(source))
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(mesh_objects) != 1:
        raise RuntimeError(f"预期 1 个 mesh，实际为 {len(mesh_objects)}")
    bike = mesh_objects[0]

    removed_floor_faces = remove_scanned_ground(bike)
    replace_branded_texture_with_material_classes(bike)
    normalize_asset(bike)
    material_counts = apply_spatial_material_overrides(bike)
    before, after = optimize_geometry(bike, args.target_triangles)
    convert_to_project_units(bike)
    ground, camera = add_render_environment()

    SOURCE_BLEND.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_BLEND))
    render_views(camera)
    export_asset(bike, ground)
    write_build_record(source, before, after, material_counts)
    print(
        f"完成: 删除 {removed_floor_faces} 个地面面片，"
        f"{before} -> {after} triangles, {OUTPUT_GLB.stat().st_size} bytes"
    )


if __name__ == "__main__":
    main()
