# Hudec Memorial V2 Model Brief

## Scope contract

- Stable asset ID: `hudec-memorial`
- Subject: 邬达克纪念馆（邬达克旧居），上海市长宁区番禺路129号
- Global catalog authority: 调度主窗口冻结的 18 栋建筑；本 Worktree 只处理其中 1 栋
- In-scope model assets: 1 个建筑母版，派生 Hero / Identity / Massing 三档
- Runtime instances: 1 个，沿用 `app/scene/xinhua-road-landmarks-data.json` 的既有落点
- Retained baseline: legacy Hero `public/models/requested-pois/hudec-memorial.glb`
- Held backlog: legacy 庭院树、绿篱及其他装饰物；保持现状，不新增、不升级、不删除
- Explicitly out of scope: 树木、装饰物、角色、全地图体块、其他建筑、部署
- Scope expansion authorized: no

## Preflight gate

| Item | Result | Evidence / fallback |
| --- | --- | --- |
| Blender | Passed | `/Applications/Blender.app/Contents/MacOS/Blender`, 5.2.0 LTS |
| Deterministic generator | Passed | legacy `scripts/create_requested_poi_models.py --asset=hudec-memorial` 已支持单资产；V2 使用独立生成器，禁止写入其他资产 |
| GLB audit | Passed after shared-tool sync | `scripts/audit_glb.py`; legacy Hero 1 node, 1 mesh, 14 materials, 0 images |
| Static preview | Passed | `npm run build:static` + `npm run preview:static -- --host 127.0.0.1 --port <port>` |
| Browser acceptance | Passed | `agent-browser`/Chrome，实际入口 `/?start=hudec` |
| Blender MCP | Pending gate execution | MCP 只作视觉审查；任何接受的修改必须回写 V2 生成器再 Headless 重建 |
| LLM Wiki | Pending completion gate | 本地证据和 Brief 完成后可继续灰模；完成前须同步、rescan 队列归零并检索回读 |

Legacy baseline:

- Hero GLB SHA-256: `42159678fb720c963a82921ed827aceb7825b164da321d67345891732f622984`
- Editable Blend SHA-256: `eba701d3290ea3f3a197bd36e4248c7ee665b34af71c012170e494bb3d2455ba`
- GLB bytes: `1,154,820`
- Runtime transform: position `[91.34, -131.74]`, yaw `π/2`, scale `0.72`
- Visual audit: legacy Hero has a recognizable generic Tudor villa but understates facade width, west/rear roof hierarchy, three-part chimney, end-wall timbering and glass low wing. It also depends on runtime scale `0.72` instead of authored-unit scale.

## Evidence gate

Reference manifest: `docs/research/hudec-memorial-v2-reference-manifest.json`

| Coverage slot | Local evidence | Status | Use |
| --- | --- | --- | --- |
| Canonical | `hudec-memorial-front-wikimedia.jpg` | Covered | Main facade, entrance porch, timber rhythm, brick gate |
| Side / depth | `hudec-memorial-street-official-2026.jpg`, west-elevation sketches | Covered | Roof hierarchy, three-part chimney, low glass wing, end facade |
| Entrance / identity | canonical photo | Covered | Gabled porch, wood door, narrow mullioned windows |
| Rear / east | none | Unknown | Only coherent low-detail completion; no invented ornament |
| Site relationship | canonical and official oblique | Covered with Hold | Ground, wall and entrance clearance only; vegetation retained unchanged |

Canonical comparison:

- Photo: `HUDEC-V2-REF-C`
- Observation direction: west/rear oblique toward the chimney tower, layered roofs, half-timber end gable and low glass wing
- Blender front: local `-Y`
- Target Blender camera: `(-15.5, 23.0, 12.0)` looking at `(-0.1, 1.0, 4.45)`, 56 mm equivalent
- Target screen width: building architecture 66%–78%; no roof or chimney crop
- Human scale: 1.75 m person = `0.648` scene unit; entrance clear height target `0.95`–`1.10` scene unit
- Headless scale proxy: 1.8 m person = `0.667` scene unit; preview-only and excluded from GLB

## Observed / inferred / unknown

### Observed

- OSM way `494633921` records address, three levels, heritage status and a compound-scale footprint.
- The canonical facade is much wider than it is tall below the roof; dark timber framing forms large rectangular and diagonal bays.
- A steep main roof with deep eaves sits above the facade; the roof contains a rectangular dormer.
- The entrance has a steep triangular porch, dark timber frame, wood door and short steps.
- The west/rear oblique shows multiple connected roof levels, a low glazed wing and a tall three-part red-brick chimney.
- The end facade has full-height timber framing and dense narrow window grids.
- A three-bird weathervane is visible at the roof ridge.

