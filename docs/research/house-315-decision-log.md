# House 315 Decision Log

## Iteration 0 — Recovery audit and refreshed evidence gate

- Date: 2026-07-25
- Stable asset ID: `house-315`
- Worktree baseline:
  `2e185c6d000157f2544c3e0d19435f403ceeb4e2`
- Recovery commit:
  `3044cd89f801250afcd477dfbcbc7da358bf4b11`
- Result: `passed-for-subject-specific-massing-only`

### Changes

- 从 Recovery 只选择性恢复315号官方正面和街道上下文两张原始证据图，
  字节与 SHA-256 保持一致。
- 刷新 Recovery 已引用的上观新闻页面，将 Image 242/243/244 原字节本地化到
  本建筑证据目录，记录原 URL、Image 编号、视角、获取日期和 SHA-256。
- 确认旧 `house-315-real.jpg` 与页面 Image 245 字节完全一致；该图从
  `needs-review` 升级为明确绑定的315号外立面证据。
- 新建资产级 Brief、reference manifest 和本 decision log。
- 未摘取 Recovery `.blend` / `.glb`、共享 generator、公共 registry、runtime、
  ordinary OSM、测试或其他建筑文件。

### Stable boundary decision

`house-315` 保持为“新华路315号住宅”单栋主体。Image 243 可直接读到
“新华路315号住宅”，Image 244 的沿街入口也显示同一地址铭牌；Images 242–245
均位于页面明确的315号段落。官方远景和这些图片共享陡坡屋顶、中央半木构山墙、
上白下红墙体和非对称翼，因此主体绑定闭合。

315号不是211弄 / 329弄 compound，也不是其中任何成员。本轮没有发现315号图
与211弄2号、329弄17号或329弄38号的持续构件匹配。

### Evidence used

- 官方2023正面：canonical 沿街轮廓。
- 官方2023街景：道路上下文，不作侧立面证据。
- 上观 Image 242：“新华路315号俯瞰”，约束主体进深、屋顶连接和侧翼。
- 上观 Image 243：门牌和保护铭牌，直接闭合 stable subject。
- 上观 Image 244：沿街入口和前出山墙。
- 上观 Image 245 / 旧 comparison：正面外立面细节，已做字节匹配。
- 旧 Hero、旧生成器和 Recovery provisional Massing：只读 provenance 审计。

### Source conflict

2023官方文旅页称建筑“建于1930年”；2026上观页称“建成于1949年”。
本轮不判断哪个日期正确，统一列为 Unknown。两个日期都不进入比例、层高、
footprint 或屋顶高度推断。

### Rejected interpretations

1. **仅凭 Recovery 两张官方图通过侧向纵深门**

   Recovery 的街景图不显示315主体，不能作为侧面或进深证据。Evidence Gate
   只在同页 Image 242 俯瞰本地化并完成主体绑定后通过。

2. **继续使用旧图 `needs-review`**

   旧图已与页面 Image 245 完成完全相同 SHA 的字节验证，应升级为
   `verified-exact-source-byte-match`。

3. **复用 Recovery voxel Massing**

   它来自 `voxel-remesh-current-hero`，继承旧 Hero 未经俯瞰逐构件核对的
   侧后外推，并产生噪声轮廓。结构审计通过不等于 evidence provenance 通过。

4. **直接把旧 Hero 降面为新 Massing**

   旧 Hero 同时包含围墙、灯、花箱、铺装等范围外内容，并对背面和进深做了
   未证外推。本轮新候选必须从 canonical、俯瞰和入口证据独立构建。

5. **用 ordinary OSM 或历史 runtime bounds 决定几何**

   当前任务明确禁止 ordinary OSM。历史 position、yaw、scale、bounds 和
   obstacle 只作为迁移基线，不能替代主体照片。

### Evidence classification

#### Observed

- Image 243 直接把主体绑定为“新华路315号住宅”。
- 俯瞰显示相连的陡坡屋顶、中央高山墙、右侧长翼和左侧较小体量。
- 正面和入口图显示上白下红墙体、深色半木构与大出檐。
- 旧 comparison 与 Image 245 字节一致。
- 315号形体与已审计的211 / 329成员不同。

