# Wander Xinhua

《新华漫游志》是一个无需登录、打开即可体验的新华路手绘 3D 闲逛 MVP。
视觉与交互方向参考 `messenger.abeto.co`，场景模型、角色和运行时素材均为本项目原创实现。

## 当前体验范围

- 基于 OSM 行政边界和完整道路骨架的手绘 3D 新华路街道地图；街区采用连续缓坡高程，人物、道路和地标共用同一地面基准
- 主干道统一为深灰柏油路面，道路宽度按道路等级与统一地图比例呈现
- 十条主要道路的中文地名直接涂装在路面，并沿长道路重复出现，步行时无需仰头找悬浮标签
- 幸福里按公开中心线放在正确的相对位置，模型与碰撞使用同一横纵变换；番禺路端退到道路边缘，倒影池南侧保留连续步行带
- 华山绿地按公开场地边界和 21 条园路建模，包含低多边形草坡、成熟乔木与林下灌木、水景栈桥、篮球场、围网、球架、鸟笼架、幸福角、长椅和照明
- 上生·新所按公开场地与 11 个建筑轮廓建模，重点还原乡村俱乐部、孙科别墅、海军俱乐部露天泳池、工业锯齿屋顶和二期复合立面，并补充树阵、喷泉、入口雨棚、咖啡亭、自行车架、阅读庭院和导视
- 人物尺寸保持不变，地图与环境采用 5 倍体验尺度，能够真正进入幸福里街巷闲逛
- 自由闲逛、Shift 加速奔跑、跳跃、镜头旋转和远近缩放
- 幸福里建筑与真实行政边界碰撞；行政边界本身限制玩家和相机移动，不设置虚构的道路出口围挡
- 只有一个“一平方米”行动点，不设置任务链或故事线
- 桌面端键盘操作，以及手机端摇杆和跳跃按钮
- 无账号、无密码、无登录门槛

## 本地运行

```bash
npm install
npm run dev
```

本地生产构建与静态预览：

```bash
npm run build
npm start
```

本地或公网验收时可通过查询参数直达两处地标：

- `/?start=huashan`：华山绿地核心水景
- `/?start=shangsheng`：上生·新所庭院
- `/?start=xingfuli`、`/?start=hero`：幸福里英雄街区固定视觉验收入口
- `/?start=court`、`/?start=pool`、`/?start=sunke`：篮球场、露天泳池和孙科别墅的细部验收坐标；这些地址不增加产品内按钮或行动点

## 验证

```bash
npm test
```

## AI 辅助建模工作流

真实 POI、建筑、角色和重要环境资产必须遵循
[Codex × Blender × Three.js 资产工作流](docs/research/blender-ai-workflow.md)。

新资产开始前，复制
[Blender Model Brief 模板](docs/research/templates/blender-model-brief-template.md)，
完成本地参考图、canonical comparison view、质量合同、分批计划和三层验收定义。
仓库级硬门槛见 [`AGENTS.md`](AGENTS.md)。

内容采集、视频拉片、专题调研和 LLM Wiki 学习统一执行
[内容研究到知识库工作流](docs/research/content-research-wiki-workflow.md)。
可复用的 Blender、Three.js 与建模方法位于
[Blender Three.js Modeling Playbook](docs/knowledge-sources/blender-threejs-modeling-playbook.md)。

## 部署

本地构建产物、`xinhua.denkisan.me` 的 Nginx 静态入口、HTTPS 和回滚方式见
[`deploy/README.md`](deploy/README.md)。

## 数据与内容边界

- 微信材料只用于理解项目背景，不作为视觉设计或素材来源。
- 参考站只用于研究视觉语言与交互结构，不复制其受版权保护的资源。
- 行政边界、道路拓扑、幸福里位置，以及华山绿地和上生·新所的公开场地、园路与建筑轮廓来自 OpenStreetMap，并使用统一投影比例；它们不是测绘级成果。
- 全街道大尺度高低趋势来自 Copernicus DEM GLO-30（约 30 米 DSM），经道路采样、邻域低分位过滤和稳健平面拟合后使用；当前只表达约 1～2 米的街区缓坡，不表达楼顶、树冠、台阶和园内微地形。
- 当前体验比例为 1 个场景单位对应 2.7 米；这是在 13.5 米/单位地理基线上统一放大 5 倍后的表现尺度。
- 华山绿地、上生·新所、幸福里及新华路沿线地标的建筑高度、立面细节、植被和未标注环境要素均依据公开照片与文字做风格化原创表现；其余全街道建筑尚未填充。
