# Wander Xinhua 第三人称相机与操作控制 V1：独立验证后的实施方案

- 日期：2026-07-24
- 分支：`feat/third-person-spring-arm-controls`
- Worktree：`.worktrees/third-person-camera-controls`
- 目标：把前期研究转成可证伪假设，在当前真实场景中验证后再实施；不把 Wiki 或外部最佳实践当作项目结论。

## 证据来源与边界

本方案参考但不直接服从以下材料：

1. `docs/knowledge-sources/threejs-modeling-knowledge-base/wander-xinhua/wander-xinhua-third-person-camera-collision-and-mobile-controls-research-2026-07-24.md`
2. `docs/knowledge-sources/threejs-modeling-knowledge-base/wander-xinhua/wander-xinhua-third-person-open-source-practice-review-2026-07-24.md`
3. `docs/knowledge-sources/messenger-official-runtime-and-source-audit-2026-07-24.md`
4. 独立 Wiki `Threejs-3d-research`，项目 ID `0e0c3670-c275-42f9-8c06-6de01e3683b5`

实际使用的 Wiki 工具：

- `llm_wiki_status`
- `llm_wiki_projects`
- `llm_wiki_search`
- `llm_wiki_read_file`
- `llm_wiki_graph_relations`

关键 Wiki 页面：

- `wiki/methodology/第三人称相机运行时验收合同.md`
- `wiki/concepts/pivot-spring-arm-camera-三层状态机.md`
- `wiki/concepts/每帧相对当前相机平面计算移动.md`
- `wiki/concepts/相机体积连续扫掠.md`
- `wiki/concepts/碰撞只压缩臂长不改-yaw.md`
- `wiki/findings/drivesignature-analog-冻结相机相对移动参考系.md`
- `wiki/findings/fallback-yaw-与历史安全点切换导致跳镜头.md`
- `wiki/findings/fov-调参属于-framing-而非碰撞修复.md`

这些页面用于提出问题与候选架构，不构成运行时通过证明。

## 可证伪假设与当前判定

| 假设 | 验证方法 | 当前证据 | 判定 |
| --- | --- | --- | --- |
| H1：持续模拟输入冻结首次相机基向量，会造成 camera-relative 方向误差 | 审计 `driveSignature === "analog"` 路径；构造相机旋转 90° 但摇杆持续前推的确定性向量对照；最终真机双指复核 | 源码确认旧版只在 signature 改变时复制 `moveCameraForward/right`；相机旋转 90° 后，旧基向量与当前镜头前向相差 90°。审查又发现肩位会让 rig forward 与真实视线相差约 8.9°；最终实现改用 `camera.getWorldDirection()`，两种行为测试均通过 | **代码根因和真实视线修复合同确认；真机体感占比待验** |
| H2：fallback yaw 是当前跳镜头的主因 | 在 `xingfuli-canonical` 固定位置做 24 × 15° 整圈遥测，记录候选状态 | 实测未触发 fallback yaw；旧逻辑在两个遮挡区间产生 17 次 `clear / compressed-N` 切换，单个 15° 区间内跨越多档 | **“主因”表述被反驳；离散压缩不连续已确认** |
| H3：圆形相机体的首接触 sweep 比 16 档离散缩臂更稳定 | 对建筑扩张盒、最近阻挡、凹边界和恢复阻尼做确定性数学测试；改造后复跑相位对齐的同一整圈轨迹 | 审查构造出固定步长会漏掉的凹角近切反例，方案已改为线段 capsule 解析首碰并用该反例回归；旧版扣除初始态后为 16 次状态切换，新版为 6 次；阻挡期间 blocker 稳定为 `obstacle-142/179`，每个采样点的 desired/actual arm yaw 相等 | **反例修正后的数学合同和真实场景整圈验收通过** |
| H4：探索态 58–62° 垂直 FOV 更好 | 390×844、844×390、1024×768、1440×1024 同场景截图；核对人物屏占比、建筑畸变和可读性 | 四视口真实生产构建均通过；横屏 58° 保留街巷纵深，390×844 的 62° 未出现明显鱼眼、人物过小或身份不可读 | **保留 58–62° 自适应方案** |
| H5：右手松开后 250–400ms 宽限期更自然 | 同一拖拽路径读取 QA 宽限期衰减；移动中观察相机是否立即抢回控制权 | 审查发现 capped physics delta 会在 10fps 把 350ms 拉成长约 700ms，现已改成 `performance.now()` 墙钟截止时间；10/30/60fps 行为测试通过，页面读数约为 `312 → 199 → 0ms` | **墙钟计时合同通过；移动端双指体感待用户真机复核** |
| H6：约 600–690°/s 的满幅转向优于当前 458°/s | 确定性 180° 转向曲线 + 桌面/移动视觉复核 | `12 rad/s` 上限配合 `lambda=9` 时，60fps 下约 0.317s 到达 90% 目标方向，落在 0.20–0.35s 验收窗内 | **确定性曲线通过；真机手感待用户复核** |
| H7：旧滚轮范围不会造成首下突跳 | 对照初始 zoom 与旧下限；真实页面分别发出首个向内/向外滚轮输入并读取臂长 | 初始 zoom 约 5.37，旧下限却为 6.4，假设被直接反驳。连续函数改造后，实际臂长从 5.128 分别连续变为 4.508 / 5.753；最近边界为 4.391，画面无裁切 | **调研未覆盖但独立审计发现并修复** |

