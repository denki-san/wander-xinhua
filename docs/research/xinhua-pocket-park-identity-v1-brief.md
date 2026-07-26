# Xinhua Pocket Park Identity V1 Brief

## Frozen Hero derivation contract

Identity v1 is authorized only by
`docs/research/xinhua-pocket-park-blender-mcp-gates-v2.json`. The immutable Hero source is:

- Hero GLB SHA-256:
  `c6ef6f107e3c1b6555784858dea2e46da8813e68aec589d04d0d3c10aeb8a7c7`;
- Hero Blend SHA-256:
  `3510dd5676c5d3f65e2a5e88d12c309143671a1ff9248bd4d61d43381df2ef87`;
- Hero generator SHA-256:
  `61ad1d167749a6f817e12f4ad2991c800805e6c0f913b174df552f6c21548266`;
- Hero MCP2 status: `pass-main-window-xhigh`.

The Identity generator extracts its longitudinal wall profiles and entrance-header geometry from
that frozen Hero generator output, then samples fewer profile stations. It does not independently
invent a replacement building.

## Preserved Identity cues

1. two continuous faceted mirror walls;
2. the weathering-steel wave band on both walls;
3. the mirror silhouette above the steel band;
4. the weathering-steel entrance header;
5. the open ground-level center passage.

The authored origin, `Y=0` ground datum, `1.68 × 9.20` scene-unit envelope, local `-Y` Blender
front, local `+Z` GLB front, two side obstacles and `1.36` scene-unit minimum center passage remain
identical to Hero and Massing.

## Deliberate Identity losses

- fewer longitudinal fold stations and vertical seams;
- one shared mirror material instead of alternating light/deep mirror panels;
- no sub-panel variation beyond the retained folded silhouette;
- no new site, furnishing, lighting or landscape geometry.

The following remain prohibited: plants, grass, trees, benches, rotating/exhibition/signage
panels, ground lights, tactile studs, paving, path slabs, decorations, adjacent buildings and
full-map assets.

## Identity budget and gates

| Field | Identity v1 candidate |
| --- | --- |
| Generator | `scripts/create_xinhua_pocket_park_identity_v1.py` |
| Editable source | `assets/models/source/tiers/xinhua-road/identity-v1/xinhua-pocket-park-identity.blend` |
| GLB | `public/models/tiers/xinhua-road/identity-v1/xinhua-pocket-park-identity.glb` |
| Build record | `docs/research/build-records/tiers/xinhua-road/identity-v1/xinhua-pocket-park-identity.json` |
| Max nodes / meshes | 3 / 3 |
| Max triangles | 800 |
| Max materials | 3 |
| Max images / textures | 0 / 0 |
| Max GLB bytes | 120,000 |
| Intended viewing distance | map-wide Identity tier |

Canonical, side, detail and runtime-independent images are deterministic Headless previews. The
tier triptych is a pre-MCP3 comparison artifact only. Neither is an MCP3 or Three.js runtime pass.

- Identity deterministic derivation: `authorized`;
- Identity candidate: `headless-pass`;
- MCP3 same-camera tier review: `pending-main-window-xhigh`;
- Three.js Identity/fallback/performance/collision: `pending-main-window`;
- shared registry/runtime/Fast manifest: `must-remain-unchanged`.
