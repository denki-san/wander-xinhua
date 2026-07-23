# Blender Model Brief: Xingfuli

## Scope

- Asset slug: `xingfuli`
- POI / environment / character: 真实 POI 街区与可复用街景环境
- Runtime component: `app/scene/xingfuli-block.tsx`
- Generator: `scripts/create_xingfuli_models.py`
- Editable source: 最终源文件为 `assets/models/source/xingfuli/xingfuli-west.blend`、`xingfuli-center.blend`、`xingfuli-east.blend`；massing、identity、materials 与 site 阶段源文件全部保留。
- Runtime GLB: `public/models/xingfuli/xingfuli-west.glb`、`xingfuli-center.glb`、`xingfuli-east.glb`，缓存版本 `20260723-final-1`。
- Start preset: 产品入口 `xingfuli`；canonical QA `xingfuli-canonical`；水景 QA `xingfuli-pool-detail`；入口 QA `xingfuli-entrance-detail`；英雄视角复核 `hero`
- Single-asset build command: `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_xingfuli_models.py -- --segment=center --stage=massing`
- Validation command: 灰模 `python3 /Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py public/models/xingfuli/xingfuli-center-massing.glb`；最终资产使用无 `-massing` 后缀路径。

## Preflight Gate

- Blender binary and version: `/Applications/Blender.app/Contents/MacOS/Blender`，Blender `5.2.0 LTS`；启动时有非阻塞 `ARCH_CACHE_LINE_SIZE` 警告。
- Generator dry run / affected assets: 新生成器必须要求显式 `--segment` 与 `--stage`；单段命令不得覆盖另外两段。
- GLB audit command: 上述 `audit_glb.py` 已用 `plane-tree-a.glb` 预检通过。
- Local preview command and port: `./test_local_preview.command`，本轮使用 `http://127.0.0.1:3002/`。
- Browser/runtime validation path: `/?start=xingfuli-canonical`、`/?start=xingfuli-pool-detail`、`/?start=xingfuli-entrance-detail`、`/?start=xingfuli` 与 `/?start=hero`，Chrome 实际页面。
- Existing asset, screenshot, collision and performance baseline: 本轮开始时为纯 JSX；基线截图 `test_artifacts/test_xingfuli_baseline_runtime_preview.png`；障碍物来自 `XINGFULI_OBSTACLES`；旧记录为同机 1440×900、390×844 约 60 FPS，但本轮不得把不同条件结果称为提升。
- Fallback path for unavailable tools: Blender MCP 不可用时使用确定性 Blender Python；外部 Wiki 不可用时先写本地知识源并保留同步队列；浏览器插件不可用时用本地 Chrome headless 截图，但最终仍需真实交互浏览器复核。

## Evidence

### Reference photos

完整九张照片、SHA-256、尺寸和来源见 `docs/research/xingfuli-reference-manifest.json`。代表性证据如下：

| Local path | Source URL | View direction | Capture/publish date | Usage boundary |
| --- | --- | --- | --- | --- |
| `docs/research/assets/poi-references/xingfuli/courtyard-canonical.jpg` | `https://k.sina.com.cn/article_7517400647_1c0126e47059031uwk.html` | 中庭沿长轴标准视图 | unknown | Research only |
| `docs/research/assets/poi-references/xingfuli/xingfuli-panyu-entrance-shanghai-changning-2018.jpeg` | `https://www.sohu.com/a/234924710_391448` | 番禺路入口 | 2018-06-10 | Research only |
| `docs/research/assets/poi-references/xingfuli/xingfuli-smartshanghai-01-2021.jpeg` | `https://www.smartshanghai.com/venue/17729/xingfu_li_fanyu_lu` | 中段纵深与水景 | 2021-07-23 | Research only |
| `docs/research/assets/poi-references/xingfuli/xingfuli-smartshanghai-03-2021.jpeg` | `https://www.smartshanghai.com/venue/17729/xingfu_li_fanyu_lu` | 外摆与铺地近景 | 2021-07-23 | Research only |

### View coverage matrix

