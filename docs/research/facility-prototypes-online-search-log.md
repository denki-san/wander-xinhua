# Facility Prototypes Online Search Log

检索日期：2026-07-25  
目的：为缺少精细 Blender 模型的 14 个设施原型寻找可绑定的公开资料；找不到时明确记录。  
优先级：政府/项目方 > 一手案例库 > 场地媒体资料 > 聚合/用户内容。相似设施不冒充主体。

## 1. 已找到并本地化

| 原型 | 结果 | 本地证据 | 仍缺 |
| --- | --- | --- | --- |
| 上生喷泉 | 长宁区政府 2022 照片确认海军俱乐部前齐平铺装多喷头阵列 | `shangsheng-navy-club-fountain-plaza-2022.jpeg` | 与 OSM 两个 fountain way 的逐一绑定 |
| 上生主入口 | 既有本地入口正面照片继续有效 | `yanan-road-entrance.jpg` | 侧向、背面、净深 |
| 华山篮球场 | 长宁区政府 2025 清单含直接入口照片 | `huashan-basketball-court-entry-2025.jpg` | 全场、另一端篮架、围网边界、照片—OSM overlay |
| 华山幸福转角 | 长宁区政府 2026 页面含四张主体多视角 | `huashan-happiness-corner-*.jpg` | 精确 pivot、yaw、尺寸和地形 overlay |
| 幸福里倒影池 | 既有多视角现场组照 | `docs/research/assets/poi-references/xingfuli/` | 工程尺寸 |
| 幸福里混合铺地 | 既有近景与主巷照片 | `xingfuli-smartshanghai-03-2021.jpeg` 等 | 单块规格 |
| 幸福里垂直花园 | 长宁区政府 2023 主巷照片明确显示连续高绿墙 | `xingfuli-government-main-lane-vertical-garden-2023.jpg` | 侧面、端点、模块、精确尺寸 |
| 一平米行动 | 中国美院美丽中国研究院资料确认项目和社区活动 | `docs/research/assets/poi-references/one-square-metre-action/` | 这些活动图不证明游戏固定装置形态 |

完整 URL、发布者、日期、Observed 与 binding 边界见
`docs/research/facility-prototypes-reference-manifest.json`。

## 2. 搜过但未找到可绑定主体照片

| 原型 | 已执行检索 | 发现 | 结论 |
| --- | --- | --- | --- |
| 上生导视图腾 | “上生新所 导视牌 图腾 照片” | 园区泛图、入口图、地图评论 | 未找到两个运行时落点的同主体图腾 |
| 上生咖啡亭 | “上生新所 六边形 咖啡亭 亭子 照片” | 咖啡店、外摆、店面资料 | 未找到当前六边亭 + 中心柜台主体 |
| 上生自行车停车 | “上生新所 自行车停车架 照片” | 商户/活动中的自行车语境 | 未找到七跨 U 形停车架及其落点 |
| 上生阅读环台 | “上生新所 户外阅读 环形座椅 照片” | 茑屋书店室内阅读与普通座椅 | 未找到八边环台和中心书形构件 |
| 华山水池栈道 | “华山绿地 栈桥 水池 照片 上海 长宁”以及政府站内检索 | 2019 改造文字确认水体清淤、木栈道修复；2025/2026 资料主要覆盖跑道与幸福转角 | 未找到能绑定当前椭圆水池和横桥的同主体照片 |
| 华山观鸟廊架 | “华山绿地 鸟笼架 观鸟架 照片 上海”以及政府站内检索 | 2019 区域名“林森鸟啼”和公园鸟类语境 | 未找到当前九杆半拱廊架主体 |

这 6 项只能建立明确标为 `runtime-authored fallback` 的 Massing；不得进入现实
Identity，更不得把搜索结果里的相似亭、普通自行车架、其他公园鸟架或水桥移植成事实。

## 3. 发现但不纳入主体绑定的资料

- SmartShanghai 的 2020 华山绿地四张场地图片只显示入口、跑道、林下小径和长椅，
  没有水池栈桥或观鸟廊架主体；
- 2019 “华山绿地迎来提升改造”转载页确认八个区域、水体清淤和木栈道修复，
  只能作为类型/改造文字证据；
- 上生咖啡商户和外摆图片只证明园区有咖啡商业，不证明当前程序化六边亭；
- “一平米行动”工作坊、手作、园艺图片只证明项目活动语境，不证明游戏装置。

## 4. 对模型管线的可执行影响

1. 上生喷泉新 Massing 应使用各自 OSM footprint 的齐地薄层，不沿用高池沿/单喷柱；
2. 华山篮球场 Massing 可用 OSM 五边形与照片可见的绿网、闸机、悬臂篮架语言，
   但对称补齐只可作为 Massing fallback；
3. 华山幸福转角必须整体替换旧三门架 + 花团，改为心形环架、层级坐阶和曲线花池；
4. 幸福里垂直花园可进入条件式 Identity，但先做主巷照片—地图 overlay；
5. 六项“未找到”必须在 manifest、build record 和 registry 中持续保留缺图状态。

## 5. 独立 LLM Wiki 接入验证

目标项目固定为 `Threejs-3d-research`
（`0e0c3670-c275-42f9-8c06-6de01e3683b5`），不写入
`TowerOld_XHS_Archive`。

2026-07-25 已通过实际 MCP 检索、读取和关系图三层验证：

- `llm_wiki_search` 已命中
  `wiki/sources/31-threejs-modeling-knowledge-base--13-wander-xinhua--37-facility-prototypes-evidence-20260725--p41ma9.md`；
- `llm_wiki_read_file` 已成功读取该 source 页，内容包含 14 个设施语义、
  15 个 GLB、证据分层和地图落位边界；
- `llm_wiki_graph_relations` 已检出
  `设施原型证据分层与落位绑定` methodology 节点和
  `Huashan Greenland Happiness Corner` entity 节点。

因此本次知识库状态为“已完成索引并可检索/读取/关联”，不再沿用早期
`processing` 状态。该验证只证明知识库接入，不代表任何模型或地图闸门通过。
