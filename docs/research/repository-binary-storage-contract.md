# Repository Binary Storage Contract

## 目的

本合同对应 GitHub Issue #1 的第一阶段：先停止主仓库继续吸收动态证据和未锁定的
大型二进制，再开展独立 LFS 资产仓库与 R2/CDN 试点。

本阶段不删除既有文件、不迁移生产 runtime、不重写 Git 历史。

## 存储边界

| 分类 | 主仓库规则 | 长期位置 |
| --- | --- | --- |
| `dynamic-evidence` | 禁止新增；既有 CI fixture 暂时 grandfather | `Wander_Xinhua_Dynamic_Evidence` 不可变快照 |
| `editable-source` | 禁止新增 Blend/大型源资产；既有源暂留 | 独立 Git LFS 资产仓库 |
| `runtime-model` | 新增必须锁定 path、SHA、bytes 与原因 | 首屏关键资产随应用；非关键资产可试点 CDN |
| `runtime-media` | 小型文件可进入；超过体积门必须显式审批 | 应用或不可变 CDN |
| `repository-binary` | 只允许小型、确有审查或运行价值的文件 | 视用途进入外置证据或资产仓库 |

## 自动门禁

`npm run check:binary-policy` 会读取：

- `config/repository-binary-policy.json`
- `config/repository-binary-baseline.json`

并检查：

1. 新增动态证据和可编辑源资产是否越界；
2. 新增 runtime GLB 是否有显式 path/SHA/bytes/reason 审批；
3. 新增普通二进制是否超过分类门槛；
4. 既有 grandfather 文件是否超过冻结体积；
5. 删除或缩小既有文件继续允许。

`npm test` 在构建前运行该门禁，因此 CI 不需要挂载本地 U 盘。
`.github/workflows/repository-binary-policy.yml` 还会在 pull request 和 `main`
push 上以只读权限独立运行门禁；它会获取完整 Git 历史，并通过事件提供的 base/before
SHA 对照可信基线与 policy。当前分支只能提供精确 `approvedAdditions`，不能通过放宽
分类、阈值或审批类别绕过基分支规则。CI 还会直接运行门禁专项负例测试；它不安装
依赖、不构建、不部署。

## 更新原则

基线不是日常自动更新文件。只有明确审查一次合法二进制变化后，才能运行：

```bash
npm run baseline:binary
```

更新必须同时说明：

- 为什么不能放入外置动态证据；
- 为什么不能放入独立 LFS 资产仓库；
- 是否属于首个可玩关键路径；
- 新旧 bytes、SHA 和回滚路径。

基线中的路径、bytes、分类和生命周期必须与 `sourceGitSha` 的 Git tree 精确一致。
生成器拒绝用尚未提交的受控文件建立基线。若当前变化尚未通过旧基线，
`baseline:binary` 也会拒绝写入。

合法的 runtime 新增或既有文件增长，应先形成“二进制 + `approvedAdditions`”提交，
再从该提交生成基线；PR CI 仍按基分支旧基线复核精确审批。新增动态证据与可编辑源
资产即使登记审批也不能通过更新命令绕过，必须先归档到外置不可变快照或后续独立
LFS 资产仓库。

## Asset Lock

`config/asset-lock.schema.json` 定义后续 asset lock 的最小合同：

- source storage/path/SHA/bytes；
- Hero、Identity、Massing 的 delivery/location/SHA/bytes/cacheVersion；
- triangles、bounds 与 fallback；
- generator、build record 和 evidence snapshot lineage。

本阶段只冻结 schema，不宣称全部 18 栋建筑已经迁入统一 asset lock。

## 历史与删除边界

二进制基线同时登记当前 `main` 可达历史中大于等于 1 MiB 的 blob，但门禁不会：

- 运行 `git filter-repo`；
- 修改已有 commit SHA；
- 删除既有 CI fixture；
- 改变生产 runtime URL；
- 自动推送或部署。
