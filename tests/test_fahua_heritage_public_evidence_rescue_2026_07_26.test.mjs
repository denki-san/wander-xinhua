import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
const root = new URL("../", import.meta.url);
const path = "docs/research/fahua-heritage-public-evidence-rescue-2026-07-26.json";
async function json(p) { return JSON.parse(await readFile(new URL(p, root), "utf8")); }
async function sha(p) { return createHash("sha256").update(await readFile(new URL(p, root))).digest("hex"); }
test("fahua public rescue 提升街道语境但不越权解除地图或三档 blocker", async () => {
  const audit = await json(path);
  assert.equal(audit.status, "public-street-context-found-rear-and-map-boundary-still-blocked");
  assert.equal(audit.sources.length, 3);
  for (const source of audit.sources) assert.equal(source.sameSubject, true);
  for (const input of Object.values(audit.inputs)) assert.equal(await sha(input.path), input.sha256, input.path);
  assert.equal(audit.scope.xiaohongshuAccessed, false);
  assert.equal(audit.scope.userBrowserAccessed, false);
  assert.equal(audit.scope.modelingPerformed, false);
  assert.equal(audit.gates.evidence, "partial-identity-and-street-context");
  assert.equal(audit.gates.map, "blocked-no-survey-boundary");
  assert.equal(audit.gates.heroMcp2, "not-authorized");
  assert.equal(audit.gates.threeTier, "not-reachable");
});
