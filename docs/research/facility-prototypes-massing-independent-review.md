# 设施原型 Massing 独立视觉审查

## 最终复审（2026-07-25）

### 复审范围与判定边界

本轮复审检查了最新四张批次 contact sheet：

- `test_facility-prototypes-massing-canonical-contact-sheet.png`；
- `test_facility-prototypes-massing-side-contact-sheet.png`；
- `test_facility-prototypes-massing-threejs-contact-sheet.png`；
- `test_facility-prototypes-massing-map-contact-sheet.png`。

同时逐张检查了 15 张 isolated Three.js 截图、15 张 map QA 截图、两个
browser evidence JSON，以及上一轮 5 个视觉 blocker 对应的最新单图。

本轮严格区分四层事实：

1. HTTP 200 只证明目标 GLB 请求成功，不证明模型在正确地图位置；
2. isolated visual pass 只证明单资产轮廓、取景、颜色和 Blender → Three.js
   导出一致；
3. map screenshot 只证明当前 authored transform 在世界场景中的可见结果；
4. formal Massing pass 仍需独立的 position、scale、yaw、地面接触、collision、
   入口 / 通道绕行和相邻物体净距证据。

### 严格计数

| 检查项 | 最终结果 | 判定 |
| --- | ---: | --- |
| canonical contact sheet 覆盖 | 15 / 15 | 15 个主体均完整入镜。 |
| side contact sheet 覆盖 | 15 / 15 | 15 个主体均完整入镜；标签安全边距问题仍在。 |
| isolated Three.js 覆盖 | 15 / 15 | 全部目标 HTTP 200，0 failure、0 exception、0 log error。 |
| isolated shape / color visual pass | **15 / 15** | 五个旧视觉 blocker 已关闭，Blender 与 isolated Three.js 外观一致。 |
| map screenshot 覆盖 | 15 / 15 | 只代表 map QA 路径有截图，不代表 placement 通过。 |
| map 截图中未见明显静态相交 | **4 / 15** | 仅 bicycle parking、reading terrace、main entry、bird pergola；四项仍缺位置、比例、朝向和碰撞证据。 |
| map 截图中已有相交 / 越界迹象 | **11 / 15** | 建筑、树干、道路、路缘、既有设施或场地覆盖冲突。 |
| position 独立通过 | **0 / 15** | 没有逐实例地图 / 照片 overlay 或测绘闭环。 |
| scale 独立通过 | **0 / 15** | 没有统一人物 / 入口尺度量化与实测基线。 |
| yaw 独立通过 | **0 / 15** | 没有逐实例 canonical 观察方向和地图轴线闭环。 |
| collision / passage 独立通过 | **0 / 15** | 没有确定性移动、碰撞代理和绕行证据。 |
| formal Massing pass | **0 / 15** | 必须保持 0；HTTP 200、isolated pass 和 map 截图都不能替代硬门槛。 |

### 上轮 5 个视觉 blocker 闭环

| blocker | 状态 | 最新证据 |
| --- | --- | --- |
| `shangsheng-fountain-osm-1364679202` 把未知设施画成蓝色静水面 | **已关闭** | canonical、side、isolated 已改为中性灰薄面；manifest 材质名为 `neutral-massing-material`，不再声称水面。 |
| `shangsheng-fountain-osm-1364679203` 同类证据越界 | **已关闭** | 与上一项相同；仍保持“site family photo 未绑定该 OSM way”的文字边界。 |
| `huashan-bird-pergola` 最外杆件悬空 | **已关闭** | 最新 canonical / side 显示底座覆盖全部九根杆根，低端落在底座上，不再有可见悬空。 |
| `xingfuli-vertical-garden` canonical / side 裁切 | **已关闭** | 两个固定机位都保留完整顶边、底边和左右安全边距。 |
| `one-square-metre-action` canonical / side 裁切 | **已关闭** | 平台、外环、四角花盆和悬浮标志均完整入镜。 |

五个 blocker 已全部关闭，因此 isolated shape / color visual pass 从初审
`10 / 15` 更新为 `15 / 15`。这只关闭隔离视觉层，不改变正式 Massing 计数。

### 逐资产 map QA 复审

