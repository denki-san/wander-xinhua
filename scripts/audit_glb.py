"""检查 GLB 结构、运行时节点数量和是否嵌入图片。"""

from __future__ import annotations

import argparse
import json
import struct
import sys
from pathlib import Path


JSON_CHUNK = 0x4E4F534A


def parse_glb(path: Path) -> dict:
    data = path.read_bytes()
    if len(data) < 20 or data[:4] != b"glTF":
        raise ValueError("不是有效的 GLB 容器")
    version, declared_length = struct.unpack_from("<II", data, 4)
    if version != 2:
        raise ValueError(f"只支持 glTF 2.0，当前版本为 {version}")
    if declared_length != len(data):
        raise ValueError(f"声明长度 {declared_length} 与文件长度 {len(data)} 不一致")
    chunk_length, chunk_type = struct.unpack_from("<II", data, 12)
    if chunk_type != JSON_CHUNK:
        raise ValueError("GLB 第一数据块不是 JSON")
    return json.loads(data[20:20 + chunk_length].decode("utf-8").rstrip(" \t\r\n\0"))


def main() -> int:
    parser = argparse.ArgumentParser(description="检查一个或多个 GLB 的结构摘要")
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--forbid-images", action="store_true", help="发现内嵌图片或纹理时失败")
    parser.add_argument("--max-nodes", type=int, help="允许的最大运行时节点数")
    args = parser.parse_args()
    failed = False
    for path in args.paths:
        try:
            document = parse_glb(path)
            summary = {
                "path": str(path),
                "bytes": path.stat().st_size,
                "nodes": len(document.get("nodes", [])),
                "meshes": len(document.get("meshes", [])),
                "materials": len(document.get("materials", [])),
                "images": len(document.get("images", [])),
                "textures": len(document.get("textures", [])),
            }
            violations = []
            if args.forbid_images and (summary["images"] or summary["textures"]):
                violations.append("包含图片或纹理")
            if args.max_nodes is not None and summary["nodes"] > args.max_nodes:
                violations.append(f"节点数 {summary['nodes']} 超过上限 {args.max_nodes}")
            summary["status"] = "failed" if violations else "ok"
            if violations:
                summary["violations"] = violations
                failed = True
            print(json.dumps(summary, ensure_ascii=False))
        except (OSError, ValueError, json.JSONDecodeError) as error:
            failed = True
            print(json.dumps({"path": str(path), "status": "failed", "error": str(error)}, ensure_ascii=False))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
