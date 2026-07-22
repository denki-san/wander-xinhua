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
| `docs/research/assets/poi-references/shanghai-cinema/shanghai-cinema-government-front-wide-2023.jpg` | [长宁区人民政府](https://www.shcn.gov.cn/col314/20230531/1237444.html) | Front wide | 2023-05-31 | Research only |
| `docs/research/assets/poi-references/shanghai-cinema/shanghai-cinema-government-front-right-stair-2023.jpg` | [长宁区人民政府](https://www.shcn.gov.cn/col314/20230531/1237444.html) | Front-right ground level | 2023-05-31 | Research only |
| `docs/research/assets/poi-references/shanghai-cinema/shanghai-cinema-archina-ribbon-glass-detail-2024.jpeg` | [ARCHINA / 华建集团上海院空间结构院幕墙所](https://www.archina.com/index.php?g=works&m=index&a=show&id=156570) | Right side looking toward front | 2024-03-19 | Research only |
| `docs/research/assets/poi-references/shanghai-cinema/shanghai-cinema-archina-oculus-stair-detail-2024.jpeg` | [ARCHINA / 华建集团上海院空间结构院幕墙所](https://www.archina.com/index.php?g=works&m=index&a=show&id=156570) | Left side looking toward front | 2024-03-19 | Research only |
| `docs/research/assets/poi-references/shanghai-cinema/shanghai-cinema-archina-project-image-06-2024.png` | [ARCHINA / 华建集团上海院空间结构院幕墙所](https://www.archina.com/index.php?g=works&m=index&a=show&id=156570) | Design model, front three-quarter | 2024-03-19 | Design intent only |
| `docs/research/assets/poi-references/shanghai-cinema/shanghai-cinema-archina-project-image-07-2024.png` | [ARCHINA / 华建集团上海院空间结构院幕墙所](https://www.archina.com/index.php?g=works&m=index&a=show&id=156570) | Facade section | 2024-03-19 | Construction evidence only |

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
- 右侧建成照片显示，正面弧形楼梯之后不是继续闭合的椭圆外壳，而是沿建筑侧向延伸的长条玻璃商业界面；其上方有深白色悬挑露台、透明栏板和更平直的上部体量。
- 左侧建成照片显示，首层/二层玻璃界面沿侧向继续延伸，外侧有连续抬高花池和室外平台；白色挑檐在侧面明显比正面丝带更平直。
- ARCHINA 项目正文明确把主入口白色曲面定义为 GRC 飘带幕墙，并说明它与玻璃幕墙、旋转楼梯存在多处交接；施工剖面也显示 GRC 表皮与主体楼板之间有空腔，因此它不是一整层厚重实体楼板。
- ARCHINA 项目正文记录 GRC 单块面积控制在约 10 平方米，横向分格约 2.3 米、竖向约 5.1 米；当前模型的 58 条密集竖缝偏离该节奏。
- Hermes 第一轮标记为“西侧”的长宁区政府与界面候选经目视确认均为上海电影艺术中心，已在专项 manifest 中标记 rejected，不进入建模判断。

#### Inferred

- OSM way `292250766` 的约 111 × 120 米外包范围包含整座影城综合体及后部塔楼，不能直接当作前景丝带的矩形尺寸。
- 为保持当前道路退界和 POI 碰撞兼容，模型外包络继续控制在约 `38 × 26` 场景单位内；前景主体应比后塔楼更宽、更靠街道。
- 正面丝带的最高点约为首层大厅高度的 2.1–2.4 倍，右侧开洞高度约占丝带高度的 45%。
- 楼梯踏步和玻璃栏板采用运行时可读的节奏化简，不追求测绘级踏步数量。
- 背面和内部影厅体量以不抢正面轮廓的低细节实体补全。
- ARCHINA 的两张侧向建成照片缺少明确罗盘方向；本 Brief 按 canonical 正面左右关系将楼梯所在一侧记为右侧、无楼梯且带长景观带的一侧记为左侧。
- 侧面商业界面的内部功能和开门位置不可确认，只保留玻璃节奏、悬挑、栏板和平台层级。

#### Unknown

- 2023 改造后的精确建筑测绘尺寸、曲面控制点和板缝模数。
- 主丝带背面、屋顶机电和后部塔楼与主楼的精确连接关系。
- 真正后立面、屋顶/航拍、楼梯背面和夜景实拍；Hermes 多轮 `web_search + web_extract` 后仍未找到可信公开照片。
- 夜间立面灯光控制、所有门扇数量和幕墙分格的完整施工图。

## Quality Contract

### Identity

- Silhouette: 非对称双层白色丝带横向展开；左侧抬起、右侧被椭圆开洞切穿，后塔楼退居背景。
- Signature cue 1: 右侧横向椭圆开洞及洞内退后的弧形玻璃幕墙。
- Signature cue 2: 沿右侧弧面上升、与白色丝带汇合的宽旋转楼梯及透明栏板。
- Signature cue 3: 左侧玻璃鼓体和顶部向外挑出的开放格栅冠部。
- Signature cue 4: 首层内退的通高玻璃大厅、细白柱列和横向大台阶。
- Details intentionally omitted: 内部 LED 影像内容、SHO 商标图形、不可见机电、不可证实的背面装饰。

### Geometry

- Front: 保留非对称 GRC 飘带、右侧椭圆开洞、内退玻璃大厅、柱列和连续台阶。
- Right side: 增加长条玻璃商业界面、深白色悬挑露台、透明栏板、平直上部体量，并让正面楼梯在侧向真实汇合。
- Left side: 增加连续侧向玻璃、深挑檐、室外平台与抬高景观带；不再让椭圆玻璃内核直接充当完整侧立面。
- Facade thickness: GRC 飘带保持薄表皮与背后玻璃之间的可读空腔，不把开洞周围建成厚实体楼层。
- Panel rhythm: 将竖向分格从 58 条降到接近 2.3 米证据节奏，并增加少量横向分段，不追求施工板块逐块复刻。
- Rear/roof: 证据不足，只保留低细节后勤体量和 canonical 可见的背景高层，不增加虚构屋顶细节。

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

- Maximum triangles: 90,000
- Maximum nodes: 8（导出目标 1 个静态合并节点）
- Maximum materials: 14
- Maximum images: 0
- Maximum GLB bytes: 6,300,000
- Animation/skin requirements: none

### Build provenance

- Single-asset build command: `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_xinhua_road_models.py -- --asset=shanghai-cinema`
- Build record: `docs/research/build-records/shanghai-cinema.json`
- Three-way comparison: `test_artifacts/test_shanghai-cinema_three-way-comparison.png`，从左至右为参考照片、Blender canonical、Three.js runtime。
- Runtime cache version: `20260721-cinema-7`，与 GLB SHA-256 `c4d557038677c9c48577636843fb784b496f4a92fc9ea6bbb1d5ca78e822c062` 绑定。

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Massing | 非对称丝带、椭圆开洞、左鼓体、后塔楼层级 | canonical 轮廓 | 入口街景可识别 | Passed |
| Identity | 开洞玻璃、右侧楼梯、左冠部、入口柱列和字标 | 三项身份构件清晰 | 游戏距离可读 | Passed |
| Materials | 暖白实体、青灰玻璃、暖光入口 | 透明与阴影正常 | 无黑面或过曝 | Passed |
| Site | 台阶、广场分缝、花池和少量街道构件 | 建筑落地 | 入口开放 | Passed |
| Collision | 拆分主体实体与开放广场 | 无大盒封场 | 人物/相机可达 | Passed |
| Optimization | 合并静态节点、共享材质 | 无语义丢失 | GLB 预算通过 | Passed |

### Iteration 2 batch plan

| Batch | Deliverable | Evidence | Status |
| --- | --- | --- | --- |
| Side massing | 左右两条玻璃侧翼、挑檐、平台和上部平直体量 | ARCHINA 两张建成侧照 | Passed |
| Facade logic | GRC 薄表皮空腔、楼梯交接和真实分格节奏 | ARCHINA 设计模型、剖面与项目正文 | Passed |
| Site | 左侧长花池、右侧露台边界与侧向开放通道 | 建成侧照 | Passed |
| Validation | 新增左右侧固定机位与 Three.js 侧向对照 | 本地照片和 `?start=cinema` | Passed |

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
- [x] Build record matches current GLB SHA, bounds and cache version

### Three-way comparison

- [x] Reference / Blender / Three.js artifact saved with a `test_` name
- [x] Canonical silhouette, player scale and runtime framing remain readable

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

### Iteration 2 research gate — 2026-07-21

- Changes: 使用 Hermes 已配置的 `web_search` 和 `web_extract` 执行 14 组中英文定向检索，并深挖长宁区政府与 ARCHINA 项目页；新增正面宽景、地面近景、左右侧建成照片、设计模型和幕墙剖面证据。
- Evidence used: 长宁区人民政府 2023 建成照片；ARCHINA / 华建集团上海院空间结构院幕墙所项目页的建成侧照、GRC 设计模型、施工剖面和项目正文。
- Rejected evidence: 两张被搜索结果误标为上海影城西侧的图片实际属于上海电影艺术中心，已本地保留并标记 rejected，未用于结构判断。
- New structural gap: 当前模型把侧面过度概括为椭圆玻璃内核，缺少两条长侧翼、平直挑檐、平台/栏板、侧向景观带；GRC 竖缝也比 2.3 米证据节奏过密。
- Remaining inference: 后立面、屋顶、楼梯背面及背景高层与影城主体的精确产权/连接关系仍不确定。
- Blender / GLB / runtime result: 已完成，详见下一节 Iteration 2 实施记录。

### Iteration 2 — Multi-angle side reconstruction and scale correction — 2026-07-21

- Changes: 新增长玻璃侧翼、平直深挑檐、二层露台栏板、左侧连续花池与楼梯一侧上部实体界面；GRC 表皮厚度从 `0.42` 收薄到 `0.24`，正面竖向分格从 58 条降为 37 条；新增左右侧固定机位。针对“首屏看起来小”的复核，没有整体放大模型，而是将出生点从 `[55, 104]` 收近到 `[57.5, 101]`，并把后塔楼总高从约 `15.81` 校正到 `17.225` 场景单位。
- Evidence used: ARCHINA 两张建成侧照用于左右侧翼、挑檐和平台；项目正文与施工剖面用于 GRC 薄表皮和分格节奏；官方正面照用于约束后塔楼露出主丝带的高度，避免 22% 试调版抢过正面轮廓。
- Blender result: Blender 5.2 Headless 成功生成 856 个源构件并保存可编辑 `.blend`；canonical、side、street、right-side、left-side 共六个固定机位均通过目视质量门。
- GLB result: 1 node、1 mesh、13 materials、83,820 triangles、0 images、5,862,660 bytes；边界为 `X -19..19`、`Y -0.06..17.225`、`Z -11.8..14.2`；SHA-256 为 `c4d557038677c9c48577636843fb784b496f4a92fc9ea6bbb1d5ca78e822c062`，结构和预算审计通过。
- Runtime result: `/?start=cinema` 修正后首屏约占画宽 75%，人物、门厅和台阶比例保持不变；实际页面请求 `/models/xinhua-road/shanghai-cinema.glb?v=20260721-cinema-7`。已保存 `test_shanghai-cinema_runtime_preview.png`、`test_shanghai-cinema_runtime_right-side_preview.png` 和 `test_shanghai-cinema_runtime_left-side_preview.png`；Canvas 为 1、加载态已结束、应用 error 日志为 0。
- Remaining inference: 真正后立面、屋顶、楼梯背面和夜景仍无可信公开实拍，因此只保留低细节后勤体量，不把推断包装成测绘事实。
- Performance impact: 相对 Iteration 1 增加 450,340 bytes（约 8.3%）和 5,856 triangles（约 7.5%），仍低于 6.3 MB、90,000 triangles、14 materials 和 8 nodes 的运行时合同。
- Rollback point: 所有修改均在确定性生成器与版本化数据中；前一轮 GLB SHA-256 为 `bfab43bec90ffb6facd7a50954dc2f592fe460ce7affac8d5d30a090624b93d7`。
