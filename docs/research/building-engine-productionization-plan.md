# 新华漫游建筑引擎：生产化验收方案

- Status: `production-promotion-ready-local`
- Branch: `codex/building-engine-spike`
- Accepted Spike implementation: `6d294381da9011359af08100ea17ac44efd421ed`
- Spike closure: `16f196fdf4479ca170509c2d4b797850e6a1a263`
- Blind-test runtime implementation: `f4ab24af432f06c1097db0c8a0e92fb729438008`
- Historical cold-build closure: `9762c919450125ae24ce736ce33034d549ffbbc8`
- Historical acceptance snapshot: `2026-07-28-9762c91`
- Evidence-corrected implementation: `53b7a6dda3082fbcb244437a8ce0a40c6a39d362`
- Evidence-corrected closure: `45cc711`
- Evidence-corrected acceptance snapshot: `2026-07-29-45cc711`
- Production promotion reviewed source: `c2e600a08a74e19d41b7bebe2a1e0cd607f201f0`
- Production promotion acceptance snapshot: `2026-07-30-c2e600a`
- Scope: 新证据修正版 Compiler、真实 `?start=` QA、首栋默认 registry promotion、
  原子回滚、同条件本地基线和独立集成 worktree 本地合并
- Delivery formula: `2 栋正式生产案例 + 1 栋保留的实验案例`
- Formal production cases: `house-315`、`hudec-memorial`
- Retained experimental case: `sun-ke-villa`
- Explicitly excluded: 其他建筑 promotion、Meshy、后台、数据库、Worker、任务队列、
  push、部署和线上性能结论

## 1. 本轮要回答的问题

原第三栋冻结 Compiler 盲测已被新照片推翻。本轮不继续扩架构，只验证：

> 用一个通用 `shed` roof 扩展修复证据表达缺口后，能否不加入 Hudec 特判，
> 让 House 315 保持正式生产回归通过，并让证据修正版 Hudec 重新通过三审核门
> 和真实新华漫游 `?start=` 页面；孙科别墅继续做实验回归，但不进入本轮正式
> production promotion/manifest。

当前验收数字必须拆开报告：

- 正式生产：House 315 + Hudec，Massing / Master 共 `4 / 4`；
- 实验保留：孙科别墅，Massing / Master 共 `2 / 2`；
- 合计 `6 / 6` 只表示所有 Case 回归，不等于“三栋生产交付”。

通过本轮最多得到 `merge-ready-evidence-corrected-experimental`，不能自动替换
生产建筑或发布。

## 2. 原冻结输入（已失效）

| 输入 | 冻结 SHA-256 |
| --- | --- |
| `scripts/compile_garden_villa.py` | `1c6674b0943dd6d992a4d595cfcba848b4c6e00f473c1fde39d929e7c58a00fe` |
| `building-engine/schema/building-dsl.schema.json` | `fbcce0470e7efa3a845771fb0b764ac38e9e702d1cbe920376f75c3aff75b619` |
| `building-engine/art-profiles/xinhua-autumn-lowpoly-v1.json` | `be83132c810c9fe0e36d7070d61648ae43ac820621b785324ad6bc86cc4e9c10` |

盲测期间：

- 不读取或复制 `scripts/create_hudec_memorial_v2.py` 的几何实现；
- 不修改上述三个冻结输入；
- 可以修改通用 CLI、测试和 QA 路由，使其发现第三个 Case；
- 如果现有 DSL 无法表达关键结构，本轮记录 `compiler-gap` 并停止 Final Gate；
- 不允许加入 `if assetId === "hudec-memorial"` 或等价资产专用 Compiler 分支。

已有 Hudec Hero / Identity / Massing 只作为 DSL 冻结后的只读结果对照，不作为
几何输入或可复制代码。

### 2.1 新证据修正版冻结输入

| 输入 | Evidence-corrected SHA-256 |
| --- | --- |
| `scripts/compile_garden_villa.py` | `20ed07e153cf4ef25219ec9e00ae3fcce35c4f2de6b2fe2a65119bd5f4bdfbb9` |
| `building-engine/schema/building-dsl.schema.json` | `9fd4bc658d6a8e7e3972961dc114c4b05962f19a3b161b41a2c90b1ed7a4bfb8` |
| `building-engine/art-profiles/xinhua-autumn-lowpoly-v1.json` | `be83132c810c9fe0e36d7070d61648ae43ac820621b785324ad6bc86cc4e9c10` |