#### Inferred

- 沿街正面作为 local `-Y`。
- 俯瞰支持相对体块比例，但不是测绘尺寸。
- 历史 runtime 变换只作后续主窗口地图校准基线。

#### Unknown

- 建成年代：1930 / 1949来源冲突。
- 精确宽、深、层高、屋脊高度和 footprint。
- 隐藏背面开口与细部。
- 地图罗盘、权威落点和最终 runtime 变换。
- 共享 runtime 的 `townhouse` 标签是否要修正。

### Gate decision

Evidence Gate 允许制作一个无树木、无装饰、无图片贴图的
subject-specific Massing 候选。Identity 和 Hero 不开放。

Massing 必须：

- 从官方 canonical、Image 242 俯瞰和 Image 244入口独立构建；
- 保持 local `-Y` 正面；
- 使用 `1.8 m = 0.6667 scene unit` 的预览尺标；
- 做确定性双构建；
- 不复用 Recovery provisional geometry；
- 在 Blender MCP 前停下请求主窗口授权。

### Checkpoint state

- Blender result: Evidence checkpoint 未打开；
- Generator result: Evidence checkpoint 未修改；
- GLB result: 未创建或恢复；
- MCP 1: 未申请；
- Three.js result: 未进入；
- Performance impact: 无运行时变化；
- Shared files: 未修改；
- Other assets: 未修改。

### Rollback

删除本 checkpoint 新增的315号研究文件即可回到
`2e185c6d000157f2544c3e0d19435f403ceeb4e2`；旧 Hero、旧 `.blend`、公共运行时
和其他资产均未改动。

## Iteration 1 — Subject-specific Massing candidate

- Date: 2026-07-25
- Evidence checkpoint: `c9158b3`
- Result: `candidate-awaiting-blender-mcp-1`

### Changes

- 新建确定性单资产生成器
  `scripts/create_house_315_massing_model.py`。
- 新建独立 `massing-v2` `.blend` 和 `.glb`，没有覆盖旧 Hero 或 Recovery
  provisional 路径。
- 新建 canonical、side-depth、entrance 三张固定机位预览。
- 新建资产级 build record，记录 SHA、bounds、节点、三角面、材质、图片、
  体积、证据边界、尺标和后续门状态。

### Geometry decision

候选只表达照片持续支持的四组体块：

1. 横向连续的陡坡主屋顶；
2. 中央高、前出的半木构山墙；
3. 右侧较长纵向翼；
4. 左后侧较小低翼。

墙体只保留上白下红分区；中央山墙只保留远景可读的深色木构线。没有加入
门窗、烟囱、背面开口、室内、围墙、门、树木、草坪、灯、花箱或铺装。

### Deterministic build

同一 Headless 命令内部两次完全重置场景并分别生成 GLB：

- First SHA-256:
  `e9d62cfc7ffba69145d62508656a033a873e5769171414aff2124f7320389832`
- Second SHA-256:
  `e9d62cfc7ffba69145d62508656a033a873e5769171414aff2124f7320389832`
- Match: `true`

最终 `.blend` SHA-256：

`dccd5ad4a5b47e56c08e19be53446a6cb3eb43dc17dc5e10231018a5206b532b`

### GLB audit

- Bytes: `17,352`
- Nodes / meshes: `1 / 1`
- Materials: `4`
- Triangles: `176`
- Images / textures: `0 / 0`
- Animations / skins: `0 / 0`
- Unbaked transformed nodes: none
- Audit result: `ok`

glTF bounds 为 `min [-7.675, 0, -4.575]`、
`max [7.225, 6.982892, 4.84]`；其中 glTF `Y min = 0`，候选接地。

### Static visual check

- canonical：local `-Y` 正面、中央高山墙、左右翼和连续屋顶可读；
- side-depth：中央体量、右长翼、左短翼和屋顶连接关系可读；
- entrance：中央前出山墙和半木构识别线可读；
- 三视图使用 `1.8 m = 0.666667 scene unit` 橙色人物尺标；
- 蓝色正面标记、人物和预览地面均未保存、未导出。

静态预览只证明候选形体可读，不等于 Blender MCP、地图校准或 Three.js 验收。

