# Overview District Massing Implementation Plan

## Status

- Review date: 2026-07-25
- Product scope: first local implementation
- Target branch: `codex/overview-district-massing`
- Target experience: `overview` only
- Release boundary: local acceptance only; no Sites or VPS deployment

## Product decision

The product goal is not to turn as much OSM data as possible into 3D. The goal is
to make the user understand, at a glance, that Xinhua Road runs through a
continuous urban district and that the authored POIs sit inside that district.

The first implementation therefore adds one restrained **district massing
layer** to `overview`. Roads, parks, water, labels, the player and authored POIs
remain the information hierarchy. Generic buildings are background context.

OpenStreetMap (OSM) is the geographic source of record. Amap, Apple Maps and
Google Maps may be used only as visual product references; this implementation
does not scrape, trace or derive geometry from their map tiles or imagery.

The `explore` experience, complete POI GLBs, collision, character controls,
camera and detail UI remain unchanged.

## Review findings and changes to the original proposal

### Decisions retained

1. Use an offline OSM snapshot and never call Overpass from the browser.
2. Preserve raw snapshots and make the generated layer reproducible.
3. Compile geometry before runtime instead of creating thousands of React
   meshes or `ExtrudeGeometry` objects on the mobile main thread.
4. Mount the layer only after entering `overview`.
5. Keep visible `© OpenStreetMap contributors` attribution and an ODbL notice.
6. Treat detailed POIs as authored assets rather than inventing facade detail
   from map data.

### Product and technical improvements

1. **Separate city readability from POI production.** This cycle validates one
   district layer and retains the existing 17 overview POIs/areas. It does not
   create new Hero or Identity assets. Otherwise a broad product hypothesis
   would be blocked by unrelated asset production.
2. **Make hierarchy measurable.** Acceptance requires same-camera before/after
   screenshots proving that blocks become legible while roads, labels, POIs and
   the player remain more prominent.
3. **Prefer building outlines in the first version.** `building=*` outlines are
   the stable city-scale unit. `building:part=*` is preserved in the raw
   snapshot and counted in the build record, but held from rendering in this
   cycle. Rendering both parents and parts causes overlap; full boolean
   reconstruction is not required to test the product value.
4. **Keep provenance out of the navigation UI.** Every height keeps provenance
   in the source record and build record. The UI keeps a concise “non-survey
   approximation” disclosure instead of exposing thousands of technical labels.
5. **Define failure isolation.** A missing or invalid district GLB falls back to
   the existing overview rather than blocking entry, movement or POI cards.
6. **Define a weak-network policy.** `Save-Data`, `2g` and `3g` profiles may skip
   this decorative layer. Standard mobile still receives and validates it.
7. **Set budgets before generation.** The layer must stay within the size,
   triangle, material and draw-call limits below. A visually denser result is
   not accepted if it compromises overview responsiveness.
8. **Reserve authored areas geometrically.** Existing POIs and the three core
   areas use explicit replacement masks. Exact OSM refs are recorded where
   known; inferred placements stay marked as inferred. The compiler does not
   hide a generic building merely because names look similar.
9. **Prefer a visible playable frame over incompatible post-processing.** Local
   runtime QA found the current Composer outputting only its fullscreen pass
   after playable cameras take over, leaving both overview and explore blank.
   Playable modes therefore use direct R3F rendering in this implementation.
   The accepted Explore evidence is retained alongside the overview evidence.
   Re-enabling paper/outline effects is a separate compatibility task.
10. **Balance boundary context with player framing.** The overview camera first
    biases its target toward the administrative content area to avoid a large
    empty edge, then caps target-to-player lag from the current limiting
    viewport FOV. This keeps peripheral movement inside a safe composition
    instead of freezing the camera at a fixed central rectangle.

## Frozen scope

