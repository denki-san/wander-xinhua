# Blender Model Brief: House 315 Building Engine Spike

## Scope

- Asset slug: `house-315`
- POI / environment / character: 新华路315号单栋花园住宅
- Runtime component: `/building-engine-sandbox`
- Generator: `scripts/compile_garden_villa.py`
- Editable source:
  `assets/models/source/building-engine-spike/house-315/`
- Runtime GLB:
  `public/models/building-engine-spike/house-315/`
- Start preset:
  `/building-engine-sandbox?asset=house-315&tier=master&view=canonical&qa=1`
- Single-asset build command:
  `node scripts/building_engine_spike.mjs build --asset house-315 --stage massing`
- Validation command:
  `node scripts/building_engine_spike.mjs qa --asset house-315`
- Production replacement: 未授权；所有产物与现有 House 315 隔离

## Preflight Gate

- Baseline commit:
  `556d0bbe540f5da89ab90522c6a1333c0feb3e24`
- Blender binary:
  `/Applications/Blender.app/Contents/MacOS/Blender`
- Blender version: `5.2.0 LTS`
- Generator dry run / affected assets:
  新 Compiler 必须只写 `building-engine-spike/house-315` 路径
- GLB audit:
  `python3 scripts/audit_glb.py <glb> --forbid-images --max-nodes 64`
- Local preview:
  `npm run build:static && npm run preview:static`
- Browser/runtime validation path:
  `/building-engine-sandbox?asset=house-315&tier=<massing|master>&view=<canonical|side|entrance>&qa=1`
- Existing baseline:
  `docs/research/house-315-final-audit.json`
- Blender MCP:
  本轮 Add-on 无法连接；使用 Headless Blender 固定机位并记录 fallback
- Evidence archive:
  `2026-07-27-storage-migration-52db477`，980 files，
  451,461,120 bytes，本轮全量 SHA 校验通过

## Evidence

### Reference photos

| Local path | Source | View direction | Usage boundary |
| --- | --- | --- | --- |
| `docs/research/assets/poi-references/house-315/house-315-front-official-2023.jpg` | 上海市文旅推广网 | 新华路朝沿街正面 | Research only |
| `docs/research/assets/poi-references/house-315/house-315-aerial-jfdaily-2026.jpg` | 上观 Image 242 | 正面偏右俯瞰 | Research only |
| `docs/research/assets/poi-references/house-315/house-315-entrance-jfdaily-2026.jpg` | 上观 Image 244 | 沿街入口与中央山墙 | Research only |
| `docs/research/assets/poi-references/house-315/house-315-address-sign-jfdaily-2026.jpg` | 上观 Image 243 | 门牌与保护铭牌 | Subject binding only |

完整 SHA、快照相对路径、Claim 与来源见
`building-engine/cases/house-315/building-case.json`。

### View coverage matrix

| Evidence slot | Evidence | Questions answered | Coverage | Downgrade |
| --- | --- | --- | --- | --- |
| Canonical | 官方正面 | 主轮廓、横向关系、色块 | Supported | N/A |
| Side / oblique | 上观俯瞰 | 进深、屋顶连接、左右翼 | Supported for Massing | 不声明测绘 |
| Entrance / identity | 上观入口 | 山墙、木构、入口节奏 | Supported | 不复制文字 |
| Site relationship | 官方街景 | 道路侧与前场关系 | Partial | Spike Sandbox 不做地图 placement |
| Rear | 俯瞰局部 | 只见低粒度包络 | Unknown | 背面保持低细节 |

### Canonical comparison view

- Local path:
  `docs/research/assets/poi-references/house-315/house-315-front-official-2023.jpg`
- Direction: 从新华路朝沿街面；罗盘方向未知
- Blender front direction: local `-Y`
- Required framing:
  主屋顶、中央高山墙、右长翼和左侧轮廓同时入画
- Runtime reproduction:
  读取 DSL `runtime.cameras.canonical`

### Observed

- 横向相连陡坡红瓦屋顶与中央纵向高山墙跨正面、俯瞰和入口持续可见。
- 中央山墙前出，深色半木构分格构成最强身份锚点。
- 右侧长翼与左后短翼形成不对称体块。
- 立面持续呈现暖白上部和低饱和红砖下部。
- 门牌证据直接绑定新华路315号住宅。

### Inferred

- 俯瞰支持相对宽深和屋脊层级，不代表测绘尺寸。
- 沿用历史已通过 Massing 地图门的人物、门和层高视觉比例。
- Spike local `-Y` 定义为沿街正面。

### Unknown

- 精确测绘尺寸与完整背立面。
- 隐藏屋面节点和背面开口。
- 建造年代的 1930 / 1949 来源冲突。
- Spike 不验证当前 production 世界坐标。

## Quality Contract

### Identity

