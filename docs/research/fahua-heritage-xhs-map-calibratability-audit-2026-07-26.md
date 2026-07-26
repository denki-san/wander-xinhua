# Fahua Heritage XHS Map Calibratability Audit

## 结论

两张已接入的小红书连续帧继续保留 `side/depth pass` 与
`street-context pass`，但不能把 `fahua-heritage` 的地图、背面或尺度门升级为
通过。本次没有访问浏览器、小红书或网络，也没有重做模型、MCP 或运行时。

## 518 控制

`195.49625s` 帧中，`518` 可清楚读出，但它位于构筑物右侧的青绿色相邻墙面。
保存的 requested-POI、建筑和道路 OSM 快照中，
`addr:housenumber=518` 均为 `0` 命中；同时没有名为“法华遗韵”的 OSM 主体、
入口或 footprint。

因此 `518` 只能作为“相邻墙面控制”。它没有街道名、坐标或 footprint 绑定，
不能仅凭门牌顺序、距离路口看起来接近，闭合到“法华镇路与香花桥路交会处”。

## 两帧能证明什么

### Observed

- 两帧相隔 `1.879731s`，视角由右前斜向移动到近正面；
- 右侧短瓦檐和侧板有真实纵深；
- 构筑物与 `518` 墙面相邻；
- 前方存在人字铺地、局部高差边缘和左侧窄通行界面。

### Inferred

- 铺地边缘可能分隔两种步行表面；
- 当前路口东南侧 placement 仍可作为视觉候选；
- 这些推断不等于道路、路缘或产权边界。

### Unknown

- 画面没有可读路名、交叉口几何、道路中心线或可辨认 asphalt；
- 没有 EXIF、焦距、相机位姿、已知尺寸物体或测量标尺；
- 背面、真实厚度、地面基准、右侧墙后和完整左/后 walkaround 未拍到。

所以两帧不能独立给出米制尺度、世界朝向、精确 footprint 或完整可绕行净空。

## 数值复算边界

保存的两条 OSM 道路共享点为
`[121.4207919, 31.2066514]`，按项目投影得到场景坐标
`[-70.1751154690, -0.5649822221]`。当前 runtime origin
`[-63.4, -2.6]` 与该点相距 `7.0741421370` 场景单位，即
`19.10018377m`。

当前 authored placement 对法华镇路和香花桥路的渲染 asphalt edge 静态净距
分别复算为 `0.8291129060` 与 `3.0612004933` 场景单位。这些数值只重现当前
候选 placement；照片到世界控制点数量仍为 `0`，所以重投影误差不可计算，
静态净距不能替代正式地图验收。

## 门状态

- Side/depth：`pass-retained-no-rerun`
- Street context：`pass-retained-no-rerun`
- 518 georeference：`blocked`
- Scale：`blocked`
- Orientation：`blocked`
- Footprint：`blocked`
- Rear：`blocked`
- Complete walkaround：`blocked`
- Formal map：`blocked`

外置动态证据归档真值现为
`/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/`。本建筑 Worktree 不包含新的
共享归档脚本，因此本审计在主窗口接入后仍需生成不可变外置快照；旧证据包与
仓库工作副本均保持只读，且不得进入 LLM Wiki。
