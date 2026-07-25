# Blender Model Brief: One Step Garden

## Scope

- Asset slug: `one-step-garden`
- POI / environment / character: 新华路179号一尺花园安和花园店，前后分体建筑
- Runtime component: `app/scene/xinhua-road-landmarks.tsx`
- Legacy Hero generator (Hold): `scripts/create_xinhua_road_models.py`
- Massing generator: `scripts/create_one_step_garden_massing_model.py`
- Hero v2 generator: `scripts/create_one_step_garden_hero_model.py`
- Legacy editable source (Hold): `assets/models/source/xinhua-road/one-step-garden.blend`
- Legacy runtime GLB (Hold): `public/models/xinhua-road/one-step-garden.glb`
- Hero v2 source: `assets/models/source/tiers/xinhua-road/hero-v2/one-step-garden-hero.blend`
- Hero v2 GLB: `public/models/tiers/xinhua-road/hero-v2/one-step-garden-hero.glb`
- Massing source: `assets/models/source/tiers/xinhua-road/massing-v2/one-step-garden-massing.blend`
- Massing GLB: `public/models/tiers/xinhua-road/massing-v2/one-step-garden-massing.glb`
- Start preset: `/?start=garden179`
- Hero v2 build command: `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_one_step_garden_hero_model.py`
- Massing build command: `blender --background --python-exit-code 1 --python scripts/create_one_step_garden_massing_model.py`
- Hero v2 validation command: `python3 /Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py public/models/tiers/xinhua-road/hero-v2/one-step-garden-hero.glb --forbid-images --max-nodes 9`
- Massing validation command: `python3 /Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py public/models/tiers/xinhua-road/massing-v2/one-step-garden-massing.glb --forbid-images --max-nodes 1`

## Preflight Gate

- Blender binary and version: `/Applications/Blender.app/Contents/MacOS/Blender`，`5.2.0 LTS`
- Generator dry run / affected assets: Massing 与 Hero v2 均使用独立单资产生成器；旧共享 generator 与旧 Hero Hold 不运行、不覆盖
- GLB audit command: 使用上述 `audit_glb.py`
- Local preview command and port: `npm run dev` 或静态构建预览；端口以实际输出为准
- Browser/runtime validation path: `/?start=garden179`；当前 production runtime 没有通用 `qaModelTier`，Massing 地图门采用临时、可回滚的单建筑 registry QA assembly，验收后恢复原 registry
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
- 后方照片可见草坪、水杉和室外活动空间；它们只作两栋建筑空间关系证据，不进入本建筑资产。

#### Inferred

- OSM way `864485599` 是当前手工落点附近的首要 footprint 候选，但尚无门牌字段闭合。
- 前体量不可见背面和两栋之间的连廊，只能按照片与候选占地保守补全。
- `179号` 与 `179弄` 可能描述同一经营场地的门牌/弄堂入口差异，不据此移动模型。

#### Unknown

- 两栋建筑的精确边界、间距、真实高度、后立面和入口罗盘方向。
- OSM way `864485599` 的最终门牌归属。
- 商业家具、店招和植物配置的长期稳定状态；本轮也不处理这些范围外元素。

## Quality Contract

### Identity

- Silhouette: 沿街陡坡双坡屋面前体量、院落间隙和独立后院红砖体量
- Signature cue 1: 暖白拉毛墙与深色半木构山墙
- Signature cue 2: 机制瓦陡坡屋面、棚屋形老虎窗和明显出檐
- Signature cue 3: 后院独立红砖长屋、双山墙和两根烟囱，与前体量保持可步行间隙
- Details intentionally omitted: 不可见后立面、室内、树木、灌木、草坪、临时店招、桌椅、伞具、装饰物和不可读门窗五金

### Position

- Coordinate source: 当前手工落点 `[60.86, 120.73]`；OSM way `864485599` 仅为待核候选
- Scene position: `[60.86, 120.73]`，地图闭合前不移动
- Confidence: 手工落点中；OSM 绑定低

### Scale

- Known dimensions: 无可信公开测绘尺寸；Massing 当前水平包络约 `14.5 × 16.225` authored units
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
- Camera target height and clearance: 相机不得穿入檐口或建筑实体

### Materials

- Opaque: 暖白拉毛墙、低饱和红砖、暗灰木构、灰褐机制瓦
- Glass: 深灰低反射
- Metal: 深灰门窗五金
- Emissive: 无
- Project palette mapping: 使用新华路暖灰、暗红砖和深灰屋面

