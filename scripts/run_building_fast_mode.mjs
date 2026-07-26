#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(
  root,
  "docs/research/building-pipeline-fast-mode.json",
);

function parseArguments(argv) {
  const result = {
    buildingIds: [],
    list: false,
    plan: false,
    full: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--building") {
      const value = argv[index + 1];
      if (!value) throw new Error("--building 后必须提供 stable asset ID");
      result.buildingIds.push(value);
      index += 1;
    } else if (argument === "--batch") {
      const value = argv[index + 1];
      if (!value) throw new Error("--batch 后必须提供逗号分隔的 stable asset ID");
      result.buildingIds.push(...value.split(",").map((item) => item.trim()).filter(Boolean));
      index += 1;
    } else if (argument === "--list") {
      result.list = true;
    } else if (argument === "--plan") {
      result.plan = true;
    } else if (argument === "--full") {
      result.full = true;
    } else if (argument === "--help" || argument === "-h") {
      result.help = true;
    } else {
      throw new Error(`未知参数：${argument}`);
    }
  }
  result.buildingIds = [...new Set(result.buildingIds)];
  return result;
}

function printHelp() {
  console.log(`18 栋建筑 Fast Mode

用法：
  npm run building:fast -- --list
  npm run building:fast -- --building <asset-id>
  npm run building:fast -- --batch <id-1,id-2,id-3>
  npm run building:fast -- --batch <id-1,id-2,id-3> --plan
  npm run building:fast -- --batch <id-1,id-2,id-3> --full

说明：
  默认只跑所选建筑的专项测试、范围守卫和 GLB 结构审计。
  --full 仅供主窗口在整合 2～3 栋后使用，会额外执行一次完整 npm test 和 lint。
  --plan 只打印命令与 QA 直达入口，不执行检查。`);
}

async function loadManifest() {
  return JSON.parse(await readFile(manifestPath, "utf8"));
}

async function loadStopPolicy(manifest) {
  const stopPolicyPath = path.join(root, manifest.stopPolicyPath);
  return JSON.parse(await readFile(stopPolicyPath, "utf8"));
}

async function validateManifest(manifest) {
  if (manifest.scopeCount !== 18 || manifest.buildings.length !== 18) {
    throw new Error("Fast Mode manifest 必须严格包含 18 栋建筑");
  }
  if (!manifest.stopPolicyPath) {
    throw new Error("Fast Mode manifest 缺少 stopPolicyPath");
  }
  const ids = manifest.buildings.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Fast Mode manifest 存在重复 stable asset ID");
  }
  for (const holdId of manifest.holdAssetIds) {
    if (ids.includes(holdId)) {
      throw new Error(`Hold 资产不得进入 Fast Mode：${holdId}`);
    }
  }
}

function validateAttempt(value, limit, label, buildingId) {
  if (!Number.isInteger(value) || value < 0 || value > limit) {
    throw new Error(
      `${buildingId} 的 ${label} 次数必须是 0～${limit} 的整数`,
    );
  }
}

