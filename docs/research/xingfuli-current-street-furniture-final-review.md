# Xingfuli Current Street Furniture Final Review

## Review boundary

- Review date: 2026-07-25
- Package: `xingfuli-current-street-furniture`
- Surfaces: local evidence, deterministic Blender generator, editable master, GLB audit,
  Blender MCP temporary review Scene, isolated Three.js route and browser resource inventory.
- Production placement and collision: not reviewed because this category commit intentionally
  creates 0 formal map instances.

## Scope result

Passed. The batch contains exactly four site-bound models:

1. `xingfuli-pointed-entry-bollard`
2. `xingfuli-water-edge-stone-seat-round`
3. `xingfuli-water-edge-stone-seat-long`
4. `xingfuli-water-edge-slim-planter`

The 2018 `irregular-stone-bollard`, generic `rectangular-planter`, 18 building assets,
public registry, production manifest and building runtime entry remain outside this scope.

## Evidence review

- Venue and address are confirmed by article text: 幸福里、番禺路 381 号。
- The pointed bollard is directly visible in repeated entrance instances with people for scale.
- Round and long water-edge seats are visible in close and longitudinal views.
- Slim planters repeat across several water-lane views; exact plant species remains unknown.
- Sculpture, tenant signs, logos and temporary menu boards were excluded.
- Six selected repository images are linked to the raw read-only U-disk archive.

Result: no evidence blocker for the four simplified visible-low assets.

## Blender and GLB review

- Four deterministic `.blend` masters generated.
- Blender library inspection: asset meshes `1 / 1 / 1 / 4`; cameras `0`; lights `0`.
- Temporary MCP review used a 1.75 m scale ruler and was deleted without saving.
- Four GLBs: 60,688 bytes total, 1,086 triangles total, 0 images, 0 textures,
  0 animations, 0 skins.
- Root transforms are clean and runtime ground minimum Y is 0.
- External `audit_glb.py --forbid-images --max-nodes 4` returned `ok` for all four.

Result: passed.

## Visual review

- Pointed bollard preserves the square shaft, pointed cap and wider low plinth.
- Round seat preserves a near-spherical body and flattened ground contact.
- Long seat preserves a low capsule silhouette with gently unequal ends.
- Planter preserves a slim trough, visible soil and three unequal plant clusters.
- All four passed canonical, side, detail and Three.js ground-contact inspection.
- First WebGL pass exposed self-shadow acne on the bollard; the QA lighting was fixed by
  keeping `castShadow` and disabling model `receiveShadow`. No GLB geometry was altered.

Result: passed for low-detail nonbuilding use. The planter vegetation is intentionally an
original seasonal abstraction, not a botanical reconstruction.

## Two-state runtime review

- 4 m: `visible-low`, one GLB.
- 10 m: `visible-low`, the same GLB path.
- 22 m fresh tab: `hidden`, zero GLB resources, no Massing fallback.
- Threshold: 18 m.
- Four assets rendered individually with `data-qa-render-ready=true`.
- Browser console errors: 0.
- Dependency warnings remain for current Three/R3F deprecations; they are recorded and not
  attributed to these GLBs.

Result: passed in the isolated QA route.

## Performance boundary

- This batch creates 0 production instances, so production first-screen transfer delta is 0.
- Static QA uses `frameloop=demand`; no FPS improvement claim is made.
- One 30,044-byte planter GLB transferred 30,344 bytes in 8.9 ms on localhost in Vinext dev
  mode. This is a traceability sample, not a production network forecast.
- Formal map placement must later add forbidden-zone, collision and route tests in a separate
  category commit.

## Repository validation

- Targeted asset contract: 4/4 tests passed.
- `npm run lint`: passed.
- Static build: passed.
- Sites build: passed.
- Full `npm test`: 218/219 passed. The sole failure is the pre-existing tuple typing error at
  `app/scene/xinhua-world.tsx:1827-1828`; this batch does not modify that shared runtime file.
- The out-of-scope failure is recorded as `ERR-20260725-064`; this review does not claim a
  fully green repository test suite.

## Final decision

No blocker remains for committing the four evidence-backed models and their isolated QA
harness as one `street-furniture/xingfuli-current` category commit. Do not merge this whole
branch back to main; cherry-pick the category commit only when its placement recipe is ready.
