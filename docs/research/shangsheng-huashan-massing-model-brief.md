# Shangsheng and Huashan Exact-footprint Massing Model Brief

## 1. Scope

- Batch: `shangsheng-huashan-exact-footprint-massing`
- Tier: `massing`
- Assets:
  - Shangsheng Xinsuo OSM ways `864847856`, `864847877`, `864847881`,
    `864847883`, `864847892`, `1364679201`, `1364679204`, `1364679205`,
    `1368808689`, `1368808690`, `1537478450`
  - Huashan Greenland OSM way `743778426`
- Generator: `scripts/create_shangsheng_huashan_massing_models.py`
- Editable sources:
  `assets/models/source/tiers/shangsheng-huashan/massing/`
- Runtime GLBs: `public/models/tiers/shangsheng-huashan/massing/`
- Build records:
  `docs/research/build-records/tiers/shangsheng-huashan/massing/`
- Runtime entry:
  `?start=shangsheng&qaModelTier=massing&qaModelId=osm-way-<id>` or
  `?start=huashan&qaModelTier=massing&qaModelId=osm-way-743778426`

This batch replaces only the current procedural Massing proxies. It does not
authorize a facade, entrance, roof or named-building Identity/Hero inference.

## 2. Tool preflight

Checked on `2026-07-25` before opening Blender:

| Entry | Result | Fallback |
|---|---|---|
| Blender | `/opt/homebrew/bin/blender`, Blender `5.2.0 LTS` | Deterministic Python generator remains the source of truth |
| Generator pattern | Existing exact-footprint road Massing v2 generator available | Reuse the audited polygon extrusion and GLB parser |
| GLB audit | Repository tests and generator-side glTF 2.0 parser available | Block the batch if node transforms, textures or budgets fail |
| Local preview | Vite static preview available at `127.0.0.1:4173` | Use static build plus browser runtime QA |
| Browser acceptance | In-app Chromium/CDP path available | Preserve deterministic QA routes and screenshots |

## 3. Evidence sources and binding

| Scope | Local evidence | Binding strength | Permitted use |
|---|---|---|---|
| All 12 ways | `docs/research/data/xinhua-building-inventory-20260724-185400.json` | Observed OSM footprint | Exact horizontal boundary, centroid and longest-axis QA only |
| Shangsheng placement | `app/scene/xinhua-landmarks-data.json` | Existing projected site binding | Site-relative runtime position; no silent movement |
| Huashan placement | `app/scene/xinhua-landmarks-data.json` | Existing projected site binding | Site-relative runtime position; no silent movement |
| Sun Ke Villa | `docs/research/sun-ke-villa-reference-manifest.json` | High, single-building | Massing comparison and later Hero work |
| Country Club | `docs/research/assets/poi-references/shangsheng-xinsuo/columbia-country-club.jpg` | High, single-building | Massing comparison; later Brief still required for Hero |
| Navy Club | `docs/research/assets/poi-references/shangsheng-xinsuo/navy-club-canonical.jpg` | High, single-building | U-shaped massing comparison; hidden exterior remains unknown |
| Phase II candidates | `docs/research/shangsheng-phase-two-reference-manifest.json` | Project-level only | Campus family and plan-overlay research, not per-way facade binding |
| Huashan service footprint | `docs/research/shangsheng-huashan-building-evidence-audit.md` | Footprint only | One-storey envelope; function and all facade details blocked |

All local photographs remain research evidence only. They are not embedded in
the GLBs and are not runtime textures.

## 4. View coverage matrix

`Observed` means that a subject-specific photograph or exact OSM geometry
exists. `Unknown` blocks Identity/Hero but does not block footprint Massing.

| Way | Canonical comparison | Depth / side | Entrance / identity detail | Massing decision |
|---|---|---|---|---|
| `864847856` | OSM plan, observed | OSM outline, observed | Unknown | Exact footprint, fallback height |
| `864847877` | South facade photo, observed | Right-front photo, observed | North entrance photo, observed | Exact footprint, fallback preview height |
| `864847881` | Current facade photo, observed | Historic facade drawing, observed | North entrance evidence, observed | Exact footprint, fallback preview height |
| `864847883` | Pool-facing facade photo, observed | U-shaped OSM outline, observed | Exterior entrance unknown | Exact footprint, fallback preview height |
| `864847892` | Official numbered plan plus OSM, observed | East-west bar, observed | Facade and entrance unknown | Confirmed retained 30#, exact footprint, inferred one-storey height |
| `1364679201` | OSM plan, observed | OSM outline, observed | Identity conflict unknown | Exact footprint, fallback height |
| `1364679204` | OSM plan, observed | OSM outline, observed | N-number unknown | Exact footprint, fallback height |
| `1364679205` | OSM plan, observed | OSM outline, observed | N-number unknown | Exact footprint, fallback height |
| `1368808689` | OSM plan, observed | OSM outline, observed | N-number unknown | Exact footprint, fallback height |
| `1368808690` | OSM plan, observed | OSM outline, observed | N-number unknown | Exact footprint, fallback height |
| `1537478450` | OSM plan, observed | OSM outline, observed | Existing historic identity unknown; confirmed not 30# | Exact footprint, fallback height |
| `743778426` | OSM plan, observed | OSM outline, observed | Function, facade and entrance unknown | Exact footprint, one-storey height |

