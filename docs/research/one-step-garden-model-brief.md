# Blender Model Brief: One Step Garden

## Scope

- Asset slug: `one-step-garden`
- POI / environment / character: 新华路179号一尺花园安和花园店，多体量商业花园场地
- Runtime component: `app/scene/xinhua-road-landmarks.tsx`
- Generator: `scripts/create_xinhua_road_models.py`
- Massing generator: `scripts/create_one_step_garden_massing_model.py`
- Editable source: `assets/models/source/xinhua-road/one-step-garden.blend`
- Runtime GLB: `public/models/xinhua-road/one-step-garden.glb`
- Massing source: `assets/models/source/tiers/xinhua-road/massing-v2/one-step-garden-massing.blend`
- Massing GLB: `public/models/tiers/xinhua-road/massing-v2/one-step-garden-massing.glb`
- Start preset: `/?start=garden179`
- Single-asset build command: `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_xinhua_road_models.py -- --asset=one-step-garden`
- Massing build command: `blender --background --python-exit-code 1 --python scripts/create_one_step_garden_massing_model.py`
- Validation command: `python3 /Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py public/models/xinhua-road/one-step-garden.glb`
- Massing validation command: `python3 /Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py public/models/tiers/xinhua-road/massing-v2/one-step-garden-massing.glb --forbid-images --max-nodes 1`

## Preflight Gate

- Blender binary and version: `/Applications/Blender.app/Contents/MacOS/Blender`，`5.2.0 LTS`
- Generator dry run / affected assets: Massing 使用独立单资产生成器；Hero 必须使用 `--asset=one-step-garden`，均不得覆盖其他 POI
- GLB audit command: 使用上述 `audit_glb.py`
- Local preview command and port: `npm run dev` 或静态构建预览；端口以实际输出为准
- Browser/runtime validation path: `/?start=garden179`；Massing 门使用 `/?start=garden179&qaModelTier=massing`
- Existing asset, screenshot, collision and performance baseline: 现有 GLB、Blend、`localBounds`、`localObstacles`、start preset 和旧对照图均保留
- Fallback path for unavailable tools: Headless Blender 为确定性生产入口；受限沙箱内 Blender 5.2.0 启动会 `Segmentation fault: 11`，使用获批的沙箱外同命令运行；Blender MCP 只读场景和做局部视觉校验

## Evidence

完整 URL、SHA-256、主体匹配和证据边界见 `docs/research/one-step-garden-reference-manifest.json`。

### Reference photos