### Collision and access

- Solid obstacles: 两栋主体和可见承重柱分别设碰撞，不使用覆盖整院的大盒
- Walkable areas: 沿街入口、前院和两栋之间的建筑间隙
- Camera clearance: canonical 起点与相机轨迹在实体碰撞外
- Road clearance: 沿街建筑体量不得侵入新华路车行区

### Runtime budget

- Maximum triangles: 62,000
- Maximum nodes: 9
- Maximum materials: 12
- Maximum images: 0
- Maximum GLB bytes: 4,800,000
- Animation/skin requirements: none

### Build provenance

- Baseline GLB SHA / bounds / metrics: 在 Iteration 1 动工前写入 build record
- Expected Hero v2 output paths: `assets/models/source/tiers/xinhua-road/hero-v2/one-step-garden-hero.blend`、`public/models/tiers/xinhua-road/hero-v2/one-step-garden-hero.glb`
- Hero v2 build record path: `docs/research/build-records/tiers/xinhua-road/hero-v2/one-step-garden-hero.json`
- Cache version rule: GLB SHA 变化时同步更新 `cacheVersion` 和 build record

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Massing | 前体量、后体量、院落间隙与坡屋顶 | canonical 分体轮廓 | 真实 `?start=` 灰模门 | MCP1 + map gate passed; shared integration pending |
| Runtime calibration | 位置、比例、朝向、机位和道路退界 | N/A | 冻结旧落点完成地图门；公共 registry 由主窗口整合 | Map gate passed |
| Hero master disposition | 只读审计旧 `.blend` / GLB / generator / lineage | MCP2 前必须具备正确主体和三固定机位 | N/A | Hero v2 已通过主窗口 MCP2；旧 Hero 继续 Hold |
| Identity | 半木构、老虎窗、红砖后体量和场地层次 | 三项构件可读 | Identity 距离可辨认 | 主窗口 MCP3 已通过；等待 candidate+gate 整合后启动运行时 |
| Materials | 白墙、红砖、深木构和灰褐瓦 | 固定机位无黑面 | 项目色盘一致 | Identity 六组 PBR 材质通过 MCP3，6/6 Principled node materials |
| Site | 树木、草坪、家具、店招与装饰物 | N/A | N/A | Hold：严格排除在18栋建筑范围外 |
| Collision | 两栋分体和可达路径 | 无整院大盒 | 人物/相机可达 | 沿用已通过地图门的八分体碰撞语义；Identity 未接入运行时 |
| Optimization | 静态合并与共享材质 | 轮廓不丢失 | 预算通过 | Identity 为 1,484 triangles / 112,456 bytes，预算与 MCP3 均通过 |

## Validation

- [x] Massing 通过临时 registry QA assembly 在真实 `/?start=garden179&network=standard&cameraQa=1&effects=off&district=off` 中验收，随后原 registry 逐字节恢复
- [x] 两栋不同体量没有被合并，未知背面没有虚构细节
- [x] Massing、Hero 与 Identity 的可编辑 `.blend`、GLB 及同机位 canonical、侧向、入口视图齐全；正式三档 MCP3 对照仍待主窗口
- [x] GLB SHA、bounds、节点、三角面、材质、图片和体积进入 build record
- [x] 人物/相机碰撞、院落可达、道路退界、控制台和精确 GLB 资源请求通过
- [x] MCP1、MCP2 与 MCP3 三道 Blender 门均通过；Three.js 三档运行时门仍待 candidate+gate 整合后执行

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

### Iteration 3 — 2026-07-25 Blender MCP1

