# 上海影城渐进式 LOD 与弱网体验实验结论

- 日期：2026-07-24
- 项目：Wander Xinhua
- 实验对象：上海影城（新华路 160 号）
- 主题：验证 `Massing → Identity → Full` 是否能把“照片建筑还原度”和“弱网顺畅游玩”统一到同一套运行时架构。
- 结论状态：架构 Go；直接接入生产世界仍为 No-Go。

## 一、实验结论

这套方案可行，而且收益不是小幅优化，而是把“等待完整建筑后才能开始”改成“城市骨架先可玩，地标随后变清楚”。

在固定 `5Mbps / 80ms`、禁用缓存、`1440 × 900 / DPR 1` 的生产构建实验中：

- Full-first 基线从导航到完整建筑可见需要 `11,419ms`；
- 渐进方案从导航到 Massing 可玩需要 `2,482ms`，提前 `78.3%`；
- 页面运行时初始化后，Massing 在 `91.7ms` 出现，且此时没有任何 GLB 响应；
- Identity 从发起请求到可见需要 `728.2ms`；
- Full 从近景触发到可见需要 `9,044ms`，但这段时间 Identity 一直保留，玩家不需要等待空白画面；
- 60 单位边界附近连续五次来回探测没有产生额外 LOD 切换，距离滞回策略有效；
- Full 下载与解析期间连续 51 次控制探针，页面内状态应用最大 `0.7ms`；包含测试脚本 `100ms` 轮询粒度的 CDP 往返上界为 `103.8ms`，没有发现秒级卡死或输入丢失；
- 浏览器应用异常为 `0`。

因此可以确认：

> 三层资产的主要价值不是让 Full 下载消失，而是把 Full 从“进入游戏的阻塞条件”降级为“靠近英雄建筑后的视觉升级”。

## 二、实验实现

### 三层状态

| 层级 | 触发条件 | 运行时内容 | 本轮作用 |
| --- | --- | --- | --- |
| Massing | 初始或距离大于约 60 单位 | 程序化主体，`620` triangles，零 GLB | 立即提供位置、尺度、遮挡与可玩世界 |
| Identity | 距离进入约 58 单位 | Massing + `418,620B` 身份 GLB | 恢复白色丝带、椭圆开洞、玻璃鼓体和塔楼 |
| Full | 距离进入约 36 单位且策略允许 | 完整 `5,862,660B` GLB | 恢复门厅、字标、幕墙、楼梯、场地和近景细节 |

### 距离滞回

- Massing 进入 Identity：`≤ 58`；
- Identity 回到 Massing：`> 64`；
- Identity 进入 Detail / Full：`≤ 36`；
- Detail 回到 Identity：`> 42`。

进入与退出阈值不相同，避免玩家在边界附近移动时反复请求、卸载和闪烁。

### 弱网策略

`save-data` 模式仍允许进入近景 Detail 状态，但不请求 Full：

- 保留 Massing；
- 加载 Identity；
- 使用程序化/实例化近景节奏；
- Full 的请求时间和可见时间均保持为 `null`。

## 三、实测数据

### 标准网络与 Full-first 对比

| 指标 | 渐进方案 | Full-first 基线 | 判断 |
| --- | ---: | ---: | --- |
| 导航到首次可玩/完整可见 | `2,482ms` | `11,419ms` | 渐进方案提前 `78.3%` |
| 首次可玩时 GLB | `0` | 完整 GLB | Massing 不依赖建筑下载 |
| Identity 升级 | `728.2ms` | 不适用 | 1 秒内恢复地标身份 |
| Full 升级 | `9,044ms` | `9,141ms` 模型阶段 | 下载成本没有消失，但不阻塞游玩 |
| 模型请求 | Identity + Full | Full | 当前渐进方案存在重复传输 |
| 页面总传输 | `7,597,474B` | `7,178,554B` | 渐进方案多 `418,920B / 5.84%` |
| 页面异常 | `0` | `0` | 通过 |

### 1Mbps 弱网省流

固定 `1Mbps / 160ms`、禁用缓存：

- 从导航到 Massing 可玩：`10,732ms`；
- 页面运行时初始化后 Massing 出现：`96.3ms`；
- Identity 请求到可见：`3,370.7ms`；
- Full 请求：`0`；
- 页面总传输：`1,734,514B`；
- 建筑只请求 `418,620B` Identity GLB；
- 连续 22 次控制探针页面内最大 `0.8ms`，CDP 往返上界 `105.9ms`；
- 页面异常：`0`。

弱网下最大的首次启动资源不是建筑，而是：

| 资源 | 传输体积 | 实测耗时 |
| --- | ---: | ---: |
| `three.module-*.js` | `725,592B` | `10,245.2ms` |
| GLTF 运行时代码 | `229,258B` | `6,446.2ms` |
| React / 页面框架 | `190,523B` | `5,735.8ms` |
| Identity GLB | `418,920B` | `3,365.8ms` |

这说明建筑分层解决了“模型阻塞”，但还没有解决“3D 应用启动包阻塞”。

## 四、视觉观察

### 观察

- Massing 能正确表达上海影城的横向主体、左侧鼓体和后塔楼层级，但远景阶段不追求近距离身份等价；
- Identity 能明显恢复连续白色丝带、右侧椭圆开洞、左侧鼓体和后塔楼四个识别线索；
- 弱网近景继续保留首层竖向节奏、塔楼格线和外楼梯级数，不会退化成空白盒子；
- Full 到达后，门头字、门厅、栏板、铺装、座椅和绿化等近景信息恢复；
- 三层的比例、朝向、地面接触保持一致，没有出现轴向翻转或明显跳位。

