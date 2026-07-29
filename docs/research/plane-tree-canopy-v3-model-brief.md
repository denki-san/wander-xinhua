# Blender Model Brief: Xinhua Road Plane Tree Canopy V3

## Scope

- Asset family: `xinhua-road-plane-tree-canopy-v3`
- Subject: 新华路成熟悬铃木连续林冠
- Runtime entry: `/?start=house315`
- Generator:
  `scripts/create_xinhua_plane_tree_canopy_v2.py`
- Identity outputs:
  `public/models/xinhua-road/plane-tree-{a,b,c,d}.glb`
- Massing outputs:
  `public/models/xinhua-road/plane-tree-massing-{a,b,c}.glb`
- Runtime Hero: 继续保持 0；离线 Hero 不进入产品。
- Product boundary:
  本轮修正树木结构、密度、色彩和林冠画面，不把道路两侧尚未完成的建筑环境
  伪装成已经还原。

## Why V2 Failed

Canopy V2 的技术门通过，但视觉门失败。用户在 2026-07-28 提供线上截图与新华路
实景对照，明确指出差距很大。失败不是贴图精度不足，而是一级形体错误：

1. 主分叉约在 4.1 scene units，形成过长的裸露直杆；实景中的粗大主枝更早出现；
2. 道路内侧主枝只延伸约 2 scene units，无法跨向道路中心；
3. 叶簇尺度约 0.4–0.75 scene units，并沿枝端离散排列，读成孤立球串；
4. V2 主动保留过多天空孔洞，破坏成熟树阵的连续拱顶；
5. 试验段总计 18 棵、全线非试验段约 14.5 scene units 间距，纵深节奏偏稀；
6. 运行时统一秋色削弱了用户夏季实景中的浓绿体量。

GLB 合规、请求正确、碰撞和 FPS 不能替代上述画面判断。

## Preflight Gate

- Worktree baseline:
  `4f5e33934d2ca427b9e2463267e27bf71b4c570e`
- Blender:
  `/Applications/Blender.app/Contents/MacOS/Blender`，`5.2.0 LTS`
- Single-asset command:
  `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_xinhua_plane_tree_canopy_v2.py -- --asset=<asset>`
- GLB audit:
  `python3 scripts/audit_glb.py <asset.glb> --forbid-images`
- Runtime:
  `/?start=house315&cameraQa=1&network=standard`
- Weak-network runtime:
  `/?start=house315&cameraQa=1&network=weak`
- Browser acceptance:
  真实生产静态构建中的固定道路中心视角、资源清单、控制台和性能采样。
- Blender MCP:
  本轮开始前尚未确认连接；不可用时使用 Headless Blender 固定机位降级，
  并明确记录，不复用 V2 截图。
- External evidence:
  `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-28-plane-tree-canopy-v3-user-feedback-4f5e339`
  已归档 620 个文件、263,761,920 bytes，`SHA256SUMS` 全部通过。

## Evidence and View Coverage

详细路径和 SHA 见
`docs/research/plane-tree-canopy-v3-reference-manifest.json`。

| Evidence slot | Evidence | What it proves | Coverage |
| --- | --- | --- | --- |
| Canonical | 用户提供的新华路道路中心夏季实景 | 连续拱顶、左右冠层搭接、主枝跨路、浓绿体量 | Supported |
| Current runtime | 用户提供的线上道路中心截图 | V2 裸杆、碎叶簇、中央大面积天空和稀疏节奏 | Supported |
| Side / oblique | V2 官方 2023 沿街照片 | 冠层下缘、树干与沿街空间关系 | Supported |
| Trunk detail | V2 官方 2025 树干近景 | 斑驳树皮和粗树干 | Supported |
| Survey | 无现场测绘 | 精确株距、树高、胸径和冠幅 | Missing |

### Canonical Comparison View

- Evidence:
  `repository/test_artifacts/test_plane_tree_canopy_v3_user_reference.png`
- View:
  道路中心线、接近人眼高度，沿道路纵深观察。
- Runtime reproduction:
  `?start=house315` 的道路中心 QA 机位；角色保持在画面下部，左右近景树干、
  道路中心上方树冠搭接和纵深树阵同时可见。

## Observed

