# 18 栋建筑生产调度清单

- 审计日期：2026-07-25
- 主窗口 Git 基线：`main` / `origin/main` /
  `fc96800edb39cf2745ea328237aedb3a86e1f7f5`
- 18 栋集成分支：`codex/integrate-18-buildings` / through `577ceaf`
- 范围权威：
  - `app/asset-library/asset-data.ts`
  - `app/scene/xinhua-road-landmarks-data.json`
- 固定数量：14 个道路建筑资产 + 3 个幸福里分区资产 + 1 个孙科别墅 = 18
- 范围扩张：未授权

## 状态定义

- `in-scope`：属于本轮 18 栋，尚未满足新目标的全部门禁。
- `done`：证据、Hero / Identity / Massing、Blender MCP 三道门、地图校准和 Three.js 运行时均有当前证据。
- `blocked-evidence`：证据不足，只能继续补证；没有主体边界和纵深约束时不得制作
  正式 Massing，更不得把 Hero 或 Identity 标为完成。
- `hold`：不属于 18 栋；只读保留，不删除、不覆盖、不纳入完成数量。

历史成果默认先审计、再保留，不因新流程自动重建。旧 Brief 中的
“Massing / Identity”如果只是 Hero master 的建造批次，不等于独立运行时档位。

## 当前 18 栋

