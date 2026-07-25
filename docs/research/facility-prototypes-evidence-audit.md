# Facility Prototypes Evidence Audit

审计日期：2026-07-25  
范围：`docs/research/all-models-production-registry.json` 中的 14 个 `prototype:facility:*` 原型  
审计方式：只读检查仓库内参考图片、manifest、研究文档、OSM 派生数据与当前 Three.js 源码。第二轮纳入
`docs/research/facility-prototypes-reference-manifest.json` 已本地化的新证据；所有新增来源、发布日期、URL、图片路径与绑定边界均以该 manifest 为唯一索引，本审计不重复维护外部 URL。

## 1. 判定口径

### 1.1 证据类型

- **现实影像证据**：仓库内可追溯的现场照片，且能明确识别本原型；园区照片中仅有相似街具或模糊远景，不自动绑定到具体原型。
- **地图证据**：OSM way 或运行时地图数据可证明边界、位置、长轴或朝向，不自动证明材质、构造和当前状态。
- **文字证据**：公开资料的仓库内摘录可证明设施类型或改造主题，不自动证明几何形态。
- **源码 observed cue**：当前代码中实际存在的几何、材质、位置和交互，只证明“产品现在这样实现”，不等于现实场地如此。
- `docs/research/model-placement-registry-20260725.json` 对这些实例统一标注的
  `runtime-authored-placement-needs-photo-validation`，应理解为**待照片校验的运行时创作落点**，不能作为现实 identity 的通过证据。

### 1.2 Identity 与 Hero 证据门槛

**Identity 门槛**

1. 至少一张能唯一识别设施的本地 canonical 照片；
2. 至少一张侧向、纵深或构造补充视图；若确实只有单面可见，必须将不可见面列为 unknown，且不得补造身份构件；
3. 设施与照片、地图落点之间具有可解释的绑定关系；
4. 至少三处主体独有识别构件来自直接可见事实，而不是当前源码反推；
5. 比例、朝向、碰撞和运行时屏幕占比有可验证依据。

**Hero 门槛**

1. Identity 门槛全部通过；
2. canonical、侧向/纵深、入口或构造细节三类视角均被覆盖；
3. 主要材料、连接、厚度、正反面和近景可见细节有证据；
4. 完成独立模型 Brief、视角矩阵、Decision log、GLB build record、Blender/GLB/Three.js 三层验收。

对铺地、水池等场地构件，Hero 应理解为“进入所属场地 Hero 场景的高质量集成资产”，不应为了满足层级而虚构一个脱离场地的独立地标。

## 2. 总览

| 原型 | 现实影像 / manifest | 地图或文字证据 | 当前源码 cues | Identity | Hero |
|---|---|---|---|---|---|
| `prototype:facility:shangsheng-wayfinding-totem` | 无专属照片、无专属 manifest | 无可绑定具体图腾的记录 | 有 | 阻断 | 阻断 |
| `prototype:facility:shangsheng-cafe-pavilion` | 无专属照片、无专属 manifest | 园区级资料不足以绑定六边形亭 | 有 | 阻断 | 阻断 |
| `prototype:facility:shangsheng-bicycle-parking` | 无专属照片、无专属 manifest | 无可绑定具体车架的记录 | 有 | 阻断 | 阻断 |
| `prototype:facility:shangsheng-reading-terrace` | 无专属照片、无专属 manifest | 无可绑定阅读环的记录 | 有 | 阻断 | 阻断 |
| `prototype:facility:shangsheng-fountain` | 2022 政府现场照片，设施家族级；已入 facility manifest | 两个 OSM fountain 边界 | 有，但现有高池沿表达不符照片 | 条件阻断 | 阻断 |
| `prototype:facility:shangsheng-main-entry` | 一张正面/夜景入口照片；无设施级 manifest | 园区地址与边界可辅助绑定 | 有 | 条件阻断 | 阻断 |
| `prototype:facility:huashan-pond-boardwalk` | 无对应照片、无 manifest | 有水体整治与栈桥文字记录；无精确轮廓 | 有 | 阻断 | 阻断 |
| `prototype:facility:huashan-basketball-court` | 2025 政府入口三分之四现场照片；已入 facility manifest | OSM way `743778425` | 有，但颜色、篮架、围网入口需重做 | 条件阻断 | 阻断 |
| `prototype:facility:huashan-bird-pergola` | 无对应照片、无 manifest | 仅“鸟笼架/观鸟架”文字记录 | 有 | 阻断 | 阻断 |
| `prototype:facility:huashan-happiness-corner` | 2026 政府四视图；已入 facility manifest | 主体与转角位置已确认，运行时 overlay 待做 | 有，但旧三门架/花团与实景不符 | 证据通过，必须重做 | 证据入口通过，交付未完成 |
| `prototype:facility:xingfuli-reflecting-pool-hardscape` | 多视角照片 + 完整 manifest/Brief | OSM 场地长轴与研究记录 | 有 | 通过 | 条件通过 |
| `prototype:facility:xingfuli-mixed-paving` | 场景与铺地细节照片 + 完整 manifest/Brief | 有照片尺度推断记录 | 有 | 通过 | 集成式条件通过 |
| `prototype:facility:xingfuli-vertical-garden` | 2023 政府主巷绿墙直接照片 + 入口语境照；已入 facility manifest | 有“垂直绿化停车墙”文字记录 | 有，但规则单块墙与实景连续、不规则绿墙不一致 | 条件阻断 | 阻断 |
| `prototype:facility:one-square-metre-action` | 2025 活动图仅证明工作坊、手作和园艺项目；已入 facility manifest | 项目自 2021 年起成立 | 有、且为产品原创 | 活动 Identity 已确认；固定装置复原不适用 | 固定装置 Hero 不适用；原创 Hero 需设计 Brief |

