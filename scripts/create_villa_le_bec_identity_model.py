"""从已通过 MCP2 的 Villa Le Bec Hero 生成低预算 Identity tier。"""

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
HERO_BLEND = ROOT / "assets/models/source/tiers/xinhua-road/hero-v1/villa-le-bec-hero.blend"
HERO_GLB = ROOT / "public/models/tiers/xinhua-road/hero-v1/villa-le-bec-hero.glb"
HERO_RECORD = ROOT / "docs/research/build-records/tiers/xinhua-road/hero-v1/villa-le-bec-hero.json"
HERO_GLB_SHA = "1374b7a8301345c23736644cfdc9a7ed467efb8371ebcdf72a507217b0015394"
HERO_BLEND_SHA = "a087f24cbc5c7b6eb6fb014e635a614d90f1be549441977a831277ed17f89329"
MASSING_SHA = "593cc3995046439d973788108ac00cd6176c3f7c8fce67702e98db01d54b975f"
IDENTITY_BLEND = ROOT / "assets/models/source/tiers/xinhua-road/identity-v1/villa-le-bec-identity.blend"
IDENTITY_GLB = ROOT / "public/models/tiers/xinhua-road/identity-v1/villa-le-bec-identity.glb"
PREVIEW_DIR = ROOT / "test_artifacts/all-models/identity-v1/villa-le-bec"
RECORD = ROOT / "docs/research/build-records/tiers/xinhua-road/identity-v1/villa-le-bec-identity.json"
CANONICAL = PREVIEW_DIR / "test_villa-le-bec-identity-canonical.png"
SIDE = PREVIEW_DIR / "test_villa-le-bec-identity-side-depth.png"
ENTRANCE = PREVIEW_DIR / "test_villa-le-bec-identity-entrance.png"
TRIPTYCH = PREVIEW_DIR / "test_villa-le-bec-identity-triptych.png"


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


def material(name: str, color: tuple[float, float, float, float], roughness: float):
    return MASSING.make_material(name, color, roughness)


def box(name: str, center: Vector, dimensions: tuple[float, float, float], yaw: float, surface):
    return MASSING.add_oriented_box(name, center, dimensions[:2], center.z, dimensions[2], yaw, surface)


def rectangle_data(footprint):
    center, u, v, u_length, v_length = MASSING.oriented_rectangle(footprint)
    return center, u, v, u_length, v_length, math.atan2(u.y, u.x)


def add_panel(name: str, center: Vector, width: float, height: float, yaw: float, surface, objects: list, *, outside: float) -> None:
    normal = Vector((-math.sin(yaw), math.cos(yaw)))
    point = center - Vector((normal.x * outside, normal.y * outside, 0))
    objects.append(box(name, point, (width, 0.065, height), yaw, surface))


