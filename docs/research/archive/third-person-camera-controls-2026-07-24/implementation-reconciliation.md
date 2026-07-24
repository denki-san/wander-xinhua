---
title: Wander Xinhua camera research implementation reconciliation
status: implemented-with-deferred-items
implementation_commit: 83c73572066255f1ebeff77754ca2d6d634cb9bd
reconciled_at: 2026-07-25
---

# 研究结论与最终实现对照

## 结论

研究的主判断成立：不引入完整第三方控制器或物理引擎，而是在现有 R3F 场景内
明确输入、角色朝向、相机角度和碰撞臂长的所有权。最终实现沿用了 spring arm
思想，但根据真实页面、自动测试和手机反馈调整了参数与触摸交互。

## 对照表

| 研究结论 | 最终处理 | 验证 | 状态 |
| --- | --- | --- | --- |
| 相机碰撞只压缩臂长，不枚举任意 fallback yaw | 实现连续 `resolvePlanarSpringArm`，保留独立相机障碍物、半径和 margin | `test_camera_spring_arm.test.mjs` | confirmed |
| 摇杆移动持续使用当前相机平面 | 移动循环每帧读取当前相机的地面 forward/right | `world-math.test.mjs` | confirmed |
| 直后拉应触发人物反向转身，而不是镜头快速绕行 | 增加反向目标锁定，反向期间暂停自动跟随反馈 | 自动测试＋用户手机验收 | confirmed |
| 用户拖动镜头后给予回正宽限 | 采用 0.35 秒墙钟宽限，并保持帧率无关 | spring arm 与控制测试 | confirmed |
| 移动端保留连续模拟量，不退化为四方向 | 保留径向死区、连续 `moveX/moveY` 和摇杆强度 | `test_controls.test.mjs` | confirmed |
| 左手移动与第二指视角/跳跃并行 | 静止时下三分之一区域轻点跳跃/拖动移动；移动后第二指全屏可拖镜头或轻点跳跃 | 自动合同＋用户手机验收 | confirmed |
| 走路和跑步可以移动中切换 | 走路模式满幅仍走；跑步模式轻推走、满推跑 | 自动合同＋用户手机验收 | confirmed |
| 直接引入 Rapier / Ecctrl | 未采用；会扩大角色、碰撞、时间步和相机生命周期变更面 | 架构评估 | rejected |
| 直接接管 camera-controls 或 three-player-controller | 未采用；与现有单 Canvas、自定义相机和输入所有权冲突 | 源码/API 评估 | rejected |
| 全局加入 BVH | 未采用；只保留为少数复杂 POI 的局部候选 | 尚无项目级 A/B | deferred |
| 最短臂长时 facade/tree dither 或 fade | 本轮未实现；当前 spring arm 已解决目标问题 | 需独立视觉与排序验收 | deferred |
| 竖屏使用 60–64° FOV | 未照搬；最终采用较保守的视口自适应 FOV 合同 | 相机专项测试与多视口截图 | superseded |

## 实际实现提交

1. `bc38fa5`：建立第三人称 spring arm、连续输入和相机 QA 基础。
2. `9e6094c`：调整移动端触控区域与输入响应。
3. `677e0d8`：降低转向与奔跑速度。
4. `619e0f4`：加入移动中可切换的走路/跑步模式。
5. `3202429`：修复直后拉转身并调整状态化镜头构图。
6. `83c7357`：完成隐藏摇杆、轻点跳跃、移动中第二指全屏响应及异常 pointer capture 清理。

## 验收边界

- 自动测试证明数学合同、源码接线与关键状态转换，不等价于所有浏览器的真实多指事件。
- 用户手机验收覆盖了目标设备上的主要手感，但没有形成跨设备统计样本。
- 外部来源只支持算法模式和 API 能力；是否适合本项目由项目实现与验收决定。
- 后续若引入 BVH、遮挡淡出或新的物理引擎，应建立新的证据包与同条件基线，
  不应把本归档中的候选建议当成已验证结论。

