# Blender Model Brief: Xinhua Road Massing Family

## Scope

- Asset slugs: `shanghai-cinema`、`film-art-center`、`one-step-garden`、`xinhua-villas-211`、`xinhua-villas-329`、`house-315`、`villa-le-bec`、`shanghai-orchestra`、`hudec-memorial`、`xinhua-pocket-park`、`xinhua-community-center`、`debi-fahua-525`、`fahua-heritage`、`fics-xinhua-365`
- POI / environment / character: 新华路 14 个道路 POI 的独立 Massing 文件族
- Runtime component: `app/scene/xinhua-road-massing.tsx`
- Generator: `scripts/create_xinhua_road_massing_models.py`
- Editable source: `assets/models/source/tiers/xinhua-road/massing/<slug>-massing.blend`
- Runtime GLB: `public/models/tiers/xinhua-road/massing/<slug>-massing.glb`
- Start preset: 使用每个 POI 既有 `?start=`；灰模专用入口另加 `qaModelTier=massing`
- Single-asset build command: `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_xinhua_road_massing_models.py -- --asset=<slug>`
- Validation command: `python3 /Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py <glb>`

## Preflight Gate

- Blender binary and version: `/Applications/Blender.app/Contents/MacOS/Blender`，`5.2.0 LTS`
- Generator dry run / affected assets: 必须显式 `--asset=<slug>` 或 `--all`；每次只写 tier 目录，不覆盖 Hero
- GLB audit command: 使用上述 `audit_glb.py`
- Local preview command and port: `npm run dev` 或静态构建预览，端口以实际输出为准
- Browser/runtime validation path: `/?start=<preset>&qaModelTier=massing`
- Existing asset, screenshot, collision and performance baseline: `app/scene/xinhua-road-landmarks-data.json` 中的 position、yaw、scale、localBounds、localObstacles 和既有 start preset
- Fallback path for unavailable tools: Headless Blender 是生产入口；Blender MCP 仅查看，不保留未回写的鼠标改动

## Evidence

主照片映射见 `docs/research/poi-reference-manifest.json`；完整 V2 证据已存在的资产继续引用其专项 manifest 与 Brief。未闭合的照片槽位保持 `unknown`，Massing 只使用现有包络和分体碰撞，不引入新立面细节。

### View coverage matrix

| Asset | Canonical | Side / oblique | Entrance / identity | Site | Massing boundary |
| --- | --- | --- | --- | --- | --- |
| `shanghai-cinema` | Complete | Complete | Complete | Complete | 保留 V2 Hero 的体块层级；本文件只生成低档代理 |
| `film-art-center` | Complete | Partial | Complete | Complete | 后立面 unknown |
| `one-step-garden` | Subject mismatch | Missing | Missing | Partial | 只使用既有包络，禁止进入 Hero 细化 |
| `xinhua-villas-211` | Compound entrance | Member partial | Member partial | Partial | 多栋分体，不把成员合并 |
| `xinhua-villas-329` | Member unknown | Member partial | Member partial | Partial | 多栋分体，代表楼绑定 pending |
| `house-315` | Complete front | Missing | Partial | Context only | 侧后立面 unknown |
| `villa-le-bec` | Single view | Missing | Partial | Partial | 只用既有包络 |
| `shanghai-orchestra` | Single view | Missing | Partial | Partial | 只用既有包络 |
| `hudec-memorial` | Front + west | Partial | Partial | Partial | footprint 中心与正向高风险 |
| `xinhua-pocket-park` | Entrance | Partial | Signage | Complete | 墙、花池和路径分离 |
| `xinhua-community-center` | Front | Missing | Toy house | Partial | footprint unknown，仅保留旧包络 |
| `debi-fahua-525` | Front | Courtyard | Garden/detail | Partial | compound 分体 |
| `fahua-heritage` | Front | Missing | Front detail | Partial | 三间构筑物，不冒充建筑 |
| `fics-xinhua-365` | Aerial | Main/courtyard | Multiple | Complete | compound 分体 |

### Canonical comparison view

