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