def build_identity():
    wall = material("villa-le-bec-identity-warm-white", (0.78, 0.73, 0.64, 1), 0.92)
    roof = material("villa-le-bec-identity-red-brown-roof", (0.31, 0.17, 0.11, 1), 0.9)
    base = material("villa-le-bec-identity-dark-base", (0.12, 0.15, 0.13, 1), 0.82)
    glazing = material("villa-le-bec-identity-deep-green-glazing", (0.055, 0.13, 0.10, 1), 0.7)
    objects = MASSING.build_geometry()
    for obj in objects:
        obj.data.materials.clear()
        obj.data.materials.append(roof if "roof" in obj.name else wall)

    street = MASSING.STREET_VILLA_FOOTPRINT
    garden = MASSING.GARDEN_VILLA_FOOTPRINT
    street_center, street_u, street_v, street_ul, street_vl, street_yaw = rectangle_data(street)
    garden_center, garden_u, garden_v, garden_ul, garden_vl, garden_yaw = rectangle_data(garden)

    # 只保留 Hero 中可远读的暗基座、沿街凸窗/双 dormer 和院内入口凸出；不加场地或装饰。
    for prefix, center, u_len, v_len, yaw in (
        ("street", street_center, street_ul, street_vl, street_yaw),
        ("garden", garden_center, garden_ul, garden_vl, garden_yaw),
    ):
        objects.append(box(f"villa-le-bec-identity-{prefix}-base", Vector((center.x, center.y, 0.26)), (u_len * 0.98, v_len * 0.98, 0.52), yaw, base))

    street_front = street_center - street_v * (street_vl * 0.5)
    for index, offset in enumerate((-street_ul * 0.30, street_ul * 0.31)):
        panel = Vector((street_front.x + street_u.x * offset, street_front.y + street_u.y * offset, 1.82))
        add_panel(f"villa-le-bec-identity-street-window-{index}", panel, 0.88, 2.12, street_yaw, glazing, objects, outside=0.055)
    bay = Vector((street_front.x - street_v.x * 0.40, street_front.y - street_v.y * 0.40, 2.18))
    objects.append(box("villa-le-bec-identity-street-projecting-bay", bay, (1.55, 0.58, 2.12), street_yaw, wall))
    add_panel("villa-le-bec-identity-street-projecting-bay-glazing", bay + Vector((0, 0, 0.08)), 1.20, 1.42, street_yaw, glazing, objects, outside=0.335)
    for index, offset in enumerate((-street_ul * 0.22, street_ul * 0.23)):
        center = street_center + street_u * offset - street_v * 0.12
        body = Vector((center.x, center.y, 4.02))
        objects.append(box(f"villa-le-bec-identity-street-dormer-{index}", body, (1.15, 0.82, 0.78), street_yaw, wall))
        objects.append(box(f"villa-le-bec-identity-street-dormer-cap-{index}", body + Vector((0, 0, 0.43)), (1.36, 1.02, 0.16), street_yaw, roof))

    entry = garden_center - garden_u * (garden_ul * 0.5) - garden_u * 0.30
    entry_center = Vector((entry.x, entry.y, 1.28))
    objects.append(box("villa-le-bec-identity-garden-entry-bay", entry_center, (0.46, 1.42, 2.42), garden_yaw, wall))
    add_panel("villa-le-bec-identity-garden-entry-glazing", entry_center, 0.84, 1.74, garden_yaw + math.pi / 2, glazing, objects, outside=0.275)
    garden_side = garden_center + garden_v * (garden_vl * 0.5)
    for index, offset in enumerate((-garden_ul * 0.22, garden_ul * 0.24)):
        panel = Vector((garden_side.x + garden_u.x * offset, garden_side.y + garden_u.y * offset, 1.70))
        add_panel(f"villa-le-bec-identity-garden-side-window-{index}", panel, 0.78, 1.28, garden_yaw, glazing, objects, outside=0.055)

    component_names = [obj.name for obj in objects]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    root = bpy.context.active_object
    root.name = "villa-le-bec-identity"
    root["stable_asset_id"] = "villa-le-bec"
    root["runtime_tier"] = "identity"
    root["derived_from_hero_sha256"] = HERO_GLB_SHA
    root["derived_from_massing_sha256"] = MASSING_SHA
    root["front_direction"] = "local -Y"
    root["ground_datum"] = "z=0"
    root["collision_semantics"] = "two-solid-buildings-open-courtyard-preserved"
    root["excluded"] = "trees,dressing,brand,interior,low-annex,extra-ways"
    return root, component_names


def camera_look(camera, target: tuple[float, float, float]) -> None:
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def render_previews() -> None:
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = 960, 720, 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (0.12, 0.15, 0.16)
    bpy.ops.mesh.primitive_plane_add(size=36, location=(4.5, -5.5, -0.025))
    bpy.context.active_object.data.materials.append(material("test-villa-le-bec-identity-ground", (0.19, 0.23, 0.20, 1), 1.0))
    bpy.ops.object.light_add(type="AREA", location=(-8, -18, 18))
    bpy.context.active_object.data.energy, bpy.context.active_object.data.shape, bpy.context.active_object.data.size = 1300, "DISK", 15
    bpy.ops.object.light_add(type="AREA", location=(16, 7, 10))
    bpy.context.active_object.data.energy, bpy.context.active_object.data.size = 800, 10
    bpy.ops.object.camera_add()
    camera = bpy.context.active_object
    scene.camera = camera
    for path, location, target, lens in (
        (CANONICAL, (2.2, -24.0, 7.8), (4.5, -5.0, 2.3), 52),
        (SIDE, (20.0, -16.0, 9.5), (4.5, -5.0, 2.3), 56),
        (ENTRANCE, (0.5, 3.2, 6.0), (7.0, -3.8, 2.1), 60),
    ):
        camera.location, camera.data.lens = location, lens
        camera_look(camera, target)
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)


def export(root) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(IDENTITY_GLB), export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_materials="EXPORT", export_extras=True)


