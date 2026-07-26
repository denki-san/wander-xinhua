import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("幸福里中栋 lineage v2 只写隔离候选并强制父级与提交指纹", async () => {
  const source = await readFile(
    new URL("scripts/create_xingfuli_center_lineage_v2_models.py", root),
    "utf8",
  );

  assert.match(source, /strict-parent-blend-object-reduction/);
  assert.match(source, /expected-parent-glb-sha256/);
  assert.match(source, /expected-parent-blend-sha256/);
  assert.match(source, /git_blob_sha256/);
  assert.equal(source.includes("source_dir = SOURCE_BASE / tier_dir"), true);
  assert.equal(source.includes("output_dir = OUTPUT_BASE / tier_dir"), true);
  assert.doesNotMatch(source, /unlink\(/);
  assert.doesNotMatch(source, /public\/models\/xingfuli\/xingfuli-center\.glb/);
});

test("幸福里中栋 Identity 和 Massing 均从父级 Blend 做真实对象删减", async () => {
  const source = await readFile(
    new URL("scripts/create_xingfuli_center_lineage_v2_models.py", root),
    "utf8",
  );
  const brief = await readFile(
    new URL("docs/research/xingfuli-center-lineage-v2-brief.md", root),
    "utf8",
  );

  assert.match(source, /bpy\.ops\.wm\.open_mainfile/);
  assert.match(source, /identity_removal_reason/);
  assert.match(source, /massing_removal_reason/);
  assert.match(source, /retained \+ removed/);
  assert.match(source, /reference_photos_embedded/);
  assert.match(brief, /Hero → Identity v2 → Massing v2/);
  assert.match(brief, /Canonical comparison contract/);
  assert.match(brief, /Unique identity cues retained/);
  assert.match(brief, /trees\/decoration\/full-map assets/);
});