| Item | Count | Status | Notes |
| --- | ---: | --- | --- |
| District massing model asset | 1 | in-scope | One versioned GLB |
| Generic building runtime instances | generated | in-scope | One per accepted OSM outer outline |
| Spatial/material chunks | at most 12 | in-scope | 2 × 2 spatial grid, up to 3 height bands |
| Existing overview POIs/areas | 17 | retained | No new asset production |
| `building:part=*` geometry | source count only | hold | Preserved for a later skyline/detail iteration |
| New POI Hero/Identity assets | 0 | hold | Requires its own evidence-backed workflow |
| Generic massing collision/interaction | 0 | out-of-scope | Context only |
| `intro` product behavior and `explore` geometry/interaction | 0 | retained | Playable modes use direct R3F output to correct the existing blank Composer result |

Scope expansion requires a separate decision after local product acceptance.

## Current project fit

- `app/scene/xinhua-map-data.json` establishes boundary relation `13469094`,
  projection metadata and `1 scene unit = 2.7 m`.
- `app/scene/terrain.ts` is the ground-height source of truth.
- `app/scene/xinhua-world.tsx` distinguishes `intro`, `overview` and `explore`.
- `app/scene/xinhua-road-massing.tsx` is useful visual precedent, but represents
  current landmarks rather than the district.
- The current overview already renders authored core areas and road POIs.
  District massing sits behind them and does not replace their loading system.

## Data and rights policy

### Source and retention

1. Query OSM buildings once during development with Overpass and administrative
   boundary relation `13469094`.
2. Save every raw response as a new timestamped file under
   `docs/research/data/`. Never overwrite or delete an earlier snapshot.
3. Store the exact query, endpoint, fetch time, relation ID, OSM generator
   metadata, source counts, licence URL and raw SHA-256.
4. Generate every runtime artifact from a preserved raw snapshot. Offline replay
   must not require network access.
5. Extend `docs/THIRD_PARTY_NOTICES.md` to explicitly cover district building
   outlines and keep the existing visible attribution link.

### What the data can and cannot claim

The pre-review sample found thousands of building outlines, but sparse direct
height metadata. Footprint placement is geographic data; most heights are
visual approximations. The result must not be described as a survey-grade city
model.

Height resolution is deterministic:

1. valid numeric OSM `height` in metres;
2. valid `building:levels × 3 m`;
3. a documented low/mid/high heuristic derived from footprint area and broad
   building type.

Every record uses exactly one provenance value:

- `osm-height`
- `osm-levels`
- `heuristic`

Malformed, non-finite or extreme values are rejected or clamped with a recorded
reason. Per-run randomness is forbidden.

## Source and runtime contracts

### Inputs and generated outputs

- Raw snapshot:
  `docs/research/data/xinhua-buildings-osm-YYYYMMDD-HHMMSS.json`
- Deterministic compiler:
  `scripts/generate_overview_district_massing.mjs`
- Replacement registry:
  `app/scene/overview-district-massing-replacements.json`
- Auditable source record:
  `app/scene/xinhua-district-massing-data.json`
- Small runtime manifest:
  `app/scene/xinhua-district-massing-runtime.json`
- Runtime asset:
  `public/models/overview/xinhua-district-massing.glb`
- Build record:
  `docs/research/build-records/xinhua-district-massing.json`
- Runtime component:
  `app/scene/overview-district-massing.tsx`

Files use English names. Code comments use Chinese.

### Coordinate contract

1. Reuse `centerWgs84` and `metersPerSceneUnit` from
   `xinhua-map-data.json`; do not introduce a second projection.
2. Keep scene axes consistent with the current road and terrain data.
3. Filter outlines against the official projected boundary and record excluded
   or invalid elements.
4. Bake each building base from the existing `terrainHeightAt` source plus a
   small documented anti-z-fighting offset.
5. Do not use a global runtime scale to repair generator errors.

### Geometry contract

1. Render one accepted outer outline per generic building.
2. Preserve valid holes and multipolygon outer rings where supported.
3. Simplify conservatively only below overview-visible scale.
4. Reject open, degenerate, self-invalid, non-finite or duplicate rings with a
   reason in the build record.
5. Divide the district into a 2 × 2 spatial grid and up to three height bands.
   Reuse three materials across chunks.
