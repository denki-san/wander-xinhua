import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recovery = "3044cd89f801250afcd477dfbcbc7da358bf4b11";
const json = async (p) => JSON.parse(await readFile(new URL(p, root), "utf8"));
const sha = async (p) => createHash("sha256").update(await readFile(new URL(p, root))).digest("hex");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

test("Xingfuli East 三档和生成器与 Recovery 同 blob，但这不是严格派生证明", async () => {
  const audit = await json("docs/research/xingfuli-east-strict-lineage-reconstruction.json");
  assert.equal(await sha(audit.generator.path), audit.generator.sha256);
  assert.equal(git("rev-parse", `HEAD:${audit.generator.path}`), audit.generator.headAndRecoveryGitBlob);
  assert.equal(git("rev-parse", `${recovery}:${audit.generator.path}`), audit.generator.headAndRecoveryGitBlob);
  for (const tier of Object.values(audit.tiers)) {
    assert.equal(await sha(tier.glb), tier.glbSha256);
    assert.equal(git("rev-parse", `HEAD:${tier.glb}`), tier.gitBlob);
    assert.equal(git("rev-parse", `${recovery}:${tier.glb}`), tier.gitBlob);
    assert.equal(git("rev-parse", `HEAD:${tier.blend}`), git("rev-parse", `${recovery}:${tier.blend}`));
  }
  assert.equal(audit.strictLineage.headEqualsRecoveryForAllAuditedInputs, true);
  assert.equal(audit.strictLineage.proven, false);
});

test("Xingfuli East 缺少 derivedFrom 且时间倒序，保持 lineage/map/start blocker", async () => {
  const audit = await json("docs/research/xingfuli-east-strict-lineage-reconstruction.json");
  assert.ok(Date.parse(audit.tiers.massing.generatedAt) < Date.parse(audit.tiers.identity.generatedAt));
  assert.ok(Date.parse(audit.tiers.identity.generatedAt) < Date.parse(audit.tiers.hero.generatedAt));
  assert.equal(audit.strictLineage.identityDerivedFromFinalHeroSha, "missing");
  assert.equal(audit.strictLineage.massingDerivedFromIdentitySha, "missing");
  assert.ok(audit.strictLineage.forbidden.includes("backfill historical derivedFrom"));
  assert.equal(audit.unrelatedGatesRetained.panyuRoad, "blocked");
  assert.equal(audit.unrelatedGatesRetained.eastStartCamera, "blocked");
});
