# Blender Model Brief: Shanghai Cinema

## Scope

- Asset slug: `shanghai-cinema`
- POI / environment / character: POI landmark
- Runtime component: `app/scene/xinhua-road-landmarks.tsx`
- Generator: `scripts/create_xinhua_road_models.py`
- Editable source: `assets/models/source/xinhua-road/shanghai-cinema.blend`
- Runtime GLB: `public/models/xinhua-road/shanghai-cinema.glb`
- Start preset: `/?start=cinema`

## Evidence

### Reference photos

| Local path | Source URL | View direction | Capture/publish date | Usage boundary |
| --- | --- | --- | --- | --- |
| `docs/research/assets/poi-references/shanghai-cinema/shanghai-cinema-front-official.jpg` | [上海市文旅推广网 / SHINE](https://www.meet-in-shanghai.net/en/news/renovated-cinema-to-reopen-in-time-for-siff-203526/) | Front-left three-quarter | 2023-06-01 | Research only |
| `docs/research/assets/poi-references/shanghai-cinema/shanghai-cinema-spiral-stair-official.jpg` | [上海市文旅推广网 / SHINE](https://www.meet-in-shanghai.net/en/news/renovated-cinema-to-reopen-in-time-for-siff-203526/) | Right-front stair detail | 2023-06-01 | Research only |
| `docs/research/assets/poi-references/shanghai-cinema/shanghai-cinema-lobby-official.jpg` | [上海市文旅推广网 / SHINE](https://www.meet-in-shanghai.net/en/news/renovated-cinema-to-reopen-in-time-for-siff-203526/) | Interior lobby | 2023-06-01 | Research only; material/light evidence |
| `docs/research/assets/landmark-comparison/shanghai-cinema-real.jpg` | [澎湃新闻](https://www.thepaper.cn/newsDetail_forward_23253561) | Front-left three-quarter with street context | 2023-05-30 | Research only |
| `docs/research/assets/poi-references/shanghai-cinema/shanghai-cinema-renovation-official.jpeg` | [中国日报网](https://cn.chinadaily.com.cn/a/202306/09/WS6482a84ca310dbde06d229ec.html) | Front close-up | 2023-06-09 | Research only |

完整来源、原图 URL 与 SHA-256 见 `docs/research/shanghai-cinema-reference-manifest.json`。

### Canonical comparison view

- Local path: `docs/research/assets/poi-references/shanghai-cinema/shanghai-cinema-front-official.jpg`
- Direction: front-left three-quarter，从入口广场朝建筑本地 `+Y` 方向观察正面 `-Y`
- Why selected: 同一张图同时证明了主丝带、椭圆开洞、左侧玻璃鼓体、首层大厅、右侧大楼梯和后部塔楼的相对层级。
- Runtime camera reproduction: 使用 `/?start=cinema`，人物位于入口广场偏右，镜头朝向建筑左前侧；截图需让右侧楼梯完整入画且后塔楼不遮挡主丝带。

### Evidence classification

#### Observed

- 主入口前方是一条横向展开、左右高度不同的白色连续曲面，不是等高椭圆筒。
- 白色曲面右侧有一个横向椭圆大开洞，开洞内可见退后的二层弧形玻璃幕墙。
- 首层玻璃大厅整体向白色丝带内侧退进，入口前有细白柱和连续台阶。
- 右侧宽楼梯从广场起步，沿主体弧面抬升至二层；外侧白色实体侧梁和透明玻璃栏板均可见。
- 左后方有独立抬高的弧形玻璃鼓体，顶部有向外挑出的开放格栅冠部。
- 后部高塔是矩形竖向体量，顶部白色外框圆角包覆，中部是规则的横向窗格；它是背景层，不应压过前景丝带。
- 立面主体为暖白色实体板、青灰玻璃、白色圆柱和银灰色金属；入口内部为暖光。
- 正面可见“上海影城”四字，字位随丝带上缘抬升；本模型不复制 SHO 品牌图形。

#### Inferred

- OSM way `292250766` 的约 111 × 120 米外包范围包含整座影城综合体及后部塔楼，不能直接当作前景丝带的矩形尺寸。
- 为保持当前道路退界和 POI 碰撞兼容，模型外包络继续控制在约 `38 × 26` 场景单位内；前景主体应比后塔楼更宽、更靠街道。
- 正面丝带的最高点约为首层大厅高度的 2.1–2.4 倍，右侧开洞高度约占丝带高度的 45%。
- 楼梯踏步和玻璃栏板采用运行时可读的节奏化简，不追求测绘级踏步数量。
- 背面和内部影厅体量以不抢正面轮廓的低细节实体补全。

#### Unknown

- 2023 改造后的精确建筑测绘尺寸、曲面控制点和板缝模数。
- 主丝带背面、屋顶机电和后部塔楼与主楼的精确连接关系。
- 夜间立面灯光控制、所有门扇数量和幕墙分格的完整施工图。

## Quality Contract

### Identity

- Silhouette: 非对称双层白色丝带横向展开；左侧抬起、右侧被椭圆开洞切穿，后塔楼退居背景。
- Signature cue 1: 右侧横向椭圆开洞及洞内退后的弧形玻璃幕墙。
- Signature cue 2: 沿右侧弧面上升、与白色丝带汇合的宽旋转楼梯及透明栏板。
- Signature cue 3: 左侧玻璃鼓体和顶部向外挑出的开放格栅冠部。
- Signature cue 4: 首层内退的通高玻璃大厅、细白柱列和横向大台阶。
- Details intentionally omitted: 内部 LED 影像内容、SHO 商标图形、不可见机电、不可证实的背面装饰。

### Position

- Coordinate source: OSM way `292250766`
- Scene position: `[74.1, 80.9]`
- Confidence: 建筑中心和街角关系为高；前后各体量的精确占地为中。

### Scale

- Known dimensions: OSM 外包约 `111 × 120 m`，但包含不规则综合体；公开资料未提供前景主立面精确尺寸。
- `1 scene unit = 2.7 m` conversion: 现有约 `38 × 26` 单位包络对应 `102.6 × 70.2 m`，用作整个 POI 的运行时边界；前景丝带目标宽约 `30–32` 单位。
- Allowed visual multiplier: 完成 canonical 对照后仅允许整体 `0.96–1.04`；优先调体块比例和相机，不靠放大掩盖轮廓错误。

### Orientation

- Blender front direction: local `-Y`
- Runtime rotation: `2.761592653589793` radians
- Canonical view direction: 从本地右前侧向 `+Y` 观察，镜头轻微偏向左侧玻璃鼓体。

### Materials

- Opaque: 暖象牙白主体、冷灰阴影缝、浅灰石材台阶。
- Glass: 青灰透明幕墙、楼梯透明栏板。
- Metal: 银灰幕墙梃、栏杆和格栅。
- Emissive: 首层大厅暖光与檐底点状灯，不模拟 LED 内容。
- Project palette mapping: 继续使用低饱和暖灰街区色盘，但白色主曲面保持全场最高明度之一。

### Collision and access

- Solid obstacles: 使用中部主体与左右收窄侧翼三块碰撞近似弧形内核，正面碰撞从门厅后侧开始；楼梯只作视觉构件，不纳入可攀爬碰撞。
- Walkable areas: 入口广场、正面台阶前区域和楼梯外侧道路保持开放。
- Camera clearance: `/?start=cinema` 的人物和首帧相机均在建筑及邻近地标实体包络外。
- Road clearance: 不扩大 `localBounds` 侵入新华路和番禺路；入口广场不得被单一大碰撞盒覆盖。

### Runtime budget

- Maximum triangles: 80,000
- Maximum nodes: 8（导出目标 1 个静态合并节点）
- Maximum materials: 14
- Maximum images: 0
- Maximum GLB bytes: 5,500,000
- Animation/skin requirements: none

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Massing | 非对称丝带、椭圆开洞、左鼓体、后塔楼层级 | canonical 轮廓 | 入口街景可识别 | Passed |
| Identity | 开洞玻璃、右侧楼梯、左冠部、入口柱列和字标 | 三项身份构件清晰 | 游戏距离可读 | Passed |
| Materials | 暖白实体、青灰玻璃、暖光入口 | 透明与阴影正常 | 无黑面或过曝 | Passed |
| Site | 台阶、广场分缝、花池和少量街道构件 | 建筑落地 | 入口开放 | Passed |
| Collision | 拆分主体实体与开放广场 | 无大盒封场 | 人物/相机可达 | Passed |
| Optimization | 合并静态节点、共享材质 | 无语义丢失 | GLB 预算通过 | Passed |

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
- [x] Skin/animation pass when applicable

### Three.js

- [x] Start preset loads
- [x] Canonical direction reproduced
- [x] Ground contact and orientation pass
- [x] Player and camera collision pass
- [x] Entrances and public paths remain reachable
- [x] Browser console has no new application errors
- [x] First-screen loading behavior passes
- [x] Performance comparison recorded

## Decision Log

### Iteration 0 — 2026-07-21

- Changes: 完成本地参考照片、专项 manifest、canonical 视角和质量合同；尚未修改生成器。
- Evidence used: 上海市文旅推广网 / SHINE 正面与楼梯照片、澎湃新闻街景、中国日报网正面近景、OSM way `292250766`。
- Blender result: Pending
- GLB result: 旧版基线为 1 node、13 materials、0 images、4,601,408 bytes；结构审计通过但视觉未通过。
- Runtime result: 旧版截图把主体显示成对称椭圆鼓，右侧开洞、丝带高低变化、楼梯汇合和前后层级均不足。
- Remaining inference: 精确曲面尺寸、背面与屋顶连接。
- Performance impact: Pending
- Rollback point: Git commit `e292fde` 中的旧版 `build_shanghai_cinema()` 与现有 GLB/Blend。

### Iteration 1 — 2026-07-21

- Changes: 以非对称连续丝带替换旧版对称椭圆筒；补齐右侧椭圆开洞、洞内玻璃、宽弧形楼梯、左侧玻璃鼓体与格栅冠部、内退门厅、柱列和后塔楼；将关键调整保存在确定性生成器中。
- Evidence used: canonical 正面照片确定左右层级和屏幕占比，楼梯细节照片校正右侧起步与二层汇合关系。
- Blender result: headless Blender 5.2 成功生成 792 个源构件，并输出 canonical、侧向和街平视角；可编辑 `.blend` 已保存。
- GLB result: 1 node、1 mesh、12 materials、12 primitives、77,964 triangles、0 images、5,412,320 bytes；边界为 `X -19..19`、`Y -0.06..15.81`、`Z -11.8..14.2`，结构审计通过。
- Runtime result: `/?start=cinema` 首帧能完整显示正面丝带、开洞、右侧楼梯、左鼓体和后塔楼；建筑横向约占 1767×907 验收画面的 60%，人物与首层门厅尺度关系合理；页面资源清单确认实际请求 `/models/xinhua-road/shanghai-cinema.glb?v=20260721-cinema-4`。
- Remaining inference: 曲面控制点、背面连接和塔楼精确分格仍为照片约束下的风格化近似，不宣称测绘级复原。
- Performance impact: GLB 从旧版 4,601,408 bytes 增至 5,412,320 bytes，增加 810,912 bytes（17.6%），仍低于 5.5 MB 合同上限；当前页面的 Chrome `Performance.getMetrics` 为 521 DOM nodes、13 layouts、86 style recalculations、约 127.3 MiB JS heap used。旧版未保留可比 FPS 基线，因此不伪造前后帧率结论；本轮在稳定页面实测 2.03 秒内 60 帧，约 29.5 FPS。未发现来自应用页面的新错误，唯一 error 事件来自 Chrome 扩展自身的 `unload` Permissions Policy 提示，不归因于项目代码。
- Verification: `npm test` 84/84 通过，`npm run lint` 通过，GLB 专项审计状态为 `ok`。
- Rollback point: 生成器仍可按单一资产重新生成；本轮产物 SHA-256 为 `f16ec7dfe499cf1de18a6f54754240d36a88deed94df6c92fb0c9cfb34ae6b61`。
