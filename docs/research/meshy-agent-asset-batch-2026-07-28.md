# Meshy Agent 可用街景资产批次

- Status: 10 visible-low assets passed isolated runtime QA; production placement pending
- Batch ID: `meshy-agent-street-assets-20260728`
- Product: 漫步新华
- Tool route: 已登录浏览器中的 Meshy Agent，不使用 API
- Production rule: 每件资产都必须经过“概念图 → 视觉审核 → 3D → 降面/定尺 → GLB
  审计”，不能把 2D 图或未经审计的 Meshy 导出物算作完成

## 1. 为什么选择这 10 件

这批不是随机测试物。前八件已经存在于当前场景或资产管理页，后两件是现有视觉方向
明确要求、但仍缺少合格共享资产的街景构件。

| # | Asset ID | 中文名 | 当前用途证据 | 本批目的 |
| ---: | --- | --- | --- | --- |
| 1 | `plane-tree-straight-sparse` | 直干疏冠法国梧桐 | 资产库 `plane-tree`，当前线上 32 个实例 | 形成可复用的轻量近景候选 |
| 2 | `lane-lamp-short-arm` | 里弄短臂路灯 | `HeritageLaneLamp` 与道路实例 | 替换过度简单的 primitive 轮廓 |
| 3 | `slatted-bench-backrest` | 条板靠背长椅 | `SlattedBench`、幸福里照片确认 | 提供近景可读但足够轻的候选 |
| 4 | `street-planter-long` | 长条街景花箱 | `StreetPlanter`、幸福里水边照片确认 | 复用在店前与水景边缘 |
| 5 | `stone-bollard-squat` | 矮方不规则石桩 | 幸福里入口证据与已审计两态资产 | 提供另一轻量形态候选 |
| 6 | `shanghai-dual-classification-bin` | 上海双分类垃圾桶 | 当前新华路批量 `InstancedMesh` | 形成无文字、可批量实例化的近景候选 |
| 7 | `cantilever-cafe-umbrella` | 悬臂咖啡伞 | 幸福里场景与共享资产 | 提升近景轮廓和支架关系 |
| 8 | `outdoor-dining-dark-wood` | 深色木金属户外桌椅 | 幸福里照片与共享资产 | 形成一桌两椅的可复用组合 |
| 9 | `vintage-step-through-bicycle` | 复古弯梁自行车 | 视觉方向明确要求自行车；旧 Meshy 候选可读但贴图过大 | 重做轻量、项目风格版本 |
| 10 | `wall-ac-outdoor-unit` | 壁挂空调外机 | 视觉方向把空调外机列为上海街景装饰语法 | 补足建筑立面的重复生活细节 |

证据边界：

- 这些资产类别确实能用于当前游戏，不代表可以不经地点证据就在任意位置摆放。
- 梧桐、路灯、花箱、长椅等具体样式仍须在接入某个地点前与该地点照片对照。
- Meshy 结果只作为候选几何；若现有确定性 primitive 更轻、更像证据，则保留现有资产。

## 2. 每件资产的生成合同

以下是第一轮目标，不是官方硬限制。它们结合当前运行时真实尺寸和 Meshy 官方
game-ready 建议制定，最终以 GLB 审计和相同设备运行时为准。

| Asset ID | 真实尺寸/定尺基准 | Identity 三角面目标 | 近景上限 | 材质与贴图 | 原点 |
| --- | --- | ---: | ---: | --- | --- |
| `plane-tree-straight-sparse` | 高 `9–11 m`；最终按地点照片校准 | `1,200–2,500` | `4,000` | 优先 3–5 个项目色材质；如透明叶片确有收益，仅一张 `1024²` atlas | 树干基部中心 |
| `lane-lamp-short-arm` | 总高 `3.36 m`，灯臂伸出约 `0.5 m` | `300–800` | `1,500` | 2–3 个平面材质，无独立纹理 | 底座中心 |
| `slatted-bench-backrest` | 长约 `2.08 m`，座高 `0.48 m`，总高约 `0.93 m` | `500–1,200` | `2,500` | 木色 + 深灰金属，优先无纹理 | 椅脚落地包络中心 |
| `street-planter-long` | `1.40 × 0.54 × 0.55 m` 槽体 | `300–900` | `1,500` | 槽体、土、2 种叶色；优先无纹理 | 底面中心 |
| `stone-bollard-squat` | 高 `0.64–0.90 m`，宽约 `0.6 m` | `80–300` | `500` | 单一灰石材质，无纹理 | 底面中心 |
| `shanghai-dual-classification-bin` | `0.90 × 0.46 × 0.91 m` | `300–800` | `1,200` | 银灰、深灰、蓝色分区；无文字和图标，无纹理 | 底面中心 |
| `cantilever-cafe-umbrella` | 占地约 `2.8 × 2.8 m`，高约 `2.57 m` | `500–1,200` | `2,000` | 暖灰/珊瑚红伞面 + 深色支架，无纹理 | 配重底座中心 |
| `outdoor-dining-dark-wood` | 组合占地约 `2.4 × 2.2 m`；桌高 `0.68 m` | `800–1,800` | `3,000` | 深木色 + 深灰金属，无纹理 | 组合落地包络中心 |
| `vintage-step-through-bicycle` | 长 `1.70–1.85 m`；车轮直径约 `0.66 m` | `1,500–3,000` | `5,000` | 4–6 个平面材质；不生成 4K PBR 纹理组 | 两轮接地中心 |
| `wall-ac-outdoor-unit` | 约 `0.80 × 0.32 × 0.55 m` | `200–600` | `1,000` | 暖灰机壳 + 深灰风扇；无品牌、无纹理 | 背板几何中心，另记录安装锚点 |

