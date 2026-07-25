# 18 栋建筑生产调度清单

- 审计日期：2026-07-25
- 主窗口基线：`main` / `76ffb457f584761fb77e28a422b51b45326b228d`
- 范围权威：
  - `app/asset-library/asset-data.ts`
  - `app/scene/xinhua-road-landmarks-data.json`
- 固定数量：14 个道路建筑资产 + 3 个幸福里分区资产 + 1 个孙科别墅 = 18
- 范围扩张：未授权

## 状态定义

- `in-scope`：属于本轮 18 栋，尚未满足新目标的全部门禁。
- `done`：证据、Hero / Identity / Massing、Blender MCP 三道门、地图校准和 Three.js 运行时均有当前证据。
- `blocked-evidence`：证据不足，允许继续 Massing，但不得把 Hero 或 Identity 标为完成。
- `hold`：不属于 18 栋；只读保留，不删除、不覆盖、不纳入完成数量。

历史成果默认先审计、再保留，不因新流程自动重建。旧 Brief 中的
“Massing / Identity”如果只是 Hero master 的建造批次，不等于独立运行时档位。

## 当前 18 栋

| # | Stable asset ID | 建筑资产 | 当前可保留成果 | 新目标状态 | 下一项缺口 |
| ---: | --- | --- | --- | --- | --- |
| 1 | `shanghai-cinema` | 上海影城 | Hero `.blend/.glb`、专项证据/Brief/build record、Hybrid Identity、地图与近景运行时证据 | `in-scope` / Hero+Identity 保留 | 正式 Massing lineage、MCP 1/2/3 可追溯记录、同机位三级终验 |
| 2 | `film-art-center` | 上海电影艺术中心 | Hero `.blend/.glb`、专项证据/Brief/build record、canonical 运行时验收 | `in-scope` / Hero 保留 | 独立 Identity/Massing、MCP 1/2/3、三级运行时 |
| 3 | `one-step-garden` | 一尺花园 | 旧 Hero `.blend/.glb`、单张本地证据、旧运行时截图 | `in-scope` / legacy Hero baseline | 补视角证据与独立 Brief，完成三档和全部门禁 |
| 4 | `xinhua-villas-211` | 新华别墅·211弄 | 旧 Hero `.blend/.glb`、单张建筑群证据、旧运行时截图 | `in-scope` / legacy Hero baseline | 明确代表建筑/群组边界，补视角证据、三档和全部门禁 |
| 5 | `xinhua-villas-329` | 新华别墅·329弄 | 旧 Hero `.blend/.glb`、单张建筑群证据、旧运行时截图 | `in-scope` / legacy Hero baseline | 明确代表建筑/群组边界，补视角证据、三档和全部门禁 |
| 6 | `house-315` | 新华路315号住宅 | 旧 Hero `.blend/.glb`、单张本地证据、旧预览/运行时截图 | `in-scope` / legacy Hero baseline | 补 V2 证据覆盖、三档和全部门禁 |
| 7 | `villa-le-bec` | Villa Le Bec | 旧 Hero `.blend/.glb`、单张本地证据、旧预览/运行时截图 | `in-scope` / legacy Hero baseline | 补侧向/入口证据、三档和全部门禁 |
| 8 | `shanghai-orchestra` | 上海民族乐团 | 旧 Hero `.blend/.glb`、单张本地证据、旧预览/运行时截图 | `in-scope` / legacy Hero baseline | 补 V2 证据覆盖、三档和全部门禁 |
| 9 | `hudec-memorial` | 邬达克纪念馆 | 旧 Hero `.blend/.glb`、两张本地证据、旧预览/运行时截图 | `in-scope` / legacy Hero baseline | 独立 Brief/build record、三档和全部门禁 |
| 10 | `xinhua-pocket-park` | 新华路口袋公园 | 旧场地 GLB、两张同地点证据、旧预览/运行时截图 | `in-scope` / legacy scoped asset | 固定其“场地型建筑资产”语义，补三档与全部门禁 |
| 11 | `xinhua-community-center` | 新华·社区营造中心 | 旧 Hero `.blend/.glb`、两张同地点证据、旧预览/运行时截图 | `in-scope` / legacy Hero baseline | 确认建筑本体证据、独立 Brief、三档和全部门禁 |
| 12 | `debi-fahua-525` | 德必法华525 | 旧 Hero `.blend/.glb`、三张建筑群证据、旧预览/运行时截图 | `in-scope` / legacy Hero baseline | 明确代表建筑与开放庭院，补三档和全部门禁 |
| 13 | `fahua-heritage` | 法华遗韵 | 旧牌坊 `.blend/.glb`、单张同构筑物证据、旧预览/运行时截图 | `in-scope` / legacy scoped asset | 固定其“构筑物资产”语义，补三档与全部门禁 |
| 14 | `fics-xinhua-365` | FICS新华365 | 旧 Hero `.blend/.glb`、三张建筑群证据、旧预览/运行时截图 | `in-scope` / legacy Hero baseline | 明确代表建筑与场地边界，补三档和全部门禁 |
| 15 | `xingfuli-west` | 幸福里·西区 | Hero / Identity / Massing `.blend/.glb`、共享 Brief/build records、地图与运行时证据 | `in-scope` / retained three-tier | 不重建；补可追溯 MCP 1/2/3 和当前版本同机位三级复核 |
| 16 | `xingfuli-center` | 幸福里·中区 | Hero / Identity / Massing `.blend/.glb`、共享 Brief/build records、地图与运行时证据 | `in-scope` / retained three-tier | 不重建；补可追溯 MCP 1/2/3 和当前版本同机位三级复核 |
| 17 | `xingfuli-east` | 幸福里·东区 | Hero / Identity / Massing `.blend/.glb`、共享 Brief/build records、地图与运行时证据 | `in-scope` / retained three-tier | 不重建；补可追溯 MCP 1/2/3 和当前版本同机位三级复核 |
| 18 | `sun-ke-villa` | 孙科别墅 | Hero `.blend/.glb`、专项证据/Brief、多角度 Blender 与运行时截图 | `in-scope` / Hero baseline retained | 正式 Hero build record、独立 Identity/Massing、MCP 1/2/3、三级运行时 |

## 恢复后的数量结论

- `done`：0 / 18。原因不是已有成果无效，而是新目标新增了可追溯的 Blender
  MCP 三道门和三级运行时闭环，现有记录没有任何单体完整证明这组新门禁。
- 三档产物可直接保留：3 / 18（幸福里西/中/东）。
- Hero + Identity 可直接保留：1 / 18（上海影城）。
- 具备专项 V2 证据和可保留 Hero：2 / 18（电影艺术中心、孙科别墅）。
- 具备旧 Hero 或场地/构筑物基线：12 / 18。

这组统计用于调度优先级，不允许将“0 / 18 严格关闭”解释为重做 18 栋。
主窗口应先给已有成熟资产补证，再把独立 Worktree 投向真正缺少三档的建筑。

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

## 调度约束

1. 主窗口只维护本清单、公共 manifest/registry、地图数据、集成测试和回归。
2. 同时维持 2～3 个独立建筑 Worktree；一个 Worktree 只拥有一个 stable asset ID。
3. 幸福里三分区共享生成器和 Brief，审计时可作为一个批次，但完成计数仍为三项。
4. 建筑 Worktree 不修改树木、装饰物、角色、全地图体块或范围外资产。
5. 公共文件变更先在建筑 Worktree 形成最小补丁，由主窗口串行整合。
6. 每次换班或会话恢复先读取本清单和当前 Git/Worktree 真值，不从聊天记忆重建状态。
