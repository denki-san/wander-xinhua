# Xinhua Community Center Final Gap Audit

## 结论

新华·社区营造中心4号楼的 Massing v2、主窗口 MCP1 和 Three.js collision replay
均保留通过；正式地图、Hero 与 Identity 仍阻塞。本次没有重做 Blender 或浏览器
验收。

## 4号楼证据与 OSM 绑定

长宁区政府正面图能确认两层暖白主体、平屋顶女儿墙、银灰门斗、深色入口和橙色
4号标识；侧向与背面未知。命名 POI node `13765678129` 的唯一近邻建筑 way
`864493234` 足以支持保守4号楼 Massing。玩具交换屋是同场地独立构筑物，缺地图
绑定，不属于4号楼主体。

## 已保留阶段

- Massing GLB `a0609064...`：6,596 bytes / 48 triangles / 0 images。
- Blend `0dd2a771...`，Generator `55df5206...`。
- MCP1：axis-corrected current SHA pass。
- Three collision：墙停、横向滑动、无穿透。

以上阶段仅复核，不重建、不重验。

## 地图 blocker

OSM 投影误差为 `0`，最近邻 way `864493232` 间距 `1.151714` scene units，
没有建筑重叠。但4号楼边界距新华路345弄 service road 中心线仅 `0.847365`，
而 runtime 渲染半宽为 `1.25`，导致 asphalt edge clearance `-0.402635`，
相当于压占约 `1.087115 m` 路面。

不能任意移动建筑隐藏冲突；必须裁决 OSM footprint 与 runtime road contract，
再重跑正式地图、相机和碰撞验收。

## 旧 Hero 与 strict lineage

旧 Hero `cc022632...` 将4号楼与自拟草坪、前场、花箱、运动角和未绑定的玩具
交换屋合并。它不是从当前 way `864493234` Massing 派生，也没有当前 build
record 或 MCP2 授权，因此只保留为 Hold，不是合法 MCP2 候选。

正面单视角和正式地图 blocker 未关闭前不生成 Identity，且 Massing 不得冒充
Identity。

## 门状态

- Building 4 evidence for Massing：pass
- OSM binding for Massing：pass
- Massing / MCP1 / Three collision：pass-preserved
- Formal map：blocked
- Hero candidate：blocked
- MCP2：not-entered
- Identity：blocked / not-created
- MCP3：not-entered
- Building complete：false

本 checkpoint 只增加单栋最终审计和专项测试，未修改共享 registry、runtime、
Fast manifest 或范围外资产。
