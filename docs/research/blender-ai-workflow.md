# Codex × Blender × Three.js 资产工作流 V2

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
工具链预检 + 旧资产基线
        ↓
仓库内本地参考图 + 来源元数据
        ↓
视角覆盖矩阵 + canonical comparison view + 模型 Brief
        ↓
体块灰模 + 确定性 Blender Python 生成器
        ↓
Three.js 灰模校准门
        ↓
.blend + .glb + test_ 固定机位预览
        ↓
参考 / Blender / Three.js 三联对照
        ↓
GLB build record + 结构审计 + 自动测试
        ↓
Three.js ?start= 入口脚本化运行时验收
        ↓
独立终审 + Decision log + 生成器参数回写
```

## 阶段零：Preflight Gate

开始研究或修改生成器前，先验证本轮真实会用到的工具链：

- Blender 实际二进制与版本；
- 目标生成器能否按单资产运行，或是否会连带覆盖其他资产；
- GLB 审计脚本及依赖；
- 本地静态预览命令、端口和目标 `?start=`；
- Browser、Chrome 或其他实际页面验收路径；
- 当前 GLB、运行时截图、bounds、碰撞和性能基线。

预检失败不等于可以跳过验收。必须在 Brief 中记录失败、替代路径和恢复条件，且不得用旧截图冒充当前产物。

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

同时建立视角覆盖矩阵。最低覆盖要求不是“有三张图”，而是三张图承担不同职责：

| 证据槽位 | 至少解决的问题 |
| --- | --- |
| Canonical | 主轮廓、横向比例、身份构件总体关系 |
| 侧向或斜向 | 纵深、侧翼、屋顶连接和前后层级 |
| 入口或细节 | 门廊、招牌、楼梯、窗门节奏或独有构件 |
| 场地关系（适用时） | 道路退界、围墙、庭院、树木和开放路径 |

每个身份构件必须能回指至少一张本地证据。找不到侧面、背面或屋顶证据时，应降低对应面的细节承诺并写入 `unknown`，不得把想象补全包装成观察事实。

### 退出条件

- 参考图已经本地化；
- canonical view 已明确；
- 视角覆盖矩阵已完成，且缺口有明确降级策略；
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
| Framing | canonical 偏角、建筑目标画面占比、人物与入口尺度关系 |
| Geometry | 体块、窗门节奏、屋顶、场地、植被和需要省略的细节 |
| Runtime | GLB 大小、节点、三角面、材质、贴图、动画预算 |
| Collision | 实体阻挡、开放路径、相机净空、道路净距 |
| Build provenance | 单资产命令、产物路径、SHA、bounds、cacheVersion 和旧基线 |
| Validation | 灰模运行时门、三联对照、GLB 审计、`?start=` 地址和运行时检查项 |

质量合同必须写入 Brief，不能只存在于聊天中。

## 阶段三：体块灰模与提前运行时门

第一批只建立主体体块、楼层、屋顶、主要开口和大尺度场地边界，不先做栏杆、瓦垄、招牌、桌椅或植物。

灰模必须先导出临时 GLB 并进入真实 Three.js `?start=` 页面，验证：

1. 运行时材质实际可见，不存在“资源加载成功但模型不绘制”；
2. 模型默认 `scale` 接近 `1.0`，人物、门和楼层关系合理；
3. canonical 方向与相机候选可复现；
4. 建筑目标画面占比落在 Brief 区间；
5. 地面接触、道路退界、人物出生点和首帧相机安全；
6. 主体碰撞不会封闭入口、庭院或广场。

灰模运行时门未通过时，修正体块、落点、朝向或相机，不得用全局放大缩小掩盖错误，也不得进入身份细化。

## 阶段四：分批细化

推荐批次：

1. **Massing**：真实尺寸、主体轮廓、楼层与屋顶；完成后必须通过灰模运行时门；
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
  → 更新参考 / Blender / Three.js 三联对照
  → 通过后进入下一批
```

三联对照必须记录建筑屏幕宽度、canonical 方向偏角、画面是否裁切、人物尺度和本批身份构件可读性。独立审查至少在 Massing 和最终完成时各执行一次，避免把体块或连续性问题留到收尾。

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

生成器应优先支持 `--asset <slug>` 或等价的单资产入口。若旧生成器只能批量运行，执行前必须记录会被覆盖的产物并保护无关工作区修改。

### Blender MCP：视觉迭代路径

适合：

- 读取当前场景和对象层级；
- 调整相机到 canonical view；
- 检查比例、构图、材质和灯光；
- 快速定位穿模、漂浮、入口阻挡和视觉层级；
- 观察骨骼和动画。

MCP 不是资产真值来源。每次有价值的 MCP 修改都必须回写 Python 生成器、manifest 或运行时数据，再用 Headless Blender 重建验证。

## Build record

每次正式导出后，使用 [build record 模板](templates/model-build-record-template.json) 或同结构资产级 JSON 记录：生成命令、Blender 版本、生成器路径、`.blend`/`.glb` 路径、SHA-256、bounds、节点、网格、三角面、材质、图片、文件体积和运行时 `cacheVersion`。缓存版本必须随实际二进制变化，禁止复用旧截图或旧哈希证明新产物。

## 阶段五：三层验收

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
8. 使用页面内 QA 路径或确定性移动脚本走向入口并绕行主体；
9. 比较改动前后的帧率与资源体积。

性能采样固定记录视口、构建模式、预热时间、采样时长、标签页可见性、帧数、FPS、GLB Resource Timing 和 JS heap。只有基线与新版处于同一条件时才能声称性能提升；开发 HMR、浏览器扩展和验收工具噪声必须与应用错误分开记录。

浏览器工具无法发送连续原始按键时，不得把合成长按当作唯一碰撞证据。优先由页面自身执行确定性移动；尚无页面内 QA 时，使用几何测试与实际首屏作为降级证据，并在 Brief 中明确限制。

`docs/research/landmark-model-comparison.md` 的照片—运行时对照方式继续作为视觉验收基线。

## 阶段六：独立终审、Decision Log 与完成定义

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
- 灰模运行时门和参考 / Blender / Three.js 三联对照有记录；
- build record 与当前二进制、运行时缓存版本一致；
- 三层验收通过；
- manifest 和运行时落点同步；
- Massing 与最终完成两个独立审查检查点均已关闭 blocker；
- `npm test` 和 `npm run lint` 通过；
- 不把部署完成与建模质量完成混为一谈。

## V2 首轮执行原则

下一项真实地标升级直接作为 V2 试点。先完成 Preflight、证据覆盖矩阵和灰模运行时门，再细化身份构件；同时补齐单资产生成、build record、三联对照和页面内 QA。不得为验证流程而重做已经通过的资产，也不得把尚未实现的自动化写成已通过证据。