- Gate: `mcp1-massing-pre-map-calibration` Passed；只放行 Three.js Massing map gate，Identity/Hero 继续锁定。
- Source integrity: 正式 `.blend` SHA-256 为 `a4c0e0fba996f139a88344b6f39a8a2509326ba7018206dc888231fab6474388`；正式 GLB SHA-256 仍为 `a87caeba3b3ab4bc6735e6f3b98f424c15994895a8b51d8777d2cb98fb80e761`。
- Scene inspection: `1` mesh、`3` materials，root location/rotation 为 `[0,0,0]`、scale 为 `[1,1,1]`；Blender world bounds 为 `[-7.25,-6.9,0]` 到 `[7.25,9.325,6.25]`。
- Human scale: 临时人物代理总高 `0.666667` scene unit，即 `1.8m`；相对三层前体量每层约 `1.333` unit，人物约为单层高度 `50%`，通过合同。
- Visual result: U 形前院、陡坡左右翼、棚屋形老虎窗、后院独立红砖长屋、双山墙、两烟囱及前后开放间隙在 canonical、side/depth、entrance 与街道尺度四个正交机位均可读。
- Fixed evidence:
  - `test_artifacts/all-models/massing-v2/one-step-garden/test_one-step-garden-massing_mcp1_canonical.png`
  - `test_artifacts/all-models/massing-v2/one-step-garden/test_one-step-garden-massing_mcp1_side-depth.png`
  - `test_artifacts/all-models/massing-v2/one-step-garden/test_one-step-garden-massing_mcp1_entrance-scale.png`
  - `test_artifacts/all-models/massing-v2/one-step-garden/test_one-step-garden-massing_mcp1_street-scale.png`
- Interactive boundary: `acceptedInteractiveChanges=[]`；所有相机、灯光、地面和人物代理均为临时 QA rig，没有保存到 master 或导出到 GLB。
- Detailed record: `docs/research/one-step-garden-blender-mcp-gates.json`。
- At-this-checkpoint next gate: Three.js Massing map calibration；production runtime 没有通用 `qaModelTier`，因此实际采用 Iteration 4 所述临时 QA assembly；公共运行时未获本工作树直接整合授权。

### Iteration 4 — 2026-07-25 Three.js Massing map gate

- QA assembly: 只在静态 production preview 构建前临时把一号花园的 model、cache、bounds 和 8 个分体碰撞盒替换为 Massing 候选；验收后 `app/scene/xinhua-road-landmarks-data.json` 已恢复到 SHA-256 `eccba9706ef88456ee6616ff9f44bc6f41ec8ac76d3f09478d08f7f58b5527e6`，与改动前逐字节一致。
- Frozen placement: 保持 position `[60.86, 120.73]`、yaw `-0.38`、scale `0.88`，没有使用移动授权；local `-Y` 面向新华路，建筑落地且与起点车道最近碰撞边界保留 `3.524676` scene units。
- Resource result: 精确 Massing GLB 返回 HTTP `200`、`model/gltf-binary`、`18,316` bytes；source 与 dist SHA-256 均为 `a87caeba3b3ab4bc6735e6f3b98f424c15994895a8b51d8777d2cb98fb80e761`。
- Runtime result: `1440×900`、DPR `1`、页面可见、effects/district 关闭；控制台 `0` logs、`0` page errors。10.014 秒采样为 `601` frames、约 `60.02 FPS`、p95 `17.9ms`，仅报告绝对样本，不声明性能提升。
- Collision result: 默认前进路径被左前翼墙体阻挡；`KeyD 1700ms` 后 `KeyW 2400ms` 可从开放入口棚进入前院；入口净宽 `3.4016`、前后建筑间隙净宽 `1.404`，均大于人物直径 `0.96`。
- Scope boundary: 未新增树木、草坪、家具、雨伞、店招、装饰物、其他建筑或全地图资产；公共 registry、Hero 和范围外 Hold 成果均未覆盖。
- Detailed record: `docs/research/one-step-garden-massing-map-qa.json`。
- Gate result: Massing map gate Passed；公共 runtime integration 仍由主窗口统一执行。Hero master disposition 可进入主窗口审查，Identity 继续锁定。

### Iteration 5 — 2026-07-25 legacy Hero master disposition

