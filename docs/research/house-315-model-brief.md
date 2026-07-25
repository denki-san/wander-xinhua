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
- Disposition record:
  `docs/research/house-315-hero-disposition.json`
- Verdict: `hold-read-only-rollback-only / rebuild-required / not-mcp2-candidate`

旧 Hero 不是跨建筑误绑：它确实以315号为目标，并保留陡坡红瓦、半木构山墙、
上白下红和烟囱等粗粒度 cue。但旧生成器使用单一主块、偏置横山墙和右侧凸窗，
没有闭合当前俯瞰证据与已通过地图门 Massing 所要求的中央高山墙、横向脊体、
右长翼和左后短翼层级；旧门廊也不是入口证据中的中央高开口 / 街道门关系。

旧 `.blend` / GLB 和函数 lineage 已冻结。函数本体与 producing commit
`e292fde` 字节一致，但完整共享生成器随后已变化，且没有资产级 Hero build
record。Blend / GLB 都复算为23,512 triangles，其中120个零面积三角面；
non-finite positions / normals 和 normal-orientation mismatches 均为0。

整块庭院、两段围栏、两段门、两盏灯、两个带绿植花箱和装饰铺装在导出前已与
建筑合并为单一 mesh，无法在运行时选择性移除。旧 Hero 只能作为只读 rollback
和历史对照，不能申请 MCP2，也不能作为 Identity 来源。

现有视图只有一张 generic oblique Blender preview 和一张无固定机位合同的旧
runtime 截图；正式 Hero canonical、side-depth、entrance-detail 与
Hero / Massing 同机位对照均缺失。参考证据本身的 canonical 与入口已支持，
俯瞰只支持侧向 / 纵深体块，隐藏背面细节继续为 `Unknown`。

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
- Current status: `mcp1-pass-awaiting-threejs-map-gate`

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

当前已完成候选生成、静态视觉检查和主窗口 Blender MCP 1。尚未集成公共
registry / runtime，也未进行 Three.js 地图校准。

### Blender MCP 1

- Result: `PASS`
- Reviewed source checkpoint: `ca0c413`
- Gate record:
  `docs/research/house-315-blender-mcp-gates.json`
- Scene: 1 mesh、4 materials、120 vertices、92 polygons
- Geometry integrity: area `< 1e-10` 为0，non-finite normals 为0
- Blender bounds:
  `[-7.675, -4.84, 0] .. [7.225, 4.575, 6.982892]`
- Root: location / rotation 为0，scale为1
- Visual: 中央高半木构山墙、横向主脊、右长翼、左后短翼和上白下红分区可读
- Human scale: `1.8m` 临时 proxy 关系合理
- Scope: 无树木、围墙、门、灯、铺装
- Accepted interactive changes: none
- QA rig: 未保存、未导出
- Binary stability: Blend / GLB SHA 保持
  `dccd5ad4... / e9d62cfc...`
- Next gate: `three-js-massing-map-calibration`

### Three.js Massing map gate

- Result: `formal-pass`
- QA record:
  `docs/research/house-315-massing-map-qa.json`
- Build mode: Vite static production preview
- Viewport: `1280 × 720`，DPR 1，页面可见
- Frozen placement:
  `position [-23.03, 85.67]`、`yaw -0.38`、`scale 0.9`
- Resource: HTTP 200，encoded body 17,352 bytes，source / dist SHA 均为
  `e9d62cfc...`
- Visual: local `-Y` 中央山墙朝街；比例、接地和道路退界通过
- Camera: 起点和近楼探针均为 `spring-clear`，arm 未压缩
- Collision: 固定方向累计10秒输入进入前场凹口，最终仍停在后部主屋体之外；
  四个分体 obstacle 未覆盖整个院落
- Console / page errors: `0 / 0`
- Performance: 可见页面预热后采样 10.0074 秒，601 frames，
  60.0556 FPS，最大16.8ms，超过33ms帧为0
- Shared registry: 临时 QA 构建后逐字节恢复，原/后 SHA 均为
  `eccba9706ef88456ee6616ff9f44bc6f41ec8ac76d3f09478d08f7f58b5527e6`
- Shared integration: 未在本 Worktree 提交；建议值写入专项 QA，等待主窗口。
- Identity / Hero: 继续锁定。

## Independent Hero v2 Candidate

主窗口在 legacy Hero disposition `518211e` 后，授权以已过地图门的 Massing
合同构建一个独立 Hero v2 候选。该授权不改变旧 Hero Hold，也不开放 Identity。

- Generator:
  `scripts/create_house_315_hero_model.py`
- Editable source:
  `assets/models/source/tiers/xinhua-road/hero-v2/house-315-hero.blend`
- Candidate GLB:
  `public/models/tiers/xinhua-road/hero-v2/house-315-hero.glb`
