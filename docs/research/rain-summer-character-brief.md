# Rain Summer Wanderer Character Brief

## Scope

- Asset slug: `rain-summer-wanderer`
- POI / environment / character: character
- Runtime component: `app/style-lab/StyleLab.tsx`, summer style only until visual approval
- Generator: `scripts/create_rain_summer_character.py`
- Editable source: `assets/models/source/character/rain-summer-wanderer.blend`
- Runtime GLB: `public/models/character/rain-summer-wanderer.glb`
- Start preset: `/style-lab?style=summer&character=rain`
- Single-asset build command: `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_rain_summer_character.py`
- Validation command: `node --test tests/test_rain_character_asset.test.mjs tests/style-demo.test.mjs`

The current procedural summer character is rejected. Its capsule limbs, oversized hands, and code-driven sway cannot meet the requested finished-character quality. This iteration imports and optimizes a professionally authored character; it does not ask the user to design topology, skinning, or anatomy.

## Preflight Gate

- Blender binary and version: `/Applications/Blender.app/Contents/MacOS/Blender`, Blender 5.2.0 LTS, verified 2026-07-23.
- Generator dry run / affected assets: new single-character generator; it may write only the Rain editable Blend, GLB, build record, and `test_rain_` previews.
- GLB audit command: asset test parses GLB JSON and locks bytes, bounds, nodes, materials, skin, animations, and attribution.
- Local preview command and port: existing Next.js development preview; use `/style-lab?style=summer&character=rain`.
- Browser/runtime validation path: desktop 1440×1024 and mobile 390×844 in the actual style lab.
- Existing baseline: procedural summer figure has no skin or animation clips; production `urban-wanderer.glb` is 378,492 bytes, 6,714 triangles, 67 nodes, one skin, and three clips.
- Fallback path: preserve both the procedural summer figure and `urban-wanderer.glb`; do not overwrite either before Rain passes the style-lab comparison.
- Tool limitation: standalone `agent-browser` CLI is absent, but the in-app browser path is available and verified.

## Evidence

### Reference assets

| Local path | Source URL | View direction | Retrieval date | Usage boundary |
| --- | --- | --- | --- | --- |
| `docs/research/assets/character-references/rain-v1-rig-preview.png` | `https://www.blenderstudio.cn/zh-hans/characters/rain/v1/` | Front three-quarter full body plus face-rig close-up | 2026-07-23 | CC-BY source and research comparison |
| `docs/research/assets/character-references/rain-animation-showcase.jpg` | `https://www.blenderstudio.cn/zh-hans/characters/rain/showcase/1/` | Facial performance and upper-body animation authoring | 2026-07-23 | Research evidence only |

### View coverage matrix

| Evidence slot | Local evidence | Questions answered | Coverage status | Downgrade if missing |
| --- | --- | --- | --- | --- |
| Canonical | `rain-v1-rig-preview.png` | Full silhouette, head/body ratio, hand size, outfit | Covered | N/A |
| Side / oblique | Full-body three-quarter panel in `rain-v1-rig-preview.png` | Torso depth, ponytail projection, shoe and limb profile | Partial | Generate a source-accurate side preview before export |
| Entrance / identity detail | Face-rig panel in `rain-v1-rig-preview.png` | Eyes, brows, nose, mouth, fingers, scarf and hairline | Covered | Omit unreadable micro facial controls at runtime distance |
| Runtime relationship | `test_rain_summer_runtime_preview.jpg` and `test_rain_summer_mobile_runtime.jpg` | Screen occupancy, ground contact, shadow, controls and scene palette | Covered at 1920×851 and 390×844 | Re-run after every GLB SHA change |

### Canonical comparison view

- Local path: `docs/research/assets/character-references/rain-v1-rig-preview.png`
- Direction: front three-quarter, camera near chest height, full body visible.
- Why selected: it exposes the hand-to-head ratio, facial appeal, asymmetric hair, scarf, torso/leg proportion, and both shoes.
- Runtime reproduction: lock the summer style camera and place Rain in the same location used by the rejected procedural figure.

### Evidence classification

#### Observed

- Rain is a complete stylized character created by the Blender Animation Studio team.
- The source page states that the rig is free under CC-BY with the required credit `Rain Rig © Blender Foundation | cloud.blender.org`.
- The source archive is 209.9 MB and contains `rain_v01.blend` plus image maps.
- The visible character has a high ponytail, side hair strand, sleeveless light top, turquoise scarf, slim blue jeans, low sneakers, articulated fingers, and hands substantially smaller than the head.

#### Inferred

