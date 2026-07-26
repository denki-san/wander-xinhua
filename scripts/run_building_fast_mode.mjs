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

const EXPECTED_REMAINING_BUILDING_IDS = [
  "shanghai-cinema",
  "xinhua-villas-211",
  "xinhua-villas-329",
  "shanghai-orchestra",
  "xinhua-community-center",
  "debi-fahua-525",
  "fahua-heritage",
  "fics-xinhua-365",
  "xingfuli-west",
  "xingfuli-east",
];

const EXPECTED_COMPLETED_BUILDING_IDS = [
  "film-art-center",
  "one-step-garden",
  "house-315",
  "villa-le-bec",
  "hudec-memorial",
  "xinhua-pocket-park",
  "xingfuli-center",
  "sun-ke-villa",
];

const EXPECTED_HOLD_ASSET_IDS = [
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

function assertExactIds(label, actualIds, expectedIds) {
  const actual = [...actualIds].sort();
  const expected = [...expectedIds].sort();
  if (
    actual.length !== expected.length
    || actual.some((id, index) => id !== expected[index])
  ) {
    throw new Error(`${label}与当前 main 的冻结白名单不一致`);
  }
}

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
      result.buildingIds.push(
        ...value.split(",").map((item) => item.trim()).filter(Boolean),
      );
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
  console.log(`剩余 10 栋建筑 Fast Mode

用法：
  npm run building:fast -- --list
  npm run building:fast -- --building <asset-id>
  npm run building:fast -- --batch <id-1,id-2,id-3>
  npm run building:fast -- --batch <id-1,id-2,id-3> --plan
  npm run building:fast -- --batch <id-1,id-2,id-3> --full

说明：
  默认只运行所选建筑的专项测试、共享范围守卫和 GLB 结构审计。
  --full 仅供主窗口整合 2～3 栋后使用，会额外执行一次 npm test 和 lint。
  --plan 只打印命令与 QA 直达入口，不执行检查。`);
}

async function loadManifest() {
  return JSON.parse(await readFile(manifestPath, "utf8"));
}

async function validateManifest(manifest) {
  if (
    manifest.schemaVersion !== 2
    || manifest.scopeCount !== 10
    || manifest.buildings.length !== 10
  ) {
    throw new Error("Fast Mode manifest 必须使用 schema v2 并严格包含剩余 10 栋");
  }

  const ids = manifest.buildings.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Fast Mode manifest 存在重复 stable asset ID");
  }

  assertExactIds("剩余 10 栋", ids, EXPECTED_REMAINING_BUILDING_IDS);
  assertExactIds(
    "已完成 8 栋",
    manifest.completedBuildingIds,
    EXPECTED_COMPLETED_BUILDING_IDS,
  );
  assertExactIds("Hold 资产", manifest.holdAssetIds, EXPECTED_HOLD_ASSET_IDS);

  const referencedFiles = new Set([
    ...manifest.sharedTests,
    ...manifest.buildings.flatMap(({ tests, glbs }) => [...tests, ...glbs]),
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

function printSelection(selected, commands, plan) {
  const mode = plan ? "计划预览" : "执行";
  console.log(`\nFast Mode ${mode}：${selected.map(({ id }) => id).join(", ")}`);
  for (const command of commands) {
    console.log(`- ${command.label}: ${formatCommand(command)}`);
  }
  console.log("\nQA 直达入口（需先启动本地预览）：");
  for (const building of selected) {
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

  if (options.list) {
    for (const building of manifest.buildings) {
      console.log(
        `${building.id}\t${building.label}\t${building.tests.length} tests\t${building.glbs.length} GLB`,
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

  const buildingById = new Map(
    manifest.buildings.map((building) => [building.id, building]),
  );
  const unknownIds = options.buildingIds.filter((id) => !buildingById.has(id));
  if (unknownIds.length > 0) {
    throw new Error(`不在剩余 10 栋白名单：${unknownIds.join(", ")}`);
  }

  const selected = options.buildingIds.map((id) => buildingById.get(id));
  const commands = buildCommands(manifest, selected, options.full);
  printSelection(selected, commands, options.plan);
  if (options.plan) return;

  for (const command of commands) runCommand(command);
  console.log("\n✓ Fast Mode 检查通过");
}

main().catch((error) => {
  console.error(`\nFast Mode 失败：${error.message}`);
  process.exitCode = 1;
});
