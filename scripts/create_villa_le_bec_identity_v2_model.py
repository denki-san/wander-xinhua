"""从当前已审阅 Villa Le Bec Hero v2 直接简化生成 Identity v2。"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import subprocess
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
HERO_SCRIPT = ROOT / "scripts/create_villa_le_bec_hero_v2_model.py"
HERO_BLEND = ROOT / "assets/models/source/tiers/xinhua-road/hero-v2/villa-le-bec-hero-v2.blend"
HERO_GLB = ROOT / "public/models/tiers/xinhua-road/hero-v2/villa-le-bec-hero-v2.glb"
HERO_RECORD = ROOT / "docs/research/build-records/tiers/xinhua-road/hero-v2/villa-le-bec-hero-v2.json"
HERO_GLB_SHA = "4f909a3b149e2f16e00843d4f965dc37e0a96ea2c69d67ab4e12282d7d1b5b00"
HERO_BLEND_SHA = "6619a2eaa1b1e2c65d656ac3a52ebb940ff9ecb4ae3fd6f572737728da45276a"
MASSING_SHA = "593cc3995046439d973788108ac00cd6176c3f7c8fce67702e98db01d54b975f"
BLEND = ROOT / "assets/models/source/tiers/xinhua-road/identity-v2/villa-le-bec-identity-v2.blend"
GLB = ROOT / "public/models/tiers/xinhua-road/identity-v2/villa-le-bec-identity-v2.glb"
PREVIEW_DIR = ROOT / "test_artifacts/all-models/identity-v2/villa-le-bec"
RECORD = ROOT / "docs/research/build-records/tiers/xinhua-road/identity-v2/villa-le-bec-identity-v2.json"
PREVIEWS = [PREVIEW_DIR / "test_villa-le-bec-identity-v2-canonical.png", PREVIEW_DIR / "test_villa-le-bec-identity-v2-side-depth.png", PREVIEW_DIR / "test_villa-le-bec-identity-v2-entrance.png"]
TRIPTYCH = PREVIEW_DIR / "test_villa-le-bec-identity-v2-triptych.png"

def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for part in iter(lambda: f.read(1024 * 1024), b""):
            h.update(part)
    return h.hexdigest()

def load_hero():
    spec = importlib.util.spec_from_file_location("villa_le_bec_hero_v2", HERO_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError("无法加载 Hero v2 生成器")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

HERO = load_hero()

def render(root):
    scene = bpy.context.scene
    try: scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError: scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = 960, 720, 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (0.12, 0.15, 0.16)
    bpy.ops.mesh.primitive_plane_add(size=36, location=(4.5, -5.5, -0.025))
    bpy.context.active_object.data.materials.append(HERO.material("test-villa-le-bec-identity-v2-ground", (0.19, 0.23, 0.20, 1), 1.0))
    bpy.ops.object.light_add(type="AREA", location=(-8, -18, 18)); bpy.context.active_object.data.energy = 1300; bpy.context.active_object.data.size = 15
    bpy.ops.object.light_add(type="AREA", location=(16, 7, 10)); bpy.context.active_object.data.energy = 800; bpy.context.active_object.data.size = 10
    bpy.ops.object.camera_add(); camera = bpy.context.active_object; scene.camera = camera
    views = [((2.0, -25.0, 5.1), (4.35, -5.25, 2.05), 54), ((20.0, -16.0, 9.5), (4.5, -5.0, 2.3), 56), ((0.5, 3.2, 6.0), (7.0, -3.8, 2.1), 60)]
    for path, (location, target, lens) in zip(PREVIEWS, views):
        camera.location, camera.data.lens = location, lens
        camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(path); bpy.ops.render.render(write_still=True)

def main():
    if sha(HERO_GLB) != HERO_GLB_SHA or sha(HERO_BLEND) != HERO_BLEND_SHA:
        raise RuntimeError("Hero v2 SHA 不匹配，拒绝生成 Identity v2")
    for directory in (BLEND.parent, GLB.parent, PREVIEW_DIR, RECORD.parent): directory.mkdir(parents=True, exist_ok=True)
    HERO.MASSING.clear_scene()
    root, source_components = HERO.build_hero_v2()
    # 保留 Hero v2 轮廓、入口、凸窗与 dormer；仅以网格简化和材质合并降低运行时预算。
    modifier = root.modifiers.new("identity-v2-budget-decimate", "DECIMATE"); modifier.ratio = 0.42
    bpy.context.view_layer.objects.active = root; bpy.ops.object.modifier_apply(modifier=modifier.name)
    root.name = "villa-le-bec-identity-v2"
    root["runtime_tier"] = "identity"; root["derived_from_hero_v2_sha256"] = HERO_GLB_SHA; root["derived_from_massing_sha256"] = MASSING_SHA
    root["collision_semantics"] = "two-solid-buildings-open-courtyard-preserved"; root["excluded"] = "trees,decorations,brand,interior,extra-ways"
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    bpy.ops.object.select_all(action="DESELECT"); root.select_set(True); bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(GLB), export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_materials="EXPORT", export_extras=True)
    render(root)
    subprocess.run(["/usr/bin/env", "python3", "-c", "from PIL import Image; import sys; a=[Image.open(p).convert('RGB') for p in sys.argv[1:4]]; o=Image.new('RGB',(a[0].width*3,a[0].height)); [o.paste(x,(i*x.width,0)) for i,x in enumerate(a)]; o.save(sys.argv[4])", *map(str, PREVIEWS), str(TRIPTYCH)], check=True)
    vertices = [root.matrix_world @ Vector(corner) for corner in root.bound_box]
    record = {"version": 2, "assetId": "villa-le-bec", "tier": "identity", "versionName": "identity-v2", "status": "identity-v2-built-pending-mcp3-and-runtime", "generator": {"path": str(Path(__file__).relative_to(ROOT)), "sha256": sha(Path(__file__))}, "blenderVersion": bpy.app.version_string, "derivedFrom": {"tier": "hero-v2", "heroBuildRecord": str(HERO_RECORD.relative_to(ROOT)), "heroGlbSha256": HERO_GLB_SHA, "heroBlendSha256": HERO_BLEND_SHA, "massingSha256": MASSING_SHA, "method": "sha-pinned-hero-v2-direct-decimate-preserving-approved-identity-components"}, "continuity": {"placement": {"position": [-34.1, 88.8], "yaw": -0.38, "scale": 0.82, "movementAuthorized": False}, "collision": {"sameAsHeroAndMassing": True, "solidWays": [864493176, 864493175], "openCourtyard": True, "bakedCollisionGeometry": False}}, "identityCues": {"preserved": ["two-building-hipped-roof-silhouette", "street-storefront-upper-bay-and-dormers", "garden-door-canopy-side-window-and-dormer", "open-courtyard"], "deliberateLosses": ["58-percent-mesh-density", "fine-window-and-trim-fidelity", "small-roof-detail"]}, "scope": {"twoBuildingsOnly": True, "sourceComponents": len(source_components), "excluded": ["trees", "decorations", "brand", "interior", "low-annex", "extra-ways", "public-registry", "runtime-manifest", "map"]}, "outputs": {"blend": {"path": str(BLEND.relative_to(ROOT)), "sha256": sha(BLEND)}, "glb": {"path": str(GLB.relative_to(ROOT)), "sha256": sha(GLB), "bytes": GLB.stat().st_size, "bounds": {"min": [min(v[i] for v in vertices) for i in range(3)], "max": [max(v[i] for v in vertices) for i in range(3)]}}, "previews": [{"path": str(p.relative_to(ROOT)), "sha256": sha(p)} for p in [*PREVIEWS, TRIPTYCH]]}, "budget": {"maxTriangles": 1200, "maxNodes": 4, "maxMaterials": 6, "maxImages": 0, "maxBytes": 900000, "heroBytes": HERO_GLB.stat().st_size, "requiresLowerBytesThanHero": True}, "gates": {"mcp3": "not-run", "runtime": "not-run-by-scope"}}
    RECORD.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(json.dumps({"glb": str(GLB), "sha256": sha(GLB), "bytes": GLB.stat().st_size}))

if __name__ == "__main__": main()
