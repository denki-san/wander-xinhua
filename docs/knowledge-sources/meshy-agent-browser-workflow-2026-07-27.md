# Meshy Agent 浏览器生产工作流（2026-07-27）

## 定位

Meshy Agent 是“漫步新华”的候选几何工位，不是正式资产编译器，也不是后台 API。
智能体操作已经登录的网页，所有生成物必须回到证据、Blender、GLB 和真实 Three.js
验收链后，才能进入游戏。

本页是可持续维护的方法文档。逐次操作截图、页面任务记录和原始导出属于动态证据，
统一保存在 `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/` 的不可变快照中。

本轮快照：`2026-07-27-meshy-agent-pilot-2ca6310`，815 个文件、418,611,200 bytes，
`SHA256SUMS` 全部通过。Meshy 相关记录位于
`repository/test_artifacts/test_meshy_agent_pilot_20260727/`。

## 已确认的网页事实

截至 2026-07-27，官方手册和实际页面共同确认：

1. Agent 可以从文字或参考图开始；
2. 文字路线先生成 2D 图片，再基于选中的图片生成 3D；
3. 3D 结果可进入 3D Viewer；
4. Viewer/Workspace 支持 Remesh、Retexture、Edit Texture、Unwrap UV；
5. Remesh 用于降低多边形或清理拓扑，Meshy 不自动生成 LOD；
6. 下载设置实际提供尺寸调整、高度、底部/中心原点和 GLB 等格式；
7. GLB 会嵌入纹理，Meshy 导出不会主动压缩生成时的纹理分辨率。

证据优先级：

```text
实际可见 UI 与实际导出
  > Meshy 官方 Help Center
  > Meshy Agent 在对话中对自身能力的描述
  > 未验证的经验推断
```

本次 Agent 曾错误声称“没有 Auto 3D 偏好”和“下载时不能设置尺寸/原点”，而实际
页面同时出现了 Auto、Standard、Smart Topology，以及下载尺寸和原点设置。因此不能
把 Agent 自述当作产品真值。

## 两条正确入口

### 文字生成路线

```text
已审核的资产需求
  → 单个资产提示词
  → 生成 2D 概念图
  → 人工对照证据审核
  → 选择 Standard 或 Smart Topology
  → 生成 3D
  → 检查轮廓、结构和面数
  → 按用途生成 Remesh 版本
  → 必要时 Retexture
  → 设置真实高度、底部原点、GLB
  → 下载并立即归档
  → Blender / GLB / Three.js QA
```

2D 概念图未显示、未能与证据对照或身份特征不足时，不得视为审核通过。本次为了验证
工具链曾在概念图被客户端拦截时继续生成长椅灰模；这个结果只能算流程候选，不能成为
生产先例。

### 图片生成路线

```text
审核通过的原始照片
  → 保留原件并创建可追溯清理衍生图
  → 单主体、完整轮廓、白底/透明底
  → 单图或 Multi-view
  → 生成并审核 3D
  → Remesh / Retexture / 下载
  → 下游 QA
```

输入图片建议至少 1024 px，主体占画面约 70%–90%，使用均匀漫射光，避免裁断、阴影、
多主体和复杂背景。Multi-view 仅用于同一物体的 2–4 张独立图片；每张是单独视角，
不能上传拼贴图。照片的比例、光照、背景与主体状态要一致。

## 每次运行前的 Asset Task Contract

没有以下字段，不启动会消耗 credits 的操作：

- `assetId` 和实际游戏用途；
- 图片证据快照、视角和审核结论；
- 真实尺寸或可接受的尺寸区间；
- 目标屏幕占比、典型距离和最大重复数量；
- 近景版、常规版还是远景版；
- 目标三角面、材质、纹理和 GLB 字节预算；
- 必须保留的 3 个识别特征；
- 允许推断和禁止虚构的部分；
- 原点、朝向和地面接触要求；
- 输出命名、归档位置和人工停止条件。

生产时一个 Agent 对话只推进一个资产版本。批量指令适合统一风格探索，不适合绕过
逐资产证据审核和预算控制。

