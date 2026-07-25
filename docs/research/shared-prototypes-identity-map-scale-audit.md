# Shared Prototype Identity Map Scale Audit

## 结论

共享悬铃木与 7 个街具的 Identity isolated gallery 已通过，但当前不能按原
transform 直接替换地图中的旧 Hero / 程序化原型。全量 `72` 个相关实例的
map scale、yaw、collision / passage 与 formal Identity 均保持 `0`。

这不是 Identity GLB 加载问题，而是新旧资产的 authored envelope 不一致：

- 31 株悬铃木使用 3 个旧 Hero 变体；相同实例 scale 下，旧 Hero 高度是新
  Identity 的 `1.371–1.454` 倍，树冠水平范围也明显更大；
- 17 盏短臂路灯的旧程序化高度约 `3.36` scene units，新 Identity 为
  `1.24`，约相差 `2.71` 倍；
- 伞、桌椅、座椅、花箱、垃圾箱与石墩也没有共用一套 authored envelope；
- 幸福里还叠加 X / Y / Z 非均匀 site transform，本地视图不能直接证明世界
  比例和通行净空。

完整机器可读结果位于
`docs/research/shared-prototypes-identity-map-scale-audit.json`。

## 覆盖范围

| 原型 | 实例数 | 地点 |
| --- | ---: | --- |
| 新华路悬铃木 | 31 | 新华路 28、幸福里 3 |
| 短臂路灯 | 17 | 新华路 11、幸福里 6 |
| 悬臂伞 | 2 | 幸福里 |
| 户外桌椅 | 3 | 幸福里 |
| 条板座椅 | 2 | 幸福里 |
| 矩形花箱 | 8 | 新华路 4、幸福里 4 |
| 上海双分类垃圾箱 | 4 | 新华路 |
| 不规则石墩 | 5 | 幸福里 |

## 已确认、推断与未知

已确认：

- 72 个实例都有稳定 ID、prototype、position 和 coordinate space；
- Identity / Massing 的 GLB bounds 可由当前二进制复算；
- 旧树木 Hero GLB 与旧程序化街具的当前 envelope 可从二进制或源码复算；
- 新旧 envelope 在同一 transform 下不一致。

合理推断：

- 旧程序化街具主要沿用历史“直接以米数写 scene unit”的视觉实现，而新管线
  按 `1 scene unit = 2.7m` 生成；
- 直接替换会让地图屏幕占比、碰撞和通行关系发生变化。

未知：

- 逐实例现场测量尺寸；
- 2026 年后的替换、增删和修剪情况；
- 全部入口方向的现场证据；
- 应当以旧视觉占比还是新米制换算作为最终产品尺度。

## 决策

本轮不改 production transform，也不通过在每个 tier 上添加不同 scale 来掩盖
差异。下一步必须先：

1. 在真实地图 QA 页面按现有 72 个 transform 渲染新 Identity；
2. 以固定 site/group 和代表性近景机位取证；
3. 对每个 prototype 选定唯一 common authored envelope；
4. 只迁移一次旧 fallback / Hero 或 instance transform；
5. 用共同 envelope 重建 collision proxy，并执行确定性绕行与通行测试。

