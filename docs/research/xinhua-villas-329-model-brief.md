# Blender Model Brief: Xinhua Villas 329

## Scope

- Stable asset ID: `xinhua-villas-329`
- Subject: 新华路329弄成片历史住宅与里弄 compound POI
- Address: 上海市长宁区新华路329弄
- Runtime identity kind: `villa-row`
- Runtime description: “从新华路329弄继续探访成片的历史住宅与安静里弄”
- Existing generator: `scripts/create_xinhua_road_models.py`
- Existing editable source: `assets/models/source/xinhua-road/xinhua-villas-329.blend`
- Existing runtime GLB: `public/models/xinhua-road/xinhua-villas-329.glb`
- Start preset: `/?start=villas329`
- Recovery source: `3044cd89f801250afcd477dfbcbc7da358bf4b11`
- Current gate: `blocked-evidence`

### Stable asset boundary

仓库中的名称、地址、POI 文案和 Identity kind 均把 `xinhua-villas-329`
定义为329弄 compound，而不是一栋已选定的代表建筑。当前也没有证据把它
进一步收窄为“329弄入口”。

本 Worktree 只拥有：

- 329弄 compound 的证据边界；
- 已明确标注为329弄17号、38号的两栋成员建筑照片；
- 旧 Hero 和 Recovery Massing 的只读 provenance 审计。

以下内容均为 Hold 或禁止：

- `xinhua-villas-211` 及其成员建筑；
- 幸福里西/中/东区；
- 329弄中没有主体绑定的其他成员；
- 树木、绿篱、草坪、路灯、花箱、长椅、铺装、喷泉和其他装饰；
- ordinary OSM、全地图体块和 overview district 成果；
- 公共 registry、runtime、地图数据和其他17栋建筑。

在主窗口明确授权前，不得把 compound stable ID 偷换为17号、38号或任意
“代表别墅”单体。

## Preflight Gate

- Worktree baseline:
  `69db0b421fc1ba7795e8af9fc14fd440b704b547`
- Blender binary:
  `/Applications/Blender.app/Contents/MacOS/Blender`
- Blender version: `5.2.0 LTS`
- Existing single-asset command:
  `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_xinhua_road_models.py -- --asset=xinhua-villas-329`
- GLB audit:
  `python3 scripts/audit_glb.py public/models/xinhua-road/xinhua-villas-329.glb --forbid-images`
- Local preview:
  `npm run dev` 或 `npm run build:static && npm run preview:static`
- Runtime route: `/?start=villas329`
- Browser path: `/opt/homebrew/bin/agent-browser`
- Evidence-gate behavior: 本轮未打开 Blender、未运行生成器、未导出 GLB。

现有生成器支持单资产参数，但其329实现是一栋带阳光房和塔楼的花园住宅，
并包含草坪、灌木、树木和庭院灯。该主体来自已经交叉绑定到211弄2号的旧参考图，
因此不得作为329 subject-specific Massing 的几何真值。

## Evidence

完整来源、SHA-256、成员绑定和 Recovery 审计见
`docs/research/xinhua-villas-329-reference-manifest.json`。

### Reference photos

| Local path | Source | View | Usage boundary |
| --- | --- | --- | --- |
| `docs/research/assets/poi-references/xinhua-villas-329/xinhua-villas-329-17-official-2024.jpg` | 长宁区人民政府，published 2024-02-08 | 329弄17号正面 | 只证明17号正面，不证明 compound 或同楼纵深 |
| `docs/research/assets/poi-references/xinhua-villas-329/xinhua-villas-329-38-official-2025.jpg` | 长宁区人民政府，published 2025-11-22 | 329弄38号正面斜视 | 只证明38号局部纵深，不证明 compound 布局 |

两张照片从 Recovery 按原始字节选择性恢复，SHA-256 与 Recovery manifest
完全一致。本轮没有刷新、覆盖或重新编码来源图片。

### Canonical / side / entrance coverage matrix

| Subject slot | Canonical / front | Side / depth | Entrance / identity | Gate consequence |
| --- | --- | --- | --- | --- |
| 329弄 compound | Missing | Missing | Missing | 无法建立 compound Massing |
| 329弄17号 | 正面 Supported | Missing | 下层拱券和阳台局部 Supported | 不足以完成同楼 footprint / roof depth |
| 329弄38号 | 正面斜视 Supported | Partial | 三拱门廊、木阳台、烟囱 Supported | 可约束一个成员局部，但未获准代表 compound |
| 旧“329代表图” | Rejected | Rejected | Rejected | 与官方211弄2号为同一建筑，禁止作为329证据 |

