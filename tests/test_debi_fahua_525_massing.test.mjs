import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(
    buffer.toString("utf8", 20, 20 + jsonLength).trim(),
  );
}

const [binding, record, brief, generator, glbBuffer] = await Promise.all([
  readFile(
    new URL("docs/research/debi-fahua-525-member-binding.json", ROOT),
    "utf8",
  ).then(JSON.parse),
  readFile(
    new URL(
      "docs/research/build-records/tiers/xinhua-road/massing-v3/debi-fahua-525-massing.json",
      ROOT,
    ),
    "utf8",
  ).then(JSON.parse),
  readFile(
    new URL("docs/research/debi-fahua-525-model-brief-v2.md", ROOT),
    "utf8",
  ),
  readFile(
    new URL("scripts/create_debi_fahua_525_massing_model.py", ROOT),
    "utf8",
  ),
  readFile(
    new URL(
      "public/models/tiers/xinhua-road/massing-v3/debi-fahua-525-massing.glb",
      ROOT,
    ),
  ),
]);
const glb = parseGlb(glbBuffer);

test("德必法华525只保留可追溯代表 way，Recovery 校区污染成员全部排除", () => {
  assert.deepEqual(binding.scope.includedWayIds, [864847922]);
  assert.equal(
    binding.representativeMember.bindingStatus,
    "bound-medium-secondary-map-corroborated",
  );
  assert.deepEqual(
    binding.rejectedRecoveryCandidates.map(({ sourceWayId }) => sourceWayId),
    [864847921, 864847920, 228966550, 864847917, 228966551],
  );
  assert.equal(
    binding.rejectedRecoveryCandidates.find(
      ({ sourceWayId }) => sourceWayId === 228966550,
    ).osmName,
    "1号楼",
  );
  assert.equal(
    binding.rejectedRecoveryCandidates.find(
      ({ sourceWayId }) => sourceWayId === 228966551,
    ).osmName,
    "2号楼",
  );
});

test("逐顶点地图回投精确，但法华镇路重叠必须保持 blocked", () => {
  assert.equal(binding.projectionValidation.maximumErrorSceneUnits, 0);
  assert.equal(binding.projectionValidation.status, "pass");
  assert.ok(
    binding.roadClearance.fahuazhenRoad.asphaltClearanceSceneUnits < 0,
  );
  assert.equal(
    binding.roadClearance.fahuazhenRoad.asphaltClearanceSceneUnits,
    -0.633229,
  );
  assert.ok(
    binding.roadClearance.dingxiRoad.asphaltClearanceSceneUnits > 0,
  );
  assert.equal(
    binding.gateDecision.formalMapAcceptance,
    "blocked-road-overlap-and-primary-membership-proof",
  );
  assert.equal(binding.gateDecision.runtimePromotion, false);
});

test("代表建筑与最近邻留有碰撞净距，庭院不使用场地大碰撞", () => {
  assert.equal(binding.neighborCollision.nearestWayId, 864847918);
  assert.ok(
    binding.neighborCollision.gapAfterBothMarginsSceneUnits > 2,
  );
  assert.equal(
    binding.scope.openCourtyardPolicy,
    "negative-space-only-no-site-slab-no-courtyard-collision",
  );
  assert.match(generator, /open_courtyard/);
  assert.match(brief, /no site slab/i);
});

test("Massing v3 二进制遵守预算并与 build record 指纹一致", () => {
  const sha256 = createHash("sha256").update(glbBuffer).digest("hex");
  assert.equal(sha256, record.glb.sha256);
  assert.equal(glbBuffer.byteLength, record.glb.bytes);
  assert.equal(glb.nodes.length, 1);
  assert.equal(glb.meshes.length, 1);
  assert.equal(glb.materials.length, 1);
  assert.equal(glb.images, undefined);
  assert.equal(glb.textures, undefined);
  assert.equal(record.glb.triangles, 40);
  assert.deepEqual(record.glb.transformedNodes, []);
  assert.equal(record.reproducibility.matchesPrevious, true);
  assert.equal(record.gates.mcp1, "pending-main-window-batch-review");
  assert.match(record.gates.formalMapAcceptance, /^blocked-/);
  assert.equal(record.gates.runtimePromotion, false);
});
