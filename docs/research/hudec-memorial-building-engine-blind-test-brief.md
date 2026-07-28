# Hudec Memorial Building Engine Blind-Test Brief

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

## Blind-test contract

- Compiler SHA：
  `1c6674b0943dd6d992a4d595cfcba848b4c6e00f473c1fde39d929e7c58a00fe`
- Schema SHA：
  `fbcce0470e7efa3a845771fb0b764ac38e9e702d1cbe920376f75c3aff75b619`
- Art Profile SHA：
  `be83132c810c9fe0e36d7070d61648ae43ac820621b785324ad6bc86cc4e9c10`
- 不读取或复制 `scripts/create_hudec_memorial_v2.py` 的几何实现；
- 现有 Hudec 三档只在 DSL 冻结后作为只读对照；
- 如果必须修改 Compiler Python，本轮判定 `compiler-gap`，不得以修改后产物
  冒充盲测通过。

## Preflight Gate

- Blender：`/Applications/Blender.app/Contents/MacOS/Blender`，
  `5.2.0 LTS`
- 单资产生成：现有 Building Engine CLI 按 Case 目录动态发现资产
- GLB 自动检查：CLI 内建结构、bounds、预算、图片、根变换和 lineage 检查
- Local production build：`npm run build:sites`
- Sandbox：`/building-engine-sandbox`
- Real map：`/?start=hudec`
- Browser：Codex in-app Browser；真实 production preview
- Blender MCP：当前 Add-on 不可用，使用三固定机位 Headless Blender 降级，
  明确记录“未执行 MCP 交互审查”
- Dynamic evidence：复用不可变快照 `2026-07-28-6d29438`；本轮新预览、
  浏览器证据和指标完成后再创建新快照

## Evidence

### Reference photos

| Local path | Source | View | Usage boundary |
| --- | --- | --- | --- |
| `docs/research/assets/requested-poi-references/hudec-memorial-street-official-2026.jpg` | Shanghai Government English Portal / City News Service | 西后侧 canonical / depth | Research only |
| `docs/research/assets/requested-poi-references/hudec-memorial-west-elevations.jpg` | 上海市长宁区人民政府 | 历史西立面与烟囱塔草图 | Historic structure only |
| `docs/research/assets/requested-poi-references/hudec-memorial-front-wikimedia.jpg` | Wikimedia Commons | 庭院正面偏右、入口 | Research only |

完整 URL、SHA 和主体边界见
`building-engine/cases/hudec-memorial/building-case.json`。

### View coverage matrix

| Evidence slot | Evidence | Coverage | Downgrade |
| --- | --- | --- | --- |
| Canonical | 官方西后侧斜向照片 | Covered | N/A |
| Side / depth | canonical + 西立面草图 | Covered | 草图不冒充当前实景细节 |
| Entrance / identity | Wikimedia 庭院正面 | Covered | 不复制牌匾和不可读装饰 |
| Subject binding | OSM way `494633921` | Covered | envelope 不冒充测绘 |
| Rear / east | 无完整照片 | Unknown | 低细节封闭，不加身份构件 |

### Canonical comparison view

- Local path:
  `docs/research/assets/requested-poi-references/hudec-memorial-street-official-2026.jpg`
- Direction: 西后侧斜向烟囱塔、层叠屋面、端山墙与低玻璃翼
- Why selected: 五项身份构件中四项能在同一画面中核对
- Runtime reproduction: 从 `/?start=hudec` 的北侧起点进入，调整到建筑西后侧
  确定性 QA 相机

### Observed

- 宽幅黑白半木构主体与端部全高木构；
- 主屋面、交叉端山墙、低侧翼和入口门廊的层叠坡屋顶；
- 三联高红砖烟囱与外扩冠部；
- 三角入口门廊、木门、台阶和独立砖拱门；
- 低玻璃翼和密集窄窗；
- 屋脊三鸟形风向标。

### Inferred

- 水平包络由 OSM、既有已验收落点和人物/门尺度校准；
- 不可见立面保持可封闭、低细节的建筑逻辑；
- 风向标仅允许原创低多边形轮廓，本 DSL 盲测不实现。

### Unknown

- 精确东立面、背立面和隐藏开口；
- 测绘尺寸、层高、屋坡和烟道尺寸；
- 室内平面、植被遮挡的小构件和地籍边界。

## Quality Contract

### Identity

- Silhouette: 宽幅主体、端部高山墙、层叠陡坡屋面、低翼和高烟囱
- Signature cue 1: 黑白半木构宽立面
- Signature cue 2: 三联高红砖烟囱
- Signature cue 3: 交叉端山墙与多层屋顶
- Signature cue 4: 三角入口门廊与砖拱门
- Signature cue 5: 低玻璃翼与端部密集窗格
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
- Canonical: 西后侧斜向
- Entrance: local `-Y` 庭院正面

### Framing

- Canonical occupancy: `66%–78%`
- Maximum direction deviation: `15°`
- Must show: 完整烟囱冠部、主屋脊、端山墙和低翼
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

- 主体、端翼、后翼、低玻璃翼、门廊柱和砖拱门柱拆分；
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
| Evidence | Case、coverage、Brief | N/A | N/A | Passed |
| Massing | 主体、屋面、三联烟囱、门廊和低翼 | 三固定机位 | Sandbox Massing | Pending |
| Calibration | 比例、方向、接地和开放路径 | Fixed renders | Gate M | Pending |
| Master | 开口、半木构节奏、入口和烟囱冠部 | 三固定机位 | Sandbox Master | Pending |
| Real map | Building Engine Master | N/A | `/?start=hudec` | Pending |
| Cold build | 干净 worktree 单一 CLI 重建 | SHA / structure | N/A | Pending |

## Validation

- [x] 外置快照三份图片与 OSM JSON SHA 和工作副本一致
- [x] Observed / Inferred / Unknown 分离
- [x] 至少五处 Hudec 身份构件
- [x] Compiler、Schema、Art Profile SHA 冻结
- [ ] Massing 固定机位和 Sandbox 通过
- [ ] Gate M 记录绑定当前 DSL / GLB / collision SHA
- [ ] Master 固定机位、GLB 和碰撞自动检查通过
- [ ] 参考 / Blender / Three.js 三联图通过
- [ ] 真实 `/?start=hudec` 可见、接地、方向和碰撞通过
- [ ] 默认 Hudec 页面仍加载原正式 Hero
- [ ] 干净 worktree 冷启动复建得到一致 GLB
- [ ] 新动态证据快照与全量 SHA 通过

## Decision Log

### Iteration 0 — 2026-07-28 evidence freeze

- Changes: 将 Hudec 冻结为第三栋单建筑盲测，建立 Case、coverage 和质量合同。
- Evidence: 官方西后侧照片、政府历史西立面草图、Wikimedia 庭院正面、
  OSM way `494633921`。
- Compiler result: 尚未运行；冻结 SHA。
- Remaining inference: 东/背立面、测绘尺寸、隐藏开口和风向标细节。
- Rollback point: `eb4be8c`。