“条件阻断”表示已有部分可信证据，可以保留 massing 或已观察到的局部，但尚未满足最新完整 Blender Identity 门槛。

## 3. 逐原型审计

### 3.1 `prototype:facility:shangsheng-wayfinding-totem`

**本地证据**

- 当前实现：`app/scene/shangsheng-xinsuo-block.tsx` 的 `WayfindingTotem`。
- 当前落点：`app/scene/shangsheng-facilities.ts`；两个实例同时登记在
  `docs/research/model-placement-registry-20260725.json`。
- 园区级研究：`docs/research/shangsheng-xinsuo-reference.md`。
- 已检查的园区图片目录：`docs/research/assets/poi-references/shangsheng-xinsuo/`。
- 未发现能明确显示该图腾的专属照片、manifest 或设施级 Brief。

**Observed**

- 源码中是深色六棱锥台式立柱，高度约 3.5 个本地单位，附三块金色、米白、绿色交替三角箭头板。
- 代码给出两个运行时落点和 yaw。

**Inferred**

- “导视图腾”作为园区设施类型是合理的。
- 图腾的六棱形、三色箭头、尺寸和两个落点均属于当前产品设计推断，不能从园区级照片确认。

**Unknown**

- 现实中是否存在对应图腾、数量、准确位置、朝向、文字、图标、颜色、基座、正反面和夜间照明。

**门槛**

- Identity：阻断。需补专属 canonical、侧向/背面和导视面细节，并把每个实例与地图/照片落点绑定。
- Hero：阻断。Identity 通过后仍需补文字层级、材料连接、底座和夜间照明细节；受保护品牌文字不得直接复制。

### 3.2 `prototype:facility:shangsheng-cafe-pavilion`

**本地证据**

- 当前实现：`app/scene/shangsheng-xinsuo-block.tsx` 的 `CafePavilion`。
- 当前落点：`app/scene/shangsheng-facilities.ts` 与
  `docs/research/model-placement-registry-20260725.json`。
- 园区级照片可能包含外摆和公共空间，但未发现可唯一绑定当前六边形亭的照片。

**Observed**

- 源码中是六边形深色平顶、六根细柱、中央八边形柜台和两组外摆桌椅。

**Inferred**

- 咖啡、外摆与园区商业空间相容。
- 六边形屋顶、柜台形态、柱数、桌椅数量与落点是运行时创作，尚无现实证据。

**Unknown**

- 真实设施是否为固定亭、临时摊位或普通外摆；屋顶结构、尺度、品牌、开口方向、设备、碰撞边界和营业期变化。

**门槛**

- Identity：阻断。需同一亭体的 canonical、纵深、柜台/屋面连接细节，以及落点绑定。
- Hero：阻断。需进一步覆盖设备、材质厚度、背面、收边与近景构造。

### 3.3 `prototype:facility:shangsheng-bicycle-parking`

**本地证据**

- 当前实现：`app/scene/shangsheng-xinsuo-block.tsx` 的 `BicycleParking`。
- 当前落点：`app/scene/shangsheng-facilities.ts` 与
  `docs/research/model-placement-registry-20260725.json`。
- 未发现该停车点的专属图片、manifest 或设施级研究记录。

