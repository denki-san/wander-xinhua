# Deployment Guide

项目在本地完成开发、构建和测试。VPS `66.154.109.135` 只保存本地生成的
静态产物，并由 Nginx 直接提供服务。公网入口使用 `xinhua.denkisan.me`，
不设置登录或 HTTP Basic Auth。

`/var/www/xinhua-messenger` 是项目改名前沿用至今的线上兼容目录；发布时保留
该路径，避免为了目录改名引入额外停机和 Nginx 配置迁移。

## 当前架构

```text
本地 npm run build -> dist-static/ -> Sites / VPS 同提交发布
                                      |
访客 -> xinhua.denkisan.me -> Nginx -> /var/www/xinhua-messenger
                          \-> immutable CDN -> /var/www/xinhua-cdn/sha256/
```

VPS 不安装前端依赖、不执行构建，也不运行 Node 开发或生产进程。TLS 由
Nginx 和 Certbot 管理。

上海影城是 Issue #1 的单资产 CDN 试点。CDN 对象不放进可切换的 release 目录，
而是按 SHA-256 保存到 `/var/www/xinhua-cdn/sha256/`。应用仍保留原 GLB，当 CDN
网络失败或使用 `?asset-cdn-fallback=shanghai-cinema` 时回退；两者 bytes 与 SHA
必须相同。

## 本地构建

```bash
npm ci
npm run lint
npm run build
```

确认 `dist-static/index.html` 与 `dist-static/assets/` 存在后，把本地静态产物打包并上传到 VPS 的临时目录：

```bash
COPYFILE_DISABLE=1 tar -C dist-static -czf /tmp/test_xinhua_release.tgz .
scp /tmp/test_xinhua_release.tgz root@66.154.109.135:/tmp/
```

服务器只负责解包和目录切换：先解包到带时间戳的 release 目录，检查
`index.html` 与 `assets/`，再把目录统一为 `755`、文件统一为 `644`。必须在切换前
让 VPS 本机使用域名 Host 直接读取候选首页并得到 `200`；macOS 打包即使已经设置
`COPYFILE_DISABLE=1`，仍可能保留本机 `600/700` mode，不能只检查文件存在。通过后
才将现有线上目录改名为 backup，再把 release 改名为
`/var/www/xinhua-messenger`。不在 VPS 安装依赖、运行构建或删除历史版本。

## 首次启用

1. 在 Cloudflare 创建 `xinhua.denkisan.me` 的 A 记录，指向
   `66.154.109.135`。
2. 等待 `dig +short xinhua.denkisan.me` 返回该地址。
3. 在本地完成构建并把 `dist-static/` 同步到
   `/var/www/xinhua-messenger/`。
4. 将 `deploy/nginx/xinhua.denkisan.me.conf` 复制到
   `/etc/nginx/sites-available/`，并在 `/etc/nginx/sites-enabled/` 创建同名软链接。
5. 先运行 `nginx -t`，只有检查通过后才运行 `systemctl reload nginx`。
6. 确认 HTTP 可访问后执行
   `certbot --nginx -d xinhua.denkisan.me --redirect`，再运行一次 `nginx -t`。

首次签发后，Certbot 会在服务器上的站点配置中加入 443 证书块与 80 到 443
跳转；仓库中的 Nginx 文件保留为首次启用所需的 HTTP bootstrap 配置。

## 发布验证

依次确认：

- VPS 上不存在新华漫游志的构建或开发进程；
- 候选 release 的目录 mode 为 `755`、文件 mode 为 `644`，且没有 `._*`
  AppleDouble 文件；
- VPS 本机使用域名 Host 访问 Nginx 返回 200；
- 公网访问 `https://xinhua.denkisan.me/` 返回 200；
- 页面无需登录，可自由 3D 闲逛，并且只有一个行动点；
- HTTP 自动跳转 HTTPS，证书域名为 `xinhua.denkisan.me`。
- 上海影城靠近后，根节点 `data-xinhua-asset-delivery-status` 为 `cdn`，loaded URL
  是 asset lock 的 immutable URL；强制回退入口为 `local-fallback`。
- immutable URL 返回 `model/gltf-binary`、CORS、1 年 immutable cache，下载后
  SHA-256 与 asset lock 一致；不能只检查 HTTP 200。

## 回滚

每次切换前，把 `/var/www/xinhua-messenger` 改名为带时间戳的 backup 目录。
如果新版本异常，先把失败版本改名保留，再把 backup 改回
`/var/www/xinhua-messenger`；运行 `nginx -t` 通过后 reload Nginx。回滚不删除
当前失败产物，便于后续定位。

回滚到旧提交后，旧 runtime 自然读取 release 内的上海影城 GLB。CDN 对象保持不动，
因此恢复新 release 后仍引用同一个 immutable URL。若需单独撤回 CDN route，恢复
`/etc/nginx/sites-available/xinhua.denkisan.me.before-issue1-cdn-20260730`，先
`nginx -t` 再 reload；不得删除 `/var/www/xinhua-cdn` 对象或 release backup。