新 Compiler 只增加通用 `shed` 屋顶及 `highSide` 方向校验；Compiler 源码仍不得
出现 `hudec-memorial` 或其他资产 ID。

## 3. 第三栋盲测资产

### 3.1 选择

- Stable asset ID: `hudec-memorial`
- Subject: 邬达克纪念馆（邬达克旧居）
- Address: 上海市长宁区番禺路 129 号
- Archetype: `garden-villa`
- Runtime instance: 复用现有 `hudec-memorial` 落点，不新增实例
- OSM binding: way `494633921`

它比其他候选更适合第三题：

- 是单栋花园住宅，不把两栋建筑或商业场地合并成一个 Case；
- canonical、侧向/纵深、入口/身份细节均有当前本地证据；
- 既有正式落点、碰撞和 `/?start=hudec` 可作为真实运行时合同；
- 紧凑复合坡屋顶、长单坡玻璃翼、白色烟囱塔与半木构双山墙能测试 DSL 的
  组合能力。

### 3.2 继续 Hold 的候选

| 候选 | 状态 | 原因 |
| --- | --- | --- |
| `one-step-garden` | `hold` | 同一资产合同包含前后两栋建筑和商业场地，不适合作为单栋盲测 |
| `villa-le-bec` | `hold` | Case 包含 street villa、garden villa 与庭院关系 |
| `xinhua-villas-211` | `blocked-evidence` | 成员与门牌绑定不足 |
| `xinhua-villas-329` | `blocked-evidence` | compound 成员证据仍不适合单栋盲测 |
| `xinhua-mansion` | `blocked-evidence` | 当前同机位与纵深证据不足 |

## 4. 证据门

输入快照：

```text
/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/
└── snapshots/2026-07-28-0ef306f/
```

| Evidence slot | 本地证据 | SHA-256 | 状态 |
| --- | --- | --- | --- |
| User canonical / overview | `hudec-memorial-user-oblique-overview-20260728.png` | `7f287bc923c99217ab208025b74357e567046226e51f8d26131cc990cbbd50c6` | `covered-source-provenance-partial` |
| User canonical crop | `hudec-memorial-user-oblique-overview-crop-20260728.png` | `5337dabc16367068f18bde2a0f6c62c8e431bd808cb4a82cd667ed2f68ab2b35` | `duplicate-view-not-independent-coverage` |
| User historic front | `hudec-memorial-user-historic-front-20260728.png` | `63dee9616e1a5faa8891f3bf14771ca5871f9c623279254dc4301155258dfe8e` | `covered-source-provenance-partial` |
| User glass wing / side | `hudec-memorial-user-glass-wing-20260728.png` | `8f33685ca2b01459412490d04c6710328b86e56fa8c2e5bb525cf07e4c0d64d8` | `covered-source-provenance-partial` |
| Canonical / depth | `hudec-memorial-street-official-2026.jpg` | `5d1775a76aa341431ff03c7f04efd2b74fe143f230a1205f128ec53262c1d28f` | `covered` |
| Side / depth | `hudec-memorial-west-elevations.jpg` | `a23e28ef2cd1b985b5217654cca797b20f83048945d4fe57e9abac4fd8bf6a4b` | `covered` |
| Entrance / facade | `hudec-memorial-front-wikimedia.jpg` | `d2284eaec967e7414ad5873d2c63795b051b112a30dd9f39f3f7641a690a8f86` | `covered` |

外置快照共 `669` 个文件、`272363520` bytes，`SHA256SUMS` 已全量通过。四张
用户图片的原始 URL、作者和拍摄日期未知；两张可见水印只按画面事实记录，不据此
虚构来源。参考图只用于研究，不嵌入 GLB，不作为运行时贴图。

### Observed

