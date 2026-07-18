import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const CHARACTER_PATH = new URL("../public/models/character/urban-wanderer.glb", import.meta.url);

async function parseGlbJson(path) {
  const bytes = await readFile(path);
  assert.equal(bytes.toString("utf8", 0, 4), "glTF");
  const jsonLength = bytes.readUInt32LE(12);
  return {
    bytes,
    json: JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8")),
  };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

test("城市漫游者使用单文件骨架、四个可替换模块和轻量移动动作", async () => {
  const { bytes, json } = await parseGlbJson(CHARACTER_PATH);
  const triangles = json.meshes
    .flatMap((mesh) => mesh.primitives)
    .reduce((sum, primitive) => {
      const indices = json.accessors[primitive.indices];
      return sum + indices.count / 3;
    }, 0);
  const vertices = json.meshes
    .flatMap((mesh) => mesh.primitives)
    .reduce((sum, primitive) => (
      sum + json.accessors[primitive.attributes.POSITION].count
    ), 0);
  const nodeNames = new Set(json.nodes.map((node) => node.name));
  const animationNames = new Set(json.animations.map((clip) => clip.name));

  assert.ok(bytes.length > 300_000);
  assert.ok(bytes.length < 500_000);
  assert.ok(triangles >= 6_700);
  assert.ok(vertices >= 3_400);
  assert.ok(vertices < 4_000);
  assert.equal(json.skins.length, 1);
  assert.ok(json.nodes.length >= 65);
  assert.equal(json.images, undefined);
  assert.ok(nodeNames.has("Slot_Head_Default"));
  assert.ok(nodeNames.has("Slot_Upper_Default"));
  assert.ok(nodeNames.has("Slot_Lower_Default"));
  assert.ok(nodeNames.has("Slot_Shoes_Default"));
  assert.ok(nodeNames.has("Urban_Wanderer_Rig"));
  assert.deepEqual([...animationNames].sort(), ["Idle_Neutral", "Run", "Walk"]);
  assert.ok([...nodeNames].every((name) => !/Backpack|Bag|ShoulderStrap|Pistol/i.test(name ?? "")));
});

test("三个 Quaternius CC0 源模块及授权证据均可复核", async () => {
  const [casual, hoodie, suit, license, sourceReadme, generator] = await Promise.all([
    readFile(new URL(
      "../assets/models/source/character/quaternius-modular-men/Casual_2.gltf",
      import.meta.url,
    )),
    readFile(new URL(
      "../assets/models/source/character/quaternius-modular-men/Casual_Hoodie.gltf",
      import.meta.url,
    )),
    readFile(new URL(
      "../assets/models/source/character/quaternius-modular-men/Suit.gltf",
      import.meta.url,
    )),
    readFile(new URL(
      "../assets/models/source/character/QUATERNIUS_MODULAR_MEN_LICENSE.txt",
      import.meta.url,
    ), "utf8"),
    readFile(new URL("../assets/models/source/character/README.md", import.meta.url), "utf8"),
    readFile(new URL("../scripts/create_urban_wanderer_character.py", import.meta.url), "utf8"),
  ]);

  assert.equal(sha256(casual), "55c654d09a2a5ff6e3bd6158d4a1b462f181cd6f1e12a0f5e9d959f9c3abc438");
  assert.equal(sha256(hoodie), "dd74886c26998a0fa888b4ce557a0932d7d97b0265dd4c763154d081b7a6cb98");
  assert.equal(sha256(suit), "6c89fbb31b96c1a63ad94e3dee0942bd7b34bc789a5d39fd6a6a1738a9214fb3");
  assert.match(license, /CC0 1\.0 Universal/i);
  assert.match(sourceReadme, /Ultimate Modular Men Pack/);
  assert.match(generator, /SOURCE_CASUAL/);
  assert.match(generator, /SOURCE_HOODIE/);
  assert.match(generator, /SOURCE_SUIT/);
  assert.match(generator, /Slot_Upper_Default/);
  assert.match(generator, /Slot_Lower_Default/);
  assert.match(generator, /bmesh\.ops\.remove_doubles/);
  assert.doesNotMatch(generator, /MessengerBackpack|ShoulderStrap/);
});

test("运行时只加载单个角色 GLB 并混合待机、行走和奔跑动作", async () => {
  const world = await readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8");

  assert.match(world, /const CHARACTER_MODEL_PATH = "\/models\/character\/urban-wanderer\.glb"/);
  assert.doesNotMatch(world, /CHARACTER_ANIMATION_PATH|universal-animation-standard\.glb/);
  assert.match(world, /const \{ scene, animations \} = useGLTF\(CHARACTER_MODEL_PATH\)/);
  assert.match(world, /<Suspense fallback=\{<ProceduralWandererCharacter \{\.\.\.props\} \/>\}>/);
  assert.match(world, /useAnimations\(animations, model\)/);
  assert.match(world, /actions\.Idle_Neutral/);
  assert.match(world, /"Walk"/);
  assert.match(world, /"Run"/);
  assert.match(world, /<primitive object=\{model\} scale=\{1\.15\} \/>/);
  assert.doesNotMatch(world, /MessengerBackpack|Backpack|ShoulderStrap/);
  assert.doesNotMatch(world, /<primitive object=\{model\}[^>]*rotation-y=\{Math\.PI\}/);
});
