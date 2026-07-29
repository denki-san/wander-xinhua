# Hudec Memorial Building Engine Blind-Test Brief

- Current status: `selected-topology-a-spike-approved-with-known-unknowns`

## Scope

- Asset slug: `hudec-memorial`
- Subject: 邬达克纪念馆（邬达克旧居），番禺路 129 号
- Archetype: `garden-villa`
- Runtime component: `app/scene/xinhua-road-landmarks.tsx`
- Frozen generator: `scripts/compile_garden_villa.py`
- Editable source:
  `assets/models/source/building-engine-spike/hudec-memorial/`
- Runtime GLB: `public/models/building-engine-spike/hudec-memorial/`
- Sandbox: `/building-engine-sandbox?asset=hudec-memorial`
- Real-map QA: `/?start=hudec&qaModelId=hudec-memorial&qaModelTier=engine-master`
- Single-asset build command:
  `npm run building:spike -- build --asset hudec-memorial --stage all`
- Validation command:
  `npm run building:spike -- qa --asset hudec-memorial`

本轮只新增一个模型资产和一个既有运行时实例的开发 QA 覆盖。正式 Hudec Hero、
默认 registry、placement 和 cacheVersion 不替换。

## Original blind-test contract — invalidated by new evidence

- Original Compiler SHA：
  `1c6674b0943dd6d992a4d595cfcba848b4c6e00f473c1fde39d929e7c58a00fe`
- Original Schema SHA：
  `fbcce0470e7efa3a845771fb0b764ac38e9e702d1cbe920376f75c3aff75b619`
- Art Profile SHA（继续冻结）：
  `be83132c810c9fe0e36d7070d61648ae43ac820621b785324ad6bc86cc4e9c10`
- 不读取或复制 `scripts/create_hudec_memorial_v2.py` 的几何实现；
- 现有 Hudec 三档只在 DSL 冻结后作为只读对照；
- 如果必须修改 Compiler Python，本轮判定 `compiler-gap`，不得以修改后产物
  冒充盲测通过。

该条件现已触发：原 Compiler / Schema 的盲测结论永久失效。本轮只允许增加通用
`shed` roof 表达能力，不允许加入任何 Hudec 资产 ID 分支；完成后记录新的
Compiler / Schema SHA，并对三栋 Case 重跑验证。最终结论应称为
`evidence-corrected-engine-v2`，不能再称为“冻结 Compiler 盲测通过”。

## Preflight Gate

- Blender：`/Applications/Blender.app/Contents/MacOS/Blender`，
  `5.2.0 LTS`
- 单资产生成：现有 Building Engine CLI 按 Case 目录动态发现资产
- GLB 自动检查：CLI 内建结构、bounds、预算、图片、根变换和 lineage 检查
- Local production build：`npm run build:sites`
- Sandbox：`/building-engine-sandbox`
- Real map：`/?start=hudec`
- Browser：应用内 Browser 当前无可用实例；降级为独立
  `agent-browser Chromium`，仍访问真实 local production preview
- Blender MCP：当前 Add-on 不可用，使用三固定机位 Headless Blender 降级，
  明确记录“未执行 MCP 交互审查”
- Dynamic evidence：A 选型、新机位图片和烟囱标注位于不可变快照
  `2026-07-29-hudec-a-evidence-v1-083bde0`，`733 / 733` SHA-256
  经归档脚本与独立复核两次通过；旧错误模型及运行时证据保留在既有快照中，
  不得覆盖

## Evidence

### Reference photos

