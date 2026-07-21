"""生成新华 Wonder 可用的 Hero 级悬铃木（法国梧桐）GLB。

脚本完全确定性运行：不读取照片纹理，不嵌入图像，只把参考图里确认过的
树形、树皮、叶片和果球特征转译为原创几何。
"""

from __future__ import annotations

import math
import random
from pathlib import Path

import bpy
from mathutils import Vector


SEED = 315129
random.seed(SEED)

ROOT = Path(__file__).resolve().parents[2]
GLB_PATH = ROOT / "public" / "models" / "building-evidence-lab" / "xinhua-plane-tree-hero.glb"
BLEND_PATH = ROOT / "research" / "source" / "xinhua-plane-tree-hero.blend"
PREVIEW_PATH = ROOT / "research" / "previews" / "test_plane-tree-hero_preview.png"


def hex_rgba(value: str) -> tuple[float, float, float, float]:
    value = value.lstrip("#")
    srgb = tuple(int(value[index : index + 2], 16) / 255 for index in (0, 2, 4))

    def to_linear(channel: float) -> float:
        if channel <= 0.04045:
            return channel / 12.92
        return ((channel + 0.055) / 1.055) ** 2.4

    return tuple(to_linear(channel) for channel in srgb) + (1.0,)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        # 材质稍后会重新创建，因此这里也清空，保证重复执行结果一致。
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def make_material(name: str, color: str, roughness: float = 0.9) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = hex_rgba(color)
    material.use_nodes = True
    material.use_backface_culling = False
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = hex_rgba(color)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = 0.0
    return material


def collection_for(name: str) -> bpy.types.Collection:
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for source in list(obj.users_collection):
        source.objects.unlink(obj)
    collection.objects.link(obj)


def smooth_mesh(obj: bpy.types.Object) -> None:
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def create_segment(
    start: Vector,
    end: Vector,
    radius_start: float,
    radius_end: float,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    name: str,
    sides: int = 8,
) -> bpy.types.Object:
    direction = end - start
    length = direction.length
    midpoint = (start + end) * 0.5
    bpy.ops.mesh.primitive_cone_add(
        vertices=sides,
        radius1=max(radius_start, 0.012),
        radius2=max(radius_end, 0.008),
        depth=length,
        end_fill_type="NGON",
        location=midpoint,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction.normalized())
    obj.data.materials.append(material)
    move_to_collection(obj, collection)
    smooth_mesh(obj)
    return obj


def create_chain(
    start: Vector,
    direction: Vector,
    length: float,
    radius_start: float,
    radius_end: float,
    segments: int,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    label: str,
    wobble: float,
) -> list[Vector]:
    points = [start.copy()]
    radii = [radius_start]
    current = start.copy()
    current_direction = direction.normalized()
    segment_length = length / segments
    for index in range(segments):
        if index:
            noise = Vector(
                (
                    random.uniform(-wobble, wobble),
                    random.uniform(-wobble, wobble),
                    random.uniform(-wobble * 0.3, wobble * 0.55),
                )
            )
            current_direction = (current_direction + noise + Vector((0, 0, 0.035))).normalized()
        next_point = current + current_direction * segment_length
        t1 = (index + 1) / segments
        r1 = radius_start * (1 - t1) + radius_end * t1
        points.append(next_point.copy())
        radii.append(r1)
        current = next_point
    create_continuous_tube(
        label,
        points,
        radii,
        material,
        collection,
        sides=9 if radius_start > 0.3 else 7,
    )
    return points


def child_direction(parent: Vector, azimuth: float, spread: float, lift: float) -> Vector:
    horizontal = Vector((math.cos(azimuth), math.sin(azimuth), 0))
    return (parent.normalized() * (1.0 - spread) + horizontal * spread + Vector((0, 0, lift))).normalized()


