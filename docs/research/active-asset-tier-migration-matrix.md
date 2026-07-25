# Active 18 Buildings Tier Migration Matrix

- Status: active 18 buildings frozen; Active 31 superseded; Sun Ke Villa complete; Shanghai Cinema in progress; remaining 16 buildings queued
- Authority: latest user scope override; building inventory remains sourced from `app/asset-library/asset-data.ts` and `app/scene/xinhua-road-landmarks-data.json`
- Machine-readable source: `docs/research/active-asset-scope-31.json`
- Filename note: the machine-readable filename is retained to avoid breaking references; its content now records the superseding Active 18 scope
- Counting rule: only 18 buildings count toward active completion; 3 trees and 10 decor assets are hold/deferred and remain preserved outside the denominator

## Active progress

- Complete: 1 / 18 — `sun-ke-villa`
- In progress: 1 / 18 — `shanghai-cinema`
- Queued after Shanghai Cinema: 16 / 18
- Superseded Active 31 inventory: all 31 historical records remain in the JSON so no GLB, Blend, generator, evidence, screenshot, manifest, build record, or QA path is lost.

## Legend

- `保留审计`：保留现有产物，补齐新版管线审计后才能作为正式 master。
- `重做`：现有产物只作证据或 migration input，按新版管线重建。
- `派生`：只能从已经冻结并记录 SHA 的完整 Hero master 派生。
- `临时`：文件存在，但 lineage、地图门或 envelope 尚未闭合。
- `阻断`：前置证据、Massing 地图门或 Hero master 未完成。

## Buildings (18)

| Asset | Hero | Identity | Massing | 当前决策 / 首个门 |
| --- | --- | --- | --- | --- |
| `shanghai-cinema` | 保留审计 | 临时，需从冻结 Hero 重新确认派生 | 临时，地图门未过 | **进行中**；先审计 Hero 与 Massing 绑定 |
| `film-art-center` | 保留审计 | 缺失，Hero 审计前阻断 | clean-v2 临时 | 补背向 unknown 记录，先过地图门 |
| `one-step-garden` | 重做 | 缺失，Hero 前阻断 | clean-v2 临时 | 先绑定多体量 footprint |
| `xinhua-villas-211` | 重做 | 缺失，Hero 前阻断 | v1 临时，需重做 | 先明确单栋 / 园区边界 |
| `xinhua-villas-329` | 重做 | 缺失，Hero 前阻断 | clean-v2 临时 | 先解决代表建筑绑定 |
| `house-315` | 重做 | 缺失，Hero 前阻断 | v1 临时，需重做 | 侧向 / 纵深未知须关闭或明确记录 |
| `villa-le-bec` | 重做 | 缺失，Hero 前阻断 | clean-v2 临时 | 先闭合场地平面和 footprint |
| `shanghai-orchestra` | 重做 | 缺失，Hero 前阻断 | clean-v2 临时 | 先拆分并绑定 compound 子建筑 |
| `hudec-memorial` | 重做 | 缺失，Hero 前阻断 | v1 临时，需重做 | 先修正高风险位置与正面方向 |
| `xinhua-pocket-park` | 重做 | 缺失，Hero 前阻断 | clean-v2 临时 | 先确认 footprint 与朝向 |
| `xinhua-community-center` | 重做 | 缺失，Hero 前阻断 | v1 临时，需重做 | OSM node 之外须确认建筑 footprint |
| `debi-fahua-525` | 重做 | 缺失，Hero 前阻断 | clean-v2 临时 | 先记录并绑定 compound 子建筑 |
| `fahua-heritage` | 重做 | 缺失，Hero 前阻断 | v1 临时，需重做 | 单张正面不足，纵深保持 unknown |
| `fics-xinhua-365` | 重做 | 缺失，Hero 前阻断 | clean-v2 临时 | 拆分子建筑并消除 alias 漂移 |
| `xingfuli-west` | 保留审计 | 文件存在但 lineage 临时 | 临时，地图复核 | 记录 final Hero SHA 后重新派生 / 验证 |
| `xingfuli-center` | 保留审计 | 文件存在但 lineage 临时 | 临时，地图复核 | 记录 final Hero SHA 后重新派生 / 验证 |
| `xingfuli-east` | 保留审计 | 文件存在但 lineage 临时 | 临时，地图复核 | 记录 final Hero SHA 后重新派生 / 验证 |
| `sun-ke-villa` | 完整 master 已冻结，MCP / runtime 通过 | 从已审查 Hero 派生，正式通过 | 结构化体块、MCP 与地图校准正式通过 | **已完成**；保留外挑北门廊与中央可通行车道 |

## Trees — Hold / Deferred (3)