- Build record:
  `docs/research/build-records/tiers/xinhua-road/hero-v2/house-315-hero.json`
- Current status: `hero-mcp2-pass-awaiting-main-window-integration`

Hero v2 直接调用并冻结已通过 MCP1 / map gate 的 Massing source；没有读取旧 Hero
mesh、Recovery voxel、ordinary OSM 或其他建筑。它逐字继承：

- Massing GLB SHA `e9d62cfc...`；
- local `-Y` 正面、ground `0` 和 `2.7 m / scene unit`；
- Blender bounds
  `[-7.675, -4.84, 0] .. [7.225, 4.575, 6.982892]`；
- runtime `position [-23.03, 85.67]`、yaw `-0.38`、scale `0.9`；
- 地图门四个分体 obstacles；
- canonical / side-depth / entrance 三套 fixed cameras。

新增内容只表达当前照片直接支持或在 Brief 中明确降级的建筑构件：

1. 中央高、前出的半木构山墙与上层小窗；
2. 横向主脊、中央纵向陡坡屋顶、右长翼与左后短翼；
3. 上白下红墙体分区和低饱和暗红瓦；
4. 中央高玻璃入口、两侧窗和一个无文字中性门牌 proxy；
5. 俯瞰可见的长条老虎窗、屋面瓦垄和一处烟囱；
6. 右侧可见开口节奏；隐藏背面仍为低细节 `Unknown`。

未生成街道门、独立门扇、文字 / logo、庭院整块、围墙、围栏、灯、花箱、铺装、
树木、灌木、草坪、外摆、ordinary OSM 或其他建筑。旧 Hero `.blend/.glb` SHA
保持 `2e3a30f7... / 9d407a35...`，公共 registry/runtime 未修改。

确定性和结构结果：

- 两次 clean scene GLB SHA 均为
  `ad414549bf6953bdeffe9b43d56b589101becf1a8c9efb57ac34446eac92f964`；
- `.blend` SHA `2750b3c876fa651ce1fd0ed09f8e9a5557804b8e2783839f6ed63a740cd756b6`；
- 212,908 bytes、1 node、1 mesh、6 materials、2,936 triangles；
- 0 images / textures / animations / skins；
- root normalized，GLB / Blend bounds 与 Massing exact match；
- zero-area、non-finite、invalid indices、missing / zero / non-unit normals
  与 orientation mismatches 均为0。

固定机位候选预览：

- `test_house-315-hero-v2-canonical.png`
- `test_house-315-hero-v2-side-depth.png`
- `test_house-315-hero-v2-entrance.png`

三张 Headless 图只用于候选自检。主窗口随后以 Blender MCP 串行完成 MCP2，
正式证据为：

- `test_house-315-hero-v2_mcp2_recheck_canonical.png`
- `test_house-315-hero-v2_mcp2_recheck_side.png`
- `test_house-315-hero-v2_mcp2_recheck_entrance.png`

MCP2 结果为 `PASS`：1 mesh，1,960 vertices / 1,472 polygons，6/6
Principled node materials；root location / rotation 为0、scale为1；zero-area
和 non-finite normals 均为0，minimum face area 为 `0.001224979`。
canonical、side-depth 和 entrance 三视图确认中央高半木构山墙、横向红瓦主脊、
右长 / 左短翼、上白下红、高入口和1.8m尺度关系可读。隐藏背面仍为低细节
`Unknown`，没有场地、植被或装饰污染。

Accepted interactive changes 为 none，QA rig 未保存、未导出。因此模型二进制和
生成器无需回写。主窗口随后已把 Hero candidate 与 MCP2 gate 整合为
`608369c / a237231`，因此正式解锁 Identity 派生；Three.js runtime 与公共集成
仍未开始。

## Independent Identity v1 Candidate

Identity v1 只从冻结 Hero v2 generator / Blend / GLB
`61e3aa51... / 2750b3c8... / ad414549...` 派生。实现方式为
`sha-pinned Hero generator subset reconstruction`：沿用同一 accepted Massing
壳体和 Hero helper，只保留中远景可辨识的构件，不读取 legacy Hero、Recovery
voxel 或 ordinary OSM geometry。

独立产物：

- generator:
  `scripts/create_house_315_identity_model.py`
- editable source:
  `assets/models/source/tiers/xinhua-road/identity-v1/house-315-identity.blend`
- GLB:
  `public/models/tiers/xinhua-road/identity-v1/house-315-identity.glb`
- build record:
  `docs/research/build-records/tiers/xinhua-road/identity-v1/house-315-identity.json`
- tier lineage:
  `docs/research/house-315-tier-lineage.json`

保留：

1. 中央高半木构山墙、斜撑与上层小窗；
2. 横向主脊和右长 / 左短翼轮廓；
3. 上白下红墙体分区；
4. 高入口、主要窗组和无文字门牌关系；
5. 老虎窗和一处可见烟囱。

