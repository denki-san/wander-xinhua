# Shangsheng and Huashan Massing Independent Review

- Review date: 2026-07-25
- Reviewer role: independent
- Scope: 11 Shangsheng OSM ways and Huashan OSM way `743778426`
- Model-code changes: none
- Runtime/network foundation: 12 / 12 pass
- Runtime geometry correctness: 12 / 12 pass
- Strict isolated-frame composition: 12 / 12 pass
- Formal Massing: 0 / 12 at this checkpoint
- Identity / Hero release: 0 / 12

## 1. Decision

All twelve GLBs are valid exact-way footprint extrusions and may be retained as
Massing geometry. This review does not accept the batch as formally complete
Massing, and it does not release any Identity or Hero work.

The distinction is intentional:

1. `runtime geometry correctness` means the intended GLB loaded, the complete
   source-way shape is readable, the model is visually grounded, and the
   recorded pivot / yaw / scale reconstruct the OSM polygon;
2. `formal Massing` additionally requires the batch's own map, collision,
   clearance and evidence gates to be closed;
3. `Identity / Hero release` requires single-building facade, entrance,
   canonical-front and semantic evidence that a neutral footprint extrusion
   cannot provide.

## 2. Geometry, coordinate and budget findings

- The twelve build records contain 58 source vertices. Independent
  reconstruction through Blender `-Y`, glTF `+Z`, the existing runtime pivot
  and yaw, and runtime scale `[1, 1, 1]` produced a maximum world-coordinate
  error of approximately `0.0000006523` scene units, below the `0.0002`
  tolerance.
- Existing placement pivots are not always polygon centroids. This is valid:
  the local footprint offset compensates for the pivot. Recentring a GLB
  without regenerating its local vertices would move the building.
- OSM way `864847883` preserves the Navy Club U shape and its open negative
  space. OSM way `1364679201` preserves both footprint notches instead of
  collapsing them to one rectangle.
- Every GLB has one node, one mesh and one material, no node transform, no
  image, texture or animation, and `minY = 0`.
- Batch total is `31,488` bytes and `184` triangles. No asset exceeds the
  per-file node, mesh, material, triangle or byte budget.
- Runtime places each GLB bottom at local `Y = 0.1` while the site plane is at
  local `Y = 0.08`. The resulting `0.02` scene-unit clearance does not produce
  a visible floating artifact in the screenshots, but it is a render
  clearance rather than mathematically flush contact.

The Blender / glTF axis contract is internally consistent for this batch.
Blender Y stores the negative generator-local Z, so glTF export produces the
intended Three.js Z directly. No runtime Z reflection is required.

## 3. Runtime evidence and its boundary

The persisted runtime QA record supports the following claims:

- twelve isolated `qaModelId` routes reached `playable` with one canvas;
- the twelve target GLBs each returned HTTP `200` as
  `model/gltf-binary`;
- target loading failures: `0`;
- runtime exceptions: `0`;
- logged errors: `0`;
- cache and service-worker hits were not used;
- all recorded screenshot and contact-sheet hashes match the current files.

This evidence does **not** prove a full cold-page resource total, performance,
production deployment, deterministic walk-around, collision correctness,
entrance access, or the completeness of the real Shangsheng campus. The
isolated screenshots are geometry QA views, not facade-direction evidence.

## 4. Visual review

