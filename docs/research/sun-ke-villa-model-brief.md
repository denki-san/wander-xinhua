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
| `docs/research/assets/poi-references/sun-ke-villa/sun-ke-villa-north-porte-cochere-user-reference-20260725.png` | User-provided attachment | 北侧 porte-cochère 近景 | 2026-07-25 提供 | Geometry correction |
| `docs/research/assets/poi-references/sun-ke-villa/sun-ke-villa-north-porch-model-correction-20260725.png` | User-provided attachment | 校正前模型截图 | 2026-07-25 提供 | Before-state evidence |

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
- 北侧入口不是贴墙小雨棚：带山墙圆拱的 porte-cochère 明显向北外挑，
  前端由独立厚立柱支撑，长坡屋顶向后连接主楼，并形成可穿行的覆盖车道。
- 北侧入口同时具有粗厚立柱、圆拱券边、成组尖拱窗和明显错落的后侧屋顶体块。
- 官方文字资料明确记载：建于1931年，由邬达克设计，融合西班牙、巴洛克与意大利文艺复兴语言，并具有红砖瓦、弧顶窗框、尖券门洞和烟囱等特征。

#### Inferred

- OSM 轮廓按矩形记录，不能证明真实凹凸；主体在该矩形预算内依据照片补出中央体块、低左翼和右侧塔楼，北侧 porte-cochère 则按新增近景证据明确越出主体矩形。
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
- Signature cue 4: 明显向北外挑的 porte-cochère、前端山墙圆拱、厚立柱、
  向后连接主楼的长坡屋顶与成组尖拱窗；不得退化成贴墙短雨棚。
- Signature cue 5: 浅暖灰拉毛墙、红褐筒瓦、深色窗框与烟囱共同形成的材质轮廓。
- Details intentionally omitted: 室内家具、品牌展陈、照片纹理、逐片高模瓦、不可验证的雕花与隐藏立面细节。

### Position

- Coordinate source: OSM way `864847877`，保存在 `docs/research/data/shangsheng-xinsuo-overpass-20260716.json`
- Scene position: 上生·新所本地 `[43.2515, -9.8836]`；场地世界位置 `[8.3149, -147.5366]`
- Confidence: 平面落点和朝向为高置信 OSM 证据；真实凹凸轮廓和高度为中低置信视觉推定。

### Scale

- Known dimensions: OSM 场景轮廓 `7.8316 × 5.5313` 单位，即约 `21.15 × 14.93 m`
- `1 scene unit = 2.7 m` conversion: 修正后 Hero GLB 宽/深/高为
  `7.5978 × 7.6980 × 5.0500` 场景单位；其中主体仍约 `5.5250` 深，
  新增纵深来自照片确认的北侧外挑 porte-cochère，不把它伪装成 OSM 主体 footprint。
- Allowed visual multiplier: 水平 `0.97–1.03`；垂直只允许在 canonical 对照后于 `0.94–1.06` 内校准。

### Orientation

- Blender front direction: local `-Y`
- Runtime rotation: 由 OSM 轮廓提供 `rotation-y={0.009414}`；GLB 不烘焙场地旋转。
- Canonical view direction: 花园侧从本地 `-Y` 向原点观察；运行时对应从本地 `+Z` 向建筑观察。
- Map direction closure: glTF 轴转换后，花园 canonical 立面朝运行时本地
  `+Z`，在当前近零 yaw 下即朝世界南侧；官方“北侧入口”照片对应相反的
  本地 `-Z` / 世界北侧。OSM 最长边只证明 footprint 轴线；花园南立面与
  北侧入口的判断来自两张相对立面的官方照片和既有场地轴合同。

### Materials

- Opaque: 暖灰拉毛墙、暖石材窗套、红褐瓦、深褐木、黑铁、暗铜与低饱和景观绿。
- Glass: 深灰蓝低透明度玻璃，独立材质槽；运行时保持透明而不写入参考照片。
- Metal: 阳台、栏杆、落水管和门窗分格使用近黑铁色。
- Emissive: 不需要；夜间展陈和品牌灯光不属于建筑身份基线。
- Project palette mapping: 与上生·新所现有 `#b9a58d / #874a37 / #4b3a31` 调色保持一致，并降低纯度避免抢夺角色视觉层级。

### Collision and access

