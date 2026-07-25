# 生产资产三档重建设计计划

- Status: In progress
- Worktree: `/Users/lei/App_developing/wander-xinhua-all-models-v3`
- Branch: `codex/all-models-v3`
- Baseline commit: `c0f525ae142d3f70b576bfbcdb90350d7e645007`
- Started: 2026-07-25
- Current scope: 仅 18 栋既有生产建筑的 Hero / Identity / Massing，以及地图比例、位置、朝向、碰撞和证据校验；原 Active 31 已被覆盖

## 0. 2026-07-25 范围收缩（当前最高优先级）

此前“全地图全部模型”和 Active 31 范围均已经暂停。本轮活动范围冻结为
18 栋生产建筑：

- 18 个建筑：新华路 14 个道路建筑、幸福里 west / center / east 三个 package、孙科别墅；

原 Active 31 中的 3 类树木和 10 类装饰物全部转为 `hold/deferred`：

- 树木：`plane-tree`、`campus-tree`、`huashan-tree`；
- 装饰物：`lane-lamp`、`cantilever-umbrella`、`outdoor-dining`、
  `slatted-bench`、`street-planter`、`stone-bollard`、`mixed-paving`、
  `ground-cover`、`navy-club-pool`、`trash-bin`。

这些延期资产的现有 GLB、Blend、generator、程序化实现、证据、截图、
manifest、build record 和 QA 全部原样保留，不删除、不覆盖、不继续生成。
它们现有的共享原型与 `InstancedMesh` 运行时方式也不在本轮改造。`lighting-v3`
与角色仍不在本轮范围，运行时实例数也不计为模型数。

逐项真值和迁移决策位于：

- `docs/research/active-asset-scope-31.json`
- `docs/research/active-asset-tier-migration-matrix.md`

878 个 OSM 候选、其中 864 个普通建筑、3 类树木、10 类装饰物、额外上生 /
华山建筑与设施、非目录原型以及已经生成的全地图产物全部转为
`hold/backlog`。这些 GLB、Blend、证据、截图、manifest、build record 和
QA 记录只读保留，不删除、不覆盖、不继续生成，也不得混入当前 18 栋建筑的
活动模型计数。

### 0.1 当前生产顺序

新版管线的唯一有效顺序为：

1. 证据、视角矩阵与 Brief；
2. Massing 真实地图位置、比例、朝向、地面和碰撞校准；
3. 完整 Hero master；
4. 从已冻结 Hero master 派生 Identity；
5. 冻结并复核 Massing；
6. Hero / Identity / Massing 三档真实运行时验收。

完整 Hero 建模中的“身份构件阶段”不等于 Identity GLB。没有完整 Hero
master 及其 SHA lineage 的 Identity 一律标为 `provisional`，不能正式
通过。此前生成的 8 个 shared Identity、树木 / 装饰物 Massing 和其他
Active 31 产物全部作为 hold migration input 保留，不直接继承 formal pass，
也不进入当前建筑队列。

### 0.2 性能与加载边界

- 近景按距离加载 Hero，中景加载 Identity，远景加载 Massing；
- 不同时加载 18 个 Hero；
- 树木和装饰物保持当前共享原型与 `InstancedMesh` 运行方式，但本轮不新增、
  不重建、不验收其三档资产；
- 验收分别记录首屏、地图入口、延迟 Hero、缓存命中和 fallback 的流量、
  请求、帧率与内存条件。

### 0.3 当前最小纵向试点

`sun-ke-villa` 单资产纵向试点已闭环：`osm-way-864847877` Massing 已完成
结构化重建、Blender MCP 与真实地图校准；Hero master 已冻结；Identity
已从该 Hero 派生；Hero / Identity / Massing 的固定机位、fallback、缓存、
流量、碰撞与 Three.js 运行时均通过。验收记录为：

- `docs/research/sun-ke-villa-blender-mcp-gates-v2.json`
- `docs/research/sun-ke-villa-massing-map-qa-v2.json`
- `docs/research/sun-ke-villa-three-tier-runtime-qa-v2.json`

当前统一进度口径为 18 栋：孙科别墅 1 栋已完成，上海影城 1 栋进行中，
其余 16 栋在上海影城之后排队。孙科试点完成不代表 Active 18 全部完成。

### 0.4 延期资产收尾规则

现在不创建新的延期 Worktree，也不继续处理 hold 资产。只有 Active 18
完成并准备收尾时，才在核对现有分支和 Worktree 后单独创建
延期 Worktree / branch（建议 `codex/deferred-models-v3`），并生成
`docs/research/deferred-models-handoff.md`。交接必须包含来源提交、延期
资产清单、各档状态、全部现有产物与证据路径、地图 QA、测试、阻断、准确
续作命令和下一优先级。拆分脏 Worktree 前先做精确文件清单和可恢复保存
方案，不使用破坏性 reset / checkout，不把延期 public GLB 带入当前发布包。

> 下文第 2 节起保留了范围收缩前的全地图和 Active 31 研究与已生成成果记录，
> 全部视为历史 / hold 信息；除 18 栋建筑的 migration input 外，不构成当前
> 执行范围。

## 1. 质量边界

本轮遵守：

- `1 Blender unit = 1 authored scene unit = 2.7m`；
- Blender 正面默认朝本地 `-Y`；
- 参考照片只作为研究证据，不进入 GLB；
- 每个命名建筑至少有 canonical、侧向/纵深、入口/身份细节三类证据；
- 每个命名建筑至少保留三处主体独有的识别构件；
- Massing 必须先进入真实 `?start=` 页面通过比例、落点、朝向和碰撞门；
- Hero、Identity、Massing 共用稳定原点、比例、朝向和碰撞；
- 找不到背面、屋顶、入口、树种或真实高度时明确写 `unknown`，不把推测包装成事实。

普通建筑允许复用通过验收的原型，但每个地图实例必须有稳定 ID，并明确绑定 Hero、Identity、Massing、位置证据和碰撞，不允许以临时方盒作为正式 Identity。

## 2. 范围收缩前的全地图清单（Hold 历史记录）

### 2.1 全区域 OSM 建筑候选

- 原始快照：`docs/research/data/xinhua-buildings-overpass-20260724-185147.json`
- 行政边界内派生清单：`docs/research/data/xinhua-building-inventory-20260724-185400.json`
- 原始候选：1696
- 行政边界内：878
- 其中核心片区 OSM 建筑：12
- 已绑定命名地标：2
- 普通建筑候选：864
- 有 `building:levels` 可推高度：13
- 缺真实高度、暂用明确标注的运行时类型 fallback：865

当前 878 是 footprint 候选，不是最终去重后的独立建筑数量。其余 12 个手工落点道路地标可能与未命名 OSM footprint 重合，必须先做空间绑定；幸福里 7 栋推断体块另行记录。去重完成前不得声称最终建筑总数。

### 2.2 新华路 14 个命名地标

