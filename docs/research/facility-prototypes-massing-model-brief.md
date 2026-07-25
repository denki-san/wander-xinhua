# Facility Prototypes Massing Model Brief

审计日期：2026-07-25  
批次：14 个 facility prototypes / 16 个运行时实例  
范围：只建立 Massing。Identity 与 Hero 由各自证据门决定，不因 Massing 生成而自动放行。

## 1. 动工门槛与输入

### 1.1 工具预检

- Blender：`/opt/homebrew/bin/blender`，5.2.0 LTS，Headless 可用；
- Node：25.3.0；npm：11.13.0；
- 确定性生成器入口：本 Brief 通过后新增
  `scripts/create_facility_prototype_massing_models.py`；
- GLB 审计：生成器必须记录 SHA、bounds、节点、三角面、材质、图片、
  根变换、动画与二进制体积；
- 既有参考实现：
  `scripts/create_shared_prototype_massing_models.py`；
- 静态构建：`npm run build:static` 已通过；
- 浏览器验收入口：将新增独立 facility Massing gallery，不替代真实地图验收；
- 当前 `127.0.0.1:4173` 预览服务在本次预检时离线。回退路径是生成后重新启动
  `dist-static` 预览，再做 gallery 与真实地图双层验收；在此之前只能记录
  Blender / GLB 产物，不能宣称正式 Massing 通过。

### 1.2 证据输入

- 几何、实例与预算：
  `docs/research/facility-prototypes-massing-geometry-spec.json`；
- 本地证据审计：
  `docs/research/facility-prototypes-evidence-audit.md`；
- 新联网证据与只读本地图片：
  `docs/research/facility-prototypes-reference-manifest.json`；
- 稳定实例：
  `docs/research/model-placement-registry-20260725.json`；
- 原型全集：
  `docs/research/all-models-production-registry.json`。

新联网证据只补事实，不覆盖旧照片。参考图不得嵌入 GLB、不得作为运行时贴图，
不得复制受保护 logo 或品牌文字。

## 2. 全量清单与准入

| Prototype ID | 实例 | Massing 输入 | Identity 状态 |
| --- | ---: | --- | --- |
| `prototype:facility:shangsheng-wayfinding-totem` | 2 | 运行时包络，现实形态 unknown | 阻断 |
| `prototype:facility:shangsheng-cafe-pavilion` | 1 | 运行时包络，现实主体未绑定 | 阻断 |
| `prototype:facility:shangsheng-bicycle-parking` | 1 | 运行时包络，现实主体未绑定 | 阻断 |
| `prototype:facility:shangsheng-reading-terrace` | 1 | 运行时包络，现实主体未绑定 | 阻断 |
| `prototype:facility:shangsheng-fountain` | 2 | OSM 四边形 + 园区级地面喷泉照片 | 条件阻断 |
| `prototype:facility:shangsheng-main-entry` | 1 | 入口正面照片 + 运行时包络 | 条件准入 |
| `prototype:facility:huashan-pond-boardwalk` | 1 | 公开文字 + 运行时包络 | 阻断 |
| `prototype:facility:huashan-basketball-court` | 1 | OSM 五边形 + 2025 官方入口照片 | 条件阻断 |
| `prototype:facility:huashan-bird-pergola` | 1 | 公开文字 + 运行时包络 | 阻断 |
| `prototype:facility:huashan-happiness-corner` | 1 | 2026 官方多视角实景 | Identity 候选，地图 overlay 未完成 |
| `prototype:facility:xingfuli-reflecting-pool-hardscape` | 1 | 多视角照片 + 既有完整 Brief | 准入 |
| `prototype:facility:xingfuli-mixed-paving` | 1 | 铺地近景 + 既有完整 Brief | 准入 |
| `prototype:facility:xingfuli-vertical-garden` | 1 | 2023 官方主巷绿墙照片 | 条件准入 |
| `prototype:facility:one-square-metre-action` | 1 | 产品源码为形态权威；公开图只证项目背景 | 原创产品轨 |

本表的“准入”只允许进入下一批 Identity 设计，不等于 Identity 已完成。

## 3. 坐标、比例、原点与地图规则

- Blender：`Z` 向上；运行时：`Y` 向上；
- 所有原型以地面中心为 `(0, 0, 0)`，根节点不得保留平移、旋转或缩放；
- 普通场地使用 `1 authored scene unit = 2.7m` 的项目换算，但这一数值是
  运行时 authored contract，不是现场测量；
