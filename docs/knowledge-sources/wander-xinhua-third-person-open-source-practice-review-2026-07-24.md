# Wander Xinhua 第三人称交互：联网核验的开源实践筛选

- 研究日期：2026-07-24
- 问题：建筑密集区的相机遮挡/裁剪、探索视野、移动端双指与摇杆手感。
- 筛选标准：公开源码；有明确许可证或官方文档；实际覆盖相机、角色控制、碰撞或触摸输入；能说明与现有 R3F 街区架构的接入边界。
- 结论：不存在应直接整包接入的“万能控制器”；应吸收经过验证的局部模式，并维持现有的显式 POI 碰撞和单 Canvas 生命周期。

## 已核验来源与结论

| 来源 | 有效证据 | 可迁移实践 | 对 Wander Xinhua 的决定 |
| --- | --- | --- | --- |
| `yomotsu/camera-controls` | MIT 源码；提供 `colliderMeshes`，相机碰撞从 near plane 四角发射 4 条 ray；支持独立的 dragging / normal smooth time | 相机碰撞不能只检测中心点；拖动中和松手后的平滑速度应分开 | **借鉴算法与参数结构，不接管相机** |
| `hh-hang/three-player-controller` | MIT 源码；胶囊体 + `three-mesh-bvh`，含移动端控件、连续轴输入、相机避障、输入/相机/动画拆分 | 控制器系统拆分；连续 `moveX/moveY` 接口；碰撞网格与可视资产可分离 | **借鉴接口与局部 BVH 原型，不直接安装** |
| `pmndrs/ecctrl` | MIT、R3F + Rapier 开源控制器；支持 ShapeCast、触摸 overlay / 外部输入 store、可调试参数、镜头碰撞配置 | 输入 UI 可独立于控制器；调参须有运行时 debug surface；形状检测优于单点 ray | **架构对照；不在本轮引入 Rapier** |
| Rapier 官方 Kinematic Character Controller | 官方 JavaScript 文档；以 ray/shape casts 修正期望位移；建议 capsule/ball/cuboid | “期望位移 → 碰撞修正位移”的契约，以及简单角色形状优先 | **保留为未来全物理迁移备选** |
| `gkjohnson/three-mesh-bvh` | MIT 源码；`raycastFirst`、`intersectsSphere` 等局部空间查询 | 单独 collision-only mesh 的快速首命中 / 球体查询 | **只服务少数不规则 POI** |
| Godot `SpringArm3D` 官方文档 | 官方第三人称相机教程；shape sweep、碰撞 margin、角色排除、pivot → arm → camera 分层 | 碰撞应压缩相机臂长；相机体积 sweep；使用 margin | **作为本轮相机重构的主模型** |

## 为什么这些来源可信但不能照搬

### camera-controls：最直接的相机细节来源

`camera-controls` 是 Three.js 相机控制库。其文档明确说明 `colliderMeshes` 会从相机 near plane 的 4 个角进行碰撞射线检查，而不是仅使用相机中心线；同时区分 `smoothTime` 与 `draggingSmoothTime`。

这验证了两个与本项目高度相关的做法：

1. 相机实际有体积，单条角色到相机的中心线不足以覆盖 near-plane 擦墙；
2. 用户主动拖拽时应更直接，松手后才进入较慢的跟随回正。

但它是通用 orbit camera，不能理解新华路的边界、POI 交互、安全相机位和角色朝向。接入它会重新分配现有相机控制权，因此只借鉴“多采样 / 双平滑时间”的设计。

### three-player-controller：最接近 Web 第三人称场景的开源样本

该项目公开声明支持胶囊角色碰撞、动画、第一/第三人称切换、相机避障、`three-mesh-bvh` 加速与移动端控件。其公开 API 允许外部提供连续 `moveX` / `moveY` 与 look delta；源代码将输入、相机、动画和载具拆为独立系统。

可迁移结论：

- 当前项目保留模拟量摇杆是对的，问题应在移动参考系与转向响应，不在“是否要改成四方向按键”；
- 可以为局部不规则区域建立独立碰撞几何，使用 BVH 做 capsule / ray 查询；
- 相机、输入与角色动画要有清晰所有权，避免多组件在同一帧同时更新镜头。

不可照搬的点：该控制器内部接管传入的 `OrbitControls`，README 明确要求外层不要再更新 controls。Wander Xinhua 已有自定义相机、触摸捕获、POI 起点和后处理，因此直接接入会产生相机和输入双所有权；示例资产的单独授权也未纳入本研究。

### Ecctrl 与 Rapier：证明形状检测和调参方式，不证明应该换物理引擎

Ecctrl 的 R3F 实现提供 ShapeCast、触摸 joystick/virtual buttons、外部 store 输入和 debug 调参。Rapier 的官方角色控制器则把“期望位移”经碰撞检测修正成“实际位移”，并提醒角色控制本质上高度项目化，默认控制器只是起点。