def create_root_buttress(
    name: str,
    angle: float,
    length: float,
    crown_height: float,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
) -> bpy.types.Object:
    """创建从根颈自然展开、贴地收尖的低多边形板根。"""
    direction = Vector((math.cos(angle), math.sin(angle), 0))
    side = Vector((-direction.y, direction.x, 0))
    bend = side * (0.08 * math.sin(angle * 2.3 + 0.7))
    points = [
        direction * 0.30 + Vector((0, 0, 0.48 + crown_height * 0.16)),
        direction * 0.70 + bend * 0.30 + Vector((0, 0, 0.30 + crown_height * 0.10)),
        direction * (length * 0.68) + bend + Vector((0, 0, 0.13)),
        direction * length + bend * 0.62 + Vector((0, 0, 0.025)),
    ]
    half_widths = [0.34, 0.29, 0.17, 0.035]
    half_heights = [0.42 + crown_height, 0.26 + crown_height * 0.35, 0.12, 0.028]
    sides = 8
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []

    for ring_index, point in enumerate(points):
        if ring_index == 0:
            tangent = (points[1] - points[0]).normalized()
        elif ring_index == len(points) - 1:
            tangent = (points[-1] - points[-2]).normalized()
        else:
            tangent = (points[ring_index + 1] - points[ring_index - 1]).normalized()
        horizontal_tangent = Vector((tangent.x, tangent.y, 0)).normalized()
        horizontal_side = Vector((-horizontal_tangent.y, horizontal_tangent.x, 0))
        phase = 0.08 if ring_index % 2 else 0.0
        for side_index in range(sides):
            theta = side_index * math.tau / sides + phase
            width = half_widths[ring_index] * (1 + 0.035 * math.sin(side_index * 2.1 + angle))
            height = half_heights[ring_index] * (1 + 0.025 * math.cos(side_index * 1.7 + angle))
            offset = horizontal_side * math.cos(theta) * width + Vector((0, 0, math.sin(theta) * height))
            vertices.append(tuple(point + offset))

    for ring_index in range(len(points) - 1):
        current = ring_index * sides
        following = (ring_index + 1) * sides
        for side_index in range(sides):
            next_side = (side_index + 1) % sides
            faces.append(
                (
                    current + side_index,
                    current + next_side,
                    following + next_side,
                    following + side_index,
                )
            )
    # 根的起点藏在根颈内部，不封口可以避免内部重叠面形成阴影接缝。
    tip_start = (len(points) - 1) * sides
    faces.append(tuple(tip_start + index for index in range(sides)))

    mesh = bpy.data.meshes.new(f"{name}_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.data.materials.append(material)
    smooth_mesh(obj)
    return obj


def add_roots(
    material: bpy.types.Material,
    collection: bpy.types.Collection,
) -> None:
    # 根系使用独立随机源，避免局部修改意外改变已确认的树冠形态。
    root_random = random.Random(SEED + 81)
    root_count = 6
    for index in range(root_count):
        angle = index * math.tau / root_count + root_random.uniform(-0.19, 0.19)
        create_root_buttress(
            f"root_buttress_{index:02d}",
            angle,
            root_random.uniform(1.08, 1.58),
            root_random.uniform(-0.035, 0.075),
            material,
            collection,
        )
    # 保持后续枝干生成沿用原来的确定性随机序列。
    for _ in range(28):
        random.random()


def build_branch_skeleton(
    wood: bpy.types.Material,
    collection: bpy.types.Collection,
) -> tuple[list[Vector], list[tuple[Vector, float]]]:
    trunk_points = [
        Vector((0.00, 0.00, 0.02)),
        Vector((-0.015, 0.01, 0.38)),
        Vector((-0.055, 0.025, 1.08)),
        Vector((-0.10, 0.03, 1.75)),
        Vector((0.08, -0.02, 3.55)),
        Vector((0.14, 0.04, 4.85)),
        Vector((0.10, 0.08, 5.55)),
    ]
    trunk_radii = [0.94, 0.82, 0.69, 0.61, 0.55, 0.48, 0.40]
    create_continuous_tube(
        "trunk_continuous",
        trunk_points,
        trunk_radii,
        wood,
        collection,
        sides=11,
    )

    fork_specs = [
        (Vector((-0.43, 0.08, 0.90)), 4.85, 0.39, 0.13, 0.11),
        (Vector((0.46, 0.02, 0.89)), 4.75, 0.36, 0.12, 0.12),
        (Vector((-0.20, -0.40, 0.89)), 4.55, 0.34, 0.11, 0.11),
        (Vector((0.20, 0.42, 0.88)), 4.35, 0.33, 0.11, 0.12),
        (Vector((0.02, 0.07, 1.00)), 5.85, 0.31, 0.09, 0.085),
    ]

    foliage_centres: list[Vector] = []
    fruit_anchors: list[tuple[Vector, float]] = []
    for major_index, (direction, length, r0, r1, wobble) in enumerate(fork_specs):
        start = trunk_points[-2] if major_index < 4 else trunk_points[-1]
        major_points = create_chain(
            start,
            direction,
            length,
            r0,
            r1,
            4,
            wood,
            collection,
            f"major_{major_index:02d}",
            wobble,
        )

        parent_direction = (major_points[-1] - major_points[-2]).normalized()
        for secondary_index in range(3):
            source = major_points[2 + (secondary_index % 2)]
            angle = major_index * 1.21 + secondary_index * 2.05 + random.uniform(-0.28, 0.28)
            secondary_direction = child_direction(
                parent_direction,
                angle,
                spread=random.uniform(0.38, 0.58),
                lift=random.uniform(0.20, 0.36),
            )
            secondary_points = create_chain(
                source,
                secondary_direction,
                random.uniform(2.25, 3.05),
                random.uniform(0.16, 0.22),
                random.uniform(0.048, 0.072),
                3,
                wood,
                collection,
                f"secondary_{major_index:02d}_{secondary_index:02d}",
                0.18,
            )
            foliage_centres.append(secondary_points[-1])

            for tertiary_index in range(2):
                tertiary_angle = angle + (-0.95 if tertiary_index == 0 else 0.95)
                tertiary_direction = child_direction(
                    (secondary_points[-1] - secondary_points[-2]).normalized(),
                    tertiary_angle,
                    spread=random.uniform(0.36, 0.56),
                    lift=random.uniform(0.08, 0.24),
                )
                tertiary_points = create_chain(
                    secondary_points[-2],
                    tertiary_direction,
                    random.uniform(1.25, 1.85),
                    random.uniform(0.07, 0.105),
                    random.uniform(0.022, 0.035),
                    2,
                    wood,
                    collection,
                    f"tertiary_{major_index:02d}_{secondary_index:02d}_{tertiary_index:02d}",
                    0.24,
                )
                foliage_centres.append(tertiary_points[-1])
                if (major_index + secondary_index + tertiary_index) % 4 == 0:
                    fruit_anchors.append((tertiary_points[-1], random.uniform(0.38, 0.72)))

        foliage_centres.append(major_points[-1])

    # 用少量较低叶簇把树冠和主干交界处连起来，但保留可读空隙。
    foliage_centres.extend(
        [
            Vector((-2.15, -0.35, 7.85)),
            Vector((2.20, 0.45, 7.95)),
            Vector((-0.85, 1.45, 8.10)),
            Vector((0.65, -1.65, 8.25)),
        ]
    )
    return foliage_centres, fruit_anchors


def create_polygon_mesh(
    name: str,
    vertices: list[tuple[float, float, float]],
    faces: list[tuple[int, ...]],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(f"{name}_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def create_continuous_tube(
    name: str,
    points: list[Vector],
    radii: list[float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    sides: int = 11,
) -> bpy.types.Object:
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []
    for ring_index, (point, radius) in enumerate(zip(points, radii)):
        if ring_index == 0:
            tangent = (points[1] - points[0]).normalized()
        elif ring_index == len(points) - 1:
            tangent = (points[-1] - points[-2]).normalized()
        else:
            tangent = (points[ring_index + 1] - points[ring_index - 1]).normalized()
        reference = Vector((0, 0, 1)) if abs(tangent.z) < 0.86 else Vector((1, 0, 0))
        axis_x = tangent.cross(reference).normalized()
        axis_y = tangent.cross(axis_x).normalized()
        phase_offset = (ring_index % 2) * 0.035
        for side_index in range(sides):
            angle = side_index * math.tau / sides + phase_offset
            irregularity = 1 + 0.025 * math.sin(side_index * 2.7 + ring_index * 1.8)
            offset = (
                axis_x * math.cos(angle) * radius * irregularity
                + axis_y * math.sin(angle) * radius * irregularity
            )
            vertices.append(tuple(point + offset))
    for ring_index in range(len(points) - 1):
        current = ring_index * sides
        following = (ring_index + 1) * sides
        for side_index in range(sides):
            next_side = (side_index + 1) % sides
            faces.append(
                (
                    current + side_index,
                    current + next_side,
                    following + next_side,
                    following + side_index,
                )
            )
    faces.append(tuple(reversed(range(sides))))
    top_start = (len(points) - 1) * sides
    faces.append(tuple(top_start + index for index in range(sides)))
    obj = create_polygon_mesh(name, vertices, faces, material, collection)
    smooth_mesh(obj)
    return obj


def build_bark_patches(
    materials: list[bpy.types.Material],
    collection: bpy.types.Collection,
) -> None:
    buckets: list[tuple[list[tuple[float, float, float]], list[tuple[int, ...]]]] = [
        ([], []) for _ in materials
    ]
    for index in range(132):
        z = random.uniform(0.45, 5.25)
        radius = 0.67 - z * 0.048
        theta = random.uniform(0, math.tau)
        half_angle = random.uniform(0.035, 0.13)
        half_height = random.uniform(0.04, 0.19)
        material_index = index % len(materials)
        vertices, faces = buckets[material_index]
        base = len(vertices)
        centre_radius = radius + 0.014
        vertices.append(
            (
                math.cos(theta) * centre_radius,
                math.sin(theta) * centre_radius,
                z,
            )
        )
        point_count = random.choice((7, 8, 9))
        for point_index in range(point_count):
            phase = point_index * math.tau / point_count
            jag = random.uniform(0.78, 1.16)
            angle = theta + math.cos(phase) * half_angle * jag
            patch_z = z + math.sin(phase) * half_height * random.uniform(0.82, 1.12)
            local_radius = 0.67 - patch_z * 0.048 + 0.016
            vertices.append(
                (
                    math.cos(angle) * local_radius,
                    math.sin(angle) * local_radius,
                    patch_z,
                )
            )
        for point_index in range(point_count):
            faces.append(
                (
                    base,
                    base + 1 + point_index,
                    base + 1 + ((point_index + 1) % point_count),
                )
            )

    for index, material in enumerate(materials):
        vertices, faces = buckets[index]
        create_polygon_mesh(
            f"bark_patch_{index:02d}",
            vertices,
            faces,
            material,
            collection,
        )


LEAF_OUTLINE = [
    (0.00, 1.00),
    (-0.18, 0.45),
    (-0.74, 0.64),
    (-0.43, 0.14),
    (-0.70, -0.16),
    (-0.22, -0.13),
    (0.00, -0.46),
    (0.22, -0.13),
    (0.70, -0.16),
    (0.43, 0.14),
    (0.74, 0.64),
    (0.18, 0.45),
]


def build_leaf_meshes(
    centres: list[Vector],
    materials: list[bpy.types.Material],
    collection: bpy.types.Collection,
) -> None:
    buckets: list[tuple[list[tuple[float, float, float]], list[tuple[int, ...]]]] = [
        ([], []) for _ in materials
    ]
    for cluster_index, centre in enumerate(centres):
        density = 30 + (cluster_index * 7) % 13
        radius = Vector(
            (
                random.uniform(0.92, 1.36),
                random.uniform(0.88, 1.28),
                random.uniform(0.72, 1.10),
            )
        )
        for leaf_index in range(density):
            # 以壳层为主、少量填充内部，让树冠既有体积也保留空洞。
            direction = Vector(
                (
                    random.uniform(-1, 1),
                    random.uniform(-1, 1),
                    random.uniform(-0.75, 1),
                )
            )
            if direction.length < 0.05:
                direction = Vector((0.4, 0.2, 0.9))
            direction.normalize()
            distance = random.uniform(0.42, 1.0) ** 0.65
            position = centre + Vector(
                (
                    direction.x * radius.x * distance,
                    direction.y * radius.y * distance,
                    direction.z * radius.z * distance,
                )
            )

            normal = Vector(
                (
                    random.uniform(-0.55, 0.55),
                    random.uniform(-0.55, 0.55),
                    random.uniform(0.35, 1.0),
                )
            ).normalized()
            reference = Vector((0, 0, 1)) if abs(normal.z) < 0.86 else Vector((1, 0, 0))
            axis_x = normal.cross(reference).normalized()
            axis_y = normal.cross(axis_x).normalized()
            rotation = random.uniform(0, math.tau)
            rotated_x = axis_x * math.cos(rotation) + axis_y * math.sin(rotation)
            rotated_y = axis_y * math.cos(rotation) - axis_x * math.sin(rotation)

            scale = random.uniform(0.24, 0.39)
            if leaf_index % 11 == 0:
                scale *= 1.18
            material_index = (cluster_index + leaf_index * 5) % len(materials)
            vertices, faces = buckets[material_index]
            base = len(vertices)
            centre_point = position + normal * random.uniform(-0.018, 0.018)
            vertices.append(tuple(centre_point))
            for outline_index, (x, y) in enumerate(LEAF_OUTLINE):
                curl = math.sin(outline_index * math.tau / len(LEAF_OUTLINE)) * scale * 0.055
                point = position + rotated_x * (x * scale) + rotated_y * (y * scale) + normal * curl
                vertices.append(tuple(point))
            for outline_index in range(len(LEAF_OUTLINE)):
                faces.append(
                    (
                        base,
                        base + 1 + outline_index,
                        base + 1 + ((outline_index + 1) % len(LEAF_OUTLINE)),
                    )
                )

    for index, material in enumerate(materials):
        vertices, faces = buckets[index]
        obj = create_polygon_mesh(
            f"leaves_{index:02d}",
            vertices,
            faces,
            material,
            collection,
        )
        for polygon in obj.data.polygons:
            polygon.use_smooth = False


def build_fruit(
    anchors: list[tuple[Vector, float]],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
) -> None:
    for index, (anchor, drop) in enumerate(anchors[:10]):
        stem_end = anchor + Vector((0.02, -0.01, -drop))
        create_segment(
            anchor,
            stem_end,
            0.014,
            0.010,
            material,
            collection,
            f"fruit_stem_{index:02d}",
            5,
        )
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=1,
            radius=random.uniform(0.10, 0.14),
            location=stem_end + Vector((0, 0, -0.11)),
        )
        fruit = bpy.context.object
        fruit.name = f"fruit_{index:02d}"
        fruit.scale.z = random.uniform(0.92, 1.08)
        fruit.data.materials.append(material)
        move_to_collection(fruit, collection)


def join_by_material(collection: bpy.types.Collection) -> list[bpy.types.Object]:
    grouped: dict[str, list[bpy.types.Object]] = {}
    for obj in list(collection.objects):
        if obj.type != "MESH" or not obj.data.materials:
            continue
        grouped.setdefault(obj.data.materials[0].name, []).append(obj)

    final_objects = []
    for material_name, objects in grouped.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        joined = bpy.context.object
        joined.name = material_name
        joined.data.name = f"{material_name}_mesh"
        final_objects.append(joined)
    return final_objects


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_preview_environment(tree_objects: list[bpy.types.Object]) -> None:
    preview_collection = collection_for("PREVIEW_ENVIRONMENT")

    ground_material = make_material("preview_stone", "#D8D0BE", 0.96)
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=6.1, depth=0.28, location=(0, 0, -0.14))
    ground = bpy.context.object
    ground.name = "preview_tree_pit"
    ground.scale.y = 0.82
    ground.data.materials.append(ground_material)
    move_to_collection(ground, preview_collection)

    soil_material = make_material("preview_soil", "#69634F", 1.0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1.35, depth=0.04, location=(0, 0, 0.02))
    soil = bpy.context.object
    soil.name = "preview_soil"
    soil.data.materials.append(soil_material)
    move_to_collection(soil, preview_collection)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.filepath = str(PREVIEW_PATH)
    scene.render.image_settings.color_mode = "RGBA"

    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = hex_rgba("#C9DDE0")
    background.inputs["Strength"].default_value = 0.72

    bpy.ops.object.light_add(type="SUN", location=(-8, -10, 15))
    sun = bpy.context.object
    sun.name = "preview_sun"
    sun.data.energy = 2.4
    sun.data.color = (1.0, 0.89, 0.70)
    sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(-32))
    move_to_collection(sun, preview_collection)

    bpy.ops.object.light_add(type="AREA", location=(5.5, -7.5, 10.5))
    key = bpy.context.object
    key.name = "preview_key"
    key.data.energy = 760
    key.data.shape = "DISK"
    key.data.size = 7.0
    key.data.color = (1.0, 0.91, 0.77)
    look_at(key, Vector((0, 0, 6.0)))
    move_to_collection(key, preview_collection)

    bpy.ops.object.light_add(type="AREA", location=(-6.5, 3.0, 8.0))
    fill = bpy.context.object
    fill.name = "preview_fill"
    fill.data.energy = 480
    fill.data.size = 6.0
    fill.data.color = (0.61, 0.79, 0.80)
    look_at(fill, Vector((0, 0, 6.2)))
    move_to_collection(fill, preview_collection)

    bpy.ops.object.camera_add(location=(15.8, -19.2, 10.8))
    camera = bpy.context.object
    camera.name = "preview_camera"
    camera.data.lens = 58
    look_at(camera, Vector((0, 0, 6.3)))
    scene.camera = camera
    move_to_collection(camera, preview_collection)

    scene.view_settings.look = "AgX - Medium High Contrast"
    for obj in tree_objects:
        obj.select_set(False)