- 黑白半木构主体、深出檐陡坡屋顶和密集窄窗；
- 高低错落的连续屋面与低玻璃翼；
- 落地白色烟囱塔、顶部成组红砖烟道及后侧次烟囱；
- 入口三角门廊、木门、台阶和砖拱门；
- 端山墙全高木构节奏；
- 屋脊三鸟形风向标。

### Inferred

- 水平尺度由 OSM compound envelope、现有已验收落点和人物/门尺度共同校准，
  不冒充测绘尺寸；
- 不可见面的开口只保持低细节和结构连续；
- 风向标只保留原创低多边形轮廓，不复制雕塑细节。

### Unknown

- 完整东立面、背立面与隐藏开口；
- 精确屋坡、层高、烟道尺寸和室内平面；
- 精确地籍边界及当前被植被遮挡的小型构件。

## 5. 身份、预算与碰撞合同

至少保留五项识别构件：

1. 前后交错的黑白半木构双山墙；
2. 主屋脊与前部长单坡玻璃翼；
3. 落地白色烟囱塔与顶部成组红砖烟道；
4. 三角入口门廊与砖拱门；
5. 端山墙全高木构和低玻璃翼。

预算沿用 Spike：

- Master：最多 `12,000` triangles、`64` nodes、`10` materials、
  `0` images、`1,500,000` bytes；
- Massing：最多 `2,500` triangles、`32` nodes、`5` materials、
  `0` images、`500,000` bytes。

碰撞复用同一 DSL 合同：

- 主体、侧翼、玻璃翼和门廊实体分开；
- 入口路径与建筑绕行路径必须开放；
- 不使用覆盖整个庭院或 compound 的单一大盒；
- Massing 与 Master 的碰撞语义一致。

## 6. Pipeline 与审核门

```text
已审核 Hudec 证据
→ 新 Building Case / DSL
→ 冻结的 garden-villa Compiler
→ Massing
→ Gate M 人工校准
→ Low-poly Master
→ GLB / collision 自动检查
→ Building Engine Sandbox
→ 真实 /?start=hudec QA
→ Gate F 最终对照
→ 干净 worktree 冷启动复建
```

三个原审核门不变：

1. Evidence Gate：证据覆盖、主体绑定、Observed / Inferred / Unknown；
2. Massing Gate：三固定机位、比例、方向、接地、入口和碰撞；
3. Final Gate：参考 / Blender / Three.js 三联对照与已知未知项。

新增两个生产化门：

4. Real-map Gate：生成资产通过开发专用 QA tier 进入实际
   `/?start=hudec`，默认 registry 和正式 GLB 不变；
5. Cold-build Gate：从当前提交创建干净 detached worktree，只用单一 CLI
   重建第三栋；GLB SHA、结构、碰撞和 lineage 必须与接受产物一致。

## 7. 真实场景接入边界

计划新增只在显式查询参数命中时生效的开发 QA tier：

```text
/?start=hudec
&qaModelId=hudec-memorial
&qaModelTier=engine-master
&cameraQa=1
&qaAutoStart=1
&effects=off
&district=off
```

该路径：

- 复用现有 Hudec placement、start、yaw 和真实世界环境；
- 加载 Building Engine Master 与对应碰撞；
- 暴露实际加载 tier、GLB URL、SHA、碰撞与页面错误；
- 不改变无查询参数时的正式 Hero；
- 不写入 production asset registry，不更新默认 cacheVersion。

## 8. 完成与合并判断

只有以下全部满足，才能报告
`merge-ready-evidence-corrected-experimental`：

- 新 Compiler、Schema、Art Profile SHA 冻结且三栋 Case 回归通过；
- 通用扩展中不存在 Hudec 或其他资产专用分支；
- Hudec 新 DSL 通过 Evidence、Massing、Final 三审核门；
- Building Engine Sandbox 与真实 `/?start=hudec` 均通过；
- 默认 Hudec 页面仍加载原正式 Hero；
- 干净 detached worktree 冷启动复建通过；
- 专项测试、`npm test`、`npm run lint` 通过；
- 新截图、指标和记录进入新的不可变外置快照且全量 SHA 通过；
- 没有 push、合并或部署。

出现下列任一情况，结论为 `not-merge-ready`：

