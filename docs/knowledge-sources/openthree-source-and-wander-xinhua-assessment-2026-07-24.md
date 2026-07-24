# OpenThree 源码筛选与 Wander Xinhua 学习决策

研究日期：2026-07-24（Asia/Shanghai）
研究对象：OpenThree 的 `three-cesium-examples` 案例库与其外链项目索引。
结论状态：已完成源码阅读与项目适配判断；没有导入任何 OpenThree 模型、贴图或第三方项目代码。

## 结论先行

OpenThree 是一个 **Three.js / Cesium 案例导航与演示壳**，不是许可证统一、可直接投产的 3D 素材库。其本体仓库采用 Apache-2.0，但案例可能引用外部模型、外链代码与其他作者的仓库；父仓库许可不能自动覆盖这些内容。

对 Wander Xinhua 真正值得学习的是：

1. 把 Meshopt 压缩 glTF 的解码配置做成受审计的资产管线；
2. 只在不规则、确有需求的 POI 碰撞上评估 `three-mesh-bvh`，不替换现有显式碰撞盒；
3. 保持“雾色与清屏色同步”的氛围验收规则；
4. 为外部案例建立来源、作者、代码 URL、资产 URL 和许可证的分离记录。

不应直接采用其第三人称移动、10 万草叶 shader、通用 FBX/OBJ 加载案例，或把其外链模型当作可用素材。

## 一手来源与可复核快照

- 网站：<https://openthree.github.io/three-cesium-examples/>
- 源码：<https://github.com/OpenThree/three-cesium-examples>
- 检查分支：`dev`
- 检查提交：`68c74b2c192220a1734276c5badf16eb5d747da9`
- 检查时最新提交：`chore: github examples`，2026-07-24T19:35:59+08:00
- 父仓库许可证：Apache-2.0（`LICENSE`）
- 源码级检查路径：
  - `README.md`
  - `config/three-examples.js`
  - `config/github-examples.js`
  - `threeExamples/basic/gltfOptLoader.js`
  - `threeExamples/animation/personThirdMove.js`
  - `threeExamples/animation/personFirstMove.js`
  - `threeExamples/application/pointLockControls.js`
  - `threeExamples/basic/sceneFog.js`
  - `threeExamples/shader/grassShader.js`

### 直接观察

- OpenThree 将内部案例的 `codeUrl`、`image`、`referUrl`、`githubUrl`、`openUrl` 配置在索引文件中；`github-examples.js` 列出的第三方项目是导航条目，不是被纳入父仓库的代码。
- README 明确建议大模型、音视频、纹理等共享资源优先使用外部 URL，以维持案例仓库轻量。
- `gltfOptLoader.js` 使用 `GLTFLoader.setMeshoptDecoder(MeshoptDecoder)`；这是本次发现中最直接、最可迁移的资产管线模式。
- `personThirdMove.js` 是一个直接按帧推进位置和旋转的最小 WASD 示例，没有 delta-time、碰撞、重力、坡面、输入焦点或移动端策略。
- `pointLockControls.js` 同样是最小键盘移动示例，没有碰撞检测，且允许上下自由移动。
- `personFirstMove.js` 尝试把 `three-mesh-bvh` 用于 mesh 光线投射与碰撞实验，但它同时混入了赛博朋克材质、多个外部模型和大量场景逻辑；不应整段复用。
- `sceneFog.js` 将 `Fog` / `FogExp2` 与 `renderer.setClearColor()` 同步，说明雾和清屏色应作为同一个视觉契约验证。
- `grassShader.js` 在单个 `BufferGeometry` 内随机生成 100,000 株草叶，使用双面 ShaderMaterial，源码自身留有“降低顶点数 / 迁移 GPU”的待优化提示；它不是移动端街景植被的安全基线。

## 与现有项目的差异判断

| 能力 | Wander Xinhua 当前已有证据 | OpenThree 的增量 | 决策 |
| --- | --- | --- | --- |
| 重复资产 | `shared-street-assets.tsx`、`plane-tree-instances.tsx` 已使用 `InstancedMesh`，并更新 matrix/bounds | 仅提供入门示例 | 不搬运；继续复用现有资产池 |
| 渐进 LOD | `ProgressiveLodExperiment.tsx` 与自动脚本已有距离滞回、阶段可见性和实测入口 | 官方案例可作 API 查询索引 | 不重做；维持现有运行时实验 |
| 碰撞 | 街道资产有 `none` / `base-only` / `explicit-box`，地块维护显式障碍物 | BVH 可补不规则网格 | 仅建立受控试验，不全局替换 |
| 氛围 | `atmosphere-contract.ts`、`xinhua-world.tsx` 已有雾与后处理层 | 雾/背景同步是可借鉴验收点 | 纳入视觉 QA，不复制 demo |
| GLB 加载 | 项目使用 `GLTFLoader`，依赖中已有 `meshoptimizer`，但当前 app 源码未发现 `setMeshoptDecoder` / `setDRACOLoader` 配置 | Meshopt 解码模式明确 | 优先做资产管线试验 |

