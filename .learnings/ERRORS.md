# Errors

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
