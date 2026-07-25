import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const auditScript = path.join(root, "scripts/audit_glb.py");
const fixture = path.join(
  root,
  "public/models/xinhua-road/shanghai-cinema-hybrid-identity.glb",
);

function runAudit(...args) {
  return spawnSync("python3", [auditScript, fixture, ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

test("仓库 GLB 审计脚本输出稳定的无贴图结构摘要", () => {
  const result = runAudit("--forbid-images", "--max-nodes", "8");
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const summary = JSON.parse(result.stdout.trim());
  assert.equal(summary.status, "ok");
  assert.equal(summary.nodes, 1);
  assert.equal(summary.meshes, 1);
  assert.equal(summary.images, 0);
  assert.equal(summary.textures, 0);
  assert.ok(summary.bytes > 400_000);
});

test("仓库 GLB 审计脚本在预算超限时返回失败", () => {
  const result = runAudit("--max-nodes", "0");
  assert.equal(result.status, 1, result.stderr || result.stdout);
  const summary = JSON.parse(result.stdout.trim());
  assert.equal(summary.status, "failed");
  assert.deepEqual(summary.violations, ["节点数 1 超过上限 0"]);
});
