# Xinhua Villas 211 Final Gap Audit

## 结论

`xinhua-villas-211` 当前完成到 Massing v3、MCP1 和真实 Three.js 地图运行时；
Hero 与 Identity 仍是 `blocked-evidence`。这不是“Hero 只缺主窗口 MCP2”的
情况，因此本分支没有生成 Hero 终审候选，也没有派生 Identity。

## 证据裁决

stable ID 指向“211弄复合院落入口 / 弄堂锚点”，不是211弄1号或2号单体。
入口官方图只证明入口轴线、左右局部边缘和开放车道；另外两张官方图分别证明
1号正面和2号正面斜视，但没有建立它们与入口或九个 OSM footprint 的位置、
朝向、门牌对应关系，也缺同一成员的完整侧向 / 纵深证据。

因此九个已绑定 way 足以支持保守 Massing，但不足以支持成员级 Hero 或 Identity。

## 旧 Hero

旧 GLB `public/models/xinhua-road/xinhua-villas-211.glb` 的容器审计通过，但它是
四栋固定排布的 legacy package，生成器还混入树木、绿篱、灯、花箱、长椅和
铺装网格。它与 compound 证据没有合法 lineage，只能保留为 Hold，不能提交
MCP2，更不能作为 Identity 的父资产。

## 已保留的合格阶段

- Massing v3：`ab05b4ec...`，9 个独立节点 / obstacle，134 triangles。
- MCP1：`pass-main-window-batch`。
- 地图运行时：`pass-main-window-real-browser`。
- 新华路 asphalt edge 净距：`3.0396` scene units。
- 入口净宽：`3.6682`，人物直径 `0.96`。
- 九个 footprint polygon / local obstacle AABB overlap 均为 `0`。
- 碰撞：八秒墙停、无穿透。

以上阶段只读复核，不重跑 Blender 或浏览器。

## Identity 禁门

Identity 不得从 Massing v3 派生，否则只是把 Massing 冒充 Identity；也不得从
旧 Hero 派生，因为旧 Hero 没有证据真值和 MCP2 授权。只有补齐成员到 OSM way
绑定、同一成员侧向 / 纵深证据，并由主窗口对新的合法 Hero 通过 MCP2 后，
才能运行确定性 Identity 生成器。

## 范围

本 checkpoint 只增加本栋审计与专项守卫。未修改共享 registry、runtime 或
Fast manifest；未触碰树木、装饰、普通 OSM、全地图、其他建筑或 Recovery/Hold。
