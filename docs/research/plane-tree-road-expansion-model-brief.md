# 梧桐道路扩展 Runtime Brief

## 任务边界

本轮不重建梧桐 GLB，只把既有 V4 梧桐家族部署到经批准的 7 条道路。模型身份、
材质、树冠、根颈与贴图政策沿用
`docs/research/plane-tree-canopy-v4-model-brief.md`。

## 证据分级

### 直接观察

- 官方资料将新华路、番禺路、安顺路、淮海西路、湖南路绑定到悬铃木道路；
- 官方资料确认华山路与泰安路为梧桐道路；
- 产品地图中存在本轮使用的显式道路几何；
- 外置快照已保存官方来源、地图几何核算、清单与 SHA-256。

### 合理推断

- 产品数量按双侧道路长度与低多边形可读性折算，用于视觉表达；
- 332 是产品目标，不是现实存活树木普查结果；
- 树位需要避让现有地图中的路口、建筑包络和已知快速定位／接近点；
- 这些 `start` 点不是现实入口普查，不能据此宣称覆盖全部车行口。

### 未知

- 每条道路当前真实存活树木的精确数量；
- 每个现实车行口、管线、公交站与补植位置；
- B 级道路在现实中的精确连续起止点。

## 运行时合同

- 道路：新华、番禺、安顺、淮海西、湖南、华山、泰安；
- 道路树位：332；幸福里共享树位：3；总实例：335；
- Identity：4 个 GLB，共享 Geometry 与 Material；
- Massing：3 个 GLB，共享 Geometry 与 Material；
- Explore standard：37 场景单位进入 Identity，42 退出，上限 80；
- Explore massing：75 进入，82 退出，上限 140；
- Overview：332 个 Massing；
- Weak：只激活附近 Massing；
- 阴影：只有近景 Identity 投射；Massing 不投射；
- 碰撞：树干半宽 0.48，运行时按玩家附近空间查询。

## 视角覆盖与验收入口

| 道路 | 入口 | 观察方向 |
| --- | --- | --- |
| 新华路 | `?start=plane-tree-xinhua` | 道路中点沿道路切线 |
| 番禺路 | `?start=plane-tree-panyu` | 道路中点沿道路切线 |
| 安顺路 | `?start=plane-tree-anshun` | 道路中点沿道路切线 |
| 淮海西路 | `?start=plane-tree-huaihai-west` | 道路中点沿道路切线 |
| 湖南路 | `?start=plane-tree-hunan` | 道路中点沿道路切线 |
| 华山路 | `?start=plane-tree-huashan` | 道路中点沿道路切线 |
| 泰安路 | `?start=plane-tree-taian` | 道路中点沿道路切线 |

Canonical 使用番禺路中点，侧向使用新华路中点，身份细节复用既有
`test_plane-tree-{a,b,c,d}_canonical_preview.png`。实际页面需验证地面接触、
方向、双侧节奏、路口净空、树干碰撞、遮挡、控制台和请求档位。

## 性能预算

- 7 个 GLB 合计 1019888 bytes，图片与贴图为 0；
- Identity 同时不超过 80，Massing 同时不超过 140；
- 332 个 Identity 不得同时常驻；
- 性能结论必须记录视口、构建模式、预热、采样、页面可见性与同条件基线。
