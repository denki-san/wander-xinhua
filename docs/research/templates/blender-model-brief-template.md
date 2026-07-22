# Blender Model Brief: <Asset Name>

## Scope

- Asset slug:
- POI / environment / character:
- Runtime component:
- Generator:
- Editable source:
- Runtime GLB:
- Start preset:
- Single-asset build command:
- Validation command:

## Preflight Gate

- Blender binary and version:
- Generator dry run / affected assets:
- GLB audit command:
- Local preview command and port:
- Browser/runtime validation path:
- Existing asset, screenshot, collision and performance baseline:
- Fallback path for unavailable tools:

## Evidence

### Reference photos

| Local path | Source URL | View direction | Capture/publish date | Usage boundary |
| --- | --- | --- | --- | --- |
|  |  |  |  | Research only |

### View coverage matrix

| Evidence slot | Local photo | Questions answered | Coverage status | Downgrade if missing |
| --- | --- | --- | --- | --- |
| Canonical |  | Silhouette and main proportions | Missing | Do not start massing |
| Side / oblique |  | Depth, side wings and roof connection | Missing | Keep unseen depth conservative |
| Entrance / identity detail |  | Door, stair, sign or signature cue | Missing | Omit unsupported detail |
| Site relationship |  | Road, wall, courtyard and vegetation | Missing / N/A | Keep site minimal and walkable |

### Canonical comparison view

- Local path:
- Direction:
- Why selected:
- Runtime camera reproduction:

### Evidence classification

#### Observed

-

#### Inferred

-

#### Unknown

-

## Quality Contract

### Identity

- Silhouette:
- Signature cue 1:
- Signature cue 2:
- Signature cue 3:
- Details intentionally omitted:

### Position

- Coordinate source:
- Scene position:
- Confidence:

### Scale

- Known dimensions:
- `1 scene unit = 2.7 m` conversion:
- Allowed visual multiplier:

### Orientation

- Blender front direction: local `-Y`
- Runtime rotation:
- Canonical view direction:

### Framing

- Target screen-width occupancy:
- Maximum canonical direction deviation:
- Required visible edges / roof extents:
- Player-to-door and player-to-storey scale check:
- Camera target height and clearance:

### Materials

- Opaque:
- Glass:
- Metal:
- Emissive:
- Project palette mapping:

### Collision and access

- Solid obstacles:
- Walkable areas:
- Camera clearance:
- Road clearance:

### Runtime budget

- Maximum triangles:
- Maximum nodes:
- Maximum materials:
- Maximum images:
- Maximum GLB bytes:
- Animation/skin requirements:

### Build provenance

- Baseline GLB SHA / bounds / metrics:
- Expected output paths:
- Build record path:
- Cache version rule:

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Massing | Graybox body, floors, roof and main openings | Canonical silhouette | Real `?start=` graybox gate | Pending |
| Runtime calibration | Position, scale, orientation, camera and coarse collision | N/A | Screen occupancy, material visibility and access | Pending |
| Identity |  |  |  | Pending |
| Materials |  |  |  | Pending |
| Site |  |  |  | Pending |
| Collision |  |  |  | Pending |
| Optimization |  |  |  | Pending |

Each completed batch must update a `test_` reference / Blender / Three.js comparison artifact and record screen occupancy, canonical deviation, cropping, player scale and visible identity cues.

## Validation

### Preflight and graybox

- [ ] Required tools and fallback paths recorded
- [ ] Generator affects only declared assets, or overwrite scope recorded
- [ ] Graybox loads and renders in the actual `?start=` page
- [ ] Graybox scale, orientation, framing, ground contact and coarse collision pass
- [ ] Massing independent review has no open blocker

### Blender

- [ ] Generator exits successfully in background mode
- [ ] Editable `.blend` saved
- [ ] Canonical `test_` preview
- [ ] Side `test_` preview
- [ ] Street-level `test_` preview

### GLB

- [ ] Root transform normalized
- [ ] Bounds audited
- [ ] No reference photos embedded
- [ ] Geometry/material/file budgets pass
- [ ] Build record matches current GLB SHA, bounds and cache version
- [ ] Skin/animation pass when applicable

### Three-way comparison

- [ ] Reference / Blender / Three.js artifact saved with a `test_` name
- [ ] Screen-width occupancy recorded
- [ ] Canonical direction deviation recorded
- [ ] Cropping, player scale and visible identity cues recorded

### Three.js

- [ ] Start preset loads
- [ ] Canonical direction reproduced
- [ ] Ground contact and orientation pass
- [ ] Player and camera collision pass
- [ ] Entrances and public paths remain reachable
- [ ] Page QA path or deterministic movement result recorded
- [ ] Browser console has no new errors
- [ ] First-screen loading behavior passes
- [ ] Performance protocol records viewport, build mode, warm-up, duration and visibility
- [ ] Comparable performance result recorded, or no-comparable-baseline limitation stated
- [ ] Final independent review has no open blocker

## Decision Log

### Iteration <N>

- Changes:
- Evidence used:
- Graybox runtime result:
- Blender result:
- GLB result:
- Three-way comparison result:
- Runtime result:
- Independent review result:
- Remaining inference:
- Performance impact:
- Rollback point:
