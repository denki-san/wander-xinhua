import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const lock = JSON.parse(await readFile(
  new URL("./fixtures/historical-git-fixture-lock.json", import.meta.url),
  "utf8",
));
const evidenceRoot = process.env.WANDER_XINHUA_EVIDENCE_ROOT
  ?? "/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence";
const snapshotRoot = path.join(evidenceRoot, lock.archive.root);

const requiredInputs = [
  ["0189d06a939651c0f7e2876d074321f2caa9a903", "app/scene/xinhua-road-landmarks-data.json"],
  ["0189d06a939651c0f7e2876d074321f2caa9a903", "app/scene/xinhua-district-massing-data.json"],
  ["aada3c412d10f822305c2e3410435f3b00278c2c", "app/scene/xinhua-road-landmarks-data.json"],
  ["9db605f276abee125cc4b83538bba8ba13deb8e8", "docs/research/build-records/tiers/xinhua-road/hero-v2/villa-le-bec-hero-v2.json"],
  ["a897447a8413157de3fb57c3965803e20c3d8f18", "docs/research/villa-le-bec-map-candidate.json"],
  ["833bb8aadac20334ed489dfb26666621126493f6", "docs/research/villa-le-bec-threejs-runtime-qa-v2.json"],
  ["dcd619e04fc735e8b0a4b9b01cac7ca78a749ecb", "public/models/tiers/xinhua-road/hero-v1/villa-le-bec-hero.glb"],
  ["ea77bc3d28461023fddeea13bd15ab996b4c401a", "public/models/tiers/xinhua-road/hero-v1/villa-le-bec-hero.glb"],
  ["29760a1fc83cea2a7b5c7bc4c87e77491c496b9f", "public/models/tiers/xinhua-road/hero-v1/villa-le-bec-hero.glb"],
];

test("历史 Git fixture lock 完整锁定本地独有输入", () => {
  assert.equal(lock.schemaVersion, 1);
  assert.equal(lock.archive.storage, "external-evidence");
  assert.equal(lock.archive.checksumVerified, true);
  assert.equal(
    lock.archive.snapshot,
    "2026-07-29-issue-1-history-fixtures-d5f88ed",
  );

  const keys = new Set();
  for (const entry of lock.entries) {
    assert.match(entry.commit, /^[a-f0-9]{40}$/u);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/u);
    assert.ok(entry.bytes > 0);
    assert.match(entry.archivedPath, /^repository\/history-fixtures\//u);
    const key = `${entry.commit}:${entry.path}`;
    assert.equal(keys.has(key), false, `重复 fixture：${key}`);
    keys.add(key);
  }

  assert.deepEqual(
    requiredInputs.map(([commit, inputPath]) => `${commit}:${inputPath}`).sort(),
    [...keys].sort(),
  );
});

test(
  "挂载外置证据库时逐文件回查历史 fixture SHA 与 bytes",
  { skip: !existsSync(snapshotRoot) },
  async () => {
    for (const entry of lock.entries) {
      const archivedFile = path.join(snapshotRoot, entry.archivedPath);
      const [buffer, metadata] = await Promise.all([
        readFile(archivedFile),
        stat(archivedFile),
      ]);
      assert.equal(metadata.size, entry.bytes, entry.archivedPath);
      assert.equal(
        createHash("sha256").update(buffer).digest("hex"),
        entry.sha256,
        entry.archivedPath,
      );
    }
  },
);
