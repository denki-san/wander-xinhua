# Street Surface Refinement Decision Log

## 2026-07-25 — Reference gate

- 选择 Wikimedia Commons 的 2023 新华路近番禺路照片作为 canonical；
- 直接观察到黄色短虚线、红色非机动车带和白色连续分隔线；
- 2009 两张侧向照片只用于路缘、入口和街道尺度，不用来覆盖 2023 标线事实；
- 上海废物箱照片来自威海路，确认城市类型，但不推断新华路每一只桶完全同款；
- 原始参考照片只做研究证据，不进入运行时材质。

## 2026-07-25 — Implementation direction

- 保留道路和街具的程序化/实例化路线，不引入新的 GLB；
- 以合并几何实现道路标线与 faceted shrub cluster；
- 用共享矩形 primitive 批次重做双分类废物箱；
- 新增集中 batch state，让同类资产的亮灭、显隐和后续季节状态有单一入口；
- 不复制真实垃圾分类文字或图标，只保留结构与颜色语义。

## 2026-07-25 — Runtime acceptance

- 运行时入口改用地标 `query`：上海影城为 `?start=cinema`，不是内部 `id`；
- 桌面生产预览确认黄色短虚线、红色非机动车带、白色连续分隔线和 faceted shrub；
- 1280×720 可见页面预热约 6 秒后采样 120 帧，平均约 `39.90 FPS`，P95 约 `33.70 ms`，控制台无 error；
- `npm run lint` 通过，`npm test` 通过 `130/130`；
- 没有同条件改动前基线，不声明性能提升；
- 移动端 lowTier、draw calls 和 triangles 仍是正式合并前待办，不阻塞当前分支视觉预览。

## 2026-07-25 — Wiki sync boundary

- 唯一事实源已写入独立 `3D_Modeling_ThreeJS_Knowledge_Base`；
- `Threejs-3d-research/raw/sources/` 使用相同 inode 的 hard link，没有再存一份普通副本；
- Source Rescan 已完成，源文件可由 Wiki API 读取；
- 摄取队列前方存在无关资料的长期 `processing`，本条仍为 `pending`，所以暂不声称 Wiki 已生成页面或可检索。

## 2026-07-25 — Independent review corrections

- 双分类面板位于垃圾桶 local `+Z`，旧的道路 tangent yaw 会让两侧实例正反不一；
- 新 yaw 使用道路切线和 `sideSign`，让所有垃圾桶正面统一朝路缘外侧的人行区域；
- 新增向量级测试，逐个断言分类面板正面与“道路中心到垃圾桶”的外向向量同向；
- 新华路批量亮灯改为 `emissive-only`，`lit` 打开时只改变共享灯罩材质，不为约 11 盏灯各建一个动态 `PointLight`；
- 其他确实需要近景动态灯的场景仍可显式使用原有 `point-lights` 模式。
