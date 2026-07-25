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
