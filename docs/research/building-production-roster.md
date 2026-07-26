# 18 栋建筑生产调度清单

- 审计日期：2026-07-25
- 主窗口 Git 基线：`main` / `origin/main` /
  `fc96800edb39cf2745ea328237aedb3a86e1f7f5`
- 18 栋集成分支：`codex/integrate-18-buildings` / through `577ceaf`
- 范围权威：
  - `app/asset-library/asset-data.ts`
  - `app/scene/xinhua-road-landmarks-data.json`
- 固定数量：14 个道路建筑资产 + 3 个幸福里分区资产 + 1 个孙科别墅 = 18
- 范围扩张：未授权

## 状态定义

- `in-scope`：属于本轮 18 栋，尚未满足新目标的全部门禁。
- `done`：证据、Hero / Identity / Massing、Blender MCP 三道门、地图校准和 Three.js 运行时均有当前证据。
- `blocked-evidence`：证据不足，只能继续补证；没有主体边界和纵深约束时不得制作
  正式 Massing，更不得把 Hero 或 Identity 标为完成。
- `hold`：不属于 18 栋；只读保留，不删除、不覆盖、不纳入完成数量。

历史成果默认先审计、再保留，不因新流程自动重建。旧 Brief 中的
“Massing / Identity”如果只是 Hero master 的建造批次，不等于独立运行时档位。

## 当前 18 栋

