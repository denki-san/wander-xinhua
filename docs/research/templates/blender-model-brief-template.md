# Blender Model Brief: <Asset Name>

## Scope

- Asset slug:
- POI / environment / character:
- Runtime component:
- Generator:
- Editable source:
- Runtime GLB:
- Start preset:

## Evidence

### Reference photos

| Local path | Source URL | View direction | Capture/publish date | Usage boundary |
| --- | --- | --- | --- | --- |
|  |  |  |  | Research only |

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

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Massing |  |  |  | Pending |
| Identity |  |  |  | Pending |
| Materials |  |  |  | Pending |
| Site |  |  |  | Pending |
| Collision |  |  |  | Pending |
| Optimization |  |  |  | Pending |

## Validation

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
- [ ] Skin/animation pass when applicable

### Three.js

- [ ] Start preset loads
- [ ] Canonical direction reproduced
- [ ] Ground contact and orientation pass
- [ ] Player and camera collision pass
- [ ] Entrances and public paths remain reachable
- [ ] Browser console has no new errors
- [ ] First-screen loading behavior passes
- [ ] Performance comparison recorded

## Decision Log

### Iteration <N>

- Changes:
- Evidence used:
- Blender result:
- GLB result:
- Runtime result:
- Remaining inference:
- Performance impact:
- Rollback point:
