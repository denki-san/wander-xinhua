# Xinhua Villas 329 Decision Log

## Iteration 0 — Recovery evidence and cross-asset audit

- Date: 2026-07-25
- Stable asset ID: `xinhua-villas-329`
- Worktree baseline:
  `69db0b421fc1ba7795e8af9fc14fd440b704b547`
- Recovery commit:
  `3044cd89f801250afcd477dfbcbc7da358bf4b11`
- Result: `blocked-evidence`

### Changes

- 从 Recovery 只选择性恢复329弄17号、38号两张官方参考图，字节与 SHA-256
  保持一致。
- 新建资产级 Brief、reference manifest 和本 decision log。
- 未摘取 Recovery 的 `.blend`、`.glb`、共享 Massing generator、公共 registry、
  runtime、普通 OSM 数据、测试或其他建筑文件。

### Stable boundary decision

`xinhua-villas-329` 保持为“329弄成片历史住宅与里弄” compound。仓库运行时
使用 `villa-row`，POI 文案同样描述成片住宅；没有依据把 stable ID 直接定义为
17号、38号或一栋未知“代表别墅”。

本轮也没有329弄入口照片，因此不能把 stable ID 定义为入口 package。
幸福里三分区和211弄均为独立 stable ID，不属于本资产。

### Evidence used

- `xinhua-villas-329-17-official-2024.jpg`：成员17号正面。
- `xinhua-villas-329-38-official-2025.jpg`：成员38号正面斜视。
- 旧 `xinhua-villas-329-real.jpg`、旧 Hero GLB 和生成器：只读交叉绑定审计。
- `xinhua-villas-211-2-official-2025.jpg` 与211 manifest：只读确认旧329图
  实际显示211弄2号。
- Recovery voxel / clean-v2 Massing、build records 和截图：只读 provenance
  与视觉审计。

### Cross-asset finding

旧“329代表图”和官方211弄2号照片不是相同字节，但显示同一栋建筑。两者共同
具有长条老虎窗、首层玻璃围合、左侧高烟囱、右侧多边形塔楼、右侧半木构体量，
花园和远景关系也一致。

旧329 Hero 生成器逐项实现了这些构件。因此：

- 旧 Hero 保留但标记为 `cross-asset-contaminated-legacy`；
- 不从它派生329 Massing 或 Identity；
- 本 Worktree 不修改211资产，也不替主窗口修公共 registry。

### Rejected interpretations

1. **把旧 Hero 当成329代表建筑**

   其证据主体已经绑定为211弄2号。

2. **把17号和38号照片合成一栋**

   两张照片属于不同门牌，形体、开口和屋顶组织明显不同。

3. **默认选择38号作为代表建筑**

   38号的斜视证据较强，但 stable ID 当前是 compound；改变代表语义需要
   主窗口授权并同步未来 bounds、碰撞和地图责任。

4. **接受 clean-v2 的五个平顶盒**

   五个节点全部是 `unbound-member-candidate`，高度是 fallback，且当前任务
   禁止 ordinary OSM。JSON `runtime-pass` 只证明盒子能显示。

5. **接受 voxel Massing**

   它来自旧 Hero，继续携带211弄2号的错误主体。

### Evidence classification

#### Observed

- 17号与38号是两栋不同成员建筑。
- 两张329官方图都没有显示弄堂入口或 compound 布局。
- 旧329图与官方211弄2号图显示同一栋建筑的持久构件。
- clean-v2 是五个未绑定、无身份轮廓的平顶盒。

#### Inferred

- 旧329 Hero 是211弄2号的高置信度跨资产误绑。
- 329 stable ID 应继续保持 compound，直到入口 / 布局闭合或明确选择代表成员。
- 38号可作为未来单体候选，但当前未授权。

#### Unknown

- 329弄入口、成员数量、compound 边界和成员布局。
- 17号、38号相对位置、朝向、完整 footprint 与背面。
- 36号“蛋糕房”几何，因为只有文字、没有本地照片。
- 当前 runtime 包络与真实 compound 的对应关系。

### Gate decision