### Environment note

首次在 managed sandbox 启动 Blender 5.2 时，应用在 Python 生成器执行前的
Metal 探测阶段崩溃；没有输出二进制。该问题与项目已有
`.learnings/ERRORS.md` 中 `ERR-20260725-031` 相同。随后用同一限定 Headless
命令在获准的沙箱外环境成功构建，模型代码无需为环境崩溃修改。

### Gate state

- Evidence Gate: Passed for subject-specific Massing only
- Blender result: Headless deterministic candidate complete
- GLB result: structural audit passed
- MCP 1: Pending main-window authorization
- Three.js result: Not run
- Map calibration: Not run
- Identity / Hero: Closed
- Shared files: Unmodified
- Other assets: Unmodified

### Required next

主窗口授权后，通过 Blender MCP 读取：

- 单 mesh、四材质和 root transform；
- canonical / side-depth / entrance 固定机位轮廓；
- local `-Y` 正面与 `1.8m` 尺标记录；
- 是否存在俯瞰证据未支持的突起或错误屋顶连接。

MCP 1 通过后才允许主窗口准备 Three.js Massing 地图校准。

## Iteration 2 — Blender MCP 1

- Date: 2026-07-25
- Source checkpoint: `ca0c413`
- Reviewed by: main coordinator
- Result: `PASS`
- Next gate: `three-js-massing-map-calibration`

### Scene inspection

- 正式场景只有 `house-315-massing` 1个 mesh、4个 materials；
- 120 vertices、92 polygons；
- 面积 `< 1e-10` 的 polygon 为0；
- non-finite normals 为0；
- root location / rotation 为0，scale为1；
- Blender bounds 为
  `[-7.675, -4.84, 0] .. [7.225, 4.575, 6.982892]`。

### Visual decision

主窗口从 canonical、side-depth、entrance-scale 三个方向确认：

- 中央高半木构山墙可读；
- 横向主脊可读；
- 非对称右长翼和左后短翼可读；
- 白色上墙与红砖基座分层可读；
- `1.8m` 临时人物 proxy 的尺度关系合理；
- 正式资产没有树木、围墙、门、灯或铺装。

### Provenance decision

- Accepted interactive changes: none
- QA rig saved: false
- QA rig exported: false
- Blend SHA 保持
  `dccd5ad4a5b47e56c08e19be53446a6cb3eb43dc17dc5e10231018a5206b532b`
- GLB SHA 保持
  `e9d62cfc7ffba69145d62508656a033a873e5769171414aff2124f7320389832`

因此无需回写 generator 或重做 Headless 双构建。

### Gate boundary

MCP 1 只放行 Massing map gate。Identity 和 Hero 继续锁定。Three.js 地图门必须：

- 冻结 `position [-23.03, 85.67]`、`yaw -0.38`、`scale 0.9`；
- 只临时替换本建筑的 QA model / bounds / obstacles；
- 验收后把公共 registry 逐字节恢复；
- 只提交建筑专属 QA、截图和集成建议；
- 不直接提交 shared registry 变化。

## Iteration 3 — Three.js Massing map gate

- Date: 2026-07-25
- Source checkpoint: `d2dca4a`
- Result: `formal-pass`
- Shared registry committed: no
- Identity / Hero authorized: no

### Temporary QA assembly

地图门只在临时静态 bundle 中把315号指向
`/models/tiers/xinhua-road/massing-v2/house-315-massing.glb`，并临时采用
候选 local bounds 与四个分体 obstacles。以下公共 placement 完全冻结：

- position `[-23.03, 85.67]`
- yaw `-0.38`
- scale `0.9`
- start `[-21.8, 67.6]`
- forward `[-0.05, 1]`

构建结束后立即用原始副本恢复
`app/scene/xinhua-road-landmarks-data.json`。恢复前后 SHA-256 均为
`eccba9706ef88456ee6616ff9f44bc6f41ec8ac76d3f09478d08f7f58b5527e6`。
临时 `dist-static` 不提交，旧 Hero GLB 没有覆盖。

### Runtime result