| 输出 | isolated visual | map screenshot 中的位置 / 比例 / 朝向 | 遮挡 / 相交问题 | formal |
| --- | --- | --- | --- | --- |
| `shangsheng-wayfinding-totem` | 通过 | 位于上生·新所黑色入口标识附近；主体明显高于现有标牌，比例可疑；两实例 yaw 没有照片或人流轴线证明。 | 楔形箭头与黑色入口构件 / 标牌区域重叠，黄色包络也覆盖既有入口构件。 | 不通过 |
| `shangsheng-cafe-pavilion` | 通过 | 当前落点在大型建筑体之间，亭体宽高与周围楼层 / 柱网关系没有量化；yaw 无证据。 | 顶盖和包络明显进入相邻建筑墙面 / 柱体，主体被建筑大面积遮挡。 | 不通过 |
| `shangsheng-bicycle-parking` | 通过 | 位于建筑前开放铺地，长轴呈斜向；照片缺失，位置和 yaw 不能确认。车架相对门窗看起来偏高，需人物 / 自行车尺度复核。 | 截图未见明确静态相交，但不能据此证明车位净距或碰撞。 | 不通过 |
| `shangsheng-reading-terrace` | 通过 | 位于两栋建筑之间的开敞区；无专属照片，直径、中心点和场地功能都未绑定。径向主体没有明确 yaw 身份，但坐凳入口方向仍需确认。 | 截图未见明确静态相交；周边建筑、树木与人流净距未测。 | 不通过 |
| `shangsheng-fountain-osm-1364679202` | 通过 | 平面 footprint 来自 OSM，但截图没有将 OSM way、建筑和现场照片叠合；高度 / 地面接触仅是 authored 值。 | 一根粗树干直接穿过中性薄面；场地右侧靠近建筑墙体。 | 不通过 |
| `shangsheng-fountain-osm-1364679203` | 通过 | 平面 footprint 有 OSM 来源，但设施类型、竖向构造和 2026 状态仍未知。 | 薄面伸入前景建筑墙 / 柱，并与相邻既有绿色场地面紧贴或重叠。 | 不通过 |
| `shangsheng-main-entry` | 通过 | 位于道路旁开敞区，横向门架大致平行道路；没有与延安西路入口照片、园区轴线或真实门洞位置 overlay。比例只有当前角色对照，未量化。 | 截图未见明确静态世界物体穿插；角色位于门洞内只能证明可见，不能证明碰撞可通行。 | 不通过 |
| `huashan-pond-boardwalk` | 通过 | 当前放在林地路径之间的草地区，池形、桥位和 yaw 没有专属照片或地图 footprint。 | 多根树干 / 竖向场地构件穿过水面和栈桥区域，树冠也大面积遮挡主体。 | 不通过 |
| `huashan-basketball-court` | 通过 | 位于跑道 / 园路围合区，完整 court boundary 与入口照片没有 overlay；长轴 yaw 和标准场地尺度未验证。 | 米色园路进入场地一侧，中央既有白色场地物体落在 court 内，围网与现有场地发生冲突。 | 不通过 |
| `huashan-bird-pergola` | 通过 | 位于绿地边缘，结构在 map 中完整可见；真实位置、跨度、高度和开放方向仍无专属证据。 | 截图未见明确静态相交；前景树干只遮挡相机视线，不能替代净距和可穿越验证。 | 不通过 |
| `huashan-happiness-corner` | 通过 | 位于道路和绿地边界，但尚未与幸福路 / 华山路转角及官方照片做 pivot / yaw overlay。 | 巨大树体遮住并侵入心形环 / 花池区域；阶梯和花池贴近或伸入道路边界。 | 不通过 |
| `xingfuli-reflecting-pool-hardscape` | 通过 | 长轴大致沿建筑立面和巷道，类型关系看似合理；精确池宽、桥位、世界缩放和 yaw 未量化。 | 多根现有竖杆 / 灯杆穿过池壳和桥板，桥面通道没有净空证据。 | 不通过 |
| `xingfuli-mixed-paving` | 通过 | 94 × 14 authored 薄面在远景中覆盖整排建筑背后 / 下方；world transform、范围和长轴方向明显需要重做。 | 大面积进入建筑 footprint，截图机位过远，不能证明地面贴合、道路退界或摩尔纹。 | 不通过 |
| `xingfuli-vertical-garden` | 通过 | 当前沿建筑端墙竖放，方向接近立面，但没有主巷照片 overlay；高度显著超过相邻屋面，比例可疑。 | 墙体覆盖建筑端立面 / 窗区并高出屋顶，当前 overlap 不能视为已校准的附着关系。 | 不通过 |
| `one-square-metre-action` | 通过 | 角色对照下装置尺度大致可读，但落点位于店铺角部、铺地与暗色道路边界，position / yaw 没有产品所有者或地图证据。 | 平台、外环和花盆跨越铺地 / 路缘边界，局部与路缘相交；点击热区和 Float 动态包络未验。 | 不通过 |