Deliberate losses：

- 删除全部密集屋面瓦垄，只保留四条低密度屋脊；
- 删除细窗棂和横向细分；
- 右侧三组可见窗减为两组；
- 删除次要立面 / 檐口分割。

隐藏后侧仍为低细节 `Unknown`。没有庭院、围墙、围栏、街道门、灯、花箱、
装饰铺装、树木、灌木、草坪、外摆、店招、其他建筑或全地图资产。

结构与预算：

- GLB SHA `425e21b9...`，62,288 bytes；
- 最终 Blend SHA `79cc3608...`，109,984 bytes；
- 1 node、1 mesh、6 materials、776 triangles；
- 0 images / textures / animations / skins；
- Identity / Hero triangles 比例 `26.4305%`，bytes 比例 `29.2558%`；
- 同一命令内两次 clean scene 及第二次完整命令的 GLB SHA 完全一致；
- Blender `.blend` 是可编辑容器，跨保存的容器 SHA 会因内部保存元数据变化；
  最终 build record 与提交文件冻结 `79cc3608...`，不把跨保存 Blend SHA 相等
  冒充为 runtime 确定性；
- root、front、ground、bounds、placement、四分体 collision 与三 fixed cameras
  均 exact 连续；
- zero-area、non-finite、invalid index 和 normal mismatch 均为0。

固定机位：

- `test_house-315-identity-v1-canonical.png`
- `test_house-315-identity-v1-side-depth.png`
- `test_house-315-identity-v1-entrance.png`

三张 Headless 图只证明候选和预算可读。主窗口随后通过 Blender MCP 重新打开
最终 `.blend`，排除临时对象后确认 1 mesh、520 vertices、392 polygons、
6/6 Principled materials、规范 root、0 退化面与 0 non-finite normals，并使用
同一 canonical / side-depth / entrance camera set 生成：

- `test_house-315-identity-v1_mcp3_recheck_canonical.png`
- `test_house-315-identity-v1_mcp3_recheck_side-depth.png`
- `test_house-315-identity-v1_mcp3_recheck_entrance.png`

三档连续性与 Identity 识别构件均通过 MCP3；临时地面、灯光、相机和 1.8m 人物
标尺未保存到 `.blend`、未导出 GLB。当前状态为
`mcp3-pass-runtime-pending`，只解锁 House315 Three.js runtime，不代表运行时完成。

## Quality Contract

Massing 合同保持冻结。legacy Hero 继续 Hold；独立 Hero v2 已通过 MCP2，
Identity v1 已通过 MCP3。下一门是 House315 Three.js 三档、fallback、地图碰撞
与性能验收；公共运行时尚未接入。

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

### Hero v2 quality contract

- Maximum nodes: 1
- Maximum triangles: 45,000
- Maximum materials: 6
- Maximum images: 0
- Maximum GLB bytes: 3,500,000
- Origin / front / ground / bounds / fixed cameras: exact Massing inheritance
- Collision: exact four-obstacle Massing map contract
- Geometry integrity: zero-area / non-finite / invalid index / normal mismatch
  必须全部为0
- Scope: building-only；禁止任何树木、装饰或场地资产
- Runtime / Identity: MCP2 前关闭

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

### Hero reopen decision

Legacy disposition 已确认旧 Hero 与当前主体意图一致但不可修复为 MCP2 候选。
主窗口随后明确授权新建独立 Hero v2，但隐藏背面继续降级为 `Unknown`，且必须：

- 从已过地图门 Massing 继承 exact tier contract；
- 使用独立路径，不覆盖旧 Hero；
- building-only，不接公共 runtime；
- Headless 候选完成后停在主窗口 MCP2 前；
- MCP2 通过前不得启动 Identity。

## Batch Status

| Batch | Result | Status |
| --- | --- | --- |
| Evidence | subject、canonical、俯瞰纵深、入口和三项以上 cue 闭合 | Passed for Massing |
| Deterministic Massing | 新建 `.blend` / `.glb`，双构建 SHA 一致 | Candidate complete |
| Blender MCP 1 | 场景、固定机位、轮廓、尺标和网格完整性通过 | Passed |
| Three.js Massing | 真实 `?start=house315` 资源、地图、比例、朝向、接地、碰撞和性能通过 | Passed |
| Legacy Hero disposition | 同主体意图，但结构、范围、拓扑、lineage 和固定视图不满足 MCP2 | Hold / rebuild required |
| Independent Hero v2 | exact Massing contract、双构建、结构审计和主窗口 MCP2 完成 | MCP2 Passed |
| Identity v1 | 冻结 Hero 子集派生、双构建、显著降预算、三固定机位完成 | Candidate / awaiting main-window MCP3 |

## Decision Log

详细审计决策见 `docs/research/house-315-decision-log.md`。
