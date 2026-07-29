# Blender Model Brief: Xinhua Road Plane Tree Canopy V4

## Scope

- Asset family: `xinhua-road-plane-tree-canopy-v4`
- Runtime entry: `/?start=house315`
- Generator: `scripts/create_xinhua_plane_tree_canopy_v2.py`
- Identity outputs: `public/models/xinhua-road/plane-tree-{a,b,c,d}.glb`
- Massing outputs: `public/models/xinhua-road/plane-tree-massing-{a,b,c}.glb`
- Runtime Hero: 0
- Rollback: Git `8810d56`（V3 独立终审通过候选，未部署）

## User Correction

2026-07-28 用户对 V3 提出两项直接视觉纠正：

1. 正常树木的叶冠应由“球形小点、数量多点”构成；
2. 弱网树木的枝干应向周围所有方向生长，不能统一向道路中心引导，否则单树
   会读成被风吹向路中。

本轮不得再用定向枝条承担整条林荫道造型；林荫连续性由单树径向冠幅、株距和
相邻树冠自然搭接形成。

## Evidence Boundary

- Canonical real-road photo、V2 failure screenshot 和 V3 runtime 证据继续引用
  `docs/research/plane-tree-canopy-v3-reference-manifest.json`。
- 新反馈是产品视觉裁决，不新增照片测绘证据。
- 已观察：
  V3 Identity 叶块过大，缩略后焊成平整屋顶；V3 Massing 的枝序存在统一道路
  内侧偏向。
- 合理推断：
  小叶团直径可先降到约 V3 的 50%–65%，数量提高约 45%–70%；
  Massing 使用四向短主枝和近圆形冠幅。
- 未知：
  每株实树的精确枝序、冠幅、风偏与修剪历史。

## View Coverage

| View | Evidence / runtime | Gate |
| --- | --- | --- |
| Canonical | 用户新华路道路中心实景 / `?start=house315` | 林荫连续，但单株不呈统一风偏 |
| Side | Blender `test_plane-tree-*_side_preview.png` | 小球状叶团数量增加，粗枝仍可辨 |
| Root | Blender `test_plane-tree-*_root_preview.png` | 根颈与地面接触不回退 |
| Weak road axis | `network=weak` 固定移动目标 | 左右树枝均不形成单向斜梁阵列 |

## Identity Contract

- 保留四个结构变体、低分叉、根颈和斑驳树皮。
- 每株五根主枝覆盖四个象限和中央高位；运行时朝向只用于变体，不得形成单侧冠层。
- 每根主枝使用约 8 个较小叶团，顶部使用约 20 个补冠叶团。
- 叶团近球形，仅保留轻微 XYZ 差异；不得使用少量超大扁块封顶。
- 近景应能看出多个低多边形球状颗粒；缩略后仍读成茂密树冠。
- 允许不规则小孔透光，不能重新退回 V2 的贯穿蓝天槽。

## Massing Contract

- 每株至少四根短主枝，分别覆盖前、后、左、右或四个错位象限。
- 四根枝条使用不同起点、粗细和弯曲方向；不能共享明显单一迎风面。
- 冠层近圆形，八方向叶团加一个中心高团；运行时 yaw 变化不能改变平衡读感。
- 跨路搭接来自冠幅，不来自统一指向道路中心的枝条。

## Runtime Budget

| Tier | Variants | Budget |
| --- | ---: | --- |
| Identity | 4 | 4,000–8,500 tris，最多 450 KB，0 images |
| Massing | 3 | 250–900 tris，最多 60 KB，0 images |
| Runtime Hero | 0 | 不加载 |

继续使用 InstancedMesh；标准与弱网均在真实 production-static 页面验收。没有
同条件 V3 基线时不声明性能提升。

## Exit Gate

1. Identity 固定预览显示更多、更小、近球形叶团；
2. 弱网道路轴线截图不再显示整排树向道路中心倾斜；
3. GLB 7/7 通过节点、预算、图片和确定性重建；
4. 标准 / 弱网控制台 0 error，120 帧样本不低于 55 FPS；
5. 独立终审无 Critical / Important；
6. 用户确认视觉前不合并 `main`、不部署 VPS。

## Evidence Snapshot

- Path:
  `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-28-plane-tree-canopy-v4-final-runtime-8810d56`
- Files: 630
- Bytes: 265256960
- SHA-256: 全部通过
- Disposition: 首轮独立审查前快照，只读保留；径向 Identity 修正后的最终快照另建。

Post-review candidate:

- Path:
  `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-29-plane-tree-canopy-v4-post-review-candidate-8810d56`
- Files: 630
- Bytes: 264871936
- SHA-256: 全部通过
- Remaining blocker: 径向 Identity 修正后的 production-static 最终截图和标准档性能采样。
