"""依据 Villa Le Bec 两栋建筑的本地照片与 OSM footprint 生成 Massing。"""

from __future__ import annotations

import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_BLEND = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/massing-v2/villa-le-bec-massing.blend"
)
OUTPUT_GLB = (
    ROOT / "public/models/tiers/xinhua-road/massing-v2/villa-le-bec-massing.glb"
)
PREVIEW_DIR = ROOT / "test_artifacts/all-models/massing-v2"

# 保持 Recovery 资产的 OSM 局部坐标和冻结 runtime placement。
STREET_VILLA_FOOTPRINT = (
    (-0.968515, -9.832885),
    (4.996285, -9.704577),
    (4.869218, -5.014079),
    (-1.095583, -5.142387),
)
GARDEN_VILLA_FOOTPRINT = (
    (6.531150, -6.290767),
    (9.996342, -6.217839),
    (9.866713, -1.209116),
    (6.395668, -1.285091),
)


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


def make_material(
    name: str,
    color: tuple[float, float, float, float],
    roughness: float,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Roughness"].default_value = roughness
    return material


def recalc_normals(mesh: bpy.types.Mesh) -> None:
    editable = bmesh.new()
    editable.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(editable, faces=editable.faces)
    editable.to_mesh(mesh)
    editable.free()
    mesh.update()


def add_polygon_prism(
    name: str,
    footprint: tuple[tuple[float, float], ...],
    height: float,
    material: bpy.types.Material,
) -> bpy.types.Object:
    count = len(footprint)
    vertices = [(x, y, 0.0) for x, y in footprint]
    vertices.extend((x, y, height) for x, y in footprint)
    faces: list[tuple[int, ...]] = [
        tuple(reversed(range(count))),
        tuple(range(count, count * 2)),
    ]
    for index in range(count):
        next_index = (index + 1) % count
        faces.append((index, next_index, next_index + count, index + count))

    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(vertices, [], faces)
    recalc_normals(mesh)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def oriented_rectangle(
    footprint: tuple[tuple[float, float], ...],
) -> tuple[Vector, Vector, Vector, float, float]:
    p0, p1, _, p3 = (Vector(point) for point in footprint)
    axis_u = p1 - p0
    axis_v = p3 - p0
    length_u = axis_u.length
    length_v = axis_v.length
    center = sum((Vector(point) for point in footprint), Vector((0.0, 0.0))) / 4
    return center, axis_u.normalized(), axis_v.normalized(), length_u, length_v


def add_hip_roof(
    name: str,
    footprint: tuple[tuple[float, float], ...],
    eave_z: float,
    roof_height: float,
    material: bpy.types.Material,
) -> bpy.types.Object:
    center, axis_u, axis_v, length_u, length_v = oriented_rectangle(footprint)
    corners = [(x, y, eave_z) for x, y in footprint]

    if length_u >= length_v:
        ridge_half = max(0.18, (length_u - length_v) * 0.5)
        ridge_axis = axis_u
        vertices = corners + [
            (
                center.x - ridge_axis.x * ridge_half,
                center.y - ridge_axis.y * ridge_half,
                eave_z + roof_height,
            ),
            (
                center.x + ridge_axis.x * ridge_half,
                center.y + ridge_axis.y * ridge_half,
                eave_z + roof_height,
            ),
        ]
        faces = [
            (0, 1, 5, 4),
            (1, 2, 5),
            (2, 3, 4, 5),
            (3, 0, 4),
        ]
    else:
        ridge_half = max(0.18, (length_v - length_u) * 0.5)
        ridge_axis = axis_v
        vertices = corners + [
            (
                center.x - ridge_axis.x * ridge_half,
                center.y - ridge_axis.y * ridge_half,
                eave_z + roof_height,
            ),
            (
                center.x + ridge_axis.x * ridge_half,
                center.y + ridge_axis.y * ridge_half,
                eave_z + roof_height,
            ),
        ]
        faces = [
            (0, 1, 4),
            (1, 2, 5, 4),
            (2, 3, 5),
            (3, 0, 4, 5),
        ]

    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(vertices, [], faces)
    recalc_normals(mesh)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def add_oriented_box(
    name: str,
    center_xy: Vector,
    size_xy: tuple[float, float],
    center_z: float,
    height: float,
    yaw: float,
    material: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=(center_xy.x, center_xy.y, center_z),
        rotation=(0, 0, yaw),
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = (size_xy[0], size_xy[1], height)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    return obj


def build_geometry() -> list[bpy.types.Object]:
    wall = make_material("villa-le-bec-warm-white", (0.76, 0.72, 0.62, 1), 0.9)
    roof = make_material("villa-le-bec-muted-tile", (0.27, 0.16, 0.11, 1), 0.86)
    green = make_material("villa-le-bec-deep-green", (0.07, 0.15, 0.11, 1), 0.72)

    objects: list[bpy.types.Object] = []
    # 图01：沿街主楼为两层暖白墙体、四坡瓦顶和街道侧凸窗。
    objects.append(
        add_polygon_prism(
            "villa-le-bec-street-villa",
            STREET_VILLA_FOOTPRINT,
            3.15,
            wall,
        )
    )
    objects.append(
        add_hip_roof(
            "villa-le-bec-street-villa-hip-roof",
            STREET_VILLA_FOOTPRINT,
            3.15,
            1.15,
            roof,
        )
    )
    street_center, street_u, street_v, street_u_len, _ = oriented_rectangle(
        STREET_VILLA_FOOTPRINT
    )
    street_front = street_center - street_v * 2.42
    objects.append(
        add_oriented_box(
            "villa-le-bec-street-bay-shell",
            street_front - street_v * 0.24,
            (min(1.85, street_u_len * 0.36), 0.56),
            2.05,
            2.05,
            math.atan2(street_u.y, street_u.x),
            wall,
        )
    )
    objects.append(
        add_oriented_box(
            "villa-le-bec-street-bay-window",
            street_front - street_v * 0.54,
            (min(1.48, street_u_len * 0.29), 0.08),
            2.05,
            1.55,
            math.atan2(street_u.y, street_u.x),
            green,
        )
    )

    # 图02、图11：院内第二栋为两层体量、四坡顶、面向两楼间通道的入口凸出。
    objects.append(
        add_polygon_prism(
            "villa-le-bec-garden-villa",
            GARDEN_VILLA_FOOTPRINT,
            3.25,
            wall,
        )
    )
    objects.append(
        add_hip_roof(
            "villa-le-bec-garden-villa-hip-roof",
            GARDEN_VILLA_FOOTPRINT,
            3.25,
            1.1,
            roof,
        )
    )
    garden_center, garden_u, _, garden_u_len, garden_v_len = oriented_rectangle(
        GARDEN_VILLA_FOOTPRINT
    )
    garden_entry = garden_center - garden_u * (garden_u_len * 0.5)
    objects.append(
        add_oriented_box(
            "villa-le-bec-garden-entry-bay-shell",
            garden_entry - garden_u * 0.1,
            (0.3, min(1.2, garden_v_len * 0.26)),
            1.15,
            2.3,
            math.atan2(garden_u.y, garden_u.x),
            wall,
        )
    )
    objects.append(
        add_oriented_box(
            "villa-le-bec-garden-entry-window",
            garden_entry - garden_u * 0.22,
            (0.06, min(0.82, garden_v_len * 0.18)),
            1.02,
            1.86,
            math.atan2(garden_u.y, garden_u.x),
            green,
        )
    )
    objects.append(
        add_oriented_box(
            "villa-le-bec-garden-entry-step",
            garden_entry - garden_u * 0.28,
            (0.18, min(1.1, garden_v_len * 0.24)),
            0.08,
            0.16,
            math.atan2(garden_u.y, garden_u.x),
            roof,
        )
    )

    # 图02可见院内楼屋面老虎窗；Massing 仅保留一个主要屋面凸起。
    garden_roof_center = garden_center + Vector((0.0, -0.15))
    objects.append(
        add_oriented_box(
            "villa-le-bec-garden-dormer",
            garden_roof_center,
            (1.05, 0.72),
            4.0,
            0.9,
            math.atan2(garden_u.y, garden_u.x),
            wall,
        )
    )
    objects.append(
        add_oriented_box(
            "villa-le-bec-garden-dormer-cap",
            garden_roof_center,
            (1.22, 0.9),
            4.5,
            0.16,
            math.atan2(garden_u.y, garden_u.x),
            roof,
        )
    )
    return objects


def join_geometry(objects: list[bpy.types.Object]) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    root = bpy.context.active_object
    root.name = "villa-le-bec-massing"
    root["stable_asset_id"] = "villa-le-bec"
    root["runtime_tier"] = "massing"
    root["authored_unit"] = "1 scene unit = 2.7 m"
    root["front_direction"] = "local -Y"
    root["ground_datum"] = "z=0"
    root["source_osm_ways"] = "864493176,864493175"
    root["excluded_unbound_ways"] = "864493245,864493246,864493247"
    root["evidence_post_id"] = "66ba1786000000001e01cb8b"
    root["collision_semantics"] = "two-solid-buildings-with-open-courtyard-gap"
    return root


def export_glb(root: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_extras=True,
    )


def point_camera(camera: bpy.types.Object, target: tuple[float, float, float]) -> None:
    camera.rotation_euler = (
        Vector(target) - camera.location
    ).to_track_quat("-Z", "Y").to_euler()


def setup_preview_scene() -> bpy.types.Object:
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.58, 0.66, 0.68, 1)
    background.inputs["Strength"].default_value = 0.5
    scene.view_settings.look = "AgX - Medium High Contrast"

    ground = make_material("test_villa-le-bec-ground", (0.22, 0.25, 0.2, 1), 1)
    bpy.ops.mesh.primitive_plane_add(size=40, location=(4.5, -5.4, -0.02))
    bpy.context.active_object.name = "test_villa-le-bec-ground"
    bpy.context.active_object.data.materials.append(ground)

    bpy.ops.object.camera_add()
    camera = bpy.context.active_object
    camera.name = "test_villa-le-bec-massing-camera"
    scene.camera = camera
    for name, location, energy, size in (
        ("test_villa-le-bec-key", (-8, -18, 18), 1250, 16),
        ("test_villa-le-bec-fill", (18, 4, 11), 700, 12),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.active_object
        light.name = name
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
    return camera


def render_previews() -> None:
    camera = setup_preview_scene()
    views = (
        (
            "canonical",
            (2.3, -24.5, 7.2),
            (4.5, -5.1, 2.2),
            51,
        ),
        (
            "side",
            (20.0, -16.0, 8.4),
            (4.5, -5.0, 2.15),
            58,
        ),
        (
            "entrance",
            (-4.0, 3.0, 6.5),
            (7.0, -3.6, 2.1),
            58,
        ),
    )
    for suffix, location, target, lens in views:
        camera.location = location
        camera.data.lens = lens
        point_camera(camera, target)
        scene = bpy.context.scene
        scene.render.filepath = str(
            PREVIEW_DIR / f"test_villa-le-bec-massing-v3-{suffix}.png"
        )
        bpy.ops.render.render(write_still=True)


def main() -> None:
    clear_scene()
    OUTPUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    root = join_geometry(build_geometry())
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
    export_glb(root)
    render_previews()
    print(
        "Villa Le Bec Massing v3 生成完成："
        f"{OUTPUT_GLB.stat().st_size} bytes，"
        "保留 OSM 864493176/864493175，排除 864493245/246/247"
    )


if __name__ == "__main__":
    main()
