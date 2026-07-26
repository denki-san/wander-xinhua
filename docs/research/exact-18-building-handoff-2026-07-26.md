# Exact 18 Building Handoff — 2026-07-26

## 1. Handoff conclusion

This checkpoint covers exactly 18 buildings. The authoritative status is:

- **8 / 18 complete**
- **10 / 18 blocked or Massing-only**
- the integration Worktree was audited clean at base
  `719e945e5d0059556e0a95dca3f0b87a314645eb`; this handoff document is the
  following additive documentation commit
- Recovery/Hold is clean at
  `3044cd89f801250afcd477dfbcbc7da358bf4b11`
- no tree, decoration, full-map or extra-building asset was merged from Recovery
- no blocked building was moved, scaled, given a narrower road or promoted merely
  to make a test pass
- no building was removed from runtime in this checkpoint

The 18-building production objective is **not complete**. This document closes
the current window safely and records every completed and unfinished item for a
new main-window continuation.

## 2. Authoritative Git state

| Item | Value |
| --- | --- |
| Integration Worktree | `/Users/lei/App_developing/wander-xinhua/.worktrees/integration-18-buildings` |
| Integration branch | `codex/integrate-18-buildings` |
| Handoff base HEAD | `719e945e5d0059556e0a95dca3f0b87a314645eb` |
| Integration status at handoff | clean |
| Current local `main` at review | `cb3fb142ff8356aeebbcad9006a2f140d34282ea` |
| `main...integration` divergence | integration is 234 commits ahead and 13 commits behind |
| Recovery/Hold Worktree | `/Users/lei/App_developing/wander-xinhua-all-models-v3` |
| Recovery/Hold branch | `codex/hold-all-models-v3-recovery-20260725` |
| Recovery/Hold commit | `3044cd89f801250afcd477dfbcbc7da358bf4b11` |
| Recovery/Hold status at handoff | clean |

Do not directly merge the whole Recovery branch. Do not assume the integration
branch can be blindly fast-forwarded into `main`: first inspect the 13 newer
`main` commits, preserve unrelated dirty work, then reconcile shared files in the
main window.

## 3. Scope invariants

Included:

- `shanghai-cinema`
- `film-art-center`
- `one-step-garden`
- `xinhua-villas-211`
- `xinhua-villas-329`
- `house-315`
- `villa-le-bec`
- `shanghai-orchestra`
- `hudec-memorial`
- `xinhua-pocket-park`
- `xinhua-community-center`
- `debi-fahua-525`
- `fahua-heritage`
- `fics-xinhua-365`
- `xingfuli-west`
- `xingfuli-center`
- `xingfuli-east`
- `sun-ke-villa`

Explicitly excluded and retained as Hold:

- all trees
- all decorations and street furniture
- full-map Massing and ordinary OSM building imports
- extra Shangsheng/Huashan buildings
- facility/shared prototypes
- provisional shared runtime drafts
- any asset outside the exact 18

## 4. Project-level completed work

1. The lost `all-models-v3` session was preserved as an immutable Recovery/Hold
   checkpoint. The snapshot contains 882 files and is no longer dirty.
2. The exact-18 Fast Mode pipeline is integrated. Building branches run only
   specialty tests and selected GLB audits; the main window runs one full
   regression per 2–3 integrated buildings.
3. The exact-18 manifest, production roster and machine-readable status matrix
   are in place:
   - `docs/research/building-pipeline-fast-mode.json`
   - `docs/research/building-production-roster.md`
   - `docs/research/exact-18-building-status.json`
4. Recovery-qualified stages were reused rather than rebuilt when their
   provenance and current binary were accepted.
5. Hero, Identity, Massing, Blender MCP 1/2/3, map and Three.js decisions are
   separated. A runtime pass does not override a failed evidence or map gate.
6. Three.js batch QA records cover the requested tier, fallback, performance and
   deterministic collision paths for accepted buildings.
7. Shanghai Cinema public evidence was stored in `Threejs-3d-research`; both
   sources are searchable and readable. The research workflow is complete, but
   the exact map anchor remains blocked.
