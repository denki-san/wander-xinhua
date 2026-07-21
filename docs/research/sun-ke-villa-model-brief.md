# Blender Model Brief: Sun Ke Villa

## Scope

- Asset slug: `sun-ke-villa`
- POI / environment / character: 上生·新所内的孙科别墅，番禺路60号
- Runtime component: `app/scene/shangsheng-xinsuo-block.tsx`
- Generator: `scripts/create_sun_ke_villa_model.py`
- Editable source: `assets/models/source/sun-ke-villa.blend`
- Runtime GLB: `public/models/shangsheng/sun-ke-villa.glb`
- Start preset: `/?start=sunke`
- Reference manifest: `docs/research/sun-ke-villa-reference-manifest.json`

## Evidence

### Reference photos

| Local path | Source URL | View direction | Capture/publish date | Usage boundary |
| --- | --- | --- | --- | --- |
| `docs/research/assets/poi-references/sun-ke-villa/sun-ke-villa-front-canonical.jpg` | https://www.shcn.gov.cn/col6991/20231215/1250456.html | 花园正立面，近正视 | 2023-12-14 页面发布 | Research only |
| `docs/research/assets/poi-references/sun-ke-villa/sun-ke-villa-right-front.jpg` | https://mzj.sh.gov.cn/lnb-xw/20201117/a91886a37b954de283d159a39afca025.html | 花园右前斜视 | 2020-11-17 页面发布 | Research only |
| `docs/research/assets/poi-references/sun-ke-villa/sun-ke-villa-north-entrance.jpg` | https://www.shcn.gov.cn/col6991/20231215/1250456.html | 北侧门廊与入口斜视 | 2023-12-14 页面发布 | Research only |

### Canonical comparison view

- Local path: `docs/research/assets/poi-references/sun-ke-villa/sun-ke-villa-front-canonical.jpg`
- Direction: 花园正立面，近正视；模型本地 `-Y` 为该立面正面
- Why selected: 同时清楚显示中央三联尖券门廊、二层连续拱窗、阳台、右侧圆角塔楼、低坡红瓦屋顶和前庭草坪，最适合作为身份与比例基准。
- Runtime camera reproduction: 从别墅本地 `+Z` 一侧朝建筑中心观察；GLB 导入 Three.js 后，Blender 本地 `-Y` 映射到运行时 `+Z`。相机稳定后保持略高于玩家视线，并让右侧塔楼完整入镜。

### Evidence classification

#### Observed

- 建筑为不对称的多体块花园住宅，浅暖灰鱼鳞状拉毛墙面与红褐色筒瓦形成主色关系。
- 花园正立面中央首层有三联尖券门廊，二层有连续圆拱落地窗与黑色弧形金属阳台。
- 正立面右侧为圆角/半圆形塔楼体量，分层布置窄高窗，顶部为低矮弧形红瓦屋顶。
- 左翼比中央体块低，首层窗间可见浅暖色菱形装饰板；中央和后部屋顶有突出的小体块与烟囱。
- 右前斜视能确认尖券入口、塔楼窗框厚度、二层拱窗和挑出阳台的纵深。
- 北侧入口由带山墙的门廊、粗厚立柱、圆拱入口和成组尖拱窗组成，后侧屋顶体块明显错落。
- 官方文字资料明确记载：建于1931年，由邬达克设计，融合西班牙、巴洛克与意大利文艺复兴语言，并具有红砖瓦、弧顶窗框、尖券门洞和烟囱等特征。

#### Inferred

- OSM 轮廓按矩形记录，不能证明真实凹凸；生成器在该矩形预算内依据三张照片补出中央体块、低左翼、右侧塔楼和北门廊。
- 建筑高度没有公开测量值；按假三层住宅、门窗比例和现有场景尺度推定檐口约 `3.75` 场景单位、最高屋脊约 `5.0` 场景单位。
- 瓦片采用低多边形分段脊瓦和檐口节奏表达，不逐片复刻照片。
- 不可见侧立面按同一窗门语法保守补全，避免把推断细节做成主视觉焦点。

#### Unknown

- 精确建筑测绘尺寸、各体块的真实进深与楼板标高。
- 被植被遮挡的东西两侧完整开窗、塔楼背面、烟囱精确数量与原始屋面节点。
- 2020年修缮前后个别门窗、栏杆和景观构件是否发生替换。

## Quality Contract

### Identity