- 为 Hudec 加入资产专用 Compiler 分支；
- 只能在独立 Sandbox 中显示，真实 `?start=` 未通过；
- 冷启动复建无法得到一致 GLB；
- 默认 production registry 或正式 Hudec GLB 被替换；
- 关键结构依赖未知证据或旧生成器代码补齐。

## 9. 旧版验收结果（已被新证据撤销）

本节只保留 `2026-07-28-9762c91` 快照所对应的历史结果，不可继续作为当前
视觉通过或合并依据。

### 9.1 冻结与盲测

- Compiler、Schema、Art Profile 的冻结 SHA 全程未变化；
- `hudec-memorial` 只通过新增 Case / DSL 表达，Compiler Python 中不存在
  Hudec、House 315 或孙科别墅的资产专用分支；
- Massing、Final 和真实地图门均通过，已知东/背立面与精确测绘尺寸继续保持
  `unknown`，没有用旧 Hudec generator 补齐。

### 9.2 真实运行时

- production Sandbox 的 canonical、side、entrance 三固定机位通过；
- 真实 `/?start=hudec` 显式 `engine-master` 路线通过：入口最终距目标约
  `0.0551` world unit，向建筑中心持续移动仍在墙前保留约 `3.3828`
  world unit；
- 无 QA 参数的默认 Hudec 页面仍只加载既有
  `hudec-memorial-v2-hero.glb?v=20260726-hero-598b2ba19e24`。

### 9.3 确定性、回归与快照

- clean detached worktree 从 `f4ab24a` 只运行单一 CLI，得到与接受产物
  逐字节一致的 Massing、Master 和 collision；
- 专项测试 `9 / 9`，`npm test` 为 `447 / 447`；
- `npm run lint` 为 `0 error`；唯一 warning 位于未被本分支修改的既有测试；
- 新不可变快照为
  `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-28-9762c91/`，
  来源 worktree clean，包含 `663` files、`271917056` bytes；
- 归档脚本与独立复核均得到 `663 / 663` SHA-256 通过，其中 `44` 项属于
  Hudec Building Engine 本轮产物、截图或记录。

### 9.4 合并边界

本分支结论为 `merge-ready-experimental`，不是“真实生产建筑链路已经完成”。
允许合并的只是：

- 单一 `garden-villa` Compiler 与 CLI；
- 三个可追溯 Case（其中第三个为冻结 Compiler 盲测）；
- 隔离 Sandbox；
- 只在显式 QA 参数下生效的 Hudec `engine-master` tier。

本结论不授权替换正式 Hudec Hero、批量迁移现有建筑、推送、合并或部署。
真正成为默认生产链路前，仍需另开任务设计 registry promotion、单资产回滚、
线上性能基线和首个正式资产替换验收。

## 10. 2026-07-28 新证据重开

用户新增四张邬达克纪念馆照片后，Section 9 的通过结论只保留为历史记录，当前
状态回退为 `not-merge-ready`。

新照片直接证明：

- 前部玻璃空间位于与主体连续的长单坡屋面下，不是独立低双坡小屋；
- 烟囱包含落地白色实体塔身和顶部成组红砖烟道，不是从屋面直接伸出的三根细柱；
- 主体是紧凑主屋脊、长坡翼和前后交错双山墙的组合，不是宽盒主体加松散侧翼；
- 旧三联图已经显示这些轮廓差异，原人工 Final Gate 属于假通过。

现有 Compiler 只支持 `gable / hipped / flat` 屋顶，无法诚实表达照片中的长单坡
玻璃翼，因此记录为通用 `shed` roof `compiler-gap`。若本轮增加通用屋顶类型，
冻结 Compiler SHA 将变化，原“第三栋不修改 Compiler 的盲测通过”结论永久失效；
必须冻结新 Compiler、Schema，再对 House 315、孙科别墅和 Hudec 三栋重跑自动
回归，并对 Hudec 从 Evidence Gate、Massing Gate、Final Gate、真实地图和冷构建
完整重验。

## 11. Evidence-corrected Engine v2 当前重验

