# OpenThree 站内候选项目筛选：Wander Xinhua 可用性研究

- 研究日期：2026-07-24
- 研究范围：OpenThree `three-cesium-examples` 目录中列出的开源项目卡片；不是对目录站本身的功能评审。
- 目录索引版本：`68c74b2c192220a1734276c5badf16eb5d747da9`（2026-07-24）
- 关联旧记录：`openthree-source-and-wander-xinhua-assessment-2026-07-24.md` 仅保留目录站、入口和许可证边界；本文件是该目录内项目的实际筛选结论。

## 筛选基准

当前项目是 React Three Fiber（`@react-three/fiber` 9.6.1）与 Three.js 0.185.1 的单 Canvas 场景。已有：自定义第三人称漫游、触摸摇杆、二维地图碰撞/相机避障、GLB 角色动画、`InstancedMesh` 街道资产，以及 `@react-three/postprocessing` 合成链。

因此候选必须满足至少一项：补齐当前明确缺口、可在现有 Canvas 中局部引入、或能降低 GLB 资产审计成本。不得为了示例效果引入第二套 renderer、相机控制权或未核验的示例资产。

## 结论速览

| OpenThree 卡片 | 推荐级别 | 对项目的真实价值 | 采用边界 |
| --- | --- | --- | --- |
| `three-player-controller` | P1：借鉴/隔离原型 | BVH 胶囊碰撞、第一/三人称与输入系统的成熟拆分 | 不直接替换现有漫游；不导入示例 GLB/HDR/3D Tiles |
| `THREE-CustomShaderMaterial` | P1：一个局部视觉试点 | 在标准 PBR 材质上加可控 GLSL，而不重建整个材质栈 | 单材质、单场景试点；uniform 与 shader 字符串必须稳定 |
| `threepipe` | P2：离线工具/架构参考 | 资产导入、配置与导出工作流的参考 | 不作为现有运行时的 viewer/render-pipeline 依赖；不把其私有 GLB 扩展当标准 GLB |

## 候选一：three-player-controller

- OpenThree 卡片：`threePlayerController`，指向 `https://github.com/hh-hang/three-player-controller`。
- 源码核验版本：`4a5bb2ba5243869b17ef3b022527b26487a99905`（2026-07-23）。
- 许可证：仓库 `LICENSE` 与包元数据均为 MIT；包版本 `0.4.9`。

### 观察

1. 控制器把输入、相机、动画、载具分别拆为 `InputSystem`、`CameraSystem`、`AnimationSystem`、`VehicleSystem`，并提供键盘、程序化轴输入和移动端虚拟控件。
2. 静态碰撞使用 `three-mesh-bvh`：将胶囊段变换到碰撞网格局部空间后用 `boundsTree.shapecast` 推开；移动按胶囊半径分步，避免高速穿透。相机避障为从角色向相机位置的射线收缩。
3. 包的 peer dependencies 要求 `three >=0.180.0`、`three-mesh-bvh >=0.9.9`；当前项目的 Three.js 0.185.1 满足前者，但当前锁定的 `three-mesh-bvh` 为 0.8.3，未满足后者。
4. 它接管传入的 `OrbitControls` 并在 `player.update()` 内更新 controls；README 明确要求外部渲染循环不要再调用 `controls.update()`。
5. 示例仓库包含大量模型、HDR、3D Tiles 与图片。仓库对代码给出 MIT，但本次未逐一核验这些示例资产的单独授权来源。

### 对项目的判断

现有 `PlayableWanderer` 已拥有更贴合产品的自定义输入、角色动画、地图多边形碰撞与相机回退搜索。整包接入会产生双重输入监听、相机控制权竞争，并把二维可控边界换成需要完整三角面碰撞网格的路线，不能作为“即插即用”替换。

但它是目前 OpenThree 卡片中最值得学习的工程候选：可提炼为下一阶段的可选增强——仅当需要楼梯、坡面、复杂院落或真实建筑网格碰撞时，再在独立原型中验证 **BVH 碰撞层 + 现有 `PlayableWanderer` 的输入/相机合同**。验证应复用当前角色 GLB 和自建碰撞网格，不能使用该仓库示例资产。

### 最小试验与验收

1. 新建隔离的 R3F 原型，输入与镜头仍由现有 `inputState` 和相机逻辑所有；只替换“角色位置解析”层。
2. 使用单独、不可见的低面碰撞 GLB，不把高面建筑、道路或草地合为一个大碰撞盒。
3. 比较现有多边形层与 BVH 层在楼梯、窄入口、斜坡、贴墙、快速冲刺、移动端摇杆下的通过率和穿透率。
4. 通过 `npm test`、`npm run lint`，并在真实 `?start=` 页面完成桌面和触摸设备运行时验收后，才允许迁移任何碰撞逻辑。

## 候选二：THREE-CustomShaderMaterial

- OpenThree 卡片：`CustomShaderMaterial`，指向 `https://github.com/FarazzShaikh/THREE-CustomShaderMaterial`。
- 源码核验版本：`cf86e956715bd6cd97e7ae61ffdf459e4a4c822e`（2025-10-12，v6.4.0）。
- 许可证：MIT（`LICENSE.md`，Faraz Shaikh）。

### 观察