- Audit mode: 只读审计 `assets/models/source/xinhua-road/one-step-garden.blend`、`public/models/xinhua-road/one-step-garden.glb`、共享 generator、旧预览和 Git lineage；未重建、未启动 Blender 或共享 MCP、未修改公共 registry。
- Atomic lineage: 旧 `.blend`、GLB、generator 和单张预览同由提交 `e292fde194c2704a9eeaf7e4a8faf192a5d0385e` 更新；二进制至今未变化。当前共享 generator 已因其他资产工作漂移，但 `build_one_step_garden()` 函数与生产提交逐字节一致；旧 Hero 没有资产级 build record。
- Subject result: Failed。旧 Hero 是单一矩形主楼、单一右侧翼、弧形露台和单烟囱，不是已确认的前部白色 U 形建筑群与后院独立红砖长屋；棚屋形老虎窗、后院双山墙与两烟囱及前后可步行间隙均缺失。旧 canonical 已由专项 manifest 标记 `rejected-source-subject-mismatch`。
- Scope result: Failed。旧 generator 把 4 个灌木、3 组咖啡外摆、2 把雨伞、2 个花盆、4 个庭院灯、2 段围栏、店招、装饰铺装和整块庭院板合并进单一 runtime mesh；虽然没有显式树木，仍违反严格建筑范围且不能在运行时安全拆除。
- GLB result: 容器策略检查通过（1 node、1 mesh、0 images/textures、根 transform 归一），但 Hero gate 失败：`31,900` triangles、`14` materials、`2,045,752` bytes；材质超过 Brief 的 `12` 上限，存在 `696` 个零面积三角面、`19` 个面/顶点法线方向不一致三角面，且 Hero ground min-Y `-0.1` 与 Massing ground `0` 不一致。
- Fixed-view result: Failed。只有一张 bounds 驱动的通用 900×700 oblique 预览，没有 formal canonical、side/depth、entrance/detail 或 Hero/Massing same-camera 证据；旧 runtime comparison 扩展名为 PNG、实际编码为 JPEG，且展示的仍是错误单体。
- Legacy test boundary: 旧“9 个地标细节下限”测试仍通过，但只检查 bytes、triangles 和 materials 下限，不检查主体、证据、范围污染、退化面、法线、固定机位或三档 lineage，不能作为 Hero 质量证明。
- Disposition: 旧 Hero 仅作为 `Hold / read-only rollback` 保留，不删除、不覆盖，不送 MCP2，也不得作为 Identity 来源；公共 registry 按主窗口要求继续保留旧 Hero。
- Rebuild plan: 新建独立 `scripts/create_one_step_garden_hero_model.py`、`assets/models/source/tiers/xinhua-road/hero-v2/one-step-garden-hero.blend`、`public/models/tiers/xinhua-road/hero-v2/one-step-garden-hero.glb` 和对应 build record；从已通过的 Massing contract 延伸正确建筑，严格排除树木、外摆和装饰，关闭 topology/normal/fixed-view blocker 后再申请主窗口串行 MCP2。
- Detailed record: `docs/research/one-step-garden-hero-disposition.json`。

### Iteration 6 — 2026-07-25 evidence-backed Hero v2 candidate

- Changes: 新建独立 `scripts/create_one_step_garden_hero_model.py`，从已通过 MCP1 与地图门的 Massing 骨架延伸 Hero v2；新增独立 `.blend`、GLB、三张固定机位与 build record。旧 Hero Hold、共享 generator 和公共 registry 均未删除、覆盖或修改。
- Evidence-supported geometry: 保持前部白色 U 形建筑群、左右陡坡瓦屋顶、横向后体量和棚屋形老虎窗；加入深色半木构、老虎窗连续窄窗、稳定门窗节奏；后院保持独立红砖长屋、双花园向山墙与两根烟囱。
- Scope kept out: 未生成树木、灌木、草坪、咖啡外摆、雨伞、花盆、灯、围栏、店招、装饰铺装、其他建筑或全地图资产。
- Lineage: Hero v2 root extras 与 build record 均锁定 Massing GLB SHA-256 `a87caeba3b3ab4bc6735e6f3b98f424c15994895a8b51d8777d2cb98fb80e761` 和 MCP1-reviewed Blend SHA-256 `a4c0e0fba996f139a88344b6f39a8a2509326ba7018206dc888231fab6474388`；local `-Y`、ground `0`、位置、yaw、scale、8 个分体碰撞语义和前后开放间隙不变。
- Blender result: Headless Blender 5.2.0 保存仅含 `one-step-garden-hero` 单一 mesh 的可编辑 `.blend`，SHA-256 `23bae78ed7447227118c97d572866ba3e3f3a71158cfb56f12444c374510d5f5`；1.8m 人物、地面、前向标记和三相机只用于预览，未保存到 master、未导出 GLB。
- GLB result: SHA-256 `1174a96c713bcce1b63512fd5c4e7c5405a7c5c5bb11800787943d5551df5094`；`259,632` bytes、`1` node、`1` mesh、`7` materials、`3,584` triangles、`0` images/textures/animations；bounds `[-7.25,0,-9.325]` 到 `[7.25,6.25,6.9]` 与 Massing 完全一致，root transform 归一。
- Topology and normals: 两套独立解析器均确认 `0` zero-area triangles、`0` non-finite positions、`0` invalid indices、`0` missing/zero/non-unit normals 和 `0` face-normal orientation mismatches。
- Determinism: 完整相同 Headless 命令连续两次得到相同 GLB SHA-256 `1174a96c713bcce1b63512fd5c4e7c5405a7c5c5bb11800787943d5551df5094`。
- Fixed evidence:
  - `test_artifacts/all-models/hero-v2/one-step-garden/test_one-step-garden-hero-v2-canonical.png`
  - `test_artifacts/all-models/hero-v2/one-step-garden/test_one-step-garden-hero-v2-side-depth.png`
  - `test_artifacts/all-models/hero-v2/one-step-garden/test_one-step-garden-hero-v2-entrance-detail.png`
