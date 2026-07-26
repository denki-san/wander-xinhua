# Xingfuli Center Lineage and Map Audit

## 结论

幸福里中区现有 Hero、Identity、Massing 与 Recovery 完全一致，本轮不重建、不移动、
不改比例。Hero 与 Massing 可保留通过；Identity 二进制保留，但正式 lineage
门 blocked：Identity 的 build record 没有 `derivedFrom` 或 final Hero SHA，且
生成时间 `2026-07-23T00:26:00+08:00` 早于 final Hero 的
`2026-07-23T01:40:30+08:00`。按三档工作流，它只能视为 provisional，不能因为
旧记录写着 runtime pass 就直接宣称正式 Identity pass。

中心段地图位置通过；当前 `xingfuli-entrance-detail` 出生点距离入口石桩碰撞仅
`0.179297` 场景单位，小于角色半径 `0.48`，因此 start/camera gate blocked。
已有主通道 QA 路线端点 local `[46, -5.05]` 的几何净距为 `0.658499`，可以交给
主窗口接线并做实际页面复核。

## 三档指纹

| Tier | GLB SHA-256 | Blend SHA-256 | Bytes | Triangles | Materials | Bounds |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Hero | `860249a2656cf7af9aa2ef746f05cc7f39506ec1e8751df236e3c1e3f0f594b9` | `b8e8aa2b4776244b23335b9148a94e1be5c8b7683f835960f4483547c7587eea` | 554080 | 7788 | 9 | `[-23.34,0.09,-7.74]`–`[25.625,9.06,22.09]` |
| Identity | `19800200464e0e9423e5a355abde7216478ba73c10b7539b0bafe5674fc4dc21` | `b7e4114e49bf87af3d8679424f44a2a707d0d512f07a6ad04ad3038ab5f9e112` | 453004 | 6384 | 6 | `[-23.34,0.09,-7.74]`–`[22,9.06,22.09]` |
| Massing | `d6eeae59d35c3577817cdf35febb06493b53cbb661774e81a6e55d7a6dce26d3` | `96deb8d73d2c87f456c567dd92cb3f568effb27f84eb625daeb8516a0ff3d872` | 310204 | 4344 | 6 | `[-23.34,0.09,-7.74]`–`[22,9.06,22.09]` |

三档均为 1 node / 1 mesh、0 images / 0 textures、无 node transform，
GLB audit 通过；build record SHA 与当前二进制一致。生成器
`scripts/create_xingfuli_models.py` SHA 为
`f479f096b2f0092329c77a49e61fb5cfab208d4f05a9ca5278d46115a59b7d75`，
当前与 Recovery 相同，且支持 `--segment=center`。

## 证据裁决

### Observed

- OSM way `400066625` 直接证明幸福里步行街中心线、位置和约 `147.686 m` 长轴；
- 本地 canonical、侧向、入口和场地照片覆盖连续立面、水景、番禺路入口及铺地；
- 中心段结构化成员为 `north-inner-west`、`north-inner-east`、
  `south-inner-west`；
- 三档地面基准均为 `Y=0.09`。

### Inferred

- 三个中心段成员与照片中具体立面的一一对应；
- 本地 `+X` 对应番禺路入口；
- 不可见背立面、屋顶设备和内部连接使用保守简化。

### Unknown

- 单栋施工图级 footprint、层高和开间；
- 2026 年店铺、墙绘与外摆变化；
- 西/中段连续立面之间的小缝是否应作为侧向通道。

因此 package 位置证据通过，内部成员精度保持 medium，不升级成测绘事实。

## 地图与碰撞

- 原始 midpoint 与运行时记录误差 `0.002734` 场景单位（约 `0.0074 m`）；
- rotation 误差 `7.53e-9 rad`，横向比例误差 `3.94e-7`；
- 幸福路端与原始 OSM 端点误差约 `0.0074 m`；
- 番禺路端退界 `4.101455` 场景单位（约 `11.074 m`）；
- 中心段最近机动车路面为幸福路，建筑 asphalt 净距 `7.488959`
  场景单位（约 `20.220 m`）；
- 番禺路 asphalt 净距 `11.467937` 场景单位（约 `30.963 m`）；
- 中心主巷南北实体净距 `7.128251` 场景单位（约 `19.246 m`），扣除角色直径
  后仍有 `6.168251` 场景单位；
- 中/东段碰撞保持分离，最小 world AABB 净距 `0.309519`；
- 西/中段原始有向实体净距 `1.19 local`（约 `1.729 m`），但生产用旋转后 AABB
  切片有 2 处重叠，会把连续立面间小缝合并成墙。三条既有主通道 QA 路线不受影响，
  但不能把这个侧缝描述为已验证可穿行。

地图门为 `pass-center-segment`；主通道 collision 为 pass，侧缝保持 unknown。

## Start / Camera

- `xingfuli`、`xingfuli-canonical`、`xingfuli-pool-detail` 均在角色半径外；
- `xingfuli-entrance-detail` local `[45,-5.5]` 距石桩碰撞只有
  `0.179297 < 0.48`，blocked；
- 已有 `west-to-east-main` QA 路线端点 `[46,-5.05]` 净距 `0.658499`，
  可作为非任意、可追溯候选，但建筑分支不修改共享 `xinhua-world.tsx`。

## 主窗口待办

1. 为 Identity 建立 final Hero SHA 的正式 `derivedFrom`；不能证明时，在 MCP2 后
   从 final Hero 确定性重派生；
2. 由主窗口把入口 detail start 接到已有安全 QA 端点，并做真实页面 camera /
   collision 验收；
3. 批量执行 MCP1、MCP2、MCP3 与当前三档同机位 Three.js 验收。

可重复审计：

```bash
node scripts/test_xingfuli_center_lineage_map_calibration.mjs
```

本栋新增专项测试 4/4、Fast Mode 17/17、三份 GLB audit 全部通过。建筑分支按
Fast Mode 不运行全仓 `npm test` 或 lint。