### Canonical comparison decision

- Compound canonical: `missing-blocked`
- Reason: 当前没有329弄入口、成片住宅布局或可识别 compound 阈值照片。
- Rejected legacy canonical:
  `docs/research/assets/landmark-comparison/xinhua-villas-329-real.jpg`
- Rejection reason: 该图与官方绑定的
  `docs/research/assets/poi-references/xinhua-villas-211/xinhua-villas-211-2-official-2025.jpg`
  显示同一栋建筑；共同可见长条老虎窗、首层玻璃围合、左侧高烟囱、
  右侧多边形塔楼、右侧半木构体量和相同花园关系。
- Provisional member view:
  `xinhua-villas-329-38-official-2025.jpg` 是两张329官方图中纵深信息最多的一张，
  但它只能在主窗口明确选择“38号代表建筑”后成为单体 canonical。
- Runtime reproduction: compound canonical 缺失，因此当前不得声称
  `/?start=villas329` 已复现真实观察方向。

### Observed

- 329弄17号照片显示一栋竖向分段明显的住宅：上部红砖、中央浅色墙面、
  下部拱形开口和红瓦檐带。
- 329弄38号照片显示另一栋不同住宅：暖黄色墙面、三拱门廊、木阳台、
  红瓦屋顶、高烟囱及后期屋顶加建。
- 17号与38号的轮廓、开口和屋顶组织不同，不能合成一个代表建筑。
- 两张329官方照片均未显示329弄入口、compound 成员布局或两栋相对位置。
- 旧“329代表图”和官方211弄2号照片具有相同的持久建筑构件与场地关系，
  不是17号或38号照片中的建筑。
- 旧 Hero 生成器逐项实现了该旧图的长老虎窗、玻璃阳光房、烟囱和右侧塔楼。
- clean-v2 Massing 是五个平顶盒，build record 将每个都标为
  `unbound-member-candidate`，没有一个与17号或38号绑定。

### Inferred

- 旧“329代表图”与 Hero 极可能是211弄2号被错误复用到329 stable ID；
  在主窗口修正公共文件前只能作为 cross-asset contamination 基线保留。
- `xinhua-villas-329` 应继续保持 compound contract，直到获得入口 / 布局证据，
  或主窗口明确授权选择一个成员作为代表。
- 38号由于有正面斜视，比17号更适合作为未来单体 Massing 的证据起点，
  但这不是当前授权。
- runtime `position [-42.13, 79.48]`、`yaw -0.38` 和 `scale 0.62`
  只能作为历史放置基线。

### Unknown

- 329弄入口的形态、观察方向、道路退界和开放路径。
- 329弄 compound 的成员数量、边界和成员空间布局。
- 17号、38号在弄内的位置、朝向、间距和相互关系。
- 17号的侧面、背面、完整 footprint 和屋顶背坡。
- 38号的背面、完整 footprint、加建深度和入口侧关系。
- Recovery 文本提及的36号“蛋糕房”缺少本地照片，不能进入当前几何合同。
- runtime 包络、单碰撞盒和旧单体 Hero 与真实 compound 的对应关系。

## Legacy and Recovery Audit

### Existing Hero baseline

- GLB:
  `public/models/xinhua-road/xinhua-villas-329.glb`
- SHA-256:
  `81b2d79bb502cb42c187169f339f0ac9428ea8ae855e43e8b0756768ced0210b`
- Size: `1,443,312` bytes
- Structure: 1 node, 1 mesh, 14 materials, 0 images, 0 textures
- Audit: container policy passes
- Verdict: `retained-cross-asset-contaminated-legacy`

结构审计通过不证明主体绑定。该 Hero 是一栋单体住宅，且形体来自211弄2号
旧参考；同时包含草坪、灌木、树木和庭院灯等本轮范围外内容。不得删除或覆盖，
但也不得从它派生329的 Massing / Identity。

### Recovery voxel Massing

- SHA-256:
  `24259a39e96e580bdc58252723d9d92804385918786371fcd3bd93d63a68f1db`
- Method: `voxel-remesh-current-hero`
- Structure: 1 node, 1 mesh, 1 material, 900 triangles
- Verdict: `rejected-cross-asset-lineage`