- 幸福里具有非均匀场地变换，任何本地尺寸都不得直接乘 2.7 后冒充米制实测；
- 原型 GLB 不烘焙世界位置和 yaw；实例继续使用 placement registry 的稳定 ID；
- OSM 设施优先保留真实 footprint：
  两个上生喷泉分别生成实例资产；华山篮球场使用五边形场地边界；
- 地图正式门必须分别验证 collection transform、位置、yaw、地面接触、
  道路退界、角色尺度与碰撞。gallery 只验原型，不证明地图放置；
- 碰撞不得从完整视觉 AABB 自动生成。池、桥、门架、环台与开放廊架必须保留通行。

## 4. 视角覆盖矩阵

固定 Blender canonical 为 `(7, -9, 6)` 看向主体地面中心；side 为
`(-8, -5, 4.8)`。超长场地允许按长轴旋转机位，但必须记录观察方向。

| 原型 | Canonical | 侧向 / 纵深 | 入口 / 身份细节 | 缺口 |
| --- | --- | --- | --- | --- |
| 上生导视图腾 | 运行时轮廓 | 运行时轮廓 | 无现实导视面 | 全部现实形态 unknown |
| 上生咖啡亭 | 六边亭体 | 柱网通透性 | 柜台方向 unknown | 无专属照片 |
| 上生自行车停车 | 七跨阵列 | 阵列纵深 | 锚固 unknown | 无专属照片 |
| 上生阅读环台 | 八边环台 | 环内通行 | 中心构件用途 unknown | 无专属照片 |
| 上生喷泉 | OSM 两个 footprint | 园区喷泉广场 | 喷头局部 | 照片—way 绑定 unknown |
| 上生主入口 | 入口正面 | 需补侧向 | 门架与中轴 | 背面、净深 unknown |
| 华山水池栈道 | 椭圆水体候选 | 跨水方向 | 接岸 unknown | 无同主体照片 |
| 华山篮球场 | 入口三分之四 | 需补全场侧向 | 闸机、篮架、围网 | 第二篮架与边界语义 unknown |
| 华山观鸟廊架 | 半开放轮廓候选 | 开放空间 | 节点 unknown | 无同主体照片 |
| 华山幸福转角 | 官方广角 canonical | 官方花池/坐阶侧向 | 心形环架与坐阶近景 | 地图 overlay 与精确尺寸 unknown |
| 幸福里倒影池 | 既有 canonical | water-lane | 桥面、池沿 | 工程尺寸 unknown |
| 幸福里混合铺地 | 主巷覆盖 | 近景长轴 | 错缝与灰阶 | 单块规格 unknown |
| 幸福里垂直花园 | 官方主巷纵深 | 需补侧视 | 绿墙下部实体墙 | 模块与厚度 unknown |
| 一平米行动 | 产品三分之四 | 产品侧视 | 点击牌与悬浮标志 | 不是现实固定装置 |

## 5. 观察、推断与未知

### 5.1 直接观察

- 上生海军俱乐部前官方照片可见多股齐地喷头和铺装，不见高池沿；
- 华山篮球场官方照片可见蓝色场面、绿色围网、入口闸机、绿色悬臂篮架和白色篮板；
- 华山幸福转角官方多视角可见大型粉色同心心形环架、粉色多级坐阶、
  浅色曲线花池和成熟林下场地；
- 幸福里政府照片可见主巷左侧连续高绿墙，以及墙下深色实体基部；
- 幸福里既有照片直接支持长条浅水景、跨水木桥与多尺寸灰石错缝铺地；
- “一平米行动”公开资料证明社区共创项目与园艺/手作活动，
  不证明游戏内固定装置的几何。

### 5.2 合理推断

- 没有设施专属照片的上生/华山原型，仅以当前运行时包络做可替换 Massing，
  并用中性材质标记“未确认”；
- 两个上生 OSM fountain 可先生成各自 footprint 薄层，但喷头阵列不能从园区级照片
  逐一复制；
- 华山篮球场可使用 OSM footprint 与官方照片的结构语言，场色、围网高度和篮架
  精确尺寸仍是待校正参数；
