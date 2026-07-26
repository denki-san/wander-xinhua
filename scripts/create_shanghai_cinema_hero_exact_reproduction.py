"""从已验收且 SHA 锁定的上海影城 Hero Blend 精确复现隔离 GLB。

本脚本不重建几何，也不写入 public、共享 registry、runtime 或 manifest。
调用方必须先让 Blender 以 ``assets/models/source/xinhua-road/shanghai-cinema.blend``
启动，再把 ``--output`` 指向专属 test_artifacts 目录中的新文件。
"""

from __future__ import annotations

import argparse
import hashlib
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
SOURCE_BLEND = ROOT / "assets/models/source/xinhua-road/shanghai-cinema.blend"
SOURCE_BLEND_SHA256 = (
    "fbb13fdb89169101c97bda0f3e5ba9644c70743aa85bd810368b365969db8fd8"
)
EXPECTED_GLB_SHA256 = (
    "c4d557038677c9c48577636843fb784b496f4a92fc9ea6bbb1d5ca78e822c062"
)
EXPECTED_GLB_BYTES = 5_862_660
OUTPUT_ROOT = ROOT / "test_artifacts/shanghai-cinema-hero-exact-reproduction"
EXPECTED_OBJECT_NAME = "shanghai-cinema"


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_arguments() -> argparse.Namespace:
    script_args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(
        description="从冻结上海影城 Hero Blend 导出隔离 exact reproduction GLB"
    )
    parser.add_argument("--output", required=True)
    return parser.parse_args(script_args)


def resolve_output_path(raw_output: str) -> Path:
    candidate = Path(raw_output)
    if not candidate.is_absolute():
        candidate = ROOT / candidate
    candidate = candidate.resolve()
    output_root = OUTPUT_ROOT.resolve()
    try:
        candidate.relative_to(output_root)
    except ValueError as error:
        raise ValueError(f"输出必须位于 {output_root}") from error
    if candidate.suffix.lower() != ".glb":
        raise ValueError("输出必须使用 .glb 后缀")
    if candidate.exists():
        raise FileExistsError(f"拒绝覆盖既有候选：{candidate}")
    return candidate


def verify_frozen_source() -> None:
    if file_sha256(SOURCE_BLEND) != SOURCE_BLEND_SHA256:
        raise RuntimeError("上海影城冻结 Hero Blend SHA 不匹配")
    active_blend = Path(bpy.data.filepath).resolve()
    if active_blend != SOURCE_BLEND.resolve():
        raise RuntimeError(
            "必须让 Blender 直接加载冻结 Hero Blend 后再运行本脚本："
            f"{active_blend}"
        )


def export_exact_candidate(output_path: Path) -> None:
    verify_frozen_source()
    mesh_object = bpy.data.objects.get(EXPECTED_OBJECT_NAME)
    if mesh_object is None or mesh_object.type != "MESH":
        raise RuntimeError(f"冻结 Blend 缺少唯一网格对象：{EXPECTED_OBJECT_NAME}")
    mesh_objects = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    if mesh_objects != [mesh_object]:
        names = ", ".join(obj.name for obj in mesh_objects)
        raise RuntimeError(f"冻结 Blend 网格对象集合漂移：{names}")
    if mesh_object.get("runtime_x_mirrored") is not True:
        raise RuntimeError("冻结 Blend 缺少 runtime_x_mirrored provenance")

    # 历史生成器先保存 canonical Blend，再仅在内存中镜像运行时 GLB。
    mesh_object.data.transform(Matrix.Scale(-1.0, 4, Vector((1.0, 0.0, 0.0))))
    mesh_object.data.flip_normals()
    mesh_object.data.update()

    bpy.ops.object.select_all(action="DESELECT")
    mesh_object.select_set(True)
    bpy.context.view_layer.objects.active = mesh_object
    output_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_extras=True,
    )
    output_sha256 = file_sha256(output_path)
    output_bytes = output_path.stat().st_size
    if output_sha256 != EXPECTED_GLB_SHA256 or output_bytes != EXPECTED_GLB_BYTES:
        raise RuntimeError(
            "导出结果没有精确复现已验收 Hero："
            f"bytes={output_bytes} sha256={output_sha256}"
        )
    print(
        "上海影城 Hero exact reproduction 候选已导出："
        f"{output_path} bytes={output_bytes} sha256={output_sha256}"
    )


def main() -> None:
    arguments = parse_arguments()
    export_exact_candidate(resolve_output_path(arguments.output))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # Blender 后台执行时保留完整错误栈。
        print(f"生成失败：{error}", file=sys.stderr)
        raise
