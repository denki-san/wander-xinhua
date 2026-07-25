# Building Height Calibration Decision Log

## Outcome

The approved building-height evidence strategy was executed in the isolated
`codex/building-height-calibration` branch and worktree. An 80-building PoC
passed the matching, licence and visual-quality gates before the workflow was
allowed to create the full 730-building evidence set.

The final result is deliberately conservative:

- `11` buildings are `A — verified` from direct OSM height or explicit floors;
- `43` buildings are `B — matched estimate` from strict, one-to-one
  3D-GloBFP matches;
- `676` buildings remain `C — heuristic`;
- `11` buildings have no 3D-GloBFP spatial candidate;
- `676` candidate assignments were rejected by at least one frozen threshold;
- no ambiguous source assignment was accepted.

The PoC and full GLBs have the same SHA because the evidence-rich PoC contains
all 43 globally acceptable `B` matches and all 11 `A` records. Full rollout
adds the remaining per-building `C` evidence records without changing their
baseline heights.

## Source and raw-data decisions

| Source | Role | Licence decision | Result |
| --- | --- | --- | --- |
| OpenStreetMap snapshot | Footprint source of record and direct tags | ODbL 1.0; visible attribution retained | 730 accepted runtime footprints; 11 direct-height/floor records |
| 3D-GloBFP 2020 | Independent modelled height candidate | CC BY 4.0; source archive and extract hashes recorded | 43 strict one-to-one matches accepted |
| Overture Buildings `2026-07-22.0` | Provenance and conditional candidate source | Per-feature licence preserved | All height/floor fields in the bbox were OSM-derived, so none were double-counted as independent |
| GlobalBuildingAtlas | Approved auxiliary candidate only | `GBA.Height` / `GBA.LoD1` are CC BY-NC 4.0 | Official endpoint returned HTTP 403; no value imported |

The 3D-GloBFP China archive is retained read-only outside Git at:

`/Volumes/plugin/3D_Modeling_ThreeJS_Knowledge_Base/building-height-calibration/xinhua-20260725/raw/China_4.rar`

Its verified MD5 is `8476dc9ee2ff403d9f524faa1627296d`. The extracted
Shanghai shapefile and DBF are also retained read-only under the adjacent
`extracted/China_4/` directory. Derived, reviewable bbox sources remain in
`docs/research/data/`; no earlier raw snapshot or crawler output was deleted or
overwritten.

## Frozen matching policy

No threshold was loosened after observing the source:

- footprint IoU `>= 0.70`;
- centroid distance `<= 5 m`;
- target/source area ratio `0.67–1.50`;
- one-to-one source assignment;
- finite selected height `3–90 m`;
- direct OSM evidence wins over modelled estimates;
- ambiguous, rejected and unmatched records retain the existing `C` height.

The first PoC sample underrepresented matchable buildings. A diagnostic across
all 730 footprints found 43 globally valid one-to-one matches. The deterministic
80-building selection was therefore corrected to include the five required
context strata plus every strict match. The spatial thresholds themselves were
not changed.

## PoC gate

The machine-readable result is
[`building-height-poc-gate.json`](./building-height-poc-gate.json).

| Check | Result |
| --- | --- |
| PoC size | 80 |
| Evidence-backed A/B records | 54 |
| Confidence distribution | A 11 / B 43 / C 26 |
| Manual review | 30 complete: 10 accept / 11 retain-direct / 9 retain-baseline |
| Direct conflicts | 4, all reviewed with direct OSM retained |
| Matching gate | pass |
| Licence gate | pass |
| Visual/build gate | pass |

The three largest modelled changes—`73.15 m`, `60 m` and `58.64 m`—were included
in manual review. Desktop, 390px, Xingfu Road and Fahuazhen Road views showed
normal footprint width, intact POI hierarchy and no needle towers.

## Final runtime result

- GLB:
  `public/models/overview/xinhua-district-massing.glb`
- SHA-256:
  `e4d46d0b59d67e8c4e4a411e1a80333c0ba1310fb353fe1ab6dc881d958d3ee4`
- Size: `682,168` bytes
- Runtime structure: `12` meshes, `3` materials, `11,779` triangles,
  `0` images/textures
- Deterministic replay: pass
- GLB structural audit: pass
- Runtime height mode: `full`
- Browser request: HTTP `200`, `model/gltf-binary`, `682,168` bytes
- Console: `0` errors; only the pre-existing `THREE.Clock` deprecation warning

The visible page disclosure now states:

> 全览街区高度为多源证据估算，非测绘级

## Real-page evidence

| Stage | Desktop canonical | 390px canonical | Additional views |
| --- | --- | --- | --- |
| Baseline | [`test_building_height_baseline_desktop_1440x1024.png`](./test_building_height_baseline_desktop_1440x1024.png) | [`test_building_height_baseline_mobile_390x844.png`](./test_building_height_baseline_mobile_390x844.png) | — |
| PoC | [`test_building_height_poc_desktop_1440x1024.png`](./test_building_height_poc_desktop_1440x1024.png) | [`test_building_height_poc_mobile_390x844.png`](./test_building_height_poc_mobile_390x844.png) | Xingfu Road and Fahuazhen Road |
| Full | [`test_building_height_full_desktop_1440x1024.png`](./test_building_height_full_desktop_1440x1024.png) | [`test_building_height_full_mobile_390x844.png`](./test_building_height_full_mobile_390x844.png) | Xingfu Road and Fahuazhen Road |

The final runtime QA record is
[`test_building_height_full_runtime_qa.json`](./test_building_height_full_runtime_qa.json).

## Verification

- `npm test`: pass, `182/182`
- `npm run lint`: pass
- `scripts/audit_glb.py --forbid-images --max-nodes 13`: pass
- deterministic full generator replay: pass
- `git diff --check`: pass

`npm test` produced the local static and Sites-compatible build artifacts as
part of the existing test script. No Sites version was saved or deployed, and
no VPS files or services were changed.

## Threejs-3d-research Wiki sync

The reusable research note was written first to the external 3D knowledge
source:

`/Volumes/plugin/3D_Modeling_ThreeJS_Knowledge_Base/building-height-calibration/xinhua-20260725/xinhua-building-height-calibration-2026-07-25.md`

It was hard-linked into:

`/Volumes/plugin/Threejs-3d-research/raw/sources/threejs-modeling-knowledge-base/wander-xinhua/building-height-evidence-2026-07-25/`

Both paths resolve to inode `292843`; the source SHA-256 is
`53fab77716938dc2b20558dedf8a669f2702e88712038bf011dcc9489392d912`.
The independent Wiki project was verified with the actual
`llm_wiki_rescan_sources`, `llm_wiki_files`, `llm_wiki_search`,
`llm_wiki_read_file` and `llm_wiki_graph` MCP tools. The ingest queue reached
zero, a second rescan returned zero changes/tasks, search retrieved the new
“730 栋中仅 43 栋进入 B 级” finding, read returned its full content, and the
graph exposed the new calibration source node. Nothing was routed to
TowerOld.

## Known limits and future reuse

- The 676 `C` heights are intentionally unresolved rather than presented as
  measured truth.
- 3D-GloBFP represents 2020 modelled conditions; construction or demolition
  after 2020 remains a currentness risk.
- A single height does not prove roof, podium, facade, entrance, materials or
  unseen sides.
- GlobalBuildingAtlas was not imported because its official endpoint was
  unavailable during this run.
- No `building:part` geometry, new Hero/Identity asset, collision, texture or
  interaction was added.

Future detailed-building Briefs may consume the corresponding A/B/C record, but
must still complete the photo-reference canonical, side/depth and
entrance/identity evidence gates.
