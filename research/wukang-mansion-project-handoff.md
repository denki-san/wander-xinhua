# 武康大楼 WebGL 建模项目交接

更新日期：2026-07-19
当前工作目录：`/Users/lei/App_developing/CurateFlow/building-evidence-lab`

## 1. 项目背景

这个 Demo 是「新华 Wander / 新华 Wonder」体系里的建筑照片证据实验台，用来验证：

> 如何从少量真实建筑照片中提取可靠的轮廓、比例、材质和构件节奏，生成可编辑、可追溯、适合 Three.js 实时运行的低多边形建筑资产。

本轮目标建筑是上海武康大楼。用户提供了四张本地照片，包括街角、航拍、屋顶轮廓和圆角立面细节。照片只作为建模证据保存，不作为运行时纹理嵌入 GLB。

## 2. 当前完成情况

- 已保存四张用户参考照片和元数据。
- 已完成武康大楼模型 brief，区分照片实证与人工推断。
- 已编写确定性 Blender Python 生成器。
- 已生成可编辑 `.blend` 源文件。
- 已生成 Three.js 使用的 `.glb`。
- 已生成固定机位预览图。
- GLB 已合并为 7 个运行节点、7 个材质，不含图片和纹理。
- 已加入 Building Evidence Lab 的真实 POI 案例列表。
- 已增加武康大楼的分析预设、卡片图标、证据 manifest 和自动测试。
- 项目构建和测试通过。
- 本地预览正在 `http://localhost:3000/` 运行，页面里已选中「武康大楼」。
- Sites 线上版本尚未更新；当前线上 URL 仍是旧版本。

当前线上项目：

- URL：`https://xinhua-building-evidence-lab.berry-fig-9187.chatgpt.site/`
- Sites project ID：保存在 `.openai/hosting.json`，换目录时必须原样保留，不能新建另一个 Site。

## 3. 参考照片

目录：

`research/references/wukang-mansion/`

文件：

- `aerial-canonical.jpg`：主比较机位，确认长条体量、圆角西端和城市路口关系。
- `aerial-footprint.jpg`：确认屋顶、后部附属体量和狭长平面。
- `street-corner.jpg`：确认首层拱廊、楼层数量和长立面节奏。
- `corner-detail.jpg`：确认红砖、石材、竖窗、阳台和圆角塔头细节。
- `metadata.md`：照片来源与用途说明。

照片是用户在 2026-07-19 提供的本地文件，不能当作网页运行时贴图。

## 4. 识别性建模结论

武康大楼至少需要保留以下四个特征，缺少其中两项时就容易退化成普通红砖公寓：

1. 船头般的连续圆角西端。
2. 首层灰色石材连续拱券柱廊。
3. 七层密集红砖窗格与外挑阳台。
4. 顶部两道浅色水平檐带与暗灰平屋顶。

当前模型为了 WebGL 展示对真实长度做了压缩，但保留了“圆头 + 极长立面”的比例差。后立面、空调外机、住户晾晒、广告和精确屋面机电暂时省略。

## 5. 完整管线

### 阶段 A：检查目标项目

先确认：

- Three.js / React Three Fiber 的版本和加载方式。
- 世界比例、坐标轴和建筑正面方向。
- 相机、碰撞、道路、地面、雾效与灯光。
- 已有模型的材质风格与性能预算。
- `.openai/hosting.json` 是否存在；存在时必须复用原 `project_id`。

本项目使用 Three.js，GLTFLoader 会：

1. 读取 GLB。
2. 翻转 Blender 轴向。
3. 根据包围盒居中和落地。
4. 按 `targetWidth` 缩放到工作台尺寸。

### 阶段 B：建立照片证据包

在建模前完成，这是硬性 gate：

1. 把真实参考照片保存到仓库的 `research/references/<asset>/`。
2. 记录来源、日期、观察方向和使用目的。
3. 指定一张 canonical comparison view。
4. 区分 confirmed facts 与 explicit inferences。
5. 禁止从网页 URL 直接跳到建模，也不能把照片打进 GLB。

### 阶段 C：写模型 brief

模型 brief 至少记录：

- 建筑名称与地址。
- 风格化程度。
- 米制比例和轴向。
- 轮廓与主次体量。
- 立面开窗节奏。
- 屋顶和檐口。
- 材质色板。
- 三个以上的专属识别特征。
- 要保留的街区环境。
- 主动省略的细节。
- 碰撞与相机净空。
- 所有显式推断。

本轮 brief：

`research/wukang-mansion-model-brief.md`

### 阶段 D：Blender 确定性建模

生成顺序：

1. 主轮廓和圆角塔头。
2. 石材基座与红砖楼层。
3. 屋面、檐口和屋顶附属体量。
4. 重复窗格。
5. 阳台板与铁栏杆。
6. 首层拱券和立柱。
7. 固定灯光、相机和预览。

先保存包含独立命名构件的 `.blend`，保证后续可编辑；再按材质合并运行时网格，降低 Three.js 节点与 draw call。

生成器：

`research/source/create_wukang_mansion.py`

源文件：

`research/source/wukang-mansion.blend`

### 阶段 E：导出和资产审计

运行时文件：

`public/models/wukang-mansion.glb`

验收要求：