- Visual result: canonical 可读前部 U 形白墙深木结构、老虎窗和后方红砖长屋；side/depth 可读两栋分离与开放间隙；entrance/detail 可读门窗节奏、入口棚和 1.8m 尺标。未知背面保持低细节，没有虚构装饰。
- Gate result: 当时的 Headless candidate Passed 并申请串行 Blender MCP2；随后 MCP2 因节点材质默认灰阻断，本轮产物仅作为失败前历史记录，修复见 Iteration 7。Identity 继续锁定，公共 registry 继续旧 Hero。
- Detailed record: `docs/research/build-records/tiers/xinhua-road/hero-v2/one-step-garden-hero.json`。

### Iteration 7 — 2026-07-25 MCP2 material blocker correction

- MCP2 first attempt: Blocked。主窗口直接打开 Iteration 6 `.blend` 后确认 7 个材质虽有分层的 viewport `diffuse_color`，但全部 Principled BSDF `Base Color` 仍为默认灰 `(0.8,0.8,0.8,1)`；旧 Headless 图使用 Workbench material color，不能代表正式 Blender Eevee 或 GLB PBR 材质。
- Failed evidence retained read-only:
  - `test_artifacts/all-models/hero-v2/one-step-garden/test_one-step-garden-hero-v2_mcp2_recheck_canonical.png`，SHA-256 `e2ac52f4633c83a739d133613ddd53a356c13e3b60395d4ef142b49cbd75284d`
  - `test_artifacts/all-models/hero-v2/one-step-garden/test_one-step-garden-hero-v2_mcp2_recheck_side.png`，SHA-256 `a032a12be3b6f6d1278dd4dc22d598de3a909d8fc4ec774e336311356df18c64`
  - `test_artifacts/all-models/hero-v2/one-step-garden/test_one-step-garden-hero-v2_mcp2_recheck_entrance.png`，SHA-256 `1062598e22f46a36a5574787a2d9585bedd779d805fe28f248697ec41b707508`
- Generator correction: `material()` 现在同步写入 `use_nodes=True`、Principled `Base Color`、`Roughness` 与 `Metallic`；玻璃仅使用无贴图、不透明的低饱和色和 `0.38` roughness，不虚构透明度、透射或背面细节。生成器 SHA-256 为 `b536e1d32630b0ee3262d98029ba384bfa610f392316dad7dd658141124b30b8`。
- Blender result: 正式 master `.blend` SHA-256 `8f5c3984abef50239f1ece5e5360887d8615786cb6283bf60d85f80bd12f21bd`，`139,526` bytes；build record 逐材质确认 7 个材质均启用节点并具有分层 Principled 值，另一个独立 Blender background 进程直接重开该 `.blend` 后复核同一组值通过。主窗口首次 MCP2 的临时 QA rig 未保存，`acceptedInteractiveChanges=[]`。
- GLB result: SHA-256 `026565ba9dcb347c2dd1f9b23b277a2fdf795c6c26e3e46f4f8cd29c4dee2f2b`，`259,772` bytes；7 个 `baseColorFactor` 彼此不同且无默认灰，roughness 分层为建筑面 `0.88`、玻璃 `0.38`，全部 metallic `0`，仍为 `0` images/textures/animations。
- Structural result: `1` node、`1` mesh、`7` materials、`3,584` triangles；`0` zero-area、non-finite、invalid-index、missing/zero/non-unit normals 与 orientation mismatches；bounds、origin、local `-Y`、ground `0`、地图 placement 和 8 个碰撞语义未改变。
- Determinism: 最终生成器在两个独立 Blender 5.2.0 background 进程中 clean rebuild，均得到相同 GLB SHA-256 `026565ba9dcb347c2dd1f9b23b277a2fdf795c6c26e3e46f4f8cd29c4dee2f2b`。
- Formal Eevee evidence:
  - `test_artifacts/all-models/hero-v2/one-step-garden/test_one-step-garden-hero-v2_mcp2_recheck_fixed_canonical.png`
  - `test_artifacts/all-models/hero-v2/one-step-garden/test_one-step-garden-hero-v2_mcp2_recheck_fixed_side.png`
  - `test_artifacts/all-models/hero-v2/one-step-garden/test_one-step-garden-hero-v2_mcp2_recheck_fixed_entrance.png`