| Local path | Source | View | Usage boundary |
| --- | --- | --- | --- |
| `docs/research/assets/requested-poi-references/hudec-memorial-street-official-2026.jpg` | Shanghai Government English Portal / City News Service | 西后侧 canonical / depth | Research only |
| `docs/research/assets/requested-poi-references/hudec-memorial-west-elevations.jpg` | 上海市长宁区人民政府 | 历史西立面与烟囱塔草图 | Historic structure only |
| `docs/research/assets/requested-poi-references/hudec-memorial-front-wikimedia.jpg` | Wikimedia Commons | 庭院正面偏右、入口 | Research only |
| `docs/research/assets/requested-poi-references/hudec-memorial-user-oblique-overview-20260728.png` | 用户提供；可见 `@文化上海` 水印；原始 URL 未知 | 高位斜向总览 | Research only / provenance partial |
| `docs/research/assets/requested-poi-references/hudec-memorial-user-oblique-overview-crop-20260728.png` | 用户提供的同机位裁切 | 烟囱塔与长坡翼细节 | Duplicate view / not independent coverage |
| `docs/research/assets/requested-poi-references/hudec-memorial-user-historic-front-20260728.png` | 用户提供；原始来源未知 | 历史正向总览 | Historic structure only |
| `docs/research/assets/requested-poi-references/hudec-memorial-user-glass-wing-20260728.png` | 用户提供；可见 `@乐游上海` 水印；原始 URL 未知 | 玻璃翼、长单坡与烟囱塔近景 | Research only / provenance partial |
| `docs/research/assets/requested-poi-references/hudec-memorial-user-modern-front-oblique-20260729.png` | 用户提供；可见 Baidu 百科水印；原始 URL 未知 | 现代正面稍偏斜，绕开正面树木 | Research only / provenance partial |
| `docs/research/assets/requested-poi-references/hudec-memorial-user-left-chimney-side-20260729.png` | 用户再次提供并确认机位；与既有玻璃翼图逐字节相同 | 画面左烟囱侧近距离广角 | Duplicate view / not independent coverage |
| `docs/research/assets/requested-poi-references/hudec-memorial-user-historic-front-wide-20260729.png` | 用户提供；原始来源未知 | 历史完全正面 | Historic structure only |
| `docs/research/assets/requested-poi-references/hudec-memorial-user-roof-chimney-annotation-20260729.png` | 用户对选定 A 三视图的直接标注 | 靠正面屋面坡面的对称双烟囱 | Authoritative geometry correction |

完整 URL、SHA 和主体边界见
`building-engine/cases/hudec-memorial/building-case.json`。

### View coverage matrix

| Evidence slot | Evidence | Coverage | Downgrade |
| --- | --- | --- | --- |
| Canonical | 用户现代正面稍偏斜 + 高位斜向总览 | Covered | 现代正面图优先核验横向主楼与浅前凸双山墙 |
| Side / depth | 用户画面左烟囱侧近景 + 官方西后侧照片 | Covered | 同 SHA 工作副本不重复计数，精确屋坡仍不冒充测绘 |
| Entrance / identity | Wikimedia 庭院正面 | Covered | 不复制牌匾和不可读装饰 |
| Historic front | 用户历史完全正面宽图 + 旧历史正向图 + 政府立面草图 | Covered historic | 核验通长主屋面、浅前凸双山墙和对称双烟囱，不冒充当前装修 |
| Topology selection | 三种互斥体块候选 + 用户选择 A | Covered by user decision | A 为横向主楼加浅前凸双山墙；B/C 作废但保留证据 |
| Roof chimneys | 现代斜正面、历史完全正面、用户 A 标注 | Covered | 两根均在靠正面主屋面坡面；白色与红砖段采用加高版 |
| Subject binding | OSM way `494633921` | Covered | envelope 不冒充测绘 |
| Rear / east | 无完整照片 | Unknown | 低细节封闭，不加身份构件 |
| Source provenance | 两张可见媒体水印，四张均无原始 URL | Partial | 保留 attachment SHA，不猜作者或日期 |

### Canonical comparison view

- Local path:
  `docs/research/assets/requested-poi-references/hudec-memorial-user-modern-front-oblique-20260729.png`