- Solid obstacles: 主体沿用 OSM 建筑碰撞盒 `x 39.1525–47.3505 / z -12.845–-6.9243`；
  外挑 porte-cochère 不使用整块碰撞盒封死，已只为两根前端厚立柱补局部障碍。
- Walkable areas: 花园前沿、porte-cochère 覆盖车道、北门廊外侧与周边道路继续
  可行走；门洞只做视觉深度，不承诺室内可进入。
- Camera clearance: 塔楼和屋檐不新增平面碰撞；相机按既有建筑盒避让，canonical 机位位于正立面外至少 `7` 场景单位。
- Road clearance: 建筑主体保持在 OSM 轮廓加 `0.18` 单位檐口预算内；
  北侧 porte-cochère 是证据确认的独立外挑构件，可越出 OSM 主体矩形，
  但不得移动主体 pivot，也不得用整块碰撞盒封死覆盖车道。

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
| Massing | 精确 OSM 主体 footprint + 主次体块、屋顶轮廓与外挑北门廊 | MCP canonical / 侧向纵深 / 北入口 | OSM 轮廓、落地、南花园立面 / 北入口方向 | Formal pass; MCP and map calibrated |
| Hero identity-feature phase | 三联尖券、拱窗、阳台、塔楼、门廊与烟囱 | 三处以上身份构件可读 | Hero 玩家距离仍可辨认 | Passed inside Hero master only |
| Identity GLB tier | 从冻结 Hero master 派生的独立轻量 GLB | 保留至少三处身份构件 | 中景独立加载、同 transform 切档 | Formal pass; derived from reviewed Hero |
| Materials | 拉毛墙、红瓦、深框、玻璃与铁艺 | 不依赖照片贴图 | 白天调色与透明排序 | Passed |
| Site | 前庭台阶、低花坛和入口基座 | 不遮挡主要立面 | 入口与周边路径不封闭 | Passed |
| Collision | 沿用 OSM 建筑盒并核对檐口 | 几何不越预算 | 玩家/相机避让与门廊净空 | Passed |
| Optimization | 合并静态网格、共享材质 | 节点与材质预算 | 首屏延迟加载和性能采样 | Passed |

批次证据：`test_sun_ke_villa_batch_01_massing_preview.png`、
`test_sun_ke_villa_batch_02_identity_materials_preview.png` 与
`test_sun_ke_villa_batch_03_site_preview.png` 分别记录完整 Hero master
内部的体块、身份构件 / 材质和场地批次；第二张文件名中的 `identity`
是历史阶段名，不是正式 Identity tier 交付物。碰撞批次由 GLB 旋转后
主体位于 OSM collision、外挑门廊仅用双柱局部障碍且中央车道开放的自动测试记录；优化批次由最终三机位图和
GLB 结构审计记录。

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

以上勾选项已由新版三档管线重新验收：Massing 地图复核、独立 Identity GLB、
Hero/Identity/Massing 同机位切换、fallback、缓存和同条件性能记录均已写入
`docs/research/sun-ke-villa-three-tier-runtime-qa.json`。

Three.js 通过证据：专用 `/?start=sunke` 机位的真实 PNG `test_artifacts/test_sun_ke_villa_runtime_preview.png` 清楚显示花园正立面、完整塔楼、三联开放尖券、二层拱窗、红瓦屋顶与地面接触；自行车架退到画面左侧，不再遮挡三个入口。主体仍由既有 OSM 碰撞盒保护，北侧外挑门廊只补两根前柱障碍，中央覆盖车道保持开放；全仓测试覆盖角色、相机、道路与场地碰撞；同一浏览器会话 Canvas 非零、无加载中状态且新增页面 console error 为 0。

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

### Iteration 5 — Active-31 pipeline migration

- Changes: 将孙科别墅纳入 active-31 最小纵向试点；纠正旧 Brief 把 Hero
  “身份构件阶段”误记为正式 Identity tier 的语义；把官方花园南立面与
  北侧入口绑定到运行时轴；Massing 预览高度由通用 `10.5m` fallback 改为
  三视角比例与既有 V2 envelope 一致的 `13.635m / 5.05` 场景单位。
- Evidence used: 三张本地官方照片、OSM way `864847877`、既有 Hero
  bounds 与 `1 scene unit = 2.7m` 合同。
