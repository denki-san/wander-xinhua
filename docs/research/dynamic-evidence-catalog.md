# Wander Xinhua 动态证据目录

## 唯一存储根

`/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/`

它不是 Wiki，也不属于 `Threejs-3d-research/raw/sources/`。

## 当前快照

### 仓库瘦身迁移快照

- 快照 ID：`2026-07-27-storage-migration-52db477`
- 路径：`snapshots/2026-07-27-storage-migration-52db477/`
- 来源提交：`52db477`
- 内容文件：980
- 内容字节：451,461,120
- 校验：`SHA256SUMS` 全量通过
- Wiki 资格：`false`

本快照是 2026-07-27 仓库动态证据迁移的归档真值。迁移分支从 Git 工作树中
移除 402 个不参与运行时、构建或自动测试的证据副本，共 203,417,368 字节。
原仓库路径统一在快照的 `repository/` 下解析，例如历史记录中的
`test_artifacts/example.png` 对应：

`repository/test_artifacts/example.png`

以下内容没有迁移：

- `public/` 下的正式运行时模型、图片和其他网页资源；
- 正式 `.blend`、正式 `.glb`、确定性生成器和构建记录；
- 366 个被当前 438 项自动测试真实读取的 CI fixture；
- Markdown、Brief、Decision log、manifest 和小型派生数据。

现有 Brief、manifest 和 build record 可以继续保存历史仓库相对路径。文件不在
工作树时，通过本节快照 ID、`repository/` 前缀和 `SHA256SUMS` 回查。

### 仓库动态证据

- 快照 ID：`2026-07-26-ad37273`
- 路径：`snapshots/2026-07-26-ad37273/`
- 内容文件：979
- 内容字节：450,568,192
- 校验：`SHA256SUMS` 全量通过

该快照是迁移前的上一版完整归档，按原仓库路径保存，主要分类如下：

| 分类 | 快照内路径 |
| --- | --- |
| 建筑参考与运行时证据 | `repository/docs/research/assets/poi-references/`、`requested-poi-references/`、`landmark-comparison/`、`repository/test_artifacts/` |
| 物体与街具 | `repository/docs/research/assets/nonbuilding-evidence-pilot/`、`repository/docs/research/build-records/nonbuilding/`、`repository/test_artifacts/nonbuilding/` |
| 人物 | `repository/docs/research/assets/character-references/`、`repository/assets/models/source/character/*preview*`、`repository/test_artifacts/test_rain*` |
| 环境与共享证据 | `repository/research/references/`、`repository/research/previews/`、`repository/docs/research/assets/style-references/`、`repository/docs/research/data/` |

### 从旧知识库迁出的动态证据

- 路径：`legacy-imports/knowledge-base/wander-xinhua/`
- 校验条目：1,669
- 校验文件：`legacy-imports/SHA256SUMS`
- 包含历史建筑证据快照、社媒街景/街具原图，以及上海影城渐进 LOD
  截图、视频、指标与 manifest。

旧知识库中的对应位置只保留 symlink，物理数据只存在于本目录。

## Wiki 边界验收

- `Threejs-3d-research/raw/sources/threejs-modeling-knowledge-base/wander-xinhua/`
  动态文件数量：0；
- 本地图片或视频 Markdown 嵌入数量：0；
- Wiki `media/` 文件数量：0；
- `wiki/log.md` 仅保留历史删除审计记录，不含原始证据内容。
