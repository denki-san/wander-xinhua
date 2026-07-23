# Three Style Demo Brief

日期：2026-07-23

## 目标

在同一个幸福里街景、相同建筑资产、相同人物起点和相同移动方式下，比较三套能够独立成立的视觉方向。Demo 只改变艺术导演层，不改变幸福里的真实相对位置、主要建筑身份、碰撞事实或参考证据。

统一入口：`/style-lab`

- `/style-lab?style=atlas`
- `/style-lab?style=summer`
- `/style-lab?style=comic`

## 共同事实层

### Observed

- 幸福里建筑来自仓库现有多角度参考、模型 Brief、确定性 Blender 生成器和三段 GLB。
- 同一份 `XingfuliBlock` 同时提供建筑、倒影池、垂直花园、入口墙、街灯、长椅、咖啡座与梧桐。
- 当前运行时人物源自 Quaternius Ultimate Modular Men Pack 的 CC0 模块，授权证据保存在 `assets/models/source/character/QUATERNIUS_MODULAR_MEN_LICENSE.txt`。

### Inferred

- 使用同一地点和镜头能把偏好差异主要归因于色彩、光照、角色比例、后处理和 UI，而不是内容量差异。
- 盛夏方向已按用户反馈淘汰程序化几何人物，改用 Blender Animation Studio 完成的 Rain 成品角色；模型转换、骨骼简化和动作适配由项目侧完成，不要求用户参与 3D 设计。

### Unknown

- 三种风格在真实目标用户中的第一眼胜率。
- 新增云层、2048 阴影和幸福里详细 GLB 在低端移动设备上的同条件性能。
- 最终角色应继续程序化，还是按获胜方向制作带骨骼的正式 GLB。

## Style 01 — Xinhua Ink Atlas / 新华墨线档案

### 命题

这是一份可以走进去的社区档案。真实尺度、冷青水彩、墨线和低干扰人物共同服务于空间与建筑证据。

### 合同

- 天空：现有青绿 WatercolourSky。
- 建筑：现有 toon 材质与冷灰、暖白、玻璃青。
- 光照：较高太阳、均匀可读性、克制阴影。
- 人物：接近普通成人比例、低饱和城市服装。
- UI：档案卡片、直角、小字号信息层。
- 操作：WASD/方向键支持长按与点按位移；完整版本链接回 `/?start=xingfuli-canonical`。

### 适合

重视地图、历史信息、空间可信度和长期内容扩展。

### 代价

第一眼传播力较弱，容易继续滑向“精致地图工具”。

## Style 02 — Xinhua Summer Storybook / 新华盛夏绘本

### 命题

新华路最值得被记住的是一个具体下午。天空、奶油云、暖阳、梧桐绿、长阴影和草帽漫游者共同制造可停留的夏日情绪。

### 合同

- 天空：明亮蓝天、三层奶油云、可见暖黄太阳与低多边形远景树冠。
- 建筑：暖白墙、砖红强调、灰绿植被、柔化墨线。
- 光照：低角度暖色方向光、蓝色天空补光、长阴影。
- 人物：Rain 成品角色候选，保留作者完成的脸、五指手部、夏装、马尾和成人卡通比例，不再人为放大手掌。
- UI：奶油纸、圆角不对称卡片、宋体/绘本气质。
- 操作：同一 WASD/方向键路径；镜头保持低而稳定，让天空进入画面。

### 适合

重视情绪、停留、治愈感和 Summer Afternoon 式第一眼吸引力。

### 代价

若身份构件和上海细节不足，容易变成通用 cozy 小镇。

## Style 03 — Xinhua Comic Diorama / 新华漫画微缩城

### 命题

把真实街区压缩成一张可操控的城市漫画海报。不是复制 Messenger 星球，而是借用强轮廓、图形色块、夸张人物和传播构图。

### 合同

- 天空：高饱和青色、几何白云、圆形太阳和分块远景。
- 建筑：有限色盘、强墨线、flat shading、减少中间色。
- 光照：明快高反差，阴影服务于剪影而非写实。
- 人物：原创约 4.8～5.2 头身红帽漫游者，扩大头、手、鞋与颜色锚点。
- UI：粗边框、错位阴影、编号与海报排版、半调网点。
- 操作：同一 WASD/方向键路径；数字 1/2/3 即时切换风格。

### 适合

重视首页传播、社交截图、年轻化和强品牌记忆。

### 代价

图形化过强会压低建筑材料细节，正式版必须保留每栋 POI 的三处身份构件。

## 资产与授权

- 盛夏 Demo 新增 Rain 的 CC-BY 派生运行时资产，来源、下载 SHA、授权和转换记录见 `docs/research/rain-character-reference-manifest.json`、`docs/research/rain-summer-character-brief.md` 与 `assets/models/source/character/RAIN_LICENSE.txt`。
- 幸福里继续使用仓库现有原创 GLB、Blend 和生成器。
- 漫画人物仍由 Three.js 基础几何程序化生成；盛夏人物使用 Rain，不复制 Summer Afternoon 或 Messenger 人物。
- 现有 Quaternius CC0 人物仅作为基线和未来正式角色候选，来源与授权见：
  - `assets/models/source/character/README.md`
  - `assets/models/source/character/QUATERNIUS_MODULAR_MEN_LICENSE.txt`

## 验收

- 三个 URL 都能直接打开正确风格。
- 三种风格使用同一 `XingfuliBlock`，没有复制第三方建筑或人物资产。
- WASD、方向键和移动端四向按钮均能移动人物与跟随镜头。
- 数字 1/2/3 和界面卡片能切换风格并更新 URL。
- 桌面固定视口分别输出三个 `test_` 截图。
- 生产构建、风格合同测试、全仓 lint 与干净浏览器 console 验收通过。
- 全仓回归测试若受并行中的幸福里/梧桐改造影响，需单独保留失败项，不归因于风格 Demo。
