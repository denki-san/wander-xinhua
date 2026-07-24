# Feature Requests

## [FEAT-20260725-001] context_revealed_touch_controls

**Logged**: 2026-07-25T00:00:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Requested Capability
移动端摇杆默认隐藏，只有在屏幕下三分之一拖动产生走动或跑动时显示；同一区域轻点触发跳跃，跳跃按钮永远不显示。

### User Context
复刻 Messenger 的低遮挡触控手感：下三分之一同时承担移动与跳跃，拖动时才提供摇杆视觉反馈，轻点时直接跳跃。

### Complexity Estimate
medium

### Suggested Implementation
让完整下三分之一成为共享触控热区；短距离短时长手势触发跳跃，超过位移阈值才激活移动与摇杆视觉；删除跳跃按钮及其样式。

### Metadata
- Frequency: first_time
- Related Features: mobile-touch-controls, walk-run-toggle, jump

### Resolution
- **Resolved**: 2026-07-25
- **Notes**: 已实现完整下三分之一的 tap/drag 共享手势，拖动超过阈值才显示摇杆并移动，短按及移动中的第二指短按触发跳跃；跳跃按钮已从 DOM 与样式中删除。

---