## 3. Meshy Agent 执行顺序

每件资产单独保留任务引用和版本，不把十件合成一个大 GLB。

1. 向 Agent 提交批次风格合同，但只请求十张互相独立的 2D 概念图。
2. 对每张图检查：单主体、完整轮廓、白/透明背景、70–90% 画面占比、没有地面、
   环境、文字、Logo 和多余物件。
3. 未通过的图先在 2D 阶段修改；只有通过的图才允许生成 3D。
4. 3D 默认选择 `智能拓扑`。树、自行车等薄/枝状结构可对比 `标准`，但不能因默认
   选项跳过审核。
5. 首次 3D 后先看实际三角面和结构，再执行 `Remesh`：
   - 直接用于 WebGL：triangle；
   - 需要在 Blender 大改：quad，随后在 Blender 生成正式 triangle 导出。
6. 材质默认使用项目共享色板。只有证据证明贴图不可替代时才 Retexture，并限制为
   单张 `1024²` atlas；禁止复现旧自行车的四张 `4096²` PBR 纹理组。
7. 下载时按上表设置高度和 `底部` 原点，格式使用 GLB。空调外机是壁挂物，下载后
   仍需在 Blender 设置独立安装锚点。
8. 原始导出永久保留；优化版是新文件，不覆盖原始文件。

## 4. 通过标准

一件资产只有同时满足以下条件，才计入“完成的 10 件”：

- 概念图与用途、证据和风格合同一致；
- 3D 轮廓能在目标屏幕占比下识别；
- 三角面、节点、材质、图片和文件体积通过对应预算；
- 尺寸、方向、原点和地面/墙面接触可验证；
- 不含文字、Logo、环境地面和无法解释的附属物；
- 原始 Meshy 导出与优化衍生物均有 SHA 和不可变外置快照；
- 在真实 `?start=` 或专用非建筑 QA 页面完成浏览器验收后，才允许进入正式地图。

## 5. 2026-07-28 网页生产结果

### 已完成的网页链路

本轮已经在 Meshy Agent 的真实登录页面完成：

```text
10 张独立 2D 概念图
  → 人工逐张审核
  → 修正不合格的双树干梧桐
  → 10 个 Smart Topology 初始灰模
  → 第一轮按用途 Remesh
  → 结构保真 Remesh
  → Viewer 视觉审核
  → 逐件选择源版本
  → 设置真实高度与底部原点
  → 10 个 GLB 导出
  → SHA / 结构 / bounds 审计
```

完整网页过程、参数、异常和逐件选择记录位于：

`test_artifacts/test_meshy_agent_batch_20260728/test_meshy_agent_run_record.md`

结构化导出清单位于：

`test_artifacts/test_meshy_agent_batch_20260728/test_meshy_agent_export_manifest.json`

本轮动态证据已归档到不可变外置快照
`2026-07-28-2ca6310`：

- 路径：
  `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-28-2ca6310/`
- 文件数：`869`
- 字节数：`430,026,752`
- GLB 原始导出/失败版本/备选版本：`15`
- `SHA256SUMS`：已重新校验，全部通过
- 快照真值相对路径：
  `repository/test_artifacts/test_meshy_agent_batch_20260728/`

### 选中的 10 个原始候选

| Asset ID | 网页版本 | GLB tris | GLB 大小 | 网页候选结论 |
| --- | --- | ---: | ---: | --- |
| `plane-tree-straight-sparse` | 初始 | 8,555 | 667,432 B | 结构完整，Hero 候选；需受控优化 |
| `lane-lamp-short-arm` | 初始 | 9,522 | 680,708 B | 结构完整，Hero 候选；需受控优化 |
| `slatted-bench-backrest` | Remesh2 | 2,094 | 164,064 B | 结构通过；需长度校正 |
| `street-planter-long` | 初始 | 6,725 | 523,936 B | 初始叶簇更完整；作为确定性重建参考 |
| `stone-bollard-squat` | Remesh1 | 288 | 23,344 B | 结构通过；需宽度校正 |
| `shanghai-dual-classification-bin` | 初始 | 10,411 | 764,116 B | 只作重建参考，不作重复实例 |
| `cantilever-cafe-umbrella` | 初始 | 6,187 | 472,320 B | 只作重建参考，伞面比例需修正 |
| `outdoor-dining-dark-wood` | 初始 | 10,913 | 839,596 B | 一桌两椅关系更完整；作为修直重建参考 |
| `vintage-step-through-bicycle` | 初始 | 10,597 | 805,276 B | 近景 Hero 候选；需受控优化 |
| `wall-ac-outdoor-unit` | 初始 | 10,424 | 758,904 B | 风扇、百叶和托架完整；作为重建参考 |

