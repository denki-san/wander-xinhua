# Xingfuli Center Map, Collision and Lineage Adjudication

## 裁决

`xingfuli-center` 的 Hero、Identity、Massing 当前二进制与各自 build record
SHA 一致，允许**保留**，但不授权重建、移动或改比例。严格 lineage 为
`blocked-formal-identity-lineage`：Massing、Identity、final Hero 的生成时间依次为
2026-07-22 23:51、2026-07-23 00:26、2026-07-23 01:40（+08:00），历史记录没有
`derivedFrom` 或 final Hero SHA。因此“共用确定性生成器”只能说明来源一致，不能伪造
`Hero -> Identity -> Massing` 的正式派生关系。

地图锚点和主巷碰撞可通过：OSM `way/400066625` 的复算 `rotationY` 为
`2.9977629924671367`，项目记录值 `2.997763`，误差约 `7.53e-9 rad`；番禺路端
退界 `4.101455` scene units。中心成员对幸福路与番禺路道路面的最小净距分别为
`7.488959` 和 `11.467937` scene units，均为正。

不过整体运行时晋级仍阻塞：`xingfuli-entrance-detail` 起点到石桩碰撞 proxy 的距离
只有 `0.179297` scene units，小于角色半径 `0.48`。这不是通过移动共享起点即可在
本栋 worktree 自行消除的问题；可追溯候选为已有 QA 路线端点 local `[46,-5.05]`，
其净距 `0.658499`，仍需要主窗口真实页面复核。

## 邻段和 collision proxy

- 西/中结构净距为 `1.19` local units，即 `0.640554` scene units（约 `1.729497 m`）。
  有向实体不相交，但旋转后的 1-unit AABB 切片有两处重叠，会合并连续立面的小侧缝；
  该缝不是已验证可通行路线。
- 中/东结构净距为 `1.94` local units，即 `1.044265` scene units（约 `2.819516 m`）；
  生产 AABB 仍保留 `0.309519` scene units 净距。
- 主巷南北实体净距 `7.128251` scene units，扣除角色直径后为 `6.168251`，主通道
  collision 通过。固定石桩 proxy 仍正确保护入口，但暴露了 detail-start 合同问题。

## 证据边界

| 类别 | 结论 |
| --- | --- |
| observed | 仓内 OSM 中心线、道路快照、三档 SHA/build record、结构化 layout 和 collision proxy 可重复读取。 |
| inferred | 三个中心段结构化成员与照片中具体立面的一一对应；本地 +X 对应番禺路入口。 |
| unknown | 施工图级 footprint、背立面/屋顶、2026 商业外摆，以及西中小缝是否应成为侧向通路。 |

## 主窗口后续

1. 为 Identity 补正式 final-Hero provenance；不能证明时，从 final Hero 确定性重派生，且不得改写历史。
2. 将入口 detail start 接到既有安全 QA 端点后，做真实 Three.js camera/collision 验收。
3. 在同机位完成三档与 fallback runtime 验收后，才可解除 runtime promotion 阻塞。

本专项不修改共享 app/scene、registry、18 栋 manifest、树木或全地图装饰。

```sh
node --test tests/test_xingfuli_center_lineage_map.test.mjs tests/test_xingfuli_center_map_collision_lineage_adjudication.test.mjs
```
