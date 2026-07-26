# Xinhua Villas 329 Map Conflict Superseding Adjudication

## 裁决

`833bb8a` 已闭合 **Massing 的正式地图/运行时门**；我在旧树 `99ad921` 中依据的
`xinhua-villas-329-final-disposition.json` 没有随集成提交更新，属于陈旧 gate
记录，不能继续作为 Massing map blocker。该文件在 `2e2ec14`、`833bb8a` 和本
worktree 的 Git blob 都是同一份 `726d496...`，仍错误写着 member-15 及
`runtimeCollision=not-run`。

`833bb8a` 新增的
`docs/research/xinhua-villas-329-threejs-runtime-qa-v2.json` 才是 Massing map/runtime
pass 的 superseding 证据：使用未变的 V3 GLB SHA
`f245efd099d00049c068230fe999f5e492c16aef441775dddf7c41dd9350b704`、同一 placement
`[-42.13,79.48] / -0.38 / 0.62`，正式记录了 1280×720、120 帧、0 console error、
地面接触、道路/邻居净距与确定性碰撞停靠。其 map `formalMassingAcceptance=pass`，
collision verdict 为 `pass-hard-collision-before-interior-target`。

## 旧 blocker 如何解除

旧的 `-0.138921` 数值不是计算本身错误，而是**成员编号错误**。`
xinhua-villas-329-map-candidate.json`（`2e2ec14` 与 `833bb8a` 的 blob 相同）以必须的
GLB source-Z flip 复算后表明：

- member-15 的单 AABB 到 asphalt 边为 `10.316885`；
- 真正的临路者是 member-42，其未切分单 AABB 为 `-0.138921`；
- 在不移动、不缩放、不改 GLB/footprint 的前提下，把 member-40 与 member-42 各分成
  六条连续 strip，完整并集等于原 AABB；带 `0.2` margin 后 member-42 最小净距为
  `0.848155`，高于 `0.75` 要求，最小邻居净距为 `0.174798`。

因此解除依据是 collision proxy 的精确 strip decomposition 与真实 runtime
telemetry，不是整体移动、缩放、删除 member-15 或篡改证据绑定。

## 仍未解除的门

本 supersession 只提升 Massing map/runtime：旧 Hero 仍是跨资产污染 Hold，不从当前
Massing V3 派生；Identity 仍未创建。因此 MCP2、Identity、MCP3 和完整三档
Three.js 验收仍不可达。下一最小动作是从已验收的四成员 Massing 创建干净 Hero，
冻结 SHA 后执行 MCP2，才可派生 Identity。

## 复盘

本次更正表明：涉及跨提交的 disposition 时，必须比较目标集成提交中同路径的 Git
blob 与新增 runtime record，不能只依当前 worktree 的旧 JSON 推断 gate 状态。

```sh
node --test tests/test_xinhua_villas_329_map_conflict_superseding_adjudication.test.mjs
```