### map 层闭环与未闭环

已闭环：

- 15 个 map QA 路径均能打开，并能识别对应 asset id；
- 15 个目标请求均为 HTTP 200，0 failure、0 exception、0 log error；
- map contact sheet 与 15 张原始 map 截图均已生成；
- QA 黄色包络让相交和覆盖问题可见。

未闭环：

- 11 个资产已有肉眼可见的建筑、树干、园路、道路、路缘或既有设施冲突；
- 另外 4 个资产虽未见明显静态相交，也没有位置、比例、朝向或碰撞通过证据；
- 没有逐实例照片 / OSM / 场地轴线 overlay；
- 没有统一的人物、门、篮架、台阶等尺度测量表；
- 没有可复现的 collision proxy、入口净宽、桥面 / 台阶通行和主体绕行测试；
- 没有地面高程、下沉 / 漂浮和相邻模型净距记录；
- 直接照片资产的三联图仍多为统一高位斜视，尚未复现真实 canonical 观察方向；
- side contact sheet 的若干 slug 仍在单元格左侧被截，map contact sheet 也缺少
  单元格外的清晰资产标题；
- manifest 仍写 `runtimeIntegration: intentionally-not-performed` 与资产级
  `runtimeGate: pending`，应在后续记录中拆成“isolated 已验证 / map 仅截图 /
  formal 未通过”。

### 最终复审判定

- isolated shape / color visual pass：**15 / 15**；
- map screenshot coverage：**15 / 15**；
- map screenshot 中无明显静态相交：**4 / 15**；
- independent position / scale / yaw / collision pass：**0 / 15**；
- formal Massing pass：**0 / 15**。

批次状态应表述为：

> 设施 Massing 的 15 个隔离资产已经完成 shape / color 视觉门，五个旧视觉
> blocker 已关闭；真实地图截图已覆盖 15 项，但 11 项已有可见场地冲突，
> 全部 15 项仍缺 position、scale、yaw 与 collision 独立闭环，因此正式
> Massing 通过保持 0 / 15。

---

## 初审历史记录（已由上方最终复审取代）

以下内容保留为第一轮审查证据；其中 `10 / 15` 是修正前的 isolated visual
结果，不能作为当前最终计数。

### 审查范围与边界

- 审查日期：2026-07-25。
- 审查对象：
  - `test_facility-prototypes-massing-canonical-contact-sheet.png`；
  - `test_facility-prototypes-massing-side-contact-sheet.png`；
  - `test_facility-prototypes-massing-threejs-contact-sheet.png`；
  - 15 张 `reference-blender-threejs-triptych`；
  - 15 张隔离 Three.js 截图及
    `test_facility-prototypes-massing-browser-evidence.json`。
- 本轮是只读视觉审查，没有修改生成器、`.blend`、`.glb`、运行时代码或
  manifest。
- “几何 / 运行时视觉通过”只表示：隔离场景中轮廓可读、Blender 与
  Three.js 外观基本一致、取景没有明显裁切，并且没有把已知证据边界伪装成
  实测事实。它不等于地图位置、比例、朝向、碰撞或通行已经通过。
- “正式 Massing 通过”必须额外完成真实地图 placement、yaw、scale、地面接触、
  人物尺度、碰撞和绕行验证。本批这些门尚未关闭，因此正式通过数必须保持
  `0 / 15`。

## 结论

