# Errors

## [ERR-20260719-079] map_test_locked_old_fallback_scale

**Logged**: 2026-07-19T14:02:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
完整测试仍锁定旧卡通 fallback 的 `body scale={0.9}`，自然比例占位角色删除该补偿缩放后出现误报。

### Error
```
Expected /<group ref={body} scale={0.9}>/
```

### Context
- 角色半径、最终 GLB 比例、幸福里通行宽度和建筑高度均未退化。
- 新 fallback 直接按约 1.9 米比例建模，不再需要旧卡通人物的整体缩放。

### Suggested Fix
回归测试锁定最终 GLB 比例、自然比例 fallback 结构和通行宽度，不再锁定旧实现的内部补偿值。

### Metadata
- Reproducible: yes
- Related Files: tests/map-data.test.mjs, app/scene/xinhua-world.tsx

### Resolution
- **Resolved**: 2026-07-19T14:03:00+08:00
- **Notes**: 已改为验证 `urban-wanderer` 运行时比例、自然 fallback 和既有街巷净宽。

---

## [ERR-20260721-081] create_goal_existing_active_goal_recurrence

**Logged**: 2026-07-21T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
用户以 `/goal` 继续已有目标时，未先读取当前 Goal 就重复调用了创建接口。

### Error
```text
cannot create a new goal because this thread has an unfinished goal; complete the existing goal first
```

### Context
- 当前线程已经存在内容完全一致的 active Goal。
- 重复创建没有覆盖或修改原 Goal。

### Suggested Fix
收到 `/goal` 后先调用 `get_goal`；若 active Goal 与用户目标一致，直接沿用，只有不存在未完成 Goal 时才创建。

### Metadata
- Reproducible: yes
- Related Files: `.learnings/ERRORS.md`
- See Also: ERR-20260716-024

### Resolution
- **Resolved**: 2026-07-21T00:00:00+08:00
- **Notes**: 已读取并沿用现有 Goal，未再次创建。

---

## [ERR-20260721-082] sun_ke_blender_browser_toolchain

**Logged**: 2026-07-21T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
孙科别墅批处理首次受 Blender 5.2 环境差异与浏览器验收接口边界影响，未直接产生产物或性能数据。

### Error
```text
ARCH_CACHE_LINE_SIZE != Arch_ObtainCacheLineSize
BLENDER_EEVEE_NEXT not found in ('BLENDER_EEVEE', ...)
Performance API unavailable in browser read-only evaluate sandbox
Input.dispatchKeyEvent is not supported through raw CDP
OSError: [Errno 48] Address already in use
```

### Context
- Blender 在文件沙箱中启动时触发 USD cache-line assertion；经批准在宿主应用二进制中运行后正常。
- Blender 5.2 的有效 Eevee enum 为 `BLENDER_EEVEE`。
- 浏览器只读 evaluate 不暴露 `globalThis.performance`；CDP 支持性能指标，但不允许原始持续按键注入。
- `agent-browser` CLI 不在当前环境，改用已安装的 in-app Browser 插件完成真实页面验收。
- 重新启动预览时 3002 端口已有 Python 服务监听；沙箱内 curl 无法访问，但宿主环境复核返回 HTTP 200。

### Suggested Fix
先探测 Blender 版本对应 enum；需要真实宿主应用时按权限流程运行。浏览器验收优先使用公开 locator/CUA API，性能采样使用 `Performance.getMetrics`，不要依赖页面 evaluate 中的全局 Performance API 或未经支持的 CDP 输入注入。

### Metadata
- Reproducible: yes
- Related Files: `scripts/create_sun_ke_villa_model.py`, `docs/research/sun-ke-villa-model-brief.md`

### Resolution
- **Resolved**: 2026-07-21T00:00:00+08:00
- **Notes**: Blender 产物已生成；运行时截图、页面状态、console error 与 CDP 性能指标已保存并写回 Brief；已有 3002 服务继续复用，无需重复启动。

---

## [ERR-20260721-083] sun_ke_material_sources_inferred_any

**Logged**: 2026-07-21T00:00:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: typescript

### Summary
孙科别墅材质替换先把 `Array.isArray` 结果保存为 boolean，导致 TypeScript 无法继续缩窄 `Mesh.material`，完整测试在类型检查阶段失败。

### Error
```text
Parameter 'source' implicitly has an 'any' type.
Binding element 'name' implicitly has an 'any' type.
Property 'clone' does not exist on type '{}'.
```

### Context
- `sourceWasArray` 仍用于决定回写单材质或材质数组，但不能代替原表达式参与控制流缩窄。
- ESLint 不报告该问题，仓库的 `tests/typecheck-scene.test.mjs` 才会执行严格 TypeScript 检查。

### Suggested Fix
为归一化后的材质列表显式声明 `Material[]`，避免在未推断类型的回调参数中直接解构；读取 `color` 前再用 Three.js 材质类完成类型缩窄。

### Metadata
- Reproducible: yes
- Related Files: `app/scene/shangsheng-xinsuo-block.tsx`, `tests/typecheck-scene.test.mjs`

### Resolution
- **Resolved**: 2026-07-21T00:00:00+08:00
- **Notes**: 已显式标注 `sources: Material[]`，使用具名 `source` 参数读取材质名，并用具体材质类缩窄 `color`。

---

## [ERR-20260721-084] gltf_single_material_mesh_assigned_array

**Logged**: 2026-07-21T00:00:00+08:00
**Priority**: high
**Status**: resolved
**Area**: runtime

### Summary
孙科别墅 GLB 请求成功且场景坐标正确，但材质替换把 GLTFLoader 生成的单材质 Mesh 改成长度为一的材质数组，导致模型不绘制。