8. A read-only live OSM refresh rechecked 41 blocked-building-related ways. All
   41 returned, with zero parent relations and no new width, member binding,
   passage semantic or exact-anchor control point:
   - `docs/research/exact-18-blocked-live-osm-refresh-2026-07-26.json`
   - `docs/research/data/exact-18-blocked-live-osm-20260726-2126.json`
9. Completed batch regression most recently observed:
   - Xingfuli West/East specialty tests: 99 / 99
   - selected GLB audits: 6 / 6 status `ok`
   - repository test suite: 712 / 712
   - lint: 0 errors, one pre-existing warning in
     `tests/test_house_315_map_position_candidate.test.mjs`
10. Final handoff evidence tests passed 7 / 7 before this document was added.

## 5. All 18 buildings

Legend:

- `Pass`: the current accepted stage has evidence and a current acceptance record.
- `Hold`: files are preserved but may not be promoted.
- `Missing`: the tier does not have an accepted candidate.
- `Diagnostic`: useful for QA only and not production acceptance.

| # | ID | Evidence / tiers / MCP | Map and Three.js | Final status and exact remaining work |
| --- | --- | --- | --- | --- |
| 1 | `shanghai-cinema` | Evidence Pass; Hero Pass; Hybrid Identity Pass; Massing Pass; MCP 1/2/3 Pass | Three-tier runtime Pass; map blocked | **Blocked.** Current plaza is about 24.628 m farther from Xinhua Road than the OSM footprint relationship. Public research confirms the visual problem but provides no north arrow, dimensions and two common GLB/WGS84 control points. Preserve all tiers; do not guess a transform. |
| 2 | `film-art-center` | Evidence, Hero, Identity, Massing and MCP 1/2/3 Pass | Official footprint way `864505138`; tier/fallback/performance/collision Pass | **Complete.** Production position/yaw/scale v2 accepted. |
| 3 | `one-step-garden` | Evidence, Hero, Identity, Massing and MCP 1/2/3 Pass | Map and Three-tier runtime Pass | **Complete.** Production accepted. |
| 4 | `xinhua-villas-211` | Conservative Massing and MCP1 Pass; old Hero Hold; Identity Missing; MCP2/3 blocked | Massing map/runtime Pass only | **Blocked.** Need same-member side/depth evidence, a trustworthy photo-to-OSM-way assignment and valid Hero lineage before Identity. Do not reuse the cross-compound legacy Hero. |
| 5 | `xinhua-villas-329` | Massing v3 and MCP1 Pass; old Hero is cross-asset Hold; Identity Missing; MCP2/3 blocked | Massing map/performance/collision Pass | **Massing complete, Hero/Identity blocked.** Stable ID remains a compound, while available evidence only binds selected members. Need an authorized compound layout or an explicit user decision to redefine the subject; do not silently make one member represent the compound. |
| 6 | `house-315` | Evidence, Hero, Identity, Massing and MCP 1/2/3 Pass | Map and Three-tier runtime Pass | **Complete.** Production accepted. |
| 7 | `villa-le-bec` | Multi-view evidence Pass; Hero v2, current Identity v2, Massing and MCP 1/2/3 Pass | Map, tier/fallback/performance/collision Pass | **Complete.** Production wiring accepted; Identity v1 remains Hold. |
| 8 | `shanghai-orchestra` | Local evidence cannot bind the campus members; diagnostic Massing/MCP1 only; Hero Hold or missing; Identity Missing | Diagnostic runtime only; map membership blocked | **Blocked.** Nine adjacent OSM buildings still have no name, address or relation, and the current five-way set is not authoritative. Need a dimensioned owner/architect plan, cadastral membership or equivalent binding. |
| 9 | `hudec-memorial` | Evidence, Hero, Identity, Massing and MCP 1/2/3 Pass | Map and Three-tier runtime Pass | **Complete.** Production accepted. |
| 10 | `xinhua-pocket-park` | Evidence, Hero, Identity, Massing and MCP 1/2/3 Pass | Map and tier/fallback/performance/collision Pass | **Complete.** Production accepted. |
| 11 | `xinhua-community-center` | Building 4 Massing and MCP1 Pass; legacy Hero Hold; Identity Missing; MCP2/3 blocked | Diagnostic collision Pass; formal map blocked | **Blocked.** The exact building footprint overlaps rendered `新华路345弄` asphalt by 0.402635 scene units, about 1.087115 m. OSM has no width/lanes tag. The geometric zero-overlap width is not authority to narrow the road. |
| 12 | `debi-fahua-525` | Footprint evidence partial; old Hero scope-polluted Hold; Identity Missing; candidate Massing not accepted through MCP1 | Recovery visibility only; map blocked | **Blocked.** Representative footprint overlaps Fahuazhen Road by 0.633229 scene units, and the five candidate compound members lack authoritative binding. Need a georeferenced site plan/cadastral boundary and valid tier lineage. |
| 13 | `fahua-heritage` | One front view only; legacy Hero Hold; Identity Missing; Massing conditional geometry only; MCP gates blocked | Formal map/runtime not accepted | **Blocked.** Need same-subject side/rear, entrance, street interface and site boundary. When the user is present, search Xiaohongshu slowly. If still insufficient, disable only this building in runtime and retain every source and binary file. |
| 14 | `fics-xinhua-365` | Built-photo identity cues and Recovery Massing retained; diagnostic MCP1; Hero Hold; Identity Missing | Diagnostic Massing runtime only; map blocked | **Blocked.** Five OSM candidates have no campus membership relation, and way `864493177` intersects the currently rendered private service surface. Existing launch renders are already stored and have no north arrow, scale or member labels. |
| 15 | `xingfuli-west` | Hero retained; strict-lineage Identity v2/Massing v2 and batched MCP 1/2/3 Pass | Three-tier/fallback/performance/collision Pass; map blocked | **Blocked.** OSM way `400066625` is only a two-point pedestrian centerline. Need the nine original user photos and proof of the ground-level passage width, walls and openings before modifying collision geometry. |
| 16 | `xingfuli-center` | Hero retained; strict-lineage Identity v2/Massing v2 and MCP 1/2/3 Pass | Map and Three-tier/fallback/performance/collision Pass | **Complete.** Production Hero retained with accepted v2 tier contract. |
| 17 | `xingfuli-east` | Hero retained; strict-lineage Identity v2/Massing v2 and batched MCP 1/2/3 Pass | Three-tier/fallback/performance/collision Pass; map blocked | **Blocked.** South building, entrance wall and lane base intersect the Panyu Road contract. The user's photo 9 has not been materialized and cannot yet identify the opposite road. |
| 18 | `sun-ke-villa` | Recovery Hero/Identity/Massing selected after comparison; MCP 1/2/3 Pass | Map, tier/fallback/performance/collision Pass | **Complete.** Production accepted; Recovery binaries were not blindly overwritten by the heavier checkpoint. |

