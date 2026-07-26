import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath = "docs/research/xinhua-community-center-service-road-gap-audit-2026-07-26.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

function close(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} !== ${expected}`);
}

function inspectGlb(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  const glb = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
  let triangles = 0;
  let primitives = 0;
  for (const mesh of glb.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      primitives += 1;
      const accessor = glb.accessors[
        primitive.indices ?? primitive.attributes.POSITION
      ];
      triangles += accessor.count / 3;
    }
  }
  return {
    nodes: glb.nodes?.length ?? 0,
    meshes: glb.meshes?.length ?? 0,
    primitives,
    triangles,
    materials: glb.materials?.length ?? 0,
    images: glb.images?.length ?? 0,
    textures: glb.textures?.length ?? 0,
  };
}

test("社区中心 gap audit 锁定本栋输入、只读范围与保留阶段", async () => {
  const audit = await readJson(auditPath);
  assert.equal(audit.status, "blocked-service-road-semantics-unresolved");
  for (const input of Object.values(audit.inputs)) {
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  assert.equal(audit.scope.networkAccessed, false);
  assert.equal(audit.scope.browserOrXhsAccessed, false);
  assert.equal(audit.scope.blenderOpened, false);
  assert.equal(audit.scope.qualifiedRecoveryStageRerun, false);
  assert.equal(audit.scope.modelBinaryModified, false);
  assert.equal(audit.scope.publicRegistryModified, false);
  assert.match(audit.acceptedStages.massingV2, /retained unchanged/u);
});

test("社区中心服务道路重叠使用精确 OSM 绑定数值，不能由运行时碰撞掩盖", async () => {
  const audit = await readJson(auditPath);
  const [candidate, runtime] = await Promise.all([
    readJson(audit.inputs.mapCandidate.path),
    readJson(audit.inputs.runtimeQa.path),
  ]);
  const road = audit.frozenGeometry.road;
  assert.equal(audit.frozenGeometry.buildingWayId, 864493234);
  assert.equal(audit.frozenGeometry.roadWayId, 577252269);
  assert.deepEqual(candidate.buildingConstraint.placement, audit.frozenGeometry.placement);
  assert.equal(candidate.buildingConstraint.closestNeighborWayId, audit.frozenGeometry.closestNeighborWayId);
  close(candidate.buildingConstraint.closestNeighborGapSceneUnits, audit.frozenGeometry.closestNeighborGapSceneUnits);
  close(candidate.roadConstraint.physicalFootprintToCenterline.sceneUnits, road.buildingBoundaryToCenterlineSceneUnits);
  close(candidate.roadConstraint.asphaltOverlap.sceneUnits, road.asphaltOverlapSceneUnits);
  close(candidate.roadConstraint.maximumNonOverlappingFullWidth.sceneUnits, road.zeroBufferMaximumFullWidthSceneUnits);
  close(runtime.map.road.asphaltEdgeClearanceSceneUnits, -road.asphaltOverlapSceneUnits);
  assert.equal(runtime.collisionReplay.penetrationObserved, false);
  assert.equal(runtime.map.formalAcceptance, "blocked-road-surface-overlap");
});

test("社区中心没有仓内道路宽度或地表语义授权，最小解锁证据保持明确", async () => {
  const audit = await readJson(auditPath);
  const rescue = await readJson(audit.inputs.localRescue.path);
  assert.equal(audit.authorityReview.repositoryAuthorityToClassifyRoadAsGroundFloorOrPrivatePassage, false);
  assert.equal(audit.authorityReview.repositoryAuthorityToChangeBuildingFootprint, false);
  assert.equal(audit.authorityReview.repositoryAuthorityToNarrowSharedServiceRoad, false);
  assert.deepEqual(rescue.rawRoadEvidence.uniqueTagVariants, [{
    highway: "service",
    name: "新华路345弄",
    oneway: "no",
  }]);
  assert.equal(rescue.localPlanAndPhotoEvidence.authoritativeRoadPlans, 0);
  assert.equal(rescue.formalDisposition.roadContractChangeAuthorized, false);
  assert.ok(audit.prohibitedWithoutNewEvidence.includes("move or scale the building"));
  assert.ok(audit.prohibitedWithoutNewEvidence.includes("narrow or suppress the shared service-road renderer"));
  assert.equal(audit.minimumUnlockEvidence.length, 3);
});

test("社区中心保留的 Massing GLB 仍符合既有结构预算", async () => {
  const audit = await readJson(auditPath);
  const metrics = inspectGlb(await readFile(new URL(audit.inputs.massingGlb.path, root)));
  assert.deepEqual(metrics, {
    nodes: 1,
    meshes: 1,
    primitives: 3,
    triangles: 48,
    materials: 3,
    images: 0,
    textures: 0,
  });
});
