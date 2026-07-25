"""生成 5 个植被与 7 个共享街具原型的确定性 Massing 资产。"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys
from typing import Any, Callable

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets/models/source/tiers/shared-prototypes/massing"
RUNTIME_DIR = ROOT / "public/models/tiers/shared-prototypes/massing"
PREVIEW_DIR = ROOT / "test_artifacts/all-models/massing/shared-prototypes"
RECORD_DIR = (
    ROOT / "docs/research/build-records/tiers/shared-prototypes/massing"
)
MANIFEST_PATH = ROOT / "docs/research/shared-prototypes-massing-manifest.json"
BRIEF_PATH = "docs/research/shared-prototypes-massing-model-brief.md"
AUDITED_AT = "2026-07-25"
AUTHORED_METERS_PER_SCENE_UNIT = 2.7


def authored_units(meters: float) -> float:
    return meters / AUTHORED_METERS_PER_SCENE_UNIT


PROTOTYPES = [
    {
        "id": "prototype:vegetation:xinhua-plane-tree",
        "slug": "xinhua-plane-tree",
        "family": "vegetation",
        "evidence": "confirmed-plane-tree",
        "instances": 31,
        "builder": "build_xinhua_plane_tree",
    },
    {
        "id": "prototype:vegetation:shangsheng-campus-tree",
        "slug": "shangsheng-campus-tree",
        "family": "vegetation",
        "evidence": "species-unknown-runtime-envelope",
        "instances": 29,
        "builder": "build_shangsheng_tree",
    },
    {
        "id": "prototype:vegetation:huashan-canopy-tree",
        "slug": "huashan-canopy-tree",
        "family": "vegetation",
        "evidence": "species-unknown-runtime-envelope",
        "instances": 112,
        "builder": "build_huashan_tree",
    },
    {
        "id": "prototype:vegetation:huashan-understory",
        "slug": "huashan-understory",
        "family": "vegetation",
        "evidence": "species-unknown-runtime-envelope",
        "instances": 73,
        "builder": "build_understory",
    },
    {
        "id": "prototype:vegetation:road-edge-shrub",
        "slug": "road-edge-shrub",
        "family": "vegetation",
        "evidence": "species-unknown-observed-road-edge-envelope",
        "instances": 12,
        "builder": "build_road_shrub",
    },
    {
        "id": "prototype:street-furniture:lane-lamp-short-arm",
        "slug": "lane-lamp-short-arm",
        "family": "street-furniture",
        "evidence": "observed-xingfuli-and-street-context",
        "instances": None,
        "builder": "build_lane_lamp",
    },
    {
        "id": "prototype:street-furniture:cantilever-umbrella",
        "slug": "cantilever-umbrella",
        "family": "street-furniture",
        "evidence": "observed-xingfuli",
        "instances": None,
        "builder": "build_umbrella",
    },
    {
        "id": "prototype:street-furniture:outdoor-table-set",
        "slug": "outdoor-table-set",
        "family": "street-furniture",
        "evidence": "observed-xingfuli",
        "instances": None,
        "builder": "build_table_set",
    },
    {
        "id": "prototype:street-furniture:slatted-bench",
        "slug": "slatted-bench",
        "family": "street-furniture",
        "evidence": "observed-xingfuli",
        "instances": None,
        "builder": "build_bench",
    },
    {
        "id": "prototype:street-furniture:rectangular-planter",
        "slug": "rectangular-planter",
        "family": "street-furniture",
        "evidence": "observed-xingfuli-and-road-edge",
        "instances": None,
        "builder": "build_planter",
    },
    {
        "id": "prototype:street-furniture:shanghai-dual-classification-bin",
        "slug": "shanghai-dual-classification-bin",
        "family": "street-furniture",
        "evidence": "observed-shanghai-public-bin-reference",
        "instances": None,
        "builder": "build_bin",
    },
    {
        "id": "prototype:street-furniture:irregular-stone-bollard",
        "slug": "irregular-stone-bollard",
        "family": "street-furniture",
        "evidence": "observed-xingfuli-panyu-entrance",
        "instances": None,
        "builder": "build_bollard",
    },
]


def parse_arguments() -> argparse.Namespace:
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset", help="只生成指定 slug；省略时生成全部")
    return parser.parse_args(arguments)


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(collection):
            if datablock.users == 0:
                collection.remove(datablock)


def create_material(slug: str) -> bpy.types.Material:
    digest = hashlib.sha256(slug.encode("utf8")).digest()
    material = bpy.data.materials.new(f"{slug}-massing-material")
    material.diffuse_color = (
        0.50 + digest[0] / 255 * 0.10,
        0.56 + digest[1] / 255 * 0.09,
        0.50 + digest[2] / 255 * 0.08,
        1.0,
    )
    material.roughness = 0.93
    material.metallic = 0.0
    return material


def add_cube(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def add_cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    vertices: int = 8,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def add_branch(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius: float,
) -> bpy.types.Object:
    start_vector = Vector(start)
    end_vector = Vector(end)
    direction = end_vector - start_vector
    midpoint = (start_vector + end_vector) * 0.5
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8,
        radius=radius,
        depth=direction.length,
        location=midpoint,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def add_ico(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=1,
        radius=1,
        location=location,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def add_cone(
    name: str,
    location: tuple[float, float, float],
    radius_one: float,
    radius_two: float,
    depth: float,
    vertices: int,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_one,
        radius2=radius_two,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def add_irregular_bollard() -> bpy.types.Object:
    width = authored_units(0.68)
    depth = authored_units(0.58)
    height = authored_units(0.58)
    vertices = [
        (-width * 0.55, -depth * 0.45, 0),
        (width * 0.50, -depth * 0.55, 0),
        (width * 0.57, depth * 0.48, 0),
        (-width * 0.48, depth * 0.55, 0),
        (-width * 0.42, -depth * 0.35, height * 0.92),
        (width * 0.35, -depth * 0.40, height),
        (width * 0.46, depth * 0.35, height * 0.88),
        (-width * 0.36, depth * 0.42, height * 0.96),
    ]
    faces = [
        (3, 2, 1, 0),
        (4, 5, 6, 7),
        (0, 1, 5, 4),
        (1, 2, 6, 5),
        (2, 3, 7, 6),
        (3, 0, 4, 7),
    ]
    mesh = bpy.data.meshes.new("irregular-stone-bollard-body-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new("irregular-stone-bollard-body", mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def join_parts(
    prototype: dict[str, Any],
    parts: list[bpy.types.Object],
    material: bpy.types.Material,
) -> bpy.types.Object:
    if not parts:
        raise RuntimeError(f"{prototype['slug']} 没有 Massing 几何")
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        if not part.data.materials:
            part.data.materials.append(material)
        else:
            part.data.materials.clear()
            part.data.materials.append(material)
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = f"{prototype['slug']}-massing"
    obj.data.name = f"{prototype['slug']}-massing-mesh"
    obj["asset_id"] = prototype["id"]
    obj["tier"] = "massing"
    obj["family"] = prototype["family"]
    obj["evidence"] = prototype["evidence"]
    obj["authored_meters_per_scene_unit"] = 2.7
    obj["identity_allowed"] = False
    return obj


def tree_parts(
    slug: str,
    trunk_radius: float,
    trunk_height: float,
    crown_specs: list[tuple[tuple[float, float, float], tuple[float, float, float]]],
) -> list[bpy.types.Object]:
    parts = [
        add_cylinder(
            f"{slug}-trunk",
            (0, 0, trunk_height * 0.5),
            trunk_radius,
            trunk_height,
            8,
        ),
    ]
    for index, (location, scale) in enumerate(crown_specs):
        parts.append(add_ico(f"{slug}-crown-{index}", location, scale))
    return parts


def build_xinhua_plane_tree() -> list[bpy.types.Object]:
    parts = tree_parts(
        "xinhua-plane-tree",
        0.22,
        3.8,
        [
            ((-0.68, 0.05, 4.25), (1.25, 1.0, 1.25)),
            ((0.62, -0.18, 4.55), (1.38, 1.08, 1.18)),
            ((0.05, 0.38, 5.15), (1.18, 1.22, 1.10)),
        ],
    )
    parts.extend(
        [
            add_branch(
                "xinhua-plane-tree-left-fork",
                (0, 0, 2.75),
                (-0.68, 0.05, 4.05),
                0.14,
            ),
            add_branch(
                "xinhua-plane-tree-right-fork",
                (0, 0, 2.82),
                (0.62, -0.18, 4.30),
                0.13,
            ),
        ]
    )
    return parts


def build_shangsheng_tree() -> list[bpy.types.Object]:
    return tree_parts(
        "shangsheng-campus-tree",
        0.18,
        3.15,
        [
            ((-0.50, 0.04, 3.55), (1.05, 0.90, 1.05)),
            ((0.48, -0.22, 3.80), (1.12, 0.95, 1.00)),
            ((0.12, 0.34, 4.35), (0.92, 1.00, 0.88)),
        ],
    )


def build_huashan_tree() -> list[bpy.types.Object]:
    return tree_parts(
        "huashan-canopy-tree",
        0.28,
        3.35,
        [
            ((-0.92, 0.08, 3.75), (1.55, 1.18, 1.20)),
            ((0.90, -0.10, 3.82), (1.58, 1.20, 1.18)),
            ((0.05, 0.45, 4.48), (1.42, 1.35, 1.10)),
        ],
    )


def build_understory() -> list[bpy.types.Object]:
    return [
        add_ico("huashan-understory-left", (-0.28, 0.05, 0.24), (0.56, 0.46, 0.24)),
        add_ico("huashan-understory-right", (0.30, -0.08, 0.25), (0.50, 0.44, 0.25)),
        add_ico("huashan-understory-top", (0.02, 0.14, 0.43), (0.40, 0.36, 0.18)),
    ]


def build_road_shrub() -> list[bpy.types.Object]:
    return [
        add_ico("road-edge-shrub-far-left", (-0.26, 0.03, 0.11), (0.24, 0.14, 0.11)),
        add_ico("road-edge-shrub-left", (-0.09, -0.04, 0.14), (0.23, 0.15, 0.14)),
        add_ico("road-edge-shrub-right", (0.10, 0.03, 0.13), (0.24, 0.14, 0.13)),
        add_ico("road-edge-shrub-far-right", (0.28, -0.02, 0.10), (0.21, 0.13, 0.10)),
    ]


def build_lane_lamp() -> list[bpy.types.Object]:
    return [
        add_cylinder(
            "lane-lamp-pole",
            (0, 0, authored_units(1.68)),
            authored_units(0.07),
            authored_units(3.36),
            8,
        ),
        add_cylinder(
            "lane-lamp-arm",
            (authored_units(0.24), 0, authored_units(3.18)),
            authored_units(0.045),
            authored_units(0.50),
            8,
            (0, math.pi / 2, 0),
        ),
        add_cone(
            "lane-lamp-head",
            (authored_units(0.50), 0, authored_units(3.05)),
            authored_units(0.13),
            authored_units(0.19),
            authored_units(0.30),
            8,
        ),
    ]


def build_umbrella() -> list[bpy.types.Object]:
    return [
        add_cylinder(
            "umbrella-side-pole",
            (authored_units(-1.18), 0, authored_units(1.22)),
            authored_units(0.075),
            authored_units(2.44),
            8,
        ),
        add_cylinder(
            "umbrella-arm",
            (authored_units(-0.43), 0, authored_units(2.38)),
            authored_units(0.045),
            authored_units(1.50),
            8,
            (0, math.pi / 2, 0),
        ),
        add_cylinder(
            "umbrella-brace",
            (authored_units(-0.80), 0, authored_units(1.93)),
            authored_units(0.035),
            authored_units(1.02),
            8,
            (0, -0.70, 0),
        ),
        add_cone(
            "umbrella-canopy",
            (authored_units(0.32), 0, authored_units(2.36)),
            authored_units(1.78),
            0,
            authored_units(0.42),
            4,
        ),
        add_cylinder(
            "umbrella-base",
            (authored_units(-1.18), 0, authored_units(0.08)),
            authored_units(0.31),
            authored_units(0.16),
            8,
        ),
    ]


def build_table_set() -> list[bpy.types.Object]:
    parts = [
        add_cylinder(
            "table-top",
            (0, 0, authored_units(0.66)),
            authored_units(0.62),
            authored_units(0.10),
            12,
        ),
        add_cylinder(
            "table-pedestal",
            (0, 0, authored_units(0.34)),
            authored_units(0.07),
            authored_units(0.62),
            8,
        ),
    ]
    chairs = [
        (-0.92, 0, -0.24, 0, "side"),
        (0.92, 0, 0.24, 0, "side"),
        (0, 0.86, 0, 0.24, "front"),
        (0, -0.86, 0, -0.24, "front"),
    ]
    for index, (x, y, back_x, back_y, orientation) in enumerate(chairs):
        parts.extend(
            [
                add_cube(
                    f"chair-{index}-seat",
                    (
                        authored_units(x),
                        authored_units(y),
                        authored_units(0.46),
                    ),
                    (
                        authored_units(0.52),
                        authored_units(0.52),
                        authored_units(0.10),
                    ),
                ),
                add_cube(
                    f"chair-{index}-back",
                    (
                        authored_units(x + back_x),
                        authored_units(y + back_y),
                        authored_units(0.78),
                    ),
                    (
                        authored_units(0.08 if orientation == "side" else 0.52),
                        authored_units(0.52 if orientation == "side" else 0.08),
                        authored_units(0.58),
                    ),
                ),
                add_cube(
                    f"chair-{index}-base",
                    (
                        authored_units(x),
                        authored_units(y),
                        authored_units(0.23),
                    ),
                    (
                        authored_units(0.42),
                        authored_units(0.38),
                        authored_units(0.46),
                    ),
                ),
            ]
        )
    return parts


def build_bench() -> list[bpy.types.Object]:
    return [
        add_cube(
            "bench-seat",
            (0, 0, authored_units(0.48)),
            (authored_units(2.08), authored_units(0.62), authored_units(0.18)),
        ),
        add_cube(
            "bench-back",
            (0, authored_units(0.28), authored_units(0.78)),
            (authored_units(2.08), authored_units(0.12), authored_units(0.48)),
        ),
        add_cube(
            "bench-left-foot",
            (authored_units(-0.82), 0, authored_units(0.25)),
            (authored_units(0.12), authored_units(0.58), authored_units(0.50)),
        ),
        add_cube(
            "bench-right-foot",
            (authored_units(0.82), 0, authored_units(0.25)),
            (authored_units(0.12), authored_units(0.58), authored_units(0.50)),
        ),
    ]


def build_planter() -> list[bpy.types.Object]:
    return [
        add_cube(
            "planter-container",
            (0, 0, authored_units(0.31)),
            (authored_units(1.40), authored_units(0.54), authored_units(0.62)),
        ),
        add_ico(
            "planter-foliage-left",
            (authored_units(-0.35), 0, authored_units(0.88)),
            (authored_units(0.55), authored_units(0.42), authored_units(0.46)),
        ),
        add_ico(
            "planter-foliage-right",
            (authored_units(0.35), 0, authored_units(0.94)),
            (authored_units(0.60), authored_units(0.44), authored_units(0.50)),
        ),
    ]


def build_bin() -> list[bpy.types.Object]:
    return [
        add_cube(
            "bin-body",
            (0, 0, authored_units(0.41)),
            (authored_units(0.82), authored_units(0.40), authored_units(0.82)),
        ),
        add_cube(
            "bin-cap",
            (0, 0, authored_units(0.87)),
            (authored_units(0.90), authored_units(0.46), authored_units(0.10)),
        ),
        add_cube(
            "bin-left-opening",
            (
                authored_units(-0.205),
                authored_units(-0.215),
                authored_units(0.73),
            ),
            (authored_units(0.25), authored_units(0.03), authored_units(0.11)),
        ),
        add_cube(
            "bin-right-opening",
            (
                authored_units(0.205),
                authored_units(-0.215),
                authored_units(0.73),
            ),
            (authored_units(0.25), authored_units(0.03), authored_units(0.11)),
        ),
    ]


def build_bollard() -> list[bpy.types.Object]:
    return [add_irregular_bollard()]


BUILDERS: dict[str, Callable[[], list[bpy.types.Object]]] = {
    name: value
    for name, value in globals().copy().items()
    if name.startswith("build_") and callable(value)
}


def scene_bounds(obj: bpy.types.Object) -> tuple[Vector, Vector]:
    minimum = Vector((math.inf, math.inf, math.inf))
    maximum = Vector((-math.inf, -math.inf, -math.inf))
    for corner in obj.bound_box:
        point = obj.matrix_world @ Vector(corner)
        minimum.x = min(minimum.x, point.x)
        minimum.y = min(minimum.y, point.y)
        minimum.z = min(minimum.z, point.z)
        maximum.x = max(maximum.x, point.x)
        maximum.y = max(maximum.y, point.y)
        maximum.z = max(maximum.z, point.z)
    return minimum, maximum


def configure_scene(prototype: dict[str, Any]) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.display.shading.background_type = "WORLD"
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (0.035, 0.043, 0.045)
    scene["asset_id"] = prototype["id"]
    scene["tier"] = "massing"
    scene["model_brief"] = BRIEF_PATH
    scene["authored_meters_per_scene_unit"] = AUTHORED_METERS_PER_SCENE_UNIT


def add_preview_ground(obj: bpy.types.Object) -> bpy.types.Object:
    minimum, maximum = scene_bounds(obj)
    span = max(maximum.x - minimum.x, maximum.y - minimum.y, 1.6)
    bpy.ops.mesh.primitive_plane_add(size=span * 2.4, location=(0, 0, -0.025))
    ground = bpy.context.active_object
    ground.name = "test-preview-ground"
    material = bpy.data.materials.new("test-preview-ground-material")
    material.diffuse_color = (0.14, 0.17, 0.18, 1)
    ground.data.materials.append(material)
    return ground


def add_preview_camera(
    obj: bpy.types.Object,
    direction: str,
) -> bpy.types.Object:
    minimum, maximum = scene_bounds(obj)
    center = (minimum + maximum) * 0.5
    width = maximum.x - minimum.x
    depth = maximum.y - minimum.y
    height = maximum.z - minimum.z
    span = max(width, depth, height, 1.0)
    offset = (
        Vector((span * 1.15, -span * 1.45, span * 0.92))
        if direction == "canonical"
        else Vector((-span * 1.35, -span * 0.78, span * 0.72))
    )
    bpy.ops.object.camera_add(location=center + offset)
    camera = bpy.context.active_object
    camera.name = f"test-{direction}-camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = span * 1.42
    target = center + Vector((0, 0, height * 0.03))
    camera.rotation_euler = (
        target - camera.location
    ).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera
    return camera


def render_preview(
    obj: bpy.types.Object,
    direction: str,
    path: Path,
) -> None:
    old_camera = bpy.context.scene.camera
    camera = add_preview_camera(obj, direction)
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)
    bpy.context.scene.camera = old_camera


def export_glb(path: Path, obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
    )


def parse_glb(path: Path) -> dict[str, Any]:
    contents = path.read_bytes()
    if contents[:4] != b"glTF" or struct.unpack_from("<I", contents, 4)[0] != 2:
        raise RuntimeError(f"{path} 不是 glTF 2.0 GLB")
    json_length = struct.unpack_from("<I", contents, 12)[0]
    json_type = struct.unpack_from("<I", contents, 16)[0]
    if json_type != 0x4E4F534A:
        raise RuntimeError(f"{path} 缺少 JSON 数据块")
    gltf = json.loads(contents[20 : 20 + json_length].decode("utf8"))
    triangles = 0
    bounds_min = [math.inf, math.inf, math.inf]
    bounds_max = [-math.inf, -math.inf, -math.inf]
    for mesh in gltf.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            accessor_index = primitive.get("indices")
            if accessor_index is None:
                accessor_index = primitive["attributes"]["POSITION"]
            triangles += gltf["accessors"][accessor_index]["count"] // 3
            accessor = gltf["accessors"][primitive["attributes"]["POSITION"]]
            for axis in range(3):
                bounds_min[axis] = min(bounds_min[axis], accessor["min"][axis])
                bounds_max[axis] = max(bounds_max[axis], accessor["max"][axis])
    transformed_nodes = [
        node.get("name")
        for node in gltf.get("nodes", [])
        if any(key in node for key in ("translation", "rotation", "scale", "matrix"))
    ]
    return {
        "sha256": file_sha256(path),
        "bytes": len(contents),
        "nodes": len(gltf.get("nodes", [])),
        "meshes": len(gltf.get("meshes", [])),
        "materials": len(gltf.get("materials", [])),
        "images": len(gltf.get("images", [])),
        "textures": len(gltf.get("textures", [])),
        "triangles": triangles,
        "bounds": {
            "min": [round(value, 6) for value in bounds_min],
            "max": [round(value, 6) for value in bounds_max],
        },
        "transformedNodes": transformed_nodes,
    }


def generate(prototype: dict[str, Any]) -> dict[str, Any]:
    reset_scene()
    configure_scene(prototype)
    material = create_material(prototype["slug"])
    builder = BUILDERS[prototype["builder"]]
    obj = join_parts(prototype, builder(), material)

    slug = prototype["slug"]
    blend_path = SOURCE_DIR / f"{slug}-massing.blend"
    glb_path = RUNTIME_DIR / f"{slug}-massing.glb"
    canonical_path = PREVIEW_DIR / f"test_{slug}-massing-canonical.png"
    side_path = PREVIEW_DIR / f"test_{slug}-massing-side.png"
    record_path = RECORD_DIR / f"{slug}-massing.json"

    export_glb(glb_path, obj)
    audit = parse_glb(glb_path)
    if audit["transformedNodes"]:
        raise RuntimeError(f"{slug} GLB 根变换不为空")
    if audit["images"] or audit["textures"]:
        raise RuntimeError(f"{slug} Massing 不允许图片或贴图")
    if audit["bytes"] >= 80_000 or audit["triangles"] >= 500:
        raise RuntimeError(f"{slug} 超出 Massing 预算：{audit}")

    add_preview_ground(obj)
    render_preview(obj, "canonical", canonical_path)
    render_preview(obj, "side", side_path)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    record = {
        "version": 1,
        "auditedAt": AUDITED_AT,
        "assetId": prototype["id"],
        "slug": slug,
        "family": prototype["family"],
        "tier": "massing",
        "status": "blender-glb-generated-runtime-gate-pending",
        "modelBrief": BRIEF_PATH,
        "generator": "scripts/create_shared_prototype_massing_models.py",
        "evidence": prototype["evidence"],
        "instanceCount": prototype["instances"],
        "outputs": {
            "blend": str(blend_path.relative_to(ROOT)),
            "glb": str(glb_path.relative_to(ROOT)),
            "previews": {
                "canonical": str(canonical_path.relative_to(ROOT)),
                "side": str(side_path.relative_to(ROOT)),
            },
        },
        "glb": audit,
        "runtimeGate": "pending-qaSharedPrototypeTier=massing",
        "identityAllowed": False,
        "qualityBoundary": {
            "observed": [
                "prototype envelope and current runtime scale language",
            ],
            "inferred": [
                "simplified massing component dimensions",
            ],
            "unknown": [
                "manufacturer or species where not explicitly confirmed",
                "surveyed dimensions",
                "current per-instance field condition",
            ],
        },
    }
    record_path.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )
    return record


def main() -> None:
    args = parse_arguments()
    for directory in (SOURCE_DIR, RUNTIME_DIR, PREVIEW_DIR, RECORD_DIR):
        directory.mkdir(parents=True, exist_ok=True)
    selected = [
        prototype
        for prototype in PROTOTYPES
        if args.asset is None or prototype["slug"] == args.asset
    ]
    if not selected:
        raise ValueError(f"未知 prototype slug：{args.asset}")
    records = [generate(prototype) for prototype in selected]

    if args.asset is None:
        manifest = {
            "version": 1,
            "generatedAt": AUDITED_AT,
            "status": "massing-generated-runtime-gate-pending",
            "modelBrief": BRIEF_PATH,
            "generator": "scripts/create_shared_prototype_massing_models.py",
            "prototypeCount": len(records),
            "familyCounts": {
                "vegetation": sum(
                    record["family"] == "vegetation" for record in records
                ),
                "streetFurniture": sum(
                    record["family"] == "street-furniture" for record in records
                ),
            },
            "totalGlbBytes": sum(record["glb"]["bytes"] for record in records),
            "totalTriangles": sum(
                record["glb"]["triangles"] for record in records
            ),
            "runtimeGate": "pending-qaSharedPrototypeTier=massing",
            "identityAllowed": False,
            "assets": records,
        }
        MANIFEST_PATH.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf8",
        )


if __name__ == "__main__":
    main()