- 通用 Compiler 已加入 `shed` roof；Compiler
  `20ed07e…`、Schema `9fd4bc65…`，没有资产 ID 分支；Schema 与 CLI 均拒绝
  非法轴向、错侧、缺字段和非 `shed` 的 `highSide`；
- House 315 与 Hudec 用
  `qa --asset all --scope production --stage all` 得到正式 `4 / 4`；
  孙科别墅用 `--scope experimental` 单独得到实验 `2 / 2`；全体 Case 合计
  `6 / 6`，但孙科不计入生产交付；
- Hudec Massing `15e448bf…`、Master `cd3d49fc…`、collision
  `cb910b91…`，Master 为 `2676` triangles、`8` materials、`0` images /
  textures / animations / skins、`194952` bytes；
- Gate M 当前记录为 `massing-review-006.json`，Final Gate 当前记录为
  `final-review-003.json`，均绑定新 DSL / GLB / collision SHA；
- 新参考 / Blender / Three.js 三联图明确呈现长单坡玻璃翼、落地白色烟囱塔、
  成组红砖烟道与交错半木构双山墙；
- production Sandbox 三固定机位、接地、九个拆分碰撞体与三条开放路径通过；
- 真实地图入口最终距目标 `0.0259` world unit；持续朝实体墙移动仍剩
  `3.6810` world unit；默认 Hudec 入口没有请求 Building Engine Master；
- detached worktree `77d6719…` 曾得到逐字节一致的 Hudec 两级 GLB 与 collision，
  六张固定机位预览解码后像素一致；首次失败同时修正了“错误要求仓库工作副本
  必须存在”的证据校验，使外置不可变快照重新成为唯一归档真值；此后审查又
  加固了 Schema / CLI 并重建两栋回归资产，因此该冷构建只作历史证据，最终提交
  仍需重新冷构建三栋；
- detached worktree `888ccb7…` 曾重建三栋并通过二进制与像素一致性检查；
  复审随后发现 `shed` 长度、跨度和高度数值范围仍可绕过 CLI，因此该记录降为
  历史通过；
- 最终 detached worktree `53b7a6d…` 在补齐数值类型、有限值、正数范围和
  `ridgeHeight > eaveHeight` 门后重新重建三栋；六个 GLB 与三个 collision
  均和已审核产物逐字节一致，18 张固定机位预览解码后像素一致，六级自动 QA
  全部通过；
- 全量 `npm test` 为 `448/448`，lint 为 `0 error / 1` 条既有 warning；
- 正式 Hudec Hero、默认 registry 与 cacheVersion 未改变。

最终外置快照 `2026-07-29-45cc711` 来自 clean worktree，包含 `678` 个文件、
`279162880` bytes；归档脚本与独立全量 `SHA256SUMS` 回查均通过。两轮代码审查
发现的三栋 lineage、`shed` 字段/方向/数值门和证据快照真值问题已全部修复，
最终复审为 `0 Critical / 0 Important`。

本分支结论为 `merge-ready-evidence-corrected-experimental`。它只表示隔离的
Building Engine Spike、显式 QA tier 和证据修正版 Hudec 可以进入后续合并评估；
不表示已替换默认生产 Hero，也不授权 push、合并或部署。真正成为默认生产链路
仍需单独执行 registry promotion、线上同条件性能基线和可回滚的首栋正式替换验收。

## 12. 2026-07-29 A 方案 production promotion 合同

用户从三种不同 3D 结构理解中选择 A，并进一步确认两个烟囱都位于正面屋坡，
白色基座与红砖烟囱头都需要加高。当前选定产物已重新通过 Evidence、Massing、
Final、Sandbox、冷构建与外置快照门，本节开始执行首栋正式替换。

### 12.1 Promotion 输入