def write_record(root, components: list[str]) -> None:
    vertices = [root.matrix_world @ Vector(corner) for corner in root.bound_box]
    bounds = {"min": [min(vertex[index] for vertex in vertices) for index in range(3)], "max": [max(vertex[index] for vertex in vertices) for index in range(3)]}
    record = {
        "version": 1, "assetId": "villa-le-bec", "tier": "identity", "versionName": "identity-v1", "status": "identity-built-pending-mcp3-and-runtime",
        "generator": {"path": str(Path(__file__).relative_to(ROOT)), "sha256": sha256(Path(__file__)), "bytes": Path(__file__).stat().st_size},
        "blenderVersion": bpy.app.version_string,
        "derivedFrom": {"tier": "hero", "heroMcp2": "pass-main-window-blender-mcp-current-sha", "heroBuildRecord": str(HERO_RECORD.relative_to(ROOT)), "heroEditableSource": {"path": str(HERO_BLEND.relative_to(ROOT)), "sha256": HERO_BLEND_SHA}, "heroRuntimeAsset": {"path": str(HERO_GLB.relative_to(ROOT)), "sha256": HERO_GLB_SHA}, "heroGlbSha256": HERO_GLB_SHA, "heroBlendSha256": HERO_BLEND_SHA, "massingSha256": MASSING_SHA, "method": "sha-pinned-hero-subset-reconstruction-over-approved-massing-shell"},
        "continuity": {"origin": "shared-zero-origin", "frontDirection": "local-negative-y", "groundDatum": "z=0", "placement": {"position": [-34.1, 88.8], "yaw": -0.38, "scale": 0.82, "movementAuthorized": False}, "collision": {"sameAsHeroAndMassing": True, "solidWays": [864493176, 864493175], "openCourtyard": True, "bakedCollisionGeometry": False}},
        "identityCues": {"preserved": ["warm-white-dark-base-red-brown-hipped-roof", "street-projecting-bay-and-two-dormer-silhouettes", "garden-entry-bay-and-side-window-rhythm", "open-courtyard-between-two-buildings"], "deliberateLosses": ["fine-window-frames-and-mullions", "upper-lower-facade-window-separation", "garden-dormer-glazing", "eave-lines"]},
        "scope": {"twoBuildingsOnly": True, "components": len(components), "excluded": ["trees", "dressing", "brand", "interior", "low-annex", "extra-ways", "public-registry", "runtime-manifest", "map"]},
        "outputs": {"blend": {"path": str(IDENTITY_BLEND.relative_to(ROOT)), "sha256": sha256(IDENTITY_BLEND)}, "glb": {"path": str(IDENTITY_GLB.relative_to(ROOT)), "sha256": sha256(IDENTITY_GLB), "bytes": IDENTITY_GLB.stat().st_size, "bounds": bounds}, "previews": [{"path": str(path.relative_to(ROOT)), "sha256": sha256(path)} for path in (CANONICAL, SIDE, ENTRANCE, TRIPTYCH)]},
        "budget": {"maxTriangles": 12000, "maxNodes": 4, "maxMaterials": 4, "maxImages": 0, "maxBytes": 900000, "heroBytes": HERO_GLB.stat().st_size, "requiresLowerBytesThanHero": True},
        "gates": {"mcp3": "not-run", "runtime": "not-run-by-scope"}
    }
    RECORD.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf8")


def main() -> None:
    if sha256(HERO_GLB) != HERO_GLB_SHA or sha256(HERO_BLEND) != HERO_BLEND_SHA:
        raise RuntimeError("Hero SHA 不匹配，拒绝生成 Identity")
    for directory in (IDENTITY_BLEND.parent, IDENTITY_GLB.parent, PREVIEW_DIR, RECORD.parent):
        directory.mkdir(parents=True, exist_ok=True)
    MASSING.clear_scene()
    root, components = build_identity()
    bpy.ops.wm.save_as_mainfile(filepath=str(IDENTITY_BLEND))
    export(root)
    render_previews()
    subprocess.run(["/usr/bin/env", "python3", "-c", "from PIL import Image; import sys; imgs=[Image.open(p).convert('RGB') for p in sys.argv[1:4]]; out=Image.new('RGB',(imgs[0].width*3,imgs[0].height)); [out.paste(im,(i*im.width,0)) for i,im in enumerate(imgs)]; out.save(sys.argv[4])", str(CANONICAL), str(SIDE), str(ENTRANCE), str(TRIPTYCH)], check=True)
    write_record(root, components)
    print(json.dumps({"glb": str(IDENTITY_GLB), "sha256": sha256(IDENTITY_GLB), "bytes": IDENTITY_GLB.stat().st_size}))


if __name__ == "__main__":
    main()