- Blender result: 待重新生成单资产 Massing 并复核 Hero master。
- GLB result: Identity tier 仍缺失；不得把 Hero GLB 或程序化 fallback
  记作 Identity。
- Runtime result: 必须先闭合 Massing 真实地图位置、比例、南 / 北方向、
  地面和碰撞，再冻结 Hero SHA 和派生 Identity。
- Remaining inference: `13.635m` 仍是视觉推定，不是测绘高度；记录保持
  `measuredHeightMeters: null`。
- Performance impact: 目标加载策略为近景 Hero、中景 Identity、远景
  Massing，不同时加载 31 个 Hero。
- Rollback point: 旧 Massing GLB、Blend、截图和 build record 的 Git
  历史可追溯；本轮只允许单资产确定性重建。

### Iteration 6 — User-corrected north porte-cochère

- Changes: 用户指出北门廊真实结构明显向北外挑；否决校正前贴墙短雨棚。
  Hero 生成器改为前端独立山墙圆拱与厚立柱、向后连接主楼的长坡屋顶和
  开放覆盖车道；随后必须重新冻结 Hero SHA 并重新派生 Identity。
- Evidence used: 用户提供的北入口近景、校正前 Identity 截图，以及既有
  官方北入口照片。
- Blender result: Hero 已 Headless 重建；外挑门廊在 north 固定机位完整可见。
- GLB result: Hero SHA 更新为 `830564a6cdbd…`，Identity 随后从该冻结
  master 重新派生为 `0e582398fa61…`。
- Runtime result: 等待三档真实页面与 fallback 复验。
- Remaining inference: porte-cochère 精确测绘长度与柱截面仍为照片比例推断。
- Performance impact: Identity 必须保留外挑轮廓，但继续删除逐条瓦 ribs 与密集窗棂。
- Rollback point: 校正前模型与用户批注截图已只读保留在证据目录。

### Iteration 7 — Structured Massing and Blender MCP gate

- Changes: 废止纯矩形盒式 Massing；保留精确 OSM 主体底盘，并加入中央
  主楼、低西翼、圆角东塔、错落坡屋顶、老虎窗、烟囱和北侧外挑
  porte-cochère。门廊只建局部柱、梁和屋顶，中间覆盖车道保持开放。
- Evidence used: 三张官方视图、用户提供的北门廊近景、OSM way
  `864847877`。
- Blender result: MCP canonical、侧向纵深、北入口三机位通过；人物尺度
  为 `0.66` 场景单位；底面 `Z=0`；无非流形边与零面积面。
- GLB result: `252` triangles、`19,988` bytes、1 node、2 materials、
  0 images；SHA `f233f9defd21…`。
- Runtime result: 因二进制和缓存键改变，旧地图通过记录降级为待重新校准。
- Remaining inference: 总高度继续标为视觉推定，不升级为测绘数据。
- Rollback point: 单资产生成器支持 `--way 864847877`，不会改写其余
  11 个 hold/backlog 资产。

### Iteration 8 — Hero Blender MCP visual gate

- Changes: 以用户校正后的冻结 Hero master 进入正式 MCP 结构、身份构件、
  材质、法线、穿模、场地和碰撞意图审查；未在 MCP 中接受临时资产修改。
- Evidence used: `docs/research/sun-ke-villa-blender-mcp-gates.json` 与三张
  `test_sun-ke-villa-hero-mcp-*` 固定机位图。
- Blender result: 三联尖券、四联上层拱窗、圆角东塔、阳台、外挑北门廊
  均通过；8 个运行时材质、0 零面积面、0 负尺度、0 非有限顶点。
- GLB result: 冻结 SHA 未变化；无需再次派生 Identity。
- Runtime result: 等待 Massing 重新地图校准后统一进入三档实页验收。
- Rollback point: MCP 只读审查未保存源场景；确定性生成器仍是唯一资产真值。

### Iteration 9 — Same-camera tier comparison gate

- Changes: 在同一临时 Blender MCP 场景导入 Hero、Identity、Massing，
  用完全相同的 canonical、侧向纵深、北入口机位逐档渲染并生成三联图。
- Evidence used: `test_artifacts/all-models/tier-review/sun-ke-villa/` 下三张
  `test_sun-ke-villa-tier-mcp-*-contact-sheet.png`。
