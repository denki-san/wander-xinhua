# Xinhua Bicycle Family Model Brief

## Current decision

- Status: `candidate-for-user-visual-approval`
- The first deterministic procedural batch was rejected on visual quality and must
  not enter runtime placement or production integration.
- Adopted source candidate:
  [Blue Bike 3D Scan by Ye Hang](https://sketchfab.com/3d-models/blue-bike-3d-scan-d62834a0bdc64949b7b2ce56de22a57f)
- Source license shown on the model page: Creative Commons Attribution.
- Source facts shown on the model page: downloadable, 79.9k triangles, 39.6k
  vertices, reconstructed from 112 photos of a shared bicycle.
- Planned derivative: remove or replace brand marks, decimate to approximately
  8k–15k triangles, compress textures, export one static `visible-low` GLB.
- Download package and attribution must be preserved before derivative work starts.
- Current derivative: 14,500 triangles, 789,484 bytes, four materials, zero
  embedded images and zero textures.
- Isolated Three.js QA: 4 m and 10 m use the same GLB; 22 m is hidden; scale ruler
  confirms the 1.75 m physical-length contract; no console error was observed.

## Scope

- Category: reusable static bicycle Shared Prototypes
- Frozen asset for the replacement pilot:
  - `xinhua-shared-bicycle`
- Held after visual rejection:
  - `xinhua-commuter-bicycle`
  - `xinhua-vintage-bicycle`
- Runtime instances: 0 in this batch
- Held: cargo bicycle, rider, child bicycle, parking rack and moving bicycle simulation
- Generator: `scripts/create_xinhua_bicycle_family.py`
- Editable source: `assets/models/source/nonbuilding/xinhua-bicycle-family/`
- Runtime output: `public/models/nonbuilding/xinhua-bicycle-family/`
- QA route: `/nonbuilding-evidence-qa?asset=<slug>&distance=<meters>`

## Preflight

- Blender: `/Applications/Blender.app/Contents/MacOS/Blender`, 5.2.0 LTS
- GLB audit:
  `/Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py`
- Existing single-asset generator and isolated QA route: available
- Fallback if Blender MCP is unavailable: deterministic headless canonical, side and
  detail renders
- Production registry, production manifest and 18-building runtime: out of scope

## Evidence

| Local evidence | Subject | Location basis | Coverage |
| --- | --- | --- | --- |
| `xinhua-commuter-bicycle-2026.webp` | green diamond-frame commuter bicycle | M2F storefront is readable; article names the venue | canonical / full side |
| `xinhua-shared-bicycle-2026.webp` | blue step-through shared bicycle with basket | route-area evidence; exact storefront not used for placement | full side / detail |
| `xinhua-vintage-bicycle-2026.webp` | silver-orange vintage bicycle cockpit | article route only; exact point unknown | handlebar / material detail |
| `xinhua-bicycle-density-2026.webp` | shared bicycles, rider and pedestrian activity | Xinhua Road route; exact storefront unknown | repetition / activity context |

All photos are research evidence only. They are not embedded in GLBs and brands or
logos are not copied.

## Coverage matrix

| Slot | Evidence | Status | Boundary |
| --- | --- | --- | --- |
| Canonical | commuter and shared full-side views | passed | family proportions only |
| Side / depth | commuter oblique-side view | passed | unseen opposite side stays symmetric |
| Identity detail | shared basket and vintage cockpit | passed | no brand marks |
| Site relationship | bicycles parked beside storefronts and trees | passed | placement remains a later task |

Canonical comparison direction: broadside with the front wheel pointing screen right.

## Evidence classification

### Observed

- two similar-size wheels, narrow tires, saddle, handlebar and pedal area;
- commuter bicycle uses a diamond frame and flat handlebar;
- shared bicycle uses a blue step-through frame, front basket and rear fender;
- vintage detail shows a silver cockpit, brown grips and an orange-red seat-tube accent;
- bicycles appear parked singly and in small groups along storefronts and tree-lined paths.

### Inferred

- dimensions follow a typical adult city bicycle because exact measurements are absent;
- hidden drivetrain detail is simplified;
- the vintage rear frame and wheel follow the shared family proportions;
- colors are original palette approximations without protected branding.

### Unknown

- manufacturer, exact tubing profiles, gear count and brake mechanism;
- exact bicycle count at each future placement;
- time-of-day density and moving bicycle routes.

## Identity cues

### `xinhua-commuter-bicycle`

1. green diamond frame;
2. straight handlebar;
3. compact rear rack.

### `xinhua-shared-bicycle`

1. blue step-through frame;
2. open front basket;
3. rear fender and upright handlebar.

### `xinhua-vintage-bicycle`

1. silver upper frame;
2. orange-red seat-tube accent;
3. brown grips and saddle with a small chrome bell.

## Scale and orientation

- Project conversion: `1 scene unit = 2.7 m`
- Intended physical length: approximately 1.7 m
- Authored length: approximately 0.63 scene units
- Wheel radius: approximately 0.13 scene units
- Ground datum: tire bottoms at local Z = 0
- Blender front: local `+X`
- Origin: midpoint between wheel contacts on the ground
- Future collision: one optional parked-group blocking strip, not per-spoke collision

## Runtime contract and budgets

| Field | Value |
| --- | --- |
| States | `visible-low`, `hidden` |
| Hide threshold pilot | 18 m |
| Target triangles | 8,000–15,000 for the shared-bicycle pilot |
| Target nodes | 12 or fewer after consolidation |
| Target materials | 4 or fewer |
| Target images | 4 or fewer compressed texture images |
| Target GLB bytes | 2.5 MB or less |
| Animation / skin | none |
| Production instances | 0 |

## Fast batch plan

| Pass | Deliverable | Acceptance |
| --- | --- | --- |
| Evidence | four local references and this family Brief | observed / inferred / unknown separated |
| Source | preserve original package, license and attribution | provenance is complete before editing |
| Build | one optimized shared-bicycle master, GLB and three fixed views | basket, frame, wheels, scale and ground contact survive optimization |
| Runtime | shared QA route | 4 m and 10 m same GLB; 22 m hidden |
| Audit | GLB audit and focused tests | budgets and zero embedded images |
