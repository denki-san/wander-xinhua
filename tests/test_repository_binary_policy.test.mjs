import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildEnforcementPolicy,
  classifyRepositoryEntry,
  classifyRepositoryPath,
  evaluateBaselineUpdate,
  evaluateBinaryPolicy,
  validateBaselineSnapshot,
  validateAssetLockSchemaContract,
} from "../scripts/check_repository_binary_policy.mjs";

const root = new URL("../", import.meta.url);
const policy = JSON.parse(
  await readFile(
    new URL("config/repository-binary-policy.json", root),
    "utf8",
  ),
);
const baseline = JSON.parse(
  await readFile(
    new URL("config/repository-binary-baseline.json", root),
    "utf8",
  ),
);

function current({
  path,
  bytes,
  sha256 = "a".repeat(64),
  category,
  lifecycle = "active-or-shared",
}) {
  return {
    path,
    bytes,
    sha256,
    category,
    lifecycle,
  };
}

test("当前二进制基线固定 main 输入且覆盖受控分类", () => {
  assert.equal(baseline.schemaVersion, 1);
  assert.equal(baseline.project, "wander-xinhua");
  assert.match(baseline.sourceGitSha, /^[0-9a-f]{40}$/);
  assert.equal(baseline.sourceRef, "main");
  assert.equal(baseline.semantics.existingPathsGrandfathered, true);
  assert.equal(baseline.semantics.dynamicEvidenceNewPathsAllowed, false);
  assert.ok(baseline.summary.currentFiles > 0);
  assert.ok(baseline.summary.currentBytes > 0);
  assert.ok(baseline.summary.historyLargeObjects > 0);
  assert.equal(
    new Set(
      baseline.historyLargeObjects.map(({ objectId }) => objectId),
    ).size,
    baseline.historyLargeObjects.length,
    "历史大对象必须按 Git object ID 去重",
  );
  assert.ok(
    baseline.historyLargeObjects.every(
      ({ path, paths }) => Array.isArray(paths) && paths.includes(path),
    ),
    "历史对象需保留所有已知路径并提供稳定主路径",
  );
  for (const category of [
    "dynamic-evidence",
    "editable-source",
    "runtime-model",
    "runtime-media",
  ]) {
    assert.ok(
      baseline.summary.byCategory.some((entry) => entry.key === category),
      `基线应包含 ${category}`,
    );
  }
});

test("分类器区分动态证据、可编辑源、runtime 与 Hold", () => {
  assert.deepEqual(
    classifyRepositoryPath("test_artifacts/test_new.png", policy),
    {
      category: "dynamic-evidence",
      lifecycle: "active-or-shared",
    },
  );
  assert.deepEqual(
    classifyRepositoryPath(
      "assets/models/source/xinhua-road/new-building.blend",
      policy,
    ),
    {
      category: "editable-source",
      lifecycle: "active-or-shared",
    },
  );
  assert.deepEqual(
    classifyRepositoryPath("scratch/new-building.blend", policy),
    {
      category: "editable-source",
      lifecycle: "active-or-shared",
    },
  );
  for (const editablePath of [
    "scratch/building.obj",
    "scratch/material.psd",
    "scratch/lighting.exr",
  ]) {
    assert.deepEqual(
      classifyRepositoryPath(editablePath, policy),
      {
        category: "editable-source",
        lifecycle: "active-or-shared",
      },
    );
  }
  assert.deepEqual(
    classifyRepositoryPath("public/models/new-building.fbx", policy),
    {
      category: "runtime-model",
      lifecycle: "active-or-shared",
    },
  );
  assert.deepEqual(
    classifyRepositoryEntry("payload.unknown", 262_145, policy),
    {
      category: "repository-binary",
      lifecycle: "active-or-shared",
    },
  );
  assert.equal(
    classifyRepositoryEntry("large-source.json", 2_000_000, policy),
    null,
    "已知文本扩展名不应被未知二进制兜底误伤",
  );
  assert.deepEqual(
    classifyRepositoryPath("public/models/xinhua-road/new-building.glb", policy),
    {
      category: "runtime-model",
      lifecycle: "active-or-shared",
    },
  );
  assert.deepEqual(
    classifyRepositoryPath("public/models/shangsheng/navy-club-pool.glb", policy),
    {
      category: "runtime-model",
      lifecycle: "hold",
    },
  );
});

