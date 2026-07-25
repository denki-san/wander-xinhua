# 新华路建筑高度证据策略

## 文档用途

- 状态：已按 80 栋 PoC 门禁实施；随后把第一轮剩余 676 栋全部进入第二轮队列，
  完成 GBA exact-ID、GHS-OBAT 辅助检查和 3D-GloBFP group reconciliation。
  最终 730 栋为 A 11 / B 532 / C 187；详见
  [`building-height-calibration-decision-log.md`](../research/building-height-calibration-decision-log.md)
- 日期：2026-07-25
- 当前项目性质：社区公益、非商业
- 服务范围：
  1. 校准 `overview` 街区背景体块的相对高度；
  2. 为以后真实详情场景里的单栋建筑 Model Brief 提供可复用证据；
  3. 保存来源、许可、年代、匹配质量与未知项，避免把预测值误当实测值。

第二轮只在匹配、许可、四视角视觉门和 7 栋显著变化人工复核全部通过后，
才授权更新正式 GLB；未发布到 Sites 或 VPS。

## 当前基线

### 观察

- 当前源记录包含 730 栋已接纳建筑。
- 719 栋使用 `heuristic`，11 栋使用 OSM `building:levels`，没有已接纳建筑使用
  OSM 直接 `height`。
- 启发式高度主要集中在 9、10.5、15 和 24 米；其中 401 栋为 15 米，241 栋为
  24 米。
- 当前体块已通过全览连续城区、道路退界、POI 层级、性能预算和弱网跳过验收。

### 推断

- 现有高度足以表达“这里是连续城区”，但过度离散，不能可靠表达新华路真实的
  低层花园住宅、里弄、多层街区与少量高层之间的天际线关系。
- 占地面积大不等于楼高；大型低层公共建筑和细长高层住宅都会被面积启发式误判。

### 第二轮已确认

- 第一轮 676 栋 C 全部进入队列，没有只抽取 100 栋。
- GlobalBuildingAtlas exact OSM ID 命中 590 栋；487 栋通过 3–90 米和
  `uncertainty stddev <= 6 m` 门。
- GHS-OBAT 通过 centroid/area 一对一空间门 577 栋，但 463 栋与第一轮邻近
  3D-GloBFP 候选相差超过 6 米。由于其高度源自 100 米 GHSL 栅格整合，它只作
  辅助证据，不单独升级任何建筑。
- 3D-GloBFP 的 2–4 footprint union reconciliation 通过 6 栋；在 GBA 优先和
  显著变化人工复核后，2 栋作为第二轮新增 B 来源。
- 7 栋高度变化达到 20 米或候选超过 60 米，均完成逐栋人工复核：
  6 栋接受 B，`way/428379423` 因 81.81 / 65.44 / 47.56 米多源估算分歧保留 C。

### 仍然未知

- 187 栋 C 没有达到足以替代启发式的逐栋证据；其真实高度仍未知。
- 2018–2020 年以后新建、拆除或改造建筑的数量。
- 单一高度不能证明屋顶、podium、立面、入口、材质或不可见侧。

## 数据源评估

### 1. OSM 与项目直接证据

**角色：最高优先级的可追溯事实来源。**

可用字段包括 `height`、`building:levels`、`roof:height`、
`building:min_level` 和 `building:part`。同时复用项目已有照片、POI Brief、
官方资料和可靠楼层观察。

限制：

- 当前快照高度字段极少；
- 用户贡献字段仍需做数值、单位、年代和异常值检查；
- `building:levels × 3 m` 是可解释换算，不是精确测量。

来源：

- <https://wiki.openstreetmap.org/wiki/Key:building>
- <https://wiki.openstreetmap.org/wiki/Simple_3D_Buildings>

### 2. 3D-GloBFP

**角色：第一主估算源。**

#### 观察

- 亚洲发布包含中国文件，逐建筑 footprint 带高度属性。
- 数据代表年份为 2020，使用多源遥感与建筑形态特征估算高度。
- 官方数据页面标注 CC BY 4.0。
- 论文跨 33 个子区验证，报告的 RMSE 范围约为 1.9–14.6 米，地区差异明显。

#### 推断

- 它明显优于“占地面积套固定高度”，适合建立 `B — matched estimate`。
- 它不能单独把一栋建筑提升为 `A — verified`，高层、复杂屋顶和近年变化仍需复核。
- 中国数据文件较大，应先定位上海所在分卷并裁剪研究范围，不把整套亚洲数据放入运行时仓库。