| # | Stable asset ID | 建筑资产 | 当前可保留成果 | 新目标状态 | 下一项缺口 |
| ---: | --- | --- | --- | --- | --- |
| 1 | `shanghai-cinema` | 上海影城 | Hero、Hybrid Identity composite、正式 Massing、MCP 1/2/3 与三档运行时证据均保留；Film Art Center 新 footprint 已消除旧邻栋 AABB 假冲突；项目号 `2102CN0309D01`、新华路160号及“广场平缓衔接人行道”获得官方复核 | `blocked-map` / current assets retained | 本轮官方规划/审批/机构披露限定检索仍未找到同时具备北箭头、比例或尺寸及双控制点的可配准总平；source reproduction 已闭合，禁止用地址/中心点任意拖动，用户可用前不访问其小红书会话 |
| 2 | `film-art-center` | 上海电影艺术中心 | 官方 1:1000 规划、修缮审批、160/212 号锚点与 OSM way/864505138 闭合主楼 footprint；Hero/Identity/Massing 与 MCP 1/2/3 保留不重做，公共 placement 校准为 position `[46.388748754382405,79.07089962964774]`、yaw `2.786349542422368`、scale `0.5`；完整 Hero 已退出两条场内道路，主窗口单页三档、双故障注入、120 帧性能、碰撞和相机复验通过 | `complete` / integrated on `codex/integrate-18-buildings` | 已完成；Massing 真实保留拓扑修复前 Hero SHA，以共同 provenance 通过且不伪称 direct-current-SHA；二进制或公共合同不变时禁止重做，Hero 既有草坪/灌木/庭院灯保持冻结 |
| 3 | `one-step-garden` | 一尺花园 | Evidence、分体 Massing/MCP 1、地图门、Hero v2/MCP 2、Identity v1/MCP 3，以及主窗口单页三档、Hero→Identity、Identity→Massing、Massing floor、120 帧性能、资源与墙面碰撞采集全部通过；入口穿行继承当前已通过地图门 | `complete` / integrated on `codex/integrate-18-buildings` | 已完成，二进制或公共合同不变时禁止重做；首次发白证据及旧误绑/范围污染 Hero 继续只读 Hold |
| 4 | `xinhua-villas-211` | 新华别墅·211弄 | Massing v3 的 MCP1、地图、碰撞和 Three.js 已通过并冻结；官方资料新确认两弄合计29幢，并点名211弄1号、2号、12号，但没有门牌到九个 accepted OSM way 的正式总平 | `blocked-hero-identity` / Massing retained | 不能用1号用地/建筑面积近似猜 way；仍需门牌化总平或用户逐栋确认，并补同一已绑定 member 的侧/后/roof-back、尺度与入口碰撞证据；Hero 必须从已接受 Massing SHA 严格派生 |
| 5 | `xinhua-villas-329` | 新华别墅·329弄 | 四成员 Massing v3、MCP1、正式地图与 Three.js 已通过；官方资料点名17/36/38/40/42等成员语境，并证明329弄地址空间还含43/56/67等不同用途或组团 | `blocked-hero-identity` / Massing retained | 保持“历史花园住宅子集”的保守 compound stable ID；67号加梯总平不能绑定当前15/36/40/42 footprint，36/40虽是最强代表候选但仍缺门牌化总平、同主体完整多视角及产品授权，禁止复用旧跨资产 Hero 或新建成员级生产 ID |
| 6 | `house-315` | 新华路315号住宅 | Evidence、Massing、Hero v2、Identity、Blender MCP 1/2/3、地图、Three.js 三档/fallback/碰撞均通过；旧范围污染 Hero 继续 Hold | `complete` / production | 无；1930/1949 年代冲突保留 Unknown，不恢复旧场地污染 |
| 7 | `villa-le-bec` | Villa Le Bec | 六张证据、两栋主体、Massing、Hero、Identity、Blender MCP 1/2/3、地图与 Three.js 全部通过 | `complete` / production | 无；旧候选与历史碰撞失败证据继续保留，不重做 |
| 8 | `shanghai-orchestra` | 上海民族乐团 | Recovery clean-v2 Massing 的 MCP1 与诊断 Three.js 保留；官方资料一致确认新华路336号，设计项目资料支持6/7/8号楼的功能语境 | `blocked-membership` / diagnostic only | 地址和功能描述不能把6/7/8号楼绑定到五个匿名 OSM 候选；仍缺带楼号、红线/边界及可配准 footprint 的权威总平，禁止用几何安全或宣传语境冒充 compound 成员表 |
| 9 | `hudec-memorial` | 邬达克纪念馆 | 官方证据、Massing、Hero v2、Identity、Blender MCP 1/2/3、地图、碰撞与 Three.js 均通过 | `complete` / production | 无；旧 generic provisional Massing 仅作反例保留 |
| 10 | `xinhua-pocket-park` | 新华路口袋公园 | 场地型建筑资产语义已冻结；三档、Blender MCP 1/2/3、地图、中央通路碰撞和 Three.js 均通过 | `complete` / production | 无；保持中央通路，不把整片场地改成单一碰撞盒 |
| 11 | `xinhua-community-center` | 新华·社区营造中心 | way/864493234 Building-4 Massing、MCP1 与诊断 Three.js/碰撞保留；官方资料确认345弄整体更新、营邑规划委托及社区中心启用，但未公开道路总平/横断面 | `blocked-map` / diagnostic only | way/577252269 当前 service road 重叠 `0.402635` scene unit（`1.087115 m`）；公开官方限定检索仍缺双路缘、中心线/偏移、比例、日期与不确定度，`4.575771 m` 仅为零重叠反推上限而非实测道路宽度，禁止任意移楼、缩放或改窄/抑制共享道路 |
| 12 | `debi-fahua-525` | 德必法华525 | 三张证据与 Recovery clean-v2 Massing 只读保留；运营方确认同址独立改造园区、6层和 `5428.17㎡`，政府托管服务页另称“一万多㎡”，两者未调和且都不是可配准 footprint | `blocked-membership-map-lineage` / Hold | 法华镇路真实重叠 `0.633229` scene unit；公开一手资料仍无 compound 成员、庭院 polygon、道路横断面/路缘/width/surface/access，禁止移楼、缩放或改窄共享道路 |
| 13 | `fahua-heritage` | 法华遗韵 | 旧牌坊结构基线与 Recovery 合格子阶段只读保留；公开资料新增同主体宽街景，并确认它是东端牌坊、1木3石仿古桥及文化长廊组成的纪念性重建景观 | `blocked-evidence-map` / Hold | 证据由 front-only 提升为 partial identity+street context，但仍缺侧后厚度、实测 footprint、当前路缘/人行/绿化与可绕行边界；用户醒后才慢速查 XHS，仍不足时仅由主窗口停用本栋 runtime，全部文件与 Hold 永久保留 |
| 14 | `fics-xinhua-365` | FICS新华365 | Recovery Massing 的 MCP1、投影与诊断 Three.js 保留；政府资料确认东华大学关联、365弄园区身份及“封闭园区转开放公共社区”目标 | `blocked-membership-map-tiers` / diagnostic only | “开放社区”是使用/规划目标，不能证明 way/577252268 的地表、宽度、cover 或 access；五个 OSM 候选仍无正式成员表/边界，way/864493177 与当前 service surface 冲突，禁止 Hero/Identity 或 runtime promotion |
| 15 | `xingfuli-west` | 幸福里·西区 | Hero 保留；Identity v2 / Massing v2 严格派生；Blender MCP 1/2/3 与单页三档、两级 fallback、性能、碰撞均通过 | `blocked-map` / explicit QA uses lineage v2 / production Hero unchanged | 用户九张原图当前为 `0 files`，无 SHA/EXIF；way/400066625 只是两点 pedestrian centerline，不能证明底层通道宽度、墙体、开口或坡度，禁止任意挖洞 |
| 16 | `xingfuli-center` | 幸福里·中区 | Hero 保留；Identity v2 / Massing v2 严格派生；Blender MCP 1/2/3、地图、单页三档、两级 fallback、性能、碰撞均通过 | `done` / lineage v2 tiers / production Hero unchanged | 无；目前只保留摄影者给出的九图路线顺序陈述，原图尚未物化，公网九图不得冒充用户实拍 |
| 17 | `xingfuli-east` | 幸福里·东区 | Hero 保留；Identity v2 / Massing v2 严格派生；Blender MCP 1/2/3 与单页三档、两级 fallback、性能、碰撞均通过 | `blocked-map` / explicit QA uses lineage v2 / production Hero unchanged | south entry、entry matrix wall 与 lane base 仍和当前番禺路面合同相交；第9张只有“可能是番禺路”的陈述、无原图/可见内容/元数据，需物化后再与地图共同裁决，禁止任意位移 |
| 18 | `sun-ke-villa` | 孙科别墅 | Recovery Hero / Identity / Massing 已选择性恢复；单资产 Massing generator 可逐字节复现；MCP 三门、地图、Three.js 三档、双 fallback、碰撞和开放车道均有当前证据；集成复核发现并修复旧程序化 fallback 大体块误判 | `done` / source `d29097d` + `177447a` / integrated through `5e67688` | 无；保留失败与修复截图、分支和提交，后续只参加项目级回归 |

