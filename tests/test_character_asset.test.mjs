import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const CHARACTER_PATH = new URL(
  "../public/models/character/urban-messenger.glb",
  import.meta.url,
);

async function parseGlbJson() {
  const bytes = await readFile(CHARACTER_PATH);
  assert.equal(bytes.toString("utf8", 0, 4), "glTF");
  const jsonLength = bytes.readUInt32LE(12);
  return {
    bytes,
    json: JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8")),
  };
}

test("开源角色保留高细节网格、骨骼和完整移动动画", async () => {
  const { bytes, json } = await parseGlbJson();
  const triangles = json.meshes
    .flatMap((mesh) => mesh.primitives)
    .reduce((sum, primitive) => {
      const indices = json.accessors[primitive.indices];
      return sum + indices.count / 3;
    }, 0);
  const animationNames = new Set(json.animations.map((clip) => clip.name));

  assert.ok(bytes.length > 3_000_000);
  assert.ok(triangles >= 6_300);
  assert.equal(json.skins.length, 1);
  assert.ok(json.nodes.length >= 54);
  assert.ok(json.animations.length >= 76);
  assert.ok(animationNames.has("Idle"));
  assert.ok(animationNames.has("Unarmed_Idle"));
  assert.ok(animationNames.has("Walking_A"));
  assert.ok(animationNames.has("Running_A"));
});

test("角色运行时使用单实例骨架、渐进加载与动作混合并隐藏武器节点", async () => {
  const [world, license, sourceReadme] = await Promise.all([
    readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8"),
    readFile(new URL("../assets/models/source/character/LICENSE.txt", import.meta.url), "utf8"),
    readFile(new URL("../assets/models/source/character/README.md", import.meta.url), "utf8"),
  ]);

  assert.match(license, /Creative Commons Zero, CC0/);
  assert.match(sourceReadme, /672074b73ba276876a19e8816ecdc5241817ab47/);
  assert.match(world, /useGLTF\(CHARACTER_MODEL_PATH\)/);
  assert.match(world, /return scene/);
  assert.match(world, /<Suspense fallback=\{<ProceduralMessengerCharacter \{\.\.\.props\} \/>\}>/);
  assert.match(world, /useAnimations\(animations, model\)/);
  assert.match(world, /actions\.Unarmed_Idle \?\? actions\.Idle/);
  assert.match(world, /"Walking_A"/);
  assert.match(world, /"Running_A"/);
  assert.match(world, /rotation-y=\{Math\.PI\}>\s*<MessengerBackpack \/>/s);
  assert.match(world, /"Rogue_Cape"/);
  assert.match(world, /"1H_Crossbow"/);
});
