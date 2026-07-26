# 内容研究到 LLM Wiki 工作流

## 固定位置

- 项目内知识源：`docs/knowledge-sources/`
- 项目内流程、Brief、Decision log 与小型索引：`docs/research/`
- 动态证据归档：`/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/`
- 独立 3D LLM Wiki：`/Volumes/plugin/Threejs-3d-research`
- Wiki 监控入口：
  `raw/sources/threejs-modeling-knowledge-base/wander-xinhua/`

动态证据包括建筑、物体、街具、人物与环境的参考图、截图、视频、音频、帧、
运行指标、证据 JSON、HAR 和对照图。它们只进入外置动态证据归档，不进入
`raw/sources/`、`wiki/` 或其他 LLM Wiki 目录。

从社媒下载的媒体允许完整保留在外置动态证据归档。只要它被用于建筑或其他
3D 资产证据，就不进入 `Threejs-3d-research`；社媒来源本身不是例外。

LLM Wiki 只学习抽象后的知识、方法和流程 Markdown。原始素材只读保留；分析
升级时新建派生文件，不覆盖旧数据。`wander-xinhua` 的 Three.js 和 Blender
知识只进入 `Threejs-3d-research`，不得写入 TowerOld；`xinhua` 只作为历史
检索别名。

## 1. 怎么把内容放进去

1. 原文、图片、视频先保存到外置动态证据归档，并记录 URL、作者、日期和内容 ID。
2. 将可核验结论写成英文文件名的 Markdown，放入 `docs/knowledge-sources/`。
3. 每条结论标注为“观察”“推断”或“未知”，附外置证据快照路径、SHA-256
   或公开 URL；不嵌入本地图片或视频。
4. 将 Markdown 复制到 Wiki 的
   `raw/sources/threejs-modeling-knowledge-base/wander-xinhua/` 对应专题目录；
   不要复制证据文件，也不要直接修改自动生成的 `wiki/`。
5. 触发 Source Rescan，等队列清空后再检索验证。

## 2. 怎么对视频做拉片

固定产物链：

```text
原片
→ 媒体信息
→ 均匀抽帧 + 场景变化帧 + 去重
→ frames-v2/manifest.json
→ PC NVIDIA Whisper 转写
→ A 阶段逐帧观察
→ B 阶段结合字幕综合
→ evidence.json
→ 外置动态证据快照
→ 知识/流程 Markdown
→ raw/sources Markdown
```

执行要求：

- 必须下载原片；不能拿标题、简介或封面代替视频。
- 自适应截帧必须同时覆盖时间轴和镜头切换，保留时间戳与帧号。
- A 阶段只写画面可见事实；B 阶段才结合字幕解释方法和因果。
- 转写只走 PC NVIDIA 服务 `127.0.0.1:19000`，不在 Mac 本地跑 Whisper。
- 涉及关键操作、参数或效果变化时引用具体帧或字幕区间。
- 证据不足就标记 `needs_review`，不得补写成事实。
- 原片、音频、帧、字幕和 `evidence.json` 均留在外置动态证据归档；Wiki
  Markdown 只引用快照 ID、相对路径、SHA 或公开 URL。

## 3. 怎么做调研

先写问题和质量合同，再搜索。优先官方、项目源文件和一手资料；保存关键页面、
真实参考图及来源元数据。建模调研必须选一张 canonical comparison view，并把：

- 照片直接可见事实；
- 由尺度、遮挡或历史资料得到的合理推断；
- 尚未确认的尺寸、背面和材质；

分开记录。研究结束应产出“可执行决策”，包括模型 Brief、至少三个身份构件、
预算、碰撞、运行时入口和验收方法，而不是只留链接。

## 4. 动态证据归档门

外置参考图、manifest、Observed / Inferred / Unknown 和模型 Brief 是建模前硬门槛；
外置快照与 SHA 全量通过是完成前硬门槛。Wiki 同步只约束新增的知识/流程
Markdown，不再作为单个建筑或资产证据的完成门。

执行 [`dynamic-evidence-storage-policy.md`](dynamic-evidence-storage-policy.md)：

1. 新建不可变快照，不覆盖旧快照；
2. 生成 `SHA256SUMS` 和机器可读 manifest；
3. 校验文件总数、字节数和全部 SHA；
4. 在 Brief 或 Decision log 中引用快照 ID 和证据相对路径；
5. U 盘不可用时可以继续只读研究，但不得声称证据已归档或资产已完成。

## 5. 怎么让 LLM Wiki 学习

只有知识或流程 Markdown 需要进入 Wiki：

1. 确认目标 Markdown 不含本地图片、视频、音频、证据 JSON 或逐资产证据表。
2. 确认目标 Markdown 已进入
   `raw/sources/threejs-modeling-knowledge-base/wander-xinhua/`。
3. 在 LLM Wiki 打开项目并执行 Source Rescan。
4. 等 `pending` 和 `processing` 都归零。
5. 用 MCP 搜索主题关键词，再读取命中文件核对内容。
6. 查询关系图，确认 Blender、GLB、Three.js、视频拉片等概念已建立联系。
7. 随机抽一条结论，借助快照 ID、相对路径和 SHA 反查外置证据；无法回溯即
   不算完成。

Wiki 完成标准是“只有知识/流程 Markdown + 队列归零 + 搜得到 + 读得对 +
可回溯”，动态证据归档完成标准则是“外置快照 + manifest + SHA 全量通过”。
