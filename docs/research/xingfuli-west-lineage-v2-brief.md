# Xingfuli West Lineage v2 Brief

## Scope and purpose

- Asset: `xingfuli-west` only.
- Goal: close the documented strict tier-lineage gap with new isolated
  `identity-v2` and `massing-v2` candidates.
- Parent chain: accepted current Hero → Identity v2 → Massing v2.
- Existing Hero, Identity, Massing, Center/East, Recovery/Hold, vegetation,
  decoration, collision, roads and full-map assets remain read-only.
- This brief does not authorize resolver, manifest, exact-status or production
  promotion. Main-window MCP3 and Three.js remain separate gates.

## Preflight

- Baseline commit: `d09cca7b73f8e9989b65eb83b16e0bf0e27270dc`.
- Blender: `/Applications/Blender.app/Contents/MacOS/Blender`, 5.2.0 LTS.
- Parent Hero Blend:
  `assets/models/source/xingfuli/xingfuli-west.blend`.
- Parent Hero GLB: `public/models/xingfuli/xingfuli-west.glb`.
- Generator: `scripts/create_xingfuli_west_lineage_v2_models.py`.
- GLB audit: `scripts/audit_glb.py`.
- Existing accepted evidence:
  `docs/research/xingfuli-model-brief.md`,
  `docs/research/xingfuli-west-reference-manifest.json`,
  `docs/research/xingfuli-west-blender-mcp-gates.json`, and
  `docs/research/xingfuli-west-threejs-runtime-qa.json`.
- The user's nine original photo files are not present. Their slots remain
  `pending-original-file` in
  `docs/research/xingfuli-user-photo-sequence-2026-07-26.json`; this candidate
  does not claim they were reviewed.

## Observed facts

- The accepted Hero editable scene has 81 mesh objects.
- The accepted historical Identity has 69 meshes; its names equal the Hero
  names after removing the 12 `-material-` detail objects.
- The accepted historical Massing has 34 meshes; its names equal the Identity
  names after removing 24 sills, eight excess window-column objects and three
  abstract-panel details.
- West already passed retained MCP1/MCP2 and same-camera visual review. Existing
  Three.js tier loading, fallback, measured performance, collision route and
  camera checks also passed, but formal acceptance remained blocked by strict
  lineage and Xingfu Road.

## Inference and decision

- Hero → Identity v2 is a genuine object-reduction derivation: load the accepted
  Hero Blend, verify parent hashes, and delete only the 12 Hero material-detail
  meshes.
- Identity v2 → Massing v2 is another genuine object-reduction derivation:
  load Identity v2, delete sills, excess window columns and abstract-panel
  details without regenerating retained geometry.
- The new paths preserve the accepted source origin, ground datum, front,
  bounds envelope and named object structure. Existing public binaries remain
  untouched.

## Evidence classification

### Observed

- The repository contains three public-reference entrance views for the
  Xingfu Road end. They show an open pedestrian connection and street setback,
  but do not provide a surveyed ground-level solid footprint.
- The existing exact OSM collision candidate clears the exaggerated road
  surface with positive clearance.
- OSM building `way/864823874` overlaps pedestrian `way/400066625`, while the
  available tags contain no `min_height`, `building:min_level`, `covered`,
  `tunnel`, `layer` or entrance geometry.

### Inferred

- The OSM building polygon may include an arcade, entrance void or generalized
  outline, but the current evidence cannot select a lossless collision carve.

### Unknown

- Ground-level solid footprint, passage boundary and clearance under
  `way/864823874`.
- The user's nine original files, hashes, EXIF, view mapping and route-end road
  identity.
- Production behavior of the new Identity/Massing SHA until main-window MCP3
  and Three.js review.

## Canonical comparison contract

- Canonical view: accepted local `+X` long-axis direction, camera
  `(-55, -7, 3.5)` toward `(-32, -7, 3.2)`.
- Side/depth view: camera `(-58, -31, 11)` toward
  `(-34.5, -7, 3.3)`; the oblique elevation keeps both West members and their
  longitudinal relationship in one frame.
- Entrance/identity view: camera `(-68, -26, 7.5)` toward
  `(-34.5, -6, 3.2)`, showing the complete Xingfu Road entrance composition,
  continuous storefront/canopy, repeated windows and the South-West identity
  wall/panels in one shared Identity/Massing camera.
- Human scale, placement, yaw, source origin and map transform must not change.

## Unique identity cues retained

1. North-West continuous storefront, canopy and repeated two-storey window
   rhythm.
2. South-West storefront/canopy and repeated two-storey window rhythm.
3. South-West terminal identity wall; Identity v2 also retains its three
   abstract panels, while Massing v2 deliberately drops only the panel detail.

## Runtime and structure budgets

- Identity v2 must have fewer objects, triangles and bytes than Hero.
- Massing v2 must have fewer objects, triangles and bytes than Identity v2.
- Both tiers: one exported root, standard root transform, zero embedded images,
  no animation or skeleton, and no unrelated site expansion.
- Bounds, map placement, collision and road clearance cannot be promoted by
  source inspection alone.

## Required gates

1. Double-build GLB SHA equality for each candidate.
2. Parent SHA validation, object-set reduction proof and GLB structure audit.
3. Headless canonical, side and street previews.
4. Main-window Blender MCP3 batch review using the same camera contract.
5. Main-window Three.js tier/fallback/runtime review without changing the
   default Hero or shared resolver/status.
6. Xingfu Road remains blocked until ground-level passage evidence supports a
   lossless collision proxy; no arbitrary carve, movement, scale or road edit.