| ID | Hero 决策 | Identity | Massing | 证据结论 |
| --- | --- | --- | --- | --- |
| `shanghai-cinema` | 保留，已按 V2 完成 | 保留 Hybrid，补背向 QA | 新制 | 三视角证据完整 |
| `film-art-center` | 保留，已按 V2 完成 | 新制 | 新制 | 当前三张都偏南侧，背向仍 unknown |
| `one-step-garden` | 重做 | 新制 | 新制 | 已找到同一场地沿街白色体量与后部红砖体量证据；地图 footprint 待绑定 |
| `xinhua-villas-211` | 重做 | 新制 | 新制 | 现有单张入口不足；已新增 1号、2号和弄堂入口官方图 |
| `xinhua-villas-329` | 重做 | 新制 | 新制 | 园区代表建筑需与具体门牌拆分；已新增 17号、38号官方图 |
| `house-315` | 重做 | 新制 | 新制 | 已新增官方正面与街道场地关系图；背向 unknown |
| `villa-le-bec` | 重做 | 新制 | 新制 | 已补主住宅、入口、原车库与花园多视角；1912/1924 年代冲突和精确平面关系待闭合 |
| `shanghai-orchestra` | 重做 | 新制 | 新制 | 已补 TJAD compound、法华镇路立面、入口雨棚和院落证据；6/7/8 号楼 footprint 待拆分 |
| `hudec-memorial` | 重做 | 新制 | 新制 | 现有 OSM 中心算法偏差约 4.7m，位置和入口朝向先重验 |
| `xinhua-pocket-park` | 重做 | 新制 | 新制 | 两张场地图，真实 footprint 和朝向不足 |
| `xinhua-community-center` | 重做 | 新制 | 新制 | OSM node 只证明点位，建筑 footprint 未确认 |
| `debi-fahua-525` | 重做 | 新制 | 新制 | 三张园区图可用，需补背向和逐子建筑记录 |
| `fahua-heritage` | 重做 | 新制 | 新制 | 单张正面，不足以证明纵深 |
| `fics-xinhua-365` | 重做并拆分子建筑 | 新制 | 新制 | 三张园区图可用，需消除 `xinhua365` alias 漂移 |

旧 `xinhua-villas.glb` 和 `xinhua-mansion.glb` 只标为 legacy，暂不删除。

首批 14 个道路地标 Massing 已生成独立 `.blend`、GLB、canonical、side 和 Three.js 截图；14/14 tier GLB 请求响应成功，主审相机均为 `spring-clear / blocker none`。但独立审查判定正式 Massing 通过数为 0：6 项体块可保留但仍缺地图、证据与走近/绕行闭环，8 项必须由 `voxel-remesh-current-hero` 改为 footprint 驱动的干净分体灰模。所有新 Identity 均被阻断；结果记录在 `docs/research/xinhua-road-massing-runtime-qa.json`。

864 个普通 OSM 建筑已完成 footprint 驱动的确定性 Massing：

- 14 个分块均有独立可编辑 `.blend`、GLB、canonical、side 和 build record；
- 864 个实例保留稳定 OSM ID、独立节点、原始 footprint 和高度证据边界；
- 合计 1,525,432 bytes、17,068 triangles、14 个 GLB 请求全部 HTTP 200；
- Three.js 地图总览已确认单 canvas、`playable`、无可见尖刺或漂浮碎片；
- 11 栋高度来自 `building:levels`，其余 853 栋高度仍是明确标注的 fallback unknown；
- 正式 Massing 门仍被街道固定机位抽样、确定性走近/绕行、地面/碰撞、命名建筑重叠去重和高度分类阻断，因此不允许进入 Identity。

主清单、运行时记录和联系表分别位于：

- `docs/research/osm-ordinary-massing-manifest.json`
- `docs/research/osm-ordinary-massing-runtime-qa.json`
- `test_artifacts/all-models/massing/osm-ordinary/test_osm-ordinary-massing-canonical-contact-sheet.png`
- `test_artifacts/all-models/massing/osm-ordinary/test_osm-ordinary-massing-side-contact-sheet.png`
- `test_artifacts/all-models/massing/osm-ordinary/test_osm-ordinary-massing-threejs-overview.jpg`

### 2.3 幸福里 7 栋

`north-west`、`north-inner-west`、`north-inner-east`、`north-east-entry`、`south-west`、`south-inner-west`、`south-east-entry` 必须分别建立实例记录。

- 现有 west / center / east Hero package 可保留；
- 7 栋逐一绑定到 package 内节点、Massing、Identity、碰撞和证据；
- 当前 7 栋体块、统一朝向和非等比尺度均属于 `inferred`；
- POI marker 与模型 pivot 约 5.5m 偏差必须显式修正或记录；
- package 文件名不能继续代替建筑 ID。

