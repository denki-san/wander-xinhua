import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { historicalSha256 } from "./helpers/historical-git-fixtures.mjs";

const root = new URL("../", import.meta.url);
const recordPath =
  "docs/research/build-records/tiers/xinhua-road/hero-v2/villa-le-bec-hero-v2.json";
const massingPath =
  "public/models/tiers/xinhua-road/massing-v2/villa-le-bec-massing.glb";
const heroV1Path =
  "public/models/tiers/xinhua-road/hero-v1/villa-le-bec-hero.glb";

async function bytes(path) {
  return readFile(new URL(path, root));
}

async function sha256(path) {
  return createHash("sha256").update(await bytes(path)).digest("hex");
}

async function json(path) {
  return JSON.parse((await bytes(path)).toString("utf8"));
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8").trim());
}

function triangleCount(glb) {
  return glb.meshes.flatMap(({ primitives }) => primitives)
    .reduce((total, primitive) => {
      const accessor = primitive.indices === undefined
        ? glb.accessors[primitive.attributes.POSITION]
        : glb.accessors[primitive.indices];
      return total + accessor.count / 3;
    }, 0);
}

test("Villa Le Bec Hero v2 新路径可追溯且保留冻结 Massing 与 Hero v1", async () => {
  const record = await json(recordPath);
  assert.equal(
    await sha256(massingPath),
    "593cc3995046439d973788108ac00cd6176c3f7c8fce67702e98db01d54b975f",
  );
  assert.equal(
    await sha256(heroV1Path),
    "1374b7a8301345c23736644cfdc9a7ed467efb8371ebcdf72a507217b0015394",
  );
  assert.equal(record.derivedFrom.massingSha256, await sha256(massingPath));
  assert.equal(record.preservedCandidate.sha256, await sha256(heroV1Path));
  assert.equal(
    record.preservedCandidate.state,
    "current-integration-hero-v1-mcp2-fixed-view-fail",
  );
  assert.equal(record.preservedCandidate.overwritten, false);
  assert.equal(
    await sha256(record.qualityContract.brief),
    record.qualityContract.briefSha256,
  );
  assert.equal(
    await sha256(record.qualityContract.blockedV1Adjudication),
    record.qualityContract.blockedV1AdjudicationSha256,
  );
  const currentV1Record = await json(record.qualityContract.currentHeroV1BuildRecord);
  assert.equal(
    await sha256(record.qualityContract.currentHeroV1BuildRecord),
    record.qualityContract.currentHeroV1BuildRecordSha256,
  );
  assert.equal(currentV1Record.outputs.glbSha256, await sha256(heroV1Path));
  assert.equal(
    currentV1Record.gates.mcp2,
    "fail-main-window-fixed-view-identity-mismatch",
  );
  assert.deepEqual(record.historicalLineage, [
    {
      role: "blocked-hero-v1-used-by-original-hero-v2-build",
      baselineCommit: "dcd619e04fc735e8b0a4b9b01cac7ca78a749ecb",
      pathAtCommit: heroV1Path,
      sha256: "56cb58a3d9f0d24a1f35d3edd610de871fb01f135253043022bef2cbadf46dad",
      currentWorkingTreeBinary: false,
      preservedInGitHistory: true,
    },
  ]);
  assert.equal(
    historicalSha256(
      record.historicalLineage[0].baselineCommit,
      record.historicalLineage[0].pathAtCommit,
    ),
    record.historicalLineage[0].sha256,
  );
  assert.equal(
    record.reproducibilityRepair.priorHeroV2GlbSha256,
    "a6ebf4a362a1d759bf818f62595c75ffa240b06461bc1479f13f6626a845b35d",
  );
  assert.equal(
    record.reproducibilityRepair.rebuiltHeroV2GlbSha256,
    record.outputs.glbSha256,
  );
  assert.deepEqual(record.reproducibilityRepair.fixedViewPixelComparison, {
    method: "PIL-RGB-ImageChops-difference-bbox",
    canonical: "pass-pixel-identical",
    sideDepth: "pass-pixel-identical",
    entrance: "pass-pixel-identical",
    triptych: "pass-pixel-identical",
  });
  assert.deepEqual(record.derivedFrom.placement, {
    position: [-34.1, 88.8],
    yaw: -0.38,
    scale: 0.82,
    movementAuthorized: false,
  });
});

