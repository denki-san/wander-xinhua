import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("生产发布使用本地静态构建产物", async () => {
  const packageJson = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  const staticConfig = await readFile(new URL("vite.static.config.ts", root), "utf8");

  assert.equal(packageJson.scripts.build, "vite build --config vite.static.config.ts");
  assert.equal(packageJson.scripts["build:static"], "npm run build");
  assert.equal(packageJson.scripts.start, "npm run preview:static");
  assert.match(staticConfig, /outDir:\s*["']dist-static["']/);
});

test("Nginx 直接提供静态产物且不启用登录", async () => {
  const config = await readFile(
    new URL("deploy/nginx/xinhua.denkisan.me.conf", root),
    "utf8",
  );

  assert.match(config, /server_name\s+xinhua\.denkisan\.me;/);
  assert.match(config, /root\s+\/var\/www\/xinhua-messenger;/);
  assert.match(config, /try_files\s+\$uri\s+\$uri\/\s+\/index\.html;/);
  assert.match(config, /location \/models\/\s*\{[^}]*expires 7d;/s);
  assert.match(config, /location \/images\/\s*\{[^}]*expires 7d;/s);
  assert.doesNotMatch(config, /proxy_pass|127\.0\.0\.1:8790/);
  assert.doesNotMatch(config, /auth_basic|password|login/i);
});