| Evidence slot | Local photo | Questions answered | Coverage status | Downgrade if missing |
| --- | --- | --- | --- | --- |
| Canonical | `courtyard-canonical.jpg` | 主巷轮廓、建筑带、水景和外摆占比 | Covered | 不适用 |
| Side / oblique | `xingfuli-smartshanghai-01-2021.jpeg` | 悬挑、阳台、玻璃体量、木格栅纵深 | Covered | 未见背面保持低细节 |
| Entrance / identity detail | `xingfuli-panyu-entrance-shanghai-changning-2018.jpeg` | 黑白入口体量、右侧矩阵墙、树与石桩 | Covered | 不复制品牌文字与图标 |
| Site relationship | `xingfuli-smartshanghai-03-2021.jpeg` | 混合灰石铺地、红色悬臂伞与多类桌椅 | Covered | 设施间距按通行净空保守设置 |

### Canonical comparison view

- Local path: `docs/research/assets/poi-references/xingfuli/courtyard-canonical.jpg`
- Direction: 中庭沿长轴，运行时先按本地 `+X` / 番禺路入口方向复现；绝对方向属于有依据推断，灰模阶段以两侧立面顺序核对。
- Why selected: 同时覆盖连续建筑带、主巷尺度、水景、池中树和外摆，是身份密度最高且已有历史基线的视图。
- Runtime camera reproduction: `/?start=xingfuli-canonical` 固定在本地 `x=4, z=-7`，面向本地 `+X`；相机目标为角色眼高，长轴偏差 `0°`。

### Evidence classification

#### Observed

- 园区是连接幸福路与番禺路的一字型开放街巷，公开报道和 OSM 均支持东西向狭长关系。
- 两侧主体的可见主色为白、银灰、深灰、红砖、木色和蓝灰玻璃。
- 中段存在长条浅水景、池中树、石景、跨水木桥和临水外摆。
- 番禺路入口由黑白体量、白色矩阵墙、成熟乔木、灰石铺地和深色矮方石桩共同构成。
- 铺地是多尺寸矩形灰石的顺长轴错缝组合，不是高对比横向明暗条纹。
- 外摆至少包含红色侧柱悬臂伞、白色圆桌与塑料椅、深色木/金属桌椅和彩色折叠椅。

#### Inferred

- 七栋体量与 `xingfuli-layout.json` 方位 ID 的一一对应由 OSM 轮廓、照片顺序和当前运行时共同推断，不等同于真实楼座编号。
- 主巷 canonical 运行时先映射为本地 `+X`；若灰模对照发现左右立面顺序相反，只调整比较机位，不把未经证实的朝向写成事实。
- 公开照片中的人物、门、桌椅和铺地模块用于视觉尺度校准，非测绘尺寸。

#### Unknown

- 七栋建筑的背立面、完整屋顶机电和不可见连接部位。
- 2026 年店铺租户、标志、墙绘和外摆是否已变化。
- 施工图级层高、开间、池深和铺石精确规格。

## Quality Contract

### Identity

- Silhouette: 两侧不等高连续建筑带围合一条窄长步行巷，中段水景形成明显横向留白，东西入口有不同端景。
- Signature cue 1: 北侧白色连续悬挑/阳台带与黑框细窗。
- Signature cue 2: 南侧灰白大玻璃体量、木格栅店面与红砖竖向窗体形成三种不同店面节奏。
- Signature cue 3: 长条水景、池中梧桐、木桥与沿池外摆共同构成中庭核心。
- Signature cue 4: 番禺路黑白入口、白色矩阵墙、树阵和深色矮方石桩组合。
- Details intentionally omitted: 品牌 logo、可读店名、受保护墙绘、未被照片证明的背面装饰与屋顶设备。

### Position

- Coordinate source: OSM way `400066625` 与 `app/scene/xinhua-map-data.json`。
- Scene position: `[106.6662, 12.9045]`，rotationY `2.997763`，番禺路端退让 `4.1` 地图单位。
- Confidence: 场地中心、长轴和道路关系高；单栋细分中等。

