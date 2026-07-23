# 新华秋日绘本主氛围

## 可执行结论

- **观察**：Kenney Skyboxes 的 day 资源是软边绘本云的 4096 × 2048
  等距柱状天空图，官方标注 CC0；Synty SIMPLE Sky 是 Unity/FBX 工作流，
  使用硬边低多边形云并受单次购买许可约束。
- **决策**：新华正式场景采用 Kenney day 的 2048 × 1024 sRGB 派生图作
  visual background，不把 LDR 天空作为 IBL。
- **观察**：上海长宁官方照片中的新华路深秋仍同时存在深绿、橄榄绿、黄赭和
  橙褐，阳光穿过悬铃木，在人行道、红砖和旧洋房上形成暖色斑驳光。
- **推断**：主时段锁定 11 月下旬 15:00；项目 `+X=东、+Z=南` 坐标下，
  西南低太阳使用约 `[-110, +50, +52]` 的方向光偏移。
- **决策**：天空、可见太阳、方向光与阴影共享同一方向；移除 Kenney 原图中
  偏高的太阳盘后，由 shader 绘制低角度暖色太阳。
- **决策**：秋色不是全黄。梧桐用残绿、黄赭、焦糖三档，灌木保持深绿；
  建筑保留奶白、红砖、暗木和旧红瓦；雾与阴影保持低饱和蓝灰。

## 证据

- 研究记录：`docs/research/xinhua-autumn-storybook-atmosphere.md`
- 参考清单：`docs/research/xinhua-autumn-atmosphere-reference-manifest.json`
- canonical：
  `docs/research/assets/style-references/xinhua-autumn-plane-trees-canonical.jpg`
- Kenney：<https://kenney.nl/assets/skyboxes>
- 上海长宁：<https://www.shcn.gov.cn/col6991/20221125/1226260.html>
