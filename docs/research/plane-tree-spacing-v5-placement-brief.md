# Xinhua Road Plane Tree Spacing V5 Placement Brief

## Scope

- Runtime entry: `/?start=house315`
- Placement generator: `app/scene/xinhua-road-placement.mjs`
- Model binaries: unchanged from Canopy V4
- Identity variants: 4
- Massing variants: 3
- Runtime Hero: 0
- Baseline release: Git `17adb17`
- Deployment boundary: local candidate only; do not deploy before user confirmation

## User Correction

2026-07-29 用户在已部署的 315 号标准档画面中指出：

1. 梧桐树纵向株距需要再拉开一点；
2. 靠近镜头一侧的树列需要向道路方向内移，进入红圈标注的沿路区域。

本轮只调整树阵位置，不改树形、叶团、材质、GLB、建筑和道路。

## Evidence Boundary

- 原始标注图归档：
  `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-29-plane-tree-spacing-v5-user-feedback/test_user_feedback.png`
- 已观察：
  Canopy V4 的 315 号试验段在入口过滤后仍存在同侧 `3.6` scene units 的近邻；
  靠镜头一侧树列离道路轴约 `6.6–7.0` scene units，树干退到沿路构图外侧。
- 合理推断：
  将常规轴向节奏提高到 `7.5`，并把镜头侧法向偏移收至约 `5.05–5.50`，
  可以在保持树冠搭接的同时让树干进入红圈区域。
- 未知：
  红圈不构成测绘坐标；实树逐株位置和历史补植节奏未知。

## Placement Contract

| Item | V4 | V5 |
| --- | ---: | ---: |
| 常规轴向采样 | 6.0 | 7.5 scene units |
| 全树阵最小同侧间距 | 3.6 | 6.8 scene units |
| 315 号试验段目标上限 | 20 | 16 |
| 315 号试验段安全下限 | 未定义 | 10 |
| 对面侧法向偏移 | 6.55–7.10 | 保持 6.55–7.10 |
| 镜头侧法向偏移 | 6.55–7.10 | 5.05–5.50 |
| 新华路实例数 | 83 | 62 |
| 含幸福里总实例数 | 86 | 65 |

入口和建筑净空优先于数量。安全候选不足时允许少放树，不允许重新把两棵挤回
最小间距以下。

## Safety Gates

- 新华路柏油、路缘、步道和绿化带外缘距道路轴约 `3.925` scene units。
- V5 镜头侧树干在计入最大缩放树干碰撞半径后，距绿化带外缘仍至少
  `0.69` scene units。
- 继续使用树干级碰撞；树冠和板根不进入玩家或镜头碰撞层。
- 所有树位继续通过建筑包络、入口净空和相邻变体检查。

## Runtime Views

| View | URL | Gate |
| --- | --- | --- |
| Standard | `/?start=house315&qaAutoStart=1&network=standard` | 四款 Identity；红圈侧树干进入沿路区域；对面树列拉开 |
| Weak | `/?start=house315&qaAutoStart=1&network=weak` | 三款 Massing；使用同一树位；枝干方向不回退 |

本轮不声明性能提升。只有标准档与弱网档均进入 `playable`、控制台 0 error，
且用户确认截图后，才允许合并和部署。
