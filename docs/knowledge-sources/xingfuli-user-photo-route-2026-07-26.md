---
type: evidence-source
title: Xingfuli user-captured photo route
status: original-photo-files-pending
route_id: XINGFULI-USER-ROUTE-20260726
tags: [wander-xinhua, xingfuli, photo-reference, placement, user-captured]
---
# Xingfuli user-captured photo route

## Scope

This source applies only to the three exact-18 building entries
`xingfuli-west`, `xingfuli-center`, and `xingfuli-east`. It does not authorize
work on trees, street furniture, decorations, ordinary OSM massing, other
buildings, or full-map assets.

## First-party statement

On 2026-07-26, the photographer stated that nine images were personally taken
at Xingfuli and that their original order forms a continuous route:

1. image 1 begins at the Xingfu Road entrance;
2. images 2 through 8 continue through Xingfuli in capture order;
3. image 9 reaches the road on the opposite side;
4. the photographer believes that opposite road may be Panyu Road, but did
   not state this as certain.

The route order is first-party provenance. The visible content of the nine
images has not yet been inspected in the current workspace because the
original files and hashes are not materialized here.

## Observed repository boundary

The existing `docs/research/xingfuli-reference-manifest.json` also contains
nine local images, but those files are public web references published between
2018 and 2021. They are a separate evidence set and must not be relabeled,
overwritten, or treated as the photographer's personal sequence.

## Inferences

- The ordered route may constrain the west-center-east facade sequence more
  strongly than unrelated single-view references.
- If image 9 and map geometry independently confirm Panyu Road, the route can
  test the current east-end binding and the direction of the runtime long axis.
- Sequence order alone does not identify each building segment and does not
  clear the current road or strict-lineage blockers.

## Unknowns

- Original filenames, SHA-256 values, EXIF data, and capture date.
- Exact camera position and facing direction for each image.
- The west, center, east, or unknown assignment of each image.
- Whether the opposite road in image 9 is Panyu Road.

## Required next evidence step

Preserve all nine original images read-only, record hashes and metadata, then
map each image to `west`, `center`, `east`, or `unknown` through visual
comparison. Verify the road at the sequence endpoint with both map geometry and
visible scene evidence. The images remain research-only and must not be
embedded in GLB or runtime files.

Structured project record:
`docs/research/xingfuli-user-photo-sequence-2026-07-26.json`.