| 检查项 | 结果 | 说明 |
| --- | ---: | --- |
| 输出与三联图存在 | 15 / 15 | 15 个 GLB 输出均有 canonical、side、Three.js 和三联图证据。 |
| 隔离 Three.js 加载 | 15 / 15 | 所有目标 GLB 返回 HTTP 200；`targetFailures`、运行时异常和错误日志均为 0。 |
| Blender → Three.js 造型和配色一致 | 15 / 15 | 未发现导出后丢节点、错轴、材质替换或明显颜色串档。 |
| 严格几何 / 运行时视觉通过 | 10 / 15 | 两个喷泉越过证据边界；观鸟架存在悬空杆件；垂直花园与“一平米行动”预览裁切。 |
| 正式 Massing 通过 | **0 / 15** | 地图 placement、比例、朝向、碰撞、入口 / 通道绕行和真实场景地面接触均未完成。 |

当前可以证明的是“15 个 GLB 在隔离运行时可加载”，不能据此写成“15 个设施
Massing 已完成”。严格视觉门也仍有 5 个输出需要回修。

## 资产级审查

| 输出 | 几何 / 运行时视觉 | 证据边界 | 发现与后续门 |
| --- | --- | --- | --- |
| `shangsheng-wayfinding-totem` | 通过 | 守住 | 六边柱与交替楔形轮廓完整，落地和导出一致。没有专属照片，三联图已明确写成 fallback Massing；不得据此进入 Identity。 |
| `shangsheng-cafe-pavilion` | 通过 | 守住 | 顶盖、支柱和中央低体块完整，未见穿插或漂浮。没有专属照片，真实亭体结构、颜色和开口仍未知。 |
| `shangsheng-bicycle-parking` | 通过 | 守住 | 七组车架轮廓和间距在两端视角均可读，Three.js 与 Blender 一致。没有专属照片，数量和朝向不能视为现场事实。 |
| `shangsheng-reading-terrace` | 通过 | 守住 | 八边平台、中心体块与坐凳层级完整，没有明显穿插。没有专属照片，当前只是运行时 authored fallback。 |
| `shangsheng-fountain-osm-1364679202` | **不通过** | **越界** | OSM 只证明 `amenity=fountain` 与平面 footprint；政府照片只证明园区内存在齐平地面喷泉，且未绑定此 way。蓝色、名为 `water` 的连续薄面会被读成静水池，超出当前证据。应改成证据中性的设施区 / 铺装薄面，或先完成该 way 与喷泉类型的现场绑定。 |
| `shangsheng-fountain-osm-1364679203` | **不通过** | **越界** | 与上一输出相同：当前连续蓝色水面把未知的竖向构造和水面状态画成确定事实。两个 OSM way 不能因同一张未绑定的家族照片而默认同型。 |
| `shangsheng-main-entry` | 通过 | 基本守住 | 通透顶梁、两侧支柱和内部撑件完整，未堵死中央开口；配色一致。照片支持门架类型但不支持当前精确尺寸，正式通过前仍需照片比例 overlay、道路退界与净高验证。 |
| `huashan-pond-boardwalk` | 通过 | 守住 | 水面、线性栈桥和栏杆在两端视角均完整，未见明显穿插。没有专属照片，椭圆池形、桥位、栏杆数量和材料只能保留为 fallback，不得进入 Identity。 |
| `huashan-basketball-court` | 通过 | 守住 | 蓝色场地、绿色围网和单端篮架与直接入口照片的可见信息相符，导出一致。照片没有覆盖完整边界，正式通过前必须补全 court footprint / yaw overlay、入口和围网碰撞。 |
| `huashan-bird-pergola` | **不通过** | 标注清楚但几何有误 | canonical 和 side 中最外侧两根斜杆位于底座外，低端与底座 / 地面之间有可见空隙，形成悬空构件；其余杆件的落点也需要统一核对。没有专属照片，九杆拱形只能作为待证 fallback。 |
| `huashan-happiness-corner` | 通过 | 守住 | 多道粉色心形环、阶梯和浅色曲线花池三层主轮廓可读，且没有沿用旧“三门架 + 花团”错误形态；Three.js 配色一致。正式通过仍需官方照片、转角道路与运行时 pivot / yaw overlay。 |
| `xingfuli-reflecting-pool-hardscape` | 通过 | 守住 | 长条池壳、两侧池沿和桥板完整，未把池中树、喷泉或照片纹理烘入 GLB。Three.js 中深色硬景与 QA 地面反差较低，但轮廓仍可辨；真实地图中需再次检查可读性和桥面通行。 |
| `xingfuli-mixed-paving` | 通过 | 守住 | 单薄铺装面符合 Massing 只校验覆盖范围的约定，没有把照片中的错缝石材模式冒充实测规格。它不产生碰撞；正式通过仍需幸福里 world transform 后的边界和道路退界。 |
| `xingfuli-vertical-garden` | **不通过** | 守住 | Three.js 隔离图完整，但 Blender canonical 顶边 / 右侧越出画面，side 底边也被裁切，无法用当前固定机位证明完整 bounds 与落地。主体墙体没有明显穿插；需要重做不裁切的 canonical / side，再做主巷 overlay。 |
| `one-square-metre-action` | **不通过** | 守住 | 三联图正确声明活动照片只证明项目语境、不证明游戏装置形态；产品运行时代码才是形态依据。但 Blender canonical 与 side 都裁掉平台和前侧花盆底部，当前预览不能证明完整轮廓与地面接触。悬浮标志的动态包络、点击热区和地图位置也未验。 |

