# Blender Model Brief: Xingfuli Current Street Furniture

## Scope

- Asset package: `xingfuli-current-street-furniture`
- Model assets: 4
- Runtime instances: 12（入口 5、水边座具 4、花槽 3）
- Runtime component: `app/scene/xingfuli-current-street-furniture.tsx`
- Generator: `scripts/create_xingfuli_current_street_furniture_models.py`
- Editable sources: `assets/models/source/nonbuilding/xingfuli-current-street-furniture/*.blend`
- Runtime GLB: `public/models/nonbuilding/xingfuli-current-street-furniture/*-visible-low.glb`
- QA route: `/nonbuilding-evidence-qa?asset=<slug>`
- Single-asset build command: `/opt/homebrew/bin/blender --background --python scripts/create_xingfuli_current_street_furniture_models.py -- --asset <slug>`
- Validation command: `node --test tests/test_xingfuli_current_street_furniture.test.mjs`

### Frozen inventory

| Slug | Model role | Site binding | Production integration |
| --- | --- | --- | --- |
| `xingfuli-pointed-entry-bollard` | 当前入口尖顶路桩 | 幸福里番禺路入口 | 5 个实例 |
| `xingfuli-water-edge-stone-seat-round` | 临水近球形座具 | 幸福里内部水景段 | 2 个推定实例 |
| `xingfuli-water-edge-stone-seat-long` | 临水长椭圆座具 | 幸福里内部水景段 | 2 个推定实例 |
| `xingfuli-water-edge-slim-planter` | 临水窄矩形花槽 | 幸福里内部水景段 | 3 个推定实例 |

本批仍只包含上述四个模型，不修改 18 栋建筑资产。2026-07-28 的正式接入只在
幸福里 `full` stage 加载这 12 个实例；`identity`、`massing` 和全览不请求这些
GLB。

## Compatibility Contract

- 18 栋建筑继续使用 Hero / Identity / Massing 升级管线，本批资产不改变该合同。
- 非建筑街具采用两态运行时合同：`visible-low` 与 `hidden`。
- `.blend` 是可编辑 Hero master；运行时只导出一份 `visible-low.glb`。
- 建筑式 Identity / Massing 对本批标记为
  `not-applicable-by-nonbuilding-two-state-contract`，不是漏交付。
- 当前恢复分支里的旧 `irregular-stone-bollard` 代表 2018 年入口的矮宽石桩；
  2026 证据中的尖顶路桩以新 slug 独立保存，不覆盖历史资产。
- 当前恢复分支里的 `rectangular-planter` 是跨场景共享原型；本批花槽具有幸福里
  场地绑定，不替换共享原型。
- 正式地图实例合同沿用 `assetId`、`variant`、`anchor`、`seed`、
  `footprint`、`collision`、`mobileTier`、`evidenceRef`，并保留主路、入口、
  木桥与临水通道 forbidden zones。

## Preflight Gate

- Blender binary and version: `/opt/homebrew/bin/blender`，5.2.0 LTS，可用。
- Blender MCP: `127.0.0.1:9876` 已通过 `get_scene_info` 读取当前场景。
- GLB audit command:
  `/Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py`
- Local preview fallback: 恢复 Worktree 没有 `test_local_preview.command`；
  使用 `npm run dev` 的 Vinext 开发预览，并只验收独立 QA route。
- Browser/runtime validation path:
  `/nonbuilding-evidence-qa?asset=xingfuli-pointed-entry-bollard`
- Existing baseline:
  `test_artifacts/all-models/identity/shared-prototypes/test_irregular-stone-bollard-identity-canonical.png`
  与 2018 参考一致，不能当作当前 2026 尖顶样式。
- Generator overwrite scope: 仅本 Brief 冻结的四个 slug。
- Fallback path: MCP 只做读取与视觉审查；所有修正回写确定性生成器，禁止把
  临时相机、灯光或 QA 地面保存回 master。

## Evidence

### Reference photos