### Scale

- Known dimensions: OSM 主轴 `147.7 m`；当前本地模型长 `94`，主巷建筑净距约 `12` 本地单位。
- `1 scene unit = 2.7 m` conversion: 地图层为 `2.7 m/scene unit`；幸福里另有 X `0.538281`、Y `1.5`、Z `0.581898` 的非均匀变换，因此 Blender 本地尺寸不能绕过运行时直接宣称物理米数。
- Allowed visual multiplier: 固定 OSM 占地不变；灰模只允许在建筑本地高度、退台深度和店面层高上做证据驱动调整，canonical 画面宽度占比偏差目标 `≤10%`。

### Orientation

- Blender front direction: 主巷侧立面朝本地 `-Y` 或 `+Y`；导入 Three.js 后对应 `+Z` / `-Z`。
- Runtime rotation: `2.997763 rad`。
- Canonical view direction: 沿本地 `+X` 作为首轮复现假设，必须在灰模比较记录中确认。

### Framing

- Target screen-width occupancy: 主巷两侧内缘合计占画面宽度 `55%–75%`，远端端景可见。
- Maximum canonical direction deviation: `8°`。
- Required visible edges / roof extents: 至少看见两侧首层店面、北侧悬挑/阳台、水景池沿和一处屋顶轮廓；不要求看见完整背面。
- Player-to-door and player-to-storey scale check: 门净高视觉约角色身高 `1.15–1.35×`；栏杆约角色腰到胸口；三层建筑不得呈现超高写字楼比例。
- Camera target height and clearance: 目标为角色眼高；相机不得穿过伞面、树冠、悬挑和玻璃店面。

### Materials

- Opaque: 暖白抹灰、冷灰金属、炭灰框、红砖、浅/深木、三档灰石铺地。
- Glass: 低饱和蓝灰，透明度服从项目 toon 风格并避免黑块。
- Metal: 街灯、窗框、伞臂和桌椅脚统一深炭灰。
- Emissive: 只给灯具小面积暖光，白天不形成大面积发光面。
- Project palette mapping: 延续现有暖灰、低饱和青绿与珊瑚红；禁止照片贴图和品牌材质。

### Collision and access

- Solid obstacles: 建筑主体、池体、入口固定墙和必要花箱；沿用结构化简化盒，不从可视网格自动生成。
- Walkable areas: 主巷、两入口、池两侧、木桥和店面前至少保留一个连续路线。
- Camera clearance: 伞、灯杆、树冠不扩大角色阻挡；只有底座/树干进入简化碰撞。
- Road clearance: 番禺路端保持 `4.1` 退让，不让铺地、墙体和街具压入机动车道。

### Runtime budget

- Maximum triangles: 三段合计 `180,000`，单段 `70,000`。
- Maximum nodes: 单段 `12` 个渲染节点。
- Maximum materials: 三段共享 `12` 种以内。
- Maximum images: `0`；参考照片绝不嵌入 GLB。
- Maximum GLB bytes: 单段 `4 MB`，三段合计 `10 MB`。
- Animation/skin requirements: 无骨骼、无动画；水、喷泉、灯光和植被由运行时负责。

### Build provenance

