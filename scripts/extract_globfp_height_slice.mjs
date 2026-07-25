import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import * as shapefile from "shapefile";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");

function argumentValue(argumentsList, flag) {
  const index = argumentsList.indexOf(flag);
  return index >= 0 ? argumentsList[index + 1] : undefined;
}

function parseBbox(value) {
  const numbers = String(value ?? "")
    .split(",")
    .map((part) => Number.parseFloat(part));
  if (numbers.length !== 4 || numbers.some((number) => !Number.isFinite(number))) {
    throw new Error("--bbox 必须是 minLon,minLat,maxLon,maxLat");
  }
  const [minLon, minLat, maxLon, maxLat] = numbers;
  if (minLon >= maxLon || minLat >= maxLat) {
    throw new Error("--bbox 的最小值必须小于最大值");
  }
  return { minLon, minLat, maxLon, maxLat };
}

function geometryBounds(geometry) {
  const bounds = {
    minLon: Infinity,
    minLat: Infinity,
    maxLon: -Infinity,
    maxLat: -Infinity,
  };
  function visit(value) {
    if (
      Array.isArray(value)
      && value.length >= 2
      && Number.isFinite(value[0])
      && Number.isFinite(value[1])
    ) {
      bounds.minLon = Math.min(bounds.minLon, value[0]);
      bounds.minLat = Math.min(bounds.minLat, value[1]);
      bounds.maxLon = Math.max(bounds.maxLon, value[0]);
      bounds.maxLat = Math.max(bounds.maxLat, value[1]);
      return;
    }
    if (Array.isArray(value)) value.forEach(visit);
  }
  visit(geometry?.coordinates);
  return bounds;
}

function intersects(left, right) {
  return !(
    left.maxLon < right.minLon
    || left.minLon > right.maxLon
    || left.maxLat < right.minLat
    || left.minLat > right.maxLat
  );
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function ensureNewOutput(output) {
  try {
    await access(output);
    throw new Error(`输出已存在，按原始数据保留规则拒绝覆盖：${output}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

export async function extractGlobfpHeightSlice({
  shapefilePath,
  outputPath,
  bbox,
  sourceArchive,
  sourceArchiveMd5,
}) {
  const source = await shapefile.open(shapefilePath);
  const features = [];
  let sourceFeatureCount = 0;
  while (true) {
    const { done, value } = await source.read();
    if (done) break;
    sourceFeatureCount += 1;
    const bounds = geometryBounds(value.geometry);
    if (!intersects(bounds, bbox)) continue;
    features.push({
      type: "Feature",
      id: value.id ?? null,
      properties: value.properties ?? {},
      geometry: value.geometry,
      sourceFeatureIndex: sourceFeatureCount - 1,
      bounds,
    });
  }

  const sourceBytes = await readFile(shapefilePath);
  const output = {
    schemaVersion: 1,
    dataset: "3D-GloBFP",
    productYear: 2020,
    licence: "CC-BY-4.0",
    citation: "https://doi.org/10.5281/zenodo.11397014",
    gridId: 2435,
    gridBounds: {
      minLon: 121.25,
      minLat: 30,
      maxLon: 122.5,
      maxLat: 31.25,
    },
    source: {
      shapefile: basename(shapefilePath),
      shapefileSha256: sha256(sourceBytes),
      archive: sourceArchive,
      archiveMd5: sourceArchiveMd5,
    },
    extractBounds: bbox,
    sourceFeatureCount,
    extractedFeatureCount: features.length,
    features,
  };
  await ensureNewOutput(outputPath);
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  return output;
}

async function run() {
  const argumentsList = process.argv.slice(2);
  const shapefileValue = argumentValue(argumentsList, "--shapefile");
  const outputValue = argumentValue(argumentsList, "--output");
  if (!shapefileValue || !outputValue) {
    throw new Error("必须提供 --shapefile 与 --output");
  }
  const output = await extractGlobfpHeightSlice({
    shapefilePath: resolve(PROJECT_ROOT, shapefileValue),
    outputPath: resolve(PROJECT_ROOT, outputValue),
    bbox: parseBbox(argumentValue(argumentsList, "--bbox")),
    sourceArchive: argumentValue(argumentsList, "--source-archive") ?? null,
    sourceArchiveMd5: argumentValue(argumentsList, "--source-archive-md5") ?? null,
  });
  process.stdout.write(`${JSON.stringify({
    dataset: output.dataset,
    gridId: output.gridId,
    sourceFeatureCount: output.sourceFeatureCount,
    extractedFeatureCount: output.extractedFeatureCount,
    sourceSha256: output.source.shapefileSha256,
  }, null, 2)}\n`);
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await run();
}
