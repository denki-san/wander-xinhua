# Blender Model Brief: Xinhua Villas 211

## Scope

- Asset slug: `xinhua-villas-211`
- POI / environment / character: 29 栋不同住宅组成的复合院落 POI
- Runtime component: `app/scene/xinhua-road-landmarks.tsx`
- Generator: `scripts/create_xinhua_road_models.py`
- Editable source: `assets/models/source/xinhua-road/xinhua-villas-211.blend`
- Runtime GLB: `public/models/xinhua-road/xinhua-villas-211.glb`
- Start preset: `/?start=villas`
- Single-asset build command: `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_xinhua_road_models.py -- --asset=xinhua-villas-211`
- Validation command: `python3 /Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py public/models/xinhua-road/xinhua-villas-211.glb`

## Preflight Gate

- Blender binary and version: `/Applications/Blender.app/Contents/MacOS/Blender`，`5.2.0 LTS`
- Generator dry run / affected assets: 支持单资产；不得覆盖其他 13 个沿街地标
- GLB audit command: 使用上述 `audit_glb.py`
- Local preview command and port: `npm run dev` 或静态构建预览，端口以实际输出为准
- Browser/runtime validation path: `/?start=villas`
- Existing asset, screenshot, collision and performance baseline: 保留旧 Blend、GLB、bounds、7 个障碍物和旧截图
- Fallback path for unavailable tools: Headless Blender 生产；MCP 仅检查

## Evidence

完整来源、SHA-256、主体边界和视角覆盖见 `docs/research/xinhua-villas-211-reference-manifest.json`。

### Reference photos