该版本继承旧 Hero 的211弄2号主体，因此即使 GLB 容器通过，也不属于329。

### Recovery clean-v2 Massing

- Recovery path:
  `public/models/tiers/xinhua-road/massing-v2/xinhua-villas-329-massing.glb`
- SHA-256:
  `f7ade44ba879dead433abd006603a613520af730d9a2a35dada412b99a0c3819`
- Structure: 5 nodes, 5 meshes, 1 material, 60 triangles, 0 images
- Candidate status: `five-member-candidates-pending`
- Membership confidence: `medium`
- Height evidence: `unknown-runtime-fallback-not-evidence`
- Verdict: `rejected-as-subject-specific-massing-candidate`

该版本来自 ordinary OSM 候选 footprint，当前任务禁止使用这一路径；五个成员
没有门牌绑定，平顶统一高度也没有表达17号或38号的已证轮廓。JSON 的
`runtime-pass` 只证明这些盒子能显示，不能证明它们属于329或代表正确主体。

## Quality Contract

以下合同只定义解除 blocker 后的最低要求，不授权当前造模。

### Compound contract

- Stable silhouette: 多栋独立住宅与开放里弄，不得压成一栋单体或整场大盒。
- Entrance cue: 当前未知，必须补证后定义。
- Member separation: 每个已绑定成员保持独立体块和碰撞。
- Walkable void: 弄堂与成员间公共路径保持开放。
- Omitted: 未绑定成员、树木、装饰、临时设施、不可见背面和未经授权标识。

### Member-specific cues

若主窗口未来选择17号：

- 红砖上部和浅色中段的竖向分层；
- 首层连续拱形开口；
- 红瓦檐带和偏置体块。

若主窗口未来选择38号：

- 三拱门廊；
- 木阳台和外露梁；
- 暖黄墙面、红瓦层级与高烟囱；
- 后期屋顶加建只能按照片直接可见部分表达。

两套 cues 不得混用。

### Position and orientation

- Scene position: 历史值 `[-42.13, 79.48]`，本 Worktree 不修改。
- Runtime yaw: 历史值 `-0.38 rad`，证据置信度低。
- Authored unit: `1 Blender unit = 1 scene unit = 2.7 m`。
- Blender front: local `-Y`。
- Canonical direction: compound `unknown`；选定成员后按其本地照片重新定义。

### Framing and human scale

- Future target screen-width occupancy: `55%–72%`。
- Maximum canonical deviation: 证据闭合后 `12°`。
- Human proxy: `1.8 m = 0.6667 scene unit`。
- Required frame: 选定成员的完整主屋顶、入口、至少一条侧边和人物尺度同时可读。

### Collision

- compound 成员分别阻挡；
- 弄堂和公共路径保持开放；
- 禁止单一大碰撞盒覆盖 compound；
- 树木、灯、花箱等装饰不进入当前 Massing 碰撞。

### Future Massing budget

- Maximum nodes: 8
- Maximum triangles: 2,000
- Maximum materials: 1
- Maximum images: 0
- Maximum GLB bytes: 220,000
- Animation / skin: none

## Evidence Gate — 2026-07-25 historical checkpoint

**Result: `blocked-evidence`**

阻塞原因：

1. stable ID 是 compound，但没有 compound canonical、入口或成员布局证据；
2. 17号和38号是两栋不同建筑，未选择代表成员，也没有空间绑定；
3. 旧 Hero / voxel Massing 的主体属于211弄2号，存在 cross-asset contamination；
4. clean-v2 五个平顶盒来自禁止使用的 ordinary OSM，且成员均未绑定；
5. JSON / runtime visual pass 不能替代主体、轮廓和入口证明。

解除 blocker 至少需要：

- 329弄入口与 compound 关系的本地可信照片；
- 一份可授权的329弄场地平面、测绘或用户确认的成员布局；
- 或主窗口明确选择17号/38号作为 stable ID 的代表建筑，并同步未来
  registry、bounds、碰撞与地图责任；
- 选定主体的同楼侧向 / 纵深和入口证据。

在此之前：

- 不打开 Blender；
- 不修改生成器；
- 不创建或恢复 `.blend` / `.glb`；
- 不进入 MCP 1；
- 不修改 shared registry / runtime；
- Identity 和 Hero 继续关闭。

## Decision Log

详细审计决策见 `docs/research/xinhua-villas-329-decision-log.md`。

## Fast Mode Recovery checkpoint — 2026-07-26

