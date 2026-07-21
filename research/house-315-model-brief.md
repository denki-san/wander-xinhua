# House 315 Model Brief

## 建模对象

- Subject and address：新华路315号住宅，上海市长宁区新华路315号
- Intended stylization level：适合《新华漫游志》的精致扁平 3D；保留真实轮廓和开间节奏，材质做 cozy 风格化
- World scale and coordinate convention：
  - `wander-xinhua` 当前地图为 `2.7 m / scene unit`
  - 原模型采用 Blender Z-up、正面 local `-Y`
  - demo 同时展示 legacy visual scale 与建议的 meter-authored scale
- Placement evidence：当前为 `address-and-road-setback`，因此位置是 B-，不是测绘级

## 参考证据

- Primary reference URL：<https://www.jfdaily.com/sgh/detail?id=1697461>
- Local reference photo：`docs/research/assets/landmark-comparison/house-315-real.jpg`
- Canonical comparison photo：`REF-A`
- Canonical view direction：`front-gable`
- 参考照片不进入页面运行时，也不嵌入 GLB

## 形体判断

- Confirmed silhouette and massing：陡坡屋顶、双山墙、主楼与侧翼的错落体量
- Facade and opening rhythm：上下红砖/白灰泥分层，正面凸窗和窄窗组
- Roof and cornice：深檐、瓦垄、烟囱；屋顶坡度仍属于照片推断
- Material palette：暖白灰泥、砖红、深灰绿屋顶、浅蓝灰玻璃、深棕木构
- Identifying details：
  1. 双山墙半木构
  2. 红砖首层与白灰泥上层
  3. 正面凸窗
  4. 陡坡屋顶和烟囱
- Site context：深灰柏油路、花园灌木、梧桐、围墙和入口关系
- Details intentionally omitted：照片不可见的后立面细节、不可证实的门头文字、室内和精确屋顶构造

## 运行时计划

- Runtime asset：`public/models/house-315.glb`
- Editable source：`assets/models/source/xinhua-road/house-315.blend`
- Deterministic source：`scripts/create_xinhua_road_models.py`
- GLB SHA-256：`9d407a35c10bfa232d2a5a91ecae4886a9b146cdabec801319c7dc5530b67b07`
- Collision：demo 只展示 footprint 与建筑包络，不实现角色碰撞
- Camera clearance：四个预设机位均位于模型包络外；自由视角限制近远距离
- Repeated vegetation：Three.js 中建立三种不同梧桐树冠/树干结构并交错布置

## 重要边界

这个 demo 展示的是“怎样让证据、比例、位置和风格变得可审计”，不是宣称已经获得新华路315号的测绘真值。未测得的高度、屋顶坡度和道路退界必须继续显示为推断。