| Local path | Source URL | View direction | Capture/publish date | Usage boundary |
| --- | --- | --- | --- | --- |
| `docs/research/assets/poi-references/xinhua-villas-211/xinhua-villas-overview-official-2023.jpg` | [上海市文旅推广网](https://www.meet-in-shanghai.net/tc/guide/stroll-xinhua-road-walk-into-the-old-timethe-building-can-be-read-863025/) | 新华路进入弄堂 | Published 2023-06-24 | 复合院落 canonical |
| `docs/research/assets/poi-references/xinhua-villas-211/xinhua-villas-211-1-official-2025.jpg` | [长宁区人民政府](https://www.shcn.gov.cn/col6991/20251124/1301891.html) | 211弄1号正面 | Published 2025-11-22 | 只证明 1 号 |
| `docs/research/assets/poi-references/xinhua-villas-211/xinhua-villas-211-2-official-2025.jpg` | [长宁区人民政府](https://www.shcn.gov.cn/col6991/20251124/1301891.html) | 211弄2号正面斜视 | Published 2025-11-22 | 只证明 2 号 |

### View coverage matrix

| Evidence slot | Local photo | Questions answered | Coverage status | Downgrade if missing |
| --- | --- | --- | --- | --- |
| Canonical | `xinhua-villas-overview-official-2023.jpg` | 入口、弄堂尺度、围墙和树木 | Supported | N/A |
| Side / oblique | `xinhua-villas-211-2-official-2025.jpg` | 2 号局部纵深 | Partial / member only | 不外推到 1 号或其他 27 栋 |
| Entrance / identity detail | overview + 1/2 号 | 入口、红筒瓦、阳台、烟囱、花园 | Partial | 只制作证据覆盖的识别构件 |
| Site relationship | overview | 弄堂和成员建筑关系 | Supported at entrance | 内部 29 栋以 OSM footprint 单独登记 |

### Canonical comparison view

- Local path: `docs/research/assets/poi-references/xinhua-villas-211/xinhua-villas-overview-official-2023.jpg`
- Direction: 从新华路朝弄堂内部观察
- Why selected: 运行时 POI 表达的是复合院落，而不是把不同成员照片拼成一栋虚构建筑
- Runtime camera reproduction: `/?start=villas` 对准入口轴线，门洞、首排住宅、弄堂和树冠同时入画

### Evidence classification

#### Observed

- 211弄与329弄合计含 29 栋花园住宅；本 POI 是多建筑复合院落。
- 211弄1号为邬达克典型住宅作品之一，用地约 `1240 m²`、建筑面积约 `563 m²`，建于 1940 年后。
- 211弄1号公开描述为西班牙式别墅，可见红色筒瓦、室外阳台、带尖拱的砖烟囱和花园。
- 211弄2号与1号是不同成员建筑，照片不可合并到一个模型。

#### Inferred

- 当前落点附近至少有 OSM ways `864485596`、`864485597`、`864485676` 等多个住宅候选，符合复合院落性质，但缺少门牌标签。
- POI Hero 应采用“入口 + 可确认成员 + 其余 footprint massing”的 package；每栋 OSM footprint 保持独立 ID。
- 当前 `-0.38 rad` 与部分候选 footprint 轴线接近，但入口正向仍需现场/官方图与地图共同确认。

#### Unknown

- 29 栋建筑在211弄与329弄之间的完整门牌—OSM way 对照。
- 211弄1号和2号的同楼侧后立面、精确高度、屋顶背坡与入口罗盘方向。
- 其他成员建筑的立面材料和独有身份。

## Quality Contract

### Identity

- Silhouette: 狭长弄堂、分散花园住宅和树冠围合形成复合院落，不表现为单一大楼
- Signature cue 1: 211弄入口和连续弄堂轴线
- Signature cue 2: 1号红筒瓦、室外阳台与尖拱砖烟囱
- Signature cue 3: 多栋不同体量住宅之间的花园退界
- Details intentionally omitted: 无门牌绑定的成员立面、不可见背面和受保护标识

### Position

- Coordinate source: 当前 POI `[38.32, 110.67]`；附近 OSM footprint 候选尚待逐栋绑定
- Scene position: 核验前保留 `[38.32, 110.67]`
- Confidence: 复合院落范围中；单栋绑定低

### Scale

- Known dimensions: 1号用地约 `1240 m²`、建筑面积约 `563 m²`
- `1 scene unit = 2.7 m` conversion: 水平尺度以逐栋 OSM footprint 为 observed；高度按层数/照片推断并明确标记
- Allowed visual multiplier: package 整体 `0.98–1.02`；禁止用 `0.62` 的历史根缩放掩盖源模型尺度问题

### Orientation

- Blender front direction: local `-Y`
- Runtime rotation: 当前 `-0.38 rad` 作为基线
- Canonical view direction: 从新华路沿弄堂轴线向内

### Framing

- Target screen-width occupancy: 入口 package `55%–75%`
- Maximum canonical direction deviation: `12°`
- Required visible edges / roof extents: 入口、首排两侧住宅和弄堂消失点均入画
- Player-to-door and player-to-storey scale check: 弄堂宽度至少容纳人物与相机安全通过
- Camera target height and clearance: 不进入门楼、围墙或树冠

### Materials

- Opaque: 暖灰墙体、低饱和红瓦、红砖烟囱
- Glass: 深灰窗玻璃
- Metal: 深灰栏杆
- Emissive: 无
- Project palette mapping: 以新华路暖灰、红瓦和浓绿树冠为主

### Collision and access

- Solid obstacles: 每栋建筑与围墙分别建立碰撞；禁止一个大盒封住弄堂
- Walkable areas: 弄堂主轴、入口和可见花园路径
- Camera clearance: canonical 首帧与确定性移动路径均避开实体
- Road clearance: 入口不侵入新华路车行道

### Runtime budget

- Maximum triangles: 85,000
- Maximum nodes: 12
- Maximum materials: 14
- Maximum images: 0
- Maximum GLB bytes: 6,200,000
- Animation/skin requirements: none

### Build provenance

- Baseline GLB SHA / bounds / metrics: 动工前补录
- Expected output paths: `assets/models/source/xinhua-road/xinhua-villas-211.blend`、`public/models/xinhua-road/xinhua-villas-211.glb`
- Build record path: `docs/research/build-records/xinhua-villas-211.json`
- Cache version rule: 二进制变化即更新 `cacheVersion`

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Massing | 入口、已绑定 footprint 与弄堂灰模 | package 轮廓 | `?start=villas` 灰模门 | Pending |
| Runtime calibration | 逐栋位置、水平尺度、轴线与入口正向 | N/A | 弄堂通行和首帧构图 | Pending |
| Identity | 入口、1号身份构件、成员差异 | 不混合照片主体 | 地图距离可读 | Pending |
| Materials | 墙、瓦、砖、深窗 | 无黑面 | 项目色盘一致 | Pending |
| Site | 花园、围墙、弄堂、树木 | 场地层级 | 入口开放 | Pending |
| Collision | 分栋实体与开放弄堂 | 无整院大盒 | 可达性通过 | Pending |
| Optimization | Hero/Identity/Massing 三档导出 | 每档构件不串层 | 加载策略通过 | Pending |

## Validation

- [ ] 29 栋成员的跨211/329清单不重不漏
- [ ] 至少把已建模成员绑定到 OSM footprint；未绑定成员明确 `unknown`
- [ ] 灰模先在真实 `/?start=villas` 通过
- [ ] Hero、Identity、Massing 各有独立英文命名 GLB 与 build record
- [ ] canonical、侧向、运行时及三联对照均以 `test_` 开头
- [ ] 浏览器 console、首屏资源、碰撞、遮挡和性能协议通过

## Decision Log

### Iteration 0 — 2026-07-25

- Changes: 新增官方入口、211弄1号和2号照片，明确复合院落与成员照片边界。
- Evidence used: 上海市文旅推广网、长宁区政府与 2026-07-24 OSM 快照。
- Graybox runtime result: Pending
- Blender result: 尚未修改生成器。
- GLB result: 旧版待审计。
- Three-way comparison result: Pending
- Runtime result: Pending
- Independent review result: 可开始 footprint 灰模；不得把成员照片合并成单栋 Hero。
- Remaining inference: 29 栋门牌绑定、侧后立面和高度。
- Performance impact: 仅研究文件。
- Rollback point: 分支基线 `c0f525a`。
