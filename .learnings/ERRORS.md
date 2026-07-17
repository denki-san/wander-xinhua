# Errors

## [ERR-20260717-031] worktree_metadata_sandbox_cleanup

**Logged**: 2026-07-17T10:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
移除已合并 worktree 时，目录删除成功，但沙箱阻止清理 `.git/worktrees` 元数据。

### Error
```
error: failed to delete '.git/worktrees/dual-scale-map-navigation': Operation not permitted
```

### Context
- worktree 本身干净，分支提交与 `origin/main` 相同。
- 命令执行后工作目录已不存在，Git 将该记录标为 `prunable`。
- 本地 `main` 落后远端时，`git branch -d` 仍会按本地 `main` 判定“未合并”；确认功能分支与 `origin/main` 同 SHA 后才可删除本地引用。

### Suggested Fix
确认目录确实不存在后，使用已授权的 `git worktree prune` 清理元数据，再删除已合并的本地分支。

### Metadata
- Reproducible: yes
- Related Files: .git/worktrees/dual-scale-map-navigation

### Resolution
- **Resolved**: 2026-07-17T10:00:00+08:00
- **Notes**: 通过提权执行 Git 元数据清理；确认功能分支与 `origin/main` 同 SHA 后删除本地分支引用。

---

## [ERR-20260717-030] sites_tool_name_in_exec

**Logged**: 2026-07-17T09:45:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
用 `functions.exec` 编排 Sites 查询时，根据展示名称拼接出的嵌套工具名不存在。

### Error
```
TypeError: tools.mcp__codex_apps__sites___get_site is not a function
```

### Context
- `tool_search` 返回的连接器命名空间与 `functions.exec` 中的嵌套名称不保证能直接按字符串推导。
- 查询为只读操作，没有触发保存版本或生产部署。

### Suggested Fix
Sites 工具发现后优先直接调用已暴露的连接器工具；若需编排，先从 `ALL_TOOLS` 读取精确名称。

### Metadata
- Reproducible: yes
- Related Files: .openai/hosting.json

### Resolution
- **Resolved**: 2026-07-17T09:45:00+08:00
- **Notes**: 改为直接调用 Sites 连接器查询站点与版本状态。

---

## [ERR-20260717-029] agent_browser_mobile_profile_setup

**Logged**: 2026-07-17T09:31:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
发布前移动端验收首次被 agent-browser socket 权限和无效设备名拦截。

### Error
```
Socket directory '~/.agent-browser' is not writable: Operation not permitted
Unknown device: iPhone 15 Pro
```

### Context
- 普通沙箱不能写 agent-browser 的用户级 socket 目录。
- 技能示例使用 `iPhone 15 Pro`，当前 CLI 的受支持名称实际包含 `iPhone 15`，不包含该名称。

### Suggested Fix
沿已批准的 agent-browser 前缀在沙箱外执行，并先用 CLI 返回的受支持列表选择设备名。

### Metadata
- Reproducible: yes
- Related Files: test_artifacts/test_mobile_release_performance.png

### Resolution
- **Resolved**: 2026-07-17T09:32:00+08:00
- **Notes**: 改用 `iPhone 15` 后完成 393×852、DPR 3 的 180 帧采样；页面无错误且稳定 60 FPS。

---

## [ERR-20260717-028] git_index_write_sandbox_permission

**Logged**: 2026-07-17T09:15:39+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
发布前补充暂存三个已跟踪文件时，普通沙箱命令无法创建 Git 索引锁。

### Error
```
fatal: Unable to create '.git/index.lock': Operation not permitted
```

### Context
- 之前的精确 `git add` 已成功，失败发生在后续增量暂存。
- 工作区允许读取 `.git`，但本轮增量写入需要沿已批准的 Git 命令前缀在沙箱外执行。

### Suggested Fix
遇到同类索引锁权限错误时，不更改仓库结构；使用 `git add` 的已批准前缀重新执行同一精确暂存命令。

### Metadata
- Reproducible: unknown
- Related Files: .git/index

### Resolution
- **Resolved**: 2026-07-17T09:15:39+08:00
- **Notes**: 沿已批准的 `git add` 前缀重试成功，提交范围不变。

---

## [ERR-20260717-027] agent_browser_webgl_screenshot_timeout

**Logged**: 2026-07-17T08:49:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
复核民族乐团时，旧 agent-browser WebGL 会话无输出且首张截图未生成。

### Error
```
agent-browser screenshot reached the 10 second yield without creating the target file
```

### Context
- 同一会话此前已多次切换高负载 WebGL 直达页。
- 新建干净会话后页面正常；截图仍需超过 10 秒，但继续等待后成功保存。

### Suggested Fix
多次切换 WebGL 地标后若会话无响应，使用新会话；截图超过单次 yield 时继续等待完成，不立即判定失败。

### Metadata
- Reproducible: partially
- Related Files: test_artifacts/test_orchestra_text_direction_runtime.png

### Resolution
- **Resolved**: 2026-07-17T08:51:00+08:00
- **Notes**: 使用 `orchestra-fix` 新会话并等待截图完成，成功取得文字方向证据。

---

## [ERR-20260716-017] rolldown_optional_chain_assignment

**Logged**: 2026-07-16T17:50:00+08:00
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
新增地标树木实例时，对可选链结果赋值导致 Vite/Rolldown 在转换阶段拒绝构建。

### Error
```
Cannot assign to this expression
trunks.current?.instanceMatrix.needsUpdate = true
```

### Context
- ESLint 未报告此语法问题，生产构建在 Vite transform 阶段失败。
- 出现在华山绿地和上生新所两个 InstancedMesh 更新函数中。

### Suggested Fix
写入 ref 属性时显式判断 `ref.current`，不要把可选链放在赋值表达式左侧。

### Metadata
- Reproducible: yes
- Related Files: app/scene/huashan-green-block.tsx, app/scene/shangsheng-xinsuo-block.tsx

### Resolution
- **Resolved**: 2026-07-16T17:51:00+08:00
- **Notes**: 两处实例矩阵写入均改为显式判空，重新运行生产构建验证。

---

## [ERR-20260717-026] zsh_path_loop_and_preview_namespace

**Logged**: 2026-07-17T08:31:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
本地预览 HTTP 批量检查先误用 zsh 特殊变量 `path`，修正变量名后又因预览服务运行在授权环境而从沙箱内无法访问。

### Error
```
zsh: command not found: curl
curl: (7) Failed to connect to 127.0.0.1 port 4173
```

### Context
- zsh 的 `path` 数组与 `PATH` 绑定，在 `for path in ...` 中赋值会覆盖命令搜索路径。
- Vite 预览通过授权环境启动，沙箱内 curl 无法直接访问同一监听端口。

### Suggested Fix
循环变量使用 `endpoint` 等普通名称；本地预览连通性检查与服务器保持相同授权环境。

### Metadata
- Reproducible: yes
- Related Files: package.json

### Resolution
- **Resolved**: 2026-07-17T08:32:00+08:00
- **Notes**: 改用 `endpoint`，并在授权环境并行检查页面与 8 个 GLB，全部返回 HTTP 200。

---
## [ERR-20260717-025] foreground_dev_server_reaped_after_turn

**Logged**: 2026-07-17T07:49:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tooling

### Summary
通过交互式 exec 会话启动的本地开发服务器在回复结束后被回收，导致交给用户的 localhost 地址无法访问。

### Error
```
write_stdin failed: Unknown process id 37575
```

### Context
- `npm run dev -- --host localhost` 曾返回 `http://localhost:3001/`，当时 curl 为 200。
- 用户随后访问时，承载服务的统一终端进程已经不存在。

### Suggested Fix
需要交给用户持续访问的本地预览，应使用脱离交互终端的后台进程，并在回复前重新检查 PID 和 HTTP 200。

### Metadata
- Reproducible: yes
- Related Files: package.json