6. Bake positions, normals and indices into the GLB. Runtime extrusion is
   forbidden.
7. No textures, facade detail, windows, logos, invented roof forms or animation.

## Existing POI replacement contract

Each retained authored area has:

```text
poiId
source: exact-osm | inferred-runtime-placement
osmRefs: ["way/123"]
replacementMask: { minX, maxX, minZ, maxZ } or a polygon
overviewAssetState: existing-authored | existing-fallback
replacementBoundsVerified: true | false
```

Rules:

1. Only entries with verified bounds may remove generic massing.
2. Known exact OSM refs are excluded directly.
3. Inferred entries use explicit, reviewable masks and remain labelled inferred.
4. Core campuses reserve their current authored site/building footprints rather
   than deleting unrelated neighbouring blocks.
5. Existing component error boundaries and procedural fallbacks remain the
   visual fallback; this cycle does not add or promote new Identity assets.
6. A compiler report lists every excluded OSM element and the registry entry
   responsible for it.

## Runtime specification

- Lazy-load the district component only when `mode === "overview"`.
- Place it after the street-map base and before authored POI layers and labels.
- Generic massing has no collision, raycast, label, navigation target or shadow
  casting.
- Use warm off-white/very light grey materials with restrained height-band
  variation.
- Keep road surfaces, parks, water, POI markers and the player visually dominant.
- On weak-network profiles, skip the district GLB and retain the current map.
- On load or parse failure, render nothing for this layer and preserve overview
  interaction.
- Never make a runtime request to Nominatim or Overpass.

## Runtime budgets

| Metric | First-version budget |
| --- | ---: |
| GLB binary size | ≤ 3.0 MB |
| Mesh nodes / maximum draw calls added | ≤ 12 |
| Materials | ≤ 3 |
| Images / textures | 0 |
| Triangles | ≤ 100,000 |
| Generic collision or raycast objects | 0 |
| Weak-network GLB requests | 0 |

The build record also reports accepted building count, height provenance,
rejected/held counts, bounds, generator duration and SHA-256.

## Implementation phases

### Phase 0 — isolate, baseline and review

1. Work in a dedicated worktree and branch.
2. Preserve unrelated changes in the original worktree.
3. Capture same-camera desktop and 390 px baseline screenshots before adding
   the district layer.
4. Confirm generator, GLB export/audit, local preview and browser QA paths.

### Phase 1 — deterministic data compiler

1. Fetch or replay the exact OSM building query.
2. Preserve the raw snapshot before processing.
3. Parse outer building ways and supported multipolygons.
4. Preserve but hold `building:part` geometry for this version.
5. Project, boundary-filter, validate, simplify, classify height and apply
   replacement exclusions.
6. Generate the source record, GLB and build record.
7. Fail on missing source, invalid global metadata, duplicate accepted IDs,
   non-finite output, out-of-budget geometry or a non-deterministic replay.

### Phase 2 — overview-only integration

1. Add a lazy `OverviewDistrictMassing` component.
2. Mount it only for `overview`, after the map base and below authored assets.
3. Add load-failure and weak-network fallbacks.
4. Keep `intro` and `explore` free of this layer and request.

### Phase 3 — validation

1. Add focused `test_`-prefixed tests for source provenance, deterministic
   replay, height provenance, held building parts, replacement exclusions,
   geometry budgets, overview-only mounting and weak-network skipping.
2. Run `npm test`, `npm run lint` and `git diff --check`.
3. Validate the compiled GLB structure and SHA.
4. Use a real browser with an empty cache to verify requests, canvas state,
   console, hierarchy, movement and POI entry/return.
5. Capture same-camera after screenshots at desktop, 390 px mobile and one dense
   POI/road area.
6. Record viewport, build mode, warm-up, sample duration, page visibility,
   requests, transferred bytes, draw calls and frame timing. Do not claim a
   performance improvement without a same-condition baseline.

## Product acceptance

The local version passes only when all conditions hold:

1. Same-camera before/after evidence shows a continuous district instead of an
   empty road diagram.