- Direction: 现代正面稍偏向画面左烟囱侧，拍摄位置绕开正面树木
- Why selected: 同一画面可以核对横向通长主楼、两个浅前凸山墙、左侧长坡玻璃翼、
  靠正面坡面的对称双烟囱和中央退进关系；历史完全正面作为结构正投影补充
- Runtime reproduction: Blender local `-Y` 为前，canonical 固定机位从
  local `-X / -Y` 高位观察；真实地图使用对应西南斜向 QA 相机

### Observed

- 横向通长黑白半木构主体、连续主屋脊与两个浅前凸正面山墙；
- 前部玻璃围护位于与主体连续的长单坡屋面下，不是独立双坡小屋；
- 两根烟囱左右成对，从靠正面一侧的主屋面坡面穿出；加高白色基座承托
  更高红砖烟道与外扩冠部；
- 两个浅前凸山墙之间的中央退进立面、拱形入口和两侧窄窗；
- 端山墙、转角和玻璃翼上的连续深木构与密集窄窗；
- 屋脊三鸟形风向标。

### Inferred

- 水平包络由 OSM、既有已验收落点和人物/门尺度校准；
- 长单坡、主屋脊、浅前凸山墙和屋面烟囱的精确相交位置按多张照片的遮挡关系近似；
- 不可见立面保持可封闭、低细节的建筑逻辑；
- 风向标仅允许原创低多边形轮廓，本 DSL 盲测不实现。

### Unknown

- 精确东立面、背立面和隐藏开口；
- 测绘尺寸、层高、屋坡和烟道尺寸；
- 室内平面、植被遮挡的小构件和地籍边界。
- 所有用户图片的原始发布 URL、作者与拍摄日期。

## Quality Contract

### Identity

- Silhouette: 横向通长主屋脊、两个浅前凸正面山墙、画面左烟囱侧长坡玻璃翼、
  画面右端低回转翼和屋面高双烟囱
- Signature cue 1: 端山墙与转角连续的黑白半木构
- Signature cue 2: 靠正面坡面的对称双烟囱、加高白色基座与红砖烟道
- Signature cue 3: 横向主楼与两个浅前凸山墙形成的复合屋顶
- Signature cue 4: 三角入口门廊与砖拱门
- Signature cue 5: 长单坡屋面下的玻璃围护与密集窗格
- Omitted: 牌匾、逐片瓦、砖缝、风向标雕塑、树木与未知背面细节

### Position

- Coordinate source: OSM way `494633921` 与已通过正式 Hudec map QA
- Runtime position: `[92.535374, -132.52181]`
- Runtime yaw: `0.153486288`
- Runtime scale: `0.88`
- Confidence: placement `A-`；净建筑测绘尺寸 unknown

### Scale

- Authored unit: `1 scene unit = 2.7 m`
- Selected Massing envelope: 约 `13.3 × 6.3` scene units；该值是用户审核后的
  视觉体块，不声明实测，真实地图仍用既有 placement 与允许 scale 校准
- Human proxy: `1.8 m = 0.666667` scene unit
- Allowed visual multiplier: `0.96–1.04`

### Orientation

- Blender front: local `-Y`
- Runtime loader: 沿用正式 Hudec 的共享坐标链
- Canonical: local 前左高位斜向
- Entrance: local `-Y` 庭院正面

### Framing

- Canonical occupancy: `66%–78%`
- Maximum direction deviation: `15°`
- Must show: 两根屋面烟囱的白色基座与红砖冠部、主屋脊、长单坡玻璃翼、
  双浅前凸山墙和右侧低回转翼
- Entrance view: 中央拱门、两组半木构山墙和至少四组窗格完整可见

### Materials

- Warm plaster: `warm-plaster`
- Timber: `deep-timber`
- Brick: `muted-brick`
- Roof: `muted-red-tile`
- Glass: `muted-glass`
- Stone / trim: `warm-stone`
- Images / runtime photo textures: `0`

### Collision and access