### Resolution
- **Resolved**: 2026-07-17T08:01:00+08:00
- **Notes**: 改用 Terminal 承载的静态预览脚本，先构建再由系统 Python HTTP server 固定托管在 127.0.0.1:3002；浏览器打开后持续复查仍为 HTTP 200。
- **Recurrence**: 2026-07-17T15:24:00+08:00 完成二次构建和浏览器验收后，Terminal 预览进程曾退出；交付前重新启动脚本并再次确认带查询参数页面返回 HTTP 200。

---
## [ERR-20260717-024] vinext_localhost_ipv6_binding

**Logged**: 2026-07-17T00:34:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
Vinext 显示 localhost 地址时，使用 127.0.0.1 访问被拒绝，但 localhost 可正常访问。

### Error
```
Navigation failed: net::ERR_CONNECTION_REFUSED
curl: (7) Failed to connect to 127.0.0.1 port 3001
```

### Context
- 开发服务命令包含 `--host 127.0.0.1`，但实际仅通过 `http://localhost:3001/` 可达。
- `curl http://localhost:3001/` 返回 200。

### Suggested Fix
视觉验收优先使用开发服务器实际打印的完整 URL，不自行把 localhost 替换为 127.0.0.1。

### Metadata
- Reproducible: yes
- Related Files: package.json
- See Also: ERR-20260716-022

### Resolution
- **Resolved**: 2026-07-17T00:34:00+08:00
- **Notes**: 改用 `http://localhost:3001/` 继续验收。

---
## [ERR-20260717-002] camera_transition_source_assertion

**Logged**: 2026-07-17T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
游玩相机回归测试把整个 JSX 三元表达式写成单条正则，属性中的花括号导致断言误判。

### Error
```
The input did not match the regular expression /\{playing \? <PlayableMessenger[^}]+: <IntroCamera \/>\}/
```

### Context
- 生产代码中的 `PlayableMessenger` 带有 JSX 回调属性。
- `[^}]+` 会在属性闭合花括号处提前停止，无法匹配到三元表达式的另一分支。

### Suggested Fix
源码契约测试分别断言游玩分支和首页分支，不用一条正则锁定完整 JSX 排版。

### Metadata
- Reproducible: yes
- Related Files: tests/test_controls.test.mjs, app/scene/xinhua-world.tsx

### Resolution
- **Resolved**: 2026-07-17T00:00:00+08:00
- **Notes**: 已拆成两条只覆盖关键分支的断言。

---
## [ERR-20260717-001] preview_server_sandbox_and_webgl_capture_artifacts

**Logged**: 2026-07-17T00:22:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
本地 Vite Preview 在沙箱内无法监听端口；同一无头浏览器会话多次切换 WebGL 开场与游戏态后，截图出现旧帧残影。

### Error
```
Error: listen EPERM: operation not permitted 127.0.0.1:4173
```

### Context
- 预览服务器属于本地只读验收用途。
- 首次干净会话能正常加载 GLB 且 `agent-browser errors` 为空。
- 连续刷新和切换相机后出现开场地图与游戏镜头叠帧，模型离线渲染不受影响。

### Suggested Fix
本地监听端口使用获准的沙箱外执行；WebGL 截图为每轮验收使用独立 `--session`，模型视觉交付同时保留 Blender 确定性预览。

### Metadata
- Reproducible: partially
- Related Files: test_artifacts/test_navy_club_desktop.png, test_artifacts/test_navy_club_preview.png

### Resolution
- **Resolved**: 2026-07-17T00:22:00+08:00
- **Notes**: Preview 在沙箱外成功启动；干净浏览器会话确认模型加载且无页面错误，最终视觉以 Blender 4.5 LTS 确定性预览图交付。
- **Recurrence**: 2026-07-17T20:28:00+08:00 世界地图恢复验收时，3004 端口在沙箱内再次触发 `listen EPERM`；改用获准的沙箱外预览后完成“从全览出发 → POI 卡片 → 进入地点 → 查看全览”真实浏览器验证。

---

## [ERR-20260717-001] effect_composer_conditional_child_type

**Logged**: 2026-07-17T00:02:16+08:00
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
在 `EffectComposer` 内使用 `playing && <InkOutline />` 生成 `false | Element`，不符合其只接受 `Element` 的子节点类型。

### Error
```
app/xinhua-experience.tsx(212,13): error TS2322: Type 'false | Element' is not assignable to type 'Element'.
```

### Context
- 首页和游戏态需要不同的后处理组合。
- Vite 生产构建能通过，但完整 TypeScript 场景检查失败。

### Suggested Fix
把首页态和游戏态拆成两个明确的 `EffectComposer` 分支，不在 Composer 内放置可能为 `false` 的条件子节点。

### Metadata
- Reproducible: yes
- Related Files: app/xinhua-experience.tsx, tests/typecheck-scene.test.mjs

### Resolution
- **Resolved**: 2026-07-17T00:02:16+08:00
- **Notes**: 拆分首页和游戏态 Composer，随后重新运行完整测试。

---
## [ERR-20260716-024] sandbox_dns_blocked_reference_image_download

**Logged**: 2026-07-16T21:12:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
网页检索已取得公开参考图直链，但沙箱内使用 curl 下载时 DNS 解析被阻止。

### Error
```
curl: (6) Could not resolve host: imagepphcloud.thepaper.cn
curl: (6) Could not resolve host: imagel.sekainavi.com
curl: (6) Could not resolve host: images.smartshanghai.com.cn
```

### Context
- 图片链接已由网页工具成功打开并确认来源。
- 本地下载仅用于临时视觉参考，不会把第三方照片打包进产品。
- 当前命令在 workspace-write 沙箱内执行。

### Suggested Fix
对已核实来源的只读参考图下载使用沙箱外 curl；下载到 `/private/tmp/test_*`，不得进入部署资产。

### Metadata
- Reproducible: yes
- Related Files: /private/tmp/test_navy_refs

### Resolution
- **Resolved**: 2026-07-17T00:20:00+08:00
- **Notes**: 在获准的沙箱外环境下载到 `/private/tmp/test_navy_refs`，仅作视觉参考，未进入产品资产。

---
## [ERR-20260716-025] homebrew_autoupdate_blocks_blender_install

**Logged**: 2026-07-16T21:18:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
安装 Blender 时 Homebrew 自动更新被无关的 antigravity-manager tap stash 冲突阻断。

### Error
```
error: could not apply b68ebf8e... feat: release v2.0.0 (Tauri Rewrite)
Could not apply b68ebf8e...
```

### Context
- 目标操作是 `brew install --cask blender`。
- 冲突来自 `/opt/homebrew/Library/Taps/lbjlaq/homebrew-antigravity-manager`，与 Blender 和当前仓库无关。
- 不应修改或弹出该 tap 的用户 stash。

### Suggested Fix
设置 `HOMEBREW_NO_AUTO_UPDATE=1` 后重试安装，绕过无关 tap 更新，不触碰其现有修改。

### Metadata
- Reproducible: yes
- Related Files: /opt/homebrew/Library/Taps/lbjlaq/homebrew-antigravity-manager

### Resolution
- **Resolved**: 2026-07-17T00:20:00+08:00
- **Notes**: 使用 `HOMEBREW_NO_AUTO_UPDATE=1` 绕过无关 tap 更新，未改动其 stash；Blender 安装完成。

---
## [ERR-20260716-026] blender_5_2_headless_arch_cache_crash

**Logged**: 2026-07-16T21:31:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tooling

### Summary
Homebrew 安装的 Blender 5.2.0 LTS 在沙箱内以 background 模式启动时，于加载阶段因 Arch cache line 假设失败而崩溃。

### Error
```
ArchWarn: ARCH_CACHE_LINE_SIZE != Arch_ObtainCacheLineSize()
Blender 5.2.0 LTS
Segmentation fault: 11
```

### Context
- 命令：`blender --background --python scripts/create_navy_club_model.py --`
- 崩溃发生在脚本输出之前，属于 Blender/USD 运行时启动阶段。
- 当前为 Apple Silicon macOS，Blender 通过 Homebrew cask 安装。

### Suggested Fix
先在沙箱外直接运行同一 headless 命令，排除系统信息访问受限；若仍失败，再固定到较稳定的 Blender 4.5 LTS。