**Observed**

- 源码中有七个倒 U 形车架，并在交替车位放置简化自行车。

**Inferred**

- 自行车停车作为园区服务设施合理。
- 车架数量、间距、颜色、朝向、是否带棚以及自行车分布均由源码设定。

**Unknown**

- 现实车架类型、材质、锚固、数量、净距、场地铺面、实际落点与无障碍净宽。

**门槛**

- Identity：阻断。需停车点整体 canonical、侧向阵列关系和车架锚固/截面细节。
- Hero：阻断。需材料、连接、遮棚/标识、近景磨损与周边边界证据。

### 3.4 `prototype:facility:shangsheng-reading-terrace`

**本地证据**

- 当前实现：`app/scene/shangsheng-xinsuo-block.tsx` 的 `ReadingTerrace`。
- 当前落点：`app/scene/shangsheng-facilities.ts` 与
  `docs/research/model-placement-registry-20260725.json`。
- 未发现当前八边形阅读环的专属图片、manifest 或文字记录。

**Observed**

- 源码中是八边形环状铺地、八张向心长椅、中央八边形台座和倾斜书页状板。

**Inferred**

- 户外阅读作为公共活动主题合理。
- 八边形布局、座椅数量、中央书形构件、尺度和落点均为产品创作。

**Unknown**

- 现实中是否存在该设施；真实布局、书架/桌面功能、材料、导视、遮阳和使用净距。

**门槛**

- Identity：阻断。需整体 canonical、侧向/人眼高度视图和中央身份构件细节。
- Hero：阻断。需补座椅连接、铺地边界、文字/图案政策、背面和近景材料。

### 3.5 `prototype:facility:shangsheng-fountain`

**本地证据**

- 新增来源与绑定边界统一见
  `docs/research/facility-prototypes-reference-manifest.json` 的
  `source:shcn:shangsheng-reopening-2022`。
- 2022 现场照片：
  `docs/research/assets/poi-references/shangsheng-xinsuo/shangsheng-navy-club-fountain-plaza-2022.jpeg`。
- 原园区照片：`docs/research/assets/poi-references/shangsheng-xinsuo/navy-club-canonical.jpg`。
- 园区研究：`docs/research/shangsheng-xinsuo-reference.md` 记录“两处公开 OSM fountain”。
- 当前实现：`app/scene/shangsheng-xinsuo-block.tsx` 的 `CampusLandscape`，从地图 fountain boundary 生成矩形水面/基座，并在 detailed 模式加入单根喷柱。
- 两个实例及 OSM 来源登记在
  `docs/research/model-placement-registry-20260725.json`，对应 way `1364679202`、`1364679203`。
- facility manifest 将该照片标记为 `site-level-only-not-bound-to-osm-fountain-ways`；仍未完成照片与两个 way 的逐一 overlay。

**Observed**

- 2022 政府现场照片直接证明海军俱乐部前存在旱喷广场：喷头与铺装齐平，多股喷泉呈阵列，画面中未见独立高池沿。
- OSM 数据证明两个 fountain 边界及其地图位置。
- 源码按各自 boundary bounds 生成当前几何。

**Inferred**

- 照片中的喷泉与两个 OSM way 可能属于同一设施家族，但在没有照片—地图叠合前不能逐一确认。
- 当前源码的矩形水色高基座和每处单根喷柱不仅是简化，而且与新增照片中“齐平铺装 + 多喷头阵列”的直接观察不一致，升级时必须重做，不能沿用为 Identity。

**Unknown**

- 两个 way 分别对应照片中的哪一片喷泉；完整喷头数量与边界、喷射节奏、铺装构造、夜间灯光和当前状态。

**门槛**

- Identity：条件阻断。设施家族的身份特征已由 2022 照片升级为直接证据，OSM 可支持 massing/落点；但仍需用照片视线与地图 overlay 绑定两个 way，并补完整边界/侧向视图。现有高池沿源码不得直接晋级。
- Hero：阻断。需喷头阵列、池沿/排水、铺地接口、灯光和近景材料证据。

### 3.6 `prototype:facility:shangsheng-main-entry`

**本地证据**

- 入口照片：`docs/research/assets/poi-references/shangsheng-xinsuo/yanan-road-entrance.jpg`。
- 园区研究：`docs/research/shangsheng-xinsuo-reference.md`。
- 当前实现：`app/scene/shangsheng-xinsuo-block.tsx` 中名为 `shangsheng-main-entry` 的入口组。
- 当前落点：`docs/research/model-placement-registry-20260725.json`。
- 未发现专属入口 manifest；当前仅一张主要正面/夜间视角，缺少侧向与构造近景。