## 值得学习的四项

### 1. P0：Meshopt 压缩资产的受控接入

**为什么值得学**：OpenThree 的 `gltfOptLoader.js` 证明了浏览器加载器需要显式挂接 `MeshoptDecoder`；仅安装依赖不会让带 `EXT_meshopt_compression` 的 glTF 自动可用。

**在本项目的正确落点**：建立一个集中配置的 GLTF loader，而不是在每个场景临时设置 decoder。先选一个非核心、可回滚的 GLB 做压缩前后对照。

**通过条件**：

1. 原始与压缩 GLB 都经过结构审计；
2. 实际 `?start=` 页面能加载并保持材质、动画、bounds 正确；
3. 记录同视口、同网络、同预热条件下的下载体积、首个可见时间、解码耗时、CPU 峰值和移动端 FPS；
4. 没有同条件基线时，不宣称性能提升。

**不要照抄的部分**：该案例的 HDR/PMREM 回调没有把生成的 PMREM 纹理明确写回 scene environment；应单独实现并释放 `PMREMGenerator`，不能把 demo 当生产级环境光方案。

### 2. P1：把 BVH 限定为不规则碰撞试验

**为什么值得学**：`personFirstMove.js` 显示了 `computeBoundsTree` 与 accelerated raycast 的最小接入方向，适合评估楼梯、曲线池边、细长栏杆等显式盒难以覆盖的局部。

**边界**：现有建筑群、草坪、广场、道路仍保持显式可解释碰撞；不要通过改写 `THREE.Mesh.prototype.raycast` 在全局启用 BVH，也不要把可见 mesh 直接当完整碰撞网格。

**试验门槛**：为单一不规则 POI 单建 collision-only geometry，做确定性移动路径、相机遮挡和边缘穿透测试，并记录 build/内存/帧时间后再决定是否推广。

### 3. P1：雾、天空与后处理的同一视觉契约

**为什么值得学**：OpenThree 的雾案例虽然简单，却正确地把 fog color 和 renderer clear color 一起调。它提醒我们不能只调雾而忽略背景接缝、远景裁切和低配后处理的色差。

**正确做法**：延续现有 `atmosphere-contract.ts`，在 desktop / low-tier、晴天 / 雨天、入口 / 主世界四种条件下截同机位对照；不要引入其外部天空盒或下载包。

### 4. P1：案例索引与许可分层

**为什么值得学**：OpenThree 用 `referUrl`、`githubUrl`、`codeUrl`、`openUrl` 分离“灵感来源、源码、预览和资产位置”。这个信息结构可用于本项目的研究记录。

**规则**：外部案例先作为“学习线索”；只有确认代码许可证、模型/纹理许可证、署名要求、来源 commit 和运行时预算后，才能成为可引入依赖或资产。Apache-2.0 只覆盖 OpenThree 父仓库自身内容，不覆盖卡片链接的第三方项目。

## 明确排除与待研究项

| 条目 | 判断 | 原因 |
| --- | --- | --- |
| `personThirdMove.js` / `pointLockControls.js` | 不采用 | 缺少 delta-time、碰撞、坡面、输入焦点、移动端与运行时验收，低于现有世界控制要求 |
| `grassShader.js` | 不采用 | 10 万随机草叶、无稳定 seed、无 LOD / instance 分层；还会冲突于已有梧桐树和街景植被路线 |
| `modelLoad.js` | 不采用 | 混合 FBX/OBJ/MTL 与外部资源；本项目生产资产应以受审计 GLB 为主 |
| OpenThree 外链“高斯漫游”、`3d.city`、`cheapwater`、`THREE-CustomShaderMaterial` | `needs_review` | 它们只是索引中的第三方线索；各自许可、维护状态、依赖、性能和与项目架构的兼容性未在本次确认 |
| OpenThree 模型、纹理、天空盒、HDR 下载地址 | 不导入 | 来源和单项许可不能由父仓库 Apache-2.0 推导 |

## 推荐学习顺序

```text
先：Meshopt GLB 单资产基线实验
  → 再：一个不规则 POI 的 collision-only BVH 实验
  → 再：四条件氛围视觉 QA
  → 最后：对确有必要的外部项目逐个做许可证与源码审计
```

这条顺序把 OpenThree 当作案例发现入口，而不是资产供应商；任何实际接入仍须遵循本项目的 Blender / GLB / Three.js 三层验收与部署前测试。