- Gate result: 材质阻断的确定性修复与 Headless Eevee 证据完成，但主窗口 Blender MCP2 尚未复核；状态停在 `main-window-serial-blender-mcp2-rereview`，Identity 继续锁定，旧 Hero、共享 generator 与公共 registry 均未修改。

### Iteration 8 — 2026-07-25 Blender MCP2 rereview pass

- Reviewed source: 主窗口以 Blender MCP 直接重开 commit `a17cfe4` 的 Hero v2 master；正式 `.blend` SHA-256 `8f5c3984abef50239f1ece5e5360887d8615786cb6283bf60d85f80bd12f21bd`、GLB SHA-256 `026565ba9dcb347c2dd1f9b23b277a2fdf795c6c26e3e46f4f8cd29c4dee2f2b`，没有重建或替换被审查二进制。
- Scene inspection: `1` mesh、`2,396` vertices、`1,802` polygons；root location/rotation `[0,0,0]`、scale `[1,1,1]`，normalized。
- Material inspection: `7/7` materials 均为 `use_nodes=True`，Principled `Base Color` 与七层 diffuse 分组一致；玻璃 roughness `0.38`、其余 `0.88`；保持 `0` images/textures，不虚构透明、透射或贴图。
- Geometry inspection: `area < 1e-10` 为 `0`，non-finite normals 为 `0`，固定机位没有发现非预期相交。
- Passed evidence:
  - `test_artifacts/all-models/hero-v2/one-step-garden/test_one-step-garden-hero-v2_mcp2_rereview_canonical.png`，SHA-256 `8d6483ef61b9dbcfb026687c8a11b9b8e3d3bc34781c76cd4112197e812565f4`，`920,601` bytes
  - `test_artifacts/all-models/hero-v2/one-step-garden/test_one-step-garden-hero-v2_mcp2_rereview_side.png`，SHA-256 `188a195e6fef6fbe790308a24c4a45b48bacc330c5c5bb313cb523f7b54576e8`，`860,709` bytes
  - `test_artifacts/all-models/hero-v2/one-step-garden/test_one-step-garden-hero-v2_mcp2_rereview_entrance.png`，SHA-256 `213bfe8ad01af3582600da78f05ce89f1943c018ba0620bf5773e28f29ae16ac`，`994,183` bytes
- Visual result: canonical 清楚读出前部白色 U 形建筑、深色半木构、连续窄窗、陡坡屋顶和后院红砖长屋；side/depth 证明前后两栋独立、开放间隙、后屋双山墙与两根烟囱；entrance 证明入口棚、门窗节奏和 `1.8m` 人物尺度。未知侧后保持低细节。
- Scope result: Passed；没有树木、灌木、草坪、家具、雨伞、花盆、灯、围栏、店招、装饰铺装、其他建筑或全地图资产。
- Interactive boundary: `acceptedInteractiveChanges=[]`；主窗口临时相机、灯光、地面和人物 QA rig 未保存、未导出，不需要 generator round-trip。
- Gate result: Blender MCP2 Passed。Hero v2 现为独立 Identity 的获准来源；该授权来自 post-build MCP2 gate record，源 GLB root 中构建时的 `identity_allowed=false` 不做二进制回写，以免改变已审查 SHA。Identity 尚未开始，按主窗口要求暂停在 gate checkpoint 整合前。旧 Hero 继续 Hold，公共 registry 与共享 generator 均未修改。

### Iteration 9 — 2026-07-25 deterministic Identity v1 candidate

