# Xinhua Custom Lighting Presets Plan

## Status

- Plan date: 2026-07-25
- Scope: research and implementation design only; this document does not
  authorize a production deployment.
- Baseline: the current default `lighting-v3` atmosphere.
- Product goal: visitors explicitly choose between a readable **正午** and a
  warm, low-angle **金色午后** scene while walking the same Xinhua district.

## Product decision

The first version exposes two discrete, named light states:

| Runtime id | Public label | Intended reading |
| --- | --- | --- |
| `noon` | 正午 | 清透蓝天、较短阴影、建筑和道路细节容易辨认 |
| `golden-hour` | 金色午后 | 暖色低角度太阳、长树影、较强漫游叙事感 |

`金色午后` may be changed to `夕阳` only as product copy after visual review. It
must not imply a geographically exact sunset simulation.

The existing `当前光照` label is removed. The legacy `autumn-afternoon` preset
is not exposed as a third visitor option; it is retained only until the new
two-state comparison is accepted.

## Non-goals

- No continuous time-of-day slider, real-world clock coupling or weather
  simulation.
- No GLB, collision, terrain, POI placement or character animation changes.
- No HDRI/PMREM/IBL addition in this cycle.
- No additional sky-image download. Both states reuse the existing LDR sky
  texture as visual background.

## Current fit and required code surfaces

| Surface | Current responsibility | Required change |
| --- | --- | --- |
| `app/scene/atmosphere-contract.ts` | central atmosphere values | replace ambiguous presets with two explicit state contracts |
| `app/scene/xinhua-world.tsx` | light rig and view-following shadows | read all light/shadow values from the state contract; preserve one shadow-casting sun |
| `app/scene/visual-effects.tsx` | textured sky and visible sun | replace binary `uLightingV3` with semantic sky parameters |
| `app/scene/postprocessing-effects.tsx` | paper wash and outline branches | read named effect tuning rather than assume only V3/non-V3 |
| `app/scene/visual-effect-composer.tsx` | SSAO/tone-mapping assembly | keep ACES; make quality decisions explicit per preset and device tier |
| `app/xinhua-experience.tsx` | selection state and help UI | use two labels, add shareable URL state and expose a discoverable switcher |
| `tests/test_autumn_lighting_v3.test.mjs` | legacy source-contract checks | replace with two-preset behavioural and source-contract checks |

## State contract

Each state must define the following values in one typed contract. Components
must not use `style === "lighting-v3"` or a comparable binary shortcut.

```text
id, label
background, fog, skyTexture
sun: offset, color, intensity, shadow
fill: ambient color/intensity, hemisphere sky/ground/intensity,
      directional fill color/offset/intensity
sky: sun color, disk strength, halo strength, cloud warmth, horizon warmth
effects: outline strength, paper-wash strength, SSAO enabled per quality tier
```

### Noon starting direction

- Use a 40--50 degree primary-sun elevation for the initial vertical slice.
- Use near-neutral warm white direct light rather than orange direct light.
- Increase blue-white hemisphere fill enough to preserve shaded façade detail,
  but do not use ambient light to erase the directionality of the sun.
- Keep a shorter, crisper shadow reading. Tune the azimuth from the actual
  `?start=` runtime view; do not treat an astronomical direction formula as
  sufficient proof for the current project axes.
- Use a brighter blue-grey fog and reduce sun halo/cloud warm-edge treatment.

### Golden-hour starting direction

- Begin with the accepted `lighting-v3` values and migrate them under
  `golden-hour`.
- Preserve its low-angle warm key, cool opposing fill, long readable shadow and
  warm cloud treatment.
- Do not add an orange fullscreen grade. Building, road and vegetation
  materials must continue to show directional light and cool shadow detail.

## Rendering and performance rules

1. Keep one shadow-casting DirectionalLight. Hemisphere and ambient lights are
   fill only; the cool directional fill does not cast shadows.
2. Keep the existing focus-following shadow target. A preset change must not
   expand the shadow orthographic frustum to the whole district.
3. Retain 2048 desktop / 1024 low-tier shadow-map caps unless runtime evidence
   proves a different setting is needed.
4. Keep ACES tone mapping and the current sRGB input/output contract. Do not
   use a new exposure value to compensate for uncalibrated material colours.
5. Keep the LDR sky background separate from scene environment lighting. No
   `scene.environment` is introduced in this scope.
6. A state switch may rebuild small post-processing objects, but must not
   re-request GLBs, POI photos or the sky texture.

## Interaction contract

- Put a compact `光线` control in the playing HUD or its existing settings
  affordance; do not make the core visual choice discoverable only through the
  help dialog.
- Buttons use `role="group"`, `aria-label="切换光线"` and `aria-pressed`.
- The selected state is reflected in `?light=noon` or `?light=golden-hour`.
  An absent or invalid value falls back to `golden-hour`.
- A state change is immediate and does not reset player position, camera,
  current POI, loading progress or touch-control state.
- The visible label and URL are the source of truth. Local persistence is
  optional and must never override an explicit URL state.

## Implementation order

1. Add the typed two-state contract and a URL parser with unit/source tests.
2. Migrate the light rig to contract-driven shadow configuration; retain the
   camera-following target and one shadow sun.
3. Replace the sky shader's binary style uniform with the semantic sky block.
   Verify visible-sun / direct-light / ground-shadow alignment before tuning
   secondary colour values.
4. Migrate PaperWash, InkOutline and composer decisions to the same contract.
5. Add the two-option HUD switcher and accessible selected-state feedback.
6. Capture matched baseline/noon/golden-hour views; revise parameter values
   only after visual review.
7. Run automated checks, real browser QA, matched mobile performance sampling,
   then decide whether `金色午后` should be renamed `夕阳`.

## Acceptance matrix

| Check | 正午 | 金色午后 |
| --- | --- | --- |
| `?start=garden179` desktop | 短影、墙面不过曝、阴面有蓝灰细节 | 长影、暖受光面、冷阴面可读 |
| `?start=film-art` desktop | 白墙、砖材、玻璃边缘可区分 | 建筑轮廓和斑驳树影不被橙色滤镜洗平 |
| `?start=house315` desktop | 可见太阳与阴影方向一致 | 可见太阳与阴影方向一致 |
| `?start=garden179` 390 × 844 | 无黑块、无明显帧率退化 | 无黑块、人物接地影仍可读 |
| State switch | 不重置位置/相机/加载状态；无网络新请求 | 同左 |
| Console and build | 应用 error 为 0；`npm test`、`npm run lint`、生产构建通过 | 同左 |

Matched performance samples must record viewport, device tier, build mode,
warm-up duration, sample duration, page visibility, frame timing and resource
timing. No performance improvement claim is valid without the same-condition
baseline.

## Rollback

The rollback is a one-line default-state reversion to the preserved
`golden-hour` contract. No asset migration, cache invalidation or data deletion
is involved. If either state fails visual consistency or mobile stability, hide
the new switcher and retain the current accepted default while keeping the
research evidence intact.

## Evidence and decision boundaries

- Detailed research: `docs/knowledge-sources/xinhua-custom-lighting-presets-research-2026-07-25.md`
- Existing atmosphere evidence: `docs/research/xinhua-autumn-storybook-atmosphere.md`
- Existing lighting baseline: `docs/research/xinhua-autumn-lighting-v3-brief.md`
- The plan's source observations are current repository code and official
  Three.js documentation. Public naming and final noon azimuth are product
  decisions requiring runtime visual acceptance.