## 6. Completed buildings

The following eight buildings have all required current gates closed:

1. `film-art-center`
2. `one-step-garden`
3. `house-315`
4. `villa-le-bec`
5. `hudec-memorial`
6. `xinhua-pocket-park`
7. `xingfuli-center`
8. `sun-ke-villa`

Do not rebuild them in the next window. They should only participate in
project-level regression and conflict checks when shared files are reconciled.

## 7. Unfinished buildings

The following ten buildings still require work:

1. `shanghai-cinema`: exact georeferenced anchor.
2. `xinhua-villas-211`: same-member depth, member-way binding, Hero lineage and
   Identity.
3. `xinhua-villas-329`: compound subject contract, Hero lineage and Identity.
4. `shanghai-orchestra`: authoritative campus membership, Hero and Identity.
5. `xinhua-community-center`: authoritative service-road boundary/width.
6. `debi-fahua-525`: road overlap, compound membership and all accepted tiers.
7. `fahua-heritage`: multi-view/street evidence, all formal gates.
8. `fics-xinhua-365`: campus membership, service-road boundary, Hero and
   Identity.
9. `xingfuli-west`: original-photo materialization and passage geometry.
10. `xingfuli-east`: original-photo materialization and Panyu Road boundary.

## 8. Work explicitly not completed

- The integration branch has **not** been reconciled with the 13 newer `main`
  commits.
