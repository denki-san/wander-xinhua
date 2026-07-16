# Learnings

## [LRN-20260716-005] correction

**Logged**: 2026-07-16T14:08:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
Kimi WebBridge 更新后不能把 daemon `status` 探针误报当成浏览器助手不可用，实际命令结果优先。

### Details
`status` 连续返回 PID 存在但 HTTP 探针失败，用户在 Chrome 中确认“浏览器助手已就绪”。随后不重启 daemon，直接执行同一 session 的 `navigate`、`snapshot` 和 `screenshot` 全部成功。

### Suggested Action
先执行一次无破坏性的实际 `navigate` 或 `list_tabs`；只有真实命令也连接失败时，才按 skill 的 daemon 恢复流程处理。

### Metadata
- Source: user_feedback
- Related Files: .learnings/ERRORS.md
- Tags: kimi-webbridge, status-probe, browser-extension, verification

---

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

## [LRN-20260716-003] correction

**Logged**: 2026-07-16T01:05:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
第三人称闲逛产品的主角是持续占据视觉中心的核心资产，不能使用只满足碰撞和动画验证的几何占位模型发布。

### Details
当前角色虽然具备行走、奔跑和跳跃逻辑，但头脸只有球体与两点眼睛，四肢为单段胶囊，服装和背包缺少结构层次，近景与移动端都会显得粗糙。

### Suggested Action
保持原创程序化建模与现有轻量运行时，重建头脸、发型、躯干服装、双段四肢和信使背包，并从角色正面、背面与手机近景分别验收。

### Resolution
已完成分层角色模型、行走动画调整及桌面正反面和移动端视觉验收，并增加源码结构回归测试防止退回占位模型。

### Metadata
- Source: user_feedback
- Related Files: app/scene/xinhua-world.tsx, tests/rendered-html.test.mjs
- Tags: character-model, art-quality, third-person, visual-regression

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

## [LRN-20260716-004] correction

**Logged**: 2026-07-16T04:05:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
低多边形手绘风格不等于 Minecraft 式方块堆砌；真实地标区块必须先锁定可识别结构、空间比例、立面颜色与核心街具，再做风格化简化。

### Details
“幸福里”是居民能够识别的真实地点。只放通用盒子建筑，即使颜色接近，也无法满足“走到这里就知道是幸福里”的产品目标。公开地图负责拓扑，多个角度的外观照片负责立面与设施，Messenger 只负责手绘渲染语言，三类证据不能混用。

### Suggested Action
已建立独立的幸福里建模基准与七栋固定建筑规格，加入入口垂直绿墙、倒影池、池中树、喷泉石景、木桥、街灯、长椅、红伞、屋顶亭和水塔，并增加源码回归测试，防止退回通用街区随机排布。

### Metadata
- Source: user_feedback
- Related Files: app/scene/xingfuli-block.tsx, docs/research/xingfuli-reference.md, tests/rendered-html.test.mjs
- Tags: landmark-modeling, proportion, visual-identity, non-minecraft, xingfuli

---
