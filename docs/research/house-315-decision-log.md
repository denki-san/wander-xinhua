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