- 幸福转角旧三门架 + 花团方案与 2026 官方实景冲突，禁止继续作为新 Massing；
- 垂直花园 Massing 只保留墙体与绿化主轮廓，不把植物模块做成高面数单体；
- 一平米行动按产品原创资产处理，形态权威来自当前产品设计，不冒充现实测绘。

### 5.3 未知

- 六项仍无专属照片：上生图腾、咖啡亭、自行车停车、阅读环台、
  华山水池栈道、华山观鸟廊架；
- 上生两个 fountain 与公开地面喷泉广场的逐一对应；
- 华山篮球场照片视线与 OSM 边界的精确 overlay、围网入口和第二篮架；
- 幸福转角在当前地图 collection 中的精确 pivot、yaw、地形高差与占地；
- 垂直花园的工程高度、长度、厚度、模块和灌溉构造；
- 所有设施 2026 年后的改造、运营与临时布置变化。

## 6. 主体独有识别构件

| 原型 | Massing 至少三处识别构件 |
| --- | --- |
| 上生导视图腾 | 六边主柱、左右交替楔块、窄高比例 |
| 上生咖啡亭 | 六边薄顶、六柱通透空间、中心八边柜台 |
| 上生自行车停车 | 七跨 U 环、线性阵列、低矮纵深包络 |
| 上生阅读环台 | 八边环台、中心台体、环向座位附件 |
| 上生喷泉 | 各自 OSM 四边 footprint、中性齐地薄层；不表达连续水面、高池沿或喷头布局 |
| 上生主入口 | 深色顶盖、双侧支柱、中央通行开口 |
| 华山水池栈道 | 椭圆水体候选、跨水薄桥、双侧连续栏杆轮廓 |
| 华山篮球场 | OSM 五边场地、双篮架主轮廓、围网高度带 |
| 华山观鸟廊架 | 低平台、开放拱杆轮廓、可穿越中部 |
| 华山幸福转角 | 粉色同心心形环架、粉色多级坐阶、浅色曲线花池 |
| 幸福里倒影池 | 长条池壳、双侧池沿、跨水桥面 |
| 幸福里混合铺地 | 薄长覆盖面、主巷长轴、零碰撞 |
| 幸福里垂直花园 | 高绿墙、深色实体基部、不规则植被顶边 |
| 一平米行动 | 方形平台、外环/角部花盆、信息板与悬浮标志 |

## 7. 预算与文件

- 每个 Massing GLB：`0 images/textures`、`0 animation`；
- 小型设施：`< 64KB`、`< 256 triangles`；
- 水池、球场、幸福转角等场地构件：`< 128KB`、`< 768 triangles`；
- 每个资产必须交付：
  - `assets/models/source/tiers/facility-prototypes/massing/<slug>-massing.blend`
  - `public/models/tiers/facility-prototypes/massing/<slug>-massing.glb`
  - canonical / side Blender 预览；
  - build record；
- 两个 OSM fountain 如共用视觉语言，也必须保留不同 footprint 的实例文件和稳定 SHA；
- 视觉资产与碰撞代理分离；水面和铺地不产生角色碰撞。

## 8. 分批执行与质量门

1. 先生成 14 个原型语义条目；两个喷泉按 footprint 形成 15 个 GLB；
2. 生成 `.blend`、GLB、双视角截图、manifest 和 build record；
3. 结构审计全过后，接入独立 facility gallery；
4. gallery 逐项验证加载、完整、落地、正面语义、屏幕占比与资源请求；
5. 再回到三处真实地图入口，逐实例验证位置、比例、yaw、道路退界、碰撞和可通行性；
6. 独立审查至少在灰模与最终两个节点执行；
7. 正式 Massing 未通过前，不批量进入 Identity；
8. Identity 只处理证据准入项；阻断项继续保留 Massing，并在 registry 明确缺图原因；
9. Hero 需另建 Brief。铺地、水池等作为场地 Hero 集成资产，不为凑层级虚构独立地标。

## 9. 完成定义

本批“生成完成”不等于“正式 Massing 通过”。只有 Blender、GLB、gallery、
真实地图、碰撞/通行与独立审查全部通过，才可把对应资产标为
`formal-massing-pass`。缺照片、缺地图 overlay 或使用 fallback 尺寸的资产必须在
最终记录中保留这些事实，不能用统一绿色状态掩盖。
