# Xinhua Villas 211 Decision Log

## Iteration 0 — Recovery evidence audit

- Date: 2026-07-25
- Stable asset ID: `xinhua-villas-211`
- Worktree baseline: `9ddf693e28c87a7f2bcdb223bffde42a3f4920e0`
- Recovery commit:
  `3044cd89f801250afcd477dfbcbc7da358bf4b11`
- Result: `blocked-evidence`

### Changes

- 从 Recovery 只选择性恢复211弄的三张原始官方参考图，字节与 SHA-256
  保持一致。
- 新建资产级 Brief、reference manifest 和本 decision log。
- 未摘取 Recovery 的 `.blend`、`.glb`、共享 Massing generator、公共 registry、
  runtime、测试或其他建筑文件。

### Stable boundary decision

`xinhua-villas-211` 保持为“211弄复合院落入口 / 弄堂锚点”。它不是211弄1号
或2号单体，也不包含 `xinhua-villas-329`。Recovery Brief 使用“211弄与329弄
合计29栋”的上下文描述，但该数量不能成为211弄资产的生产清单。

入口轴线照片是当前 stable ID 的 canonical front。211弄1号照片虽然是明确正面，
但只属于一个未完成空间绑定的成员；不能把整个 stable ID 偷换为1号单体。

### Evidence used

- `xinhua-villas-overview-official-2023.jpg`：复合入口、左右边缘和开放车道。
- `xinhua-villas-211-1-official-2025.jpg`：成员1号正面。
- `xinhua-villas-211-2-official-2025.jpg`：成员2号正面斜视。
- 旧 `xinhua-villas-211-real.jpg` 与 runtime 截图：只用于核对旧四栋 package
  与入口证据不一致的边界。
- 现有 Hero GLB 和生成器：只读结构 / provenance 审计。
- Recovery Massing GLB、build record 和三张截图：只读反例审计。

### Rejected interpretations

1. **把1号和2号照片拼成一栋代表别墅**

   两张照片明确是不同成员建筑，形体、屋顶和立面语言也不同。

2. **把211弄与329弄合计29栋当作211弄资产范围**

   这会跨越独立 stable ID `xinhua-villas-329`。

3. **沿用旧四栋 Hero 的排布制作 Massing**

   现有生成器把四栋住宅固定在马蹄形车道周围，并加入树木和装饰；三张官方图
   不能证明这些位置。

4. **接受 Recovery voxel Massing**

   它来自 `voxel-remesh-current-hero`，只是把同一未绑定排布体素化，结构审计
   通过不等于 subject-specific Massing 通过。

5. **只造入口门房并继续使用 stable ID**

   入口阈值是当前唯一能直接支持的局部，但把完整 compound contract 缩成门房
   package 会改变碰撞、bounds 和 runtime 语义，必须由主窗口明确授权。

### Evidence classification

#### Observed

- 入口由左右不同建筑边缘框住，中间是开放弄堂。
- 右侧是白色填充、深色木构和瓦屋顶的小体量；左侧仅局部可见。
- 1号和2号是两栋不同成员。
- 三张照片没有建立入口、1号、2号之间的空间关系。

#### Inferred

- 右侧小体量可能是门房。
- 入口两侧实体应分开碰撞，中央车道保持开放。
- runtime 位置、yaw 和 scale 只能作为历史迁移基线。

#### Unknown

- 211弄自身边界和成员数。
- 入口两侧体量与1号、2号的门牌对应。
- 完整 footprint、深度、高度、朝向和成员布局。
- 可重复验证的入口净宽、道路退界和碰撞边界。

### Gate decision

Evidence Gate 不允许当前制作 subject-specific Massing。缺少同一 compound 的
侧向 / 纵深证据和可授权空间平面，同时当前任务禁止 ordinary OSM 与全地图推断。

因此本轮：

- Blender result: 未打开；
- Generator result: 未修改、未运行；
- GLB result: 未创建；
- MCP 1: 未进入；
- Three.js result: 未运行新候选；
- Performance impact: 无运行时变化；
- Shared files: 未修改；
- Other assets: 未修改。

### Required next evidence

- 211弄独立场地平面、测绘图或用户确认的建筑—门牌布局；
- 入口两侧同一建筑的侧向 / 纵深照片；
- 1号、2号相对入口的位置和朝向；
- 或主窗口明确授权把资产 contract 缩为“入口阈值 package”。

### Rollback

删除本提交新增的211弄研究文件即可回到
`9ddf693e28c87a7f2bcdb223bffde42a3f4920e0`；本轮没有二进制资产或公共运行时
改动。

## Iteration 1 — OSM footprint-bound Massing v3

- Date: 2026-07-26
- Worktree baseline: `cec073918cf0258de670c041fb48a8cc65d1fc79`
- Result: `pass-conservative-massing-footprints-only`
- MCP 1: `pending-main-window-batch`
- Three.js map gate: `pending-main-window-scoped-qa`

### Why the prior blocker changed

主窗口明确要求本栋执行“原始 OSM WGS84 → world → registry local”地图绑定。
仓库现有 district replacement inventory 已把九个 raw OSM ways 精确归到
`xinhua-villas-211`。这足以解除 footprint Massing blocker，但并不提供
门牌—成员对应关系，因此 Hero 与 Identity blocker 保持。

