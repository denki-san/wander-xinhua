# Repository Lightweight Clone Guide

## 目的

本说明对应 GitHub Issue #1 第二阶段，定义三种彼此独立的检出模式：

1. 只阅读或修改代码的 `code-only`；
2. 可以构建和预览现有应用的 `runtime-ready`；
3. 按需取得可编辑 Blender 源的 `asset-authoring`。

轻量检出不是历史清理。本阶段不运行 `git filter-repo`，不改变已有 commit SHA，
也不删除主仓库当前仍保留的 `.blend` 或生产 GLB。

## 存储边界

| 内容 | 真值位置 | 轻量克隆默认行为 |
| --- | --- | --- |
| 代码、生成器、配置、测试、asset lock | `denki-san/wander-xinhua` | 检出 |
| 生产 GLB 与运行时媒体 | `denki-san/wander-xinhua`，后续可试点 CDN | `code-only` 排除，`runtime-ready` 检出 |
| 可编辑 `.blend` 与大型源资产 | 私有 `denki-san/wander-xinhua-assets` | 主仓库克隆不下载 |
| 参考图、截图、视频、HAR、运行指标 | `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/` | 永不由 Git/LFS 克隆 |

## 前置工具

```bash
git --version
git lfs version
```

只有 `asset-authoring` 需要 Git LFS。`wander-xinhua` 主仓库当前没有 LFS pointer，
所以对主仓库设置 `GIT_LFS_SKIP_SMUDGE=1` 不会减少既有 Git blob 的传输。

## 模式 A：code-only

适用于代码审阅、文档、UI 和不依赖真实 runtime 资产的修改。

```bash
git clone \
  --filter=blob:none \
  --no-checkout \
  git@github.com:denki-san/wander-xinhua.git \
  wander-xinhua-code

cd wander-xinhua-code

git sparse-checkout init --no-cone
git sparse-checkout set --no-cone \
  "/*" \
  "!/assets/models/source/" \
  "!/docs/research/assets/" \
  "!/docs/research/data/" \
  "!/public/models/" \
  "!/public/images/" \
  "!/public/textures/" \
  "!/research/previews/" \
  "!/research/references/" \
  "!/research/source/*" \
  "/research/source/*.py" \
  "!/test_artifacts/"

git checkout main
```

该模式故意缺少 production runtime 和部分历史 fixture，不能据此宣称
`npm test`、Three.js runtime 或发布验收通过。

## 模式 B：runtime-ready

适用于本地静态构建和现有运行时预览，但不包含可编辑源与动态证据工作副本。

```bash
git clone \
  --filter=blob:none \
  --no-checkout \
  git@github.com:denki-san/wander-xinhua.git \
  wander-xinhua-runtime

cd wander-xinhua-runtime

git sparse-checkout init --no-cone
git sparse-checkout set --no-cone \
  "/*" \
  "!/assets/models/source/" \
  "!/docs/research/assets/" \
  "!/research/previews/" \
  "!/research/references/" \
  "!/research/source/*" \
  "/research/source/*.py" \
  "!/test_artifacts/"

git checkout main
npm ci
npm run build
```

完整 `npm test` 仍应在全量、干净检出中运行，因为现有测试可能读取 grandfathered
fixture。部署验收也必须继续使用全量、SHA-pinned 的发布工作树。

## 模式 C：asset-authoring

先只克隆 LFS pointer 和文本元数据：

```bash
GIT_LFS_SKIP_SMUDGE=1 git clone \
  git@github.com:denki-san/wander-xinhua-assets.git \
  wander-xinhua-assets

cd wander-xinhua-assets
GIT_LFS_SKIP_SMUDGE=1 git checkout --detach \
  877d8888bc13e21b46193318f18a7c439938e764
git lfs ls-files
```

checkout 必须使用 asset lock 中的 revision，不能用会继续前进的资产仓库 `main`
代替。第二次设置 `GIT_LFS_SKIP_SMUDGE=1` 是为了确保 detached checkout 仍只取得
pointer，不在选择资产前触发自动下载。

只下载武康大楼可编辑源：

```bash
git lfs pull \
  --include="assets/buildings/wukang-mansion/source/wukang-mansion.blend" \
  --exclude=""

shasum -a 256 -c assets/buildings/wukang-mansion/SHA256SUMS
git lfs fsck
```

锁定合同：

- asset repository revision：
  `877d8888bc13e21b46193318f18a7c439938e764`
- LFS OID / source SHA-256：
  `517c17b203c2536609818ba8536a4e6ea529fdbdce8a47175c3e9bdf669aab94`
- source bytes：`5,226,831`

## 本轮实测

在 2026-07-29 的干净临时目录中：

- LFS `skip-smudge` 克隆得到 132-byte pointer，`.git/lfs` 为 `0 KiB`；
- 指定路径 `git lfs pull` 后得到 `5,226,831`-byte Blend；
- `shasum -a 256 -c` 与 `git lfs fsck` 均通过；
- Blender `5.2.0 LTS` headless 只读打开成功，读取 525 个 mesh，退出后源 SHA 不变且
  没有生成 `.blend1`；
- code-only sparse checkout 保留 627 个工作树文件，抽样确认应用代码和
  `research/source/create_wukang_mansion.py` 存在，而武康大楼 `.blend`、生产 GLB
  和参考图均未检出。
- runtime-ready sparse checkout 确认生成器和生产 GLB 存在、`.blend` 未检出，
  随后 `npm ci`、静态构建和 Sites 构建全部通过。
- GitHub 干净 full clone 的二进制门禁和构建通过；全量测试为 `442 / 451`。
  另有 9 项既有历史 fixture 回查无法复现：8 项对应 commit 存在但目标 path 不存在，
  1 项引用的 revision 不可用。本试点没有修改这些测试，修复前不得宣称干净克隆
  全量回归通过。

两种 sparse checkout 都使用本地 shared clone 验证 path 形态，未测量网络传输量；
不能把 `41,992 KiB` 的本地 checkout 占用当作 GitHub fresh clone 体积。

## 限制与后续迁移门槛

- Sparse checkout 只改变工作树形态；单独使用时不会缩小既有 Git 历史。
- `--filter=blob:none` 依赖远端 partial clone 支持，实际下载量必须在干净环境记录，
  不能根据仓库目录大小推算。
- 只要旧 `.blend` 仍在主仓库当前 tree，普通 full clone 仍会检出它。
- 9 项历史回查测试仍使用远端干净克隆不可复现的 commit-path / revision 输入；需先
  校正引用或迁移为受控 fixture，才能把 full clone 全量测试作为后续删除旧源的门槛证据。
- 后续若从主仓库当前 tree 移除旧源，只能新增普通提交；本 Issue 禁止重写历史或强推。
- 删除主仓库旧源之前，必须证明 LFS 干净克隆、指定 revision 回滚、生成器复现和
  旧提交回查全部通过，并再次征得用户确认。
- CDN/R2 试点是下一阶段；本轮生产
  `public/models/building-evidence-lab/wukang-mansion.glb` 的路径、SHA、缓存和发布包
  均保持不变。
