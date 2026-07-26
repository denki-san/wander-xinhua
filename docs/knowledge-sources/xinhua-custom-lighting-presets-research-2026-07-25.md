# Xinhua Custom Lighting Presets Research

Research date: 2026-07-25

## Question

How should Wander Xinhua let visitors switch between a clear noon scene and the
current low-angle golden-light scene without weakening the existing autumn
storybook direction, breaking light-shadow consistency, or increasing mobile
resource cost?

## Observed

- `app/scene/atmosphere-contract.ts` already centralizes two atmosphere
  presets. Both use a low-angle sun: `lighting-v3` is approximately 20 degrees
  above the horizon and `autumn-afternoon` is approximately 22 degrees.
- `AutumnLightRig` already keeps a DirectionalLight target near the active
  camera focus, so its shadow map follows the playable view instead of covering
  the entire district at maximum quality.
- `AutumnStorybookSky` derives its visible sun direction from the same
  `sunOffset` as the DirectionalLight. The sky shader also has a binary
  `uLightingV3` style switch.
- The current user-facing switch is inside the help dialog and labels the two
  choices `秋日下午` and `当前光照`; it does not clearly communicate a noon
  versus golden-hour choice.
- The existing Kenney day texture is deliberately an LDR visual background,
  not scene IBL. Lighting comes from controlled ambient, hemisphere,
  directional and fill lights.

## External technical evidence

- A Three.js DirectionalLight models distant parallel daylight. Its direction
  is determined by the light position and target, and it can cast shadows.
  Source: <https://threejs.org/docs/pages/DirectionalLight.html>
- A HemisphereLight provides a sky-to-ground gradient but cannot cast shadows.
  It is therefore fill light, not a replacement for the sun shadow.
  Source: <https://threejs.org/docs/pages/HemisphereLight.html>
- Directional shadows use a finite orthographic shadow-camera area. Enlarging
  that area while holding the map resolution constant makes shadows blockier;
  a small view-following coverage area is preferable.
  Source: <https://threejs.org/manual/en/shadows.html>
- Lighting calculations belong in a linear working color space; sRGB textures
  need correct input annotation and post-processing requires an intentional
  output transform. Brightness should not be repaired with arbitrary exposure
  changes.
  Source: <https://threejs.org/manual/en/color-management.html>

## Inferred

- The product needs named lighting states, not a free time-of-day slider. A
  slider would require every intermediate sky, fog, cloud, shadow and colour
  state to be art-directed and tested, while offering little first-release
  value.
- The current default should become the `golden-hour` product state. It is an
  artistic late-afternoon state; calling it a physically exact sunset would
  overstate what has been validated.
- The new `noon` state should keep the autumn season but use a higher,
  near-neutral sun and bluer, brighter skylight. Its initial solar elevation
  target is 40--50 degrees; its final azimuth must be selected in runtime
  screenshots, not inferred from a generic geographic formula alone.
- The existing LDR background must remain decoupled from IBL. An HDR/PMREM
  experiment would add memory and visual-policy work without being required for
  the two-state experience.

## Unknown

- Which of two noon azimuth candidates best reads as "Shanghai Xinhua Road at
  noon" from the canonical third-person view.
- The final mobile thermal and frame-time impact on target devices. It is
  expected to be neutral because the preset reuses textures and geometry, but
  it still needs matched runtime measurement.
- Whether visitors prefer `金色午后` or `夕阳` as the public label. The first is
  technically more accurate; the latter may be clearer in casual product copy.

## Decision

Ship exactly two visible states in the first release:

1. `noon` / `正午`
2. `golden-hour` / `金色午后`

Retire the ambiguous `当前光照` label. Preserve the existing
`autumn-afternoon` configuration only as a migration/reference decision until
the new comparison has passed acceptance; do not expose three similar choices
to visitors.

Every state must provide one coherent contract for:

- main sun position, colour, intensity and shadow settings;
- ambient, hemisphere and cool fill lighting;
- background and fog colour;
- visible sun disk, halo, cloud warmth and horizon treatment;
- outline, paper wash and SSAO policy;
- desktop and mobile quality tiers.

The visible sun, primary DirectionalLight and ground shadows must use the same
direction. The LDR sky texture remains visual background only.

## Evidence boundaries

The project code and the linked Three.js documentation are direct evidence for
the current mechanism and renderer constraints. The two-state product naming,
initial noon elevation range and visual palette are implementation decisions to
be verified by the runtime acceptance plan.