function validateStopPolicy(manifest, stopPolicy) {
  if (
    stopPolicy.scopeCount !== 18 ||
    stopPolicy.buildings.length !== manifest.buildings.length
  ) {
    throw new Error("止损策略必须严格覆盖 18 栋建筑");
  }
  if (
    stopPolicy.limits?.localPrimaryPasses !== 1 ||
    stopPolicy.limits?.xiaohongshuPasses !== 1
  ) {
    throw new Error("证据止损上限必须是本地/官方一轮、小红书一轮");
  }
  if (
    stopPolicy.storage?.buildingEvidenceRoot !==
      "/Volumes/plugin/3D_Modeling_ThreeJS_Knowledge_Base/wander-xinhua/building-evidence" ||
    stopPolicy.storage?.wikiIngestion !== false
  ) {
    throw new Error("单栋建筑证据必须只存 U 盘 building-evidence，且禁止接入 Wiki");
  }

  const manifestIds = manifest.buildings.map(({ id }) => id).sort();
  const policyIds = stopPolicy.buildings.map(({ id }) => id).sort();
  if (new Set(policyIds).size !== policyIds.length) {
    throw new Error("止损策略存在重复 stable asset ID");
  }
  if (manifestIds.join("\n") !== policyIds.join("\n")) {
    throw new Error("止损策略与 Fast Mode 18 栋白名单不一致");
  }

  const allowedStates = new Set([
    "active",
    "complete",
    "research-only",
    "terminal-disabled",
  ]);
  for (const building of stopPolicy.buildings) {
    if (!allowedStates.has(building.state)) {
      throw new Error(`${building.id} 的止损状态无效：${building.state}`);
    }
    if (building.preserveFiles !== true) {
      throw new Error(`${building.id} 必须明确 preserveFiles=true`);
    }
    validateAttempt(
      building.attempts?.localPrimary,
      stopPolicy.limits.localPrimaryPasses,
      "本地/官方救援",
      building.id,
    );
    validateAttempt(
      building.attempts?.xiaohongshu,
      stopPolicy.limits.xiaohongshuPasses,
      "小红书救援",
      building.id,
    );

    if (building.state === "research-only") {
      if (
        building.attempts.localPrimary !== 1 ||
        building.attempts.xiaohongshu !== 0 ||
        building.nextAction !== "xiaohongshu-once" ||
        building.allowAssetWork !== false
      ) {
        throw new Error(
          `${building.id} 的 research-only 状态必须只剩一次小红书搜索，且禁止资产返工`,
        );
      }
    }
    if (building.state === "active") {
      if (
        building.attempts.localPrimary !== 1 ||
        building.attempts.xiaohongshu !== 1 ||
        building.nextAction !== "none" ||
        building.allowAssetWork !== true
      ) {
        throw new Error(
          `${building.id} 的 active 状态必须有已保存的强证据，并只恢复被阻塞阶段`,
        );
      }
    }
    if (building.state === "terminal-disabled") {
      if (
        building.attempts.xiaohongshu !== 1 ||
        building.nextAction !== "none" ||
        building.terminalAction !== "disable-runtime-preserve-files" ||
        building.allowAssetWork !== false
      ) {
        throw new Error(
          `${building.id} 的终止状态必须关闭运行时、保留文件并禁止资产返工`,
        );
      }
    }
    if (building.state === "complete" && building.nextAction !== "none") {
      throw new Error(`${building.id} 已完成，不得再安排证据救援`);
    }
  }
}

async function validateSelectionFiles(manifest, selected) {
  if (selected.length === 0) return;
  const referencedFiles = new Set([
    ...manifest.sharedTests,
    ...selected.flatMap(({ tests, glbs }) => [...tests, ...glbs]),
  ]);
  for (const relativePath of referencedFiles) {
    await access(path.join(root, relativePath));
  }
}

function formatCommand(command) {
  return [command.bin, ...command.args].join(" ");
}

