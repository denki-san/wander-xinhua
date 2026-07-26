# Xinhua Community Center Service-road Semantics Record

## Disposition

Formal map acceptance remains **blocked**. OSM way `577252269` (`新华路345弄`) is an
unnamed-in-the-asset service road: its raw tags only establish `highway=service`, a name, and
`oneway=no`. They provide neither a carriageway width nor lane count. The current shared road
contract renders every `service` road at `2.5` scene units (`1.25` half-width).

The OSM-bound building-4 footprint is `0.8473649273` scene units from that centerline. It
therefore overlaps the rendered asphalt by `0.4026350727` scene units (`1.0871146963 m`).
The Massing binary, placement, scale, footprint and collision coverage remain unchanged.

## Width boundary

Pure geometry gives a zero-overlap upper bound of `1.6947298546` scene units:
`2 × 0.8473649273`. This is not an authorized replacement width: no local OSM tag, local photo,
survey, site plan, or road-specific rendering contract supports narrowing the service road from
`2.5` to that value. Any positive visibility/collision buffer would lower the admissible width
further.

## What is and is not proven

- Proven: centerline topology, `service` classification, current rendered width, building
  footprint distance, overlap, no arbitrary asset translation/scale, and runtime wall-stop.
- Not proven: actual paved width, curb/asphalt edge, whether the OSM centerline is offset from the
  drivable surface, or any narrower road rendering width.
- Forbidden: selecting a convenient narrower width, moving/scaling the building, deleting or
  carving collision, or treating runtime no-penetration as map acceptance.

## Minimum evidence to reopen the gate

Obtain a surveyed/site-plan road edge, a geolocatable orthophoto with documented scale, or an
authoritative road-width/curb source. Recompute road edge, building footprint, full collision
coverage, entrance and neighbor contracts before any shared-road change. Until then, retain the
Massing/MCP/runtime diagnostic records but keep Hero, Identity and production promotion blocked.