### Error
```text
GLB HTTP 200/304，控制台 0 error，场景定位标记可见，但建筑完全不可见。
```

### Context
- Blender 与 GLB 结构审计均通过，问题只发生在 Three.js 材质替换后。
- Node GLTFLoader 审计显示八个 primitive 被拆成八个单材质 Mesh，且每个 `geometry.groups.length === 0`。
- Three.js 的材质数组需要 geometry groups 选择材质；无 groups 的单材质 Mesh 必须继续赋单个 Material。

### Suggested Fix
替换材质前记录原 `child.material` 是否为数组；只有原值为数组时才回写数组，否则回写 `replacements[0]`。用实际页面截图而不是 HTTP 成功或无 console error 判断模型是否完成。

### Metadata
- Reproducible: yes
- Related Files: `app/scene/shangsheng-xinsuo-block.tsx`, `tests/test_sun_ke_villa_model.test.mjs`, `docs/research/sun-ke-villa-model-brief.md`

### Resolution
- **Resolved**: 2026-07-21T00:00:00+08:00
- **Notes**: 已按原材质形态回写并加入源码回归断言；`/?start=sunke` 实页显示正常，临时紫色定位标记已移除。

---

## [ERR-20260721-085] required_screenshots_hidden_by_gitignore

**Logged**: 2026-07-21T00:00:00+08:00
**Priority**: high
**Status**: resolved
**Area**: delivery

### Summary
孙科别墅测试最初只验证本机截图存在，但文件名没有命中仓库 `test_*_preview.png` 的反忽略规则，干净 checkout 会缺少正式交付图并导致测试失败。

### Error
```text
.gitignore:15:/test_artifacts/*
git ls-files: no matching Sun Ke Villa screenshots
```

### Context
- 本地脏工作区中的存在性测试会掩盖“文件无法进入提交”的交付缺口。
- AGENTS 明确要求 canonical、侧向和运行时验收截图。

### Suggested Fix
正式验收图必须以 `test_` 开头并以 `_preview.png` 结尾；完成前同时执行 `git check-ignore -v` 和 `git status --short`，不能只检查文件存在。

### Metadata
- Reproducible: yes
- Related Files: `.gitignore`, `tests/test_sun_ke_villa_model.test.mjs`, `test_artifacts/`

### Resolution
- **Resolved**: 2026-07-21T00:00:00+08:00
- **Notes**: 三张分批图、三张最终 Blender 图和两张运行时图均改为 `test_sun_ke_villa_*_preview.png`，生成器、测试和文档同步更新，Git 可见性已复核。

---

## [ERR-20260721-086] browser_screenshot_jpeg_bytes_png_extension

**Logged**: 2026-07-21T00:00:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: evidence

### Summary
浏览器截图接口返回 JPEG 字节，但验收文件使用 `.png` 扩展名；只检查尺寸和大小会把伪 PNG 当成正式证据。

### Error
```text
actual signature: ffd8ffe000104a46
expected PNG: 89504e470d0a1a0a
```

### Context
- 图片能被多数查看器按内容嗅探打开，因此人工查看没有暴露扩展名错误。
- 干净交付需要文件格式、扩展名和测试断言一致。

### Suggested Fix
截图入库前检查 magic bytes；需要 `.png` 时显式转码，再同时断言 PNG signature、像素尺寸和最小文件大小。

### Metadata
- Reproducible: yes
- Related Files: `tests/test_sun_ke_villa_model.test.mjs`, `test_artifacts/test_sun_ke_villa_runtime_preview.png`

### Resolution
- **Resolved**: 2026-07-21T00:00:00+08:00
- **Notes**: 两张运行时图已转为真实 1767 × 851 PNG，测试新增 signature 与尺寸检查。

---

## [ERR-20260719-081] dedupe-protected-research-data

**Logged**: 2026-07-19T23:00:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tooling

### Summary
迁移去重命令把受保护的小红书派生转录占位文件与普通重复建筑资产放在同一删除批次，因研究数据保护规则被拒绝。

### Error
```text
该去重会删除 research/external-xhs 下的派生研究数据；
未获明确允许不得删除爬取或派生证据。
```

### Context
- 建筑源文件、脚本、预览和参考照片已通过 SHA-1 确认为目标仓库原有文件的迁移副本。
- 两个空转录文件属于外部内容证据链，即使内容为空也不能按普通重复文件处理。

### Suggested Fix
去重必须先按数据类别分组；爬取、转录、帧、音频和其他证据文件默认只读保留。只清理可由目标仓库权威文件替代、且已更新引用路径的代码和建筑资产副本。

### Metadata
- Reproducible: yes
- Related Files: `research/external-xhs/`, `research/poi-evidence-manifest.json`

### Resolution
- **Resolved**: 2026-07-19T23:01:00+08:00
- **Notes**: 后续命令完全排除 external-xhs，只删除 12 个已验证的建筑资料副本。

---

## [ERR-20260719-078] vinext_dev_ipv6_localhost_only

**Logged**: 2026-07-19T13:51:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
本轮 vinext 开发服务器只监听 `localhost` 的 IPv6 地址，使用 `127.0.0.1:3004` 验收时连接被拒绝。

### Error
```
Navigation failed: net::ERR_CONNECTION_REFUSED
```

### Context
- `curl http://localhost:3004/` 返回 200。
- `curl http://127.0.0.1:3004/` 无法连接，开发进程本身仍正常运行。

### Suggested Fix
本地浏览器验收使用开发服务器输出的精确 URL；只有需要 IPv4 访问时才显式配置 host 绑定。

