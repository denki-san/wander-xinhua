import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const audit = JSON.parse(fs.readFileSync(
  path.join(ROOT, "docs/research/fics-xinhua-365-recovery-map-audit.json"),
  "utf8",
));
const sha256 = (relativePath) => crypto
  .createHash("sha256")
  .update(fs.readFileSync(path.join(ROOT, relativePath)))
  .digest("hex");

test("FICS 仅续接 Recovery 合格 Massing，不伪造地图通过", () => {
  assert.equal(audit.scope.assetCount, 1);
  assert.equal(audit.assetId, "fics-xinhua-365");
  assert.equal(audit.gates.massingRecovery, "pass-retained");
  assert.equal(audit.gates.massingMapAcceptance, "blocked");
  assert.equal(audit.gates.identity, "missing-blocked");
  assert.equal(audit.decision.movement, "reject-arbitrary-shift-or-scale");
  assert.deepEqual(audit.scope.excluded, [
    "trees",
    "decorations",
    "ordinary-osm-massing",
    "full-map-assets",
  ]);
});

test("FICS Recovery 二进制和记录指纹保持一致", () => {
  const { glb, blend, buildRecord } = audit.recoverySelection;
  const record = JSON.parse(fs.readFileSync(
    path.join(ROOT, buildRecord.path),
    "utf8",
  ));
  assert.equal(sha256(glb.path), glb.sha256);
  assert.equal(sha256(blend.path), blend.sha256);
  assert.equal(
    blend.originalRecoverySha256,
    "b6ac48bac72d534ed131aebefe9f3608d54ba049b9fa0e1d5bc29720cbb95749",
  );
  assert.equal(blend.hygieneCleanup.removedObject, "test-preview-ground");
  assert.equal(blend.hygieneCleanup.buildingGeometryChanged, false);
  assert.equal(blend.hygieneCleanup.glbRebuilt, false);
  assert.equal(record.glb.sha256, glb.sha256);
  assert.equal(glb.images, 0);
  assert.equal(glb.nodes, 5);
  assert.equal(glb.triangles, 68);
});

test("FICS OSM 回投影通过，但 service road 冲突保持 blocker", () => {
  const { mapCalibration } = audit;
  assert.ok(mapCalibration.authoredToRawOsmRoundTrip.maxMeters < 0.001);
  assert.ok(mapCalibration.roads.xinhuaRoad.asphaltClearanceMeters > 0);
  assert.ok(mapCalibration.roads.campusServiceRoad.asphaltClearanceMeters < 0);
  assert.equal(mapCalibration.clearances.runtimeLandmarkOverlap, false);
});
