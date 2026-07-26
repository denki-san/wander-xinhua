import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const recordPath = "docs/research/debi-fahua-525-public-primary-source-rescue-2026-07-26.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function sha256File(relativePath) {
  const bytes = await readFile(new URL(relativePath, root));
  return createHash("sha256").update(bytes).digest("hex");
}

test("德必公开一手补证只增强同址 provenance，不能越过成员或道路地图门", async () => {
  const record = await readJson(recordPath);
  for (const [key, source] of Object.entries(record.verifiedInputs)) {
    if (key === "knowledgeSource") continue;
    assert.equal(await sha256File(source.path), source.sha256, source.path);
  }
  assert.equal(
    await sha256File(record.verifiedInputs.knowledgeSource.path),
    record.verifiedInputs.knowledgeSource.sha256,
  );
  assert.equal(record.sourcesReviewed.length, 3);
  assert.equal(record.sourcesReviewed[0].class, "owner-operator-primary");
  assert.equal(record.sourcesReviewed[1].class,
    "government-hosted-operator-service-listing");
  assert.equal(record.searchAccounting.formalSitePlanFound, false);
  assert.equal(record.searchAccounting.primaryMemberToOsmWayBindingFound, false);
  assert.equal(record.searchAccounting.measuredServiceRoadWidthOrAccessFound, false);
  assert.equal(record.blockerDisposition.targetWay864847922,
    "unchanged-medium-secondary-map-corroborated-only");
  assert.equal(record.blockerDisposition.publicMapMutationAuthorized, false);
  assert.equal(record.wikiIngestion.externalStorageWritten, false);
  assert.equal(record.verdict.blockerChanged, false);
});
