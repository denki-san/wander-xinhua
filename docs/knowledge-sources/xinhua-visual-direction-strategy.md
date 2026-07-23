# Xinhua Visual Direction Strategy

## Confirmed direction

项目下一阶段应采用 **Xinhua Summer Storybook / 新华盛夏绘本**：

- 以 Summer Afternoon 的夏日空气感、道路纵深、天空云层和角色尺度为主要参考；
- 以 Messenger 的海报式首屏、手绘轮廓、图形化角色和 UI 为辅助参考；
- 以新华路真实空间、梧桐、建筑身份构件和上海街具保证独特性；
- 不复制任何第三方模型、人物、贴图、字体、音乐或任务结构。

## Observed

- 当前首屏以完整地图为中心，地图覆盖范围清楚，但建筑高度、角色和环境纵深不足。
- 全览需要靠近 POI、阅读照片卡片再进入，沉浸体验被地图理解和媒介切换打断。
- 幸福里第三人称画面已具备建筑、街具、人物和阴影，但大面积灰白立面、均匀照明、普通成人角色比例与较少的生活细节削弱了情绪。
- 当前代码已经有 WatercolourSky、ACES tone mapping、雾、环境光、半球光、方向光、墨线和纸张效果；问题不是缺少单个效果，而是这些效果尚未被统一到一种明确时段和色彩合同。

## Inferred

- 继续平均扩展 POI 不会解决第一眼吸引力问题。
- 首屏从全览改为 hero street shot，会比继续强化 GIS 沙盘更快验证视觉方向。
- 当前人物需要比例、轮廓和动作层面的重做，仅换材质或服装颜色不足以达到可爱效果。
- 建筑需要真实身份 + 风格夸张 + 生活细节三层同时成立，不能只靠更粗墨线或更高模型精度。

## Unknown

- 新画风是否会显著提高真实用户的点击和停留意愿。
- 5.5～6 头身人物是否仍符合目标用户对新华路真实气质的期待。
- 移动端在新天空、云、阴影和更密场景下的稳定性能预算。
- 幸福里是否是最佳 hero vertical slice，仍需与上生·新所或新华路 315 号固定机位做同条件比较。

## Decision

先做一个 100～150 米、60～90 秒的幸福里入口垂直切片，不扩整张地图。P0 同时交付：

1. 三张同机位风格帧；
2. 明确的夏日天空、云、低角度太阳、长阴影和统一色盘；
3. 一个 5.5～6 头身原创城市漫游者；
4. 三栋关键建筑和一套上海街景 dressing kit；
5. 直接进入 hero street 的首屏；
6. 桌面与移动端各 30 秒无剪辑验收视频。

正式任务仍只保留“一平米行动”。其他吸引玩家前进的内容应是无计数、无任务清单的环境发现。

## Evidence

- Detailed review: `docs/research/xinhua-visual-direction-review.md`
- Summer Afternoon: <https://summer-afternoon.vlucendo.com/>
- Messenger: <https://messenger.abeto.co/>
- A Short Hike: <https://ashorthike.com/>
- Alba: <https://www.albawildlife.com/>
- Tiny Glade: <https://store.steampowered.com/app/2198150/Tiny_Glade/>