- The integration branch has **not** been merged into `main`.
- This checkpoint has **not** been pushed or deployed.
- No Sites or VPS deployment acceptance was requested or performed.
- Xiaohongshu searches for the remaining evidence gaps were not performed while
  the user was sleeping.
- The user's nine original Xingfuli photos are not materialized in the
  repository; existing public web references must not be relabeled as those
  originals.
- No blocked building has yet reached the user's final fallback decision of
  runtime disable after a failed slow Xiaohongshu search.
- Legacy building Worktrees have not been deleted. Treat them as historical
  evidence until the integration branch is reconciled and accepted.
- The existing House315 ESLint warning remains:
  `_role` is defined but never used in
  `tests/test_house_315_map_position_candidate.test.mjs`.

## 9. Recommended continuation batches

Keep only 2–3 active building Worktrees and let the main window own shared files.

### Batch A — logged-in evidence, user present

- `shanghai-cinema`
- `fahua-heritage`
- optionally `xinhua-villas-211`

Use the user's browser slowly for Xiaohongshu only after public/local evidence is
confirmed insufficient. Save new evidence additively. If the search is also
insufficient, record the failure and apply the user's runtime-disable fallback
only to the individual building; preserve all files.

### Batch B — compound membership

- `xinhua-villas-211`
- `xinhua-villas-329`
- `shanghai-orchestra`

Do not invent member mappings. Require a plan, cadastral/doorplate binding,
orthorectified image or explicit user subject redefinition.

### Batch C — road boundary and campus membership

- `xinhua-community-center`
- `debi-fahua-525`
- `fics-xinhua-365`

Do not narrow generic roads by reverse-solving the width required for a pass.

### Batch D — original-photo route

- `xingfuli-west`
- `xingfuli-east`

Materialize all nine original files read-only, record SHA-256, dimensions and
EXIF or explicit metadata absence, then map every photo to west/center/east or
Unknown.

## 10. Fast Mode commands

Inspect a batch before running:

```bash
npm run building:fast -- --batch id1,id2,id3 --plan
```

Building branches run specialty checks only:

```bash
npm run building:fast -- --building building-id
```

After the main window integrates 2–3 buildings:

```bash
npm run building:fast -- --batch id1,id2,id3 --full
```

The `--full` run is the only per-batch path that adds the repository-wide
`npm test` and `npm run lint`.

## 11. New-window start procedure

1. Open the integration Worktree, not local `main`.
2. Confirm `git status --short` is empty and HEAD is the handoff commit recorded
   in this document's integration commit.
3. Read:
   - this handoff
   - `docs/research/exact-18-building-status.json`
   - `docs/research/building-production-roster.md`
   - `docs/research/building-pipeline-fast-mode.json`
4. Recheck current `main`, Recovery/Hold and all active Worktrees before any
   merge or cleanup.
5. Select one recommended 2–3 building batch.
6. Keep evidence classification as Observed / Inferred / Unknown.
7. Keep all shared registry, manifest, status and runtime edits in the main
   integration window.
8. Run a full batch regression only after 2–3 buildings are integrated.

Suggested prompt for the new window:

```text
Continue the wander-xinhua exact-18 building task from:
/Users/lei/App_developing/wander-xinhua/.worktrees/integration-18-buildings

Use branch codex/integrate-18-buildings and first read:
docs/research/exact-18-building-handoff-2026-07-26.md
docs/research/exact-18-building-status.json
docs/research/building-production-roster.md
docs/research/building-pipeline-fast-mode.json

Reverify HEAD and clean status before acting. Preserve Recovery/Hold commit
3044cd89f801250afcd477dfbcbc7da358bf4b11 and never merge it wholesale.
There are 8 complete and 10 blocked/Massing-only buildings. Do not rebuild
accepted stages. Use 2–3 medium building Worktrees, with xhigh main-window
evidence/MCP/map/shared integration. Do not touch trees, decorations, full-map
assets or any building outside the exact 18. Do not fake map acceptance by
moving/scaling buildings or narrowing roads. Use slow Xiaohongshu research only
when the user is present; if public plus Xiaohongshu evidence is still
insufficient, disable only that building in runtime and preserve all files.
```
