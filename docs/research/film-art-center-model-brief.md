# Blender Model Brief: Shanghai Film Art Center — Xinhua 200

## Scope

- Asset slug: `film-art-center`
- POI / environment / character: POI landmark，上海电影艺术中心中的新华路200号历史花园住宅“新华两佰”
- Runtime component: `app/scene/xinhua-road-landmarks.tsx`
- Generator: `scripts/create_xinhua_road_models.py`
- Editable source: `assets/models/source/xinhua-road/film-art-center.blend`
- Runtime GLB: `public/models/xinhua-road/film-art-center.glb`
- Start preset: `/?start=film-art`
- Out of scope: 新华路160号上海影城、CHAO酒店主体和完整四栋建筑群

## Evidence

### Reference photos

| Local path | Source URL | View direction | Capture/publish date | Usage boundary |
| --- | --- | --- | --- | --- |
| `docs/research/assets/poi-references/film-art-center/film-art-center-government-front-canonical-2024.jpg` | [上海市长宁区人民政府](https://www.shcn.gov.cn/col6991/20241120/1271838.html) | 南侧花园正立面，近正视 | Published 2024-11-18 | Research only |
| `docs/research/assets/poi-references/film-art-center/film-art-center-citynews-front-detail-2026.png` | [City News Service / shanghaigov](https://www.citynewsservice.cn/articles/cns/city-news/journey-through-time-and-style-explore-historic-buildings-along-xinhua-road-gno57axm) | 南侧花园正立面，略偏右 | Published 2026-03-19 | Research only |
| `docs/research/assets/poi-references/film-art-center/film-art-center-prnewswire-entrance-detail-2024.jpg` | [FOD / PR Newswire](https://www.prnewswire.com/apac/news-releases/fod-and-shanghai-film-art-center-debut-as-cultural-hub-amidst-26th-shanghai-international-film-festival-302175363.html) | 南入口近景 | 2024-06 | Research only |

完整原图 URL、SHA-256、发布者和搜索记录见 `docs/research/film-art-center-reference-manifest.json`。

### Canonical comparison view

- Local path: `docs/research/assets/poi-references/film-art-center/film-art-center-government-front-canonical-2024.jpg`
- Direction: 从南侧草坪向北近正视；Blender 中从本地 `-Y` 朝 `+Y` 观察。
- Why selected: 修缮后照片同时显示完整屋顶、三层立面、双层敞廊、中央入口、草坪退界和两侧低层连接体，能约束“看起来小”究竟来自体量、开敞度还是机位。
- Runtime camera reproduction: 使用 `/?start=film-art`，人物位于南侧入口路径偏西，镜头正对中央牌匾；建筑主体应占画面宽度约 55%–70%，主屋顶四角全部入画。

### Evidence classification

#### Observed

- 新华路200号是上海电影艺术中心四栋建筑之一，修缮后称“新华两佰”；本资产不等同于新华路160号的现代上海影城。
- 主楼南立面严格近对称，呈三层横向展开；当前旧模型的封闭白盒和窄中央门廊不符合照片。
- 顶部是覆盖主体全宽的红色中式大屋顶，瓦垄密集、四角明显起翘，屋脊端部有装饰构件。
- 二层前方是接近全宽的敞廊，白色圆柱支撑红瓦檐，前缘为连续白色栏杆带。
- 首层也有贯穿立面的柱列与深阴影门窗，中央入口略前凸，黑底金字牌匾位于入口上方。
- 三层为实墙与开口结合：中央是内退的大开口/凉廊，两侧各有深色竖窗和较宽横窗。
- 中层红瓦檐下可见连续深色仿斗拱/挂落节奏；白墙、红瓦、深色窗框形成最强色彩识别。
- 南入口台阶两侧有西式写实卧狮；正面有直线路径、草坪和低矮修剪灌木。
- 修缮后的场地左右可见低矮深色玻璃连接空间，但它们不应抢过历史主楼。

#### Inferred

- 公开资料未提供测绘尺寸；模型继续沿用当前约 `18.8` 场景单位的主体屋檐宽度作为街区视觉基线，但将宽度分配给全宽敞廊和主屋顶，而不是窄门廊与小上盖。
- 主楼主体仍以约 `19.2` 单位屋檐宽为基线；加入两侧低玻璃连接体和前院后，最终可见包络为 `23.11 × 17.95 × 14.40` Blender/场景单位。这是照片比例与现有运行时兼容下的视觉尺度，不宣称等同实测米数。
- 楼层高度、柱距和窗格数按照片节奏风格化归纳；正面以 7 个主开间和中央 3 开间入口组织，不追求逐根测绘复刻。
- 长排玻璃房在当前 POI 中只保留为左右低矮连接体和场地暗示，不扩展成完整商业/酒店建筑群。
- 背面、室内楼梯和侧立面不可见部分采用低细节实体补全，避免从正面证据虚构复杂构件。

#### Unknown

- 主楼精确长、宽、高、柱距、屋面坡度和瓦片模数。
- 东西侧完整立面、北立面、屋顶航拍和修缮前后内部空间连接方式。
- 两侧玻璃房与主楼、CHAO酒店和上海影城之间的精确产权边界与结构连接。
- 牌匾字体的授权范围；运行时仅以通用几何文字表达地点名称，不复制品牌图形。

## Quality Contract

### Identity

- Silhouette: 横向舒展的三层白色主楼，上部全宽红瓦大屋顶，中层红瓦敞廊檐形成第二条强水平线。
- Signature cue 1: 全宽红色中式歇山/庑殿式大屋顶、密集瓦垄和四角起翘。
- Signature cue 2: 首层与二层连续白色柱列、深廊阴影和二层白色栏杆带。
- Signature cue 3: 三层中央内退凉廊，两侧深色窗组构成的对称节奏。
- Signature cue 4: 黑底金字入口牌匾、中央深色门扇与成对卧狮。
- Details intentionally omitted: 不可见背立面精装、室内陈设、活动设备、品牌 logo、酒店和现代影城主体。

### Geometry

- Main body: 三层分层体块，不再用单一高盒体承载所有立面。
- Verandas: 首层和二层均建立真实退进空间、柱列、梁带与栏杆，确保侧向也能读出廊深。
- Roofs: 中层连续红瓦檐 + 顶部全宽大屋顶；瓦垄、正脊、角脊和起翘端部在 canonical 距离可读。
- Facade: 七开间对称节奏，中央入口与三层凉廊加深，门窗保持深色内退。
- Site: 南侧直线路径、草坪、灌木与两侧低矮玻璃连接体；不把草坪做成实体建筑碰撞。
- Rear/side: 证据不足处只保留低细节墙体、窗格和屋檐连续性。

### Position

- Coordinate source: 现有 `address-and-osm-building` 落点与新华路200号地址关系；Nominatim 未返回独立要素，Overpass 本轮也未取得可用轮廓。
- Scene position: `[47.5, 81.5]`
- Confidence: 地址与场地相对关系为中；建筑精确中心和占地尺寸为低到中，不宣称测绘级。

### Scale

- Known dimensions: 无公开测绘尺寸。本轮动工前 HEAD 版 GLB 外包宽约 `18.81` 场景单位，运行时 `scale=0.92`，为 49,360 triangles、3,128,820 bytes。更早的 2026-07-17 细节升级基线为 23,324 triangles、1,323,844 bytes，见 `docs/research/model-detail-baseline.json`。新版主楼屋檐宽约 `19.2`，运行时 `scale=1.0`，完整可见包络为 `23.11 × 17.95 × 14.40`。
- `1 scene unit = 2.7 m` conversion: 新版完整可见包络约对应 `62.4 × 48.5 × 38.9 m`；其中宽度包含左右低层连接体，进深包含前院路径与草坪，高度包含风格化屋脊，因此只能用于街区视觉一致性，不能当作建筑实测尺寸。
- Allowed visual multiplier: 初始整体 scale 控制在 `0.96–1.04`；优先修正横向展开、屋顶占比、廊深和 start preset，禁止仅靠无依据放大掩盖体块错误。

### Orientation

- Blender front direction: local `-Y`
- Runtime rotation: `2.761592653589793` radians
- Canonical view direction: 南侧花园向北，运行时从建筑正前略偏西观察。

### Materials

- Opaque: 暖白/象牙白墙柱和栏杆、朱红低饱和屋瓦、浅灰石材台阶。
- Glass: 深青灰窗玻璃和两侧连接体玻璃；保持深阴影，不做镜面蓝玻璃。
- Metal: 暗铜/深灰排水、门五金和灯具。
- Emissive: 入口暖光与灯笼仅作弱发光点，不照亮整面墙。
- Project palette mapping: 保持低饱和暖灰街区语言；红瓦是主体唯一大面积高色相构件。

### Collision and access

- Solid obstacles: 主体后退墙体一块，左右实体侧翼按实际占地拆分；入口台阶和草坪不纳入大碰撞盒。
- Walkable areas: 中央路径、草坪前缘、入口台阶前和两侧开放通道保持可达。
- Camera clearance: `/?start=film-art` 人物和首帧相机位于南侧草坪/路径，不进入屋檐和树冠。
- Road clearance: 新 localBounds 不侵入新华路；两侧低玻璃连接体只作为视觉边界，不封闭整个院落。

### Runtime budget

- Maximum triangles: 90,000
- Maximum nodes: 8（目标 1 个静态合并节点）
- Maximum materials: 14
- Maximum images: 0
- Maximum GLB bytes: 6,300,000
- Animation/skin requirements: none

### Build provenance

- Single-asset build command: `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_xinhua_road_models.py -- --asset=film-art-center`
- Build record: `docs/research/build-records/film-art-center.json`
- Three-way comparison: `test_artifacts/test_film-art-center_three-way-comparison.png`，从左至右为参考照片、Blender canonical、Three.js runtime。
- Runtime cache version: `20260722-film-art-4`，与 GLB SHA-256 `e4887f6d87771616bd0e57305c5e577dab6040bdc05d70b6aa19ffe3d39b0de6` 绑定。

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Massing | 三层横向体块、中层檐、全宽主屋顶和真实廊深 | canonical 轮廓与照片宽高比 | 主体不再像窄高盒子 | Complete |
| Identity | 双层柱廊、栏杆、中央凉廊、入口牌匾和卧狮 | 四项身份构件清晰 | 游戏距离仍可辨识 | Complete |
| Materials | 暖白墙柱、朱红屋瓦、深窗与暖入口 | 阴影层次与红瓦不过饱和 | 无黑面、透明排序或过曝 | Complete |
| Site | 草坪、路径、灌木和低玻璃连接体 | canonical 场地关系 | 入口路径开放 | Complete |
| Collision | 主体实体与开放院落分离 | 无大盒封场 | 人物与相机可达 | Complete（实际首屏 + 数据与自动测试） |
| Optimization | 合并静态节点、共享材质 | 轮廓与材质语义不丢失 | GLB 预算通过 | Complete |

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
- [x] Skin/animation not applicable
- [x] Build record matches current GLB SHA, bounds and cache version

### Three-way comparison

- [x] Reference / Blender / Three.js artifact saved with a `test_` name
- [x] Canonical silhouette, player scale and runtime framing remain readable

### Three.js

- [x] Start preset loads
- [x] Canonical direction reproduced
- [x] Ground contact and orientation pass
- [x] Player and camera collision pass（数据与专项几何测试）
- [x] Entrances and public paths remain reachable（数据与专项几何测试）
- [x] Browser console has no new errors
- [x] First-screen loading behavior passes
- [x] Performance comparison recorded

最终 Three.js 实机验收已通过，详细证据如下。

- Runtime: Chrome 可见标签页以静态发布预览打开 `/?start=film-art`；`1200 × 807` 首帧使用 `[35,99]`、`[0.581,-0.814]`、`cameraTargetHeight=3.6` 和 `scale=1.0`。
- Visual: 主体约占画面宽度七成，主屋面、连续翘檐、双层柱廊、入口、卧狮与两侧低翼完整可读；方向为 canonical 近正视。最终截图为 `test_artifacts/test_film-art-center_runtime_preview.png`。
- Loading: 实际请求 `film-art-center.glb?v=20260722-film-art-4`，解码 `4,082,744` bytes、传输 `4,083,044` bytes，Resource Timing 为 `120.3 ms`。
- Performance: 可见标签页连续 3 秒采样 `181` 帧，平均 `59.99 FPS`；JS heap used `78,822,172` bytes、total `138,002,432` bytes。
- Console: error 为 `0`；只有项目既有的 `THREE.Clock` 与 `PCFSoftShadowMap` deprecation warning。
- Collision: 实际画面与专项测试共同证明出生点、相机和中央入口路径没有进入三块碰撞体；Browser 不支持连续原始 key-down/key-up，因此未把合成长按当作证据。

## Decision Log

### Iteration 0 — Research gate and baseline — 2026-07-21

- Changes: 使用 Bocha 检索并以官方页面复核对象边界；将三张可追溯照片本地化，建立专项 manifest、canonical view 和质量合同；尚未修改生成器。
- Evidence used: 长宁区政府修缮后正面、City News Service / 上海交大建筑遗产研究机构署名正面、FOD / PR Newswire 入口近景；千龙网用于确认四栋建筑关系与“新华两佰”命名。
- Blender result: 旧版预览显示为封闭三层白盒、窄中央门廊、深灰小上盖，未通过照片轮廓对照。
- GLB result: 旧版为 1 node、1 mesh、12 materials、49,360 triangles、0 images、3,128,820 bytes；结构审计通过但视觉身份不通过。
- Runtime result: 旧版 `/?start=film-art` 中建筑读取偏小，根因初判是全宽敞廊和大屋顶缺失、门廊过窄及机位偏远，而非单一整体 scale 数字。
- Remaining inference: 精确测绘尺寸、侧后立面和玻璃连接体范围。
- Performance impact: 本轮仅新增研究文件，无运行时影响。
- Rollback point: 当前工作区旧版 `build_film_art_center()`、Blend 与 GLB。

### Iteration 1 — Photo-specific rebuild and asset audit — 2026-07-21

- Changes: 将旧版封闭白盒重建为三层横向主体、双层深廊、连续柱列与栏杆、中央凉廊、全宽红色起翘屋顶、入口牌匾与卧狮；补充前院路径、草坪、灌木和左右低玻璃连接体。运行时整体 `scale` 从 `0.92` 调整为 `1.0`，并把 start preset 移近正面观察位。
- Evidence used: 以政府 canonical 正面约束轮廓和场地，以 City News Service 正面细节约束柱廊与门窗节奏，以 PR Newswire 入口近景约束牌匾、门扇和卧狮。
- Blender result: 生成器 Headless 成功；保存可编辑 `.blend`，并输出 canonical、side、street-level 和通用 preview 四张验收图。最后一轮移除悬空角脊、将排水管贴回立面，并缩短前院草坪/路径，避免视觉包络进入机动车道。
- GLB result: 1 node、1 mesh、14 materials、63,948 triangles、0 images、4,113,008 bytes；根变换、包围盒和禁嵌参考图审计通过。独立审查后修正入口中文牌匾的水平镜像并重新生成全部产物，该轮 SHA-256 为 `1ba15a92d9eee767ad30d73b502709b7dad87418d12276d1448c6930c062f752`，后续由 Iteration 4 的屋檐连续性修复产物替代。
- Runtime result: `localBounds` 更新为 `x[-11.555, 11.555] / z[-6.725, 11.225]`，碰撞拆为主楼及左右侧翼三块，中央路径与前院保持开放；专项 16 项自动测试、仓库全量 86 项测试和 ESLint 全部通过。本地开发服务器的快速定位 URL 与 GLB 资源均返回 `200`；实际浏览器画面、控制台和首屏性能仍待可用浏览器自动化环境复核。
- Remaining inference: 精确测绘尺寸、侧后立面和两侧连接体范围；当前屋顶转角和屋脊为低多边形风格化表达。
- Performance impact: 本轮直接由 HEAD 版 49,360 triangles 增至 63,948（1.296×），GLB 由 3.13 MB 增至 4.11 MB；若按项目 2026-07-17 历史细节基线 23,324 triangles 计算，长期提升为 2.742×。最终仍低于 90,000 triangles、6.3 MB、8 nodes 的预算。
- Rollback point: 修改前 GLB SHA-256 及旧生成逻辑可由 Git 工作区基线恢复；本轮未提交或推送。

### Iteration 2 — LLM Wiki ingestion and retrieval audit — 2026-07-22

- Changes: 将 `docs/knowledge-sources/film-art-center-modeling-evidence.md` 复制到 Wiki 的 `raw/sources/derived/wander-xinhua/`，源文件与目标文件 SHA-256 均为 `1d6b34b2344333de2274d82db82e32bb5275d62be866a2ce95cfa01124d2b807`；启动 LLM Wiki 0.6.4 并执行 Source Rescan。
- Queue result: 目标任务 `ingest-1784650138620-rulijg` 由 `processing` 完成并从 ingest 队列移除；未手工改写队列。
- Retrieval result: 关键词“新华两佰 上海电影艺术中心 双层柱廊 红瓦屋顶 运行时碰撞”命中 `上海电影艺术中心边界参照`、`新华两佰历史花园住宅`、`新华两佰建筑尺寸与非南立面信息待核验`、方法页和来源摘要；读取对象页与来源摘要后，Observed / Inferred / Unknown 和对象边界均与仓库原始证据一致。
- Graph result: `新华两佰历史花园住宅`、方法页和来源摘要均进入关系图并各保留 4 条关联；关系图查询返回对应节点，页面 frontmatter 的 `related` 链接可回溯到来源摘要。
- Remaining work: LLM Wiki 闭环已通过；Three.js 实际画面、console、碰撞/可达性、首屏加载和性能仍待浏览器验收。

### Iteration 3 — First Three.js framing audit, superseded after review — 2026-07-22

- Changes: 保持模型 `scale=1.0`，不以缩小资产解决构图；将 start preset 从 `[32,88.5]` 拉回 `[28,90]`，再把 `cameraTargetHeight` 从 `2.4` 提高到 `3.6`，让大屋顶上沿进入画面并保留两侧低翼。
- Visual result: `1280 × 720` 实际首帧中主体约占画面宽度七成，主屋顶、双层柱廊、中央入口、卧狮、草坪和左右连接体可读；但独立复核确认镜头仍是明显侧前视，不足以证明 canonical 近正视，因此该截图被判定为中间产物。
- Loading result: 浏览器实际请求 `film-art-center.glb?v=20260721-film-art-3`；解码体积 `4,113,008` bytes，热缓存 Resource Timing 为 `98.1 ms`。首屏进入游玩态后模型正常显示，无空白、黑面或悬空。
- Console result: error 为 `0`；只记录项目已有的 `THREE.Clock` 和 `PCFSoftShadowMap` 废弃警告，本轮未引入新错误。
- Performance result: 可见标签页连续 3 秒为 `182` 帧，平均 `60.38 FPS`；Performance metrics 记录 JS heap used `89,788,644` bytes、total `131,137,536` bytes。
- Collision/access result: 实际首屏确认人物和镜头位于南侧开放路径；专项几何测试验证起点、相机、中央路径均避开主楼与左右侧翼三块碰撞体。Browser 不支持连续原始按键注入，因此未把合成长按当作证据。
- Remaining inference: 精确测绘尺度、侧后立面、两侧连接体产权与完整结构关系仍未知，不因运行时通过而升级为已观察事实。

### Iteration 4 — Roof continuity and canonical camera correction — 2026-07-22

- Review finding: canonical、side 和 street 预览中的四角棕色横杆与屋面脱离；旧运行时镜头为大角度侧前视。两项都与质量合同和先前“已通过”的文字结论矛盾。
- Geometry fix: 删除中层和主屋顶额外叠加的 4 个独立 `add_box` 翘角杆件；保留 `add_upturned_hip_roof()` 曲面自身连续抬升的檐线和随曲面铺设的瓦垄。重新生成后 canonical 与 side 预览不再出现悬空构件。
- GLB result: 570 个源对象合并为 1 个运行时节点；1 mesh、14 materials、63,516 triangles、0 images、0 textures、`4,082,744` bytes；SHA-256 为 `e4887f6d87771616bd0e57305c5e577dab6040bdc05d70b6aa19ffe3d39b0de6`，结构审计状态 `ok`。
- Camera fix: 保持 `scale=1.0`，将最终候选设为 `start=[35,99]`、`forward=[0.581,-0.814]`、`cameraTargetHeight=3.6`。人物到建筑中心约 `21.51` 场景单位，与 canonical 正向夹角约 `13.7°`；专项测试验证人物与后退 `7.4` 单位的首帧相机均避开所有地标碰撞。
- Runtime result: Chrome 可见标签页以静态发布预览完成最终 canonical 近正视验收；截图已覆盖保存为 `test_artifacts/test_film-art-center_runtime_preview.png`。
- Loading result: 最终 GLB 实际传输 `4,083,044` bytes，解码 `4,082,744` bytes，加载耗时 `120.3 ms`。
- Console/performance result: console error 为 `0`；3 秒 `181` 帧，平均 `59.99 FPS`。最终 Three.js gate 关闭。
