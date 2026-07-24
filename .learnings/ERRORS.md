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
- **Recurrence**: 2026-07-22T21:20:00+08:00 建筑资产正式发布暂存时再次遇到同一只读索引限制；继续使用显式文件列表和受控 Git 写入，不改仓库结构。

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
**Priority**: medium
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
- **Notes**: 已切换为串行执行，后续命令恢复正常。2026-07-21 17:02 在关闭本地 dev server 后启动 `npm run build` 时再次复发，说明长会话中的浏览器/执行会话残留也可能耗尽统一执行器文件描述符；本轮继续通过关闭无用标签页和串行重试恢复。

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

---
## [ERR-20260723-083] node_typescript_relative_import_extension

**Logged**: 2026-07-23T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
新建的贴地阴影 helper 使用无扩展名相对导入，Vite 可解析，但 Node 原生
TypeScript 测试无法找到 `terrain` 模块。

### Error
```text
ERR_MODULE_NOT_FOUND: Cannot find module 'app/scene/terrain'
```

### Context
- 单独运行 `node --test tests/test_autumn_lighting_v3.test.mjs` 时发现。
- 项目测试直接由 Node 25 加载 `.ts`，相对导入需要显式 `.ts` 扩展名。

### Suggested Fix
只在当前 `noEmit` + `moduleResolution: bundler` 项目中启用
`allowImportingTsExtensions`，让供浏览器源码与 Node 测试共同使用的纯
TypeScript 合同可以显式导入 `.ts`。

### Metadata
- Reproducible: yes
- Related Files: app/scene/autumn-shadow-surface.ts

### Resolution
- **Resolved**: 2026-07-23T00:00:00+08:00
- **Notes**: helper 已合并到 `terrain.ts`；新增道路表面合同时启用显式
  `.ts` 导入，由 Node、Vite 和完整 TypeScript 检查共同验证。

---
## [ERR-20260723-084] agent_browser_cli_unavailable

**Logged**: 2026-07-23T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
独立复核最终树影贴面时，本机没有 `agent-browser` CLI，临时下载执行被安全
策略拒绝。

### Error
```text
zsh: command not found: agent-browser
```

### Context
- 既有真实 Chrome 截图和 0 error 证据已覆盖同一光照与材质系统。
- 最终改动只调整树影 Y 表面采样；未绕过策略安装第三方软件。

### Suggested Fix
使用已连接浏览器完成视觉批次后再清理会话；工具不可用时以共享道路顶面合同、
数学测试和既有真实运行证据明确区分自动验证与截图范围。

### Metadata
- Reproducible: yes
- Related Files: tests/test_autumn_lighting_v3.test.mjs

### Resolution
- **Resolved**: 2026-07-23T00:00:00+08:00
- **Notes**: 未安装新软件；新增道路顶面测试并在交付说明中保留截图边界。

---
## [ERR-20260724-085] sites_default_build_missing_dist

**Logged**: 2026-07-24T00:20:00+08:00
**Priority**: high
**Status**: resolved
**Area**: infra

### Summary
Codex Sites 从源码发布时运行默认 `npm run build`，但项目默认构建只生成
`dist-static`，导致发布收尾找不到 Sites 所需的 `dist`。

### Error
```text
cp: cannot stat 'dist': No such file or directory
```

### Context
- Vite 静态构建成功，失败发生在 Codex Sites 复制部署产物阶段。
- 项目已经提供可生成 `dist/server/index.js` 的 `build:sites`，但默认
  `build` 没有调用它。
- 发布目标仅为 Codex Sites，不涉及 Denkisan。

### Suggested Fix
让默认 `build` 依次执行 `build:static` 与 `build:sites`，同时保留
`dist-static` 的本地/VPS预览兼容性和 Codex Sites 所需的 `dist`。

### Metadata
- Reproducible: yes
- Related Files: package.json, vite.static.config.ts

### Resolution
- **Resolved**: 2026-07-24T00:25:00+08:00
- **Notes**: 默认构建已同时生成 `dist-static` 与 `dist`；部署契约测试已更新，
  完整测试 120/120 和 lint 通过。

---
## [ERR-20260721-087] sandbox_ps_process_inspection

**Logged**: 2026-07-21T08:33:49Z
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
工作区沙箱拒绝使用 `ps` 检查长时间运行的 Hermes oneshot 进程。

### Error
```text
zsh:1: operation not permitted: ps
```

### Context
- Hermes `web_search + web_extract` oneshot 正在统一执行会话内运行。
- 尝试用 `ps aux` 只读确认子进程状态，但 macOS 沙箱禁止进程枚举。
- Hermes 会话 ID 和 `hermes logs` 仍可正常作为状态证据。

### Suggested Fix
在该环境中不要依赖 `ps` 监控 Hermes；优先轮询统一执行 session，并用 `hermes logs --since` 交叉确认插件和工具状态。

### Metadata
- Reproducible: yes
- Related Files: `.learnings/ERRORS.md`

### Resolution
- **Resolved**: 2026-07-21T08:33:49Z
- **Notes**: 已改用会话轮询和 Hermes 日志，不再执行 `ps`。

---
## [ERR-20260721-088] browser_tabs_open_removed

**Logged**: 2026-07-21T16:58:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
复用应用内浏览器连接时调用了当前 Browser API 不存在的 `browser.tabs.open()`。

### Error
```text
browser.tabs.open is not a function
```

### Context
- 本地开发服务器已在 `http://127.0.0.1:3002/` 启动。
- Browser runtime 和既有 `browser` 绑定均正常，仅标签页创建方法已发生接口变化。
- 失败前没有创建或修改任何浏览器标签页。

### Suggested Fix
复用旧浏览器绑定但缺少当前方法上下文时，读取该绑定的完整 `documentation()`，并使用文档声明的标签页创建 API；不要凭上一版方法名猜测。

### Metadata
- Reproducible: yes
- Related Files: `.learnings/ERRORS.md`

### Resolution
- **Resolved**: 2026-07-21T16:58:00+08:00
- **Notes**: 改为读取当前 Browser binding 文档后继续。

---
## [ERR-20260721-089] browser_evaluate_dom_constructors_unavailable

**Logged**: 2026-07-21T17:13:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
应用内 Browser 的 `playwright.evaluate()` 沙箱未暴露 `KeyboardEvent` 和 `document.createEvent`，不能用 DOM 合成事件长按移动人物。

### Error
```text
TypeError: KeyboardEvent is not a constructor
TypeError: document.createEvent is not a function
```

### Context
- 为比较上海影城出生点远近，尝试在真实 Three.js 页面中合成 `KeyW` 的 keydown/keyup。
- 页面本身无应用错误，失败只发生在 Browser evaluate 的受限 DOM 构造器环境。

### Suggested Fix
优先使用 `tab.cua.keypress()` 做离散按键，或直接修改可版本控制的 start preset 后 reload 做精确 A/B；不要假设 evaluate 具备完整浏览器 DOM 构造器。

### Metadata
- Reproducible: yes
- Related Files: `app/scene/xinhua-road-landmarks-data.json`

### Resolution
- **Resolved**: 2026-07-21T17:14:00+08:00
- **Notes**: 改用版本化 start preset 做 A/B，并在真实页面 reload 验收。

---
## [ERR-20260721-090] shell_quote_collision_in_rg_command

**Logged**: 2026-07-21T17:27:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
在双引号 shell 命令中嵌入同时包含单双引号的 `rg` 正则，导致 zsh 在执行前报未闭合引号。

### Error
```text
zsh:2: unmatched "
```

### Context
- 任务是在 `/tmp/test_film_*.html` 中提取参考图 URL 和建筑关键词上下文。
- 正则中包含 HTML 属性常见的双引号、单引号和尖括号，直接拼接到 `cmd` 字符串产生引号冲突。
- 失败发生在只读解析阶段，没有修改研究证据或模型资产。

### Suggested Fix
把 URL 与关键词检索拆成两个命令，优先使用不包含引号字符的宽松正则，或把复杂匹配写入临时 pattern 文件再传给 `rg -f`。

### Metadata
- Reproducible: yes
- Related Files: `.learnings/ERRORS.md`

### Resolution
- **Resolved**: 2026-07-21T17:27:00+08:00
- **Notes**: 后续改用分离的安全正则，不再在一条 shell 字符串中混合单双引号。

---
## [ERR-20260721-091] overpass_get_406_for_film_art_center

**Logged**: 2026-07-21T17:35:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
通过 Overpass API 的 URL 编码 GET 请求拉取新华路200号周边建筑轮廓时，公共端点返回 HTTP 406 HTML 页面。

### Error
```text
406 Not Acceptable
An appropriate representation of the requested resource could not be found on this server.
```

### Context
- 查询只用于补充上海电影艺术中心的 OSM 建筑尺寸证据。
- Nominatim 也未返回该地址或“新华两佰”的结构化匹配。
- 已有官方照片、官方文字、仓库落点和既有模型边界，研究仍可继续，但尺寸不能标记为 OSM 实测。

### Suggested Fix
不要让单一 Overpass 公共端点成为建模硬依赖；可改用 POST、其他镜像或仓库缓存。若无法取得轮廓，应在 Brief 中把尺寸标为照片比例推断并限制视觉校准范围。

### Metadata
- Reproducible: unknown
- Related Files: `docs/research/film-art-center-model-brief.md`

### Resolution
- **Resolved**: 2026-07-21T17:35:00+08:00
- **Notes**: 本轮采用官方多视图和既有场景尺度进行保守估算，并在 Brief 中保留未知项。

---
## [ERR-20260721-092] blender_5_2_metal_probe_crash_in_sandbox

**Logged**: 2026-07-21T17:58:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tooling

### Summary
Blender 5.2 Headless 在生成器执行前的 Metal 支持探测阶段以退出码 139 崩溃。

### Error
```text
Blender 5.2.0 LTS
exit code 139
blender::gpu::supports_barycentric_whitelist
blender::gpu::MTLBackend::metal_is_supported
```

### Context
- 命令：`Blender --background --python-exit-code 1 --python scripts/create_xinhua_road_models.py -- --asset=film-art-center`。
- Python 生成器已单独通过 `compile()` 语法检查。
- 崩溃栈没有进入 Python，发生在 `WM_init` 的 GPU backend 选择阶段。
- 工作区内没有写出本轮 film-art-center 的新 GLB、Blend 或渲染结果。

### Suggested Fix
优先用同一命令在受限沙箱外重试；若仍失败，再显式选择非 Metal 后端或改用已验证的 Blender LTS 版本。

### Metadata
- Reproducible: unknown
- Related Files: `scripts/create_xinhua_road_models.py`

### Resolution
- **Resolved**: 2026-07-21T18:17:00+08:00
- **Notes**: 同一 Headless Blender 命令在沙箱外运行成功，生成 636 个源构件、1 个运行时节点及四张固定机位预览；确认崩溃来自受限环境中的 Metal 探测。

---
## [ERR-20260721-093] film_art_center_site_bounds_enter_road

**Logged**: 2026-07-21T18:24:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
重建后的上海电影艺术中心主楼未压路，但模型内过长的南侧草坪把整个 GLB 可见包络推进了机动车道路净距。

### Error
```text
film-art-center 距道路中心仅 0.90，会压住 4.38 的道路及退界
```

### Context
- `node --test tests/test_xinhua_road_models.test.mjs` 15 项中 14 项通过。
- 新 GLB 的 `maxZ=15.249999` 来自南侧草坪和路径，不是历史主楼或玻璃连接体。
- 项目测试按完整可见模型包络核对道路净距，因此仅缩小碰撞盒不能解决问题。

### Suggested Fix
保持地址落点和主楼体块不动，缩短南侧草坪/路径并重新导出 GLB；用同一道路净距测试确认完整可见包络至少保留 4.38 场景单位。

### Metadata
- Reproducible: yes
- Related Files: `scripts/create_xinhua_road_models.py`, `app/scene/xinhua-road-landmarks-data.json`