Canonical Blender comparison direction is a fixed elevated view from local
south-east toward each footprint centroid. The side view is from local
north-west. These are geometry QA views, not claimed real facade directions.
The Three.js runtime view must show the model in its actual site context and in
an isolated elevated three-quarter QA view.

## 5. Observed, inferred and unknown

### Directly observed

- The 12 OSM polygons, centroids and source way IDs.
- Huashan way `743778426` has `building:levels=1`.
- Sun Ke Villa, Country Club and Navy Club names correspond to their OSM ways
  and have single-building visual evidence.
- Phase II contains five new buildings N1–N5 and one retained 30# building.

### Reasonable inference used only for preview height

- Every Shangsheng way except confirmed retained 30# uses the inventory
  `10.5 m` runtime fallback only as a neutral preview envelope and is not
  recorded as measured truth.
- Way `864847892` uses `3.9 m` as a one-storey preview inferred from the
  official numbered plan; it is still not a surveyed total height.
- The known historical buildings' visual storey counts remain useful later,
  but this batch does not convert them into a surveyed total height.
- Huashan way `743778426`: `3.9 m` is derived from the one-storey OSM tag, not a
  surveyed height.

### Unknown and prohibited assumptions

- Complete N1–N5 footprint mapping. Retained 30# is now high-confidence way
  `864847892`; its facade and entrance remain unknown.
- Real height for every Shangsheng unclassified way.
- Canonical facade and entrance direction for all unclassified ways.
- Huashan way `743778426` function, materials, roof, door, windows and entrance.
- Hidden elevations, rooftop equipment and service additions.

## 6. Asset-specific Massing recognizers

For this tier, a recognizer is a geometry invariant rather than a facade
decoration. Every asset must preserve all three:

1. exact source polygon including concavity and unequal edge lengths;
2. stable OSM way ID embedded in Blender scene, GLB extras and build record;
3. exact site-relative centroid plus the source polygon's relative orientation.

Additional named-building recognizers:

- `864847877`: rectangular Sun Ke Villa footprint, three-storey envelope and
  stable site relationship.
- `864847881`: long Country Club bar footprint, two-storey envelope and stable
  relationship to the campus center.
- `864847883`: U-shaped Navy Club footprint, retained open courtyard/pool-side
  negative space and two-storey envelope.
- `743778426`: very small one-storey rectangular footprint beside the
  basketball court; no roof or door cue is allowed at Massing.

## 7. Coordinate, proportion and runtime contract

- One scene unit represents `2.7 m`.
- Inventory polygons are in world `X/Z`; each GLB is authored around the
  existing runtime placement pivot from `xinhua-landmarks-data.json`.
- The deterministic transform is recorded in
  `docs/research/shangsheng-huashan-clean-massing-geometry-spec.json`.
- Blender `X` stores generator-local X and Blender `Y` stores the negative of
  generator-local Z. glTF therefore exports the intended Three.js local Z
  without a reflection.
- Runtime child position and yaw preserve the existing site placement.
  Footprint orientation is stored relative to that pivot; runtime scale remains
  `[1, 1, 1]`.
- Horizontal size is observed from OSM. Vertical size uses the evidence status
  above and must remain separately labelled.
- Root transforms must be baked. GLBs must have `minY=0`, no images, no
  textures and no animations.

## 8. Collision, screen occupancy and budgets

- Existing per-building collision data remains authoritative until the new
  footprint collision audit is separately accepted.
- Massing GLBs do not add one large campus collision box.
- Target isolated QA occupancy: `35–65%` of viewport width and `30–70%` of
  viewport height.
- Per asset:
  - `<= 1` mesh
  - `<= 1` material
  - `<= 256` triangles
  - `<= 32 KiB`
  - zero images and textures
- Batch total target: `< 384 KiB`.

## 9. Batch gates

1. Generate deterministic `.blend`, `.glb`, canonical and side previews.
2. Audit SHA, bounds, nodes, meshes, triangles, materials, images and bytes.
3. Verify every source vertex round-trips through Blender, glTF and runtime
   reflection to the original world coordinate within `0.0002` scene units.
4. Enter the real `?start=` page and verify position, ground contact,
   orientation, visibility, console, target request and collision context.
5. Independent Massing review before any Identity work.
6. Identity/Hero remain blocked for every unclassified way and Huashan
   `743778426` until the evidence gaps above are closed.

## 10. Decision log

- `2026-07-25`: chose one GLB per OSM way so every building can advance,
  regress and be reviewed independently.
- `2026-07-25`: rejected the current procedural floor multipliers as surveyed
  height evidence.
- `2026-07-25`: prohibited binding project-level Phase II images to a specific
  OSM footprint before the plan-overlay audit succeeds.
- `2026-07-25`: allowed footprint-only Massing for evidence-poor buildings,
  while explicitly blocking Identity and Hero.
