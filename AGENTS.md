# Wander Xinhua Agent Rules

## 语言与文件

- 所有用户沟通和代码注释使用简体中文；技术名称可以保留英文。
- 新建文件使用英文名称。
- 测试脚本、临时文档、临时日志和临时截图必须以 `test_` 开头。

## Blender 与 WebGL 资产工作流

新增或升级真实 POI、建筑、角色及重要环境资产时，必须执行
[`docs/research/blender-ai-workflow.md`](docs/research/blender-ai-workflow.md)。

涉及外部内容、视频拉片、专题调研或知识库沉淀时，必须执行
[`docs/research/content-research-wiki-workflow.md`](docs/research/content-research-wiki-workflow.md)。
原始素材只读保留；新增分析一律生成新文件，不覆盖或删除旧证据。

### 动工硬门槛

在修改生成器或打开 Blender 前，必须完成：

1. 将参考照片保存到仓库内的 `docs/research/assets/`，并记录来源、主体、视角和获取日期；
2. 在 `docs/research/poi-reference-manifest.json` 或对应研究清单中关联本地照片；
3. 选择一张 canonical comparison view，并明确观察方向；
4. 使用 `docs/research/templates/blender-model-brief-template.md` 编写模型 Brief；
5. 将照片直接可见事实、合理推断和未知项分开记录；
6. 定义至少三处该主体独有的识别构件，以及比例、朝向、碰撞和运行时预算。

未通过以上门槛，不得开始真实建筑建模。

### 执行规则

- 默认采用确定性的 Blender Python 生成器和 Headless Blender；保留可编辑 `.blend`。
- Blender MCP 只用于读取场景状态、局部视觉调整和缩短反馈循环。
- 通过 MCP 或人工 UI 完成的关键调整，必须回写生成器或受版本控制的参数；不得只存在于临时鼠标操作中。
- 按“体块 → 身份构件 → 材质 → 场地 → 碰撞 → 优化”分批实施。
- 每批完成后必须保存新产物并渲染检查；不通过质量门时不得进入下一批。
- 参考照片仅作为研究证据，不嵌入 GLB，不作为运行时贴图，不复制受保护商标。
- 不用单一大碰撞盒覆盖建筑群、广场、草坪、庭院和可步行道路。

### 必须交付

- 英文命名的 Blender Python 生成器；
- 可编辑 `.blend`；
- 英文命名的 `.glb`；
- 以 `test_` 开头的 canonical、侧向和运行时验收截图；
- 更新后的参考证据清单、Brief 和 Decision log；
- GLB 结构审计、自动测试和实际 Three.js 页面验收结果。

### 完成定义

Blender 渲染通过不等于完成。只有以下三层都通过才算完成：

1. Blender：轮廓、比例、身份构件、材质、灯光和固定机位预览；
2. GLB：节点、三角面、材质、贴图政策、根变换、体积和动画/骨骼；
3. Three.js：对应 `?start=` 入口中的位置、朝向、地面接触、碰撞、遮挡、相机、控制台、首屏资源和性能。

部署前必须运行 `npm test` 和 `npm run lint`，并保持同一提交通过本地、Sites 与 VPS 的发布验收。
