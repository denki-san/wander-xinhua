import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  BUILDING_MASSING_QA_CANDIDATES,
  resolveBuildingMassingQa,
} from "../app/scene/building-massing-qa-contract.mjs";

test("Massing 候选 QA 只允许18栋内已登记的建筑和精确档位", () => {
  assert.deepEqual(Object.keys(BUILDING_MASSING_QA_CANDIDATES), [
    "xinhua-villas-211",
    "villa-le-bec",
    "xinhua-villas-329",
    "hudec-memorial",
    "xinhua-community-center",
    "xinhua-pocket-park",
    "fics-xinhua-365",
    "shanghai-orchestra",
  ]);
  assert.equal(resolveBuildingMassingQa("?qaModelId=plane-tree&qaModelTier=massing"), null);
  assert.equal(resolveBuildingMassingQa("?qaModelId=villa-le-bec&qaModelTier=hero"), null);
  assert.equal(resolveBuildingMassingQa("?qaModelId=villa-le-bec"), null);
  assert.equal(
    resolveBuildingMassingQa(
      "?qaModelId=xinhua-villas-211&qaModelTier=massing",
    )?.localObstacles.length,
    9,
  );
  assert.deepEqual(
    resolveBuildingMassingQa(
      "?qaModelId=xinhua-villas-211&qaModelTier=massing",
    )?.localObstacles[0],
    {
      minX: -14.885911,
      maxX: -6.425579,
      minZ: -16.961667,
      maxZ: -8.932183,
    },
  );
  assert.deepEqual(
    resolveBuildingMassingQa(
      "?qaModelId=xinhua-villas-211&qaModelTier=massing",
    )?.start,
    {
      position: [24.7, 89],
      forward: [0, 1],
    },
  );
  assert.equal(
    resolveBuildingMassingQa(
      "?qaModelId=villa-le-bec&qaModelTier=massing",
    )?.modelPath,
    "/models/tiers/xinhua-road/massing-v2/villa-le-bec-massing.glb"
      + "?v=20260726-massing-593cc399",
  );
  const villaLeBecQa = resolveBuildingMassingQa(
    "?qaModelId=villa-le-bec&qaModelTier=massing",
  );
  assert.equal(villaLeBecQa?.localObstacles.length, 12);
  assert.deepEqual(villaLeBecQa?.placement, {
    position: [-34.1, 88.8],
    yaw: -0.38,
    scale: 0.82,
  });
  assert.equal(
    villaLeBecQa?.mapGate,
    "docs/research/villa-le-bec-map-candidate.json",
  );
  assert.equal(
    resolveBuildingMassingQa(
      "?qaModelId=xinhua-villas-329&qaModelTier=massing",
    )?.modelPath,
    "/models/tiers/xinhua-road/massing-v3/xinhua-villas-329-massing.glb"
      + "?v=20260726-massing-f245efd0",
  );
  const villas329Qa = resolveBuildingMassingQa(
    "?qaModelId=xinhua-villas-329&qaModelTier=massing",
  );
  assert.equal(villas329Qa?.localObstacles.length, 14);
  assert.deepEqual(villas329Qa?.placement, {
    position: [-42.13, 79.48],
    yaw: -0.38,
    scale: 0.62,
  });
  assert.equal(
    villas329Qa?.mapGate,
    "docs/research/xinhua-villas-329-map-candidate.json",
  );
  assert.deepEqual(
    resolveBuildingMassingQa(
      "?qaModelId=hudec-memorial&qaModelTier=massing",
    )?.placement,
    {
      position: [92.535374, -132.52181],
      yaw: 0.153486288,
      scale: 0.88,
    },
  );
  assert.deepEqual(
    resolveBuildingMassingQa(
      "?qaModelId=hudec-memorial&qaModelTier=massing",
    )?.start,
    {
      position: [92.5, -145],
      forward: [0, 1],
    },
  );
  assert.equal(
    resolveBuildingMassingQa(
      "?qaModelId=hudec-memorial&qaModelTier=massing",
    )?.localObstacles.length,
    7,
  );
  assert.equal(
    resolveBuildingMassingQa(
      "?qaModelId=xinhua-community-center&qaModelTier=massing",
    )?.modelPath,
    "/models/tiers/xinhua-road/massing-v2/"
      + "xinhua-community-center-massing.glb"
      + "?v=20260726-massing-a0609064",
  );
  assert.deepEqual(
    resolveBuildingMassingQa(
      "?qaModelId=xinhua-community-center&qaModelTier=massing",
    )?.placement,
    {
      position: [-74.78057782060566, 112.5501903703319],
      yaw: 1.1800125527954972,
      scale: 1,
    },
  );
  assert.deepEqual(
    resolveBuildingMassingQa(
      "?qaModelId=xinhua-community-center&qaModelTier=massing",
    )?.start,
    {
      position: [-66.401198105, 115.83439432],
      forward: [-0.9310421906207795, -0.3649115499460933],
    },
  );
  assert.deepEqual(
    resolveBuildingMassingQa(
      "?qaModelId=xinhua-community-center&qaModelTier=massing",
    )?.localObstacles[0],
    {
      minX: -6.2328073354853455,
      maxX: 6.3375736373407205,
      minZ: -2.0344502538968166,
      maxZ: 2.6093047586433475,
    },
  );
  assert.deepEqual(
    resolveBuildingMassingQa(
      "?qaModelId=xinhua-pocket-park&qaModelTier=massing",
    )?.placement,
    {
      position: [-57.421934309, 67.06298037],
      yaw: -0.398058989,
      scale: 0.88,
    },
  );
  const pocketParkQa = resolveBuildingMassingQa(
    "?qaModelId=xinhua-pocket-park&qaModelTier=massing",
  );
  assert.equal(pocketParkQa?.collisionMargin, 0);
  assert.equal(pocketParkQa?.localObstacles.length, 308);
  assert.ok(pocketParkQa?.localObstacles.every(
    ({ minZ, maxZ }) => maxZ - minZ <= 0.060001,
  ));
  assert.ok(pocketParkQa?.localObstacles.every(
    ({ maxX, minX }) => maxX <= -0.76 || minX >= 0.76,
  ));
  assert.equal(
    resolveBuildingMassingQa(
      "?qaModelId=fics-xinhua-365&qaModelTier=massing",
    )?.localObstacles.length,
    5,
  );
  assert.equal(
    resolveBuildingMassingQa(
      "?qaModelId=fics-xinhua-365&qaModelTier=massing",
    )?.runtimePromotionAllowed,
    false,
  );
  assert.equal(
    resolveBuildingMassingQa(
      "?qaModelId=shanghai-orchestra&qaModelTier=massing",
    )?.localObstacles.length,
    5,
  );
  assert.equal(
    resolveBuildingMassingQa(
      "?qaModelId=shanghai-orchestra&qaModelTier=massing",
    )?.blocker,
    "formal-membership-evidence",
  );
});

