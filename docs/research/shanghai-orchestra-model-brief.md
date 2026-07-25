# Blender Model Brief: Shanghai Chinese Orchestra Compound

## Scope

- Asset slug: `shanghai-orchestra`
- POI / environment / character: 新华路336号上海民族乐团修缮一期复合场地
- Runtime component: `app/scene/xinhua-road-landmarks.tsx`
- Generator: `scripts/create_xinhua_road_models.py`
- Editable source: `assets/models/source/xinhua-road/shanghai-orchestra.blend`
- Runtime GLB: `public/models/xinhua-road/shanghai-orchestra.glb`
- Start preset: `/?start=orchestra`
- Single-asset build command: `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_xinhua_road_models.py -- --asset=shanghai-orchestra`
- Validation command: `python3 /Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py public/models/xinhua-road/shanghai-orchestra.glb`

## Preflight Gate

- Blender binary and version: `/Applications/Blender.app/Contents/MacOS/Blender`，`5.2.0 LTS`
- Generator dry run / affected assets: 必须使用 `--asset=shanghai-orchestra`；不得覆盖其他 POI
- GLB audit command: 使用上述 `audit_glb.py`
- Local preview command and port: `npm run dev` 或静态构建预览；端口以实际输出为准
- Browser/runtime validation path: `/?start=orchestra`；Massing 门使用 `/?start=orchestra&qaModelTier=massing`
- Existing asset, screenshot, collision and performance baseline: 现有 GLB、Blend、`localBounds`、`localObstacles`、start preset 和旧对照图均保留；旧 Hero 只作迁移基线
- Fallback path for unavailable tools: Headless Blender 为确定性生产入口；Blender MCP 只读场景和做局部视觉校验

## Evidence

完整 URL、SHA-256、子建筑范围和证据边界见 `docs/research/shanghai-orchestra-reference-manifest.json`。

### Reference photos

