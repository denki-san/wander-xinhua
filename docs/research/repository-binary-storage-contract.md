# Repository Binary Storage Contract

## 目的

本合同源自 GitHub Issue #1 第一阶段：先停止主仓库继续吸收动态证据和未锁定的
大型二进制；第二阶段继续记录独立 LFS 资产仓库试点。

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
- `config/asset-lock.schema.json`
- `config/asset-lock.json`

并检查：

1. 新增动态证据和可编辑源资产是否越界；
2. 新增 runtime GLB 是否有显式 path/SHA/bytes/reason 审批；
3. 新增普通二进制是否超过分类门槛；
4. 既有 grandfather 文件是否超过冻结体积；
5. 删除或缩小既有文件继续允许；
6. asset lock 实例是否完整通过 Draft 2020-12 schema，包括 Git LFS repository /
   revision 条件、枚举、附加字段、SHA、bytes 和 bounds。

`npm test` 在构建前运行该门禁，因此 CI 不需要挂载本地 U 盘。
`.github/workflows/repository-binary-policy.yml` 还会在 pull request 和 `main`
push 上以只读权限独立运行门禁；它会获取完整 Git 历史，并通过事件提供的 base/before
SHA 对照可信基线与 policy。当前分支只能提供精确 `approvedAdditions`，不能通过放宽
分类、阈值或审批类别绕过基分支规则。CI 还会直接运行门禁专项负例测试；它只通过
`npm ci --ignore-scripts` 安装 package lock 固定依赖，不构建、不部署，也不下载
LFS 内容。

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

当前 asset lock 只登记武康大楼单建筑试点，不宣称全部 18 栋建筑已经迁入统一合同。

## 第二阶段单建筑试点

武康大楼可编辑源已作为复制式试点进入私有独立 LFS 仓库：

- repository：`denki-san/wander-xinhua-assets`
- revision：`f1fd9c891f5576ce48006fb35e49d1bde5121bf7`
- path：`assets/buildings/wukang-mansion/source/wukang-mansion.blend`
- source SHA-256 / LFS OID：
  `517c17b203c2536609818ba8536a4e6ea529fdbdce8a47175c3e9bdf669aab94`
- bytes：`5,226,831`

主仓库通过 `config/asset-lock.json` 锁定上述来源。当前仍保留原
`research/source/wukang-mansion.blend`，生产
`public/models/building-evidence-lab/wukang-mansion.glb` 也保持原 path、SHA 和 bytes；
只有在干净克隆、revision 回滚和生成器复现全部通过后，才讨论删除主仓库旧源。

三种检出模式和限制见
[`repository-lightweight-clone-guide.md`](repository-lightweight-clone-guide.md)。

## 历史与删除边界

二进制基线同时登记当前 `main` 可达历史中大于等于 1 MiB 的 blob，但门禁不会：

- 运行 `git filter-repo`；
- 修改已有 commit SHA；
- 删除既有 CI fixture；
- 改变生产 runtime URL；
- 自动推送或部署。