- Silhouette:
  横向主脊 + 中央高山墙 + 右长翼 + 左后短翼
- Signature cue 1:
  中央前出半木构高山墙
- Signature cue 2:
  相连陡坡红瓦屋顶与非对称翼部
- Signature cue 3:
  上白下红立面分区与中央入口
- Details intentionally omitted:
  文字、logo、围墙、树木、庭院软装、逐片瓦、砖缝和隐藏背面细节

### Position

- Coordinate source: 本地资产坐标，只用于隔离 Sandbox
- Scene position: `[0, 0, 0]`
- Confidence: authored local contract high；production map placement 不在本轮

### Scale

- Known dimensions: 无权威测绘
- `1 scene unit = 2.7 m`
- Massing baseline bounds target:
  约 `14.9 × 9.4 × 7.0` scene units
- Allowed visual multiplier: `1.0`；不得用 Sandbox 全局缩放补错

### Orientation

- Blender front direction: local `-Y`
- Three.js front after GLTF conversion: local `+Z`
- Runtime rotation: `0`
- Canonical direction: 从 local `-Y` 外侧朝主体

### Framing

- Target screen-width occupancy: `58%–72%`
- Maximum canonical deviation: `12°`
- Required visible edges:
  主屋顶两端、中央山墙屋脊与入口地面
- Human check: `1.8 m = 0.666667 scene unit`
- Camera target height: `2.8` scene units

### Materials

- Opaque:
  `warm-plaster`、`muted-brick`、`muted-red-tile`、`deep-timber`
- Glass: `muted-glass`
- Metal: `dark-metal`
- Emissive: none
- Images / textures: zero

### Collision and access

- Solid obstacles:
  主脊体、中央体、右长翼、左后短翼分体
- Required open path:
  沿街前场至中央入口外侧
- Walkable area:
  建筑外部前场；不承诺室内
- Camera clearance:
  固定机位不得进入屋顶 bounds
- Road clearance:
  Spike Sandbox 不声明 production 道路退界

### Runtime budget

| Tier | Nodes | Triangles | Materials | Images | Bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Massing | 32 | 1,500 | 4 | 0 | 250,000 |
| Master | 64 | 12,000 | 10 | 0 | 1,500,000 |

### Build provenance

- Historical comparison:
  `public/models/tiers/xinhua-road/hero-v2/house-315-hero.glb`
- Expected outputs:
  `assets/models/source/building-engine-spike/house-315/` 与
  `public/models/building-engine-spike/house-315/`
- Build records:
  `docs/research/build-records/building-engine-spike/house-315/`
- Cache version:
  Sandbox URL 使用当前 GLB SHA 前 12 位
- Existing production assets:
  全部只读，不覆盖

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Evidence | Case、Claim、DSL | N/A | N/A | Passed |
| Massing | 四体块、四组屋顶、分体碰撞 | canonical / side / entrance | Sandbox Massing | Pending |
| Calibration | 比例、正面、接地、入口通道 | fixed-camera fallback | deterministic QA | Pending |
| Master | 木构、入口、窗带、烟囱、阳台 | 三身份构件 | Sandbox Master | Pending |
| Final | GLB、碰撞、三联对照 | current SHA | console / resource / canvas | Pending |

## Validation

### Gate E

- [x] 外置快照存在并全量 SHA 通过
- [x] Canonical、Side / Depth、Entrance 覆盖
- [x] 三处身份构件绑定 Claim
- [x] Observed / Inferred / Unknown 分开
- [x] Evidence review 为 `approved`

### Gate M

- [ ] 当前 Massing `.blend` / GLB
- [ ] 三张 `test_` 固定机位图
- [ ] GLB 与碰撞自动检查
- [ ] Sandbox 中可见、接地、方向正确
- [ ] 当前 Massing SHA 对应的手工校准结论

### Gate F

- [ ] 当前 Master `.blend` / GLB
- [ ] 三处身份构件可读
- [ ] 无嵌入图片或 unsupported detail
- [ ] 当前 GLB SHA 与 Sandbox 一致
- [ ] 最终三联对照
- [ ] 当前 Master SHA 对应的最终结论

## Decision Log

### Iteration 0 — 2026-07-28

- Changes:
  选择 House 315 作为第一栋反向表达样本，建立隔离 Case、Claim、Brief 与 DSL 合同。
- Evidence used:
  官方正面、上观俯瞰、入口和门牌；外置快照
  `2026-07-27-storage-migration-52db477`。
- Blender result: 尚未修改 Compiler。
- GLB result: 仅审计历史基线，结构通过。
- Runtime result: Spike Sandbox 尚未实现。
- Independent review:
  Evidence Gate `approved`。
- Remaining inference:
  测绘尺寸、背面和 production placement。
- Rollback point:
  方案提交 `4c8c082`。