Evidence Gate 不允许制作或恢复 subject-specific Massing。没有 compound
canonical、入口或布局；两个有图成员没有空间绑定；两个 Recovery Massing
分别携带跨资产 lineage 或未绑定 ordinary-OSM footprint。

因此本轮：

- Blender result: 未打开；
- Generator result: 未修改、未运行；
- GLB result: 未创建或恢复；
- MCP 1: 未申请；
- Three.js result: 未运行新候选；
- Performance impact: 无运行时变化；
- Shared files: 未修改；
- Other assets: 未修改。

### Required next evidence

- 329弄入口与 compound 关系的可信本地照片；
- 可授权的329弄场地平面、测绘或用户确认成员布局；
- 或主窗口明确选择17号 / 38号作为代表建筑；
- 选定主体的同楼侧向 / 纵深和入口证据。

### Rollback

删除本提交新增的329弄研究文件即可回到
`69db0b421fc1ba7795e8af9fc14fd440b704b547`；本轮没有二进制资产或公共运行时
改动。

## Iteration 1 — Fast Mode Recovery lineage checkpoint

- Date: 2026-07-26
- Baseline: `222e7ebd7ef556f7f3f6edd2c0561a6e6c36111f`
- Recovery commit:
  `3044cd89f801250afcd477dfbcbc7da358bf4b11`
- Result: `blocked-with-sufficient-evidence-and-reproducible-recovery-lineage`

### Recovery continuation

只选择性接续329弄 Massing-v2 的 `.blend`、GLB、原 build record，以及 canonical、
side、runtime context、runtime isolated 四张建筑专属 QA 图。三个正式产物均与
Recovery blob 逐字节一致，GLB SHA-256 为 `f7ade44b…c3819`。

显式结构审计通过：`8244 bytes / 5 nodes / 5 meshes / 1 material /
0 images / 0 textures`。这只证明容器和无图片策略，不证明五个 footprint
属于329弄。

### Gate inheritance

- `runtimeGate=pass`：仅继承 Recovery runtime visual evidence。
- `mapAcceptance=blocked`：保持原结论；没有新 runtime 执行。
- `mcp1=pending-main-window-batch`：Recovery 没有正式 MCP1 字段，本轮也没有
  打开 Blender 或执行 MCP。
- Evidence Gate：复核五个既有建筑专属证据文件后仍为 `blocked-evidence`。

正式地图门不能开始：五个节点全部是未绑定 OSM 候选，官方17号和38号照片没有
compound canonical、入口、空间布局或候选 footprint 对应关系。即便既有截图
显示这些盒子可以加载，也无法验证真实道路退界、成员间开放路径、入口净空和
碰撞语义。

### Shared boundary and main-window handoff

本分支未修改共享 registry、runtime 或 Fast manifest。精确候选接线记录在
`docs/research/xinhua-villas-329-massing-recovery-checkpoint.json`：

- tests：新增329 recovery checkpoint 专项测试；
- glbs：保留旧 Hero 审计，并追加 Massing-v2 结构审计路径；
- routes：保留既有 `villas329`，候选增加资产级
  `qaModelId=xinhua-villas-329&qaModelTier=massing`；
- runtime：候选 route 必须等待主窗口添加 scoped resolver，且证据 blocker
  解除前不得进入 production quality manifest；
- MCP1：由主窗口在2～3栋批量终审时首次执行。

### Rollback

删除本 iteration 新增的 checkpoint JSON、专项测试、Recovery Massing-v2 三个
正式产物和四张忽略规则内 QA 图，并回退 Brief / decision log 的本节即可。本轮
没有共享文件改动。

## Iteration 2 — XHS evidence-bound Massing v3

- Date: 2026-07-26
- Parent checkpoint: `bdc038d4685ab94e4c78af1dfd83adb3ee8460b0`
- Result: `evidence-pass-conservative-massing-v3`

### Evidence intake

主窗口在用户已登录 Chrome 中只读固化小红书帖子
`696d1838000000002102bc99` 的18张截图和接触表。本分支复制原字节到
`docs/research/assets/xhs-xinhua-villas-329-20260725/`；没有覆盖旧官方证据。

