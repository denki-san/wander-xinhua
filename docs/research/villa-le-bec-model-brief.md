# Blender Model Brief: Villa Le Bec

## Scope

- Asset slug: `villa-le-bec`
- POI / environment / character: 新华路321号保护住宅、原车库低体量与花园场地
- Runtime component: `app/scene/xinhua-road-landmarks.tsx`
- Generator: `scripts/create_villa_le_bec_massing_model.py`
- Editable Massing source: `assets/models/source/tiers/xinhua-road/massing-v2/villa-le-bec-massing.blend`
- Runtime Massing GLB: `public/models/tiers/xinhua-road/massing-v2/villa-le-bec-massing.glb`
- Retained legacy Hero: `assets/models/source/xinhua-road/villa-le-bec.blend`、`public/models/xinhua-road/villa-le-bec.glb`
- Start preset: `/?start=villa-le-bec`
- Single-asset build command: `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_villa_le_bec_massing_model.py`
- Validation command: `python3 scripts/audit_glb.py public/models/tiers/xinhua-road/massing-v2/villa-le-bec-massing.glb --forbid-images --max-nodes 8`

## Preflight Gate

- Blender binary and version: `/Applications/Blender.app/Contents/MacOS/Blender`，`5.2.0 LTS`
- Generator dry run / affected assets: 建筑专属生成器只覆盖 Villa Le Bec Massing Blend、GLB 与三张 `test_` 固定机位预览
- GLB audit command: 使用上述 `audit_glb.py`
- Local preview command and port: `npm run dev` 或静态构建预览；端口以实际输出为准
- Browser/runtime validation path: `/?start=villa-le-bec`；Massing 门使用 `/?start=villa-le-bec&qaModelTier=massing`
- Existing asset, screenshot, collision and performance baseline: 现有 GLB、Blend、`localBounds`、`localObstacles`、start preset 和旧对照图均保留
- Fallback path for unavailable tools: Headless Blender 为确定性生产入口；Blender MCP 只读场景和做局部视觉校验

## Evidence

完整 URL、SHA-256、主体匹配、冲突和拒绝图片见 `docs/research/villa-le-bec-reference-manifest.json`。

### Reference photos