### Metadata
- Reproducible: yes
- Related Files: package.json

### Resolution
- **Resolved**: 2026-07-19T13:52:00+08:00
- **Notes**: 改用 `http://localhost:3004/` 后完成桌面、手机、全览和探索态截图。

---

## [ERR-20260719-077] poi_manifest_stale_card_paths

**Logged**: 2026-07-19T13:47:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
运行时切换到轻量缩略图后，POI 证据清单仍锁定旧原图路径，专项测试失败。

### Error
```
actual: /images/poi-thumbnails/xingfuli.jpg
expected: /images/poi/xingfuli.jpg
```

### Context
- 原始本地照片仍完整保留，没有删除。
- `cardPhoto` 表示运行时卡片资源，应该同步到新缩略图路径。

### Suggested Fix
更新证据清单中的 17 个 `cardPhoto`，测试同时验证缩略图路径、本地文件和照片证据来源。

### Metadata
- Reproducible: yes
- Related Files: docs/research/poi-reference-manifest.json, tests/test_poi_reference_manifest.test.mjs

### Resolution
- **Resolved**: 2026-07-19T13:48:00+08:00
- **Notes**: 清单与运行时统一使用 `images/poi-thumbnails`，原始照片继续保留在 `images/poi`。

---

## [ERR-20260719-076] tree_variant_test_expected_literal_instances

**Logged**: 2026-07-19T13:43:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
梧桐树测试把三个 JSX 实例写死为文本计数，改成数组映射和独立 Suspense 后误报只剩一个变体。

### Error
```
AssertionError: 1 !== 3
```

### Context
- 三个模型路径、变体类型和实际 placement 数据均未减少。
- 运行时改用 `TREE_MODELS.map` 是为了让三个 GLB 并行独立加载。

### Suggested Fix
测试应验证三条模型路径、映射渲染、独立 Suspense 和 placement 中的 0/1/2 三个变体，而不是统计重复 JSX 文本。

### Metadata
- Reproducible: yes
- Related Files: tests/test_xinhua_road_models.test.mjs, app/scene/xinhua-road-landmarks.tsx

### Resolution
- **Resolved**: 2026-07-19T13:44:00+08:00
- **Notes**: 已改为验证 `TREE_MODELS.map`、独立 Suspense 和三个运行时 placement 变体。

---

## [ERR-20260719-075] ffmpeg_missing_webp_encoder

**Logged**: 2026-07-19T13:31:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
系统 ffmpeg 未编译 `libwebp`，无法直接生成 WebP POI 缩略图。

### Error
```
Unknown encoder 'libwebp'
Error selecting an encoder
```

### Context
- 原图与已生成的 JPEG 均未被删除或覆盖。
- 失败只产生于 `/private/tmp/test_xingfuli.webp` 的格式探针。

### Suggested Fix
使用系统 `sips` 生成 640px、质量 68 的独立 JPEG 缩略图，保持浏览器兼容且无需新增构建依赖。

### Metadata
- Reproducible: yes
- Related Files: public/images/poi-thumbnails

### Resolution
- **Resolved**: 2026-07-19T13:32:00+08:00
- **Notes**: 已用 sips 生成 17 张独立 JPEG 缩略图，总体积由原图 9.2MB 降为 1.5MB。

---

## [ERR-20260719-074] agent_browser_socket_sandbox

**Logged**: 2026-07-19T13:20:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
沙箱模式禁止 agent-browser 写入用户目录下的会话 socket，首次线上验证未能启动。

### Error
```
Socket directory '/Users/lei/.agent-browser' is not writable: Operation not permitted
```

### Context
- 页面与代码没有报错。
- 同一命令需要访问 agent-browser 自己的状态目录。

### Suggested Fix
对明确范围的 agent-browser 命令请求权限后重试，不改变项目文件或浏览器配置。

### Metadata
- Reproducible: yes
- Related Files: none

### Resolution
- **Resolved**: 2026-07-19T13:21:00+08:00
- **Notes**: 获得 agent-browser 命令范围授权后成功启动独立线上验证会话。

---

## [ERR-20260718-058] gltf_probe_extra_brace

**Logged**: 2026-07-18T14:16:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
用 Node 临时读取 Quaternius glTF 结构时，单行脚本末尾多写一个右花括号。

### Error
```
SyntaxError: Unexpected token '}'
```

### Context
- 资产文件已正常下载并解压。
- 失败仅发生在只读结构探针，不涉及模型修改。

### Suggested Fix
缩短单行探针并先只输出一个模型；复杂资产检查改用仓库脚本。

### Metadata
- Reproducible: yes
- Related Files: none

### Resolution
- **Resolved**: 2026-07-18T14:17:00+08:00
- **Notes**: 删除多余花括号并重新执行只读 glTF 检查。

---

## [ERR-20260718-057] three_package_version_exports

**Logged**: 2026-07-18T14:08:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
用 CommonJS `require` 直接读取 Three.js 的 `package.json` 时被包的 exports 边界拒绝。

### Error
```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './package.json' is not defined by "exports"
```

### Context
- 尝试命令：`require('three/package.json').version`。
- Blender 与角色资产工具检查均正常，该错误不影响运行时或角色制作。

### Suggested Fix
需要确认依赖版本时使用包管理器的依赖树输出，不直接读取受 exports 限制的包内部文件。

### Metadata
- Reproducible: yes
- Related Files: package.json

### Resolution
- **Resolved**: 2026-07-18T14:08:00+08:00
- **Notes**: 后续使用 `npm list three --depth=0` 查询版本。

---

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

