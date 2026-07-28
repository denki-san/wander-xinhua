# Blender Model Brief: Sun Ke Villa Building Engine Spike

## Scope

- Asset slug: `sun-ke-villa`
- POI / environment / character: 上生·新所内孙科别墅单体与北侧 porte-cochère
- Runtime component: `/building-engine-sandbox`
- Generator: `scripts/compile_garden_villa.py`
- Editable source:
  `assets/models/source/building-engine-spike/sun-ke-villa/`
- Runtime GLB:
  `public/models/building-engine-spike/sun-ke-villa/`
- Start preset:
  `/building-engine-sandbox?asset=sun-ke-villa&tier=master&view=canonical&qa=1`
- Single-asset build command:
  `node scripts/building_engine_spike.mjs build --asset sun-ke-villa --stage massing`
- Validation command:
  `node scripts/building_engine_spike.mjs qa --asset sun-ke-villa`
- Production replacement: 未授权；所有产物与现有 Sun Ke Villa 隔离

## Preflight Gate

- Baseline commit:
  `556d0bbe540f5da89ab90522c6a1333c0feb3e24`
- Blender binary:
  `/Applications/Blender.app/Contents/MacOS/Blender`
- Blender version: `5.2.0 LTS`
- Generator dry run / affected assets:
  新 Compiler 必须只写 `building-engine-spike/sun-ke-villa` 路径
- GLB audit:
  `python3 scripts/audit_glb.py <glb> --forbid-images --max-nodes 64`
- Local preview:
  `npm run build:static && npm run preview:static`
- Browser/runtime validation path:
  `/building-engine-sandbox?asset=sun-ke-villa&tier=<massing|master>&view=<canonical|side|entrance>&qa=1`
- Existing baseline:
  `docs/research/sun-ke-villa-three-tier-runtime-qa.json`
- Blender MCP:
  本轮 Add-on 无法连接；使用 Headless Blender 固定机位并记录 fallback
- Evidence archive:
  `2026-07-27-storage-migration-52db477`，980 files，
  451,461,120 bytes，本轮全量 SHA 校验通过

## Evidence

### Reference photos

| Path | Source | View direction | Usage boundary |
| --- | --- | --- | --- |
| `docs/research/assets/poi-references/sun-ke-villa/sun-ke-villa-front-canonical.jpg` | 长宁区政府 | 花园正立面 | Research only |
| `docs/research/assets/poi-references/sun-ke-villa/sun-ke-villa-right-front.jpg` | 上海市民政局／上海老年报 | 花园右前斜视 | Research only |
| `docs/research/assets/poi-references/sun-ke-villa/sun-ke-villa-north-entrance.jpg` | 长宁区政府 | 北侧入口斜视 | Research only |
| 外置快照 `.../sun-ke-villa-north-porte-cochere-user-reference-20260725.png` | 用户附件 | 北侧外挑门廊近景 | Geometry correction only |

完整 SHA、快照相对路径、Claim 与来源见
`building-engine/cases/sun-ke-villa/building-case.json`。用户附件不恢复为新的
仓库工作副本，直接引用已校验的外置不可变快照。

### View coverage matrix

| Evidence slot | Evidence | Questions answered | Coverage | Downgrade |
| --- | --- | --- | --- | --- |
| Canonical | 官方花园正面 | 轮廓、拱券、塔楼、色块 | Supported | N/A |
| Side / oblique | 官方右前 | 纵深、塔楼、阳台 | Supported | 隐藏侧面保守 |
| Entrance / identity | 官方北入口 + 用户近景 | 门廊外挑、柱、车道 | Supported | 不承诺室内 |
| Site relationship | OSM way + 南北照片 | 主体 footprint 与门廊越界 | Supported with inference | 不声明地籍 |
| Rear / roof | 部分植被遮挡 | 主屋顶层级和烟囱 | Partial | 省略不可见节点 |

### Canonical comparison view

- Local path:
  `docs/research/assets/poi-references/sun-ke-villa/sun-ke-villa-front-canonical.jpg`
- Direction: 花园正立面，模型 local `-Y`
- Required framing:
  低西翼、中央三联券、右塔楼和完整屋顶同时入画
- Runtime reproduction:
  读取 DSL `runtime.cameras.canonical`

### Observed

- 低西翼、中央主体与右侧圆角塔楼构成不对称花园住宅。
- 首层三联尖券、二层连续圆拱窗和金属阳台是花园立面核心身份。
- 圆角塔楼有窄高窗、水平腰线和低弧形红瓦屋面。
- 北侧 porte-cochère 明显外挑，前端厚柱支撑，长坡屋顶连接主楼。
- 覆盖车道在柱间保持贯通，不是实心附属房。
- 材质为浅暖粗糙墙面、红褐瓦、暖石材窗套和深色窗框。

