# Shanghai Cinema map placement candidate — 2026-07-26

## 状态

`blocked-map-position`。本文件是单建筑的只读地图审计与接线候选，**不是**
对 `app/scene/xinhua-road-landmarks-data.json`、公共运行时、Fast manifest 或
任何 GLB 的修改授权。

原因：OSM `way/292250766` 是覆盖整个上海影城综合体的非规则面，当前 Hero
运行时包络却是固定的 `38 × 26` 场景单位前景资产；原始 OSM 没有入口节点、
前景丝带锚点或可将该 GLB 原点一一对应到综合体的测绘点。仅凭综合体多边形
质心无法证明 GLB 原点应落在哪里。直接用质心还会让完整可见包络进入番禺路
柏油面。

主窗口只能在补到“入口/主丝带的可定位 WGS84 锚点”（测绘、官方总平面或可
复核的带定位航拍）后，才可把下面的候选改为生产 placement；在此之前，禁止
将其表述为已通过的位置校准。

## 证据与坐标合同

- 建筑来源：仓库原始 OSM 快照
  `docs/research/data/xinhua-buildings-osm-20260725-074802.json`，`way/292250766`；
  标签为 `name:zh=上海影城`、`addr:street=新华路`、`addr:housenumber=160`。
- 邻近机动车道来源：仓库原始 OSM 快照
  `docs/research/data/xinhua-roads-osm-20260716-080509.json`，`way/11960339`（番禺路，
  `highway=tertiary`、`surface=asphalt`）。
- 世界投影：`app/scene/xinhua-map-data.json` 的 `centerWgs84=[121.4227819,31.2066376]`，
  `metersPerSceneUnit=2.7`；经度比例 `111320*cos(centerLat)`，纬度比例 `110540`。
- OSM 面积质心（仅用于审计，不是接线锚点）：世界 `[74.429852, 81.677069]`，
  WGS84 约 `[121.424900, 31.204642]`。

## 现状审计

| 检查项 | 结果 |
| --- | --- |
| 当前 registry | `position=[74.1,80.9]`、`yaw=2.761592653589793`、`scale=1` |
| 当前完整可见包络到番禺路中心线 | `3.813742` 场景单位 |
| 当前番禺路柏油 edge 净距 | `0.188742` 场景单位（道路宽 `7.25`，半宽 `3.625`） |
| 当前碰撞关系 | 左侧翼 obstacle 与 `film-art-center` 的右侧低翼 obstacle 相交；不是可接受基线 |
| OSM 质心直接接线 | 预计柏油 edge 净距 `-0.257639`，会压入路面，拒绝 |

这里的“柏油 edge”是项目对 `tertiary` 使用的生产道路宽度
`1.45 × environmentScale = 7.25` 的边缘，而不是把 OSM 中心线误称作路缘。

## 条件候选（仅供主窗口复核）

为使固定 GLB 包络同时满足现有项目的最低 `0.75` 场景单位道路净距，并消除
与相邻资产的碰撞盒相交，最小的约束修正候选是：

```json
{
  "position": [73.61, 80.4],
  "yaw": 2.761592653589793,
  "scale": 1,
  "localBounds": { "minX": -19, "maxX": 19, "minZ": -11.8, "maxZ": 14.2 },
  "localObstacles": "unchanged (three existing split obstacles)",
  "start": [101, 112],
  "forward": [-0.654, -0.756],
  "cameraTargetHeight": 2.8
}
```

- 候选原点 WGS84：约 `[121.424869305, 31.204673786]`。
- 变换后的完整世界包络角点（按 registry 与 GLB Z 翻转合同）：
  `[95.631490,76.489246]`、`[60.342233,62.394268]`、
  `[50.698301,86.539549]`、`[85.987557,100.634527]`。
- 最小番禺路中心线距 `4.375361`，扣除 `3.625` 的 asphalt 半宽后为
  `0.750361`；通过项目最低净距。
- 正面/入口朝向：保留 `yaw`，且既有 `start → position` 与 `forward` 的夹角为
  `0.50°`，仍从东北侧观看位朝建筑中心。OSM 没有 entrance 节点，因此“真实
  入口朝向”仍是照片与既有运行时的推断，未作为确认事实。
- 地面接触：线性地形 `terrainHeightAt(73.61,80.4)=0.9092080033`；按现有
  anti-z-fighting 合同，候选 runtime root Y 应为 `1.0092080033`（地形 + `0.1`）。
- 相邻资产：三块候选 world obstacles 与所有其他 registry obstacles 无相交。
- 起点/首帧相机：保留 `start` 和 `forward` 时，角色半径 `0.48` 与后置
  `7.4` 场景单位相机（半径 `0.25`）均不进入任何地标 obstacle。

该候选是“满足项目现有几何约束的最小修正”，并非 OSM 对 GLB 原点的确证；
它只适合成为下一轮有锚点证据后的复核起点。

## 范围与回退

- 已审计且保留：Hero / Hybrid Identity / Massing、MCP gates、GLB、现有
  registry 以及运行时。
- 未修改：树木、装饰、全地图资产、公共 registry/runtime/Fast manifest。
- 自动回归：`tests/test_shanghai_cinema_map_placement_candidate.test.mjs`。
- 回退：不接线本候选即可；本提交只有证据说明与只读几何测试。
