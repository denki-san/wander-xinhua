import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseGlb(bytes) {
  assert.equal(bytes.toString("utf8", 0, 4), "glTF");
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8"));
  const triangles = json.meshes
    .flatMap((mesh) => mesh.primitives)
    .reduce((sum, primitive) => (
      sum + json.accessors[primitive.indices].count / 3
    ), 0);
  return { json, triangles };
}

test("Rain Identity 的 SHA、预算、骨架和三段动作与运行时路径一致", async () => {
  const [bytes, recordText, assets] = await Promise.all([
    readFile(new URL(
      "../public/models/character/rain-summer-wanderer-identity.glb",
      import.meta.url,
    )),
    readFile(new URL(
      "../docs/research/build-records/rain-summer-wanderer-identity.json",
      import.meta.url,
    ), "utf8"),
    readFile(new URL("../app/scene/rain-character-assets.ts", import.meta.url), "utf8"),
  ]);
  const record = JSON.parse(recordText);
  const { json, triangles } = parseGlb(bytes);

  assert.equal(sha256(bytes), record.output.sha256);
  assert.equal(record.output.cacheVersion, record.output.sha256.slice(0, 12));
  assert.equal(bytes.length, record.output.bytes);
  assert.equal(triangles, record.output.triangles);
  assert.ok(bytes.length <= 650_000);
  assert.ok(triangles <= 9_000);
  assert.equal(json.nodes.length, 76);
  assert.equal(json.meshes.length, 13);
  assert.equal(json.materials.length, 11);
  assert.equal(json.images, undefined);
  assert.equal(json.skins.length, 1);
  assert.deepEqual(
    json.animations.map((animation) => animation.name).sort(),
    ["Idle_Neutral", "Run", "Walk"],
  );
  assert.match(
    assets,
    new RegExp(`rain-summer-wanderer-identity\\.glb\\?v=${record.output.cacheVersion}`),
  );
});

test("开始按钮等待首帧和 Identity settled，Hero 回退到 Identity", async () => {
  const [experience, preloader, world] = await Promise.all([
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/rain-character-preloader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(
    experience,
    /const ready = rendererReady && characterIdentityStatus !== null/,
  );
  assert.match(experience, /<RainIdentityPreloader onSettled=\{settleCharacterIdentity\} \/>/);
  assert.match(experience, /<RainIdentityPreloadFallback onSettled=\{settleCharacterIdentity\} \/>/);
  assert.match(experience, /正在准备轻量人物/);
  assert.match(preloader, /useGLTF\(RAIN_IDENTITY_MODEL_PATH\)/);
  assert.match(preloader, /useGLTF\.preload\(RAIN_HERO_MODEL_PATH\)/);
  assert.match(world, /const identity = \(/);
  assert.match(world, /<Suspense fallback=\{identity\}>/);
  assert.match(world, /xinhuaCharacterTier = "procedural"/);
  assert.match(world, /#fff0cf/);
  assert.match(world, /#65a6a0/);
});

test("街区四象限分块可独立校验且总量仍覆盖 730 栋", async () => {
  const runtime = JSON.parse(await readFile(new URL(
    "../app/scene/xinhua-district-massing-runtime.json",
    import.meta.url,
  ), "utf8"));

  assert.equal(runtime.weakNetworkPolicy, "nearest-first");
  assert.equal(runtime.chunks.length, 4);
  assert.deepEqual(
    runtime.chunks.map((chunk) => chunk.id).sort(),
    ["east-north", "east-south", "west-north", "west-south"],
  );
  assert.equal(
    runtime.chunks.reduce((sum, chunk) => sum + chunk.buildingCount, 0),
    730,
  );
  assert.equal(
    runtime.chunks.reduce((sum, chunk) => sum + chunk.triangles, 0),
    runtime.triangles,
  );

  for (const chunk of runtime.chunks) {
    const path = new URL(
      `../public${chunk.url.split("?")[0]}`,
      import.meta.url,
    );
    const bytes = await readFile(path);
    const { json } = parseGlb(bytes);
    assert.equal(bytes.length, chunk.bytes);
    assert.equal(sha256(bytes), chunk.sha256);
    assert.equal(json.meshes.length, 3);
    assert.ok(bytes.length < 220_000);
  }
});

test("弱网跳过批量 POI 预取，派生封面显著小于原图", async () => {
  const experience = await readFile(
    new URL("../app/xinhua-experience.tsx", import.meta.url),
    "utf8",
  );
  const intro = await readFile(
    new URL("../app/xinhua-intro-surface.tsx", import.meta.url),
    "utf8",
  );
  const [mobileOriginal, mobileLite, desktopOriginal, desktopLite] = await Promise.all([
    stat(new URL("../public/images/xinhua-plane-tree-cover-mobile.jpg", import.meta.url)),
    stat(new URL("../public/images/xinhua-plane-tree-cover-mobile-lite.jpg", import.meta.url)),
    stat(new URL("../public/images/xinhua-plane-tree-cover-desktop.jpg", import.meta.url)),
    stat(new URL("../public/images/xinhua-plane-tree-cover-desktop-lite.jpg", import.meta.url)),
  ]);

  assert.match(experience, /if \(networkProfile === "weak"\) return/);
  assert.match(experience, /characterHeroVisible/);
  assert.match(intro, /xinhua-plane-tree-cover-mobile-lite\.jpg/);
  assert.match(intro, /xinhua-plane-tree-cover-desktop-lite\.jpg/);
  assert.ok(mobileLite.size < mobileOriginal.size * 0.5);
  assert.ok(desktopLite.size < desktopOriginal.size * 0.65);
});
