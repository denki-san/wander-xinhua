"""生成两栋建筑的 B 风格软陶玩具样板。

本脚本只写入 test_artifacts 下的隔离产物，不覆盖正式 Blender、GLB 或运行时文件。
参考照片只用于既有几何的身份校验，不嵌入模型或材质。
"""

from __future__ import annotations

import importlib.util
import math
import sys
from pathlib import Path
from types import ModuleType
from typing import Callable

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "test_artifacts" / "models"
PREVIEW_DIR = ROOT / "test_artifacts"

SUN_BLEND = MODEL_DIR / "test_toy_sun-ke-villa.blend"
SUN_GLB = MODEL_DIR / "test_toy_sun-ke-villa.glb"
SUN_CANONICAL = PREVIEW_DIR / "test_toy_sun-ke-villa_canonical_preview.png"
SUN_SIDE = PREVIEW_DIR / "test_toy_sun-ke-villa_side_preview.png"
SUN_ENTRANCE = PREVIEW_DIR / "test_toy_sun-ke-villa_entrance_preview.png"

CINEMA_BLEND = MODEL_DIR / "test_toy_shanghai-cinema.blend"
CINEMA_GLB = MODEL_DIR / "test_toy_shanghai-cinema.glb"
CINEMA_CANONICAL = PREVIEW_DIR / "test_toy_shanghai-cinema_canonical_preview.png"
CINEMA_SIDE = PREVIEW_DIR / "test_toy_shanghai-cinema_side_preview.png"


SUN_PALETTE = {
    "SunKe_StuccoWarm": ("#F3DFC1", 0.92),
    "SunKe_StuccoShade": ("#D9BFA0", 0.94),
    "SunKe_WarmStoneTrim": ("#FFF1D6", 0.90),
    "SunKe_TerracottaRoof": ("#D9795F", 0.91),
    "SunKe_DeepTealGlass": ("#78BDB4", 0.42),
    "SunKe_DarkIronAndWood": ("#58615B", 0.78),
    "SunKe_GardenGreen": ("#7FAB6C", 0.94),
    "SunKe_BrickPath": ("#E39A72", 0.93),
    "PreviewGround": ("#EADDC8", 0.96),
}

CINEMA_PALETTE = {
    "影城象牙白": ("#F5DFC4", 0.90),
    "影城阴影白": ("#E8BEA8", 0.92),
    "影城玻璃": ("#69B7AE", 0.42),
    "影城深框": ("#58615B", 0.78),
    "影城灯光": ("#F3C66E", 0.86),
    "影城广场": ("#C9C1D7", 0.94),
    "影城金属": ("#9AB8AE", 0.72),
    "影城浅玻璃": ("#9BD8CC", 0.46),
    "影城花池": ("#D9997B", 0.93),
    "影城绿植": ("#7FAB6C", 0.94),
    "影城座椅木": ("#D58C68", 0.90),
    "影城铺装缝": ("#A79FB5", 0.96),
    "影城板缝": ("#E9CDB8", 0.93),
}


def load_module(name: str, path: Path) -> ModuleType:
    """按路径只读加载现有确定性生成器。"""
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"无法加载生成器：{path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def configure_soft_world(
    scene: bpy.types.Scene,
    *,
    background: tuple[float, float, float, float] = (0.44, 0.78, 0.76, 1.0),
) -> None:
    """设置明亮、柔软的微缩玩具棚拍环境。"""
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.use_nodes = True
    world_background = scene.world.node_tree.nodes.get("Background")
    if world_background is not None:
        world_background.inputs["Color"].default_value = background
        world_background.inputs["Strength"].default_value = 0.62


def srgb_hex_to_linear_hex(value: str) -> str:
    """把设计色板的 sRGB 十六进制转换为现有影城生成器需要的线性值。"""
    value = value.lstrip("#")
    channels = [int(value[index : index + 2], 16) / 255 for index in (0, 2, 4)]

    def to_linear(channel: float) -> float:
        if channel <= 0.04045:
            return channel / 12.92
        return ((channel + 0.055) / 1.055) ** 2.4

    linear_channels = [round(to_linear(channel) * 255) for channel in channels]
    return "#" + "".join(f"{channel:02X}" for channel in linear_channels)


