# Codex × Blender × Three.js 资产工作流

## 目标

这套流程把 Codex、Blender 和 React Three Fiber 组合成一个可追溯、可回退、可验收的 3D 资产生产系统。目标不是让 AI 一次“生成一个看起来不错的模型”，而是让每轮研究、建模、渲染、导出和运行时验证都有证据。

本项目的固定边界：

- `1 Blender 单位 = 1 场景单位 = 2.7 米`；
- Blender 模型正面默认朝本地 `-Y`；
- 参考照片只用于研究，不进入运行时贴图或 GLB；
- 每个命名地标至少有三处主体独有的识别构件；
- Blender 预览通过后，仍必须在真实 Three.js 页面验证。

## 资产证据链

```text
公开/用户参考资料
        ↓
仓库内本地参考图 + 来源元数据
        ↓
canonical comparison view + 模型 Brief
        ↓
确定性 Blender Python 生成器
        ↓
.blend + .glb + test_ 固定机位预览
        ↓
GLB 结构审计 + 自动测试
        ↓
Three.js ?start= 入口运行时验收
        ↓
Decision log + 生成器参数回写
```

## 阶段一：Research Gate

### 输入

- 可信来源中的正面、侧面、斜视、鸟瞰或细节图；
- OSM/Overpass 建筑轮廓、地址、层数和场地边界；
- 已知尺寸、道路退界和现场尺度信息；
- 当前运行时比例、碰撞、相机和美术语言。

### 必须完成

1. 将参考图片保存至 `docs/research/assets/`；
2. 在 `docs/research/poi-reference-manifest.json` 或专项 manifest 中记录：
   - 本地路径；
   - 原始 URL；
   - 主体和地址；
   - 视角；
   - 获取日期；
   - 版权使用边界；
3. 选择一张 canonical comparison view；
4. 使用 [Brief 模板](templates/blender-model-brief-template.md)；
5. 分开记录：
   - `observed`：照片、OSM 或明确文字能直接证明；
   - `inferred`：基于证据的合理补全；
   - `unknown`：当前证据无法判断。

### 退出条件

- 参考图已经本地化；
- canonical view 已明确；
- 至少三处身份构件已定义；
- 比例、朝向、落点与碰撞边界已定义；
- 未知项不会被伪装成确定事实。

## 阶段二：Quality Contract

Codex 开始建模前，必须先输出并获得可检查的质量合同：

| 维度 | 必须写清 |
| --- | --- |
| Identity | 轮廓与至少三处身份构件 |
| Position | 坐标来源，以及落点是否为推断 |
| Scale | 米制尺寸、2.7 米换算、允许的视觉校准范围 |
| Orientation | canonical view 方向、Blender `-Y` 正面、Three.js rotation |
| Geometry | 体块、窗门节奏、屋顶、场地、植被和需要省略的细节 |
| Runtime | GLB 大小、节点、三角面、材质、贴图、动画预算 |
| Collision | 实体阻挡、开放路径、相机净空、道路净距 |
| Validation | Blender 预览、GLB 审计、`?start=` 地址和运行时检查项 |

质量合同必须写入 Brief，不能只存在于聊天中。

## 阶段三：分批建模

推荐批次：

1. **Massing**：真实尺寸、主体轮廓、楼层与屋顶；
2. **Identity**：入口、窗门节奏、烟囱、塔楼、楼梯、招牌几何等身份构件；
3. **Material**：项目色盘、玻璃、金属、砖石、透明和发光材质；
4. **Site**：庭院、围墙、树池、铺装、水体和植被；
5. **Collision**：按实体拆分，保持入口、道路和开放空间可行走；
6. **Optimization**：合并静态节点、共享材质、实例化重复资产。

每批都执行：

```text
修改生成器
  → Headless Blender 重建
  → 保存 .blend
  → 导出 .glb
  → 渲染 test_ 固定机位预览
  → 与 canonical view 对照
  → 通过后进入下一批
```

## MCP 与 Headless Blender 的分工

### Headless Blender：默认生产路径

适合确定性生成、批量导出、回归测试和可重复交付：

```bash
BLENDER_BIN="/Applications/Blender.app/Contents/MacOS/Blender"

"$BLENDER_BIN" \
  --background \
  --python-exit-code 1 \
  --python scripts/create_requested_poi_models.py
```

具体生成器按资产类别选择：

- `scripts/create_xinhua_road_models.py`
- `scripts/create_requested_poi_models.py`
- `scripts/create_navy_club_model.py`
- `scripts/create_urban_wanderer_character.py`

### Blender MCP：视觉迭代路径

适合：

- 读取当前场景和对象层级；
- 调整相机到 canonical view；
- 检查比例、构图、材质和灯光；
- 快速定位穿模、漂浮、入口阻挡和视觉层级；
- 观察骨骼和动画。

MCP 不是资产真值来源。每次有价值的 MCP 修改都必须回写 Python 生成器、manifest 或运行时数据，再用 Headless Blender 重建验证。

## 阶段四：三层验收

### A. Blender 验收

- canonical、侧向、街道三种固定机位；
- 轮廓与身份构件在目标观看距离可读；
- 无明显穿模、漂浮、错误法线和不合理透明；
- 材质符合低饱和、手绘感、暖灰街区语言；
- `.blend` 可编辑，生成器可重复执行。

所有临时预览以 `test_` 开头。

### B. GLB 验收

- 根节点 translation 为 `[0, 0, 0]`；
- POSITION bounds 与运行时 localBounds 相符；
- 不嵌入参考照片；
- 节点、三角面、材质、贴图和文件体积符合 Brief；
- 静态节点在不破坏材质语义时合理合并；
- 角色资产检查 skin、骨骼、动画和循环边界。

结构审计只证明容器与策略合规，不证明视觉正确。

### C. Three.js 运行时验收

使用资产对应的 `?start=` 入口：

1. 等待相机和资源稳定；
2. 按 canonical view 的真实方向调整观察角；
3. 保存 `test_` 运行时截图；
4. 检查位置、比例、朝向和地面接触；
5. 检查人物、相机与建筑碰撞；
6. 检查道路、庭院、广场和入口可达性；
7. 检查浏览器控制台、首屏 GLB 请求和加载状态；
8. 比较改动前后的帧率与资源体积。

`docs/research/landmark-model-comparison.md` 的照片—运行时对照方式继续作为视觉验收基线。

## 阶段五：Decision Log 与完成定义

每轮在 Brief 末尾追加：

- 本轮实际修改；
- 哪些变化由照片直接支持；
- 哪些仍是推断；
- Blender、GLB 和 Three.js 验收结果；
- 性能变化；
- 未解决问题；
- 回退所需的源文件或提交。

完成必须同时满足：

- 参考证据和 Brief 完整；
- 生成器、`.blend`、`.glb` 和预览齐全；
- 三层验收通过；
- manifest 和运行时落点同步；
- `npm test` 和 `npm run lint` 通过；
- 不把部署完成与建模质量完成混为一谈。

## 首个推荐试点：FICS 新华 365

FICS 新华 365 同时包含花园洋房、工业改造楼、中高层建筑、开放广场、遮阳构件和外楼梯，适合验证完整流程。

建议拆分为：

1. 场地与各栋体量；
2. 红砖洋房与拱窗；
3. 工业楼和橙色外楼梯；
4. 六边形遮阳构件与红色艺术立面；
5. 广场、树阵和连通路径；
6. 碰撞、运行时优化和 canonical view 对照。

每批通过固定机位与 `/?start=xinhua365` 后再进入下一批。
