# Xingfuli West Fast Audit

## 结论

`xingfuli-west` 的 Hero、Identity、Massing 三档资产与 Recovery/Hold
`3044cd89f801250afcd477dfbcbc7da358bf4b11` 逐文件同源、同 Git blob，
现有合格阶段没有重建。OSM way `400066625` 的锚点、方向、长度和项目生产变换也可
从原始快照确定性复算。

本栋仍不能进入 Three.js 最终验收：当前 `north-west` 与 `south-west`
矩形建筑/碰撞边界分别压入幸福路运行时道路面约 `1.129` 和 `3.020`
个场景单位。三张新补的幸福路 67 号入口照片直接显示两侧建筑位于连续人行道后；
同一投影下，相关 OSM 建筑轮廓对当前道路面也保持正净距。因此地图门状态是
`blocked`，不能沿用历史整体通过结论。

## 已通过

- 三档 GLB SHA、Blend SHA、build record、生成器和历史 Brief 已锁定；
- 三档 GLB 均为单节点、单网格、无图片/贴图、隐式 identity 根变换；
- Identity 与 Hero 为同一确定性生成器的阶段超集关系，未伪造历史
  `derivedFromHero` 字段；
- OSM 长轴复算得到 `rotationY=2.997762992542127`、
  `horizontalScale=0.5818976062232621`；
- 生产 `xingfuli` 起点和 Fast QA canonical 起点均不在碰撞体内；
- 产品起点初始相机 spring arm 比例为 `1`，没有首帧遮挡；
- west 与 center 相邻楼座结构净距为 `0.640554` 场景单位，结构没有相交；
  GLB 包围盒的 `0.721297` 场景单位重叠来自段级铺地/跨段构件所有权，
  不是建筑碰撞。

## 地图阻塞

照片的直接可见事实、OSM 对照和当前生产数值见
`docs/research/xingfuli-west-reference-manifest.json` 与
`docs/research/xingfuli-west-fast-audit.json`。

单栋分支没有修改 `app/scene/xingfuli-layout.json`、公共 registry、
运行时或 Fast manifest。合理修复至少影响 Xingfuli 三段共同空间合同：

1. 按 OSM 临街多边形斜切西端建筑和碰撞；或
2. 对夸张道路宽度建立有证据、可测试的局部裁切。

在主窗口裁定前，禁止用整体移动、统一缩放或非统一缩放把负净距藏起来。

## 主窗口接力

- 将 `tests/test_xingfuli_west_fast_audit.test.mjs` 加入
  `xingfuli-west` 的 Fast Mode tests；
- 先解决幸福路道路门，再做本栋 Three.js 单页自动三档/fallback/性能/碰撞采集；
- Blender MCP 批量终审只读取当前三档，不触发重新生成；
- 最终完成前将幸福路入口观察同步到 `Threejs-3d-research` 并完成搜索、读取与回溯；
- 保留 Recovery/Hold、树木、装饰和全地图成果不动。
