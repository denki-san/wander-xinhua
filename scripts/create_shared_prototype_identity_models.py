"""生成已获准进入 Identity 的 8 个共享原型资产。"""

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
MASSING_MANIFEST_PATH = (
    ROOT / "docs/research/shared-prototypes-massing-manifest.json"
)
INDEPENDENT_REVIEW_PATH = (
    ROOT / "docs/research/shared-prototypes-massing-independent-review-final.md"
)
SOURCE_DIR = ROOT / "assets/models/source/tiers/shared-prototypes/identity"
RUNTIME_DIR = ROOT / "public/models/tiers/shared-prototypes/identity"
PREVIEW_DIR = ROOT / "test_artifacts/all-models/identity/shared-prototypes"
RECORD_DIR = (
    ROOT / "docs/research/build-records/tiers/shared-prototypes/identity"
)
MANIFEST_PATH = ROOT / "docs/research/shared-prototypes-identity-manifest.json"
BRIEF_PATH = "docs/research/shared-prototypes-identity-model-brief.md"
GENERATOR_PATH = "scripts/create_shared_prototype_identity_models.py"
AUDITED_AT = "2026-07-25"
AUTHORED_METERS_PER_SCENE_UNIT = 2.7

COLORS = {
    "bark": (0.36, 0.31, 0.24, 1.0),
    "bark-pale": (0.67, 0.65, 0.50, 1.0),
    "foliage": (0.25, 0.40, 0.23, 1.0),
    "fruit": (0.24, 0.17, 0.12, 1.0),
    "metal": (0.13, 0.17, 0.16, 1.0),
    "warm": (0.95, 0.68, 0.30, 1.0),
    "red": (0.62, 0.16, 0.20, 1.0),
    "wood": (0.45, 0.29, 0.18, 1.0),
    "light": (0.77, 0.75, 0.69, 1.0),
    "planter": (0.20, 0.24, 0.22, 1.0),
    "stainless": (0.45, 0.48, 0.46, 1.0),
    "teal": (0.05, 0.46, 0.50, 1.0),
    "blue": (0.06, 0.34, 0.64, 1.0),
    "black": (0.04, 0.06, 0.06, 1.0),
    "stone": (0.22, 0.23, 0.22, 1.0),
}

PLANE_REFERENCES = [
    "research/references/plane-tree/plane-tree-canonical.jpg",
    "research/references/plane-tree/plane-tree-avenue.jpg",
    "research/references/plane-tree/plane-tree-bark.jpg",
    "research/plane-tree-reference-metadata.json",
]
XINGFULI_REFERENCES = [
    "docs/research/assets/poi-references/xingfuli/courtyard-canonical.jpg",
    "docs/research/assets/poi-references/xingfuli/water-lane.jpg",
    "docs/research/xingfuli-reference-manifest.json",
]


def street_prototype(
    slug: str,
    evidence: str,
    observed: list[str],
    recognizers: list[str],
    sources: list[str] | None = None,
    max_triangles: int = 2500,
) -> dict[str, Any]:
    return {
        "id": f"prototype:street-furniture:{slug}",
        "slug": slug,
        "family": "street-furniture",
        "evidence": evidence,
        "observed": observed,
        "inferred": [
            "Identity dimensions refine the formally accepted Massing envelope.",
            "Hidden fasteners and rear construction remain conservative.",
        ],
        "unknown": [
            "manufacturer and product model",
            "surveyed dimensions",
            "2026-later per-instance field condition",
        ],
        "recognizers": recognizers,
        "sources": sources or XINGFULI_REFERENCES,
        "budget": {
            "maxTriangles": max_triangles,
            "maxNodes": 4,
            "maxMaterials": 4,
            "maxImages": 0,
            "maxBinaryBytes": 262144,
        },
    }


