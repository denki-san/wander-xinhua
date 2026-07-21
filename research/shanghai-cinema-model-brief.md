# Shanghai Cinema Model Brief

## 建模对象

- Subject and address：上海影城，上海市长宁区新华路160号
- Intended stylization level：保留现代建筑的连续弧形轮廓、首层通透感与层叠水平线，用低饱和材质纳入《新华漫游志》街区语言
- World scale and coordinate convention：沿用 `2.7 m / scene unit`；模型正面与原项目资产约定一致，demo 只做统一居中和宽度归一
- Placement evidence：OSM way `292250766`

## 参考证据

- Primary reference URL：<https://www.thepaper.cn/newsDetail_forward_23253561>
- Local reference photo：`docs/research/assets/landmark-comparison/shanghai-cinema-real.jpg`
- Canonical comparison photo：`CINEMA-REF-A`
- Canonical view direction：`left-front-three-quarter`
- 参考照片不进入页面运行时，也不嵌入 GLB

## 形体判断

- Confirmed silhouette and massing：连续弧形白色外壳包覆三层主体，首层比上部更通透
- Facade and opening rhythm：长条玻璃、连续水平带、均匀屋顶格栅
- Roof and cornice：平缓屋面与格栅；曲率精度仍属照片和现有模型的综合推断
- Material palette：暖白外壳、蓝灰玻璃、深灰金属、低饱和绿化
- Identifying details：
  1. 连续弧形白色外壳
  2. 环形玻璃首层
  3. 外楼梯
  4. 屋顶格栅
- Site context：新华路道路界面、梧桐与入口前场
- Details intentionally omitted：商标贴图、室内影院、背街设备细节

## 运行时计划

- Runtime asset：`public/models/shanghai-cinema.glb`
- Editable source：`assets/models/source/xinhua-road/shanghai-cinema.blend`
- Deterministic source：`scripts/create_xinhua_road_models.py`
- Fixed-camera preview：`test_artifacts/test_shanghai-cinema_preview.png`
- GLB SHA-256：`8ca2938d19a4285eec69e13753a9136b74826338f0d416f94b6631dca9dd93c7`
- Collision：本 demo 使用可视包络，不承担原项目角色碰撞
- Camera clearance：主照片、复核、地图和街道四个机位均位于建筑包络外

## 重要边界

上海影城用于验证“同一套图片生成链路如何适配现代曲面建筑”。浏览器内生成体是基于图像信号的程序化 blockout，不是对原建筑的逆向扫描。