### 2.4 上生·新所 11 栋

| OSM way | 类型 | Hero 决策 |
| --- | --- | --- |
| `864847877` | 孙科别墅 | 保留 V2 Hero，补三档正式记录 |
| `864847883` | 海军俱乐部 | 按 V2 重做 |
| `864847881` | 乡村俱乐部 | 新建完整 Blender Hero |
| `864847892` | 官方保留 30#（高置信） | 先做一层 exact-footprint Massing；无单栋立面照片，Identity / Hero 阻断 |
| `864847856` | 无名既有建筑 | 只做 exact-footprint Massing；身份、层数、立面均 unknown |
| `1364679201`、`1368808689`、`1368808690`、`1537478450` | 二期范围外既有建筑 | 只做 exact-footprint Massing；不得标成 N 楼或 30# |
| `1364679204` | N2 区域候选，中置信 | 当前 way 不足以代表完整 N2；只保留无编号 footprint Massing |
| `1364679205` | N4 区域/局部候选，低置信 | 当前 way 远小于完整 N4；只保留无编号 footprint Massing |

官方编号总平证明当前 OSM 缺少 N1、N3、N5 的完整 footprint，N2/N4
也只有粗略或局部 way；缺失建筑必须另建待绑定条目，不能拿现有 11 个
way 强行一一对应。OSM 长轴只能证明体块轴线，不能证明正门方向。11 栋
都要补入口方向证据；没有单栋照片的建筑标 `unknown`，不得拿园区照片
替代单栋证据。

### 2.5 华山绿地

- 服务建筑 `osm-way-743778426`：新建 Hero / Identity / Massing；
- 篮球场 `osm-way-743778425`：作为重要设施三档记录；
- 跑道、池塘/栈桥、鸟廊架、幸福角：作为场地设施分别建三档；
- 当前树种和服务建筑背面均为 `unknown`。

## 3. 树木、植被和装饰物（Hold / Deferred 历史记录）

本节只记录已经存在的调查、程序化实现和产物路径，不属于当前 Active 18
执行队列。所有条目暂停新增、重建、地图校准和三档验收，等待用户以后明确
扩展范围；原文件不得删除或覆盖。

### 3.1 树木原型与实例

| 原型 | 当前实例 | 三档策略 |
| --- | ---: | --- |
| 新华路悬铃木 | 道路 28 + 幸福里 3 = 31 | 保留 A/B/C Hero 族，补正式 Identity / Massing 和逐株稳定 ID；Hero 不额外计数；Massing canonical 机位校准后按同一生产算法重新冻结 |
| 上生庭院树 | 实际 29（源码上限 44） | 树种 unknown；制作 3 个结构变体的 Hero / Identity / Massing；不能把 `slice(0, 44)` 上限当成实例数 |
| 华山绿地乔木 | 112 | 树种 unknown；制作 3 个结构变体的 Hero / Identity / Massing |
| 华山林下层 | 实际 73（源码候选上限 84） | 作为 vegetation prototype family 单独三档，不与乔木合并计数 |
| 新华路边缘灌木 | 12 | 作为 shrub prototype family 单独三档 |

所有程序生成位置必须冻结为 placement snapshot，记录稳定实例 ID、位置、yaw、scale、地面高度、证据等级和避让结果。

### 3.2 共享街具原型

下列原型是原 Active 31 的延期目标。已有结果完整保留，但本轮不再补 Hero /
Identity / Massing，也不继续生成 Blender 源或 GLB：

1. `street-furniture:lane-lamp-short-arm`
2. `street-furniture:cantilever-umbrella`
3. `street-furniture:outdoor-table-set`
4. `street-furniture:slatted-bench`
5. `street-furniture:rectangular-planter`
6. `street-furniture:shanghai-dual-classification-bin`
7. `street-furniture:irregular-stone-bollard`
8. `vegetation:road-edge-shrub`