PROTOTYPES = [
    {
        "id": "prototype:vegetation:xinhua-plane-tree",
        "slug": "xinhua-plane-tree",
        "family": "vegetation",
        "evidence": "confirmed-plane-tree",
        "observed": [
            "Pale mottled trunk, raised multi-way fork and broad asymmetric crown are directly supported.",
            "Avenue evidence supports raised street crowns and visible scaffold branches.",
        ],
        "inferred": [
            "Branch layout is an original deterministic species archetype, not one surveyed individual.",
            "Crown gaps and foliage clusters are simplified for Identity distance.",
        ],
        "unknown": [
            "individual age, DBH and measured height",
            "per-instance pruning history and health",
            "2026-later field condition",
        ],
        "recognizers": [
            "continuous tapered trunk",
            "high five-way primary fork",
            "asymmetric crown gaps",
            "pale exfoliating bark patches",
            "sparse hanging seed balls",
        ],
        "sources": PLANE_REFERENCES,
        "budget": {
            "maxTriangles": 6000,
            "maxNodes": 4,
            "maxMaterials": 4,
            "maxImages": 0,
            "maxBinaryBytes": 786432,
        },
    },
    street_prototype(
        "lane-lamp-short-arm",
        "observed-xingfuli-and-street-context",
        ["A slim dark pole, one short side arm and one downward lamp head are visible."],
        ["slim pole", "single short arm", "downward head with warm lens"],
    ),
    street_prototype(
        "cantilever-umbrella",
        "observed-xingfuli",
        ["Xingfuli photos show red square cafe umbrellas carried from an offset side pole."],
        ["offset side pole", "horizontal cantilever and diagonal brace", "red four-slope square canopy"],
    ),
    street_prototype(
        "outdoor-table-set",
        "observed-xingfuli",
        ["Xingfuli photos support a round table with seats distributed around it."],
        ["round tabletop", "central pedestal", "four independent chairs with readable backs"],
    ),
    street_prototype(
        "slatted-bench",
        "observed-xingfuli",
        ["Xingfuli site evidence supports a backed outdoor bench within the shared palette."],
        ["multiple seat slats", "separated back slats", "two dark metal support frames"],
    ),
    street_prototype(
        "rectangular-planter",
        "observed-xingfuli-and-road-edge",
        ["Xingfuli and road-edge photos support dark containers with raised planting silhouettes."],
        ["rectangular container", "raised rim and recessed soil", "three unequal foliage clusters"],
    ),
    street_prototype(
        "shanghai-dual-classification-bin",
        "observed-shanghai-public-bin-reference",
        ["The Shanghai reference shows a stainless frame, two top openings and two front classification zones."],
        ["stainless perimeter frame", "two dark top openings", "two differently coloured front compartments"],
        [
            "docs/research/assets/shanghai-street-bin-weihai-2023-reference.jpg",
            "docs/research/street-surface-refinement-reference-manifest.json",
        ],
    ),
    street_prototype(
        "irregular-stone-bollard",
        "observed-xingfuli-panyu-entrance",
        ["The Panyu entrance photo shows a row of dark, broad, knee-height, slightly irregular stone blocks."],
        ["broad knee-height body", "unequal faceted sides", "slightly sloped irregular top"],
        [
            "docs/research/assets/poi-references/xingfuli/xingfuli-panyu-entrance-shanghai-changning-2018.jpeg",
            "docs/research/xingfuli-reference-manifest.json",
        ],
    ),
]


def parse_arguments() -> argparse.Namespace:
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset", help="只生成一个获准 Identity 的 slug")
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


def material(name: str, key: str) -> bpy.types.Material:
    value = bpy.data.materials.new(f"{name}-{key}-identity-material")
    color = COLORS[key]
    roughness = 0.88 if key not in {"metal", "stainless"} else 0.42
    metallic = 0.0 if key not in {"metal", "stainless"} else 0.55
    value.diffuse_color = color
    value.roughness = roughness
    value.metallic = metallic
    # Blender 预览使用 diffuse_color，但 glTF exporter 以节点中的
    # Principled BSDF 为准；两处必须同步，避免运行时退化成默认 0.8 灰。
    value.use_nodes = True
    principled = value.node_tree.nodes.get("Principled BSDF")
    if principled is None:
        raise RuntimeError(f"{value.name} 缺少 Principled BSDF")
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = metallic
    return value


