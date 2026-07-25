import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { createInterface } from "node:readline";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");

function argumentValue(argumentsList, flag) {
  const index = argumentsList.indexOf(flag);
  return index >= 0 ? argumentsList[index + 1] : null;
}

function requiredArgument(argumentsList, flag) {
  const value = argumentValue(argumentsList, flag);
  if (!value) throw new Error(`缺少必需参数 ${flag}`);
  return value;
}

function parseBbox(value) {
  const values = String(value).split(",").map(Number);
  if (values.length !== 4 || values.some((number) => !Number.isFinite(number))) {
    throw new Error("--bbox 必须是 minLon,minLat,maxLon,maxLat");
  }
  const [minLon, minLat, maxLon, maxLat] = values;
  if (minLon >= maxLon || minLat >= maxLat) {
    throw new Error("--bbox 的最小值必须小于最大值");
  }
  return { minLon, minLat, maxLon, maxLat };
}

function numericValue(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : null;
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

async function extractGhsObatHeightSlice({
  archivePath,
  csvName,
  outputPath,
  bbox,
}) {
  await ensureNewOutput(outputPath);
  const archiveSha256 = await sha256File(archivePath);
  const unzip = spawn("unzip", ["-p", archivePath, csvName], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  unzip.stderr.setEncoding("utf8");
  unzip.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const rows = createInterface({
    input: unzip.stdout,
    crlfDelay: Infinity,
  });
  let header = null;
  let sourceRecordCount = 0;
  const records = [];
  for await (const line of rows) {
    if (!header) {
      header = line.split(",");
      continue;
    }
    sourceRecordCount += 1;
    const values = line.split(",");
    const row = Object.fromEntries(header.map((key, index) => [key, values[index]]));
    const longitude = numericValue(row.lon);
    const latitude = numericValue(row.lat);
    if (
      longitude === null
      || latitude === null
      || longitude < bbox.minLon
      || longitude > bbox.maxLon
      || latitude < bbox.minLat
      || latitude > bbox.maxLat
    ) {
      continue;
    }
    records.push({
      id: row.id,
      longitude,
      latitude,
      country: row.country,
      adm1: row.adm1,
      heightMetres: numericValue(row.height),
      shapeFactor: numericValue(row.shapefactor),
      useClass: numericValue(row.use),
      epochClass: numericValue(row.epoch),
      areaSquareMetres: numericValue(row.area),
      perimeterMetres: numericValue(row.perimeter),
    });
  }

  const exitCode = await new Promise((resolveExit) => {
    unzip.once("close", resolveExit);
  });
  if (exitCode !== 0) {
    throw new Error(`unzip 失败，exit=${exitCode}: ${stderr.trim()}`);
  }

  const output = {
    schemaVersion: 1,
    dataset: "GHS-OBAT R2024A",
    productEpoch: 2020,
    release: "R2024A V1.0",
    licence: "ODbL-1.0",
    citation: "https://doi.org/10.2905/f41a22f1-5741-4c41-86eb-6384654f6927",
    source: {
      archive: basename(archivePath),
      archiveSha256,
      archiveBytes: 157865361,
      csvName,
      upstreamBuildingRelease: "Overture Buildings 2024-07-22.0",
      readonlyOriginal: true,
    },
    extractBounds: bbox,
    sourceRecordCount,
    extractedRecordCount: records.length,
    records,
  };
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  return output;
}

const argumentsList = process.argv.slice(2);
const output = await extractGhsObatHeightSlice({
  archivePath: resolve(requiredArgument(argumentsList, "--archive")),
  csvName: requiredArgument(argumentsList, "--csv-name"),
  outputPath: resolve(PROJECT_ROOT, requiredArgument(argumentsList, "--output")),
  bbox: parseBbox(requiredArgument(argumentsList, "--bbox")),
});

process.stdout.write(`${JSON.stringify({
  dataset: output.dataset,
  sourceRecordCount: output.sourceRecordCount,
  extractedRecordCount: output.extractedRecordCount,
  archiveSha256: output.source.archiveSha256,
}, null, 2)}\n`);