- Baseline GLB SHA / bounds / metrics: 无 GLB；基线为 JSX 与 `test_artifacts/test_xingfuli_baseline_runtime_preview.png`。
- Expected output paths: `assets/models/source/xingfuli/`、`public/models/xingfuli/`、`test_artifacts/test_xingfuli_*`。
- Build record path: 灰模 `docs/research/build-records/xingfuli-massing.json`；身份构件 `docs/research/build-records/xingfuli-identity.json`；材质 `docs/research/build-records/xingfuli-materials.json`；最终 `docs/research/build-records/xingfuli.json`。
- Cache version rule: 三段任一二进制 SHA 变化时，运行时对应 URL 的 `?v=` 必须同步变更；不得仅改文档版本。

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Massing | 三段灰模、七栋体量、主悬挑、主开口、池与入口墙 | canonical/侧向轮廓与地面接触 | 实际 `?start=xingfuli-canonical` 比例、朝向、道路退界 | Completed |
| Runtime calibration | 三段加载、fallback、机位与粗碰撞 | N/A | 屏占比、角色尺度、相机、主巷/池两侧/桥面连续通行 | Completed |
| Identity | 悬挑阳台、玻璃包角、木格栅、红砖窗体、入口组合 | 六项身份构件同机位可辨识 | 中近景第一眼不再像重复盒子 | Completed |
| Materials | 灰白/红砖/木/玻璃与材质收口 | toon 光照下层次稳定 | 白天无玻璃黑块、无照片贴图 | Completed |
| Site | 混合灰石铺地、水景、桥、树、灯、红伞和三类外摆 | 固定机位构图 | 不阻路，canonical / pool / entrance 三视角可读 | Completed |
| Collision | 建筑、池、入口墙与底座简化障碍 | N/A | 三条确定性 QA 路线走通两入口、池两侧和木桥 | Completed |
| Optimization | 合批、共享资产、分段加载和预算审计 | GLB 预算通过 | 1920×851 可见页 120 帧采样通过，无应用新增 console error | Completed |

每批完成必须更新 `test_` 参考 / Blender / Three.js 三联对照，并记录画面占比、canonical 偏角、裁切、人物尺度和可见身份构件。

## Decision Log

### Iteration 0 — evidence and preflight

- Changes: 新增六张入口、中段、铺地和外摆照片；建立九图 manifest 与完整 Brief。
- Evidence used: 上海长宁/搜狐 2018、SmartShanghai 2021、上海商报/新浪历史三图、OSM way `400066625`。
- Graybox runtime result: 待生成；当前 JSX 基线已在真实 Chrome 中保存。
- Blender result: Blender 5.2.0 LTS 与 headless 入口通过预检。
- GLB result: 审计脚本已用现有梧桐 GLB 预检通过。
- Three-way comparison result: 待 massing。
- Runtime result: 基线加载成功，仅有 Three.js 依赖弃用警告。
- Independent review result: 待 massing checkpoint。
- Remaining inference: canonical 绝对朝向、背立面、屋顶和 2026 店铺状态。
- Performance impact: 尚未实施，不作提升声明。
- Rollback point: 当前纯 JSX `XingfuliBlock`。

### Iteration 1 — three-segment massing

- Changes: 生成 west / center / east 三段可编辑 Blend 和单节点 GLB；运行时替换程序化建筑与整块铺地，保留程序化 fallback、水景、树和街具。
- Evidence used: canonical、SmartShanghai 中段纵深、番禺路入口和铺地/外摆细节图。
- Graybox runtime result: `/?start=xingfuli-canonical` 在 1920×907 可稳定加载；三段方向、地面接触、角色与首层比例、道路退界通过；画面内缘宽度占比约 68%，canonical 偏角 0°。
- Blender result: 三段及 master canonical / side / street 共 12 张 `test_` 预览生成；第一次 side/street 机位被建筑遮挡后已修正固定机位。
- GLB result: 三段共 794,476 bytes、11,088 triangles、3 nodes、0 images；独立 audit 全部 `status=ok`。
- Three-way comparison result: `test_artifacts/test_xingfuli_massing_three-way_preview.png`；灰模仅比较体块、方向和开口节奏，不把尚未进入批次的铺石、水景细节和外摆判作缺失回归。
- Runtime result: 无新增 console error；仅保留既有 `THREE.Clock` 与 `PCFSoftShadowMap` 弃用警告。
- Independent review result: 三轮独立审查已收口；最终复审 `Critical=0`、`Important=0`，允许进入 identity batch。
- Remaining inference: 建筑背面、屋顶设备和店面当前租户；final 继续保持低对比与无品牌。
- Performance impact: 三个 GLB 总计约 0.79 MB；尚未按最终资源组合做同条件 FPS 采样，不声明性能提升。
- Rollback point: `XingfuliProceduralArchitectureFallback`。

### Iteration 2 — identity architecture

