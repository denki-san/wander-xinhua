# Meshy Agent 街景资产批次 Model Brief

## 1. 范围与硬边界

- Batch ID: `meshy-agent-street-assets-20260728`
- Product: 漫步新华
- Scope: 10 件通用共享街景候选，不授权任何具体地点的摆放
- Source route: Meshy Agent 网页 2D → 3D，非 API
- Meshy source snapshot: `2026-07-28-2ca6310`
- Final evidence snapshot: `2026-07-28-meshy-agent-street-assets-final-2ca6310`
- Source truth:
  `repository/test_artifacts/test_meshy_agent_batch_20260728/`
- Runtime QA route: `/nonbuilding-evidence-qa?asset=<asset-id>&distance=<meters>`
- Unit contract: 可编辑 Blender master 以米建模；运行时 GLB 在导出阶段按
  `1 scene unit = 2.7 m` 烘焙，build record 同时保留米制目标与运行时 bounds
- Texture contract: 零图片、零独立纹理；只用项目共享低模色板

当前证据只能支持“这些通用类别和轮廓可作为共享候选”，不能证明新华路任意地点都存在
同款物体。具体地点接入前仍须重新审核该地点照片、朝向、数量、尺度和遮挡。

## 2. 动工前预检

| Gate | 结果 |
| --- | --- |
| Blender | `5.2.0 LTS` 可用 |
| 确定性生成器入口 | `scripts/create_meshy_agent_street_props.py` |
| GLB 结构审计 | `scripts/audit_glb.py` 可用 |
| 本地预览 | Next.js 开发服务器 |
| 浏览器验收 | `/nonbuilding-evidence-qa` |
| 动态证据 | 源快照 `2026-07-28-2ca6310`；最终快照 `2026-07-28-meshy-agent-street-assets-final-2ca6310`，两者 SHA 全部通过 |
| 原始 GLB | 10 个选中候选 + 1 个失败版本 + 4 个替代版本，永不覆盖 |
| 视角覆盖 | 每件有 canonical；缺少的后侧/底部明确标为未知 |

## 3. 统一艺术与运行时合同

- stylized low-poly，少而大的切面；
- 低饱和深绿、暖灰、深木、珊瑚红与低饱和蓝；
- 轮廓和三处身份构件优先于微小曲面；
- 不生成文字、Logo、品牌、贴花和独立 PBR 贴图；
- 默认 visible-low 一档；高重复资产必须通过 triangle 上限；
- 树和自行车若只能保留 Hero 结构，不得冒充高重复版；
- 地面资产以底部中心为原点；空调另设墙面锚点；
- 正面/前进方向写入节点 metadata，不靠截图猜测。

Canonical 对比方向：从资产正前方偏右约 `25°`、略高于主体中心观察。树和自行车采用
能最大化识别轮廓的侧向偏转。目标屏幕占比为 canonical 图 `65%–80%`；side 图
`55%–75%`。

## 4. 逐件合同

| Asset ID | 用途与最大重复数 | 真实尺寸 | 三处必须保留的识别构件 | 预算 |
| --- | --- | --- | --- | --- |
| `plane-tree-straight-sparse` | 行道树近景候选；正式高重复版前最多 4 个 | 高 10 m，地点校准范围 9–11 m | 单一连续主干；疏松分层树冠；叶簇间可见空隙 | 近景 ≤4,000 tris；≤6 材质；0 images；≤900 KiB |
| `lane-lamp-short-arm` | 里弄路灯；重复 ≤24 | 高 3.36 m | 细长灯杆；约 0.5 m 短臂；克制八边形灯罩 | ≤1,500 tris；≤4 材质；0 images；≤256 KiB |
| `slatted-bench-backrest` | 店前/水边长椅；重复 ≤12 | 2.08 × 0.82 × 0.93 m，座高约 0.48 m | 可见条板缝；深灰支架；四个可信落地点 | ≤2,500 tris；≤4 材质；0 images；≤256 KiB |
| `street-planter-long` | 店前/水边花箱；重复 ≤16 | 1.40 × 0.54 × 0.55 m | 清晰槽口；可见土层；2–3 团叶簇 | ≤1,500 tris；≤5 材质；0 images；≤192 KiB |
| `stone-bollard-squat` | 入口/边界石桩；重复 ≤32 | 0.60 × 0.52 × 0.75 m | 矮方轮廓；不规则侧面；斜切顶面 | ≤500 tris；≤2 材质；0 images；≤96 KiB |
| `shanghai-dual-classification-bin` | 沿街垃圾桶；重复 ≤20 | 0.90 × 0.46 × 0.91 m | 双投口；中缝；银灰/蓝色分区 | ≤1,200 tris；≤5 材质；0 images；≤192 KiB |
| `cantilever-cafe-umbrella` | 餐饮外摆；重复 ≤8 | 2.80 × 2.80 × 2.57 m | 方形伞面；侧置支架与悬臂；低矮配重底座 | ≤2,000 tris；≤4 材质；0 images；≤256 KiB |
| `outdoor-dining-dark-wood` | 一桌两椅组合；重复 ≤8 | 约 2.40 × 2.20 × 0.90 m；桌高 0.68 m | 单张长方桌；两椅相对；所有腿独立落地 | ≤3,000 tris；≤4 材质；0 images；≤320 KiB |
| `vintage-step-through-bicycle` | 近景身份道具；重复 ≤4 | 长 1.76 m、高 1.10 m、轮径约 0.66 m | 两轮闭环；弯梁车架；前篮、后架和挡泥板 | ≤5,000 tris；≤6 材质；0 images；≤700 KiB |
| `wall-ac-outdoor-unit` | 立面生活细节；重复 ≤24 | 0.80 × 0.32 × 0.55 m | 闭合箱体；单个大风扇圆环；百叶与双托架 | ≤1,000 tris；≤4 材质；0 images；≤160 KiB |

