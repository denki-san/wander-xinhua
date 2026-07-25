# Xinhua building-height round-two evidence

## Scope

- Project: `wander-xinhua`
- Date: 2026-07-25
- Purpose: improve overview district massing heights without presenting
  modelled estimates as survey measurements
- Queue: all 676 first-round `C — heuristic` buildings
- Deployment boundary: local implementation only; no Sites or VPS publish
- Use boundary: current community/public-interest, non-commercial project

## Confirmed source facts

### GlobalBuildingAtlas GBA.LoD1

- Product: `GBA.LoD1 v1.0.0`
- Repository commit:
  `9da24b3a8dce436a7420d5c3589de718d7ba14d6`
- Tile: `LoD1/asiaeast/e120_n35_e125_n30.json`
- Original size: 545,969,287 bytes
- Official LFS and verified SHA-256:
  `d44d5fc07118fdf0d4131fe0b00bfb2c95bf50e8d7c22c09c0ae5bae5c8349f4`
- Licence: CC BY-NC 4.0
- Imagery period: 2018–2019 PlanetScope
- Record shape: JSON keyed by `osm<ID>CHN`, with `height` and internal TTA
  prediction variance
- Paper-reported Asia height RMSE: approximately 5.9 m
- Known paper limitation: high-rise heights may be underestimated

The viewer WFS returning HTTP 403 did not mean bulk data was unavailable.
The official GitHub documentation points bulk users to Hugging Face/mediaTUM.

### GHS-OBAT R2024A

- Product: `GHS-OBAT R2024A V1.0`
- China CSV ZIP size: 157,865,361 bytes
- Verified SHA-256:
  `136ae36bca1ef8ed569d1802fe8bdff2b1d7b25547424ae418c710258ec30356`
- Licence for the building dataset: ODbL 1.0
- Upstream footprint release: Overture Buildings `2024-07-22.0`
- Height origin: integration of GHS-BUILT-H / GHSL raster information at
  coarse 100 m context

Because the height is coarse-raster-derived, a geometrically matching
GHS-OBAT footprint is not sufficient by itself to promote a dense-city
building to B.

### 3D-GloBFP 2020

- Licence: CC BY 4.0
- Existing first-round exact one-to-one role remains unchanged.
- Round two additionally tested one OSM target against unions of 2–4 unique
  nearby source footprints.
- The original IoU, centroid, area-ratio and 3–90 m height gates were not
  loosened.

## Match policy

### GBA

A GBA candidate can become B only when:

1. its `osm<ID>CHN` key exactly matches the target OSM way;
2. height is finite and within 3–90 m;
3. `sqrt(variance) <= 6 m`;
4. no direct A evidence overrides it;
5. licence and final visual gates pass.

The 6 m internal-standard-deviation threshold is a project policy. Internal
TTA variance is not the same thing as real-world error, so passing this gate
still produces B, never A.

### GHS-OBAT

The spatial check used the frozen centroid, target/source area and one-to-one
assignment policy. Even a pass is recorded as `auxiliary-only`; it can flag
agreement or disagreement but cannot be the selected source alone.

### 3D-GloBFP group reconciliation

A group can become B only when:

- 2–4 source footprints form one target union;
- IoU is at least 0.70;
- centroid distance is at most 5 m;
- target/source area ratio is within 0.67–1.50;
- all source heights are within 3–90 m;
- source height spread is at most 6 m;
- no source feature is reused;
- no stronger evidence overrides it.

## Results for all 676 queued buildings

| Result | Count |
| --- | ---: |
| GBA exact OSM ID candidates | 590 |
| GBA passes height and uncertainty gate | 487 |
| GHS-OBAT spatial passes, auxiliary only | 577 |
| 3D-GloBFP group passes | 6 |
| Proposed upgrades after priority | 490 |
| Significant-change manual reviews | 7 |
| Manual accept B | 6 |
| Manual retain C | 1 |
| Final upgrades B | 489 |
| Final retains C | 187 |

The final 730-building confidence distribution is:

- A: 11
- B: 532
- C: 187

GBA is the selected second-round source for 487 buildings. Strict
3D-GloBFP group reconciliation is selected for 2 buildings. GHS-OBAT is
selected for 0 buildings.

## Significant-change review

Height changes at or above 20 m, or a proposed total height above 60 m, require
individual review. Seven records were reviewed; six were accepted.

`way/428379423` retained its 24 m C baseline:

- strict 3D-GloBFP union: 81.81 m;
- GBA exact-ID: 65.44 m, but internal stddev 8.164 m failed the 6 m gate;
- GHS-OBAT auxiliary: 47.56 m.

The visible massing looked structurally normal, but visual plausibility cannot
resolve a 34 m range among modelled estimates. The correct evidence decision
was to retain C.

## Runtime evidence

- Canonical GLB SHA-256:
  `e02289e36c2c75e1202b9084732b94e07249bee76f02aa18c3be82319a90e6f9`
- Size: 682,104 bytes
- Structure: 12 meshes, 3 materials, 11,779 triangles, 0 images/textures
- Deterministic replay: pass
- GLB audit: pass
- Desktop 1440×1024 canonical view: pass
- Mobile 390×844 real canvas: pass
- Xingfu Road and Fahuazhen Road views: pass
- Browser GLB response: HTTP 200, `model/gltf-binary`
- Browser page/console errors: 0
- Full test suite: 185/185 pass
- Full lint: pass

## Reusable decisions

1. Do not infer bulk-dataset unavailability from a viewer WFS failure.
2. Exact upstream IDs are stronger than spatial proximity, but model
   uncertainty and direct-evidence conflicts still matter.
3. Coarse raster-to-footprint height products are useful for conflict and
   plausibility checks, not automatically for per-building selection.
4. Preserve every candidate and rejection. Queue completion means every target
   has a final decision, not that every target was upgraded.
5. A normal-looking skyline is a runtime quality gate, not proof that an
   individual estimated height is true.
6. CC BY-NC data requires a new licence review before any commercial change of
   use.

## Traceable project evidence

- `docs/research/building-height-round2-queue-final.json`
- `docs/research/building-height-evidence.json`
- `docs/research/building-height-match-report.json`
- `docs/research/building-height-round2-gate.json`
- `docs/research/data/xinhua-building-height-sources-round2-20260725.json`
- `docs/research/test_building_height_round2_final_runtime_qa.json`
- `docs/research/building-height-calibration-decision-log.md`

Nothing from this study belongs in TowerOld. The target knowledge project is
the independent `Threejs-3d-research` Wiki.
