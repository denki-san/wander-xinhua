# Blender Model Brief: Villa Le Bec

## Scope

- Asset slug: `villa-le-bec`
- POI / environment / character: 新华路321号保护住宅、原车库低体量与花园场地
- Runtime component: `app/scene/xinhua-road-landmarks.tsx`
- Generator: `scripts/create_xinhua_road_models.py`
- Editable source: `assets/models/source/xinhua-road/villa-le-bec.blend`
- Runtime GLB: `public/models/xinhua-road/villa-le-bec.glb`
- Start preset: `/?start=villa-le-bec`
- Single-asset build command: `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_xinhua_road_models.py -- --asset=villa-le-bec`
- Validation command: `python3 /Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py public/models/xinhua-road/villa-le-bec.glb`

## Preflight Gate

- Blender binary and version: `/Applications/Blender.app/Contents/MacOS/Blender`，`5.2.0 LTS`
- Generator dry run / affected assets: 必须使用 `--asset=villa-le-bec`；不得覆盖其他 POI
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

### View coverage matrix

| Evidence slot | Local photo | Questions answered | Coverage status | Downgrade if missing |
| --- | --- | --- | --- | --- |
| Canonical | `villa-le-bec-timeout-street-candidate-2022.jpg` | 主住宅、屋顶、花园轴线和一侧低体量 | Supported | N/A |
| Side / oblique | `villa-le-bec-real.jpg` | 主立面偏角、凸出体、窗洞和檐口 | Partial | 同楼侧后面保持低细节 |
| Entrance / identity detail | 两张外观图 | 山墙/老虎窗、白墙、深色基座和绿框 | Partial | 历史入口方向保持 unknown |
| Site relationship | canonical 与官方花园图 | 约800平方米花园、露台、主住宅与原车库关系 | Supported | 商业桌椅与招牌不固化 |

### Canonical comparison view

- Local path: `docs/research/assets/poi-references/villa-le-bec/villa-le-bec-timeout-street-candidate-2022.jpg`
- Direction: 从花园轴线朝主住宅
- Why selected: 主住宅红瓦坡顶、老虎窗、白色墙体、深色基座、花园轴线和一侧低矮体量同时可读
- Runtime camera reproduction: 在 `/?start=villa-le-bec` 中从花园一侧观察，主屋顶和一侧低体量完整入画

### Evidence classification

#### Observed

- 地址为新华路321号，场地包含主住宅、由原车库改造的低体量空间和花园露台。
- 主住宅可见红褐坡屋顶、老虎窗、暖白墙体、深色基座与绿/深色门窗框。
- 上海市政府英文资料描述场地有约800平方米法式花园。

#### Inferred

- OSM way `864493176` 是当前手工落点附近的首要 footprint 候选，但尚未由门牌字段闭合。
- 原车库与主住宅的具体边界只获得局部照片支持；Massing 先分体，Hero 不补造不可见连接。
- 保护页的 `1912` 与商业资料常见的 `1924` 冲突，不把年份写入运行时模型。

#### Unknown

- 主住宅同一建筑的完整侧面、背面、精确测绘尺寸与历史入口罗盘方向。
- OSM way `864493176` 的最终门牌归属及原车库 footprint。
- 商业经营状态、店招、桌椅和花园软装的长期稳定性。

## Quality Contract

### Identity

- Silhouette: 两至三层坡屋顶主住宅、老虎窗/山墙与一侧低矮原车库体量
- Signature cue 1: 暖白墙体、深色基座与红褐瓦顶
- Signature cue 2: 屋顶老虎窗和不对称凸出体
- Signature cue 3: 主住宅—低车库—花园轴线的分体场地关系
- Details intentionally omitted: 年代铭牌、临时品牌、室内、桌椅、不可见背立面和不可读五金

### Position

- Coordinate source: 当前手工落点 `[-34.1, 88.8]`；OSM way `864493176` 仅为待核候选
- Scene position: `[-34.1, 88.8]`，地图闭合前不移动
- Confidence: 手工落点中；OSM 绑定低

### Scale

- Known dimensions: 公开资料只支持约800平方米花园，建筑测绘尺寸 unknown；当前包络 `19 × 16.7` authored units
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
| Massing | 主住宅、低车库、花园轴线和坡屋顶 | canonical 分体轮廓 | 真实 `?start=` 灰模门 | Pending |
| Runtime calibration | 位置、比例、朝向、机位和道路退界 | N/A | footprint 绑定前不移动 | Pending |
| Identity | 老虎窗、凸出体、深色基座与低车库 | 三项构件可读 | Identity 距离可辨认 | Pending |
| Materials | 白墙、红褐瓦、深绿/深灰门窗 | 固定机位无黑面 | 项目色盘一致 | Pending |
| Site | 花园轴线、露台、低矮植被与开放通道 | 场地分层接地 | 公共路径开放 | Pending |
| Collision | 主楼/车库分体与开放花园 | 无整院大盒 | 人物/相机可达 | Pending |
| Optimization | 静态合并与共享材质 | 轮廓不丢失 | 预算通过 | Pending |

## Validation

- [ ] Massing 在真实 `/?start=villa-le-bec&qaModelTier=massing` 中通过
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
