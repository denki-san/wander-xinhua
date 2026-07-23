# Xinhua Scene Dressing Kit

## 目的

幸福里不应继续把每一盏灯、每一套餐桌和每一种盆栽写成仅供单场景使用的 JSX。项目需要一层可复用、可实例化、受通行规则约束的 `Scene Dressing Kit`，让真实 POI 只选择“资产变体 + 语义锚点”，而不是复制模型代码。

本方案吸收项目外部 3D 知识库中 SUMMERHOUSE 的小资产库、Tiny Glade 的上下文细节规则和新华路梧桐建模经验；它们只提供方法，不替代幸福里实景照片。

## 分层原则

1. `L1 landmark`：幸福里两侧建筑体量、水景池体、入口墙等独有硬表面，由幸福里 Blender GLB 承担；精确七段是当前布局推断，不作为照片直接观察事实。
2. `L2 grammar`：窗、雨棚、阳台、格栅和店面按建筑身份生成，不做完全随机排列。
3. `L3 dressing`：街灯、桌椅、伞、长椅、花箱、矮石桩、铺石和植被做成项目级可复用组件，位置由稳定 seed 与语义锚点控制。

## 首批资源契约

| 资源 ID | 变体 | 幸福里实景依据 | 项目复用场景 | 运行时策略 |
| --- | --- | --- | --- | --- |
| `lane-lamp-short-arm` | 单短臂、双向错列 | 细深灰灯杆、短横臂 | 商业巷、园区步道、里弄入口 | 共享 geometry/material；只有关键灯有 PointLight |
| `cantilever-umbrella` | 珊瑚红、暖灰 | 侧柱、悬臂、近方形伞面 | 咖啡外摆、花园、广场 | 纯几何组件；伞面不进角色碰撞 |
| `outdoor-table-set` | 白色塑料、深木金属、彩色折叠 | 三类照片可见座椅 | 餐饮、社区庭院、活动区 | 稳定变体，不随机缩放整个模型 |
| `slatted-bench` | 有靠背、无靠背 | 木条面、深灰脚 | 线性公园、POI 入口、水景 | 共享组件；底座可选简化碰撞 |
| `rectangular-planter` | 低长、方盆、高盆 | 店面和水景周边深色花箱 | 屋顶、店面、入口、庭院 | 植物结构变体与容器分离 |
| `irregular-stone-bollard` | 深色矮方柱、轻微斜置、低方块 | 番禺路入口石桩 | 院落入口、步行边界 | 只在真实证据支持时使用；不得替换成浅色尖顶多面体 |
| `mixed-gray-paving` | 3 色、4 长度、错缝 | 多尺寸矩形灰石 | 步行巷、庭院、广场 | InstancedMesh，稳定 seed，无图片贴图 |
| `plane-tree` | A/B/C 三种结构 | 现有新华路与幸福里池中树 | 主街、庭院、绿地 | 复用 `PlaneTreeInstances`，结构变体优先于整体随机缩放 |

## 语义元数据

每个实例至少包含：

- `assetId`：稳定资源 ID；
- `variant`：结构或材质变体；
- `anchor`：`entrance`、`storefront`、`waterside`、`courtyard`、`road-edge`；
- `seed`：由 POI ID 和锚点导出的稳定整数；
- `footprint`：底座占地，用于净空审计；
- `collision`：`none`、`base-only` 或显式盒；
- `mobileTier`：`essential`、`reduced`、`desktop-only`；
- `evidenceRef`：该 POI 的本地证据路径，避免把通用资产错误用到无证据场景。

## 放置约束

- 主通道、入口和桥面为 forbidden zone，不用“看起来随机”的街具侵占通行。
- 外摆优先贴近店面或水景锚点，桌椅朝向由立面法线决定。
- 灯具沿路径切线排布并交错，不因缩放制造结构变体。
- 乔木使用不同枝干结构，冠幅只允许小范围稳定扰动；树干与地面必须有根颈过渡。
- 资源变体和 seed 写入代码或数据，不依赖 `Math.random()`。
- 品牌、海报、照片和可读店名不进入通用资产。

## 幸福里首轮落地

- `app/scene/shared-street-assets.tsx`：灯、伞、桌椅、长椅、花箱和矮石桩。
- `app/scene/mixed-stone-paving.tsx`：三色错缝铺地实例批次。
- `app/scene/plane-tree-instances.tsx`：继续作为乔木资产池，不重复造树。
- `app/scene/xingfuli-block.tsx`：只保留幸福里锚点、变体选择、水面、喷泉、碰撞和三段 GLB 装配。

## 质量与预算

- 首批通用资产单件目标 `1,500–3,000` 三角面以下；小物件优先更低。
- 同类资源共享 geometry/material；重复数量较多时必须实例化。
- 近景轮廓和主体独有结构优先于隐藏面细分。
- 移动端可减少桌椅和花盆数量，但入口灯、水景、池中树和一组红伞属于 essential。
- 每次复用都要证明 `evidenceRef` 与通行约束，不能因为“库里有”就任意铺满场景。

## 幸福里最终验证

- 观察：最终页面实际使用三种梧桐、六盏实例化短臂灯、两把红色悬臂伞、三类桌椅、长凳、四个花箱和五个番禺路入口深色膝高矮方石桩；未在无证据的幸福路入口做对称补造。
- 观察：混合灰石铺地按 4 种长度 × 3 个近似灰色组织为 12 个实例批次，沿长轴错缝，不使用图片贴图。
- 观察：桌高为 `0.65–0.68`、座高为 `0.44–0.45`、椅背最高约 `0.99` 本地单位；真实页面近景按人物尺度复核。
- 观察：建筑、池两侧水体、入口构件、桌椅、长凳、四个花箱、五个入口石桩、树和灯只以实体底座进入简化碰撞；四个可视花箱 ID 与碰撞 ID 一一对应，三条确定性路线逐段采样，覆盖两入口、池北侧和木桥。
- 观察：最终三段 GLB 共 `19,224` triangles、`3` nodes、`1,370,828` bytes、`0` images；1920×851 可见页、预热 7 秒的 120 帧原始样本平均 `60.16 FPS`、P95 `17.3 ms`，样本、CDP 指标、三段 GLB Resource Timing 与 console 来源保存在 `test_artifacts/test_xingfuli_final_runtime_metrics.json`。
- 推断边界：以上性能只描述本轮同页样本；历史基线条件不同，不声明性能提升。
- 来源：`docs/research/build-records/xingfuli.json`、`docs/research/xingfuli-model-brief.md`、`test_artifacts/test_xingfuli_final_runtime_metrics.json`、`tests/test_xingfuli_models.test.mjs`。

## 知识库同步

本文件是可追溯本地知识源。最终完成前必须同步到项目指定 LLM Wiki，确认队列为空，并用搜索、读取和来源回溯验证可检索性；同步失败时只能标记为本地待同步，不能宣称知识库沉淀完成。