- Changes: 三段加入连续窗带、首层玻璃店面节奏、悬挑/阳台边缘、红砖竖向窗体、木格栅与不同屋顶/转角轮廓；灰模文件完整保留，运行时切换到 `-identity.glb`。
- Evidence used: canonical 主巷、SmartShanghai 纵深/玻璃转角、入口与书店照片。
- Blender result: 三段各自 canonical / side / street 与 master 三机位预览已生成；六类身份构件在固定机位可分辨。
- GLB result: 三段共 1,171,132 bytes、16,452 triangles、3 nodes、0 images；独立审计全部 `status=ok`。
- Three-way comparison result: `test_artifacts/test_xingfuli_identity_three-way_preview.png`；真实照片、Blender 固定机位和 1920×907 Three.js 运行时的长轴与首层节奏一致。
- Runtime result: `/?start=xingfuli-canonical` 载入三段 identity，角色/门/楼层尺度、地面接触和 canonical 0° 方向通过；无新增 console error。
- Remaining gap by design: 材质层次、混合石材铺地、水景/桥、成熟植被、侧柱红伞与三类外摆仍属于后续 materials/site 批次，未在 identity 阶段提前伪造完成。
- Performance impact: identity 三段约 1.17 MB；仅记录体积，不在不同场景组合下声明 FPS 提升。
- Rollback point: 三段 massing GLB 与 `XingfuliProceduralArchitectureFallback`。

### Iteration 3 — evidence-driven materials

- Changes: 在不引入照片贴图的前提下，增加暖白/冷灰立面分层、红砖阴缝、木格栅与店面门楣、玻璃层间带、阳台细柱和银灰构件；颜色、粗糙度与金属感映射到紧凑 12 色板。
- Evidence used: canonical 的白/灰/玻璃关系、入口红砖体量、书店/外摆照片中的木与炭灰金属。
- Blender result: master canonical/street 可分辨白灰、木、砖、玻璃与深框，不靠品牌和照片纹理建立差异。
- GLB result: 三段共 1,341,276 bytes、18,828 triangles、3 nodes、0 images；单段最多 10 材质，审计全部通过。
- Three-way comparison result: `test_artifacts/test_xingfuli_materials_three-way_preview.png`；与 identity 相比，首层门框、楼层线脚和南侧砖木身份在 Blender/Three.js 均稳定可见。
- Runtime result: 1920×907 白天 toon 光照下无玻璃黑块、无嵌图、无新增 console error。
- Remaining gap by design: 当前整块灰地与旧程序化红伞/外摆仍明显偏简化；下一批以可复用 InstancedMesh 铺石和模块化街具替换。
- Performance impact: materials 三段约 1.34 MB；仍远低于三段 10 MB 预算，不在未完成 site 组合前声明帧率提升。

### Iteration 4 — site composition and collision

- Changes: Blender 加入倒影池硬质池壳、池沿、七块木桥板与番禺路入口矩阵墙；运行时新增沿长轴错缝的三灰四色阶/四长度 InstancedMesh 铺石，抽取短臂灯、红色悬臂伞、三类外摆、长凳、花箱与矮方石桩为共享街景资源。
- Evidence used: SmartShanghai 外摆/铺地近景、canonical 水景、番禺路入口照片与九图 coverage matrix。
- Blender result: 入口墙第一次横向封路，真实页面识别后改为南侧边界沿长轴平行布置；修正后的固定机位保留开放通道。
- GLB result: site 三段共 1,370,840 bytes、19,224 triangles、3 nodes、0 images；build record 与三个二进制 SHA 一致。
- Runtime result: 三种确定性梧桐、六盏实例化短臂灯、两把红伞、三类桌椅、长凳、花箱和 site 阶段的八个入口石桩均进入实际页面；桌高 `0.65–0.68`、座高 `0.44–0.45`、椅背最高约 `0.99` 本地单位。最终照片复核后，石桩收敛为仅番禺路入口一排五个膝高实例，未在无证据的幸福路入口做对称补造。
- Collision result: 建筑、池两侧水体、入口墙、桌椅、长凳、四个可视花箱、六盏灯杆、五个入口矮方石桩与树基座均使用结构化简化障碍；可视花箱 ID 与碰撞 ID 一一对应，三条确定性路线逐 0.2 本地单位采样，两入口、池两侧和木桥全部连续通过。
- Three-way comparison result: `test_artifacts/test_xingfuli_site_three-way_preview.png`。
- Performance impact: 铺石按四长度 × 三颜色合为 12 个实例批次；site 阶段未与不同条件历史结果比较。