| 输入 | 路径 | SHA-256 |
| --- | --- | --- |
| Building DSL | `building-engine/cases/hudec-memorial/building-dsl.json` | `637a2473f5285c42ed7d1cc8c2788a3ef83db335588a00e63d3498d6be0b5bf9` |
| Master GLB | `public/models/building-engine-spike/hudec-memorial/hudec-memorial-master.glb` | `b7002cbd4e5cb2ce9448e747ebacd9cf7faaa3cdcd81046272c0e57fd3635002` |
| Massing GLB | `public/models/building-engine-spike/hudec-memorial/hudec-memorial-massing.glb` | `c83fb903cc0c8ee9adc047a787a52f7e3e0f35257d305adfd8ba5bb0aabbb4d2` |
| Collision | `public/models/building-engine-spike/hudec-memorial/hudec-memorial-collision.json` | `0e853d79a138aad90a77e97ce79ae58af242a2853ccf1cf2a02ba0536d78e637` |
| Spike acceptance snapshot | `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-29-a396474` | `648 / 648` 已通过 |

### 12.2 默认三档策略

本轮不重新生成一个虚假的独立 Identity。选定 Master 只有 `2,980` triangles、
`216,172` bytes，低于旧 Identity 的 `392,920` bytes，也远低于旧 Hero 的
`1,565,920` bytes，因此默认三档采用：

| Runtime tier | Promotion 产物 | 说明 |
| --- | --- | --- |
| Hero | Building Engine Master | 近景正式模型 |
| Identity | 同一个 Building Engine Master URL | 复用浏览器缓存，避免新旧结构切换跳变 |
| Massing | Building Engine Massing | 远景覆盖模型，与 Master 同 DSL、原点、方向和碰撞语义 |

这是一项明确的首资产策略，不表示后续建筑都应共用 Hero / Identity。只有在资产
本身已满足低模预算且同 URL 缓存收益高于独立 Identity 收益时才可复用。

### 12.3 Registry、摆位与碰撞

- `hudec-memorial` 默认 `model` 切换为 Building Engine Master；
- `cacheVersion` 使用当前 Master SHA 前 12 位 `b7002cbd4e5c`；
- 世界位置、yaw 与 scale 暂保持
  `[92.535374, -132.52181]`、`0.153486288`、`0.88`；
- `localBounds` 必须与当前 Master GLB POSITION bounds 一致；
- 正式 `localObstacles` 必须逐项来自当前 collision JSON 的五个拆分体块；
- `collisionMargin` 为 `0`，不在已审核碰撞体外重复扩张；
- 默认 `/?start=hudec` 必须能看到 A 方案、接地，并保持中央入口和两侧绕行路径；
- 如果真实页面显示道路侵占、相机裁切或入口不可达，只校准 registry 的 placement /
  start / camera，不修改已审核 DSL 来迁就地图。

### 12.4 回滚合同

旧资产不删除、不覆盖：

```text
/models/requested-pois/hudec-memorial-v2-hero.glb
?v=20260726-hero-598b2ba19e24
```

显式 `qaModelTier=legacy-hero` 必须继续加载旧 V2 Hero 与旧碰撞，用于同条件视觉、
性能与故障回查。Promotion record 必须保存旧、新 URL、SHA、bounds、碰撞和
registry 字段；需要回滚时只恢复 Hudec 的 registry 与三档合同，不删除新旧二进制。

### 12.5 审核门

Promotion 只有以下全部通过才可报告 `production-promotion-ready-local`：

1. 默认 `/?start=hudec` 只加载新 Master，不再请求旧 Hero / Identity；
2. `legacy-hero` 显式 QA 路由仍可加载旧 V2 Hero；
3. 默认 canonical、侧向和入口三个真实地图视角通过；
4. 页面内确定性移动通过中央入口、实体墙阻挡与至少一条侧向绕行；
5. 新旧两条路线在同视口、同 production build、同预热和采样时长下保存原始性能
   样本；没有线上环境时只能称本地 matched baseline；
6. Registry bounds 与 GLB 一致，五个碰撞体与 collision JSON 一致；
7. Hudec 专项、Building Engine 全资产 QA、`npm test`、`npm run lint` 通过；
8. 独立代码审查无 Critical / Important；
9. 新截图、性能、promotion 与回滚记录进入新的不可变外置快照且全量 SHA 通过；
10. 保持不 push、不合并、不部署，不改动原 dirty worktree。

本地通过仍不等于已经上线。没有 Sites / VPS 同提交验收时，只能报告为
`production-promotion-ready-local`，不能声称线上生产替换完成。

### 12.6 本地真实入口初验