## 漫步新华的初始参数矩阵

以下是下一轮真实页面和运行时验证的起点，不是已经通过的硬标准。

| 资产与用法 | 真实尺度输入 | 常规重复版目标 | 近景候选上限 | 纹理策略 |
| --- | --- | ---: | ---: | --- |
| 悬铃木，行道树重复实例 | 证据优先；无测量时只以 `8–12 m` 作候选区间 | `800–2,000` tris | `2,000–4,000` tris | 优先共享色板或小型共享 atlas，不做单片高模叶 |
| 路灯，沿街高重复 | 证据优先；候选高度 `3–4.5 m` | `300–800` tris | `800–1,500` tris | 优先无独立纹理，金属/灯罩用共享材质 |
| 长椅，中距离重复 | 长约 `1.5 m`、座高约 `0.45 m`、总高约 `0.8 m` | `500–1,200` tris | `1,200–2,500` tris | 木/金属使用 2–3 个共享色板材质 |
| 自行车，近中景身份道具 | 长约 `1.7 m`、轮径约 `0.66 m` | `1,200–3,000` tris | `3,000–5,000` tris | 默认无独立 PBR 组；必要时最多一张 `512–1024` Base Color |

上表采用“重复版”和“近景版”两种用途，不要求 Meshy 自动生成 LOD。需要多档时，从
同一审核通过的源模型分别 Remesh 并各自导出。Remesh 后仍需检查轮廓、细杆厚度、
UV 和法线，不能只看目标面数。

项目在资产生产和审计中使用米；下载时选底部原点。Meshy 的“高度”只能约束单一
包围盒维度，仍需在 Blender 中核对长度、座高、轮径等第二尺度，再在游戏集成层按
`1 unit = 2.7 m` 转换。

## Standard、Smart Topology 与 Remesh

- `Smart Topology`：适合先拿无贴图、面数相对可控的候选灰模；本次长椅结果为
  10,255 tris / 5,147 vertices，明显高于重复长椅预算，需要 Remesh 或重做。
- `Standard`：适合需要材质外观的候选，但更容易带入高成本 PBR 纹理。
- `Remesh triangle`：面向直接进入实时引擎的候选版本。
- `Remesh quad`：面向 Blender 中继续编辑的中间版本；最终仍须三角化审计。
- `Retexture`：只有项目确实需要独立纹理时才做，不应成为生成后的默认下一步。

## 纹理和自行车问题

原始 Meshy 自行车 GLB 的复核结果：

- `55,877,516 bytes`，约 `53.3 MiB`；
- `2,789` triangles、`4,463` vertices；
- 1 node、1 mesh、1 material；
- 4 张 `4096 × 4096` PNG PBR 纹理。

因此大文件的根因是四张 4K 纹理，不是几何。Meshy 官方说明导出保持生成时的纹理
分辨率且不额外压缩。对“漫步新华”重复街具，默认策略应是：

1. 保留原始 GLB 作为不可变候选；
2. 新建优化衍生物，不覆盖原件；
3. 优先改为 4–6 个项目共享平面材质；
4. 若轮廓必须依赖纹理，最多保留一张 `512–1024` Base Color，并以真实页面加载和
   画面收益决定是否保留；
5. 不默认携带 Normal、Metallic-Roughness 和 Emissive；
6. 再跑 GLB 审计和真实运行时验收。

## 每次网页运行必须记录

- 日期、操作者、Meshy 项目和 chat 引用；
- 开始/结束 credits 和消耗；
- 输入证据 SHA；
- 完整提示词；
- 实际可见的模型偏好和后处理参数；
- 2D 审核结论及其证据；
- 3D 的 triangles、vertices、纹理状态；
- Remesh 各版本目标和实际结果；
- 下载尺寸、原点、格式；
- 原始导出 SHA 和结构审计；
- 页面错误、客户端拦截、登录/验证码状态；
- 是否需要人工接管；
- 该次经验对本流程的修订。

