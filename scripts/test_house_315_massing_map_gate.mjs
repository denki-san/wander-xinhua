import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";


const ROOT = resolve(import.meta.dirname, "..");
const QA_PATH = resolve(ROOT, "docs/research/house-315-massing-map-qa.json");
const REGISTRY_PATH = resolve(ROOT, "app/scene/xinhua-road-landmarks-data.json");


async function sha256(path) {
  const contents = await readFile(path);
  return createHash("sha256").update(contents).digest("hex");
}


const qa = JSON.parse(await readFile(QA_PATH, "utf8"));
const registry = JSON.parse(await readFile(REGISTRY_PATH, "utf8"));
const currentHouse = registry.landmarks.find(({ id }) => id === "house-315");

assert(currentHouse, "共享 registry 中缺少 house-315");
assert.equal(qa.assetId, "house-315");
assert.equal(qa.mapAcceptance, "formal-pass");
assert.equal(qa.heroIdentityAuthorized, false);

assert.deepEqual(
  currentHouse.position,
  qa.temporaryQaAssembly.frozenPlacement.position,
  "共享 registry 的 position 不应被建筑 Worktree 修改",
);
assert.equal(
  currentHouse.yaw,
  qa.temporaryQaAssembly.frozenPlacement.yaw,
  "共享 registry 的 yaw 不应被建筑 Worktree 修改",
);
assert.equal(
  currentHouse.scale,
  qa.temporaryQaAssembly.frozenPlacement.scale,
  "共享 registry 的 scale 不应被建筑 Worktree 修改",
);
assert.equal(
  currentHouse.model,
  "/models/xinhua-road/house-315.glb",
  "地图门结束后共享 registry 应恢复旧 model 路径",
);
assert.equal(
  await sha256(REGISTRY_PATH),
  qa.temporaryQaAssembly.sourceRegistryRestoredSha256,
  "共享 registry 未逐字节恢复",
);

const recommendation = qa.integrationRecommendation;
assert.equal(
  await sha256(resolve(ROOT, recommendation.modelSourcePath)),
  recommendation.modelSha256,
  "Massing GLB SHA 与集成建议不一致",
);
assert.deepEqual(
  recommendation.position,
  qa.temporaryQaAssembly.frozenPlacement.position,
);
assert.equal(
  recommendation.yaw,
  qa.temporaryQaAssembly.frozenPlacement.yaw,
);
assert.equal(
  recommendation.scale,
  qa.temporaryQaAssembly.frozenPlacement.scale,
);

for (const obstacle of recommendation.localObstacles) {
  assert(
    obstacle.minX >= recommendation.localBounds.minX
      && obstacle.maxX <= recommendation.localBounds.maxX
      && obstacle.minZ >= recommendation.localBounds.minZ
      && obstacle.maxZ <= recommendation.localBounds.maxZ,
    `碰撞盒超出 localBounds：${JSON.stringify(obstacle)}`,
  );
}

for (const evidence of [
  ...Object.values(qa.screenshots),
  qa.har,
]) {
  const path = resolve(ROOT, evidence.path);
  assert.equal(await sha256(path), evidence.sha256, `${evidence.path} SHA 不一致`);
}

console.log(JSON.stringify({
  assetId: qa.assetId,
  mapAcceptance: qa.mapAcceptance,
  registryRestoredSha256: qa.temporaryQaAssembly.sourceRegistryRestoredSha256,
  modelSha256: recommendation.modelSha256,
  screenshots: Object.keys(qa.screenshots).length,
  collisionBoxes: recommendation.localObstacles.length,
  status: "ok",
}, null, 2));