### Metadata
- Reproducible: unknown
- Related Files: scripts/create_navy_club_model.py, /var/folders/9m/y4r0hmv54wg70vv7xm95n2bh0000gn/T/blender.crash.txt

### Resolution
- **Resolved**: 2026-07-17T00:20:00+08:00
- **Notes**: Blender 5.2 在沙箱外仍异常，改用 Blender 4.5.11 LTS；GLB、Blend 源文件和预览图均成功生成。
- **Recurrence**: 2026-07-17 Blender 4.5.11 在沙箱内批量生成新华路资产时同样于启动阶段触发 Arch cache line 崩溃，继续沿用沙箱外后台执行方案。

---

## [ERR-20260716-030] github_remote_verify_dns

**Logged**: 2026-07-16T23:39:58+08:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
发布后的 `git ls-remote` 复核遇到一次 GitHub DNS 瞬时解析失败。

### Error
```
ssh: Could not resolve hostname github.com: -65563
fatal: Could not read from remote repository.
```

### Context
- 同一轮稍早的 `git push origin main` 已成功完成。
- 公网站点、HTTPS 和静态资源验证均正常，故障只影响额外的远端查询。

### Suggested Fix
保留成功推送输出作为首要证据，遇到单次 DNS 解析失败时重新执行只读远端查询，不重复推送。

### Metadata
- Reproducible: no
- Related Files: none

### Resolution
- **Resolved**: 2026-07-16T23:39:58+08:00
- **Notes**: 继续通过分支跟踪状态和重试远端查询完成核验。

---
## [ERR-20260716-029] readme_concurrent_rename_context

**Logged**: 2026-07-16T22:24:00+08:00
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
更新 README 标题时，同一工作区的并行改名修改已先替换产品中文名，导致包含旧中文名的补丁上下文失效。

### Error
```
apply_patch verification failed: Failed to find expected lines in README.md
```

### Context
- 当前工作区会被多个任务共享，改名任务在本轮执行期间更新了 README 首段。
- 失败补丁没有产生部分写入。

### Suggested Fix
共享工作区出现新改动后重新读取最小上下文，只修改仍需调整的行，不覆盖并行任务内容。

### Metadata
- Reproducible: no
- Related Files: README.md

### Resolution
- **Resolved**: 2026-07-16T22:24:00+08:00
- **Notes**: 重新读取后仅把英文标题更新为 Wander Xinhua，保留并行任务写入的“新华漫游志”。

---
## [ERR-20260716-027] vite_preview_host_forwarding_and_sandbox

**Logged**: 2026-07-16T21:40:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
首次启动静态预览时把 `--host` 传给了外层 npm，并在沙箱内监听 IPv6，导致参数丢失和 `EPERM`。

### Error
```
npm warn Unknown cli config "--host"
Error: listen EPERM: operation not permitted ::1:4173
```

### Context
- 错误命令为 `npm start -- --host 127.0.0.1`，项目的 `start` 又封装了一层 npm script。
- 本地监听端口需要获批的沙箱外执行。

### Suggested Fix
直接运行 `npm run preview:static -- --host 127.0.0.1`，并按本地浏览器验收需要申请端口监听权限。

### Metadata
- Reproducible: yes
- Related Files: package.json

### Resolution
- **Resolved**: 2026-07-16T21:40:00+08:00
- **Notes**: 使用正确的脚本参数转发后，预览在 127.0.0.1:4173 正常启动。

---
## [ERR-20260716-028] node_typescript_extension_resolution

**Logged**: 2026-07-16T22:08:00+08:00
**Priority**: low
**Status**: resolved
**Area**: test

### Summary
`terrain.ts` 同时被 Vite 和 Node 原生 TypeScript 测试加载时，无扩展名与 `.ts` 扩展名分别触发不同解析错误。

### Error
```
ERR_MODULE_NOT_FOUND: Cannot find module './world-math'
TS5097: An import path can only end with a '.ts' extension when allowImportingTsExtensions is enabled
```

### Context
- Vite/TypeScript 项目源码使用无扩展名导入。
- Node 25 直接加载 `.ts` 测试时要求 ESM 文件扩展名，但项目 TypeScript 配置又禁止源码导入以 `.ts` 结尾。

### Suggested Fix
需要被 Node 原生测试直接导入的纯模块应避免依赖无扩展名的 TS 子模块，或后续统一引入支持两端的测试编译器。

### Metadata
- Reproducible: yes
- Related Files: app/scene/terrain.ts, tests/test_terrain.test.mjs, tsconfig.json

### Resolution
- **Resolved**: 2026-07-16T22:08:00+08:00
- **Notes**: 地形模块内保留轻量、无依赖的多边形判断，实现已重新通过 Node 与场景 TypeScript 测试。

---
## [ERR-20260716-026] full_tsc_cloudflare_ambient_types

**Logged**: 2026-07-16T21:25:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
直接运行全仓 `tsc --noEmit` 时，Cloudflare Worker 的环境类型缺失产生与本轮场景无关的错误。

### Error
```
Cannot find module 'cloudflare:workers'
Cannot find name 'Fetcher'
Cannot find name 'D1Database'
```

### Context
- 项目自带 `tests/typecheck-scene.test.mjs` 会运行同一类型检查，但只筛选 `app/scene` 与体验入口的错误。
- 本轮 3D 场景类型错误已经通过该测试精确识别和修复。

### Suggested Fix
场景改动使用项目自带的定向类型测试；若要让全仓 `tsc` 归零，需另行补齐 Cloudflare Worker ambient types。

### Metadata
- Reproducible: yes
- Related Files: tsconfig.json, tests/typecheck-scene.test.mjs, worker/index.ts, db/index.ts

### Resolution
- **Resolved**: 2026-07-16T21:25:00+08:00
- **Notes**: 本轮改用定向场景类型测试作为验收，不把既有 Worker 类型问题混入场景修改。

---
## [ERR-20260716-025] r3f_mesh_toon_flat_shading_type

**Logged**: 2026-07-16T21:22:00+08:00
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
新增低多边形造型时给 R3F 的 `meshToonMaterial` 传入 `flatShading`，严格 TypeScript 场景测试不接受该 JSX 属性。

### Error
```
TS2322: Type '{ color: string; flatShading: true; }' is not assignable to type ... MeshToonMaterial ...
```

### Context
- Vite 生产构建与 ESLint 均通过，错误只在 `tsc --noEmit` 场景类型检查中暴露。
- 几何已经使用低分段球体、三棱柱和多边形柱体，不依赖该材质属性维持造型。

### Suggested Fix
优先用几何分段数塑造低多边形轮廓；R3F 材质属性要以项目当前 Three/R3F 类型定义为准。

### Metadata
- Reproducible: yes
- Related Files: app/scene/huashan-green-block.tsx, app/scene/shangsheng-xinsuo-block.tsx

### Resolution
- **Resolved**: 2026-07-16T21:22:00+08:00
- **Notes**: 已移除不兼容属性，保留低分段几何造型。

---
## [ERR-20260716-024] create_goal_existing_active_goal

**Logged**: 2026-07-16T21:02:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
用户通过 `/goal` 已自动创建活动目标，再次调用创建目标接口时发生状态冲突。

### Error
```
cannot create a new goal because this thread has an unfinished goal; complete the existing goal first
```

### Context
- 用户消息以 `/goal` 开头，线程中已经存在内容相同的活动目标。
- 再次创建目标不会覆盖原目标，接口安全拒绝了请求。

### Suggested Fix
收到 `/goal` 请求时先读取当前目标；若目标已经存在且内容一致，直接沿用，不再重复创建。

### Metadata
- Reproducible: yes
- Related Files: none

### Resolution
- **Resolved**: 2026-07-16T21:02:00+08:00
- **Notes**: 已通过目标查询确认现有活动目标正是本轮六项修改，并继续沿用。

---
## [ERR-20260716-024] github_publish_preflight

**Logged**: 2026-07-16T22:35:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tooling

### Summary
发布前检查发现 GitHub CLI 令牌失效，且沙箱内 SSH 远端检查遇到 DNS 解析失败。

