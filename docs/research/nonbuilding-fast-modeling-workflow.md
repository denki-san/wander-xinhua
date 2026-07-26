# Nonbuilding Fast Modeling Workflow

## Purpose

This fast lane is for repeated, low-detail nonbuilding prototypes such as bicycles,
chairs, bins and small planting accessories. It does not replace the full workflow for
named buildings, Hero trees, sculptures, readable signs or interactive Facilities.

## Required output

One category batch contains:

1. a frozen asset list;
2. 3–4 repository-local evidence images and one compact family Brief;
3. either one license-cleared source asset with preserved attribution, or one
   deterministic generator with `--asset` support;
4. one editable `.blend` and one `visible-low` GLB per asset;
5. canonical, side and detail fixed-camera previews;
6. one shared isolated Three.js QA route;
7. one audit/test command and one category commit.

## Two-state runtime contract

- `visible-low`: the same GLB is used at near and medium distance;
- `hidden`: the asset is not mounted and its first GLB request is not sent;
- no nonbuilding Hero / Identity / Massing derivation;
- no production placement until a later placement-only category task.

## Combined gates

### Gate A — evidence and budget

Freeze the slugs, copy selected evidence into the repository, record observed /
inferred / unknown facts, choose a canonical view and set budgets.

### Gate B — batch build

Prefer a visually suitable, license-cleared source model when one exists. Preserve
the original package, license and attribution; remove protected branding; then
decimate, consolidate materials and compress textures. Use procedural generation
only when no acceptable source exists or the required identity cannot be derived
legally and efficiently. A single-asset rebuild must not touch other assets.

### Gate C — runtime proof

Use one shared QA page to verify:

- near and medium use the same GLB path;
- far state is hidden;
- scale, front, ground contact and material visibility;
- zero new console errors;
- current binary size and GLB audit.

## Work intentionally skipped

For this asset class, do not create:

- a separate graybox file;
- Hero, Identity and Massing GLBs;
- a separate page per asset;
- repeated MCP review checkpoints;
- procedural reconstruction when a suitable source model is already available;
- map placement, collision routes or whole-world performance baselines;
- production registry or manifest changes.

Escalate out of the fast lane only when evidence, interaction, collision, readable
text, animation or visual importance requires it.