| # | Stable asset ID | 建筑资产 | 当前可保留成果 | 新目标状态 | 下一项缺口 |
| ---: | --- | --- | --- | --- | --- |
| 1 | `shanghai-cinema` | 上海影城 | Hero、Hybrid Identity composite、正式 Massing；MCP 1/2/3、实际地图门、三档与双 fallback Three.js 终验均有当前证据；主窗口保留 Overview Hold 后选择性整合至 `129ea56` | `done` / source `633a0de` / integrated `129ea56` | 无；Identity 必须继续按 ProgrammaticBody + Identity GLB + RepeatedDetails composite 解释，不能把 standalone GLB 误称完整 Identity |
| 2 | `film-art-center` | 上海电影艺术中心 | Evidence、Massing/MCP 1、地图门、Hero/MCP 2、Identity/MCP 3，以及主窗口单页 Hero / Identity / Massing、双 fallback、120 帧性能、资源与既有当前地图碰撞门全部通过；Recovery generic box 未采用 | `complete` / integrated on `codex/integrate-18-buildings` | 已完成，二进制或公共合同不变时禁止重做；Hero 既有草坪/灌木/庭院灯保持冻结，不修改、不删除、不向低档传播 |
| 3 | `one-step-garden` | 一尺花园 | Evidence、分体 Massing/MCP 1、地图门、Hero v2/MCP 2、Identity v1/MCP 3，以及主窗口单页三档、Hero→Identity、Identity→Massing、Massing floor、120 帧性能、资源与墙面碰撞采集全部通过；入口穿行继承当前已通过地图门 | `complete` / integrated on `codex/integrate-18-buildings` | 已完成，二进制或公共合同不变时禁止重做；首次发白证据及旧误绑/范围污染 Hero 继续只读 Hold |
| 4 | `xinhua-villas-211` | 新华别墅·211弄 | 旧 Hero 仅作保留基线；三张 Recovery 官方证据与边界审计已整合至 `b785fc2` | `blocked-evidence` / source `f53e39b` | 当前只能证明复合院落入口与局部 1号/2号建筑，缺同一 compound 的侧向纵深和成员空间绑定；不得采用旧四栋排布或制作正式 Massing |
| 5 | `xinhua-villas-329` | 新华别墅·329弄 | XHS与官方证据只授权15/36/40/42号四成员保守 Massing v3；原始OSM逐顶点回投误差 `<0.000001`，当前 SHA 已通过 MCP1 与真实页面加载/可见性 | `blocked-map` / integrated through `d905f5c` | member-15 仅序列推断为 medium binding，未扩 footprint 离柏油边仅 `0.0611`，加0.2碰撞边距后入路 `0.1389`；保留模型但不推广，先复核 member-15 footprint 归属或道路几何 |
| 6 | `house-315` | 新华路315号住宅 | 官方 canonical、俯瞰纵深、入口/门牌证据已闭合；subject-specific Massing、MCP 1、实际地图门、独立 Hero v2 与主窗口 MCP 2 已通过；旧 Hero 的结构/拓扑/范围污染版本继续只读 Hold | `in-scope` / source `14741bb` / integrated `a237231` | 从冻结 Hero v2 `ad414549…` 派生独立 Identity，完成 MCP 3 三档与真实 Three.js runtime；1930/1949 年代冲突继续为 Unknown，禁止恢复旧场地污染 |
| 7 | `villa-le-bec` | Villa Le Bec | 旧 Hero 保留；六张证据闭合两栋主体，evidence-bound Massing v3 已通过当前 SHA 的 Blender MCP1 和真实页面加载/可见性 | `blocked-map` / integrated candidate `30fce9d` | frozen placement 离道路柏油边约 `8.8255` scene units，并与 House315 obstacles 有五处 AABB 交叉；模型保留但不得推广，先裁决 footprint 归属与沿街入口锚点，再复验道路退界、碰撞和入口 |
| 8 | `shanghai-orchestra` | 上海民族乐团 | 旧 Hero `.blend/.glb`、recovery 新 Brief/manifest/三张证据及 clean-v2 Massing | `in-scope` / legacy Hero baseline | 拆分并绑定 compound 子建筑，完成全部门禁 |
| 9 | `hudec-memorial` | 邬达克纪念馆 | 旧 Hero；新官方证据、V2 Brief、结构化 Massing 与 MCP 1；地图门证据已整合至 `8edac99` | `blocked-map` / source `ee3fcad` | 真实门廊净宽 `1.2672`，小于碰撞所需 `1.36`；必须回 Massing 加宽入口并重跑 MCP 1/地图门，禁止缩碰撞盒造假，Hero/Identity 继续关闭 |
| 10 | `xinhua-pocket-park` | 新华路口袋公园 | 旧场地 GLB、两张同地点证据、recovery clean-v2 Massing 候选 | `in-scope` / legacy scoped asset | 固定“场地型建筑资产”语义，校准 footprint/朝向并完成全部门禁 |
| 11 | `xinhua-community-center` | 新华·社区营造中心 | 旧 Hero `.blend/.glb`、两张同地点证据、旧预览/运行时截图 | `in-scope` / legacy Hero baseline | 确认建筑本体证据、独立 Brief、三档和全部门禁 |
| 12 | `debi-fahua-525` | 德必法华525 | 旧 Hero、三张建筑群证据、recovery clean-v2 Massing 候选 | `in-scope` / legacy Hero baseline | 明确代表建筑与开放庭院，审计候选 Massing 并完成全部门禁 |
| 13 | `fahua-heritage` | 法华遗韵 | 旧牌坊 `.blend/.glb`、单张同构筑物证据、旧预览/运行时截图 | `in-scope` / legacy scoped asset | 固定其“构筑物资产”语义，补三档与全部门禁 |
| 14 | `fics-xinhua-365` | FICS新华365 | 旧 Hero、三张建筑群证据、recovery clean-v2 Massing 候选 | `in-scope` / legacy Hero baseline | 拆分子建筑、消除 alias 漂移并完成全部门禁 |
| 15 | `xingfuli-west` | 幸福里·西区 | Hero / Identity / Massing `.blend/.glb`、共享 Brief/build records、地图与运行时证据 | `in-scope` / retained three-tier | 不重建；补可追溯 MCP 1/2/3 和当前版本同机位三级复核 |
| 16 | `xingfuli-center` | 幸福里·中区 | Hero / Identity / Massing `.blend/.glb`、共享 Brief/build records、地图与运行时证据 | `in-scope` / retained three-tier | 不重建；补可追溯 MCP 1/2/3 和当前版本同机位三级复核 |
| 17 | `xingfuli-east` | 幸福里·东区 | Hero / Identity / Massing `.blend/.glb`、共享 Brief/build records、地图与运行时证据 | `in-scope` / retained three-tier | 不重建；补可追溯 MCP 1/2/3 和当前版本同机位三级复核 |
| 18 | `sun-ke-villa` | 孙科别墅 | Recovery Hero / Identity / Massing 已选择性恢复；单资产 Massing generator 可逐字节复现；MCP 三门、地图、Three.js 三档、双 fallback、碰撞和开放车道均有当前证据；集成复核发现并修复旧程序化 fallback 大体块误判 | `done` / source `d29097d` + `177447a` / integrated through `5e67688` | 无；保留失败与修复截图、分支和提交，后续只参加项目级回归 |

