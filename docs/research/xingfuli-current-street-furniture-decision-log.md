# Xingfuli Current Street Furniture Decision Log

## Iteration 1 — 2026-07-25

- Scope: 冻结 4 个当前幸福里街具模型，正式地图实例数为 0。
- Evidence used: 小红书帖子 `682071e0000000000303e0ba` 的 6 张本地证据图；
  原图继续只读保留在 U 盘。
- Compatibility: 不覆盖 2018 年 `irregular-stone-bollard` 或共享
  `rectangular-planter`；不触碰 18 栋建筑三档资产。
- Runtime contract: editable Hero master 派生唯一 `visible-low` GLB；远处
  `hidden`，不制作非建筑 Massing。
- Hold: 人物雕塑、导视墙、店铺招牌和临时餐牌。
- Runtime result: Pending。
- Performance impact: Pending；本批不进入正式地图和首屏。
- Rollback point: `8635d60`（文档规划提交）。

## Iteration 2 — 2026-07-25

- Changes: 修复花槽叶簇悬空；圆形 / 长形石座从 80 triangles 提高为 320
  triangles；统一深色座具家族；补齐独立 Three.js 两态 QA。
- Evidence used: 入口图、水边街具图、座具家族图、水景纵深图。
- Blender result: 四份 master 通过 canonical / side / detail；MCP 只读检查确认
  cameras 0、lights 0，临时审查 Scene 已删除。
- GLB result: 4 files / 60,688 bytes / 1,086 triangles / 0 images-textures /
  root transforms clean，外部 audit 全部 `ok`。
- Three-way comparison result: 四张 triptych 和一张 contact sheet 已生成。
- Runtime result: 4 m 四件均绘制；路桩 10 m 使用同一 GLB；22 m 新标签页为
  `hidden` 且 GLB 请求数为 0；console errors 0。
- Independent review result:
  `docs/research/xingfuli-current-street-furniture-final-review.md` 无 blocker。
- Remaining inference: 精确尺寸、材质、厂家、植物种类和正式实例坐标仍未知。
- Performance impact: 当前正式地图 0 实例、首屏增量 0 bytes；静态 QA
  `frameloop=demand`，不做 FPS 提升宣称。
- Rollback point: 本分类提交的父提交。

## Iteration 3 — 2026-07-25

- Changes: 实际执行
  `--asset xingfuli-pointed-entry-bollard` 单资产重建。
- Result: GLB SHA 继续为 `b91f86a7cfb4…`，另外三件未被生成器选择；
  现有 WebGL 验收继续对应相同运行时二进制。
- Blend boundary: `.blend` SHA 从 `1864bb7587a3…` 变为 `19404871248b…`；
  Blender 保存序列化并非字节稳定，因此“确定性”限定为输入、几何、GLB 和
  build command 可重复，不把 Blend 字节 SHA 相同作为质量门。
- Build record: 已更新为当前 master SHA。

## Iteration 4 — 2026-07-25

- Validation: 新增街具专项测试 4/4 通过，lint、静态构建和 Sites 构建通过。
- Full-suite boundary: `npm test` 为 218/219；唯一失败位于未修改的共享
  `app/scene/xinhua-world.tsx:1827-1828`，属于既有 tuple 类型错误。
- Scope decision: 按用户要求不修改公共运行时入口；本分类如实记录失败，不声称
  全仓测试全绿，也不把范围外修复混入街具提交。
- Production boundary: 公共 registry、production manifest、18 栋资产及运行时
  入口仍保持未修改。

## Pending Todo — 2026-07-26

- [ ] 将 4 个已完成的幸福里街具 GLB 正式接入主场景：
  `xingfuli-pointed-entry-bollard`、
  `xingfuli-water-edge-stone-seat-round`、
  `xingfuli-water-edge-stone-seat-long`、
  `xingfuli-water-edge-slim-planter`。
- [ ] 用尖顶入口石桩替换
  `app/scene/shared-street-assets.tsx` 中正式场景仍在使用的方盒
  `IrregularStoneBollards`；不得继续把旧方盒作为完成状态。
- [ ] 沿用并复核当前 5 个入口实例位置，校准人物尺度、朝向、间距、地面接触和
  单体底座碰撞，保持入口可通行。
- [ ] 依据已保存的水景参考照片，为圆形石座、长形石座和窄型花槽冻结正式实例
  坐标；精确位置未知的部分必须继续标记为推定。
- [ ] 重复街具共享几何与材质；近景使用现有 `visible-low` GLB，远景
  `hidden`，不得增加全览首屏负担。
- [ ] 在实际幸福里入口 `/?start=xingfuli` 完成视觉、碰撞、遮挡、控制台、
  网络请求和性能验收；独立 QA 页面通过不能代替正式场景验收。
- [ ] 完成后运行 `npm test`、`npm run lint` 和静态构建，并保存以 `test_`
  开头的正式运行时验收截图。

## Iteration 5 — 2026-07-28 Production integration

- Scope: 正式接入仍严格限制为 4 个幸福里专属模型；Meshy 10 件通用资产只进入
  隔离资产库，不在本轮自动摆放。
- Runtime: 新增 `app/scene/xingfuli-current-street-furniture.tsx`，只在幸福里
  `full` stage 加载；`identity`、`massing` 和全览保持 hidden，不增加首屏请求。
- Entrance: 保留既有 5 个入口中心，使用当前尖顶路桩 GLB 替换方盒
  `IrregularStoneBollards`，碰撞收紧为逐个底座 AABB。
- Water edge: 冻结 2 个圆座、2 个长座和 3 个窄花槽。照片直接支持物体家族和
  水边关系，但不支持测绘坐标，因此 7 个位置明确标记为
  `inferred-water-edge-position`。
- Collision: 第一版南侧位置侵入 `west-to-east-main` 角色净距，已拒绝；调整到
  水景边沿后，三条确定性路线重新通过。
- Cache: 四条正式模型路径使用当前 GLB SHA 前 12 位作为查询版本。
- Runtime acceptance: production static build 下完成 `?start=xingfuli`、水池近景和
  入口近景三条实际 Chrome 路径。三条路径均有 canvas，console/page errors
  均为 0；120 帧样本为 55.15–60.63 FPS。
- Resource acceptance: 水池冷加载记录四个 GLB 共 61,888 transfer bytes；正式
  中央入口的 PerformanceResourceTiming 记录三件水边 GLB，入口路桩复用上一条
  路径中的 GLTF 内存缓存。
- Hidden acceptance: 关闭浏览器后以全新会话进入西南全览，匹配
  `/models/nonbuilding/xingfuli-current-street-furniture/` 的资源请求为 0，
  canvas 正常且 page errors 为 0。
- Visual acceptance: 入口 5 个尖顶路桩落地且保留角色通道；水边 7 件模型不侵入
  三条确定性主路线；中央巷道可通行。
- Evidence: `docs/research/test_xingfuli_current_street_furniture_production_runtime_qa.json`
  和三张 `test_artifacts/test_xingfuli_current_street_furniture_*_runtime.png`。
- Performance boundary: 没有同条件旧版本基线，不声称性能提升。
- Result: 本 TODO 可标记 `done`。