#### 未知

- 新华路范围的精确匹配率、时间变化和局部系统偏差。

来源：

- 数据：<https://zenodo.org/records/12674244>
- 论文：<https://essd.copernicus.org/articles/16/5357/2024/>

### 3. GlobalBuildingAtlas

**角色：当前社区公益、非商业项目可使用的辅助估算源。**

#### 观察

- 数据提供全球建筑 polygon、预测高度和 LoD1。
- `GBA.Height` 和 `GBA.LoD1` 标注为 CC BY-NC 4.0；代码另有自己的许可边界。
- 项目当前由用户明确声明为社区公益、没有商业化。

#### 决策

- 在当前用途下，允许把 GlobalBuildingAtlas 用于高度交叉检查、补缺和非商业生产结果。
- 每条引用必须记录数据产品、版本、feature/tile ID、许可和访问日期。
- 不因为“公益”而省略 BY-NC 约束。若以后出现广告、付费、商业授权、客户项目或
  其他用途变化，必须在继续分发派生高度/LoD1 前重新审核。
- 不直接用 GlobalBuildingAtlas footprint 替换当前 OSM 地理底座；以空间匹配方式
  生成高度候选，保留 OSM 为 footprint source of record。

#### 第二轮实测覆盖与选择门

- 官方 bulk tile 为 `LoD1/asiaeast/e120_n35_e125_n30.json`，固定到仓库 commit
  `9da24b3a8dce436a7420d5c3589de718d7ba14d6`。
- 原始 545,969,287 bytes 文件通过官方 LFS SHA-256
  `d44d5fc07118fdf0d4131fe0b00bfb2c95bf50e8d7c22c09c0ae5bae5c8349f4`。
- 数据记录以 `osm<ID>CHN` 为 key，本轮按 exact OSM source ID 对齐，而不是
  用 GBA footprint 替换地图底座。
- 590/676 命中 exact ID，487 栋通过有限高度 3–90 米与内部不确定度标准差
  `<= 6 m`；GBA 的内部 TTA 方差不是实测误差，因此仍只形成 B，不形成 A。
- 官方论文报告亚洲高度 RMSE 约 5.9 米，并指出高层低估风险；显著变化仍需
  视觉门和人工复核。

来源：

- <https://github.com/zhu-xlab/GlobalBuildingAtlas>

### 4. Overture Buildings

**角色：带来源追踪的条件补充源。**

#### 观察

- schema 支持 `height`、`num_floors`、`min_height`、`min_floor`、
  `has_parts` 和 BuildingPart。
- 字段均可选；官方示例里的 height 和 num_floors 可以为空。
- 每条 feature 带 `sources[]`，可能指向 OpenStreetMap。

#### 决策

- 必须读取字段级/feature 级来源。
- OSM 派生值不计为第二个独立来源，只可用于 ID 对齐或确认数据传播一致性。
- 只有来源独立、许可明确、空间匹配通过的属性才能成为新的高度候选。

来源：

- <https://docs.overturemaps.org/schema/reference/buildings/building/>
- <https://docs.overturemaps.org/guides/buildings/>

### 5. Google Open Buildings 2.5D

**角色：当前排除。**

官方覆盖包括非洲、南亚、东南亚、拉丁美洲与加勒比地区，没有上海。除非官方覆盖扩展，
否则不进入下载和匹配流程。

来源：

- <https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_Research_open-buildings-temporal_v1>

### 6. Copernicus GLO-30

**角色：地形和街区尺度背景，不是逐栋高度源。**

30 米 DSM 会混合建筑、树木、道路设施和地表，不能给 730 个 footprint 分配可靠楼高。
只保留为地形趋势、异常检查和地面高程背景。

来源：

- <https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM>

## 统一高度证据记录

每个 OSM footprint 使用独立记录，建议后续生成英文命名 JSON。最小字段：