**Observed**

- 照片支持深色跨越式入口框架、入口轴线、成树环境和入口识别属性。
- 源码实现了宽约 8.4 的深色顶框、两侧柱、三根内部构件、四盏暖色灯和页面 HTML 名称。

**Inferred**

- 源码的具体跨度、进深、斜撑角度、灯具数量与位置只得到照片的粗略支持。
- HTML “上生·新所”标签是产品 UI，不是现实入口文字面的几何复刻。

**Unknown**

- 入口侧面/背面、精确深度、节点连接、真实标识文字、门禁与路缘关系、当前改造状态。

**门槛**

- Identity：条件阻断。可保留照片可见的正面 silhouette 作为灰模，但完整 Identity 仍需侧向/纵深和入口构造细节；不可见面保持 unknown。
- Hero：阻断。需专属 manifest、三视角覆盖、节点/灯具/标识/路缘细节和实际落点校验。

### 3.7 `prototype:facility:huashan-pond-boardwalk`

**本地证据**

- 研究文档：`docs/research/huashan-green-reference.md`，记录 2019 年水体清淤、木栈道修复和“栈桥生趣”。
- 当前实现：`app/scene/huashan-green-block.tsx` 的 `PondGarden`。
- 当前落点：`docs/research/model-placement-registry-20260725.json`。
- 已有 `docs/research/assets/poi-references/huashan-greenland/` 三张照片只显示跑道、林地与园路，未显示可确认的水体/栈桥。
- 研究文档明确声明：未在公开地图中出现精确轮廓的水体、栈桥和微更新花园只作风格化复原，不冒充测绘数据。

**Observed**

- 仓库内文字证据支持“有水体整治与木栈桥”这一设施类型。
- 源码中是椭圆浅水面、环岸、24 块木板、栏杆、芦苇/水生植物。

**Inferred**

- 椭圆尺度、栈桥横穿位置、木板数量、栏杆形态和植物分布均为风格化推断。

**Unknown**

- 真实水体轮廓、岸线、栈桥走向/宽度/栏杆、标高、材质、落点与当前状态。

**门槛**

- Identity：阻断。需水体+栈桥整体 canonical、岸线纵深和桥面/栏杆细节，并获得可解释的位置绑定。
- Hero：阻断。需进一步覆盖桥底/接岸、材料连接、水边安全构造和植被边界。

### 3.8 `prototype:facility:huashan-basketball-court`

**本地证据**

- 新增来源、地址、开放信息与绑定边界统一见
  `docs/research/facility-prototypes-reference-manifest.json` 的
  `source:shcn:huashan-sports-list-2025`。
- 直接现场照片：
  `docs/research/assets/poi-references/huashan-greenland/huashan-basketball-court-entry-2025.jpg`，
  manifest 标记为 `subject-confirmed-map-overlay-pending`。
- 地图证据：`docs/research/huashan-green-reference.md` 记录 OSM way `743778425`。
- 当前地图参数与实现：`app/scene/huashan-green-block.tsx` 的 `BasketballCourt`。
- 当前 placement registry 记录位置、yaw 与 OSM way。

**Observed**

- OSM way 可支持球场 footprint、地图位置和长轴朝向。
- 2025 入口三分之四照片可直接识别华山绿地篮球场，显示蓝色主场面、红橙色边带、绿色刚性网框、绿色悬臂篮架、白色篮板和一座红色全高闸机。
- 源码当前为红色主场地、绿色外边、中心线、两组直柱式篮架及仅有立柱的简化围网。

**Inferred**

- OSM way 与照片主体很可能对应同一球场，但照片视线与 way `743778425` 的精确方位仍需 overlay。
- 照片未覆盖处的划线、第二篮架与围网边界不能由当前源码补推。
- 当前主场颜色、篮架类型和围网入口与照片不一致，Identity 重做时必须以新增照片为准。

**Unknown**

- 完整场地边界、第二组篮架、准确线型、照片视线相对 OSM 的方位、围网其他入口、照明、排水及周边高差。

**门槛**

- Identity：条件阻断。单张直接照片已提供超过三处主体识别 cues，OSM 继续支持 massing；但最新管线仍要求侧向/完整边界与照片—OSM 方位绑定。可以先按照片重做可见入口侧，不得把未见的第二半场当作 observed。
- Hero：阻断。需补完整场地、第二篮架、围网侧/背面、照明、铺面与边界连接及近景材料。