## 恢复后的数量结论

- 主窗口集成分支已整合 `done`：2 / 18（孙科别墅、上海影城）。孙科 Recovery
  二进制、三门、地图和 Three.js 证据已按单建筑选择性提取；集成后浏览器 v3
  复核覆盖 Hero / Identity / Massing、Hero→Identity 和 Identity→结构化程序化
  fallback，v2 的封闭大体块误判作为失败证据保留。上海影城的 MCP 3、三档、
  双 fallback、隔离会话错误与缓存复用证据已整合，项目级回归将在本轮公共文件
  合并后重新执行。
- 三档产物可直接保留：3 / 18（幸福里西/中/东）。
- Hero + Identity 可直接保留：1 / 18（上海影城）。
- 具备专项 V2 证据和可保留 Hero：2 / 18（电影艺术中心、孙科别墅）。
- 具备旧 Hero 或场地/构筑物基线：12 / 18。

这组统计用于调度优先级，不允许将“0 / 18 严格关闭”解释为重做 18 栋。
主窗口应先给已有成熟资产补证，再把独立 Worktree 投向真正缺少三档的建筑。

## 丢失会话 Recovery / Hold 快照

- Worktree：`/Users/lei/App_developing/wander-xinhua-all-models-v3`
- 分支：`codex/hold-all-models-v3-recovery-20260725`
- 提交：`3044cd89f801250afcd477dfbcbc7da358bf4b11`
- Tree：`147b8e8fd94805df4da8d569635894a6884e1b4b`
- Parent：`c0f525ae142d3f70b576bfbcdb90350d7e645007`
- 完整性：882 个提交文件，其中 40 个修改、842 个新增；另有 389 个
  `test_artifacts/all-models` 验收证据被强制纳入；nonignored status 为空。
- 未提交 ignored：65 个 Blender `.blend1` 自动备份，以及
  `node_modules`、`dist`、`dist-static`、`.wrangler`、`__pycache__`。
  它们不是唯一正式成果，不参与后续选择性提取。
- 使用规则：该提交永久保持 Hold，不整体 merge；只允许按单栋建筑审计后，
  将证据、生成器、`.blend/.glb`、build record、测试和验收记录摘入对应
  Worktree。公共 registry/runtime 文件必须由主窗口手工整合。

## Hold：保留但不计入 18 栋

以下当前成果不得删除、覆盖或纳入本轮完成数量：

- `public/models/xinhua-road/xinhua-mansion.glb`：当前正式 18 栋 registry 未引用。
- `public/models/xinhua-road/xinhua-villas.glb`：211/329 拆分前的历史聚合资产。
- `public/models/building-evidence-lab/wukang-mansion.glb`：Building Evidence Lab 资产。
- `public/models/shangsheng/navy-club-pool.glb`：装饰/场景装置，不是本轮建筑。
- 华山绿地、上生·新所父级 POI 与幸福里父级 POI：地点/容器，不另计建筑。
- 所有树木、街灯、外摆、花箱、铺装、垃圾桶、角色和其他装饰资产。
- `codex/overview-district-massing` Worktree 的全地图新增体块成果：保持 Hold，
  主窗口不得合入本轮 18 栋建筑生产线。
- `main` 在本轮调度期间由外部任务前进到 merge commit `46c58a8`，随后又以
  `fc96800` 修复弱网状态下的 district massing 保持策略。调度窗口已把这两个
  提交作为 Hold 基线合入集成分支，不删除或覆盖，也不把它们计入 18 栋；后续
  建筑提交不得修改其 GLB、数据、运行时模块、QA 或生成器。

## 调度约束

1. 主窗口只维护本清单、公共 manifest/registry、地图数据、集成测试和回归。
2. 同时维持 2～3 个独立建筑 Worktree；一个 Worktree 只拥有一个 stable asset ID。
3. 幸福里三分区共享生成器和 Brief，审计时可作为一个批次，但完成计数仍为三项。
4. 建筑 Worktree 不修改树木、装饰物、角色、全地图体块或范围外资产。
5. 公共文件变更先在建筑 Worktree 形成最小补丁，由主窗口串行整合。
6. 每次换班或会话恢复先读取本清单和当前 Git/Worktree 真值，不从聊天记忆重建状态。