### Inferred

- OSM way `864847877` 约束主体水平范围，不证明真实凹凸。
- 高度由楼层、门窗和历史已审核 envelope 推断。
- 不可见侧立面只使用低密度重复开口语法。

### Unknown

- 精确测绘高度与楼板标高。
- 隐藏侧面完整开窗。
- 塔楼背面、屋顶背面和烟囱精确数量。
- Spike 不重新验证 production 世界 placement。

## Quality Contract

### Identity

- Silhouette:
  低西翼 + 中央主体 + 右圆角塔楼 + 错落红瓦屋顶 + 北外挑门廊
- Signature cue 1:
  花园首层三联尖券与二层连续圆拱窗
- Signature cue 2:
  右侧圆角塔楼、窄高窗和弧形屋面
- Signature cue 3:
  北侧外挑 porte-cochère、厚柱与开放覆盖车道
- Details intentionally omitted:
  室内、品牌展陈、逐片瓦、墙面照片纹理、不可验证雕花和隐藏侧面细节

### Position

- Coordinate source: 本地资产坐标；OSM way 只约束相对 footprint
- Scene position: `[0, 0, 0]`
- Confidence: 主体 footprint high；门廊形状 high；高度 medium

### Scale

- OSM 主体约 `7.83 × 5.53` scene units
- `1 scene unit = 2.7 m`
- Master bounds target:
  约 `7.8 × 7.7 × 5.1` scene units，额外纵深来自门廊
- Allowed visual multiplier: `1.0`

### Orientation

- Blender front direction: local `-Y` 花园面
- Three.js front after GLTF conversion: local `+Z`
- North entrance: local `+Y`
- Runtime rotation: `0`

### Framing

- Target screen-width occupancy: `56%–70%`
- Maximum canonical deviation: `10°`
- Required visible edges:
  西翼外沿、塔楼外沿、主屋顶和入口地面
- Human check: `1.8 m = 0.666667 scene unit`
- Camera target height: `2.3` scene units

### Materials

- Opaque:
  `warm-plaster`、`warm-plaster-shadow`、`muted-red-tile`、`warm-stone`
- Glass: `muted-glass`
- Metal: `dark-metal`
- Emissive: none
- Images / textures: zero

### Collision and access

- Solid obstacles:
  中央主体、西翼、圆塔和四根门廊柱分体
- Required open paths:
  花园前场至三联券外侧；北侧 porte-cochère 中线贯通
- Walkable area:
  建筑外部和覆盖车道
- Camera clearance:
  固定机位不得穿入塔楼或门廊屋顶
- Production road clearance:
  不在 Spike Sandbox 声明

### Runtime budget

| Tier | Nodes | Triangles | Materials | Images | Bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Massing | 32 | 1,500 | 4 | 0 | 250,000 |
| Master | 64 | 12,000 | 10 | 0 | 1,500,000 |

### Build provenance

- Historical comparison:
  `public/models/shangsheng/sun-ke-villa.glb`
- Expected outputs:
  `assets/models/source/building-engine-spike/sun-ke-villa/` 与
  `public/models/building-engine-spike/sun-ke-villa/`
- Build records:
  `docs/research/build-records/building-engine-spike/sun-ke-villa/`
- Cache version:
  Sandbox URL 使用当前 GLB SHA 前 12 位
- Existing production assets:
  全部只读，不覆盖

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Evidence | Case、Claim、DSL | N/A | N/A | Passed |
| Massing | 主体、西翼、塔楼、门廊、屋顶 | canonical / side / entrance | Sandbox Massing | Pending |
| Calibration | 比例、南北方向、接地、车道 | fixed-camera fallback | deterministic QA | Pending |
| Master | 三联券、拱窗、阳台、塔窗、门廊 | 三身份构件 | Sandbox Master | Pending |
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
- [ ] Sandbox 中可见、接地、南北方向正确
- [ ] porte-cochère 中线开放
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
  在 House 315 之外选择孙科别墅作为同类差异样本，建立隔离 Case、Claim、Brief 与 DSL 合同。
- Evidence used:
  三张官方外观、用户门廊近景、OSM way `864847877`；外置快照
  `2026-07-27-storage-migration-52db477`。
- Blender result: 尚未修改 Compiler。
- GLB result: 仅审计历史基线，结构通过。
- Runtime result: Spike Sandbox 尚未实现。
- Independent review:
  Evidence Gate `approved`。
- Remaining inference:
  测绘高度、隐藏侧面和 production placement。
- Rollback point:
  方案提交 `4c8c082`。
