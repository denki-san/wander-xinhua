# Progressive World Loading Acceptance

## Scope

- Worktree: `.worktrees/progressive-world-loading`
- Branch: `codex/progressive-world-loading`
- Base commit: `eb85b794da7803a6fd82552eed25019b1dbbff91`
- Research basis:
  `docs/knowledge-sources/shanghai-cinema-progressive-lod-experiment-2026-07-24.md`
- Goal: make the production world playable before loading visual precision, reach
  an operable state within 3 seconds at 5 Mbps, and keep weak-network sessions at
  Identity without requesting Full assets.

## Architecture decision

The production route now uses three independent gates:

1. The HTML/React shell appears first and lazy-loads the Three.js experience.
2. Every formal building group starts as Massing, becomes Identity after entering
   the world, and reaches Full only when a standard-network player is near it.
3. GLTF runtime, detailed character, Full building assets, plane-tree assets and
   post-processing live in deferred chunks outside the first playable path.

The network policy classifies `saveData`, `slow-2g`, `2g`, `3g`, or downlink below
2.5 Mbps as weak. Weak sessions can never resolve a building above Identity.
`?network=weak` and `?network=standard` provide deterministic QA overrides.
`?network-api=missing` simulates browsers without Network Information API while
still using measured startup-resource throughput for classification. Cached
startup scripts have `transferSize === 0`, so they are excluded instead of
upgrading an unknown network from local-cache read speed.

### Building coverage

| Group | Massing | Identity | Full |
| --- | --- | --- | --- |
| 14 Xinhua Road landmarks | local footprint proxies | 14 landmark-specific architectural miniatures across 13 silhouette families | distance-gated landmark GLBs |
| Xingfuli | simple block volumes | programmatic facades and site details | three final building GLBs and detailed trees |
| Shangsheng Xinsuo | footprint volumes | programmatic historic-building forms | Sun Ke Villa and Navy Club GLBs |
| Huashan Greenland | park footprint and service-building volume | paths, forest, pond, court and recognizable service building | understory and complete park facilities |

Full uses enter/exit hysteresis rather than a single distance threshold so a
player near the boundary does not repeatedly mount and unmount models.

### Overview thumbnail contract

- Intro may use the cheapest Massing boxes while the world starts.
- Overview always renders Identity or Full. While Full is pending, fails, or is
  prohibited by the weak-network policy, the Identity miniature remains visible.
- Xinhua Road Identity maps every landmark to a recognizable architectural
  family such as cinema, gabled arts halls, villa row, garden house, modern
  villa, pocket park, heritage gate or creative campus. It never falls back to
  one shared plain box in overview.
- These miniatures derive from the accepted landmark identity and footprint
  bounds. This change does not alter Blender generators, GLB binaries or the
  photographic evidence boundary.

## Bundle evidence

The baseline static build was one `1,560.64 kB` JavaScript bundle,
`473.36 kB` gzip.

The production build now emits:

| Path | Minified | Gzip | Loading phase |
| --- | ---: | ---: | --- |
| entry | 194.80 kB | 61.92 kB | initial |
| experience | 138.30 kB | 39.38 kB | initial |
| road Massing / Identity data | 104.19 kB | 30.31 kB | initial |
| React Three Fiber / Three core | 882.68 kB | 234.64 kB | initial |
| input + geometry helpers | 2.96 kB | 1.35 kB | initial |
| GLTF runtime | 70.42 kB | 20.69 kB | deferred |
| post-processing | 174.19 kB | 88.83 kB | deferred |

The complete initial JavaScript path is about `367.60 kB` gzip, a `22.3%`
reduction from the baseline. The entry chunk itself fell from `1,560.64 kB` to
`194.80 kB`.

`tests/test_progressive_world_loading.test.mjs` rebuilds and asserts the complete
initial JavaScript chunk set, a maximum transfer budget at 5 Mbps, the presence
of the deferred chunks, the weak-network cap and the building-stage contracts.

## Browser acceptance

### Conditions

- Production `dist-static` served by Vite preview
- Chromium with cache disabled
- Viewport: 1280 × 720
- Downlink: 5 Mbps
- Uplink: 2 Mbps
- RTT latency: 80 ms
- Playable signal: `performance.mark("xinhua-world-playable")`, emitted on the
  animation frame after the first R3F world frame has been submitted
- Control signal: `performance.mark("xinhua-first-control-response")`, emitted
  when overview or close-view movement code first observes real input

### Standard-network cold starts

| Run | Playable mark |
| --- | ---: |
| 1 | 1,579.8 ms |
| 2 | 1,576.0 ms |
| 3 | 1,583.6 ms |

- Median: `1,579.8 ms`
- Worst: `1,583.6 ms`
- Acceptance limit: `3,000 ms`
- Result: pass with `1,416.4 ms` worst-case headroom.

Each cold run used a fresh browser tab so an earlier Full download could not
occupy the emulated connection. After the playable mark, automation immediately
clicked the production `出发` button and sent real `W` input:

| Run | First control response |
| --- | ---: |
| 1 | 2,405.6 ms |
| 2 | 2,192.9 ms |
| 3 | 2,103.2 ms |

The worst end-to-end first input response remained `594.4 ms` inside the
3-second limit.

The cover image and sky texture were allowed to compete under the same throttle;
the result is therefore not a JavaScript-transfer-only estimate.

### Progressive behavior

- At the playable mark, the first Massing frame had been submitted, the
  experience reported the `standard` profile, and no GLB request had started.
- Entering Xingfuli kept the controls responsive while the Full landmark,
  detailed character, Xingfuli architecture, plane-tree and GLTF chunks loaded
  in the background.
- The final close view retained the existing outlined storybook presentation,
  detailed Rain character and normal low camera.
- Repeated real `W` key input changed the rendered view and advanced the
  character without a reload or UI stall.

### Weak-network behavior

After entering close views and allowing the deferred window to elapse:

| QA entry | GLB requests | Forbidden Full chunks |
| --- | ---: | ---: |
| Xingfuli | 0 | 0 |
| Shanghai Cinema | 0 | 0 |
| Shangsheng Xinsuo | 0 | 0 |

The weak view retained recognizable programmatic building facades, roads, UI,
camera controls and the procedural character. It did not load post-processing,
the GLTF runtime, Full building modules, detailed character or plane-tree module.

An additional automatic-policy run removed the Network Information API through
the production QA switch, applied 1 Mbps / 160 ms without a `network=weak`
override, and reached the conservative `weak` profile from measured startup
throughput. After entering Shanghai Cinema, GLB requests and forbidden Full
chunks both remained zero. The policy unit test also covers a warm-cache startup:
cached scripts provide no upgrade evidence, so uncached GLBs remain blocked.

The weak-network overview was also inspected at 1280 × 720 with the location card
cleared from the viewport. All 14 Xinhua Road labels remained backed by
architectural miniatures with distinct roofs, wings, courtyards, trees or gates;
the former shared plain-box representation was absent.

### Console

- Runtime errors: 0
- Remaining warning: Three.js upstream deprecation notice for `THREE.Clock`

## Verification

- `npm test`: 126 / 126 pass
- `npm run lint`: pass
- Static build: pass
- Sites build: pass

## Evidence boundary

Confirmed facts are the production bundle output, automated test results,
performance marks, resource entries, console output and observed browser
interaction listed above. The 5 Mbps result is a local Chromium production-preview
measurement, not a field-user percentile. Full asset completion time is explicitly
non-blocking and is not represented as part of the playable mark.
