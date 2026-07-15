# Errors

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
**Status**: pending
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
