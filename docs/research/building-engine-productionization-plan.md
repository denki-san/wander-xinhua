# 新华漫游建筑引擎：生产化验收方案

- Status: `evidence-corrected-engine-v2-cold-build-passed-output-snapshot-pending`
- Branch: `codex/building-engine-spike`
- Accepted Spike implementation: `6d294381da9011359af08100ea17ac44efd421ed`
- Spike closure: `16f196fdf4479ca170509c2d4b797850e6a1a263`
- Blind-test runtime implementation: `f4ab24af432f06c1097db0c8a0e92fb729438008`
- Cold-build closure: `9762c919450125ae24ce736ce33034d549ffbbc8`
- Acceptance snapshot: `2026-07-28-9762c91`
- Evidence-corrected implementation: `53b7a6dda3082fbcb244437a8ce0a40c6a39d362`
- Scope: 新证据修正版 Compiler、真实 `?start=` QA、干净复建、合并前审查
- Explicitly excluded: 修改默认 production registry、替换正式 GLB、Meshy、
  后台、数据库、Worker、任务队列、push、合并和部署

## 1. 本轮要回答的问题

原第三栋冻结 Compiler 盲测已被新照片推翻。本轮不继续扩架构，只验证：

> 用一个通用 `shed` roof 扩展修复证据表达缺口后，能否不加入 Hudec 特判，
> 保持 House 315 与孙科别墅回归通过，并让证据修正版 Hudec 重新通过三审核门
> 和真实新华漫游 `?start=` 页面。

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
- House 315、Hudec、孙科别墅全部重建后，`qa --asset all --stage all` 六级
  产物均通过；两栋回归资产的 GLB / collision SHA 保持不变；
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

当前只剩新输出证据快照与复审。完成前状态仍不是 merge-ready。