- 目标 GLB 请求 HTTP 200；
- PerformanceResourceTiming encoded body 为17,352 bytes；
- source 与 `dist-static` GLB SHA 均为 `e9d62cfc...`；
- canonical 中中央山墙朝街，位置、比例、接地和道路退界通过；
- side 视角中与相邻建筑没有 z-fighting 或可见穿插；
- 起点与近楼视角 camera QA 均为 `spring-clear`，arm 保持完整；
- Console messages 为0；
- Page errors 为0。

### Collision result

为避免 browser 命令延迟扩大按键时间，碰撞使用页面内单次异步脚本精确控制
`keydown → timer → keyup`。同时保持可信 pointer-down 且不产生 pointer delta，
阻止自动相机跟随改写世界方向。

固定方向输入分段为 `4001.8 + 2001.2 + 2001.8 + 2002 ms`。角色：

1. 从现有 `house315` start 穿过道路退界；
2. 进入中央前出山墙与右翼之间的开放前场凹口；
3. 重复输入后仍位于深色主屋体之前，没有穿过后墙。

四个 obstacle 分别约束横向主屋、中央山墙、右长翼和左后短翼，没有用一个
整院大盒覆盖前场。Camera blocker `none` 是项目“地标对镜头透明”的既有语义，
不作为人物碰撞证据。

### Performance result

- Build: Vite static production preview
- Viewport: 1280 × 720
- DPR: 1
- Page visibility: visible
- Prewarm: 12 seconds
- Sample: 10,007.4ms
- Frames: 601
- FPS: 60.0556
- Maximum frame: 16.8ms
- Frames over 33.34ms: 0
- Baseline claim: none

没有同条件旧模型基线，因此只声明当前候选在该协议下通过，不声明性能提升。

### Integration recommendation

主窗口未来整合时仅更新315号：

- model:
  `/models/tiers/xinhua-road/massing-v2/house-315-massing.glb`
- cacheVersion: `e9d62cfc7ffb`
- localBounds:
  `{ minX: -7.675, maxX: 7.225, minZ: -4.575, maxZ: 4.84 }`
- localObstacles: 使用专项 QA 中四个分体盒；
- position / yaw / scale / start / forward 保持不变。

本 Worktree 不直接修改 shared registry。下一步是主窗口的共享 Massing
integration review，而不是 Identity 或 Hero。

## Iteration 4 — Legacy Hero disposition

- Date: 2026-07-25
- Source checkpoint: `78964c9`
- Result: `hold-read-only-rollback-only / rebuild-required`
- Blender MCP 2 requested: no
- Identity authorized: no
- Shared registry modified: no

### Lineage freeze

旧 Hero 的四个原始产物保持未改动：

- generator:
  `scripts/create_xinhua_road_models.py`
- editable source:
  `assets/models/source/xinhua-road/house-315.blend`
- runtime GLB:
  `public/models/xinhua-road/house-315.glb`
- generic preview:
  `test_artifacts/test_house-315_preview.png`

`.blend` / GLB / preview 的 SHA-256 分别为
`2e3a30f7... / 9d407a35... / 8297d83d...`。三者最后一次修改都来自
`e292fde194c2704a9eeaf7e4a8faf192a5d0385e`
（`feat: overhaul POI models and references`，2026-07-18）。

当前完整共享 generator SHA 为 `6ea5fc19...`，producing commit 中完整 generator
SHA 为 `c731e808...`；两者不同。但 `build_house_315()` 函数块 SHA 均为
`7552dd51...`，说明315号函数本体未漂移。仓库不存在旧 Hero 的资产级 build
record；旧 `research/house-315-model-brief.md` 和全局 detail baseline / upgrade
只能作历史引用，不能替代二进制 lineage record。

### Subject decision

旧 Hero 不是其他建筑误绑。它明确以315号为目标，并保留以下持续 cue：

- 陡坡相连红瓦屋顶；
- 前立面半木构山墙；
- 上白下红墙体；
- 烟囱和大出檐语言。

但它不是当前 House315 subject contract 的 MCP2 候选：

1. 旧函数是单一主块、偏置横山墙和右侧凸窗；
2. 当前俯瞰证据与已通过地图门的 Massing 要求中央高前出山墙、横向主脊、
   右长翼与左后短翼；