## [ERR-20260718-048] sandbox_preview_port_permission

**Logged**: 2026-07-18T11:40:11+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
新 worktree 内的 Vite 静态预览首次启动时，普通沙箱不允许监听本机端口。

### Error
```
Error: listen EPERM: operation not permitted 127.0.0.1:4174
```

### Context
- `npm test` 已完成生产构建并通过 74 项测试，失败不属于应用构建或运行时代码。
- 预览命令为 `npm run preview:static -- --host 127.0.0.1 --port 4174`。
- 当前环境对本地监听端口要求受控授权。

### Suggested Fix
需要浏览器验收时，在不修改网络配置的前提下，以受控权限重新运行同一条预览命令。

### Metadata
- Reproducible: yes
- Related Files: package.json, vite.static.config.ts

### Resolution
- **Resolved**: 2026-07-18T11:41:00+08:00
- **Notes**: 使用受控权限在 127.0.0.1:4174 启动静态预览，并完成桌面与移动端验收。

---

## [ERR-20260718-049] zsh_unquoted_query_url

**Logged**: 2026-07-18T11:42:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
浏览器命令中的查询参数 URL 未加引号，被 zsh 当作通配符拒绝执行。

### Error
```
zsh:1: no matches found: http://127.0.0.1:4174/?start=xingfuli
```

### Context
- 页面和预览服务均正常，失败发生在 shell 参数展开阶段。
- URL 含有 `?`，在 zsh 中需要整体加引号。

### Suggested Fix
所有包含查询参数的浏览器 URL 都使用单引号包裹。

### Metadata
- Reproducible: yes
- Related Files: none

### Resolution
- **Resolved**: 2026-07-18T11:42:00+08:00
- **Notes**: 后续浏览器命令统一使用带引号的完整 URL。

---

## [ERR-20260718-050] agent_browser_viewport_subcommand

**Logged**: 2026-07-18T11:45:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
固定浏览器视口时误把 `viewport` 当作顶层命令，并在连续调用中触发本地 socket 权限提示。

### Error
```
Unknown command: viewport
Socket directory '/Users/lei/.agent-browser' is not writable: Operation not permitted
```

### Context
- `agent-browser --help` 把该能力列在 `set` 命令下，正确形式不是顶层 `agent-browser viewport`。
- 同一 shell 内连续启动多个调用会放大 socket 访问问题，应改为串行、单次调用。

### Suggested Fix
使用 `agent-browser set viewport <width> <height>`，每次调用完成后再执行下一条浏览器命令。

### Metadata
- Reproducible: yes
- Related Files: none

### Resolution
- **Resolved**: 2026-07-18T11:45:00+08:00
- **Notes**: 已改用正确的 `set viewport` 子命令和串行执行。

---

## [ERR-20260718-051] stale_composer_remount_assertion

**Logged**: 2026-07-18T11:55:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
视觉管线改为常驻合成器后，双尺度测试仍要求旧的 `key={mode}` 重挂行为。

### Error
```
AssertionError: The input did not match /key=\{mode\}/
```

### Context
- 生产构建成功，其余 73 项测试通过。
- 本次修复的核心目标就是取消模式切换时重新创建 EffectComposer，避免颜色缓冲被清空。
- `tests/test_controls.test.mjs` 已更新，但 `tests/test_dual_scale_navigation.test.mjs` 仍保留重复的旧断言。

### Suggested Fix
将重复结构测试改为验证 `VisualEffectComposer` 常驻，且源码不存在 `key={mode}`。

### Metadata
- Reproducible: yes
- Related Files: tests/test_dual_scale_navigation.test.mjs, app/xinhua-experience.tsx

### Resolution
- **Resolved**: 2026-07-18T11:55:00+08:00
- **Notes**: 更新双尺度测试，使其验证新的常驻视觉管线契约。

---

## [ERR-20260718-052] persistent_composer_explore_overlay

**Logged**: 2026-07-18T12:00:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
常驻 EffectComposer 在 intro 切换到 explore 后出现全览底板叠入低位街景、颜色被轮廓效果洗成青色的运行时回归。

### Error
```
浏览器截图中，低位街景与整张新华路全览底板同时出现，InkOutline 输出缺少正常场景颜色。
```

### Context
- `npm test` 74 项全部通过，问题只能通过真实 WebGL 浏览器验收发现。
- 改造前游玩态绕过 EffectComposer；改造后合成器跨模式常驻，并在 explore 启用 Normal Pass 与 InkOutline。
- 需要分别确认全览底板的可见条件，以及 Normal Pass 在同一合成器内从 disabled 切到 enabled 的生命周期。

### Suggested Fix
先让全览底板只在 intro/overview 可见，再验证 Normal Pass 是否支持运行时启停；必要时改为稳定的双合成器或不依赖 Normal Pass 的轮廓实现。

### Metadata
- Reproducible: yes
- Related Files: app/xinhua-experience.tsx, app/scene/xinhua-world.tsx, app/scene/visual-effects.tsx

### Resolution
- **Resolved**: 2026-07-18T12:16:00+08:00
- **Notes**: 移除不稳定的 Normal Pass 依赖，以深度加颜色差分生成轮廓；Ink pass 从首帧常驻，仅切换强度。桌面与移动端模式切换均通过真实浏览器验证。

---

## [ERR-20260718-053] agent_browser_socket_lost_during_capture

**Logged**: 2026-07-18T12:08:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
浏览器复合命令在完成页面点击后丢失控制 socket，后续状态读取与截图未执行。

### Error
```
Socket directory '/Users/lei/.agent-browser' is not writable: Operation not permitted
```