### Inferred

- Net building dimensions are calibrated from the OSM compound envelope, legacy world footprint and human-scale doors; they are not survey measurements.
- East/rear openings are arranged coherently from the observed facade rhythm but receive lower detail.
- The three-bird weathervane is simplified as original silhouette geometry without copying a logo or sculptural artwork.
- Collision remains an independent split structure; roof, awnings and non-ground ornament do not enlarge player collision.

### Unknown

- Exact east facade, complete rear elevation, hidden wall openings and interior plan.
- Exact roof pitch, floor-to-floor heights, chimney flue dimensions and material weathering.
- Current condition of obscured landscaping and small signage.
- Precise cadastral boundary versus the OSM compound footprint.

## Shared spatial contract

- Authored unit: `1 Blender unit = 1 scene unit = 2.7 m`
- Origin / pivot: compound center at `[0, 0, 0]`, ground datum `Z=0`
- Front direction: local `-Y`
- Runtime axis conversion: existing GLB loader mirrors local source depth with `scale={[1,1,-1]}`
- Placement recommendation: `[92.535374, -132.52181]`, derived from projected OSM way `494633921` oriented center
- Runtime yaw recommendation: `0.153486288` rad（约 `8.795°`），沿 OSM 最长边；旧 `π/2` 被拒绝
- V2 runtime scale recommendation: `0.88`；source bounds 与 OSM oriented envelope 的静态拟合，不冒充测绘尺寸
- Recommended canonical start for main-window QA: north side `[92.5, -145.0]`, forward `[0, 1]`; the main window must verify against active world obstacles before committing
- Ground contact tolerance: `±0.04` scene unit
- World footprint continuity: Massing source bounds are `X=-6.3..6.3`, runtime local `Z=-5.652..5.148`; at recommended scale `0.88` they track the OSM oriented envelope and retain the same origin across later tiers

## Subject-specific identifying cues

1. Wide black-and-white Tudor facade with large diagonal half-timber bays.
2. Steep layered roof silhouette with deep eaves and dormer.
3. Three-part tall red-brick chimney with articulated crown.
4. Gabled timber entrance porch and narrow mullioned window rhythm.
5. West/rear low glass wing and end-wall full-height timber grid.
6. Small three-bird roof-ridge weathervane silhouette.

Identity must preserve cues 1–5. Massing must preserve the wide facade, layered roofs, chimney, porch opening and low wing, but may omit window subdivision and the weathervane.

## Geometry and material contract

- Massing first: main body, west/end wing, low glass wing, roof layers, chimney, porch and entrance void.
- Hero: refine half timber, window grids, eaves, chimney crown, low wing frames and restrained weathervane.
- Identity: derive from Hero parameters; use fewer window subdivisions, roof ribs and trim pieces while preserving five required cues.
- Material palette: warm off-white plaster, near-black timber, muted red-brown roof tile, red brick, dark desaturated glass, warm stone.
- No embedded images or runtime photo textures.
- Site: retain a shallow ground datum and existing wall relationship only. Existing generated tree and hedges remain Hold and are not upgraded.

## Tier lineage and budgets

| Field | Hero | Identity | Massing |
| --- | --- | --- | --- |
| Output | `public/models/requested-pois/hudec-memorial.glb` | `public/models/requested-pois/hudec-memorial-identity.glb` | `public/models/requested-pois/hudec-memorial-massing.glb` |
| Editable source | `assets/models/source/requested-pois/hudec-memorial.blend` | `assets/models/source/requested-pois/hudec-memorial-identity.blend` | `assets/models/source/requested-pois/hudec-memorial-massing.blend` |
| Source | V2 generator master | Same V2 parameters, `derivedFrom` Hero build SHA | Same V2 parameters, early massing checkpoint reverified after Hero |
| Max nodes | 2 | 2 | 2 |
| Max triangles | 45,000 | 12,000 | 2,500 |
| Max materials | 16 | 9 | 5 |
| Max images | 0 | 0 | 0 |
| Max bytes | 2,800,000 | 700,000 | 220,000 |
| Viewing distance | 0–55 world units | map and local fallback | cover-only internal |
| Collision | independent shared split obstacles | same | same |

## Collision and camera-clearance plan

- Blocking volumes: main body, west/rear wing, entrance porch solids and street wall remain split.
- Walkable voids: entrance approach, courtyard circulation and gate opening remain clear.
- Hold vegetation does not gain new collision.
- Player start and a camera point 7.4 units behind it must stay outside all transformed obstacles.
- No single compound-sized collision box is allowed.
- Current Massing porch: local clear gap `1.5912`; at runtime scale `0.88` it becomes `1.400256`, exceeding the required `1.36` by `0.040256`.
- Main-window wiring must use the seven exact local blockers recorded in
  `test_artifacts/test_hudec-memorial_map_calibration.json`; the ground datum,
  roofs, dormers, tree/decor Hold and already-overlapped chimney receive no
  extra compound collision.

