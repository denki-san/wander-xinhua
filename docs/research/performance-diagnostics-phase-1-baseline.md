# GitHub Issue #2 第一阶段性能诊断与桌面基线

## 状态与范围

本轮完成 GitHub Issue #2 的第一阶段：建立统一、可导出的运行时性能诊断协议，
并为 `intro`、`overview`、`xingfuli` 三个固定入口生成一轮同条件 production
桌面基线。

- 性能诊断仅在 URL 明确包含 `?perf=1` 时懒加载；
- 普通 URL 不暴露 `window.__XINHUA_PERF__`，不渲染面板，也不请求诊断 chunk；
- 未修改 Chunk、LOD、压缩、资源调度或画质策略；
- 本轮结果仅是单机单轮基线，不代表性能提升或回归；
- 未部署、未推送。

实现入口：

- `app/performance/performance-metrics.ts`
- `app/performance/performance-diagnostics.tsx`
- `scripts/test_capture_performance_baselines.mjs`
- `tests/test_performance_diagnostics.test.mjs`

## 固定采集协议

| 项目 | 固定值 |
| --- | --- |
| production build | clean worktree 下由采集脚本串行执行 `npm run build:static` |
| build 身份 | Git commit、Git tree、`dist-static/index.html` SHA-256；从 `BASE_URL` 回读并核验 |
| viewport | `1440 × 900` CSS px |
| device scale / DPR | `1 / 1` |
| quality / app network profile | `high / standard` |
| CDP network | `80 ms` latency、`5 Mbps` download、`2 Mbps` upload、4G |
| cache | 每个入口清空并禁用 |
| visibility | 全程 `visible`，发生 visibility change 则样本无效 |
| warmup / sample | first playable 后预热 `5 s`，固定采样 `10 s` |
| movement | 各入口出生点静止 |
| runs | 每入口 `1` 轮 |
| long frame | `> 33.33 ms` |

固定入口：

| 入口 | mode | URL query |
| --- | --- | --- |
| intro | intro | `perf=1&quality=high&network=standard&light=noon` |
| overview | overview | 上述参数加 `qaAutoStart=1` |
| xingfuli | explore | 上述参数加 `qaAutoStart=1&start=xingfuli` |

## 指标语义

- Fixed sample 使用连续 R3F `addAfterEffect` 执行完成时的 `performance.now()`
  观察点计算帧间隔；跨过 deadline 的首个完整帧先计入，再封口。
- `renderer.info.autoReset` 只在 `perf=1` 生命周期内关闭；每帧聚合完整
  R3F 与 postprocessing 后手动 reset，卸载时恢复原值。
- Draw calls、triangles、points、lines 记录窗口内 `average / last / maximum`。
- Renderer resources 记录 geometries、textures、programs 数量；浏览器不提供
  可信的精确 GPU memory 字节数，因此 `gpuMemoryBytes` 固定为 `null`。
- `loaded` 表示已挂载在 Three.js scene graph；`visible` 表示
  `Object3D.visible` 父子链为真，不代表进入相机视锥或最终像素可见。
- Tier 只接受显式性能资产标记或明确的 `assetId / asset / landmark / building`；
  同一 asset/chunk 取实际提交的最高 tier，不使用任意 `object.name` 猜资产。
- First playable 按入口在 ready 后的下一完整帧打点；请求清单只包含在打点前
  已完成的 Resource Timing 项，并按 JS、GLB、image、other 分类。
- Console error/exception、`Network.loadingFailed`、应用资源 HTTP 4xx/5xx
  任一非零都会使该轮失败，不能进入 manifest。Chrome 自动探测的
  `/favicon.ico` 会原样记录，但单独标为 browser probe。

## 正式基线

采集源码：

- commit：`4533af1594948014518340134c8505904722436e`
- tree：`51542850046124f0ee50bcd51fc43111be589cb8`
- served `index.html` SHA-256：
  `2e17253f0074df57800daeb596b77981a12826e4a46950ee224c0b194d063681`

### 帧数据

| 入口 | 有效帧 | 实际窗口 | FPS | avg | P95 | max | long frames |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| intro | 600 | 10000.3 ms | 60.04 | 16.66 ms | 22.5 ms | 25.4 ms | 0 |
| overview | 600 | 10020.0 ms | 59.98 | 16.67 ms | 22.2 ms | 23.9 ms | 0 |
| xingfuli | 600 | 10011.3 ms | 60.02 | 16.66 ms | 21.5 ms | 30.1 ms | 0 |

### Renderer

Calls 和 triangles 均按 `average / last / maximum` 展示。

