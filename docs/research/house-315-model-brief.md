# Blender Model Brief: House 315

## Scope

- Asset slug: `house-315`
- POI / environment / character: 新华路沿街真实建筑
- Runtime component: `app/scene/xinhua-road-landmarks.tsx`
- Generator: `scripts/create_xinhua_road_models.py`
- Editable source: `assets/models/source/xinhua-road/house-315.blend`
- Runtime GLB: `public/models/xinhua-road/house-315.glb`
- Start preset: `/?start=house315`
- Single-asset build command: `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_xinhua_road_models.py -- --asset=house-315`
- Validation command: `python3 /Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py public/models/xinhua-road/house-315.glb`

## Preflight Gate

- Blender binary and version: `/Applications/Blender.app/Contents/MacOS/Blender`，`5.2.0 LTS`
- Generator dry run / affected assets: 生成器支持 `--asset=house-315`，本轮只允许重建该资产
- GLB audit command: 使用上述 `audit_glb.py`
- Local preview command and port: `npm run dev` 或构建后的本地静态预览；端口以实际输出为准
- Browser/runtime validation path: `/?start=house315`
- Existing asset, screenshot, collision and performance baseline: 旧版 Blend、GLB、`localBounds`、`localObstacles` 和旧对照图均保留为回退基线
- Fallback path for unavailable tools: Headless Blender 为确定性生产入口；Blender MCP 仅用于读取场景和局部校验

## Evidence

完整来源、原图 URL、SHA-256 与证据边界见 `docs/research/house-315-reference-manifest.json`。

### Reference photos