- 主体、两个浅前凸山墙、长坡玻璃翼和右侧低回转翼拆成五个碰撞体；
- 中央入口、左侧绕行和右侧绕行保持三条非空开放路径；
- 不使用覆盖整个 compound 的单一碰撞盒；
- Massing 与 Master 共用相同 collision JSON。

### Runtime budget

| Stage | Nodes | Triangles | Materials | Images | Bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Massing | 32 | 2,500 | 5 | 0 | 500,000 |
| Master | 64 | 12,000 | 10 | 0 | 1,500,000 |

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Evidence v4 | A 选型、新机位、屋面双烟囱和外置快照 | N/A | N/A | Passed |
| Compiler gap | 通用 `shed` roof，不加 Hudec 特判 | 三栋自动回归 | N/A | Passed |
| Massing v4 | A 横向主体、浅前凸双山墙、长坡侧翼、加高屋面双烟囱 | 三固定机位 | Sandbox Massing | Passed |
| Calibration v4 | 比例、方向、接地和开放路径 | Fixed renders | Gate M | Passed |
| Master v4 | 与 A 体块一致的半木构、玻璃翼、窗格与入口 | 三固定机位 | Sandbox Master | Passed with known unknowns |
| Real map v4 | 显式 Building Engine Master QA | N/A | `/?start=hudec&qaModelTier=engine-master` | Deferred：不属于本轮简化 Pipeline |
| Cold build v4 | 干净 worktree 单一 CLI 重建 | SHA / structure | N/A | Passed |

## Validation

- [x] A 选型新外置快照 `733 / 733` SHA 全量通过
- [x] Observed / Inferred / Unknown 分离
- [x] 至少五处 Hudec 身份构件
- [x] 旧视觉假通过与通用 `shed` roof Compiler Gap 已记录
- [x] 新 Compiler、Schema、Art Profile SHA 冻结
- [x] 正式 Massing v4 固定机位和 Sandbox 通过
- [x] Gate M v4 记录绑定当前 DSL / GLB / collision SHA
- [x] Master v4 固定机位、GLB 和碰撞自动检查通过
- [x] 新参考 / Blender / Three.js 三联图通过
- [ ] 真实 `/?start=hudec` 可见、接地、方向和碰撞通过
- [x] 默认 Hudec 页面仍加载原正式 Hero
- [x] 最终提交在干净 worktree 重建三栋并得到一致 GLB
- [ ] 新输出动态证据快照与全量 SHA 通过

## Decision Log

### Iteration 0 — 2026-07-28 evidence freeze

- Changes: 将 Hudec 冻结为第三栋单建筑盲测，建立 Case、coverage 和质量合同。
- Evidence: 官方西后侧照片、政府历史西立面草图、Wikimedia 庭院正面、
  OSM way `494633921`。
- Compiler result: 尚未运行；冻结 SHA。
- Remaining inference: 东/背立面、测绘尺寸、隐藏开口和风向标细节。
- Rollback point: `eb4be8c`。

### Iteration 1 — 2026-07-28 first Massing calibration

- Compiler SHA: 冻结值未变化。
- Automatic result: pass；`288` triangles、`5` materials、`26044` bytes，
  images / textures / animations / skins 均为 `0`。
- Visual result: reject-before-Gate-M。层叠屋面、端山墙、低翼与门廊成立，
  但三联烟囱只高出最高屋脊约 `0.58` scene unit，弱于官方 canonical 中的
  高耸纵向比例。
- Evidence preserved:
  `test_artifacts/building-engine-spike/hudec-memorial/test_hudec-memorial-massing-iteration0-*`。
- Correction: 只把三根烟囱顶面提高到约 `7.93 / 8.05 / 7.93`，同步移动
  Master 冠部；不改 Compiler、Schema、Art Profile 或其他体块。
- Gate M: 仍为 Pending，必须重建并重新检查三固定机位。

### Iteration 2 — 2026-07-28 canonical identity calibration

- Compiler、Schema、Art Profile SHA：冻结值未变化。
- Massing result: `b7510920…`；`288` triangles、`5` materials、
  `26044` bytes，Gate M 通过。