本轮不覆盖旧生产决策；运行时继续保留现状。以后若用户重新激活这些资产，
再恢复三档与 `InstancedMesh` 的一致性审计。

### 3.3 场地设施与装置

- 上生：wayfinding totem、cafe pavilion、bicycle parking、reading terrace、fountain、main entry；
- 华山：pond/boardwalk、basketball court、bird pergola、happiness corner；
- 幸福里：reflecting pool hardscape、mixed paving、vertical garden；
- 全局：One Square Metre Action installation；
- 道路表面和标线作为 environment package 管理，不冒充建筑 Identity。

## 4. 地图校验顺序

1. 冻结 OSM footprint 和原始快照；
2. 将 14 个道路地标绑定到具体 OSM footprint，未绑定者保留人工落点并标 `inferred`；
3. 使用面积质心替代 OSM 顶点算术平均，先修复邬达克纪念馆等高风险落点；
4. 对每栋记录 authored position、world position、WGS84、footprint、height、yaw axis、canonical front、entrance direction；
5. 入口朝向由照片和道路关系决定，OSM 最长边只作为 Massing 轴线；
6. 校验 `scene distance × 2.7m`，Explore `1.65` 只属于显示层，不改写 authored 资产单位；
7. 当前 18 栋建筑逐项检查道路净距、入口净空、地图边界和地面接触；树木、
   街具 placement 仅保留历史快照，不进入当前验收；
8. Hero / Identity / Massing 切换不得改变 transform 或碰撞。

## 5. 范围收缩前的研究与建模批次（Inactive）

### Historical Batch A：清单和数据底座（已暂停）

- 全区域 OSM building/building:part 快照；
- 主 registry、alias、prototype / instance / package 三层 ID；
- 树木和装饰物 placement snapshot；
- 地图位置、尺度、朝向证据字段；
- 自动化完整性测试。

### Historical Batch B：全量 Massing（已暂停）

- 878 个 OSM footprint 候选；
- 14 个道路地标人工绑定；
- 幸福里 7 栋推断体块；
- 三类乔木、林下层、灌木和全部街具/设施；
- 真实 Three.js 灰模运行时门。

当前进度：

- 普通 OSM 864 栋：Blender / GLB / 总览运行时已完成，正式门阻断于逐区抽样与去重；
- 道路 POI 14 项：首轮独立审查 0/14 正式通过；其中 8 项已完成 footprint 净体块 v2，网络/运行时视觉门 8/8 Pass，但正式地图门仍为 0/8、Identity 0/8；
- core 12、已命名 OSM 2、幸福里 7、上生 11、华山建筑/设施、树木、植被、
  街具和装置：均为历史 / hold 记录，不按本批次继续生成与验收；Active 18
  只使用其中明确列入的建筑条目。

共享植被与街具 Massing 首批已正式通过：

- 5 个植被原型与 7 个街具原型均有独立 Blender、GLB、canonical、side 和 build record；
- 第二版 12 个 GLB 合计 100,328 bytes、1,038 triangles、全部单 node / mesh / material、0 图片贴图；第一版已只读归档到 `massing-review1` 目录；
- 真实 Three.js gallery 以 authored scale 加载 12/12、HTTP 200 为 12/12、0 failure、单 canvas、`playable`；
- canonical、side 和运行时均未观察到尖刺或漂浮碎片；
- 上生与华山树种继续明确为 `unknown`，没有借用新华路悬铃木证据；
- 独立 Massing 终验为 12/12 Pass；`xinhua-plane-tree` 与 7 个街具按逐资产清单放行 Identity；
- 上生园区树、华山乔木、华山林下层和道路灌木仅以 generic envelope 通过 Massing，物种证据仍为 `unknown`，继续禁止物种 Identity。

14 个设施语义 / 15 个设施 GLB 的 Massing 首批也已生成并完成两种运行时
入口取证：

- 15 个资产均有独立 `.blend`、GLB、canonical、side、build record 和
  参考 / Blender / Three.js 三联图；
