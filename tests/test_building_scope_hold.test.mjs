import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const RECOVERY_ONLY_RUNTIME_PATHS = [
  "app/scene/facility-prototype-massing.tsx",
  "app/scene/osm-ordinary-massing.tsx",
  "app/scene/shared-prototype-identity-map.tsx",
  "app/scene/shared-prototype-identity.tsx",
  "app/scene/shared-prototype-massing.tsx",
];

const HOLD_ASSET_IDS = [
  "plane-tree",
  "campus-tree",
  "huashan-tree",
  "lane-lamp",
  "cantilever-umbrella",
  "outdoor-dining",
  "slatted-bench",
  "street-planter",
  "stone-bollard",
  "mixed-paving",
  "ground-cover",
  "navy-club-pool",
  "trash-bin",
];

async function exists(relativePath) {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

test("遗失会话中的范围外运行时模块保持在 Hold，不进入主窗口", async () => {
  for (const relativePath of RECOVERY_ONLY_RUNTIME_PATHS) {
    assert.equal(
      await exists(relativePath),
      false,
      `${relativePath} 属于 recovery/Hold，不得随18栋建筑选择性提取进入 main`,
    );
  }
});

test("18栋调度清单记录 recovery 快照，并明确排除13个 Hold catalog", async () => {
  const roster = await readFile(
    path.join(root, "docs/research/building-production-roster.md"),
    "utf8",
  );

  assert.match(
    roster,
    /3044cd89f801250afcd477dfbcbc7da358bf4b11/,
    "调度清单必须固定遗失会话 recovery commit",
  );
  assert.match(roster, /不整体 merge/);

  for (const assetId of HOLD_ASSET_IDS) {
    assert.doesNotMatch(
      roster.match(/## 当前 18 栋[\s\S]*?## 恢复后的数量结论/)?.[0] ?? "",
      new RegExp("\\| `" + assetId + "` \\|"),
      `${assetId} 属于 Hold，不得计入18栋表格`,
    );
  }
});