所有记录先落入本轮动态证据快照；本页只吸收可复用的方法。

## 浏览器自动化经验

- 复用已登录 Chrome 会话，不把 Cookie 或密码写入项目后台。
- 先让 Agent 说明计划，再确认它是否真的停在 2D 审核节点。
- 发送指令后必须同时看到输入框清空和 `Stop`/处理中状态，只有文本已填入不代表任务
  已经提交。
- 生成前记录 credits；每个会消耗额度的动作后再次记录。
- 页面可见 UI 与 Agent 说法冲突时，截图并以 UI 为准。
- 不用 `Skip` 表达停止或新任务；Agent 可能把它解释为继续旧模型。
- 每个模型从聊天响应中的正确卡片重新进入 Viewer；关闭多余弹窗，并在下载前核对
  资产名和 tris/vertices，避免画布选择或旧弹窗导致错下模型。
- Agent 的文字总结、任务名和它声称的“源模型”不能单独作为真值。本批第二轮 Remesh
  曾把错误源卡片映射到当前任务；必须同时绑定聊天卡片缩略图、Viewer 实际形状和
  Viewer 的 triangles/vertices。
- 长批次下载要新开干净标签页，从资产画布逐件单选、双击进入 Viewer，再核对形状、
  面数、真实高度、原点和 GLB。被旧任务和延迟导航污染的标签页不继续复用。
- 生成图或模型被客户端拦截时，立即停止视觉判断，不要用 alt 文本冒充视觉验收。
- 当前 Chrome 点击导出资源仍会出现 `ERR_BLOCKED_BY_CLIENT`。已验证的下载回退是：
  时效 URL 只写入 `/tmp/test_*.txt`，用 `curl --config` 下载，随即删除临时配置；
  签名 URL 不进入仓库、聊天或外置快照。
- 下载后立即复制到不可变证据快照；签名 URL 不写入日志。
- 每个下载都要同时核对文件名、SHA、GLB 结构和实际 bounds。
- “下载成功”必须由本地文件 magic bytes 为 `glTF`、SHA 与 GLB 审计共同证明；
  浏览器点击成功或文件名出现不算完成。
- Chrome 页面截图接口本轮返回 JPEG bytes，即使调用方曾给出 `.png` 文件名。落盘前
  必须检查 magic bytes，再使用一致扩展名；不能只相信调用参数。
- 页面重载、弹窗、验证码或审美判断不能可靠自动化时进入人工接管。

## 2026-07-28 十件街景批次验证

在后续正式批次中，已通过真实页面完成 10 张 2D 概念图、逐图审核、10 个 Smart
Topology 灰模、两轮 Remesh、逐件 Viewer 审核、真实定尺导出和 GLB 审计。结束时
页面可见 credits 为 `726`；开始值没有可靠冻结，因此没有推算消耗量。

验证得到的类别差异：

| 几何类别 | Meshy Remesh 结果 | 推荐路线 |
| --- | --- | --- |
| 石桩、粗实体 | `288 tris` 仍保持识别轮廓 | 可直接按用途上限 Remesh |
| 花箱、桌椅组合 | `632 / 1,797 tris` 保持主体结构 | 可逐级 Remesh，随后校正第二尺度 |
| 条板长椅 | `1,072 tris` 合并条板；`2,094 tris` 保留结构 | 以识别缝为停止条件 |
| 树、路灯 | 低面和较高面版本都出现断裂/悬浮片 | 保留初始版，Blender 受控优化或重建 |
| 垃圾桶 | 两轮 Remesh 都出现箱体破洞 | 采用确定性低模重建 |
| 悬臂伞 | 伞面翻折、支架脱节 | 采用 Meshy 轮廓参考 + 确定性薄面重建 |
| 自行车 | `3,000 / 7,000` 目标均破坏轮组和车架 | 初始版仅作 Hero 源，Blender 受控优化 |
| 空调外机 | `1,118 tris` 可读 | 校正深度、设墙面锚点后再审计 |

