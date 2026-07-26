# Shanghai Orchestra Final Gap Audit

## 结论

上海民族乐团的 Recovery clean-v2 Massing、主窗口 MCP1 shape review 和 Three.js
QA-only diagnostic 均保留通过；正式成员绑定、地图推广、Hero 与 Identity 仍阻塞。
本次没有重做 Blender 或浏览器验收。

## 证据主体

TJAD 三张本地证据能确认这是包含6号楼、7号楼、8号楼、保留体量和连续院落的
compound，并支持院落 canonical、法华镇路曲线立面与入口琴弦构件。但证据没有
把这些命名建筑逐一绑定到 5 个匿名 OSM way，也不证明各候选入口方向、测绘高度
和屋顶背面。

## 5 个 OSM 候选与地图

当前 Massing `63eb25ca...` 保留 5 个独立节点：
`864505166`、`864505168`、`864505165`、`864505169`、`864505163`。

- 新华路最小 asphalt edge 净距：`4.880222` scene units。
- 法华镇路最小 asphalt edge 净距：`10.667135`。
- 候选之间最小净距：`0.798917`，交叉数 `0`。
- 候选与相邻未知 way 最小净距：`1.169289`，交叉数 `0`。
- 当前起点最小建筑净距：`7.053485`，collision-free。

几何、道路和邻接诊断通过不等于主体归属通过。正式 membership 仍未知，所以
map acceptance 继续 `blocked-evidence`。

## 已保留阶段

- Massing GLB：9,132 bytes / 5 nodes / 76 triangles / 0 images。
- MCP1：`pass-shape-only`，当前 SHA 与固定机位已由主窗口审查。
- Three diagnostic：加载、120帧性能样本、地面、道路和碰撞墙停均通过。
- Runtime promotion：false；diagnostic 不能证明 5 个 way 属于命名 compound。

## 旧 Hero 与 strict lineage

旧 Hero `8f86e7e1...` 是通用“旧楼 + 现代厅”两体概括，不对应当前 5 个候选的
正式成员集合，也不是从当前 Massing 派生。其生成器还混入广场、导视、品牌文字、
长椅、花箱、线性灯和装饰铺装，超出单建筑资产范围。

因此旧 Hero 只保留为 Hold，不进入 MCP2；Identity 不生成，Massing 也不得冒充
Identity。只有命名建筑与 OSM way 绑定闭合、正式地图重验通过，并从获准成员集
重建合法 Hero 后，主窗口才能执行 MCP2。

## 门状态

- Compound evidence：pass
- Formal member binding：blocked
- MCP1 Massing：pass-shape-only-preserved
- Three diagnostic：pass-preserved-no-promotion
- Formal map acceptance：blocked
- Hero candidate：blocked
- MCP2：not-entered
- Identity：blocked / not-created
- MCP3：not-entered
- Building complete：false

本 checkpoint 只增加单栋审计和专项测试，未修改共享 registry、runtime、
Fast manifest 或范围外资产。