### Error
```
The token in default is invalid.
ssh: Could not resolve hostname github.com: -65563
```

### Context
- 目标远端为 `git@github.com:denki-san/wander-xinhua.git`。
- Git 提交与 SSH 推送可独立于 GitHub CLI token 工作，需在允许网络访问的环境复测 SSH key。

### Suggested Fix
优先在沙箱外运行只读 `git ls-remote` 验证 SSH；若 SSH 可用则继续提交推送，后续需要 PR/API 操作时再更新 `gh` 登录。

### Metadata
- Reproducible: unknown
- Related Files: .git/config

### Resolution
- **Resolved**: 2026-07-16T22:39:00+08:00
- **Commit/PR**: 911f63b
- **Notes**: 在允许网络和 Git 元数据写入的环境完成 SSH 校验、关联远端及 main 推送；GitHub CLI token 失效未影响 SSH 发布。
- **Recurrence**: 2026-07-17T20:10:00+08:00 再次确认 `gh` 默认令牌失效；改用 GitHub connector 与沙箱外 `git ls-remote` 完成远端分支和 PR 引用核验。

---
## [ERR-20260716-021] fountain_json_tuple_typecheck

**Logged**: 2026-07-16T19:51:36+08:00
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
给上生新所喷泉补碰撞时，边界工具函数只接受二元 tuple，但 JSON 导入被推断为 `number[][]`，导致场景 TypeScript 门禁失败。

### Error
```
Argument of type 'number[][]' is not assignable to parameter of type 'readonly MapPolygonPoint[]'.
```

### Context
- 场景构建和其余 27 项测试通过。
- 错误只出现在喷泉边界传入 `boundaryBounds` 的两个调用点。

### Suggested Fix
边界只依赖前两个数值，不要求调用方必须保留 tuple 推断；将参数放宽为只读数值数组集合。

### Metadata
- Reproducible: yes
- Related Files: app/scene/shangsheng-xinsuo-block.tsx

### Resolution
- **Resolved**: 2026-07-16T19:51:36+08:00
- **Notes**: `boundaryBounds` 改为接受 `readonly (readonly number[])[]`，保留只读约束并兼容 JSON 推断。

---

## [ERR-20260716-016] npm_missing_from_tool_path

**Logged**: 2026-07-16T16:20:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
并行执行五倍版本检查时，工具子进程的 PATH 中没有 `npm`，三条命令均在测试启动前以 127 退出。

### Error
```
zsh:1: command not found: npm
env: node: No such file or directory
```

### Context
- 失败发生在命令解析阶段，没有形成 lint、测试或构建结论。
- 本机 Node/npm 安装在 `/opt/homebrew/bin`。

### Suggested Fix
项目自动化命令在受限工具环境中使用 `/opt/homebrew/bin/npm` 明确路径。

### Metadata
- Reproducible: yes
- Related Files: package.json

### Resolution
- **Resolved**: 2026-07-16T16:21:00+08:00
- **Notes**: 仅使用 npm 绝对路径后，其 shebang 仍通过 PATH 查找 node；最终为检查命令显式设置 `PATH=/opt/homebrew/bin:/usr/bin:/bin` 后重跑全部检查。

---

## [ERR-20260716-015] overpass_primary_gateway_timeout

**Logged**: 2026-07-16T16:00:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
按三倍世界比例重新生成地图时，Overpass 主节点返回 504，生成器在写入任何新快照前退出。

### Error
```
Error: 504 Gateway Timeout: https://overpass-api.de/api/interpreter
```

### Context
- Nominatim 行政边界请求已成功。
- 原始快照写入位于道路请求之后，因此这次失败没有产生半截文件，也没有覆盖旧数据。

### Suggested Fix
为 Overpass 请求增加公共实例顺序回退；只有边界与道路数据都成功后才继续写入新的时间戳快照。

### Metadata
- Reproducible: unknown
- Related Files: scripts/test_generate_xinhua_map.mjs

### Resolution
- **Resolved**: 2026-07-16T16:05:00+08:00
- **Notes**: 改为按 Nominatim 边界 bbox 查询道路、再用真实行政多边形本地裁切；重新抓取得到与旧基线一致的 59 个边界点、308 段道路和 33 条具名道路，并保存新时间戳快照。16:17 在五倍比例重放时两个公共节点同时失败，生成器补充了 75 秒客户端超时与“读取最近一组完整快照”回退；回退不写假快照、不覆盖旧数据，并在运行时元数据记录来源与失败原因。

---

## [ERR-20260716-014] zsh_url_query_glob

**Logged**: 2026-07-16T15:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
公网发布校验时，未加引号的 cache-buster URL 被 zsh 当成文件通配模式，curl 没有启动。

### Error
```
zsh:1: no matches found: https://xinhua.denkisan.me/?release=43c1098
```

### Context
- HTTP 跳转、新 JS 资源与 Nginx 源站 HTML 已经分别验证成功。
- 失败只发生在带 `?` 查询参数的补充公网 HTML 读取命令。

### Suggested Fix
在 zsh 中执行包含 `?`、`&` 或 `[]` 的 URL 时，始终用单引号包住整个 URL。

### Metadata
- Reproducible: yes
- Related Files: .learnings/ERRORS.md

### Resolution
- **Resolved**: 2026-07-16T15:00:00+08:00
- **Notes**: 改用单引号 URL 后重新执行公网 HTML 校验。

---

## [ERR-20260715-001] sites_initializer

**Logged**: 2026-07-15T21:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: config

### Summary
网站初始化器因工作区中的学习日志和 Git 沙盒权限而中断，随后完成了骨架、Git 和依赖初始化。

### Error
```
Target is not empty
.git: Operation not permitted
```

### Context
- 新项目初始化期间发生。
- 初始化器已在失败前复制完整骨架。

### Suggested Fix
空工作区应先运行初始化器；若骨架已复制，补做 Git 初始化和 npm ci，不要重复覆盖文件。

### Metadata
- Reproducible: yes
- Related Files: package.json

### Resolution
- **Resolved**: 2026-07-15T21:01:00+08:00
- **Notes**: 已补做 Git 初始化和依赖安装。

---

## [ERR-20260716-011] kimi_webbridge_stale_pid

**Logged**: 2026-07-16T11:15:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
Kimi WebBridge 状态检查发现 PID 文件仍存在，但本地 HTTP 探针不可用。

### Error
```
{"note":"PID file exists but HTTP probe failed — daemon may be starting or stuck","pid":3035,"running":false}
```

### Context
- 在使用更新后的 Kimi WebBridge 核对新华路街道地图来源前运行状态检查。
- PID 存在不能证明 daemon 已经可用；必须以 `running` 与 HTTP 探针为准。

### Suggested Fix
按照 Kimi WebBridge 1.11.3 的恢复流程执行幂等 `start`，但最终必须用实际 `navigate` 或 `snapshot` 判定可用性；不要只依赖 `status`，也不要自动执行 `restart` 或 `stop`。

### Metadata
- Reproducible: unknown
- Related Files: .learnings/ERRORS.md

### Resolution
- **Resolved**: 2026-07-16T14:08:00+08:00
- **Notes**: 用户确认扩展端已就绪后，实际 `navigate`、`snapshot`、`evaluate` 与 `screenshot` 均成功；确认本次为 `status` 误报。

---

## [ERR-20260716-012] agent_browser_missing_binary

**Logged**: 2026-07-16T14:05:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
本地 3D 页面视觉验收时，已安装的 agent-browser skill 没有对应 CLI 可执行文件。

### Error
```
zsh:1: command not found: agent-browser
```

### Context
- 静态预览已在 `http://127.0.0.1:4173/` 正常运行。
- 失败发生在打开页面前，与应用构建或运行时无关。

### Suggested Fix
先用 `rg --files ~/.npm/_npx` 查找本机已有的 agent-browser 缓存入口；只有确实没有可复用安装时才考虑全局安装。

### Metadata
- Reproducible: yes
- Related Files: .learnings/ERRORS.md

