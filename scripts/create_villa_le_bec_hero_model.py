"""从冻结的 Villa Le Bec 双楼 Massing 生成纯建筑 Hero。"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import math
import subprocess
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
MASSING_SCRIPT = ROOT / "scripts/create_villa_le_bec_massing_model.py"
MASSING_BLEND = ROOT / "assets/models/source/tiers/xinhua-road/massing-v2/villa-le-bec-massing.blend"
MASSING_GLB = ROOT / "public/models/tiers/xinhua-road/massing-v2/villa-le-bec-massing.glb"
MASSING_SHA = "593cc3995046439d973788108ac00cd6176c3f7c8fce67702e98db01d54b975f"
HERO_BLEND = ROOT / "assets/models/source/tiers/xinhua-road/hero-v1/villa-le-bec-hero.blend"
HERO_GLB = ROOT / "public/models/tiers/xinhua-road/hero-v1/villa-le-bec-hero.glb"
PREVIEW_DIR = ROOT / "test_artifacts/all-models/hero-v1/villa-le-bec"
RECORD = ROOT / "docs/research/build-records/tiers/xinhua-road/hero-v1/villa-le-bec-hero.json"
CANONICAL = PREVIEW_DIR / "test_villa-le-bec-hero-canonical.png"
SIDE = PREVIEW_DIR / "test_villa-le-bec-hero-side-depth.png"
ENTRANCE = PREVIEW_DIR / "test_villa-le-bec-hero-entrance.png"
TRIPTYCH = PREVIEW_DIR / "test_villa-le-bec-hero-triptych.png"


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


def material(name: str, color: tuple[float, float, float, float], roughness: float) -> bpy.types.Material:
    return MASSING.make_material(name, color, roughness)


def box(name: str, center: Vector, dimensions: tuple[float, float, float], yaw: float, surface: bpy.types.Material) -> bpy.types.Object:
    return MASSING.add_oriented_box(name, center, dimensions[:2], center.z, dimensions[2], yaw, surface)


def rectangle_data(footprint):
    center, u, v, u_length, v_length = MASSING.oriented_rectangle(footprint)
    return center, u, v, u_length, v_length, math.atan2(u.y, u.x)


def at_height(point: Vector, z: float) -> Vector:
    """将 Massing 的二维局部坐标显式提升到 Blender 的 Z 高度。"""
    return Vector((point.x, point.y, z))


def add_window(prefix: str, center: Vector, width: float, height: float, yaw: float, frame, glass, objects: list) -> None:
    normal = Vector((-math.sin(yaw), math.cos(yaw)))
    glass_center = center + Vector((normal.x * 0.025, normal.y * 0.025, 0))
    objects.append(box(f"{prefix}-glass", glass_center, (width, 0.055, height), yaw, glass))
    for label, offset, dims in (
        ("left", -width / 2, (0.075, 0.08, height + 0.08)),
        ("right", width / 2, (0.075, 0.08, height + 0.08)),
        ("top", 0, (width + 0.08, 0.08, 0.075)),
        ("bottom", 0, (width + 0.08, 0.08, 0.075)),
        ("mid", 0, (width, 0.08, 0.055)),
    ):
        location = glass_center + Vector((math.cos(yaw) * offset, math.sin(yaw) * offset, 0))
        if label == "top": location.z += height / 2
        if label == "bottom": location.z -= height / 2
        objects.append(box(f"{prefix}-frame-{label}", location, dims, yaw, frame))
    for offset in (-width / 6, width / 6):
        location = glass_center + Vector((math.cos(yaw) * offset, math.sin(yaw) * offset, 0))
        objects.append(box(f"{prefix}-mullion-{offset:+.2f}", location, (0.05, 0.08, height), yaw, frame))


def add_dormer(prefix: str, center: Vector, yaw: float, wall, roof, frame, glass, objects: list) -> None:
    objects.append(box(f"{prefix}-body", center + Vector((0, 0, 4.02)), (1.15, 0.82, 0.78), yaw, wall))
    objects.append(box(f"{prefix}-cap", center + Vector((0, 0, 4.45)), (1.36, 1.02, 0.16), yaw, roof))
    add_window(prefix, center + Vector((0, 0, 4.05)), 0.72, 0.48, yaw, frame, glass, objects)


def build_hero() -> tuple[bpy.types.Object, list[str]]:
    wall = material("villa-le-bec-hero-warm-white-plaster", (0.78, 0.73, 0.64, 1), 0.92)
    base = material("villa-le-bec-hero-dark-base", (0.12, 0.15, 0.13, 1), 0.82)
    roof = material("villa-le-bec-hero-muted-red-brown-tile", (0.31, 0.17, 0.11, 1), 0.9)
    frame = material("villa-le-bec-hero-deep-green-frame", (0.055, 0.13, 0.10, 1), 0.72)
    glass = material("villa-le-bec-hero-dark-glass", (0.10, 0.16, 0.17, 1), 0.32)
    objects = MASSING.build_geometry()

    for obj in objects:
        obj.data.materials.clear()
        obj.data.materials.append(wall if "roof" not in obj.name and "window" not in obj.name and "step" not in obj.name else roof)
    street = MASSING.STREET_VILLA_FOOTPRINT
    garden = MASSING.GARDEN_VILLA_FOOTPRINT
    street_center, street_u, street_v, street_ul, street_vl, street_yaw = rectangle_data(street)
    garden_center, garden_u, garden_v, garden_ul, garden_vl, garden_yaw = rectangle_data(garden)

    # 两栋独立的深色基座，不增加场地/围墙。
    for prefix, center, u_len, v_len, yaw in (
        ("street", street_center, street_ul, street_vl, street_yaw),
        ("garden", garden_center, garden_ul, garden_vl, garden_yaw),
    ):
        objects.append(box(f"villa-le-bec-hero-{prefix}-base", Vector((center.x, center.y, 0.26)), (u_len * 0.98, v_len * 0.98, 0.52), yaw, base))

    # 沿街主楼：可见正立面窗节奏、凸窗、两处老虎窗。
    street_front = street_center - street_v * (street_vl * 0.5)
    for index, offset in enumerate((-street_ul * 0.30, street_ul * 0.02, street_ul * 0.31)):
        center = Vector((street_front.x + street_u.x * offset, street_front.y + street_u.y * offset, 1.78))
        add_window(f"villa-le-bec-hero-street-front-window-{index}", center, 0.88, 1.32, street_yaw, frame, glass, objects)
    bay_center = at_height(street_front - street_v * 0.40, 2.18)
    objects.append(box("villa-le-bec-hero-street-projecting-bay", bay_center, (1.55, 0.58, 2.12), street_yaw, wall))
    add_window("villa-le-bec-hero-street-projecting-bay-window", bay_center + Vector((0, 0, 0.05)), 1.18, 1.36, street_yaw, frame, glass, objects)
    for offset in (-street_ul * 0.22, street_ul * 0.23):
        center = at_height(street_center + street_u * offset - street_v * 0.12, 0)
        add_dormer("villa-le-bec-hero-street-dormer" + str(round(offset, 2)), center, street_yaw, wall, roof, frame, glass, objects)

    # 院内楼：入口 bay、侧窗和老虎窗，始终不跨入两楼间庭院。
    garden_entry = garden_center - garden_u * (garden_ul * 0.5) - garden_u * 0.30
    entry_center = at_height(garden_entry, 1.28)
    objects.append(box("villa-le-bec-hero-garden-entry-bay", entry_center, (0.46, 1.42, 2.42), garden_yaw, wall))
    add_window("villa-le-bec-hero-garden-entry-glazing", entry_center + Vector((0, 0, -0.04)), 0.84, 1.74, garden_yaw + math.pi / 2, frame, glass, objects)
    garden_side = garden_center + garden_v * (garden_vl * 0.5)
    for index, offset in enumerate((-garden_ul * 0.22, garden_ul * 0.24)):
        center = at_height(garden_side + garden_u * offset, 1.7)
        add_window(f"villa-le-bec-hero-garden-side-window-{index}", center, 0.76, 1.25, garden_yaw, frame, glass, objects)
    add_dormer("villa-le-bec-hero-garden-dormer", at_height(garden_center + garden_v * 0.05, 0), garden_yaw, wall, roof, frame, glass, objects)

    # 屋檐线强调，不添加品牌、家具、树木、围墙或低矮附属空间。
    for prefix, center, u_len, v_len, yaw in (
        ("street", street_center, street_ul, street_vl, street_yaw),
        ("garden", garden_center, garden_ul, garden_vl, garden_yaw),
    ):
        eave_center = at_height(center, 3.13)
        objects.append(box(f"villa-le-bec-hero-{prefix}-eave-front", eave_center, (u_len * 1.04, 0.12, 0.15), yaw, frame))
        objects.append(box(f"villa-le-bec-hero-{prefix}-eave-side", eave_center, (0.12, v_len * 1.04, 0.15), yaw, frame))

    component_names = [obj.name for obj in objects]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    root = bpy.context.active_object
    root.name = "villa-le-bec-hero"
    root["stable_asset_id"] = "villa-le-bec"
    root["runtime_tier"] = "hero"
    root["derived_from_massing_sha256"] = MASSING_SHA
    root["front_direction"] = "local -Y"
    root["ground_datum"] = "z=0"
    root["collision_semantics"] = "two-solid-buildings-open-courtyard-preserved"
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
    scene.world.color = (0.12, 0.15, 0.16)
    bpy.ops.mesh.primitive_plane_add(size=36, location=(4.5, -5.5, -0.025))
    ground = bpy.context.active_object
    ground.name = "test_villa-le-bec-hero-ground"
    ground.data.materials.append(material("test-villa-le-bec-hero-ground", (0.19, 0.23, 0.20, 1), 1.0))
    bpy.ops.object.light_add(type="AREA", location=(-8, -18, 18))
    bpy.context.active_object.data.energy = 1300
    bpy.context.active_object.data.shape = "DISK"
    bpy.context.active_object.data.size = 15
    bpy.ops.object.light_add(type="AREA", location=(16, 7, 10))
    bpy.context.active_object.data.energy = 800
    bpy.context.active_object.data.size = 10
    bpy.ops.object.camera_add()
    camera = bpy.context.active_object
    scene.camera = camera
    views = (
        (CANONICAL, (2.2, -24.0, 7.8), (4.5, -5.0, 2.3), 52),
        (SIDE, (20.0, -16.0, 9.5), (4.5, -5.0, 2.3), 56),
        (ENTRANCE, (0.5, 3.2, 6.0), (7.0, -3.8, 2.1), 60),
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
    bpy.ops.export_scene.gltf(filepath=str(HERO_GLB), export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_materials="EXPORT", export_extras=True)


def write_record(root: bpy.types.Object, components: list[str]) -> None:
    vertices = [root.matrix_world @ Vector(corner) for corner in root.bound_box]
    bounds = {
        "min": [min(vertex[index] for vertex in vertices) for index in range(3)],
        "max": [max(vertex[index] for vertex in vertices) for index in range(3)],
    }
    record = {
        "version": 1, "assetId": "villa-le-bec", "tier": "hero", "status": "hero-built-pending-mcp2-and-runtime",
        "generator": "scripts/create_villa_le_bec_hero_model.py", "generatorSha256": sha256(Path(__file__)), "blenderVersion": bpy.app.version_string,
        "derivedFrom": {"massingGlb": str(MASSING_GLB.relative_to(ROOT)), "massingSha256": MASSING_SHA, "placement": {"position": [-34.1, 88.8], "yaw": -0.38, "scale": 0.82, "movementAuthorized": False}},
        "outputs": {"blend": str(HERO_BLEND.relative_to(ROOT)), "blendSha256": sha256(HERO_BLEND), "glb": str(HERO_GLB.relative_to(ROOT)), "glbSha256": sha256(HERO_GLB), "bytes": HERO_GLB.stat().st_size, "bounds": bounds, "previews": [{"path": str(path.relative_to(ROOT)), "sha256": sha256(path)} for path in (CANONICAL, SIDE, ENTRANCE, TRIPTYCH)]},
        "budget": {"maxTriangles": 68000, "maxNodes": 10, "maxMaterials": 12, "maxImages": 0, "maxBytes": 5200000},
        "scope": {"twoBuildingsOnly": True, "components": len(components), "excluded": ["trees", "dressing", "brand", "interior", "low-annex", "ways-864493245-246-247"]},
        "identityCues": ["warm-white-dark-base-red-brown-hipped-roof", "street-projecting-bay-and-dormers", "garden-entry-bay-side-windows-and-dormer", "open-courtyard-between-two-buildings"],
        "collisionContract": {"sameAsMassing": True, "solidWays": [864493176, 864493175], "openCourtyard": True, "bakedCollisionGeometry": False},
        "gates": {"mcp2": "pending", "identity": "not-authorized", "runtime": "not-run-by-scope"}
    }
    RECORD.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf8")


def main() -> None:
    if sha256(MASSING_GLB) != MASSING_SHA:
        raise RuntimeError("冻结的 Massing SHA 不匹配，拒绝生成 Hero")
    for directory in (HERO_BLEND.parent, HERO_GLB.parent, PREVIEW_DIR, RECORD.parent):
        directory.mkdir(parents=True, exist_ok=True)
    MASSING.clear_scene()
    root, components = build_hero()
    bpy.ops.wm.save_as_mainfile(filepath=str(HERO_BLEND))
    export(root)
    render_previews()
    subprocess.run(["/usr/bin/env", "python3", "-c", "from PIL import Image; import sys; imgs=[Image.open(p).convert('RGB') for p in sys.argv[1:4]]; out=Image.new('RGB',(imgs[0].width*3,imgs[0].height)); [out.paste(im,(i*im.width,0)) for i,im in enumerate(imgs)]; out.save(sys.argv[4])", str(CANONICAL), str(SIDE), str(ENTRANCE), str(TRIPTYCH)], check=True)
    write_record(root, components)
    print(json.dumps({"glb": str(HERO_GLB), "sha256": sha256(HERO_GLB), "bytes": HERO_GLB.stat().st_size}, ensure_ascii=False))


if __name__ == "__main__":
    main()
