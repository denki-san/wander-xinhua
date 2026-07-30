# Blender Model Brief: Xinhua Road Plane Tree Placement V5

## Scope

- Asset slug: `xinhua-road-plane-tree-placement-v5`
- POI / environment / character: important environment placement
- Runtime component: `app/scene/plane-tree-instances.tsx`
- Placement generator: `app/scene/xinhua-road-placement.mjs`
- Editable sources: existing `assets/models/source/xinhua-road/plane-tree-*.blend`
- Runtime GLBs: existing `public/models/xinhua-road/plane-tree-*.glb`
- Start preset: `house315`
- Single-asset build command: not required; this iteration does not change Blender or GLB binaries
- Validation commands:
  - `node --test tests/test_plane_tree_variants.test.mjs`
  - `python3 scripts/audit_glb.py --forbid-images --max-nodes 1 public/models/xinhua-road/plane-tree-*.glb`
  - `npm test`
  - `npm run lint`

## Scope Boundary

This iteration fixes the user-reported spacing and lateral placement of the currently deployed
Xinhua Road tree array. It does not implement the unapproved 256/332-tree road expansion in
`docs/todo/plane-tree-road-expansion.md`, replace other tree species, or change the seven V4
GLB binaries.

## Preflight Gate

- Blender binary and version:
  `/Applications/Blender.app/Contents/MacOS/Blender`, Blender `5.2.0 LTS`
- Generator dry run / affected assets:
  no Blender generator run; only deterministic placement data is in scope
- GLB audit command:
  `python3 scripts/audit_glb.py --forbid-images --max-nodes 1 <seven plane-tree GLBs>`
- Local preview command and port:
  `npm run preview:static -- --host 127.0.0.1 --port 4318`
- Browser/runtime validation path:
  `agent-browser`, production-static `house315`, `cameraQa=1`, deterministic forward movement
- Existing asset baseline:
  83 Xinhua Road placements, 20 pilot placements, four Identity and three Massing GLBs,
  `1,019,888` total GLB bytes, zero images/textures
- Existing screenshot baseline:
  `test_artifacts/test_plane_tree_placement_v5_baseline_standard.png`, 1200 × 807
- Existing collision baseline:
  one small trunk AABB per placement; canopies and buttress roots do not enter the player or
  camera collision layer
- Existing performance baseline:
  V4 weak tier recorded 59.3032 FPS over 120 production-static frames; the current iteration
  must capture a new same-condition before/after pair before making any regression claim
- Fallback path:
  headless Blender is available if a binary regression is found; Blender is not opened while
  binaries remain unchanged. The external evidence volume is currently not mounted, so new
  evidence remains a `test_` work copy until a new immutable snapshot can be created and
  verified.

## Evidence

- Placement manifest:
  `docs/research/plane-tree-placement-v5-reference-manifest.json`
- Reused canonical manifest:
  `docs/research/plane-tree-canopy-v3-reference-manifest.json`
- Reused V4 model/build evidence:
  `docs/research/plane-tree-canopy-v4-model-brief.md` and
  `docs/research/build-records/plane-tree-family-canopy-v4.json`

### View Coverage Matrix

| Evidence slot | Evidence | Questions answered | Coverage |
| --- | --- | --- | --- |
| Canonical | user road-center reference + current `house315` baseline | canopy continuity, trunk rhythm, road relationship | Covered |
| Side / depth | `house315` deterministic road-axis movement | longitudinal spacing and side balance | Covered |
| Identity detail | V4 canonical, side and root previews | trunk, fork, bark and foliage remain unchanged | Reused |
| Site relationship | production road surface contract + runtime | asphalt, curb, sidewalk, verge and trunk offset | Covered |

### Canonical Comparison View

- Direction: from the `house315` start toward `qaMoveTarget=0.20,79.89`
- Viewport: 1200 × 807, DPR 1
- Camera reproduction:
  `cameraQa=1&qaAutoStart=1&qaMove=forward&qaMoveMs=5600`
- Why selected:
  this is the exact user-reviewed runtime view where both excessive longitudinal density and
  the missing near-side roadside row are visible.

### Evidence Classification

#### Observed

- Current production placement count is 83, including 20 pilot trees.
- Both sides currently use a 6.55–7.10 scene-unit normal offset.
- The rendered Xinhua Road asphalt, curb, sidewalk and verge extend to about 3.925 scene units
  from the road axis.
- The current canonical baseline reads as too dense and the screen-right/side-0 row sits too
  far outside the road-edge composition.

#### Inferred