## Runtime acceptance contract

- Deep link: `/?start=hudec`
- QA tier override: `/?start=hudec&buildingTier=hero|identity|massing` if the main runtime supports it; otherwise use an asset-specific temporary QA override and record it explicitly.
- Massing gate before Hero detail: request success, visible material, scale `1.0`, ground contact, OSM setback, entrance clearance and camera safety.
- Same-camera tier gate: no origin, scale, yaw, ground or collision popping; deliberate detail loss recorded.
- Three.js: canonical, side/map-context and deterministic approach evidence for all tiers.
- Performance record: fixed viewport, static build, visible tab, 8 s warm-up, 10 s sample, GLB Resource Timing and frame metric.
- No performance improvement claim without same-condition legacy baseline.

## Build provenance

- Deterministic V2 generator: `scripts/create_hudec_memorial_v2.py`
- Single-asset command:
  `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_hudec_memorial_v2.py -- --stage=<massing|hero|identity|all>`
- Audit:
  `python3 scripts/audit_glb.py <glb> --forbid-images --max-nodes 2`
- Build records:
  `docs/research/build-records/hudec-memorial-{massing,hero,identity}.json`
- Cache version must change with each binary SHA.

## Gate status and decision log

### Iteration 0 — 2026-07-25 research and legacy audit

- Scope gate: Passed; one building only, vegetation/decor Hold.
- Preflight: Passed after syncing the shared repository GLB auditor.
- Evidence: Passed for canonical, depth/side and entrance; rear/east remains explicitly Unknown.
- Legacy decision: Retain as rollback baseline but upgrade structurally because official depth evidence contradicts its generic roof/chimney/wing treatment.
- Massing MCP / runtime: Pending.
- Hero MCP: Pending.
- Same-camera three-tier MCP: Pending.
- Wiki completion gate: Pending.
- Deployment: Not authorized.

### Iteration 1 — recovery Massing checkpoint

- Recovery baseline: commit `7c98906`; recovery candidate `3044cd8` is retained only as a generic/provisional counterexample and is not copied over this Worktree.
- Independent review result: Rejected as too generic; it did not make the multi-flue chimney tower, layered steep roofs, cross gable, half-timber end gable and low glass wing readable in one canonical view.
- Corrective decision: Promote official reference `HUDEC-V2-REF-C` to canonical and rebuild those observed volumes before requesting MCP 1.
- MCP 1: Pending; shared Blender scene remains reserved by the coordinator.

### Iteration 2 — evidence-silhouette Massing candidate

- Actual modification: Replaced the single chimney mass with a white tower plus three independent brick flues; lengthened and steepened the main roof; kept the perpendicular end-wing gable; added a minimal evidence-readable half-timber frame; connected the lower glazed wing with a descending shed roof; added a rear dormer mass.
- Evidence boundary: chimney, roof layers, end gable, half timber and low glazed wing are observed in `HUDEC-V2-REF-C`; exact dimensions and hidden wall continuity remain inferred; east/rear openings remain unknown and unmodeled.
- Scale proof: preview-only 1.8 m proxy uses `1.8 / 2.7 = 0.667` scene unit and is absent from the GLB.
- Headless result: canonical, side and entrance views saved under `test_artifacts/test_hudec-memorial-massing_*_preview.png`; all required massing cues are readable without Hero facade detail.
- GLB result: 158,312 bytes, 1 node, 1 mesh, 2,180 triangles, 5 materials, 0 images, 5 draw calls; root transform is identity and audit passes.
- Build record: `docs/research/build-records/hudec-memorial-massing.json`.
- Independent review: Passed by the coordinating main window as an MCP 1
  candidate. Canonical clearly retains the white chimney base, three brick
  flues, steep long roof, half-timber end gable and low glass wing; side view
  retains the layered cross-gable relationship and the 1.8 m proxy reads at a
  plausible scale. The entrance porch remains simplified but is not a Massing
  blocker.
- MCP 1 / map / runtime: Pending; this checkpoint is only a candidate and does not authorize Hero detail.

### Iteration 3 — MCP 1 pass and Three.js Massing map gate

- MCP 1: Passed by the main coordinator in Blender MCP at source checkpoint
  `f509c60`; no interactive geometry or transform change was accepted, so no
  generator round trip was required.