### 3.9 `prototype:facility:huashan-bird-pergola`

**本地证据**

- 研究文档：`docs/research/huashan-green-reference.md` 仅记录“鸟笼架/观鸟架作为小型地标”。
- 当前实现：`app/scene/huashan-green-block.tsx` 的 `huashan-bird-pergola`。
- 当前落点：`docs/research/model-placement-registry-20260725.json`。
- 未发现专属照片、manifest 或精确地图轮廓；已有华山绿地照片中的模糊远处小构筑物不足以确认就是此设施。

**Observed**

- 文字证据支持“鸟笼架/观鸟架”作为设施类型。
- 源码中为九根绿色弧杆组成的半穹顶及低平台。

**Inferred**

- 半穹顶、九根杆、绿色、尺度、平台和落点均是风格化解释。

**Unknown**

- 真实构筑物类型、轮廓、开口方向、材质、是否可进入、标识、基座和周边关系。

**门槛**

- Identity：阻断。需可唯一识别设施的 canonical、侧向/背面及连接/基座细节。
- Hero：阻断。需补结构节点、表面材料、内部空间、标识与近景尺度。

### 3.10 `prototype:facility:huashan-happiness-corner`

**本地证据**

- 新增来源、位置描述与四视图绑定统一见
  `docs/research/facility-prototypes-reference-manifest.json` 的
  `source:shcn:huashan-happiness-corner-2026`。
- 四张直接现场照片：
  - `docs/research/assets/poi-references/huashan-greenland/huashan-happiness-corner-canonical-2026.jpg`
  - `docs/research/assets/poi-references/huashan-greenland/huashan-happiness-corner-heart-frame-2026.jpg`
  - `docs/research/assets/poi-references/huashan-greenland/huashan-happiness-corner-step-detail-2026.jpg`
  - `docs/research/assets/poi-references/huashan-greenland/huashan-happiness-corner-planting-terrace-side-2026.jpg`
- 新证据将主体定位在幸福路与华山路 1520 弄转角东北方、华山绿地范围内；运行时 placement overlay 仍待完成。
- 原研究文档：`docs/research/huashan-green-reference.md` 的“浅色花架、花境和仪式性小庭院”是新照片到来前的文字级概括，不能再主导几何。
- 当前实现：`app/scene/huashan-green-block.tsx` 的 `huashan-happiness-corner`。
- 当前落点：`docs/research/model-placement-registry-20260725.json`。

**Observed**

- canonical 直接显示大型粉色环形心形装置、粉色层级坐阶、浅色曲线花池和成熟林木。
- interior view 显示多道同心粉色扁钢/杆件构成具有明确心形截面的环架，中心开口朝向坐阶。
- detail view 显示粉色水洗石/颗粒质感坐阶、浅色花池挡墙及踏步立面多语言文字。
- side/depth view 显示坐阶穿过曲线花池，并随林下地形逐级抬升。
- 当前源码实际上只有三组浅色矩形门架与十八个离散花团。

**Inferred**

- 心形环架的精确杆件数量、截面与工程连接，坐阶/花池施工尺寸，以及照片视线相对运行时坐标仍需量化。
- 多语言踏步文字属于可见身份细节，但复制前需单独确认文字内容与使用政策；无法确认的文字只做抽象节奏。

**Unknown**

- 精确场地边界、心形装置背面锚固、杆件数量/截面、坐阶完整平面、无障碍路径、植物种类和运行时落点/朝向。

**门槛**

- Identity：**证据门槛通过，但现有模型必须重做。** 四视图已经覆盖 canonical、内部结构、身份细节和侧向纵深，至少三处独有识别构件有直接证据。旧“三门架 + 花团”与 2026 实景在主轮廓、色彩、场地层级和身份构件上均不符，不能局部修补或作为 Identity fallback；应重建“粉色同心心形环架 + 层级坐阶 + 曲线花池”的新资产。进入地图集成前仍需完成运行时 placement overlay。
- Hero：**证据建模入口通过，Hero 交付尚未完成。** 现有四视图足以启动完整 Blender 模型；仍需设施级 Brief、尺寸推导、背面/锚固 unknown 处理、文字政策、build record 及 Blender/GLB/Three.js 三层验收后，才能标记 Hero 完成。

### 3.11 `prototype:facility:xingfuli-reflecting-pool-hardscape`

**本地证据**

