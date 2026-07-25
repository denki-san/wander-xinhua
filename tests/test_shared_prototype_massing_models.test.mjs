import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function readGlb(path) {
  const buffer = await readFile(new URL(path, root));
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  const jsonLength = buffer.readUInt32LE(12);
  assert.equal(buffer.readUInt32LE(16), 0x4e4f534a);
  return {
    buffer,
    json: JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength)),
  };
}

function triangleCount(gltf) {
  return (gltf.meshes ?? []).reduce(
    (meshTotal, mesh) => meshTotal + mesh.primitives.reduce(
      (primitiveTotal, primitive) => {
        const accessor = primitive.indices
          ?? primitive.attributes.POSITION;
        return primitiveTotal + gltf.accessors[accessor].count / 3;
      },
      0,
    ),
    0,
  );
}

test("5 个植被和 7 个街具原型都有独立 Massing 生产资产", async () => {
  const [manifest, registry] = await Promise.all([
    readJson("docs/research/shared-prototypes-massing-manifest.json"),
    readJson("docs/research/all-models-production-registry.json"),
  ]);
  assert.equal(manifest.prototypeCount, 12);
  assert.equal(manifest.familyCounts.vegetation, 5);
  assert.equal(manifest.familyCounts.streetFurniture, 7);
  assert.equal(manifest.assets.length, 12);
  assert.equal(
    new Set(manifest.assets.map(({ assetId }) => assetId)).size,
    12,
  );
  assert.deepEqual(
    manifest.assets
      .filter(({ family }) => family === "vegetation")
      .map(({ assetId }) => assetId)
      .sort(),
    registry.vegetationPrototypes.map(({ id }) => id).sort(),
  );
  assert.deepEqual(
    manifest.assets
      .filter(({ family }) => family === "street-furniture")
      .map(({ assetId }) => assetId)
      .sort(),
    [...registry.streetFurniturePrototypes].sort(),
  );
  assert.equal(
    manifest.runtimeGate,
    "formal-massing-pass",
  );
  assert.equal(manifest.identityAllowed, false);
});

test("12 个共享原型 Massing 的 Blend、GLB、双视角和 build record 可追溯", async () => {
  const [manifest, qa] = await Promise.all([
    readJson("docs/research/shared-prototypes-massing-manifest.json"),
    readJson("docs/research/shared-prototypes-massing-runtime-qa.json"),
  ]);
  const qaIdentityAllowedAssets = new Set(
    qa.independentReview.identityAllowedAssetIds,
  );
  let bytes = 0;
  let triangles = 0;
  for (const asset of manifest.assets) {
    bytes += asset.glb.bytes;
    triangles += asset.glb.triangles;
    await Promise.all([
      access(new URL(asset.outputs.blend, root)),
      access(new URL(asset.outputs.previews.canonical, root)),
      access(new URL(asset.outputs.previews.side, root)),
    ]);
    const recordPath = (
      `docs/research/build-records/tiers/shared-prototypes/massing/`
      + `${asset.slug}-massing.json`
    );
    const [record, glb] = await Promise.all([
      readJson(recordPath),
      readGlb(asset.outputs.glb),
    ]);
    assert.equal(record.assetId, asset.assetId);
    assert.equal(record.tier, "massing");
    assert.equal(
      record.status,
      "formal-massing-pass",
    );
    assert.equal(record.outputs.glb, asset.outputs.glb);
    assert.equal(
      record.glb.sha256,
      createHash("sha256").update(glb.buffer).digest("hex"),
    );
    assert.equal(record.glb.bytes, glb.buffer.length);
    assert.equal(record.glb.nodes, 1);
    assert.equal(record.glb.meshes, 1);
    assert.equal(record.glb.materials, 1);
    assert.equal(record.glb.images, 0);
    assert.equal(record.glb.textures, 0);
    assert.equal(record.glb.triangles, triangleCount(glb.json));
    assert.ok(record.glb.bytes < 80_000);
    assert.ok(record.glb.triangles < 500);
    assert.equal(record.glb.transformedNodes.length, 0);
    assert.equal(glb.json.nodes[0].extras?.asset_id, asset.assetId);
    assert.equal(glb.json.nodes[0].extras?.tier, "massing");
    assert.equal(glb.json.nodes[0].extras?.identity_allowed, false);
    assert.equal(
      record.identityAllowed,
      qaIdentityAllowedAssets.has(asset.assetId),
    );
  }
  assert.equal(bytes, manifest.totalGlbBytes);
  assert.equal(triangles, manifest.totalTriangles);
  assert.equal(bytes, 100_328);
  assert.equal(triangles, 1_038);
  await Promise.all([
    access(
      new URL(
        "test_artifacts/all-models/massing/shared-prototypes/test_shared-prototypes-massing-canonical-contact-sheet.png",
        root,
      ),
    ),
    access(
      new URL(
        "test_artifacts/all-models/massing/shared-prototypes/test_shared-prototypes-massing-side-contact-sheet.png",
        root,
      ),
    ),
    access(
      new URL(
        "test_artifacts/all-models/massing/shared-prototypes/test_shared-prototypes-massing-threejs-vegetation.png",
        root,
      ),
    ),
    access(
      new URL(
        "test_artifacts/all-models/massing/shared-prototypes/test_shared-prototypes-massing-threejs-street-furniture.png",
        root,
      ),
    ),
  ]);
});

