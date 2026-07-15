# Deployment Guide

项目在本地完成开发、构建和测试。VPS `66.154.109.135` 只保存本地生成的
静态产物，并由 Nginx 直接提供服务。公网入口使用 `xinhua.denkisan.me`，
不设置登录或 HTTP Basic Auth。

## 当前架构

```text
本地 npm run build -> dist-static/
                              |
                              v
访客 -> xinhua.denkisan.me -> Nginx -> /var/www/xinhua-messenger
```

VPS 不安装前端依赖、不执行构建，也不运行 Node 开发或生产进程。TLS 由
Nginx 和 Certbot 管理。

## 本地构建

```bash
npm ci
npm run lint
npm run build
```

确认 `dist-static/index.html` 与 `dist-static/assets/` 存在后，再同步到 VPS：

```bash
rsync -avz --delete dist-static/ root@66.154.109.135:/var/www/xinhua-messenger/
```

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

- VPS 上不存在新华信使的构建或开发进程；
- VPS 本机使用域名 Host 访问 Nginx 返回 200；
- 公网访问 `https://xinhua.denkisan.me/` 返回 200；
- 页面无需登录，可自由 3D 闲逛，并且只有一个行动点；
- HTTP 自动跳转 HTTPS，证书域名为 `xinhua.denkisan.me`。

## 回滚

每次覆盖发布前，把 `/var/www/xinhua-messenger` 复制为带时间戳的备份目录。
如果新版本异常，把 Nginx 的 `root` 临时切换到备份目录，运行 `nginx -t`，
检查通过后 reload Nginx。回滚不删除当前失败产物，便于后续定位。