- 成熟树干粗壮且形态不直，主分叉明显低于 V2 的长直裸杆比例。
- 多根粗大主枝向道路中心横展，左右树冠在道路上方互相穿插。
- 夏季叶冠由大尺度连续体量组成，同时保留细碎透光孔洞。
- 道路中心上方主要读成绿色拱顶，而不是两排互不相连的单树。
- 树冠下缘不齐，近景可见粗枝，远景则收敛成连续阴影和纵深廊道。

## Inferred

- `1 scene unit = 2.7 m` 下，主分叉高度先按 1.8–2.5 scene units 校准；
  这是视觉推断，不是测绘值。
- 单侧树冠向道路内侧延伸约 4.8–6.0 scene units，才能在当前道路轴线宽度下
  接近实景的跨路搭接。
- Identity 可用较少但更大的低模叶团形成连续块面，再用局部小簇打破外轮廓；
  无需逐片叶子。
- 当前季节表现应以夏季浓绿为默认，秋色只能作为显式季节变体。
- 道路纵深的视觉株距目标约 10–16 米；具体点位仍受入口和建筑碰撞约束。

## Unknown

- 用户参考图的精确拍摄位置、镜头焦距和罗盘方向。
- 图中每棵树的真实树高、胸径、冠幅、株距和个体枝序。
- 被树叶遮挡的背面枝条。
- 参考图拍摄年份与当前每棵树的对应关系。

## Quality Contract

### Identity Silhouette

1. **低位大分叉**：
   主分叉位于总高约 24%–34%，不再出现 V2 的长直电线杆比例。
2. **跨路骨架**：
   至少两根粗大主枝向本地 `-Y` 道路内侧弯曲延伸；近景枝粗必须可读。
3. **连续叶冠**：
   大、中叶团互相重叠成冠层块面；小叶团只负责边缘破形。
4. **个体差异**：
   A/B/C/D 改变主干倾斜、主叉数量、内伸冠幅、外侧收敛和局部透光孔，
   不能只换颜色或随机 yaw。
5. **树皮**：
   保留灰褐、浅灰、黄褐斑驳与连续根颈；树皮细节不得消耗林冠预算。

### Canonical Screen-space Gate

以下为当前画面合同，是基于用户实景的视觉校准目标，不声明测绘精度：

- 1280×720 道路中心视角中，画面上方 45% 区域的枝叶覆盖目标为 65%–82%；
- 道路中心线上方必须出现多处左右冠层视觉搭接，不能保留贯穿纵深的大面积蓝天槽；
- 天空仍以不规则小孔透出，目标为上方区域约 18%–35%；
- 最近三棵树的粗主枝宽度在画面中必须稳定可见；
- 缩略到 25% 后，首先读成“连续林荫道”，其次才读出单棵变体。

以上指标通过固定机位截图与遮罩/像素近似统计辅助判断，最终仍需三联图人工审查。

### Position, Density and Orientation

- 本地 `-Y` 继续定义为道路内侧。
- 每棵树只允许小角度确定性扰动，粗主枝必须朝向道路中心。
- 试验段从 18 棵提高到 20 棵。初始 26 棵目标在真实运行时只找到 20 个安全
  树位，因此锁定安全上限，不通过缩小入口净空强行凑数。
- 非试验段基础株距从 14.5 scene units 下调到约 5.4–6.2 scene units，
  仍使用建筑和入口净空过滤。
- 不用横向放大整棵树掩盖错误；冠幅由枝路和叶团几何实现。

### Runtime and Performance Budget

| Tier | Variants | Per-model target | Runtime |
| --- | ---: | --- | --- |
| Identity | 4 | 4,500–8,500 tris，最多 450 KB | InstancedMesh，0 images |
| Massing | 3 | 250–900 tris，最多 60 KB | InstancedMesh，0 images |
| Runtime Hero | 0 | 不加载 | 离线保留 |

- 增加实例数后仍保持共享 Geometry/Material。
- 标准与弱网在同一 1280×720、production-static、预热 8 秒、120 帧条件采样。
- 同条件 FPS 不低于 55；draw calls 和 triangles 必须记录，不以猜测声明提升。
- 树冠不参与玩家碰撞；碰撞仍只覆盖树干。

## Batch Plan