### Resolution
- **Resolved**: 2026-07-21T18:27:00+08:00
- **Notes**: 主楼和地址落点保持不动，仅把草坪/路径前缘从 GLB `maxZ=15.25` 收回到 `11.225`；道路净距、碰撞和快速定位专项测试 15/15 通过。

---
## [ERR-20260721-094] in_app_browser_discovery_empty

**Logged**: 2026-07-21T18:31:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
Browser runtime 初始化成功，但本轮没有可用的应用内 Browser 或 Chrome 实例，无法选择本地页面目标。

### Error
```text
No browser is available
agent.browsers.list() => []
```

### Context
- 目标是验收 `http://127.0.0.1:3002/?start=film-art` 的真实 Three.js 页面。
- 已按 Browser 技能读取完整说明和 bootstrap troubleshooting，并只执行一次浏览器类型发现。
- 用户未指定必须使用应用内 Browser；本地开发服务器可访问。

### Suggested Fix
明确报告应用内 Browser 不可用，改用独立 `agent-browser` Headless Chrome 完成同一 URL 的视觉、控制台和资源验收；不得把替代结果表述为应用内 Browser 结果。

### Metadata
- Reproducible: unknown
- Related Files: `test_artifacts/test_film-art-center_runtime_preview.png`

### Resolution
- **Resolved**: 2026-07-21T18:31:00+08:00
- **Notes**: 已切换到项目可用的 agent-browser 本地 Headless Chrome 作为透明回退路径。

---
## [ERR-20260721-095] agent_browser_broken_symlink

**Logged**: 2026-07-21T18:34:00+08:00
**Priority**: low
**Status**: open
**Area**: tooling

### Summary
备用 `agent-browser` 命令不可执行；Homebrew 入口是指向已不存在 npx 缓存的断裂符号链接。

### Error
```text
command not found: agent-browser
/opt/homebrew/bin/agent-browser -> /Users/lei/.npm/_npx/.../agent-browser-darwin-arm64
no such file or directory
```

### Context
- 应用内 Browser 同时不可用，原计划用 agent-browser 验收本地 Three.js 页面。
- 项目自身未安装 Playwright、Puppeteer 或 `@playwright/test`。
- 用户未要求安装浏览器工具，因此不执行全局安装。

### Suggested Fix
本轮透明切换到已安装的 Google Chrome Headless CLI；长期应重新安装 agent-browser 或修复符号链接，并在开始运行时验收前先执行 `agent-browser --version`。

### Metadata
- Reproducible: yes
- Related Files: `test_artifacts/test_film-art-center_runtime_preview.png`

---
## [ERR-20260722-099] in_app_browser_networkidle_not_supported

**Logged**: 2026-07-22T00:17:14+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
新版应用内 Browser 文档列出 `networkidle` load state，但实际后端拒绝该值。

### Error
```text
playwright_wait_for_load_state does not support networkidle
```

### Context
- 目标是等待本地 Three.js `/?start=film-art` 完成模型与首屏资源加载。
- 导航本身已经执行，失败只发生在等待状态选择，不是应用构建或模型加载错误。

### Suggested Fix
使用 `domcontentloaded`，随后以页面内 loading 状态、canvas 存在、目标 GLB performance entry 和稳定帧采样作为具体完成条件。

### Metadata
- Reproducible: yes
- Related Files: `docs/research/film-art-center-model-brief.md`

### Resolution
- **Resolved**: 2026-07-22T00:17:14+08:00
- **Notes**: 改用明确的 DOM、资源和性能条件，不依赖不受支持的 `networkidle`。

---
## [ERR-20260722-098] llm_wiki_ingest_queue_shape_assumption

**Logged**: 2026-07-22T00:10:55+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
只读检查 LLM Wiki ingest 队列时误把 JSON 顶层假定为 `{ tasks: [] }`，而当前 `0.6.4` 项目的实际格式是任务数组。

### Error
```text
jq: Cannot index array with string "tasks"
```

### Context
- 目标只是读取 `film-art-center-modeling-evidence.md` 对应任务的状态，没有修改队列。
- `llm_wiki_rescan_sources` MCP 返回的 `queue.tasks` 是 API 响应形状，不代表磁盘 `.llm-wiki/ingest-queue.json` 使用同一包装结构。

### Suggested Fix
先用 `jq 'type'` 或读取首条元素确认磁盘 JSON 结构，再按数组执行 `map/select/group_by`。

### Metadata
- Reproducible: yes
- Related Files: `/Volumes/plugin/TowerOld_XHS_Archive/xhs-creator-wiki/.llm-wiki/ingest-queue.json`

### Resolution
- **Resolved**: 2026-07-22T00:10:55+08:00
- **Notes**: 改用数组结构读取；未对 Wiki 队列做任何写操作。

---
## [ERR-20260721-097] llm_wiki_source_target_unavailable

**Logged**: 2026-07-21T18:48:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
上海电影艺术中心建模证据已生成在项目内，但内容研究工作流指定的外置 LLM Wiki 路径未挂载，LLM Wiki 桌面 API 也不可达，无法完成复制、Rescan 和回查。

### Error
```text
/Volumes/plugin/TowerOld_XHS_Archive/xhs-creator-wiki: No such file or directory
LLM Wiki API request failed. Is the desktop app running? fetch failed
```

### Context
- 项目内知识源已保存为 `docs/knowledge-sources/film-art-center-modeling-evidence.md`。
- 工作流要求目标为 `raw/sources/derived/wander-xinhua/`，随后等待队列清空并执行检索、读取和关系图验证。
- 当前既不能访问 U 盘路径，也不能通过 MCP 读取可用项目，因此没有假定入库成功。

### Suggested Fix
挂载 `plugin` U 盘并启动 LLM Wiki 桌面应用后，复制项目内知识源到指定 derived 目录，执行 Source Rescan，等待队列归零，再用关键词“新华两佰 上海电影艺术中心 Blender GLB”完成检索、读取和关系图回查。

### Metadata
- Reproducible: unknown
- Related Files: `docs/knowledge-sources/film-art-center-modeling-evidence.md`, `docs/research/content-research-wiki-workflow.md`

### Resolution
- **Resolved**: 2026-07-22T00:12:00+08:00
- **Notes**: U 盘恢复挂载后，将项目知识源复制到 `raw/sources/derived/wander-xinhua/`；启动 LLM Wiki 0.6.4，目标 ingest 任务完成并从队列移除。检索命中对象页、来源摘要、方法页和待核验页；读取内容与仓库证据一致，关系图节点保留 4 条关联。

---
## [ERR-20260721-096] macos_headless_browser_image_skia_crash

**Logged**: 2026-07-21T18:40:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tooling

### Summary
系统 Chrome、Chrome for Testing 和 Rod Chromium 均无法在当前 macOS 自动化环境中稳定渲染本地 Three.js 页面；Chromium 建立 DevTools 端口后在图像表示转换阶段崩溃。

### Error
```text
DevTools listening on ws://127.0.0.1:9224/...
FATAL:image_skia_rep_default.cc(36)] Check failed: bitmap_.colorType() == kN32_SkColorType (0 vs. 6)
```

### Context
- 目标 URL：`http://127.0.0.1:3002/?start=film-art`。
- 应用内 Browser 没有可用实例，Computer Use 服务也未能启动。
- 项目未安装 Playwright 或 Puppeteer；已有 `agent-browser` 是断裂符号链接。
- 重新下载 `agent-browser@latest` 因“未固定版本的第三方代码执行”被安全策略拒绝，未绕过该限制。
- Blender 固定机位渲染、GLB 审计和专项数据测试不受此浏览器故障影响，但不能替代实际 Three.js 画面、控制台和首屏性能验收。

### Suggested Fix
由用户明确授权后修复或固定版本安装 `agent-browser`，或在可用的应用内 Browser/Chrome 会话中重新执行 `/?start=film-art` 验收；在此之前将 Three.js 视觉验收保持为未通过，而非假定通过。

### Metadata
- Reproducible: yes
- Related Files: `test_artifacts/test_film-art-center_runtime_preview.png`

### Resolution
- **Resolved**: 2026-07-22T00:25:03+08:00
- **Notes**: 新版应用内 Browser 恢复可用；已在 `/?start=film-art` 实测并保存 1280×720 运行时截图，读取目标 GLB 资源、console 与 Performance 指标。原独立 Headless Chromium 崩溃不再阻塞本项目验收。

---
## [ERR-20260722-100] browser_cdp_input_dispatch_unsupported

**Logged**: 2026-07-22T00:25:03+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
应用内 Browser 的 CDP capability 支持性能和运行时读取，但拒绝 `Input.dispatchKeyEvent`，不能用原始 CDP 制造长按移动。

### Error
```text
This method is not supported through raw CDP. Use tab.cua.type(...) or tab.cua.keypress(...) instead.
```

### Context
- 目标是补充 `/?start=film-art` 的实际连续步行与立面碰撞证据。
- GLB 资源、截图、console 和帧率采样均已成功；失败只影响原始 CDP 键盘注入。
- 随后 Browser 会话断开，未继续反复调用不受支持的方法。

### Suggested Fix
连续按键需求应使用支持 key-down/key-up 的原生页面输入接口；当前 `tab.cua.keypress()` 只保证离散按键。模型任务继续使用实际首屏、分块碰撞数据和自动几何测试做联合验收。

### Metadata
- Reproducible: yes
- Related Files: `app/scene/xinhua-road-landmarks-data.json`, `tests/test_xinhua_road_models.test.mjs`

### Resolution
- **Resolved**: 2026-07-22T00:25:03+08:00
- **Notes**: 停止使用不支持的 CDP 输入方法；保留已取得的实际页面证据，并由专项测试验证出生点、相机和开放路径与三块碰撞体的关系。

---
## [ERR-20260722-101] missing_repo_python_venv_for_glb_audit

**Logged**: 2026-07-22T00:25:03+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
刷新 GLB 审计时先误用了仓库中不存在的 `./.venv/bin/python`，随后又误以为审计脚本位于仓库 `scripts/`。

### Error
```text
zsh:1: no such file or directory: ./.venv/bin/python
python3: can't open file 'scripts/audit_glb_asset.py': [Errno 2] No such file or directory
```

### Context
- 同批专项测试、全量测试、Lint 和 `git diff --check` 均已通过。
- 两次失败都发生在工具路径解析阶段，审计脚本和 GLB 尚未开始执行。

### Suggested Fix
先用 `rg --files` 确认解释器和脚本路径；本任务应使用 `photo-reference-webgl-modeling/scripts/audit_glb.py`，不要从其他项目假定仓库存在 `.venv` 或同名审计脚本。

### Metadata
- Reproducible: yes
- Related Files: `/Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py`, `public/models/xinhua-road/film-art-center.glb`

### Resolution
- **Resolved**: 2026-07-22T00:25:03+08:00
- **Notes**: 通过 `rg --files` 定位技能自带审计器，改用系统 Python 和真实脚本路径重跑。

---
## [ERR-20260722-102] stale_dev_server_session_id

**Logged**: 2026-07-22T00:25:03+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
收尾时尝试停止先前的本地开发服务器会话，但统一执行器已没有该会话 ID。

### Error
```text
write_stdin failed: Unknown process id 6265
```

### Context
- Browser 会话已经断开，本地验收页不再可用。
- 该调用只用于清理开发服务器，没有影响代码、模型或验收产物。

### Suggested Fix
长会话收尾前先读取当前终端或轮询会话状态；`Unknown process id` 表明进程已结束，不要继续重复发送 Ctrl-C。

### Metadata
- Reproducible: unknown
- Related Files: `.learnings/ERRORS.md`

### Resolution
- **Resolved**: 2026-07-22T00:25:03+08:00
- **Notes**: 将会话视为已结束，不再重试清理。后续 goal 续跑再次确认统一执行器中的 dev server 不保证跨轮次保活；每次实际 Browser 验收前都先以 HTTP 探测并按需重启。

---
## [ERR-20260722-103] film_art_canonical_camera_hits_neighbor

**Logged**: 2026-07-22T00:25:03+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
把新华两佰首屏从大角度侧视改为近正视时，首个候选出生点 `[38,98]` 的第三人称相机后退后进入相邻地标碰撞范围。

