# Wander Xinhua 动态证据存储规范

## 目的

建筑、物体、街具、人物和环境相关证据会持续变化，而且图片、视频与运行时
产物占用空间较大。它们统一存放在外置硬盘：

`/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/`

该目录是动态证据的归档真值，不是 LLM Wiki，也不作为知识库扫描源。

## 存什么

- 公开或用户提供的参考图、页面截图和下载原片；
- Blender canonical、侧向、入口、阶段预览和三联对照；
- Three.js 运行时截图、视频、GIF、HAR、性能指标和控制台证据；
- 建筑、物体、街具、人物、环境的证据 JSON、manifest、build record；
- 视频帧、音频、转写、联系表和其他会随研究更新的派生证据。

确定性的生成器、正式 `.blend`、正式 `.glb`、运行时代码不按本规范迁移；它们
仍属于版本控制或正式资产发布链。

从社媒下载的图片、视频、音频和评论快照可以完整归档到这里。只要它们被用于
建筑或其他 3D 资产证据，就不得进入 `Threejs-3d-research`；来源于社媒不改变
这一边界。

## 不存进 Wiki

`Threejs-3d-research` 不得保存或扫描：

- 图片、视频、音频、GIF、HAR；
- 运行指标、逐资产 evidence JSON、原始 manifest；
- 建筑、物体、街具、人物的逐项截图或证据包；
- 为方便检索而复制的动态证据副本。

3D Wiki 只保存抽象后的知识、方法和流程 Markdown。Markdown 可以引用公开 URL，
或引用外置证据的快照 ID、相对路径和 SHA-256，但不得嵌入本地动态文件。

## 目录合同

```text
Wander_Xinhua_Dynamic_Evidence/
├── README.md
├── snapshots/
│   └── <date>-<git-sha>/
│       ├── repository/
│       ├── external-imports/
│       ├── manifest.json
│       └── SHA256SUMS
└── legacy-imports/
```

- `snapshots/` 中每个目录不可变；更新数据必须创建新快照。
- `repository/` 保留原仓库相对路径，避免证据引用失去上下文。
- `external-imports/` 保存从旧知识库或 Wiki 移出的原始动态证据。
- `legacy-imports/` 保存已有历史快照，禁止覆盖。

## 新增与验收

1. 运行 `scripts/archive_dynamic_evidence.sh` 创建新快照。
2. 确认脚本输出的文件数、总字节数与 `SHA256SUMS`。
3. 在快照内执行 `shasum -a 256 -c SHA256SUMS`，必须全部通过。
4. 在 Brief、Decision log 或小型索引中记录快照 ID、相对路径和 SHA。
5. 再将抽象后的知识或流程 Markdown 放入 Wiki，并确认其中没有动态文件。

外置硬盘未挂载、空间不足、快照目录已存在或校验失败时，归档必须停止；不得
删除旧证据，也不得声称本轮完成。
