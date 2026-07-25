# Building Height Calibration Brief

## Scope contract

- Branch: `codex/building-height-calibration`
- Worktree:
  `/Users/lei/App_developing/wander-xinhua-building-height-calibration`
- Target: one existing overview district context GLB containing 730 accepted OSM
  building instances.
- PoC: 80 deterministic instances spanning direct OSM evidence, low-rise
  houses, medium blocks, current tallest candidates, 幸福路 / 法华镇路 interfaces
  and authored-POI replacement edges.
- Full rollout: blocked until the PoC matching, licence and visual-quality gates
  all pass.
- Retained: 17 authored overview POIs/areas, the current OSM footprint source,
  road setbacks, chunks, materials, opacity, weak-network policy, camera and
  interaction.
- Hold: `building:part` geometry, new Hero/Identity assets, facade/roof
  invention, district collision and interaction.
- Deployment: local only. Sites and VPS publishing are explicitly excluded.

This task calibrates the height dimension of the generic district context
layer. It does not create or upgrade a named real-building Hero, Identity or
Massing asset. The per-building photo-reference identity requirements therefore
remain a future detail-scene gate rather than being fabricated from height data.

## Preflight

| Surface | Result | Evidence |
| --- | --- | --- |
| Baseline source record | pass | 730 accepted buildings; 719 heuristic and 11 OSM-level records |
| Baseline GLB replay | pass | SHA-256 `b61cec4fc93e5326f87845f022abf92008c8254c78bfd95de8ea1e19d4f11dea` |
| Baseline archive | pass | Read-only copy under the external 3D research knowledge base |
| Generator | pass | Single district asset; deterministic double-build SHA check |
| GLB audit | pass | Existing `scripts/audit_glb.py` available |
| Local production-static preview | pass | Vite build and local preview available |
| Browser QA | pass | Codex in-app Chromium browser connected |
| Blender binary | pass, not used | Blender 5.2.0 LTS is available; this data-compiled layer has no editable `.blend` source |
| Blender MCP | not applicable | No named Hero/Identity/Massing asset is being authored in this scope |
| Wiki source root | pass | `/Volumes/plugin/3D_Modeling_ThreeJS_Knowledge_Base` available |

## Coordinate and placement contract

- OSM remains the footprint source of record.
- The existing map origin, projection and `1 scene unit = 2.7 m` contract remain
  unchanged.
- Third-party footprints are used only for spatial matching. They do not replace
  the OSM geometry or road-setback result.
- The selected height is divided by 2.7 in the generator; no runtime scale is
  introduced.
- Generic buildings remain non-colliding, non-raycast, non-shadow-casting
  context objects below authored POIs.

## Evidence contract

### Observed

- The baseline contains 730 accepted buildings.
- Direct OSM height metadata is sparse.
- 3D-GloBFP grid 2435 covers the project area and represents 2020 conditions.
- Overture `2026-07-22.0` exposes per-feature `sources[]`; in the downloaded
  bbox, all height and floor fields are OSM-derived.
- GlobalBuildingAtlas permits the current non-commercial research role under
  its documented BY-NC boundary, but its official access endpoint was not
  available during this run.

### Inferred

- A permitted, one-to-one 3D-GloBFP match that passes the frozen thresholds is
  more informative than the current footprint-area heuristic.
- The 2020 estimate can improve district-scale relative height but cannot prove
  a building's current exact height.

### Unknown

- Buildings changed after 2020.
- Roof, podium, building-part and terrain/roof interactions not represented by a
  single height.
- Facade rhythm, entrances, materials and unseen sides.
- GlobalBuildingAtlas local coverage until its official endpoint becomes
  accessible.

## Matching and permission gates

- IoU `>= 0.70`
- Centroid distance `<= 5 m`
- Target/source area ratio `0.67–1.50`
- One-to-one assignment
- Finite height `3–90 m`
- Direct OSM height or explicit floor count wins.
- 3D-GloBFP candidates are CC BY 4.0 modelled estimates.
- Overture OSM-derived values are provenance confirmation, not independent
  evidence.
- GBA values cannot be selected unless the endpoint, feature, version, licence
  and non-commercial boundary are all recorded.
- Ambiguous, rejected and unmatched candidates retain `C` heuristic height.

The PoC matching gate requires 80 records, at least 40 `A` or `B` records, all
selected `B` records passing the frozen thresholds, and 20–40 completed manual
reviews. These thresholds may be tightened after inspecting the PoC but are not
silently loosened.

## Visual viewpoints

| View | Direction and role | Viewport |
| --- | --- | --- |
| Canonical | `quiet-southwest`; whole-district skyline, boundary and POI hierarchy | 1440 × 1024 |
| Portrait canonical | Same QA start; mobile composition and skyline readability | 390 × 844 |
| Core-road depth | `xingfu-road`; road interface and authored POI hierarchy | 1440 × 1024 |
| Secondary road | `fahuazhen-road`; dense road setback and local height changes | 1440 × 1024 |

Baseline, PoC and full captures use the same QA starts and viewport sizes. The
visual gate rejects obvious extreme towers, flattened landmarks, road/POI
hierarchy loss, overlap, holes or z-fighting.

## Runtime budgets

| Metric | Budget |
| --- | ---: |
| GLB | 3,000,000 bytes |
| Meshes / added draw calls | 12 |
| Materials | 3 |
| Images / textures | 0 |
| Triangles | 100,000 |
| Collision / raycast objects | 0 |

## Completion evidence

- Per-building A/B/C records and source/match fields.
- PoC selection, match report, 30-building manual review, PoC GLB/build record
  and real-page QA.
- A machine-readable PoC gate that refuses full rollout until all three gates
  pass.
- Full 730-building evidence, runtime record, deterministic GLB/build record and
  desktop/390px real-page QA.
- Updated third-party notices, research decision log and Wiki source.
- `npm test`, `npm run lint`, `git diff --check` and GLB audit on the final
  commit.