- The silhouette, hand scale, and facial construction should solve the main quality complaint if the production mesh survives optimization.
- The production control rig will probably require export cleanup and a smaller deform-only skeleton for WebGL.
- Existing Idle/Walk/Run clips may need deterministic retargeting because the source archive is a character rig, not a game-ready animation pack.

#### Resolved after build

- Final GLB: 57,864 triangles, 76 nodes, 13 meshes, 11 materials, no images, one skin, and three actions.
- Blender 5.2 evaluates the optimized deform-only asset without the original production drivers; the deterministic headless export succeeds outside the managed sandbox.
- Solid-color summer materials retain the face, hair, scarf, jeans, shoes, eyes and hand silhouette while keeping the GLB at 2,923,744 bytes.

## Quality Contract

### Identity

- Silhouette: slim stylized adult explorer, long legs, compact shoulders, readable ponytail.
- Signature cue 1: natural five-finger hands whose palm width remains clearly below face width.
- Signature cue 2: asymmetric high ponytail with the side strand visible in the canonical view.
- Signature cue 3: sleeveless ivory top, turquoise scarf, blue jeans, and warm sneakers as a coherent summer palette.
- Signature cue 4: large expressive eyes and brows without changing the authored facial proportions.
- Details intentionally omitted: production-only facial micro-controls, cloth simulation, hair dynamics, and hidden mouth anatomy when they do not affect third-person reading.

### Position and scale

- Coordinate source: current style-lab character anchor.
- Scene position: retain the rejected character's X/Z anchor; lower the root to `y=0.025` so the shoe bounds meet the lane surface.
- Known dimension target: visual adult height about 1.65–1.72 scene units in the Style Lab.
- Scale system: the Style Lab uses the GLB's authored meter scale directly; it does not apply the production overview map's historical `1 scene unit = 2.7 m` conversion.
- Final height: GLB bounds are 1.6405 units tall and runtime scale is `1.03`, for about 1.69 scene units.
- Allowed visual multiplier: `1.00`–`1.05` only after ground contact is fixed.

### Orientation and framing

- Blender front direction: normalize to local `-Y`.
- Runtime rotation: face the same travel direction as the existing player controller.
- Target screen-height occupancy: 31%–35% on both desktop and mobile. This is the closest framing that keeps the full body, route depth, manifesto and touch controls simultaneously readable.
- Maximum canonical direction deviation: 10 degrees.
- Required visible features: both hands, full ponytail silhouette, both shoes, scarf and face.
- Camera target height and clearance: retain existing follow-camera values until A/B framing proves a change is necessary.

### Materials

- Opaque: skin, top, scarf, jeans, shoes and hair.
- Glass / metal / emissive: none.
- Project palette mapping: preserve the authored identity while shifting only material response and texture compression to the warm summer scene; do not redesign anatomy or outfit.

### Collision and access

- Solid obstacle: keep the existing player capsule; do not derive collision from fingers, hair, scarf or rendered mesh.
- Walkable areas and road clearance: unchanged by the candidate asset.
- Camera clearance: use the existing character/camera collision logic.

### Runtime budget

- Maximum triangles: 60,000.
- Maximum nodes: 160.
- Maximum materials: 12.
- Maximum images: 8.
- Maximum GLB bytes: 6,000,000.
- Animation/skin requirements: one deform skin; clips named `Idle_Neutral`, `Walk`, and `Run`; no visible wrist, elbow, shoulder, hip or knee collapse in canonical screenshots.

### Build provenance

- Source archive SHA-256: `e216ce06621bb4ba34b226119ff437b24cf27a0efc80bbdea2c6f8f918a17c2c`.
- Expected output paths: the editable Blend, runtime GLB, three `test_rain_` fixed-camera previews, and one style-lab runtime screenshot.
- Build record path: `docs/research/build-records/rain-summer-wanderer.json`.
- Cache version rule: change the runtime cache version whenever the GLB SHA changes.

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Source audit | Objects, modifiers, materials, bones, actions and driver compatibility | Source opens in Blender 5.2 | N/A | Passed |
| Deform proxy | Exportable body and deform-only skeleton | Canonical/side silhouette and natural hand scale | Final GLB renders in style lab | Passed |
| Animation | Retargeted Idle/Walk/Run | Nine-frame grid checks wrists, limbs and shoes | Cross-fades respond to WASD and Shift | Passed |
| Materials | Compact solid-color material set | Skin, hair, scarf and eyes readable | Summer light and shadows | Passed |
| Optimization | Final GLB and build record | 57,864 triangles and 2.79 MiB | Desktop/mobile load, touch move and console | Passed |

## Validation

