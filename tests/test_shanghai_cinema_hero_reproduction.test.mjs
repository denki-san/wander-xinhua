import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath =
  "docs/research/shanghai-cinema-hero-reproduction-audit.json";
const buildRecordPath =
  "docs/research/build-records/shanghai-cinema-hero-reproduction.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

function functionBlock(source, name, nextName) {
  const start = source.indexOf(`def ${name}() -> None:\n`);
  const end = source.indexOf(`def ${nextName}() -> None:\n`, start);
  assert.ok(start >= 0 && end > start);
  return source.slice(start, end);
}

test("上海影城真实历史生成器来源与本栋 frozen 包装可追溯", async () => {
  const [audit, record, generator] = await Promise.all([
    readJson(auditPath),
    readJson(buildRecordPath),
    readFile(new URL(
      "scripts/create_shanghai_cinema_frozen_hero.py",
      root,
    ), "utf8"),
  ]);
  assert.equal(
    audit.sourceRecovery.recordedGeneratorSha256,
    "6ea5fc19f98f6339d83063bafea9c0edd66ca07d2bb171be08f61d63fed3488d",
  );
  assert.equal(
    audit.sourceRecovery.recordedContentCommit,
    "869e92d83ea177cd4babe73d61ed5657e8f15ddd",
  );
  assert.equal(
    await sha256(audit.sourceRecovery.frozenGenerator.path),
    audit.sourceRecovery.frozenGenerator.sha256,
  );
  const blockSha = createHash("sha256")
    .update(functionBlock(
      generator,
      "build_shanghai_cinema",
      "build_film_art_center",
    ))
    .digest("hex");
  assert.equal(
    blockSha,
    audit.sourceRecovery.frozenGenerator.historicalBuildFunctionSha256,
  );
  assert.equal(
    blockSha,
    audit.sourceRecovery.frozenGenerator.currentSharedBuildFunctionSha256,
  );
  assert.equal(record.generator.frozenSharedSourceSha256, "6ea5fc19f98f6339d83063bafea9c0edd66ca07d2bb171be08f61d63fed3488d");
});

test("上海影城 frozen generator 只允许隔离生成本栋", async () => {
  const [audit, generator] = await Promise.all([
    readJson(auditPath),
    readFile(new URL(
      "scripts/create_shanghai_cinema_frozen_hero.py",
      root,
    ), "utf8"),
  ]);
  assert.match(
    generator,
    /test_artifacts\/shanghai-cinema-hero-reproduction\/run/u,
  );
  assert.doesNotMatch(
    generator,
    /OUTPUT_DIR = ROOT \/ "public\/models\/xinhua-road"/u,
  );
  const builders = generator.slice(
    generator.indexOf("BUILDERS:"),
    generator.indexOf("def merge_asset_objects"),
  );
  assert.match(builders, /\("shanghai-cinema", build_shanghai_cinema\)/u);
  assert.doesNotMatch(builders, /plane-tree|film-art-center|one-step-garden/u);
  assert.match(
    generator,
    /本冻结生成器只允许 --asset=shanghai-cinema/u,
  );
  assert.equal(audit.scope.publicHeroModified, false);
  assert.equal(audit.scope.sharedGeneratorModified, false);
  assert.equal(audit.scope.candidateBinariesCommitted, false);
});

test("上海影城 public Hero 保持记录 SHA 与结构", async () => {
  const [audit, record] = await Promise.all([
    readJson(auditPath),
    readJson(buildRecordPath),
  ]);
  const reference = audit.referenceHero;
  assert.equal(await sha256(reference.path), reference.sha256);
  assert.equal(reference.sha256, record.protectedOutput.sha256);
  assert.equal(reference.bytes, record.protectedOutput.bytes);
  assert.equal(record.protectedOutput.modified, false);
  assert.deepEqual(reference.bounds, record.metrics.bounds);
  assert.equal(reference.triangles, record.metrics.triangles);
  assert.equal(reference.materials, record.metrics.materials);
  assert.equal(reference.images, 0);
  assert.equal(reference.textures, 0);
});

test("上海影城双 roundtrip 的可见几何完全一致但 exact SHA 必须 blocked", async () => {
  const [audit, record] = await Promise.all([
    readJson(auditPath),
    readJson(buildRecordPath),
  ]);
  assert.equal(audit.exactComparison.jsonChunk.status, "pass-byte-identical-all-three");
  assert.equal(audit.exactComparison.structure.status, "pass-exact-all-three");
  assert.equal(audit.exactComparison.bounds.status, "pass-exact-all-three");
  assert.equal(audit.exactComparison.materialOrder.status, "pass-exact-all-three");
  assert.deepEqual(
    audit.exactComparison.bounds.deltaReferenceToRunA,
    { min: [0, 0, 0], max: [0, 0, 0] },
  );
  const binary = audit.exactComparison.binary;
  assert.equal(binary.status, "blocked");
  assert.equal(binary.onlySemantic, "TEXCOORD_0");
  assert.deepEqual(binary.nonTexcoordAccessorDifferences, []);
  assert.equal(binary.positionDifferences, 0);
  assert.equal(binary.normalDifferences, 0);
  assert.equal(binary.indexDifferences, 0);
  assert.equal(binary.maximumAbsoluteFloatDelta, 5.960464477539063e-8);
  assert.notEqual(
    audit.controlledRoundtrips[0].glbSha256,
    audit.controlledRoundtrips[1].glbSha256,
  );
  assert.notEqual(
    audit.controlledRoundtrips[0].glbSha256,
    audit.referenceHero.sha256,
  );
  assert.notEqual(
    audit.controlledRoundtrips[1].glbSha256,
    audit.referenceHero.sha256,
  );
  assert.equal(record.gates.structuralEquivalence, "pass");
  assert.equal(record.gates.exactSourceReproduction, "blocked");
  assert.equal(
    audit.verdict.status,
    "blocked-exact-sha-texcoord-float-nondeterminism",
  );
});

test("上海影城审计工具与三张固定机位证据保持精确 SHA", async () => {
  const audit = await readJson(auditPath);
  assert.equal(await sha256(audit.auditTool.path), audit.auditTool.sha256);
  for (const preview of Object.values(audit.fixedViews)) {
    const buffer = await readFile(new URL(preview.path, root));
    assert.equal(buffer.length, preview.bytes);
    assert.equal(
      createHash("sha256").update(buffer).digest("hex"),
      preview.sha256,
    );
    assert.equal(preview.visualReview, "pass");
    assert.ok(buffer.length > 700_000);
  }
  assert.equal(audit.gateDecision.publicHeroReplacementAuthorized, false);
  assert.equal(audit.gateDecision.mapGateChanged, false);
});
