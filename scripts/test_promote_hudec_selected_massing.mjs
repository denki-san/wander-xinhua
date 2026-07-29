import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const formalPath = path.join(
  rootDir,
  "building-engine/cases/hudec-memorial/building-dsl.json",
);
const selectedPath = path.join(
  rootDir,
  "test_artifacts/building-engine-spike/hudec-memorial/topology-candidates/test-hudec-topology-a-tall-roof-chimneys-dsl.json",
);

const formal = JSON.parse(fs.readFileSync(formalPath, "utf8"));
const selected = JSON.parse(fs.readFileSync(selectedPath, "utf8"));

formal.massing = structuredClone(selected.massing);
formal.collision = structuredClone(selected.collision);
formal.runtime = structuredClone(selected.runtime);

fs.writeFileSync(formalPath, `${JSON.stringify(formal, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      formalPath: path.relative(rootDir, formalPath),
      selectedPath: path.relative(rootDir, selectedPath),
      assetIdPreserved: formal.assetId,
      volumeCount: formal.massing.volumes.length,
      roofCount: formal.massing.roofs.length,
      obstacleCount: formal.collision.obstacles.length,
      cameraNames: Object.keys(formal.runtime.cameras),
    },
    null,
    2,
  ),
);