- 隔离页与真实地图页各 15 个请求均为 HTTP 200、非 disk cache，且
  0 loading failure、0 runtime exception、0 console error；
- 五个首轮视觉问题已闭环，isolated shape / color visual 为 15/15；
- 地图截图已覆盖 15/15，但独立审查发现 11/15 有建筑、树干、园路、道路、
  路缘或既有设施相交 / 越界迹象；
- 另外 4/15 虽未见明显静态相交，仍没有 position、scale、yaw 和 collision
  独立证据；
- 因此 map placement、collision / passage 和 formal Massing 均保持
  `0/15`，Identity 不得因“能加载”而自动放行。

记录位于：

- `docs/research/facility-prototypes-massing-manifest.json`
- `docs/research/facility-prototypes-massing-runtime-qa.json`
- `docs/research/facility-prototypes-massing-independent-review.md`
- `test_artifacts/all-models/massing/facility-prototypes/test_facility-prototypes-massing-map-contact-sheet.png`

### Historical Batch C：Identity（已暂停）

- 先做普通建筑原型族；
- 再做 14 个道路地标、幸福里 7 栋、上生 11 栋、华山服务建筑；
- 地图首次可见前只允许 Identity，不出现裸 Massing。

首批共享植被与街具 Identity 已生成，但尚未通过正式 Identity 门：

- 仅承接上一批明确放行的 `xinhua-plane-tree` 与 7 个街具，共 8 个资产；
- 8/8 均有独立 `.blend`、GLB、canonical、side 和 build record；
- Blender 视觉审查为 8/8，GLB 结构审计为 8/8；合计 159,748 bytes、
  1,916 triangles、0 图片贴图；
- 上生园区树、华山乔木、华山林下层与道路灌木共 4 个 generic 植被，
  因树种证据仍为 `unknown`，本批次明确排除，没有伪装成悬铃木 Identity；
- 第一次 Three.js 检查发现 GLB 材质退化为默认 0.8 灰色；生成器现已把
  `diffuse_color` 与 Principled BSDF PBR 参数同步，并增加
  `materialBaseColors` 结构门，全量重建后 8/8 材质不再退化；
- 修复后真实 Three.js gallery 在 1280×720、DPR 2、页面可见、
  生产静态构建、禁用缓存条件下加载 8/8 当前 SHA GLB，HTTP 200 为 8/8，
  isolated shape 与 material visual 均为 8/8，runtime/console error 为 0；
- 真实地图位置、碰撞、通行以及同条件性能基线仍未通过，因此 formal
  Identity 保持 `0/8`。

随后已把 8 个原型展开到 72 个已登记地图实例做 authored envelope 数值审计：

- 覆盖新华路 28 株与幸福里 3 株悬铃木、新华路 19 个街具、幸福里 22 个
  街具，实例 ID 与 coordinate space 无遗漏；
- 旧树木 Hero 在相同 transform 下的高度为新 Identity 的
  `1.371–1.454` 倍；
- 7 个旧程序化街具相对新 Identity 的主要 envelope 比例约为
  `1.989–3.814`，不能用同一 placement transform 无损切档；
- production transform 未改，Identity 未提升到真实地图，map scale、yaw、
  collision / passage 与 formal Identity 仍全部为 `0/72`；
- 下一步必须先把新 Identity 按 72 个现有 transform 渲染到真实地图 QA，
  再根据照片 / 尺度证据选定每个 prototype 的唯一 common authored
  envelope；不得给不同 tier 偷加不同 scale 来掩盖差异。

记录位于：

- `docs/research/shared-prototypes-identity-manifest.json`
- `docs/research/shared-prototypes-identity-runtime-qa.json`
- `docs/research/shared-prototypes-identity-map-scale-audit.json`
- `docs/research/shared-prototypes-identity-map-scale-audit.md`
- `docs/research/shared-prototypes-identity-independent-review.md`
- `test_artifacts/all-models/identity/shared-prototypes/test_shared-prototypes-identity-canonical-contact-sheet.png`

