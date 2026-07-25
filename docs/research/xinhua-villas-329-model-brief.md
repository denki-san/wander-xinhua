# Blender Model Brief: Xinhua Villas 329

## Scope

- Asset slug: `xinhua-villas-329`
- POI / environment / character: 多栋不同住宅组成的复合院落 POI
- Runtime component: `app/scene/xinhua-road-landmarks.tsx`
- Generator: `scripts/create_xinhua_road_models.py`
- Editable source: `assets/models/source/xinhua-road/xinhua-villas-329.blend`
- Runtime GLB: `public/models/xinhua-road/xinhua-villas-329.glb`
- Start preset: `/?start=villas329`
- Single-asset build command: `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_xinhua_road_models.py -- --asset=xinhua-villas-329`
- Validation command: `python3 /Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py public/models/xinhua-road/xinhua-villas-329.glb`

## Preflight Gate

- Blender binary and version: `/Applications/Blender.app/Contents/MacOS/Blender`，`5.2.0 LTS`
- Generator dry run / affected assets: 支持单资产，禁止覆盖其他地标
- GLB audit command: 使用上述 `audit_glb.py`
- Local preview command and port: `npm run dev` 或静态构建预览，端口以实际输出为准
- Browser/runtime validation path: `/?start=villas329`
- Existing asset, screenshot, collision and performance baseline: 保留旧 Blend、GLB、bounds、obstacle 和截图
- Fallback path for unavailable tools: Headless Blender 为生产入口；MCP 只检查

## Evidence

完整来源、SHA-256、主体边界和视角覆盖见 `docs/research/xinhua-villas-329-reference-manifest.json`。

### Reference photos