## 批次级证据问题

### 1. “三联图存在”不等于 canonical 对照通过

15 张三联图都能看出参考、Blender 和 Three.js 三栏，也都附有一句证据边界说明；
无专属照片的设施明确显示 `NO DEDICATED SUBJECT PHOTO`，这一点是合格的。

但有直接照片的主入口、篮球场、幸福转角、倒影池、混合铺装和垂直花园，
Blender / Three.js 大多使用统一高位斜视相机，没有复现照片的地面观察方向。
现有三联图也没有记录：

- canonical 观察方向与偏角；
- 主体屏幕宽度 / 高度占比；
- 是否裁切；
- 人物或入口尺度；
- 照片镜头与运行时镜头差异。

因此这些三联图目前只能作为定性溯源材料，不能作为比例、朝向或 canonical
匹配的通过证据。

### 2. Contact sheet 可读性

canonical 与 Three.js contact sheet 可以快速核对全批外观。side contact sheet
的多项英文标签在单元格左侧被截断，无法完整读取 slug；它不影响原始单图，
但降低了批次证据的可审计性。重新生成时应在每个单元格内左对齐并保留标签
安全边距。

### 3. 记录状态需要与实际 QA 同步

当前 browser evidence 已证明 15 个隔离 QA 页面成功加载；与此同时
`facility-prototypes-massing-manifest.json` 顶层仍写着
`runtimeIntegration: intentionally-not-performed`，资产级 `runtimeGate` 也仍是
`pending`。这不会把正式通过数提高，但在下一轮生成 build record / manifest
时需要把“隔离 gallery 已验证”和“真实地图未验证”拆开记录，避免状态互相矛盾。

## 正式 Massing 仍缺的共同门

以下项目未完成前，`formalMassingPassCount` 必须继续为 0：

1. 在真实地图 QA 路径逐实例核对 position、pivot、yaw、scale 与场地 footprint；
2. 在真实地形确认地面接触，不允许漂浮、下沉或用全局缩放掩盖尺寸错误；
3. 使用人物、入口、篮架、台阶等可比尺度检查 1:1 authored scale；
4. 拆分实体、非实体和可通行区域碰撞，验证入口、木桥、阶梯、园路和广场绕行；
5. 重新生成不裁切的垂直花园与“一平米行动”固定机位预览；
6. 修正观鸟架杆件落点；
7. 将两个喷泉改为证据中性表达，或取得逐 way 绑定的设施照片；
8. 按真实 canonical 方向重做直接照片资产的三联对照，并记录屏占比、偏角、
   裁切、人物尺度和镜头差异；
9. 独立复查修正版，并保持 Identity gate 与现有证据缺口一致。

## 独立审查判定

- geometry / runtime visual pass：`10 / 15`。
- formal Massing pass：`0 / 15`。
- 批次状态：**隔离运行时加载完成；视觉修正、真实地图与碰撞门未完成，不得进入
  “设施 Massing 全部完成”的表述。**
