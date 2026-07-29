# Xinhua Road Plane Tree Placement V5 Decision Log

## Decision

接受 V5 树位合同：新华路梧桐由 83 株调整为 79 株，`house315` 试验段由
20 株调整为 16 株；近镜头的 side 0 树列向道路靠拢，另一侧保持 V4 的横向
关系。V4 的七个 Blender/GLB 资产不变。

不执行 `docs/todo/plane-tree-road-expansion.md` 中尚未批准的 256/332 株扩张，
也不以产品空间验收冒充真实树穴测绘。

## Iteration 1 — Evidence and Baseline

- 基线：Git `d5f88ed`，新华路 83 株，其中试验段 20 株。
- 固定入口：`house315`，1200 × 807，生产静态构建，确定性前进移动。
- 标准档：59.97 FPS，P95 17.9 ms，最大 252 draw calls / 905,820 triangles。
- 弱网档：59.99 FPS，P95 18.7 ms，最大 219 draw calls / 321,806 triangles。
- 观察：纵向树干节奏偏密；画面右侧的 side 0 树列离道路过远。
- 边界：缺少现实树穴测绘，修正只针对已提交的道路几何和产品构图。

## Iteration 2 — Placement Contract

- 非试验段轴向采样从 6.0 调整为 6.2 scene units。
- 试验段安全候选步长从 3.6 调整为 4.2 scene units，总数固定为 8+8。
- side 0 法向偏移从 6.55–7.10 调整为 4.80–5.25 scene units。
- side 1 法向偏移保持在 6.55–7.00 scene units。
- 最终新华路 79 株，左右分别 41/38；加上幸福里共享 3 株，资产库口径为 82。
- 自动几何检查覆盖树干相对完整道路外缘、入口、建筑、同侧最小株距和确定性
  变体分配，目标测试 14/14 通过。

## Iteration 3 — Blender and GLB Boundary

- Blender 5.2.0 LTS、生成器、GLB 审计脚本、本地预览入口均完成预检。
- 七个可编辑 `.blend` 文件 7/7 存在。
- 七个 GLB 的 SHA-256 与 V4 build record 完全相同。
- GLB 审计 7/7 通过：每个文件 1 node / 1 mesh、0 image / 0 texture。
- 因二进制不变，本轮不打开 Blender、不生成伪造的新模型版本，也不改缓存版本。

## Iteration 4 — Production Runtime

- 标准档最终：60.05 FPS，P95 18.1 ms，最大 252 draw calls /
  870,496 triangles；4 Identity、0 Massing；错误 0。
- 弱网档最终：59.97 FPS，P95 18.3 ms，最大 218 draw calls /
  314,250 triangles；新华路使用 3 Massing；全页另外 3 Identity 来自幸福里共享树；
  错误 0。
- 两档确定性移动均完成，无碰撞死锁、fatal overlay、HTTP/GLB 失败或控制台错误。
- 同条件单次对照没有出现性能回退；该结果只作为捕获时证据，不声称持久性能提升。
- 视觉对照确认画面右侧树列已回到道路绿化带旁，纵向节奏更疏，同时保留两侧
  连续树冠。
- 全量测试首次回查发现近侧树列挤掉原有花箱/灌木候选；正式修正采用“优先交错
  侧、冲突时回退道路对侧”的确定性街具规则，恢复完整档
  10 路灯 / 4 花箱 / 4 垃圾桶 / 16 灌木，低配档严格减半，39 项相关测试通过。

## Acceptance Evidence

- 运行时记录：
  `docs/research/plane-tree-placement-v5-runtime-acceptance.json`
- Build record：
  `docs/research/build-records/plane-tree-placement-v5.json`
- 参考 / Blender / Three.js 三联：
  `test_artifacts/test_plane_tree_placement_v5_final_comparisons/test_plane_tree_placement_v5_reference_blender_threejs.png`
- 修改前 / 修改后：
  `test_artifacts/test_plane_tree_placement_v5_final_comparisons/test_plane_tree_placement_v5_before_after.png`
- 标准档 / 弱网档：
  `test_artifacts/test_plane_tree_placement_v5_final_comparisons/test_plane_tree_placement_v5_standard_weak.png`

## External Evidence

- 候选快照只读保留并在回归修正后 superseded。
- 最终快照：
  `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-30-plane-tree-placement-v5-final-d5f88ed`
- 657 个文件，272,535,552 bytes。
- 创建时与独立回查两次执行 `SHA256SUMS`，均全部通过。
- `wikiEligible: false`；动态图片、指标与对照图未进入 LLM Wiki。

## Remaining Release Gate

- 同一提交在 Sites 与 VPS 的线上验收。

如果任一发布面与本记录的 source tree 不一致，V5 不得标记完成。