### Resolution
- **Resolved**: 2026-07-16T14:05:00+08:00
- **Notes**: 找到本机 npx 缓存中的 `agent-browser/bin/agent-browser.js`，复用现有安装完成桌面与移动端验收，没有新增全局安装。

---

## [ERR-20260716-013] kimi_evaluate_top_level_await

**Logged**: 2026-07-16T14:12:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
Kimi WebBridge 1.11.3 的 `evaluate` 实际不接受顶层 await，与 skill 说明存在差异。

### Error
```
evaluate: SyntaxError: await is only valid in async functions and the top level bodies of modules
```

### Context
- 在真实 Chrome 标签中等待本地 Three.js 页面首帧后读取 ready 状态。
- 同一段逻辑包进 async IIFE 后立即成功。

### Suggested Fix
所有含 await 的 Kimi `evaluate` 代码统一使用 `(async () => { ... })()`，同时继续用 IIFE 隔离重复变量声明。

### Metadata
- Reproducible: yes
- Related Files: .learnings/ERRORS.md

### Resolution
- **Resolved**: 2026-07-16T14:12:00+08:00
- **Notes**: 改为 async IIFE 后成功读取 canvas、WebGL context 和页面 ready 状态。

---

## [ERR-20260715-008] static_build_lint_scope

**Logged**: 2026-07-15T23:39:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: config

### Summary
新增 Vite 静态构建目录后，ESLint 仍扫描旧的 `dist-static/` 产物，产生数千条与源码无关的错误。

### Error
```
✖ 3134 problems (28 errors, 3106 warnings)
```

### Context
- `dist-static/` 已加入 `.gitignore`，但项目的 ESLint 命令使用显式忽略项，未自动排除该目录。
- 失败发生在本地静态发布链路验证中，导致后续构建和测试没有执行。

### Suggested Fix
在 lint 命令中显式加入 `--ignore-pattern dist-static`，并在每次静态构建后复跑 lint、构建与测试。

### Metadata
- Reproducible: yes
- Related Files: package.json, vite.static.config.ts

### Resolution
- **Resolved**: 2026-07-15T23:39:00+08:00
- **Notes**: 已补充 ESLint 忽略项，并通过 lint、静态构建和 5 项测试的完整验证。

---

## [ERR-20260715-002] rendered_html_test

**Logged**: 2026-07-15T21:12:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
测试错误地把空的预览目录存在视为预览组件未删除。

### Error
```
AssertionError: Missing expected rejection.
```

### Context
- 两个预览文件已经删除，但空目录仍存在。

### Suggested Fix
删除空目录，让测试验证产品中不再保留任何 starter 预览表面。

### Metadata
- Reproducible: yes
- Related Files: tests/rendered-html.test.mjs

### Resolution
- **Resolved**: 2026-07-15T21:13:00+08:00
- **Notes**: 已删除空目录并重新运行测试。

---

## [ERR-20260715-003] local_node_path

**Logged**: 2026-07-15T21:37:38+08:00
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
本机终端环境在部署复核期间找不到 Node.js、npm 和 Docker，导致本地测试无法启动。

### Error
```
zsh:1: command not found: npm
```

### Context
- 尝试运行 `npm test` 和 `npm run lint` 时发生。
- 当前 PATH 中同时没有 `node`、`npm`、`corepack` 和 `docker`。
- 目标 VPS 的 Node 22 Docker 构建环境仍可使用。

### Suggested Fix
本轮在 VPS 的隔离 Node 22 构建容器中完成同等验证；后续恢复本机 Node 22 的 PATH 配置。

### Metadata
- Reproducible: yes
- Related Files: package.json

### Resolution
- **Resolved**: 2026-07-15T21:44:00+08:00
- **Notes**: 2026-07-15 复核发现本机 Node/npm 实际位于 `/opt/homebrew/bin` 与 `/usr/local/bin`，只是当前 shell 的 PATH 未包含它们。后续应直接使用本机绝对路径或显式补充 PATH，不再把 VPS 当开发和构建环境。

---

## [ERR-20260715-004] macos_tar_appledouble

**Logged**: 2026-07-15T21:44:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
macOS tar 包夹带 `._*` AppleDouble 元数据文件，导致 Linux 容器中的 ESLint 解析失败。

### Error
```
Parsing error: Invalid character
```

### Context
- 使用 macOS 自带 tar 打包源码并在 Debian VPS 解压后发生。
- 功能测试仍为 4/4 通过，失败只来自 AppleDouble 元数据文件。

### Suggested Fix
使用命令级 `COPYFILE_DISABLE=1` 重新创建测试包，并在干净目录中重跑 lint。

### Metadata
- Reproducible: yes
- Related Files: eslint.config.mjs

### Resolution
- **Resolved**: 2026-07-15T21:48:00+08:00
- **Notes**: 已在干净源码目录中通过 lint，并让 Docker 与 ESLint 永久忽略 AppleDouble 元数据文件。

---

## [ERR-20260715-005] sites_sensitive_readback

**Logged**: 2026-07-15T21:58:30+08:00
**Priority**: high
**Status**: resolved
**Area**: config

### Summary
Sites 项目详情读取结果包含访问令牌，完整序列化响应会扩大凭据暴露面。

### Error
```
项目详情工具在常规元数据之外返回了敏感访问字段。
```

### Context
- 发布前复核 Sites 项目与访问策略时发生。
- 后续输出不得序列化完整项目响应，只能选择非敏感字段。

### Suggested Fix
轮换相关令牌，并让后续工具调用只返回状态、版本、访问模式和 URL 等白名单字段。

### Metadata
- Reproducible: yes
- Related Files: .openai/hosting.json

### Resolution
- **Resolved**: 2026-07-15T21:58:30+08:00
- **Notes**: 已立即轮换令牌；后续 Sites 检查改为白名单字段输出。

---

## [ERR-20260715-006] origin_public_ip_probe

**Logged**: 2026-07-15T22:03:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
从当前 Mac 直接使用源站 IP 和 Host 头访问 Nginx 得到空响应，但 VPS 回环访问同一站点返回 200。

### Error
```
curl: (52) Empty reply from server
```

### Context
- Nginx 已监听公网 80/443，`xinhua.denkisan.me` 站点在 VPS 本机返回 200。
- 域名尚无 Cloudflare DNS 记录，因此最终公网链路还不能验证。

### Suggested Fix
创建 Cloudflare DNS 后从正式域名复测；如果仍失败，再检查云防火墙、Cloudflare 代理与源站访问日志。

### Metadata
- Reproducible: yes
- Related Files: deploy/nginx/xinhua.denkisan.me.conf

### Resolution
- **Resolved**: 2026-07-15T23:38:00+08:00
- **Notes**: Cloudflare DNS 已生效，源站切换为静态 Nginx，并通过正式 HTTPS 域名完成公网浏览器验证。

---

## [ERR-20260715-007] remote_development_workflow

**Logged**: 2026-07-15T22:42:00+08:00
**Priority**: high
**Status**: resolved
**Area**: workflow

### Summary
在本机 Node/npm 只是缺少 PATH 的情况下，错误地把依赖安装、构建与浏览器采集放到低配 VPS，浪费服务器磁盘和计算资源。

### Error
```
应当本地开发、构建和测试，服务器只负责最终部署与线上验证。
```

### Context
- 为复核 `messenger.abeto.co` 使用了 VPS 上的 headless Chrome。
- 随后又准备在 VPS 生成依赖锁和执行构建，超出了合理的服务器用途。
- 用户明确纠正了工作流。

### Suggested Fix
优先检查本机工具的绝对路径；所有依赖、开发、构建、测试和截图对比在本机完成。只有本地验收通过后，才把最终产物一次性部署到服务器。

### Metadata
- Reproducible: yes
- Related Files: package.json, package-lock.json

### Resolution
- **Resolved**: 2026-07-15T22:43:00+08:00
- **Notes**: 已终止服务器上的后续采集流程，改用 `/opt/homebrew/bin/node` 与 `/opt/homebrew/bin/npm` 进行本地工作。

---

## [ERR-20260715-009] sites_sensitive_readback_repeat

**Logged**: 2026-07-15T23:42:00+08:00
**Priority**: high
**Status**: resolved
**Area**: infra

