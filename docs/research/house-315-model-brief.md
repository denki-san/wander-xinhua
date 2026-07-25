# Blender Model Brief: House 315

## Scope

- Stable asset ID: `house-315`
- Subject: 新华路315号单栋花园住宅
- Address: 上海市长宁区新华路315号
- Existing runtime identity kind: `townhouse`（疑似旧标签；公共文件暂不修改）
- Existing generator: `scripts/create_xinhua_road_models.py`
- Existing editable source: `assets/models/source/xinhua-road/house-315.blend`
- Existing runtime GLB: `public/models/xinhua-road/house-315.glb`
- Start preset: `/?start=house315`
- Recovery source: `3044cd89f801250afcd477dfbcbc7da358bf4b11`
- Current gate: `passed-for-subject-specific-massing-only`

### Stable asset boundary

`house-315` 是“新华路315号住宅”单栋主体，不是211弄、329弄 compound，
也不是普通 OSM 建筑或全地图体块。门牌照片直接显示“新华路315号住宅”，
俯瞰、入口和外立面图片在同一页面315号段落内，并与官方远景的持续构件一致。

本 Worktree 只拥有：

- 315号主体参考证据；
- 无树木、无装饰的 subject-specific Massing 候选；
- 本资产独立 build record、预览和结构审计。

以下内容均为 Hold 或禁止：

- 其他17栋建筑；
- 树木、绿篱、草坪、围墙、门、灯、花箱、铺装和其他装饰；
- ordinary OSM、全地图体块和 overview district 成果；
- 公共 registry、runtime、地图坐标、bounds 和碰撞；
- 旧 Hero、旧 `.blend` 和旧 GLB；保留但不得覆盖。

## Preflight Gate

- Worktree baseline:
  `2e185c6d000157f2544c3e0d19435f403ceeb4e2`
- Blender binary:
  `/Applications/Blender.app/Contents/MacOS/Blender`
- Blender version: `5.2.0 LTS`
- Existing single-asset Hero command:
  `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_xinhua_road_models.py -- --asset=house-315`
- GLB audit:
  `python3 scripts/audit_glb.py <candidate.glb> --forbid-images`
- Local preview:
  `npm run dev` 或 `npm run build:static && npm run preview:static`
- Runtime route: `/?start=house315`
- Browser path: `/opt/homebrew/bin/agent-browser`
- Evidence checkpoint behavior: 未打开 Blender、未运行生成器、未写入 GLB。

## Evidence

完整来源、Image 编号、原图 URL、SHA-256、视角、获取日期和使用边界见
`docs/research/house-315-reference-manifest.json`。

### Reference photos

| Local path | Source | View | Usage boundary |
| --- | --- | --- | --- |
| `docs/research/assets/poi-references/house-315/house-315-front-official-2023.jpg` | 上海市文旅推广网，published 2023-06-24 | 沿街正面远景 | canonical 与主体正面轮廓 |
| `docs/research/assets/poi-references/house-315/house-315-street-context-official-2023.jpg` | 上海市文旅推广网，published 2023-06-24 | 新华路街景 | 只能证明道路上下文 |
| `docs/research/assets/poi-references/house-315/house-315-aerial-jfdaily-2026.jpg` | 上观新闻 Image 242，published 2026-01-19 | 正面偏右俯瞰 | 体块进深、屋顶连接和侧翼 |
| `docs/research/assets/poi-references/house-315/house-315-address-sign-jfdaily-2026.jpg` | 上观新闻 Image 243 | 门牌与保护铭牌 | 稳定主体和地址绑定 |
| `docs/research/assets/poi-references/house-315/house-315-entrance-jfdaily-2026.jpg` | 上观新闻 Image 244 | 沿街入口与山墙 | 入口方位和山墙比例 |
| `docs/research/assets/landmark-comparison/house-315-real.jpg` | 上观新闻 Image 245 | 正面山墙细节 | 旧文件字节已与源图完全匹配 |

Image 242/243/244 于 2026-07-25 原字节本地化。旧
`house-315-real.jpg` 与 Image 245 的 SHA-256 均为
`78581fafb11ff48f917f186c67370cc6b03d624e208776638f314d885c9da883`。

### Canonical / side / entrance coverage matrix

