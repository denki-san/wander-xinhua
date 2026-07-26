# Villa Le Bec Hero v2 Model Brief

## Scope and frozen contract

- Asset: `villa-le-bec`; one two-building Hero candidate only.
- Base: integration commit `dcd619e`.
- Accepted Massing: `public/models/tiers/xinhua-road/massing-v2/villa-le-bec-massing.glb`, SHA-256 `593cc3995046439d973788108ac00cd6176c3f7c8fce67702e98db01d54b975f`.
- Preserved blocked Hero v1: `public/models/tiers/xinhua-road/hero-v1/villa-le-bec-hero.glb`, SHA-256 `56cb58a3d9f0d24a1f35d3edd610de871fb01f135253043022bef2cbadf46dad`.
- Frozen placement: position `[-34.1, 88.8]`, yaw `-0.38`, scale `0.82`; movement and rescaling are not authorized.
- Solid OSM ways: `864493176` and `864493175`.
- Collision: keep two solid buildings and the `1.399383` scene-unit Massing wall gap; do not bake one whole-site box or close the courtyard.
- Excluded: trees, vegetation, decorations, street furniture, commercial brand text, temporary soft furnishing, interiors, low annexes and other buildings.

## Preflight

- Blender: `/Applications/Blender.app/Contents/MacOS/Blender`, version `5.2.0 LTS`.
- Generator: `scripts/create_villa_le_bec_hero_v2_model.py`; writes only new `hero-v2` paths.
- GLB audit: `scripts/audit_glb.py --forbid-images --max-nodes 8`.
- Blender MCP: deliberately not executed by this task; fixed-camera Headless renders are the documented fallback before the main-window MCP2 review.
- Runtime and browser: excluded by task scope. The candidate must not be promoted before MCP2 and runtime integration review.

## Evidence and view coverage

Only the following already-local references are authorized:

| View | Local evidence | Observed use | Unknown or omitted |
| --- | --- | --- | --- |
| Canonical | `test_xhs_villa_le_bec_01.jpg` | Street building has a two-storey facade, continuous lower entrance/shop-window rhythm, upper projecting window, hipped roof and visible courtyard gate | Brand signs, lights, bicycles, trees and movable furniture are omitted |
| Entrance | `test_xhs_villa_le_bec_02.jpg` | Garden building has a front-facing door, steps, upper window and a windowed roof dormer | Statues, awnings, signs and vegetation are omitted |
| Side/depth | `test_xhs_villa_le_bec_11.jpg` | Garden-side upper projecting window and roof/eave depth | Low annex and temporary patio furnishing are omitted |

Canonical observation direction is from Xinhua Road toward the street facade and courtyard. Authored front remains local `-Y`.

## Quality contract

### Identity

1. Street facade reads as two storeys through separate ground and upper opening bands.
2. Ground level reads as a continuous unbranded entrance/shop-window interface.
3. Upper projecting bay reads as a distinct windowed volume.
4. Garden entrance reads from the fixed entrance camera as a door, upper window, canopy and steps.
5. Dormers read as windowed gable structures rather than blank chimney boxes.

### Geometry and materials

- Keep exact Massing footprints and hipped roof envelopes as the base source.
- Use warm white plaster, dark stone base, muted red-brown roof, deep green frames and low-reflection dark glass.
- Small trim is permitted only where it strengthens the evidence-supported facade hierarchy.
- No reference image may be embedded in the GLB.

### Runtime budget

- Maximum nodes: `8`
- Maximum triangles: `68,000`
- Maximum materials: `12`
- Maximum images/textures: `0`
- Maximum bytes: `5,200,000`
- Root origin, authored unit, front direction and ground datum remain unchanged.

### Fixed-camera framing

- Canonical: street facade and garden roof both visible; facade occupies roughly 55–75% of frame width.
- Side/depth: both separated buildings and the open gap remain visible.
- Entrance: front-facing garden door, upper window and roof dormer remain readable without close-up cropping.
- Triptych: canonical, side/depth and entrance renders concatenated at identical resolution.

## Evidence classification

- Observed: the listed facade hierarchy, front door, upper projecting windows, hipped roofs, dormers and two-building separation.
- Inferred: exact opening widths, mullion spacing, storey heights and simplified material values.
- Unknown: unseen rear elevations, surveyed heights, cadastral boundary, low-annex ownership and current commercial state.

## Validation and handoff gate

- Headless Blender must generate a new editable Blend, GLB, three fixed views and triptych.
- The build record must lock generator, Massing, Hero v1, reference and output SHA values.
- Villa-only structural tests and GLB audit must pass.
- MCP2 is not run in this task. Even if fixed views pass, the output remains a candidate pending main-window MCP2 and later runtime acceptance.

## Build result — 2026-07-26

- Changes: generated a new deterministic Hero v2 without modifying Hero v1, Massing, placement, collision, registry or runtime files.
- Evidence-supported repair: the canonical render now separates the continuous lower storefront from the upper windows/projecting bay; the entrance render now shows the garden door, upper window, steps and full dormer; the side render shows the evidence-supported upper projecting window.
- Headless Blender: pass for canonical, side/depth, entrance and triptych.
- GLB: SHA-256 `a6ebf4a362a1d759bf818f62595c75ffa240b06461bc1479f13f6626a845b35d`; `124592` bytes; `1680` triangles; one node, one mesh, six materials and zero images/textures.
- Fixed-view independent check: pass for the three blockers named by `villa-le-bec-hero-visual-adjudication.json`; unseen rear faces remain deliberately plain.
- Runtime and performance: not run by task scope, so no runtime or performance claim is made.
- Blender MCP2: not executed; candidate remains pending main-window MCP2 and cannot authorize Identity or runtime promotion.
- Tool fallback: the sandboxed Blender process exited during platform initialization; the approved Headless Blender process outside the sandbox completed generation and rendering.
- Rollback: retain all `hero-v1` files and remove only the new `hero-v2` paths and this commit if the candidate is rejected.