### Summary
复核 Sites 公开访问状态时再次序列化了完整项目响应，其中包含不应进入常规输出的 bypass token。

### Error
```
Sites get_site 响应未按白名单字段裁剪。
```

### Context
- 目标只是确认 `access_mode`、生产 URL 和站点状态。
- 已有 `ERR-20260715-005` 明确要求后续只输出白名单字段。

### Suggested Fix
Sites 项目状态检查必须在工具隔离层只提取 `status`、`access_mode`、`current_live_url` 和版本号，禁止序列化完整响应。

### Metadata
- Reproducible: yes
- Related Files: .openai/hosting.json
- See Also: ERR-20260715-005

### Resolution
- **Resolved**: 2026-07-15T23:42:00+08:00
- **Notes**: 已立即轮换 bypass token，未输出新值；后续状态检查使用字段白名单。

---

## [ERR-20260715-010] goal_state_mismatch

**Logged**: 2026-07-15T23:55:00+08:00
**Priority**: low
**Status**: pending
**Area**: workflow

### Summary
持续目标上下文要求完成后更新 goal，但目标状态接口返回当前线程不存在 goal。

### Error
```
cannot update goal because this thread has no goal
```

### Context
- 实现、部署、正式域名、HTTPS、免登录和浏览器验收均已完成。
- 失败只影响目标元数据标记，不影响产品或基础设施运行态。

### Suggested Fix
目标续跑注入与 goal 状态存储应保持一致；若接口确认无 goal，则以完整验收证据交付并记录工具异常。

### Metadata
- Reproducible: unknown
- Related Files: .learnings/ERRORS.md

---

## [ERR-20260715-010] npm_audit_network

**Logged**: 2026-07-15T23:45:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
沙盒内运行生产依赖审计时无法解析 npm registry，审计请求未真正完成。

### Error
```
npm warn audit request to https://registry.npmjs.org/-/npm/v1/security/advisories/bulk failed,
reason: getaddrinfo ENOTFOUND registry.npmjs.org
npm error audit endpoint returned an error
```

### Context
- 在本地 `lint`、静态生产构建和 5 项测试全部通过后运行。
- 失败来自沙盒网络与日志目录权限，不代表依赖存在漏洞或审计通过。

### Suggested Fix
在获准联网的本机环境重跑 `npm audit --omit=dev`，并单独记录真实审计结果。

### Metadata
- Reproducible: yes
- Related Files: package-lock.json

### Resolution
- **Resolved**: 2026-07-15T23:46:00+08:00
- **Notes**: 在获准联网的本机环境重跑完成，生产依赖审计结果为 0 个漏洞。

---
## [ERR-20260716-018] landmark_full_test_contract

**Logged**: 2026-07-16T18:18:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
两处地标首版通过 Vite 构建，但完整测试暴露 JSON 坐标类型转换不严格，以及阴影测试仍锁定旧的单地标中心。

### Error
```
TS2352: Conversion of type 'number[][]' to type 'MapPolygonPoint[]' may be a mistake
旧断言仍匹配 target.position.set(XINGFULI_POSITION...)
```

### Context
- 命令：`env PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/npm test`
- Vite 构建通过，TypeScript 场景检查和旧阴影契约失败。
- 当前实现已将阴影范围扩展到幸福里、华山绿地与上生·新所三个地标。
- 直接执行全仓 `tsc` 还会遇到既有 Worker 的 Cloudflare 全局类型缺失；项目正式门禁只筛选场景与体验入口错误。
- 首轮修正后，React Compiler 的 Lint 还要求 `useMemo` 第一个参数必须是内联函数。

### Suggested Fix
从 JSON 边界显式映射为二元坐标元组；把阴影测试更新为验证三地标中心和 `SHADOW_CENTER` 目标，不降低覆盖范围。

### Metadata
- Reproducible: yes
- Related Files: app/scene/huashan-green-block.tsx, app/scene/shangsheng-xinsuo-block.tsx, app/scene/xinhua-world.tsx, tests/map-data.test.mjs

### Resolution
- **Resolved**: 2026-07-16T19:25:00+08:00
- **Notes**: JSON 边界改为显式元组映射，阴影契约更新为三地标中心，`useMemo` 改为内联函数；完整测试 27/27 和 Lint 均通过。

---
## [ERR-20260716-019] landmark_runtime_sky_only

**Logged**: 2026-07-16T18:29:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
两处地标接入后，默认、华山绿地和上生新所三个起点在浏览器进入闲逛状态时都只显示天空。

### Error
```
WebGL Canvas 正常加载且无页面异常，进入闲逛后场景几何与人物不可见，只剩天空背景。
```

### Context
- 本地最新静态资产：`index-CpT37ghb.js`。
- `npm test` 27/27 通过，Lint 修正后通过。
- 浏览器网络只见 favicon 404；控制台仅有 THREE.Clock 弃用警告。
- `?start=huashan`、`?start=shangsheng` 与默认起点表现一致。

### Suggested Fix
在 `qa=1` 下临时输出相机和人物坐标，确认 `PlayableMessenger` 帧循环是否运行以及相机是否得到有限坐标；再隔离新地标几何或相机碰撞源。

### Metadata
- Reproducible: yes
- Related Files: app/scene/xinhua-world.tsx, app/scene/huashan-green-block.tsx, app/scene/shangsheng-xinsuo-block.tsx

### Resolution
- **Resolved**: 2026-07-16T19:25:00+08:00
- **Notes**: 结构化浏览器错误显示 `data-landmark` 与 `data-osm-way` 在同一 R3F 对象上被解释为嵌套属性路径；两处地标全部改用 Three.js `name + userData`。新增源码契约禁止 `data-osm-way`，桌面和手机新会话 `errors=[]`，默认与全部地标直达坐标恢复渲染。

---
## [ERR-20260716-020] apply_patch_mixed_file_context

**Logged**: 2026-07-16T19:07:00+08:00
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
补充篮球场验收坐标时，把测试断言上下文误放进场景文件补丁段，导致补丁校验失败。

### Error
```
apply_patch verification failed: Failed to find expected lines in app/scene/xinhua-world.tsx
```

### Context
- 补丁同时修改 `xinhua-world.tsx` 和 `tests/landmarks.test.mjs`。
- 失败发生在应用补丁前，没有产生部分写入。

### Suggested Fix
按文件拆分并使用各自真实上下文重新应用。

### Metadata
- Reproducible: yes
- Related Files: app/scene/xinhua-world.tsx, tests/landmarks.test.mjs

### Resolution
- **Resolved**: 2026-07-16T19:08:00+08:00
- **Notes**: 已读取精确上下文并分文件重新应用。

---
## [ERR-20260716-022] agent_browser_environment_and_cli_mismatch

**Logged**: 2026-07-16T20:43:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
最终浏览器验收时连续遇到 shell URL 展开、缺失 PATH、沙箱 socket 权限、错误子命令及一次 Chrome crashpad 启动失败。

### Error
```
zsh: no matches found: http://127.0.0.1:4173/?start=huashan
command not found: agent-browser
Socket directory '/Users/lei/.agent-browser' is not writable
Unknown subcommand: errors
Chrome exited early without writing DevToolsActivePort
```

### Context
- 当前 shell PATH 没有 `/opt/homebrew/bin`，但二进制位于该目录。
- `?` 未加引号时被 zsh 当成 glob。
- 正确错误读取命令是顶级 `errors`，不是 `get errors`。
- 一次性关闭全部旧 WebGL 会话后，首次重启 Chrome crashpad 异常，第二次启动成功。

### Suggested Fix
URL 始终加单引号；使用绝对二进制路径；浏览器命令按 skill/`--help` 的顶级语法调用；涉及 home socket 时走已授权的沙箱外执行；Chrome 早退先做一次同参数重试。

### Metadata
- Reproducible: partially
- Related Files: /opt/homebrew/bin/agent-browser