## 基线事实

基线提交为 `2529b147e139fd6969b2d4641451cc6467f3a9f0`，静态生产构建运行于
`127.0.0.1:3013`。在 `1440×1024`、`?start=xingfuli-canonical&cameraQa=1`
中：

- 初始 FOV：`50°`
- 理想臂长：约 `5.13`
- 24 个 15° 采样完成 360° 环绕
- 最终候选状态变化计数：`17`
- 触发状态：`legacy-clear`、`legacy-compressed-1/3/7` 等
- 未触发：`legacy-fallback-yaw`、`legacy-last-safe`、`legacy-near`
- 最短采样实际臂长：约 `3.50`
- 结论：本入口能证明离散缩臂档位频繁切换，不能证明 fallback yaw 是主要运行时问题

浏览器接口不支持连续原始按键注入；短按不会跨过足够渲染帧，因此未把合成长按当作角色移动或碰撞证据。连续摇杆与双指条目必须由真实触摸输入或用户设备补验。

## 通过当前证据后的 V1 决策

### 纳入

1. 每帧用最终真实镜头 `camera.getWorldDirection()` 的地面 `forward/right` 组合键盘或摇杆输入，移除 `driveSignature` 和输入期间的旧基向量缓存；rig right 只负责肩位，不能再冒充屏幕方向。
2. 将相机改成 `target pivot → desired arm → resolved arm → camera`：
   - 用户拖拽只改变目标 yaw / pitch；
   - 碰撞只改变臂长；
   - 角色、目标点和肩位不被碰撞层改方向。
3. 使用现有 `WORLD_CAMERA_OBSTACLES`：
   - 建筑使用带相机半径的扩张 AABB 首接触；
   - 凹行政边界对每条边做线段 capsule 解析首碰，覆盖短暂近切和凹角端帽；
   - 碰撞时立即收短以保证不穿墙，离开后以帧率无关阻尼慢速恢复。
4. 增加仅在 `cameraQa=1` 时启用的遥测与面板，记录 mode、blocker、理想/实际臂长、goal/desired-arm/actual-arm yaw、输入、FOV、宽限期和状态变化；无参数时在构造遥测对象前短路。
5. FOV 暂以横屏 `58°`、窄竖屏最多 `62°` 作为候选，只有四视口视觉对照通过后才保留。
6. 右手松开后的候选宽限期先设 `350ms`；满幅角色转向上限先设 `12 rad/s`，均接受实测回调。
7. 将滚轮缩放拆成连续纯函数，范围改为 `4.6–12.5`；新下限低于初始距离，不再在第一次输入时把镜头强制推远。

### 不纳入

- 不引入 Rapier、Ecctrl 或新的控制器生命周期。
- 不把所有可见 GLB 建成 BVH collider。
- 不实现全场景透明、整栋建筑淡出或材质重写。
- 不继续添加 fallback yaw、历史安全点或未经验证的近身候选。
- 本轮不做局部 `collision-only` GLB；只有确定某个 POI 突破二维模型后再独立立项。

## 实施后淘汰门

只要出现任一情况，当前 V1 参数或架构必须回退修改：

1. 同一 24 × 15° 轨迹扣除初始态后仍出现超过 `6` 次 clear/compressed/recovering 状态变化，或出现与输入无关的 yaw 改变。
2. `resolvedArmLength` 在 blocker 存在时超过安全首碰臂长。
3. 离开障碍后臂长恢复出现单帧弹回，而非连续恢复。
4. 四视口中任一档出现明显鱼眼感、人物过小、near-plane 裁切或 POI 身份不可读。
5. 双指操作中左手移动被右手拖拽中断，或松开右手后小于 250ms 即开始抢回镜头。
6. 新增 console error、WebGL error，或同条件帧时间显著劣于基线。