1. 该库在标准 Three.js 材质上注入 vertex/fragment GLSL，支持 `MeshPhysicalMaterial` 等基础材质；可输出 `csm_DiffuseColor`、`csm_Roughness`、`csm_Emissive` 等值，保留基础材质的光照链。
2. 包同时提供 Vanilla 与 R3F React 组件。peer dependencies 为 `three >=0.159`、`react >=18`、`@react-three/fiber >=8`，与当前 R3F 9.6.1 / Three.js 0.185.1 兼容。
3. React 实现仅在 `baseMaterial` 变化时创建实例；vertex shader、fragment shader、uniforms、patchMap 或 cacheKey 变动会 dispose/rebuild 材质。README 也明确要求 React 中 memoize uniforms，避免每次 render 触发重编译。
4. 已知限制：若使用 `csm_PositionRaw`，实例化变换须由调用方手动处理；与其他 `onBeforeCompile` 材质串联时可能因注入顺序或 GLSL 标识符冲突失败。

### 对项目的判断

这是唯一可在不更换现有 R3F/后处理架构下，直接补强场景“质感层”的候选。适合的第一处不是全场景滤镜，而是一个可撤销的局部材质：例如雨后石板路的湿润粗糙度变化，或一类梧桐树叶的轻微风摆与色彩变化。这样能利用现有 `meshPhysicalMaterial` / InstancedMesh 基础，又把 shader 编译、移动端耗时和艺术方向风险限制在一个资产组。

### 最小试验与验收

1. 只为一个独立资产组添加 `three-custom-shader-material`，不改变现有 `EffectComposer`、天空或全部建筑材质。
2. `vertexShader`、`fragmentShader`、`uniforms`、`cacheKey` 都以 `useMemo`/稳定模块常量提供；每实例仅更新 uniform 的 `.value`。
3. 若作用于 InstancedMesh，不使用未经验证的 `csm_PositionRaw` 路径；先用纯 fragment 级粗糙度/颜色变化试点。
4. 记录首次 shader 编译、桌面与 390px 触摸设备的 FPS/长任务、首屏资源及视觉截图；若出现 WebGL program error 或移动端回退，立即移除该试点而非扩大使用面。

## 候选三：threepipe

- OpenThree 卡片：`pipeEditor`，指向 `https://github.com/repalash/threepipe` 与其 editor。
- 源码核验版本：`52c3ec1730463d935a582cf999c3eecb0ac63c14`（2026-04-06）。
- 许可证：Apache-2.0；包版本 `0.5.1`。

### 观察

1. `ThreeViewer` 自带 scene、camera、Orbit Controls、导入导出器和默认渲染管线，再通过 plugins 增加后处理、材质、资产和序列化能力。
2. 它支持 React 包装，也另提供 `@threepipe/plugin-r3f` 的 `ViewerCanvas` / `Asset` / `Model` 入口；这仍是另一套 viewer 生命周期和插件体系。
3. README 宣称导出 GLB 时会将 viewer 与 plugin 设置序列化到自定义 extensions；只有加载端添加相应插件时，才会自动恢复插件数据。
4. 本次源码版本将 peer `three` 固定为 threepipe 的 `0.163.10003` 分发包，而当前项目使用 Three.js 0.185.1。

### 对项目的判断

不推荐在运行时引入 threepipe 或其 `ViewerCanvas`：它会与现有单 Canvas、相机、`@react-three/postprocessing` 和已验证的漫游状态并列，且 Three.js 版本不一致。也不应把 threepipe editor 导出的“带插件状态的 GLB”直接加入生产运行时；标准 `GLTFLoader` 可能忽略其私有 extensions，从而造成“资产能加载但效果/设置丢失”的隐性偏差。

可借鉴的仅是离线工作流：为重要 GLB 建立可复现的导入、材质、压缩、导出与截图检查单；必要时用 threepipe editor 手工检查一个非生产副本，但最终运行时仍以 Blender 产物、GLB audit 和当前 Three.js 页面为唯一验收对象。

## 不纳入本轮候选的边界

- OpenThree 的卡片目录是发现入口，不代表被收录项目的许可证、维护质量或资产授权。
- 未经独立源码与许可证核验的其他卡片（例如 3DGS、完整游戏、城市 demo）不作为本轮“可用项目”。
- 三个候选均没有被安装、没有复制第三方模型、没有改动运行时代码；本研究只沉淀可复核的选择与试验合同。

## 可追溯来源

1. OpenThree 目录卡片配置：`https://github.com/OpenThree/three-cesium-examples/blob/68c74b2c192220a1734276c5badf16eb5d747da9/config/github-examples.js`
2. `three-player-controller`：`https://github.com/hh-hang/three-player-controller/tree/4a5bb2ba5243869b17ef3b022527b26487a99905`
3. `THREE-CustomShaderMaterial`：`https://github.com/FarazzShaikh/THREE-CustomShaderMaterial/tree/cf86e956715bd6cd97e7ae61ffdf459e4a4c822e`
4. `threepipe`：`https://github.com/repalash/threepipe/tree/52c3ec1730463d935a582cf999c3eecb0ac63c14`
5. 当前项目对应实现：`app/scene/xinhua-world.tsx`、`app/xinhua-experience.tsx`、`app/scene/shared-street-assets.tsx`、`package.json`。
