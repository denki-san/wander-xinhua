import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  BUILDING_MASSING_QA_CANDIDATES,
  resolveBuildingMassingQa,
} from "../app/scene/building-massing-qa-contract.mjs";

test("Massing 候选 QA 只允许18栋内已登记的建筑和精确档位", () => {
  assert.deepEqual(Object.keys(BUILDING_MASSING_QA_CANDIDATES), [
    "villa-le-bec",
    "xinhua-villas-329",
    "hudec-memorial",
  ]);
  assert.equal(resolveBuildingMassingQa("?qaModelId=plane-tree&qaModelTier=massing"), null);
  assert.equal(resolveBuildingMassingQa("?qaModelId=villa-le-bec&qaModelTier=hero"), null);
  assert.equal(resolveBuildingMassingQa("?qaModelId=villa-le-bec"), null);
  assert.equal(
    resolveBuildingMassingQa(
      "?qaModelId=villa-le-bec&qaModelTier=massing",
    )?.modelPath,
    "/models/tiers/xinhua-road/massing-v2/villa-le-bec-massing.glb"
      + "?v=20260726-massing-593cc399",
  );
  assert.equal(
    resolveBuildingMassingQa(
      "?qaModelId=xinhua-villas-329&qaModelTier=massing",
    )?.modelPath,
    "/models/tiers/xinhua-road/massing-v3/xinhua-villas-329-massing.glb"
      + "?v=20260726-massing-f245efd0",
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
  assert.match(source, /resolveBuildingMassingQa/);
  assert.match(source, /buildingMassingQaActive/);
  assert.match(source, /qaAssetId=\{landmark\.id\}/);
  assert.match(source, /qaTier=\{buildingMassingQaActive\.requestedTier\}/);
  assert.match(source, /buildingMassingQaActive\?\.placement\?\.position/);
  assert.match(source, /rotation-y=\{yaw\}/);
  assert.match(source, /scale=\{scale\}/);
  assert.match(worldContractSource, /ACTIVE_BUILDING_MASSING_QA/);
  assert.match(worldContractSource, /collisionPlacement/);
  assert.match(worldContractSource, /qaStart/);
});
