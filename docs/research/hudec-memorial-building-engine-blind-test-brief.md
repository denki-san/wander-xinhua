# Hudec Memorial Building Engine Blind-Test Brief

- Current status: `rejected-by-new-evidence-rebuild-required`

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
- Browser：Codex Browser（本次自动选择 Chrome）；真实 local production preview
- Blender MCP：当前 Add-on 不可用，使用三固定机位 Headless Blender 降级，
  明确记录“未执行 MCP 交互审查”
- Dynamic evidence：新输入证据位于不可变快照 `2026-07-28-0ef306f`，
  `669 / 669` SHA-256 通过；旧错误模型及运行时证据保留在
  `2026-07-28-9762c91`，不得覆盖

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

完整 URL、SHA 和主体边界见
`building-engine/cases/hudec-memorial/building-case.json`。

### View coverage matrix

| Evidence slot | Evidence | Coverage | Downgrade |
| --- | --- | --- | --- |
| Canonical | 用户高位斜向总览 + 官方西后侧照片 | Covered | 同机位裁切不重复计数 |
| Side / depth | 用户玻璃翼近景 + 官方西后侧照片 | Covered | 精确屋坡仍不冒充测绘 |
| Entrance / identity | Wikimedia 庭院正面 | Covered | 不复制牌匾和不可读装饰 |
| Historic front | 用户历史正向照片 + 政府立面草图 | Covered historic | 只校验结构关系，不冒充当前装修 |
| Subject binding | OSM way `494633921` | Covered | envelope 不冒充测绘 |
| Rear / east | 无完整照片 | Unknown | 低细节封闭，不加身份构件 |
| Source provenance | 两张可见媒体水印，四张均无原始 URL | Partial | 保留 attachment SHA，不猜作者或日期 |

### Canonical comparison view

- Local path:
  `docs/research/assets/requested-poi-references/hudec-memorial-user-oblique-overview-20260728.png`
- Direction: 高位前左斜向，朝主屋脊、前部长坡翼、中央/端部山墙和白色烟囱塔
- Why selected: 同一画面可以核对整体包络、屋面连接、烟囱基座、玻璃翼位置和
  前后山墙层级；这正是旧模型失败的五项
- Runtime reproduction: Blender local `-Y` 为前，canonical 固定机位从
  local `-X / -Y` 高位观察；真实地图使用对应西南斜向 QA 相机

### Observed

- 紧凑黑白半木构主体、主屋脊与前后交错双山墙；
- 前部玻璃围护位于与主体连续的长单坡屋面下，不是独立双坡小屋；
- 从低层起立的白色烟囱塔承托顶部成组红砖烟道与外扩冠部；
- 三角入口门廊、木门、台阶和独立砖拱门；
- 端山墙、转角和玻璃翼上的连续深木构与密集窄窗；
- 屋脊三鸟形风向标。

### Inferred

- 水平包络由 OSM、既有已验收落点和人物/门尺度校准；
- 长单坡、主屋脊和山墙的精确相交位置按多张照片的遮挡关系近似；
- 不可见立面保持可封闭、低细节的建筑逻辑；
- 风向标仅允许原创低多边形轮廓，本 DSL 盲测不实现。

### Unknown

- 精确东立面、背立面和隐藏开口；
- 测绘尺寸、层高、屋坡和烟道尺寸；
- 室内平面、植被遮挡的小构件和地籍边界。
- 四张用户图片的原始发布 URL、作者与拍摄日期。

## Quality Contract

### Identity

- Silhouette: 紧凑主屋脊、前部长单坡翼、交错双山墙、后侧低翼和高烟囱塔
- Signature cue 1: 端山墙与转角连续的黑白半木构
- Signature cue 2: 落地白色烟囱塔与顶部成组红砖烟道
- Signature cue 3: 前后交错双山墙与紧凑复合屋顶
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
- Horizontal envelope target: 约 `10.5 × 8.0` scene units
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
- Must show: 完整烟囱塔与冠部、主屋脊、长单坡玻璃翼、前后山墙和后侧低翼
- Entrance view: 门廊、砖拱门、至少四组窗格完整可见

### Materials

- Warm plaster: `warm-plaster`
- Timber: `deep-timber`
- Brick: `muted-brick`
- Roof: `muted-red-tile`
- Glass: `muted-glass`
- Stone / trim: `warm-stone`
- Images / runtime photo textures: `0`

### Collision and access

- 主体、端山墙体块、长坡玻璃翼、后翼、门廊柱和砖拱门柱拆分；
- 入口、砖拱门和西侧绕行保持开放；
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
| Evidence v2 | 新 Case、coverage、Brief 和外置快照 | N/A | N/A | Passed |
| Compiler gap | 通用 `shed` roof，不加 Hudec 特判 | 三栋自动回归 | N/A | Pending |
| Massing v2 | 紧凑主体、长单坡、双山墙和烟囱塔 | 三固定机位 | Sandbox Massing | Pending |
| Calibration v2 | 比例、方向、接地和开放路径 | Fixed renders | Gate M | Pending |
| Master v2 | 半木构、玻璃翼、窗格、入口和烟囱冠部 | 三固定机位 | Sandbox Master | Pending |
| Real map v2 | Building Engine Master | N/A | `/?start=hudec` | Pending |
| Cold build v2 | 干净 worktree 单一 CLI 重建 | SHA / structure | N/A | Pending |

## Validation

- [x] 新外置快照四张用户图片、旧证据与 OSM JSON SHA 全量通过
- [x] Observed / Inferred / Unknown 分离
- [x] 至少五处 Hudec 身份构件
- [x] 旧视觉假通过与通用 `shed` roof Compiler Gap 已记录
- [ ] 新 Compiler、Schema、Art Profile SHA 冻结
- [ ] Massing v2 固定机位和 Sandbox 通过
- [ ] Gate M v2 记录绑定当前 DSL / GLB / collision SHA
- [ ] Master v2 固定机位、GLB 和碰撞自动检查通过
- [ ] 新参考 / Blender / Three.js 三联图通过
- [ ] 真实 `/?start=hudec` 可见、接地、方向和碰撞通过
- [ ] 默认 Hudec 页面仍加载原正式 Hero
- [ ] 干净 worktree 冷启动复建得到一致 GLB
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
