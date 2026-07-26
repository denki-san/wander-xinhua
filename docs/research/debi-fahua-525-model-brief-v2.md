# Debi Fahua 525 Massing V3 Brief

- Asset ID: `building:xinhua-road:debi-fahua-525`
- Scope: one evidence-limited representative building candidate only
- Runtime tiers in this branch: Massing candidate; legacy Hero retained; Identity closed
- Map status: exact OSM geometry calibration passes, formal acceptance blocked
- Authored scale: `1 scene unit = 2.7 metres`
- Runtime transform: position `[-102, -49]`, yaw `-2.6`, scale `0.92`

## Evidence and coverage

Canonical comparison view:
`docs/research/assets/requested-poi-references/debi-fahua-525-front.jpg`.
It is a low front-oblique view of the tall principal facade. The photographed
camera compass direction and its exact OSM edge remain unknown.

Coverage matrix:

| View | Local evidence | Use | Boundary |
| --- | --- | --- | --- |
| Principal facade | `debi-fahua-525-front.jpg` | Six-floor vertical frame, dark glazed bays, external stair | Exact facade-to-OSM edge unknown |
| Courtyard depth | `debi-fahua-525-courtyard.jpg` | Continuous open approach beside building | Courtyard polygon and wall line unknown |
| Garden / entrance depth | `debi-fahua-525-garden.jpg` | Tall building beyond a narrow open garden approach | Camera location and rear extent unknown |

Observed:

- The official project page gives `法华镇路525号`, six floors and
  `5428.17 m²`.
- The principal building has a strong white vertical frame, dark glazed bays
  and an external switchback stair.
- The courtyard photographs require open negative space; a full-site slab or
  one compound collision box would be false.
- The historical source says the park and Shanghai Jiao Tong University Fahua
  campus are separated by one wall.
- OSM identifies `way/228966550` and `way/228966551` as university `1号楼`
  and `2号楼`; they cannot remain Debi members.

Inferred:

- `way/864847922` is the strongest conservative representative footprint.
  One secondary venue marker converts inside it, another converts to the
  Dingxi Road approach, and official history places the park against the
  university wall.
- Candidate height is `18 m`, using six floors at a `3 m` proxy. It is not a
  surveyed height and must not be reused as Hero truth.
- The exact OSM footprint remains unchanged even though the stylized
  Fahuazhen Road mesh overlaps it by `0.633229` scene unit.

Unknown:

- Cadastral compound boundary and complete member list.
- Exact entrance point, courtyard polygon and separating wall alignment.
- Which segments of the irregular footprint are six floors versus low wings.
- Rear facade, roof equipment and hidden openings.

## Identity cues and Massing limits

Subject-specific cues reserved for later Hero/Identity work:

1. white full-height vertical facade frame;
2. dark glazed vertical bays;
3. external switchback stair;
4. open courtyard/garden approach;
5. roofline `法华525` sign silhouette, without protected logo texture.

This Massing candidate uses only the observed OSM footprint and a neutral
height proxy. It does not invent the stair, windows, sign, garden, trees,
pond, furniture or courtyard walls.

## Transform, collision and map contract

- Source footprint: raw WGS84 `way/864847922`.
- Projection and inverse transform:
  `docs/research/debi-fahua-525-member-binding.json`.
- Maximum world round-trip error: `0`.
- Solid collision: representative footprint only.
- Open courtyard: negative space only; no site slab and no courtyard
  collision.
- Nearest adjacent building: `way/864847918`, raw gap `2.609279` scene units,
  `2.209279` after `0.2` margins on both buildings.
- Dingxi Road asphalt clearance: `1.352283` scene units.
- Fahuazhen Road asphalt clearance: `-0.633229` scene unit; formal map gate is
  blocked. Do not shift or shrink the building in this branch to hide the
  shared stylized-road conflict.

## Fixed review views and screen scale

- MCP 1 canonical: local southeast oblique, frame the complete footprint at
  roughly 70% image width.
- MCP 1 side/depth: local west oblique, verify irregular depth and ground
  datum.
- MCP 1 entrance-context: low oblique toward the north road-facing edge;
  orientation is a QA hypothesis, not entrance proof.
- Human scale: `1.7 m = 0.62963` scene unit before runtime scale.
- Ground datum: source `Y=0`.

## Budgets and gates

Massing budget:

- nodes `<= 2`;
- meshes `<= 1`;
- triangles `<= 80`;
- materials `<= 1`;
- images/textures `0`;
- GLB `<= 32 KB`.

Required next gates:

1. Blender MCP 1 on canonical, side/depth and entrance-context views;
2. main-window road-width or local road-surface adjudication;
3. real Three.js map check for position, ground, collision and open approach;
4. primary or cadastral membership proof before formal map pass;
5. only after those pass may the retained Hero be audited for MCP 2 and an
   Identity tier be derived.