def point_camera(
    camera: bpy.types.Object,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
    lens: float,
) -> None:
    camera.location = location
    camera.data.lens = lens
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def render(scene: bpy.types.Scene, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def generate_sun_ke_villa() -> dict[str, int | str]:
    """复用已验收的结构生成软陶版孙科别墅。"""
    module = load_module(
        "toy_sun_ke_source",
        ROOT / "scripts" / "create_sun_ke_villa_model.py",
    )
    original_make_material = module.make_material
    original_apply_bevel = module.apply_bevel
    original_add_environment = module.add_preview_environment
    original_join = module.join_asset_objects

    def toy_material(
        name: str,
        color: str,
        roughness: float,
        *,
        alpha: float = 1.0,
        metallic: float = 0.0,
    ) -> bpy.types.Material:
        toy_color, toy_roughness = SUN_PALETTE.get(name, (color, max(roughness, 0.86)))
        if "Glass" in name:
            alpha = min(alpha, 0.76)
            metallic = 0.0
        else:
            metallic = min(metallic, 0.04)
        material = original_make_material(
            name,
            toy_color,
            toy_roughness,
            alpha=alpha,
            metallic=metallic,
        )
        material["style_study"] = "soft-toy-b"
        return material

    def toy_bevel(obj: bpy.types.Object, width: float, segments: int = 2) -> None:
        if width <= 0:
            return
        original_apply_bevel(obj, min(width * 1.7, 0.14), max(3, segments))

    def toy_environment() -> bpy.types.Object:
        camera = original_add_environment()
        configure_soft_world(bpy.context.scene)
        camera.data.lens = 58
        ground = bpy.data.objects.get("test_preview_ground")
        if ground is not None:
            ground.scale *= 1.18
        key = bpy.data.objects.get("test_preview_key")
        if key is not None:
            key.data.energy = 1750
            key.data.size = 8.5
        fill = bpy.data.objects.get("test_preview_fill")
        if fill is not None:
            fill.data.energy = 980
            fill.data.size = 7.0
        sun = bpy.data.objects.get("test_preview_sun")
        if sun is not None:
            sun.data.energy = 1.25
            sun.data.angle = math.radians(26)
        return camera

    def toy_join() -> bpy.types.Object:
        asset = original_join()
        asset.name = "ToySunKeVilla_Runtime"
        asset.data.name = "ToySunKeVilla_Runtime_Mesh"
        asset["asset_id"] = "test-toy-sun-ke-villa"
        asset["style_study"] = "soft-toy-b"
        asset["source_asset"] = "sun-ke-villa"
        return asset

    module.make_material = toy_material
    module.apply_bevel = toy_bevel
    module.add_preview_environment = toy_environment
    module.join_asset_objects = toy_join
    module.OUTPUT_GLB = SUN_GLB
    module.SOURCE_BLEND = SUN_BLEND
    module.CANONICAL_PREVIEW = SUN_CANONICAL
    module.RIGHT_PREVIEW = SUN_SIDE
    module.NORTH_PREVIEW = SUN_ENTRANCE
    module.BATCH_MASSING_PREVIEW = PREVIEW_DIR / "test_toy_sun-ke-villa_massing_preview.png"
    module.BATCH_IDENTITY_PREVIEW = PREVIEW_DIR / "test_toy_sun-ke-villa_identity_preview.png"
    module.BATCH_SITE_PREVIEW = PREVIEW_DIR / "test_toy_sun-ke-villa_site_preview.png"

    module.main()
    return {
        "asset": "test-toy-sun-ke-villa",
        "blend": str(SUN_BLEND),
        "glb": str(SUN_GLB),
        "bytes": SUN_GLB.stat().st_size,
    }


def setup_cinema_preview_environment(module: ModuleType) -> tuple[bpy.types.Scene, bpy.types.Object]:
    """为上海影城创建与孙科别墅一致的玩具棚拍环境。"""
    scene = bpy.context.scene
    configure_soft_world(scene, background=(0.42, 0.80, 0.78, 1.0))

    ground_material = module.material("影城广场", "#C9C1D7", roughness=0.94)
    bpy.ops.mesh.primitive_plane_add(size=95, location=(0, 0, -0.08))
    ground = bpy.context.object
    ground.name = "test_toy_cinema_ground"
    ground.data.materials.append(ground_material)

    bpy.ops.object.light_add(type="AREA", location=(-18.0, -26.0, 34.0))
    key = bpy.context.object
    key.name = "test_toy_cinema_key"
    key.data.energy = 3300
    key.data.shape = "DISK"
    key.data.size = 28.0

    bpy.ops.object.light_add(type="AREA", location=(26.0, 18.0, 24.0))
    fill = bpy.context.object
    fill.name = "test_toy_cinema_fill"
    fill.data.energy = 1700
    fill.data.size = 24.0

    bpy.ops.object.light_add(type="SUN", location=(0, 0, 30))
    sun = bpy.context.object
    sun.name = "test_toy_cinema_sun"
    sun.rotation_euler = (math.radians(28), math.radians(-22), math.radians(-32))
    sun.data.energy = 1.1
    sun.data.angle = math.radians(28)

    bpy.ops.object.camera_add(location=(12.0, -50.0, 7.5))
    camera = bpy.context.object
    camera.name = "test_toy_cinema_camera"
    camera.data.sensor_width = 36
    scene.camera = camera
    return scene, camera


def export_selected_glb(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_extras=True,
    )


def generate_shanghai_cinema() -> dict[str, int | str]:
    """复用当前工作区已验收结构，隔离生成软陶版上海影城。"""
    module = load_module(
        "toy_shanghai_cinema_source",
        ROOT / "scripts" / "create_xinhua_road_models.py",
    )
    original_material = module.material
    original_add_box = module.add_box

    def toy_material(
        name: str,
        color: str,
        *,
        roughness: float = 0.78,
        metallic: float = 0.0,
        alpha: float = 1.0,
        emission_strength: float = 0.0,
    ) -> bpy.types.Material:
        toy_color, toy_roughness = CINEMA_PALETTE.get(name, (color, max(roughness, 0.86)))
        if "玻璃" in name:
            metallic = 0.0
            alpha = min(alpha, 0.72)
        else:
            metallic = min(metallic, 0.05)
        result = original_material(
            name,
            srgb_hex_to_linear_hex(toy_color),
            roughness=toy_roughness,
            metallic=metallic,
            alpha=alpha,
            emission_strength=emission_strength,
        )
        result["style_study"] = "soft-toy-b"
        return result

    def toy_add_box(
        name: str,
        location: tuple[float, float, float],
        dimensions: tuple[float, float, float],
        mat: bpy.types.Material,
        *,
        bevel: float = 0.0,
        rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
        asset: bool = True,
    ) -> bpy.types.Object:
        smallest = max(0.01, min(abs(value) for value in dimensions))
        if bevel > 0:
            toy_width = min(bevel * 1.55, smallest * 0.22)
        elif smallest >= 0.35:
            toy_width = min(0.045, smallest * 0.10)
        else:
            toy_width = 0.0
        return original_add_box(
            name,
            location,
            dimensions,
            mat,
            bevel=toy_width,
            rotation=rotation,
            asset=asset,
        )

    module.material = toy_material
    module.add_box = toy_add_box
    module.clear_scene()
    module.build_shanghai_cinema()
    source_object_count = len(module.ASSET_OBJECTS)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(CINEMA_BLEND))

    module.merge_asset_objects("ToyShanghaiCinema_Runtime")
    asset = module.ASSET_OBJECTS[0]
    asset["asset_id"] = "test-toy-shanghai-cinema"
    asset["style_study"] = "soft-toy-b"
    asset["source_asset"] = "shanghai-cinema"
    asset["source_object_count"] = source_object_count

    bpy.ops.object.select_all(action="DESELECT")
    asset.select_set(True)
    bpy.context.view_layer.objects.active = asset
    export_selected_glb(CINEMA_GLB)

    scene, camera = setup_cinema_preview_environment(module)
    world_background = scene.world.node_tree.nodes.get("Background")
    if world_background is not None:
        world_background.inputs["Strength"].default_value = 0.34
    key = bpy.data.objects.get("test_toy_cinema_key")
    if key is not None:
        key.data.energy = 2200
    fill = bpy.data.objects.get("test_toy_cinema_fill")
    if fill is not None:
        fill.data.energy = 950
    point_camera(camera, (12.0, -50.0, 8.0), (0.0, -0.6, 6.2), 50)
    render(scene, CINEMA_CANONICAL)
    point_camera(camera, (39.0, -34.0, 10.0), (4.0, -0.2, 6.5), 54)
    render(scene, CINEMA_SIDE)

    return {
        "asset": "test-toy-shanghai-cinema",
        "blend": str(CINEMA_BLEND),
        "glb": str(CINEMA_GLB),
        "bytes": CINEMA_GLB.stat().st_size,
        "sourceObjects": source_object_count,
    }


def run_step(label: str, generator: Callable[[], dict[str, int | str]]) -> dict[str, int | str]:
    print(f"开始生成：{label}")
    result = generator()
    print(f"生成完成：{result}")
    return result


def main() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    requested = {
        argument.removeprefix("--asset=")
        for argument in sys.argv
        if argument.startswith("--asset=")
    }
    generators = {
        "sun-ke-villa": ("孙科别墅软陶样板", generate_sun_ke_villa),
        "shanghai-cinema": ("上海影城软陶样板", generate_shanghai_cinema),
    }
    missing = requested - generators.keys()
    if missing:
        raise ValueError(f"未知样板资产：{', '.join(sorted(missing))}")
    selected = generators.items() if not requested else (
        (slug, generators[slug]) for slug in requested
    )
    results = [
        run_step(label, generator)
        for _, (label, generator) in selected
    ]
    print("软陶建筑风格样板全部生成完成：")
    for result in results:
        print(result)


if __name__ == "__main__":
    main()