### Error
```text
film-art 的首帧相机不得位于地标碰撞范围内
```

### Context
- 人物出生点本身安全；失败发生在按 `forward` 后退 `7.4` 场景单位的首帧相机点。
- 新华两佰北侧与新华别墅 211 弄地标接近，纯几何正面轴线会让相机落入邻近碰撞体。

### Suggested Fix
保持朝向建筑中心且与 canonical 正向夹角较小，通过候选点扫描同时约束观察距离、人物半径、相机半径和全部地标碰撞，不要只看人物点。

### Metadata
- Reproducible: yes
- Related Files: `app/scene/xinhua-road-landmarks-data.json`, `tests/test_xinhua_road_models.test.mjs`

### Resolution
- **Resolved**: 2026-07-22T00:25:03+08:00
- **Notes**: 改用 `[35,99]` / `[0.581,-0.814]`；观察距离约 `21.51`，与 canonical 正向夹角约 `13.7°`，人物和相机均避开全部地标碰撞。

---
## [ERR-20260722-104] browser_reconnect_timeout_after_aborted_turn

**Logged**: 2026-07-22T10:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
任务中断后重新初始化 Browser 控制通道时，连接调用超过 10 秒并由工具自动重置会话。

### Error
```text
js execution timed out; kernel reset, rerun your request
```

### Context
- 同一任务此前已连续三轮返回 `No browser is available`。
- 本地 dev server 也未跨中断保活，但该超时发生在 Browser 选择阶段。
- 没有修改页面、模型或浏览器状态。

### Suggested Fix
遵循工具返回的恢复建议，在新的控制会话中只初始化一次 Browser runtime，并为首次连接提供更长超时；若仍无实例则恢复 blocked 状态。

### Metadata
- Reproducible: unknown
- Related Files: `test_artifacts/test_film-art-center_runtime_preview.png`

### Resolution
- **Resolved**: 2026-07-22T10:00:00+08:00
- **Notes**: 重置后的会话只执行一次干净重连，不复用已失效绑定；30 秒超时下成功连接到 Chrome extension，最终验收继续。

---
## [ERR-20260722-105] local_preview_listen_denied_in_sandbox

**Logged**: 2026-07-22T11:07:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
最终浏览器验收时，沙箱内本地预览无法监听 `127.0.0.1:3002`。

### Error
```text
Error: listen EPERM: operation not permitted 127.0.0.1:3002
```

### Context
- `vinext dev` 保持进程但没有监听端口；直接运行 Vite preview 明确返回 EPERM。
- 模型、静态构建和 Chrome 连接均正常。

### Suggested Fix
浏览器验收优先使用已通过测试的 `preview:static`；监听 EPERM 时按权限流程在沙箱外启动。

### Metadata
- Reproducible: yes
- Related Files: `package.json`, `vite.static.config.ts`

### Resolution
- **Resolved**: 2026-07-22T11:08:00+08:00
- **Notes**: 经授权在沙箱外运行 `npm run preview:static -- --host 127.0.0.1 --port 3002`，端口正常监听。
- **Recurrence**: 2026-07-22T21:05:00+08:00 建筑发布验收时 `127.0.0.1:4173` 再次触发同一限制；继续使用已验证的沙箱外静态预览路径。

---
## [ERR-20260722-106] cdp_raf_sample_hits_default_timeout

**Logged**: 2026-07-22T11:10:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
3 秒 `requestAnimationFrame` 性能采样与 CDP 默认 3 秒命令超时重合，首次采样在边界超时。

### Error
```text
Timed out after 3000ms waiting for CDP command Runtime.evaluate.
```

### Context
- 页面和 GLB 已正常显示，失败只发生在性能读取的命令时限。
- 采样函数自身需要约 3 秒，不能与外层命令使用相同时限。

### Suggested Fix
3 秒帧率采样应为 CDP `send` 显式设置至少 10 秒 `timeoutMs`。

### Metadata
- Reproducible: yes
- Related Files: `docs/research/film-art-center-model-brief.md`

### Resolution
- **Resolved**: 2026-07-22T11:11:00+08:00
- **Notes**: 命令超时放宽至 10 秒后成功采集 181 帧、59.99 FPS 和最终 GLB Resource Timing。

---
## [ERR-20260722-107] browser_finalize_native_pipe_closed

**Logged**: 2026-07-22T11:12:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
最终浏览器证据采集完成后，释放 Browser 会话时 native pipe 已提前关闭。

### Error
```text
native pipe closed before response
```

### Context
- 截图、Resource Timing、帧率、console 和 heap 数据均已在失败前落盘或记录。
- 失败发生在最后的 `finalize`，没有影响页面验收结果。

### Suggested Fix
把 `finalize` 保持为最后一个浏览器动作；若 pipe 已关闭，不重复创建会话，只确认本地预览进程已停止。

### Metadata
- Reproducible: unknown
- Related Files: `test_artifacts/test_film-art-center_runtime_preview.png`

### Resolution
- **Resolved**: 2026-07-22T11:13:00+08:00
- **Notes**: 未重试已失效的 Browser pipe；本地静态预览已用 Ctrl-C 正常停止。

---
## [ERR-20260722-108] final_typecheck_subprocess_stalls

**Logged**: 2026-07-22T11:20:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
最终证据文件更新后的全量 Node test 中，独立 `tsc --noEmit` 子进程在 0% CPU 下持续空转。

### Error
```text
Promise resolution is still pending but the event loop has already resolved
```

### Context
- 同轮其余 85 项测试全部通过，模型专项测试随后再次独立通过 16/16。
- 当前实现代码在证据更新前已经完整通过 86/86、TypeScript 和 ESLint；之后只更新截图与文档。
- 单独重跑 `tsc` 仍无输出空转，因此未继续循环消耗系统资源。

### Suggested Fix
长时建模会话的最终验收保持串行；若 `tsc` 再次 0% CPU 空转，终止本任务进程，并用此前同代码版本的全绿结果加聚焦测试、ESLint 和 diff 审计完成可追溯收口。

### Metadata
- Reproducible: yes
- Related Files: `tests/typecheck-scene.test.mjs`, `docs/research/film-art-center-model-brief.md`

### Resolution
- **Resolved**: 2026-07-22T11:23:00+08:00
- **Notes**: 仅终止本任务启动的 Node/tsc 进程；串行 ESLint、模型专项测试、GLB 审计、JSON 校验与 `git diff --check` 均通过。

---
## [ERR-20260722-109] large_apply_patch_stalls_on_workflow_docs

**Logged**: 2026-07-22T12:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
一次同时修改多个长段落的 `apply_patch` 调用无输出卡住。

### Error
```text
apply_patch did not return and required termination
```

### Context
- 目标是升级 Blender workflow 与 Brief 测试契约。
- 卡住的补丁未写入部分内容；小型原子补丁可正常完成。

### Suggested Fix
长 Markdown 文件按标题、表格行和单段落拆分为小补丁；整段机械替换才使用受控的 `perl -0pi -e`。

### Metadata
- Reproducible: yes
- Related Files: `docs/research/blender-ai-workflow.md`, `docs/research/templates/blender-model-brief-template.md`

### Resolution
- **Resolved**: 2026-07-22T12:03:00+08:00
- **Notes**: 改用小型原子补丁继续，所有目标文件保持可解析且无半截写入。

---
## [ERR-20260722-109] vite_build_transform_stalls

**Logged**: 2026-07-22T12:00:00+08:00
**Priority**: low
**Status**: pending
**Area**: tooling

### Summary
为幸福里调研启动本地生产预览时，Vite 构建停在 `transforming (603) index.html` 超过两分钟且无后续输出。

### Error
```text
vite v8.0.13 building client environment for production...
transforming (603) index.html
```

### Context
- 命令为 `./test_local_preview.command`，在当前包含其他未提交模型改动的工作树执行。
- 没有出现明确编译错误；为避免干扰现有工作，在两分钟后仅用 Ctrl-C 停止本次命令。
- 本次任务只是调研，没有把该停滞解释为幸福里模型回归。

### Suggested Fix
后续在干净提交或独立 worktree 串行复现；同时检查 Vite/TypeScript 子进程和大 GLB 转换是否与 ERR-20260722-108 属于同一类会话资源问题。

### Metadata
- Reproducible: unknown
- Related Files: `test_local_preview.command`, `vite.static.config.ts`
- See Also: ERR-20260722-108

---
## [ERR-20260722-110] unquoted_url_query_in_zsh

**Logged**: 2026-07-22T17:32:00+08:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
线上 GLB 哈希核验命令没有给含 `?v=2` 的 URL 加引号，zsh 将查询串解释为通配符。

### Error
```text
zsh: no matches found: https://.../plane-tree-a.glb?v=2
```

### Context
- 操作发生在 Sites 发布后的只读资源核验。
- 主站响应正常；三次 GLB 下载在发起网络请求前即被 shell 拒绝。

### Suggested Fix
所有包含 `?`、`&` 或 `[]` 的 URL 在 shell 命令中使用单引号完整包裹。

### Metadata
- Reproducible: yes
- Related Files: `public/models/xinhua-road/plane-tree-a.glb`, `public/models/xinhua-road/plane-tree-b.glb`, `public/models/xinhua-road/plane-tree-c.glb`

### Resolution
- **Resolved**: 2026-07-22T17:33:00+08:00
- **Notes**: 改用单引号 URL 后重试线上哈希比对。

---
## [ERR-20260722-111] ffmpeg_missing_webp_encoder

**Logged**: 2026-07-22T18:10:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
本机 FFmpeg 未包含 WebP encoder，不能用既有命令批量转换 POI 缩略图。

### Error
```text
Unknown encoder 'libwebp'
Error opening output file /tmp/test_xingfuli.webp.
```

### Context
- 仅用一张现有 JPEG 向 `/tmp` 做格式与体积试验。
- 命令失败，没有创建或修改项目图片。
- `sips --formats` 显示 WebP 只能读取，不能稳定写入。

### Suggested Fix
不为本次界面优化临时安装图像工具；保留已压缩的 640px JPEG，优先优化请求时机和解码方式。需要批量转码时再引入可复现的项目级图像管线。

### Metadata
- Reproducible: yes
- Related Files: public/images/poi-thumbnails/

### Resolution
- **Resolved**: 2026-07-22T18:10:00+08:00
- **Notes**: 放弃不可复现的 WebP 转码路径，改做按距离分批预取和异步解码。

---
## [ERR-20260722-112] ambiguous_css_patch_target

**Logged**: 2026-07-22T18:16:00+08:00
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
只按 `top: 24px` 替换 CSS 时误改了页头，而不是 POI 卡片。

### Error
```text
测试期望 .overview-poi-card top: 88px，实际 world-header 为 88px、卡片仍为 24px。
```

### Context
- 两个选择器原本都有 `top: 24px`。
- 完整测试在部署前发现问题，没有进入线上版本。

### Suggested Fix
修改重复 CSS 声明时把选择器一并放入补丁上下文，并用针对选择器块的测试锁定目标。

### Metadata
- Reproducible: yes
- Related Files: app/globals.css, tests/test_dual_scale_navigation.test.mjs

### Resolution
- **Resolved**: 2026-07-22T18:16:00+08:00
- **Notes**: 页头恢复 24px，POI 卡片改为 88px，并重新运行完整测试。

---
## [ERR-20260722-113] ffmpeg_drawtext_filter_unavailable

**Logged**: 2026-07-22T21:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
本机 Homebrew FFmpeg 未编译 `drawtext`，无法在三联验收图上直接叠加角标。

### Error
```text
No such filter: 'drawtext'
Error : Filter not found
```

### Context
- 使用 FFmpeg 8.0.1 合成 Reference / Blender / Three.js 三联图。
- 缩放、补边和横向拼接滤镜可用，只有字体角标滤镜缺失。
- 失败未覆盖任何既有证据图，目标文件尚未生成。

### Suggested Fix
合成前用 `ffmpeg -filters` 检查 `drawtext`；不可用时保留固定的左到右顺序并省略角标，或改用仓库内可复现的图像工具链。

