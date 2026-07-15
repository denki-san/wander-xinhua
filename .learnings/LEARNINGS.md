# Learnings

## [LRN-20260716-001] correction

**Logged**: 2026-07-16T00:10:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
真实社区场景不应先套用球形世界隐喻；地图拓扑必须先服从产品对真实空间的表达目标。

### Details
用户最初反馈后退镜头回顶部与建筑倾斜，进一步讨论后明确产品要表达真实新华路社区，而不是虚拟球形地区。继续修补球面法线只能解决技术症状，不能解决空间隐喻不符合产品目标的根因。

### Suggested Action
已改为有限 X/Z 平面街区：Y 轴统一垂直，加入地图与建筑碰撞、实体围挡、相机水平转向和穿墙避让，并为后退转向、边界与沿墙滑动补充回归测试。

### Metadata
- Source: user_feedback
- Related Files: app/scene/xinhua-world.tsx, app/xinhua-experience.tsx
- Tags: camera, flat-world, movement, model-orientation, product-direction

---

## [LRN-20260716-002] best_practice

**Logged**: 2026-07-16T00:42:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: deployment

### Summary
静态 Vite 构建的公开元数据来源是根目录 `index.html`，不能只更新 Next `app/layout.tsx`。

### Details
平面街区首次同步后，公网 HTML 仍显示旧的“3D 小世界”描述。原因是静态部署走 `vite.static.config.ts` 与根目录 `index.html`，`app/layout.tsx` 的 metadata 不会注入该入口。

### Suggested Action
场景定位或 SEO 文案变更时同步更新两个入口，并在 `rendered-html.test.mjs` 中直接验证最终 `dist-static/index.html`。

### Metadata
- Source: self_discovery
- Related Files: index.html, app/layout.tsx, tests/rendered-html.test.mjs
- Tags: static-build, metadata, deployment, regression-test

---