- Source lock: 独立 Identity 生成器在动工前逐字节锁定通过 MCP2 的 Hero generator SHA-256 `b536e1d32630b0ee3262d98029ba384bfa610f392316dad7dd658141124b30b8`、Hero `.blend` SHA-256 `8f5c3984abef50239f1ece5e5360887d8615786cb6283bf60d85f80bd12f21bd` 与 Hero GLB SHA-256 `026565ba9dcb347c2dd1f9b23b277a2fdf795c6c26e3e46f4f8cd29c4dee2f2b`，并核对 Hero build record 中 MCP2 为 `pass`、Identity 已获授权。旧 Hero Hold 不是派生来源。
- Derivation method: 新建 `scripts/create_one_step_garden_identity_model.py`，只复用冻结 Hero 的确定性几何 helper 与材质语义，从 Hero 构件子集重建 Identity；窗与门压缩为双层面板，不通过手工 Blender 鼠标调整生成不可追溯差异。
- Preserved identity: 保留前部白色 U 形建筑群、沿街半木构山墙、棚屋形老虎窗的五扇窄窗、开放入口棚、后院独立红砖长屋、双山墙与两根烟囱，以及前后建筑的开放间隙。local `-Y`、origin、ground `0`、包络、`1 unit = 2.7m`、位置 `[60.86,120.73]`、yaw `-0.38`、scale `0.88` 和八分体碰撞语义不变。
- Deliberate losses: 删除完整窗框中密集 mullion/midrail、四扇院内上层窗中的两扇、两侧院内窗节奏的一半和后屋细小窗分格；不可见侧后继续低细节。没有新增证据不支持的构件。
- Scope boundary: 未生成树木、灌木、草坪、外摆、雨伞、花盆、灯、围栏、店招、装饰铺装、其他建筑或全地图资产；旧 Hero、共享 generator、公共 registry 和其他建筑均未删除、覆盖或修改。
- Blender result: `assets/models/source/tiers/xinhua-road/identity-v1/one-step-garden-identity.blend` SHA-256 `9ecc551a8e9ff1c950949ca1bbf9ea1fdf13c81ab48acf876d5bbd2ad6687022`，`117,906` bytes；独立 Blender background 复开确认仅含 `one-step-garden-identity` 单一 mesh、`996` vertices、`752` polygons、`6/6` node materials、root normalized，Blender bounds 为 `[-7.25,-6.9,0]` 到 `[7.25,9.325,6.25]`，没有保存 QA helper。
- GLB result: `public/models/tiers/xinhua-road/identity-v1/one-step-garden-identity.glb` SHA-256 `928ecfcace4a35e88ad68d34a2369fa673457275393ea65d8649d9de433b0497`；`112,456` bytes、`1` node、`1` mesh、`6` materials、`1,484` triangles、`0` images/textures/animations，bounds `[-7.25,0,-9.325]` 到 `[7.25,6.25,6.9]`，root transform normalized。
- Structural result: bundled GLB audit 和独立解析均通过；`0` zero-area triangles、non-finite positions、invalid indices、missing/zero/non-unit normals 与 orientation mismatches。六组 PBR `baseColorFactor` 与 Hero 同语义，玻璃 roughness `0.38`、其余 `0.88`、全部 metallic `0`。
- Budget result: Identity 合同为最多 `1,800` triangles、`205,000` bytes、`1` node、`1` mesh、`6` materials、`0` images/textures/animations；实际相对 Hero 减少 `58.5938%` triangles 和 `56.7097%` bytes，显著低于 Hero 且全部硬门通过。
- Determinism: 最终生成器 SHA-256 `d336d31efd4608d015643b5227a2bcf5d075ff2889a5b15fec1f4480212249b4`；同一完整 Headless 命令连续两次 clean build 得到相同 Identity GLB SHA-256 `928ecfcace4a35e88ad68d34a2369fa673457275393ea65d8649d9de433b0497`。
- Fixed evidence:
  - `test_artifacts/all-models/identity-v1/one-step-garden/test_one-step-garden-identity-v1-canonical.png`
  - `test_artifacts/all-models/identity-v1/one-step-garden/test_one-step-garden-identity-v1-side-depth.png`
  - `test_artifacts/all-models/identity-v1/one-step-garden/test_one-step-garden-identity-v1-entrance-detail.png`