- First Master visual result: reject。production Sandbox 能显示模型，但与官方
  canonical 三联对照时，固定机位未同时呈现低玻璃翼和已观察半木构。
- Correction: 只在 DSL 增加已有照片支持的 canonical-facing 半木构/窗格，
  并把 canonical 相机移到正确观察侧；未读取旧 Hudec 生成器几何。
- Second Master result: `30a6c8e8…`；`3140` triangles、`7` materials、
  `225452` bytes，Sandbox 三机位通过。

### Iteration 3 — 2026-07-28 real-map entrance rejection

- Real-map source: 显式 `engine-master` 已加载，GLB 与 Sandbox SHA 一致；
  默认 Hudec registry 未改变。
- Deterministic movement result: reject。入口目标
  `[94.7868433168, -136.3874687945]` 前进 `6000 ms` 后停在
  `[94.7868433165, -136.9447750771]`，剩余约 `0.5573` world unit。
- Diagnosis: 两根门廊柱局部净宽 `0.88`，映射后小于人物直径 `0.96`，
  再叠加全局 `0.2` collision margin 后开放路径被封死。
- Evidence preserved:
  `docs/research/build-records/building-engine-spike/hudec-memorial/real-map-engine-master-iteration1-rejected.json`。
- Correction: 只在 DSL 把入口柱中心从 `2.62 / 3.78` 调整到
  `2.40 / 4.00`，同步加宽门廊屋顶、Feature、碰撞和开放路径；显式 QA tier
  使用 `collisionMargin: 0`，由人物半径提供实体留距。

### Iteration 4 — 2026-07-28 accepted experimental chain

- Current DSL: `a20658c0…`
- Current Massing: `23a745ec…`；Gate M
  `massing-review-003.json` 通过。
- Current Master: `6de1f632…`；collision `6272faf3…`；
  `3140` triangles、`7` materials、`0` images / textures / animations /
  skins、`225452` bytes。
- Production Sandbox: canonical、side、entrance 三固定机位和模型可见、
  接地、开放路径检查通过；三联图
  `test_hudec-memorial-final-triptych.png` 通过。
- Real-map: 同一入口路线最终距目标约 `0.0551`，判定通过；向建筑中心持续
  前进仍在墙前保留约 `3.3828` world unit，判定未穿透。
- Default route: 浏览器只观察到既有 Massing、Identity 与
  `hudec-memorial-v2-hero.glb?v=20260726-hero-598b2ba19e24`，未请求
  Building Engine Master。
- Final Gate:
  `final-review-001.json` 为
  `approved-spike-with-known-unknowns`；仅批准实验链路，不授权替换正式
  Hudec Hero。
- Remaining at this iteration: 干净 detached worktree 冷启动复建与新外置动态
  证据快照。

### Iteration 5 — 2026-07-28 cold-build acceptance

- Source commit: `f4ab24af432f06c1097db0c8a0e92fb729438008`。
- Clean room: 从该提交创建干净 detached worktree，只运行单资产 CLI 的
  `build --stage all` 与 `qa --stage all`。
- Binary result: Massing `23a745ec…`、Master `6de1f632…` 和 collision
  `6272faf3…` 均与接受产物逐字节一致。
- Structure / lineage: Master 保持 `3140` triangles、`7` materials、
  `0` images / textures / animations / skins，Compiler、DSL、Art Profile
  与 Massing lineage 全部一致。
- Preview note: canonical PNG 因编码或元数据产生不同文件 SHA，但像素比较
  `SSIM 1.000000`、`PSNR infinite`；不影响 GLB 确定性判断。
- Record:
  `docs/research/build-records/building-engine-spike/hudec-memorial/cold-build-f4ab24a.json`。
- Remaining at this iteration: 新外置动态证据快照与全量 SHA。

### Iteration 6 — 2026-07-28 merge-ready experimental closure