test("新动态证据与新 Blend 无论大小都被阻止", () => {
  const result = evaluateBinaryPolicy({
    policy,
    baseline: {
      entries: [],
    },
    currentEntries: [
      current({
        path: "test_artifacts/test_new.png",
        bytes: 12,
        category: "dynamic-evidence",
      }),
      current({
        path: "assets/models/source/new-building.blend",
        bytes: 12,
        category: "editable-source",
      }),
    ],
  });
  assert.equal(result.passed, false);
  assert.deepEqual(
    result.violations.map(({ code }) => code),
    ["blocked-new-category", "blocked-new-category"],
  );
});

test("新 runtime GLB 必须显式锁定 path、SHA、bytes 与原因", () => {
  const asset = current({
    path: "public/models/xinhua-road/new-building.glb",
    bytes: 128_000,
    sha256: "b".repeat(64),
    category: "runtime-model",
  });
  const blocked = evaluateBinaryPolicy({
    policy,
    baseline: {
      entries: [],
    },
    currentEntries: [asset],
  });
  assert.equal(blocked.passed, false);
  assert.equal(blocked.violations[0].code, "approval-required");

  const approved = evaluateBinaryPolicy({
    policy: {
      ...policy,
      approvedAdditions: [{
        path: asset.path,
        sha256: asset.sha256,
        bytes: asset.bytes,
        reason: "非首屏 Hero CDN 试点前的可审查加入",
      }],
    },
    baseline: {
      entries: [],
    },
    currentEntries: [asset],
  });
  assert.equal(approved.passed, true);
});

test("既有文件可删除或缩小，但增长必须更新受审基线", () => {
  const previous = current({
    path: "public/og.png",
    bytes: 100,
    category: "runtime-media",
  });
  const removed = evaluateBinaryPolicy({
    policy,
    baseline: {
      entries: [previous],
    },
    currentEntries: [],
  });
  assert.equal(removed.passed, true);

  const shrunk = evaluateBinaryPolicy({
    policy,
    baseline: {
      entries: [previous],
    },
    currentEntries: [{
      ...previous,
      bytes: 90,
      sha256: "c".repeat(64),
    }],
  });
  assert.equal(shrunk.passed, true);

  const grown = evaluateBinaryPolicy({
    policy,
    baseline: {
      entries: [previous],
    },
    currentEntries: [{
      ...previous,
      bytes: 101,
      sha256: "d".repeat(64),
    }],
  });
  assert.equal(grown.passed, false);
  assert.equal(grown.violations[0].code, "existing-file-grew");

  const approvedGrowth = evaluateBinaryPolicy({
    policy: {
      ...policy,
      approvedAdditions: [{
        path: previous.path,
        sha256: "d".repeat(64),
        bytes: 101,
        reason: "受审的首屏资源更新",
      }],
    },
    baseline: {
      entries: [previous],
    },
    currentEntries: [{
      ...previous,
      bytes: 101,
      sha256: "d".repeat(64),
    }],
  });
  assert.equal(approvedGrowth.passed, true);
});

test("重生成基线不能吸收新动态证据或新 Blend", () => {
  const update = evaluateBaselineUpdate({
    policy,
    previousBaseline: {
      entries: [],
    },
    currentEntries: [
      current({
        path: "docs/research/assets/new-building/test_reference.jpg",
        bytes: 32,
        category: "dynamic-evidence",
      }),
      current({
        path: "assets/models/source/new-building.blend",
        bytes: 64,
        category: "editable-source",
      }),
    ],
  });
  assert.equal(update.passed, false);
  assert.deepEqual(
    update.violations.map(({ code }) => code),
    ["blocked-new-category", "blocked-new-category"],
  );
});

