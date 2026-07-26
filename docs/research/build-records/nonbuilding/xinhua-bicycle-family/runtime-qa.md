# Xinhua Shared Bicycle Runtime QA

- Date: 2026-07-26
- Route:
  `/nonbuilding-evidence-qa?asset=xinhua-shared-bicycle&distance=4`
- Runtime asset:
  `/models/nonbuilding/xinhua-bicycle-family/xinhua-shared-bicycle-visible-low.glb?v=31983bf59dd1`
- Viewport: desktop in-app browser
- Build mode: local development

## Results

| Check | Result |
| --- | --- |
| 4 m state | `visible-low` |
| 10 m state | same `visible-low` GLB |
| 22 m state | `hidden`; no Massing substitute |
| Scale | bicycle length matches the 1.75 m ruler contract |
| Ground contact | passed |
| Console errors | none |
| Production instances | 0 |
| Registry / manifest changes | 0 |

The browser emitted existing Three.js deprecation warnings for Clock and shadow-map
configuration. No bicycle-specific error was observed.