| Subject slot | Evidence | Coverage | Gate consequence |
| --- | --- | --- | --- |
| Canonical 沿街正面 | 官方2023正面 | Supported | 可约束公开面轮廓 |
| 侧向 / 纵深 | 上观 Image 242 俯瞰 | Supported for Massing | 可约束屋顶连接、主体进深和左右侧翼 |
| 门牌绑定 | 上观 Image 243 | Supported | 确认 stable subject 是315号住宅 |
| 入口 / 身份 | 上观 Image 244/245 | Supported | 可约束前出山墙、深檐和半木构 |
| 背面细节 | 只有俯瞰局部 | Partial / unknown | Massing 只封闭低细节体块；Identity/Hero 关闭 |
| 精确测绘 / 罗盘 | 无 | Missing | 不声明实测比例，不进入地图校准 |

### Canonical comparison decision

- Canonical:
  `docs/research/assets/poi-references/house-315/house-315-front-official-2023.jpg`
- Observation direction: 从新华路朝沿街立面观察；罗盘方向未知。
- Blender authored front: local `-Y`。
- Required reproduction: 完整主屋顶、中央高山墙、左右非对称翼和上白下红分区
  同时可读；不得用树木或围墙掩盖轮廓误差。

### Observed

- 官方远景、俯瞰、入口和外立面图具有相同的双陡坡红瓦屋顶、中央半木构山墙、
  上白下红墙体分区和非对称侧翼。
- Image 243 可直接读到“新华路315号住宅”，stable asset 与门牌对象闭合。
- 俯瞰显示一个连续的长向主体、中央高山墙、右侧长屋面体量和左侧较小体量，
  屋脊高度存在层级。
- 沿街入口图显示中央山墙前出、大出檐、深色木构架和入口与主体的关系。
- 旧 `house-315-real.jpg` 与页面明确标注“新华路315号外立面”的 Image 245
  为相同字节。
- 315号轮廓与已审计的211弄2号、329弄17号和329弄38号均不同，
  本轮未发现跨资产误绑。

### Inferred

- 沿街公开面定义为 local `-Y`，以便确定性预览和后续地图校准。
- 俯瞰可支持相对体块比例，但不能替代测绘尺寸。
- 历史 runtime `position [-23.03, 85.67]`、`yaw -0.38`、`scale 0.9`
  只是迁移基线。

### Unknown

- 建成年代存在来源冲突：2023官方文旅页称1930年，2026上观页称1949年。
  本轮不选择其中一个，也不用于比例推断。
- 精确宽度、进深、层高、屋脊高度和 footprint 测绘值。
- 隐藏背面的开口、构件和精确轮廓。
- 沿街立面的地图罗盘方向和权威地图落点。
- `townhouse` 是否应调整；这是主窗口公共文件责任。

## Recovery and Legacy Audit

### Existing Hero baseline

- GLB: `public/models/xinhua-road/house-315.glb`
- SHA-256:
  `9d407a35c10bfa232d2a5a91ecae4886a9b146cdabec801319c7dc5530b67b07`
- Size: `1,603,468` bytes
- Structure: 1 node, 1 mesh, 14 materials, 0 images, 0 textures
- Audit: container policy passes
- Verdict: `retained-legacy-not-massing-source`

旧 Hero 的正面构件与证据相符，但完整进深、侧后面和许多细节是旧生成器外推；
同时包含围墙、灯、花箱和铺装等本轮范围外内容。结构审计通过不代表
subject-specific Massing provenance 通过。

### Recovery provisional Massing

- Recovery SHA-256:
  `89533d982f19fc9a6a2f2ef1bb301373afe8c20b1b95fd9cf663d39072fdcf44`
- Method: `voxel-remesh-current-hero`
- Structure: 1 node, 1 mesh, 1 material, 900 triangles
- Container audit: passes
- Verdict: `rejected-as-subject-specific-massing-source`

该候选把旧 Hero 的外推侧后面体素化；视觉上形成噪声轮廓，也没有逐构件对应
新补齐的俯瞰证据。本轮不摘取、不复用其 geometry。

## Subject-specific Massing Candidate

- Generator:
  `scripts/create_house_315_massing_model.py`
- Editable source:
  `assets/models/source/tiers/xinhua-road/massing-v2/house-315-massing.blend`
- Candidate GLB:
  `public/models/tiers/xinhua-road/massing-v2/house-315-massing.glb`
- Build record:
  `docs/research/build-records/tiers/xinhua-road/massing-v2/house-315-massing.json`
- Current status: `candidate-awaiting-blender-mcp-1`

该候选从 canonical、Image 242 俯瞰和 Image 244 入口独立重建。没有读取旧 Hero
mesh，也没有摘取 Recovery voxel 或 ordinary OSM。生成器在一次命令中重置
场景并独立构建两次，两个 GLB SHA-256 均为：

