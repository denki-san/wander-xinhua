#!/usr/bin/env python3
"""Remove saved preview-only data from selected building source Blend files."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy


ALLOWED_SOURCE_SUFFIXES = {
    "xinhua-pocket-park": (
        "assets/models/source/tiers/xinhua-road/massing-v2/"
        "xinhua-pocket-park-massing.blend"
    ),
    "fics-xinhua-365": (
        "assets/models/source/tiers/xinhua-road/massing-v2/"
        "fics-xinhua-365-massing.blend"
    ),
    "shanghai-orchestra": (
        "assets/models/source/tiers/xinhua-road/massing-v2/"
        "shanghai-orchestra-massing.blend"
    ),
}
PREVIEW_PREFIX = "test-preview-"


def parse_arguments() -> argparse.Namespace:
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset", required=True, choices=sorted(ALLOWED_SOURCE_SUFFIXES))
    return parser.parse_args(arguments)


def main() -> None:
    args = parse_arguments()
    source_path = Path(bpy.data.filepath).resolve()
    expected_suffix = ALLOWED_SOURCE_SUFFIXES[args.asset]
    if not source_path.as_posix().endswith(expected_suffix):
        raise RuntimeError(
            f"{args.asset} source 不匹配允许路径：{source_path}"
        )

    # 只删除生成器保存的预览地面；建筑网格、材质和变换保持不变。
    removed_objects = []
    for scene_object in list(bpy.data.objects):
        if scene_object.name.startswith(PREVIEW_PREFIX):
            removed_objects.append(scene_object.name)
            bpy.data.objects.remove(scene_object, do_unlink=True)

    removed_data = {}
    for label, collection in (
        ("materials", bpy.data.materials),
        ("cameras", bpy.data.cameras),
        ("lights", bpy.data.lights),
    ):
        names = []
        for block in list(collection):
            if block.name.startswith(PREVIEW_PREFIX) and block.users == 0:
                names.append(block.name)
                collection.remove(block)
        removed_data[label] = names

    if removed_objects != ["test-preview-ground"]:
        raise RuntimeError(
            f"{args.asset} 预览对象集合异常：{removed_objects}"
        )

    remaining_objects = list(bpy.context.scene.objects)
    if not remaining_objects or any(
        scene_object.name.startswith(PREVIEW_PREFIX)
        for scene_object in remaining_objects
    ):
        raise RuntimeError(f"{args.asset} source 清理后对象集合无效")
    if any(scene_object.type != "MESH" for scene_object in remaining_objects):
        raise RuntimeError(f"{args.asset} source 仍含非建筑 Mesh 之外的对象")

    bpy.ops.wm.save_as_mainfile(filepath=str(source_path))
    print(
        json.dumps(
            {
                "assetId": args.asset,
                "source": str(source_path),
                "removedObjects": removed_objects,
                "removedData": removed_data,
                "remainingObjects": [
                    scene_object.name for scene_object in remaining_objects
                ],
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