test("Villa Le Bec Hero v2 GLB 符合预算、无图片并记录修复语义", async () => {
  const record = await json(recordPath);
  const glbBuffer = await bytes(record.outputs.glb);
  const glb = parseGlb(glbBuffer);
  const triangles = triangleCount(glb);

  assert.equal(await sha256(record.generator), record.generatorSha256);
  assert.equal(await sha256(record.outputs.blend), record.outputs.blendSha256);
  assert.equal(await sha256(record.outputs.glb), record.outputs.glbSha256);
  assert.equal(glbBuffer.length, record.outputs.bytes);
  assert.equal(triangles, record.outputs.metrics.triangles);
  assert.ok((glb.nodes?.length ?? 0) <= record.budget.maxNodes);
  assert.ok(triangles <= record.budget.maxTriangles);
  assert.ok((glb.materials?.length ?? 0) <= record.budget.maxMaterials);
  assert.equal(glb.images?.length ?? 0, 0);
  assert.equal(glb.textures?.length ?? 0, 0);
  assert.ok(glbBuffer.length <= record.budget.maxBytes);
  assert.equal(glb.nodes[0].extras.stable_asset_id, "villa-le-bec");
  assert.equal(glb.nodes[0].extras.candidate_version, "hero-v2");
  assert.equal(
    glb.nodes[0].extras.supersedes_preserved_hero_v1_sha256,
    "1374b7a8301345c23736644cfdc9a7ed467efb8371ebcdf72a507217b0015394",
  );
  assert.equal(
    glb.nodes[0].extras.historical_blocked_hero_v1_sha256,
    "56cb58a3d9f0d24a1f35d3edd610de871fb01f135253043022bef2cbadf46dad",
  );
  assert.equal(
    glb.nodes[0].extras.derived_from_massing_sha256,
    record.derivedFrom.massingSha256,
  );
  assert.match(glb.nodes[0].extras.visual_repairs, /street-two-storey-storefront/);
  assert.match(glb.nodes[0].extras.visual_repairs, /garden-front-door-upper-window/);
  assert.match(glb.nodes[0].extras.visual_repairs, /windowed-gable-dormers/);
});

test("Villa Le Bec Hero v2 只使用 01/02/11 并保留开放庭院合同", async () => {
  const record = await json(recordPath);
  assert.deepEqual(
    record.references.map(({ path }) => path.match(/_(01|02|11)\.jpg$/)?.[1]),
    ["01", "02", "11"],
  );
  for (const reference of record.references) {
    assert.equal(await sha256(reference.path), reference.sha256);
    assert.equal(reference.runtimeEmbedding, false);
  }
  assert.equal(record.scope.twoBuildingsOnly, true);
  assert.deepEqual(record.collisionContract.solidWays, [864493176, 864493175]);
  assert.equal(record.collisionContract.sameAsAcceptedMassing, true);
  assert.equal(record.collisionContract.openCourtyard, true);
  assert.equal(record.collisionContract.minimumMassingWallGapSceneUnits, 1.399383);
  for (const forbidden of [
    "trees",
    "decorations",
    "street-furniture",
    "brand-text",
    "temporary-soft-furnishing",
  ]) {
    assert.ok(record.scope.excluded.includes(forbidden), forbidden);
  }
});

test("Villa Le Bec Hero v2 三机位与 triptych 均锁定，MCP2 只授权当前 v2 SHA", async () => {
  const record = await json(recordPath);
  assert.deepEqual(record.outputs.previews.map(({ view }) => view), [
    "canonical",
    "side-depth",
    "entrance",
    "triptych",
  ]);
  for (const preview of record.outputs.previews) {
    assert.equal(await sha256(preview.path), preview.sha256, preview.path);
  }
  assert.equal(record.gates.headlessCanonicalSideEntrance, "pass");
  assert.equal(record.gates.mcp2, "pass-main-window-blender-mcp-current-v2-sha");
  assert.equal(record.gates.identity, "authorized-from-current-hero-v2-sha-only");
  assert.equal(record.gates.runtime, "pass-main-window-three-tier-production");
});