统一来源：
[小红书：幸福里｜开放社区 城市客厅](https://www.xiaohongshu.com/explore/682071e0000000000303e0ba)，
作者“曼耶呦”，发布标注 `2025-05-11`，本地保存于 `2026-07-25`。正文确认地址
为番禺路 381 号、位于番禺路与幸福路之间且在法华镇路北侧。

| Local path | View direction | Supported asset | Usage boundary |
| --- | --- | --- | --- |
| `docs/research/assets/nonbuilding-evidence-pilot/xingfuli-current-street-furniture/xingfuli-entry-bollards-2026.webp` | 番禺路入口街角朝入口立面 | 尖顶路桩 | 研究证据，不复制店标 |
| `docs/research/assets/nonbuilding-evidence-pilot/xingfuli-current-street-furniture/xingfuli-water-lane-planters-2026.webp` | 沿水景向内部 | 花槽 | 研究证据，不复制餐牌 |
| `docs/research/assets/nonbuilding-evidence-pilot/xingfuli-current-street-furniture/xingfuli-water-lane-planters-depth-2026.webp` | 水景纵深 | 花槽 | 研究证据 |
| `docs/research/assets/nonbuilding-evidence-pilot/xingfuli-current-street-furniture/xingfuli-water-edge-furniture-2026.webp` | 横向观察水景与步道 | 圆座、长座、花槽 | 研究证据 |
| `docs/research/assets/nonbuilding-evidence-pilot/xingfuli-current-street-furniture/xingfuli-stone-seat-family-2026.webp` | 沿水景观察座具序列 | 圆座、长座 | 不复制人物雕塑 |
| `docs/research/assets/nonbuilding-evidence-pilot/xingfuli-current-street-furniture/xingfuli-water-edge-planters-2026.webp` | 水景端部朝店前绿植 | 花槽植物层次 | 不复制商标与临时餐牌 |

完整逐图来源、位置证据和排除项见
`docs/research/xingfuli-current-street-furniture-reference-manifest.json`。

### View coverage matrix

| Asset | Canonical | Side / oblique | Identity detail | Coverage boundary |
| --- | --- | --- | --- | --- |
| 尖顶路桩 | 入口图近景 | 同图重复实例提供侧向 | 方柱身与尖顶帽清晰 | 背面、基座固定方式未知 |
| 圆形石座 | 水边街具图近景 | 座具家族图中多个实例 | 近球形、底部收平 | 精确材料与底面未知 |
| 长形石座 | 座具家族图纵深 | 水边街具图近景 | 圆钝端部与低矮座面 | 背面、底部与精确曲率未知 |
| 窄型花槽 | 水边街具图 | 水景纵深两图 | 槽体、土层与高低植物 | 厂家、排水、植物种类未知 |

### Canonical comparison views

- 尖顶路桩：入口图，从番禺路街角朝入口立面；QA 相机观察方柱正面与右侧面。
- 圆形 / 长形石座：座具家族图，沿水景朝入口外侧；QA 相机观察正面、侧面和
  地面接触。
- 窄型花槽：水边街具图，横向观察水景；QA 相机观察长边、短边、槽口与植物层次。

### Evidence classification

#### Observed

- 当前入口反复出现深色方柱路桩，顶部为四坡尖顶。
- 临水步道反复出现近球形与长椭圆两种低矮深色座具。
- 水边与店前边界反复出现窄矩形花槽，植物高度和密度不等。
- 所有街具均为离散摆放，未形成连续不可通行边界。

#### Inferred

- 路桩和座具背面采用对称或近对称简化。
- 以画面人物和铺地模数估计尺寸，未使用测绘数据。
- 座具按深色石材/复合材料的低反射家族表达，不声明真实材料。
- 花槽用稳定 seed 生成原创植物簇，不复刻具体季节植株。

#### Unknown

- 精确尺寸、厂家、材质配方、安装和排水结构。
- 路桩、座具与花槽在 2026 年 7 月以后是否继续保留。
- 花槽具体植物种类、养护状态和季节变化。
- 所有不可见背面与底面细节。

## Quality Contract

### Identity

| Asset | Signature cue 1 | Signature cue 2 | Signature cue 3 | Intentionally omitted |
| --- | --- | --- | --- | --- |
| 尖顶路桩 | 深色方柱身 | 高辨识度四坡尖顶帽 | 略收分的底座 / 肩部 | 贴纸、商标、固定件 |
| 圆形石座 | 近球形低矮轮廓 | 平稳地面接触 | 低频轻微不对称 | 纹理裂纹与底部 |
| 长形石座 | 长椭圆胶囊轮廓 | 圆钝不完全对称端部 | 平缓可坐顶部 | 纹理裂纹与底部 |
| 窄型花槽 | 窄长金属槽体 | 抬高边唇与可见土层 | 三组高度不等植物簇 | 品牌、花牌、精确物种 |

### Position

- Coordinate source: 入口沿用既有 5 个审计中心；水边只由照片确认位置家族，
  没有测绘坐标。
- Scene position: 入口 5 个位置为保留值；水边 7 个位置冻结在
  `app/scene/xingfuli-current-street-furniture.tsx`。
- Confidence: 入口位置中等；水边具体坐标为推定，场地与物体家族为高置信。

### Scale

- Conversion: `1 scene unit = 2.7 m`。
- 尖顶路桩目标：约 `0.16 × 0.16 × 0.30` scene units（约 0.43 × 0.43 × 0.81 m）。
- 圆形石座目标：约 `0.23 × 0.23 × 0.21` scene units。
- 长形石座目标：约 `0.48 × 0.24 × 0.17` scene units。
- 窄型花槽目标：槽体约 `0.34 × 0.12 × 0.11` scene units；植物允许轻微横向
  外伸，整件不超过约 `0.39 × 0.14 × 0.32` scene units。
- 以上均为图片比例估计，允许视觉调整 ±12%，不得写成实测尺寸。

### Orientation and framing

- Blender front: local `-Y`；origin 为 ground center。
- Runtime rotation: 0，仅 QA。
- Canonical target occupancy: 单件模型占画面宽度 42%–62%。
- Required edges: 正面、至少一个侧面、顶部轮廓与接地点完整可见。
- Person scale: QA 场景显示 1.75 m 半透明尺度尺，不进入 GLB。

### Materials

- Opaque only；0 runtime images / textures。
- 路桩和座具：炭黑到深灰，roughness 0.58–0.78，低金属度。
- 花槽：暗铜 / 深灰金属槽体、暗土色土层、两种绿植材料。
- 不加入 emissive、商标或照片贴图。

### Collision and access

- 路桩：单实例使用紧包围方盒；路桩之间保持通行间距。
- 座具：使用紧包围椭圆盒；不得沿水边合并为连续碰撞墙。
- 花槽：只覆盖槽体 footprint，植物冠层不参与玩家碰撞。
- 本批 QA 只检查 ground contact 与边界；正式通路、相机和水景碰撞留到未来
  点位接入提交。

### Runtime budget

- 每个 GLB：最多 1,500 triangles、4 nodes、4 materials、0 images、0 textures、
  131,072 bytes。
- 无 animation、skin、morph target。
- 运行时仅 `visible-low`；稍远与近处共用同一文件，远处隐藏。

### Build provenance

- Expected source:
  `assets/models/source/nonbuilding/xingfuli-current-street-furniture/<slug>.blend`
- Expected GLB:
  `public/models/nonbuilding/xingfuli-current-street-furniture/<slug>-visible-low.glb`
- Build record:
  `docs/research/build-records/nonbuilding/xingfuli-current-street-furniture/<slug>-visible-low.json`
- Cache rule: 只有 GLB 二进制 SHA 变化才更新资产版本；正式组件使用当前 GLB
  SHA 前 12 位作为查询版本。

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Evidence / scope | 6 张入选图、manifest、4 个 slug | N/A | N/A | Passed |
| Editable Hero master | 四份确定性 `.blend` | canonical / side / detail | N/A | Passed |
| Visible-low derivation | 四份 GLB 与 build records | bounds / materials | 独立 QA route | Passed |
| Two-state contract | `visible-low` / `hidden` | N/A | QA 距离切换 | Passed |
| Production placement | 12 个幸福里实例 | N/A | forbidden zones / collision / real page | Passed 2026-07-28 |

建筑式 Massing 和 Identity 阶段对本批明确为
`not-applicable-by-nonbuilding-two-state-contract`；不因此生成两份肉眼无差异的重复
GLB。

## Validation

### Blender

- [x] 单资产与全批生成命令均成功
- [x] 四份 editable `.blend` 不含 QA 相机、灯光或地面
- [x] canonical、side、detail 三个 `test_` 预览齐全
- [x] MCP 读取 master；资产视觉修正已回写生成器，临时审查对象未保存

### GLB

- [x] Root transform normalized，ground min Y = 0
- [x] 四份 GLB 的 SHA、bounds、nodes、triangles、materials、images 和 bytes 已记录
- [x] 0 reference images / textures
- [x] 文件预算与两态合同通过

### Three.js

- [x] 独立 QA route 能逐个载入四份 GLB
- [x] canonical 方向、尺度尺、地面接触和材质可见
- [x] 距离阈值能在 `visible-low` 与 `hidden` 间切换
- [x] console 0 new errors
- [x] 固定视口、build mode、预热与采样条件已记录
- [x] 参考 / Blender / Three.js 三联 `test_` 对照齐全
- [x] 未修改 18 栋资产；正式接入仅限幸福里 `full` stage
- [x] 入口和水边紧碰撞通过三条确定性 QA 路线
- [x] `?start=xingfuli`、水边和入口正式页面最终验收

正式记录：
`docs/research/test_xingfuli_current_street_furniture_production_runtime_qa.json`。
三条 production static 路径均有 canvas、无 console/page error；120 帧样本为
55.15–60.63 FPS。该数据只用于验收，没有同条件基线，因此不声称性能提升。
