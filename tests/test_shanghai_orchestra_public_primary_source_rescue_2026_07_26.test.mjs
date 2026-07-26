import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
const root = new URL("../", import.meta.url);
const path = "docs/research/shanghai-orchestra-public-primary-source-rescue-2026-07-26.json";
async function json(p) { return JSON.parse(await readFile(new URL(p, root), "utf8")); }
async function sha(p) { return createHash("sha256").update(await readFile(new URL(p, root))).digest("hex"); }
test("orchestra public rescue 保持官方地址证据与成员 blocker 分离", async () => {
  const audit = await json(path);
  assert.equal(audit.status, "public-address-and-programme-corroborated-membership-still-blocked");
  assert.equal(audit.sources.length, 4);
  for (const source of audit.sources) assert.match(source.url, /^https:\/\//u);
  for (const input of Object.values(audit.inputs)) assert.equal(await sha(input.path), input.sha256, input.path);
  assert.equal(audit.scope.xiaohongshuAccessed, false);
  assert.equal(audit.scope.browserAccessed, false);
  assert.equal(audit.scope.recoveryStageRerun, false);
  assert.equal(audit.blockerDecision.formalMembership, "unchanged-blocked");
  assert.equal(audit.blockerDecision.heroAndIdentity, "unchanged-blocked");
});
test("orchestra 公开地址不能冒充候选 footprint 成员表", async () => {
  const audit = await json(path);
  const prior = await json(audit.inputs.membershipRescue.path);
  assert.equal(prior.verdict.formalMembershipPromotable, false);
  assert.equal(prior.verdict.formalMapAcceptancePromotable, false);
  assert.deepEqual(audit.unknown, ["Which OSM ways bind to Buildings 6, 7, 8 and retained volumes.", "Formal compound boundary and adjacent-membership scope."]);
  assert.equal(audit.minimumEvidence.length, 2);
});
