# Errors

## [ERR-20260719-001] evidence-document-assertion

**Logged**: 2026-07-19T20:38:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary

证据分离测试在工作流文档中检查米制公式，但实现只把公式写进了 JSON 证据清单。

### Error

```text
AssertionError: workflow did not match
/sceneScale = meterAuthoredScale × visualScaleMultiplier/
```

### Context

- Operation: `npm test`
- The formula was present in `research/poi-evidence-manifest.json`.
- The test intentionally expected the human-readable workflow to carry the same invariant.

### Suggested Fix

Keep the test strict and add the explicit scale formula to the human-readable workflow so researchers do not need to infer it from JSON.

### Metadata

- Reproducible: yes
- Related Files: research/xinhua-wonder-workflow.md, tests/rendered-html.test.mjs

### Resolution

- **Resolved**: 2026-07-19T20:39:00+08:00
- **Notes**: Added the exact meter-first formula to the workflow document and reran the full test suite.

---

## [ERR-20260719-005] sites-stale-commit-after-push

**Logged**: 2026-07-19T21:37:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
Sites 首次保存版本时仍读取到旧的源仓库 HEAD，尽管前一条 Git 推送已经返回成功。

### Error
```text
Commit 0753ed8a5781d3b16d8043ce13c4290a9fb7b7ad is not the current HEAD
```

### Context
- The local commit and packaged archive were already validated.
- An immediate `ls-remote` still showed the previous commit.
- Repeating the exact non-force push reported the new commit as up to date.

### Suggested Fix
在首次推送后明确用 `ls-remote` 验证远端 HEAD；若出现短暂传播延迟，重复同一个精确 refspec 的非强制推送，再重试保存版本。

### Metadata
- Reproducible: unknown
- Related Files: `.openai/hosting.json`
- See Also: ERR-20260719-003

### Resolution
- **Resolved**: 2026-07-19T21:38:00+08:00
- **Notes**: 远端 HEAD 随后确认已前进，版本 3 保存成功并完成私有生产部署。

---

## [ERR-20260719-003] sites-connector-unavailable

**Logged**: 2026-07-19T00:00:00+08:00
**Priority**: high
**Status**: resolved
**Area**: infra

### Summary
The Sites connector exposed deployment tools but rejected credential, site-inspection, and version-save calls as unavailable.

### Error
`MCP tool codex_apps/sites.<tool> is not available to the model`

### Context
- Existing Sites project ID is present and the validated source archive was prepared.
- Failed operations included source credential creation, site lookup, and version save.

### Suggested Fix
Restore Sites connector availability, then push commit `e02c58c4efbbffc72dadba76fefdfb0defd28609`, save the prepared archive, and deploy the saved version.

### Metadata
- Reproducible: yes
- Related Files: `.openai/hosting.json`

### Resolution
- **Resolved**: 2026-07-19T21:38:00+08:00
- **Notes**: Sites 连接能力恢复；已创建短期写入凭证、保存版本 3，并完成私有生产部署。

---

## [ERR-20260719-002] browser-runtime-capability-mismatch

**Logged**: 2026-07-19T20:46:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary

浏览器说明列出了 `networkidle` 与页面级 `requestAnimationFrame`，但当前受限运行时分别拒绝该加载状态并在只读 evaluate 作用域中缺少该全局函数。

### Error

```text
playwright_wait_for_load_state does not support networkidle
TypeError: requestAnimationFrame is not a function
```

### Context

- Local runtime QA for the Three.js workbench.
- `domcontentloaded` was sufficient for navigation.
- CDP `Performance.getMetrics` provided a supported proportional performance sample.

### Suggested Fix

Use `domcontentloaded` for this browser backend and use the documented CDP capability for runtime metrics instead of assuming page globals exist inside read-only evaluate.

### Metadata

- Reproducible: yes
- Related Files: app/WonderWorkbench.tsx

### Resolution

- **Resolved**: 2026-07-19T20:50:00+08:00
- **Notes**: Replaced unsupported checks with `domcontentloaded`, explicit asset readiness, clean browser logs, and CDP performance metrics.

---
## [ERR-20260719-004] blender_background_startup

**Logged**: 2026-07-19T00:00:00+08:00
**Priority**: high
**Status**: resolved
**Area**: infra

### Summary
Blender 4.5.11 在受限命令环境中初始化 Metal GPU 后端时崩溃，建模脚本尚未执行。

### Error
```
Segmentation fault: 11
blender::gpu::supports_barycentric_whitelist
GPU_backend_type_selection_detect
```

### Context
- Command: `blender --background --python research/source/create_plane_tree.py`
- Blender: 4.5.11 LTS on macOS ARM
- Crash occurs during `WM_init`, before the Python backtrace starts.
- Crash file: `/var/folders/9m/y4r0hmv54wg70vv7xm95n2bh0000gn/T/blender.crash.txt`

### Suggested Fix
在系统批准的非沙盒环境中重试同一条后台命令；若仍失败，再改用无 GPU 的纯 Python GLB 生成路径。

### Metadata
- Reproducible: unknown
- Related Files: research/source/create_plane_tree.py

### Resolution
- **Resolved**: 2026-07-19T21:19:00+08:00
- **Notes**: 同一命令在批准的非沙盒环境中正常执行，随后完成三轮模型改进、GLB 审计和预览渲染。

---
