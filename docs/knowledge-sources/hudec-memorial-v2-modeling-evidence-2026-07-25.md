# Hudec Memorial V2 modeling evidence

## Scope

This source applies only to stable asset ID `hudec-memorial`, the former
residence of Laszlo Hudec at 129 Panyu Road. It does not authorize work on
trees, decorations, characters, other buildings, or district-wide massing.

## Traceable observations

- OpenStreetMap way `494633921` identifies the address, a three-level building,
  heritage status, and the Hudec Memorial Hall name. The snapshot is stored at
  `docs/research/data/requested-pois-osm-20260717-103840.json`.
- The canonical courtyard photo directly shows a wide black-and-white
  half-timber facade, deep steep roof, roof window, gabled entrance porch,
  mullioned windows, brick gate, and entrance steps. Evidence:
  `HUDEC-V2-REF-A` in
  `docs/research/hudec-memorial-v2-reference-manifest.json`.
- The Changning district government exterior photo directly shows the
  west/rear depth: connected roof levels, a low glazed wing, full-height
  end-wall timbering, a three-part tall brick chimney, and a three-bird ridge
  weathervane. Evidence: `HUDEC-V2-REF-C` in the same manifest.
- Three west-elevation sketches published by Shanghai Changning support the
  side volume and chimney relationship but are treated as historical design
  evidence, not a complete current-condition survey. Evidence:
  `HUDEC-V2-REF-B`.
- Projecting OSM way `494633921` with the checked-in map projection produces
  an east-west major edge at `0.153486288` radians. That edge, together with
  the west-elevation and west/rear evidence, rejects the legacy runtime
  `yaw=π/2`, which rotates the evidence-supported long axis by nearly 90
  degrees. Reproducible record:
  `test_artifacts/test_hudec-memorial_map_calibration.json`.

## Inferences

- Net dimensions are calibrated from the OSM compound envelope, existing world
  placement, and human-scale doors. They are not claimed as survey dimensions.
- The recommended runtime scale `0.88` is a footprint-fit calibration: it
  preserves the observed proportions while keeping the Massing close to the
  OSM oriented envelope. It is not a survey-scale claim.
- The hidden east and rear facades use a coherent low-detail continuation of
  observed opening rhythms.
- The roof-ridge bird group is represented only as an original simplified
  silhouette; no emblem, photo, or protected artwork is copied.

## Unknowns

- Complete east and rear elevations, interior plan, exact floor heights, exact
  roof pitch, current obscured landscaping, and detailed small signage remain
  unknown.
- Those areas must not receive photo-level detail claims.

## Production decision

The legacy Hero remains a rollback baseline, but its generic compact massing,
two simple chimneys, and incomplete west/rear hierarchy are insufficient
against the added official evidence. V2 must first calibrate a Massing tier in
the real `/?start=hudec` map, then finish the Hero, derive Identity from the
same deterministic parameters, and verify all tiers with the same origin,
scale, front direction, ground datum, and collision semantics.

Primary working contract:
`docs/research/hudec-memorial-v2-model-brief.md`. Existing ordinary evidence
is sufficient for the Massing placement and orientation decision; no new
Xiaohongshu search gap is required for this gate.
