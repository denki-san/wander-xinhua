# Xingfuli East Map, Collision and Lineage Adjudication

## 裁决

`xingfuli-east` 现有 Hero、Identity、Massing 的 GLB/Blend 与 build record SHA
一致，可原样**保留**，但不重建、不覆盖。严格三档 lineage 为
`blocked-formal-lineage`: 三份记录未包含 Identity 的 Hero SHA 或 Massing 的
Identity SHA，且时间顺序是 Massing → Identity → Hero final，不能反向声称
`Hero -> Identity -> Massing` 派生已被证明。

整体位置、yaw 和番禺端退界可复算通过：OSM `way/400066625` 是两点 pedestrian
中心线，运行时 `rotationY=2.997763`、纵轴比例 `0.5382809787234043`、番禺端
退界 `4.1` scene units。它只能证明整体长轴，不能证明 east 单栋 footprint。

当前 map/road gate 明确阻塞：番禺路 tertiary asphalt 半宽为 `3.625` scene units，
`south-east-entry` 与 east lane base 净距均为 `-3.625`，入口矩阵墙为
`-3.116030`。因此不得靠任意平移、统一/非统一缩放或猜测 footprint 掩盖相交。

## 邻段、collision 与起点

- 中/东北侧结构净距为 `1.044265` scene units；扣除角色直径后仅
  `0.084265`，仍是结构分离而非可自由扩张的通道预算。
- 主巷净距 `7.128251`，扣角色直径后 `6.168251`；既有三条确定性 QA 路线与
  `west-to-east-main` 终点可通行。
- Fast Mode canonical local `[4,-7]` 不针对东段；east 专属
  `xingfuli-entrance-detail` local `[45,-5.5]` 被固定
  `east-entry-bollard-2` collision proxy 覆盖。建筑 proxy 本身不阻挡该点，故不能
  误诊为建筑碰撞或删改石桩来绕过。

## 证据边界

| 类别 | 结论 |
| --- | --- |
| observed | 三档 SHA、OSM 中心线、道路投影、现有 layout、固定碰撞体与确定性路线均可由仓内文件复算。 |
| inferred | `north-east-entry` / `south-east-entry` 与 east 分段的对应来自 layout 与照片顺序。 |
| unknown | east 单栋精确 footprint、施工图尺寸、背立面、屋顶机电、道路横断面及 2026 租户状态。 |

## 主窗口后续

1. 补 strict provenance；若没有可证明链路，保持 blocked，不能覆盖既有三档。
2. 在共享地图所有者窗口，以新增 footprint/道路边界证据修正南侧体量、入口墙与铺地关系。
3. 在共享 runtime 窗口把 east 起点移出石桩 player-radius 后，执行 east 同机位 Three.js 验收。

本专项不修改公共 app/scene、registry、18 栋 manifest、树木或全地图装饰。

```sh
node --test tests/test_xingfuli_east_tier_map_audit.test.mjs tests/test_xingfuli_east_map_collision_lineage_adjudication.test.mjs
```