实现提交 `a65a659` 已完成默认 registry、Hero / Identity / Massing 三档、
正式碰撞与相机碰撞接入，原 V2 Hero 作为 `legacy-hero` 回滚路线保留。

- 默认 `/?start=hudec` 只观察到当前 Massing 与复用的 Master，请求状态均为
  `200`，没有旧 Hero / Identity 请求；
- canonical、侧向、入口、实体墙阻挡和一条完整侧向绕行均通过，控制台与页面错误
  都为 `0`；
- DSL 碰撞为 Blender `XY`，正式 registry 使用 GLTF 原始局部坐标映射
  `minZ = -maxY`、`maxZ = -minY`，避免把前后方向错误照搬；
- 同一 production build、可见页面、弱网 profile 与 `120` 帧样本下，新旧路线
  都维持约 `60 FPS`；这只表示本地样本未见回归；
- 旧 Hero 二进制为 `1,565,920` bytes，新 Master 为 `216,172` bytes；
  旧三档二进制合计 `2,117,152` bytes，新 Massing 加复用 Master 合计
  `238,212` bytes；
- 回滚页仍会被现有渐进加载预取新版 Massing / Master，因此不能用整页
  Resource Timing 声称严格传输 A/B 或线上性能提升。

原始路线、坐标、帧样本、截图 SHA 与回滚限制记录在
`docs/research/build-records/building-engine-spike/hudec-memorial/production-promotion.json`。
当前状态为 `runtime-pass-pending-project-gates`，仍需全资产 QA、全量测试、lint、
独立代码审查和新的不可变外置快照。

### 12.7 独立审查修复

首次独立审查为 `0 Critical / 1 Important`。Important 指出：
`legacy-hero` 虽然加载旧 V2 GLB 和旧五碰撞体，但仍继承新版
`collisionMargin: 0`，相机也无条件使用新版五碰撞体，实际是新旧混搭，不构成
真实回滚。

修复后：

- `legacy-hero` 显式恢复旧 registry 的 `collisionMargin: 0.2`；
- Hudec 相机碰撞会跟随 active QA tier，旧模型、旧角色碰撞和旧相机碰撞同时切换；
- 新增自动测试直接比较 legacy 角色 / 相机碰撞与旧五碰撞体；
- runtime record 的 URL、资源、碰撞语义与七张截图 SHA 全部进入自动一致性测试；
- 2026-07-30 再次在 production build 打开 legacy 路由，旧 V2 Hero 状态为
  `loaded`，console / page errors 均为 `0`；
- 复审时机器负载与原 matched baseline 不同，观察到的约 `46 FPS` 只记录为功能
  复核样本，不覆盖也不参与同条件性能结论。

当前仍需修复后的全量测试、lint、独立复审和外置快照，才可晋级
`production-promotion-ready-local`。

### 12.8 Promotion 最终本地结论

- 修复后 `npm test` 为 `456 / 456`，lint 为 `0 error / 1` 条既有 warning；
- Building Engine 两栋正式生产案例的 Massing / Master 为 `4 / 4`；
  孙科别墅作为保留实验案例另计 `2 / 2`；
- 独立复审为 `0 Critical / 0 Important / 0 Minor`；
- clean detached worktree `c2e600a` 生成外置不可变快照
  `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-30-c2e600a`；
- 快照包含 `745` 个文件、`314171392` bytes，来源 worktree clean；
- 归档脚本与独立回查均为 `745 / 745` SHA-256 通过；
- 原 dirty worktree 的未跟踪 A/B/C 与 topology 候选目录全部保留，未删除、未暂存；
- 没有 push、合并或部署。

因此本分支达到 `production-promotion-ready-local`：A 方案已在本地默认
`/?start=hudec` 成为真实生产 registry 链路，并具备可执行的旧 V2 原子回滚。
这表示可以进入主线合并评估，不表示线上已经替换；Sites / VPS 必须在获得发布授权后，
对同一合并提交另行验收。

孙科别墅已有 DSL、生成资产、测试和记录全部保留；它只存在于隔离 Sandbox 和
实验回归范围，不新增 Building Engine production promotion，也不计入本轮两栋正式
生产案例。