| Local path | Source URL | View direction | Capture/publish date | Usage boundary |
| --- | --- | --- | --- | --- |
| `docs/research/assets/poi-references/house-315/house-315-front-official-2023.jpg` | [上海市文旅推广网](https://www.meet-in-shanghai.net/tc/guide/stroll-xinhua-road-walk-into-the-old-timethe-building-can-be-read-863025/) | 沿街正面 | Published 2023-06-24 | 仅作研究证据 |
| `docs/research/assets/poi-references/house-315/house-315-street-context-official-2023.jpg` | [上海市文旅推广网](https://www.meet-in-shanghai.net/tc/guide/stroll-xinhua-road-walk-into-the-old-timethe-building-can-be-read-863025/) | 新华路街道与围墙关系 | Published 2023-06-24 | 只能证明场地上下文 |
| `docs/research/assets/landmark-comparison/house-315-real.jpg` | [解放日报候选页](https://www.jfdaily.com/sgh/detail?id=1697461) | 旧版山墙候选 | Unknown | 主体尚待复核，不作为新增细节依据 |

### View coverage matrix

| Evidence slot | Local photo | Questions answered | Coverage status | Downgrade if missing |
| --- | --- | --- | --- | --- |
| Canonical | `house-315-front-official-2023.jpg` | 正面轮廓、屋顶、墙材和南立面前出 | Supported | N/A |
| Side / oblique | 无可信同楼侧照 | 进深、侧翼、屋顶连接 | Missing / unknown | 进深按 OSM 候选轮廓保守灰模，不添加不可见侧翼细节 |
| Entrance / identity detail | canonical 局部 | 山墙、门窗、黑色木构架 | Partial | 仅保留远景可读构件，不复刻门窗五金 |
| Site relationship | `house-315-street-context-official-2023.jpg` | 道路、梧桐、人行道与围墙 | Context only | 不把该图当作侧立面证据 |

### Canonical comparison view

- Local path: `docs/research/assets/poi-references/house-315/house-315-front-official-2023.jpg`
- Direction: 从新华路一侧朝南立面近正视；罗盘方向未知
- Why selected: 同时覆盖双陡坡红瓦屋顶、白色拉毛墙、红砖基座、前出山墙与黑色木构架
- Runtime camera reproduction: `/?start=house315` 中人物从新华路人行道正对主体，双坡屋顶与红砖基座完整入画

### Evidence classification

#### Observed

- 建于 1930 年，为英国乡村式花园住宅，采用假三层砖木结构。
- 双陡坡红瓦屋顶且出檐较大。
- 上部为白色水泥拉毛墙，下部为清水红砖墙。
- 南立面中部前出，山墙可见黑色木构架。

#### Inferred

- 当前手工落点附近的 OSM way `864485667` 是首个候选，中心距约 `3.56` 场景单位、面积约 `434.4 m²`；其地址未标注，尚不能确认就是 315 号。
- 候选轮廓最长边方向为 `1.169425 rad`，只能用作体块轴线，不能直接当入口朝向。
- 侧后立面以 canonical 轮廓与 OSM 占地约束下的低细节实体补全。

#### Unknown

- 精确测绘尺寸、层高、进深、背立面、屋顶背坡和入口罗盘方向。
- OSM way `864485667` 与新华路315号的地址绑定。
- 旧版解放日报图片是否确为同一建筑。

## Quality Contract

### Identity

- Silhouette: 两段陡坡红瓦屋顶与前出山墙形成不对称英国乡村住宅轮廓
- Signature cue 1: 上白下红的墙体分区
- Signature cue 2: 山墙黑色木构架
- Signature cue 3: 南立面中部前出及大出檐双坡屋顶
- Details intentionally omitted: 未观察到的背面、屋顶设备、室内和门窗五金

### Position

- Coordinate source: 当前手工落点 `[−23.03, 85.67]`；OSM way `864485667` 仅为待核候选
- Scene position: `[-23.03, 85.67]`，核验前不移动
- Confidence: 手工落点中；候选 OSM 绑定低

### Scale

- Known dimensions: 无公开测绘尺寸；OSM 候选面积约 `434.4 m²`
- `1 scene unit = 2.7 m` conversion: 由最终绑定的 OSM footprint 直接导出水平灰模，垂直高度按假三层与照片比例推断
- Allowed visual multiplier: `0.96–1.04`，优先修正轮廓、机位和 start preset

### Orientation

- Blender front direction: local `-Y`
- Runtime rotation: 当前 `-0.38 rad`，仅保留为基线
- Canonical view direction: 从沿街南立面正前方观察；罗盘方向待地图闭合

### Framing

- Target screen-width occupancy: `50%–68%`
- Maximum canonical direction deviation: `15°`
- Required visible edges / roof extents: 两条主屋脊和前出山墙不得裁切
- Player-to-door and player-to-storey scale check: 人物高度约为首层可见高度的 `45%–60%`
- Camera target height and clearance: 首帧不得进入树冠、屋檐或围墙碰撞

### Materials

- Opaque: 暖白拉毛墙、低饱和清水红砖、暗红屋瓦
- Glass: 深灰低反射窗玻璃
- Metal: 深灰门窗五金
- Emissive: 无
- Project palette mapping: 保持新华路暖灰与低饱和红砖色盘

### Collision and access

- Solid obstacles: 主体按真实占地拆分，不用院落大盒代替
- Walkable areas: 沿街人行道、入口前场与围墙外侧
- Camera clearance: canonical 相机在所有实体碰撞外
- Road clearance: 不侵入新华路车行道

### Runtime budget

- Maximum triangles: 55,000
- Maximum nodes: 6
- Maximum materials: 10
- Maximum images: 0
- Maximum GLB bytes: 4,200,000
- Animation/skin requirements: none

### Build provenance

- Baseline GLB SHA / bounds / metrics: 动工前由构建记录补录
- Expected output paths: `assets/models/source/xinhua-road/house-315.blend`、`public/models/xinhua-road/house-315.glb`
- Build record path: `docs/research/build-records/house-315.json`
- Cache version rule: GLB 二进制 SHA 变化时必须同步更新 `cacheVersion`

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Massing | OSM 约束体块、双陡坡屋顶、前出山墙 | canonical 轮廓 | 实际 `?start=house315` 灰模门 | Pending |
| Runtime calibration | 位置、比例、朝向、机位、道路退界 | N/A | footprint 候选闭合后才允许移动 | Pending |
| Identity | 上白下红墙体、黑色木构架、大出檐 | 三项构件可读 | Identity 距离仍可辨认 | Pending |
| Materials | 白墙、红砖、红瓦、深窗 | 固定机位无黑面 | 项目色盘一致 | Pending |
| Site | 围墙、入口和少量场地 | 地面接触 | 人行道开放 | Pending |
| Collision | 分体主体与开放入口 | 无整院大盒 | 人物/相机可达 | Pending |
| Optimization | 合并静态节点与共享材质 | 轮廓不丢失 | 预算通过 | Pending |

完成批次必须更新以 `test_` 开头的参考 / Blender / Three.js 三联对照。

## Validation

- [ ] 绑定 OSM footprint 或明确维持手工落点
- [ ] 灰模在真实 `/?start=house315` 中通过
- [ ] 可编辑 `.blend`、GLB、三固定机位和三联对照齐全
- [ ] GLB 根变换、bounds、节点、三角面、材质、图片、体积和 SHA 进入 build record
- [ ] 浏览器控制台、首屏资源、碰撞、遮挡和同条件性能协议通过
- [ ] 灰模与终审两个独立检查点无 blocker

## Decision Log

### Iteration 0 — 2026-07-25

- Changes: 本地化官方正面与街道上下文，建立专项 manifest、视角矩阵、质量合同和 OSM 候选。
- Evidence used: 上海市文旅推广网官方图片和文字；2026-07-24 Overpass 快照。
- Graybox runtime result: Pending
- Blender result: 尚未修改生成器。
- GLB result: 旧版待审计。
- Three-way comparison result: Pending
- Runtime result: Pending
- Independent review result: 证据门通过；地图绑定仍待闭合。
- Remaining inference: 侧后立面、精确尺寸和 OSM 绑定。
- Performance impact: 仅新增研究文件，无运行时影响。
- Rollback point: 分支基线 `c0f525a`。