### Metadata
- Reproducible: yes
- Related Files: test_artifacts/test_shanghai-cinema_three-way-comparison.png, test_artifacts/test_film-art-center_three-way-comparison.png

### Resolution
- **Resolved**: 2026-07-22T21:01:00+08:00
- **Notes**: 改用 FFmpeg 的 scale、pad 和 hstack，按 Reference、Blender、Three.js 固定顺序生成三联图。

---
## [ERR-20260722-114] vps_precheck_shell_quote_mismatch

**Logged**: 2026-07-22T20:51:00+08:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
VPS 发布前基线命令把远端单引号脚本与 HTML 匹配表达式中的双引号混用，导致远端 shell 在执行前报引号未闭合。

### Error
```text
bash: -c: line 1: unexpected EOF while looking for matching `"'
```

### Context
- 命令只用于读取现有入口 bundle 和模型哈希，没有执行任何写操作。
- 失败发生在本地参数解析阶段，远端站点未受影响。

### Suggested Fix
复杂远端检查拆成不含嵌套正则引号的独立命令；先读取 `head` 或文件清单，再在本地解析结果。

### Metadata
- Reproducible: yes
- Related Files: `deploy/README.md`, `deploy/nginx/xinhua.denkisan.me.conf`

### Resolution
- **Resolved**: 2026-07-22T20:52:00+08:00
- **Notes**: 去掉远端 HTML 正则，改用简单的 `head`、`find` 和 `sha256sum` 分步核验。

---
## [ERR-20260722-115] sites_large_asset_throughput_regression

**Logged**: 2026-07-22T21:06:00+08:00
**Priority**: high
**Status**: pending
**Area**: hosting

### Summary
Sites v19 发布成功且静态资源返回 200，但 `chatgpt.site` 在当前网络上下载大 GLB 极慢，导致全览长时间只显示基础街区体块。

### Error
```text
house-315.glb 1.60 MB: 75856 ms
shanghai-orchestra.glb 2.35 MB: 208680 ms
```

### Context
- Sites 版本 19 的来源提交为 `54fc124d5867e4952641656ffb4bd3e8b90024ab`，平台部署状态为 succeeded。
- 小型梧桐树 GLB 约 1.2 秒完成；大建筑资源返回 200 且命中 Cloudflare 缓存，但吞吐异常低。
- 同一提交在 `xinhua.denkisan.me` 上数秒内完成总览加载，上海影城和上海电影艺术中心公网模型 SHA 与本地一致。

### Suggested Fix
主展示继续使用 `xinhua.denkisan.me`。后续若 Sites 必须承担公开演示流量，评估启用主站模型跨域 CDN、模型压缩或独立对象存储，并在同视口、同冷缓存条件下重新采样。

### Metadata
- Reproducible: yes
- Related Files: `.openai/hosting.json`, `app/scene/xinhua-road-landmarks.tsx`, `public/models/xinhua-road/`
- See Also: `deploy/README.md`

---
## [ERR-20260722-116] sites_archive_download_transient_failure

**Logged**: 2026-07-22T21:49:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
Sites 保存版本 20 时首次无法下载本地上传的归档，完整性核验通过后第二次调用成功。

### Error
```text
SitesConnectorError: Unable to download site archive.
error_code: INVALID_ARGUMENT
type: invalid_archive
```

### Context
- 归档路径为 `/tmp/test_xinhua_sites_9b745b7.tgz`。
- `gzip -t`、必需入口检查和 SHA-256 均通过。
- 首次失败没有生成版本 ID，也没有进入部署阶段。

### Suggested Fix
遇到同类错误先检查归档可读性、gzip 完整性以及 `dist/server/index.js`、`dist/.openai/hosting.json`；均通过且未生成版本时只重试一次。

### Metadata
- Reproducible: no
- Related Files: `.openai/hosting.json`

### Resolution
- **Resolved**: 2026-07-22T21:50:00+08:00
- **Commit/PR**: `9b745b7`
- **Notes**: 相同归档第二次保存成功，生成 Sites v20 并进入生产发布。

---
## [ERR-20260722-117] imagemagick_identify_unavailable

**Logged**: 2026-07-22T22:20:00+08:00
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
幸福里参考图预检假设本机存在 ImageMagick `identify`，实际命令不可用。

### Error
```text
zsh:1: command not found: identify
```

### Context
- 只读检查 `docs/research/assets/poi-references/xingfuli/` 中参考图尺寸。
- 失败没有修改原始图片或研究证据。

### Suggested Fix
macOS 项目预检优先使用系统自带的 `sips -g pixelWidth -g pixelHeight`，除非已确认安装 ImageMagick。

### Metadata
- Reproducible: yes
- Related Files: `docs/research/assets/poi-references/xingfuli/`

### Resolution
- **Resolved**: 2026-07-22T22:21:00+08:00
- **Notes**: 已使用 `sips` 完成九张参考图的尺寸核验。

---
## [ERR-20260722-118] hybrid_model_preflight_environment_failures

**Logged**: 2026-07-23T00:15:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
上海影城混合模型试验预检依次遇到 Blender 沙箱内 Metal 探测崩溃、新生成器导入路径缺失和 zsh 未引用 Chrome 通配参数。

### Error
```text
Blender exit 139: supports_barycentric_whitelist / metal_is_supported
ModuleNotFoundError: No module named 'create_xinhua_road_models'
zsh: no matches found: --remote-allow-origins=*
```

### Context
- Blender 5.2 在受限沙箱初始化 GPU 后端时崩溃，脚本逻辑尚未执行。
- Blender 的 `--python` 不保证把脚本目录加入 `sys.path`。
- zsh 会在 Chrome 启动前展开未引用的 `*`。

### Suggested Fix
- Headless Blender 生产命令在已批准范围内从沙箱外运行；
- 独立生成器显式把自身目录加入 `sys.path` 后再导入共享 helper；
- Chrome 的 `--remote-allow-origins=*` 整体用单引号包裹。

### Metadata
- Reproducible: yes
- Related Files: `scripts/create_shanghai_cinema_hybrid_identity.py`, `scripts/test_hybrid_model_cdp.mjs`

### Resolution
- **Resolved**: 2026-07-23T00:16:00+08:00
- **Notes**: 三项均按上述方式修复；Blend/GLB 生成、CDP 六组采样和隔离全量测试随后通过。

---
## [ERR-20260722-118] blender_52_metal_backend_startup_crash

**Logged**: 2026-07-22T22:33:00+08:00
**Priority**: critical
**Status**: resolved
**Area**: infra

### Summary
Blender 5.2.0 LTS 在 macOS headless 初始化 Metal GPU backend 时原生崩溃，Python 生成器尚未开始执行。

### Error
```text
exit 139
blender::gpu::supports_barycentric_whitelist(MTLDevice*)
blender::gpu::MTLBackend::metal_is_supported()
GPU_backend_type_selection_detect()
```

### Context
- 资产命令：`Blender --background --python-exit-code 1 --python scripts/create_xingfuli_models.py -- --segment=all --stage=massing`。
- 最小复现：`Blender --background --factory-startup --python-expr "print('BLENDER_HEADLESS_OK')"`。
- 两个命令都在 Python 执行前崩溃，说明问题不来自幸福里生成器。
- Crash report：`/var/folders/9m/y4r0hmv54wg70vv7xm95n2bh0000gn/T/blender.crash.txt`。

### Suggested Fix
修复或更换能正常初始化 Metal backend 的 Blender 安装；以最小 headless 命令输出 `BLENDER_HEADLESS_OK` 且 exit 0 作为恢复门槛，再运行资产生成器。

### Metadata
- Reproducible: yes
- Related Files: `scripts/create_xingfuli_models.py`, `docs/research/xingfuli-model-brief.md`

### Resolution
- **Resolved**: 2026-07-22T22:36:00+08:00
- **Notes**: 沙箱外运行同一最小命令输出 `BLENDER_HEADLESS_OK` 且 exit 0；确认是受限沙箱的 Metal 探测限制，不是 Blender 安装或生成器问题。后续 Blender headless 资产命令使用已批准的沙箱外入口。

---
## [ERR-20260722-119] browser_console_api_guess

**Logged**: 2026-07-22T23:54:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
幸福里运行时验收误用了当前 Browser API 不存在的 Playwright 控制台与文档方法。

### Error
```text
tab.playwright.consoleMessages is not a function
tab.playwright.documentation is not a function
```

### Context
- 页面点击和截图已经完成，失败只发生在读取控制台诊断信息时。
- 当前接口文档由 `browser.documentation()` 提供，控制台日志由 `tab.dev.logs({})` 提供。

### Suggested Fix
浏览器诊断不要按上游 Playwright 猜测方法；先读取当前 Browser binding 文档，再使用 `tab.dev.logs({})`。

### Metadata
- Reproducible: yes
- Related Files: `test_artifacts/test_xingfuli_massing_runtime_preview.png`

### Resolution
- **Resolved**: 2026-07-22T23:55:00+08:00
- **Notes**: 已用 `tab.dev.logs({})` 取得日志；页面没有新增 error，只有既有 Three.js 弃用警告。

---
## [ERR-20260723-120] agent_browser_command_unavailable

**Logged**: 2026-07-23T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
技能清单提供了 `agent-browser` 工作流，但当前 shell 环境没有对应命令。

### Error
```text
zsh:1: command not found: agent-browser
```

### Context
- 尝试打开本地 `http://127.0.0.1:3000/` 并生成可访问性快照与评审截图。
- 本地 Vinext 服务已正常启动，失败只发生在浏览器 CLI 入口。

### Suggested Fix
本机未安装 CLI 时优先使用 Codex 应用内 Browser binding；不要为了只读验收临时安装全局工具。

### Metadata
- Reproducible: yes
- Related Files: `test_artifacts/`

### Resolution
- **Resolved**: 2026-07-23T00:15:00+08:00
- **Notes**: 已改用 Codex 应用内 Browser binding，完成本地项目、Summer Afternoon 与 Messenger 的实机审查。

---
## [ERR-20260723-122] llm_wiki_desktop_api_unreachable

**Logged**: 2026-07-23T00:24:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: docs

### Summary
视觉方向研究完成本地知识源后，LLM Wiki 桌面 API 无法读取状态或项目列表。

### Error
```text
LLM Wiki API request failed. Is the desktop app running? fetch failed
```

### Context
- 调用了 `llm_wiki_status` 和 `llm_wiki_projects`。
- 目标应为独立 `Threejs-3d-research`，不能写入 TowerOld 创作者 Wiki。
- 因无法确认实时项目和队列状态，本轮没有复制外置源、触发 rescan 或声称 Wiki 已学习。

### Suggested Fix
启动或恢复 LLM Wiki 桌面服务后，先核对独立项目 ID，再完成源文件同步、Source Rescan、队列清空与搜索/读取回查。

### Metadata
- Reproducible: unknown
- Related Files: `docs/knowledge-sources/xinhua-visual-direction-strategy.md`

### Resolution
- **Resolved**: 2026-07-23T00:30:00+08:00
- **Notes**: 启动 LLM Wiki 后，显式指定 `Threejs-3d-research` 项目完成 source rescan、队列清空、source search 命中和 MCP 原文读取；未写入当前选中的 TowerOld 项目。

---
## [ERR-20260723-121] glb_audit_script_path_assumption

**Logged**: 2026-07-23T00:28:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
幸福里 identity 资产审计把建模 Skill 自带脚本误当成了仓库脚本。

### Error
```text
python3: can't open file '/Users/lei/App_developing/wander-xinhua/scripts/audit_glb.py': [Errno 2] No such file or directory
```

### Context
- `photo-reference-webgl-modeling` 文档中的 `scripts/audit_glb.py` 是相对 Skill 根目录的资源。
- 仓库只有资产生成器，没有复制这份通用审计脚本。

### Suggested Fix
调用 `/Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py`，并在后续命令中明确 Skill 资源的绝对路径。

### Metadata
- Reproducible: yes
- Related Files: `public/models/xingfuli/`, `/Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py`

