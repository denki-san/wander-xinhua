# Blender Model Brief: Xinhua Pocket Park

## Scope

- Asset slug: `xinhua-pocket-park`
- Subject: 新华路“新·境”口袋公园
- Roster semantics: 18 栋范围内的场地型资产；不是普通 OSM 建筑，也不是树木或装饰资产
- Frozen scope: 只续接该资产的 Recovery Massing，不处理树木、装饰、全地图体块或相邻建筑
- Runtime component: 主窗口后续统一接入；本建筑分支不修改 shared registry/runtime/Fast manifest
- Recovery commit: `3044cd89f801250afcd477dfbcbc7da358bf4b11`

## Preflight Gate

- Blender: `5.2.0 LTS` 可用。
- Recovery generator: `scripts/create_xinhua_road_clean_massing_models.py`，SHA-256
  `596ce3f3abf8134bbf43f0fb70075984be84739e03f416c52865e3bcbc13d8d9`，
  支持 `--asset xinhua-pocket-park`。
- Generator disposition: 该文件同时服务 8 栋建筑，因此不复制到本建筑分支；以 Recovery
  commit + SHA 作为不可变生产来源，避免引入跨建筑文件。
- GLB audit: 项目 `scripts/audit_glb.py` 可用；Recovery Massing 以
  `--forbid-images --max-nodes 16` 通过。
- Fast Mode: `node scripts/run_building_fast_mode.mjs --building xinhua-pocket-park --plan`
  可列出专项测试、范围守卫与当前 Hero GLB 审计。
- Blender MCP: 按快速模式留给主窗口 2～3 栋批量终审，本分支不执行。
- Three.js: Recovery 已保存 isolated/context 可见性截图；当前公共地图候选接线与运行时
  验收留给主窗口，旧截图不冒充当前验收。

## Evidence and View Coverage

| Slot | Local evidence | Status | Decision |
| --- | --- | --- | --- |
| Canonical | `docs/research/assets/requested-poi-references/xinhua-pocket-park-canonical.jpg` | Complete | 从新华路入口向内部弄堂观察 |
| Side / depth | canonical 图中的两侧建筑与镜墙纵深；OSM 两栋面对边 | Partial | 只承诺狭长包络，不承诺精确立面偏移 |
| Entrance / identity | `xinhua-pocket-park-signage.jpg` | Complete | 耐候钢入口、旋转展板与开放路径可见 |
| Site relationship | SHUISHI 项目说明 + OSM ways `864485662` / `864485663` | Complete for corridor, not cadastral | 以两栋面对边中线校准 |

Canonical comparison view 为 `xinhua-pocket-park-canonical.jpg`，观察方向从新华路入口
向弄堂内部。照片仅作研究证据，不进入 GLB。

### Observed

- SHUISHI 项目资料明确：场地位于新华路两栋建筑之间，长 22m、最宽不足 4.2m，
  面积 106㎡，入口在新华路上，内部相对远离主路。
- 照片直接显示两侧连续镜面、耐候钢起伏轮廓、旋转展板、蜿蜒开放路径与花境。
- 当前 OSM 快照中 `way/864485662` 与 `way/864485663` 在地址 fallback 周围形成
  同向狭长夹缝。

### Inferred

- 两个 OSM way 的面对边对应项目资料所述两栋相邻建筑。
- 面对边前后端点的中线是比旧手工坐标更保守的非地籍落位轴。
- 东南端靠近新华路，为模型入口方向。

### Unknown

- 地籍边界、实测建筑立面退线和檐口偏移。
- 场地沿 22m 的真实不规则宽度曲线。
- 镜墙、花池、坐凳、入口框和旋转展板的精确尺寸与位置。
- 未见建筑背面与场地排水等细节。

## Identity Contract

完整 Hero 的至少三处识别构件：

1. 两侧连续折面镜墙；
2. 耐候钢入口框与起伏顶部轮廓；
3. 可旋转的新华路历史建筑展板；
4. 中心蜿蜒浅色步道；
5. 低、中、高三层花境。

Massing 只保留路径、两侧墙体、入口框、保守花池与坐凳代理，不把未知细节写成事实。

## Position, Scale and Orientation

- Coordinate source: `app/scene/xinhua-map-data.json` 的 WGS84 原点与
  `2.7m / scene unit`；原始建筑轮廓来自
  `docs/research/data/xinhua-buildings-osm-20260725-074802.json`。
