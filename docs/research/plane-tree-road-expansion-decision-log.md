# 梧桐道路扩展 Decision Log

- 日期：2026-07-30
- 决策状态：A+B 已批准并进入实施
- 用户授权依据：持续目标为“完成全部梧桐树并部署 VPS”，随后再次明确要求部署 VPS
- 研究真值：`docs/research/plane-tree-road-expansion-research.md`（主工作区用户文档）
- 动态证据快照：
  `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-29-plane-tree-road-coverage-audit-d5f88ed`

## 已批准产品数量

| 等级 | 道路 | 产品树位 |
| --- | --- | ---: |
| A | 新华路 | 98 |
| A | 番禺路 | 60 |
| A | 安顺路 | 48 |
| A | 淮海西路 | 32 |
| A | 湖南路 | 18 |
| B | 华山路 | 56 |
| B | 泰安路 | 20 |
|  | 道路合计 | 332 |
|  | 幸福里既有共享实例 | 3 |
|  | 线上资产实例总计 | 335 |

## 决策

1. 用户的“全部梧桐树”覆盖研究文档中的 A 与 B，不再把 83 棵回归当作完成。
2. 只在上述 7 条显式道路合同内生成树位，不使用名称模糊匹配；避让路口、
   建筑包络和已知定位接近点，但不把接近点伪称为现实入口普查。
3. 不替换普通乔木、银杏、庭院树、灌木和花盆植物。
4. 复用既有 4 个 Identity 与 3 个 Massing GLB，不生成逐树或逐道路模型副本。
5. 标准漫游使用空间索引、Identity 上限 80、中景 Massing 上限 140；弱网只使用
   Massing；overview 使用 332 棵 Massing。
6. 只让近景 Identity 投射实时阴影；碰撞仅查询玩家附近的小型树干 AABB。
7. 本轮只部署 VPS，不发布 Sites；部署产物必须来自同一通过验收的提交。

## 发布结果

- 运行时提交：`c85d8a9`；
- VPS：`https://xinhua.denkisan.me/`；
- 公网 index SHA-256：
  `ce7981fd0de0171bd052518cdb777e97b713988ea039d5ff87362c4ac57b8440`；
- 回滚目录：
  `/var/www/xinhua-messenger.backup-20260730-before-c85d8a9`；
- 7 条道路深链、全览 332 Massing、手机弱网 0 Identity、控制台与页面错误均通过；
- Sites 未部署。

## 回滚边界

- 回滚代码时移除道路数据合同、空间索引和新树位运行时即可。
- 7 个既有 GLB 二进制未修改，历史 V5 build record 保留为 83 棵基线。
- 主工作区未提交内容归用户所有，不以覆盖、清理或重置方式处理。