- Acceptance snapshot:
  `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-28-9762c91/`。
- Snapshot source: clean commit `9762c91`；`663` files、`271917056` bytes、
  `wikiEligible: false`。
- Checksum result: 归档脚本和独立串行复核均验证 `663 / 663` SHA-256 通过；
  其中 `44` 项为本轮 Hudec Building Engine 产物、截图或记录。
- Regression: 专项测试 `9 / 9`；`npm test` 为 `447 / 447`；`npm run lint`
  为 `0 error`，保留一个与本分支无关的既有 warning。
- Local review: 未发现 Critical 或 Important 问题；Compiler 没有资产专用分支，
  正式 Hudec registry、默认 Hero 和 cacheVersion 未改变。
- Decision: `merge-ready-experimental`。该结论只允许把隔离 CLI、Sandbox 与
  显式 QA tier 作为实验链路候选合并；不授权替换正式 Hudec Hero、推送、
  合并或部署。

### Iteration 7 — 2026-07-28 new user evidence rejection

- New evidence: 四张用户提供的当前/历史斜向与正向照片，工作副本及 provenance
  见
  `docs/research/assets/requested-poi-references/hudec-memorial-user-evidence-20260728.json`。
- Rejection: 新照片证明旧 Master 的宽盒主体、独立低双坡玻璃翼和悬浮式三烟道
  与真实建筑不一致；真实建筑是紧凑复合屋面、长坡玻璃翼、落地白色烟囱塔加红砖
  冠部，以及前后交错双山墙。
- Gate impact: `massing-review-003.json`、`final-review-001.json` 和
  Iteration 6 的 `merge-ready-experimental` 结论全部降为历史记录，不能继续作为
  当前视觉通过证据。
- Provenance gap: 两张图片可见 `@文化上海` / `@乐游上海` 水印，但原始发布 URL、
  作者与拍摄日期未知；只标记为用户提供研究证据，不虚构来源。
- Compiler impact: 长单坡玻璃翼超出现有 Roof DSL 的 `gable / hipped / flat`
  表达范围，先记录通用 `shed` roof `compiler-gap`；如果扩展 Compiler，旧冻结
  盲测结论失效，必须冻结新版本并重跑三栋回归。
- Next: 先创建新外置证据快照，再重写 coverage、Brief、Massing 和碰撞合同。

### Iteration 8 — 2026-07-29 evidence-corrected runtime acceptance

- Compiler / Schema: 加入通用 `shed` roof 和 `highSide` 校验；Compiler
  `20ed07e…`、Schema `9fd4bc65…`，Compiler 中没有任何资产 ID；
- Massing: `15e448bf…`，`360` triangles、`5` materials、`31080` bytes；
  `massing-review-006.json` 绑定当前 DSL、GLB 和 collision 后通过；
- Master: `cd3d49fc…`，collision `cb910b91…`，`2676` triangles、
  `8` materials、`0` images / textures / animations / skins、
  `194952` bytes；
- Visual: 新用户 canonical / Blender / production Three.js 三联图通过；
  长单坡玻璃翼、白色烟囱塔、成组红砖烟道、交错半木构双山墙和入口均可辨；
- Final Gate: `final-review-003.json` 为
  `approved-spike-with-known-unknowns`，只批准 evidence-corrected 实验链路；
- Real map: 新入口目标误差 `0.0259` world unit；实体墙前剩余
  `3.6810` world unit；默认入口只加载既有 Massing、Identity 与正式 Hero；
- Remaining: 干净 detached worktree 冷构建、全量测试、lint 和新输出快照。

### Iteration 9 — 2026-07-29 evidence-corrected cold-build acceptance

- First attempt: 固定提交 `c74b91b…` 的干净 worktree 正确拦截了四张仓库证据
  工作副本缺失；这些图片已在外置不可变快照中，但被 `.gitignore` 排除，不应
  成为冷构建必需输入；