- Silhouette: 低左翼 + 中央双层拱廊体块 + 右侧圆角塔楼 + 错落红瓦坡屋顶，整体不对称。
- Signature cue 1: 花园立面中央首层三联尖券门廊与二层连续圆拱窗。
- Signature cue 2: 右侧圆角塔楼、分层窄高窗和弧形屋面。
- Signature cue 3: 黑色金属阳台与细竖栏杆；本轮以浅挑直线轮廓近似照片中的轻微弧度。
- Signature cue 4: 北侧山墙门廊、厚立柱与成组尖拱窗。
- Signature cue 5: 浅暖灰拉毛墙、红褐筒瓦、深色窗框与烟囱共同形成的材质轮廓。
- Details intentionally omitted: 室内家具、品牌展陈、照片纹理、逐片高模瓦、不可验证的雕花与隐藏立面细节。

### Position

- Coordinate source: OSM way `864847877`，保存在 `docs/research/data/shangsheng-xinsuo-overpass-20260716.json`
- Scene position: 上生·新所本地 `[43.2515, -9.8836]`；场地世界位置 `[8.3149, -147.5366]`
- Confidence: 平面落点和朝向为高置信 OSM 证据；真实凹凸轮廓和高度为中低置信视觉推定。

### Scale

- Known dimensions: OSM 场景轮廓 `7.8316 × 5.5313` 单位，即约 `21.15 × 14.93 m`
- `1 scene unit = 2.7 m` conversion: 最终 GLB 宽/深/高为 `7.5978 × 5.5250 × 5.0500` 场景单位，即约 `20.51 × 14.92 × 13.64 m`
- Allowed visual multiplier: 水平 `0.97–1.03`；垂直只允许在 canonical 对照后于 `0.94–1.06` 内校准。

### Orientation

- Blender front direction: local `-Y`
- Runtime rotation: 由 OSM 轮廓提供 `rotation-y={0.009414}`；GLB 不烘焙场地旋转。
- Canonical view direction: 花园侧从本地 `-Y` 向原点观察；运行时对应从本地 `+Z` 向建筑观察。

### Materials

- Opaque: 暖灰拉毛墙、暖石材窗套、红褐瓦、深褐木、黑铁、暗铜与低饱和景观绿。
- Glass: 深灰蓝低透明度玻璃，独立材质槽；运行时保持透明而不写入参考照片。
- Metal: 阳台、栏杆、落水管和门窗分格使用近黑铁色。
- Emissive: 不需要；夜间展陈和品牌灯光不属于建筑身份基线。
- Project palette mapping: 与上生·新所现有 `#b9a58d / #874a37 / #4b3a31` 调色保持一致，并降低纯度避免抢夺角色视觉层级。

### Collision and access

- Solid obstacles: 沿用 OSM 建筑碰撞盒 `x 39.1525–47.3505 / z -12.845–-6.9243`，不把前庭草坪和北门廊外部一并封死。
- Walkable areas: 花园前沿、北门廊外侧与周边道路继续可行走；门洞只做视觉深度，不承诺室内可进入。
- Camera clearance: 塔楼和屋檐不新增平面碰撞；相机按既有建筑盒避让，canonical 机位位于正立面外至少 `7` 场景单位。
- Road clearance: GLB 几何必须保持在 OSM 轮廓加 `0.18` 单位檐口预算内。

### Runtime budget

- Maximum triangles: `35,000`
- Maximum nodes: `2`
- Maximum materials: `8`
- Maximum images: `0`
- Maximum GLB bytes: `1,500,000`
- Animation/skin requirements: 无动画、无骨骼；静态网格允许运行时整体投影。

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Massing | 中央、左翼、塔楼、北门廊与屋顶体块 | canonical 轮廓与高宽比 | OSM 轮廓、落地和朝向 | Passed |
| Identity | 三联尖券、拱窗、阳台、塔楼、门廊与烟囱 | 三处以上身份构件可读 | 玩家距离仍可辨认 | Passed |
| Materials | 拉毛墙、红瓦、深框、玻璃与铁艺 | 不依赖照片贴图 | 白天调色与透明排序 | Passed |
| Site | 前庭台阶、低花坛和入口基座 | 不遮挡主要立面 | 入口与周边路径不封闭 | Passed |
| Collision | 沿用 OSM 建筑盒并核对檐口 | 几何不越预算 | 玩家/相机避让与门廊净空 | Passed |
| Optimization | 合并静态网格、共享材质 | 节点与材质预算 | 首屏延迟加载和性能采样 | Passed |