- 不包含用户参考照片。
- 不包含图片纹理。
- 节点数控制在 8 以内。
- 材质分离合理：红砖、浅红砖、石材、檐口、屋顶、玻璃、铁件。
- 资产原点、地面接触和轴向正确。

当前审计结果：

- 文件约 3.39 MB。
- 7 nodes。
- 7 meshes。
- 7 materials。
- 0 images。
- 0 textures。
- 状态通过。

### 阶段 F：固定机位预览

预览文件：

`research/previews/test_wukang-mansion_preview.png`

预览的作用是快速发现：

- 轮廓是否一眼可认。
- 圆角端是否成立。
- 窗、阳台、拱券的尺度是否协调。
- 材质层级是否读得出来。

Blender 预览通过不等于网页集成通过。

### 阶段 G：Three.js 集成

主要修改文件：

- `app/WonderWorkbench.tsx`
  - 注册 `wukang-mansion` POI。
  - 配置模型路径、展示宽度、朝向、证据、识别特征与置信度。
- `app/lib/image-analysis.ts`
  - 增加武康大楼的照片分析预设。
- `app/globals.css`
  - 案例列表改为 2×2。
  - 增加武康大楼卡片图标。
- `research/poi-evidence-manifest.json`
  - 登记参考图、模型、源文件、生成器、预览、证据与推断。
- `tests/rendered-html.test.mjs`
  - 检查页面文案和所有交付资产是否存在。

### 阶段 H：运行时复核

必须在真实 Three.js 页面检查：

1. 武康大楼卡片能够唯一选中。
2. GLB 加载状态变为 ready。
3. 模型正确落地、居中、缩放。
4. canonical、quarter、top、street 四个机位都不会穿模。
5. Wander 模式键盘移动不会进入建筑主体。
6. 浏览器没有模型加载或 WebGL 错误。
7. 截图方向与 canonical 照片的观察方向可比较。
8. 抽样检查帧率和交互响应。

当前已确认：

- 武康大楼卡片存在。
- 卡片可以选中。
- 模型加载状态为 ready。
- 页面控制台没有模型自身错误。

尚未完成：

- 四机位逐一截图对照。
- 武康大楼专属碰撞体。
- 实际 FPS 抽样。
- 长立面在小屏幕上的构图优化。

### 阶段 I：Sites 构建与发布

发布顺序：

1. 完整构建。
2. 自动测试。
3. 提交确切源码状态。
4. 用 Sites 脚本打部署包。
5. 将同一个提交推送到 Sites 源仓库。
6. 保存 Site version。
7. 优先私有部署。
8. 轮询直到部署成功。
9. 用最终生产 URL 打开浏览器。

本轮构建和测试已经通过，但 Sites connector 暂时拒绝保存和部署接口，所以生产站仍是旧版本。本地新版可继续使用。

## 6. 在新文件夹中继续

建议整体复制 `building-evidence-lab`，不要只复制 GLB。必须保留：

- `.git/`
- `.openai/hosting.json`
- `app/`
- `public/models/`
- `research/`
- `tests/`
- `package.json`
- `package-lock.json`

复制后：

1. 确认 Node.js 满足项目要求。
2. 安装依赖。
3. 启动本地开发页面。
4. 打开 `http://localhost:3000/`。
5. 点击「武康大楼」案例。
6. 优先完成运行时机位、碰撞和构图复核。
7. Sites 恢复后复用原 project ID 发布。

## 7. Git 与工作区注意事项

武康大楼功能提交已经在历史中。当前仓库还有与梧桐树和外部小红书研究有关的未提交变化，这些不属于武康大楼交接范围，不要在移动时删除或覆盖：

- `README.md`
- `app/PlaneTreeViewer.tsx`
- `research/plane-tree-model-brief.md`
- `research/source/create_plane_tree.py`
- `research/codex-blender-playbook.md`
- `research/external-xhs/`

复制目录是最安全的方式；不要用 `git reset --hard` 或清理未跟踪文件。

## 8. 下一步优先级

1. 为武康大楼添加专属相机配置，让 canonical 机位更接近用户航拍照片。
2. 把通用矩形碰撞改为狭长主体 + 圆角塔头的组合碰撞。
3. 给拱廊增加更明确的拱顶切口，而不只是视觉 archivolt。
4. 调整圆角塔头阳台栏杆，让它们更接近照片中的分段弧线。
5. 对四个视角做截图和 reference side-by-side。
6. 抽样记录 FPS、GLB 下载大小和首次 ready 时间。
7. Sites 恢复后发布到原线上地址。

## 9. 可直接交给下一位 Codex 的任务描述

> 继续 `/Users/lei/App_developing/CurateFlow/building-evidence-lab` 的武康大楼照片证据建模项目。先读 `research/wukang-mansion-project-handoff.md`、`research/wukang-mansion-model-brief.md` 和 `research/references/wukang-mansion/metadata.md`。保留所有现有未提交的梧桐树与小红书研究文件。不要重做模型；从运行时 QA 开始：为武康大楼增加专属 canonical/quarter/top/street 相机和组合碰撞，完成截图、控制台错误与 FPS 检查，然后在 Sites 恢复后复用 `.openai/hosting.json` 的原 project ID 发布。