2. Xinhua Road, major roads, POI markers and the player remain more readable
   than generic buildings.
3. Existing authored areas have no obvious white overlap, visible hole or
   z-fighting at the reviewed overview cameras.
4. Overview movement, POI proximity card and “进入” continue to work.
5. Returning to `overview` remounts safely; entering `explore` produces no
   district GLB node or request and preserves existing collision/camera behavior.
6. Standard desktop and 390 px mobile load the GLB within budget; weak-network
   mode makes zero district-GLB requests.
7. Runtime makes no Overpass/Nominatim request and keeps OSM attribution visible.
8. Tests, lint, build record, GLB audit and real-browser console checks pass on
   the same commit handed off for local review.

## Implementation result and local acceptance

Implementation completed on 2026-07-25 in
`codex/overview-district-massing`. The preserved source snapshot contains 878
OSM building ways. After the visual-review correction, the deterministic
compiler accepts 730, excludes 104 under the authored-area replacement registry
and rejects 44 footprints that cannot clear a rendered public-road corridor
without either moving their geolocated centroid or retaining less than 58% of
their original footprint. There are no `building:part` elements in this exact
administrative-area snapshot.

The generated GLB is 680,384 bytes with 10 meshes, 3 materials, 0 images, 0
textures and 11,779 triangles. Its SHA-256 is
`b61cec4fc93e5326f87845f022abf92008c8254c78bfd95de8ea1e19d4f11dea`.
Height provenance is 11 `osm-levels` and 719 `heuristic`; there are no direct
OSM `height` values in the accepted set. These facts are intentionally exposed
in the build record rather than presented as survey accuracy.

### Visual-review corrections

- Generic massing uses a muted warm-grey three-band palette at `0.58` opacity.
  It is a context layer below the authored buildings rather than a competing
  landmark layer.
- Roof and wall triangle winding is normalized and audited against exported
  normals. The material can therefore remain single-sided; this avoids the
  doubled draw calls and triangle submissions caused by transparent
  `DoubleSide`.
- POI ring and triangle are both proximity-only. A quiet southwest QA start
  reports `0` active highlights; the reviewed POI starts report exactly `1`.
- Buildings and roads already shared the same WGS84 origin, degree-to-metre
  conversion and `2.7 m` scene scale. The overlap was caused by the compiler
  ignoring rendered road width, not by a second coordinate system.
- The compiler now uses the runtime road-width contract plus a clearance. It
  preserves each footprint centroid and scales only conflicting generic
  footprints. Across the district, 110 are adjusted and 44 are rejected. Along
  幸福路, 16 are adjusted and 5 rejected; along 法华镇路, 11 are adjusted and
  9 rejected. The accepted dataset has zero remaining public-road-corridor
  conflicts under the shared runtime contract.
- The apparent empty lower-left region combines the official relation's
  diagonal boundary with an overview camera that formerly followed the player
  beyond that boundary. The implementation does not invent buildings outside
  the relation. It instead limits edge-following and uses a closer portrait
  fill (`0.16` versus desktop `0.215`) so mobile does not spend the bottom of
  the screen on empty background.
- Deterministic browser QA starts were added for `xingfu-road`,
  `fahuazhen-road` and `quiet-southwest`, gated behind `overview-qa=1`.

Final desktop same-camera production-static sampling reports:

| Viewport | District | Draw calls | Page triangles | Camera |
| --- | --- | ---: | ---: | --- |
| 1440 × 1024 | off | 1,819 | 268,471 | `265.960,194.905,172.199` |
| 1440 × 1024 | on | 1,829 | 280,250 | `265.960,194.905,172.199` |

The final district therefore adds exactly 11,779 page triangles and 10 draw
calls at the reviewed desktop camera. After 30 warm-up frames, the 120-frame
production sample measured 8.89 ms average / 11.9 ms P95. The final desktop
page reported no console errors. The 390 × 844 portrait composition was also
reviewed after the material, road and camera corrections; its bottom empty
area was materially reduced. Timing observations are local-machine evidence,
not a claim of performance improvement.