全部选中 GLB 均为一个 mesh、零图片、零纹理，没有复现旧自行车四张 `4096²`
PBR 贴图造成的 `53.3 MiB` 问题。

### 网页导出阶段不能直接算“10 件完成”

网页链路已经产生 10 个有用途的候选，但还不能把它们写成正式游戏资产：

- 树、灯、垃圾桶、伞、自行车超过本批近景 triangle 上限；
- Meshy Remesh 对这些薄片/细杆/闭合箱体类别会产生破洞、断裂和悬浮片；
- 长椅、花箱、垃圾桶、伞、桌椅与空调外机有非高度轴尺寸偏差；
- 所有导出都是无材质灰模，尚未加入项目共享低模色板；
- 还没有 Blender canonical / 侧向图，也没有 Three.js QA 页面验收。

因此下一步不是继续盲目在 Meshy 中降面，而是把原始候选冻结后，在 Blender 中按类别
选择“受控 Decimate、确定性重建或保留 Hero”路线。原始导出永远不覆盖。

## 6. 2026-07-28 正式低模编译与运行时结果

本轮没有把高面 Meshy 网格直接塞进游戏，也没有把失败 Remesh 冒充优化。网页端负责
形成经审核的 2D 概念和 3D 空间草图；正式 topology 由
`scripts/create_meshy_agent_street_asset_models.py` 确定性编译。每件衍生物继续记录对应
Meshy 源文件、SHA 和采用该轮廓的理由。

| Asset ID | 正式 tris | GLB bytes | 材质 | 推荐距离 / hidden | 隔离 QA |
| --- | ---: | ---: | ---: | --- | --- |
| `plane-tree-straight-sparse` | 664 | 67,164 | 3 | `24 / 50 m` | passed |
| `lane-lamp-short-arm` | 248 | 17,548 | 2 | `10 / 28 m` | passed |
| `slatted-bench-backrest` | 2,094 | 165,572 | 2 | `5 / 18 m` | passed |
| `street-planter-long` | 632 | 53,128 | 4 | `5 / 18 m` | passed |
| `stone-bollard-squat` | 288 | 23,980 | 1 | `4 / 18 m` | passed |
| `shanghai-dual-classification-bin` | 84 | 9,556 | 3 | `4 / 18 m` | passed |
| `cantilever-cafe-umbrella` | 176 | 14,060 | 2 | `10 / 24 m` | passed |
| `outdoor-dining-dark-wood` | 204 | 16,936 | 2 | `6 / 18 m` | passed |
| `vintage-step-through-bicycle` | 704 | 49,988 | 3 | `5 / 18 m` | passed |
| `wall-ac-outdoor-unit` | 232 | 17,080 | 2 | `5 / 18 m` | passed |

总计 `5,326 tris`、`435,012 bytes`。10 件均为零图片、零纹理、零动画、零骨骼；
没有复现旧自行车四张 `4096²` PBR 图导致的 `53.3 MiB` 问题。

运行时通过项：

- 每件在专用推荐距离均加载真实 GLB，`visible-low` 且 `renderReady=true`；
- 以空调外机在 `50 m` 验证共享 hidden 合约：状态为 `hidden`，没有替代 Massing；
- 空调外机按背面中心锚点、`2.2 m` 安装高度审核；
- 真实 Chrome 视觉验收视口为 `1638×851`；结构复测为 `1280×577`、DPR `1`；
- 应用 console error 为 `0`，10 个 GLB 的解码字节与文件大小一致；
- 本机热缓存加载时长不作为公网性能提升证据；
- Blender fixed camera、真实 WebGL 截图和十张三联对照均已保存。

产物真值：

- 模型清单：`docs/research/meshy-agent-street-assets-model-manifest.json`
- Blender master：`assets/models/source/nonbuilding/meshy-agent-street-assets/`
- 运行时 GLB：`public/models/nonbuilding/meshy-agent-street-assets/`
- 固定机位与 WebGL 证据：
  `test_artifacts/nonbuilding/meshy-agent-street-assets/`
- 运行时指标：
  `test_artifacts/nonbuilding/meshy-agent-street-assets/test_runtime_metrics.json`
- 三联对照总览：
  `test_artifacts/nonbuilding/meshy-agent-street-assets/test_meshy-agent-street-assets-triptych-contact-sheet.png`
- 最终不可变动态证据：
  `/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-28-meshy-agent-street-assets-final-2ca6310/`
  （`1,010` 文件、`477,827,072` bytes，含 15 个原始/备选/失败 GLB、运行时截图、
  三联对照和指标；`SHA256SUMS` 全部通过）
- 早期原始导出快照 `2026-07-28-2ca6310` 继续保留，不覆盖。

完成边界：这 10 件已经是可用的共享资产并通过隔离运行时，但仍未自动进入具体地点。
正式摆放需要该地点照片证据、数量/方向审核、地图碰撞和相同设备性能验收。
