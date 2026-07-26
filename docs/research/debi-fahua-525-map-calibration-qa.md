# Debi Fahua 525 Map Calibration QA

日期：2026-07-26
范围：`debi-fahua-525` 的地图坐标、朝向、道路退界和碰撞代理；不修改场景、公共 registry、道路合同或模型二进制。

## 裁决

正式地图接入维持 **blocked**。现有 Massing v3 候选的变换可精确复现 OSM
`way/864847922`，所以没有授权移动、旋转或缩小建筑来绕过道路门；但该
footprint 与当前法华镇路的 stylized asphalt 真实重叠。定西路的冲突仅由单一
rotated AABB 引起，不能作为拒绝该方向的依据，也不能反过来掩盖法华镇路的真实
冲突。

机器可读的计算输入、全部顶点和可复跑数值见
`docs/research/debi-fahua-525-map-candidate.json`；专项回归命令为：

```sh
node --test tests/test_debi_fahua_525_map_candidate.test.mjs
```

## 已观察事实

| 项目 | 值 | 结论 |
| --- | --- | --- |
| 代表性 OSM footprint | `way/864847922` | 仅为 secondary-map corroborated，尚非地籍/测绘主体边界 |
| 位置 / yaw / scale | `[-102, -49]` / `-2.6 rad` / `0.92` | 保持不变；逆变换再正变换的最大顶点误差为 `0` |
| Footprint source-local bounds | X `[11.957319, 28.134966]`；Z `[-14.205667, 20.611479]` | 用于候选完整覆盖壳的输入，不等同于旧 Hero AABB |
| 法华镇路（way/66394007） | 真实最近中心线距 `2.991771` units（`8.077782m`） | 当前 asphalt 半宽 `3.625` units，净距 `-0.633229` units（`-1.709718m`），**真实重叠** |
| 定西路（way/85686605） | 最近中心线距 `4.977283` units | 净距 `+1.352283` units（`+3.651164m`），精确 polygon 通过 |
| 最近邻楼（way/864847918） | 原始 polygon 间距 `2.609279` units | 双方各留 `0.2` units 后仍为 `+2.209279`，邻楼碰撞通过 |

## 碰撞代理判定

现行公共 registry 指向的是旧 `requested-pois/debi-fahua-525.glb`，其
`localBounds` 为 `[-14,14] × [-12,12]`，并含 5 个旧 Hero 复合场地的
`localObstacles`。该 Hero 已被既有 disposition 判定为包含 site、鱼池、竹林和
银杏等范围污染物，不能被当作本轮纯建筑 Massing 的 collision truth。

候选 Massing 的精确 footprint 可用于几何校准；若后续需要生成完整覆盖的拆分
collision shell，任何不留缝、不缩小的壳都必须保留最近顶点
`[-105.520100, -24.752772]`。这个顶点已经位于当前法华镇路 asphalt 半宽之内，
故拆分 AABB 虽能消除定西路假阳性，不能关闭法华镇路门。当前不写入新的
`localObstacles`，以避免将未经主窗口验收的碰撞代理写入公共 runtime。

## 证据边界与解除条件

已观察：OSM 道路为 `tertiary`、`asphalt`，但没有 `width` 或 `lanes` 标签；当前
渲染全宽为 `7.25` units（`19.575m`）。仅从不重叠计算得到的上限为全宽
`5.983542` units（`16.155564m`）；如为角色碰撞预留 `0.2` units，则上限为
`5.583542` units。两者都是几何边界，**不是**改窄道路的授权。

解除 blocked 至少需要以下之一，且不得通过任意平移或缩放主体实现：

1. 地籍、测绘或用户确认，证明 `way/864847922` 确为本栋的主体边界；以及
2. 最近点处法华镇路的权威实测宽度，足以支持完整 asphalt 宽度不超过 `5.983542` units；或
3. 有证据支撑的 footprint 修正。

在解除前，MCP1 仍为 pending，runtime 碰撞、入口和相机验收均不可声称通过；Hero
与 Identity 保持 Hold/unchanged。
