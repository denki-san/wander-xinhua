import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const CHARACTER_PATH = new URL("../public/models/character/rain-summer-wanderer.glb", import.meta.url);

async function parseGlb(path) {
  const bytes = await readFile(path);
  assert.equal(bytes.toString("utf8", 0, 4), "glTF");
  const jsonLength = bytes.readUInt32LE(12);
  return {
    bytes,
    json: JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8")),
  };
}

function imageDimensions(bytes) {
  if (bytes.toString("hex", 0, 8) === "89504e470d0a1a0a") {
    return {
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
    };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    for (let offset = 2; offset < bytes.length - 8;) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      if (marker === 0xd8 || marker === 0xd9) {
        offset += 2;
        continue;
      }
      const length = bytes.readUInt16BE(offset + 2);
      if (startOfFrame.has(marker)) {
        return {
          width: bytes.readUInt16BE(offset + 7),
          height: bytes.readUInt16BE(offset + 5),
        };
      }
      offset += 2 + length;
    }
  }
  assert.fail("证据文件不是可识别的 PNG 或 JPEG");
}

test("Rain 盛夏候选保留完整成品造型并满足网页预算", async () => {
  const { bytes, json } = await parseGlb(CHARACTER_PATH);
  const triangles = json.meshes
    .flatMap((mesh) => mesh.primitives)
    .reduce((sum, primitive) => sum + json.accessors[primitive.indices].count / 3, 0);
  const names = new Set(json.nodes.map((node) => node.name));
  const animations = json.animations.map((animation) => animation.name).sort();

  assert.ok(bytes.length < 6_000_000);
  assert.ok(triangles >= 50_000);
  assert.ok(triangles <= 60_000);
  assert.ok(json.nodes.length <= 160);
  assert.ok(json.materials.length <= 12);
  assert.equal(json.images, undefined);
  assert.equal(json.skins.length, 1);
  assert.deepEqual(animations, ["Idle_Neutral", "Run", "Walk"]);
  for (const name of ["Rain_body", "Rain_head", "Rain_eye", "Rain_hair_low_ponytail", "Rain_hairband_low", "Rain_Summer_Rig"]) {
    assert.ok(names.has(name), `缺少节点 ${name}`);
  }
  assert.ok(!names.has("Rain_hair_ponytail"));
  assert.ok(!names.has("Rain_hairband"));
});

test("Rain 候选的生成器、来源哈希与 CC-BY 署名可追溯", async () => {
  const [generator, manifest, license, record, weightAudit, bytes] = await Promise.all([
    readFile(new URL("../scripts/create_rain_summer_character.py", import.meta.url), "utf8"),
    readFile(new URL("../docs/research/rain-character-reference-manifest.json", import.meta.url), "utf8"),
    readFile(new URL("../assets/models/source/character/RAIN_LICENSE.txt", import.meta.url), "utf8"),
    readFile(new URL("../docs/research/build-records/rain-summer-wanderer.json", import.meta.url), "utf8"),
    readFile(new URL("../test_artifacts/test_rain_summer_weight_audit.json", import.meta.url), "utf8"),
    readFile(CHARACTER_PATH),
  ]);
  const parsedManifest = JSON.parse(manifest);
  const parsedRecord = JSON.parse(record);
  const parsedWeightAudit = JSON.parse(weightAudit);

  assert.match(generator, /TARGET_TO_SOURCE_BONE/);
  assert.match(generator, /Idle_Neutral/);
  assert.match(generator, /validate_vertex_groups/);
  assert.equal(
    parsedManifest.sourceArchive.sha256,
    "e216ce06621bb4ba34b226119ff437b24cf27a0efc80bbdea2c6f8f918a17c2c",
  );
  assert.match(license, /CC-BY/);
  assert.match(license, /Rain Rig © Blender Foundation/);
  assert.equal(parsedRecord.output.sha256, createHash("sha256").update(bytes).digest("hex"));
  assert.deepEqual(
    parsedWeightAudit.Rain_shoes.map(({ name }) => name).sort(),
    ["Foot.L", "Foot.R"],
  );
});

