# Blender Model Brief: Xinhua Community Center

## Scope

- Stable asset ID: `xinhua-community-center`
- Subject: 新华·社区营造中心4号楼
- Address: 上海市长宁区新华路345弄4号楼
- In-scope model count: 1栋建筑
- Runtime instance count: 1
- Current legacy Hero:
  `public/models/requested-pois/xinhua-community-center.glb`
- Recovery provisional Massing:
  `public/models/tiers/xinhua-road/massing/xinhua-community-center-massing.glb`
  at Hold commit `3044cd89f801250afcd477dfbcbc7da358bf4b11`
- New candidate:
  `public/models/tiers/xinhua-road/massing-v2/xinhua-community-center-massing.glb`
- Out of scope: 玩具屋、草坪、花园、运动角、树木、装饰、全地图和普通OSM新增资产。
- Shared registry/runtime/Fast manifest: 本 Worktree 不修改，只输出主窗口接入候选。

## Preflight Gate

- Blender:
  `/Applications/Blender.app/Contents/MacOS/Blender`, version `5.2.0 LTS`.
- Single-asset generator:
  `scripts/create_xinhua_community_center_massing_model.py`.
- Production command:
  `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_xinhua_community_center_massing_model.py`.
- GLB audit:
  `python3 scripts/audit_glb.py public/models/tiers/xinhua-road/massing-v2/xinhua-community-center-massing.glb --forbid-images --max-nodes 4`.
- Runtime entry:
  `/?start=community-center&cameraQa=1&qaAutoStart=1`.
- Environment note:
  Blender 5.2 在 managed sandbox 的 Metal 探测阶段会在 Python 前崩溃；同一限定命令在
  已批准的沙箱外成功。该问题与既有 `.learnings` 中的 Blender Metal 启动故障一致。
- Browser runtime、Blender MCP 1 与公共接入由主窗口批量完成。

## Evidence Gate

完整指纹、来源和观察边界见
`docs/research/xinhua-community-center-reference-manifest.json`。

### View coverage matrix

| Slot | Evidence | Coverage | Consequence |
| --- | --- | --- | --- |
| Canonical | `xinhua-community-center-front.jpg` | 两层白色主体、平屋顶、中央金属门斗和入口 | 支持保守正面 Massing |
| Side/depth | 无同一主楼侧向照片 | Missing | 深度只采用目标 OSM footprint；不承诺侧后立面 |
| Entrance detail | canonical 局部 | 金属门斗、玻璃入口、坡道和4号标识 | Massing 只保留门斗与入口暗面 |
| Site | toy-house 照片、OSM 支路 | 同场地玩具屋与新华路345弄 | 玩具屋无精确落点，不建模；只校准主楼到支路 |

### Canonical comparison view

- Path:
  `docs/research/assets/requested-poi-references/xinhua-community-center-front.jpg`
- Direction:
  从新华路345弄支路看向4号楼临路长立面。
- Required framing:
  主楼横向占画面 `68%–84%`，中央门斗完整，地面接触可见。
- Human scale:
  `1.8m = 0.6667 scene unit`; 入口暗面高 `0.96 scene unit = 2.59m`.
- Unknown:
  图片是正立面局部，不能证明完整34米立面每一段的开窗节奏。

### Observed

- 两层低矮暖白建筑。
- 平屋顶、低女儿墙。
- 正立面中央有竖向银灰金属门斗，顶部略高于屋面。
- 门斗下为深色玻璃入口。
- 入口两侧有横向窗带、白色小方砖、坡道和木花箱。
- 玩具交换屋为独立构筑物，不是主楼体量。

### Inferred

- 两层主楼总高采用 `2.6 scene units = 7.02m`，女儿墙后总高
  `2.82 scene units = 7.61m`；这是照片比例边界，不是实测。
- 含命名 POI 节点 `node/13765678129` 的 `way/864493234` 是4号楼主 footprint。
- 与命名支路 `way/577252269` 平行且最近的长边是 canonical 正立面。

### Unknown

- 主楼实测高度。
- 侧面、背面与屋顶设备。
- 玩具交换屋、草坪、运动角和花园的精确落点。
- 支路实际路面宽度与路缘位置。

## Map and Placement Contract

投影和局部坐标真值见
`docs/research/xinhua-community-center-osm-binding.json`。

- Map center: `[121.4227819, 31.2066376]`.
- Scale: `2.7m / scene unit`.
- Position:
  `[-74.78057782060566, 112.5501903703319]`, directly projected from
  `node/13765678129`.
- Bound footprint:
  `way/864493234`; named node is inside this polygon.
- Authored unit:
  `1 Blender unit = 1 scene unit`.
- Blender source front:
  local `+Y`; this generator stores `Blender Y = binding runtime Z`.
- Raw GLTF front:
  local `-Z`, produced by Blender's Y-up export conversion.
- Shared renderer conversion:
  `GlbModel` applies `primitive scale={[1, 1, -1]}` exactly once.
- Effective Three.js runtime front:
  local `+Z`, aligned to `way/577252269`.
- Runtime yaw candidate:
  `1.1800125527954972 rad`, derived from the footprint front-edge outward normal.
