import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const json = async (p) => JSON.parse(await readFile(new URL(p, root), "utf8"));

test("community-center service road tags do not authorize a narrower rendering width", async () => {
  const [map, raw, gate, runtime] = await Promise.all([
    json("app/scene/xinhua-map-data.json"),
    json("docs/research/data/xinhua-roads-osm-20260716-080509.json"),
    json("docs/research/xinhua-community-center-massing-map-gate.json"),
    json("docs/research/xinhua-community-center-threejs-runtime-qa.json"),
  ]);
  const road = map.roads.find(({ osmWayId }) => osmWayId === 577252269);
  const rawWay = raw.elements.find(({ type, id }) => type === "way" && id === 577252269);
  assert.equal(road.highway, "service");
  assert.equal(road.name, "新华路345弄");
  assert.equal(road.lanes, null);
  assert.deepEqual(rawWay.tags, { highway: "service", name: "新华路345弄", oneway: "no" });
  assert.equal(Object.hasOwn(rawWay.tags, "width"), false);
  assert.equal(gate.runtimeRoadSurfaceDecision.renderedWidthSceneUnits, 2.5);
  assert.equal(runtime.map.road.renderedWidthSceneUnits, 2.5);
});

test("community-center overlap produces only a geometric upper bound, not a deployable candidate", async () => {
  const [gate, runtime] = await Promise.all([
    json("docs/research/xinhua-community-center-massing-map-gate.json"),
    json("docs/research/xinhua-community-center-threejs-runtime-qa.json"),
  ]);
  const road = gate.runtimeRoadSurfaceDecision;
  const zeroOverlapWidthUpperBound = road.buildingBoundaryToCenterlineSceneUnits * 2;
  assert.equal(road.asphaltEdgeClearanceSceneUnits, -0.4026350726882021);
  assert.ok(zeroOverlapWidthUpperBound < road.renderedWidthSceneUnits);
  assert.ok(Math.abs(zeroOverlapWidthUpperBound - 1.6947298546235958) < 1e-12);
  assert.equal(road.result, "blocked-building-overlaps-rendered-service-road");
  assert.equal(runtime.map.formalAcceptance, "blocked-road-surface-overlap");
  assert.equal(runtime.collisionReplay.penetrationObserved, false);
  assert.equal(runtime.completionBoundary.productionRegistryPromotionAuthorized, false);
});