批次证据：`test_sun_ke_villa_batch_01_massing_preview.png`、`test_sun_ke_villa_batch_02_identity_materials_preview.png` 与 `test_sun_ke_villa_batch_03_site_preview.png` 分别记录体块、身份/材质和场地批次；碰撞批次由 GLB 旋转后边界完全位于 OSM collision 的自动测试记录；优化批次由最终三机位图和 GLB 结构审计记录。

## Validation

### Blender

- [x] Generator exits successfully in background mode
- [x] Editable `.blend` saved
- [x] Canonical `test_` preview
- [x] Side `test_` preview
- [x] Street-level `test_` preview

### GLB

- [x] Root transform normalized
- [x] Bounds audited
- [x] No reference photos embedded
- [x] Geometry/material/file budgets pass
- [x] Skin/animation pass when applicable（静态资产，不适用）

### Three.js

- [x] Start preset loads
- [x] Canonical direction reproduced
- [x] Ground contact and orientation pass
- [x] Player and camera collision pass
- [x] Entrances and public paths remain reachable
- [x] Browser console has no new errors
- [x] First-screen loading behavior passes
- [x] Performance comparison recorded

Three.js 通过证据：专用 `/?start=sunke` 机位的真实 PNG `test_artifacts/test_sun_ke_villa_runtime_preview.png` 清楚显示花园正立面、完整塔楼、三联开放尖券、二层拱窗、红瓦屋顶与地面接触；自行车架退到画面左侧，不再遮挡三个入口。GLB 旋转后四角完全位于既有 OSM 碰撞盒的自动断言通过；全仓测试覆盖角色、相机、道路与场地碰撞；同一浏览器会话 Canvas 非零、无加载中状态且新增页面 console error 为 0。

## Decision Log

### Iteration 0 — Research gate

- Changes: 本地保存三张官方来源参考照片，建立独立 manifest，选定花园正立面为 canonical view，并定义 OSM 落点、尺度、身份、碰撞与运行时预算。
- Evidence used: 上海市长宁区人民政府两张外观图、上海市民政局/上海老年报一张右前斜视图、OSM way `864847877`。
- Blender result: 尚未开始；本轮只通过动工研究门槛。
- GLB result: 尚未开始。
- Runtime result: 当时页面仍使用程序化占位模型。
- Remaining inference: 精确高度、真实凹凸轮廓、不可见立面和屋面细部。
- Performance impact: 无。
- Rollback point: 生成器动工前状态；原程序化建筑体量后续保留为 `SunKeVillaFallback`。

### Iteration 1 — Deterministic Blender asset

- Changes: 用确定性 Blender Python 生成低左翼、中央体块、圆角塔楼、北门廊、分层红瓦屋顶、三联尖券、连续拱窗、阳台和烟囱；保存可编辑 `.blend`，并渲染 canonical、右前和北入口三个固定机位。
- Evidence used: 三张本地官方来源照片；身份构件只采用照片直接可见部分，不补造不可验证的侧窗。
- Blender result: 三机位人工对照通过；二次迭代降低塔楼屋面厚度、重做北门廊圆拱并降低相机高度，最终移除右侧浮空推断窗。
- GLB result: 导出单节点、单网格、8 材质、0 图片、0 动画、0 骨骼的静态资产。
- Runtime result: 尚未接入。
- Remaining inference: 精确测绘尺寸、隐藏侧立面和逐片瓦节点仍按 Brief 标为推断或未知。
- Performance impact: 合并静态网格，避免把 Blender 编辑层级带入运行时。
- Rollback point: `assets/models/source/sun-ke-villa.blend` 与确定性生成器可重新生成全部产物。

### Iteration 2 — GLB audit and initial Three.js integration

- Changes: 以 `Suspense` 处理 GLB 加载等待，并用 `SunKeVillaErrorBoundary` 在 404/解析失败时回退原程序化体量；沿用 OSM 落点、旋转和碰撞盒，不在首屏 preload。
- Evidence used: OSM way `864847877`、现有上生·新所建筑注册表与碰撞数据。
- Blender result: 初版模型边界 `7.4306 × 5.0500 × 5.5250` 场景单位，底面 `Y=0`。
- GLB result: 初版 `983,732` bytes、`14,828` triangles、1 node、1 mesh、8 materials、0 images/textures；根平移/旋转/缩放归一化，审计状态 `ok`。
- Runtime result: GLB 请求成功且无 React/Three.js 异常，但初次实页截图未显示建筑；临时场景定位标记证明组件落点和 `/?start=sunke` 视线正确，问题被缩小到模型材质接入层。本轮未通过运行时质量门。
- Remaining inference: 运行时入口自行车架会遮挡一部分首层门廊；身份精度仍以 canonical Blender 对照图为主，实页用于落点、朝向、地面接触、碰撞和材质显示验收。
- Performance impact: GLB 未首屏预载；本轮不采用“模型尚未绘制”状态的性能采样作为完成证据。
- Rollback point: 删除 GLB 加载分支即可回退到保留的 `SunKeVillaFallback`，无需修改 OSM 场地数据。

