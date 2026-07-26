import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import test from "node:test";

const root = new URL("../", import.meta.url);
const run = promisify(execFile);
const dispositionPath = "docs/research/villa-le-bec-three-tier-final-disposition.json";

async function json(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

async function gitBlobSha(commit, relativePath) {
  const { stdout } = await run("git", ["show", `${commit}:${relativePath}`], {
    cwd: new URL("../", import.meta.url),
    encoding: "buffer",
  });
  return createHash("sha256").update(stdout).digest("hex");
}

test("Villa Le Bec 区分当前工作树与不可篡改的主窗口验收提交", async () => {
  const disposition = await json(dispositionPath);
  const { currentWorktree, historicalMainWindowFacts } = disposition;

  assert.equal(currentWorktree.integrationCommitIsAncestor, false);
  assert.equal(currentWorktree.candidateCommitIsAncestor, false);
  assert.equal(currentWorktree.historicalIntegrationFilesPresent, false);
  assert.equal(
    await gitBlobSha(
      historicalMainWindowFacts.mapCandidate.commit,
      historicalMainWindowFacts.mapCandidate.path,
    ),
    historicalMainWindowFacts.mapCandidate.contentSha256,
  );
  assert.equal(
    await gitBlobSha(
      historicalMainWindowFacts.integrationRuntimeQa.commit,
      historicalMainWindowFacts.integrationRuntimeQa.path,
    ),
    historicalMainWindowFacts.integrationRuntimeQa.contentSha256,
  );
  assert.equal(
    historicalMainWindowFacts.integrationRuntimeQa.formalMassingAcceptance,
    "pass",
  );
});

test("Villa Le Bec 当前 SHA 与历史验收 Massing 一致，Hero和Identity仍封锁", async () => {
  const [disposition, record] = await Promise.all([
    json(dispositionPath),
    json("docs/research/build-records/tiers/xinhua-road/massing-v2/villa-le-bec-massing.json"),
  ]);
  const { massing, legacyHero, identity } = disposition.currentArtifacts;

  assert.equal(await sha256(massing.blend.path), massing.blend.sha256);
  assert.equal(await sha256(massing.glb.path), massing.glb.sha256);
  assert.equal(record.glb.sha256, massing.glb.sha256);
  assert.equal(massing.glb.sha256, "593cc3995046439d973788108ac00cd6176c3f7c8fce67702e98db01d54b975f");
  assert.equal(massing.reuse, "allowed-as-massing-only");
  assert.equal(await sha256(legacyHero.blend.path), legacyHero.blend.sha256);
  assert.equal(await sha256(legacyHero.glb.path), legacyHero.glb.sha256);
  assert.equal(legacyHero.reuse, "prohibited-as-mcp2-source");
  assert.ok(legacyHero.strictlyInvalidBecause.some((item) => item.includes("outside-scope")));
  assert.equal(identity.artifactPresent, false);
  assert.equal(identity.massingMasqueradeProhibited, true);
  assert.equal(disposition.verdict.buildingComplete, false);
});