## 恢复后的数量结论

- 当前统一状态为 `complete` 8 / 18、`blocked/partial` 10 / 18。完整通过：
  Film Art Center、一尺花园、新华路315号、Villa Le Bec、邬达克纪念馆、
  新华路口袋公园、幸福里中区、孙科别墅。
- 幸福里西/东区的 lineage v2、Blender MCP 三门和 Three.js 已通过，仍分别被
  底层 pedestrian passage 未知与番禺路/照片9道路未知阻塞；运行时通过不等于地图完成。
- Recovery 已合格阶段继续保留，不按新批次重复建模；10 栋 blocker 逐栋以证据、
  主体绑定、道路净距或缺失门禁关闭，不允许把旧 Hero、范围外装饰或匿名 OSM
  footprint 冒充正式完成。

## 丢失会话 Recovery / Hold 快照

- Worktree：`/Users/lei/App_developing/wander-xinhua-all-models-v3`
- 分支：`codex/hold-all-models-v3-recovery-20260725`
- 提交：`3044cd89f801250afcd477dfbcbc7da358bf4b11`
- Tree：`147b8e8fd94805df4da8d569635894a6884e1b4b`
- Parent：`c0f525ae142d3f70b576bfbcdb90350d7e645007`
- 完整性：882 个提交文件，其中 40 个修改、842 个新增；另有 389 个
  `test_artifacts/all-models` 验收证据被强制纳入；nonignored status 为空。
- 未提交 ignored：65 个 Blender `.blend1` 自动备份，以及
  `node_modules`、`dist`、`dist-static`、`.wrangler`、`__pycache__`。
  它们不是唯一正式成果，不参与后续选择性提取。
- 使用规则：该提交永久保持 Hold，不整体 merge；只允许按单栋建筑审计后，
  将证据、生成器、`.blend/.glb`、build record、测试和验收记录摘入对应
  Worktree。公共 registry/runtime 文件必须由主窗口手工整合。

## Hold：保留但不计入 18 栋

以下当前成果不得删除、覆盖或纳入本轮完成数量：

- `public/models/xinhua-road/xinhua-mansion.glb`：当前正式 18 栋 registry 未引用。
- `public/models/xinhua-road/xinhua-villas.glb`：211/329 拆分前的历史聚合资产。
- `public/models/building-evidence-lab/wukang-mansion.glb`：Building Evidence Lab 资产。
- `public/models/shangsheng/navy-club-pool.glb`：装饰/场景装置，不是本轮建筑。
- 华山绿地、上生·新所父级 POI 与幸福里父级 POI：地点/容器，不另计建筑。
- 所有树木、街灯、外摆、花箱、铺装、垃圾桶、角色和其他装饰资产。
- `codex/overview-district-massing` Worktree 的全地图新增体块成果：保持 Hold，
  主窗口不得合入本轮 18 栋建筑生产线。
- `main` 在本轮调度期间由外部任务前进到 merge commit `46c58a8`，随后又以
  `fc96800` 修复弱网状态下的 district massing 保持策略。调度窗口已把这两个
  提交作为 Hold 基线合入集成分支，不删除或覆盖，也不把它们计入 18 栋；后续
  建筑提交不得修改其 GLB、数据、运行时模块、QA 或生成器。

## 调度约束

1. 主窗口只维护本清单、公共 manifest/registry、地图数据、集成测试和回归。
2. 同时维持 2～3 个独立建筑 Worktree；一个 Worktree 只拥有一个 stable asset ID。
3. 幸福里三分区共享生成器和 Brief，审计时可作为一个批次，但完成计数仍为三项。
4. 建筑 Worktree 不修改树木、装饰物、角色、全地图体块或范围外资产。
5. 公共文件变更先在建筑 Worktree 形成最小补丁，由主窗口串行整合。
6. 每次换班或会话恢复先读取本清单和当前 Git/Worktree 真值，不从聊天记忆重建状态。
