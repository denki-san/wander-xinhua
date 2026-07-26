import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath =
  "docs/research/xingfuli-center-lineage-v2-blender-mcp-gates.json";

async function bytes(relativePath) {
  return readFile(new URL(relativePath, root));
}

async function json(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

test("幸福里中栋 lineage v2 主窗口 Blender MCP 三门与范围锁定", async () => {
  const record = await json(recordPath);
  assert.equal(record.assetId, "xingfuli-center");
  assert.equal(record.status, "pass-main-window-mcp1-mcp2-mcp3");
  assert.equal(record.execution.surface, "Blender MCP");
  assert.equal(record.execution.mainWindowFinalReview, true);
  assert.equal(record.execution.headlessOnly, false);
  assert.equal(record.execution.temporaryReviewHelpersSaved, false);
  assert.equal(record.execution.finalDirtyState, false);
  assert.deepEqual(record.scope.exactBuildingIds, ["xingfuli-center"]);
  assert.equal(record.scope.currentAcceptedTiersOverwritten, false);
  assert.equal(record.scope.candidatePathsOnly, true);
  assert.equal(record.scope.treesDecorationFullMap, "excluded");
  assert.equal(record.scope.recoveryHold, "untouched");
  assert.equal(record.gates.mcp1.status, "pass");
  assert.equal(record.gates.mcp2.status, "pass");
  assert.equal(record.gates.mcp3.status, "pass");
});

test("幸福里中栋 MCP 三档源文件保持原 SHA、clean reopen 与严格递减", async () => {
  const record = await json(recordPath);
  assert.deepEqual(
    record.tiers.map((tier) => tier.blend.meshObjects),
    [177, 115, 57],
  );
  for (const tier of record.tiers) {
    const source = await bytes(tier.blend.path);
    assert.equal(sha256(source), tier.blend.sha256);
    assert.equal(tier.blend.dirtyAfterReopen, false);
  }
  assert.equal(record.tiers[1].lineageMetadata, "pass-exact-hero-parent-sha");
  assert.equal(
    record.tiers[2].lineageMetadata,
    "pass-exact-identity-v2-parent-sha",
  );
  assert.deepEqual(record.tiers[1].blend.bounds, record.tiers[2].blend.bounds);
});

test("幸福里中栋 MCP 九张固定机位图全部匹配最终指纹", async () => {
  const record = await json(recordPath);
  assert.equal(record.screenshots.length, 9);
  assert.deepEqual(
    new Set(record.screenshots.map(({ tier }) => tier)),
    new Set(["hero", "identity-v2", "massing-v2"]),
  );
  for (const tier of ["hero", "identity-v2", "massing-v2"]) {
    assert.deepEqual(
      new Set(
        record.screenshots
          .filter((shot) => shot.tier === tier)
          .map(({ view }) => view),
      ),
      new Set(["canonical", "side", "street"]),
    );
  }
  for (const screenshot of record.screenshots) {
    const image = await bytes(screenshot.path);
    assert.equal(image.length, screenshot.bytes, screenshot.path);
    assert.equal(sha256(image), screenshot.sha256, screenshot.path);
    assert.match(screenshot.path, /^test_artifacts\/all-models\/blender-mcp\//);
  }
  assert.deepEqual(record.fixedViewContract.street.cameraLocation, [
    12.5,
    -28,
    2.2,
  ]);
  assert.deepEqual(record.fixedViewContract.street.target, [12.5, 2, 4.5]);
});