test("公共运行时只在显式 QA 深链替换单栋模型，默认生产入口保持不变", async () => {
  const source = await readFile(
    new URL("../app/scene/xinhua-road-landmarks.tsx", import.meta.url),
    "utf8",
  );
  const worldContractSource = await readFile(
    new URL("../app/scene/xinhua-road-contract.ts", import.meta.url),
    "utf8",
  );
  const worldSource = await readFile(
    new URL("../app/scene/xinhua-world.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /resolveBuildingMassingQa/);
  assert.match(source, /buildingMassingQaActive/);
  assert.match(source, /qaAssetId=\{landmark\.id\}/);
  assert.match(source, /qaTier=\{buildingMassingQaActive\.requestedTier\}/);
  assert.match(source, /xinhuaRoadQaFrameSample/);
  assert.match(source, /sample\.frames < 120/);
  assert.match(source, /boundsProbe\.add\(scene\.clone\(true\)\)/);
  assert.match(source, /bounds\.applyMatrix4\(placementMatrix\)/);
  assert.match(source, /qaWorldX=\{x\}/);
  assert.match(source, /qaWorldYaw=\{yaw\}/);
  assert.match(source, /buildingMassingQaActive\?\.placement\?\.position/);
  assert.match(source, /rotation-y=\{yaw\}/);
  assert.match(source, /scale=\{scale\}/);
  assert.match(worldContractSource, /ACTIVE_BUILDING_MASSING_QA/);
  assert.match(worldContractSource, /collisionPlacement/);
  assert.match(worldContractSource, /qaStart/);
  assert.match(worldSource, /parameters\.get\("qaAutoStart"\) !== "1"/);
  assert.match(worldSource, /parameters\.get\("cameraQa"\) !== "1"/);
  assert.match(worldSource, /parameters\.get\("qaMove"\)/);
  assert.match(worldSource, /parameters\.get\("qaMoveMs"\)/);
  assert.match(worldSource, /parameters\.get\("qaMoveTarget"\)/);
  assert.match(worldSource, /qaMoveTarget\.x - currentPosition\.x/);
  assert.match(worldSource, /root\.dataset\.xinhuaQaMovement/);
});