| Local path | Source URL | View direction | Capture/publish date | Usage boundary |
| --- | --- | --- | --- | --- |
| `docs/research/assets/poi-references/villa-le-bec/villa-le-bec-timeout-street-candidate-2022.jpg` | [Time Out Shanghai](https://www.timeoutshanghai.cn/features/6714.html) | 从花园轴线朝主住宅 | Published 2022 | 主住宅和低体量场地关系 |
| `docs/research/assets/landmark-comparison/villa-le-bec-real.jpg` | [Shanghai Zine](https://shanghai-zine.com/listings/16308/) | 院落朝主立面 | Capture unknown | 主立面身份构件 |
| `docs/research/assets/poi-references/villa-le-bec/villa-le-bec-official-overview-2024.jpg` | [上海市政府英文站](https://english.shanghai.gov.cn/en-Restaurants/20240522/2e50ad81c68e4b378ac12e2851217dd3.html) | 花园露台与建筑遮挡关系 | Published 2024-05-22 | 只证明场地和植被 |
| `docs/research/assets/poi-references/villa-le-bec/xhs-2024/test_xhs_villa_le_bec_01.jpg` | [小红书本地固化证据](https://www.xiaohongshu.com/search_result/66ba1786000000001e01cb8b) | 新华路朝沿街建筑与院门 | Published 2024-08-12 | canonical、道路退界和两栋关系 |
| `docs/research/assets/poi-references/villa-le-bec/xhs-2024/test_xhs_villa_le_bec_02.jpg` | 同上 | 院内入口与侧向 | Published 2024-08-12 | 入口、凸窗、屋顶纵深 |
| `docs/research/assets/poi-references/villa-le-bec/xhs-2024/test_xhs_villa_le_bec_03.jpg`–`05.jpg` | 同上 | 庭院轴线 | Published 2024-08-12 | 两栋间开放场地与通行 |
| `docs/research/assets/poi-references/villa-le-bec/xhs-2024/test_xhs_villa_le_bec_11.jpg` | 同上 | 后院/侧楼 | Published 2024-08-12 | 侧向凸窗与未知低矮附属空间 |

### View coverage matrix

| Evidence slot | Local photo | Questions answered | Coverage status | Downgrade if missing |
| --- | --- | --- | --- | --- |
| Canonical | `test_xhs_villa_le_bec_01.jpg` | 沿街建筑、院门、院内第二栋屋顶与新华路退界 | Supported | N/A |
| Side / oblique | `test_xhs_villa_le_bec_02.jpg`、`11.jpg` | 院内入口、侧向凸窗、坡屋顶、背/侧界面 | Supported-current-use | 不推断产权边界 |
| Entrance / identity detail | `test_xhs_villa_le_bec_02.jpg` | 门廊、入口凸出、深色门窗与台阶 | Supported | 商业招牌不固化 |
| Site relationship | `test_xhs_villa_le_bec_01.jpg`、`03.jpg`–`05.jpg` | 两栋建筑、庭院轴线和开放通道 | Supported | 桌椅、遮阳伞和临时软装省略 |

在新增小红书证据前，六张候选已于 2026-07-26 逐张复核：canonical 主建筑图与官方花园概览可用于外部建模；食物、酒室、肖像和室内餐厅四张不能承担外立面或地图绑定。仓库既有 `villa-le-bec-real.jpg` 可补充主立面偏角与当前商业入口细节，但当时仍不能将五个 OSM footprint 分别绑定为两栋主体与未知邻近体。

主窗口随后将小红书帖子 `66ba1786000000001e01cb8b` 的 18 图实拍本地固化。本窗口只选择性复制图01、02、03、04、05、11与接触表，没有再次访问小红书。图01/02/11补齐沿街、入口、侧向和后院关系；正文“两栋百年老建筑”为作者陈述。结合 OSM 空间分簇，`864493176` 作为沿街主楼、`864493175` 作为院内第二栋，置信度 medium-high；远处另一簇 `864493245/246/247` 缺少连续照片和门牌绑定，排除出 Massing。

### Canonical comparison view

- Local path: `docs/research/assets/poi-references/villa-le-bec/xhs-2024/test_xhs_villa_le_bec_01.jpg`
- Direction: 从新华路朝沿街建筑、院门与院内第二栋
- Why selected: 同时证明道路退界、沿街建筑四坡顶/凸窗、入口位置和院内第二栋屋顶
- Runtime camera reproduction: 在 `/?start=villa-le-bec` 从新华路一侧观察，两栋主体、院门方向和道路净距完整入画

### Evidence classification

#### Observed

- 地址为新华路321号，场地包含主住宅、由原车库改造的低体量空间和花园露台。
- 主住宅可见红褐坡屋顶、老虎窗、暖白墙体、深色基座与绿/深色门窗框。
- 上海市政府英文资料描述场地有约800平方米法式花园。
- 小红书图01显示沿街建筑和院门，门后可见另一栋坡屋顶建筑；图02显示院内入口和侧向；图03至05显示庭院通道；图11显示背/侧向凸窗。
- 小红书正文称场地由“两栋百年老建筑构成”；该项保持 `author-stated`，不升级为测绘确认。

#### Inferred

- OSM way `864493176` 位于新华路侧且与图01沿街建筑关系一致，作为 `street-villa-main`，置信度 medium-high。
- OSM way `864493175` 位于其院内偏东南且与图01/02第二栋关系一致，作为 `garden-villa-secondary`，置信度 medium-high。
- OSM ways `864493245/246/247` 构成更远的另一簇，因缺少门牌/连续视图而排除，不能当作 Villa Le Bec 五个 generic box。
- 保护页的 `1912` 与商业资料常见的 `1924` 冲突，不把年份写入运行时模型。

#### Unknown

- 精确测绘高度、产权边界与历史入口罗盘方向。
- 图11低矮附属空间是否有独立 footprint，以及 `864493245/246/247` 的真实门牌归属。
- 商业经营状态、店招、桌椅和花园软装的长期稳定性。

## Quality Contract

### Identity

- Silhouette: 两至三层坡屋顶主住宅、老虎窗/山墙与一侧低矮原车库体量
- Signature cue 1: 暖白墙体、深色基座与红褐瓦顶
- Signature cue 2: 屋顶老虎窗和不对称凸出体
- Signature cue 3: 主住宅—低车库—花园轴线的分体场地关系
- Details intentionally omitted: 年代铭牌、临时品牌、室内、桌椅、不可见背立面和不可读五金

### Position

- Coordinate source: 冻结手工落点 `[-34.1, 88.8]`；水平几何使用 OSM `864493176/175` 原始局部坐标
- Scene position: `[-34.1, 88.8]`，地图闭合前不移动
- Confidence: 手工落点中；两栋 OSM 角色 medium-high；三个排除 footprint unknown

### Scale

- Known dimensions: 公开资料只支持约800平方米花园，建筑测绘高度 unknown；v3 GLB 包络约 `11.09 × 9.23 × 4.58` authored units
- `1 scene unit = 2.7 m` conversion: 地图绑定后由 footprint 约束水平尺度；垂直高度按照片楼层和门窗比例推断
- Allowed visual multiplier: `0.96–1.04`，不得通过整体缩放掩盖主楼/车库关系

### Orientation

- Blender front direction: local `-Y`
- Runtime rotation: 当前 `-0.38 rad`，仅作迁移基线
- Canonical view direction: 从花园轴线朝主住宅；精确罗盘方向 pending

### Framing

- Target screen-width occupancy: `50%–66%`
- Maximum canonical direction deviation: `15°`
- Required visible edges / roof extents: 主屋脊、两侧屋檐、至少一处老虎窗和低车库体量完整入画
- Player-to-door and player-to-storey scale check: 人物高度约为首层可见高度 `45%–60%`
- Camera target height and clearance: canonical 相机不穿入树冠、檐口、露台或围墙

### Materials

- Opaque: 暖白灰泥、深灰/深绿基座与门窗、低饱和红褐屋瓦
- Glass: 深灰低反射
- Metal: 暗色门窗五金
- Emissive: 无
- Project palette mapping: 采用新华路暖白、暗红瓦、低饱和绿色

### Collision and access

- Solid obstacles: 主住宅与原车库分别碰撞，不用花园大盒
- Walkable areas: 花园轴线、露台外围、入口前场和两体量间通道
- Camera clearance: canonical 起点与相机轨迹在实体碰撞外
- Road clearance: 围墙、建筑和场地装饰不得侵入新华路车行区

### Runtime budget

- Maximum triangles: 68,000
- Maximum nodes: 10
- Maximum materials: 12
- Maximum images: 0
- Maximum GLB bytes: 5,200,000
- Animation/skin requirements: none

### Build provenance

- Baseline GLB SHA / bounds / metrics: 在 Iteration 1 动工前写入 build record
- Expected output paths: `assets/models/source/xinhua-road/villa-le-bec.blend`、`public/models/xinhua-road/villa-le-bec.glb`
- Build record path: `docs/research/build-records/villa-le-bec.json`
- Cache version rule: GLB SHA 变化时同步更新 `cacheVersion` 和 build record

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Massing | 两栋主体、四坡顶、沿街凸窗、院内入口和开放庭院 | canonical / side / entrance | 新 GLB 等主窗口共享 hook | Headless pass |
| Runtime calibration | 冻结位置、比例、朝向、道路退界和两栋分体碰撞 | N/A | 主窗口正式 `?start=` 门 | Pending main |
| Identity | 四坡顶、凸窗、院内入口和屋面凸起 | 三项构件可读 | Identity 距离可辨认 | Pending MCP1/map gate |
| Materials | 白墙、红褐瓦、深绿/深灰门窗 | 固定机位无黑面 | 项目色盘一致 | Pending |
| Site | 花园轴线、露台、低矮植被与开放通道 | 场地分层接地 | 公共路径开放 | Pending |
| Collision | 两栋主体分体与开放庭院 | 无整院大盒 | 人物/相机可达 | Pending main runtime |
| Optimization | 静态合并与共享材质 | 轮廓不丢失 | 预算通过 | Pending |

## Validation

- [x] v3 Massing 使用照片支持的 OSM `864493176/175`，不再无条件沿用五个 generic box
- [x] Headless Blender canonical、side、entrance 三机位通过
- [x] GLB audit：1 node、1 mesh、3 materials、0 images、120 triangles、12008 bytes
- [ ] 新 GLB runtimeGate：旧 Recovery 截图因 SHA 变化失效，等待主窗口共享 hook
- [ ] 正式 Blender MCP1：`pending-main-window-batch`，本窗口没有执行或重复执行
- [ ] Massing 正式地图门：证据 blocker 已关闭，等待主窗口验证位置、朝向、接地、退界、入口和两栋分体碰撞
- [ ] 主住宅、原车库和花园轴线保持分体，商业软装没有固化为建筑事实
- [ ] 可编辑 `.blend`、GLB、canonical、侧向、街景和三联对照齐全
- [ ] GLB SHA、bounds、节点、三角面、材质、图片和体积进入 build record
- [ ] 人物/相机碰撞、花园可达、道路退界、控制台和首屏资源通过
- [ ] 灰模与终审两个独立检查点无 blocker

## Decision Log

### Iteration 0 — 2026-07-25

- Changes: 建立主住宅、原车库和花园的分体证据，剔除室内/食物/肖像候选并记录年代冲突。
- Evidence used: 长宁政府保护页、上海市政府英文站、Michelin、Time Out 和已本地化外观照片；2026-07-24 Overpass 快照。
- Graybox runtime result: Pending
- Blender result: 尚未修改 Hero 生成器。
- GLB result: 旧版待审计。
- Three-way comparison result: Pending
- Runtime result: Pending
- Independent review result: 证据门允许 Massing；Hero 细化仍需闭合 footprint 和不可见面。
- Remaining inference: 侧后立面、原车库边界、精确尺寸与地图绑定。
- Performance impact: 仅新增研究文件，无运行时影响。
- Rollback point: 分支基线 `c0f525a`。

### Iteration 1 — 2026-07-26 Fast Mode Recovery Checkpoint

> 此 checkpoint 的证据 blocker 已由 Iteration 2 新增实拍关闭；旧 runtime 证据因 v3 GLB SHA 变化而失效，仅保留为 lineage。

- Changes: 从 Recovery commit `3044cd89f801250afcd477dfbcbc7da358bf4b11` 仅接续 Villa Le Bec 的 Massing Blend、GLB、build record、Brief、manifest、六张候选证据与五张既有 QA 截图；未恢复共享 runtime、registry、ordinary OSM、树木或装饰。
- Lineage: GLB SHA-256 保持 `8eabb87a0208294c226ecea5077f9833eceb885c2796ea00af88cab9172e96ec`；Blend SHA-256 为 `df2711336fe5ca6a178daacc3af48dae5e229de4315eee9b373d8f05d0b5ab61`；没有重建。
- Evidence audit: 六张候选中两张可用于外部/场地，四张拒绝用于外部建模；既有主立面偏角图只补足当前入口细节，未补足侧后面与 footprint 角色。
- Runtime result: 继承 Recovery `runtimeGate=pass` 与两张精确哈希截图，只证明几何可见。
- Evidence container note: 两张 runtime 文件沿用历史 `.png` 文件名，但二进制容器实际为 JPEG；本轮保留原文件与 SHA，不重编码、不覆盖旧证据。
- Blender MCP1: `pending-main-window-batch`；Recovery record 没有正式 MCP1 字段，本窗口没有执行或重复执行。
- Formal map result: `blocked-evidence-role-and-entry-binding`。五个 OSM way `864493176`、`864493175`、`864493245`、`864493246`、`864493247` 仍不能可靠区分主住宅、原车库和入口；不授权移动 placement、Hero 或 Identity。
- Shared integration: 建筑专属候选见 `docs/research/villa-le-bec-massing-map-gate.json`；共享 Fast manifest 与 runtime hook 留给主窗口。
- Performance impact: 未改运行时；不声称性能变化。
- Rollback point: Worktree 基线 `222e7eb` 与 Recovery commit `3044cd89f801250afcd477dfbcbc7da358bf4b11`。

### Iteration 2 — 2026-07-26 XHS Evidence-bound Massing v3

- New evidence: 从 integration Worktree 只读复制小红书图01、02、03、04、05、11和接触表；来源为帖子 `66ba1786000000001e01cb8b`，作者 Ear耳东尘，2024-08-12。本窗口没有再次访问平台。
- Evidence decision: 图01/02/11分别闭合沿街 canonical、入口侧向和后院/侧楼；图03至05证明开放庭院。正文“两栋百年老建筑”为 `author-stated`。
- OSM decision: 保留 `864493176`（沿街主楼）与 `864493175`（院内第二栋）；排除远处另一簇 `864493245/246/247` 为 `unknown-neighbor-or-accessory`，不再生成五个 generic box。
- Generator: 新增建筑专属 `scripts/create_villa_le_bec_massing_model.py`，只输出本建筑 Massing Blend、GLB 和三张固定机位预览。
- Headless result: canonical、side、entrance 通过；两栋保持分体，庭院空隙保留，加入四坡屋顶、沿街凸窗、院内入口和屋面凸起。
- GLB result: SHA-256 `593cc3995046439d973788108ac00cd6176c3f7c8fce67702e98db01d54b975f`；12008 bytes、1 node、1 mesh、3 materials、0 images、120 triangles。
- Collision candidate: 两栋独立 obstacle，墙体最小解析间距 `1.399383` scene units；不得用整体 bounds 封闭庭院。
- Runtime result: Pending。新 GLB SHA 已变化，因此不继承 Recovery runtime pass；共享 hook 和正式地图验收由主窗口完成。
- Blender MCP1: `pending-main-window-batch`；本窗口未执行 MCP 终审。
- Identity: 未衍生。Identity 在 MCP1 和正式 runtime map gate 前保持未授权。
- Wiki: 未执行 `Threejs-3d-research` rescan/回读，不声称已入库。
- Tool note: 沙箱内 Blender 在 Metal backend 初始化阶段崩溃；沙箱外 Headless 运行成功。随后修复生成器 2D Vector 初始化和 Eevee engine 兼容分支，最终完整重建通过。
- Rollback point: 上一建筑 checkpoint `468daf12341ebccd44ae6c681c3c46120bc97592`。