def export_tree(tree_objects: list[bpy.types.Object]) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in tree_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = tree_objects[0]
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )


def main() -> None:
    reset_scene()
    bpy.context.preferences.filepaths.save_version = 0
    tree_collection = collection_for("TREE_RUNTIME")

    wood = make_material("PlaneTree_Wood", "#756E58", 0.94)
    bark_light = make_material("PlaneTree_Bark_Cream", "#C8BD94", 0.92)
    bark_sage = make_material("PlaneTree_Bark_Sage", "#98977C", 0.95)
    bark_dark = make_material("PlaneTree_Bark_Umber", "#514A3D", 0.97)
    leaf_dark = make_material("PlaneTree_Leaf_Dark", "#3F6048", 0.91)
    leaf_mid = make_material("PlaneTree_Leaf_Mid", "#64805A", 0.92)
    leaf_light = make_material("PlaneTree_Leaf_Light", "#8EA06B", 0.9)

    add_roots(wood, tree_collection)
    foliage_centres, fruit_anchors = build_branch_skeleton(wood, tree_collection)
    build_bark_patches([bark_light, bark_sage, bark_dark], tree_collection)
    build_leaf_meshes(foliage_centres, [leaf_dark, leaf_mid, leaf_light], tree_collection)
    build_fruit(fruit_anchors, bark_dark, tree_collection)

    tree_objects = join_by_material(tree_collection)
    for obj in tree_objects:
        obj["asset_role"] = "hero_plane_tree"
        obj["generator_seed"] = SEED

    export_tree(tree_objects)
    add_preview_environment(tree_objects)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.context.scene.render.filepath = str(PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)

    print(f"GLB: {GLB_PATH}")
    print(f"Blend: {BLEND_PATH}")
    print(f"Preview: {PREVIEW_PATH}")
    print(f"Runtime objects: {len(tree_objects)}")


if __name__ == "__main__":
    main()