- 完整 manifest：`docs/research/xingfuli-reference-manifest.json`。
- 模型 Brief 与证据分类：`docs/research/xingfuli-model-brief.md`。
- 场地研究：`docs/research/xingfuli-reference.md`。
- 主要图片：
  - `docs/research/assets/poi-references/xingfuli/courtyard-canonical.jpg`
  - `docs/research/assets/poi-references/xingfuli/central-lane.jpg`
  - `docs/research/assets/poi-references/xingfuli/water-lane.jpg`
  - `docs/research/assets/poi-references/xingfuli/xingfuli-smartshanghai-01-2021.jpeg`
- 当前实现：`app/scene/xingfuli-block.tsx` 的
  `ReflectingPoolHardscapeFallback` 与 `ReflectingPoolDynamicDetails`。

**Observed**

- 多张照片稳定显示长条倒影池、深色池沿、蓝绿色水面、池中树、低喷泉/石景和横跨木桥。
- manifest 已覆盖 canonical、侧向/纵深、入口 identity 与场地材料细节。
- Brief 已记录直接可见事实、推断、unknown、运行时变换和三联对照。

**Inferred**

- 当前本地池体 `width: 18`、`depth: 2.15`，而研究文档照片估算宽约 2.9；二者不是施工测量值，且幸福里存在非均匀运行时变换。
- 七块桥板、四组石景/喷泉的精确坐标和截面仍为合理化简。

**Unknown**

- 施工图级池深、溢流/排水、喷头机械、石材规格、桥底连接、2026 当前维护状态。

**门槛**

- Identity：通过。已有明确的设施组照、manifest、识别构件和场地绑定。
- Hero：条件通过。证据覆盖已足以进入所属幸福里 Hero 场景；若拆成独立 GLB，仍需为该设施补独立 build record、结构审计与同提交 Three.js 验收，且不能把估算尺寸写成实测。

### 3.12 `prototype:facility:xingfuli-mixed-paving`

**本地证据**

- 完整 manifest：`docs/research/xingfuli-reference-manifest.json`。
- 最清晰材料参考：
  `docs/research/assets/poi-references/xingfuli/xingfuli-smartshanghai-03-2021.jpeg`。
- 其他主巷照片也显示铺地连续关系：
  `courtyard-canonical.jpg`、`central-lane.jpg`、`water-lane.jpg`。
- 模型 Brief：`docs/research/xingfuli-model-brief.md`。
- 当前实现：`app/scene/mixed-stone-paving.tsx`。

**Observed**

- 照片支持多尺寸矩形灰色石材、长边沿巷道长轴、错缝铺排和有限灰阶变化。
- 源码实现四种长度、三种灰色、十九排、十二个 InstancedMesh 批次，并直接在 `evidenceRef` 指向铺地细节照片。

**Inferred**

- `0.82/1.12/1.48/1.92` 四种长度、`0.72` 深度、缝宽、十九排与 seed `67` 是产品化参数，不是施工图规格。
- 灰色颜色值为 toon 风格近似，不是色卡测量。

**Unknown**

- 真实石材品种、完整尺寸模数、厚度、表面处理、拼缝材料、排水坡度、修补区域与 2026 状态。

**门槛**

- Identity：通过。材料模式、方向和场地关系有清晰直接证据。
- Hero：集成式条件通过。应作为幸福里 Hero 场景的高质量地面系统验证；若单独制作三层模型，Hero 交付应聚焦近景材质、缝隙和性能，不虚构独立地标轮廓，并补独立 build record/运行时基线。

### 3.13 `prototype:facility:xingfuli-vertical-garden`

**本地证据**

- 新增来源与绑定边界统一见
  `docs/research/facility-prototypes-reference-manifest.json` 的
  `source:shcn:xingfuli-update-2023`。
- 新增政府现场照片：
  - `docs/research/assets/poi-references/xingfuli/xingfuli-government-main-lane-vertical-garden-2023.jpg`
  - `docs/research/assets/poi-references/xingfuli/xingfuli-government-entry-planting-2023.jpg`
- 完整园区 manifest：`docs/research/xingfuli-reference-manifest.json`。
- 相关图片：
  - `docs/research/assets/poi-references/xingfuli/xingfuli-panyu-entrance-shanghai-changning-2018.jpeg`
  - `docs/research/assets/poi-references/xingfuli/xingfuli-smartshanghai-01-2021.jpeg`
  - `docs/research/assets/poi-references/xingfuli/xingfuli-smartshanghai-04-2021.jpeg`
