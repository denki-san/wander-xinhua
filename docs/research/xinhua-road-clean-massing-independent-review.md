# Xinhua Road Clean Massing V2 Independent Review

- Review date: 2026-07-25
- Reviewer role: independent, read-only
- Runtime/network foundation: 8 / 8 pass
- Geometry/runtime visual Massing: 8 / 8 pass
- Formal Massing: 0 / 8
- Identity: 0 / 8

## Visual decision

The street-context screenshots prove the actual `?start=` position, playable
state, scene scale and `spring-clear / blocker none`. The deterministic elevated
three-quarter screenshots prove complete silhouette, separation, ground contact
and camera readability.

| Asset | Runtime geometry visual | Formal blocker |
| --- | --- | --- |
| `film-art-center` | Pass | venue footprint, links and entrance |
| `one-step-garden` | Pass | real two-building membership |
| `xinhua-villas-329` | Pass | door-number mapping and full 29-building compound |
| `villa-le-bec` | Pass | main-villa / former-garage roles and entrance |
| `shanghai-orchestra` | Pass | 6/7/8 roles, retained volume and entrance |
| `xinhua-pocket-park` | Pass | surveyed irregular boundary, entrance end and wall dimensions |
| `debi-fahua-525` | Pass | main building, four courtyards, entrance and heights |
| `fics-xinhua-365` | Pass | building roles, complete campus, courtyards and entrance |

The Pocket Park isolated view now shows both walls, the central open path,
entrance frame, planters and bench nodes. It remains an approximate site envelope.

## Coordinate decision

`runtimeCorrectionScaleZ = -1` is required for this batch. The generator writes
OSM `localZ` to Blender Y; glTF exports that to Three.js `-Z`; the runtime
reflection restores the original OSM localZ before the parent position/yaw/scale
transform. The automated test reconstructs all vertices for 31 source ways
within `0.0002` world units.

This proves transform stability, not that a candidate way is the target POI.

## Gate boundary

All eight build records must keep map acceptance blocked and
`identityAllowed = false`. Fallback heights are preview values, not survey
evidence. No Identity work may start until each asset's membership, height,
entrance and compound/site boundary are resolved.
