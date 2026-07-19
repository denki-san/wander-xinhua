import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { MAP_POIS } from "../app/scene/poi-data.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(
  path.join(repoRoot, "docs/research/poi-reference-manifest.json"),
  "utf8",
));

async function assertNonEmptyFile(relativePath, minimumBytes = 64) {
  const metadata = await stat(path.join(repoRoot, relativePath));
  assert.ok(metadata.isFile(), `${relativePath} 必须是文件`);
  assert.ok(metadata.size >= minimumBytes, `${relativePath} 文件异常小`);
}

test("17 个 POI 均有模型、可编辑来源和已核验的本地真实照片", async () => {
  const manifestIds = manifest.pois.map(({ id }) => id).sort();
  const poiIds = MAP_POIS.map(({ id }) => id).sort();
  assert.deepEqual(manifestIds, poiIds);
  assert.equal(new Set(manifestIds).size, MAP_POIS.length);

  for (const poi of MAP_POIS) {
    const record = manifest.pois.find(({ id }) => id === poi.id);
    assert.ok(record, `${poi.id} 缺少照片与模型清单`);
    assert.match(record.photoStatus, /^verified-/);
    assert.equal(poi.photo.src, record.cardPhoto);
    assert.match(record.cardPhoto, /^\/images\/poi-thumbnails\/[a-z0-9-]+\.jpg$/);
    await assertNonEmptyFile(`public${record.cardPhoto}`, 10_000);

    assert.ok(record.model.runtimeFiles.length > 0, `${poi.id} 缺少运行时模型`);
    assert.ok(record.model.sourceFiles.length > 0, `${poi.id} 缺少可编辑来源`);
    assert.ok(record.model.positionEvidence, `${poi.id} 缺少位置证据`);
    for (const modelPath of record.model.runtimeFiles) await assertNonEmptyFile(modelPath);
    for (const sourcePath of record.model.sourceFiles) await assertNonEmptyFile(sourcePath);

    assert.ok(record.referencePhotos.length >= 1, `${poi.id} 缺少真实参考照片`);
    assert.ok(
      record.referencePhotos.length <= manifest.rules.maximumReferencePhotosPerPoi,
      `${poi.id} 选用照片超过三张`,
    );
    assert.ok(
      record.referencePhotos.some(({ path: photoPath }) => photoPath === record.canonicalReference),
      `${poi.id} 的典型对照图不在选定照片内`,
    );
    assert.equal(
      new Set(record.referencePhotos.map(({ view }) => view)).size,
      record.referencePhotos.length,
      `${poi.id} 的多张照片必须是不同观察角度`,
    );
    for (const photo of record.referencePhotos) {
      assert.match(photo.sourceUrl, /^https:\/\//);
      assert.ok(photo.captureDate, `${poi.id} 的照片必须记录拍摄日期或 unknown`);
      await assertNonEmptyFile(photo.path, 10_000);
    }
  }
});

test("卡片不再直接引用文章首图、宣传图或第三方远程图片", () => {
  assert.ok(MAP_POIS.every(({ photo }) => photo.src.startsWith("/images/poi-thumbnails/")));
  assert.doesNotMatch(
    JSON.stringify(MAP_POIS),
    /af8b4d0831f444339b8ec18be74b6025|709aa6b87fe44a168204ef5486040eea|20220815050534554_Large/,
  );
});
