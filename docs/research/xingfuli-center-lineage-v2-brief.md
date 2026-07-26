# Xingfuli Center Lineage v2 Brief

## Scope and purpose

- Asset: `xingfuli-center` only.
- Goal: close the already documented strict tier-lineage gap by producing new,
  isolated `identity-v2` and `massing-v2` candidates.
- Parent chain: accepted current Hero → Identity v2 → Massing v2.
- Existing Hero, Identity, Massing, Recovery/Hold, West/East buildings,
  vegetation, decoration and full-map assets remain read-only.
- This brief does not authorize production promotion. Main-window MCP3,
  Three.js and public integration remain separate gates.

## Preflight

- Blender: `/Applications/Blender.app/Contents/MacOS/Blender`.
- Parent Hero Blend:
  `assets/models/source/xingfuli/xingfuli-center.blend`.
- Parent Hero GLB: `public/models/xingfuli/xingfuli-center.glb`.
- Generator: `scripts/create_xingfuli_center_lineage_v2_models.py`.
- GLB audit: `scripts/audit_glb.py`.
- Browser QA: existing Fast Mode single-page routes for `xingfuli-center`.
- Evidence and view matrix:
  `docs/research/xingfuli-reference-manifest.json`,
  `docs/research/xingfuli-model-brief.md`, and
  `docs/research/xingfuli-center-lineage-map-audit.json`.

## Observed facts

- The accepted Hero editable scene has 177 mesh objects.
- Every one of the 116 accepted Identity mesh objects is an exact same-name
  subset of Hero in transform, dimensions, vertices, polygons and material
  assignment; Identity adds no child-only mesh.
- The accepted Identity has 116 meshes and the accepted Massing has 58. All 58
  Massing names exist in Identity, but 27 retained Massing objects were
  independently regenerated with different window spacing or canopy depth.
- Current map placement, primary routes, fallback, performance and runtime
  evidence pass for Center; strict historical lineage alone remains blocked.

## Inference and decision

- Hero → Identity v2 can be a genuine object-reduction derivation: load the
  accepted Hero Blend, verify parent hashes, delete only site hardscape,
  Hero-only material bands, balcony posts and bay fins, then export a new path.
- Identity v2 → Massing v2 can also be a genuine object-reduction derivation:
  load Identity v2, delete sills, balcony rails and excess window columns.
- The candidate Massing intentionally keeps the retained parent objects
  unchanged instead of recreating the old independently generated spacing.
  This makes lineage explicit and auditable while still reducing object count
  by roughly half.

## Unknowns

- No new external photos are needed because geometry and identity cues are not
  being invented or expanded.
- Visual equivalence and runtime behavior of the new binary SHA remain unknown
  until Blender MCP3 and real Three.js gates pass.
- Production promotion remains unknown until the main window verifies the
  current placement, collision, fallback and performance under the same build.

## Canonical comparison contract

- Canonical view: existing center canonical camera, observing along the central
  lane toward the three Center member buildings.
- Side/depth view: existing fixed side camera.
- Identity detail view: existing fixed street camera.
- Human scale: existing 1.8 m proxy and current Center runtime scale.
- Camera, placement, yaw, source origin and map transform must not change.

## Unique identity cues retained

1. North-inner-west projecting silver bay and bay windows.
2. North-inner-east repeated balcony slabs and storefront rhythm.
3. South-inner-west roof pavilion and continuous storefront band.

## Runtime and structure budgets

- Identity v2 must have fewer objects/triangles/bytes than Hero and preserve
  the three identity cues.
- Massing v2 must have fewer objects/triangles/bytes than Identity v2.
- Both tiers: one exported root, standard root transform, zero embedded images,
  no animation or skeleton, no trees/decoration/full-map assets.
- Bounds, ground contact, placement and collision may not be promoted by source
  inspection alone; they require MCP and Three.js evidence.

## Required gates

1. Double-build GLB SHA equality for each candidate.
2. GLB structure audit and parent/child object-set proof.
3. Main-window Blender MCP3 batch review at canonical, side and street views.
4. Single-page Three.js Hero/Identity/Massing, two fallback routes, performance,
   console/global errors and deterministic collision sampling.
5. Main-window-only public manifest, registry/status integration and batch
   project regression.
