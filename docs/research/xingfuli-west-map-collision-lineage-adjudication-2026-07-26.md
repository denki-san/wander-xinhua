# Xingfuli West Map, Collision and Lineage Adjudication

## 裁决

`xingfuli-west` 的现有 Hero、Identity、Massing 二进制可继续**保留**，但不得
因“同一生成器、阶段超集”而宣称已完成严格的
`Hero -> Identity -> Massing` 派生证明。历史 build record 的时间顺序为
Massing（2026-07-22 23:51 +08:00）→ Identity（2026-07-23 00:26 +08:00）→
Hero final（2026-07-23 01:40:30 +08:00），且没有 `derivedFrom` / final Hero SHA
字段。因此 lineage 裁决为 `blocked-formal-lineage-proof`，不是资产质量失败，也不
授权重建或覆盖既有 GLB。

地图/碰撞裁决为 `blocked-road-clearance`。OSM way `400066625` 仅是幸福里步行街
中心线；其可复算锚点、朝向与长度可以支持整体摆放，却不能直接充当西栋建筑
footprint。当前生产矩形碰撞体对幸福路运行时道路面净距为：

- `north-west`: `-1.128959` scene units（约 `-3.048190 m`）；
- `south-west`: `-3.020254` scene units（约 `-8.154685 m`）。

同一投影中三个临街 OSM 建筑轮廓均保持正净距（`0.226981` 至
`1.715291` scene units），也与入口照片“建筑退在人行道后”的直接可见事实一致。
所以不得以整体平移、统一或非统一缩放掩盖负净距；也不得在本栋分支猜测新的
共享 layout/道路数据。

## 已验证的空间合同

- 地图锚点来自 OSM `way/400066625`，生产朝向
  `rotationY=2.997763`，横向比例 `0.581898`；番禺路端保留 `4.1` scene units
  的纵向退界，运行时纵向比例为 `0.5382809787234043`。
- 西/中相邻的 `north-west -> north-inner-west` 与
  `south-west -> south-inner-west` 结构净距都是 `1.19` local units，即
  `0.640554` world scene units（约 `1.729497 m`）。结构不相交。
- GLB 段边界的 `0.721297` scene-unit 重叠属于铺地/跨段构件所有权，不能被当作
  建筑碰撞；玩家碰撞仍使用 `xingfuli-layout.json` 的建筑矩形按 1-unit 切片。
- 产品起点与 fast QA canonical 起点均不在碰撞体中；这只证明起点净空，不能解除
  西端道路净距阻塞。

## 证据类别与边界

| 类别 | 结论 |
| --- | --- |
| observed | 三个现有 GLB/Blend 与 build record SHA 一致；OSM 中心线、道路及相关建筑轮廓可由仓内快照复算；入口照片显示建筑在连续人行道后。 |
| inferred | `north-west` / `south-west` 是西段的项目结构化成员；局部 OSM 轮廓与这两个简化矩形之间不是施工图级一一对应。 |
| unknown | 西栋精确测绘 footprint、背立面、实际道路横断面及 2026 现场改造状态。 |

## 主窗口后续动作

1. 在跨三段共享集成点裁定：按 OSM 临街多边形斜切西端建筑/碰撞，或为道路层增加有证据且可测试的局部裁切。
2. 若无法补出历史 `derivedFrom`，在保留现有资产前提下，以 final Hero 的确定性来源重新派生并记录 Identity/Massing lineage；不得伪造历史字段。
3. 地图道路门解除后，再执行当前版本 Three.js 三档、fallback、碰撞和相机验收。

本记录仅裁决西栋专项，不修改共享场景、公共 registry、18 栋清单、树木或全地图装饰。

## 可复现检查

运行：

```sh
node --test tests/test_xingfuli_west_fast_audit.test.mjs tests/test_xingfuli_west_map_collision_lineage_adjudication.test.mjs
```

基线审计：`docs/research/xingfuli-west-fast-audit.json`。
