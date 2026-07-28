# Xingfuli Street Furniture Production Integration

- 优先级：P1
- 状态：done（2026-07-28）
- 创建：2026-07-26
- 范围：将已完成的幸福里当前街具接入正式主场景；不修改 18 栋建筑资产。

## 当前事实

4 件 `visible-low` GLB 已按 SHA 版本路径接入幸福里 `full` stage，共 12 个正式实例；`identity`、`massing` 和全览仍保持 hidden。

## 待办

- [x] 将下列 4 个 GLB 正式接入主场景：
  - `xingfuli-pointed-entry-bollard`
  - `xingfuli-water-edge-stone-seat-round`
  - `xingfuli-water-edge-stone-seat-long`
  - `xingfuli-water-edge-slim-planter`
- [x] 用尖顶入口石桩替换正式场景中的方盒 `IrregularStoneBollards`；旧方盒不再表示当前 2026 入口。
- [x] 复核入口的 5 个实例位置，校准人物尺度、间距、地面接触与单体底座碰撞，并保持入口可通行。
- [x] 为圆座、长座和窄花槽冻结正式坐标；7 个水边位置均明确标为推定。
- [x] 复用 GLB 资源：幸福里 `full` stage 使用 `visible-low`，其余阶段 `hidden`，不增加全览首屏负担。
- [x] 在实际 `/?start=xingfuli`、水池与入口页面完成视觉、碰撞、控制台、资源和性能验收。
- [x] 运行 `npm test`、`npm run lint` 与静态构建，并保存以 `test_` 开头的正式运行时验收截图。

## 完成标准

独立 QA 通过不算完成。只有主场景已加载、实例位置正确、入口可通行、远景不请求这些 GLB，且测试、lint、构建和实际页面验收均通过，才能标记为 `done`。

## 真值来源

- [街具 Decision Log](../research/xingfuli-current-street-furniture-decision-log.md)
- [街具 Model Brief](../research/xingfuli-current-street-furniture-model-brief.md)
- [正式运行时验收](../research/test_xingfuli_current_street_furniture_production_runtime_qa.json)
- `public/models/nonbuilding/xingfuli-current-street-furniture/`