- The researched 20-pilot / 83-road count is a hard constraint; visual density must not be
  corrected by deleting placements.
- A side-0 offset of 5.05–5.50 scene units leaves approximately 1.13–1.58 scene units beyond
  the visible verge edge and keeps trunks out of the motor lane.
- A 0.5 scene-unit longitudinal phase on side 0 preserves its 44 safe placements after the
  row moves inward; the V3-proven 6.0 / 3.6 sampling remains unchanged.

#### Unknown

- Exact real-world tree-pit centers and surviving-tree counts.
- Surveyed distance for each photographed tree.
- Occluded or recently replanted positions.

## Quality Contract

### Identity

- Silhouette: unchanged V4 radial mature plane tree
- Signature cue 1: low, thick multi-branch fork
- Signature cue 2: mottled pale plane-tree bark
- Signature cue 3: many small near-spherical foliage lobes forming a permeable canopy
- Details intentionally omitted: unsupported tree-pit hardware and exact individual branch
  history

### Position

- Coordinate source: committed Xinhua Road axis plus deterministic side offsets
- Baseline:
  spacing 6.0 scene units, side offsets 6.55–7.10, pilot count 20
- Accepted range:
  spacing 6.0 scene units, side 0 offset 5.05–5.50, side 1 offset 6.55–7.00,
  pilot count 20 and total count 83
- Pilot rhythm:
  V3-proven 3.6 scene-unit candidate spacing with a 1.8 scene-unit cross-road phase;
  final safe distribution remains 12+8 without shrinking entrance clearance.
- Confidence: high for product-space correction, low for surveyed real tree pits

### Scale

- Existing GLB dimensions and per-instance scale remain unchanged.
- `1 scene unit = 2.7 m`.
- No global visual multiplier is permitted in this iteration.

### Orientation

- Blender front direction: local `-Y`
- Runtime yaw and four-variant deterministic assignment remain unchanged.
- Canonical view follows the Xinhua Road axis from `house315`.

### Framing

- Target screen relationship:
  the side-0 trunk line must read beside the visible verge instead of disappearing into the
  outer foreground lawn.
- Maximum canonical direction deviation: 0° from the deterministic route.
- Required visible structure:
  two-sided trunk rhythm, central road corridor, continuous but not welded canopy.
- Player and camera:
  retain the existing start, final movement target, FOV and spring-arm contract.

### Materials

No material change. The V4 six-material Identity and three-material Massing policies remain
the source of truth.

### Collision and Access

- Solid obstacles: one scaled trunk AABB per placement.
- Walkable areas: asphalt, cycle lanes, sidewalks and entrances must remain reachable.
- Camera clearance: tree canopies and trunk AABBs remain excluded from camera obstacles.
- Road clearance:
  every trunk center must remain outside the asphalt, curb, sidewalk and verge envelope, and
  every trunk AABB must remain outside the asphalt edge.

### Runtime Budget

- Xinhua Road placements: exactly 83 for this correction.
- Pilot placements: exactly 20.
- Identity GLBs: exactly four, unchanged hashes.
- Massing GLBs: exactly three, unchanged hashes.
- Maximum GLB bytes: unchanged total `1,019,888`.
- Images/textures: zero.
- Standard and weak tiers must not request runtime Hero.
- The weak Xinhua Road array must request only three Massing GLBs. The full page may still
  request A/B/C Identity for the three existing Xingfuli trees; this shared cross-area request
  must be recorded instead of misclassified as a Xinhua Road tier failure.
- Same-condition frame P95 must not regress more than 15%; no improvement claim is made
  without a valid before/after pair.

### Build Provenance

- Baseline commit: `d5f88ed`
- Baseline record:
  `docs/research/build-records/plane-tree-family-canopy-v4.json`
- Reference manifest:
  `docs/research/plane-tree-canopy-v3-reference-manifest.json` (locks the researched
  20-pilot / 83-road placement boundary)
- Expected binary outputs:
  unchanged seven GLBs and seven editable Blend files
- Placement acceptance:
  `docs/research/plane-tree-placement-v5-runtime-acceptance.json`
- Cache rule:
  GLB query versions remain unchanged because binary SHA-256 values do not change.

## Batch Plan

| Batch | Deliverable | Runtime check | Status |
| --- | --- | --- | --- |
| Baseline | current standard/weak screenshots, geometry and performance | `house315` deterministic route | Passed |
| Placement contract | named spacing, side-offset and pilot-count constants | unit geometry and count checks | Passed |
| Runtime calibration | final candidate in production-static | road clearance, visual balance, collision | Passed |
| Optimization | prove unchanged GLBs and reduced/equal runtime work | structure audit and performance pair | Passed |
| Release | tests, lint, Sites, VPS and online runtime | same commit across surfaces | Pending |

