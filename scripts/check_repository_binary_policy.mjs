import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import {
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const DEFAULT_POLICY_PATH = path.join(
  PROJECT_ROOT,
  "config/repository-binary-policy.json",
);
const DEFAULT_ASSET_LOCK_SCHEMA_PATH = path.join(
  PROJECT_ROOT,
  "config/asset-lock.schema.json",
);
const DEFAULT_ASSET_LOCK_PATH = path.join(
  PROJECT_ROOT,
  "config/asset-lock.json",
);

function git(root, args, options = {}) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    ...options,
  });
}

function tryGit(root, args, options = {}) {
  const result = spawnSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    ...options,
  });
  return result.status === 0 ? result.stdout : null;
}

function normalizePath(value) {
  return value.replaceAll("\\", "/").replace(/^\.\/+/, "");
}

function formatBytes(value) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KiB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MiB`;
  return `${(value / 1024 ** 3).toFixed(2)} GiB`;
}

async function sha256File(filePath) {
  return await new Promise((resolve, reject) => {
    const digest = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => digest.update(chunk));
    stream.on("end", () => resolve(digest.digest("hex")));
  });
}

function matchesAnyPattern(relativePath, patterns) {
  return patterns.some((pattern) => new RegExp(pattern).test(relativePath));
}

export function classifyRepositoryPath(relativePath, policy) {
  const normalized = normalizePath(relativePath);
  const lower = normalized.toLowerCase();
  const extension = path.posix.extname(lower);
  const isHold = matchesAnyPattern(lower, policy.holdPathPatterns);
  const lifecycle = isHold ? "hold" : "active-or-shared";

  const isDynamicPrefix = policy.dynamicEvidencePrefixes.some(
    (prefix) => lower.startsWith(prefix),
  );
  const isDynamicPattern = matchesAnyPattern(
    lower,
    policy.dynamicEvidencePathPatterns,
  );
  if (isDynamicPrefix || isDynamicPattern) {
    return {
      category: "dynamic-evidence",
      lifecycle,
    };
  }

  if (
    policy.runtimeModelPrefixes.some((prefix) => lower.startsWith(prefix))
    && policy.runtimeModelExtensions.includes(extension)
  ) {
    return {
      category: "runtime-model",
      lifecycle,
    };
  }

  if (
    policy.editableSourceExtensions.includes(extension)
    || (
      policy.editableSourcePrefixes.some((prefix) => lower.startsWith(prefix))
      && policy.binaryExtensions.includes(extension)
    )
  ) {
    return {
      category: "editable-source",
      lifecycle,
    };
  }

  if (
    policy.runtimeMediaPrefixes.some((prefix) => lower.startsWith(prefix))
    && policy.binaryExtensions.includes(extension)
  ) {
    return {
      category: "runtime-media",
      lifecycle,
    };
  }

  if (policy.binaryExtensions.includes(extension)) {
    return {
      category: lower.startsWith("public/")
        ? "runtime-media"
        : "repository-binary",
      lifecycle,
    };
  }

  return null;
}

export function classifyRepositoryEntry(relativePath, bytes, policy) {
  const normalized = normalizePath(relativePath).toLowerCase();
  const extension = path.posix.extname(normalized);
  return classifyRepositoryPath(relativePath, policy) ?? (
    bytes >= policy.unclassifiedFileThresholdBytes
      && !policy.knownTextExtensions.includes(extension)
      ? {
          category: "repository-binary",
          lifecycle: matchesAnyPattern(
            normalized,
            policy.holdPathPatterns,
          )
            ? "hold"
            : "active-or-shared",
        }
      : null
  );
}

export async function collectCurrentInventory({
  root = PROJECT_ROOT,
  policy,
} = {}) {
  const trackedPaths = git(root, ["ls-files", "-z"])
    .split("\0")
    .filter(Boolean);
  const entries = [];
  for (const relativePath of trackedPaths) {
    const fullPath = path.join(root, relativePath);
    if (!existsSync(fullPath)) continue;
    const fileStat = await stat(fullPath);
    if (!fileStat.isFile()) continue;
    const classification = classifyRepositoryEntry(
      relativePath,
      fileStat.size,
      policy,
    );
    if (!classification) continue;
    entries.push({
      path: normalizePath(relativePath),
      bytes: fileStat.size,
      sha256: await sha256File(fullPath),
      ...classification,
    });
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

export function collectTreeInventoryMetadata({
  root = PROJECT_ROOT,
  ref,
  policy,
} = {}) {
  const output = git(root, ["ls-tree", "-rlz", ref]);
  const entries = [];
  for (const record of output.split("\0")) {
    if (!record) continue;
    const match = record.match(
      /^\d+ blob ([0-9a-f]+)\s+(\d+)\t([\s\S]+)$/,
    );
    if (!match) continue;
    const relativePath = normalizePath(match[3]);
    const bytes = Number(match[2]);
    const classification = classifyRepositoryEntry(
      relativePath,
      bytes,
      policy,
    );
    if (!classification) continue;
    entries.push({
      path: relativePath,
      bytes,
      ...classification,
    });
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

export function collectHistoryLargeObjects({
  root = PROJECT_ROOT,
  policy,
} = {}) {
  const objectList = git(root, [
    "rev-list",
    "--objects",
    policy.baselineRef,
  ]);
  const batch = spawnSync(
    "git",
    [
      "-C",
      root,
      "cat-file",
      "--batch-check=%(objecttype) %(objectname) %(objectsize) %(rest)",
    ],
    {
      input: objectList,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    },
  );
  if (batch.status !== 0) {
    throw new Error(batch.stderr || "git cat-file 批量检查失败");
  }

  const objectsById = new Map();
  for (const line of batch.stdout.split("\n")) {
    const match = line.match(/^blob ([0-9a-f]+) (\d+) (.+)$/);
    if (!match) continue;
    const bytes = Number(match[2]);
    if (bytes < policy.historyLargeObjectThresholdBytes) continue;
    const relativePath = normalizePath(match[3]);
    const classification = classifyRepositoryEntry(
      relativePath,
      bytes,
      policy,
    );
    const existing = objectsById.get(match[1]);
    if (existing) {
      existing.paths.push(relativePath);
      existing.paths.sort();
      existing.path = existing.paths[0];
      continue;
    }
    objectsById.set(match[1], {
      objectId: match[1],
      bytes,
      path: relativePath,
      paths: [relativePath],
      category: classification?.category ?? "unclassified-large-object",
      lifecycle: classification?.lifecycle ?? "unknown",
    });
  }
  return [...objectsById.values()].sort((left, right) => (
    right.bytes - left.bytes
    || left.path.localeCompare(right.path)
  ));
}

function summarizeBy(entries, field) {
  const records = new Map();
  for (const entry of entries) {
    const key = entry[field];
    const current = records.get(key) ?? {
      key,
      files: 0,
      bytes: 0,
    };
    current.files += 1;
    current.bytes += entry.bytes;
    records.set(key, current);
  }
  return [...records.values()].sort((left, right) => (
    left.key.localeCompare(right.key)
  ));
}

function duplicateGroups(entries) {
  const bySha256 = new Map();
  for (const entry of entries) {
    const records = bySha256.get(entry.sha256) ?? [];
    records.push(entry);
    bySha256.set(entry.sha256, records);
  }
  return [...bySha256.entries()]
    .filter(([, records]) => records.length > 1)
    .map(([sha256, records]) => ({
      sha256,
      bytesPerCopy: records[0].bytes,
      copies: records.length,
      duplicateBytes: records[0].bytes * (records.length - 1),
      paths: records.map(({ path: relativePath }) => relativePath).sort(),
    }))
    .sort((left, right) => (
      right.duplicateBytes - left.duplicateBytes
      || left.sha256.localeCompare(right.sha256)
    ));
}

export function createBaseline({
  sourceGitSha,
  sourceRef,
  entries,
  historyLargeObjects,
  generatedAt = new Date().toISOString(),
}) {
  const duplicates = duplicateGroups(entries);
  return {
    schemaVersion: 1,
    project: "wander-xinhua",
    generatedAt,
    sourceGitSha,
    sourceRef,
    semantics: {
      existingPathsGrandfathered: true,
      existingPathGrowthRequiresBaselineReview: true,
      removedPathsAllowed: true,
      dynamicEvidenceNewPathsAllowed: false,
      gitHistoryRewritten: false,
    },
    summary: {
      currentFiles: entries.length,
      currentBytes: entries.reduce((total, entry) => total + entry.bytes, 0),
      duplicateGroups: duplicates.length,
      duplicateBytes: duplicates.reduce(
        (total, group) => total + group.duplicateBytes,
        0,
      ),
      historyLargeObjects: historyLargeObjects.length,
      historyLargeObjectBytes: historyLargeObjects.reduce(
        (total, entry) => total + entry.bytes,
        0,
      ),
      byCategory: summarizeBy(entries, "category"),
      byLifecycle: summarizeBy(entries, "lifecycle"),
    },
    entries,
    duplicateContentGroups: duplicates,
    historyLargeObjects,
  };
}

function approvedAddition(current, policy) {
  return policy.approvedAdditions.some((approved) => (
    approved.path === current.path
    && approved.sha256 === current.sha256
    && approved.bytes === current.bytes
    && typeof approved.reason === "string"
    && approved.reason.length > 0
  ));
}

export function evaluateBinaryPolicy({
  policy,
  baseline,
  currentEntries,
}) {
  const violations = [];
  const baselineByPath = new Map(
    baseline.entries.map((entry) => [entry.path, entry]),
  );

  for (const current of currentEntries) {
    const previous = baselineByPath.get(current.path);
    if (previous) {
      const allowedBytes =
        previous.bytes + policy.existingGrowthToleranceBytes;
      if (
        current.bytes > allowedBytes
        && !approvedAddition(current, policy)
      ) {
        violations.push({
          code: "existing-file-grew",
          path: current.path,
          message:
            `既有 ${current.category} 增长：`
            + `${formatBytes(previous.bytes)} → ${formatBytes(current.bytes)}；`
            + "必须在 approvedAdditions 中锁定 path、SHA、bytes 与原因",
        });
      }
      continue;
    }

    if (policy.blockedNewCategories.includes(current.category)) {
      violations.push({
        code: "blocked-new-category",
        path: current.path,
        message: `禁止新增 ${current.category} 到主仓库`,
      });
      continue;
    }

    if (
      policy.approvalRequiredCategories.includes(current.category)
      && !approvedAddition(current, policy)
    ) {
      violations.push({
        code: "approval-required",
        path: current.path,
        message:
          `新增 ${current.category} 必须在 approvedAdditions 中锁定`
          + " path、SHA、bytes 与原因",
      });
      continue;
    }

    const limit = policy.newFileLimits[current.category];
    if (
      Number.isInteger(limit)
      && current.bytes > limit
      && !approvedAddition(current, policy)
    ) {
      violations.push({
        code: "new-file-too-large",
        path: current.path,
        message:
          `新增 ${current.category} 为 ${formatBytes(current.bytes)}，`
          + `超过 ${formatBytes(limit)}`,
      });
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    currentSummary: {
      files: currentEntries.length,
      bytes: currentEntries.reduce((total, entry) => total + entry.bytes, 0),
      byCategory: summarizeBy(currentEntries, "category"),
    },
  };
}

export function evaluateBaselineUpdate({
  policy,
  previousBaseline,
  currentEntries,
}) {
  if (!previousBaseline) {
    return {
      passed: true,
      violations: [],
    };
  }

  const result = evaluateBinaryPolicy({
    policy,
    baseline: previousBaseline,
    currentEntries,
  });
  return {
    passed: result.passed,
    violations: result.violations,
  };
}

export function buildEnforcementPolicy({
  workingPolicy,
  trustedPolicy,
}) {
  if (!trustedPolicy) return workingPolicy;
  return {
    ...trustedPolicy,
    approvedAdditions: workingPolicy.approvedAdditions,
  };
}

export function validateBaselineSnapshot({
  baseline,
  sourceGitSha,
  treeEntries,
}) {
  const violations = [];
  if (baseline.sourceGitSha !== sourceGitSha) {
    violations.push({
      code: "baseline-source-mismatch",
      path: "config/repository-binary-baseline.json",
      message:
        `基线声明 ${baseline.sourceGitSha ?? "missing"}，`
        + `实际解析为 ${sourceGitSha}`,
    });
  }

  const baselineByPath = new Map(
    (baseline.entries ?? []).map((entry) => [entry.path, entry]),
  );
  const treeByPath = new Map(
    treeEntries.map((entry) => [entry.path, entry]),
  );

  for (const treeEntry of treeEntries) {
    const baselineEntry = baselineByPath.get(treeEntry.path);
    if (!baselineEntry) {
      violations.push({
        code: "baseline-entry-missing",
        path: treeEntry.path,
        message: "基线缺少 sourceGitSha 中已存在的受控路径",
      });
      continue;
    }
    for (const field of ["bytes", "category", "lifecycle"]) {
      if (baselineEntry[field] !== treeEntry[field]) {
        violations.push({
          code: "baseline-entry-mismatch",
          path: treeEntry.path,
          message:
            `${field} 应为 ${treeEntry[field]}，`
            + `基线记录为 ${baselineEntry[field]}`,
        });
      }
    }
  }

  for (const baselineEntry of baseline.entries ?? []) {
    if (!treeByPath.has(baselineEntry.path)) {
      violations.push({
        code: "baseline-entry-injected",
        path: baselineEntry.path,
        message: "路径不存在于基线声明的 sourceGitSha",
      });
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

export function validateAssetLockSchemaContract(schema) {
  const required = new Set(schema.required ?? []);
  const assetRequired = new Set(schema.$defs?.asset?.required ?? []);
  const runtimeRequired = new Set(schema.$defs?.runtime?.required ?? []);
  const sourceRequired = new Set(schema.$defs?.source?.required ?? []);
  const violations = [];

  for (const field of ["schemaVersion", "project", "sourceGitSha", "assets"]) {
    if (!required.has(field)) violations.push(`root.${field}`);
  }
  for (const field of ["assetId", "kind", "version", "source", "runtime", "lineage"]) {
    if (!assetRequired.has(field)) violations.push(`asset.${field}`);
  }
  for (const field of ["tier", "delivery", "location", "sha256", "bytes", "cacheVersion"]) {
    if (!runtimeRequired.has(field)) violations.push(`runtime.${field}`);
  }
  for (const field of ["storage", "path", "sha256", "bytes"]) {
    if (!sourceRequired.has(field)) violations.push(`source.${field}`);
  }
  const lfsConditional = (schema.$defs?.source?.allOf ?? []).find(
    (entry) => (
      entry.if?.properties?.storage?.const === "git-lfs-asset-repository"
    ),
  );
  const lfsRequired = new Set(lfsConditional?.then?.required ?? []);
  for (const field of ["repository", "revision"]) {
    if (!lfsRequired.has(field)) violations.push(`source.lfs.${field}`);
  }
  const cdnConditional = (schema.$defs?.runtime?.allOf ?? []).find(
    (entry) => entry.if?.properties?.delivery?.const === "cdn",
  );
  const cdnRequired = new Set(cdnConditional?.then?.required ?? []);
  if (!cdnRequired.has("fallbackLocation")) {
    violations.push("runtime.cdn.fallbackLocation");
  }
  const cdnLocationPattern =
    cdnConditional?.then?.properties?.location?.pattern ?? "";
  if (!cdnLocationPattern.includes("/cdn/sha256/")) {
    violations.push("runtime.cdn.location");
  }
  return {
    passed: violations.length === 0,
    violations,
  };
}

export function validateAssetLockDocument(lock, schema) {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictRequired: false,
  });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const passed = validate(lock);
  const violations = (validate.errors ?? []).map((error) => ({
    code: `asset-lock-schema-${error.keyword}`,
    path: `root${error.instancePath}`,
    message: error.message ?? "不符合 asset lock schema",
  }));
  return {
    passed,
    violations,
  };
}

async function loadInputs(policyPath = DEFAULT_POLICY_PATH) {
  const policy = JSON.parse(await readFile(policyPath, "utf8"));
  return {
    policy,
    policyPath,
  };
}

function loadJsonAtRef(root, ref, filePath) {
  const relativePath = normalizePath(path.relative(root, filePath));
  const content = tryGit(root, ["show", `${ref}:${relativePath}`]);
  return content === null ? null : JSON.parse(content);
}

function loadBaselineAtRef(root, ref, baselinePath) {
  return loadJsonAtRef(root, ref, baselinePath);
}

function resolveCommit(root, ref) {
  return git(root, ["rev-parse", `${ref}^{commit}`]).trim();
}

function validateBaselineAgainstGit({
  root,
  policy,
  baseline,
}) {
  const sourceGitSha = resolveCommit(root, baseline.sourceGitSha);
  const treeEntries = collectTreeInventoryMetadata({
    root,
    ref: sourceGitSha,
    policy,
  });
  return validateBaselineSnapshot({
    baseline,
    sourceGitSha,
    treeEntries,
  });
}

function printViolations(title, violations) {
  process.stderr.write(`${title}\n`);
  for (const violation of violations) {
    process.stderr.write(
      `- [${violation.code}] ${violation.path}: ${violation.message}\n`,
    );
  }
}

async function runCli() {
  const writeBaseline = process.argv.includes("--write-baseline");
  const jsonOutput = process.argv.includes("--json");
  const {
    policy: workingPolicy,
    policyPath,
  } = await loadInputs();
  if (existsSync(DEFAULT_ASSET_LOCK_PATH)) {
    const assetLockSchema = JSON.parse(
      await readFile(DEFAULT_ASSET_LOCK_SCHEMA_PATH, "utf8"),
    );
    const schemaValidation = validateAssetLockSchemaContract(assetLockSchema);
    if (!schemaValidation.passed) {
      printViolations(
        "asset lock schema 合同无效：",
        schemaValidation.violations.map((targetPath) => ({
          code: "asset-lock-schema",
          path: targetPath,
          message: "缺少必要 schema 约束",
        })),
      );
      process.exitCode = 1;
      return;
    }
    const assetLock = JSON.parse(
      await readFile(DEFAULT_ASSET_LOCK_PATH, "utf8"),
    );
    const assetLockValidation = validateAssetLockDocument(
      assetLock,
      assetLockSchema,
    );
    if (!assetLockValidation.passed) {
      printViolations(
        "asset lock 实例无效：",
        assetLockValidation.violations,
      );
      process.exitCode = 1;
      return;
    }
  }
  const trustedRef = process.env.BINARY_POLICY_BASE_REF?.trim();
  const trustedGitSha = !writeBaseline && trustedRef
    ? resolveCommit(PROJECT_ROOT, trustedRef)
    : null;
  const trustedPolicy = trustedGitSha
    ? loadJsonAtRef(PROJECT_ROOT, trustedGitSha, policyPath)
    : null;
  const policy = buildEnforcementPolicy({
    workingPolicy,
    trustedPolicy,
  });
  const baselinePath = path.join(PROJECT_ROOT, policy.baselinePath);
  const currentEntries = await collectCurrentInventory({
    root: PROJECT_ROOT,
    policy,
  });

  if (writeBaseline) {
    const previousBaseline =
      loadBaselineAtRef(PROJECT_ROOT, "HEAD", baselinePath)
      ?? (
        existsSync(baselinePath)
          ? JSON.parse(await readFile(baselinePath, "utf8"))
          : null
      );
    const updateCheck = evaluateBaselineUpdate({
      policy,
      previousBaseline,
      currentEntries,
    });
    if (!updateCheck.passed) {
      process.stderr.write(
        "拒绝更新二进制基线；请先处理以下越界，"
        + "不能用重生成基线绕过门禁：\n",
      );
      for (const violation of updateCheck.violations) {
        process.stderr.write(
          `- [${violation.code}] ${violation.path}: ${violation.message}\n`,
        );
      }
      process.exitCode = 1;
      return;
    }

    const headTreeEntries = collectTreeInventoryMetadata({
      root: PROJECT_ROOT,
      ref: "HEAD",
      policy,
    });
    const controlledPaths = new Set([
      ...currentEntries.map((entry) => entry.path),
      ...headTreeEntries.map((entry) => entry.path),
    ]);
    const changedControlledPaths = git(PROJECT_ROOT, [
      "diff",
      "--name-only",
      "-z",
      "HEAD",
      "--",
    ])
      .split("\0")
      .filter(Boolean)
      .filter((relativePath) => (
        controlledPaths.has(relativePath)
        || classifyRepositoryPath(relativePath, policy)
      ));
    if (changedControlledPaths.length > 0) {
      printViolations(
        "拒绝生成二进制基线；受控文件必须先形成可引用的 Git 提交：",
        changedControlledPaths.map((relativePath) => ({
          code: "baseline-source-not-committed",
          path: relativePath,
          message: "当前内容不属于 HEAD，无法建立可信 sourceGitSha",
        })),
      );
      process.exitCode = 1;
      return;
    }

    const sourceGitSha = git(PROJECT_ROOT, ["rev-parse", "HEAD"]).trim();
    const historyLargeObjects = collectHistoryLargeObjects({
      root: PROJECT_ROOT,
      policy,
    });
    const baseline = createBaseline({
      sourceGitSha,
      sourceRef: policy.baselineRef,
      entries: currentEntries,
      historyLargeObjects,
    });
    await writeFile(
      baselinePath,
      `${JSON.stringify(baseline, null, 2)}\n`,
      "utf8",
    );
    process.stdout.write(
      `二进制基线已生成：${path.relative(PROJECT_ROOT, baselinePath)}\n`
      + `当前文件：${baseline.summary.currentFiles} / `
      + `${formatBytes(baseline.summary.currentBytes)}\n`
      + `历史大对象：${baseline.summary.historyLargeObjects} / `
      + `${formatBytes(baseline.summary.historyLargeObjectBytes)}\n`,
    );
    return;
  }

  const workingBaseline = JSON.parse(await readFile(baselinePath, "utf8"));
  const workingValidation = validateBaselineAgainstGit({
    root: PROJECT_ROOT,
    policy,
    baseline: workingBaseline,
  });
  if (!workingValidation.passed) {
    printViolations(
      "二进制基线与其声明的 Git 快照不一致：",
      workingValidation.violations,
    );
    process.exitCode = 1;
    return;
  }

  let baseline = workingBaseline;
  if (trustedGitSha) {
    const trustedBaseline = loadBaselineAtRef(
      PROJECT_ROOT,
      trustedGitSha,
      baselinePath,
    );
    if (trustedBaseline) {
      const trustedValidation = validateBaselineAgainstGit({
        root: PROJECT_ROOT,
        policy,
        baseline: trustedBaseline,
      });
      if (!trustedValidation.passed) {
        printViolations(
          "可信 Git 基线自身无效：",
          trustedValidation.violations,
        );
        process.exitCode = 1;
        return;
      }
      baseline = trustedBaseline;
    } else if (workingBaseline.sourceGitSha !== trustedGitSha) {
      printViolations(
        "基分支尚无二进制基线，当前基线必须精确对应基分支快照：",
        [{
          code: "untrusted-initial-baseline",
          path: path.relative(PROJECT_ROOT, baselinePath),
          message:
            `sourceGitSha 应为 ${trustedGitSha}，`
            + `实际为 ${workingBaseline.sourceGitSha}`,
        }],
      );
      process.exitCode = 1;
      return;
    }
  } else {
    baseline =
      loadBaselineAtRef(PROJECT_ROOT, "HEAD", baselinePath)
      ?? workingBaseline;
  }

  const result = evaluateBinaryPolicy({
    policy,
    baseline,
    currentEntries,
  });
  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (result.passed) {
    process.stdout.write(
      `二进制仓库门禁通过：${result.currentSummary.files} 个受控文件，`
      + `${formatBytes(result.currentSummary.bytes)}。\n`,
    );
  } else {
    process.stderr.write("二进制仓库门禁失败：\n");
    for (const violation of result.violations) {
      process.stderr.write(
        `- [${violation.code}] ${violation.path}: ${violation.message}\n`,
      );
    }
  }
  process.exitCode = result.passed ? 0 : 1;
}

const invokedPath = process.argv[1]
  ? path.resolve(process.argv[1])
  : null;
if (invokedPath === SCRIPT_PATH) {
  await runCli();
}
