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
