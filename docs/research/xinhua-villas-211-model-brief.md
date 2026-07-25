# Blender Model Brief: Xinhua Villas 211

## Scope

- Stable asset ID: `xinhua-villas-211`
- Subject: 新华路211弄复合院落的入口与弄堂锚点
- Address: 上海市长宁区新华路211弄
- Runtime component: `app/scene/xinhua-road-landmarks.tsx`
- Existing generator: `scripts/create_xinhua_road_models.py`
- Existing editable source: `assets/models/source/xinhua-road/xinhua-villas-211.blend`
- Existing runtime GLB: `public/models/xinhua-road/xinhua-villas-211.glb`
- Start preset: `/?start=villas`
- Recovery source: `3044cd89f801250afcd477dfbcbc7da358bf4b11`
- Current gate: `blocked-evidence`

### Stable asset boundary

`xinhua-villas-211` 当前稳定语义是“211弄复合院落入口 / 弄堂 POI”，不是
211弄1号单体，也不是211弄2号单体。Recovery Brief 将211弄和329弄合计的
29栋住宅直接写成本资产范围，跨越了 `xinhua-villas-329` 的独立 stable ID，
因此该数量不能作为211弄的已确认资产清单。

本 Worktree 只拥有：

- 211弄入口阈值；
- 入口照片中直接可见的左右建筑边缘和开放弄堂空隙；
- 已明确标注为211弄1号、2号的成员照片，但只作为各自单体的局部证据。

以下内容均为 Hold 或未知：

- 329弄及其任何建筑；
- 211弄内部尚未绑定的其他成员；
- 树木、绿篱、路灯、花箱、长椅、铺装、栏杆软装和其他装饰；
- ordinary OSM footprint、全地图体块和 overview district 成果；
- 公共 registry、runtime、地图数据和其他17栋建筑。

## Preflight Gate

- Blender binary: `/Applications/Blender.app/Contents/MacOS/Blender`
- Blender version: `5.2.0 LTS`
- Existing single-asset command:
  `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_xinhua_road_models.py -- --asset=xinhua-villas-211`
- GLB audit:
  `python3 scripts/audit_glb.py public/models/xinhua-road/xinhua-villas-211.glb --forbid-images`
- Local preview: `npm run dev` 或 `npm run build:static && npm run preview:static`
- Runtime route: `/?start=villas`
- Browser path: `/opt/homebrew/bin/agent-browser`
- Evidence-gate behavior: 本轮未打开 Blender、未运行生成器、未导出 GLB。

现有生成器虽然支持单资产参数，但其211弄实现包含四栋固定排布的别墅、
马蹄形车道、门梁、门房、树木、绿篱、路灯、花箱和长椅。三张官方照片不能
证明这套四栋排布，且树木、装饰不属于本轮范围，因此不得把该生成器当作
subject-specific Massing 的空间真值。

## Evidence

来源、SHA-256、主体绑定和只读 Recovery 审计见
`docs/research/xinhua-villas-211-reference-manifest.json`。

### Reference photos

| Local path | Source | View | Usage boundary |
| --- | --- | --- | --- |
| `docs/research/assets/poi-references/xinhua-villas-211/xinhua-villas-overview-official-2023.jpg` | 上海市文旅推广网，published 2023-06-24 | 从新华路沿入口轴线看向弄内 | compound entrance canonical；不证明内部成员布局 |
| `docs/research/assets/poi-references/xinhua-villas-211/xinhua-villas-211-1-official-2025.jpg` | 长宁区人民政府，published 2025-11-22 | 211弄1号正面 | 只证明1号正面，不证明侧后面或场地位置 |
| `docs/research/assets/poi-references/xinhua-villas-211/xinhua-villas-211-2-official-2025.jpg` | 长宁区人民政府，published 2025-11-22 | 211弄2号正面斜视 | 只证明2号局部，不得与1号拼成一栋 |

三张照片从 Recovery 按原始字节选择性恢复，SHA-256 与 Recovery manifest
完全一致。本轮没有刷新或覆盖来源图片。

### View coverage matrix

