# Xinhua Autumn Storybook Atmosphere

研究日期：2026-07-23

## 问题与质量合同

问题：在“新华盛夏绘本”方向已被选中的前提下，哪套天空更适合当前
Three.js 场景，以及如何把主氛围调整成上海新华路的秋日下午。

质量合同：

- 天空、可见太阳、方向光和长阴影必须来自同一个西南方向。
- 画面应保留蓝天与残绿，不能用全屏橙黄代替上海秋色。
- 梧桐至少包含残绿、黄赭和焦糖三档；建筑保留白墙、红砖、旧红瓦身份。
- 外部图片仅作研究证据；只有明确允许的天空资产可以进入运行时。
- 正式页面的桌面和移动端固定入口都要生成运行时截图并检查控制台。

## 资源比较

### Kenney Skyboxes

观察：

- 官方包是 5 张 4096 × 2048 的等距柱状 PNG，day 天空包含软边大云、
  蓝色空气透视和一个太阳盘。
- 官方页面明确标注 Creative Commons CC0。
- 单张 day PNG 约 1 MB，可直接用于 Three.js 球形天空。

推断：

- 软边云与当前 PaperWash 和 Summer Afternoon 式绘本空气感一致。
- 运行时应只把 LDR 天空作为背景，仍由 HemisphereLight 和
  DirectionalLight 控制建筑与人物受光。

### Synty SIMPLE Sky

观察：

- 官方只承诺 Unity 2021.3 package 与 FBX source。
- 产品通过 X 方向 UV 偏移改变时段，云是清晰的低多边形块状造型。
- 免费价格不等于 CC0；下载和使用受 Synty One Time Purchase Licence 约束。

推断：

- 当前建筑、Rain 人物和纸张后处理没有采用同一套 chunky low-poly 语言；
  直接接入会强化“拼装素材包”感。
- Three.js 需要重新实现材质与 UV 动画，且公开仓库不适合提交可提取源资产。

决策：使用 **Kenney skybox-day**。Synty 只保留为研究对照，不进入运行时。

## 新华路秋日依据

### 观察

- 长宁区政府将新华路列为秋季“落叶不扫”道路，主要树种是悬铃木。
- 官方照片显示树冠不是整片金黄，而是深绿、橄榄绿、黄赭与少量橙褐并存。
- 阳光穿过树冠后在人行道、红砖墙和旧洋房上形成斑驳暖光。
- 道路和阴影仍保持中性或蓝灰，红砖、落叶与暖光提供色彩重点。

### 推断

- 主时段锁定 11 月下旬 15:00 左右，比橙红夕阳更符合新华路日常漫游。
- 太阳位于西南、仰角约 20°～23°；当前项目坐标为 `+X=东、+Z=南`，
  因此方向光相对观察中心使用约 `[-110, +50, +52]`。
- 秋色比例使用残绿约 20%、黄赭约 55%、焦糖/橙褐约 25%。

### 未知

- 具体某一天的云量、湿度和太阳仰角会变化；本次是可重复的艺术化主氛围，
  不是天气重演。
- Kenney day 原图中的太阳高度高于目标时段，因此运行时 shader 会移除原太阳，
  再按共享太阳方向绘制低角度暖色太阳盘。

## 实施参数

- 天空底图：`public/textures/sky/kenney-day-2048.jpg`
- 天空颜色空间：sRGB
- 雾：低饱和蓝灰 `#b8c8d7`
- 直射光：`#ffd09b`
- 天光：`#dceaf5`
- 地面反弹：`#80644e`
- 方向光偏移：`[-110, 50, 52]`
- 探索模式阴影：2048，近景范围约 120～150 world units
- 纸张颗粒：降低强度，保留空气和明暗层次
- 梧桐：深橄榄、黄赭、焦糖三档；灌木继续保持深绿

## 运行时验收

- 桌面主视觉：
  `test_artifacts/test_xinhua_autumn_storybook_hero.png`
- 移动端 390 × 844：
  `test_artifacts/test_xinhua_autumn_storybook_mobile.png`
- 其余固定入口：
  `test_artifacts/test_xinhua_autumn_storybook_xingfuli.png`、
  `test_artifacts/test_xinhua_autumn_storybook_house315.png`、
  `test_artifacts/test_xinhua_autumn_storybook_garden179.png`
- Chrome 桌面与移动端控制台均无 error；只保留 Three.js 上游的
  `PCFSoftShadowMap` 与 `Clock` deprecated warning。
- 移动端在页面可见、预热完成后采样 2 秒，共 121 帧，平均 RAF 间隔
  16.67 ms，约 60 FPS；该结果仅代表本机开发构建和 390 × 844 视口。
- `npm test`：116/116 通过；`npm run lint`：通过。

## 来源

- Kenney Skyboxes: <https://kenney.nl/assets/skyboxes>
- Kenney CC0: <https://creativecommons.org/publicdomain/zero/1.0/>
- Synty SIMPLE Sky: <https://syntystore.com/products/simple-sky-cartoon-assets>
- Synty One Time Purchase Licence:
  <https://syntystore.com/pages/one-time-purchase-licence>
- 上海长宁“落叶不扫”新华路：
  <https://www.shcn.gov.cn/col6991/20221125/1226260.html>
- 上海市政府秋季概览：
  <https://english.shanghai.gov.cn/en-Overview/20241225/ce046a2a1e754fde8c02804d6d66db18.html>
