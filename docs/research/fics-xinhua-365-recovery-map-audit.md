# FICS Xinhua 365 Recovery and Map Audit

## 结论

Recovery 的 clean-v2 Massing 可以按原样选择性续接，不能据此通过正式地图门。
它的五个 footprint 与原始 OSM 顶点回投影最大误差约
`0.00000546` 场景单位（约 `0.000015 m`），因此本轮不移动、不旋转、不缩放，
也不重做已经通过的结构与旧运行时视觉阶段。

正式 map acceptance 仍有两个独立 blocker：

1. 五个 OSM way 都只有 `building=yes`，没有名称、门牌或园区边界，无法证明它们
   恰好构成 FICS 新华365的完整建筑群；
2. 当前地图的园区 service way `577252268` 距 way `864493177` 轮廓只有
   `0.125454` 场景单位。按实际渲染的 service road 宽度计算，建筑进入可见路面
   `1.124546` 场景单位（约 `3.036 m`）。

第二个 blocker 不能通过任意挪移资产解决，因为建筑 footprint 与道路中心线都来自
同一坐标系。需要先裁决 service way 的真实通行语义或地图制图偏差。

## Recovery 选择

- GLB：
  `public/models/tiers/xinhua-road/massing-v2/fics-xinhua-365-massing.glb`
  (`e36f29a3f14e92ac833a324247c36c21d218003f17f666d1d0b5fc9f861fe8ad`,
  8,564 bytes)；
- Blend：
  `assets/models/source/tiers/xinhua-road/massing-v2/fics-xinhua-365-massing.blend`
  (`b6ac48bac72d534ed131aebefe9f3608d54ba049b9fa0e1d5bc29720cbb95749`)；
- build record 及四张本栋 `test_` 截图一并保留；
- 共享批处理生成器不摘入建筑分支，仍由 Recovery commit
  `3044cd89f801250afcd477dfbcbc7da358bf4b11` 完整保存。它支持
  `--asset fics-xinhua-365`，因此确定性来源没有丢失。

GLB audit：5 nodes、5 meshes、68 triangles、1 material、0 images，
bounds 为 `[-21.485395, 0, -4.772031]` 到
`[15.707629, 4.320988, 12.356972]`，结构门通过。当前 Blender 5.2
在受限环境打开 Blend 时触发已知的 Metal/Arch 启动崩溃
（见 `ERR-20260725-031` / `ERR-20260716-026`），本轮没有把该失败包装成
Blend 交互验收，也没有写入源文件。

## 证据裁决

### Observed

- 仓库内三张建成实景分别可见屋顶 `FICS 365` 标识、开放庭院和历史洋房；
- OSM 快照直接记录五个无标签建筑 footprint；
- Recovery 的 position `[-76.1, 75.2]`、yaw `-0.38`、scale `0.9`
  可精确重建这五个 footprint；
- 当前地图直接记录新华路与园区 service road 的中心线。

### Inferred

- 五个 way 均属于 FICS 园区；
- 这五栋足以代表完整园区；
- 统一 10.5 m 高度仅为预览 fallback。

### Unknown

- 园区精确边界、相邻 OSM 建筑归属及五栋与照片的一一对应；
- 各栋真实高度、屋顶、入口方向；
- service road 与 way `864493177` 是真实穿行关系还是数据偏差。

因此 evidence gate 为 `blocked-member-binding`；Hero 保留为 legacy baseline，
Identity 不得派生。

## 地图复核

- 投影：center WGS84 `[121.4227819, 31.2066376]`，
  `1 scene unit = 2.7 m`；
- 候选 pivot WGS84 约 `[121.4206238843, 31.2048007988]`；
- 新华路 asphalt 净距 `10.490160` 场景单位（约 `28.323 m`）；
- 含路缘、人行道、绿化带的可见外缘净距 `9.015160` 场景单位
  （约 `24.341 m`）；
- 五栋内部最小几何净距 `1.359442` 场景单位（约 `3.670 m`）；
- 最近其他 OSM building 为 way `864485662`，净距 `1.539354`
  场景单位（约 `4.156 m`）；
- 最近现有 runtime landmark 为 `xinhua-pocket-park`，净距 `8.248087`
  场景单位（约 `22.270 m`），无地标重叠；
- GLB 最低点 `Y=0`，ground datum 记录通过。

可重复计算入口：

```bash
node scripts/test_fics_xinhua_365_map_calibration.mjs
```

本栋新增专项测试为 3/3 通过，Massing GLB audit 通过。统一 Fast runner
的范围守卫与专项套件为 27/28；唯一失败是集成基线中的 House315 共享断言仍要求
`scale=0.9`，但公共地图已经使用 `0.754254`。该失败与 FICS 文件无关，本栋分支
没有越权修改公共或其他建筑测试。

## 门状态与主窗口待办

- Recovery Massing / GLB audit / 旧 runtime visual：`pass-retained`；
- evidence / formal map acceptance：`blocked`；
- MCP1：由主窗口批量终审，不能替代上述地图 blocker；
- Hero：legacy baseline，等待 Massing map gate；
- Identity、MCP2、MCP3、Three-tier runtime：未授权。

主窗口只应选择性摘取本提交，不应覆盖共享 registry/runtime/Fast manifest。
若后续取得能绑定园区成员的官方总平面或可定位航拍，再复核 service road 冲突；
在此之前不得把 FICS 新华365接入正式地图运行时。
