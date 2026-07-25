# Shared Prototype Massing Final Independent Review

- Review date: 2026-07-25
- Scope: 5 vegetation prototypes and 7 street-furniture prototypes
- Reviewer role: independent, read-only
- Final result: 12 / 12 Massing pass
- Runtime evidence: static production build, two grouped views, 12 / 12 HTTP 200, 0 failures

## Closed blockers

1. All authored dimensions use `1 scene unit = 2.7m`; the runtime shows a
   1.75m person and a 1m ruler at authored scale.
2. All 12 GLBs have `minY = 0`, no transformed root nodes, and no floating,
   buried, or fragmented geometry.
3. The first-pass tree fork, shrub silhouette, chair count, bollard shape, and
   street-furniture dimensions were corrected in the deterministic generator.
4. The gallery's extra `scaleZ = -1` reflection was removed. Blender `-Y`
   canonical front now maps naturally to Three.js `+Z`.
5. The bin's dual openings, bench backrest, tree-crown handedness, and
   irregular bollard handedness now match the canonical Blender views.

## Per-asset decision

| Asset | Massing | Identity decision |
| --- | --- | --- |
| `xinhua-plane-tree` | Pass | Allowed; exact individual height remains unknown |
| `shangsheng-campus-tree` | Pass as generic envelope | Species Identity blocked |
| `huashan-canopy-tree` | Pass as generic envelope | Species Identity blocked |
| `huashan-understory` | Pass as generic envelope | Species Identity blocked |
| `road-edge-shrub` | Pass as generic envelope | Species Identity blocked |
| `lane-lamp-short-arm` | Pass | Allowed within evidence boundary |
| `cantilever-umbrella` | Pass | Allowed within evidence boundary |
| `outdoor-table-set` | Pass | Allowed within evidence boundary |
| `slatted-bench` | Pass | Allowed within evidence boundary |
| `rectangular-planter` | Pass | Allowed within evidence boundary |
| `shanghai-dual-classification-bin` | Pass | Allowed within evidence boundary |
| `irregular-stone-bollard` | Pass | Allowed within evidence boundary |

Unknown manufacturer, model, age, protected marks, hidden rear details, species,
tree age, density, and individual measured heights must remain unknown unless
new evidence is localized and linked before Identity work.