## 5. 观察、推断与未知

### 直接可见

- 每件原始 Meshy 候选的 canonical 轮廓、底部接触关系和主要构件；
- Viewer/GLB 的实际 triangles、vertices、bounds、节点和零贴图状态；
- 低目标 Remesh 对树、灯、垃圾桶、伞和自行车造成的结构破坏；
- 选中版本及所有失败版本已经存在于不可变外置快照。

### 合理推断

- 户外桌椅总体高度按椅背约 `0.90 m` 设置，置信度 `0.70`；
- 自行车下载高度 `1.10 m` 能同时形成 `1.76 m` 长度，置信度 `0.82`；
- 通用色板来自现有漫步新华视觉系统，不代表真实厂商涂装，置信度 `0.85`；
- 后侧和底部采用保守、无品牌结构，置信度 `0.65`。

### 未知

- 具体厂商、产品型号、生产年代和精确材料；
- 未拍到的背面、底部、紧固件和排水；
- 每件物体在具体地点的真实尺寸、数量、朝向与维护状态；
- 当前 Meshy 生成物与任何真实单体之间的一一对应关系。

未知项不得用文字、品牌、铭牌或写实磨损进行虚构。

## 6. 分批实施与停止条件

1. 导入不可变 Meshy 源，校验 SHA 和 bounds；
2. 只生成新的 editable `.blend` 和 `visible-low.glb`，不覆盖源；
3. 校正真实尺寸、原点和朝向；
4. 对可安全保真的模型做受控 Blender Decimate；
5. 若高重复资产仍超过上限或出现破洞，改为确定性/混合重建；
6. 按位置与高度给单 mesh 分配共享色板；
7. 输出 canonical、side、detail 三视图；
8. 运行 GLB 结构、triangle、材质、图片、bounds 和字节审计；
9. 进入 `/nonbuilding-evidence-qa` 做真实 WebGL 验收；
10. 未通过的资产保持 candidate/rejected 状态，不进入正式地图。

## 7. 按真实大小与用途选择 QA 参数

不能用同一个 4 米机位和同一个隐藏距离审核所有物体。大物体需要更远的 canonical
距离；高大且仍在远景贡献轮廓的物体也不能沿用小街具的 `18 m` 隐藏线。

| Asset ID | 推荐审核距离 | hidden 距离 | 安装/接触 |
| --- | ---: | ---: | --- |
| `plane-tree-straight-sparse` | `24 m` | `50 m` | 地面中心，视线瞄准约 5 m 高 |
| `lane-lamp-short-arm` | `10 m` | `28 m` | 底座中心 |
| `cantilever-cafe-umbrella` | `10 m` | `28 m` | 配重底座中心 |
| `outdoor-dining-dark-wood` | `4 m` | `20 m` | 组合落地包络中心 |
| `vintage-step-through-bicycle` | `4 m` | `20 m` | 两轮接地中心 |
| 其他地面小街具 | `4 m` | `18 m` | 底面中心 |
| `wall-ac-outdoor-unit` | `4 m` | `18 m` | 背面中心锚点，QA 安装高度 `2.2 m` |

这些数值是本批隔离 QA 的已验证初值。接入具体地点时仍要按屏幕占比、重复数量、
遮挡和移动端基线重新确认。