- 文字证据：`docs/research/xingfuli-reference.md` 记录“垂直绿化停车墙”与番禺路入口的整面垂直绿化。
- 当前实现：`app/scene/xingfuli-block.tsx` 的 `VerticalGarden`。

**Observed**

- 2023 政府主巷照片直接确认连续高绿墙位于主巷左侧，绿墙下部为深色实体墙面，植物覆盖边界明显不规则。
- 2023 入口语境照片直接显示深色雨棚下悬挂绿植、入口花池和矮石桩，但 facility manifest 明确将其标为 `site-context-not-vertical-wall-proof`，不能单独证明垂直墙体。
- 既有园区入口与立面照片继续支持“入口附近存在垂直/悬挂绿化”及绿化与深色墙体组合。
- 文字资料支持“垂直绿化停车墙”这一设施身份。
- 当前源码是约 `1.15 × 7.5 × 8.2` 的深色墙体，两面布置三种绿色的程序化多面体植被单元，并带局部深色框件。

**Inferred**

- 新增照片显著提升了主体绑定与正面 identity，但视线沿主巷纵深，仍不能提供墙体精确长度、高度、厚度和侧面。
- 72 个规则多面体单元、单块墙尺寸、双面布置与局部框件仍属于当前产品推断；实景反而显示更连续、自然且边界不规则的植物覆盖。
- `xingfuli-smartshanghai-04-2021.jpeg` 主要可见店面/墙绘与悬挂绿化，不能替代新增绿墙 canonical。

**Unknown**

- 墙体精确高度、长度、厚度、侧面/背面、停车功能接口、植物模块、灌溉、当前运行时单块墙是否覆盖完整真实主体，以及 2026 当前状态。

**门槛**

- Identity：条件阻断。新增政府照片已经把证据从“入口绿化语境”升级到“主体确认 + canonical lane depth”，可以据此重做连续、不规则绿墙的保守正面 Identity；但完整 Identity 仍缺侧向/厚度、完整端点和运行时 placement overlay。当前规则单块墙不能直接视为已通过。
- Hero：阻断。需补侧面/背面、停车关系、精确端点、模块连接、植物层次、灌溉/收边和近景材料。

### 3.14 `prototype:facility:one-square-metre-action`

**本地证据**

- 新增项目来源与图片绑定统一见
  `docs/research/facility-prototypes-reference-manifest.json` 的
  `source:caa:one-square-metre-action-2025`。
- 三张活动语境图：
  - `docs/research/assets/poi-references/one-square-metre-action/one-square-metre-action-workshop-2025.jpg`
  - `docs/research/assets/poi-references/one-square-metre-action/one-square-metre-action-craft-session-2025.png`
  - `docs/research/assets/poi-references/one-square-metre-action/one-square-metre-action-garden-session-2025.png`
- facility manifest 将三图统一归为 `program-context`，绑定分别为
  `program-evidence-not-installation-shape`。
- 当前实现：`app/scene/xinhua-world.tsx` 的 `ActionInstallation`。
- 项目说明：`docs/research/messenger-reference.md`。
- 当前落点：`docs/research/model-placement-registry-20260725.json`。
- `messenger-reference.md` 明确：微信长图只用于理解“新华路街区 / 一平米行动”项目背景，不作为配色、版式、模型或交互参考；当前装置为代码生成的原创低多边形几何。
- 新增活动图仍没有提供“现实中已有对应固定装置”的视觉证据或设施模型 Brief。

**Observed**

- 中国美术学院来源及活动图直接确认“一平米行动”自 2021 年起是新华路街道社区微更新项目，包含居民讨论、共同提案、手作与一平方米尺度的社区园艺实践。
- 产品源码中存在黄色方形底台、浅色圆环、四个红色花盆、白红标牌、悬浮方块和“一平米行动”交互按钮。
- 这是当前产品可触发的唯一行动点之一，源码与文档均把它定义为原创交互装置。

**Inferred**

- 活动图证明的是项目方法、参与者和活动形态，不证明任何固定装置的外形、颜色、尺度或地图落点。
- 它可以作为 Wander Xinhua 的原创品牌化交互资产，但不能以新增活动图声称当前游戏装置是现实设施复原。
- 当前几何、颜色、符号与落点属于产品设计决策，不是现场观察。

**Unknown**

- 是否存在与游戏模型对应的固定现实装置；若存在，其地点、尺寸、结构、材料、文字、合法使用范围和当前状态均未知。

**门槛**