- Local path: 每个资产使用 `docs/research/poi-reference-manifest.json` 的 `canonicalReference`
- Direction: 已知方向沿用专项 Brief；未知方向不从旧模型反推为事实
- Why selected: Massing 只校验主体数量、轮廓包络、屏幕占比、地面接触和道路退界
- Runtime camera reproduction: 每个资产既有 `?start=` 加 `qaModelTier=massing`

### Evidence classification

#### Observed

- 每个 Massing 文件都有独立 slug、Blend、GLB、固定视角预览和 build record。
- 水平包络来自当前 `localObstacles` 或 `localBounds`；运行时位置、yaw 和 scale 保持当前基线，地图核验前不移动。
- 已经拆分的 compound 碰撞继续作为运行时碰撞与可达性合同，不会被单一大盒替换。
- 生产 Massing 使用当前 Hero 的低分辨率 voxel remesh 保留主体、坡屋顶、前出体量和 compound 间隙；单材质、低三角面，不会把所有资产退化成同一种方盒。

#### Inferred

- Massing 高度从现有 Hero GLB 的导入包围盒读取，只是迁移基线，不证明真实测绘高度。
- remesh 保留当前 Hero 的相对高度，但旧 Hero 本身不等于照片已验证；正式地图和照片闭合后仍需按成员校正。
- `gable / hip / mixed / flat` 只作为预期轮廓审查标签；实际 Massing 几何来自低分辨率重网格，不额外虚构屋顶。
- 当前 `localObstacles` 同时包含少量围墙、水池或展板时，灰模会保留其占地，但不会宣称它们是楼体。

#### Unknown

- 大多数 POI 的精确 footprint、入口方向、测绘高度、侧后立面和屋顶。
- 手工落点与附近 OSM footprint 的最终一一绑定。
- 一步花园旧图主体、329弄代表楼门牌、FICS/德必所有子建筑边界。

## Quality Contract

### Identity

- Silhouette: 只保留可运行的建筑/设施总轮廓和 compound 分体
- Signature cue 1: 分体数量与占地关系
- Signature cue 2: 总宽、总深和最高体量
- Signature cue 3: 开放路径、庭院和广场不得被单一代理封死
- Details intentionally omitted: 所有门窗、材质纹理、标识、不可证实屋顶和装饰

### Position

- Coordinate source: `app/scene/xinhua-road-landmarks-data.json`
- Scene position: 每个资产沿用现有 `position`
- Confidence: 电影院较高；其余从低到中，详见总注册表和地图审计

### Scale

- Known dimensions: 水平尺寸来自现有 `localBounds/localObstacles`；真实米制证据不全
- `1 scene unit = 2.7 m` conversion: 资产源文件直接使用 authored units，不乘 Explore `1.65`
- Allowed visual multiplier: Massing 文件根变换固定 `1.0`；只允许在运行时沿用当前 per-asset scale 作为迁移基线

### Orientation

- Blender front direction: local `-Y`
- Runtime rotation: 每个资产沿用现有 `yaw`
- Canonical view direction: 已知者按专项 Brief；未知者明确 pending

### Framing

- Target screen-width occupancy: 沿用各 start preset 的既有 Hero 基线，允许 `±10%`
- Maximum canonical direction deviation: 已知资产 `15°`；未知资产不设伪精确角度
- Required visible edges / roof extents: 总体块四边和最高点完整入画
- Player-to-door and player-to-storey scale check: Massing 无门，人物与首层高度比只作风险提示
- Camera target height and clearance: 相机与人物不得进入灰模实体

### Materials

- Opaque: 单一低饱和暖灰，根据 asset slug 生成稳定轻微色差；同资产屋顶不另加材质
- Glass: 无
- Metal: 无
- Emissive: 无
- Project palette mapping: 与低配地图的暖灰、低对比层级一致

### Collision and access

- Solid obstacles: 逐条复现 `localObstacles`；没有时退回 `localBounds`
- Walkable areas: compound 体块之间、口袋公园路径、庭院、广场和道路
- Camera clearance: 每个 start preset 自动检查
- Road clearance: 任何灰模世界包络不得进入道路安全区

### Runtime budget

- Maximum triangles: 每资产 `1,200`
- Maximum nodes: `16`
- Maximum materials: `1`
- Maximum images: `0`
- Maximum GLB bytes: `160,000`
- Animation/skin requirements: none

### Build provenance