### Resolution
- **Resolved**: 2026-07-23T00:29:00+08:00
- **Notes**: 已确认脚本位于 Skill 目录，后续审计改用绝对路径。
- **Recurrence**: 2026-07-24 上海影城渐进 LOD 复核时再次误用仓库相对路径；已通过 `rg --files` 重新定位并改回 Skill 绝对路径。后续预检应先搜索 `.learnings/ERRORS.md` 中的工具名。

---
## [ERR-20260723-123] browser_networkidle_not_supported

**Logged**: 2026-07-23T00:34:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
应用内 Browser 文档列出 `networkidle`，当前 Chrome backend 的 `waitForLoadState` 实际不支持该状态。

### Error
```text
playwright_wait_for_load_state does not support networkidle
```

### Context
- 幸福里静态生产构建刷新后的运行时验收。
- `reload()` 已完成，失败只发生在等待状态选择。

### Suggested Fix
本地 WebGL 验收使用 `load`，随后用明确的启动按钮、资源请求、稳定等待与截图/控制台事实确认场景就绪。

### Metadata
- Reproducible: yes
- Related Files: `test_artifacts/test_xingfuli_identity_canonical_runtime_preview.png`

### Resolution
- **Resolved**: 2026-07-23T00:35:00+08:00
- **Notes**: 改用 `load` 后完成 DOM、WebGL 截图与控制台验收。

---
## [ERR-20260723-124] oversized_apply_patch_context_mismatch

**Logged**: 2026-07-23T00:43:00+08:00
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
抽取幸福里街景资源时，一次同时替换多个远距离代码块的补丁因局部上下文不完全一致而被拒绝。

### Error
```text
apply_patch verification failed: Failed to find expected lines in app/scene/xingfuli-block.tsx
```

### Context
- 单个补丁同时修改 imports、铺地、路灯、外摆和最终组件挂载。
- 目标文件中的 `EntryBollards` 括号布局与补丁快照不一致，补丁没有产生部分写入。

### Suggested Fix
对活跃大文件按 imports、常量、单个函数区间和挂载点拆成小补丁，并在每批前读取精确上下文。

### Metadata
- Reproducible: yes
- Related Files: `app/scene/xingfuli-block.tsx`

### Resolution
- **Resolved**: 2026-07-23T00:45:00+08:00
- **Notes**: 拆分为四个小补丁后，复用组件与铺地均已接入。

---
## [ERR-20260723-125] shared_street_asset_concurrent_export_mismatch

**Logged**: 2026-07-23T00:49:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
幸福里接入可复用街具后，构建发现同名资源文件已被另一份语义化实现覆盖，三个导入名不再存在。

### Error
```text
MISSING_EXPORT: CantileverUmbrella, IrregularStoneBollards, StreetLampInstances
```

### Context
- `eslint` 不验证 bundler 的 ESM 导出绑定，因此 lint 先通过、Vite build 才暴露冲突。
- 覆盖后的实现保留了等价且更完整的 `CantileverCafeUmbrella`、`HeritageLaneLamp`、`IrregularStoneBollard` 和证据元数据契约。

### Suggested Fix
并发编辑同名新文件后先重新读取实际导出；优先适配语义更完整的已有 API，并以生产 build 验证模块绑定。

### Metadata
- Reproducible: yes
- Related Files: `app/scene/shared-street-assets.tsx`, `app/scene/xingfuli-block.tsx`

### Resolution
- **Resolved**: 2026-07-23T00:52:00+08:00
- **Notes**: 幸福里改用现有语义化导出并补齐 evidenceRef、anchor、seed 与 variant 参数。

---
## [ERR-20260723-126] unrelated_style_lab_blocks_full_lint

**Logged**: 2026-07-23T01:08:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
幸福里目标文件的定向 ESLint 已通过，但全仓 `npm run lint` 被并发新增且不在本任务范围内的 `app/style-lab/StyleLab.tsx` 阻断。

### Error
```text
app/style-lab/StyleLab.tsx: 5 errors, 2 warnings
```

### Context
- `app/style-lab/` 是当前工作树中的另一组未跟踪变更。
- 幸福里任务不能在未确认所有权的情况下修改或删除该目录。

### Suggested Fix
最终验收前重新运行全仓 lint；若该并发工作尚未收敛，保留定向 lint 通过证据，并把全仓阻断准确报告为外部未完成项。

### Metadata
- Reproducible: yes
- Related Files: `app/style-lab/StyleLab.tsx`

### Resolution
- **Resolved**: 2026-07-23T01:12:00+08:00
- **Notes**: 并发 Style Lab 变更已自行收敛；最终全仓 `npm run lint` 退出码为 0，未改动其实现。

---
## [ERR-20260723-127] concurrent_test_context_drift

**Logged**: 2026-07-23T01:10:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
扩展幸福里站点与碰撞测试时，大补丁基于旧快照，因测试文件被并发更新而上下文不匹配。

### Error
```text
apply_patch verification failed: Failed to find expected lines in tests/test_xingfuli_models.test.mjs
```

### Context
- 测试文件在多个验收批次间持续增加断言。
- 旧快照与当前测试顺序、命名已经不同。

### Suggested Fix
每次补测试前重新读取实际文件，按单个测试块使用小补丁；完成后立即执行该测试文件。

### Metadata
- Reproducible: yes
- Related Files: `tests/test_xingfuli_models.test.mjs`

### Resolution
- **Resolved**: 2026-07-23T01:12:00+08:00
- **Notes**: 按当前文件逐块补齐并调整确定性路线，10 项专项测试全部通过。

---
## [ERR-20260723-128] concurrent_qa_preset_drift

**Logged**: 2026-07-23T01:28:00+08:00
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
实际页面多视角复核期间，幸福里 pool/entrance QA 机位被并发调整，基于旧坐标的回退补丁被拒绝。

### Error
```text
apply_patch verification failed: Failed to find expected lines in app/scene/xinhua-world.tsx
```

### Context
- 当前文件已经更新为入口向巷内回看、倒影池沿长轴观察的机位。
- 新机位意图更完整，不应强行覆盖回旧快照。

### Suggested Fix
每次构建和截图前重新读取 QA preset；并发变更如果质量更高，以当前文件为准重新构建验收。

### Metadata
- Reproducible: yes
- Related Files: `app/scene/xinhua-world.tsx`

### Resolution
- **Resolved**: 2026-07-23T01:29:00+08:00
- **Notes**: 保留当前更完整的机位定义并重新进行生产构建和浏览器验收。

---
## [ERR-20260723-129] browser_cdp_performance_sampling_not_ready

**Logged**: 2026-07-23T01:42:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
首次性能采样错误地从 `tab.cdp` 取能力；按能力文档改用 `tab.capabilities.get("cdp")` 后，当前页面仍处于 Browser Use 的暂停响应解析窗口，CDP 暂不可用。

### Error
```text
Cannot read properties of undefined (reading 'send')
Raw CDP is unavailable while Browser Use is resolving a paused document response.
```

### Context
- 最终入口页面已完成普通 UI 加载、6.5 秒预热和截图。
- 采样只读取 Performance、viewport 和 visibility，不修改页面。

### Suggested Fix
等待浏览器完成暂停响应处理后，用已读取文档的 `cdp` capability 重试；若仍不可用，只记录实际视口、预热、可见状态与构建模式，不伪造 FPS。

### Metadata
- Reproducible: unknown
- Related Files: `docs/research/build-records/xingfuli.json`

### Resolution
- **Resolved**: 2026-07-23T01:48:00+08:00
- **Notes**: 改用同源新标签页后完成 10 秒 Performance 采样、120 帧 rAF 采样和 console 来源核对；应用新增错误为 0，唯一 error 来自 CookieCloud 扩展的 `chrome-extension://` 脚本。

---
## [ERR-20260723-130] stale_repo_tests_after_xingfuli_final_integration

**Logged**: 2026-07-23T01:13:00+08:00
**Priority**: medium
**Status**: unresolved
**Area**: tests

### Summary
全仓 `npm test` 的生产构建通过，107/111 测试通过；4 个旧断言未包含幸福里 final 的懒加载 prop、复用梧桐实例和新结构化 QA 路线。

### Error
```text
rendered-html: expected <XingfuliBlock />
tree whitelist/runtime instance counts: expected old occurrence counts
terrain: expected legacy pool-bypass-* marker
```

### Context
- 幸福里专项测试 11/11 通过。
- 失败集中在旧测试的源码字符串/出现次数断言，不是 GLB、构建、碰撞数值或实际页面失败。

### Suggested Fix
逐个读取失败测试及其保护意图，改为断言 final 架构的精确事实：懒加载 prop、幸福里专属 placement、总实例消费者与三条结构化路线；随后重跑全仓测试。

### Metadata
- Reproducible: yes
- Related Files: `tests/rendered-html.test.mjs`, `tests/test_plane_tree_pipeline.test.mjs`, `tests/test_terrain.test.mjs`, `tests/test_xinhua_road_models.test.mjs`

---

## [ERR-20260723-130] browser_evaluate_raf_global_binding

**Logged**: 2026-07-23T01:45:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
Browser 插件页面评估函数里的裸 `requestAnimationFrame` 没有绑定为可调用全局，首次只读 FPS 探针失败。

### Error
```text
TypeError: requestAnimationFrame is not a function
```

### Suggested Fix
不要在 Browser 安全 `evaluate` 沙箱里采 rAF；改用已验证的同源独立标签页性能采样路径，或受支持的 Performance capability。

### Metadata
- Reproducible: yes
- Related Files: `docs/research/build-records/xingfuli.json`

### Resolution
- **Resolved**: 2026-07-23T01:52:00+08:00
- **Notes**: `window.requestAnimationFrame` 在该安全沙箱同样不可用；最终采用已成功完成的同源独立标签页 10 秒真实样本，不影响页面或模型。

---
# ERR131: 新增花箱碰撞后既有绕池 QA 路线失效

- Date: 2026-07-23
- Command: `node --test tests/test_xingfuli_models.test.mjs`
- Symptom: `pool-north-bypass` 在本地 `(27.38, -2.31)` 被东侧长花箱的生产碰撞阻断；新增石桩数量正则也因数组换行未匹配。
- Cause: 旧路线是在花箱没有进入碰撞数据时建立的，无法证明当前可视场景的真实通行；测试正则也错误假定 `[` 后没有换行。
- Resolution: 已把北侧绕池路线在水池东端、长花箱西侧回落主通道，并放宽数组换行正则；12/12 幸福里定向测试通过。
# ERR132: Blender 5.2 headless final 生成启动时崩溃

- Date: 2026-07-23
- Command: `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_xingfuli_models.py -- --segment=all --stage=final`
- Symptom: 启动后立即退出 `139`，日志显示 `ArchWarn: ARCH_CACHE_LINE_SIZE != Arch_ObtainCacheLineSize()` 并写出 `blender.crash.txt`。
- Cause: managed sandbox 内无法完成 Blender 5.2 的 Metal 后端探测；崩溃栈停在 `supports_barycentric_whitelist` / `metal_is_supported`。
- Resolution: 经授权在沙箱外运行同一确定性命令后成功；三段 GLB 哈希和体积保持不变，新增 comparison 预览生成完成。
# ERR133: Node REPL 误把 Browser Tab 当成 Playwright Page

- Date: 2026-07-23
- Operation: 最终 runtime console / Performance / rAF 采样
- Symptom: `perfTabFinal.getByRole is not a function`。
- Cause: in-app Browser 的 tab 语义操作位于其 Playwright 包装层，不直接暴露在 tab 根对象。
- Resolution: 改用 `perfTabFinal.playwright.getByRole(...)`，最终 CDP Performance、120 帧 rAF 与 console 原始证据采集成功。
# ERR134: 纵向 Blender 对照图触发横向证据宽度断言

- Date: 2026-07-23
- Command: `node --test tests/test_xingfuli_models.test.mjs`
- Symptom: 新增 `900×1100` 纵向 comparison 预览被通用“宽度至少 1000”断言拒绝。
- Cause: 通用断言为横向 runtime/canonical 证据设计，不能表达本次为匹配实景纵向构图而刻意生成的 900×1100 机位。
- Resolution: 将纵向 comparison 从横向通用断言中分离，独立锁定真实 PNG 与 `900×1100` 尺寸；不降低其他最终证据的宽高门槛。
# ERR135: 原始 runtime 指标并发刷新后摘要文档漂移