| Local path | Source URL | View direction | Capture/publish date | Usage boundary |
| --- | --- | --- | --- | --- |
| `docs/research/assets/poi-references/one-step-garden/one-step-garden-candidate-01-2023.jpg` | [上海长宁发布 / 上观导出](https://sghexport.shobserver.com/html/baijiahao/2023/09/24/1133838.html) | 从新华路朝沿街白色半木构体量 | Published 2023-09-24 | 只支持沿街前体量 |
| `docs/research/assets/poi-references/one-step-garden/one-step-garden-candidate-02-2023.jpg` | [上海长宁发布 / 上观导出](https://sghexport.shobserver.com/html/baijiahao/2023/09/24/1133838.html) | 内院朝沿街前体量及屋顶连接 | Published 2023-09-24 | 只支持前体量院内一侧 |
| `docs/research/assets/poi-references/one-step-garden/one-step-garden-candidate-08-2023.jpg` | [上海长宁发布 / 上观导出](https://sghexport.shobserver.com/html/baijiahao/2023/09/24/1133838.html) | 后院朝独立红砖爬山虎体量 | Published 2023-09-24 | 与前两图不是同一栋 |

### View coverage matrix

| Evidence slot | Local photo | Questions answered | Coverage status | Downgrade if missing |
| --- | --- | --- | --- | --- |
| Canonical | `one-step-garden-candidate-01-2023.jpg` | 前体量轮廓、坡屋顶、半木构、街道与树木关系 | Supported | N/A |
| Side / oblique | `one-step-garden-candidate-02-2023.jpg` | 前体量进深和局部屋顶连接 | Partial | 背面与不可见侧翼保持低细节 |
| Entrance / identity detail | canonical 与内院图 | 白墙、深色木构、老虎窗和院内开口 | Partial | 不复刻不可读门窗与商用软装 |
| Site relationship | 三张照片 | 沿街前体量、后院草坪、水杉和独立红砖体量 | Supported | 两栋必须分开，不合成一栋 |

### Canonical comparison view

- Local path: `docs/research/assets/poi-references/one-step-garden/one-step-garden-candidate-01-2023.jpg`
- Direction: 从新华路朝场地内沿街白色半木构体量
- Why selected: 主体、沿街退界、陡坡屋面、棚屋形老虎窗、半木构山墙和成熟树冠同时可读
- Runtime camera reproduction: 在 `/?start=garden179` 中从道路侧正对前体量，屋脊、山墙和一侧院落入口完整入画

### Evidence classification

#### Observed

- 同一场地至少包含沿街白色半木构体量和后院红砖爬山虎体量，两者不可拼成单栋建筑。
- 沿街建筑为假三层砖木结构，白色水泥拉毛墙，机制瓦双坡屋面，并有棚屋形老虎窗。
- 后方存在草坪、水杉和室外活动空间。

#### Inferred

- OSM way `864485599` 是当前手工落点附近的首要 footprint 候选，但尚无门牌字段闭合。
- 前体量不可见背面和两栋之间的连廊，只能按照片与候选占地保守补全。
- `179号` 与 `179弄` 可能描述同一经营场地的门牌/弄堂入口差异，不据此移动模型。

#### Unknown

- 两栋建筑的精确边界、间距、真实高度、后立面和入口罗盘方向。
- OSM way `864485599` 的最终门牌归属。
- 商业家具、店招和植物配置的长期稳定状态。

## Quality Contract

### Identity

- Silhouette: 沿街陡坡双坡屋面前体量、院落间隙和独立后院红砖体量
- Signature cue 1: 暖白拉毛墙与深色半木构山墙
- Signature cue 2: 机制瓦陡坡屋面、棚屋形老虎窗和明显出檐
- Signature cue 3: 后院红砖爬山虎建筑与水杉草坪的分体场地关系
- Details intentionally omitted: 不可见后立面、室内、临时店招、桌椅、伞具和不可读门窗五金

### Position

- Coordinate source: 当前手工落点 `[60.86, 120.73]`；OSM way `864485599` 仅为待核候选
- Scene position: `[60.86, 120.73]`，地图闭合前不移动
- Confidence: 手工落点中；OSM 绑定低

### Scale

- Known dimensions: 无可信公开测绘尺寸；当前包络 `20 × 16` authored units
- `1 scene unit = 2.7 m` conversion: 地图绑定后以 footprint 约束水平尺度；垂直尺度由假三层和照片人物/门窗比例推断
- Allowed visual multiplier: `0.96–1.04`，不得用整体缩放掩盖分体和进深问题

### Orientation

- Blender front direction: local `-Y`
- Runtime rotation: 当前 `-0.38 rad`，仅作迁移基线
- Canonical view direction: 从新华路向沿街前体量；精确罗盘方向 pending

### Framing

- Target screen-width occupancy: `52%–68%`
- Maximum canonical direction deviation: `15°`
- Required visible edges / roof extents: 前体量两侧檐口、主屋脊、至少一处老虎窗与院落入口完整可见
- Player-to-door and player-to-storey scale check: 人物高度约为首层高度 `45%–60%`
- Camera target height and clearance: 相机不得穿入树冠、檐口或前场围墙

### Materials

- Opaque: 暖白拉毛墙、低饱和红砖、暗灰木构、灰褐机制瓦
- Glass: 深灰低反射
- Metal: 深灰门窗五金
- Emissive: 无
- Project palette mapping: 使用新华路暖灰、暗红砖和低饱和绿

### Collision and access

- Solid obstacles: 两栋主体分别设碰撞；围墙和附属体只覆盖可见实体
- Walkable areas: 沿街入口、两栋之间、草坪边缘与室外活动路径
- Camera clearance: canonical 起点与相机轨迹在实体碰撞外
- Road clearance: 沿街体量、围墙和树木不得侵入新华路车行区

### Runtime budget

- Maximum triangles: 62,000
- Maximum nodes: 9
- Maximum materials: 12
- Maximum images: 0
- Maximum GLB bytes: 4,800,000
- Animation/skin requirements: none

### Build provenance

- Baseline GLB SHA / bounds / metrics: 在 Iteration 1 动工前写入 build record
- Expected output paths: `assets/models/source/xinhua-road/one-step-garden.blend`、`public/models/xinhua-road/one-step-garden.glb`
- Build record path: `docs/research/build-records/one-step-garden.json`
- Cache version rule: GLB SHA 变化时同步更新 `cacheVersion` 和 build record

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Massing | 前体量、后体量、院落间隙与坡屋顶 | canonical 分体轮廓 | 真实 `?start=` 灰模门 | Headless candidate; MCP1 pending |
| Runtime calibration | 位置、比例、朝向、机位和道路退界 | N/A | footprint 绑定前不移动 | Pending |
| Identity | 半木构、老虎窗、红砖后体量和场地层次 | 三项构件可读 | Identity 距离可辨认 | Pending |
| Materials | 白墙、红砖、深木构和灰褐瓦 | 固定机位无黑面 | 项目色盘一致 | Pending |
| Site | 草坪、水杉、入口和开放院落 | 分体接地 | 公共路径开放 | Pending |
| Collision | 两栋分体、围墙和可达路径 | 无整院大盒 | 人物/相机可达 | Pending |
| Optimization | 静态合并与共享材质 | 轮廓不丢失 | 预算通过 | Pending |

## Validation

- [ ] Massing 在真实 `/?start=garden179&qaModelTier=massing` 中通过
- [ ] 两栋不同体量没有被合并，未知背面没有虚构细节
- [ ] 可编辑 `.blend`、GLB、canonical、侧向、街景和三联对照齐全
- [ ] GLB SHA、bounds、节点、三角面、材质、图片和体积进入 build record
- [ ] 人物/相机碰撞、院落可达、道路退界、控制台和首屏资源通过
- [ ] 灰模与终审两个独立检查点无 blocker

## Decision Log

### Iteration 0 — 2026-07-25

- Changes: 替换错绑来源，建立同一经营场地的前后分体证据、视角矩阵和质量合同。
- Evidence used: 上海长宁发布 / 上观导出的三张同场地照片；长宁政府地址资料；2026-07-24 Overpass 快照。
- Graybox runtime result: Pending
- Blender result: 尚未修改 Hero 生成器。
- GLB result: 旧版待审计。
- Three-way comparison result: Pending
- Runtime result: Pending
- Independent review result: 证据门允许 Massing；Hero 细化前仍需闭合 footprint 和不可见面。
- Remaining inference: 后立面、建筑间连接、精确尺寸与地图绑定。
- Performance impact: 仅新增研究文件，无运行时影响。
- Rollback point: 分支基线 `9ddf693`。

### Iteration 1 — 2026-07-25 recovery audit

- Changes: 从只读恢复提交中仅提取本建筑 Brief、manifest 和三张原始证据照片；未提取公共清单、运行时接入或其他建筑文件。
- Evidence used: 三张照片的 SHA-256 与 manifest 完全一致；canonical、内院侧向和后院独立体量三类视角均可读取。
- Rejected candidate: 恢复候选 `massing-v2` 由 5 个 `unbound-member-candidate` 平顶盒组成，`membershipConfidence=low`，未表达陡坡屋顶、棚屋形老虎窗、半木构前体量或独立红砖后体量，因此不得作为 MCP1 主体候选。
- Evidence Gate: Passed for subject-specific Massing only；精确 footprint、门牌 OSM 绑定、两栋间距与不可见背面仍为 Unknown。
- Modeling decision: Massing 必须从照片直接可见轮廓与冻结的旧 Hero 包络参数重建；不得把五个未绑定 OSM 候选假定为一号花园建筑群。
- Runtime result: Pending；地图门通过前不移动 `[60.86, 120.73]`，不修改公共运行时清单。
- Independent review result: 恢复证据可保留；恢复 GLB 仅保留为审计背景，不进入当前分支。

### Iteration 2 — 2026-07-25 subject-specific Massing candidate

- Changes: 新建独立单资产 Headless 生成器，按三张正式照片重建临街 U 形白色建筑、陡坡左右翼、棚屋形老虎窗、开放入口棚，以及后园独立红砖长屋、双山墙和两根烟囱。
- Scope kept out: 未建树木、灌木、草坪、桌椅、雨伞、店招、装饰物或其他地图资产；未修改公共 runtime/registry/manifest。
- Scale: `1 Blender unit = 2.7m`；预览人物为 `0.666667` unit，即 `1.8m`。前体量按假三层推断，后体量按照片约两层推断，不声明测绘高度。
- Blender result: Headless Blender 5.2.0 生成 `.blend` 及 canonical、side/depth、entrance 三张固定机位 PNG；三图显示前后体量分开、local `-Y` 正面和人物尺度。
- GLB result: SHA-256 `a87caeba3b3ab4bc6735e6f3b98f424c15994895a8b51d8777d2cb98fb80e761`；`18,316` bytes、`1` node、`1` mesh、`3` materials、`204` triangles、`0` images/textures/animations，bounds `[-7.25, 0, -9.325]` 到 `[7.25, 6.25, 6.9]`，节点变换已烘焙。
- Determinism: 同一命令连续两次生成相同 GLB SHA-256。
- Three-way comparison result: 参考与 Blender 两层已具备；Three.js 层在 MCP1 和地图门前保持 Pending。
- Runtime result: Pending；候选未接入公共运行时。
- Independent review result: 等待主窗口通过共享 Blender MCP 执行 MCP1；未通过前不得开始 Identity/Hero。