### Historical Batch D：Hero（已暂停）

- 保留已通过 V2 的上海影城、电影艺术中心、幸福里 final packages 和孙科别墅；
- 其余旧 Hero 逐项按新证据和 Brief 重做；
- 树木、街具和设施完成 Hero 原型族。

### Historical Batch E：地图与运行时逐项验收（已暂停）

- Blender canonical / side / detail；
- GLB 结构、SHA、bounds、节点、三角面、材质、图片、体积；
- 实际 `?start=` 页面位置、比例、朝向、地面、碰撞、遮挡、相机、资源和性能；
- 参考 / Blender / Three.js 三联图；
- Massing 与最终两个独立审查点。

## 6. 当前基线

- Blender 5.2.0 LTS、Headless、Blender MCP 场景读取和视口截图已通过预检；
- `npm run lint` 通过；
- 改造前 `npm test` 为 165/166，通过构建但有 3 个共享街具 TypeScript 错误；
- 该基线错误已在本分支修复，相关 8 项类型和街具测试通过；
- 新增 OSM 快照和派生清单均只新增文件，没有覆盖或删除旧爬取数据。

## 7. 第一批新增证据

- 315号官方建筑说明与图：
  `https://www.meet-in-shanghai.net/tc/guide/stroll-xinhua-road-walk-into-the-old-timethe-building-can-be-read-863025/`
- 211弄1号官方记录：
  `https://www.shcn.gov.cn/col7698/20230109/1228439.html`
- 211弄1号、2号和329弄38号官方历史照片：
  `https://www.shcn.gov.cn/col6991/20251124/1301891.html`
- 329弄17号官方记录：
  `https://www.shcn.gov.cn/col7698/20240208/1254319.html`
- 一尺花园安和花园店同场地多体量：
  `https://sghexport.shobserver.com/html/baijiahao/2023/09/24/1133838.html`
- Villa Le Bec 主住宅、原车库与花园场地关系：
  `https://guide.michelin.com/ee/en/shanghai-municipality/shanghai/restaurant/villa-le-bec-bistro-321`
- 上海民族乐团新华路336号一期修缮 compound：
  `https://www.gooood.cn/renovation-project-of-shanghai-chinese-orchestra-located-at-no-336-xinhua-road-phase-i-china-by-tjad.htm`

照片已保存到：

- `docs/research/assets/poi-references/house-315/`
- `docs/research/assets/poi-references/xinhua-villas-211/`
- `docs/research/assets/poi-references/xinhua-villas-329/`
- `docs/research/assets/poi-references/one-step-garden/`
- `docs/research/assets/poi-references/villa-le-bec/`
- `docs/research/assets/poi-references/shanghai-orchestra/`

315号第二张图经视觉复核只是新华路街道环境，不是建筑南立面，已准确命名为 street context；不得拿它填补侧向证据槽位。

## 8. 当前 Active 18 完成定义

只有以下全部成立才可关闭目标：

1. `active-asset-scope-31.json` 中标记为 active 的 18 栋建筑逐项完成迁移与验收；
2. 每栋 active 建筑绑定 Hero / Identity / Massing，不把 package 内节点或
   运行时实例数另计为模型数；
3. 18 栋建筑的证据、Brief、视角矩阵、Decision log 和 build record 完整；
4. 找不到的信息明确 `unknown`；
5. 地图比例、落点、朝向、入口、碰撞和地面接触逐项通过；
6. Blender、GLB、Three.js 三层验收和三联图齐全；
7. `npm test`、`npm run lint`、GLB 审计和浏览器 QA 通过；
8. 同一提交完成 Git、Sites 与用户要求的部署面验收；未明确授权的 VPS 不擅自发布；
9. 收尾时才创建延期 Worktree，并证明 3 类树木、10 类装饰物及其他 hold
   文件完整保留且未进入当前发布包。