### Resolution
- **Resolved**: 2026-07-16T20:43:00+08:00
- **Notes**: 后续全部使用绝对路径和正确顶级命令；关闭冗余 WebGL 会话后，干净手机会话华山绿地 5 秒采样达到 60 FPS，浏览器错误为空。
- **Recurrence**: 2026-07-17 三次复查本地预览时遗漏 URL 引号；均在发现后改用单引号重试成功。后续所有带查询参数的本地 URL 必须直接使用单引号模板。
- **Recurrence**: 2026-07-17 线上发布验收完成后，`agent-browser close` 再次因用户级 socket 目录不可写而失败；页面打开、点击和 DOM 验收均已成功，关闭命令应继续使用已授权的沙箱外执行。

---
## [ERR-20260716-023] stale_xingfuli_obstacle_source_contract

**Logged**: 2026-07-16T20:47:00+08:00
**Priority**: low
**Status**: resolved
**Area**: test

### Summary
相机性能优化把幸福里障碍的全局变换抽成可复用常量后，旧源码正则仍要求在总障碍数组中直接展开局部障碍名，导致完整测试 27/28。

### Error
```
The input did not match the regular expression /\.\.\.XINGFULI_OBSTACLES/
```

### Context
- `XINGFULI_WORLD_OBSTACLES` 由 `XINGFULI_OBSTACLES.map(transformMapObstacle)` 生成。
- 角色障碍与相机障碍现在复用同一组全局结果，避免重复变换并维持坐标一致。

### Suggested Fix
测试同时验证“局部障碍经过统一变换生成全局常量”和“总障碍数组展开该全局常量”，不要锁死旧的内联写法。

### Metadata
- Reproducible: yes
- Related Files: app/scene/xinhua-world.tsx, tests/rendered-html.test.mjs

### Resolution
- **Resolved**: 2026-07-16T20:47:00+08:00
- **Notes**: 已更新源码契约断言，并保留幸福里碰撞变换链路验证。

---

## [ERR-20260717-027] browser_statsig_initialize_timeout

**Logged**: 2026-07-17T15:36:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
接管本地测试页时，浏览器控制组件的 Statsig 初始化请求超时，但目标页面仍正常加载。

### Error
```
[Statsig] A networking error occurred during POST request to https://ab.chatgpt.com/v1/initialize
Timeout of 10000ms expired
```

### Context
- 目标是 `http://127.0.0.1:3002/?start=house315`。
- DOM、WebGL 场景和页面控制台均正常，错误来自浏览器控制组件而非项目代码。

### Suggested Fix
把该错误与页面 `tab.dev.logs()` 分开判断；只要本地页面加载、交互和项目控制台正常，不应把 Statsig 超时归因于应用。

### Metadata
- Reproducible: unknown
- Related Files: none

### Resolution
- **Resolved**: 2026-07-17T15:36:00+08:00
- **Notes**: 继续完成页面点击、视角旋转和截图，项目错误日志为空。

---

## [ERR-20260717-028] sandbox_dns_blocks_reference_download

**Logged**: 2026-07-17T16:10:00+08:00
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
本地沙箱中的 `curl` 无法解析外部参考站点域名，不能直接批量下载地标照片页。

### Error
```
curl: (6) Could not resolve host
```

### Context
- 目标是为真实建筑制作“公开照片与系统同角度截图”对照表。
- CGTN、上海长宁、澎湃、上观、gooood 等多个域名均出现同样的 DNS 限制。
- 已创建的 `test_*.html` 空占位文件按爬取数据保留规则不删除。

### Suggested Fix
外部资料检索改用已联网的 Web 通道；如仍需落地原图，再对明确的单张图片 URL 申请受控网络下载。

### Metadata
- Reproducible: yes
- Related Files: test_artifacts/test_landmark_comparison_sources/

### Resolution
- **Resolved**: 2026-07-17T16:10:00+08:00
- **Notes**: 改用 Web 检索和页面图片链接提取，项目本地服务继续由浏览器直接验证。

---

## [ERR-20260717-029] query_only_navigation_keeps_old_start_camera

**Logged**: 2026-07-17T16:28:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: test

### Summary
批量切换 `?start=` 查询参数时，React 保留上一场景的相机状态，导致不同文件出现重复截图。

### Error
```
不同地标截图出现相同 SHA-1，URL 虽已变化但画面仍沿用上一入口。
```

### Context
- `requestedStartPreset()` 的结果被组件 `useMemo` 保留。
- 仅导航到同一路径的新查询参数不足以保证游玩组件重新挂载。
- 开场动画结束与 3D 游玩态完成也不能只用固定等待时间判断。

### Suggested Fix
每栋建筑截图前执行整页重载；看到“开始闲逛”后点击，并以“查看操作说明”按钮出现作为游玩态完成信号，再调整相机和保存截图。

### Metadata
- Reproducible: yes
- Related Files: app/scene/xinhua-world.tsx, docs/research/assets/landmark-comparison/

### Resolution
- **Resolved**: 2026-07-17T16:28:00+08:00
- **Notes**: 9 个入口均按整页重载和 UI 状态门槛重新采集，最终截图尺寸统一为 1280 × 720 且 SHA-1 全部不同。

---

## [ERR-20260717-031] nominatim_missing_micro_space

**Logged**: 2026-07-17T17:05:00+08:00
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
Nominatim 无法按名称或门牌直接定位新华路口袋公园这类弄堂级微空间。

### Error
```
Error: 无法定位：新华路口袋公园
```

### Context
- `scripts/test_fetch_requested_pois.mjs` 先搜索“新华路口袋公园 上海”，再搜索“新华路359号 上海”，均返回空结果。
- 设计方资料已确认公园位于新华路359号青年中心旁，但该微空间没有独立 OSM/Nominatim 条目。

### Suggested Fix
为缺少标准地图条目的微空间配置经来源验证的回退坐标；用周边道路、相邻建筑和现场照片校核，且在快照中明确标记 `inferred: true`，不伪装成地理编码直接命中。

### Metadata
- Reproducible: yes
- Related Files: scripts/test_fetch_requested_pois.mjs, docs/research/requested-poi-model-brief.md

### Resolution
- **Resolved**: 2026-07-17T18:38:48+08:00
- **Notes**: 脚本先用街区级 OSM 精确条目定位，再对缺少条目的三处使用带 `evidence` 与 `inferred: true` 的路网投影坐标，成功生成新的快照文件。

---

## [ERR-20260717-032] overpass_rate_limit_on_sequential_radius_queries

**Logged**: 2026-07-17T18:35:00+08:00
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
对五个地点连续发送半径查询时，Overpass 主节点返回 429。

### Error
```
Error: 429 Too Many Requests: https://overpass-api.de/api/interpreter
```

### Context
- 原脚本完成一次街区种子查询后，又为每个地点分别请求一次周边数据。
- 快速连续请求容易触发公共 Overpass 节点限流。

### Suggested Fix
把所有地点的半径选择器合并为一次批量查询，并配置第二个公共节点作为只读备用端点。

### Metadata
- Reproducible: yes
- Related Files: scripts/test_fetch_requested_pois.mjs

### Resolution
- **Resolved**: 2026-07-17T18:38:48+08:00
- **Notes**: 改为一次种子查询加一次整批周边查询；成功写入 `requested-pois-osm-20260717-103840.json`。

---
## [ERR-20260717-033] in_app_browser_screenshot

**Logged**: 2026-07-17T19:10:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
道路回退后本地 WebGL 页面可进入，但应用内浏览器连续两次截取当前画面超时。

### Error
```
Timed out running CDP command "Page.captureScreenshot"
```

### Context
- 已重新构建静态产物并刷新 `http://127.0.0.1:3002/?start=cinema`
- DOM 显示场景与“开始闲逛”按钮正常，点击后仅截图命令超时
- 同时工作区新增了多处 POI 模型，页面首次加载和 GPU 截图负担较之前更高

### Suggested Fix
后续视觉验收优先复用用户当前可见页面；若必须自动留图，使用新标签页或降低临时视口后再截取，不把 CDP 截图超时误判为场景构建失败。

### Metadata
- Reproducible: yes
- Related Files: app/scene/xinhua-map.tsx
- See Also: ERR-20260717-029

