# Pascal Editor Case Study and Wander Xinhua Assessment

研究日期：2026-07-26（Asia/Shanghai）
研究对象：Pascal Editor 开源仓库、官方站点与公开社区案例。
用途：提炼适用于策展式 Three.js 城市漫游项目的编辑、展示与验收方法；不导入 Pascal 的用户资产、模型、纹理或运行时代码。

## 结论先行

Pascal 的案例效果并不主要来自“建筑模型更精细”，而是把同一空间组织为一个可连续操作的叙事：**创建或扫描 → 编辑结构和布置 → 带材质、灯光和家具的可展示成片 → 可分享的 Viewer**。

对 Wander Xinhua 有价值的是这条结果链和相应的工程边界：场景数据、渲染、编辑状态和可复用资产分离；几何只在受影响节点更新；放置前做空间校验。它不适合作为当前漫游世界的替换内核，因为 Xinhua 的首要目标是经证据审计的城市探索，不是让用户实时搭建建筑。

## 一手来源与检查范围

- 官方站点：<https://editor.pascal.app/>（本轮以桌面浏览器检查，2026-07-26）
- 公开案例入口：<https://editor.pascal.app/viewer/project_hrY3qVVq16yo5Out?returnTo=%2F>（`Wawa House`）
- 源码：<https://github.com/pascalorg/editor>
- 源码检查提交：`daa1f3e99bd5656168b34affc9e70f5c024e3d7b`（2026-07-24，`feat: add material browse categories (#546)`）
- 关键实现：`packages/core/src/registry/registry.ts`、`packages/core/src/registry/types.ts`、`packages/core/src/hooks/scene-registry/scene-registry.ts`、`packages/core/src/hooks/spatial-grid/spatial-grid-manager.ts`

本文件只保存抽象结论和公开 URL；本轮浏览器画面没有作为动态证据文件进入 Wiki。

## 直接观察：案例如何制造“完成感”

### 1. 首页叙事不是功能清单，而是三段式转化

官方首页将功能写为 Create、Edit、Present：先扫描空间、从头绘制或导入参考；再移动墙体、替换家具、尝试布局与风格；最后以第一人称浏览或分享。这个顺序把工具能力翻译成用户能感受到的结果，而不是让用户先理解场景图、节点和系统。

### 2. `Pascal Capture` 的效果来自可比较的“前 / 后”

官网可见的室内示例以左右可比较的空间状态展示：一侧是简化、偏空的房间，另一侧是完成软装、暖光和绿植后的画面；下方还把结果组织成渲染快照。可见重点不是宣称自动生成了真实资产，而是让用户立刻读出“编辑动作造成的视觉增益”。

### 3. 资产库的展示强调“可选择的组合”，而非单个模型预览

官网的 Asset library 画面同时呈现类别面板和一组沙发、桌椅、柜体、灯具等对象。效果上它让用户把家具理解为可调度的场景语言，而不是一次性 GLB 文件。对编辑器而言，这比孤立的模型缩略图更接近真实使用路径。

### 4. 公开 Viewer 的现场验证未通过

本轮打开 `Wawa House` 的公开 Viewer 后，页面持续显示加载状态；控制台报告 `ChunkLoadError`，无法加载一个 Next.js chunk。因此本轮**没有**把该项目的实际实时画面、首屏速度或第一人称体验记为已验证能力。它只能证明官网存在可分享的项目入口，不能证明该入口在当前检查环境稳定可用。

## 源码观察：为什么它能支撑这类案例

1. `core / viewer / editor / nodes` 分包：场景 schema 和状态、渲染运行时、编辑 UI、内置节点定义分开；宿主 App 只负责组合。
2. 场景使用由 `id`、`type`、`parentId` 和 `children` 构成的扁平节点表。这样选择、迁移和局部变更不必重建深层嵌套对象。
3. `sceneRegistry` 维护 node id 到 `THREE.Object3D` 的映射，并按节点类型建立集合；系统可以直接命中对象，而无需每帧遍历整棵 Three.js 场景树。
4. 变更节点会进入 `dirtyNodes`；带几何消费者的节点才会重建，插件还能声明 `geometryKey` 和 level-batch 预计算，避免邻接结构产生不必要的重复计算。
5. 插件通过 `apiVersion`、节点 schema version 和重复 kind 检查接入；生产环境将重复 kind 视为启动错误，而非静默覆盖。
6. 物体放置先计算旋转后的 XZ footprint，再做楼板、墙体和既有物体的空间关系校验。这是一条独立于可见模型的可解释规则。