- Fix: `77d6719…` 将外置快照恢复为证据真值；仓库工作副本改为可选，存在时
  仍强制校验 SHA，外置文件缺失或 SHA 不符仍会失败；
- Cold build: detached worktree 从 `77d6719…` 用单一 CLI 重新生成 Massing、
  Master 和 collision；三者 SHA 分别为 `15e448bf…`、`cd3d49fc…`、
  `cb910b91…`，与已审核产物逐字节一致；
- Visual determinism: Massing / Master 的 canonical、side、entrance 共六张预览
  解码后像素全部一致；
- Automation: 全量 `npm test` 为 `448/448`；lint 为 `0 error / 1` 条既有
  `test_house_315_map_position_candidate.test.mjs` warning；
- Record:
  `docs/research/build-records/building-engine-spike/hudec-memorial/cold-build-77d6719.json`；
- Review follow-up: 首轮代码审查发现两栋回归资产只 validate、没有闭合
  Compiler lineage，同时发现非法 `ridgeAxis` / `highSide` 负例未被拦截；
  当前已重建 House 315 与孙科别墅，六级 `qa --asset all` 通过，并在 Schema、
  CLI 与测试中补齐负例；
- Supersession: 上述冷构建发生在最终 Schema 加固与两栋回归重建之前，只作历史
  证据，不作为当前最终 Cold-build Gate；
- Remaining: 从最终提交重新冷构建三栋、创建外置输出证据快照并完成复审。

### Iteration 10 — 2026-07-29 pre-final three-asset cold build

- Source: 从提交 `888ccb7f880724856926b9db499543836e0a753e` 创建干净
  detached worktree，初始 `git status --short` 为空；
- Build: 单一 CLI 对 House 315、Hudec、孙科别墅依次重建 Massing 与 Master；
- Binary determinism: 六个 GLB 与三个 collision 文件均和已审核工作树逐字节
  一致；
- Visual determinism: 三栋、两阶段、三机位共 18 张预览解码后像素全部一致；
- QA: `qa --asset all --stage all` 六级全部通过；
- Record:
  `docs/research/build-records/building-engine-spike/hudec-memorial/cold-build-888ccb7.json`；
- Review finding: 复审发现 CLI 尚未把 `length / span / eaveHeight /
  ridgeHeight` 的类型、有限值与范围合同落为负例门，因此本记录降为历史通过。

### Iteration 11 — 2026-07-29 final validation hardening and cold build

- Validation: `shed` 现在要求长度、跨度、檐口与屋脊字段存在；长度、跨度和屋脊
  必须是有限正数，檐口必须是有限非负数，且屋脊必须高于檐口；
- Negative tests: 覆盖负长度、零跨度、字符串数值、负檐口和屋脊不高于檐口；
- Source: 提交 `53b7a6dda3082fbcb244437a8ce0a40c6a39d362`；
- Cold build: 干净 detached worktree 重建三栋，六个 GLB 与三个 collision
  逐字节一致，18 张固定机位预览像素一致，六级自动 QA 通过；
- Record:
  `docs/research/build-records/building-engine-spike/hudec-memorial/cold-build-53b7a6d.json`；
- At this point: 只剩最终外置输出证据快照与复审。

### Iteration 12 — 2026-07-29 evidence-corrected closure

- Snapshot:
  `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-29-45cc711/`；
- Snapshot source: clean commit `45cc711`；`678` files、`279162880` bytes；
  归档脚本与独立 `shasum -a 256 -c SHA256SUMS` 均为 `0` failures；
- Automation: `npm test` 为 `448/448`；lint 为 `0 error / 1` 条既有 warning；
- Review: 两轮只读审查发现的三栋 Compiler lineage、`shed` 负例和证据快照真值
  问题全部关闭，最终为 `0 Critical / 0 Important`；
- Decision: `merge-ready-evidence-corrected-experimental`；
- Boundary: 默认 Hudec Hero、production registry、placement 与 cacheVersion
  均未替换；本轮没有 push、合并或部署。成为默认生产链路仍需独立 promotion、
  线上性能基线和回滚验收任务。