test("Rain 短束低马尾和桌面手机证据对应同一 GLB", async () => {
  const [
    source,
    detailedCharacter,
    recordText,
    canonical,
    side,
    desktop,
    mobile,
  ] = await Promise.all([
    readFile(new URL("../app/style-lab/StyleLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/detailed-wanderer-character.tsx", import.meta.url), "utf8"),
    readFile(new URL("../docs/research/build-records/rain-summer-wanderer.json", import.meta.url), "utf8"),
    readFile(new URL("../test_artifacts/test_rain_summer_character_canonical.png", import.meta.url)),
    readFile(new URL("../test_artifacts/test_rain_summer_character_side.png", import.meta.url)),
    readFile(new URL("../test_artifacts/test_xinhua_autumn_storybook_v2_character_desktop.png", import.meta.url)),
    readFile(new URL("../test_artifacts/test_xinhua_autumn_storybook_v2_character_mobile.png", import.meta.url)),
  ]);
  const record = JSON.parse(recordText);

  assert.match(source, /ShiftLeft/);
  assert.match(source, /running \? "Run" : "Walk"/);
  assert.equal(source.match(/if \(strength > 0\) clearStyleNudge\(\)/g)?.length, 2);
  assert.match(source, /qaMotion === "run"/);
  assert.match(source, /get\("qaMotion"\)/);
  assert.match(source, /new Vector3\(-31, 0\.025, -7\)/);
  assert.match(source, new RegExp(`rain-summer-wanderer\\.glb\\?v=${record.output.sha256.slice(0, 12)}`));
  assert.match(
    detailedCharacter,
    new RegExp(`rain-summer-wanderer\\.glb\\?v=${record.output.sha256.slice(0, 12)}`),
  );
  assert.match(source, /Rain Rig © Blender Foundation \| cloud\.blender\.org/);
  assert.equal(record.output.cacheVersion, record.output.sha256.slice(0, 12));
  assert.equal(record.status, "production-ready");
  assert.match(record.runtimeGate, /1440x900 desktop/);
  assert.deepEqual(imageDimensions(canonical), { width: 720, height: 900 });
  assert.deepEqual(imageDimensions(side), { width: 720, height: 900 });
  assert.deepEqual(imageDimensions(desktop), record.validation.viewports.desktop);
  assert.deepEqual(imageDimensions(mobile), record.validation.viewports.mobile);
  assert.equal(record.validation.consoleErrors, 0);
  assert.equal(record.validation.visualChecks.originalHorizontalPonytailRemoved, true);
  assert.equal(record.validation.visualChecks.compactLowPonytailHeadBound, true);
  assert.equal(record.validation.visualChecks.runtimeMessengerBagRemoved, true);
});

test("Rain 已进入正式地图并在桌面与手机可访问位置展示署名", async () => {
  const [world, detailedCharacter, experience, recordText, desktop, mobile] = await Promise.all([
    readFile(new URL("../app/scene/xinhua-world.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scene/detailed-wanderer-character.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/xinhua-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../docs/research/build-records/rain-summer-wanderer.json", import.meta.url), "utf8"),
    readFile(new URL("../test_artifacts/test_xinhua_autumn_storybook_v2_character_desktop.png", import.meta.url)),
    readFile(new URL("../test_artifacts/test_xinhua_autumn_storybook_v2_character_mobile.png", import.meta.url)),
  ]);
  const record = JSON.parse(recordText);

  assert.match(
    detailedCharacter,
    new RegExp(`rain-summer-wanderer\\.glb\\?v=${record.output.sha256.slice(0, 12)}`),
  );
  assert.match(world, /ProgressiveDetailedWandererCharacter/);
  assert.match(experience, /Rain Rig © Blender Foundation \| cloud\.blender\.org/g);
  assert.ok(
    experience.match(/Rain Rig © Blender Foundation \| cloud\.blender\.org/g)?.length >= 2,
    "帮助面板和桌面页脚都应展示角色署名",
  );
  assert.equal(record.productionIntegration.visualScale, 1.3);
  assert.deepEqual(imageDimensions(desktop), { width: 1440, height: 900 });
  assert.deepEqual(imageDimensions(mobile), { width: 390, height: 844 });
  assert.equal(record.productionIntegration.formalMapConsoleErrors, 0);
});