第1–8、18张媒体区可读；9–17张媒体区黑屏，保留但标记 `needs_review`。
帖子正文与可见门牌共同支持15、36、40、42号；17和38继续保留官方证据，
32乙和沿街231号只由正文命名，均不强行映射。

### Member binding decision

使用原始 OSM WGS84 footprint、当前 registry transform 和 XHS 顺序建立
Massing 级绑定：

- `way/864493244 → 15`
- `way/864485664 → 36`
- `way/864493174 → 40`
- `way/864493173 → 42`

这四项是可审计的 sequence-and-spatial binding，不是地籍确认。第五个候选
`way/864493245` 的原始 OSM 世界中心约为 `[-42.347, 92.123]`；现有照片与
门牌证据无法把它绑定到329弄成员，因此只按
`excluded-evidence-unbound-unknown-adjacent` 排除，不归属其他资产。

### Modeling decision

创建单资产确定性生成器与 Massing v3：

- 四个 member mesh 使用 OSM footprint；
- 36号只表达双层圆形主体、低瓦翼和高烟囱；
- 40号只表达低瓦主体、入口 canopy 和深色上层围合；
- 42号只表达正面山墙与浅瓦门廊；
- 15号只表达可见二层包络，不猜完整立面；
- 未知背面、窗门节奏、附楼、树木和装饰全部省略。

第一次固定机位预览发现材质未显式写入 Principled Base Color，且36圆形主体被
矩形基座吞没；两项都回写生成器后重建。最终 side-depth 预览可读圆形体量，
四类材质也正确分层。

新增参考 / Blender / Three.js 三联 checkpoint；第三栏明确写为
`PENDING MAIN-WINDOW QA`，避免把旧 runtime 截图冒充 v3 地图验收。

### Results and gates

- Blend SHA:
  `68004686207183ee7276c52b6c4805dc3233c7fd76d19fb9ba11d254444709c1`
- GLB SHA:
  `f245efd099d00049c068230fe999f5e492c16aef441775dddf7c41dd9350b704`
- GLB:
  `21,632 bytes / 4 nodes / 4 meshes / 204 triangles / 4 materials /
  0 images / 0 textures`。
- Explicit audit: pass with `--forbid-images --max-nodes 8`。
- Evidence: `pass-conservative-massing-only`。
- MCP1: `pending-main-window-batch`，本轮没有执行 Blender MCP。
- Runtime / map: `pending-main-window-scoped-qa`，没有修改共享接线。
- Identity / Hero: 未授权；不越过 MCP1 与地图门。

## Iteration 3 — Raw OSM projection and authored-coordinate correction

- Date: 2026-07-26
- Trigger: 主窗口地图审计发现 binding 的第二坐标被错误解释为 Blender Y，
  而不是 GLB source Z；直接套 registry transform 会造成 `5.670–16.930`
  scene unit 的中心偏差。
- Correction: 逐顶点读取原始 OSM WGS84，使用地图中心与 `2.7 m/unit` 投影到
  world，再逆变换为 `glb-source-xz-before-runtime-z-flip`；生成器显式执行
  `BlenderY = -sourceZ`。
- Verification contract: 专项测试从原始 OSM 重算四个 footprint，逐顶点 world
  回投影最大误差必须 `<= 0.05 scene unit`。
- Gate reset: 新 GLB SHA 已生成；旧 MCP1 截图只保留历史上下文，正式 MCP1 与
  map gate 均等待主窗口基于新 SHA 重验。
- Scope: 未修改 shared registry、runtime、Fast manifest、Hold 或其他建筑。

### Wiki and shared boundary

仓库内新增可回溯 source Markdown；独立 `Threejs-3d-research` Wiki 的外部
硬链接、rescan、队列清空和搜索回读交由主窗口整合。本分支没有修改共享
registry、runtime、Fast manifest 或 production quality manifest。

### Rollback

删除 v3 generator、binding spec、Blend、GLB、build record、三张 v3 固定机位图、
三联 checkpoint、XHS 证据目录与本轮文档增量即可回到 `bdc038d`；旧 Recovery v2
与原始官方证据均保持不变。
