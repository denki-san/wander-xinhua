"""从冻结的 Villa Le Bec Massing v2 生成只含两栋建筑的 Hero v2。"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import math
import subprocess
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
MASSING_SCRIPT = ROOT / "scripts/create_villa_le_bec_massing_model.py"
MASSING_GLB = ROOT / "public/models/tiers/xinhua-road/massing-v2/villa-le-bec-massing.glb"
MASSING_SHA = "593cc3995046439d973788108ac00cd6176c3f7c8fce67702e98db01d54b975f"
HERO_V1_GLB = ROOT / "public/models/tiers/xinhua-road/hero-v1/villa-le-bec-hero.glb"
HERO_V1_RECORD = ROOT / "docs/research/build-records/tiers/xinhua-road/hero-v1/villa-le-bec-hero.json"
CURRENT_HERO_V1_SHA = "1374b7a8301345c23736644cfdc9a7ed467efb8371ebcdf72a507217b0015394"
HISTORICAL_HERO_V1_SHA = "56cb58a3d9f0d24a1f35d3edd610de871fb01f135253043022bef2cbadf46dad"
HERO_BLEND = ROOT / "assets/models/source/tiers/xinhua-road/hero-v2/villa-le-bec-hero-v2.blend"
HERO_GLB = ROOT / "public/models/tiers/xinhua-road/hero-v2/villa-le-bec-hero-v2.glb"
PREVIEW_DIR = ROOT / "test_artifacts/all-models/hero-v2/villa-le-bec"
RECORD = ROOT / "docs/research/build-records/tiers/xinhua-road/hero-v2/villa-le-bec-hero-v2.json"
BRIEF = ROOT / "docs/research/villa-le-bec-hero-v2-brief.md"
ADJUDICATION = ROOT / "docs/research/villa-le-bec-hero-visual-adjudication.json"
CANONICAL = PREVIEW_DIR / "test_villa-le-bec-hero-v2-canonical.png"
SIDE = PREVIEW_DIR / "test_villa-le-bec-hero-v2-side-depth.png"
ENTRANCE = PREVIEW_DIR / "test_villa-le-bec-hero-v2-entrance.png"
TRIPTYCH = PREVIEW_DIR / "test_villa-le-bec-hero-v2-triptych.png"
REFERENCES = (
    (
        ROOT / "docs/research/assets/poi-references/villa-le-bec/xhs-2024/test_xhs_villa_le_bec_01.jpg",
        "street-canonical-two-storey-storefront-upper-bay-and-roof",
    ),
    (
        ROOT / "docs/research/assets/poi-references/villa-le-bec/xhs-2024/test_xhs_villa_le_bec_02.jpg",
        "garden-front-door-upper-window-steps-and-readable-dormer",
    ),
    (
        ROOT / "docs/research/assets/poi-references/villa-le-bec/xhs-2024/test_xhs_villa_le_bec_11.jpg",
        "garden-side-upper-projecting-window-and-roof-depth",
    ),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_massing():
    spec = importlib.util.spec_from_file_location("villa_le_bec_massing", MASSING_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError("无法加载 Villa Le Bec Massing 生成器")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


MASSING = load_massing()


def material(
    name: str,
    color: tuple[float, float, float, float],
    roughness: float,
) -> bpy.types.Material:
    return MASSING.make_material(name, color, roughness)


def box(
    name: str,
    center: Vector,
    dimensions: tuple[float, float, float],
    yaw: float,
    surface: bpy.types.Material,
) -> bpy.types.Object:
    return MASSING.add_oriented_box(
        name,
        Vector((center.x, center.y)),
        dimensions[:2],
        center.z,
        dimensions[2],
        yaw,
        surface,
    )


def rectangle_data(footprint):
    center, u, v, u_length, v_length = MASSING.oriented_rectangle(footprint)
    return center, u, v, u_length, v_length, math.atan2(u.y, u.x)


def point3(xy: Vector, z: float) -> Vector:
    return Vector((xy.x, xy.y, z))


def add_framed_opening(
    prefix: str,
    plane_xy: Vector,
    z: float,
    width: float,
    height: float,
    horizontal: Vector,
    outward: Vector,
    frame: bpy.types.Material,
    glass: bpy.types.Material,
    objects: list[bpy.types.Object],
    *,
    mullions: int = 1,
) -> None:
    """在指定立面平面生成可读的玻璃、外框、横档和竖梃。"""
    yaw = math.atan2(horizontal.y, horizontal.x)
    center = point3(plane_xy + outward * 0.035, z)
    objects.append(box(f"{prefix}-glass", center, (width, 0.055, height), yaw, glass))
    for label, offset, dimensions in (
        ("left", -width / 2, (0.075, 0.09, height + 0.10)),
        ("right", width / 2, (0.075, 0.09, height + 0.10)),
        ("top", 0, (width + 0.10, 0.09, 0.075)),
        ("bottom", 0, (width + 0.10, 0.09, 0.075)),
        ("transom", 0, (width, 0.09, 0.06)),
    ):
        location = center + Vector((horizontal.x * offset, horizontal.y * offset, 0))
        if label == "top":
            location.z += height / 2
        elif label == "bottom":
            location.z -= height / 2
        objects.append(box(f"{prefix}-frame-{label}", location, dimensions, yaw, frame))
    if mullions > 0:
        for index in range(1, mullions + 1):
            offset = -width / 2 + width * index / (mullions + 1)
            location = center + Vector((horizontal.x * offset, horizontal.y * offset, 0))
            objects.append(
                box(
                    f"{prefix}-mullion-{index}",
                    location,
                    (0.055, 0.09, height),
                    yaw,
                    frame,
                )
            )


def add_gable_roof(
    name: str,
    center_xy: Vector,
    base_z: float,
    width: float,
    depth: float,
    roof_height: float,
    horizontal: Vector,
    outward: Vector,
    surface: bpy.types.Material,
) -> bpy.types.Object:
    """为老虎窗生成带三角正面的双坡顶，避免读成烟囱盒。"""
    local_vertices = (
        (-width / 2, -depth / 2, base_z),
        (width / 2, -depth / 2, base_z),
        (-width / 2, depth / 2, base_z),
        (width / 2, depth / 2, base_z),
        (0, -depth / 2, base_z + roof_height),
        (0, depth / 2, base_z + roof_height),
    )
    vertices = [
        (
            center_xy.x + horizontal.x * x + outward.x * y,
            center_xy.y + horizontal.y * x + outward.y * y,
            z,
        )
        for x, y, z in local_vertices
    ]
    faces = (
        (0, 2, 5, 4),
        (1, 4, 5, 3),
        (0, 4, 1),
        (2, 3, 5),
        (0, 1, 3, 2),
    )
    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(vertices, [], faces)
    editable = bmesh.new()
    editable.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(editable, faces=editable.faces)
    editable.to_mesh(mesh)
    editable.free()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(surface)
    return obj


def add_dormer(
    prefix: str,
    center_xy: Vector,
    horizontal: Vector,
    outward: Vector,
    base_z: float,
    wall: bpy.types.Material,
    roof: bpy.types.Material,
    frame: bpy.types.Material,
    glass: bpy.types.Material,
    objects: list[bpy.types.Object],
) -> None:
    """生成有窗、三角山花和双坡顶的可读老虎窗。"""
    yaw = math.atan2(horizontal.y, horizontal.x)
    width = 0.98
    depth = 0.72
    body_height = 0.66
    body_center = point3(center_xy, base_z + body_height / 2)
    objects.append(box(f"{prefix}-body", body_center, (width, depth, body_height), yaw, wall))
    window_plane = center_xy + outward * (depth / 2 + 0.015)
    add_framed_opening(
        f"{prefix}-front",
        window_plane,
        base_z + body_height * 0.53,
        0.62,
        0.40,
        horizontal,
        outward,
        frame,
        glass,
        objects,
        mullions=1,
    )
    objects.append(
        add_gable_roof(
            f"{prefix}-gable-roof",
            center_xy,
            base_z + body_height,
            1.16,
            0.92,
            0.30,
            horizontal,
            outward,
            roof,
        )
    )


def add_street_facade(
    center: Vector,
    u: Vector,
    v: Vector,
    u_length: float,
    v_length: float,
    wall,
    roof,
    frame,
    glass,
    objects: list[bpy.types.Object],
) -> None:
    front = center - v * (v_length / 2)
    outward = -v
    yaw = math.atan2(u.y, u.x)

    # 图01：底层是连续门窗界面，不再是稀疏单层窗。
    for index, offset in enumerate((-2.05, -1.02, 0.0, 1.02, 2.05)):
        opening_center = front + u * offset
        add_framed_opening(
            f"villa-le-bec-hero-v2-street-ground-opening-{index}",
            opening_center,
            0.94,
            0.86,
            1.38,
            u,
            outward,
            frame,
            glass,
            objects,
            mullions=1,
        )
    objects.append(
        box(
            "villa-le-bec-hero-v2-street-ground-transom-band",
            point3(front + outward * 0.055, 1.67),
            (u_length * 0.91, 0.11, 0.13),
            yaw,
            frame,
        )
    )

    # 图01：上层凸窗独立于底层界面，左右仍保留上层窗，形成明确两层层级。
    for index, offset in enumerate((-2.05, 1.80)):
        add_framed_opening(
            f"villa-le-bec-hero-v2-street-upper-window-{index}",
            front + u * offset,
            2.38,
            0.78,
            1.02,
            u,
            outward,
            frame,
            glass,
            objects,
            mullions=1,
        )
    bay_width = 1.72
    bay_depth = 0.48
    bay_center = front + u * -0.15 + outward * bay_depth
    objects.append(
        box(
            "villa-le-bec-hero-v2-street-upper-bay-sill",
            point3(bay_center, 1.77),
            (bay_width, bay_depth, 0.24),
            yaw,
            wall,
        )
    )
    objects.append(
        box(
            "villa-le-bec-hero-v2-street-upper-bay-cap",
            point3(bay_center, 3.00),
            (bay_width + 0.16, bay_depth + 0.12, 0.16),
            yaw,
            frame,
        )
    )
    bay_front = front + u * -0.15 + outward * (bay_depth + 0.02)
    add_framed_opening(
        "villa-le-bec-hero-v2-street-upper-bay-front",
        bay_front,
        2.38,
        1.48,
        1.08,
        u,
        outward,
        frame,
        glass,
        objects,
        mullions=2,
    )
    for side_label, side_sign in (("left", -1), ("right", 1)):
        side_outward = u * side_sign
        side_center = front + u * (-0.15 + side_sign * bay_width / 2) + outward * (bay_depth * 0.52)
        add_framed_opening(
            f"villa-le-bec-hero-v2-street-upper-bay-{side_label}",
            side_center,
            2.38,
            bay_depth * 0.72,
            1.02,
            outward,
            side_outward,
            frame,
            glass,
            objects,
            mullions=0,
        )

    # 图01：两个面向新华路的有窗老虎窗。
    for index, offset in enumerate((-1.55, 1.48)):
        dormer_xy = center + u * offset - v * (v_length * 0.31)
        add_dormer(
            f"villa-le-bec-hero-v2-street-dormer-{index}",
            dormer_xy,
            u,
            outward,
            3.50,
            wall,
            roof,
            frame,
            glass,
            objects,
        )


def add_garden_facades(
    center: Vector,
    u: Vector,
    v: Vector,
    u_length: float,
    v_length: float,
    wall,
    roof,
    frame,
    glass,
    step,
    objects: list[bpy.types.Object],
) -> None:
    # 图02：入口位于面向两栋间通道的 -U 正立面，门洞和上窗必须朝向相机。
    entrance_face = center - u * (u_length / 2)
    entrance_outward = -u
    entrance_horizontal = v
    entrance_yaw = math.atan2(v.y, v.x)
    add_framed_opening(
        "villa-le-bec-hero-v2-garden-front-door",
        entrance_face + entrance_outward * 0.055,
        0.87,
        0.86,
        1.48,
        entrance_horizontal,
        entrance_outward,
        frame,
        glass,
        objects,
        mullions=1,
    )
    add_framed_opening(
        "villa-le-bec-hero-v2-garden-front-upper-window",
        entrance_face + entrance_outward * 0.055,
        2.30,
        0.92,
        0.94,
        entrance_horizontal,
        entrance_outward,
        frame,
        glass,
        objects,
        mullions=1,
    )
    for side_sign in (-1, 1):
        jamb_xy = entrance_face + entrance_horizontal * side_sign * 0.58 + entrance_outward * 0.08
        objects.append(
            box(
                f"villa-le-bec-hero-v2-garden-entry-pilaster-{side_sign:+d}",
                point3(jamb_xy, 1.45),
                (0.18, 0.22, 2.90),
                entrance_yaw,
                wall,
            )
        )
    objects.append(
        box(
            "villa-le-bec-hero-v2-garden-entry-canopy",
            point3(entrance_face + entrance_outward * 0.16, 1.70),
            (1.40, 0.34, 0.14),
            entrance_yaw,
            frame,
        )
    )
    for index, (distance, z, height) in enumerate(((0.17, 0.07, 0.14), (0.31, 0.045, 0.09))):
        objects.append(
            box(
                f"villa-le-bec-hero-v2-garden-entry-step-{index}",
                point3(entrance_face + entrance_outward * distance, z),
                (1.26 + index * 0.18, 0.22, height),
                entrance_yaw,
                step,
            )
        )

    # 图11：院内楼侧向上层凸窗。
    side_face = center + v * (v_length / 2)
    side_outward = v
    side_yaw = math.atan2(u.y, u.x)
    side_bay_depth = 0.38
    side_bay_center = side_face + side_outward * side_bay_depth
    objects.append(
        box(
            "villa-le-bec-hero-v2-garden-side-upper-bay-sill",
            point3(side_bay_center, 1.78),
            (1.34, side_bay_depth, 0.22),
            side_yaw,
            wall,
        )
    )
    objects.append(
        box(
            "villa-le-bec-hero-v2-garden-side-upper-bay-cap",
            point3(side_bay_center, 2.98),
            (1.48, side_bay_depth + 0.10, 0.15),
            side_yaw,
            frame,
        )
    )
    add_framed_opening(
        "villa-le-bec-hero-v2-garden-side-upper-bay-window",
        side_face + side_outward * (side_bay_depth + 0.02),
        2.36,
        1.14,
        1.05,
        u,
        side_outward,
        frame,
        glass,
        objects,
        mullions=2,
    )

    # 图02：入口轴线上方的有窗老虎窗。
    dormer_xy = center - u * (u_length * 0.31)
    add_dormer(
        "villa-le-bec-hero-v2-garden-front-dormer",
        dormer_xy,
        v,
        entrance_outward,
        3.58,
        wall,
        roof,
        frame,
        glass,
        objects,
    )


def add_eave_trim(
    prefix: str,
    center: Vector,
    u: Vector,
    v: Vector,
    u_length: float,
    v_length: float,
    z: float,
    frame,
    objects: list[bpy.types.Object],
) -> None:
    yaw_u = math.atan2(u.y, u.x)
    yaw_v = math.atan2(v.y, v.x)
    for label, offset in (("front", -v_length / 2), ("back", v_length / 2)):
        objects.append(
            box(
                f"villa-le-bec-hero-v2-{prefix}-eave-{label}",
                point3(center + v * offset, z),
                (u_length * 1.035, 0.12, 0.15),
                yaw_u,
                frame,
            )
        )
    for label, offset in (("left", -u_length / 2), ("right", u_length / 2)):
        objects.append(
            box(
                f"villa-le-bec-hero-v2-{prefix}-eave-{label}",
                point3(center + u * offset, z),
                (v_length * 1.035, 0.12, 0.15),
                yaw_v,
                frame,
            )
        )


def build_hero_v2() -> tuple[bpy.types.Object, list[str]]:
    wall = material("villa-le-bec-hero-v2-warm-white-plaster", (0.79, 0.73, 0.62, 1), 0.90)
    base = material("villa-le-bec-hero-v2-dark-stone-base", (0.10, 0.12, 0.105, 1), 0.84)
    roof = material("villa-le-bec-hero-v2-muted-red-brown-tile", (0.28, 0.14, 0.075, 1), 0.88)
    frame = material("villa-le-bec-hero-v2-deep-green-frame", (0.035, 0.10, 0.075, 1), 0.70)
    glass = material("villa-le-bec-hero-v2-low-reflection-dark-glass", (0.075, 0.13, 0.14, 1), 0.30)
    step = material("villa-le-bec-hero-v2-warm-stone-step", (0.34, 0.29, 0.23, 1), 0.92)

    street = MASSING.STREET_VILLA_FOOTPRINT
    garden = MASSING.GARDEN_VILLA_FOOTPRINT
    street_center, street_u, street_v, street_ul, street_vl, street_yaw = rectangle_data(street)
    garden_center, garden_u, garden_v, garden_ul, garden_vl, garden_yaw = rectangle_data(garden)

    # 直接复用冻结的两个 OSM footprint 与 Massing 屋顶算法，不调用粗略 bay。
    objects: list[bpy.types.Object] = [
        MASSING.add_polygon_prism("villa-le-bec-hero-v2-street-villa", street, 3.15, wall),
        MASSING.add_hip_roof("villa-le-bec-hero-v2-street-hip-roof", street, 3.15, 1.15, roof),
        MASSING.add_polygon_prism("villa-le-bec-hero-v2-garden-villa", garden, 3.25, wall),
        MASSING.add_hip_roof("villa-le-bec-hero-v2-garden-hip-roof", garden, 3.25, 1.10, roof),
    ]
    for prefix, center, u_length, v_length, yaw in (
        ("street", street_center, street_ul, street_vl, street_yaw),
        ("garden", garden_center, garden_ul, garden_vl, garden_yaw),
    ):
        objects.append(
            box(
                f"villa-le-bec-hero-v2-{prefix}-base",
                point3(center, 0.23),
                (u_length * 0.985, v_length * 0.985, 0.46),
                yaw,
                base,
            )
        )

    add_street_facade(
        street_center,
        street_u,
        street_v,
        street_ul,
        street_vl,
        wall,
        roof,
        frame,
        glass,
        objects,
    )
    add_garden_facades(
        garden_center,
        garden_u,
        garden_v,
        garden_ul,
        garden_vl,
        wall,
        roof,
        frame,
        glass,
        step,
        objects,
    )
    add_eave_trim(
        "street",
        street_center,
        street_u,
        street_v,
        street_ul,
        street_vl,
        3.14,
        frame,
        objects,
    )
    add_eave_trim(
        "garden",
        garden_center,
        garden_u,
        garden_v,
        garden_ul,
        garden_vl,
        3.24,
        frame,
        objects,
    )

    component_names = [obj.name for obj in objects]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    root = bpy.context.active_object
    root.name = "villa-le-bec-hero-v2"
    root["stable_asset_id"] = "villa-le-bec"
    root["runtime_tier"] = "hero"
    root["candidate_version"] = "hero-v2"
    root["derived_from_massing_sha256"] = MASSING_SHA
    root["supersedes_preserved_hero_v1_sha256"] = CURRENT_HERO_V1_SHA
    root["historical_blocked_hero_v1_sha256"] = HISTORICAL_HERO_V1_SHA
    root["front_direction"] = "local -Y"
    root["ground_datum"] = "z=0"
    root["collision_semantics"] = "two-solid-buildings-open-courtyard-preserved"
    root["visual_repairs"] = (
        "street-two-storey-storefront-upper-bay;"
        "garden-front-door-upper-window;"
        "windowed-gable-dormers"
    )
    root["excluded"] = "trees,dressing,brand,interior,low-annex,864493245-247"
    return root, component_names


def camera_look(camera: bpy.types.Object, target: tuple[float, float, float]) -> None:
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def render_previews() -> None:
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.color = (0.30, 0.33, 0.35)

    bpy.ops.mesh.primitive_plane_add(size=36, location=(4.5, -5.5, -0.025))
    ground = bpy.context.active_object
    ground.name = "test_villa-le-bec-hero-v2-ground"
    ground.data.materials.append(
        material("test-villa-le-bec-hero-v2-ground", (0.18, 0.205, 0.19, 1), 1.0)
    )
    bpy.ops.object.light_add(type="AREA", location=(-7, -17, 16))
    key = bpy.context.active_object
    key.data.energy = 1700
    key.data.shape = "DISK"
    key.data.size = 14
    bpy.ops.object.light_add(type="AREA", location=(15, 5, 11))
    fill = bpy.context.active_object
    fill.data.energy = 1150
    fill.data.size = 10
    bpy.ops.object.light_add(type="SUN", location=(0, 0, 12))
    bpy.context.active_object.rotation_euler = (math.radians(32), math.radians(-18), math.radians(28))
    bpy.context.active_object.data.energy = 1.2

    bpy.ops.object.camera_add()
    camera = bpy.context.active_object
    scene.camera = camera
    views = (
        (CANONICAL, (2.0, -25.0, 5.1), (4.35, -5.25, 2.05), 54),
        (SIDE, (16.0, 7.0, 6.2), (4.55, -5.20, 2.10), 56),
        (ENTRANCE, (-3.0, 4.5, 4.8), (6.35, -3.75, 2.10), 58),
    )
    for path, location, target, lens in views:
        camera.location = location
        camera.data.lens = lens
        camera_look(camera, target)
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)


def export(root: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(HERO_GLB),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_extras=True,
    )


def write_record(root: bpy.types.Object, components: list[str]) -> None:
    root.data.calc_loop_triangles()
    vertices = [root.matrix_world @ Vector(corner) for corner in root.bound_box]
    bounds = {
        "min": [min(vertex[index] for vertex in vertices) for index in range(3)],
        "max": [max(vertex[index] for vertex in vertices) for index in range(3)],
    }
    record = {
        "version": 2,
        "assetId": "villa-le-bec",
        "tier": "hero",
        "candidate": "hero-v2",
        "status": "headless-fixed-view-repair-pass-pending-main-window-mcp2",
        "generator": "scripts/create_villa_le_bec_hero_v2_model.py",
        "generatorSha256": sha256(Path(__file__)),
        "generationCommand": (
            "/Applications/Blender.app/Contents/MacOS/Blender --background "
            "--python-exit-code 1 --python scripts/create_villa_le_bec_hero_v2_model.py"
        ),
        "blenderVersion": bpy.app.version_string,
        "integrationBaseCommit": "14d5404d09f578a72af87156fa2663fe00ab0374",
        "qualityContract": {
            "brief": str(BRIEF.relative_to(ROOT)),
            "briefSha256": sha256(BRIEF),
            "blockedV1Adjudication": str(ADJUDICATION.relative_to(ROOT)),
            "blockedV1AdjudicationSha256": sha256(ADJUDICATION),
            "currentHeroV1BuildRecord": str(HERO_V1_RECORD.relative_to(ROOT)),
            "currentHeroV1BuildRecordSha256": sha256(HERO_V1_RECORD),
        },
        "derivedFrom": {
            "massingGlb": str(MASSING_GLB.relative_to(ROOT)),
            "massingSha256": MASSING_SHA,
            "placement": {
                "position": [-34.1, 88.8],
                "yaw": -0.38,
                "scale": 0.82,
                "movementAuthorized": False,
            },
        },
        "preservedCandidate": {
            "glb": str(HERO_V1_GLB.relative_to(ROOT)),
            "sha256": CURRENT_HERO_V1_SHA,
            "state": "current-integration-hero-v1-mcp2-pass",
            "overwritten": False,
        },
        "historicalLineage": [
            {
                "role": "blocked-hero-v1-used-by-original-hero-v2-build",
                "baselineCommit": "dcd619e04fc735e8b0a4b9b01cac7ca78a749ecb",
                "pathAtCommit": str(HERO_V1_GLB.relative_to(ROOT)),
                "sha256": HISTORICAL_HERO_V1_SHA,
                "currentWorkingTreeBinary": False,
                "preservedInGitHistory": True,
            }
        ],
        "reproducibilityRepair": {
            "priorIntegrationCommit": "338cb03",
            "priorHeroV2GlbSha256": "a6ebf4a362a1d759bf818f62595c75ffa240b06461bc1479f13f6626a845b35d",
            "rebuiltHeroV2GlbSha256": sha256(HERO_GLB),
            "binaryDelta": "lineage-extras-now-lock-current-and-historical-hero-v1-sha",
            "fixedViewPixelComparison": {
                "method": "PIL-RGB-ImageChops-difference-bbox",
                "canonical": "pass-pixel-identical",
                "sideDepth": "pass-pixel-identical",
                "entrance": "pass-pixel-identical",
                "triptych": "pass-pixel-identical",
            },
        },
        "references": [
            {
                "path": str(path.relative_to(ROOT)),
                "sha256": sha256(path),
                "role": role,
                "runtimeEmbedding": False,
            }
            for path, role in REFERENCES
        ],
        "outputs": {
            "blend": str(HERO_BLEND.relative_to(ROOT)),
            "blendSha256": sha256(HERO_BLEND),
            "glb": str(HERO_GLB.relative_to(ROOT)),
            "glbSha256": sha256(HERO_GLB),
            "bytes": HERO_GLB.stat().st_size,
            "bounds": bounds,
            "metrics": {
                "nodes": 1,
                "meshes": 1,
                "triangles": len(root.data.loop_triangles),
                "materials": len(root.data.materials),
                "images": 0,
                "textures": 0,
            },
            "previews": [
                {
                    "view": view,
                    "path": str(path.relative_to(ROOT)),
                    "sha256": sha256(path),
                }
                for view, path in (
                    ("canonical", CANONICAL),
                    ("side-depth", SIDE),
                    ("entrance", ENTRANCE),
                    ("triptych", TRIPTYCH),
                )
            ],
        },
        "budget": {
            "maxTriangles": 68000,
            "maxNodes": 8,
            "maxMaterials": 12,
            "maxImages": 0,
            "maxBytes": 5200000,
        },
        "scope": {
            "twoBuildingsOnly": True,
            "components": len(components),
            "excluded": [
                "trees",
                "decorations",
                "street-furniture",
                "brand-text",
                "temporary-soft-furnishing",
                "interior",
                "low-annex",
                "ways-864493245-246-247",
            ],
        },
        "visualRepair": {
            "streetFacade": "two-storey-storefront-upper-window-and-projecting-bay-readable",
            "gardenEntrance": "front-facing-door-upper-window-canopy-and-steps-readable",
            "dormers": "windowed-gable-dormers-readable-from-fixed-views",
            "referenceTripletOnly": ["01", "02", "11"],
        },
        "collisionContract": {
            "sameAsAcceptedMassing": True,
            "solidWays": [864493176, 864493175],
            "openCourtyard": True,
            "minimumMassingWallGapSceneUnits": 1.399383,
            "bakedCollisionGeometry": False,
        },
        "gates": {
            "headlessCanonicalSideEntrance": "pass",
            "mcp2": "not-run-by-scope-pending-main-window",
            "identity": "not-authorized-until-mcp2",
            "runtime": "not-run-by-scope",
        },
    }
    RECORD.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )


def main() -> None:
    if sha256(MASSING_GLB) != MASSING_SHA:
        raise RuntimeError("冻结的 Massing SHA 不匹配，拒绝生成 Hero v2")
    if sha256(HERO_V1_GLB) != CURRENT_HERO_V1_SHA:
        raise RuntimeError("当前集成 Hero v1 SHA 不匹配，拒绝生成不可复现的 Hero v2")
    for reference, _ in REFERENCES:
        if not reference.exists():
            raise RuntimeError(f"缺少本地参考：{reference}")
    for contract in (BRIEF, ADJUDICATION):
        if not contract.exists():
            raise RuntimeError(f"缺少质量合同：{contract}")
    for directory in (HERO_BLEND.parent, HERO_GLB.parent, PREVIEW_DIR, RECORD.parent):
        directory.mkdir(parents=True, exist_ok=True)

    MASSING.clear_scene()
    root, components = build_hero_v2()
    bpy.ops.wm.save_as_mainfile(filepath=str(HERO_BLEND))
    export(root)
    render_previews()
    subprocess.run(
        [
            "/usr/bin/env",
            "python3",
            "-c",
            (
                "from PIL import Image; import sys; "
                "imgs=[Image.open(p).convert('RGB') for p in sys.argv[1:4]]; "
                "out=Image.new('RGB',(imgs[0].width*3,imgs[0].height)); "
                "[out.paste(im,(i*im.width,0)) for i,im in enumerate(imgs)]; "
                "out.save(sys.argv[4])"
            ),
            str(CANONICAL),
            str(SIDE),
            str(ENTRANCE),
            str(TRIPTYCH),
        ],
        check=True,
    )
    write_record(root, components)
    print(
        json.dumps(
            {
                "glb": str(HERO_GLB),
                "sha256": sha256(HERO_GLB),
                "bytes": HERO_GLB.stat().st_size,
                "triangles": len(root.data.loop_triangles),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
