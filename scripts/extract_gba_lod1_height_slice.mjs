import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, readFile, stat, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const TAIL_LENGTH = 1024;

function argumentValue(argumentsList, flag) {
  const index = argumentsList.indexOf(flag);
  return index >= 0 ? argumentsList[index + 1] : null;
}

function requiredArgument(argumentsList, flag) {
  const value = argumentValue(argumentsList, flag);
  if (!value) throw new Error(`缺少必需参数 ${flag}`);
  return value;
}

async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function ensureNewOutput(path) {
  try {
    await access(path);
    throw new Error(`输出已存在，按原始数据保留规则拒绝覆盖：${path}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function extractGbaLod1HeightSlice({
  sourcePath,
  evidencePath,
  outputPath,
  expectedSha256,
}) {
  await ensureNewOutput(outputPath);
  const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  const targetRecords = evidence.records.filter((record) => record.confidence === "C");
  const targetByGbaId = new Map(targetRecords.map((record) => {
    const match = /^(?:way|relation)\/(\d+)$/.exec(record.osmRef);
    return [`osm${match?.[1]}CHN`, record.osmRef];
  }));
  const matches = new Map();
  const pattern = /"(osm\d+CHN)"\s*:\s*\{\s*"height"\s*:\s*([-+0-9.eE]+)\s*,\s*"var"\s*:\s*([-+0-9.eE]+)\s*\}/g;
  let carry = "";
  for await (const chunk of createReadStream(sourcePath, { encoding: "utf8" })) {
    const buffer = carry + chunk;
    pattern.lastIndex = 0;
    for (const match of buffer.matchAll(pattern)) {
      const osmRef = targetByGbaId.get(match[1]);
      if (!osmRef || matches.has(osmRef)) continue;
      const heightMetres = Number.parseFloat(match[2]);
      const uncertaintyVariance = Number.parseFloat(match[3]);
      matches.set(osmRef, {
        osmRef,
        featureId: match[1],
        heightMetres,
        uncertaintyVariance,
        uncertaintyStandardDeviationMetres: Math.sqrt(Math.max(0, uncertaintyVariance)),
      });
    }
    carry = buffer.slice(-TAIL_LENGTH);
  }

  const [sourceSha256, sourceStat] = await Promise.all([
    sha256File(sourcePath),
    stat(sourcePath),
  ]);
  if (expectedSha256 && sourceSha256 !== expectedSha256) {
    throw new Error(`GBA 原始文件 SHA-256 不一致：${sourceSha256}`);
  }
  const output = {
    schemaVersion: 1,
    dataset: "GlobalBuildingAtlas GBA.LoD1",
    release: "v1.0.0",
    productImageryYear: "2018-2019",
    licence: "CC-BY-NC-4.0",
    citation: "https://doi.org/10.14459/2025mp1782307",
    source: {
      file: basename(sourcePath),
      sourceSha256,
      sourceBytes: sourceStat.size,
      officialLfsSha256: expectedSha256,
      repositoryCommit: "9da24b3a8dce436a7420d5c3589de718d7ba14d6",
      tile: "e120_n35_e125_n30",
      readonlyOriginal: true,
    },
    targetConfidence: "C",
    targetRecordCount: targetRecords.length,
    matchedRecordCount: matches.size,
    records: [...matches.values()].sort((left, right) => (
      left.osmRef.localeCompare(right.osmRef)
    )),
  };
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  return output;
}

const argumentsList = process.argv.slice(2);
const output = await extractGbaLod1HeightSlice({
  sourcePath: resolve(requiredArgument(argumentsList, "--source")),
  evidencePath: resolve(
    PROJECT_ROOT,
    argumentValue(argumentsList, "--evidence")
      ?? "docs/research/building-height-evidence.json",
  ),
  outputPath: resolve(PROJECT_ROOT, requiredArgument(argumentsList, "--output")),
  expectedSha256: argumentValue(argumentsList, "--sha256"),
});

process.stdout.write(`${JSON.stringify({
  dataset: output.dataset,
  targetRecordCount: output.targetRecordCount,
  matchedRecordCount: output.matchedRecordCount,
  sourceSha256: output.source.sourceSha256,
}, null, 2)}\n`);
