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
