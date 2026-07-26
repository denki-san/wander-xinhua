# FICS Xinhua 365 Membership and Map Blocker

日期：2026-07-26

FICS 新华365 的正式地图接入保持 **blocked**。本专项没有修改模型、公共地图、
registry 或碰撞运行时；完整可机读记录在
`fics-xinhua-365-membership-map-blocker.json`。

冻结候选 transform 为 `position [-76.1, 75.2]`、`yaw -0.38`、`scale 0.9`；五个
Massing footprint 回投影至仓内 OSM 快照的最大误差为 `0.0000054523` scene units
（`0.0000147212m`）。这只证明几何落点，不证明主体归属。

候选成员为 `864493178`、`864493177`、`864493179`、`864493181`、`864493230`。原始
OSM 对五者只有 `building=yes` 和几何，缺少名称、门牌、园区边界及逐栋照片绑定；
因此它们只能保持 `unbound-member-candidate`，不能称为 FICS 的正式完整成员集。

道路裁决：新华路净距 `+10.490160` scene units，通过；园区 service road
`way/577252268` 到候选 `way/864493177` 的净距为 `-1.124546` units（`-3.036274m`），
是真实可见道路重叠。五个独立 OSM polygon 可以保留为 Massing 的审计输入，但不能
在成员和 service-road 真相未确认时写成公共 runtime collision shell。

解除条件：取得能绑定园区边界及每个纳入 way 的官方总平面、地籍/门牌资料或可定位
航拍，并确认 `way/577252268` 与 `way/864493177` 的真实通行/穿楼关系。禁止用任意
移动、旋转、缩小主体或静默移除道路来关闭门禁。