3. 旧门廊门与证据中的中央高开口、沿街门和山墙关系不一致；
4. 隐藏侧后面仍是旧推断，没有以 `Unknown` 边界约束。

Image 243 的门牌只用于闭合 stable subject；它不授权把受保护文字或标牌复制进
GLB。旧 Hero 没有复制该门牌，也没有记录2026补齐证据的 lineage。

### Structural audit

Bundled GLB audit 只证明容器政策通过。独立 accessor 解析结果：

- 1 scene、1 node、1 mesh、14 primitives / materials；
- 23,512 triangles；
- 0 images / textures / animations / skins；
- 根节点无显式 transform，位置 / 旋转 / 缩放等价于单位变换；
- glTF bounds：
  `[-9.25, -0.055, -6.7] .. [9.25, 9.99, 9.5]`；
- 120个零面积三角面，其中浅石材96、铁艺24；
- non-finite positions、invalid indices、missing / zero / non-unit normals
  和 face-vertex orientation mismatches 均为0。

Headless Blender 5.2 通过
`scripts/test_house_315_hero_blend_audit.py` 在 sandbox 外只读打开旧4.05
`.blend`，未保存：

- 1 mesh、12,562 vertices、10,943 polygons、23,512 loop triangles；
- Blender bounds：
  `[-9.25, -9.5, -0.055] .. [9.25, 6.7, 9.99]`；
- 60个零面积 polygons / 120个零面积 triangles；
- non-finite positions / normals 与 triangle-polygon orientation mismatches
  均为0。

旧 Hero 最低点为 `-0.055`，且 envelope 被整块庭院扩张；已通过地图门的 Massing
bounds 是 `[-7.675, -4.84, 0] .. [7.225, 4.575, 6.982892]`。两者无法在固定
placement 下无包络、ground 或 collision popping 地切档。

### Scope audit

旧 generator 明确生成并合并以下范围外内容：

- 1整块庭院 slab；
- 2段围栏与2段门；
- 2盏入口灯；
- 2个带绿植花箱；
- 装饰铺装网格。

没有显式树木、独立灌木、草坪、外摆或其他建筑，但以上范围外内容已与主体合并
为单一 runtime mesh，无法安全拆除。本轮没有删除、覆盖或重新导出任何旧资产。

### Fixed-view audit

- 真实 canonical：官方2023沿街正面，Supported；
- 真实 side / depth：上观 Image 242 俯瞰只支持 Massing，隐藏背面为 Unknown；
- 真实 entrance / address：Images 243 / 244，Supported；
- 旧 Hero render：只有 generic oblique `test_house-315_preview.png`；
- 旧 runtime comparison：仅 front-ish map context，且 `.png` 扩展内实际为 JPEG；
- 正式 Hero canonical、side-depth、entrance-detail、Hero / Massing 同机位对照：
  Missing。

### Gate decision

完整 disposition 见
`docs/research/house-315-hero-disposition.json`。

结论是 `Hold / rebuild required`，不是 `repair-in-place`：旧模型的基础体量、
ground / envelope 与已批准 Massing 都不同，而且场地污染已 baked。若主窗口决定
重新开放 Hero evidence contract，应：

1. 新建独立 `hero-v2` generator / `.blend` / GLB / build record 路径；
2. 从已通过 MCP1 和地图门的 Massing 继承 origin、front、ground、体量与碰撞语义；
3. 只增加照片直接支持的建筑构件，隐藏背面保持 Unknown；
4. 不生成树木、灌木、草坪、围栏、门、灯、花箱、铺装、ordinary OSM 或其他建筑；
5. 关闭 zero-area、固定视图和 lineage blocker 后才向主窗口申请串行 MCP2；
6. MCP2 通过前 Identity 继续锁定。

## Iteration 5 — Independent Hero v2 candidate

- Date: 2026-07-25
- Source checkpoint: `518211e`
- Main-window authorization: explicit Hero v2 build, stop before MCP2
- Result: `candidate-awaiting-main-window-blender-mcp2`
- Public registry / runtime modified: no
- Identity authorized: no

### Lineage and source

新 Hero 使用独立路径：

- generator:
  `scripts/create_house_315_hero_model.py`