### Resolution
- **Resolved**: 2026-07-17T19:27:00+08:00
- **Notes**: 改用真实 Chrome 会话逐页重载；点击进入游玩态后等待 GPU 再稳定 2.5 秒才保存截图，六处 POI 均成功留图。WebGL 首帧偶发黑块属于截图过早，稳定后消失。

---

## [ERR-20260717-034] blender_metal_crash_in_sandbox

**Logged**: 2026-07-17T18:46:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tooling

### Summary
Blender 在受限沙箱中后台导出时触发 Metal 初始化崩溃，无法生成 GLB、Blend 和固定机位预览。

### Error
```
Segmentation fault
```

### Context
- 任务需要用同一生成器保留运行时 GLB、可编辑 Blend 与预览图。
- Blender 即使使用 `--background` 仍会初始化本机图形栈。

### Suggested Fix
在用户批准后，通过受控命令前缀于沙箱外运行 Blender；仍使用 `--background --python`，不打开交互窗口。

### Metadata
- Reproducible: yes
- Related Files: scripts/create_requested_poi_models.py

### Resolution
- **Resolved**: 2026-07-17T19:19:20+08:00
- **Notes**: 使用获批的 `/opt/homebrew/bin/blender --background --python` 成功重导出资产，并通过 GLB 审计。

---

## [ERR-20260717-035] chrome_locator_detached_during_webgl_loading

**Logged**: 2026-07-17T19:07:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
批量导航 WebGL 入口时，加载页切换导致“开始闲逛”按钮 locator 失效。

### Error
```
Element is not attached
```

### Context
- 同一标签页连续切换多个 `?start=` 参数。
- 3D 资源加载完成时，欢迎界面按钮会重新挂载。

### Suggested Fix
每次导航后先等待完整页面状态，用 DOM 快照确认“开始闲逛”出现，再创建新的 locator 并点击；截图前额外等待渲染稳定。

### Metadata
- Reproducible: yes
- Related Files: test_artifacts/test_runtime_*.png

### Resolution
- **Resolved**: 2026-07-17T19:27:00+08:00
- **Notes**: 改为逐入口加载、确认、点击和保存，最终生成六张不同的运行时验收截图。

---

## [ERR-20260717-036] blender_sandbox_crash_on_road_fix_export

**Logged**: 2026-07-17T20:06:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tooling

### Summary
道路退界修复重新导出三项资产时，Blender 再次在受限沙箱中崩溃。

### Error
```
ArchWarn: ARCH_CACHE_LINE_SIZE != Arch_ObtainCacheLineSize()
Segmentation fault: 11
```

### Context
- 使用 `blender --background --python scripts/create_requested_poi_models.py`。
- 脚本只重导出口袋公园、法华遗韵和 FICS 新华 365。
- 源代码与既有模型文件未被删除。

### Suggested Fix
沿用已验证方案，在沙箱外以受控 Blender 后台命令重导出，并完成 GLB 边界与浏览器复测。

### Metadata
- Reproducible: yes
- Related Files: scripts/create_requested_poi_models.py
- See Also: ERR-20260717-034

### Resolution
- **Resolved**: 2026-07-17T20:20:00+08:00
- **Notes**: 使用已批准的沙箱外 Blender 后台命令成功重导出 3 项资产，并生成新的 Blend、GLB 与固定机位预览。

---

## [ERR-20260717-037] eslint_scans_nested_worktree_builds

**Logged**: 2026-07-17T20:25:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
仓库级 lint 扫描 `.worktrees/restore-world-map` 内的历史构建产物，产生大量与当前源码无关的错误。

### Error
```
✖ 9031 problems (164 errors, 8867 warnings)
```

### Context
- 根目录命令已经忽略 `dist`、`dist-static` 和 `.next`，但未忽略嵌套 `.worktrees`。
- 本轮静态构建和 60 项测试均已通过。
- 报错路径主要位于 `.worktrees/restore-world-map/dist*`。

### Suggested Fix
在 Git 与 ESLint 的全局忽略规则中排除 `.worktrees/**`，再从含嵌套 worktree 的主目录运行完整 lint。

### Metadata
- Reproducible: yes
- Related Files: .gitignore, eslint.config.mjs
- See Also: ERR-20260715-008

### Resolution
- **Resolved**: 2026-07-17T21:45:00+08:00
- **Notes**: 已在 `.gitignore` 和 ESLint `globalIgnores` 中排除 `.worktrees/**`，发布工作树全局 lint 通过。

---

## [ERR-20260717-038] release_branch_stale_poi_tests

**Logged**: 2026-07-17T21:05:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
把新增地标叠加到最新远端主线后，旧测试仍锁定地标数量和旧实现，并暴露新增全览 POI 缺少图片元数据。

### Error
```
tests 55
pass 50
fail 5
17 !== 12
缺少地标：新华公馆
```

### Context
- 当前工作区比 `origin/main` 落后 9 个提交，不能直接发布旧基线。
- 新建发布 worktree 后，生产静态构建成功。
- 失败项均来自最新主线中的旧数量、旧源码正则或旧碰撞断言；全览 POI 的通用图片完整性断言还发现新增地标没有卡片图片。

### Suggested Fix
在最新主线上同步本轮地标测试契约，为新增 POI 提供可发布的原创 3D 预览元数据，再重跑完整测试和 Sites 构建。

### Metadata
- Reproducible: yes
- Related Files: tests/test_dual_scale_navigation.test.mjs, tests/test_xinhua_road_models.test.mjs, app/scene/poi-data.ts

### Resolution
- **Resolved**: 2026-07-17T21:12:00+08:00
- **Commit/PR**: 816d424
- **Notes**: 发布分支同步了最新测试契约，为 6 个新增 POI 接入原创 3D 预览和卡片元数据；59 项测试、全局 lint 与 Sites 构建全部通过。

---

## [ERR-20260717-039] sites_source_push_provenance

**Logged**: 2026-07-17T21:24:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
Sites 源码推送先因凭据响应多一层结构被安全拦截，修正解析后又因远端 main 已有更新而拒绝非快进推送。

### Error
```
Rejected: remote, branch and credential were undefined
! [rejected] HEAD -> main (non-fast-forward)
```

### Context
- 第一次失败发生在任何 Git 写入前，安全机制阻止了空目标推送。
- 第二次使用了明确的 Sites 专用仓库和 main 分支，但远端已有 4 个新提交。
- 没有使用 force push，也没有覆盖现有线上源码。

### Suggested Fix
从连接器响应的 `structuredContent` 读取短期凭据；推送前先抓取 Sites main，以其最新提交为基线重新整合、测试、构建和提交。

### Metadata
- Reproducible: yes
- Related Files: .openai/hosting.json

### Resolution
- **Resolved**: 2026-07-17T21:24:00+08:00
- **Commit/PR**: 14f4bc9
- **Notes**: 最终提交基于 Sites 最新 main，64 项测试、全局 lint 与 Sites 构建通过后，以普通快进方式成功推送。

---

## [ERR-20260717-040] local_preview_and_browser_docs_bootstrap

**Logged**: 2026-07-17T22:25:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
沙箱内启动本地预览被端口权限拒绝，首次读取浏览器文档时又误用了不存在的 `browser.docs` 接口。

### Error
```
Error: listen EPERM: operation not permitted 127.0.0.1:3002
Cannot read properties of undefined (reading 'listNamespaces')
```

### Context
- 本地视觉验收需要启动静态构建并连接应用内浏览器。
- 3002 和 3003 已被旧 Python 预览占用，本轮新预览最终运行在 3004。
- 当前浏览器客户端的完整文档入口是 `browser.documentation()`。

### Suggested Fix
端口监听失败后按权限流程启动预览并检查真实占用；浏览器连接后直接调用并完整读取 `browser.documentation()`，不要假设存在命名空间接口。

### Metadata
- Reproducible: yes
- Related Files: package.json

### Resolution
- **Resolved**: 2026-07-17T22:28:00+08:00
- **Notes**: 已在 3004 启动最新静态预览，完整读取浏览器文档并完成全览画面验收。

---