| 入口 | draw calls | triangles | geometries | textures | programs |
| --- | --- | --- | ---: | ---: | ---: |
| intro | `329 / 329 / 329` | `259995 / 259995 / 259995` | 164 | 22 | 24 |
| overview | `1747.95 / 1747 / 1754` | `307370.32 / 330344 / 330344` | 1810 | 16 | 18 |
| xingfuli | `1047.67 / 573 / 1555` | `670751.05 / 784187 / 784187` | 466 | 10 | 43 |

Xingfuli 在采样窗口内的 calls / triangles 变化明显，因此后续分析必须保留
average、last、maximum 和原始逐帧窗口语义，不能只摘取一个数值。

### Tier、chunk 与 first playable

Tier 顺序为 `Massing / Identity / Hero / Unknown`。

| 入口 | loaded tier | visible tier | chunks loaded / visible | active assets | first playable | 请求完成数 | transfer |
| --- | --- | --- | --- | ---: | ---: | --- | ---: |
| intro | `30 / 0 / 0 / 0` | `30 / 0 / 0 / 0` | `4 / 4` | 27 | 4078.1 ms | `13 JS / 11 GLB / 1 IMG`，共 26 | 2285808 B |
| overview | `4 / 19 / 0 / 0` | `4 / 19 / 0 / 0` | `4 / 4` | 20 | 4226.9 ms | `15 JS / 11 GLB / 1 IMG`，共 28 | 2293146 B |
| xingfuli | `4 / 18 / 1 / 0` | `0 / 18 / 1 / 0` | `4 / 0` | 19 | 4263.9 ms | `15 JS / 11 GLB / 1 IMG`，共 28 | 2293146 B |

Collector 验收确认：

- 三个入口均只有四个 `xinhua-district-massing` chunk 条目；
- active / loaded IDs 不含 `Scene`、通用 landmarks 容器或 chunk
  high/mid/low 子 mesh；
- Xingfuli 在 intro / overview / xingfuli 的可见 tier 分别为
  Massing / Identity / Hero。

## 页面与失败门

- 普通 production URL：API 为 `undefined`、面板数为 `0`、诊断 chunk 请求为 `0`。
- 三个入口均为 production、入口和 mode 匹配、采样期间页面全程可见。
- 三个入口的 console error、network failure、应用 HTTP error 均为 `0`。
- 每个入口保留一个既有 `THREE.Clock` deprecated warning；本轮未扩大范围处理。
- 三张 `1440 × 900` 截图已人工核对入口画面、面板 mode 和冻结数值。

## 证据真值

外置动态证据快照：

- snapshot ID：`2026-07-29-4533af1`
- snapshot manifest：`gitSha=4533af1`、`sourceWorktreeDirty=false`
- 文件数 / 字节数：`643 / 271802368`
- `SHA256SUMS`：独立复查全部通过
- 正式基线相对路径：
  `repository/test_artifacts/performance-baselines/test_issue_2_phase_1_desktop_4533af1/`
- 正式 baseline manifest SHA-256：
  `6d8bc66d56f378f21734e6d2b8b0afc5fe5d5bdbde1131922d005f03dbd30107`

动态 JSON、截图和运行指标不得进入 `Threejs-3d-research`；该 Wiki 只允许保存
进一步抽象后的方法与流程 Markdown。

## 作废与被替代证据

以下目录原样保留，但不得作为正式基线或后续比较来源：

- `test_issue_2_phase_1_desktop/`：实现未提交时采集，记录的旧 HEAD 不能证明
  production build 与源码一致；目录内有明确 invalidation JSON。
- `test_issue_2_phase_1_desktop_d753e16/`：普通 URL 的 favicon 404 触发旧版
  HTTP 失败门，采集被中止，没有正式 manifest。
- `test_issue_2_phase_1_desktop_85f4cae/`：已通过当时协议，但帧间隔锚点使用
  rAF 起始时间；发现首个锚点可能落在采样开始前后，已由 `4533af1` 替代。

这些历史证据及其不可变快照用于保留决策与校验链，不用于性能结论。

## 解释边界

- 本轮只有一台桌面设备、每入口一轮，不提供统计置信区间。
- First playable 的 `totalDurationMs` 是可重叠请求时长之和，不是页面 wall time。
- Resource Timing transfer bytes 来自禁用缓存的本机 HTTP preview，不等于线上
  CDN、HTTP/2 或真实用户网络成本。
- 本轮没有“修改前同条件”对照，因此不声明 FPS、P95、draw calls、triangles、
  资源数或 first playable 的改善。
- 第一阶段只建立诊断与基线，不据此提前进行 Chunk、LOD、压缩或画质重构。