- Date: 2026-07-23
- Trigger: 独立复审中的全量只读测试
- Symptom: `test_xingfuli_final_runtime_metrics.json` 已刷新为新一组 120 帧，但 build record、Brief 和 Scene kit 仍保留上一组摘要，导致 111/112。
- Cause: 原始证据在摘要写入后被同一验收链再次采样更新，派生文档没有同步以磁盘当前 raw 为真值重算。
- Resolution: 以当前 raw 重新核对并同步 build record、Brief 与 Scene kit；最终摘要为 120 帧平均 `60.16 FPS`、P95 `17.3 ms`、最大 `17.7 ms`，并重跑全量测试。

# ERR136: managed sandbox 禁止读取全局进程表

- Date: 2026-07-23
- Command: `ps aux | rg -i 'llm.?wiki|LLM Wiki|electron'`
- Symptom: shell 返回 `operation not permitted: ps`。
- Cause: 当前 managed sandbox 不允许读取全局进程表。
- Resolution: 不提升权限、不重启服务，改用只读队列状态、队列文件更新时间和 Wiki 新增文件验证 worker 健康；后续确认 Tiny Glade 来源页和关联概念已持续写入。

# ERR137: 并发收尾导致构建记录补丁上下文失效

- Date: 2026-07-23
- Operation: 写入幸福里知识库 MCP 验证证据
- Symptom: `apply_patch` 无法匹配预期的 `independentReview: pending` 与 `knowledgeBaseSync: pending`。
- Cause: 同一工作区的并发收尾流程已提前改写对应字段。
- Resolution: 重新读取磁盘当前真值，发现并发流程还误写了 `Minor 0` 与 Review cleanup 完成；按独立终审和实时 Review MCP 结果修正，不覆盖其他有效更新。

# ERR138: LLM Wiki Review 窗口无法保持运行

- Date: 2026-07-23
- Operation: 用 CuaDriver 正式关闭 `review-d1f1a636`
- Symptom: `launch_app` 曾返回 PID 18959 与窗口 605，但随后的 window state 已不存在；`open -a 'LLM Wiki'` 后应用也未保持运行。
- Cause: 本地 API 服务正常，但桌面 UI 进程启动后立即退出，无法通过受支持的 Review UI 完成操作。
- Resolution: 不直接篡改 `.llm-wiki/review.json`；保留该条非阻断卫生项，并在 build record、Brief 与终审结论中准确标为 Minor 1。

# ERR139: CuaDriver 列表输出含警告前缀导致 JSON 解析失败

- Date: 2026-07-23
- Operation: 从 `cua-driver call list_apps` 输出筛选 LLM Wiki 状态
- Symptom: `JSON.parse` 遇到 `Warning:` 前缀报 `Unexpected token 'W'`。
- Cause: CLI 在结构化 JSON 前写入了人类可读警告，不能假定 stdout 是纯 JSON。
- Resolution: 改用 `--compact` 并把输出作为文本检查，不再对含警告的 stdout 直接 `JSON.parse`。

# ERR140: 用 `jq input` 合并三个独立队列时触发 break

- Date: 2026-07-23
- Operation: 最终核对 ingest、file-change、dedup 三个持久化队列
- Symptom: 单条 `jq` 表达式跨三个不同结构文件读取时返回 `jq: error: break`。
- Cause: `input` 消费顺序与首个输入的过滤上下文不匹配，且三个队列根结构并不一致。
- Resolution: 分别读取三个文件，并按数组或 `{tasks}` 对象各自计算 count；最终三者均为 0。

# ERR141: 收尾时尝试完成不存在的 Codex goal

- Date: 2026-07-23
- Operation: 最终计划与目标状态收尾
- Symptom: `update_goal({status: "complete"})` 返回 `this thread has no goal`。
- Cause: 当前任务只有普通 plan，没有由用户显式创建的持久 goal；先前上下文摘要中的 goal 提示已不适用于当前线程状态。
- Resolution: 保留已成功完成的 plan 状态，不创建新 goal，也不把普通任务强行转换为持久 goal。

# ERR142: agent-browser 命令在当前环境不可用

- Date: 2026-07-23
- Command: `agent-browser open https://d4c-dev.itch.io/lana-cartoon-character/purchase`
- Symptom: shell 返回 `zsh:1: command not found: agent-browser`。
- Cause: 当前工作区列出了 agent-browser skill，但对应 CLI 未安装或未进入 PATH。
- Resolution: 不把该 CLI 当作可用下载入口；继续使用公开页面、HTTP 下载元数据和项目内资产审计核验候选角色。

# ERR143: Blender 5.2 沙箱内动作网格渲染启动崩溃

- Date: 2026-07-23
- Command: `/Applications/Blender.app/Contents/MacOS/Blender --background assets/models/source/character/rain-summer-wanderer.blend --python scripts/test_render_rain_animation_grid.py`
- Symptom: Python 脚本尚未开始输出，Blender 即以退出码 `139` 结束，并报告 `ARCH_CACHE_LINE_SIZE != Arch_ObtainCacheLineSize()`。
- Cause: 与 `ERR132` 相同，managed sandbox 内的 Blender 5.2 Metal/系统能力探测原生崩溃，不是 Rain Blend 或动作本身的解析错误。
- Resolution: 已在沙箱外运行同一命令，9 张待机/行走/奔跑定机位图全部生成，Blender 正常退出；确认故障只来自沙箱内启动探测。
- See Also: ERR132

# ERR144: Rain 权重审计因旧节点名返回空报告

- Date: 2026-07-23
- Command: `/Applications/Blender.app/Contents/MacOS/Blender --background assets/models/source/character/rain-summer-wanderer.blend --python scripts/test_audit_rain_weights.py`
- Symptom: 命令成功退出但输出 `RAIN_WEIGHT_AUDIT={}`。
- Cause: 审计器仍匹配源文件的 `GEO-rain_*` 名称，而优化后 Blend 使用 `Rain_*` 名称；脚本也没有为空报告设置失败条件。
- Resolution: 已改为匹配最终节点名，并在报告为空时显式抛错；随后重新运行审计。

# ERR145: 浏览器 JPEG 截图误用 PNG 扩展名

- Date: 2026-07-23
- Command: `node --test tests/test_rain_character_asset.test.mjs tests/style-demo.test.mjs`
- Symptom: 浏览器 runtime 证据以 JPEG 字节保存为 `.png`，图像签名断言发现 `ffd8ffe0` 而不是 PNG 签名。
- Cause: in-app Browser 的截图返回 JPEG 字节；保存时沿用了预设的 `.png` 文件名。
- Resolution: 将三张 runtime 证据改为 `.jpg`，构建记录和 Brief 同步更新；测试分别解析 PNG 与 JPEG 的真实尺寸，不再接受扩展名和内容不一致。

# ERR146: 本机 FFmpeg 不含 drawtext 滤镜

- Date: 2026-07-23
- Command: 用 FFmpeg 为 Rain 三联对照图添加 `SOURCE / BLENDER / THREE.JS` 顶栏标签。
- Symptom: `No such filter: 'drawtext'`。
- Cause: 当前 Homebrew FFmpeg 构建未包含 `drawtext` 滤镜。
- Resolution: 保留三联图固定顺序并在 Brief 中明确列名，不依赖本机缺失的文字滤镜；图像本身仍使用 FFmpeg 确定性缩放、裁剪和拼接。

# ERR147: 浏览器重连后默认桌面视口高度变化

- Date: 2026-07-23
- Command: `npm test`
- Symptom: 最终 runtime 截图刷新后尺寸为 `1920×907`，旧断言和构建记录仍写 `1920×851`，导致全量测试 114/115。
- Cause: 浏览器恢复默认视口时，当前可用高度与前一会话不同；截图已更新但派生记录未同步。
- Resolution: 以磁盘最终截图的 `1920×907` 为权威更新 Brief 和 build record；测试改为读取 build record 中显式的 desktop/mobile viewport，再与图片头逐一比对。

# ERR148: in-app Browser 标签页不暴露 CDP 输入接口

- Date: 2026-07-23
- Operation: 尝试用 `Input.dispatchKeyEvent` 长按 W / Shift 采集真实 Walk / Run 连续帧。
- Symptom: `rainMotionTab.cdp` 为 `undefined`，调用 `send` 失败。
- Cause: 当前 Browser 绑定没有暴露标签页级 CDP 输入能力。
- Resolution: 按项目运行时验收规则新增页面内可重复 `qaMotion=walk|run` 路径；它走同一移动、动画状态机和跟随相机，可由真实浏览器稳定采集连续帧，不依赖未提供的底层输入接口。

# ERR149: React hooks lint 要求 useMemo 使用内联函数

- Date: 2026-07-23
- Command: `npm run lint`
- Symptom: `react-hooks/use-memo` 拒绝 `useMemo(requestedQaMotion, [])`。
- Cause: 当前 React hooks 规则要求首个参数是内联函数表达式。
- Resolution: 改为 `useMemo(() => requestedQaMotion(), [])`，行为不变并通过 lint。

# ERR150: Blender 5.2 沙箱内 GLB 尺寸审计启动崩溃

- Date: 2026-07-23
- Command: `blender --background --factory-startup --python-expr ...`
- Symptom: Python 尺寸审计尚未输出，Blender 即以退出码 `139` 结束，并报告 `ARCH_CACHE_LINE_SIZE != Arch_ObtainCacheLineSize()`。
- Cause: 与 `ERR132`、`ERR143` 相同，managed sandbox 内的 Blender 5.2 Metal/系统能力探测原生崩溃，不是两个角色 GLB 的解析错误。
- Resolution: 本次不重复修改 Blender 或资产；改用 GLB 节点/Accessor 数据及已通过的 Three.js runtime 证据校准正式页面比例。
- See Also: ERR132, ERR143

# ERR151: Browser 只读 evaluate 不提供 Performance API

- Date: 2026-07-23
- Operation: 正式地图浏览器验收时读取 Rain GLB resource timing。
- Symptom: `performance.getEntriesByType` 报 `Cannot read properties of undefined`。
- Cause: Browser 的受限只读 evaluate 不保证暴露 `performance`，其文档已明确要求不要假设该全局存在。
- Resolution: 视觉和 DOM 验收只读取 `document`；资源完整性改由静态文件 HTTP 状态与 SHA-256 核对。
- See Also: ERR129

# ERR152: 角色替换后旧比例断言阻断全量回归

- Date: 2026-07-23
- Command: `npm test`
- Symptom: 115/116 通过，`tests/map-data.test.mjs` 仍断言旧角色内联缩放 `1.15`。
- Cause: 正式角色已切换为 `CHARACTER_VISUAL_SCALE = 1.3`，场景测试仍锁定旧实现细节。
- Resolution: 同步断言新的命名比例常量和 primitive 引用，保留街巷宽度、角色半径及相机比例检查。
- See Also: ERR130

# ERR153: managed sandbox 禁止连接本机 Chrome CDP 端口

- Date: 2026-07-23
- Command: `TEST_CDP_HTTP=http://127.0.0.1:9224 node scripts/test_hybrid_front_capture.mjs`
- Symptom: Node `fetch` 返回 `connect EPERM 127.0.0.1:9224`，无法创建 CDP Target。
- Cause: managed sandbox 禁止进程连接本机调试端口；Chrome 已正常启动，错误与页面或模型加载无关。
- Resolution: 对同一只读截图脚本申请沙箱外执行权限，保持服务器、浏览器版本、视口和测试 URL 不变。
- Recurrence: 2026-07-24 渐进 LOD 实验脚本连接固定的 `127.0.0.1:9227` 时再次返回 `connect EPERM`；继续使用同一脚本、同一 Chrome 临时配置和同一网络条件申请沙箱外执行。
- See Also: ERR129, ERR148, ERR151

# ERR154: Sites 设计选择器在当前客户端不支持表单请求

