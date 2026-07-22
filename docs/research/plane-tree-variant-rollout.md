# 梧桐树轻量多变体替换方案

## 目标

- 让项目中所有明确识别为上海梧桐／悬铃木的运行时对象继承 Hero 母版的连续根颈、低矮板根、斑驳树皮和高位分叉语言。
- 保留至少三种结构轮廓，避免整条街和院落中的梧桐树长得完全一样。
- 继续共享 Geometry 和 Material；树木数量增加时，draw call 不随单棵树线性增长。
- 只替换有明确语义证据的梧桐树，不把银杏、普通庭院树、灌木、花盆植物或未确认树种误换成梧桐。

## 证据母版

- 模型 Brief：`research/plane-tree-model-brief.md`
- 参考元数据：`research/plane-tree-reference-metadata.json`
- Hero 生成器：`research/source/create_plane_tree.py`
- Hero GLB：`public/models/building-evidence-lab/xinhua-plane-tree-hero.glb`
- Canonical 参考：`research/references/plane-tree/plane-tree-canonical.jpg`
- 街道树阵参考：`research/references/plane-tree/plane-tree-avenue.jpg`
- 树皮参考：`research/references/plane-tree/plane-tree-bark.jpg`

Hero 资产负责定义物种身份和近景质量，不直接批量复制到主场景。街景资产只继承经过确认的造型规则，并保持低多边形预算。

## 替换白名单

| 场景 | 当前实现 | 本轮处理 |
| --- | --- | --- |
| 新华路双侧树阵 | `plane-tree-a.glb`、`plane-tree-b.glb`、`plane-tree-c.glb` | 原路径原位升级为三种新版低模梧桐 |
| 幸福里倒影池旁 | `xingfuli-block.tsx` 中明确命名的 `PlaneTree` | 改用共享 GLB 的实例化变体 |
| 幸福里主通道 | `xingfuli-block.tsx` 中明确命名的 `PlaneTree` | 改用另一种共享 GLB 实例化变体 |
| Hero 检查页 | `xinhua-plane-tree-hero.glb?v=3` | 保留，继续作为近景母版和验收入口 |

## 明确排除

- `add_garden_tree` 生成的普通庭院树：没有梧桐树种证据，不替换。
- 德必、园区和其他场景中明确命名的银杏：不替换。
- 华山绿地、上生·新所中的通用乔木、灌木和树冠实例：没有明确梧桐语义，不替换。
- 花盆、树篱、绿墙和屋顶绿化：不属于梧桐树。
- 模型 Brief 中只作为街景背景提到“梧桐”的地标：若运行时没有独立梧桐对象，不修改地标 GLB 内部植被。

## 三种结构变体

### A：直立高冠

- 树干基本竖直，根颈均衡。
- 四向主叉，冠幅相对紧凑。
- 适合连续街道的基准树形。

### B：偏冠侧展

- 树干轻微倾斜，一侧枝条更长。
- 板根方向随倾斜方向改变。
- 树冠横向更宽，适合打破道路树阵节奏。

### C：开放多叉

- 五向主叉，中央留出更明显的树冠空隙。
- 根颈和板根更不对称。
- 轮廓更开阔，用作间隔出现的识别变体。

## 运行时方案

1. 三个 GLB 各加载一次。
2. 按变体和材质分组为 `InstancedMesh`。
3. 每棵树只记录位置、Y 轴旋转和三轴正缩放矩阵。
4. 使用树木 ID 的确定性哈希生成变体、方向和比例；禁止每帧随机。
5. 相邻树不得使用同一结构变体，避免显眼的重复节奏。
6. 幸福里与新华路共用同一模型缓存、Geometry 和 Material，不再保留独立的圆柱加球冠占位树。

## 性能预算

- 三个街景 GLB 合计目标不超过 `700 KB`。
- 每个 GLB 最多 `1` 个逻辑节点、`6` 个材质分片、`0` 图片、`0` 贴图。
- 全部梧桐树的 draw call 上限按 `3 个变体 × 6 个材质分片 = 18` 计算，不按树木数量增长。
- 实例矩阵只在初始化或布局变化时更新，不在动画帧中重建。
- 不为单棵树 clone Geometry 或 Material。
- Hero GLB 不进入普通街道和院落的实例批次。

## 交付与验收

- 更新确定性 Blender 生成器 `scripts/create_xinhua_road_models.py`。
- 重新生成 A/B/C 的 `.blend`、`.glb`、canonical 和 side 预览。
- 新增共享实例组件，新华路和幸福里均使用它。
- 自动测试证明白名单入口全部替换，并证明通用树种没有被误替换。
- GLB 审计节点、材质、图片、贴图和总体积。
- 在真实 Three.js 页面检查新华路连续树阵、幸福里两棵梧桐、Hero 页面、手机端和浏览器控制台。
- 通过后提交限定文件并发布到现有 Sites 项目。

## 2026-07-22 实施记录

- A/B/C 已由 Blender 5.2 LTS 重新生成；树干、根颈和六根低矮板根通过 `0.12 m` Voxel Remesh 焊成连续网格。
- 板根末端在模型中沉入 `Z<0`，运行时统一再下沉 `0.04 m`，隐藏低模焊接边缘但保留地表根颈。
- 三款 GLB 分别为 `224536`、`220232`、`237432` 字节，合计 `682200` 字节。
- 每款 GLB 均为 `1 node / 1 mesh / 6 materials / 0 images / 0 textures`。
- 新华路树阵按稳定 ID 哈希分配 A/B/C、朝向和三轴比例；相邻同侧树不会使用同一结构变体。
- 幸福里倒影池旁和主通道两棵明确命名的梧桐已改用同一个共享实例组件；普通庭院树、银杏、灌木和其他未确认树种未改动。
- `InstancedMesh` 的矩阵只在布局变化时写入；Geometry 和 Material 不做逐树 clone，draw call 上限保持为 `18`。
- Tailwind 和 TypeScript 的扫描范围排除了两个外部 3D 知识库链接，完整构建由卡住恢复为约 `0.3 s`，且不修改或删除知识库内容。
- GLB 审计通过；`npm test` 为 `90/90` 通过；`npm run lint` 通过。
- 本地静态验收入口：`http://127.0.0.1:3002/`。本轮应用内浏览器无可用实例，桌面/手机交互截图需在浏览器恢复后补录，不能用 Blender 渲染代替 Three.js 视觉验收。
