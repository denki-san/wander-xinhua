# One Step Garden Final Gap Audit

## 结论

一尺花园在集成基线 `aada3c412d10f822305c2e3410435f3b00278c2c`
上的 Evidence / Brief、Hero v2、Identity v1、Massing v2、Blender MCP 三门、
地图校准和 Three.js 单页验收均可复核，最终缺口关闭。

本次没有重建 GLB / Blend、没有打开 Blender、没有重跑浏览器，也没有修改公共
registry、runtime 或 Fast manifest。Recovery/Hold 与范围外资产保持只读。

## 本次唯一修正

`docs/research/one-step-garden-tier-lineage.json` 中 Massing 生成器 SHA
仍是旧值 `41a6e219...`；当前生成器以及 Massing build record 都是
`3927893071e5...`。本次只修正该 building-specific 元数据，未改变生成器或
任何三档二进制。

## 门状态

- Evidence / Brief：pass。三张本地证据均有来源与 SHA；canonical、侧向/纵深、
  入口/身份细节覆盖已记录；直接观察、推断和未知项分离。
- MCP1：pass-preserved。Massing GLB 为 `a87caeba...`。
- Map：pass-preserved。冻结位置 `[60.86, 120.73]`、yaw `-0.38`、scale
  `0.88`；临路最小退界 `3.524676` scene units。
- MCP2：pass-preserved。Hero GLB 为 `026565ba...`。
- MCP3：pass-preserved。Identity GLB 为 `928ecfca...`，同原点、同 bounds、
  同 authored front 和同固定机位。
- Three.js：pass-preserved。单页记录覆盖三档、Hero → Identity、
  Identity → Massing、Massing floor、资源请求、性能样本、墙面碰撞与入口穿行。

## Strict lineage

三档当前 GLB、Blend 和生成器 SHA 均与最终审计一致。Identity root extras
精确钉住 Hero GLB / Blend / generator 以及 Massing GLB；三档共同 bounds 为
`[-7.25, 0, -9.325]` 到 `[7.25, 6.25, 6.9]`。

## 地图、邻栋与碰撞

当前正式合同和既有 map QA 的位置、朝向、比例、八段障碍、起点和相机探针一致。
最近邻栋为 `xinhua-villas-211`，旋转后 AABB 间距 `1.174533` scene units；
双方各计 `0.2` collision margin 后仍有 `0.774533`，没有重叠。入口净宽
`3.4016`、前后体块通道净宽 `1.404`，均大于人物直径 `0.96`。

现有证据明确把 surveyed footprint 与 OSM membership 标为未知，因此本审计不
虚构 OSM way 绑定；只确认已验收的冻结 placement、道路退界和邻栋不重叠。

## 快速模式边界

专项测试会重新计算 SHA、GLB 结构、strict lineage、地图 AABB、邻栋间距、
碰撞净空和既有 runtime 记录的一致性。它不会重做已通过的 Blender MCP 或
Three.js 浏览器验收；全仓回归仍由主窗口在每批 2～3 栋整合后统一执行。