- Blender result: 三档根变换均为零位移、零旋转、单位缩放；底面均为
  `Z=0`、最高点均为 `5.05`。北门廊外挑和覆盖车道开口在三档连续。
- GLB result: Identity 相对 Hero 只删除瓦 ribs、密集窗棂和场地细节；
  Massing 只保留主次体块和关键门廊空洞，未发生朝向或通行语义跳变。
- Runtime result: Blender 层三档门通过；正式 Identity 仍须真实页面通过
  后才可把 `formalIdentityPass` 改为 `true`。
- Rollback point: 临时审查场景不写入生产 Blend，三档二进制均保持原 SHA。

### Iteration 10 — Three.js tiers, cache and fallback

- Changes: 在真实静态构建中以同一 `sunke-north` 地图机位逐档加载 Hero、
  Identity、Massing；补测首屏、点击地图入口后的延迟加载、HTTP 缓存重验证、
  Hero → Identity 和 Identity → programmatic 两条 fallback。
- Evidence used: `docs/research/sun-ke-villa-three-tier-runtime-qa.json` 与
  五张 `test_sun-ke-villa-*-threejs*.png`。
- Blender result: 三档二进制未变化。
- GLB result: 冷加载 Hero 路径为 `1,373,676` bytes（含 Identity fallback）、
  Identity `345,473` bytes、Massing `20,263` bytes；首屏目标 GLB 为 0。
- Runtime result: 三档均 `playable`、目标资源 `200 model/gltf-binary` 且
  无非预期异常。Massing 条件重验证仅传 `127` bytes，但不是 disk cache。
- Fallback result: Hero 故障显示 Identity；Identity 故障显示程序化模型。
  旧程序化模型从 `7.45` 高度改为与三档 `5.05` 包络一致，并补齐外挑北门廊、
  局部柱障碍与开放中心车道，避免故障时缩回主墙或高度突变。
- Performance impact: 没有同时加载 active 31 的 Hero；Hero 近景路径为
  同一资产额外加载 `345,473` bytes Identity 作为韧性成本。
- Rollback point: 删除 QA query 参数即可恢复正常距离调度；ErrorBoundary
  与对齐后的程序化 fallback 保留为运行时故障保护。

### Iteration 11 — Restore master and revalidate the protruding porch

- Changes: 针对用户再次确认的“门廊必须明显向外突出”，回归发现旧 MCP
  三档审查场景误保存到了正式 Hero Blend。保留旧截图与记录，不做破坏性
  reset；从已回写 porte-cochère 参数的确定性生成器恢复 254 个可编辑资产
  网格，重新冻结 Hero，并从该 master 重新派生 Identity。
- Evidence used: 用户北入口近景、校正前 Identity 截图、原三档记录，以及
  `docs/research/sun-ke-villa-blender-mcp-gates-v2.json`。
- Blender result: 当前 MCP 读取 Hero 门廊屋顶 bounds 为
  `Y=1.79..4.93`，前柱中心约 `Y=4.58`；Identity 中同一屋顶 bounds 完全
  一致。Hero、Identity、Massing 北入口同机位对照均保留外挑屋顶、独立前柱
  和开放中央车道；MCP 临时相机与灯光未保存回 master。
- GLB result: Hero 为 `6d1642315530…`（15,548 tris、1,027,924 bytes）；
  Identity 为 `6b541e8ffab4…`（5,192 tris、345,196 bytes），lineage 为
  `sun-ke-villa-hero-6d1642315530`。Identity 生成器改为读取并核对当前冻结
  Hero build record，不再硬编码一次性 SHA。
- Runtime result: `1280×720`、DPR 2、production-static 条件下两档均
  `playable`；首屏目标 GLB 请求为 0。Hero 路径加载当前 Identity fallback
  与 Hero；Identity 热缓存条件重验证传输 300 bytes。两条故障路径仍可玩。
- Acceptance record:
  `docs/research/sun-ke-villa-three-tier-runtime-qa-v2.json`。
- Remaining inference: 门廊精确进深与柱截面继续标为照片比例推断，不声称
  测绘尺寸。
- Rollback point: v1 MCP/runtime 记录与旧截图原样保留；v2 记录通过
  `supersedesWithoutDeleting` 指向旧证据。