### Iteration 5 — final asset and production runtime

- Changes: 生成无阶段后缀的 west / center / east 最终 Blend/GLB，运行时切换 `?v=20260723-final-1`；新增 canonical、pool-detail、entrance-detail 三个确定性验收入口。
- Blender result: 最终三段与 master canonical / side / street 共 12 张固定机位预览生成；轮廓、首层店面、白灰/砖木/玻璃关系和地面接触通过。
- GLB result: 三段共 1,370,828 bytes、19,224 triangles、3 nodes、26 段内材质引用、0 images/0 textures；三个独立审计均为 `status=ok`。
- Three-way comparison result: `test_artifacts/test_xingfuli_final_three-way_preview.png`；Blender 新增人眼高度、沿本地 `+X`、水池位于右前景的 `test_xingfuli-final-master_comparison_preview.png`，三联图统一为方形裁切并使用同向 canonical 运行时视图；另保存主巷、倒影池和番禺路入口三张 1920×907 PNG。
- Runtime result: Vite static production build 中三视角均加载最终 GLB；当前桌面与移动验收的应用新增 console error 均为 0；已知 `THREE.Clock` / `PCFSoftShadowMap` 弃用 warning 保留。另在 390×844、DPR 2、页面可见的移动视口预热 7 秒，最终店面、短臂灯、悬臂伞、混合灰石铺地与外摆均可读。
- Performance result: 页面可见、1920×851、预热 7 秒；`10.081264` 秒 Performance 样本后，用 120 帧原始 rAF 得到平均 `60.16 FPS`、平均 `16.62 ms`、P95 `17.3 ms`、最大 `17.7 ms`，结束时 JS heap used `72,273,732 bytes`。三份 GLB 的 `PerformanceResourceTiming` 也被逐项记录：west / center / east 的 decoded body 分别为 `317,012 / 554,080 / 499,736 bytes`，与二进制体积一致。完整 120 帧、CDP 指标、Resource Timing 与 console 来源保存在 `test_artifacts/test_xingfuli_final_runtime_metrics.json`；历史基线条件不同，不声明性能提升。
- Automated result: `tests/test_xingfuli_models.test.mjs` 12/12 通过，覆盖 SHA、bounds、面数、材质、证据 PNG、缓存版本、可视街具与碰撞一一对应、三条生产通行路线，并从原始 120 帧重新计算性能摘要、核对三份 GLB Resource Timing 与应用 console；全仓 `npm test` 112/112、`npm run lint` 通过。
- Independent review result: Critical `0`、Important `0`、Minor `1`；审查方独立复跑 12/12、112/112、lint 与三个 GLB audit 均通过，允许通过 final checkpoint。唯一 Minor 是生成 source 页仍保留条件式“待验证”措辞，且对应 Review 建议尚未关闭，不影响已经实证的同步闭环。
- Knowledge base result: `Threejs-3d-research` 三个持久化队列均为空；LLM Wiki MCP 精确搜索、raw/source/methodology/entity 读取和 `Xinhua Scene Dressing Kit → Scene Dressing Kit` 图谱边均验证通过。桌面 Review UI 无法保持运行，因此未直接篡改内部 JSON，`review-d1f1a636` 作为非阻断卫生项保留。
- Remaining inference: 背立面、屋顶机电、2026 实际租户和精确施工尺寸继续标为未知；未复制品牌文字、墙绘或照片贴图。
- Rollback point: 保留四阶段 GLB/Blend、四份阶段 build record 与 `XingfuliProceduralArchitectureFallback`。