- Facing edges:
  - west `way/864485662`: `[121.4211531,31.2050837]` →
    `[121.4210688,31.2049111]`
  - east `way/864485663`: `[121.4212471,31.2051061]` →
    `[121.4211452,31.2048973]`
- Candidate position: `[-57.421934309, 67.062980370]`
- Candidate yaw: `-0.398058989`
- Candidate scale: `0.88`
- Scale proof: Recovery 本地包络 `1.68 × 9.20`，运行时成为
  `3.99168m × 21.8592m`，分别满足“最宽不足 4.2m”和“约 22m”。
- Ground datum: `Y=0`。
- 旧位置 `[-56.9,66.3] / -0.38 / 0.88` 不删除，但因偏向东侧 OSM 建筑而不作为
  当前候选。

候选不是任意视觉挪移：位置为两面对边中点的中点，yaw 为同一中线轴方向，scale
完全由官方尺寸与 Recovery authored bounds 约束。

## Collision and Walkability

- Massing 世界包络不与相邻建筑相交。
- 到两侧定义建筑净距分别为 `0.610876`、`0.611036` scene units；加入 `0.2`
  碰撞边距后最小仍为 `0.410876`。
- 到新华路柏油边净距 `3.042780`，到完整路缘/人行道/绿带外缘净距 `1.567780`。
- 到新华路345弄柏油边净距 `4.091509`。
- 两条镜墙应拆分为独立 obstacle；中心路径不得被单一大碰撞盒封死。
- 路径宽 `1.056` scene units（`2.8512m`），墙间开放净宽 `1.1968`
  scene units（`3.23136m`），入口框下开放宽约 `0.9504` scene units（`2.56608m`）。

## Runtime Budget and Provenance

| Metric | Massing v2 |
| --- | ---: |
| GLB SHA-256 | `cc89e36e68397199d91684d3059c5c88410a7acc1b1c015398e05d8e57b15fa3` |
| Bytes | 14,068 |
| Nodes / meshes | 7 / 7 |
| Triangles | 108 |
| Materials | 1 |
| Images / textures | 0 / 0 |
| Bounds min | `[-0.84, 0, -4.6]` |
| Bounds max | `[0.84, 1.66, 4.6]` |

Editable Blend SHA-256:
`07cbcef2639046f01f60a777e0c5b9bbcf48fe4ba91fe3d8904f2334e48752c8`。

Recovery 合格的固定机位预览、GLB 导出和 isolated/context runtime 可见性不重做。
原 build record 原样选择性恢复；新的地图裁决单独写入
`docs/research/xinhua-pocket-park-massing-map-qa.json`，不覆盖历史结论。

## Gate Status

- Evidence gate: `pass-for-massing-and-map-candidate`
- Recovery chain: `pass-selectively-retained`
- GLB audit: `pass`
- MCP 1: `pending-main-window-batch-review`
- Map geometry: `pass-candidate`
- Formal map acceptance: `pending-main-window-mcp1-and-current-threejs-runtime`
- Legacy Hero: 保留，不重建；地图门后由主窗口执行 MCP 2
- Identity: `blocked-until-hero-lineage-review`
- Three-tier runtime: `pending`
- LLM Wiki: 本建筑分支未同步，不声称完成

## Main-window Handoff

1. 批量执行当前 Massing SHA 的 MCP 1 canonical / side / entrance 终审。
2. 由主窗口在公共 tier route、registry 与碰撞合同中接入候选位置和两条镜墙 obstacle。
3. 在真实 `?start=pocket-park` 页面复核接地、入口走近、路径贯通、道路退界、fallback、
   性能和控制台。
4. 当前 runtime 通过后才推广地图候选，并开始 legacy Hero MCP 2；不得先制作 Identity。

## Decision Log

### 2026-07-26 — Recovery continuation and map calibration

- Retained: Recovery Massing GLB、Blend、build record 与四张既有 QA 图。
- Not rebuilt: 所有 Recovery 已合格阶段。
- Changed: 新增资产级证据裁决、OSM 两建筑夹缝绑定、尺寸约束落位、道路/邻楼净距和
  专项回归。
- Rejected: 继续使用偏向东侧建筑的旧手工中心点，或为避碰任意挪移。
- Remaining blockers: 主窗口 MCP 1、公共接线与当前 Three.js runtime；Hero/Identity
  后续门仍关闭。
