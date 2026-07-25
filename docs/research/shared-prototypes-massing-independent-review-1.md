# 共享植被与街具 Massing 独立审查 1

- Date: 2026-07-25
- Status: Blocked
- Scope: 5 个植被原型、7 个共享街具原型
- Rollback assets:
  - `assets/models/source/tiers/shared-prototypes/massing-review1/`
  - `public/models/tiers/shared-prototypes/massing-review1/`
  - `docs/research/build-records/tiers/shared-prototypes/massing-review1/`
  - `test_artifacts/all-models/massing/shared-prototypes-review1/`
  - `docs/research/shared-prototypes-massing-manifest-review1.json`
  - `docs/research/shared-prototypes-massing-runtime-qa-review1.json`

## 共同结论

- 12/12 GLB 结构、预算、canonical / side、Three.js gallery 加载通过；
- 12 请求、12 响应、0 failure、0 console error；
- gallery `displayScale=1`，没有额外比例修饰；
- 但 `displayScale=1` 不能证明 authored scale 正确；
- Brief 使用 `1 unit = 2.7m`，首版把旧 Three.js 组件的数值直接当 Blender unit，导致街具过大；
- gallery 缺人物或米尺对照，不允许据此声称比例通过；
- gallery 的 `scale=[1,1,-1]` 会改变不对称资产手性，灯、伞和垃圾桶必须补运行时正面证据。

## 逐项结论

| 原型 | Massing 结论 | Identity 边界 |
| --- | --- | --- |
| `xinhua-plane-tree` | Blocked：缺简化高位 Y 主叉 | 修复后可重审 |
| `shangsheng-campus-tree` | 轮廓 Pass | 物种、树龄、逐株尺寸 unknown，不得做物种 Identity |
| `huashan-canopy-tree` | 轮廓 Pass | 物种、逐株尺寸 unknown |
| `huashan-understory` | 条件 Pass：轻微埋地 | 物种/密度 unknown |
| `road-edge-shrub` | Blocked：与 understory 同形且原点埋地 | Blocked |
| `lane-lamp-short-arm` | 轮廓 Pass | 需绝对高度与 runtime 正面 |
| `cantilever-umbrella` | 轮廓 Pass | 需人物净空与 runtime 手性 |
| `outdoor-table-set` | 轮廓 Pass | 文档写四周座位，首版只有三椅；需统一并补人物尺度 |
| `slatted-bench` | 轮廓 Pass | 需座高人物对照 |
| `rectangular-planter` | 轮廓 Pass | 需区分箱体高度与含植物总高 |
| `shanghai-dual-classification-bin` | 轮廓 Pass | 需人物尺度与正面方向 |
| `irregular-stone-bollard` | Blocked：过规则、过高，不符合膝高 | Blocked |

## 必须修复

1. 街具尺寸按真实米值除以 `2.7` 写入 authored scene unit；
2. gallery 加入 `1m` 标尺和 `1.75m` 人物尺度；
3. 悬铃木加入简化高位 Y 主叉；
4. 道路灌木改为更低、更横向、不同于林下层的轮廓，并把最低点归零；
5. 矮石桩降低为膝高、加宽底座并使用可读不等边/斜切轮廓；
6. 桌椅补第四把椅子；
7. 不对称资产补 front 与 Z 镜像后的运行时方向记录。

未完成以上修复前，本批 Identity 继续全部阻断。
