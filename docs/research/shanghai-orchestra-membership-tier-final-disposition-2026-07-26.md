# Shanghai Orchestra Membership and Tier Final Disposition

## 可复用结论

`shanghai-orchestra` Recovery clean-v2 Massing 可保留：Blend/GLB SHA、五个
candidate way、MCP1 shape review 与 Three.js QA-only diagnostic 均能由仓内记录
复核。该几何在当前 placement `[-44.4,44]`、yaw `2.761592653589793`、scale
`0.88` 下没有 asphalt overlap；新华路与法华镇路最小道路净距分别为 `4.880222`
和 `10.667135` scene units，候选之间不相交，起点也 collision-free。

这些结论仅授权“shape/geometry diagnostic 保留”，不授权命名 compound 的正式地图
推广、Hero 或 Identity。

## 严格 blocker

TJAD 三张本地照片支持“含 6/7/8 号、保留体量与连续院落”的 compound，但没有将
这些命名成员逐一绑定到匿名的五个 OSM way：
`864505166`、`864505168`、`864505165`、`864505169`、`864505163`。未知项还包括
各候选入口方向、实测高度与屋顶背面。因此 formal membership 和 map acceptance
均为 `blocked`；不能用几何净距、MCP1 或 Three diagnostic 代替主体归属证据。

旧 Hero 也只可 Hold：它不是从当前五 way Massing 派生，缺少当前 Hero build
record/MCP2 授权，且混入广场、导视、品牌文字、座椅、花箱、线性灯和装饰铺装。
故 Hero 不进入 MCP2，Identity 不创建，MCP3 和三档 Three.js 验收不可达。

## 证据边界

| 类别 | 结论 |
| --- | --- |
| observed | 三张 TJAD 照片、五个候选 footprint、Massing SHA、MCP1、Three diagnostic 与道路/碰撞计算。 |
| inferred | 五个匿名 OSM way 可以作为 compound 的 Massing 形状候选。 |
| unknown | 6/7/8 号及保留体量与每个 way 的正式绑定、入口方向、实测高度和屋顶背面。 |

## 最小下一步

1. 获取可把命名成员绑定到具体 OSM way 的权威资料、测绘或用户确认；不按 proximity 猜测。
2. 绑定闭合并完成正式 map acceptance 后，从获准成员集创建无场地污染的新 Hero。
3. 新 Hero 经 MCP2 和冻结 SHA 后才派生 Identity；随后执行 MCP3 与三档 Three.js 验收。

本专项不重建 Massing，不改公共 registry/runtime/Fast manifest 或范围外资产。

```sh
node --test tests/test_shanghai_orchestra_final_gap.test.mjs tests/test_shanghai_orchestra_membership_tier_final_disposition.test.mjs
```
