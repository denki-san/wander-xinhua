# Hudec Memorial Model Brief

## 建模对象

- Subject and address：邬达克纪念馆，上海市长宁区番禺路129号
- Intended stylization level：真实轮廓和专属构件优先；使用暖白灰泥、深木构、红砖和低饱和植被形成手作式 diorama
- World scale and coordinate convention：沿用 `2.7 m / scene unit`；模型正面 local `-Y`，demo 统一转为 Three.js 展示坐标
- Placement evidence：OSM way `494633921`，包含完整建筑轮廓、地址、层数和历史建筑标签

## 参考证据

- Primary reference URLs：
  - <https://commons.wikimedia.org/wiki/File:Hudec_House.jpeg>
  - <https://www.shcn.gov.cn/col6991/20260405/1307940.html>
- Local reference photos：
  - `docs/research/assets/requested-poi-references/hudec-memorial-front-wikimedia.jpg`
  - `docs/research/assets/requested-poi-references/hudec-memorial-west-elevations.jpg`
- Canonical comparison photo：`HUDEC-REF-A`
- Canonical view direction：`front-right-three-quarter`
- 参考照片不进入页面运行时，也不嵌入 GLB

## 形体判断

- Confirmed silhouette and massing：三层主楼、陡峭双坡屋面、两端烟囱、入口小门廊
- Facade and opening rhythm：窄高分格窗、深色半木构与暖白灰泥对比
- Roof and cornice：陡坡瓦屋顶、老虎窗、深檐
- Material palette：暖白灰泥、近黑色木构、深灰褐瓦、红砖、暗绿玻璃
- Identifying details：
  1. 深色都铎半木构
  2. 陡坡屋顶与老虎窗
  3. 三角入口门廊
  4. 红砖拱门与围墙
  5. 前院圆形树池
- Site context：前院铺装、矮绿篱、红砖围墙和树池
- Details intentionally omitted：室内陈列、真实牌匾、被植被完全遮挡的后立面

## 运行时计划

- Runtime asset：`public/models/hudec-memorial.glb`
- Editable source：`assets/models/source/requested-pois/hudec-memorial.blend`
- Deterministic source：`scripts/create_requested_poi_models.py`
- Fixed-camera preview：`test_artifacts/test_hudec-memorial_preview.png`
- GLB SHA-256：`42159678fb720c963a82921ed827aceb7825b164da321d67345891732f622984`
- Collision：本 demo 只展示建筑包络与证据图层；原项目碰撞仍由主楼、门廊、围墙和树池分别承担
- Camera clearance：主照片视角位于前院外，复核视角覆盖西立面

## 重要边界

两张公开参考能提升朝向和侧立面判断，但仍不足以确认后立面和现场标高。未知信息必须继续留在“Unknown volume”，不能被风格化细节掩盖。