| Local path | Source URL | View direction | Capture/publish date | Usage boundary |
| --- | --- | --- | --- | --- |
| `docs/research/assets/poi-references/xinhua-villas-329/xinhua-villas-329-17-official-2024.jpg` | [长宁区人民政府](https://www.shcn.gov.cn/col7698/20240208/1254319.html) | 329弄17号正面 | Published 2024-02-08 | 只证明17号 |
| `docs/research/assets/poi-references/xinhua-villas-329/xinhua-villas-329-38-official-2025.jpg` | [长宁区人民政府](https://www.shcn.gov.cn/col6991/20251124/1301891.html) | 329弄38号正面斜视 | Published 2025-11-22 | 只证明38号 |
| `docs/research/assets/landmark-comparison/xinhua-villas-329-real.jpg` | [澎湃新闻](https://www.thepaper.cn/newsDetail_forward_28954961) | 旧版代表建筑正面 | Unknown | 同院落但具体门牌未知 |

### View coverage matrix

| Evidence slot | Local photo | Questions answered | Coverage status | Downgrade if missing |
| --- | --- | --- | --- | --- |
| Canonical | 旧版代表图 | 院落气质与一栋候选立面 | Partial / member unknown | 正式 Hero 前必须绑定具体门牌 |
| Side / oblique | `xinhua-villas-329-38-official-2025.jpg` | 38号局部进深 | Partial / member only | 不外推到17号或36号 |
| Entrance / identity detail | 17号与38号正面 | 17号西班牙式轮廓、38号入口节奏 | Partial | 只制作各自可见构件 |
| Site relationship | 旧版代表图 | 花园与住宅关系 | Partial | 弄堂入口和完整院落仍待证据 |

### Canonical comparison view

- Local path: `docs/research/assets/landmark-comparison/xinhua-villas-329-real.jpg`
- Direction: 未知；正式实施前需绑定具体成员与观察方向
- Why selected: 保持与旧版模型可比，但不会把它冒充整个329弄
- Runtime camera reproduction: `/?start=villas329` 先复现旧版构图；成员绑定后更新为可重复的入口或特定建筑机位

### Evidence classification

#### Observed

- 329弄17号建筑面积约 `358 m²`、用地约 `609 m²`，为 1925 年西班牙式建筑。
- 329弄36号“蛋糕房”为少见的双层圆形砖木住宅，公开描述包含蓝色屋顶、欧式大理石喷泉与玻璃砖。
- 329弄17号、38号、36号是不同成员建筑；照片与文字不可混为一栋。

#### Inferred

- 当前落点附近 OSM ways `864493174`、`864493244`、`864485664` 等是成员候选，但均无门牌标签。
- Hero package 需等成员绑定后再选择代表；在此之前只允许 footprint massing 与入口/院落级表达。
- 当前 `-0.38 rad` 与部分候选 footprint 轴线接近，仍不能证明入口正向。

#### Unknown

- 17号、38号、36号与 OSM way 的一一对应。
- 弄堂入口 canonical、同楼侧后立面、精确高度和屋顶背坡。
- 旧版代表图中的具体门牌。

## Quality Contract

### Identity

- Silhouette: 分散花园住宅与弄堂形成复合院落，不压成单一盒体
- Signature cue 1: 17号西班牙式体量与花园退界
- Signature cue 2: 36号圆形双层体量、蓝色屋顶与玻璃砖（取得照片后才实施）
- Signature cue 3: 不同成员之间可读的轮廓差异
- Details intentionally omitted: 无门牌绑定的立面、背面、屋顶和室内

### Position

- Coordinate source: 当前 POI `[-42.13, 79.48]`；附近 OSM footprint 为待核候选
- Scene position: 核验前不移动
- Confidence: 院落范围中；成员绑定低

### Scale

- Known dimensions: 17号建筑面积约 `358 m²`、用地约 `609 m²`
- `1 scene unit = 2.7 m` conversion: 最终以逐栋 footprint 导出水平尺寸；高度保留 observed/inferred/unknown
- Allowed visual multiplier: package `0.98–1.02`；移除历史 `0.62` 根缩放依赖

### Orientation

- Blender front direction: local `-Y`
- Runtime rotation: 当前 `-0.38 rad`
- Canonical view direction: Pending specific member / entrance binding

### Framing

- Target screen-width occupancy: `55%–75%`
- Maximum canonical direction deviation: 绑定后 `12°`
- Required visible edges / roof extents: 代表成员屋顶、入口和花园退界完整入画
- Player-to-door and player-to-storey scale check: 人物不得大于首层可见高度的 `60%`
- Camera target height and clearance: 不穿墙、不进入树冠

### Materials

- Opaque: 暖灰墙体、低饱和红/蓝屋瓦、红砖
- Glass: 深灰窗与36号玻璃砖的非透明风格化表达
- Metal: 深灰栏杆
- Emissive: 无
- Project palette mapping: 与新华路低饱和街区一致

### Collision and access

- Solid obstacles: 每栋主体和围墙拆分
- Walkable areas: 弄堂、入口、花园公共路径
- Camera clearance: start preset 在所有实体外
- Road clearance: 不侵入新华路车行道

### Runtime budget

- Maximum triangles: 85,000
- Maximum nodes: 12
- Maximum materials: 14
- Maximum images: 0
- Maximum GLB bytes: 6,200,000
- Animation/skin requirements: none

### Build provenance

- Baseline GLB SHA / bounds / metrics: 动工前补录
- Expected output paths: `assets/models/source/xinhua-road/xinhua-villas-329.blend`、`public/models/xinhua-road/xinhua-villas-329.glb`
- Build record path: `docs/research/build-records/xinhua-villas-329.json`
- Cache version rule: 二进制变化即更新 `cacheVersion`

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Massing | 逐栋 footprint、入口与院落灰模 | 不合并成员 | `?start=villas329` 灰模门 | Pending |
| Runtime calibration | 位置、比例、轴线与入口 | N/A | 逐栋占地和道路退界 | Pending |
| Identity | 17/36/38号各自构件 | 证据不串楼 | 地图距离可读 | Blocked by member binding / photos |
| Materials | 分栋墙、瓦、砖、玻璃 | 无黑面 | 色盘一致 | Pending |
| Site | 花园、喷泉候选、弄堂和围墙 | 场地层级 | 主路径开放 | Pending |
| Collision | 分栋碰撞 | 无大盒封场 | 可达性通过 | Pending |
| Optimization | Hero/Identity/Massing 分档 | 独立 GLB | 加载策略通过 | Pending |

## Validation

- [ ] 与211弄共同建立29栋不重不漏清单
- [ ] 17、36、38号成员与 OSM way 绑定；找不到则明确 `unknown`
- [ ] Massing 在真实 `/?start=villas329` 通过后才进入 Identity
- [ ] Hero、Identity、Massing 各有 GLB、Blend 来源和 build record
- [ ] `test_` canonical、侧向、运行时与三联对照齐全
- [ ] 浏览器 console、首屏资源、碰撞、遮挡和性能协议通过

## Decision Log

### Iteration 0 — 2026-07-25

- Changes: 本地化17号、38号官方照片，记录36号公开文字事实并建立成员边界。
- Evidence used: 长宁区政府、上海市文旅推广网与 2026-07-24 OSM 快照。
- Graybox runtime result: Pending
- Blender result: 尚未修改生成器。
- GLB result: 旧版待审计。
- Three-way comparison result: Pending
- Runtime result: Pending
- Independent review result: 只允许 footprint 灰模；Hero/Identity 需成员绑定。
- Remaining inference: 17/36/38号 OSM 对应、入口和侧后立面。
- Performance impact: 仅研究文件。
- Rollback point: 分支基线 `c0f525a`。