### Context
- 本地 Vite 预览仍在 127.0.0.1:4174 运行。
- 页面打开、等待和点击均成功，失败发生在同一批次后段。
- 需要重新建立独立浏览器会话，再使用短命令串行截图。

### Suggested Fix
关闭失效的 agent-browser 会话并重新打开；视口、点击和截图分开执行，避免长链路中途丢失 socket。

### Metadata
- Reproducible: unknown
- Related Files: none

### Resolution
- **Resolved**: 2026-07-18T12:18:00+08:00
- **Notes**: 关闭失效会话后重建浏览器，并将视口、点击、等待、截图拆为短命令；最终截图、错误检查和帧率采样均完成。

---

## [ERR-20260718-054] imperative_camera_fov_lint

**Logged**: 2026-07-18T12:25:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
探索态在布局副作用中直接修改 R3F 相机 FOV，运行正常但触发 React immutability lint。

### Error
```
react-hooks/immutability: This value cannot be modified
perspective.fov = CAMERA_PLAY_FOV
```

### Context
- 相机位置本身由 R3F 帧循环命令式控制，但 FOV 不需要在模式切换时临时改写。
- IntroCamera 和 OverviewCamera 已按相机实时 FOV 自动计算完整地图适配距离。

### Suggested Fix
将 50 度 FOV 直接声明在 Canvas 的初始相机配置中，删除探索组件里的临时修改与恢复。

### Metadata
- Reproducible: yes
- Related Files: app/xinhua-experience.tsx, app/scene/xinhua-world.tsx

### Resolution
- **Resolved**: 2026-07-18T12:25:00+08:00
- **Notes**: 改为 Canvas 声明式 50 度 FOV，并同步更新视口适配测试。

---

## [ERR-20260718-055] effect_composer_conditional_child_type

**Logged**: 2026-07-18T13:05:00+08:00
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
低配后处理使用布尔短路渲染 InkOutline 时，EffectComposer 的窄 children 类型拒绝 `false | Element`。

### Error
```
Type 'false | Element' is not assignable to type 'Element'.
```

### Context
- 静态构建成功，但场景 TypeScript 专项测试发现类型错误。
- 低配必须完全不创建带 DEPTH 采样的 InkOutline，不能退回只把强度设为零。

### Suggested Fix
向 EffectComposer 传入明确的单个 PaperWash 元素或由 InkOutline 与 PaperWash 组成的元素数组，不使用布尔短路 children。

### Metadata
- Reproducible: yes
- Related Files: app/xinhua-experience.tsx

### Resolution
- **Resolved**: 2026-07-18T13:08:00+08:00
- **Notes**: 将 children 改为低配单元素、高配元素数组的显式分支。

---

## [ERR-20260718-056] missing_generic_preview_script

**Logged**: 2026-07-18T13:12:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
浏览器验收误用通用的 `npm run preview`，但仓库只提供 `preview:static` 与 `start`。

### Error
```
npm error Missing script: "preview"
```

### Context
- 静态产物已由 `npm test` 成功生成。
- `package.json` 的正确入口是 `npm run preview:static`。

### Suggested Fix
启动本项目静态验收前先读取 package scripts，使用 `npm run preview:static -- --host ... --port ...`。

### Metadata
- Reproducible: yes
- Related Files: package.json

### Resolution
- **Resolved**: 2026-07-18T13:13:00+08:00
- **Notes**: 已确认并切换到仓库声明的 `preview:static` 入口。

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

## [ERR-20260717-041] git_branch_ref_permission

**Logged**: 2026-07-17T22:50:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
新建改造分支时，沙箱无法写入 Git refs。

### Error
```
fatal: cannot lock ref 'refs/heads/codex/poi-model-photo-overhaul':
Operation not permitted
```

### Context
- 当前基线已先提交到 `main`。
- 工作区只允许读取 `.git`，普通 `git switch -c` 无法创建 ref。

### Suggested Fix
分支创建应直接使用受控权限流程，不要在普通沙箱重复尝试。

### Metadata
- Reproducible: yes
- Related Files: .git/refs/heads

### Resolution
- **Resolved**: 2026-07-17T22:51:00+08:00
- **Notes**: 经授权成功创建并切换到 `codex/poi-model-photo-overhaul`。

---

## [ERR-20260718-042] blender_sandbox_arch_crash

**Logged**: 2026-07-18T00:02:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tooling

### Summary
Blender 4.5.11 在受限环境启动时因 USD 架构缓存行断言直接崩溃。

### Error
```
ArchWarn: ARCH_CACHE_LINE_SIZE != Arch_ObtainCacheLineSize()
Segmentation fault: 11
```

### Context
- 任务是重新生成海军俱乐部 GLB、Blend 源文件和固定角度预览。
- 崩溃发生在脚本开始写资产前，原 GLB 未被半成品覆盖。

### Suggested Fix
Blender 这类需要读取系统硬件架构信息的本机二进制应直接按受控权限流程运行；生成后仍要单独审计 GLB、预览图和嵌入的细节计数。

### Metadata
- Reproducible: yes
- Related Files: scripts/create_navy_club_model.py

### Resolution
- **Resolved**: 2026-07-18T00:05:00+08:00
- **Notes**: 沙箱外重跑成功；生成 134,940 三角面的 GLB，嵌入可见细节 1,237 / 基线 550，并输出 Blend 与固定预览。

---

## [ERR-20260718-043] inline_glb_metrics_quote

**Logged**: 2026-07-18T01:30:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
内联 Node 指标脚本在拼接 `.glb` 属性时引号不配对，首次执行触发语法错误。

