import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditPath = "docs/research/fahua-heritage-gap-audit-2026-07-26.json";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
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

test("法华遗韵 gap audit 锁定本栋未重做的前置条件与输入", async () => {
  const audit = await readJson(auditPath);
  assert.equal(audit.status, "blocked-front-only-and-unbound-site");
  for (const input of Object.values(audit.inputs)) {
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  assert.equal(audit.scope.networkAccessed, false);
  assert.equal(audit.scope.browserOrXhsAccessed, false);
  assert.equal(audit.scope.blenderOpened, false);
  assert.equal(audit.scope.qualifiedStageRerun, false);
  assert.equal(audit.scope.binaryRebuilt, false);
  assert.equal(audit.scope.publicRegistryModified, false);
  assert.equal(audit.scope.runtimeDisabled, false);
});

test("法华遗韵只能保留结构基线，不能把 front-only 伪装为三档完成", async () => {
  const audit = await readJson(auditPath);
  const hero = await readFile(new URL(audit.inputs.legacyHeroGlb.path, root));
  assert.deepEqual(inspectGlb(hero), {
    nodes: 1,
    meshes: 1,
    primitives: 7,
    triangles: 28152,
    materials: 7,
    images: 0,
    textures: 0,
  });
  assert.equal(audit.gates.evidenceAndBrief, "blocked-front-only");
  assert.equal(audit.gates.mapAcceptance, "blocked-unbound-site-and-no-walkaround");
  assert.equal(audit.gates.heroMcp2, "not-authorized");
  assert.equal(audit.gates.identity, "blocked-no-accepted-hero-source");
  assert.equal(audit.gates.mcp3, "not-reachable");
  assert.equal(audit.gates.threeTierRuntime, "not-reachable");
  assert.ok(audit.hardBlockers.some((blocker) => blocker.includes("side/depth")));
  assert.ok(audit.hardBlockers.some((blocker) => blocker.includes("site-boundary")));
});

test("法华遗韵把小红书与运行时移除明确留在未执行队列，文件必须保留", async () => {
  const audit = await readJson(auditPath);
  assert.match(audit.unexecutedQueue.nextEvidenceAction, /Xiaohongshu/u);
  assert.match(audit.unexecutedQueue.ifStillInsufficient, /preserve every existing file/u);
  assert.deepEqual(audit.unexecutedQueue.notExecuted, [
    "Xiaohongshu search",
    "runtime disablement",
    "registry or runtime edit",
    "file deletion or overwrite",
  ]);
  assert.match(audit.decision, /Do not model, promote, derive Identity, or disable runtime/u);
});