- editable source:
  `assets/models/source/tiers/xinhua-road/hero-v2/house-315-hero.blend`
- GLB:
  `public/models/tiers/xinhua-road/hero-v2/house-315-hero.glb`
- build record:
  `docs/research/build-records/tiers/xinhua-road/hero-v2/house-315-hero.json`

生成器调用已通过 MCP1 和 Three.js map gate 的
`scripts/create_house_315_massing_model.py` 作为结构 source，并在启动时校验：

- Massing generator SHA `45c69f7f...`；
- Massing Blend SHA `dccd5ad4...`；
- Massing GLB SHA `e9d62cfc...`；
- legacy Hero Blend / GLB SHA `2e3a30f7... / 9d407a35...`。

没有读取旧 Hero geometry、Recovery voxel、ordinary OSM、全地图或其他建筑。
旧 Hero 没有删除、覆盖或重新导出。

### Hero construction decision

Hero v2 保留已验收 Massing 四个主体体量，再增加：

1. 中央高半木构山墙的二级横梁、立柱、斜撑和上层小窗；
2. 中央高玻璃入口、两侧窗与无文字中性门牌 proxy；
3. 主屋、右长翼和可见侧面的开口节奏；
4. 俯瞰可见的长条老虎窗和一处烟囱；
5. 四组屋面的低密度瓦垄和附着檐口。

街道门 / 独立门扇、文字 / logo、隐藏背面开口和所有场地资产均未制作。右侧
可见面只使用俯瞰可支持的低细节节奏；隐藏背面维持 `Unknown / low-detail`。

### Frozen tier contract

Hero 与 Massing 完全共享：

- authored front: local `-Y`
- scene unit: `2.7 m`
- ground datum: `0`
- Blender bounds:
  `[-7.675, -4.84, 0] .. [7.225, 4.575, 6.982892]`
- glTF bounds:
  `[-7.675, 0, -4.575] .. [7.225, 6.982892, 4.84]`
- runtime position / yaw / scale:
  `[-23.03, 85.67] / -0.38 / 0.9`
- four local obstacles from
  `docs/research/house-315-massing-map-qa.json`
- canonical / side-depth / entrance fixed cameras。

Hero GLB 不内置 collision geometry，公共 registry 继续指向旧 Hero；后续只能由
主窗口在 MCP2 后决定集成。

### Determinism and structural result

两个独立 clean scene build 的 GLB SHA 完全一致：

`ad414549bf6953bdeffe9b43d56b589101becf1a8c9efb57ac34446eac92f964`

最终产物：

- Blend SHA:
  `2750b3c876fa651ce1fd0ed09f8e9a5557804b8e2783839f6ed63a740cd756b6`
- GLB bytes: 212,908
- 1 node、1 mesh、6 primitives / materials
- 2,936 triangles
- 0 images / textures / animations / skins
- root location / rotation 为0，scale为1
- Blend: 1,960 vertices、1,472 polygons、2,936 loop triangles
- Blend / GLB zero-area: 0
- non-finite positions / normals: 0
- invalid indices: 0
- missing / zero / non-unit normals: 0
- face-vertex / triangle-polygon orientation mismatches: 0

Bundled GLB audit `--forbid-images --max-nodes 1` 通过。

### First-build guard correction

首轮双构建本身 SHA 一致，但上山墙窗框和两根新斜撑向 local `-Y` 多伸出
`0.0275`，使 glTF max Z 从冻结值 `4.84` 变为 `4.8675`。生成器按 exact-bounds
门禁主动失败，没有放宽 contract。随后只将新窗框 / 斜撑退回 Massing 包络内，
第二轮 exact bounds、拓扑和法线全部通过。

### Fixed-view candidate review

Headless fixed views：

- canonical：
  `test_artifacts/all-models/hero-v2/house-315/test_house-315-hero-v2-canonical.png`
- side-depth：
  `test_artifacts/all-models/hero-v2/house-315/test_house-315-hero-v2-side-depth.png`
- entrance：
  `test_artifacts/all-models/hero-v2/house-315/test_house-315-hero-v2-entrance.png`

候选自检可读：

