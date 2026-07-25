# 研究文档导航

这个目录按“要解决什么功能问题”导航，而不是按文件创建时间导航。

## 使用规则

- 每份文档只放在一个**主分类**；当它对其他主题也重要时，在“交叉索引”中再次出现。
- 先从本页定位文档，再读取原文；本页不替代 Brief、证据、Decision log、Build record 或运行时验收。
- 当前不移动既有文件。很多测试、规则和历史链接仍引用这些路径；如果日后需要物理迁移，必须在独立变更中更新所有引用并运行完整验证。
- `assets/`、`data/`、`build-records/` 和 `templates/` 是证据/产物/模板目录，不应按普通说明文档移动。

## 1. 操控、视角与玩家体验

**现状：没有一份只专注第三人称操控、相机与触控验收的研究文档。**

- [Messenger 复刻基准](./messenger-reference.md)：产品边界、原站观察与技术路线；是操控/镜头体验的背景参考，但不是相机实现合同。

实现或复查相机时，同时阅读 `app/scene/xinhua-world.tsx`、`app/scene/world-math.ts`、`app/scene/input.ts` 和对应的 `tests/test_camera_*.test.mjs`。下一次单独升级相机、手势或第三人称控制时，应新增一份专门的 Camera & Controls Brief，并从这里链接。

## 2. 详情页 3D 建筑、POI 与场地

这些文档服务于可进入、可近看、需要证据与真实运行时验收的建筑/POI；不是预览页白模。

- [新增 POI 建模基准](./requested-poi-model-brief.md)
- [上海电影艺术中心 Brief](./film-art-center-model-brief.md)
- [上海影城 Brief](./shanghai-cinema-model-brief.md)
- [孙科别墅 Brief](./sun-ke-villa-model-brief.md)
- [幸福里 Brief](./xingfuli-model-brief.md)
- [幸福里区块建模基准](./xingfuli-reference.md)
- [上生·新所建模参考](./shangsheng-xinsuo-reference.md)
- [华山绿地建模参考](./huashan-green-reference.md)
- [新华路地标与梧桐树建模参考](./xinhua-road-landmarks-reference.md)
- [真实建筑模型对照表](./landmark-model-comparison.md)
- [POI 模型与真实照片审计](./poi-photo-model-audit.md)

## 3. 预览页、地图与全览功能

这些文档处理“从上方看懂街区”的功能，不定义可游玩的近景建筑细节。

- [全览街区白模实施方案](./overview-district-massing-implementation-plan.md)：OSM 建筑体块、POI 替换、性能与验收合同。
- [建筑高度证据策略](../knowledge-sources/xinhua-building-height-evidence-strategy-2026-07-25.md)：多源高度、许可、空间匹配、置信度，以及如何复用于真实详情建筑。
- [建筑高度校准 Decision Log](./building-height-calibration-decision-log.md)：80 栋 PoC 门禁、730 栋 A/B/C 结果、原始数据保留、GLB 与真实页面验收证据。
- [新华路街道地图基准](./xinhua-map-reference.md)：行政范围、道路数据、坐标比例、离线快照与署名。

## 4. 建筑生产管线、证据与可追溯性

开始任何真实建筑、环境资产或外部内容研究前，先从这一组读起。

- [Codex × Blender × Three.js 资产工作流 V2](./blender-ai-workflow.md)：强制 Preflight、Research、质量门与 Three.js 验收。
- [内容研究到 LLM Wiki 工作流](./content-research-wiki-workflow.md)：外部内容、视频拉片与 Wiki 证据链。
- [Blender Model Brief 模板](./templates/blender-model-brief-template.md)：所有新资产 Brief 的起点。
- [幸福里新版模型精细化管线可行性调研](./xingfuli-pipeline-feasibility.md)：一个完整街区的混合架构与实施取舍。
- [街道路面细化 Brief](./street-surface-refinement-model-brief.md)：地面资产的证据、尺度与质量合同。
- [街道路面细化 Decision Log](./street-surface-refinement-decision-log.md)：该资产的已决选择和运行时复盘。

## 5. 性能、加载与质量档位

这些文档决定什么资源在何时加载、低网/移动端如何退化，以及性能声明应如何验证。