| Evidence slot | Evidence | Coverage | Consequence |
| --- | --- | --- | --- |
| Compound canonical front | 入口照片 | Supported as entrance-axis view | 可定义入口观察方向，但不是完整建筑正立面 |
| Compound side / depth | 无 | Missing | 不能确定入口两侧建筑进深和内部群组排布 |
| Compound entrance detail | 入口照片 | Partial | 可读门房状建筑、左侧建筑边缘和开放通道 |
| Member 211-1 front | 1号照片 | Supported | 仅支持1号正面身份构件 |
| Member 211-1 side / rear | 无 | Missing | 不得完成1号 Massing footprint 或 Hero |
| Member 211-2 front-oblique | 2号照片 | Supported | 仅支持2号正面斜视身份构件 |
| Member 211-2 rear / placement | 无 | Missing | 不得推断其相对入口的位置 |
| Compound site layout | 无可授权平面证据 | Missing | 不得生成四栋或完整群组 Massing |

### Canonical comparison view

- Local path:
  `docs/research/assets/poi-references/xinhua-villas-211/xinhua-villas-overview-official-2023.jpg`
- Direction: 从新华路朝211弄内部，沿入口车道消失点观察。
- Canonical meaning: 这是当前 compound stable ID 的“入口正面”，不是某一栋
  成员建筑的正立面。
- Why selected: 同时显示右侧门房状建筑、左侧建筑 / 围墙边缘和中央开放弄堂，
  能约束入口空隙不能被整块碰撞或门梁封闭。
- Limitation: 图片没有给出两侧建筑完整轮廓、深度、背面、精确间距或成员位置。
- Runtime reproduction: 在 `/?start=villas` 沿入口轴线对准弄内；仅作为未来地图门
  候选，当前未通过。

211弄1号照片可作为“成员1号正面候选”，但 stable ID 仍是 compound POI；
未经主窗口明确改 scope，不得把 `xinhua-villas-211` 偷换为211弄1号单体。

### Observed

- 入口照片中存在一条可通行的狭长车道，入口上方没有横跨车道的实体门梁。
- 入口右侧存在一栋白色填充、深色木构线条、瓦屋顶和小老虎窗的门房状建筑。
- 入口左侧只显示一栋浅色建筑及围墙的局部，主体被画面边缘和树木遮挡。
- 211弄1号正面具有分层退台体量、暖色粗糙墙面、红瓦檐带、拱形开口、
  阳台 / 露台和高烟囱。
- 211弄2号是与1号不同的成员建筑；可见红色坡屋顶、长条老虎窗、
  玻璃封闭前廊和半木构山墙。
- 三张照片没有显示1号、2号与入口之间的相互位置。
- 现有 runtime 截图显示四栋成组住宅，但公开入口 canonical 中无法验证该排布。

### Inferred

- 入口右侧小建筑可能承担门房功能，但现有图片不能确认完整平面和真实用途。
- 入口左右建筑应分别保留独立体块和碰撞，中央弄堂必须保持开放。
- 当前 runtime `position [38.32, 110.67]`、`yaw -0.38` 和 `scale 0.62`
  只能作为历史放置基线，不能当成测绘证据。

### Unknown

- 211弄自身的成员数量、边界，以及与329弄的精确分界。
- 入口照片中左侧建筑、右侧门房状建筑与211弄1号 / 2号的门牌对应关系。
- 211弄1号和2号相对入口的位置、朝向、间距及是否在当前 runtime 包络内。
- 入口两侧建筑的完整 footprint、进深、高度、背面和屋顶背坡。
- 弄堂宽度、道路退界、地面高差和可重复碰撞净宽。
- 当前四栋 legacy package 的空间排布是否对应真实211弄。

## Legacy and Recovery Audit

### Existing Hero baseline

- GLB:
  `public/models/xinhua-road/xinhua-villas-211.glb`
- SHA-256:
  `0a7168e6104d39b808c096a390a14d1eb1690e49bef165193829517b022cb295`
- Size: `4,188,228` bytes
- Structure: 1 node, 1 mesh, 14 materials, 0 images, 0 textures
- Audit: container policy passes
- Verdict: `retained-legacy-not-evidence-truth`

该 Hero 把四栋固定住宅、马蹄形车道和大量范围外装饰合并成一个网格。
结构审计通过不证明其布局真实。不得覆盖或删除它，但也不得从它反推
subject-specific Massing。