- Date: 2026-07-23
- Operation: 调用 `sites-design-picker/choose_site_design` 展示三张主页方案。
- Symptom: MCP 返回 `The MCP client does not support openai/form requests.`。
- Cause: 当前 Codex 客户端不支持该选择器依赖的 `openai/form` 请求类型，与预览图片或方案内容无关。
- Resolution: 不重复调用该选择器；改用可直接显示的三张本地预览图和简短编号，让用户以 A/B/C 选择。

# ERR155: Browser 受限 evaluate 不暴露 HTMLCanvasElement 和 Canvas 导出方法

- Date: 2026-07-23
- Operation: 尝试从当前入口页的 WebGL Canvas 直接读取无 UI 全览底图。
- Symptom: `instanceof HTMLCanvasElement` 报右侧不是对象；DOM 节点可读但 `toDataURL` 不可用。
- Cause: Browser 的只读 evaluate 只暴露受限 DOM 读取能力，不保证构造器和 Canvas 方法存在。
- Resolution: 使用标签名和尺寸确认 Canvas，再通过临时 CDP 样式隐藏 UI 层并截取真实画面；截图后立即 reload 恢复页面。

# ERR156: 对话内可视化无法加载相对路径图片

- Date: 2026-07-23
- Operation: 用内联可视化片段引用同目录的三张入口页 JPEG 预览。
- Symptom: 用户端显示图片资源损坏。
- Cause: 当前对话内可视化不会可靠地把片段相对路径解析到旁边的本地图片文件。
- Resolution: 不再用相对路径传递设计预览；直接把最终 PNG 作为图片内容发送，并同时提供可点击的本地文件链接。
- See Also: ERR154

# ERR157: 从 Wiki hard link 路径错误反推原始知识库平铺位置

- Date: 2026-07-23
- Command: `sed -n '1,280p' /Volumes/plugin/3D_Modeling_ThreeJS_Knowledge_Base/xinhua-scene-dressing-kit.md`
- Symptom: `sed` 返回 `No such file or directory`，但同名文件存在于 Wiki 的 `raw/sources/`。
- Cause: 把 Wiki 接入目录中的文件布局误认为唯一事实源的完全镜像；部分接入文件不是源根目录平铺文件。
- Resolution: 新资料先在 `/Volumes/plugin/3D_Modeling_ThreeJS_Knowledge_Base` 建立明确目录，再对实际文件执行 hard link；验证 inode，不从 Wiki 路径猜源路径。
- See Also: ERR153

# ERR158: 误把 LLM Wiki ingest queue 当成 tasks 对象

- Date: 2026-07-23
- Command: `jq '{tasks: (.tasks // []), version, updatedAt}' .llm-wiki/ingest-queue.json`
- Symptom: `jq` 返回 `Cannot index array with string "tasks"`。
- Cause: 当前 LLM Wiki `0.6.4` 的 `ingest-queue.json` 顶层是任务数组，不是带 `tasks` 字段的对象。
- Resolution: 先用 `jq type` 读取实际 schema，再直接按数组查询 `status`、`sourcePath` 和 `error`；本次新 source 已显示为 `processing`。
- See Also: ERR157

# ERR158: zsh 循环变量 path 覆盖命令搜索路径

- Date: 2026-07-23
- Operation: 批量只读检查多个 Git worktree 的状态。
- Symptom: 循环第一次赋值后，后续 `git` 命令全部返回 `command not found`。
- Cause: zsh 的小写 `path` 是与 `PATH` 绑定的特殊数组，使用 `for path in ...` 会覆盖命令搜索路径。
- Resolution: shell 循环统一使用 `worktree_dir` 等任务专用变量名；避免使用 `path`、`home` 等 shell 特殊或常见环境变量。

# ERR159: Sites 保存版本时误用推测的完整提交 SHA

- Date: 2026-07-23
- Operation: 将已推送的本地提交与构建归档保存为 Sites 版本。
- Symptom: Sites 返回 `stale_commit_sha`，提示提交不是源仓库 `main` 的当前 HEAD。
- Cause: 只拿到短 SHA 后手工补写了不存在的完整 SHA，而没有先读取 `git rev-parse HEAD`。
- Resolution: 任何版本保存都直接使用干净构建 worktree 中 `git rev-parse HEAD` 的完整输出；禁止推测或补全 opaque/provenance 标识符。

# ERR160: Blender 5.2 在 managed sandbox 的 Metal 探测阶段崩溃

- Date: 2026-07-23
- Command: `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_toy_building_style_previews.py`
- Symptom: Blender 在 Python 脚本开始前退出码 `139`，crash backtrace 停在 `supports_barycentric_whitelist`、`MTLBackend::metal_is_supported` 与 `GPU_backend_type_selection_detect`。
- Cause: 与 `ERR150` 相同，managed sandbox 内 Blender 5.2 的 Metal/系统能力探测原生崩溃；不是软陶样板生成器的 Python 异常，也未覆盖正式资产。
- Resolution: 保留隔离输出路径，并在沙箱外运行同一个限定 Blender 命令；成功后仍需审计新 GLB 和截图，不以沙箱启动失败判断模型质量。
- See Also: ERR150, ERR143, ERR132

# ERR161: managed sandbox 禁止本地静态预览绑定 127.0.0.1:3002

- Date: 2026-07-23
- Command: `/usr/bin/python3 -m http.server 3002 --bind 127.0.0.1 --directory dist-static`
- Symptom: Python `socket.bind` 返回 `PermissionError: [Errno 1] Operation not permitted`。
- Cause: managed sandbox 禁止当前进程绑定本机预览端口；Vite 构建、封面专项测试和 lint 已独立通过。
- Resolution: 对同一个仅绑定 `127.0.0.1:3002` 的静态预览命令申请沙箱外执行，再使用真实浏览器完成桌面与手机封面截图。
- Recurrence: 2026-07-24 上海影城渐进 LOD 实验中，`vinext start` 绑定 `0.0.0.0:3017` 同样返回 `listen EPERM`；同日第三人称相机方案基线与 A/B 验收中，Python 静态服务绑定 `127.0.0.1:3013`、`127.0.0.1:3014` 再次返回同一错误。生产构建通过时，应直接对限定 loopback 端口的启动命令申请沙箱外执行。
- See Also: ERR153
## [ERR162] Git staging blocked by sandbox index lock restriction

**Date:** 2026-07-23
**Context:** 为“口袋玩具城”游戏封面准备精确提交时执行 `git add`。
**Error:** Git 无法创建 `.git/index.lock`，返回 `Operation not permitted`。
**Cause:** 当前文件沙箱允许读取 `.git`，但普通命令无权写入 Git 索引。
**Resolution:** 对精确目标文件重新执行受控提权的 `git add`，提交前继续核对 staged diff，避免带入无关改动。
- **Recurrence:** 2026-07-24 上海影城渐进 LOD 实验准备隔离提交时，同样因 `.git/index.lock` 返回 `Operation not permitted`；继续只对明确实验文件申请受控 Git 写权限。

## [ERR163] Web opener rejected a newly deployed Sites URL

**Date:** 2026-07-23
**Context:** Sites 部署成功后尝试通过通用网页打开器做线上验收。
**Error:** 打开器将新的 `chatgpt.site` 地址判定为不安全 URL，未执行读取。
**Resolution:** 改用 `curl` 验证首页与封面资源均返回 HTTP 200，并核对线上 HTML 已包含目标文案和图片路径。

## [ERR164] zsh 在嵌套 PowerShell 命令中提前解析引号

**Date:** 2026-07-24
**Context:** Whisper 转写运行期间，通过 SSH 旁路查询 Windows GPU 进程和本地 Wiki 队列。
**Error:** zsh 返回 `unmatched "`，远端只读检查没有执行。
**Cause:** 一条 shell 命令同时嵌套 zsh、SSH、PowerShell、管道和重定向，双引号与 PowerShell 转义层级不完整。
**Resolution:** 把远端进程检查与本地队列检查拆成两条简单命令；PowerShell 查询优先输出 JSON，避免在同一命令中混入重定向和多层引号。
- **Recurrence:** 2026-07-24 Wiki 队列轮询把 jq 插值、状态字符串和 zsh 循环写在同一命令中，再次触发 jq 引号解析失败；后续改用简单 `jq '[.[]|select(...)]|length'` 独立统计。

## [ERR165] 调试时打印完整应用状态导致无关鉴权字段出现在工具输出

**Date:** 2026-07-24
**Context:** 排查 LLM Wiki 长时间 processing 时读取应用状态文件。
**Error:** 对整个 JSON 执行 `jq '.'`，使与诊断无关的 API key/token 字段进入内部工具输出。
**Cause:** 没有先定义诊断字段白名单。
**Resolution:** 应用配置与状态文件一律只用明确的 `jq '{llmProvider, timeout, project}'` 类白名单表达式读取；不得打印完整配置，也不得在后续回复、日志或文档中复述敏感值。

## [ERR166] agent-browser skill 可用但本机 CLI 未安装

**Date:** 2026-07-24
**Context:** 上海影城渐进 LOD 实验准备打开本地生产构建做视觉与运行时验收。
**Error:** `agent-browser open ...` 返回 `command not found: agent-browser`。
**Cause:** 当前会话提供了 agent-browser 工作流说明，但本机没有对应可执行文件。
**Resolution:** 不为一次实验临时安装全局依赖，回退到仓库已有且已验证的 Headless Chrome CDP 测试脚本；继续固定浏览器版本、视口、网络、缓存与页面错误采集。

## [ERR167] Browser CUA 滚轮字段名误用

**Date:** 2026-07-24
**Context:** 验证第三人称相机首次滚轮缩放是否连续。
**Error:** `cua.scroll` 返回 `requires x, y, scrollX, and scrollY`。
**Cause:** 误用了 CDP 风格的 `deltaX/deltaY`，而 Browser CUA 接口要求 `scrollX/scrollY`。
**Resolution:** 保留截图确认的画布坐标，改用 `{ x, y, scrollX, scrollY }`；向内、向外和最近边界三条真实页面缩放路径均随后通过。

## [ERR168] React lint 拒绝 effect 内的相机变更与同步 setState

**Date:** 2026-07-24
**Context:** 第三人称相机 V1 收口运行 `npm run lint`。
**Error:** `react-hooks/immutability` 拒绝在 `useLayoutEffect` 修改 `useThree()` 返回的 camera；`react-hooks/set-state-in-effect` 拒绝 effect 内同步设置 QA 查询参数状态。
**Cause:** 相机投影更新没有放进 R3F 的帧生命周期；只读 URL 初值被不必要地建模成 effect 同步。
**Resolution:** 用 `useFrame(({ camera, size }) => ...)` 更新 FOV，只在值变化时刷新投影矩阵；QA 开关改为带 `window` 守卫的惰性 `useState` 初值。修正后重新运行 lint。

## [ERR169] 多个二进制验收产物不能用文本补丁批量整理

**Date:** 2026-07-24
**Context:** 把第三人称相机 A/B 轨迹和截图整理进 `docs/research`。
**Error:** 一条 `mv source target source target` 被解释成多源到单目录；随后 `apply_patch` 删除 PNG 时因非 UTF-8 二进制内容失败。
**Cause:** `mv` 不支持在一条多源命令中表达多个不同目标名；文本补丁工具也不适合读取 PNG。
**Resolution:** 不同目标名的轨迹拆成独立 `mv`；保留的 PNG 只做机械移动，明确由本轮生成且不纳入证据的临时 PNG 用精确文件名删除，不使用递归或通配符。

## [ERR170] 直接用 Node 导入 TSX 只为统计边界长度

**Date:** 2026-07-24
**Context:** 复核 spring-arm 每帧边界采样规模。
**Error:** 先把实际的 `xinhua-map.tsx` 猜成 `.ts`，随后原生 Node 又因不识别 `.tsx` 扩展名而失败。
**Cause:** 对只需读取 JSON 数组长度的诊断使用了不必要的模块导入路径。
**Resolution:** 先用 `rg --files` 确认文件，再直接执行 `jq '.boundary | length' app/scene/xinhua-map-data.json`；确认边界为 59 个点，不再引入 TSX loader。