`e9d62cfc7ffba69145d62508656a033a873e5769171414aff2124f7320389832`

结构结果：

- 17,352 bytes；
- 1 node、1 mesh、4 materials；
- 176 triangles；
- 0 images、0 textures、0 animations、0 skins；
- 根节点无未烘焙 transform；
- GLB audit `ok`。

三张固定机位预览：

- `test_house-315-massing-canonical.png`
- `test_house-315-massing-side-depth.png`
- `test_house-315-massing-entrance.png`

预览中的橙色人物为 `1.8 m = 0.666667 scene unit` 尺标，蓝色条标记
local `-Y`；两者以及地面均未保存到 `.blend`、未导出到 GLB。

当前只完成候选生成和静态视觉检查。尚未打开 Blender GUI、尚未进入 MCP 1、
尚未集成公共 registry / runtime，也未进行 Three.js 地图校准。

## Quality Contract

以下合同只授权 subject-specific Massing；Identity 和 Hero 仍关闭。

### Massing cues

1. 连续但高低有层级的陡坡红瓦屋顶，而不是一个平顶盒；
2. 中央高、前出的半木构山墙体量；
3. 上部浅色、下部红砖的清晰墙体分区；
4. 中央主体两侧不对称翼：右侧较长屋面、左侧较小体量；
5. 大出檐和正面屋脊 / 老虎窗层级只按俯瞰直接可见关系表达。

### Position and orientation

- Scene position: 历史值 `[-23.03, 85.67]`，本 Worktree 不修改。
- Runtime yaw: 历史值 `-0.38 rad`，证据置信度低。
- Authored unit: `1 Blender unit = 1 scene unit = 2.7 m`。
- Blender front: local `-Y`。
- Canonical compass: `unknown`。

### Framing and human scale

- Target screen-width occupancy: `55%–72%`。
- Maximum canonical deviation: `12°`。
- Human scale proxy: `1.8 m = 0.6667 scene unit`。
- Required frame: 主屋顶、中央高山墙、左右翼和人物尺标同时可读。
- 尺标只用于预览和比例检查，不进入 GLB。

### Materials

- 暖白粗糙墙面；
- 低饱和清水红砖基座；
- 暗红屋顶；
- 深灰木构可作为 Massing 识别线，但不得扩展为 Hero 门窗细节；
- 不使用图片贴图。

### Collision

- 只按主体各体块分离阻挡；
- 不包含庭院、围墙、入口门和道路；
- 禁止一个大碰撞盒覆盖院落或可步行空间；
- Massing GLB 本身不写公共碰撞，待主窗口地图校准。

### Massing budget

- Maximum nodes: 12
- Maximum triangles: 4,000
- Maximum materials: 4
- Maximum images: 0
- Maximum GLB bytes: 350,000
- Animation / skin: none

## Evidence Gate

**Result: `passed-for-subject-specific-massing-only`**

通过依据：

1. stable subject 为单栋315号住宅，门牌证据直接闭合；
2. 官方沿街正面可作为 canonical；
3. 同楼俯瞰补齐了 Massing 所需的进深、屋顶连接和侧翼关系；
4. 入口 / 外立面图提供至少三项主体独有 cue；
5. 315号与211 / 329已审计住宅形体不同，未发现误绑。

限制：

- 必须从 canonical、俯瞰和入口证据重新构建，禁止复用 Recovery voxel geometry；
- 年代、实测尺寸、背面细节、罗盘和地图落点保持 Unknown；
- 不得制作 Identity / Hero；
- 不得触碰树木、装饰、ordinary OSM、全地图或公共 runtime；
- 完成确定性双构建和结构审计后，Blender MCP 前必须停下申请主窗口。

## Batch Status

| Batch | Result | Status |
| --- | --- | --- |
| Evidence | subject、canonical、俯瞰纵深、入口和三项以上 cue 闭合 | Passed for Massing |
| Deterministic Massing | 新建 `.blend` / `.glb`，双构建 SHA 一致 | Candidate complete |
| Blender MCP 1 | 读取场景、固定机位和轮廓审查 | Pending main-window authorization |
| Three.js Massing | 真实 `?start=house315` 地图、比例、朝向、接地 | Pending after MCP 1 |
| Identity / Hero | 需要更高层证据门和后续 MCP 门 | Closed |

## Decision Log

详细审计决策见 `docs/research/house-315-decision-log.md`。