### Iteration 13 — 2026-07-29 user-selected topology A

- New evidence: 用户补充现代正面稍偏斜、画面左烟囱侧近距离广角和历史完全
  正面三机位，并确认三张照片结构一致；历史宽图清楚显示通长主屋面和成对烟囱；
- Alternatives: 生成三种互斥体块解释。A 是横向主楼加两个浅前凸山墙，B 是
  U 形深翼，C 是前后贯通 H 形翼楼；用户明确选择 A，旧参数微调候选作废；
- Chimneys: 用户在 A 三视图标注两根烟囱都位于靠正面的主屋面坡面，并确认
  白色基座和红砖烟道均采用加高版；旧落地白色烟囱塔解释被推翻；
- Snapshot:
  `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-29-hudec-a-evidence-v1-083bde0/`；
  `733` files、`316420096` bytes，归档脚本和独立串行 SHA-256 复核均通过；
- Evidence Gate: Case v4 和 `evidence-review-004.json` 通过；原始 URL、作者、
  拍摄日期、背面细节和测绘尺寸继续明确 unknown；
- Validation fix: CLI 不再把 `checksumStatus` 锁死到单个旧日期，改为接受带
  ISO 日期的 `verified-all-...` 全量状态并拒绝 pending / partial；
- Current next step: 将已选 A 写入正式 Massing，经过 production Sandbox
  后重新创建 Gate M；旧 Master 和旧 Final Gate 继续保持失效。

### Iteration 14 — 2026-07-29 selected A Spike acceptance

- Formal DSL: `637a2473…`。A 被写成横向通长主楼、两个浅前凸正面山墙、
  左侧长单坡玻璃翼、右侧低回转翼和靠正面屋面坡面的对称双烟囱；两根烟囱的
  白色基座均为 `1.68` scene unit，红砖段均为 `1.92` scene unit；
- Gate M: `massing-review-010.json` 绑定 Massing `c83fb903…`、
  collision `0e853d79…` 和 production Sandbox 三固定机位后通过；
- Low-poly Master: `b7002cbd…`，`2980` triangles、`8` materials、
  `0` images / textures / animations / skins、`216172` bytes。首轮人工检查发现
  三角山墙木构被屋檐遮挡，修正到山墙外表面后重新构建；
- Runtime: `sandbox-master.json` 记录 `1280 × 720` 视口、
  `804 × 584` canvas、页面可见、模型可见、接地与三条开放路径均通过，
  控制台与页面错误为 `0`；`5.1064 s` 只读原始采样不作性能提升声明；
- Comparison:
  `test_artifacts/building-engine-spike/hudec-memorial/test_hudec-memorial-final-triptych.png`
  绑定用户现代正面稍偏斜参考、Blender canonical 和真实 Three.js Sandbox；
- Final Gate: `final-review-006.json` 为
  `approved-spike-with-known-unknowns`。背面、树木遮挡处、精确测绘尺寸和
  用户图片原始 URL 继续 unknown；
- Regression: 恢复冻结 Compiler `20ed07e1…`，不保留旧拓扑所需的通用旋转
  改动；Building Engine 专项 `8 / 8`、全量 `npm test` 为 `449 / 449`，
  lint 为 `0 error / 1` 条既有 warning；
- Cold build: 从本地提交 `d7bb811b…` 创建干净 detached worktree，
  三栋六个 GLB 与三个 collision 文件 `9 / 9` 逐字节一致，十八张 Blender
  固定机位预览解码后 `18 / 18` 像素一致；记录见
  `cold-build-d7bb811.json`；
- Boundary: 本轮没有替换正式 Hudec Hero、没有修改 production registry、
  placement 或 cacheVersion，也没有 push、合并或部署。真实 `/?start=hudec`
  显式 Engine 复验和生产 promotion 继续属于独立后续任务。