- Runtime assembly: Built a temporary static QA bundle that changed only the
  `hudec-memorial` entry to the exact Massing GLB, then restored
  `app/scene/xinhua-road-landmarks-data.json` byte-for-byte to SHA
  `eccba9706ef88456ee6616ff9f44bc6f41ec8ac76d3f09478d08f7f58b5527e6`.
  The public registry change is not committed and the legacy Hero binary was
  not overwritten.
- Fixed entry: `/?start=hudec&network=standard`, 1440×900, DPR 1, visible tab,
  15 s warm-up. The exact GLB returned HTTP 200 with an encoded body of
  158,312 bytes and cache key `20260725-hudec-massing-c38302eb136d`.
- Network boundary: The automation browser reported `4g` but only
  `1.65 Mbps`; automatic classification therefore selected `weak` and
  intentionally retained the Identity proxy. The existing `network=standard`
  QA override was used to test the exact GLB; this weak-network behavior is not
  classified as an asset failure.
- Map checks: Existing OSM way `494633921` placement, `front=-Y` plus runtime
  yaw `π/2`, scale `1.0`, visible ground contact, road/front-yard setback,
  person scale and camera framing passed. Start `[73,-132]` and the Brief's
  7.4-unit rear camera probe remain outside the split transformed obstacles.
  Collision/walkability did not pass.
- Runtime checks: Canvas filled the fixed viewport; console logs and page
  errors were empty. A 180-frame visible-tab sample averaged 16.62 ms/frame
  (about 60.18 fps), but its 2.9911 s duration is shorter than the Brief's
  required 10 s and is diagnostic only; no relative performance improvement is
  claimed.
- Browser long-press exploration is explicitly non-authoritative because
  third-person camera-relative input changes heading. Browser views support
  visible runtime, ground, scale and context only.
- Independent review: Not Ready. The generator's visible porch walls resolve
  after `AUTHORED_SCALE=0.72` to `x=0.90..1.2744` and
  `x=2.5416..2.916`, leaving a real gap of `1.2672`. The production
  `PLAYER_RADIUS=0.48` plus the shared `0.2` collision margin on both sides
  requires `1.36`, a `0.0928` deficit. The attempted temporary QA source
  `609aea7cb90695413504a6aac6c3e084f05c778bf67a8c006cd975b9ea553b05`
  narrowed the collision cores and moved the right street-wall collision; it
  would allow the avatar to enter visible wall geometry and is retained only
  as a rejected experiment.
- QA provenance limitation: The temporary compiled data module and a HAR/trace
  were not retained. The screenshots and Resource Timing observation prove the
  Massing GLB rendered and returned HTTP 200, but do not independently prove
  the collision configuration. A future rerun must preserve a reproducible
  temporary patch/build manifest and browser network evidence.
- Evidence:
  `test_artifacts/test_hudec-memorial_massing_runtime_{preview,entrance_preview,side_preview}.png`
  and
  `test_artifacts/test_hudec-memorial_massing_runtime_metrics.json`.
- Decision: Massing map gate is Blocked. Return to the Massing batch to widen
  the real entrance geometry, regenerate the artifacts, repeat MCP 1, preserve
  auditable runtime inputs, and collect the full 10 s performance sample.
  Hero and Identity remain unauthorized.

### Iteration 4 — Fast Mode entrance correction and static map recalibration

- Ownership: only Hudec-specific generator, Massing binaries, evidence,
  build record, fixed views, gate record and dedicated tests changed. Public
  registry/runtime/Fast manifest remain untouched.
- Entrance correction: widened the real porch from `2.8` to `3.25` generator
  units while retaining `0.52` side walls. The generated local gap is now
  `1.5912`; under recommended runtime scale `0.88` the world gap is
  `1.400256`, passing the shared `1.36` requirement without shrinking collision
  into visible walls.
- Map correction: projected OSM way `494633921` and the official west-side
  evidence reject the legacy `yaw=π/2`. The reproducible recommendation is
  position `[92.535374, -132.52181]`, yaw `0.153486288`, scale `0.88`.
- Road gate: the modeled footprint remains off the Panyu Road asphalt and its
  setback differs from the OSM footprint setback by at most one scene unit;
  it is neither pushed into the carriageway nor manually displaced farther
  from the road.
- Headless result: refreshed editable Blend, exact GLB and canonical/side/
  entrance previews; GLB remains 158,312 bytes, 1 node, 1 mesh, 2,180
  triangles, 5 materials and 0 images.
- Gate boundary: the prior MCP 1 and runtime screenshots remain historical
  evidence for the superseded binary/transform. The corrected candidate now
  awaits main-window MCP 1 and temporary runtime wiring; Hero and Identity
  remain unauthorized.