- Baseline GLB SHA / bounds / metrics: 从当前 Hero 导入时记录 SHA 与高度包络
- Expected output paths: `assets/models/source/tiers/xinhua-road/massing/`、`public/models/tiers/xinhua-road/massing/`
- Build record path: `docs/research/build-records/tiers/xinhua-road/massing/<slug>-massing.json`
- Cache version rule: Massing GLB SHA 变化时更新 build record 与 QA manifest；不复用 Hero cache key

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Massing generation | 14 个独立 Blend / GLB | canonical + side 固定机位 | 结构预算通过；独审要求 8 项重做 |
| Runtime calibration | 14 个 `?start=&qaModelTier=massing` | N/A | 加载/相机证据通过；正式 Massing 门 0/14 |
| Map binding | OSM / address / footprint / yaw evidence | N/A | 3 bound / 9 pending / 2 non-building |
| Collision | 分体包络 | 体块无重叠异常 | 首帧起点通过；走近入口、绕行和开放路径证据缺失 |
| Optimization | 单材质、无图像、低三角面 | GLB audit | 14/14 请求响应、0 failure |

## Validation

- [x] 14 个资产均有 `.blend`、`.glb`、canonical、side、build record
- [x] GLB 根变换、bounds、节点、三角面、材质、图片、体积和 SHA 通过
- [x] 参考照片未嵌入 GLB
- [ ] 每个灰模在实际 `?start=` 页面通过主审与独审；当前 6 项只允许保留几何，8 项必须重做
- [x] compound 的庭院、弄堂、广场和公园路径使用分体包络，不以单一大盒封住
- [x] 无可比性能基线时只报告当前采样，不声称提升
- [x] 独立审查完成，并把阻断结论写回 QA 与 build records

## Decision Log

### Iteration 0 — 2026-07-25

- Changes: 冻结 14 个道路 POI 的 Massing 文件合同；保持所有未知项与地图绑定风险。
- Evidence used: 主 POI 清单、三个新专项 manifest、既有 V2 Brief、请求 POI 旧研究、运行时 placement 数据。
- Graybox runtime result: Pending
- Blender result: Pending
- GLB result: Pending
- Three-way comparison result: Pending
- Runtime result: Pending
- Independent review result: 允许生成不带立面细节的分体灰模；Identity/Hero 仍需逐资产证据门。
- Remaining inference: 高度、入口方向、精确 footprint 和部分主体边界。
- Performance impact: Pending
- Rollback point: 分支基线 `c0f525a`。

### Iteration 1 — 2026-07-25

- Changes: 从现有 Hero 派生 14 个低面数分体 Massing；新增真实 Three.js tier override、逐资产运行时截图、联系表与运行时 QA 记录；相机 `start` 与实体布点净空锚点拆分。
- Evidence used: 14 个 build records、14 组 canonical/side/Three.js 图、CDP 14/14 请求响应、相机 QA 遥测、地图绑定审计。
- Graybox runtime result: 主审记录完整；独立审查正式通过 0/14，6 项体块可保留但门未过，8 项必须重做。
- Blender result: 14 个独立可编辑 Blend 和双视角固定预览通过。
- GLB result: 14 个均为单节点、单网格、单材质、无图片/贴图、≤900 triangles、≤93KB，根变换无平移/旋转/缩放。
- Three-way comparison result: 14 组 Blender canonical / side / Three.js 联系表齐全。
- Runtime result: 14/14 playable、单 canvas、`spring-clear`、`blocker none`；tier 文件 14 request / 14 response / 0 failure。
- Independent review result: Blocked。`film-art-center`、`one-step-garden`、`xinhua-villas-329`、`villa-le-bec`、`shanghai-orchestra`、`xinhua-pocket-park`、`debi-fahua-525`、`fics-xinhua-365` 必须改用 footprint 驱动的净体块；其余 6 项补 triptych、固定街道机位、地图闭合和确定性走近/绕行。
- Remaining inference: 九个建筑 OSM 绑定、两个非建筑 site feature、真实高度、入口方向和未见立面。
- Performance impact: 记录当前静态生产预览，不声称相对性能提升。
- Rollback point: 分支基线 `c0f525a`；所有新 Massing 与 QA 产物位于独立 tier 路径。