- 中央高半木构山墙与横向主脊；
- 右长翼和左后短翼的体量层级；
- 上白下红材质分区；
- 高入口、门牌 proxy、老虎窗、烟囱和右侧可见开口；
- 1.8m proxy 与 local `-Y` marker。

这些截图不等于 Blender MCP2 Pass。正式场景、材质、穿插、入口和碰撞 intent
仍必须由主窗口通过共享 Blender MCP 串行复核。

### Gate boundary

- MCP2: `requested / pending-main-window-serial-review`
- Three.js Hero runtime: not run
- Identity: locked
- Shared registry/runtime: unchanged
- Next action: 提交本候选 checkpoint，停下申请主窗口 Blender MCP2。

## Iteration 6 — Blender MCP 2 Hero visual review

- Date: 2026-07-25
- Source checkpoint:
  `e258a02a9ace4dbc34ce2978dcadcb4112370939`
- Reviewed by: main coordinator
- Result: `PASS`
- Identity state:
  `post-mcp2-unlocked-awaiting-main-window-integration / not-started`
- Public registry / runtime modified: no

### Scene and lineage inspection

- 正式场景只有1个 mesh，1,960 vertices、1,472 polygons；
- 6 / 6 materials 均使用 Principled node；
- root location / rotation 为0，scale为1；
- zero-area polygons 为0，non-finite normals 为0；
- minimum face area 为 `0.001224979`；
- 来源仍是已验收 Massing GLB `e9d62cfc...`；
- 未读取或混用旧 Hero、Recovery voxel、ordinary OSM geometry。

### Fixed-view visual decision

主窗口通过同一 Hero 固定机位确认：

- canonical：中央高半木构山墙和横向红瓦主脊主导，右长 / 左短翼、上白下红、
  高入口与1.8m尺度关系可读；
- side-depth：非对称翼、屋顶层级和立面连接连续；
- entrance：中央高入口、无文字门牌关系、窗与半木构节奏可读；
- 隐藏后侧保持低细节 `Unknown`；
- 没有庭院、围栏、门、灯、花箱、铺装、树木、灌木、草坪、外摆或其他建筑。

正式 MCP2 截图：

- canonical:
  `test_artifacts/all-models/hero-v2/house-315/test_house-315-hero-v2_mcp2_recheck_canonical.png`
  (`3bb6bf7b...`, 828,549 bytes)
- side-depth:
  `test_artifacts/all-models/hero-v2/house-315/test_house-315-hero-v2_mcp2_recheck_side.png`
  (`d5889667...`, 893,153 bytes)
- entrance:
  `test_artifacts/all-models/hero-v2/house-315/test_house-315-hero-v2_mcp2_recheck_entrance.png`
  (`959e79ca...`, 933,340 bytes)

### Provenance and next boundary

- Accepted interactive changes: none
- QA rig saved: false
- QA rig exported: false
- Hero Blend / GLB SHA 保持
  `2750b3c8... / ad414549...`
- Legacy Hero 继续 Hold，未删除、未覆盖；
- 公共 registry / runtime 继续不动；
- Identity 可从该 Hero v2 派生，但必须等待主窗口先整合 candidate 与 gate commit；
  本 checkpoint 不启动 Identity。

## Iteration 7 — Independent Identity v1 candidate

- Date: 2026-07-25
- Main-window integrated Hero checkpoints:
  `608369c / a237231`
- Frozen Hero source:
  generator `61e3aa51...` / Blend `2750b3c8...` / GLB `ad414549...`
- Result: `candidate-awaiting-main-window-mcp3`
- Runtime / public registry modified: no

### Derivation decision

Identity 没有另造一套形体，也没有读取 legacy Hero、Recovery voxel 或 ordinary
OSM。生成器导入并 SHA 锁定 Hero v2 generator，通过其确定性 helper 在同一
accepted Massing shell 上重建 Hero 的证据子集。

保留中央高半木构山墙、横向主脊、右长 / 左短翼、上白下红、高入口、主要窗组、
老虎窗和烟囱；主动删除密集瓦垄、细窗棂、一组右侧窗和次要立面分割。隐藏后侧
继续是低细节 `Unknown`。

### Frozen continuity

Identity 与 Hero / Massing 精确共享：

