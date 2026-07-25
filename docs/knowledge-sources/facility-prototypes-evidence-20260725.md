# Wander Xinhua Facility Prototype Evidence — 2026-07-25

## Scope and quality contract

This source covers the 14 `prototype:facility:*` entries in
`docs/research/all-models-production-registry.json`. It separates direct observation,
reasonable inference and unknowns. Runtime-authored geometry is not treated as a
survey of the real site.

Primary repository evidence:

- `docs/research/facility-prototypes-reference-manifest.json`
- `docs/research/facility-prototypes-evidence-audit.md`
- `docs/research/facility-prototypes-massing-geometry-spec.json`
- `docs/research/facility-prototypes-massing-model-brief.md`
- `docs/research/model-placement-registry-20260725.json`

## Direct observations

### Shangsheng Xinsuo fountain

- A 2022 Changning District Government photograph directly shows multiple flush
  ground jets in the plaza in front of the Navy Club.
- The photograph does not prove which visible fountain area corresponds to OSM
  ways `1364679202` and `1364679203`.
- Evidence:
  `docs/research/assets/poi-references/shangsheng-xinsuo/shangsheng-navy-club-fountain-plaza-2022.jpeg`
- Source:
  https://www.shcn.gov.cn/col7344/20220604/1216190.html

### Huashan Greenland basketball court

- A 2025 Changning District Government photograph directly shows a blue court,
  green rigid perimeter fence, full-height entry turnstile, green cantilever hoop
  support and white backboard.
- OSM way `743778425` supports the court position, footprint and long-axis
  orientation, but the exact photo viewpoint has not yet been overlaid on the map.
- Evidence:
  `docs/research/assets/poi-references/huashan-greenland/huashan-basketball-court-entry-2025.jpg`
- Source:
  https://www.shcn.gov.cn/col6991/20250821/1296636.html

### Huashan Greenland Happiness Corner

- Four 2026 Changning District Government photographs directly show a large pink
  concentric heart-shaped frame, pink stepped seating, pale curved planters and a
  mature woodland setting.
- This direct evidence conflicts with the previous runtime-authored design made of
  three pale rectangular frames and flower clusters. The old runtime geometry must
  not be carried into the new Massing model.
- Evidence:
  `docs/research/assets/poi-references/huashan-greenland/huashan-happiness-corner-canonical-2026.jpg`,
  `huashan-happiness-corner-heart-frame-2026.jpg`,
  `huashan-happiness-corner-step-detail-2026.jpg`,
  `huashan-happiness-corner-planting-terrace-side-2026.jpg`
- Source:
  https://www.shcn.gov.cn/col6991/20260502/1309137.html

### M+ Xingfuli vertical garden

- A 2023 Changning District Government photograph directly shows a tall,
  continuous green wall along the left side of the main lane, with a dark solid
  wall base and an irregular planted silhouette.
- The photograph proves the facility type and lane relationship, not the exact
  dimensions or module construction of the current runtime wall.
- Evidence:
  `docs/research/assets/poi-references/xingfuli/xingfuli-government-main-lane-vertical-garden-2023.jpg`
- Source:
  https://www.shcn.gov.cn/col7344/20231030/1247114.html

### One Square Metre Action

- The Research Institute of Better China Initiative at China Academy of Art
  documents the project as a community micro-renewal program initiated in 2021 in
  Xinhua Road Subdistrict.
- Public photographs show workshops, craft sessions and community gardening. They
  do not prove the geometry of the fixed interactive installation currently used
  by the game.
- The game's installation is therefore a product-authored asset, not a real-world
  reconstruction.
- Evidence:
  `docs/research/assets/poi-references/one-square-metre-action/`
- Source:
  https://betterchina.caa.edu.cn/case/c530.html

## Reasonable inferences

- Facility prototypes without a dedicated subject photograph may receive a neutral,
  replaceable Massing envelope based on current runtime dimensions, but not a
  real-world Identity model.
- The two Shangsheng fountain footprints may be generated from their separate OSM
  polygons; nozzle layout and vertical form remain unknown.
- Huashan basketball Massing may combine the OSM five-sided footprint with the
  directly observed fence, turnstile and hoop silhouette. Exact fixture dimensions
  remain inferred.
- Happiness Corner should be redesigned around its observed heart frame, terraces
  and curved planters. Placement, yaw and terrain fit still need a map/photo overlay.
- Xingfuli mixed paving and reflecting-pool hardscape have enough local multi-view
  evidence to enter an Identity batch after Massing validation.

## Unknowns and blocked prototypes

No dedicated subject photograph has been found for:

- `prototype:facility:shangsheng-wayfinding-totem`
- `prototype:facility:shangsheng-cafe-pavilion`
- `prototype:facility:shangsheng-bicycle-parking`
- `prototype:facility:shangsheng-reading-terrace`
- `prototype:facility:huashan-pond-boardwalk`
- `prototype:facility:huashan-bird-pergola`

Additional unknowns:

- the one-to-one binding between the public Shangsheng fountain photograph and OSM
  ways `1364679202` / `1364679203`;
- the complete Huashan basketball court boundary, second hoop, fence entrance and
  photo-to-map viewpoint;
- the exact Happiness Corner pivot, yaw, height steps and physical dimensions;
- the Xingfuli green-wall height, length, thickness, planting modules and irrigation
  system;
- whether current facilities changed after the dated photographs.

## Executable decision

- Produce Massing for all 14 facility prototype semantics, with two separate
  Shangsheng fountain footprint assets, for 15 GLBs total.
- Preserve product/runtime-authored items as explicitly labeled fallbacks.
- Admit Identity only where direct evidence and placement binding meet the model
  brief. A generated Massing asset never automatically passes Identity or Hero.
- Validate Blender, GLB, isolated Three.js gallery and real-map placement separately.