### 推断

- 对普通住宅、里弄和规则街区建筑，Identity 长期驻留会比上海影城更容易达到“足够好”的视觉门槛；
- 英雄建筑数量受控时，Full 延后加载能显著改善路线体验；
- 如果继续采用“Identity 完整几何 + Full 完整几何”，标准网络最终总传输反而会略高，因此正式架构应让 Full 变成增量 Detail Layer。

### 未确认

- 本轮是 Headless Chrome + SwiftShader 桌面实验，不代表 iPhone、Android 真机 GPU 的绝对 FPS；
- 控制探针验证的是相机/LOD 状态更新，不等于角色碰撞、动画、摇杆和主世界任务系统的完整验收；
- 当前只验证距离滞回，没有实现 `150–250ms` crossfade 或遮挡时替换，因此“无反复切换”不等于“完全看不到切换”；
- 本地 Vinext 生产服务器的资源传输没有显示压缩收益；Sites/VPS 是否启用 Brotli/Gzip 需要单独在线验证。

## 五、Go / No-Go

### Go

1. 把 `Massing → Identity → Full` 作为新华路建筑运行时的正式方向；
2. 首先接入一个真实路线/任务入口，不一次迁移全部 POI；
3. 普通建筑长期停在 Identity，Full 只服务英雄 POI；
4. 弱网与省流模式禁止自动请求 Full；
5. 保留 `58/64` 与 `36/42` 的滞回思想，并按主世界尺度重新标定；
6. 把网络、设备、任务目标和视锥共同纳入优先级。

### No-Go

1. 当前实验组件不直接替换生产上海影城；
2. 不把 Full-first 继续作为进入世界的阻塞条件；
3. 不把 Identity 与完整 Full 长期重复下载当作最终资产格式；
4. 不用本轮 Headless SwiftShader 数据宣称真机 FPS 提升；
5. 没有主世界路线、角色控制、碰撞和移动端验收前，不宣称“正式接入完成”。

## 六、下一步技术决策

### P0：先处理启动包

- 把 GLTF、Drei 和 Full 建筑相关逻辑延后到 Massing 首帧之后；
- 核对 Sites 与 VPS 的 Brotli/Gzip `Content-Encoding`；
- 将“可控制的世界骨架”拆成最小启动路径；
- 评估 Service Worker 预缓存 Three.js 核心与街区基础包；
- 真实弱网目标应同时约束“HTML/JS 首次可玩”和“建筑升级”，不能只看 GLB。

### P0：让 Full 成为增量层

建议把资产改成：

```text
Massing
  + Identity Core
  + Hero Detail Layer
```

Hero Detail Layer 只补充门窗、字标、栏杆、室外家具、近景材质和任务交互，不再次传输 Identity 已有的主体。这样才能同时获得“先辨识”和“总流量不增加”。

### P1：隐藏视觉切换

- Full ready 后使用 `150–250ms` 淡入；
- 优先在转角、树木遮挡、相机转向或任务镜头切换时替换；
- Full 加载失败时保留 Identity，不出现空白或错误占位；
- 离开街区后按内存压力释放 Full，Identity 继续驻留。

### P1：进入真实世界验收

下一轮应在 `/?start=cinema` 或独立路线入口中验证：

- 角色出生后即可移动；
- 沿路线先看到 Massing，再看到 Identity；
- 接近上海影城时 Full 在背景加载；
- 入口、道路和外楼梯碰撞不因层级切换改变；
- 手机触摸控制、相机、任务 UI 和模型解析同时工作；
- 同条件记录真实设备 FPS、长帧、内存峰值与缓存后二次进入时间。

## 七、证据与可重复入口

- 实验页面：`/hybrid-model-test?mode=progressive&policy=auto`
- 弱网省流页面：`/hybrid-model-test?mode=progressive&policy=save-data`
- Full-first 基线：`/hybrid-model-test?mode=baseline&distance=near&view=front`
- 状态机：`app/hybrid-model-test/ProgressiveLodExperiment.tsx`
- 自动实验：`scripts/test_progressive_lod_experiment.mjs`
- 原始指标：`test_artifacts/test_shanghai-cinema_progressive_experiment_metrics.json`
- Massing 截图：`test_artifacts/test_shanghai-cinema_progressive_route_massing.png`
- Identity 截图：`test_artifacts/test_shanghai-cinema_progressive_route_identity.png`
- Full 截图：`test_artifacts/test_shanghai-cinema_progressive_route_full.png`
- 弱网截图：`test_artifacts/test_shanghai-cinema_progressive_weak_detail.png`
- 照片证据 Brief：`docs/research/shanghai-cinema-model-brief.md`
- 身份资产 build record：`docs/research/build-records/shanghai-cinema-hybrid-identity.json`
- 前置混合架构对照：`docs/research/shanghai-cinema-hybrid-comparison.md`

当前资产复核：

- Identity GLB：`418,620B`、1 node、1 mesh、3 materials、0 images，SHA-256 `66ea8425313f9024d0b707b87be27549504ec9dddab3a8fdb30961aaf2d48d9c`；
- Full GLB：`5,862,660B`、1 node、1 mesh、13 materials、0 images，SHA-256 `c4d557038677c9c48577636843fb784b496f4a92fc9ea6bbb1d5ca78e822c062`；
- 两个 GLB 均通过 `--forbid-images --max-nodes 8` 结构审计；
- `.blend` 与 build record 的 SHA-256 一致。
