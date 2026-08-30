# Plane Tree Road Expansion

- 优先级：P1
- 状态：`todo / pending-road-approval`
- 研究真值：
  [`../research/plane-tree-road-expansion-research.md`](../research/plane-tree-road-expansion-research.md)
- 外置证据：
  `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-29-plane-tree-road-coverage-audit-d5f88ed`

## 目标

在用户批准的道路白名单内扩展梧桐树阵，并通过距离 LOD、空间激活和阴影分层，
确保总树位增加时不复制 GLB、不让全部 Identity 常驻。

## 当前决策状态

- A 级候选：新华路、番禺路、安顺路、淮海西路、湖南路，目标总量 256 棵；
- B 级候选：华山路、泰安路，候选总量 76 棵；
- 当前 `main` 登记：新华路 83 棵、幸福里 3 棵；
- 尚未获得道路级批准；
- 本任务尚未修改场景、模型、合并或部署。

## 实施前检查

- [ ] 用户明确批准具体道路和目标数量；
- [ ] 在独立 worktree 工作，保护主工作区已有未提交内容；
- [ ] 核对执行时 `main`、当前 VPS/Sites 提交和模型 SHA；
- [ ] 使用相同视口、入口、网络档位重新记录 83 棵基线；
- [ ] 标准 Identity 与弱网 Massing 都有有效的 FPS、frame P95、long frames、
  Draw Calls、triangles 和控制台记录。

## 实施任务

- [ ] 把道路段白名单写为显式数据合同，不按道路名称模糊匹配；
- [ ] 为批准道路建立双侧树位采样，并避让路口、入口、建筑和不可用路段；
- [ ] 新华路从中段树阵调整为全可见路段连续分布；
- [ ] 所有道路继续共用 4 个 Identity 和 3 个 Massing GLB；
- [ ] 建立空间索引和带迟滞的近／中／远激活集合；
- [ ] Identity 同时激活不超过 80 棵；
- [ ] Massing 同时激活暂不超过 140 棵；
- [ ] 只有近景 Identity 投射实时阴影；
- [ ] 树干碰撞继续使用小型 AABB，并纳入空间查询；
- [ ] 更新资产库数量、测试合同和缓存版本记录；
- [ ] 不修改白名单外的普通乔木、银杏、庭院树、灌木和花盆植物。

## 验收矩阵

| 入口 | 档位 | 必查内容 |
| --- | --- | --- |
| 新华路中段 | standard | 近景 Identity、树冠连续、入口避让、树干碰撞 |
| 新华路延伸段 | standard | 原未覆盖路段出现连续梧桐树阵 |
| 番禺路 | standard | 双侧节奏、路口净空、道路方向正确 |
| 安顺路／淮海西路 | standard | 道路段白名单没有越界 |
| 全览 | overview | 全地图 Massing 可读，不请求 Identity |
| 任一批准道路 | weak | 只请求 Massing，控制台 0 error |
| 手机视口 | standard/weak | 帧时间、触控漫游、遮挡和首屏请求 |

## 性能完成门

- [ ] 7 个梧桐 GLB 总体积仍不超过 1.1 MB，图片和贴图保持 0；
- [ ] 正常网络只请求 4 个 Identity，弱网／全览只请求 3 个 Massing；
- [ ] 当前激活树木批次而非全地图 332 棵 Identity 参与绘制；
- [ ] 同条件 frame P95 相对 83 棵基线恶化不超过 15%，否则回退数量或激活距离；
- [ ] 不使用不同条件下的 FPS 宣称性能提升；
- [ ] 控制台 0 error；
- [ ] `npm test` 和 `npm run lint` 通过；
- [ ] 对应 `?start=` 页面完成确定性移动和真实运行时截图；
- [ ] 用户确认 A 级视觉结果后，才继续 B 级。

## 必须交付

- 用户批准后的道路与数量 Decision log；
- 更新后的道路树位合同、实例化运行时和碰撞数据；
- 以 `test_` 开头的新华路、番禺路、安顺路／淮海西路、全览和手机截图；
- 83／256／332 或最终批准数量的同条件性能 JSON；
- 更新后的 GLB build record 与运行时验收记录；
- 新的外置动态证据快照及 SHA-256 清单；
- 合并、Sites 与 VPS 必须来自同一通过验收的提交。

## 完成定义

只有道路证据、树位白名单、视觉效果、碰撞、性能、自动测试和真实 Three.js
运行时全部通过，并获得用户视觉确认后，才能把本任务改为 `done`。