## Validation

### Placement

- [x] Named axis spacing and side offsets are independently testable.
- [x] Pilot count is exactly 20.
- [x] Pilot distribution is 12+8 and every same-side pilot gap is at least 3.6 scene units.
- [x] Total Xinhua Road count is exactly 83.
- [x] Side-0 tree centers stay within 5.05–5.50 scene units of the road axis.
- [x] Side-1 baseline relationship is not materially changed.
- [x] Every trunk stays outside the visible road envelope and all entrances/buildings.
- [x] Adjacent deterministic variants still do not repeat.

### Blender / GLB

- [x] Seven editable Blend files remain present.
- [x] Seven current GLBs remain byte-identical to the V4 build record.
- [x] Seven GLBs pass node, image, material and budget audit.
- [x] Existing canonical, side and root previews remain valid because binaries are unchanged.

### Three.js

- [x] Standard `house315` renders four Identity variants and no Massing GLB.
- [x] Weak `house315` renders three Massing variants for the Xinhua Road array; any Identity
  requests are limited to the existing A/B/C models shared by Xingfuli.
- [x] Deterministic movement completes without tree/building collision deadlock.
- [x] Side-0 row is visually closer to the road while trunks remain outside the road envelope.
- [x] Longitudinal rhythm is less dense without losing the two-sided canopy sequence.
- [x] Console errors, unhandled rejections, HTTP asset errors and GLB request failures are zero.
- [x] Same-condition baseline/final performance protocol records viewport, build, warm-up,
  duration, visibility, frames, P95, renderer calls/triangles, resources and JS heap.

### Evidence and Release

- [x] Standard, weak and comparison screenshots use `test_` names.
- [x] Runtime acceptance and Decision log record actual results and limitations.
- [x] Final external evidence snapshot contains 657 files / 272,535,552 bytes from the
  post-regression-fix source and runtime; `SHA256SUMS` passed during creation and
  independent recheck.
- [x] `npm test` passes 461/461 and `npm run lint` passes with zero errors and one
  pre-existing unrelated warning.
- [ ] Local, Sites and VPS release surfaces serve the same accepted commit.

## Decision Log

### Iteration 1 — Preflight and Baseline

- Changes:
  no runtime or binary change; created the placement-specific evidence and quality contract.
- Evidence used:
  V3 canonical/reference manifest, V4 build record, current `d5f88ed` production-static
  `house315` screenshot, road-surface geometry contract.
- Graybox/runtime result:
  existing model renders correctly; placement density and side-0 offset reproduce the user
  correction.
- Blender result:
  Blender 5.2 is available; not opened because the binary is outside this iteration.
- GLB result:
  current targeted tests pass 8/8; formal seven-file audit pending.
- Runtime result:
  baseline standard/weak pair captured at 1200 × 807; both passed production-static checks.
- Remaining inference:
  exact real tree-pit positions remain unknown.
- Rollback point:
  Git `d5f88ed`.

- External evidence:
  candidate snapshot retained as immutable history; final truth is
  `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-30-plane-tree-placement-v5-final-d5f88ed`,
  657 files / 272,535,552 bytes; `SHA256SUMS` passed twice.

### Iteration 2 — Placement, Structure and Runtime Acceptance

- Changes:
  the count-reducing 79/16 candidate was rejected after user correction.
- Corrected contract:
  83 Xinhua Road trees, 20 pilot trees, 6.0 axis spacing, 3.6 pilot candidate spacing,
  a 5.05–5.50 side-0 road-axis offset, and a 0.5 side-0 longitudinal phase.
- Graybox/runtime result:
  pending recapture against the corrected count-preserving contract.
- Blender result:
  all seven editable Blend files remain present; Blender was not opened because no binary
  changed.
- GLB result:
  7/7 audits passed and all SHA-256 values remain byte-identical to V4.
- Runtime result:
  count-preserving standard 59.81 FPS / P95 19.6 ms / 897 frames; weak 59.74 FPS /
  P95 19.3 ms / 896 frames; deterministic movement complete, and zero
  console/network/asset errors.
- Performance interpretation:
  no matched-condition regression; the single capture pair is not treated as a durable
  speedup claim.
- Remaining inference:
  exact surveyed tree-pit positions remain unknown.
- Rollback point:
  Git `d5f88ed`.