## 对 Wander Xinhua 的适配判断

### 可以迁移的原则

| Pascal 的做法 | Xinhua 的正确落点 | 边界 |
| --- | --- | --- |
| 创建、编辑、呈现的连续叙事 | 为 `asset-library` 或 `building-evidence-lab` 增加“证据 → 结构 / 身份层 → 运行时”可比较的阶段说明 | 不把风格化或推断层伪装成历史事实 |
| 资产库按组合使用 | 将资产的 tier、可见性、碰撞策略、来源与 QA 入口统一为可读 descriptor | 真实 POI 仍以证据清单和 Blender / GLB 流程为真值 |
| dirty-node 增量更新 | 仅在未来的街具布置或轻量场景编辑实验中采用 | 当前稳定的静态 GLB + 渐进加载路径不重构 |
| 空间放置校验 | 新增街具、临时布置工具先复用显式道路与障碍物合同，再加入旋转 footprint 检查 | 不以一个大盒子替代建筑、庭院和可走道路的细粒度碰撞 |
| 插件节点注册 | 如需扩展，采用受版本控制、静态打包的 first-party descriptor | 不在生产环境加载未审核的第三方运行时插件 |

### 不应迁移的部分

- 楼层、墙体 CSG、平面图编辑器和实时房屋搭建：与当前城市漫游目标不匹配，重构成本高于收益。
- 公开案例中的任意家具、模型、贴图和渲染风格：其单项许可、来源和性能预算未在本轮确认。
- 将社区 Viewer 视为稳定的发布基线：本轮真实打开失败，必须先通过部署、缓存、资源 hash 和跨环境验收。

## 建议的最小试点（尚未实施）

在非生产的 `asset-library` 或独立实验路由中，选择一个**通用、非历史性**街具组，验证：

1. descriptor 是否能同时表达模型 tier、位置、朝向、可见性、碰撞和 QA 入口；
2. 拖放预览是否使用临时状态，提交后才写入正式清单；
3. 旋转 footprint 是否能阻止对象进入道路、入口和既有碰撞区域；
4. 至少一组“未布置 / 布置后”的同机位呈现是否能让人读出编辑价值；
5. 实际页面记录视口、预热、采样时长、页面可见性、构建模式、draw calls 和帧时间。

通过以上五项，才值得决定是否将这种工作流扩展到更多通用 dressing。真实建筑与 POI 仍必须遵循照片证据、Blender、GLB 与 Three.js 三层验收。

## 观察、推断与未知

### 观察

- 官网确实以 Create / Edit / Present 和 Asset library 组织产品表达；室内前后对照、家具集合和渲染快照在页面中可见。
- 源码确实提供节点注册、局部对象索引、dirty queue、空间网格和插件 API 版本门。
- 本轮所测公开 Viewer 出现 chunk 加载失败，未完成实例渲染。

### 推断

- 对 Xinhua，先让“证据、层级资产与运行时效果”可比较，会比直接引入完整建筑编辑器更容易产生可验证的产品价值。
- 旋转 footprint 校验适合补足未来轻量布置工具，但不能替换现有显式碰撞的可解释性。

### 未知

- 公开 Viewer 的失败是临时 CDN / 缓存问题，还是当前发布版本问题；本轮没有跨设备或服务端日志证据，不能归因。
- Pascal 社区案例的模型来源、单项许可证、移动端性能和完整交互体验未审计。
- Xinhua 的编辑试点是否带来足够用户价值，仍需要先完成最小试点和运行时测量。

## Wiki 同步要求

目标项目：`Threejs-3d-research`（`0e0c3670-c275-42f9-8c06-6de01e3683b5`）。

目标源路径：
`raw/sources/threejs-modeling-knowledge-base/wander-xinhua/pascal-editor-case-study-and-xinhua-assessment-2026-07-26.md`。

同步后必须执行 Source Rescan，等待 `pending` 和 `processing` 清零，并通过 MCP 搜索与读取回查；在此之前不能宣称 Wiki 已完成学习。