- Identity：活动项目的 identity 已由直接来源确认；固定装置的现实复原仍不适用且不得通过。作为“原创产品资产”可另立设计 Brief，以明确的原创设计合同、canonical 设计图和运行时需求替代照片证据，三张活动图只能用于叙事语境。
- Hero：固定现实装置 Hero 不适用；原创 Hero 需补独立设计 Brief、三视图、符号/文字使用政策、Blender/GLB build record 与 Three.js 交互验收，不能把活动图当造型参考。

## 4. 缺口与后续采集优先级

### P0：证据已推翻旧实现，必须优先重做

1. 华山绿地幸福转角

2026 四视图已经证明真实主体是“粉色同心心形环架 + 粉色层级坐阶 + 浅色曲线花池 + 林下抬升地形”。当前三组浅色矩形门架与十八个离散花团在主轮廓、色彩、构造和场地层级上全部不符，不能继续作为 Identity、Hero 或加载失败 fallback。应先重做模型，再完成运行时 placement overlay。

### P0：仍缺专属照片，不能升 Identity

1. 上生·新所导视图腾
2. 上生·新所咖啡亭
3. 上生·新所自行车停车
4. 上生·新所阅读露台
5. 华山绿地水体与栈桥
6. 华山绿地观鸟/鸟笼架

这些原型最容易被“源码已经很完整”误判为“证据已经完整”。在新照片进入 manifest 之前，只能作为明确标注的 runtime-authored 占位或 massing，不应进入现实复原 Identity/Hero。

### P1：已有地图或局部照片，可优先补齐绑定

1. 上生·新所喷泉：2022 照片已确认齐平铺装的多喷头阵列；先做新照片与两个 OSM fountain way 的视线/位置 overlay，并废弃高池沿式 Identity。
2. 上生·新所主入口：补侧向、背面/纵深、框架与灯具近景。
3. 华山绿地篮球场：入口三分之四照片已确认蓝色场面、红橙边带、绿色围网/悬臂篮架和全高闸机；保留 OSM footprint，补侧向、完整边界、第二篮架及照片—OSM 方位 overlay。
4. 幸福里垂直绿化：2023 主巷照片已确认连续、不规则绿墙；补墙体端点、侧向厚度、停车侧/背面和模块细节。

### P2：证据已足够，转入独立资产闭环

1. 幸福里倒影池硬景
2. 幸福里混合铺地

两者无需重复搜集普通园区远景；下一步价值在于独立 build record、GLB/材质结构审计、同条件运行时性能与场地 Hero 集成验收。幸福转角虽同样达到证据建模入口，但由于旧实现与实景冲突，已单列为最高优先级重做项。

### 独立产品设计轨

`prototype:facility:one-square-metre-action` 的活动项目本身已有
`docs/research/facility-prototypes-reference-manifest.json` 所登记的直接来源和三张活动图，但这些只证明工作坊、手作与园艺行动，不证明当前固定游戏装置。它不进入“拿活动图复原装置”的队列，仍应由产品层明确装置是：

- 原创交互装置；或
- 现实装置复原。

前者走原创设计 Brief 和设计版权/文字政策；后者必须重新建立现实证据包。在状态未明确前，不把现有代码外形作为现实 observed fact。

## 5. 审计结论

- 14 个 facility prototypes 均有当前源码或运行时登记。幸福里倒影池、混合铺地和华山幸福转角已达到现实 Identity 的证据门槛；其中幸福转角四视图也足以启动 Hero 建模，但旧三门架/花团与 2026 实景明确不符，必须整体重做，不能声明现有实现通过。
- 上生·新所喷泉、主入口、华山篮球场和幸福里垂直绿化具有可信的地图或直接照片证据，但仍缺少侧向/完整边界或照片—地图绑定，按最新完整管线保持条件阻断。篮球场不再是“无身份照片”，但一张入口照片仍不足以覆盖第二篮架和完整边界。
- 仍没有专属照片的六个现实设施原型是：上生导视图腾、咖啡亭、自行车停车、阅读露台、华山水体栈桥和观鸟/鸟笼架；它们主要是“文字类型 + 运行时原创几何”或纯运行时原创，不能用源码反向证明现实 identity。
- 幸福里 2023 政府照片把垂直花园从场景语境升级为主体确认，但精确尺寸、侧面、端点和停车侧关系仍未知；当前规则化单块墙不是照片可直接支持的现实形态。
- “一平米行动”的项目 identity 已由活动图和直接来源确认，但活动图不证明当前游戏固定装置。现有装置仍属于产品原创几何，不能被写成现实设施复原。