- [建筑三档质量与加载合同](./building-quality-tiers-and-loading-contract.md)：Hero / Hybrid Identity / Massing 的职责与地图展示规则。
- [渐进世界加载验收](./progressive-world-loading-acceptance-2026-07-24.md)：实际包体、浏览器请求与验收结果。
- [上海影城完整 GLB 与混合渲染对比](./shanghai-cinema-hybrid-comparison.md)：真实降体积实验及其身份保真边界。
- [梧桐树轻量多变体替换方案](./plane-tree-variant-rollout.md)：植被替换的性能和视觉约束。

## 6. 人物

- [Rain Summer Wanderer Character Brief](./rain-summer-character-brief.md)：当前雨中漫游者的资产证据、质量合同和批次验收。
- [Urban Wanderer Character Brief](./urban-wanderer-character-brief.md)：早期人物候选、参考和视觉推导；作为历史决策背景，不默认覆盖当前人物 Brief。

## 7. 天气、季节、光照与氛围

- [Xinhua Autumn Lighting V3 Brief](./xinhua-autumn-lighting-v3-brief.md)：当前秋季光照的资产和运行时合同。
- [Xinhua Autumn Storybook Atmosphere](./xinhua-autumn-storybook-atmosphere.md)：秋日氛围问题、参数与运行时验收。
- [Xinhua Autumn Storybook V2 Brief](./xinhua-autumn-storybook-v2-brief.md)：第二版秋日绘本方向的前置证据与质量合同。

## 8. 视觉风格与产品方向

这组回答“整体像什么、为什么这样取舍”，不替代具体资产 Brief。

- [Xinhua Visual Direction Review](./xinhua-visual-direction-review.md)
- [Three Style Demo Brief](./style-demo-brief.md)
- [Soft Toy Buildings 风格研究](./toy-building-style-study-brief.md)
- [Messenger 复刻基准](./messenger-reference.md)

## 9. 街道环境与植被

这些是建筑之外、但对步行空间身份和画面密度非常关键的资产。

- [Plane Tree Modeling Lessons](./plane-tree-modeling-lessons.md)
- [梧桐树轻量多变体替换方案](./plane-tree-variant-rollout.md)
- [街道路面细化 Brief](./street-surface-refinement-model-brief.md)
- [街道路面细化 Decision Log](./street-surface-refinement-decision-log.md)
- [华山绿地建模参考](./huashan-green-reference.md)

## 交叉索引

| 当你要做的事 | 先读 | 再读 |
| --- | --- | --- |
| 调整第三人称镜头、触控或碰撞 | [Messenger 复刻基准](./messenger-reference.md) | 相机/输入源代码与 `tests/test_camera_*.test.mjs`；目前缺专用研究 Brief |
| 新增或升级一栋可进入的真实建筑 | [资产工作流 V2](./blender-ai-workflow.md) | 对应 POI Brief/Reference、照片审计、模型对照表 |
| 校准预览页建筑高度或为详情建筑准备高度证据 | [建筑高度证据策略](../knowledge-sources/xinhua-building-height-evidence-strategy-2026-07-25.md) | [建筑高度校准 Decision Log](./building-height-calibration-decision-log.md)、[全览街区白模方案](./overview-district-massing-implementation-plan.md)、对应 POI Brief |
| 改全览地图、道路或白模 | [地图基准](./xinhua-map-reference.md) | [全览街区白模方案](./overview-district-massing-implementation-plan.md)、建筑高度证据策略、加载合同 |
| 为预览页替换一个已精做 POI | [全览街区白模方案](./overview-district-massing-implementation-plan.md) | 建筑三档质量与加载合同、该 POI 的 Brief |
| 降低手机加载或替换 GLB | [渐进世界加载验收](./progressive-world-loading-acceptance-2026-07-24.md) | 三档质量合同、上海影城混合对比 |
| 修改人物 | [Rain Summer Wanderer Character Brief](./rain-summer-character-brief.md) | 资产工作流 V2、旧人物 Brief |
| 调整季节、天气、天空或光照 | [Xinhua Autumn Lighting V3 Brief](./xinhua-autumn-lighting-v3-brief.md) | 秋日氛围、秋日绘本 V2、视觉方向审查 |
| 做外部内容调研或视频拉片 | [内容研究到 LLM Wiki 工作流](./content-research-wiki-workflow.md) | 对应 POI/资产 Brief |

## 后续整理建议

先使用本导航一到两个迭代周期。若分类稳定，再单独讨论是否物理迁移为
`overview/`、`poi/`、`pipeline/`、`performance/`、`character/`、`atmosphere/`
等子目录；那将是一次需要更新 Markdown 链接、测试中的路径断言和工作流引用的独立重构。