test("基线必须精确对应其 sourceGitSha 的受控路径与大小", () => {
  const treeEntry = current({
    path: "test_artifacts/test_existing.png",
    bytes: 100,
    category: "dynamic-evidence",
  });
  const valid = validateBaselineSnapshot({
    baseline: {
      sourceGitSha: "1".repeat(40),
      entries: [treeEntry],
    },
    sourceGitSha: "1".repeat(40),
    treeEntries: [{
      path: treeEntry.path,
      bytes: treeEntry.bytes,
      category: treeEntry.category,
      lifecycle: treeEntry.lifecycle,
    }],
  });
  assert.equal(valid.passed, true);

  const injected = validateBaselineSnapshot({
    baseline: {
      sourceGitSha: "1".repeat(40),
      entries: [
        treeEntry,
        current({
          path: "test_artifacts/test_injected.png",
          bytes: 10,
          category: "dynamic-evidence",
        }),
      ],
    },
    sourceGitSha: "1".repeat(40),
    treeEntries: [{
      path: treeEntry.path,
      bytes: treeEntry.bytes,
      category: treeEntry.category,
      lifecycle: treeEntry.lifecycle,
    }],
  });
  assert.equal(injected.passed, false);
  assert.equal(injected.violations[0].code, "baseline-entry-injected");
});

test("CI 继承基分支安全策略，只接收当前分支的精确审批列表", () => {
  const trustedPolicy = {
    ...policy,
    blockedNewCategories: ["dynamic-evidence", "editable-source"],
    approvalRequiredCategories: ["runtime-model"],
    newFileLimits: {
      "repository-binary": 262_144,
      "runtime-media": 524_288,
    },
    approvedAdditions: [],
  };
  const workingPolicy = {
    ...policy,
    blockedNewCategories: [],
    approvalRequiredCategories: [],
    newFileLimits: {
      "repository-binary": Number.MAX_SAFE_INTEGER,
      "runtime-media": Number.MAX_SAFE_INTEGER,
    },
    approvedAdditions: [{
      path: "public/models/reviewed.glb",
      sha256: "e".repeat(64),
      bytes: 100,
      reason: "受审加入",
    }],
  };
  const enforced = buildEnforcementPolicy({
    workingPolicy,
    trustedPolicy,
  });
  assert.deepEqual(
    enforced.blockedNewCategories,
    trustedPolicy.blockedNewCategories,
  );
  assert.deepEqual(
    enforced.approvalRequiredCategories,
    trustedPolicy.approvalRequiredCategories,
  );
  assert.deepEqual(enforced.newFileLimits, trustedPolicy.newFileLimits);
  assert.deepEqual(
    enforced.approvedAdditions,
    workingPolicy.approvedAdditions,
  );
});

test("GitHub CI 使用基分支 SHA，而不是信任 PR 自带基线", async () => {
  const workflow = await readFile(
    new URL(".github/workflows/repository-binary-policy.yml", root),
    "utf8",
  );
  assert.match(workflow, /^permissions:\n  contents: read$/m);
  assert.match(
    workflow,
    /BINARY_POLICY_BASE_REF: \$\{\{ github\.event\.pull_request\.base\.sha \|\| github\.event\.before \}\}/,
  );
  assert.match(workflow, /fetch-depth: 0/);
  assert.match(workflow, /npm run check:binary-policy/);
  assert.match(
    workflow,
    /node --test tests\/test_repository_binary_policy\.test\.mjs/,
  );
});

test("asset lock schema 强制 source/runtime SHA、bytes 与 lineage", async () => {
  const schema = JSON.parse(
    await readFile(
      new URL("config/asset-lock.schema.json", root),
      "utf8",
    ),
  );
  const result = validateAssetLockSchemaContract(schema);
  assert.equal(result.passed, true, result.violations.join(", "));
  assert.equal(schema.properties.assets.minItems, 1);
  assert.equal(schema.$defs.asset.properties.runtime.minItems, 1);
  assert.equal(
    schema.$defs.asset.properties.lineage.properties.evidenceSnapshots.minItems,
    1,
  );
  assert.equal(schema.$defs.sha256.pattern, "^[0-9a-f]{64}$");
  assert.deepEqual(
    schema.$defs.runtime.properties.delivery.enum,
    ["application", "cdn"],
  );
  assert.deepEqual(
    schema.$defs.source.properties.storage.enum,
    [
      "main-repository",
      "git-lfs-asset-repository",
      "external-evidence",
    ],
  );
});
