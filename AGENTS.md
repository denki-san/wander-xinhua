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

1. 预检 Blender、生成器、GLB 审计脚本、本地预览和浏览器验收入口；工具不可用时先记录回退路径；
2. 将参考照片保存到仓库内的 `docs/research/assets/`，并记录来源、主体、视角和获取日期；
3. 在 `docs/research/poi-reference-manifest.json` 或对应研究清单中关联本地照片；
4. 建立视角覆盖矩阵，至少覆盖 canonical、一个纵深/侧向视角、一个入口或身份细节视角；缺失面必须标记为未知；
5. 选择一张 canonical comparison view，并明确观察方向；
6. 使用 `docs/research/templates/blender-model-brief-template.md` 编写模型 Brief；
7. 将照片直接可见事实、合理推断和未知项分开记录；
8. 定义至少三处该主体独有的识别构件，以及比例、朝向、碰撞、屏幕占比和运行时预算。

未通过以上门槛，不得开始真实建筑建模。

### 执行规则

- 默认采用确定性的 Blender Python 生成器和 Headless Blender；保留可编辑 `.blend`。
- Blender MCP 只用于读取场景状态、局部视觉调整和缩短反馈循环。
- 通过 MCP 或人工 UI 完成的关键调整，必须回写生成器或受版本控制的参数；不得只存在于临时鼠标操作中。
- 按“体块灰模 → Three.js 灰模校准 → 身份构件 → 材质 → 场地 → 碰撞 → 优化”分批实施。
- 体块灰模完成后必须先进入实际 `?start=` 页面，确认比例、朝向、地面接触、相机、道路退界和基础材质可见；未通过不得开始身份细化。
- 每批完成后必须保存新产物，并生成或更新“参考照片 / Blender canonical / Three.js runtime”三联对照；不通过质量门时不得进入下一批。
- canonical 方向、画面占比、人物尺度和相机偏角必须写入 Brief，不能只凭主观截图判断。
- 优先支持单资产生成和验证；不得为了重建一个资产而无意覆盖其他资产产物。
- GLB 的 SHA、bounds、节点、三角面、材质、图片和文件体积必须记录为可追溯的 build record；缓存版本必须随实际二进制变化。
- 参考照片仅作为研究证据，不嵌入 GLB，不作为运行时贴图，不复制受保护商标。
- 不用单一大碰撞盒覆盖建筑群、广场、草坪、庭院和可步行道路。
- 独立审查至少前移到体块灰模和最终完成两个检查点；终审发现的结构问题必须回到对应批次修复。

### 必须交付

- 英文命名的 Blender Python 生成器；
- 可编辑 `.blend`；
- 英文命名的 `.glb`；
- 以 `test_` 开头的 canonical、侧向和运行时验收截图；
- 以 `test_` 开头的参考 / Blender / Three.js 三联对照图；
- 更新后的参考证据清单、Brief 和 Decision log；
- GLB build record、结构审计、自动测试和实际 Three.js 页面验收结果。

### 完成定义

Blender 渲染通过不等于完成。只有以下三层都通过才算完成：

1. Blender：轮廓、比例、身份构件、材质、灯光和固定机位预览；
2. GLB：节点、三角面、材质、贴图政策、根变换、体积和动画/骨骼；
3. Three.js：对应 `?start=` 入口中的位置、朝向、地面接触、碰撞、遮挡、相机、控制台、首屏资源和性能。

运行时验收应优先使用页面内可重复 QA 路径或确定性移动脚本，不把浏览器合成长按当作唯一碰撞证据。性能采样必须记录视口、预热时间、采样时长、页面可见性和构建模式；没有同条件基线时不得声称性能提升。

部署前必须运行 `npm test` 和 `npm run lint`，并保持同一提交通过本地、Sites 与 VPS 的发布验收。