### Recovery provisional Massing

- Recovery path:
  `public/models/tiers/xinhua-road/massing/xinhua-villas-211-massing.glb`
- SHA-256:
  `407cde33aa13dfad09b29f6ae23711aa5f86ea046a06adebe116eac2218d667d`
- Structure: 1 node, 1 mesh, 1 material, 898 triangles, 0 images
- Method: `voxel-remesh-current-hero`
- Recovery status:
  `massing-generated-runtime-gate-blocked-evidence-and-walkaround`
- Verdict: `rejected-as-current-massing-candidate`

该候选继承了旧 Hero 的四栋排布，只通过材质 denylist 删除部分场地 / 装饰后做
voxel remesh。固定机位和 Three.js 截图均不能回指入口、1号或2号照片中的
同一空间关系，因此只能作为 Recovery 反例保留，不进入本分支。

## Quality Contract

以下合同只定义解除 blocker 后的 Massing 最低要求，不授权当前造模。

### Identity

- Compound silhouette: 非对称入口框景与中央开放弄堂，不得表现为一栋大楼。
- Cue 1: 右侧白色填充、深色木构和瓦顶的门房状体量。
- Cue 2: 左侧浅色建筑 / 围墙边缘与右侧小体量的不对称关系。
- Cue 3: 两侧实体之间连续开放的入口空隙，且没有虚构横梁。
- Member cues: 1号和2号各自构件只能进入各自已绑定体块，不能混合。
- Omitted: 所有未绑定成员、不可见背面、树木、装饰、商标和临时设施。

### Position and orientation

- Scene position: 历史值 `[38.32, 110.67]`，仅保留，不在本 Worktree 修改。
- Runtime yaw: 历史值 `-0.38 rad`，证据置信度低。
- Authored unit: `1 Blender unit = 1 scene unit = 2.7 m`。
- Blender front: local `-Y`。
- Canonical direction: 从新华路沿弄堂轴线向内。
- Unblock requirement: 必须有可授权的场地平面 / 测绘或可复现 walkaround
  将入口照片绑定到具体体块和朝向。

### Framing and human scale

- Future target screen-width occupancy: 入口阈值 `55%–72%`。
- Maximum canonical deviation: `12°`。
- Required frame: 左右入口边缘、右侧完整门房状建筑、中央车道消失点可读。
- Human proxy: `1.8 m = 0.6667 scene unit`。
- Entrance clearance: 必须由证据 / 地图校准确定，不沿用旧障碍物假定。

### Collision

- 两侧建筑分别阻挡。
- 中央车道保持开放。
- 禁止使用一个大碰撞盒封住 compound。
- 门杆、灯、花箱等装饰不属于当前 Massing 碰撞。

### Future Massing budget

- Maximum nodes: 6
- Maximum triangles: 1,500
- Maximum materials: 1
- Maximum images: 0
- Maximum GLB bytes: 180,000
- Animation / skin: none

## Evidence Gate

**Result: `blocked-evidence`**

阻塞原因：

1. compound stable ID 只有入口轴线 canonical，没有同一主体的侧向 / 纵深证据；
2. 1号与2号照片没有相对入口的位置、朝向或 footprint 绑定；
3. 当前任务禁止 ordinary OSM 和全地图体块，不能用未经授权 footprint 填空；
4. legacy Hero 和 Recovery Massing 都继承未被照片证明的四栋排布；
5. 把资产缩为“仅入口门房”会改变 stable asset 边界，需要主窗口明确授权新 scope。

解除 blocker 至少需要：

- 一份可授权的211弄场地平面、测绘图或用户确认的建筑—门牌布局；
- compound 入口两侧同一建筑的纵深 / 侧向证据；
- 211弄1号、2号与入口的明确位置和朝向绑定；
- 或主窗口明确把 stable asset contract 缩为“入口阈值 package”，并同步未来
  registry、碰撞和地图验收责任。

在此之前：

- 不打开 Blender；
- 不修改生成器；
- 不创建 `.blend` 或 `.glb`；
- 不进入 MCP 1；
- 不修改 shared registry / runtime；
- Identity 和 Hero 继续关闭。

## Decision Log

详细审计决策见 `docs/research/xinhua-villas-211-decision-log.md`。