所有本批导出均为零图片、零纹理，单个文件在约 `23 KiB–805 KiB`，没有复现旧自行车
的四张 `4096²` PBR 纹理组。完整动态记录位于
`test_artifacts/test_meshy_agent_batch_20260728/`。

### 从网页源候选到可用资产

10 个网页候选随后被编译为 10 个确定性 visible-low 资产：

- 可编辑 Blender master 以米为单位；
- 运行时 GLB 按 `1 scene unit = 2.7 m` 烘焙；
- 合计 `5,326 tris / 435,012 bytes`，10 件全部零图片、零纹理；
- 10 件均在真实 `/meshy-street-assets-qa` 中完成推荐距离 visible-low 验收；
- 空调外机在 `50 m` 为 `hidden` 且没有替代 Massing，验证共享隐藏合约；
- 真实 Chrome 视觉视口为 `1638×851`；结构浏览器为 `1280×577`、DPR `1`；
- 应用 console error 为 `0`；本机热缓存资源时长不作公网性能结论；
- 正式 topology、尺寸、材质和 QA 参数可由生成器重复产生，原始 Meshy GLB 不覆盖。

正式真值包为 `meshy-agent-street-assets`。同名资产的其他实验性或并行候选包不得
同时注册进生产地图；三联对照、运行时指标和 build record 必须指向同一个包。
最终过程证据位于不可变快照
`2026-07-28-meshy-agent-street-assets-final-2ca6310`：`1,010` 个文件、
`477,827,072` bytes，`SHA256SUMS` 全部通过。

关键分流不是“所有模型都 Remesh 到同一边数”，而是：

```text
粗实体、结构稳定
  → Meshy Remesh 对比
  → Blender 定尺与共享材质

薄片、细杆、闭合箱体、轮组
  → 保留 Meshy 初始版作为空间草图
  → 确定性低模重建
  → 固定机位 + GLB + WebGL 验收
```

### 按用法选择参数

QA 距离和 hidden 距离必须是 Asset Task Contract 的字段：

- 10 m 梧桐：推荐 `24 m`，hidden `50 m`；
- 3.36 m 路灯：推荐 `10 m`，hidden `28 m`；
- 2.57 m 悬臂伞：推荐 `10 m`，hidden `24 m`；
- 长椅、花箱、自行车、空调外机：推荐 `5 m`，hidden `18 m`；
- 石桩、垃圾桶：推荐 `4 m`，hidden `18 m`；
- 桌椅：推荐 `6 m`，hidden `18 m`；
- 空调外机还必须在 `2.2 m` 墙面安装高度审核。

本轮第一次把梧桐套进小街具 `4 m` 机位，只能看到树干。修订 QA 页面后才得到完整
树冠、人物尺度和地面接触画面。这证明尺寸不是下载页的单一高度字段；还会直接决定
审核相机、加载距离、碰撞和实例化策略。

## 官方资料

- 本轮面向产品团队的简要体验复盘：
  [Meshy Agent 用户使用情况简报](meshy-agent-user-experience-report-2026-07-28.md)
- [Getting Started with Meshy Agent](https://help.meshy.ai/en/articles/15297780-getting-started-with-meshy-agent-beta)
- [Meshy Workspace: Features and Navigation](https://help.meshy.ai/en/articles/12618267-meshy-workspace-features-and-navigation)
- [How to Use Meshy](https://help.meshy.ai/en/articles/9991793-how-to-use-meshy)
- [How to Make Meshy Models Game-Ready](https://help.meshy.ai/en/articles/15723950-how-to-make-meshy-models-game-ready)
- [Better Image-to-3D Results](https://help.meshy.ai/en/articles/15723519-how-to-get-better-image-to-3d-results-in-meshy)
- [How to Use Multi-view](https://help.meshy.ai/en/articles/12634481-how-to-use-multi-view)
- [Export Models with Colors and Textures](https://help.meshy.ai/en/articles/15724161-how-to-export-meshy-models-with-colors-and-textures)
- [Download a Quad Mesh Model](https://help.meshy.ai/en/articles/9992029-how-to-download-a-quad-mesh-model)