### Iteration 3 — Runtime material regression fix

- Changes: 发现 GLTFLoader 将八个 glTF primitives 拆成八个无 geometry groups 的单材质 Mesh；原代码错误地把每个单材质改成长度为一的材质数组，导致 WebGLRenderer 不绘制。现在记录原材质是否为数组，单材质 Mesh 继续赋单个 Material，并加入源码回归断言；紫色定位标记已移除。
- Evidence used: Node GLTFLoader 审计显示八个子 Mesh 均为单材质且 `geometry.groups.length === 0`；浏览器中同坐标临时定位标记可见、模型不可见；修复后同一 `/?start=sunke` 机位立即显示别墅。
- Blender result: 无几何改动；沿用已通过的三机位产物。
- GLB result: 本轮材质修复无二进制改动；当时仍为 `983,732` bytes、`14,828` triangles、1 node、1 mesh、8 primitives/materials、0 images/textures。
- Runtime result: `http://127.0.0.1:3002/?start=sunke` 实际页面通过；Canvas `1767 × 851`，模型落地、朝向和主要身份构件可读，控制台新增页面 error 为 `0`。最终入口图保存在 `test_artifacts/test_sun_ke_villa_runtime_preview.png`。
- Remaining inference: 自行车架属于既有实景设施，会遮挡少量首层立面；未为截图便利改变 OSM 建筑或设施位置。
- Performance impact: 修复后浏览器 CDP 单次会话采样为 `JSHeapUsedSize 112,007,828` bytes、`JSHeapTotalSize 178,962,432` bytes、521 DOM nodes；该值包含验收浏览器和插件开销，不作为资产独占内存。
- Rollback point: 回退本轮材质分支会稳定复现“请求成功但建筑不绘制”，因此回退应直接切换到 `SunKeVillaFallback`，不可保留错误数组赋值。

### Iteration 4 — Completion review fixes

- Changes: 将正式截图统一为可被 `.gitignore` 例外收录的 `test_*_preview.png`；增加 `SunKeVillaErrorBoundary` 处理 GLB 404/解析失败；沿世界 X 轴校准模型宽度 `1.0225` 倍；将三联尖券从玻璃拱窗改为独立深凹门廊，并增加体块、身份/材质、场地三批次截图；右前专用起点避开自行车架中心遮挡；增加宽度下限、旋转后 AABB、PNG magic 与尺寸测试。
- Evidence used: 独立完成前审查、canonical 官方照片、`.gitignore` 实际匹配结果、GLB bounds 与 OSM collision 数据、真实浏览器截图和 console 事件。
- Blender result: 最终边界 `7.5978 × 5.0500 × 5.5250` 场景单位，底面 `Y=0`；三机位重新渲染并进入 Git 可见集合。
- GLB result: 最终 `991,292` bytes、`14,936` triangles、1 node、1 mesh、8 materials、0 images/textures；宽度为 OSM 证据宽度的 `97.02%`，达到 Brief 下限，旋转后不越出碰撞盒。
- Runtime result: 最终 `/?start=sunke` 右前专用机位清楚显示完整塔楼、二层拱窗和三联开放尖券；Canvas `1767 × 851`、无加载中、新增页面 console error 为 `0`。主图为真实 PNG `test_artifacts/test_sun_ke_villa_runtime_preview.png`。
- Remaining inference: 精确测绘、隐藏侧立面、真实门廊深度和阳台轻微弧度仍是保守近似；不以运行时截图替代三张照片和 Blender canonical 对照。
- Geometry impact: 独立深凹门廊使最终资产相对审查前版本增加 `108` triangles 和约 `7.6 KB`，节点、材质和图片数量不变。
- Performance impact: 最终二进制重建后的浏览器 CDP 单次会话采样为 `JSHeapUsedSize 83,324,148` bytes、`JSHeapTotalSize 131,858,432` bytes、248 DOM nodes、1 frame；GLB 继续延迟加载且未首屏 preload，该数值包含浏览器与验收插件开销。
- Rollback point: `SunKeVillaErrorBoundary` 与 `SunKeVillaFallback` 可在 GLB 失败时保持园区可用；确定性生成器可复现最终二进制与三机位图。