### Recovery decision

Recovery Massing `407cde33...` 的 GLB 容器审计通过，但其方法是
`voxel-remesh-current-hero`，继承旧四栋 Hero 的未证明排布，也没有 per-way
WGS84 绑定。它继续保留在 Recovery/Hold，不删除、不覆盖，也不进入当前候选。

### New candidate

- Generator:
  `scripts/create_xinhua_villas_211_massing_model.py`
- Binding:
  `docs/research/xinhua-villas-211-osm-binding.json`
- Blend:
  `assets/models/source/tiers/xinhua-road/massing-v3/xinhua-villas-211-massing.blend`
- GLB:
  `public/models/tiers/xinhua-road/massing-v3/xinhua-villas-211-massing.glb`
- GLB SHA-256:
  `ab05b4ec2eb9a36d3a7a1fe49000bfb93ed165e446ee7997559eac88a058e15c`
- Structure:
  `16,060 bytes / 9 nodes / 9 meshes / 134 triangles / 1 material / 0 images`

九个 OSM footprint 均保留独立节点与 `source_way_id`。高度统一为 eave `2.85`
和 ridge `3.55` scene units，仅是两层浅坡体块推断。没有加入树木、绿篱、
路灯、花箱、长椅、铺装、门梁或其他装饰。

### Map calibration

- Current registry placement 保持 `[38.32, 110.67] / yaw -0.38 / scale 0.62`；
- 原始 OSM 每个顶点投影到 world 后，经 registry 逆变换写入 GLB 本地坐标；
- local → world round-trip 最大误差 `< 1e-10` scene units；
- 新华路 asphalt edge 最小净距 `3.0396` scene units；
- 新华路 outer verge 最小净距 `1.5646` scene units；
- 入口 ways `864485674` / `864485675` 净距 `3.6682` scene units；
- 九个 footprint 无 polygon overlap；
- 九个 local obstacle AABB 无 overlap；
- 最小内部成员净距 `1.1667` scene units；
- 最近外部邻接 way `864485677` 净距 `0.6684` scene units，无重叠且非指定通道。

### Visual checkpoint

首轮长轴 ridge quad 在任意 polygon 顶点环向下产生了扭曲暗洞，已拒绝并改为
封闭浅坡三角扇后重新通过 canonical、side / depth 与 entrance 三张固定机位
检查。该修复已回写确定性生成器，不依赖临时 Blender 鼠标操作。

### Validation

- `python3 scripts/audit_glb.py ... --forbid-images --max-nodes 12`: pass；
- `node --test scripts/test_xinhua_villas_211_massing_map_gate.mjs`: `2/2` pass；
- `npm run building:fast -- --building xinhua-villas-211`: `28/28` pass，
  legacy Hero audit pass；
- Full repository regression: 未运行，按 Fast Mode 由主窗口每2～3栋统一执行。

### Gate decision

Massing v3 可提交主窗口做首次正式 Blender MCP1 与 scoped Three.js map gate。
主窗口接入时必须使用九个分体 obstacle，不能用整体 bounds 封闭弄堂。

Hero / Identity 仍需：

- 211弄1号、2号到具体 OSM way 的可靠门牌绑定；
- 同一成员的侧向 / 纵深证据；
- MCP1 和真实地图灰模验收通过后才可进入身份细化。

### Rollback

回退本 iteration 的 building-only commit 即可恢复到集成基线；Recovery/Hold
和旧 Hero 均未修改。

## Iteration 7 — Main-window MCP1 and Three.js Massing map pass

- Date: 2026-07-26
- Integrated building commit: `e0d032e`
- MCP1 record commit: `6132c9a`
- Result: `massing-runtime-map-pass-hero-identity-blocked`

主窗口直接打开正式 `.blend`，以 1.8m scale proxy 和 canonical、side / depth、
entrance 三个固定机位完成 MCP1；九个 mesh、一个材质、原点、方向与浅坡轮廓
均通过。QA rig 未保存、未导出，二进制没有交互式改动。

随后在 1280×720、页面可见、Vite static production preview 中打开 scoped
Massing QA 深链，实际加载
`ab05b4ec2eb9a36d3a7a1fe49000bfb93ed165e446ee7997559eac88a058e15c`。
画面确认九个体块不压新华路并正确接地；console error 为 0。120 帧样本耗时
`2010.5ms`，约 `59.686645 FPS`，draw calls `176`，triangles `629388`；
无同条件基线，不宣称性能提升。

碰撞使用显式 QA-only target 驱动正式 player collision engine：

- start `[24.7,89]`；
- target `[24.7,97.5]`；
- 输入持续 `8000ms`；
- 约第1.75秒在 `[24.7,94.33200000000001]` 墙停，并稳定到第8秒；
- 未穿透。

正式截图：

- `test_xinhua-villas-211_massing_runtime_map_1280x720.jpg`
  (`a5d7a6ac...`, 84,970 bytes)
- `test_xinhua-villas-211_massing_runtime_collision_1280x720.jpg`
  (`5aaaf70a...`, 76,072 bytes)

Massing 与地图门完成；Hero / Identity 仍因成员门牌到 way 的可靠绑定、侧向和
纵深证据缺失而保持 blocked。不得用 uniform Massing 推断成员身份构件。