- [x] Public reference images saved locally with source and SHA.
- [x] Canonical comparison direction and view coverage recorded.
- [x] Observed, inferred and unknown facts separated.
- [x] At least three authored identity cues and runtime budgets defined.
- [x] Blender, source archive, local preview and browser paths preflighted.
- [x] Source Blend audit completed.
- [x] Editable optimized Blend saved.
- [x] Canonical, side, animation-grid and runtime `test_rain_` screenshots saved.
- [x] Source / Blender / Three.js three-way comparison saved as `test_rain_summer_three-way-comparison.png`, ordered left to right.
- [x] GLB nodes, bounds, triangles, materials, images, skin and animations audited.
- [x] Final shoe weights locked to `Foot.L` and `Foot.R`; all vertex groups resolve to real bones.
- [x] Actual style-lab desktop and mobile pages pass; mobile direction control moves the character and follow camera.
- [x] Deterministic `qaMotion=walk|run` paths captured 12 real browser frames per action; the motion grid and MP4 show movement, cross-fades and follow-camera continuity without shoe stretching.
- [x] Formal map now loads the same SHA-versioned Rain GLB at visual scale `1.3`; 1440×900 desktop and 390×844 mobile views pass with zero console errors.
- [x] Existing collision radius, continuous mobile joystick, WASD, Shift run, Space jump and follow camera remain unchanged.
- [x] Exact CC-BY credit is visible in the desktop footer and in the desktop/mobile help panel.

## Decision Log

### Iteration 1

- Changes: rejected further procedural-character refinement; selected Rain as the professionally authored candidate.
- Evidence used: Blender Studio source page, local source preview, animation showcase, and downloaded source archive.
- Remaining inference: production-rig export cost and animation-retarget quality.
- Rollback point: current style-lab summer character and production `urban-wanderer.glb` remain untouched.

### Iteration 2

- Finding: the first nine-frame motion grid exposed severe shoe stretching in Walk and Run even though the idle runtime screenshot looked correct.
- Change: treat each authored shoe as a rigid game asset and bind it only to its corresponding `Foot.L` or `Foot.R` bone.
- Evidence: `test_rain_summer_animation_grid.png` now covers three frames each for Idle, Walk and Run without the long shoe/lower-leg artifact.
- Guardrail: `test_rain_summer_weight_audit.json` and the Node asset test lock the two allowed shoe groups.

### Iteration 3

- Changes: remove a dangling side-less `UpperLeg` group, validate every generated vertex group against the final armature, lower the root to the road surface, move the follow camera closer, and add Shift-to-run.
- Runtime evidence: an explicitly locked 1920×851 desktop viewport and a 390×844 mobile viewport use GLB SHA `151816b1fe827275133cc2ce3db348619c2c39d672094e3ad41094b3294e86c0`; two mobile forward-control presses moved the world and follow camera.
- Console result: zero runtime errors. Remaining messages are existing Three.js `Clock` and `PCFSoftShadowMap` deprecation warnings.
- Rollback boundary: only the summer style-lab character changed; the production map character and the other two style directions remain untouched.

### Iteration 4

- Independent review finding: a press-created `0.55` nudge survived sustained movement and fired after key/pointer release.
- Fix: clear the deferred nudge as soon as a live held input is consumed; a sub-frame tap still retains its one-step fallback.
- Attribution fix: the visible page now uses the exact required credit `Rain Rig © Blender Foundation | cloud.blender.org`, followed by the license and adaptation note.
- Audit fixes: record `cacheVersion`, replace the incorrect production-map scale conversion with the Style Lab's actual 1.69-unit character height, and add repeatable runtime Walk/Run QA routes.
- Dynamic evidence: `test_rain_summer_runtime_motion_grid.jpg` contains three Walk frames on the top row and three Run frames on the bottom row; `test_rain_summer_runtime_motion.mp4` plays Walk on the left and Run on the right.

### Iteration 5

- Decision: replace the formal production-map character with the already validated Rain asset; keep `urban-wanderer.glb` as a rollback asset rather than overwriting it.
- Scale calibration: the old character is about `1.857` units high and used scale `1.15`; Rain is about `1.649` units high, so formal runtime uses `1.3` to preserve the existing screen-height contract.
- Integration boundary: only the visual GLB and its scale changed. Collision, movement speed, input state, camera, jump and fallback behavior are unchanged.
- Formal runtime evidence: `test_rain_production_local_desktop.jpg` at 1440×900 and `test_rain_production_local_mobile.jpg` at 390×844 show the same GLB in the real `?start=xingfuli-canonical` route with zero console errors.
- Attribution: the exact credit remains in the Style Lab and is also available from the formal map footer/help panel, including mobile.
- Rollback point: switch `CHARACTER_MODEL_PATH` and `CHARACTER_VISUAL_SCALE` back to the retained `urban-wanderer.glb` contract.