- origin `[0, 0, 0]`
- authored front local `-Y`
- ground datum `0`
- glTF bounds
  `[-7.675, 0, -4.575] .. [7.225, 6.982892, 4.84]`
- runtime `[-23.03, 85.67] / -0.38 / 0.9`
- 四个 local obstacles、入口与前场凹口通行语义
- canonical / side-depth / entrance fixed cameras

### Determinism and budget

- Identity generator SHA `19fe2646...`
- 最终 Blend SHA `79cc3608...`，109,984 bytes
- GLB SHA `425e21b9...`，62,288 bytes
- 1 node / 1 mesh / 6 materials / 776 triangles
- 0 images / textures / animations / skins
- Identity / Hero ratio：triangles `26.4305%`，bytes `29.2558%`
- 同一命令内两个 clean scene build 及第二次完整命令的 GLB SHA 完全一致
- `.blend` 跨保存容器 SHA 因 Blender 内部保存元数据变化；最终提交与 build
  record 冻结 `79cc3608...`，GLB 确定性不受影响
- Blend / GLB zero-area、non-finite、invalid index、normal mismatch 全0
- minimum Blend polygon area `0.002750017`

### Scope and fixed-view check

canonical、side-depth、entrance 三张 Headless 预览确认中央高山墙、左右翼、
白 / 红分层、高入口和窗组在 Identity 预算下仍可读。预览人物和 local `-Y`
marker 只属于临时 QA context，未保存到 Blend、未导出 GLB。

没有生成庭院 slab、围墙、围栏、街道门、灯、花箱、铺装、树木、灌木、草坪、
外摆、店招、其他建筑或全地图资产。旧 Hero、Hero v2 与公共 registry/runtime
SHA 均保持。

### Gate boundary

- Identity candidate: complete
- Independent peer review: `Ready`，Critical / Important / Minor 均为0
- MCP3: pending main-window same-camera three-tier review
- Identity formal pass: false
- Runtime authorized / started: false / false
- Public registry modified: false
- Next action: 提交候选并请求主窗口 MCP3；不得自行 Pass 或启动 runtime。

## Iteration 8 — Main-window Blender MCP3 pass

- Date: 2026-07-25
- Reviewed candidate commit:
  `6166d7d75591c5c0f2319ad0b04fa9cd026429a8`
- Result: `mcp3-pass-runtime-pending`
- Reviewer: main coordinator through Blender MCP

### Direct scene inspection

主窗口直接打开最终 Identity `.blend`，没有读取代理截图代替正式门：

- 1 building mesh，520 vertices，392 polygons；
- 6 materials，6/6 使用 Principled BSDF；
- root location / rotation `[0,0,0]`，scale `[1,1,1]`；
- bounds `[-7.675,-4.84,0] .. [7.225,4.575,6.982892]`；
- faces below `1e-10`: 0；
- minimum polygon area `0.002750016748905182`；
- non-finite normals: 0。

### Same-camera visual decision

- canonical：中央高半木构山墙、横向主脊、白 / 红分层与不对称翼可读；
- side-depth：右长翼、左后短翼、老虎窗、烟囱和屋面层级连续；
- entrance：高入口、主要窗组、半木构与 1.8m 人物尺度关系可读；
- Hero → Identity 的瓦垄、窗棂与次要分割减量明确；
- Identity → Massing 保持轮廓、原点、front、bounds、placement 与 collision 语义。

正式 MCP3 图：

- `test_house-315-identity-v1_mcp3_recheck_canonical.png`
  (`ec629bce...`, 752,578 bytes)
- `test_house-315-identity-v1_mcp3_recheck_side-depth.png`
  (`3dc7ad0f...`, 771,459 bytes)
- `test_house-315-identity-v1_mcp3_recheck_entrance.png`
  (`4449238a...`, 799,157 bytes)

### Boundary

- Accepted interactive changes: none
- QA rig saved / exported: false / false
- Source Blend 重新打开后 `dirty=false`，只含 `house-315-identity`
- Trees / decoration / site / other buildings / full-map assets: none
- Runtime authorized: true
- Runtime started / integrated: false / false
- Next gate: House315 Three.js three-tier runtime acceptance
