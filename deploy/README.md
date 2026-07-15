# Deployment Guide

当前生产容器运行在 `66.154.109.135`，仅监听服务器回环地址
`127.0.0.1:8790`。公网入口计划使用 `xinhua.denkisan.me`，不设置登录或
HTTP Basic Auth。

## 当前架构

```text
访客 -> xinhua.denkisan.me -> Nginx -> 127.0.0.1:8790 -> xinhua-messenger
```

容器端口不会直接暴露到公网，TLS 由 Nginx 和 Certbot 管理。

## 首次启用

1. 在 Cloudflare 创建 `xinhua.denkisan.me` 的 A 记录，指向
   `66.154.109.135`。
2. 等待 `dig +short xinhua.denkisan.me` 返回该地址。
3. 将 `deploy/nginx/xinhua.denkisan.me.conf` 复制到
   `/etc/nginx/sites-available/`，并在 `/etc/nginx/sites-enabled/` 创建同名软链接。
4. 先运行 `nginx -t`，只有检查通过后才运行 `systemctl reload nginx`。
5. 确认 HTTP 可访问后执行
   `certbot --nginx -d xinhua.denkisan.me --redirect`，再运行一次 `nginx -t`。

## 发布验证

依次确认：

- `docker inspect` 显示容器为 `healthy`；
- VPS 本机访问 `http://127.0.0.1:8790/` 返回 200；
- 公网访问 `https://xinhua.denkisan.me/` 返回 200；
- 页面显示“无需登录”，可完成三条核心任务；
- HTTP 自动跳转 HTTPS，证书域名为 `xinhua.denkisan.me`。

## 回滚

如果域名接入异常，先移除 `/etc/nginx/sites-enabled/` 中的站点软链接，运行
`nginx -t`，检查通过后 reload Nginx。保留 `sites-available` 配置和
`xinhua-messenger` 容器，便于修复后快速恢复；回滚域名入口不删除应用数据或镜像。