- 基线：`222e7ebd7ef556f7f3f6edd2c0561a6e6c36111f`。
- 从 Recovery commit
  `3044cd89f801250afcd477dfbcbc7da358bf4b11`
  逐字节恢复 Massing-v2 `.blend`、build record、GLB 与四张建筑专属预览 /
  runtime 截图；没有恢复 ordinary OSM generator、共享 runtime、registry 或其他资产。
- GLB SHA-256 继续为
  `f7ade44ba879dead433abd006603a613520af730d9a2a35dada412b99a0c3819`；
  显式运行 `python3 scripts/audit_glb.py <glb>` 通过
  `8244 bytes / 5 nodes / 5 meshes / 1 material / 0 images`。
- Recovery 的 `runtimeGate=pass` 仅作为既有 runtime visual evidence 接续；
  `mapAcceptance=blocked` 保持不变。
- Recovery 没有正式 Blender MCP1 字段，因此本 checkpoint 明确记录
  `mcp1=pending-main-window-batch`，未重建、未打开 Blender、未重复 runtime。
- 五个节点仍全部是 `unbound-member-candidate`；当前两张官方图仍不能证明
  compound canonical、入口或成员布局，因此正式地图门结果是
  `formal-blocked-evidence`，不是 pass。
- 可复核 checkpoint：
  `docs/research/xinhua-villas-329-massing-recovery-checkpoint.json`。
- 主窗口若解除主体绑定 blocker，应先添加资产级 scoped tier resolver，再把候选
  Massing GLB、专项测试和 `qaModelTier=massing` route 接入 Fast manifest；在此之前
  不得把候选提升为 production Massing。

## Evidence update and Massing v3 — 2026-07-26

本节取代上方历史 `blocked-evidence` 作为当前 Evidence Gate；Recovery 结论仍保留
用于解释 lineage，不删除或覆盖。

### XHS source and local evidence

- URL:
  `https://www.xiaohongshu.com/search_result/696d1838000000002102bc99`
- Title: `走进上海弄堂 新华路329弄 外国弄堂`
- Author: `ii行摄`
- Published: `2026-01-20`
- Local directory:
  `docs/research/assets/xhs-xinhua-villas-329-20260725/`
- Capture boundary: 主窗口通过用户已登录 Chrome 只读固化；本 Worktree
  按原字节选择性复制，未重新访问或编码。
- Source note:
  `docs/knowledge-sources/xinhua-villas-329-xhs-evidence.md`

第1–8、18张媒体区域可读；第9–17张媒体区域为黑色，只保留指纹并标为
`needs_review`，不用于几何结论。评论文本不在交接证据中，也未用于建模。

### Updated coverage matrix

| Subject | Canonical / front | Side / depth | Entrance / identity | Current use |
| --- | --- | --- | --- | --- |
| Compound | XHS 01 partial | XHS 04 / 18 partial | XHS 01 context partial | 支持 compound Massing，不支持完整边界 |
| 15号 | rear mass partial | Unknown | XHS 08 doorplate / gate | 保守 OSM body，未知立面不细化 |
| 36号 | XHS 01 supported | XHS 03 / 04 / 18 supported | Partial | 圆形主体、低瓦翼、高烟囱 |
| 40号 | XHS 05 / 07 supported | Partial | 门牌、低瓦门廊 supported | 上层深色玻璃围合 |
| 42号 | XHS 06 supported | Missing | 门牌、浅瓦门廊 supported | 正面山墙，不细化背面 |
| 17号 | 官方正面 supported | Missing | Partial | 证据保留，当前无 OSM member binding |
| 38号 | 官方正面斜视 supported | Partial | Supported | 证据保留，当前无 OSM member binding |
| 32号乙 / 231号 | 正文命名 | Missing | Missing | 不进入当前几何 |

Canonical comparison 选择 XHS 01 作为 compound context，观察方向记为
`lane-context-facing-low-tile-compound-camera-coordinate-unknown`。它不是测绘机位，
Three.js 最终 canonical 仍需主窗口在真实地图中校准。

### Auditable member binding

详细计算见 `docs/research/xinhua-villas-329-member-binding.json`。