def add_cube(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    rotation: tuple[float, float, float] = (0, 0, 0),
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
    vertices: int = 10,
    rotation: tuple[float, float, float] = (0, 0, 0),
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


def add_cone(
    name: str,
    location: tuple[float, float, float],
    radius_one: float,
    radius_two: float,
    depth: float,
    vertices: int = 10,
    rotation: tuple[float, float, float] = (0, 0, 0),
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


def add_ico(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    subdivisions: int = 1,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions,
        radius=1,
        location=location,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def add_tapered_branch(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius_start: float,
    radius_end: float,
    vertices: int = 8,
) -> bpy.types.Object:
    start_vector = Vector(start)
    end_vector = Vector(end)
    direction = end_vector - start_vector
    midpoint = (start_vector + end_vector) * 0.5
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_start,
        radius2=radius_end,
        depth=direction.length,
        location=midpoint,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def add_torus(
    name: str,
    location: tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=16,
        minor_segments=4,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def add_irregular_bollard() -> bpy.types.Object:
    vertices = [
        (-0.34, -0.27, 0),
        (0.32, -0.31, 0),
        (0.37, 0.25, 0),
        (-0.29, 0.30, 0),
        (-0.27, -0.22, 0.50),
        (0.23, -0.26, 0.56),
        (0.31, 0.20, 0.51),
        (-0.24, 0.24, 0.54),
    ]
    faces = [
        (3, 2, 1, 0),
        (4, 5, 6, 7),
        (0, 1, 5, 4),
        (1, 2, 6, 5),
        (2, 3, 7, 6),
        (3, 0, 4, 7),
    ]
    mesh = bpy.data.meshes.new("irregular-stone-bollard-identity-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new("irregular-stone-bollard-body", mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def join_group(
    slug: str,
    group_name: str,
    parts: list[bpy.types.Object],
    group_material: bpy.types.Material,
) -> bpy.types.Object:
    if not parts:
        raise RuntimeError(f"{slug}:{group_name} 没有几何")
    for part in parts:
        part.data.materials.clear()
        part.data.materials.append(group_material)
    if len(parts) == 1:
        obj = parts[0]
    else:
        bpy.ops.object.select_all(action="DESELECT")
        for part in parts:
            part.select_set(True)
        bpy.context.view_layer.objects.active = parts[0]
        bpy.ops.object.join()
        obj = bpy.context.active_object
    obj.name = f"{slug}-{group_name}-identity"
    obj.data.name = f"{slug}-{group_name}-identity-mesh"
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def build_plane_tree(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    bark = [
        add_tapered_branch("plane-trunk-lower", (0, 0, 0), (0.04, 0.02, 2.6), 0.42, 0.31, 10),
        add_tapered_branch("plane-trunk-upper", (0.04, 0.02, 2.6), (0.10, 0.04, 3.55), 0.31, 0.23, 10),
    ]
    roots = [
        ((0, 0, 0.18), (0.85, 0.12, 0.03)),
        ((0, 0, 0.18), (-0.72, 0.34, 0.03)),
        ((0, 0, 0.16), (0.20, -0.82, 0.03)),
        ((0, 0, 0.16), (-0.44, -0.62, 0.03)),
        ((0, 0, 0.15), (0.52, 0.58, 0.03)),
    ]
    for index, (start, end) in enumerate(roots):
        bark.append(add_tapered_branch(f"plane-root-{index}", start, end, 0.18, 0.03, 6))
    fork_specs = [
        ((0.10, 0.04, 3.40), (-1.35, 0.18, 5.18)),
        ((0.10, 0.04, 3.45), (1.28, -0.12, 5.28)),
        ((0.10, 0.04, 3.48), (-0.38, -1.20, 5.05)),
        ((0.10, 0.04, 3.50), (0.42, 1.14, 5.22)),
        ((0.10, 0.04, 3.52), (0.18, 0.12, 5.80)),
    ]
    tips: list[tuple[float, float, float]] = []
    for index, (start, end) in enumerate(fork_specs):
        bark.append(add_tapered_branch(f"plane-major-{index}", start, end, 0.22, 0.10, 8))
        tips.append(end)
        end_vector = Vector(end)
        for branch_index, angle in enumerate((-0.58, 0.62)):
            direction = Vector(
                (
                    math.cos(index * 1.26 + angle),
                    math.sin(index * 1.26 + angle),
                    0.70 + branch_index * 0.08,
                )
            ).normalized()
            child_end = end_vector + direction * (1.05 + index * 0.04)
            bark.append(
                add_tapered_branch(
                    f"plane-secondary-{index}-{branch_index}",
                    end,
                    tuple(child_end),
                    0.105,
                    0.035,
                    7,
                )
            )
            tips.append(tuple(child_end))
    pale = [
        add_cube("plane-bark-patch-front-0", (0.06, -0.39, 0.78), (0.23, 0.035, 0.48), (0, 0.08, 0.06)),
        add_cube("plane-bark-patch-front-1", (-0.09, -0.34, 1.48), (0.19, 0.035, 0.38), (0, -0.10, -0.08)),
        add_cube("plane-bark-patch-front-2", (0.08, -0.31, 2.18), (0.18, 0.035, 0.44), (0, 0.06, 0.05)),
        add_cube("plane-bark-patch-front-3", (-0.06, -0.27, 2.82), (0.15, 0.035, 0.32), (0, -0.08, -0.04)),
        add_cube("plane-bark-patch-side-0", (0.39, 0.01, 1.16), (0.035, 0.20, 0.34), (0, 0.06, 0.04)),
        add_cube("plane-bark-patch-side-1", (-0.33, 0.02, 1.92), (0.035, 0.17, 0.30), (0, -0.07, -0.05)),
    ]
    foliage_centres = [
        (-1.55, 0.12, 5.45, 1.22, 0.90, 0.82),
        (1.45, -0.18, 5.48, 1.28, 0.96, 0.86),
        (-0.42, -1.35, 5.38, 1.12, 0.86, 0.78),
        (0.55, 1.30, 5.45, 1.10, 0.88, 0.80),
        (0.15, 0.12, 6.18, 1.22, 1.03, 0.84),
        (-0.65, 0.56, 5.88, 0.92, 0.82, 0.68),
        (0.78, -0.62, 5.94, 0.96, 0.84, 0.72),
    ]
    foliage = [
        add_ico(f"plane-crown-{index}", (x, y, z), (sx, sy, sz), 1)
        for index, (x, y, z, sx, sy, sz) in enumerate(foliage_centres)
    ]
    fruit: list[bpy.types.Object] = []
    for index, (x, y, z) in enumerate(((-1.0, -0.3, 4.88), (0.92, 0.42, 5.05), (0.15, -0.82, 5.22))):
        fruit.extend(
            [
                add_tapered_branch(f"plane-fruit-stem-{index}", (x, y, z + 0.34), (x, y, z), 0.018, 0.012, 5),
                add_ico(f"plane-fruit-{index}", (x, y, z - 0.08), (0.12, 0.12, 0.12), 1),
            ]
        )
    return {"bark": bark, "bark-pale": pale, "foliage": foliage, "fruit": fruit}


def build_lamp(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    metal = [
        add_cylinder("lamp-pole", (0, 0, 0.62), 0.027, 1.24, 10),
        add_cylinder("lamp-arm", (0.10, 0, 1.18), 0.018, 0.20, 8, (0, math.pi / 2, 0)),
        add_cone("lamp-head", (0.20, 0, 1.13), 0.085, 0.060, 0.14, 8),
        add_cylinder("lamp-base", (0, 0, 0.035), 0.065, 0.07, 10),
    ]
    warm = [add_cylinder("lamp-lens", (0.20, 0, 1.055), 0.055, 0.012, 10)]
    return {"metal": metal, "warm": warm}


def build_umbrella(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    metal = [
        add_cylinder("umbrella-side-pole", (-0.44, 0, 0.46), 0.030, 0.92, 10),
        add_cylinder("umbrella-arm", (-0.16, 0, 0.90), 0.020, 0.56, 8, (0, math.pi / 2, 0)),
        add_tapered_branch("umbrella-brace", (-0.44, 0, 0.55), (0.05, 0, 0.90), 0.025, 0.018, 8),
        add_cylinder("umbrella-base", (-0.44, 0, 0.04), 0.13, 0.08, 10),
    ]
    red = [
        add_cone("umbrella-canopy", (0.22, 0, 0.91), 0.66, 0.04, 0.18, 4, (0, 0, math.pi / 4)),
        add_cube("umbrella-canopy-rib-x", (0.22, 0, 0.84), (0.82, 0.035, 0.035)),
        add_cube("umbrella-canopy-rib-y", (0.22, 0, 0.84), (0.035, 0.82, 0.035)),
    ]
    return {"metal": metal, "red": red}


def build_table(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    wood = [
        add_cylinder("table-top", (0, 0, 0.25), 0.24, 0.035, 16),
    ]
    metal = [
        add_cylinder("table-pedestal", (0, 0, 0.13), 0.025, 0.24, 8),
        add_cylinder("table-foot", (0, 0, 0.025), 0.13, 0.03, 10),
    ]
    for index, (x, y, yaw) in enumerate(
        [(-0.34, 0, 0), (0.34, 0, math.pi), (0, -0.34, math.pi / 2), (0, 0.34, -math.pi / 2)]
    ):
        wood.extend(
            [
                add_cube(f"chair-seat-{index}", (x, y, 0.17), (0.18, 0.18, 0.035), (0, 0, yaw)),
                add_cube(
                    f"chair-back-{index}",
                    (
                        x + math.cos(yaw) * 0.085,
                        y + math.sin(yaw) * 0.085,
                        0.30,
                    ),
                    (0.035, 0.18, 0.22),
                    (0, 0, yaw),
                ),
            ]
        )
        metal.append(add_cylinder(f"chair-foot-{index}", (x, y, 0.085), 0.020, 0.17, 8))
    return {"wood": wood, "metal": metal}


def build_bench(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    wood: list[bpy.types.Object] = []
    for index in range(5):
        wood.append(
            add_cube(
                f"bench-seat-slat-{index}",
                (0, -0.11 + index * 0.055, 0.18),
                (0.77, 0.045, 0.035),
            )
        )
    for index in range(4):
        wood.append(
            add_cube(
                f"bench-back-slat-{index}",
                (0, 0.12, 0.28 + index * 0.055),
                (0.77, 0.035, 0.045),
            )
        )
    metal = [
        add_cube("bench-left-frame", (-0.31, 0, 0.14), (0.035, 0.30, 0.28)),
        add_cube("bench-right-frame", (0.31, 0, 0.14), (0.035, 0.30, 0.28)),
        add_cube("bench-back-rail", (0, 0.135, 0.35), (0.67, 0.025, 0.025)),
    ]
    return {"wood": wood, "metal": metal}


def build_planter(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    container = [
        add_cube("planter-body", (0, 0, 0.115), (0.52, 0.22, 0.23)),
        add_cube("planter-rim-front", (0, -0.115, 0.23), (0.58, 0.035, 0.045)),
        add_cube("planter-rim-back", (0, 0.115, 0.23), (0.58, 0.035, 0.045)),
        add_cube("planter-rim-left", (-0.275, 0, 0.23), (0.035, 0.20, 0.045)),
        add_cube("planter-rim-right", (0.275, 0, 0.23), (0.035, 0.20, 0.045)),
        add_cube("planter-soil", (0, 0, 0.245), (0.50, 0.18, 0.025)),
    ]
    foliage = [
        add_ico("planter-foliage-left", (-0.17, 0, 0.40), (0.20, 0.14, 0.18), 1),
        add_ico("planter-foliage-center", (0, 0.01, 0.48), (0.22, 0.16, 0.24), 1),
        add_ico("planter-foliage-right", (0.18, -0.01, 0.39), (0.18, 0.13, 0.17), 1),
    ]
    return {"planter": container, "foliage": foliage}


def build_bin(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    frame = [
        add_cube("bin-body", (0, 0, 0.17), (0.34, 0.18, 0.34)),
        add_cube("bin-cap", (0, 0, 0.35), (0.36, 0.20, 0.045)),
        add_cube("bin-divider", (0, -0.096, 0.17), (0.025, 0.025, 0.31)),
        add_cube("bin-base", (0, 0, 0.025), (0.37, 0.21, 0.05)),
    ]
    left_compartment = [
        add_cube("bin-left-door", (-0.087, -0.096, 0.17), (0.14, 0.025, 0.26)),
    ]
    right_compartment = [
        add_cube("bin-right-door", (0.087, -0.096, 0.17), (0.14, 0.025, 0.26)),
    ]
    openings = [
        add_cube("bin-left-opening", (-0.087, -0.108, 0.315), (0.105, 0.020, 0.055)),
        add_cube("bin-right-opening", (0.087, -0.108, 0.315), (0.105, 0.020, 0.055)),
    ]
    return {
        "stainless": frame,
        "teal": left_compartment,
        "blue": right_compartment,
        "black": openings,
    }


def build_bollard(_: dict[str, Any]) -> dict[str, list[bpy.types.Object]]:
    return {"stone": [add_irregular_bollard()]}


BUILDERS: dict[str, Callable[[dict[str, Any]], dict[str, list[bpy.types.Object]]]] = {
    "xinhua-plane-tree": build_plane_tree,
    "lane-lamp-short-arm": build_lamp,
    "cantilever-umbrella": build_umbrella,
    "outdoor-table-set": build_table,
    "slatted-bench": build_bench,
    "rectangular-planter": build_planter,
    "shanghai-dual-classification-bin": build_bin,
    "irregular-stone-bollard": build_bollard,
}


def scene_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
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
    scene.render.resolution_x = 840
    scene.render.resolution_y = 840
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (0.035, 0.043, 0.045)
    scene["asset_id"] = prototype["id"]
    scene["tier"] = "identity"
    scene["model_brief"] = BRIEF_PATH
    scene["authored_meters_per_scene_unit"] = AUTHORED_METERS_PER_SCENE_UNIT
    scene["origin_contract"] = "ground-center"
    scene["formal_identity_pass"] = False
    scene["runtime_integration"] = "not-performed"


def add_preview_ground(objects: list[bpy.types.Object]) -> None:
    minimum, maximum = scene_bounds(objects)
    span = max(maximum.x - minimum.x, maximum.y - minimum.y, 1.2)
    bpy.ops.mesh.primitive_plane_add(size=span * 2.2, location=(0, 0, -0.025))
    ground = bpy.context.active_object
    ground.name = "test-preview-ground"
    ground_material = bpy.data.materials.new("test-preview-ground-material")
    ground_material.diffuse_color = (0.14, 0.17, 0.18, 1)
    ground.data.materials.append(ground_material)


def render_preview(
    objects: list[bpy.types.Object],
    direction: str,
    path: Path,
) -> None:
    minimum, maximum = scene_bounds(objects)
    center = (minimum + maximum) * 0.5
    width = maximum.x - minimum.x
    depth = maximum.y - minimum.y
    height = maximum.z - minimum.z
    span = max(width, depth, height, 0.8)
    offset = (
        Vector((span * 1.0, -span * 1.35, span * 0.78))
        if direction == "canonical"
        else Vector((-span * 1.2, -span * 0.72, span * 0.68))
    )
    bpy.ops.object.camera_add(location=center + offset)
    camera = bpy.context.active_object
    camera.name = f"test-{direction}-camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = span * 1.38
    target = center + Vector((0, 0, height * 0.02))
    camera.rotation_euler = (
        target - camera.location
    ).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)


def export_glb(path: Path, objects: list[bpy.types.Object]) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
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
    if struct.unpack_from("<I", contents, 16)[0] != 0x4E4F534A:
        raise RuntimeError(f"{path} 缺少 GLB JSON")
    gltf = json.loads(contents[20 : 20 + json_length].decode("utf8"))
    triangles = 0
    bounds_min = [math.inf, math.inf, math.inf]
    bounds_max = [-math.inf, -math.inf, -math.inf]
    for mesh in gltf.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            index = primitive.get("indices")
            if index is None:
                index = primitive["attributes"]["POSITION"]
            triangles += gltf["accessors"][index]["count"] // 3
            accessor = gltf["accessors"][primitive["attributes"]["POSITION"]]
            for axis in range(3):
                bounds_min[axis] = min(bounds_min[axis], accessor["min"][axis])
                bounds_max[axis] = max(bounds_max[axis], accessor["max"][axis])
    transformed_nodes = [
        node.get("name")
        for node in gltf.get("nodes", [])
        if any(key in node for key in ("translation", "rotation", "scale", "matrix"))
    ]
    material_base_colors = {
        material_data.get("name", f"material-{index}"): (
            material_data.get("pbrMetallicRoughness", {}).get(
                "baseColorFactor"
            )
        )
        for index, material_data in enumerate(gltf.get("materials", []))
    }
    return {
        "sha256": file_sha256(path),
        "bytes": len(contents),
        "nodes": len(gltf.get("nodes", [])),
        "meshes": len(gltf.get("meshes", [])),
        "materials": len(gltf.get("materials", [])),
        "materialBaseColors": material_base_colors,
        "images": len(gltf.get("images", [])),
        "textures": len(gltf.get("textures", [])),
        "animations": len(gltf.get("animations", [])),
        "triangles": triangles,
        "bounds": {
            "min": [round(value, 6) for value in bounds_min],
            "max": [round(value, 6) for value in bounds_max],
        },
        "transformedNodes": transformed_nodes,
    }


def verify_budget(
    prototype: dict[str, Any],
    audit: dict[str, Any],
) -> None:
    budget = prototype["budget"]
    failures = []
    for key, maximum in (
        ("triangles", budget["maxTriangles"]),
        ("nodes", budget["maxNodes"]),
        ("materials", budget["maxMaterials"]),
        ("images", budget["maxImages"]),
        ("bytes", budget["maxBinaryBytes"]),
    ):
        if audit[key] > maximum:
            failures.append(f"{key}={audit[key]}>{maximum}")
    if audit["textures"]:
        failures.append(f"textures={audit['textures']}>0")
    default_export_gray = [0.800000011920929] * 3 + [1]
    if not audit["materialBaseColors"]:
        failures.append("materialBaseColors=missing")
    for material_name, base_color in audit["materialBaseColors"].items():
        if base_color is None:
            failures.append(f"{material_name}.baseColorFactor=missing")
        elif all(
            math.isclose(value, default, abs_tol=1e-6)
            for value, default in zip(base_color, default_export_gray)
        ):
            failures.append(
                f"{material_name}.baseColorFactor=default-export-gray"
            )
    if audit["animations"]:
        failures.append(f"animations={audit['animations']}>0")
    if audit["transformedNodes"]:
        failures.append(f"transformedNodes={audit['transformedNodes']}")
    if failures:
        raise RuntimeError(
            f"{prototype['slug']} 超出 Identity 合同：{', '.join(failures)}"
        )


def generate(prototype: dict[str, Any]) -> dict[str, Any]:
    reset_scene()
    configure_scene(prototype)
    groups = BUILDERS[prototype["slug"]](prototype)
    objects = [
        join_group(
            prototype["slug"],
            group_name,
            parts,
            material(prototype["slug"], group_name),
        )
        for group_name, parts in groups.items()
    ]
    for obj in objects:
        obj["asset_id"] = prototype["id"]
        obj["tier"] = "identity"
        obj["evidence"] = prototype["evidence"]
        obj["formal_identity_pass"] = False

    slug = prototype["slug"]
    blend_path = SOURCE_DIR / f"{slug}-identity.blend"
    glb_path = RUNTIME_DIR / f"{slug}-identity.glb"
    canonical_path = PREVIEW_DIR / f"test_{slug}-identity-canonical.png"
    side_path = PREVIEW_DIR / f"test_{slug}-identity-side.png"
    record_path = RECORD_DIR / f"{slug}-identity.json"

    export_glb(glb_path, objects)
    audit = parse_glb(glb_path)
    verify_budget(prototype, audit)
    add_preview_ground(objects)
    render_preview(objects, "canonical", canonical_path)
    render_preview(objects, "side", side_path)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    record = {
        "version": 1,
        "auditedAt": AUDITED_AT,
        "assetId": prototype["id"],
        "slug": slug,
        "family": prototype["family"],
        "tier": "identity",
        "status": "blender-glb-generated-runtime-gate-pending",
        "formalIdentityPass": False,
        "modelBrief": BRIEF_PATH,
        "massingManifest": str(MASSING_MANIFEST_PATH.relative_to(ROOT)),
        "independentReview": str(INDEPENDENT_REVIEW_PATH.relative_to(ROOT)),
        "identityIndependentReview": (
            "docs/research/shared-prototypes-identity-independent-review.md"
        ),
        "contactSheets": {
            "canonical": (
                "test_artifacts/all-models/identity/shared-prototypes/"
                "test_shared-prototypes-identity-canonical-contact-sheet.png"
            ),
            "side": (
                "test_artifacts/all-models/identity/shared-prototypes/"
                "test_shared-prototypes-identity-side-contact-sheet.png"
            ),
        },
        "generator": GENERATOR_PATH,
        "evidence": prototype["evidence"],
        "recognizers": prototype["recognizers"],
        "qualityBoundary": {
            "observed": prototype["observed"],
            "inferred": prototype["inferred"],
            "unknown": prototype["unknown"],
            "sources": prototype["sources"],
        },
        "originContract": {
            "origin": [0, 0, 0],
            "meaning": "prototype-ground-center",
            "blenderUp": "Z",
            "runtimeUp": "Y",
            "blenderFront": "-Y",
            "worldPlacementBaked": False,
            "authoredMetersPerSceneUnit": AUTHORED_METERS_PER_SCENE_UNIT,
            "surveyedMeters": False,
        },
        "budget": prototype["budget"],
        "outputs": {
            "blend": str(blend_path.relative_to(ROOT)),
            "glb": str(glb_path.relative_to(ROOT)),
            "previews": {
                "canonical": str(canonical_path.relative_to(ROOT)),
                "side": str(side_path.relative_to(ROOT)),
            },
        },
        "glb": audit,
        "runtimeGate": {
            "status": "pending",
            "gallery": "not-integrated-in-this-task",
            "mapPlacement": "not-validated-in-this-task",
            "collision": "not-validated-in-this-task",
            "performance": "not-sampled-in-this-task",
        },
    }
    if slug == "xinhua-plane-tree":
        record["speciesBoundary"] = {
            "confirmed": "plane tree archetype",
            "notClaimed": "exact individual identity, age, DBH or measured height",
        }
    if slug == "shanghai-dual-classification-bin":
        record["brandingBoundary"] = {
            "copiedTextOrLogo": False,
            "siteBinding": "Shanghai city-type reference, not Xinhua per-instance proof",
        }
    record_path.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )
    return record


def write_manifest(records: list[dict[str, Any]]) -> None:
    manifest = {
        "version": 1,
        "generatedAt": AUDITED_AT,
        "status": "identity-generated-runtime-and-independent-review-pending",
        "formalIdentityPassCount": 0,
        "assetCount": len(records),
        "vegetationAssetCount": sum(
            record["family"] == "vegetation" for record in records
        ),
        "streetFurnitureAssetCount": sum(
            record["family"] == "street-furniture" for record in records
        ),
        "excludedGenericVegetation": [
            "shangsheng-campus-tree",
            "huashan-canopy-tree",
            "huashan-understory",
            "road-edge-shrub",
        ],
        "modelBrief": BRIEF_PATH,
        "massingManifest": str(MASSING_MANIFEST_PATH.relative_to(ROOT)),
        "independentReview": str(INDEPENDENT_REVIEW_PATH.relative_to(ROOT)),
        "identityIndependentReview": (
            "docs/research/shared-prototypes-identity-independent-review.md"
        ),
        "contactSheets": {
            "canonical": (
                "test_artifacts/all-models/identity/shared-prototypes/"
                "test_shared-prototypes-identity-canonical-contact-sheet.png"
            ),
            "side": (
                "test_artifacts/all-models/identity/shared-prototypes/"
                "test_shared-prototypes-identity-side-contact-sheet.png"
            ),
        },
        "generator": GENERATOR_PATH,
        "totalGlbBytes": sum(record["glb"]["bytes"] for record in records),
        "totalTriangles": sum(
            record["glb"]["triangles"] for record in records
        ),
        "zeroImageTextureAssetCount": sum(
            record["glb"]["images"] == 0 and record["glb"]["textures"] == 0
            for record in records
        ),
        "rootTransformCleanAssetCount": sum(
            not record["glb"]["transformedNodes"] for record in records
        ),
        "runtimeIntegration": "intentionally-not-performed",
        "assets": records,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )


def verify_release_scope() -> None:
    massing = json.loads(MASSING_MANIFEST_PATH.read_text(encoding="utf8"))
    allowed = {
        asset["slug"]
        for asset in massing["assets"]
        if asset.get("identityAllowed") is True
    }
    requested = {prototype["slug"] for prototype in PROTOTYPES}
    if allowed != requested:
        raise RuntimeError(
            "Identity 范围与 Massing manifest 不一致："
            f"allowed={sorted(allowed)} requested={sorted(requested)}"
        )


def main() -> None:
    args = parse_arguments()
    verify_release_scope()
    for directory in (SOURCE_DIR, RUNTIME_DIR, PREVIEW_DIR, RECORD_DIR):
        directory.mkdir(parents=True, exist_ok=True)
    selected = [
        prototype
        for prototype in PROTOTYPES
        if args.asset is None or prototype["slug"] == args.asset
    ]
    if not selected:
        available = ", ".join(prototype["slug"] for prototype in PROTOTYPES)
        raise ValueError(f"未知或未放行 Identity slug：{args.asset}；可用：{available}")
    records = [generate(prototype) for prototype in selected]
    if args.asset is None:
        if len(records) != 8:
            raise RuntimeError("Identity 批次必须严格为 8 个已放行资产")
        write_manifest(records)


if __name__ == "__main__":
    main()