| OSM way | Geometry decision | Evidence boundary |
| --- | --- | --- |
| `864847856` | Pass; exact narrow rectangle is clean, grounded and fully framed | The refreshed view is roughly 37% wide and 65% high, within the brief's occupancy target; identity, levels and facade remain unknown |
| `864847877` | Pass; Sun Ke Villa footprint and site axis are readable | `10.5 m` is fallback, not measured height; Identity still needs its per-building Brief, photo-to-map direction and entrance closure |
| `864847881` | Pass; Country Club long bar footprint is complete | `10.5 m` is fallback; facade evidence does not convert this box into Identity |
| `864847883` | Pass; U shape, both arms and courtyard void are preserved | Pool-side evidence does not prove the hidden exterior or entrance |
| `864847892` | Pass; refreshed GLB is a low east-west one-storey proxy | Current evidence audit supports the retained `30#` binding at high confidence; `3.9 m` is inferred from one storey, not surveyed height, and facade / entrance remain unknown |
| `1364679201` | Pass; the concave footprint and two notches are visible | Historic/new-campus semantic conflict remains blocked; the current single AABB collision does not preserve the two notches |
| `1364679204` | Pass as the exact current OSM way | It is only an N2-zone candidate, not a complete N2 binding |
| `1364679205` | Pass as the exact current OSM way | It is only an N4-zone or sub-volume candidate, not a complete N4 binding |
| `1368808689` | Pass as an exact existing-campus footprint | Do not assign N1-N5 or a facade identity |
| `1368808690` | Pass as an exact existing-campus footprint | Do not assign N1-N5 or a facade identity |
| `1537478450` | Pass as an exact existing historic footprint | It is not retained `30#`; identity and entrance remain unknown |
| `743778426` | Pass; the very small one-storey footprint is complete, grounded and fully framed | The final view is approximately 453 / 1280 = 35.4% wide and 494 / 720 = 68.6% high, within the brief's occupancy target; `3.9 m` is inferred, and function / facade / entrance are unknown |

The runtime geometry is readable for all twelve assets. Under the model
Brief's explicit `35–65%` width and `30–70%` height target, refreshed way
`864847856` passes without clipping, and the final `743778426` azimuth /
distance candidate also passes with all footprint edges visible. The strict
isolated-frame composition gate is therefore 12 / 12.

## 5. Why formal Massing remains blocked

The twelve records correctly remain
`mapAcceptance = pending-independent-review-and-evidence-binding`.

Formal release is blocked by the following unresolved items:

1. the current runtime record proves isolated rendering but does not include a
   deterministic approach / walk-around or start-and-camera clearance result;
2. exact rendered polygons have not yet been accepted as exact runtime
   collision polygons or deterministic convex decompositions;
3. the Navy Club uses three collision parts and keeps its courtyard open, but
   concave way `1364679201` still uses one legacy AABB that fills both footprint
   notches;
4. the official registered plan shows that N1, N3 and N5 are missing from the
   current OSM building extract, while the N2 and N4 ways are coarse or partial;
   these twelve files therefore cannot prove a complete current Shangsheng
   building set;
The current `30#` conclusion is taken from the updated official-plan overlay
audit; this review does not infer any N-number or `30#` mapping from geometry
alone. N1–N5 must not be assigned to the remaining ways.

## 6. Identity and Hero gate

No Identity or Hero asset is released by this Massing review.

- `864847877`, `864847881` and `864847883` have confirmed named-building
  evidence, but their own evidence gates still require per-building Briefs,
  facade-direction / entrance closure, and for the Navy Club a pool-interior
  versus exterior separation.
- `864847892` has a high-confidence retained `30#` plan binding, but no verified
  single-building facade or entrance evidence.
- The other Shangsheng ways remain unnamed, conflicting, or incomplete
  N-zone footprints.
- Huashan `743778426` proves a one-storey footprint only. It must not be called
  a toilet, reading room, management room, equipment room or duty room without
  new single-building evidence.

The ten `10.5 m` heights are neutral runtime fallbacks. The two `3.9 m`
heights (`864847892` and `743778426`) are one-storey inferences. None is a
surveyed total height.

## 7. Required closure

1. Add exact-polygon or deterministic convex collision acceptance, with an
   explicit concavity test for `1364679201` and courtyard-access test for
   `864847883`.
2. Record deterministic start, camera-clearance, approach and walk-around
   results for the real `?start=` pages.
3. Keep N1–N5 as missing or partial bindings until authoritative current
   polygons are added; do not force one-to-one assignment to the existing ways.
4. Re-run independent formal Massing review after these gates close. Identity
   and Hero remain separate later reviews.