这支持本项目采用：

- 运行时可见的输入、相机、阻挡物和臂长调试数据；
- 胶囊/球/盒等简单形状用于角色和相机安全边界；
- 输入 UI 与控制逻辑保持解耦，方便在不重写控制器的前提下迭代手机控件。

它不支持本轮直接迁移到 Rapier：迁移会改变时间步、角色移动、交互边界、可见网格 collider 与性能预算，无法作为“修一下摇杆”或“修一下镜头”的低风险操作。

### three-mesh-bvh：只在局部不规则几何上升级

`three-mesh-bvh` 支持 `raycastFirst`（优先首命中）和 sphere 查询，适合相机与角色针对一个低面碰撞网格做局部空间查询。它不是“所有场景 mesh 都应该拥有 BVH”的理由。

适用条件仅限：显式 AABB 无法表达的楼梯、围栏、曲面水岸、转角立面。每个 POI 都应有独立 `collision-only` 资产、构建记录、内存/帧时间基线和 `?start=` 实机验收。

## 落到当前产品的最佳实践

### A. 相机：Spring Arm 合同

采用 `pivot → desiredArm → resolvedArm → camera`，并为每帧记录：

```text
desiredYaw / desiredPitch
desiredArmLength
hitDistance / hitNormal / blockerId
resolvedArmLength
occlusionMode = none | compressed | fade-foreground
```

- 用户输入只改 `desiredYaw/Pitch`；
- 碰撞只改 `resolvedArmLength`；
- 碰撞收缩快、恢复慢，避免贴墙时穿模与离墙时突然弹回；
- 先以 2D swept circle 覆盖现有地图障碍；对近相机立面补 4 条 near-plane ray；
- 短到最小舒适距离时才触发局部 facade/tree dither/fade，不能切换任意侧向 fallback yaw。

这比现在“缩短 → 多方向搜索 → 历史安全点”的策略稳定，也比一开始加入整套物理引擎更贴合当前架构。

### B. 摇杆：相机参考系必须持续更新

左摇杆每帧应按当前相机的地面 `forward/right` 组合移动；不能在第一次推杆时缓存向量直到松手。右半屏负责相机 look，左半屏负责移动，两者并行，右手松开后设置 250–400ms 的回正宽限期。

保留径向死区与模拟量强度；建议将 `0.12 / 0.15 / 0.18` 作为三档真机 A/B，测量起步延迟、误触和全圆方向误差。角色满摇杆转向可先试 `540–720°/s`，目标是 180° 转身约 `0.25–0.35s`，随后再以录像调节。

### C. FOV：按设备视口调，不按感觉固定一个大数

Three.js 的 `PerspectiveCamera.fov` 是垂直角度。探索态先以：横屏 `56–60°`、竖屏 `60–64°` 为试验区间；与人物屏占比、默认镜头距离和 FOV 变形一起比较。不能以无限增大 FOV 或把 near plane 降到接近零替代相机碰撞。

## 验收与淘汰规则

只有同时满足以下条件的外部实践才能从“研究来源”进入项目原型：

1. 许可证、源码版本、依赖与资产边界清楚；
2. 不接管已有 Canvas、相机或输入所有权，或能在隔离入口中证明无冲突；
3. 390×844 和 844×390 真机/浏览器路径中，无 WebGL error、触摸抢事件或相机闪跳；
4. 对 L 型转角、背靠 facade、移动中 360° 转镜头、前左后右摇杆、双指操作有可重复录像；
5. 有同设备、同 DPR、同路径的 FPS 和长任务基线。

以下类型直接淘汰：仅有视觉 Demo、未说明许可证/资产来源、全局覆盖 `Mesh.raycast`、整包接管相机控制、没有移动端输入路径、或要求将所有可见建筑作为复杂 trimesh collider 的项目。

## 来源

1. Godot Spring Arm 官方教程：https://docs.godotengine.org/en/stable/tutorials/3d/spring_arm.html
2. Three.js `PerspectiveCamera` 官方文档：https://threejs.org/docs/pages/PerspectiveCamera.html
3. `camera-controls` 源码与碰撞说明：https://github.com/yomotsu/camera-controls
4. `three-player-controller` 源码与 API：https://github.com/hh-hang/three-player-controller
5. Ecctrl 源码：https://github.com/pmndrs/ecctrl
6. Rapier JavaScript Character Controller 官方文档：https://rapier.rs/docs/user_guides/javascript/character_controller/
7. `three-mesh-bvh` 源码与 API：https://github.com/gkjohnson/three-mesh-bvh

## 研究边界

联网检索与源码阅读能确认 API、架构、维护活动和许可证，但不能替代本项目的真机运行时验收。本文件的参数区间属于待验证的项目建议，不是外部项目承诺的效果指标。