test("共享原型 Three.js gallery 与独立审查通过，并按逐资产边界放行 Identity", async () => {
  const [manifest, qa, sceneSource, experienceSource] = await Promise.all([
    readJson("docs/research/shared-prototypes-massing-manifest.json"),
    readJson("docs/research/shared-prototypes-massing-runtime-qa.json"),
    readFile(
      new URL("app/scene/shared-prototype-massing.tsx", root),
      "utf8",
    ),
    readFile(new URL("app/xinhua-experience.tsx", root), "utf8"),
  ]);
  assert.equal(manifest.runtimeQa, "docs/research/shared-prototypes-massing-runtime-qa.json");
  assert.equal(qa.networkEvidence.requests, 12);
  assert.equal(qa.networkEvidence.responses, 12);
  assert.equal(qa.networkEvidence.failures, 0);
  assert.equal(qa.networkEvidence.httpStatus["200"], 12);
  assert.equal(qa.runtime.canvasCount, 1);
  assert.equal(qa.runtime.stage, "playable");
  assert.equal(qa.runtime.groupEvidence.vegetation.labelCount, 6);
  assert.equal(qa.runtime.groupEvidence.streetFurniture.labelCount, 8);
  assert.equal(qa.visualReview.prototypeCountVisible.vegetation, 5);
  assert.equal(qa.visualReview.prototypeCountVisible.streetFurniture, 7);
  assert.equal(qa.visualReview.displayScaleUnmodified, true);
  assert.equal(qa.independentReview.status, "pass");
  assert.equal(qa.independentReview.formalMassingPassCount, 12);
  assert.equal(qa.independentReview.identityAllowedAssetIds.length, 8);
  assert.equal(
    qa.independentReview.identityBlockedSpeciesUnknownAssetIds.length,
    4,
  );
  assert.equal(qa.formalGate.overall, "pass");
  assert.equal(qa.formalGate.identityPolicy, "per-asset");
  assert.equal(
    (sceneSource.match(/id: "[a-z0-9-]+", family:/g) ?? []).length,
    12,
  );
  assert.match(sceneSource, /displayScale: 1/);
  assert.match(sceneSource, /authoredMetersPerSceneUnit: 2\.7/);
  assert.match(sceneSource, /personHeightMeters: 1\.75/);
  assert.match(sceneSource, /authoredFrontBlender: "-Y"/);
  assert.match(sceneSource, /exportedFrontThree: "\+Z"/);
  assert.doesNotMatch(
    sceneSource,
    /<primitive object=\{model\} scale=\{\[1, 1, -1\]\}/,
  );
  assert.match(experienceSource, /qaSharedPrototypeTier/);
  assert.match(experienceSource, /qaSharedPrototypeGroup/);
  assert.match(experienceSource, /xinhuaSharedPrototypeTier/);
  assert.match(experienceSource, /xinhuaSharedPrototypeGroup/);
});
