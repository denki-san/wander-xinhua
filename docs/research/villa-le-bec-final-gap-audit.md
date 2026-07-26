# Villa Le Bec Final Gap Audit

## 结论

Villa Le Bec 的两栋主体证据和 Massing v2 已闭合，当前 SHA 已通过 MCP1；
但地图门仍被道路锚点与 House 315 footprint 冲突阻塞。旧 Hero 不是合法 MCP2
候选，因此本分支没有生成 Identity，也没有声明 MCP2 / MCP3 通过。

## 本地证据

本次只复核仓库内已有的官方图和小红书本地证据，没有打开浏览器。现有照片覆盖
沿街正面、侧向纵深、入口、开放庭院与部分后侧；“场地包含两栋百年建筑”属于
作者陈述并与画面一致，但测绘高度和地籍边界仍未知。这些证据足以支持当前两栋
Massing，不足以消除 Villa Le Bec 与 House 315 的 footprint 归属冲突。

## Massing 与 MCP1

- GLB：`593cc399...`，12,008 bytes，120 triangles，零图片。
- Blend：`34a9ba45...`。
- Generator：`50a37c3d...`。
- MCP1：`pass-current-sha-visual-and-structure`。
- 真实页面：当前 Massing 单次请求加载和可见性通过，但不构成地图验收。

本次未重建或重验这些合格阶段。

## 地图 blocker

冻结 placement `[-34.1, 88.8] / yaw -0.38 / scale 0.82` 下，Massing envelope
距离 stylized asphalt edge 约 `8.8255` scene units，不能作为有证据的沿街锚点；
同时与 House 315 obstacle 发生 5 处 AABB 交叉。必须先裁决两栋建筑的原始 OSM
footprint 归属与沿街入口锚点，再重跑道路、邻栋、入口、碰撞和地图 runtime。

## 旧 Hero 与 strict lineage

旧 Hero `620dd38a...` 只有一个主建筑，而当前证据边界是两栋主体与开放庭院；
它不是从当前 Massing `593cc399...` 派生，也没有当前 Hero build record 或 MCP2
授权。其生成器还合并 patio、品牌文字、餐桌伞、绿植、灯串、花箱、酒桶、围栏
和装饰铺装，超出严格建筑范围。

因此旧 Hero 只保留为 Hold，不进入 MCP2。地图门未通过、Hero lineage 非法时，
不得从旧 Hero 派生 Identity，也不得把 Massing 冒充 Identity。

## 当前门状态

- Evidence for Massing：pass
- MCP1：pass-preserved
- Map：blocked
- Hero candidate：blocked
- MCP2：not-entered
- Identity：blocked / not-created
- MCP3：not-entered
- Building complete：false

本 checkpoint 仅增加 building-specific 审计和专项守卫，未修改共享 registry、
runtime、Fast manifest 或任何范围外资产。
