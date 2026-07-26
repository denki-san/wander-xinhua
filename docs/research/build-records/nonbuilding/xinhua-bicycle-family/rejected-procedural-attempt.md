# Rejected Procedural Bicycle Attempt

## Status

- Decision: `rejected`
- Date: 2026-07-26
- Reason: the user rejected the visual quality of the procedural bicycle family.
- Runtime eligibility: none
- Production eligibility: none

## Preserved experiment

The generated `.blend`, GLB, fixed-camera renders and audit records are preserved
only as evidence of the failed approach. They must not be added to the isolated QA
route, production registry, production manifest or map placement.

## img2threejs probe

The selected shared-bicycle photo passed technical image probing, but the automatic
spec scaffold contained only one root component. Strict validation reported missing
object classification, component hierarchy, identity details, materials, repetition
systems and review viewpoints. Forced code generation produced a blockout box rather
than a bicycle.

Conclusion: `img2threejs` is a framework for agent-authored procedural reconstruction,
not a one-click image-to-mesh path suitable for this fast batch.

## Replacement decision

Use the downloadable `Blue Bike 3D Scan` by Ye Hang as the source candidate. Preserve
the original package and attribution, remove or replace brand marks, decimate the
79.9k-triangle scan to approximately 8k–15k triangles, compress textures, and show an
isolated runtime comparison before accepting the derivative.