- Runtime scale:
  `1.0`; no global scale is used to hide incorrect authored dimensions.
- Per-vertex projection error contract:
  `<= 0.0001 scene unit`.
- Measured error:
  zero within serialized double precision.

### Road and neighbors

- Front access road:
  `way/577252269`, named `新华路345弄`, `highway=service`.
- Building boundary to road centerline:
  `0.847365 scene unit = 2.2879m`.
- Entrance center to road centerline:
  `0.955528 scene unit = 2.5799m`.
- Closest neighboring building:
  `way/864493232`.
- Minimum footprint gap:
  `1.151714 scene unit = 3.1096m`.
- OSM footprint overlaps:
  `0`.
- Road-surface caveat:
  OSM snapshot has a centerline but no width; road-surface non-overlap remains a main-window
  runtime gate.

## Massing Quality Contract

### Identity retained at Massing distance

1. elongated two-storey low-rise footprint;
2. flat roof and parapet;
3. central tall silver portal;
4. dark entrance opening.

The orange “4号” sign, orange window graphic, tile rhythm, ramp and planters remain Hero/Identity
details and are not claimed by this Massing.

### Geometry

- Main footprint exactly follows `way/864493234`.
- Main height: `2.6 scene units`.
- Parapet: `0.22 scene unit`.
- Metal portal: `1.36 × 0.24 × 2.95 scene units`.
- Door dark plane: `0.78 × 0.035 × 0.96 scene units`.
- Omitted:
  trees, garden, toy house, sports corner, signage text, furniture and all decor.

### Collision

- Candidate blocker follows the main building footprint.
- The portal is visual Massing geometry and is not added as a separate blocker, preserving entrance
  approach clearance until Hero collision is evidence-backed.
- The closest side gap is smaller than the current `1.36 scene unit` player diameter, so it is not
  promised as a walkable route.
- The formal collision and deterministic walkaround gate remains with the main window.

### Runtime budget

| Metric | Maximum |
| --- | ---: |
| Nodes | 4 |
| Triangles | 200 |
| Materials | 3 |
| Images | 0 |
| GLB bytes | 80,000 |

## Legacy and Recovery Audit

### Existing Hero

- SHA-256:
  `cc022632a23b796ab049f6f6fc71e9b8cd5985abf8521a3198c2471c3c41b2cd`.
- Status:
  retained legacy Hero; not rebuilt or overwritten.
- Boundary:
  its broad local package and site details are not treated as OSM footprint truth.

### Recovery provisional Massing

- SHA-256:
  `5fe5c22031f2108d4bcb5c7cf631fdfeed0cb3617a646ffbc396e88028fee921`.
- Method:
  voxel remesh from legacy Hero.
- Problem:
  footprint is inherited from the legacy package and the record still lists entrance direction as
  unknown; visual screenshot cannot prove target-way registration.
- Decision:
  preserve in Recovery/Hold, do not copy or overwrite it, and do not inherit its runtime pass.

## Gate Status

- Evidence: `pass-conservative-massing-only`.
- Headless Blender build: `pass`.
- Fixed canonical/side/entrance views: `pass`.
- GLB structure/policy: `pass`.
- OSM projection candidate: `pass`.
- Road surface: `pending-main-window-runtime`.
- Blender MCP 1: `pending-main-window-batch`.
- Three.js scoped runtime: `pending-main-window`.
- Identity: `blocked-evidence`.
- Hero completion: `blocked-evidence`.

## Decision Log

- 2026-07-26:
  rejected the Recovery voxel-remesh candidate as current map truth while preserving it in Hold.
- 2026-07-26:
  bound the named POI to containing `way/864493234`, not merely the POI point.
- 2026-07-26:
  changed candidate scale from legacy `0.6` to authored `1.0`.
- 2026-07-26:
  main-window runtime review found the first v2 generator pre-negated Blender Y while shared
  `GlbModel` also negated GLTF Z. This double conversion mirrored the central portal onto the
  footprint rear edge. The source now stores `Blender Y = binding runtime Z`; Blender export and
  the shared renderer provide the single complete conversion chain. A GLB primitive-bounds test
  verifies the rendered portal remains on the named-road side.
- 2026-07-26:
  did not build the toy exchange house because its exact placement is unknown and it is not the
  target building footprint.
- 2026-07-26:
  did not authorize Identity or Hero; side/depth evidence and final runtime map acceptance remain
  missing.
- 2026-07-26:
  the axis-corrected SHA `a0609064...` passed a new Blender MCP1 inspection and the Three.js
  resource, console, performance and collision checks. The portal renders on the named-road side,
  and collision stops the player without penetration.
- 2026-07-26:
  formal map acceptance remains blocked. Runtime classifies `way/577252269` as `service`; the
  shared road contract renders it `2.5` scene units wide. The OSM-bound building edge is only
  `0.8473649273` scene units from the centerline, so rendered asphalt overlaps the footprint by
  `0.4026350727` scene units (`1.0871146963m`). The building was not moved or rescaled to hide
  the conflict. Identity, Hero and production registry promotion remain unauthorized.