| Asset | Hero | Identity | Massing | 当前范围决策 |
| --- | --- | --- | --- | --- |
| `plane-tree` | A/B/C 族保留审计 | 临时，lineage 与 envelope 不一致 | 临时，待冻结 | **hold/deferred**；保留全部现有路径与产物，不继续生成 |
| `campus-tree` | 缺失，当前仅程序化 | 缺失，Hero 前阻断 | generic 临时 | **hold/deferred**；保留程序化实现和已有 Massing，不继续生成 |
| `huashan-tree` | 缺失，当前仅程序化 | 缺失，Hero 前阻断 | canopy / understory migration input | **hold/deferred**；保留 family migration inputs，不继续生成 |

## Decor — Hold / Deferred (10)

| Asset | Hero | Identity | Massing | 当前范围决策 |
| --- | --- | --- | --- | --- |
| `lane-lamp` | 缺失，当前仅程序化 | 临时，无 Hero lineage | 临时，envelope 不一致 | **hold/deferred**；保留程序化实现及既有 Identity / Massing |
| `cantilever-umbrella` | 缺失，当前仅程序化 | 临时，无 Hero lineage | 临时，envelope 不一致 | **hold/deferred**；保留程序化实现及既有 Identity / Massing |
| `outdoor-dining` | 缺失，当前仅程序化 | 临时，无 Hero lineage | 临时，envelope 不一致 | **hold/deferred**；保留程序化实现及既有 Identity / Massing |
| `slatted-bench` | 缺失，当前仅程序化 | 临时，无 Hero lineage | 临时，envelope 不一致 | **hold/deferred**；保留程序化实现及既有 Identity / Massing |
| `street-planter` | 缺失，当前仅程序化 | 临时，无 Hero lineage | 临时，envelope 不一致 | **hold/deferred**；保留程序化实现及既有 Identity / Massing |
| `stone-bollard` | 缺失，当前仅程序化 | 临时，无 Hero lineage | 临时，envelope 不一致 | **hold/deferred**；保留程序化实现及既有 Identity / Massing |
| `mixed-paving` | 缺失，当前为 site procedure | 缺失，Hero 前阻断 | facility migration input | **hold/deferred**；保留 site procedure 与 facility migration input |
| `ground-cover` | 缺失，当前为程序化 family | 缺失，Hero 前阻断 | generic migration inputs | **hold/deferred**；保留全部 family migration inputs |
| `navy-club-pool` | 现有 master 待审计 | 缺失，Hero 审计前阻断 | 正式目录档缺失 | **hold/deferred**；保留现有 master、generator 与证据 |
| `trash-bin` | 缺失，当前仅程序化 | 临时，无 Hero lineage | 临时，envelope 不一致 | **hold/deferred**；保留程序化实现及既有 Identity / Massing |

## Hold / Backlog Boundary

以下已经生成的文件完整保留，但不属于当前 18 栋建筑的活动生产：

- 864 个普通 OSM 建筑 Massing 的 14 个 GLB / Blend 分块；
- 3 类树木和 10 类装饰物的全部既有 GLB、Blend、generator、程序化实现、
  证据、截图、manifest、build record 和 QA；
- active 18 之外的上生、华山建筑与设施 Massing；
- active 18 之外的 facility prototypes；
- `huashan-understory` 与 `road-edge-shrub` 只能作为目录 family 的迁移输入，
  不能另计活动模型数；
- `app/scene/shared-prototype-identity-map.tsx` 暂停接入，待 active 18
  完成后再决定如何复用。

任何 hold 文件均不得删除、覆盖或带入当前发布包。延期 Worktree 仅在主任务
完成并准备收尾时创建。

## Smallest Vertical Pilot

`sun-ke-villa` 最小纵向批次已于 2026-07-25 闭环。执行顺序为：

1. 审计现有 Reference manifest 与 Brief；
2. 在真实 `?start=sunke` 地图入口校准 `osm-way-864847877` Massing；
3. 补齐 Hero build record 并冻结 exact SHA；
4. 从该 Hero master 确定性派生 Identity；
5. 冻结并复核 Massing；
6. 同一 placement 下完成三档运行时、fallback、缓存与性能 QA。

最终状态：

- Hero：`complete-master-frozen-mcp-runtime-pass`
- Identity：`formal-pass-derived-from-reviewed-hero`
- Massing：`formal-pass-mcp-and-map-calibrated`
- Blender MCP 三道门：通过
- Three.js 三档、fallback、缓存与碰撞：通过
- 验收记录：`docs/research/sun-ke-villa-three-tier-runtime-qa-v2.json`

当前活动批次已经转到 `shanghai-cinema`。其完成后再按证据门和地图门安排
其余 16 栋建筑；树木和装饰物不进入这个队列。
