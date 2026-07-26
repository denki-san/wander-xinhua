# Xinhua Villas 329 Three-Tier Final Disposition Adjudication

## 当前可核验裁决

本 worktree 中没有可复核的“主窗口已接受地图候选”记录。相反，优先级最高的
`xinhua-villas-329-final-disposition.json` 与 Massing v3 integration candidate
仍一致标记 `blocked-road-edge-and-member15-binding`。因此本专项不把“地图已验收”
写成既成事实，也不重做任何已合格 Massing。

已保留的结论：

- Recovery Massing v2 与当前 evidence-bound Massing v3 的 Blend、GLB、build
  record SHA 均可复核；v3 结构、MCP1 和 exact-v3 页面加载/可见性记录通过。
- V3 的真实页面记录只证明 1280×720 下 120 帧可见和无 console event；它明确是
  `pass-exact-v3-load-and-visibility-map-rejected`，不是地图/碰撞验收，也未声称性能提升。
- 旧 Hero 是 `211弄2号` 跨资产污染 Hold，未从 V3 Massing 派生，不是 MCP2 候选；
  不能以一次视觉审查补成 329 Hero。
- Identity 尚未创建且没有合法 Hero SHA，MCP3 与三档 Three.js fallback/performance/
  collision 验收均不可达。

## 地图与证据边界

当前 map gate 的可复算事实是 member-15 未扩 footprint 到 asphalt 边只有
`0.061079` scene units；加 `0.2` collision margin 后为 `-0.138921`，低于
最小可见净距 `0.75`。无其他 landmark obstacle 相交，且起点/首相机解析通过，
但这些不能解除 road-edge blocker。

| 类别 | 结论 |
| --- | --- |
| observed | 四个候选成员（15/36/40/42）的 OSM 投影、仓内 XHS/官方证据、V2/V3 指纹、V3 MCP1 与可见性记录。 |
| inferred | 成员绑定为 sequence-and-spatial binding；member-15 仅 medium，不能当作地籍确认。 |
| unknown | member-15 的 authoritative footprint 归属、道路真实边界、完整 compound 边界，以及任何已完成地图碰撞验收的可追溯记录。 |

## 三档门状态

| Tier / Gate | 状态 | 原因 |
| --- | --- | --- |
| Massing v2 | preserved historical | 只保留 Recovery provenance，不作为当前生产候选。 |
| Massing v3 | binary/MCP1/visibility pass, map blocked | 合格二进制不得重做，但 member-15 道路门未解除。 |
| Hero / MCP2 | blocked, not authorized | 旧 Hero 为跨资产 Hold，且不从 V3 派生。 |
| Identity / MCP3 | not authorized / not reachable | 缺少合法 Hero lineage。 |
| 三档 Three.js | not reachable | 尚无可接受地图、Hero、Identity。 |

## 最小下一步

1. 先提供可复核的主窗口 map acceptance 记录；若没有，则以地籍/测绘/明确道路边界
   复核 member-15 与 way `864493244`，不得整体移动、缩放、静默删 member-15 或按邻近
   绑定 way `864493245`。
2. map gate 通过后，基于已接受 V3 Massing 与同一成员证据新建 329 compound Hero；
   禁止复用旧 211弄2号 Hero。
3. 新 Hero 经 MCP2 并冻结 SHA 后，才允许创建 Identity；随后 MCP3 与同机位三档
   Three.js fallback/performance/collision 验收。

本专项仅新增本栋裁决和测试；未改公共 registry、runtime、Fast manifest、树木或其他建筑。

```sh
node --test tests/test_xinhua_villas_329_final_disposition.test.mjs tests/test_xinhua_villas_329_three_tier_final_disposition_adjudication.test.mjs
```
