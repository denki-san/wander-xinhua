import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath = "docs/research/fahua-heritage-xiaohongshu-local-ingestion-2026-07-26.json";

async function json(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(new URL(relativePath, root)))
    .digest("hex");
}

test("法华遗韵本地接入帧与U盘证据指纹一致", async () => {
  const record = await json(recordPath);
  assert.equal(record.files.length, 2);
  for (const frame of record.files) {
    assert.match(frame.repositoryPath, /^docs\/research\/assets\/xiaohongshu\/fahua-heritage\/original\/test_/u);
    assert.equal(await sha256(frame.repositoryPath), frame.sha256, frame.repositoryPath);
    assert.equal((await readFile(new URL(frame.repositoryPath, root))).length, frame.bytes);
    assert.match(frame.sourcePath, /\/Volumes\/plugin\/3D_Modeling_ThreeJS_Knowledge_Base\//u);
  }
  assert.match(record.source.uDiskManifestPathMismatch, /actual retained files/u);
  assert.equal(record.source.rawVideo, "not-saved");
});

test("法华遗韵本地帧只解除纵深与街道界面，保留地图和背面未知", async () => {
  const record = await json(recordPath);
  assert.equal(record.gateDecision.sideOrDepth, "pass-xhs-continuous-video");
  assert.equal(record.gateDecision.streetContext, "pass-xhs-continuous-video");
  assert.equal(record.gateDecision.exactMap, "pending-calibration");
  assert.equal(record.gateDecision.rear, "pending");
  assert.equal(record.gateDecision.scale, "pending");
  assert.ok(record.evidence.unknown.includes("完整背面构造"));
  assert.ok(record.evidence.unknown.includes("精确地图位置、朝向、footprint与尺度"));
});

test("法华遗韵本地帧接入不改模型、MCP、运行时或Hold", async () => {
  const record = await json(recordPath);
  assert.equal(record.scope.browserAccessed, false);
  assert.equal(record.scope.xiaohongshuAccessed, false);
  assert.equal(record.scope.networkAccessed, false);
  assert.equal(record.scope.modelingPerformed, false);
  assert.equal(record.scope.mcpStagePromoted, false);
  assert.equal(record.scope.mapOrRuntimeChanged, false);
  assert.equal(record.scope.runtimeDisabled, false);
  assert.equal(record.scope.sharedManifestModified, false);
  assert.equal(record.scope.recoveryOrHoldModified, false);
  assert.equal(record.gateDecision.runtimeChangeAuthorized, false);
});

test("主窗口把两帧接入参考清单与Brief但不解除地图未知", async () => {
  const [record, manifest, brief] = await Promise.all([
    json(recordPath),
    json("docs/research/poi-reference-manifest.json"),
    readFile(new URL("docs/research/requested-poi-model-brief.md", root), "utf8"),
  ]);
  const poi = manifest.pois.find(({ id }) => id === "fahua-heritage");
  assert.ok(poi);
  assert.equal(
    poi.photoStatus,
    "verified-same-structure-xhs-depth-street-map-pending",
  );
  for (const frame of record.files) {
    assert.equal(
      poi.referencePhotos.some(({ path }) => path === frame.repositoryPath),
      true,
      frame.repositoryPath,
    );
    assert.match(brief, new RegExp(frame.repositoryPath.replaceAll("/", "\\/"), "u"));
  }
  assert.match(brief, /完整背面 `unknown`/u);
  assert.match(brief, /地图校准前仍不授权建模或 MCP 晋级/u);
});
