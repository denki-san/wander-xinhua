"""从本栋 WGS84 绑定生成上海民族乐团候选 Massing。

该生成器只处理 shanghai-orchestra，不读取或覆盖其他建筑产物。
OSM 只证明 footprint 几何；在 6/7/8 号楼身份闭合前，输出仍是
formalMembership=blocked-evidence 的候选灰模。
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import sys
from typing import Any

import bpy


ROOT = Path(__file__).resolve().parents[1]
BINDING_PATH = ROOT / "docs/research/shanghai-orchestra-osm-binding.json"
DEFAULT_BLEND_PATH = (
    ROOT
    / "assets/models/source/tiers/xinhua-road/massing-v2"
    / "shanghai-orchestra-massing.blend"
)
DEFAULT_GLB_PATH = (
    ROOT
    / "public/models/tiers/xinhua-road/massing-v2"
    / "shanghai-orchestra-massing.glb"
)


def parse_arguments() -> argparse.Namespace:
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-blend", default=str(DEFAULT_BLEND_PATH))
    parser.add_argument("--output-glb", default=str(DEFAULT_GLB_PATH))
    return parser.parse_args(arguments)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(collection):
            if datablock.users == 0:
                collection.remove(datablock)


def signed_area(points: list[tuple[float, float]]) -> float:
    return sum(
        x0 * y1 - x1 * y0
        for (x0, y0), (x1, y1) in zip(points, points[1:] + points[:1])
    ) * 0.5


def clean_points(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    deduplicated: list[tuple[float, float]] = []
    for point in points:
        rounded = (round(point[0], 6), round(point[1], 6))
        if not deduplicated or rounded != deduplicated[-1]:
            deduplicated.append(rounded)
    if len(deduplicated) > 1 and deduplicated[0] == deduplicated[-1]:
        deduplicated.pop()
    if len(deduplicated) < 3 or abs(signed_area(deduplicated)) < 1e-6:
        raise ValueError("无效 footprint")
    if signed_area(deduplicated) < 0:
        deduplicated.reverse()
    return deduplicated


def project_wgs84(
    point: list[float],
    source: dict[str, Any],
) -> tuple[float, float]:
    longitude, latitude = point
    center_longitude, center_latitude = source["centerWgs84"]
    meters_per_scene_unit = float(source["metersPerSceneUnit"])
    latitude_radians = math.radians(center_latitude)
    return (
        (longitude - center_longitude)
        * 111_320
        * math.cos(latitude_radians)
        / meters_per_scene_unit,
        -(latitude - center_latitude)
        * 110_540
        / meters_per_scene_unit,
    )


def world_to_local(
    point: tuple[float, float],
    transform: dict[str, Any],
) -> tuple[float, float]:
    pivot_x, pivot_z = transform["position"]
    yaw = float(transform["yaw"])
    scale = float(transform["scale"])
    dx = point[0] - pivot_x
    dz = point[1] - pivot_z
    cosine = math.cos(yaw)
    sine = math.sin(yaw)
    return (
        (cosine * dx - sine * dz) / scale,
        (sine * dx + cosine * dz) / scale,
    )


def add_extruded_polygon(
    name: str,
    points: list[tuple[float, float]],
    height: float,
    material: bpy.types.Material,
    source_way_id: int,
) -> bpy.types.Object:
    points = clean_points(points)
    count = len(points)
    vertices = (
        [(x, z, 0.0) for x, z in points]
        + [(x, z, height) for x, z in points]
    )
    faces: list[tuple[int, ...]] = [
        tuple(reversed(range(count))),
        tuple(range(count, count * 2)),
    ]
    for index in range(count):
        next_index = (index + 1) % count
        faces.append((index, next_index, count + next_index, count + index))
    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(material)
    obj["asset_id"] = "building:xinhua-road:shanghai-orchestra"
    obj["tier"] = "massing"
    obj["source_way_id"] = source_way_id
    obj["candidate_status"] = "geometry-bound-ownership-blocked"
    obj["geometry_evidence"] = "observed-osm-wgs84-footprint"
    obj["height_evidence"] = "unknown-runtime-fallback-not-evidence"
    obj["map_binding"] = "formal-membership-blocked-evidence"
    return obj


def configure_scene(binding: dict[str, Any]) -> None:
    scene = bpy.context.scene
    scene["asset_id"] = binding["assetId"]
    scene["tier"] = "massing"
    scene["binding"] = str(BINDING_PATH.relative_to(ROOT))
    scene["formal_membership"] = "blocked-evidence"
    scene["runtime_position"] = binding["runtimeTransform"]["position"]
    scene["runtime_yaw"] = binding["runtimeTransform"]["yaw"]
    scene["runtime_scale"] = binding["runtimeTransform"]["scale"]


def export_glb(path: Path, objects: list[bpy.types.Object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
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


def main() -> None:
    arguments = parse_arguments()
    binding = json.loads(BINDING_PATH.read_text(encoding="utf8"))
    reset_scene()
    configure_scene(binding)

    material = bpy.data.materials.new(
        "shanghai-orchestra-clean-massing-material"
    )
    material.diffuse_color = (0.565, 0.602, 0.621, 1)
    material.roughness = 0.95
    local_height = (
        10.5
        / float(binding["source"]["metersPerSceneUnit"])
        / float(binding["runtimeTransform"]["scale"])
    )
    objects: list[bpy.types.Object] = []
    for candidate in binding["candidateWays"]:
        local_points = [
            world_to_local(
                project_wgs84(point, binding["source"]),
                binding["runtimeTransform"],
            )
            for point in candidate["wgs84Footprint"]
        ]
        objects.append(
            add_extruded_polygon(
                f"osm-way-{candidate['sourceWayId']}",
                local_points,
                local_height,
                material,
                int(candidate["sourceWayId"]),
            )
        )

    output_glb = Path(arguments.output_glb).resolve()
    output_blend = Path(arguments.output_blend).resolve()
    export_glb(output_glb, objects)
    output_blend.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))
    print(json.dumps({
        "assetId": binding["assetId"],
        "candidateWayIds": binding["candidateWayIds"],
        "formalMembership": "blocked-evidence",
        "outputGlb": str(output_glb),
        "outputBlend": str(output_blend),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