```json
{
  "osmRef": "way/123",
  "overviewAssetId": "way/123",
  "sourceFeatures": [
    {
      "dataset": "3D-GloBFP",
      "versionOrYear": "2020",
      "featureId": "source-id",
      "licence": "CC-BY-4.0",
      "heightMetres": 18.4,
      "accessedAt": "2026-07-25"
    }
  ],
  "footprintMatch": {
    "method": "spatial-iou",
    "iou": 0.84,
    "centroidDistanceMetres": 1.8,
    "areaRatio": 1.06,
    "assignment": "one-to-one"
  },
  "heightCandidates": [],
  "selectedHeightMetres": 18.4,
  "selectionReason": "best permitted matched estimate; no direct conflict",
  "confidence": "B",
  "observedFacts": [],
  "inferences": [],
  "unknowns": [],
  "roofOrPodiumNotes": [],
  "currentnessRisks": ["source represents 2020"],
  "detailSceneReadiness": "needs-review",
  "evidencePaths": []
}
```

## 自动匹配质量门

第一次 PoC 采用以下初始门槛：

- 精确来源链接可直接建立候选，但仍检查几何与高度异常；
- 普通空间匹配要求 IoU `>= 0.70`；
- centroid distance `<= 5 m`；
- area ratio 在 `0.67–1.50`；
- 必须是一对一分配；
- 高度必须有限并处于 3–90 米安全范围。

以下情况自动转人工复核：

- 一对多、多对一或多个候选分数接近；
- 与可靠 floor count 相差超过两层或 6 米；
- 数据年份后可能新建、拆除或大改；
- 属于正式 POI、道路界面关键建筑或局部天际线高点；
- 不同允许数据源之间出现显著冲突；
- footprint 很小但高度极高，或 footprint 很大但高度极低。

不允许为了提高覆盖率而静默放宽阈值。未通过的建筑继续使用 `C` 级启发式。

## 三档置信度

- `A — verified`：官方/直接高度、可靠楼层、项目照片或 POI 证据验证。
- `B — matched estimate`：许可允许的逐栋高度数据通过空间质量门，且没有未解决的直接证据冲突。
- `C — heuristic`：仅有 footprint/type 启发式。

`A/B/C` 描述证据质量，不描述模型美术质量，也不等同于
Hero / Hybrid Identity / Massing 资产档位。

## 预览页实施顺序

1. 冻结当前 730 栋源记录和 GLB SHA，不覆盖旧产物。
2. 选 50–100 栋 PoC：
   - 低层住宅；
   - 中等体量街区；
   - 当前最高候选；
   - 幸福路、法华镇路等关键道路；
   - 正式 POI replacement 边缘。
3. 保存原始下载、裁剪结果、匹配脚本和匹配报告。
4. 输出覆盖率、未匹配、歧义、拒绝、年代风险和直接证据冲突。
5. 人工复核 20–40 栋最影响天际线或详情生产的建筑。
6. 同机位比较当前/新高度，桌面与 390 px 都要验收。
7. 通过后才生成全量 GLB；失败或缺数据时保留当前 C 级高度。

## 对真实详情建筑的复用

高度证据记录是未来详情场景的研究入口，但不是完整建模 Brief。

可以直接复用：

- footprint、方位和地面落点；
- 多源高度候选、楼层候选和年代；
- podium、roof、building part 的已知线索；
- 来源许可、置信度和冲突记录；
- 哪些视角或身份细节仍未知。

仍必须重新补齐：

- canonical、侧向/纵深、入口/身份细节三类参考；
- 三处主体独有识别构件；
- 真实屋顶、立面开间、入口、材质和背面证据；
- 人物尺度、碰撞、屏幕占比和运行时预算；
- Blender、GLB 与实际 `?start=` Three.js 三层验收。

因此：

- `B` 级高度可以启动灰模比例；
- 只有高度数据不能开始身份细化；
- 缺失面继续标为未知，不能由高度数据推造立面；
- 未来 POI Brief 应引用对应高度记录，而不是复制一个失去 provenance 的数字。

## 完成标准

本研究只有在以下条件同时满足后才算“高度方案已实施”：

1. 原始数据只读保存，许可和版本可追溯；
2. PoC 匹配报告完成，阈值和冲突均可审计；
3. 全量记录保留 A/B/C 与未匹配项；
4. 新 GLB deterministic replay、预算和结构审计通过；
5. 同机位桌面/手机视觉验收通过；
6. OSM、3D-GloBFP、GlobalBuildingAtlas 等实际使用来源完成署名；
7. 知识源已同步到独立 `Threejs-3d-research` Wiki，队列清空且检索/读取/关系回查成功。