| Batch | Deliverable | Exit gate |
| --- | --- | --- |
| Evidence correction | 用户图归档、V3 manifest、失败复盘 | SHA 和 observed/inferred/unknown 完整 |
| Massing | 三个连续冠层远景变体 | Blender 固定街道机位首先读成拱顶 |
| Runtime greybox | 新密度、定向、地面和入口净空 | `?start=house315` 真实页面无穿模和封路 |
| Identity | 四个低分叉、跨路、连续叶冠变体 | canonical/side/root 新截图通过 |
| Materials | 默认夏季浓绿、斑驳树皮 | 不再被统一秋色削弱体量 |
| Optimization | 合并节点、实例批次和预算 | GLB 审计与性能门通过 |
| Final comparison | 用户运行时 / 用户实景 / V3 runtime 三联图 | 独立终审无 blocker |

## Required Deliverables

- 更新后的确定性 Blender Python 生成器；
- 4 个 Identity `.blend` / `.glb`；
- 3 个 Massing `.blend` / `.glb`；
- `test_` canonical、side、root、street 和运行时截图；
- `test_` 用户运行时 / 用户实景 / V3 runtime 三联图；
- V3 reference manifest、build record、runtime acceptance 和 Decision log；
- GLB 审计、自动测试、碰撞、性能和真实 `?start=house315` 验收。

## Decision Log

### Iteration 0 — V2 Rejected

- User verdict:
  “差距很大啊！”
- Decision:
  V2 不再作为视觉可接受基线，只保留为技术回退点。
- Directly supported changes:
  降低主分叉、增粗并延长跨路主枝、扩大并重叠叶冠、增加树阵密度、
  恢复夏季浓绿。
- Still inferred:
  精确分叉高度、内伸冠幅和株距数值；必须在固定运行时机位继续校准。
- Rollback:
  Git `4f5e339` 与外置 V2/Postfix 快照。

### Iteration 1 — Massing Safety Gate

- Initial target:
  315号试验段 26 棵。
- Runtime result:
  现有建筑、入口和 5.4 scene units 入口净空下只有 20 个安全树位，页面按合同
  拒绝加载并报告 `20/26`。
- Decision:
  试验段锁定 20 棵，不缩小入口净空；全线基础株距仍从 14.5 降到 6.0 scene
  units，林冠连续性主要由跨路枝和重叠叶团完成。
- Placement result:
  新华路安全树位总计 83 棵，side 0 为 44 棵、side 1 为 39 棵；
  加上幸福里既有 3 棵，资产库线上实例总计 86。

### Iteration 2 — Runtime Canopy and Weak-network Correction

- Standard-network result:
  固定道路轴线机位已从两排稀疏树冠变成连续绿色拱廊；低分叉、跨路主枝和
  夏季浓绿均在真实 production-static 页面可见，页面与控制台错误为 0。
- First weak-network result:
  初版 Massing 的五根长主枝在重复实例中形成“工程桁架”，独立审查和真实
  弱网页面均判定不可接受。
- First correction rejected:
  Massing 每株主枝从 5 根减至 3 根、source objects 从 26 降到 15 后，
  同机位仍形成连续长梁门架，独立终审判定 FAIL。
- Final correction:
  长跨路枝改为树干顶部的短、不等粗弯叉；跨路体量只由下压并互相重叠的
  大叶团承担，不再用可见长梁支撑。
- Final Massing budget:
  每款 580 tris、约 36 KB、1 node、0 images；仍在 Massing 预算内。
- Independent final review:
  PASS；上一轮唯一 Important“重复灰色直梁门架”已关闭，无 Critical /
  Important blocker。弱网短叉仍是有意粗粒度，但不再主导画面或形成工程构筑物
  读感。
- Performance:
  1200×807、production-static、页面可见条件下，标准网络 120 帧平均
  59.657 FPS，最终弱网 58.298 FPS。无同条件 V2 基线，因此不宣称性能提升。
- Publication:
  本地候选通过技术门；在用户确认新三联图前不覆盖 VPS。
- Final evidence snapshot:
  `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-28-plane-tree-canopy-v3-final-runtime-v2-4f5e339`，
  625 files、263,847,936 bytes、SHA256SUMS 全部通过。
