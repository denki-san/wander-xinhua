# FICS Xinhua 365 Final Gap Audit

## 结论

FICS新华365 的 Recovery Massing、主窗口 MCP1 shape review 和 Three.js QA-only
diagnostic 均保留通过；formal campus membership、service road、正式地图、Hero
与 Identity 仍阻塞。本次没有重做 Blender 或浏览器验收。

## 证据与五个候选

仓库内三张建成实景能确认屋顶标识建筑、开放庭院和历史洋房属于同一园区；
OSM 快照提供 5 个无标签建筑 footprint：
`864493178`、`864493177`、`864493179`、`864493181`、`864493230`。

证据仍不能证明这 5 个 way 是完整园区成员，也不能逐一绑定照片建筑；相邻其他
OSM 建筑是否属于园区、真实高度/屋顶/入口方向也未知。

## 已保留阶段

- Massing GLB `e36f29a3...`：8,564 bytes / 5 nodes / 68 triangles。
- MCP1：`pass-shape-only`。
- Three diagnostic：加载、地面、性能样本和分体碰撞墙停通过。
- Runtime promotion：false。

以上阶段只读复核，不重建、不重验。

## 地图与 service road blocker

冻结 placement `[-76.1, 75.2] / yaw -0.38 / scale 0.9` 下：

- 新华路 asphalt clearance：`10.490160` scene units，pass。
- 候选建筑最小间距：`1.359442`。
- 最近其他 OSM 建筑间距：`1.539354`。
- 最近 runtime landmark 为 `xinhua-pocket-park`，间距 `8.248087`，无重叠。
- way `864493177` 距园区 service way `577252268` 中心线仅 `0.125454`，
  侵入可见 asphalt `1.124546`，blocked。

必须先判断 service road 是真实通道、制图偏差还是应排除道路，再做正式地图验收。

## 旧 Hero 与 strict lineage

旧 Hero `ad02c246...` 复用平移后的新华公馆，并自拟白色主楼、红色艺术楼和工业
长楼布局；它不是从当前 5-way Massing 派生。生成器还包含中央广场、装饰铺装、
树阵和长椅，超出建筑范围。

因此旧 Hero 只保留为 Hold，不进入 MCP2。formal membership 与 service road
未闭合前不生成 Identity，且 Massing 不得冒充 Identity。

## 门状态

- Compound evidence：pass
- Formal member binding：blocked
- Recovery Massing：pass-preserved
- MCP1：pass-shape-only-preserved
- Three diagnostic：pass-preserved-no-promotion
- Service road：blocked
- Formal map：blocked
- Hero candidate：blocked
- MCP2：not-entered
- Identity：blocked / not-created
- MCP3：not-entered
- Building complete：false

本 checkpoint 只增加单栋最终审计和专项测试，未修改共享 registry、runtime、
Fast manifest 或范围外资产。
