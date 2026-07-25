import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  BUILDING_MASSING_QA_CANDIDATES,
  resolveBuildingMassingQa,
} from "../app/scene/building-massing-qa-contract.mjs";

test("Massing 候选 QA 只允许18栋内已登记的建筑和精确档位", () => {
  assert.deepEqual(Object.keys(BUILDING_MASSING_QA_CANDIDATES), ["villa-le-bec"]);
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
});

test("公共运行时只在显式 QA 深链替换单栋模型，默认生产入口保持不变", async () => {
  const source = await readFile(
    new URL("../app/scene/xinhua-road-landmarks.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /resolveBuildingMassingQa/);
  assert.match(source, /buildingMassingQaActive/);
  assert.match(source, /qaAssetId=\{landmark\.id\}/);
  assert.match(source, /qaTier=\{buildingMassingQaActive\.requestedTier\}/);
});