The weak-network contract remains zero district requests. Entering a POI keeps
the district inactive and returning to overview remounts it. OSM attribution
and the non-survey disclosure remain visible, and runtime code makes no
Overpass or Nominatim request.

Detailed evidence is recorded in
`docs/research/test_overview_district_massing_runtime_qa.json` and the
`test_refined_overview_*.png` files in `docs/research/`.

## Deferred backlog

- Render evidence-supported `building:part` hierarchy after measuring whether
  skyline detail materially improves overview comprehension.
- Enrich generic-building heights with a multi-source evidence pass instead of
  continuing to rely on footprint-area heuristics alone:
  1. spatially match the current OSM footprints against the Asia release of
     3D-GloBFP and record the matched height, source year and match quality;
  2. inspect the current Overture Buildings release for independent `height`,
     `num_floors` and `building_part` values, while detecting OSM-derived values
     so the same source is not counted twice;
  3. use user-supplied map screenshots, current street photographs and reliable
     POI material only to validate floor counts, relative height bands, podiums,
     roofs and recent construction/demolition—not to trace proprietary map
     geometry or calculate survey-grade height from screen pixels;
  4. keep Copernicus GLO-30 limited to district-scale terrain/surface trends
     because its 30 m DSM mixes buildings, infrastructure and vegetation;
  5. do not use Google Open Buildings 2.5D unless its official coverage expands
     to Shanghai.
- Store one height confidence level per building:
  - `A`: official record, explicit reliable floor count, or verified
    site/photo evidence;
  - `B`: independent height dataset agrees with screenshot/photo or floor-count
    evidence;
  - `C`: footprint-only heuristic, which remains visibly disclosed as an
    approximation.
- Run automated matching and conflict detection before requesting manual
  evidence. Ask for screenshots only for missing, conflicting or
  skyline-important buildings, normally a 20–40 building review set rather
  than all generic buildings.
- Screenshot evidence should contain a labelled top-down locator and two
  opposite oblique views covering roughly one to three blocks. Record the map
  product, layer/mode, capture date, visible labels, target buildings and any
  uncertainty. Preserve screenshots as research evidence; never ship or embed
  proprietary map captures in runtime assets.
- Before importing any third-party height field into generated/runtime data,
  record its licence and commercial-use compatibility. In particular,
  GlobalBuildingAtlas height and LoD1 products are currently CC BY-NC 4.0 and
  must not be used as a production source without a compatible-use decision.
- Map exact OSM refs for inferred POIs and replace masks with direct IDs.
- Produce or upgrade individual POI Hero/Identity/Massing tiers through the
  photo-reference workflow.
- Consider distance-based district LOD only if measured mobile performance or
  transfer cost requires it.
- Repair and re-accept the post-processing Composer against the current
  React/R3F/Vinext stack before re-enabling it in playable modes.
- Add collision only if a future product decision makes generic buildings
  explorable; it is deliberately excluded from overview context.

## Public references

- OpenStreetMap building footprints and tags:
  <https://wiki.openstreetmap.org/wiki/Key:building>
- OSM Simple 3D Buildings:
  <https://wiki.openstreetmap.org/wiki/S3DB>
- OSM copyright and ODbL attribution:
  <https://www.openstreetmap.org/copyright>
- Overpass public-instance guidance:
  <https://dev.overpass-api.de/overpass-doc/en/preface/commons.html>
- Overture Buildings schema and release guide:
  <https://docs.overturemaps.org/guides/buildings/>
- 3D-GloBFP building-height dataset and validation:
  <https://essd.copernicus.org/articles/16/5357/2024/>
- Copernicus DEM product description:
  <https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM>
- Google Open Buildings 2.5D coverage:
  <https://sites.research.google/gr/open-buildings/temporal/>
- GlobalBuildingAtlas licence notice:
  <https://github.com/zhu-xlab/GlobalBuildingAtlas>
- Three.js GLTF exporter:
  <https://threejs.org/docs/pages/GLTFExporter.html>
