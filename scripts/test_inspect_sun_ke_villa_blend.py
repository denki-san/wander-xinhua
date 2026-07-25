"""只读审计孙科别墅 Hero Blend 的对象、材质与身份构件。"""

import json
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/models/source/sun-ke-villa.blend"
OUTPUT = (
    ROOT
    / "test_artifacts"
    / "all-models"
    / "hero"
    / "sun-ke-villa"
    / "test_sun-ke-villa-hero-blend-audit.json"
)

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))

mesh_objects = []
for obj in sorted(bpy.data.objects, key=lambda item: item.name):
    if obj.type != "MESH":
        continue
    record = {
        "name": obj.name,
        "vertices": len(obj.data.vertices),
        "polygons": len(obj.data.polygons),
        "triangles": sum(max(0, len(poly.vertices) - 2) for poly in obj.data.polygons),
        "materials": [material.name for material in obj.data.materials],
    }
    mesh_objects.append(record)
    print(
        "SUN_KE_OBJECT",
        obj.name,
        f"vertices={record['vertices']}",
        f"polygons={record['polygons']}",
        f"materials={','.join(record['materials'])}",
    )

object_names = [record["name"] for record in mesh_objects]


def matching_names(prefixes: tuple[str, ...]) -> list[str]:
    return [
        name
        for name in object_names
        if any(name.startswith(prefix) for prefix in prefixes)
    ]


signature_cues = {
    "gardenTriplePointedPortal": matching_names(
        ("garden-pointed-portal", "garden-pointed-opening")
    ),
    "gardenUpperRoundWindows": matching_names(("garden-upper-round-window",)),
    "gardenBalcony": matching_names(("garden-balcony",)),
    "roundedEastTower": matching_names(("rounded-east-tower",)),
    "northPorchAndArches": matching_names(
        ("north-porch", "north-entry", "north-round-entry")
    ),
    "northPorteCochereProjection": matching_names(
        ("north-porte-cochere", "north-porch-gable-roof")
    ),
    "roofAndChimney": matching_names(
        ("central-residence-roof", "rounded-east-tower-roof", "main-chimney")
    ),
}

missing_cues = [
    cue
    for cue, matches in signature_cues.items()
    if not matches
]

audit = {
    "version": 1,
    "auditedAt": "2026-07-25",
    "assetId": "sun-ke-villa",
    "tier": "hero",
    "source": "assets/models/source/sun-ke-villa.blend",
    "readOnly": True,
    "savedByAudit": False,
    "meshObjects": len(mesh_objects),
    "vertices": sum(record["vertices"] for record in mesh_objects),
    "polygons": sum(record["polygons"] for record in mesh_objects),
    "trianglesBeforeExportJoin": sum(record["triangles"] for record in mesh_objects),
    "materials": sorted(
        {
            material
            for record in mesh_objects
            for material in record["materials"]
        }
    ),
    "signatureCues": signature_cues,
    "missingSignatureCues": missing_cues,
    "status": "pass" if not missing_cues else "blocked",
}

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n")
print("SUN_KE_AUDIT", OUTPUT)