function runCommand(command) {
  console.log(`\n▶ ${command.label}`);
  console.log(`  ${formatCommand(command)}`);
  const result = spawnSync(command.bin, command.args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command.label} 失败，退出码 ${result.status}`);
  }
}

function buildCommands(manifest, selected, full) {
  if (selected.length === 0) return [];
  const tests = [...new Set([
    ...manifest.sharedTests,
    ...selected.flatMap(({ tests: buildingTests }) => buildingTests),
  ])];
  const glbs = [...new Set(selected.flatMap(({ glbs }) => glbs))];
  const commands = [
    {
      label: "建筑专项测试与范围守卫",
      bin: process.execPath,
      args: ["--test", ...tests],
    },
    {
      label: "所选建筑 GLB 结构审计",
      bin: "python3",
      args: ["scripts/audit_glb.py", ...glbs],
    },
  ];
  if (full) {
    commands.push(
      {
        label: "批次项目级完整回归",
        bin: "npm",
        args: ["test"],
      },
      {
        label: "批次项目级 lint",
        bin: "npm",
        args: ["run", "lint"],
      },
    );
  }
  return commands;
}

function printSelection(selected, runnable, commands, plan, stopPolicyById) {
  const mode = plan ? "计划预览" : "执行";
  console.log(`\nFast Mode ${mode}：${selected.map(({ id }) => id).join(", ")}`);
  console.log("\n证据止损门：");
  for (const building of selected) {
    const policy = stopPolicyById.get(building.id);
    const attempts =
      `local/primary=${policy.attempts.localPrimary}/1, ` +
      `xiaohongshu=${policy.attempts.xiaohongshu}/1`;
    console.log(
      `- ${building.id}: ${policy.state}; ${attempts}; next=${policy.nextAction}`,
    );
    if (policy.state === "research-only") {
      console.log(
        "  STOP：进入唯一连续小红书证据阶段，可慢速查看多个查询和候选直到强证据或检索穷尽；期间禁止建模、MCP、GLB 重建和运行时晋级。",
      );
    } else if (policy.state === "terminal-disabled") {
      console.log(
        "  STOP：运行时入口应关闭，源文件、GLB、证据与 Hold 成果必须保留。",
      );
    }
  }
  console.log(
    `\n可执行专项检查：${runnable.map(({ id }) => id).join(", ") || "无"}`,
  );
  for (const command of commands) {
    console.log(`- ${command.label}: ${formatCommand(command)}`);
  }
  if (commands.length === 0) {
    console.log("- 本批全部命中止损门，不执行专项测试、GLB 审计或全仓回归。");
  }
  console.log("\nQA 直达入口（需先启动本地预览）：");
  for (const building of runnable) {
    for (const route of building.runtimeRoutes) {
      console.log(`- ${building.id}: ${route}`);
    }
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const manifest = await loadManifest();
  await validateManifest(manifest);
  const stopPolicy = await loadStopPolicy(manifest);
  validateStopPolicy(manifest, stopPolicy);
  const stopPolicyById = new Map(
    stopPolicy.buildings.map((building) => [building.id, building]),
  );

  if (options.list) {
    for (const building of manifest.buildings) {
      const policy = stopPolicyById.get(building.id);
      console.log(
        `${building.id}\t${building.label}\t${policy.state}\t${building.tests.length} tests\t${building.glbs.length} GLB`,
      );
    }
    return;
  }
  if (options.buildingIds.length === 0) {
    printHelp();
    throw new Error("必须使用 --building 或 --batch 选择建筑");
  }
  if (options.buildingIds.length > manifest.maxParallelBuildings) {
    throw new Error(
      `一次最多选择 ${manifest.maxParallelBuildings} 栋，当前为 ${options.buildingIds.length} 栋`,
    );
  }
  const buildingById = new Map(manifest.buildings.map((building) => [building.id, building]));
  const unknownIds = options.buildingIds.filter((id) => !buildingById.has(id));
  if (unknownIds.length > 0) {
    throw new Error(`不在 18 栋白名单：${unknownIds.join(", ")}`);
  }
  const selected = options.buildingIds.map((id) => buildingById.get(id));
  const runnable = selected.filter((building) => {
    const state = stopPolicyById.get(building.id).state;
    return state === "active" || state === "complete";
  });
  await validateSelectionFiles(manifest, runnable);
  const commands = buildCommands(manifest, runnable, options.full);
  printSelection(
    selected,
    runnable,
    commands,
    options.plan,
    stopPolicyById,
  );
  if (options.plan) return;
  if (commands.length === 0) {
    console.log("\n✓ 止损门已生效，已跳过重复资产工作");
    return;
  }
  for (const command of commands) runCommand(command);
  console.log("\n✓ Fast Mode 检查通过");
}

main().catch((error) => {
  console.error(`\nFast Mode 失败：${error.message}`);
  process.exitCode = 1;
});