| Local path | Source URL | View direction | Capture/publish date | Usage boundary |
| --- | --- | --- | --- | --- |
| `docs/research/assets/poi-references/shanghai-orchestra/shanghai-orchestra-exterior-tjad-2019.jpg` | [TJAD 项目发布](https://www.gooood.cn/renovation-project-of-shanghai-chinese-orchestra-located-at-no-336-xinhua-road-phase-i-china-by-tjad.htm) | 从院落朝排练建筑组团 | Published 2019-07 | 多体量、院落与立面系统 |
| `docs/research/assets/poi-references/shanghai-orchestra/shanghai-orchestra-fahua-facade-tjad-2019.jpg` | [TJAD 项目发布](https://www.gooood.cn/renovation-project-of-shanghai-chinese-orchestra-located-at-no-336-xinhua-road-phase-i-china-by-tjad.htm) | 法华镇路朝曲线立面 | Published 2019-07 | 只支持临法华镇路曲线面 |
| `docs/research/assets/poi-references/shanghai-orchestra/shanghai-orchestra-entrance-canopy-tjad-2019.jpg` | [TJAD 项目发布](https://www.gooood.cn/renovation-project-of-shanghai-chinese-orchestra-located-at-no-336-xinhua-road-phase-i-china-by-tjad.htm) | 入口雨棚与琴弦投影细节 | Published 2019-07 | 只支持入口构件 |

### View coverage matrix

| Evidence slot | Local photo | Questions answered | Coverage status | Downgrade if missing |
| --- | --- | --- | --- | --- |
| Canonical | `shanghai-orchestra-exterior-tjad-2019.jpg` | 多栋体量、浅色立面、竖向陶土管和连续院落 | Supported | N/A |
| Side / oblique | `shanghai-orchestra-fahua-facade-tjad-2019.jpg` | 曲线立面与道路关系 | Partial | 屋顶和背面保持低细节 |
| Entrance / identity detail | `shanghai-orchestra-entrance-canopy-tjad-2019.jpg` | 入口雨棚、琴弦构件与阴影节奏 | Supported | 不复制不可读铭牌 |
| Site relationship | canonical 与曲线立面图 | 6/7/8号楼、保留体量、连续院落与成熟树木 | Partial | footprint 子楼绑定前只做分体灰模 |

### Canonical comparison view

- Local path: `docs/research/assets/poi-references/shanghai-orchestra/shanghai-orchestra-exterior-tjad-2019.jpg`
- Direction: 从连续院落朝排练建筑组团
- Why selected: 多体量、浅色墙面、竖向陶土管、开放院落和成熟树木同时可读
- Runtime camera reproduction: 在 `/?start=orchestra` 中沿院落轴线观察，至少三段体量和院落间隙完整入画

### Evidence classification

#### Observed

- 项目包含 6 号声部排练室、7 号大排演厅、8 号交流门厅，以及保留建筑和连续院落。
- 临法华镇路为曲线立面，立面以陶土管表达竹笛和琴弦意向。
- 入口雨棚延续琴弦节奏；狭长室外空间组织为连续院落并保留高大树木。

#### Inferred

- OSM way `864505166` 是当前手工落点附近的首要候选之一，但不能代表整个复合场地，更不能直接绑定 6/7/8 号楼。
- 旧 Hero 的“历史住宅 + 现代玻璃体量”组合可能与 TJAD 工程范围不一致，必须在子楼 footprint 闭合后重构。
- 各子建筑高度和间距可先以现有包络迁移为低精度 Massing，不作为真实测绘结论。

#### Unknown

- 6、7、8 号楼与 OSM 各 footprint 的一一对应。
- 组团屋顶、背立面、保留体量的完整范围和场地北侧边界。
- 精确测绘尺寸、入口罗盘方向和现有场地后续改造状态。

## Quality Contract

### Identity

- Silhouette: 6/7/8号楼与保留体量组成的多段浅色低层组团，中间保留连续院落
- Signature cue 1: 竖向陶土管形成的竹笛/琴弦节奏
- Signature cue 2: 临法华镇路曲线立面
- Signature cue 3: 入口雨棚琴弦构件与连续院落的光影
- Details intentionally omitted: 不可见屋顶设备、背立面、室内、不可读标识和未绑定的子楼细节

### Position

- Coordinate source: 当前手工落点 `[-44.4, 44]`；OSM way `864505166` 仅为单体候选
- Scene position: `[-44.4, 44]`，复合场地绑定前不移动
- Confidence: 手工落点中；compound 子楼绑定低

### Scale

- Known dimensions: TJAD 发布改造面积约 `2205 m²`，不等于 footprint；当前包络 `27 × 21.708925` authored units
- `1 scene unit = 2.7 m` conversion: footprint 子楼闭合后约束水平尺度；垂直高度按照片楼层与陶土管节奏推断
- Allowed visual multiplier: `0.96–1.04`，必须优先修正子楼数量、间距和院落

### Orientation

- Blender front direction: local `-Y`
- Runtime rotation: 当前 `2.761592653589793 rad`，仅作迁移基线
- Canonical view direction: 从院落朝排练建筑组团；精确罗盘方向 pending

### Framing

- Target screen-width occupancy: `56%–72%`
- Maximum canonical direction deviation: `18°`
- Required visible edges / roof extents: 至少三段体量、两条院落间隙、竖向陶土管和最高屋面完整可见
- Player-to-door and player-to-storey scale check: 人物高度约为首层可见高度 `40%–58%`
- Camera target height and clearance: 相机不穿入陶土管、雨棚、树冠或相邻体量

### Materials

- Opaque: 浅暖灰墙、低饱和陶土色竖管、深灰基座与门框
- Glass: 中性低反射门厅玻璃
- Metal: 深灰雨棚与连接件
- Emissive: 默认无；室内亮面仅在证据和预算允许时添加
- Project palette mapping: 使用新华路暖灰、陶土红和低对比深灰

### Collision and access

- Solid obstacles: 6/7/8号楼与保留体量分别碰撞；竖管不逐根做玩家碰撞
- Walkable areas: 连续院落、入口雨棚下、子楼间公共通道和道路侧前场
- Camera clearance: canonical 起点与相机轨迹在实体碰撞外
- Road clearance: 曲线立面和前场不得侵入法华镇路/新华路车行区

### Runtime budget

- Maximum triangles: 90,000
- Maximum nodes: 16
- Maximum materials: 14
- Maximum images: 0
- Maximum GLB bytes: 6,300,000
- Animation/skin requirements: none

### Build provenance

- Baseline GLB SHA / bounds / metrics: 在 Iteration 1 动工前写入 build record
- Expected output paths: `assets/models/source/xinhua-road/shanghai-orchestra.blend`、`public/models/xinhua-road/shanghai-orchestra.glb`
- Build record path: `docs/research/build-records/shanghai-orchestra.json`
- Cache version rule: GLB SHA 变化时同步更新 `cacheVersion` 和 build record

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Massing | 6/7/8号候选、保留体量与院落分体 | canonical 组团轮廓 | 真实 `?start=` 灰模门 | Pending |
| Runtime calibration | 位置、比例、朝向、机位和道路退界 | N/A | compound 绑定前不移动 | Pending |
| Identity | 曲线立面、陶土管节奏、入口雨棚 | 三项构件可读 | Identity 距离可辨认 | Pending |
| Materials | 浅灰、陶土色、深灰和中性玻璃 | 固定机位无黑面 | 项目色盘一致 | Pending |
| Site | 连续院落、成熟树木与开放通道 | 分体接地 | 组团路径开放 | Pending |
| Collision | 子楼分体和院落可达 | 无场地大盒 | 人物/相机可达 | Pending |
| Optimization | 实例化竖管、静态合并与共享材质 | 轮廓不丢失 | 预算通过 | Pending |

## Validation

- [ ] Massing 在真实 `/?start=orchestra&qaModelTier=massing` 中通过
- [ ] 6/7/8号楼、保留体量和院落没有被单一大盒替代
- [ ] 可编辑 `.blend`、GLB、canonical、侧向、街景和三联对照齐全
- [ ] GLB SHA、bounds、节点、三角面、材质、图片和体积进入 build record
- [ ] 人物/相机碰撞、院落可达、道路退界、控制台和首屏资源通过
- [ ] 灰模与终审两个独立检查点无 blocker

## Decision Log

### Iteration 0 — 2026-07-25

- Changes: 用 TJAD 工程证据重定义为 6/7/8号楼、保留体量和连续院落的 compound，标记旧 Hero 布局高风险。
- Evidence used: TJAD 项目发布三张本地化照片与文字资料；2026-07-24 Overpass 快照。
- Graybox runtime result: Pending
- Blender result: 尚未修改 Hero 生成器。
- GLB result: 旧版待审计。
- Three-way comparison result: Pending
- Runtime result: Pending
- Independent review result: 证据门允许 compound Massing；Hero 细化前必须闭合子楼 footprint。
- Remaining inference: 子楼绑定、屋顶/背面、精确尺寸与入口方向。
- Performance impact: 仅新增研究文件，无运行时影响。
- Rollback point: 分支基线 `c0f525a`。
