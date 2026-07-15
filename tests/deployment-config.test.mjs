import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("容器仅监听 VPS 回环地址", async () => {
  const compose = await readFile(new URL("compose.yaml", root), "utf8");
  assert.match(compose, /127\.0\.0\.1:8790:8790/);
  assert.doesNotMatch(compose, /(?:^|\s)["']?0\.0\.0\.0:8790:8790/m);
});

test("Nginx 域名入口反向代理到本机容器且不启用登录", async () => {
  const config = await readFile(
    new URL("deploy/nginx/xinhua.denkisan.me.conf", root),
    "utf8",
  );

  assert.match(config, /server_name\s+xinhua\.denkisan\.me;/);
  assert.match(config, /proxy_pass\s+http:\/\/127\.0\.0\.1:8790;/);
  assert.match(config, /proxy_set_header\s+X-Forwarded-Proto\s+\$scheme;/);
  assert.doesNotMatch(config, /auth_basic|password|login/i);
});