## [ERR171] 全量测试仍把已淘汰的相机兜底循环当作合同

**Date:** 2026-07-24
**Context:** spring-arm V1 通过生产构建后运行 `npm test`。
**Error:** 133 项中 3 项失败，均要求源码继续包含 `isPlanarCameraCandidateClearInPolygon`、`CAMERA_FALLBACK_YAWS`、16 档缩臂循环或第三个兜底目标高度分支。
**Cause:** 专项测试已覆盖新架构，但三个较早的仓库级源码合同测试仍锁定被本轮明确淘汰的实现细节。
**Resolution:** 不删除测试；把合同更新为独立 `WORLD_CAMERA_OBSTACLES`、连续 `resolvePlanarSpringArm`、blocker 遥测以及初始化/逐帧目标高度，并明确断言旧 16 档循环不存在。随后重跑完整测试。

## [ERR172] Browser 高层接口不能直接覆盖持续输入与控制台采集

**Date:** 2026-07-24
**Context:** 第三人称相机 V1 的真实页面交互与运行时异常验收。
**Error:** 页面刚进入时按按钮文本查询短暂返回 0 个结果；`tab.console` 不存在；原始 CDP 键盘接口也不支持可信的持续按住输入。
**Cause:** UI 可交互状态晚于首个短等待窗口，高层 Browser 封装没有暴露所假设的 console helper，且一次性键盘事件不能替代跨多帧的真实摇杆或长按。
**Resolution:** 等待实际 DOM 进入可交互态后再定位按钮；通过 CDP `Runtime` / `Log` 事件采集异常与控制台；持续左摇杆加右手拖拽明确保留为真机触控验收，不用合成短按冒充证据。

## [ERR173] Wiki 原始来源可回读但增量索引没有生成目标 source 页面

**Date:** 2026-07-24
**Context:** 将第三人称相机 V1 的独立验证结论增量同步到 `Threejs-3d-research`。
**Error:** 首次扫描后 `llm_wiki_status` / `llm_wiki_search` 曾短暂返回 `fetch failed`；API 恢复后能从 `raw/sources` 回读目标文件，但混合搜索和 `wiki/` 文件列表仍没有目标 source 页面。
**Cause:** Desktop API 短暂不可达；随后 source snapshot 已记录目标文件，但 ingest 队列没有该目标任务，第二次 rescan 又返回无变更，无法证明索引生成完成。
**Resolution:** 保留三份同哈希原始来源并完成 API 原文回读；把“已进入 raw source”与“已形成可检索 Wiki 页面”分开报告，不把 rescan 成功当作知识库吸收完成。另有一项旧来源 pending，与本目标区分处理。

## [ERR174] Browser 标签交接需要显式状态对象

**Date:** 2026-07-24
**Context:** 把本地相机 QA 页面留给用户继续验收。
**Error:** `browser.tabs.finalize({ keep: [tab] })` 返回 keep 项必须是 `{ tab, status }`；随后使用 `status: "keep"` 又被拒绝。
**Cause:** finalize 接口的保留项不是 Tab 数组，合法状态只接受 `handoff` 或 `deliverable`。
**Resolution:** 使用 `browser.tabs.finalize({ keep: [{ tab, status: "handoff" }] })`，成功交接可继续操作的本地验收标签。

## [ERR175] 地形测试把旧人物速度数值当作高程合同

**Date:** 2026-07-24
**Context:** 用户要求人物稍微减速后运行完整 `npm test`。
**Error:** 140 项中 1 项失败；`tests/test_terrain.test.mjs` 仍要求源码包含 `inputState.sprint ? 9.2 : 3.6`。
**Cause:** 地形基准测试硬编码了与高程无关的旧移动速度；新增控制专项测试已覆盖新的探索、奔跑和全览速度合同。
**Resolution:** 保留地形测试并将旧数值断言更新为命名的 `EXPLORE_WALK_SPEED` 及其模拟输入缩放路径；随后重跑完整测试。
**See Also:** ERR171

## [ERR176] Browser 手机验收环境不能直接注入原始 TouchEvent

**Date:** 2026-07-24
**Context:** 复核左下角摇杆区域与文字禁止选中的 390×844 生产构建。
**Error:** 受限页面求值环境不暴露 `HTMLElement`、`navigator` 或 selection helper；`Input.dispatchTouchEvent` 也提示 in-app Browser 不支持原始触控 CDP 注入。
**Cause:** Browser 为保持焦点和安全边界，对页面全局对象及原始输入 CDP 命令进行了限制。
**Resolution:** 不用 `instanceof` 或原始 TouchEvent 冒充真机证据；改为读取真实 DOM、计算样式和区域 bounds，确认游玩态 `user-select: none`、摇杆盒为左下 `195×320px`、右侧保留 `195px` 镜头区域。持续双指体感仍以用户手机验收为准。
**See Also:** ERR172

## [ERR177] 转向速度专项测试残留旧的重复源码断言

**Date:** 2026-07-24
**Context:** 按用户反馈降低人物转身和跑步速度后运行控制专项测试。
**Error:** 10 项中 1 项失败；同一测试文件的后续入口合同仍要求 `CHARACTER_MAX_TURN_SPEED = 12`。
**Cause:** 数学手感测试和主要源码合同已经更新为新值，但另一处重复的源码断言没有同步。
**Resolution:** 将残留断言更新为 `8.5`，并在完整测试前搜索全部旧速度常量，避免重复合同再次漏改。
**See Also:** ERR171, ERR175

## [ERR178] 受限沙箱不能写入主仓库的 worktree Git 索引

**Date:** 2026-07-24
**Context:** 完成角色转向与跑步速度微调后，准备提交隔离 worktree 的三个精确文件。
**Error:** `git add` 无法创建主仓库 `.git/worktrees/third-person-camera-controls/index.lock`，返回 `Operation not permitted`。
**Cause:** 当前沙箱允许写入 worktree 文件，但主仓库 `.git` 目录只有读取权限。
**Resolution:** 保持提交范围为三个已审阅文件，使用受控的 Git 权限升级完成暂存和提交，不扩大文件系统写入范围。

## [ERR179] 局域网预览在最终复查时短暂拒绝连接

**Date:** 2026-07-24
**Context:** 提交角色速度微调后，再次检查手机使用的 `192.168.50.12:3013`。
**Error:** 首次构建后曾返回 200，提交后的首次复查变为 `connection refused`；沙箱内直接执行 `ps` 又被系统拒绝。
**Cause:** 精确检查确认原 Python 服务仍在 `*:3013` 监听，随后本机与局域网请求都恢复 200；只能确认是瞬时连接失败，不能据此声称进程退出。
**Resolution:** 使用 `lsof` 精确确认监听者，再分别请求 localhost 与局域网 URL；关闭临时启用的 3014 备用服务，保留原 3013 服务和手机地址。
**See Also:** ERR178

## [ERR180] 隔离 worktree 内没有独立的 Vite 可执行文件

**Date:** 2026-07-24
**Context:** 从隔离 worktree 重启局域网静态预览。
**Error:** `./node_modules/.bin/vite preview ...` 返回 `no such file or directory`。
**Cause:** 依赖安装在主仓库根目录，隔离 worktree 没有自己的 `node_modules`；npm scripts 会自动补充父级依赖路径，但直接相对调用不会。
**Resolution:** 使用主仓库已安装的 `../../node_modules/.bin/vite` 启动预览，不重新安装或复制依赖。
**See Also:** ERR179

## [ERR181] Browser 标签页集合没有 open 方法

**Date:** 2026-07-24
**Context:** 验收移动端走路/跑步切换按钮的生产构建。
**Error:** `browser.tabs.open(...)` 返回 `browser.tabs.open is not a function`。
**Cause:** 把其他浏览器控制接口的命名误套到当前 Browser client；当前接口使用 `browser.tabs.new(...)` 创建标签页。
**Resolution:** 保留既有 Browser 绑定，改用 `browser.tabs.new(...)` 创建本地验收页，不重置浏览器或切换控制工具。
**See Also:** ERR174

## [ERR182] Browser 页面求值环境再次屏蔽 navigator

**Date:** 2026-07-24
**Context:** 读取走路/跑步切换按钮验收页的视口和触控能力。
**Error:** 读取 `navigator.maxTouchPoints` 时返回 `Cannot read properties of undefined`。
**Cause:** Browser 的受限页面求值环境不暴露 `navigator`，与既有移动端验收限制一致。
**Resolution:** 不用 `navigator` 判断验收页；改读真实 DOM 的 viewport 尺寸、计算样式、控件 bounds 和 ARIA 状态，并用 Browser 点击验证切换。
**See Also:** ERR176

## [ERR183] Browser 受限 DOM 代理不支持 classList

**Date:** 2026-07-24
**Context:** 在桌面 Browser 标签中临时模拟 390×844 的手机舞台以检查触控按钮布局。
**Error:** `stage.classList.add("is-touch")` 返回 `stage?.classList.add is not a function`。
**Cause:** Browser 页面求值返回的是受限 DOM 代理，不提供完整的 `DOMTokenList` 接口。
**Resolution:** 使用元素的 `getAttribute` / `setAttribute` 临时设置验收 class 与内联尺寸，再读取 `getBoundingClientRect` 和计算样式；不修改生产源码。
**See Also:** ERR176, ERR182

## [ERR184] Browser 受限 DOM 代理也禁止 setAttribute

**Date:** 2026-07-24
**Context:** 继续尝试只在验收标签页临时显示触控控件。
**Error:** `stage.setAttribute(...)` 返回 `stage?.setAttribute is not a function`。
**Cause:** 当前 Browser 页面求值不仅省略 `classList`，也不暴露通用 DOM 写入方法。
**Resolution:** 停止依赖页面注入，新增只在显式 `touchQa=1` 查询参数下启用的触控控件 QA 入口，再用真实生产构建完成读取和点击验收。
**See Also:** ERR176, ERR182, ERR183

## [ERR185] 手机真实体验前局域网预览服务已停止

**Date:** 2026-07-24
**Context:** 用户要求不带监控数据的真实体验入口，交付前复查 `192.168.50.12:3013`。
**Error:** `curl` 返回 `Failed to connect` 和 HTTP `000`。
**Cause:** 之前的临时 Python 静态预览进程已不再监听 3013；构建产物本身仍在。
**Resolution:** 从当前 worktree 的已验证 `dist-static` 重新绑定 `0.0.0.0:3013`，并在给出无查询参数入口前同时验证 localhost 与局域网地址返回 200。
**See Also:** ERR179

## [ERR186] 内置浏览器无法向 Messenger 注入原始触摸事件

**Date:** 2026-07-24
**Context:** 以 390×844 手机视口实际体验 `messenger.abeto.co` 的摇杆、人物转身和镜头回位。
**Error:** `Input.dispatchTouchEvent` 返回当前 in-app Browser 不支持该命令；普通鼠标点击也不能触发只响应触摸的游戏入口。
**Cause:** Browser 会把输入 CDP 命令转换为 JavaScript以保持焦点，因此不开放原始触摸注入；Messenger 的入口依赖触摸事件。
**Resolution:** 不把鼠标合成冒充真机触控。保留可确认的移动端构图、DOM 热区和公开前端资产证据，并将持续摇杆手感明确建立在用户真机反馈与本项目可重复 QA 上。
**See Also:** ERR176, ERR172

## [ERR187] Chrome Browser 禁止原始持续键盘 CDP 输入

**Date:** 2026-07-24
**Context:** 在用户 Chrome 中进入 Messenger 场景后，准备按住 W/S/D 记录移动中与停止后的镜头轨迹。
**Error:** `Input.dispatchKeyEvent` 返回该方法不支持，要求使用 `tab.cua.type` 或 `tab.cua.keypress`。
**Cause:** Chrome Browser 对原始输入 CDP 命令设有限制，不能直接维持跨多帧 keyDown 状态。
**Resolution:** 使用允许的短按序列观察朝向、构图和停止回位，并把无法精确测量的持续输入阻尼明确标为定性结论，不伪装成按住测试。
**See Also:** ERR172, ERR186