### Context
- 脚本只读模型指标，没有写入或覆盖资产。
- 修正字符串与属性访问之间的分隔后，原命令成功返回指标。

### Suggested Fix
内联脚本优先使用短的 here-document，并将路径字符串和属性访问拆成独立表达式；复杂统计应放入已有测试辅助函数。

### Metadata
- Reproducible: yes
- Related Files: tests/test_model_detail_upgrade.test.mjs

### Resolution
- **Resolved**: 2026-07-18T01:31:00+08:00
- **Notes**: 修正引号后重跑成功，模型升级测试随后全部通过。

---

## [ERR-20260718-044] missing_gltf_transform_cli_dependency

**Logged**: 2026-07-18T01:32:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
为检查角色动画名称临时导入 `@gltf-transform/core`，但项目没有安装该包，命令以 `ERR_MODULE_NOT_FOUND` 退出。

### Error
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@gltf-transform/core'
```

### Context
- 项目运行时只依赖 Three.js，不需要为这次只读检查新增依赖。
- GLB 的 JSON chunk 本身已经包含动画名称和节点信息。

### Suggested Fix
只读审计优先使用 Node 内置 `fs` 读取 GLB 头部和 JSON chunk；只有需要重写或优化资产时再引入 glTF Transform。

### Metadata
- Reproducible: yes
- Related Files: public/models/character/urban-messenger.glb

### Resolution
- **Resolved**: 2026-07-18T01:33:00+08:00
- **Notes**: 改用 Node 内置模块解析 GLB，确认 76 个动画及 Idle、Unarmed_Idle、Walking_A、Running_A 均存在。

---

## [ERR-20260718-045] gltf_hook_scene_name_mutation

**Logged**: 2026-07-18T01:40:00+08:00
**Priority**: low
**Status**: resolved
**Area**: code

### Summary
角色调试阶段给 `useGLTF` 返回的 scene 重命名，触发 React Hooks immutability lint。

### Error
```
Error: This value cannot be modified
scene.name = "UrbanMessengerCharacter";
```

### Context
- 重命名只为了在临时动画状态中辨认 mixer root，不参与渲染或动画绑定。
- GLB 原始 scene 已能直接作为单实例骨架根节点。

### Suggested Fix
不要修改 hook 返回对象的顶层属性；调试标签应放在局部变量或 DOM 测试输出中，并在收尾时移除。

### Metadata
- Reproducible: yes
- Related Files: app/scene/xinhua-world.tsx

### Resolution
- **Resolved**: 2026-07-18T01:41:00+08:00
- **Notes**: 删除无功能用途的 scene 重命名，保留单实例骨架与动画混合。

---

## [ERR-20260718-046] stale_dual_scale_source_shape_assertion

**Logged**: 2026-07-18T01:44:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
全量测试仍要求上生新所和梧桐树组件在源码中直接相邻，新增独立 Suspense 边界后旧正则失败。

### Context
- 静态构建和 73 项其他测试均通过。
- 独立 Suspense 是为避免大型 GLB 首次加载时挂起整张地面与相机，双尺度功能本身没有回归。

### Suggested Fix
结构测试应验证关键组件仍存在且各自被渐进加载边界保护，不应依赖无语义的 JSX 相邻关系。

### Metadata
- Reproducible: yes
- Related Files: tests/test_dual_scale_navigation.test.mjs, app/scene/xinhua-world.tsx

### Resolution
- **Resolved**: 2026-07-18T01:45:00+08:00
- **Notes**: 断言已改为分别验证上生新所、梧桐树和新华路地标的三个 Suspense 边界。

---

## [ERR-20260718-047] git_index_lock_permission

**Logged**: 2026-07-18T01:55:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
功能分支收尾暂存时，普通沙箱无法创建 `.git/index.lock`。

### Error
```
fatal: Unable to create '.git/index.lock': Operation not permitted
```

### Context
- `git diff --check` 已通过，失败发生在任何文件进入暂存区之前。
- 工作区允许写源码，但 `.git` 元数据需要受控权限。

### Suggested Fix
在同一仓库遇到 Git ref 或 index lock 权限错误时，直接使用受控 Git 写入流程，避免重复普通沙箱命令。

### Metadata
- Reproducible: yes
- Related Files: .git/index

### Resolution
- **Resolved**: 2026-07-18T01:56:00+08:00
- **Notes**: 使用受控权限完成暂存与提交。

---
## [ERR-20260718-059] Blender 无界面复查角色源文件时进程崩溃

**时间**：2026-07-18
**状态**：已解决

### 现象

再次运行 `/opt/homebrew/bin/blender --background --python /private/tmp/test_inspect_quaternius_character.py` 时，Blender 4.5.11 在脚本输出前触发 `Segmentation fault: 11`。

### 影响

仅阻塞新的角色 GLB 生成；现有项目文件、已下载的 CC0 源资产和运行时角色均未损坏。

### 下一步

改用 Blender 主程序并加 `--factory-startup`、隔离用户配置进行复测；若仍失败，再检查是否存在残留 Blender 进程或 macOS 图形初始化问题。

### 复测记录

同一隔离配置连续复用时仍会偶发在启动阶段崩溃；改用新的临时 `BLENDER_USER_CONFIG` 目录可恢复。后续无界面生成命令为每轮使用独立的 `test_blender_config_*` 目录。
## [ERR-20260718-060] 角色生成脚本遍历了已删除的 Blender 对象引用

**时间**：2026-07-18
**状态**：已解决

### 现象

脚本删除导入包中的 `Icosphere` 骨骼辅助物后，仍遍历原始对象列表，触发 `ReferenceError: StructRNA of type Object has been removed`。

### 根因

Blender 数据块删除后，Python 列表里原对象引用不会自动失效清理，但再次访问其 RNA 属性会抛错。

### 修复

在删除辅助对象之前先收集需要保留的眼睛和眉毛网格，后续只遍历这些有效引用。

同一规则也应用到后续导入的模块化服装：先筛选服装网格，再删除 `Icosphere` 辅助对象。
## [ERR-20260718-061] Quaternius 男性基础体的节点名称与女性包不同

**时间**：2026-07-18
**状态**：调查中

### 现象

角色生成脚本切换到 `Superhero_Male_FullBody.gltf` 后，按女性包的 `Superhero_Male` 规则查找主体网格失败。导入日志显示男性包使用 `Face`、`Face.001` 和 `Sphere.005_Retopology.004` 等源节点名。

### 影响

仅阻塞中性角色新 GLB 的生成；当前浏览器仍运行上一版已验证角色。

### 下一步

检查男性包各网格的材质、尺寸和骨骼父级，改用稳定的材质/顶点特征或明确源节点名选择头部、眼睛与眉毛。

### 解决

Blender 导入后的稳定名称为 `SuperHero_Male`（大写 H），眼睛与眉毛仍分别规范化为 `Eyes`、`Eyebrows`。脚本已改用实际名称，并把男性头部截取下界调整到 `z >= 1.50`，避免带入上胸。

---
## [ERR-20260718-062] 角色组件重命名补丁上下文不完整

**时间**：2026-07-18
**状态**：已解决

### 现象

首次批量重命名角色组件时，补丁遗漏了组件上方的说明注释，导致上下文匹配失败，文件未发生修改。

### 修复

先读取实际函数片段，再使用更小的精确上下文完成 `MessengerCharacter` 到 `WandererCharacter` 的重命名，并同步更新相关测试。

---
## [ERR-20260718-063] 两个 Vite 构建并行写入同一输出目录

**时间**：2026-07-18
**状态**：已解决

### 现象

并行运行 `npm test` 与 `npm run build` 时，两条命令都会清理并写入 `dist-static`。其中一次构建在复制静态 GLB 时遇到瞬时 `ENOENT`，另一条独立构建正常成功。

### 根因

验证命令共享同一构建输出目录，不具备并发安全性。

### 修复

保留 Lint 并行能力，但所有包含 Vite 构建的验证命令必须串行执行；随后单独重跑 `npm test`。

---
## [ERR-20260718-064] 全量测试仍锁定旧的高位摄像机参数

**时间**：2026-07-18
**状态**：已解决

### 现象

新后肩镜头已将距离与高度分别调整为 `5.35` 和 `2.1`，但地图比例测试仍断言旧值 `6.4` 和 `2.65`，导致 75 项测试中 1 项失败。

### 根因

镜头实现已变更，关联的回归测试没有同步更新。

### 修复

把测试更新为完整的新镜头参数组，包括目标高度、角色侧偏和目标侧偏，继续保留人物半径与街巷净宽约束。

---
## [ERR-20260718-065] Blender UV 图层集合不支持 clear

**时间**：2026-07-18
**状态**：已解决

### 现象

为了移除候选角色未使用的 UV 与切线数据，生成脚本调用 `obj.data.uv_layers.clear()`，Blender 4.5 抛出 `AttributeError`。

### 根因

`bpy_prop_collection` 的 UV 图层集合不提供 `clear()` 方法。

### 修复

把 UV 图层和颜色属性复制为列表后逐项调用集合的 `remove()`，再重新生成角色。

---
## [ERR-20260718-066] 对拆边低模服装直接应用 Catmull-Clark 产生裂缝

**时间**：2026-07-18
**状态**：已解决

### 现象

为了减少服装大三角面的明暗色块，生成脚本对上衣和长裤应用一级 Catmull-Clark。预览中每个三角面独立收缩，衣服出现大量白色裂缝。

### 根因

源 glTF 为硬表面法线复制了边界顶点，拓扑并非连续四边面；直接细分会把这些面当作互不连接的小岛。

### 修复

删除拓扑细分，仅保留材质低对比配色和可逆的平滑法线处理；破损版本未进入最终运行时验证。

---
## [ERR-20260718-067] Google Drive 首次打开超时但页面已部分加载

**时间**：2026-07-18
**状态**：已解决

### 现象

浏览器打开 Quaternius 官方 Drive 目录时命令超时，但随后快照显示目录与文件清单已经加载。

### 修复

超时后先读取当前浏览器状态，不重复开启页面；通过目录 DOM 和页面内 `data-id` 取得官方文件 ID，再逐个下载并校验大小与 SHA-256。

---
## [ERR-20260718-068] cp 不支持多个源目标配对

**时间**：2026-07-18
**状态**：已解决

### 现象

试图在一次 `cp` 命令中按“源、目标、源、目标”复制三个 glTF，命令把最后一个参数当成目标目录并失败。

### 修复

对三个已验证的源文件分别执行明确的单源单目标复制，复制后再次校验 SHA-256。

---
## [ERR-20260718-069] Blender 重新导入当前角色 GLB 时崩溃

**时间**：2026-07-18
**状态**：调查中

### 现象

为了审计最终 GLB 的重复顶点、平滑面和自定义法线，使用 Blender 4.5.11 后台重新导入 `urban-wanderer.glb`。Blender 在 glTF 导入阶段直接以退出码 139 崩溃，只留下 `blender.crash.txt`。

### 影响

网页端仍能正常加载和播放该 GLB，但不能把“重新导入最终 GLB”作为当前迭代的拓扑审计路径。

### 下一步

改为直接打开可编辑的 `urban-wanderer.blend`，或在导出前的生成脚本中统计各模块拓扑和法线；候选模型仍需通过网页实际运行、GLB 结构解析和浏览器错误检查验证。

### 元数据

- 可复现：待确认
- 相关文件：`public/models/character/urban-wanderer.glb`、`test_character_mesh_audit.py`
- 参见：ERR-20260718-066

### 解决

崩溃发生在 Blender 启动时的 Metal 设备白名单检测，而不是 GLB 或 Blend 解析阶段。使用已获准的沙箱外 Blender 后台模式后，可正常打开 Blend、完成拓扑审计和重新导出。

---
## [ERR-20260718-070] agent-browser 无法在受限沙箱写入套接字目录

**时间**：2026-07-18
**状态**：已解决

### 现象

新建人物运行时验证会话时，`agent-browser` 报错：

```text
Socket directory '/Users/lei/.agent-browser' is not writable: Operation not permitted
```

### 修复

使用已获准的沙箱外 `agent-browser` 前缀运行独立会话；页面随后正常打开。

---
## [ERR-20260718-071] agent-browser eval 误用了 Playwright page 对象

**时间**：2026-07-18
**状态**：已解决

### 现象

尝试在 `agent-browser eval` 中调用 `page.setViewportSize` 和顶层 `await`，分别触发语法错误与 `page is not defined`。

### 根因

`agent-browser eval` 执行的是页面 JavaScript，不直接暴露 Playwright 的 `page` 对象。

### 修复

视口和等待分别改用 `agent-browser set viewport` 与 `agent-browser wait`；页面内持续移动则返回一个原生 Promise 并派发键盘事件。

---
## [ERR-20260718-072] 角色测试把旧文件体积误当成质量下限

**时间**：2026-07-18
**状态**：已解决

### 现象

焊接重复顶点后，GLB 从 823KB 降到 378KB，实际画面更平滑，但测试仍断言文件必须大于 700KB。

### 根因

旧门槛锁定了拆分法线造成的冗余顶点体积，没有证明视觉质量。

### 修复

体积门槛改为 300KB～500KB，并新增导出顶点范围和生成器焊接逻辑断言；继续锁定三角面、四模块、骨骼、动作、无贴图和禁用背包节点。

---
## [ERR-20260718-073] 受限沙箱不能写入主仓库 worktree 索引锁

**时间**：2026-07-18
**状态**：已解决

### 现象

为 Sites 发布准备精确源码提交时，`git add` 无法创建主仓库 `.git/worktrees/hero-district-visual-overhaul/index.lock`，返回 `Operation not permitted`。

### 根因

当前工作树目录可写，但共享的主仓库 `.git` 在受限文件系统中只有读取权限。

### 修复

使用已获准的 Git 暂存前缀在沙箱外完成同一组显式文件的暂存；不使用全量暂存，也不纳入临时截图或审计脚本。
## [ERR-20260719-080] llm_wiki_queue_array_probe

**Logged**: 2026-07-19T22:25:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
只读检查 LLM Wiki ingest queue 时误把顶层数组当成带 `items` 字段的对象。

### Error
```text
jq: Cannot index array with string "items"
```

### Context
- 队列文件 `.llm-wiki/ingest-queue.json` 的顶层结构是数组。
- 命令只读取文件，没有改动队列或知识库。

### Suggested Fix
先用 `jq 'type'` 或 `jq 'keys'` 确认结构；该版本直接使用 `.[]` 过滤 `sourcePath`。

### Metadata
- Reproducible: yes
- Related Files: `.llm-wiki/ingest-queue.json`

### Resolution
- **Resolved**: 2026-07-19T22:26:00+08:00
- **Notes**: 已改用数组查询，并确认目录级符号链接下的 11 个 Markdown 已进入 ingest queue。

---
## [ERR-20260721-081] parallel_exec_too_many_open_files

**Logged**: 2026-07-21T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
并行启动多个只读命令时，统一执行器因打开文件数达到上限而无法创建进程。

### Error
```text
Failed to create unified exec process: Too many open files (os error 24)
```

### Context
- 同时读取两份 Sites skill 说明并检查 Git 工作区。
- 失败发生在创建进程阶段，没有修改项目文件。

### Suggested Fix
遇到该错误后改为串行执行文件读取和仓库检查，避免同一调用并发创建多个 PTY 进程。

### Metadata
- Reproducible: unknown
- Related Files: .learnings/ERRORS.md

### Resolution
- **Resolved**: 2026-07-21T00:00:00+08:00
- **Notes**: 已切换为串行执行，后续命令恢复正常。

---
## [ERR-20260723-082] lighting_v3_effect_children_typecheck

**Logged**: 2026-07-23T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
为低配设备条件关闭 SSAO 和描边时，短路表达式产生的 `false | Element`
不满足当前 EffectComposer 的严格子节点类型。

### Error
```text
Type 'false | Element' is not assignable to type 'Element'.
```

### Context
- `npm test` 的 TypeScript 场景检查发现该问题。
- 同轮一条源码断言错误转义了正则字面量中的自闭合标签。

### Suggested Fix
EffectComposer 内的条件 effect 使用空 Fragment 分支，测试正则直接匹配
合法的 `/>` 源码文本。

### Metadata
- Reproducible: yes
- Related Files: app/xinhua-experience.tsx, tests/test_controls.test.mjs

### Resolution
- **Resolved**: 2026-07-23T00:00:00+08:00
- **Notes**: 已替换条件子节点表达式并修正测试正则，随后重新执行完整测试。
