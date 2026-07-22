# 内容研究到 LLM Wiki 工作流

## 固定位置

- 项目内知识源：`docs/knowledge-sources/`
- 原始调研证据：`docs/research/`
- U 盘 LLM Wiki：`/Volumes/plugin/TowerOld_XHS_Archive/xhs-creator-wiki`
- Wiki 监控入口：`raw/sources/derived/wander-xinhua/`

LLM Wiki 学的是 `raw/sources/` 下的 Markdown，不会直接学习视频、图片或
`evidence.json`。原始素材只读保留；分析升级时新建派生文件，不覆盖旧数据。

## 1. 怎么把内容放进去

1. 原文、图片、视频先保存为原始证据，并记录 URL、作者、日期和内容 ID。
2. 将可核验结论写成英文文件名的 Markdown，放入 `docs/knowledge-sources/`。
3. 每条结论标注为“观察”“推断”或“未知”，附原始证据路径或 URL。
4. 将 Markdown 复制到 Wiki 的
   `raw/sources/derived/wander-xinhua/`；不要直接修改自动生成的 `wiki/`。
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
→ raw/sources Markdown
```

执行要求：

- 必须下载原片；不能拿标题、简介或封面代替视频。
- 自适应截帧必须同时覆盖时间轴和镜头切换，保留时间戳与帧号。
- A 阶段只写画面可见事实；B 阶段才结合字幕解释方法和因果。
- 转写只走 PC NVIDIA 服务 `127.0.0.1:19000`，不在 Mac 本地跑 Whisper。
- 涉及关键操作、参数或效果变化时引用具体帧或字幕区间。
- 证据不足就标记 `needs_review`，不得补写成事实。

## 3. 怎么做调研

先写问题和质量合同，再搜索。优先官方、项目源文件和一手资料；保存关键页面、
真实参考图及来源元数据。建模调研必须选一张 canonical comparison view，并把：

- 照片直接可见事实；
- 由尺度、遮挡或历史资料得到的合理推断；
- 尚未确认的尺寸、背面和材质；

分开记录。研究结束应产出“可执行决策”，包括模型 Brief、至少三个身份构件、
预算、碰撞、运行时入口和验收方法，而不是只留链接。

## 4. 怎么让 LLM Wiki 学习

本地参考图、manifest、Observed / Inferred / Unknown 和模型 Brief 是建模前硬门槛；外置 LLM Wiki 同步是完成前硬门槛。

U 盘或桌面服务暂时不可用时，可以在本地证据完整后继续灰模，但必须记录阻塞，并在最终完成前补齐入库与回查，不能声称知识库已经学习。

1. 确认目标 Markdown 已进入 `raw/sources/derived/wander-xinhua/`。
2. 在 LLM Wiki 打开项目并执行 Source Rescan。
3. 等 `pending` 和 `processing` 都归零。
4. 用 MCP 搜索主题关键词，再读取命中文件核对内容。
5. 查询关系图，确认 Blender、GLB、Three.js、视频拉片等概念已建立联系。
6. 随机抽一条结论，反查到帧、字幕、原文或仓库文件；无法回溯即不算完成。

完成标准是“源文件已复制 + 队列归零 + 搜得到 + 读得对 + 可回溯”，不是只看到
文件出现在 U 盘。