## 完成证据

- 数学与源码专项测试；
- `npm test`、`npm run lint`、`git diff --check`；
- 同一入口的基线/改造后整圈遥测；
- 390×844、844×390、1024×768、1440×1024 真实页面截图；
- 至少一个建筑背靠/转角入口的运行时检查；
- 控制台与构建资源检查；
- 无法自动完成的真实触摸/双指条目单独列为用户验收项，不以桌面合成输入替代。

## 实施后运行时结果

### 等价整圈 A/B

- 入口：`?start=xingfuli-canonical&cameraQa=1`
- 视口：`1440×1024`
- 操作：每次使用同一 52px 水平拖拽，按 15° 标记采样 24 次；新版先做一个相同 warm-up 拖拽，使首个采样的理想 yaw 与基线同为 `111.6°`
- 基线：计数器 `17`，扣除初始态后 `16` 次切换；最短采样臂长 `3.50`
- 新版：计数器 `7`，扣除初始态后 `6` 次切换；最短采样臂长 `3.06`
- 新版两个遮挡区分别稳定命中 `obstacle-142` 与 `obstacle-179`，没有再出现同一区间内的 `compressed-1/7/3` 离散跳档
- 新版 24 个采样点的 desired-arm yaw 与 actual-arm yaw 逐点相等，证明碰撞层只改臂长；rig goal yaw 与 arm yaw 的差值来自明确的肩位，不再混成一个指标
- 新版离开首个障碍后的实际臂长采样为 `2.955 → 3.865 → 4.501 → 4.817 → 4.957 → 5.043`，单调恢复且没有单帧弹回

计数器会把首次进入 `spring-clear` 算作一次状态，因此验收阈值必须比较“计数器减一”。

### 四视口 framing

| 视口 | FOV | 观察 |
| --- | --- | --- |
| `1440×1024` | `58°` | 人物约占画面高度三分之一，街巷纵深和两侧建筑均可读 |
| `1024×768` | `58°` | 人物占比与桌面档一致，未见 near-plane 裁切 |
| `844×390` | `58°` | 人物约占画面高度 45%，短横屏仍能读出道路方向；顶栏空间紧张属于既有 UI 约束 |
| `390×844` | `62°` | 人物约占画面高度三分之一，建筑与走廊可读，未见明显鱼眼感 |

### 性能与构建

同一浏览器、`1440×1024`、生产静态构建、页面可见、完整地标预热 15 秒后，
基线与最终版紧邻各采样 3 次、每次 5 秒的 `requestAnimationFrame`：

- 基线 FPS 中位数：`60.40`
- 最终版 FPS 中位数：`56.80`，相对变化约 `-6.0%`
- 基线 / 最终版 P95 帧间隔中位数：`24.4ms / 25.1ms`
- 基线 / 最终版平均帧间隔中位数：`16.61ms / 17.67ms`

短预热和系统负载不同的轮次曾在 `26–60fps` 间大幅波动，因此不用于结论。
最终紧邻长预热结果显示约 6% 成本，未触发“显著回退”淘汰门，但也不能宣称性能提升。

静态 JS 产物从 `1560.64kB / gzip 473.36kB` 增至
`1564.82kB / gzip 474.85kB`。最终游玩态的 CDP 事件采集未发现
`Runtime.exceptionThrown`、`Log.entryAdded` 或 `Runtime.consoleAPICalled` 事件。

## 当前方案判断

当前 V1 **值得保留**，理由不是它符合 Wiki 推荐，而是：

1. 研究中关于 fallback yaw 的强结论已被本项目基线反驳，方案据此收窄到真实出现的离散缩臂问题；
2. spring-arm 架构把用户 yaw、理想臂长、碰撞臂长分离，数学不变量和真实场景整圈结果一致；
3. 独立审查实际推翻了固定采样、rig 方向、physics delta 宽限和零值初始化等首版实现，修正后都有反例测试；
4. FOV、宽限期、转向速度和滚轮范围都经过了本项目参数或画面检查，而非直接照抄外部数值；
5. 四视口与长预热性能复测没有发现淘汰门中的视觉或显著性能回退。

仍不能把它称为移动端最终完成：Browser CUA 无法生成可信的持续摇杆加双指拖拽，
所以“左手持续移动时右手旋转、松开后自动跟随”的真机体感必须由用户设备补验。