- Visual result: 三张图沿用 Massing/Hero 的 canonical、side/depth、entrance 固定正交机位；canonical 可读 U 形白墙半木构与五扇窄老虎窗，side/depth 可读前后分体、开放间隙、后屋双山墙和两烟囱，entrance/detail 可读入口棚、门窗节奏和 `1.8m` 人物尺度。
- Gate result: Identity v1 仅为 Headless candidate，`identityFormalPass=false`。主窗口必须以 Blender MCP 执行同机位 Massing/Hero/Identity MCP3 三档审查后才可放行运行时；本工作树未接入 Three.js、未修改公共 registry，也没有宣称运行时完成。
- Detailed records: `docs/research/build-records/tiers/xinhua-road/identity-v1/one-step-garden-identity.json`、`docs/research/one-step-garden-tier-lineage.json`、`docs/research/one-step-garden-blender-mcp-gates.json`。

### Iteration 10 — 2026-07-25 Blender MCP3 same-camera three-tier pass

- Reviewed source: 主窗口以 Blender MCP 对 commit `f1029cc4b93565d461a69eceebc7b45207c2b6ad` 的 Identity v1 执行只读终审；`.blend` SHA-256 `9ecc551a8e9ff1c950949ca1bbf9ea1fdf13c81ab48acf876d5bbd2ad6687022`、GLB SHA-256 `928ecfcace4a35e88ad68d34a2369fa673457275393ea65d8649d9de433b0497`，没有重建或替换被审查二进制。
- Scene inspection: `1` mesh、`996` vertices、`752` polygons、`6/6` Principled node materials；root location/rotation `[0,0,0]`、scale `[1,1,1]`，normalized。
- Geometry inspection: `area < 1e-10` 为 `0`，最小三角形面积 `0.01209998`，non-finite normals 为 `0`。
- Frozen lineage: Identity 继续锁定 Hero GLB SHA-256 `026565ba9dcb347c2dd1f9b23b277a2fdf795c6c26e3e46f4f8cd29c4dee2f2b` 与 Massing GLB SHA-256 `a87caeba3b3ab4bc6735e6f3b98f424c15994895a8b51d8777d2cb98fb80e761`。
- Hero → Identity: Passed。合理删除密集窗格、部分院内窗和后屋细小分格，但保留前部白色 U 形建筑群、半木构山墙、五扇窄老虎窗、入口棚、后院独立红砖长屋、双山墙、双烟囱和开放前后间隙。
- Identity → Massing: Passed。三档的 silhouette、origin、local `-Y` front、ground datum、bounds、位置 `[60.86,120.73]`、yaw `-0.38`、scale `0.88` 与八分体碰撞/开放入口语义连续，没有 transform 或 passage popping。
- MCP3 evidence:
  - `test_artifacts/all-models/identity-v1/one-step-garden/test_one-step-garden-identity-v1_mcp3_recheck_canonical.png`，SHA-256 `a62b7c781f9b11364ff83614a48354bdf41bf80df909fb341892219e8909a260`，`915,283` bytes
  - `test_artifacts/all-models/identity-v1/one-step-garden/test_one-step-garden-identity-v1_mcp3_recheck_side.png`，SHA-256 `eff462fee37315ebb90ae1a52d27e94bf334696d58eb5c41fee22e3ccf605943`，`857,319` bytes
  - `test_artifacts/all-models/identity-v1/one-step-garden/test_one-step-garden-identity-v1_mcp3_recheck_entrance.png`，SHA-256 `43845a920ded079a3b47d011de13f8df5d33abb20bfc77e35f8b43240f757895`，`986,082` bytes
- Visual result: canonical 证明前白 U 形、半木构与五窗老虎窗仍清楚；side/depth 证明前后建筑分体、开放间隙、后屋双山墙与双烟囱；entrance 证明入口棚、半木构门窗节奏和人物尺度。
- Scope result: Passed。没有树木、灌木、草坪、家具、雨伞、花盆、灯、围栏、店招、装饰铺装、其他建筑或全地图资产；旧 Hero 继续 Hold。
- Interactive boundary: `acceptedInteractiveChanges=[]`；MCP3 的相机、灯光、地面和人物 QA rig 未保存、未导出，因此无需 generator round-trip。
- Independent review: House315 peer 对 commit `f1029cc` 给出 `Ready`，Critical/Important/Minor 均为 `0`。
- Gate result: Blender MCP3 Passed，`identityFormalPass=true`，允许进入 One Step Garden 三档 Three.js runtime/QA。但按调度边界，必须先等待主窗口整合 candidate 与本 gate checkpoint；本提交仍不修改公共 registry、共享 runtime、其他建筑或任何范围外资产。