| OSM way | Member | Confidence | Evidence boundary |
| --- | --- | --- | --- |
| `864493244` | 15号 | Medium | 可见门牌 + 入口到纵深排序；非地籍 |
| `864485664` | 36号 | Medium | 正文、四张同组画面 + 纵深排序；非地籍 |
| `864493174` | 40号 | Medium-high | 两张可见40门牌 + 42号之前的较大中段 footprint |
| `864493173` | 42号 | Medium-high | 可见42门牌 + 40之后最深 retained footprint |
| `864493245` | Excluded | Unknown | 原始 OSM 世界中心约 `[-42.347, 92.123]`；现有证据无法绑定329弄门牌 |

这套绑定适用于保守 Massing，不可升级为测绘事实。17、32乙、38和沿街231号继续
只作为 evidence-only，不强行塞入四个 footprint。

### Massing v3 quality contract

- Generator:
  `scripts/create_xinhua_villas_329_massing_model.py`
- Stable compound: 四个独立 member mesh，保留成员间开放路径；不建单一大盒。
- Member 36 cues: 双层圆形主体、低瓦翼、高烟囱。
- Member 40 cues: 暖浅抹灰、低瓦门廊、深色上层围合。
- Member 42 cues: 正面三角山墙、浅瓦门廊。
- Member 15 boundary: 只使用 OSM body、可见二层包络和门牌入口证据。
- Unknown faces: 不加窗门节奏、附楼、背坡或未经照片支持的装饰。
- Excluded: 证据未绑定的相邻 `way/864493245`、树木、绿篱、灯、花箱、街具、
  普通全地图体块。
- Runtime placement frozen:
  `position [-42.13, 79.48] / yaw -0.38 / scale 0.62`。
- Coordinate contract: 原始 OSM WGS84 按
  `app/scene/xinhua-map-data.json.meta.centerWgs84` 与
  `metersPerSceneUnit=2.7` 投影；再逆变换为
  `glb-source-xz-before-runtime-z-flip`。四个 footprint 的逐顶点 world
  回投影最大偏差必须 `<= 0.05 scene unit`。
- Budget: `8 nodes / 2,000 triangles / 4 materials / 0 images /
  220,000 bytes`。
- Collision intent: 四个成员分别使用 footprint AABB；成员间路径保持开放。

### Headless Blender and GLB result

- Blender: `5.2.0 LTS`。
- Blend:
  `assets/models/source/tiers/xinhua-road/massing-v3/xinhua-villas-329-massing.blend`
  SHA-256
  `68004686207183ee7276c52b6c4805dc3233c7fd76d19fb9ba11d254444709c1`。
- GLB:
  `public/models/tiers/xinhua-road/massing-v3/xinhua-villas-329-massing.glb`
  SHA-256
  `f245efd099d00049c068230fe999f5e492c16aef441775dddf7c41dd9350b704`。
- Structure:
  `21,632 bytes / 4 nodes / 4 meshes / 204 triangles / 4 materials /
  0 images / 0 textures`；root transforms normalized。
- Explicit audit:
  `python3 scripts/audit_glb.py public/models/tiers/xinhua-road/massing-v3/xinhua-villas-329-massing.glb --forbid-images --max-nodes 8`
  通过。
- Fixed-camera previews:
  `test_artifacts/all-models/massing-v3/xinhua-villas-329/` 下 canonical、
  side-depth、entrance 三张 `test_` PNG。
- Comparison checkpoint:
  `test_xinhua-villas-329-massing-v3-reference-blender-threejs-pending.png`
  将 XHS 参考、Blender canonical 和明确标记为 pending 的 Three.js 面板并列；
  它不是 runtime 通过证据，SHA-256 为
  `2c07b54893ea2ee293282109cda6e0c82cee2842d477eec39ef6ba45a24f6e47`。
- Build record:
  `docs/research/build-records/tiers/xinhua-road/massing-v3/xinhua-villas-329-massing.json`。

### Current gates

- Evidence: `pass-conservative-massing-only`。
- Headless Blender: `pass`。
- GLB audit: `pass`。
- MCP1: `pending-main-window-batch`；本 Worktree 没有执行 MCP。
- Runtime / map acceptance: `pending-main-window-scoped-qa`；共享 runtime、
  registry 和 Fast manifest 未修改。
- Identity / Hero: `not-authorized`。按工作流必须等 MCP1 与地图门通过后再决定，
  本轮不提前派生 Identity。
- External `Threejs-3d-research` Wiki：仓库内 source Markdown 已写入；外部硬链接、
  rescan、队列清空与搜索回读由主窗口整合阶段完成，本分支不写外部卷。
