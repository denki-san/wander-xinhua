---
title: Third-person camera controls source register
status: verified-source-register
collected_at: 2026-07-25
---

# 来源登记

## 外部一手来源

| 来源 | 类型 | 2026-07-25 核验到的直接事实 | 证据状态 |
| --- | --- | --- | --- |
| [Three.js PerspectiveCamera](https://threejs.org/docs/pages/PerspectiveCamera.html) | 官方 API 文档 | `fov` 是垂直视角；`near` 必须大于 0；相机属性变化后调用 `updateProjectionMatrix()` | observed |
| [Godot SpringArm3D 教程](https://docs.godotengine.org/en/stable/tutorials/3d/spring_arm.html) | 官方教程 | Spring arm 沿长度 sweep 形状；碰撞后把子节点放到命中点附近；无形状时退化为不推荐的单 ray；标准层级为 pivot → arm → camera | observed |
| [yomotsu/camera-controls](https://github.com/yomotsu/camera-controls) | 开源仓库 | `colliderMeshes` 使用来自相机 near plane 四角的 4 个 raycaster；区分 `smoothTime` 与 `draggingSmoothTime`；碰撞检测有性能成本 | observed |
| [hh-hang/three-player-controller](https://github.com/hh-hang/three-player-controller) | MIT 开源仓库 | 支持胶囊体、动画、相机避障、移动端控制和 `three-mesh-bvh`；内部会接管传入的 controls，外层不应再次 `controls.update()` | observed |
| [pmndrs/ecctrl](https://github.com/pmndrs/ecctrl) | MIT 开源仓库 | 面向 React Three Fiber + Rapier；提供 ShapeCast、DOM 摇杆/按钮、可替换输入 store 和可选调试工具 | observed |
| [Rapier Character Controller](https://rapier.rs/docs/user_guides/javascript/character_controller/) | 官方文档 | Kinematic controller 用 ray cast / shape cast 根据障碍修正用户期望位移；move-and-slide 是核心能力 | observed |
| [gkjohnson/three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) | 开源仓库 | 提供 `raycastFirst`、`intersectsSphere` 和 shapecast 等空间查询 | observed |

## Wander Xinhua 项目来源

| 来源 | 可核对内容 | 证据状态 |
| --- | --- | --- |
| `app/scene/world-math.ts` | `resolvePlanarSpringArm`、帧率无关阻尼和墙钟截止时间 | observed |
| `app/scene/xinhua-world.tsx` | 独立相机障碍物、相机半径/边距、反向转身、当前相机平面移动、手动跟随宽限和构图状态 | observed |
| `app/xinhua-experience.tsx` | 下三分之一区域摇杆、移动中全屏第二指、轻点跳跃和走路/跑步切换 | observed |
| `tests/test_camera_spring_arm.test.mjs` | spring arm 首命中、凹边界、恢复、贴墙构图与 FOV 合同 | confirmed |
| `tests/test_controls.test.mjs` | 连续摇杆、走跑切换、多指跳跃、转向速度和控件结构合同 | confirmed |
| `tests/world-math.test.mjs` | 当前相机平面、反向移动、构图和墙钟一致性 | confirmed |
| `bc38fa5` → `83c7357` | 本轮第三人称镜头与移动端控制的实现提交序列 | observed |
| 用户手机验收（2026-07-24 至 2026-07-25） | 用户对反向转身、镜头位置、摇杆、轻点跳跃和最终手感进行了连续反馈并确认最终版本 | confirmed，属于产品验收而非独立实验 |

## 不能由来源直接证明的内容

- `56–64°` FOV、`0.22–0.30` 相机半径、`540–720°/s` 转向速度等数值是
  当时的项目试验建议，不是外部库推荐值，标记为 `inferred`。
- 开源项目具备某项 API，不等于接入 Wander Xinhua 后一定改善手感或性能。
- 用户真机验收证明目标设备上的主观体验达到要求，但不能替代多设备性能矩阵。
- `three-mesh-bvh` 与遮挡淡出仍是条件性后续方案，当前没有完成项目级收益验证。

