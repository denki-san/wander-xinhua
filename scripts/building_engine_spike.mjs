#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";


const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CASES_ROOT = join(ROOT, "building-engine/cases");
const SCHEMA_PATH = join(ROOT, "building-engine/schema/building-dsl.schema.json");
const PROFILE_PATH = join(
  ROOT,
  "building-engine/art-profiles/xinhua-autumn-lowpoly-v1.json",
);
const COMPILER_PATH = join(ROOT, "scripts/compile_garden_villa.py");
const DEFAULT_BLENDER = "/Applications/Blender.app/Contents/MacOS/Blender";


function fail(message, details = undefined) {
  const error = new Error(message);
  error.details = details;
  throw error;
}


function parseCli(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    if (!item.startsWith("--")) fail(`无法识别参数：${item}`);
    const key = item.slice(2);
    const next = rest[index + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = true;
    }
  }
  return { command, options };
}


function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}


function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}


function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}


function sha256File(path) {
  return sha256Bytes(readFileSync(path));
}


function repoPath(path) {
  return relative(ROOT, path).split(sep).join("/");
}


function resolveInRepo(path) {
  const candidate = resolve(ROOT, path);
  const rel = relative(ROOT, candidate);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    fail(`路径越出当前仓库：${path}`);
  }
  return candidate;
}


function availableAssets() {
  return readdirSync(CASES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}


function selectedAssets(value) {
  const assets = availableAssets();
  if (!value) fail("缺少 --asset <id|all>");
  if (value === "all") return assets;
  if (!assets.includes(value)) fail(`未知资产：${value}`);
  return [value];
}


function casePaths(assetId) {
  const caseRoot = join(CASES_ROOT, assetId);
  return {
    caseRoot,
    casePath: join(caseRoot, "building-case.json"),
    dslPath: join(caseRoot, "building-dsl.json"),
    reviewsRoot: join(caseRoot, "reviews"),
    recordRoot: join(
      ROOT,
      "docs/research/build-records/building-engine-spike",
      assetId,
    ),
    publicRoot: join(ROOT, "public/models/building-engine-spike", assetId),
  };
}


function reviewFiles(assetId, gate) {
  const { reviewsRoot } = casePaths(assetId);
  if (!existsSync(reviewsRoot)) return [];
  return readdirSync(reviewsRoot)
    .filter((name) => name.startsWith(`${gate}-review-`) && name.endsWith(".json"))
    .sort()
    .map((name) => join(reviewsRoot, name));
}


function latestReview(assetId, gate) {
  const files = reviewFiles(assetId, gate);
  return files.length ? readJson(files.at(-1)) : null;
}


function nextReviewPath(assetId, gate) {
  const files = reviewFiles(assetId, gate);
  const sequence = String(files.length + 1).padStart(3, "0");
  return join(casePaths(assetId).reviewsRoot, `${gate}-review-${sequence}.json`);
}


function enumFromSchema(schema, definition, property) {
  return new Set(schema.$defs[definition].properties[property].enum);
}


function allClaimRefs(dsl) {
  return [
    ...dsl.massing.volumes.flatMap((item) => item.evidenceClaimIds ?? []),
    ...dsl.massing.roofs.flatMap((item) => item.evidenceClaimIds ?? []),
    ...dsl.master.openings.flatMap((item) => item.evidenceClaimIds ?? []),
    ...dsl.master.features.flatMap((item) => item.evidenceClaimIds ?? []),
  ];
}


function allMaterialRefs(dsl) {
  const values = [];
  const keys = [
    "material",
    "lowerMaterial",
    "gableMaterial",
    "trimMaterial",
    "frameMaterial",
    "roofMaterial",
  ];
  for (const item of [
    ...dsl.massing.volumes,
    ...dsl.massing.roofs,
    ...dsl.master.openings,
    ...dsl.master.features,
  ]) {
    for (const key of keys) {
      if (item[key]) values.push({ id: item.id, key, role: item[key] });
    }
  }
  return values;
}


function segmentIntersectsExpandedRect(from, to, rectangle, margin) {
  const bounds = {
    minX: rectangle.minX - margin,
    maxX: rectangle.maxX + margin,
    minY: rectangle.minY - margin,
    maxY: rectangle.maxY + margin,
  };
  let tMin = 0;
  let tMax = 1;
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  for (const [start, delta, low, high] of [
    [from[0], dx, bounds.minX, bounds.maxX],
    [from[1], dy, bounds.minY, bounds.maxY],
  ]) {
    if (Math.abs(delta) < 1e-12) {
      if (start < low || start > high) return false;
      continue;
    }
    const first = (low - start) / delta;
    const second = (high - start) / delta;
    const entry = Math.min(first, second);
    const exit = Math.max(first, second);
    tMin = Math.max(tMin, entry);
    tMax = Math.min(tMax, exit);
    if (tMin > tMax) return false;
  }
  return tMax >= 0 && tMin <= 1;
}


function validateCollision(dsl, conflicts) {
  const ids = new Set();
  for (const obstacle of dsl.collision.obstacles) {
    if (ids.has(obstacle.id)) conflicts.push(`重复碰撞 ID：${obstacle.id}`);
    ids.add(obstacle.id);
    if (!(obstacle.minX < obstacle.maxX && obstacle.minY < obstacle.maxY)) {
      conflicts.push(`碰撞尺寸无效：${obstacle.id}`);
    }
  }
  for (const path of dsl.collision.requiredOpenPaths) {
    if (!(path.width > 0)) conflicts.push(`开放路径宽度无效：${path.id}`);
    for (const obstacle of dsl.collision.obstacles) {
      if (
        segmentIntersectsExpandedRect(
          path.from,
          path.to,
          obstacle,
          path.width * 0.5,
        )
      ) {
        conflicts.push(`开放路径 ${path.id} 与碰撞 ${obstacle.id} 相交`);
      }
    }
  }
}


function verifyEvidenceItem(caseData, item, conflicts) {
  const candidates = [];
  if (item.repositoryPath) candidates.push(resolveInRepo(item.repositoryPath));
  const snapshotPath = resolve(
    caseData.evidenceArchive.root,
    item.snapshotPath,
  );
  candidates.push(snapshotPath);
  for (const path of candidates) {
    if (!existsSync(path)) {
      conflicts.push(`证据不存在：${path}`);
      continue;
    }
    const actual = sha256File(path);
    if (actual !== item.sha256) {
      conflicts.push(`证据 SHA 不一致：${path}`);
    }
  }
}


function validateAsset(assetId, { writeReport = true } = {}) {
  const schema = readJson(SCHEMA_PATH);
  const profile = readJson(PROFILE_PATH);
  const paths = casePaths(assetId);
  const caseData = readJson(paths.casePath);
  const dsl = readJson(paths.dslPath);
  const evidenceReview = latestReview(assetId, "evidence");
  const unsupported = [];
  const ignored = [];
  const conflicts = [];
  const compiled = [];

  if (caseData.assetId !== assetId || dsl.assetId !== assetId) {
    conflicts.push("Case / DSL / requested assetId 不一致");
  }
  if (caseData.archetype !== "garden-villa" || dsl.archetype !== "garden-villa") {
    unsupported.push(`archetype:${dsl.archetype}`);
  }
  if (dsl.schemaVersion !== 1 || caseData.schemaVersion !== 1) {
    unsupported.push("schemaVersion");
  }
  const allowedTop = new Set(Object.keys(schema.properties));
  for (const key of Object.keys(dsl)) {
    if (!allowedTop.has(key)) unsupported.push(`top-level:${key}`);
  }
  if (JSON.stringify(dsl.coordinateContract) !== JSON.stringify(profile.coordinateContract)) {
    conflicts.push("DSL 与 Art Profile 坐标合同不一致");
  }
  if (dsl.artProfile !== profile.id) conflicts.push("Art Profile ID 不一致");
  const volumeTypes = enumFromSchema(schema, "volume", "type");
  const roofTypes = enumFromSchema(schema, "roof", "type");
  const openingTypes = enumFromSchema(schema, "opening", "type");
  const featureTypes = enumFromSchema(schema, "feature", "type");
  for (const [kind, items, allowed] of [
    ["volume", dsl.massing.volumes, volumeTypes],
    ["roof", dsl.massing.roofs, roofTypes],
    ["opening", dsl.master.openings, openingTypes],
    ["feature", dsl.master.features, featureTypes],
  ]) {
    const componentIds = new Set();
    for (const item of items) {
      if (!allowed.has(item.type)) unsupported.push(`${kind}:${item.id}:${item.type}`);
      if (componentIds.has(item.id)) conflicts.push(`重复 ${kind} ID：${item.id}`);
      componentIds.add(item.id);
      if (!Array.isArray(item.evidenceClaimIds) || !item.evidenceClaimIds.length) {
        conflicts.push(`${kind}:${item.id} 缺 Evidence Claim`);
      }
      compiled.push(`${kind}:${item.id}`);
    }
  }
  const paletteTokens = new Set(Object.keys(profile.palette));
  for (const [role, token] of Object.entries(dsl.materials)) {
    if (!paletteTokens.has(token)) unsupported.push(`palette:${role}:${token}`);
  }
  for (const reference of allMaterialRefs(dsl)) {
    if (!(reference.role in dsl.materials)) {
      conflicts.push(`${reference.id}.${reference.key} 引用了未声明角色 ${reference.role}`);
    }
  }

  const claims = new Map(caseData.claims.map((claim) => [claim.claimId, claim]));
  for (const claimId of dsl.evidence.claimIds) {
    if (!claims.has(claimId)) conflicts.push(`DSL 声明了不存在的 Claim：${claimId}`);
  }
  for (const claimId of allClaimRefs(dsl)) {
    const claim = claims.get(claimId);
    if (!claim) conflicts.push(`几何引用了不存在的 Claim：${claimId}`);
    else if (claim.reviewState !== "approved") conflicts.push(`Claim 未批准：${claimId}`);
  }
  const usedClaims = new Set(allClaimRefs(dsl));
  for (const claimId of caseData.identityContract.requiredClaimIds) {
    if (!usedClaims.has(claimId)) conflicts.push(`身份 Claim 未被 Compiler 消费：${claimId}`);
  }
  if (caseData.identityContract.requiredClaimIds.length < 3) {
    conflicts.push("身份构件少于三个");
  }
  const requiredCoverage = ["canonical", "sideDepth", "entranceIdentity"];
  for (const key of requiredCoverage) {
    const state = String(caseData.coverage[key] ?? "missing");
    if (state.startsWith("missing") || state.startsWith("unknown")) {
      conflicts.push(`证据槽位不足：${key}=${state}`);
    }
  }
  if (!evidenceReview || evidenceReview.decision !== "approved") {
    conflicts.push("Evidence Gate 未批准");
  }
  if (caseData.evidenceArchive.checksumStatus !== "verified-all-2026-07-28") {
    conflicts.push("外置快照未记录本轮全量 SHA 通过");
  }
  const manifestPath = join(caseData.evidenceArchive.root, "manifest.json");
  const checksumPath = join(caseData.evidenceArchive.root, "SHA256SUMS");
  if (!existsSync(manifestPath) || !existsSync(checksumPath)) {
    conflicts.push("外置快照 manifest 或 SHA256SUMS 缺失");
  } else {
    const manifest = readJson(manifestPath);
    if (
      manifest.fileCount !== caseData.evidenceArchive.fileCount
      || manifest.byteCount !== caseData.evidenceArchive.byteCount
    ) {
      conflicts.push("外置快照统计与 Case 不一致");
    }
  }
  for (const item of caseData.evidenceItems) {
    verifyEvidenceItem(caseData, item, conflicts);
  }
  validateCollision(dsl, conflicts);
  for (const claim of caseData.claims) {
    if (claim.conflicts?.length) conflicts.push(`Claim 冲突：${claim.claimId}`);
  }
  const inferred = caseData.claims
    .filter((claim) => claim.origin === "inferred")
    .map((claim) => ({
      claimId: claim.claimId,
      confidence: claim.confidence,
      evidenceRefs: claim.evidenceRefs,
    }));
  const status = unsupported.length || ignored.length || conflicts.length
    ? "failed"
    : "ok";
  const report = {
    schemaVersion: 1,
    assetId,
    archetype: dsl.archetype,
    status,
    inputs: {
      case: { path: repoPath(paths.casePath), sha256: sha256File(paths.casePath) },
      dsl: { path: repoPath(paths.dslPath), sha256: sha256File(paths.dslPath) },
      schema: { path: repoPath(SCHEMA_PATH), sha256: sha256File(SCHEMA_PATH) },
      artProfile: { path: repoPath(PROFILE_PATH), sha256: sha256File(PROFILE_PATH) },
    },
    compiled,
    inferred,
    unsupported,
    ignored,
    conflict: conflicts,
    counts: {
      claims: caseData.claims.length,
      evidenceItems: caseData.evidenceItems.length,
      volumes: dsl.massing.volumes.length,
      roofs: dsl.massing.roofs.length,
      openings: dsl.master.openings.length,
      features: dsl.master.features.length,
      obstacles: dsl.collision.obstacles.length,
      openPaths: dsl.collision.requiredOpenPaths.length,
    },
  };
  if (writeReport) {
    const reportPath = join(paths.recordRoot, "compiler-report.json");
    writeJson(reportPath, report);
  }
  if (status !== "ok") fail(`${assetId} DSL validation failed`, report);
  return report;
}


function blenderBinary() {
  if (process.env.BLENDER_BIN) return process.env.BLENDER_BIN;
  return existsSync(DEFAULT_BLENDER) ? DEFAULT_BLENDER : "blender";
}


function runCompiler(assetId, stage) {
  const { dslPath } = casePaths(assetId);
  const command = blenderBinary();
  const result = spawnSync(
    command,
    [
      "--background",
      "--python-exit-code",
      "1",
      "--python",
      COMPILER_PATH,
      "--",
      "--dsl",
      dslPath,
      "--stage",
      stage,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) fail(`无法启动 Blender：${result.error.message}`);
  if (result.status !== 0) fail(`${assetId} ${stage} 编译失败`, { exitCode: result.status });
}


function artifactRecord(assetId, stage) {
  const path = join(casePaths(assetId).recordRoot, `${stage}.json`);
  if (!existsSync(path)) fail(`${assetId} 缺少 ${stage} build record`);
  return { path, value: readJson(path) };
}


function currentArtifactTarget(assetId, stage) {
  const record = artifactRecord(assetId, stage).value;
  const collisionPath = resolveInRepo(record.outputs.collision.path);
  return {
    stage,
    dslSha256: sha256File(casePaths(assetId).dslPath),
    glbSha256: sha256File(resolveInRepo(record.outputs.glb.path)),
    collisionSha256: sha256File(collisionPath),
    buildRecord: repoPath(artifactRecord(assetId, stage).path),
  };
}


function assertMassingApproved(assetId) {
  const review = latestReview(assetId, "massing");
  if (!review || review.decision !== "approved") {
    fail(`${assetId} 当前 Massing 尚未通过 Gate M`);
  }
  const target = currentArtifactTarget(assetId, "massing");
  for (const key of ["dslSha256", "glbSha256", "collisionSha256"]) {
    if (review.target?.[key] !== target[key]) {
      fail(`${assetId} Massing 审核已因 ${key} 变化失效`);
    }
  }
}


function refreshRuntimeManifest() {
  const assets = {};
  for (const assetId of availableAssets()) {
    const paths = casePaths(assetId);
    const caseData = readJson(paths.casePath);
    const dsl = readJson(paths.dslPath);
    const tiers = {};
    for (const stage of ["massing", "master"]) {
      const recordPath = join(paths.recordRoot, `${stage}.json`);
      if (!existsSync(recordPath)) continue;
      const record = readJson(recordPath);
      const glb = record.outputs.glb;
      tiers[stage] = {
        path: `/${glb.path.replace(/^public\//, "")}?v=${glb.sha256.slice(0, 12)}`,
        sha256: glb.sha256,
        bytes: glb.bytes,
        bounds: glb.bounds,
      };
    }
    if (!Object.keys(tiers).length) continue;
    const collisionRecord = Object.values(tiers).length
      ? readJson(join(paths.publicRoot, `${assetId}-collision.json`))
      : null;
    const collisionPath = join(paths.publicRoot, `${assetId}-collision.json`);
    assets[assetId] = {
      name: caseData.subject.name,
      archetype: dsl.archetype,
      coordinateContract: dsl.coordinateContract,
      cameras: dsl.runtime.cameras,
      tiers,
      collision: {
        path: `/${repoPath(collisionPath).replace(/^public\//, "")}?v=${sha256File(collisionPath).slice(0, 12)}`,
        sha256: sha256File(collisionPath),
        obstacleCount: collisionRecord.obstacles.length,
        openPathCount: collisionRecord.requiredOpenPaths.length,
      },
    };
  }
  const path = join(ROOT, "public/models/building-engine-spike/manifest.json");
  writeJson(path, {
    schemaVersion: 1,
    archetype: "garden-villa",
    source: "building-engine/cases",
    assets,
  });
}


function readGlbSummary(path) {
  const contents = readFileSync(path);
  if (contents.length < 20 || contents.subarray(0, 4).toString() !== "glTF") {
    fail(`无效 GLB：${path}`);
  }
  const declaredLength = contents.readUInt32LE(8);
  if (declaredLength !== contents.length) fail(`GLB 长度不一致：${path}`);
  const jsonLength = contents.readUInt32LE(12);
  const jsonType = contents.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a) fail(`GLB 第一 chunk 不是 JSON：${path}`);
  const document = JSON.parse(
    contents.subarray(20, 20 + jsonLength).toString("utf8").replace(/\0+$/u, "").trim(),
  );
  let triangles = 0;
  let primitives = 0;
  for (const mesh of document.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      primitives += 1;
      const accessorIndex = primitive.indices ?? primitive.attributes.POSITION;
      triangles += Math.floor(document.accessors[accessorIndex].count / 3);
    }
  }
  return {
    sha256: sha256Bytes(contents),
    bytes: contents.length,
    nodes: document.nodes?.length ?? 0,
    meshes: document.meshes?.length ?? 0,
    primitives,
    triangles,
    materials: document.materials?.length ?? 0,
    images: document.images?.length ?? 0,
    textures: document.textures?.length ?? 0,
    animations: document.animations?.length ?? 0,
    skins: document.skins?.length ?? 0,
  };
}


function qaArtifact(assetId, stage) {
  const paths = casePaths(assetId);
  const { path: recordPath, value: record } = artifactRecord(assetId, stage);
  const dsl = readJson(paths.dslPath);
  const glbPath = resolveInRepo(record.outputs.glb.path);
  const blendPath = resolveInRepo(record.outputs.blend.path);
  const collisionPath = resolveInRepo(record.outputs.collision.path);
  for (const path of [glbPath, blendPath, collisionPath]) {
    if (!existsSync(path)) fail(`${assetId} ${stage} 产物缺失：${path}`);
  }
  const currentDslSha = sha256File(paths.dslPath);
  const summary = readGlbSummary(glbPath);
  const problems = [];
  if (record.lineage.dslSha256 !== currentDslSha) problems.push("dsl-lineage");
  if (record.generator.sha256 !== sha256File(COMPILER_PATH)) problems.push("compiler-lineage");
  if (record.inputs.artProfile.sha256 !== sha256File(PROFILE_PATH)) problems.push("profile-lineage");
  if (record.outputs.glb.sha256 !== summary.sha256) problems.push("glb-sha");
  if (record.outputs.blend.sha256 !== sha256File(blendPath)) problems.push("blend-sha");
  if (record.outputs.collision.sha256 !== sha256File(collisionPath)) problems.push("collision-sha");
  for (const key of [
    "bytes",
    "nodes",
    "meshes",
    "primitives",
    "triangles",
    "materials",
    "images",
    "textures",
  ]) {
    if (record.outputs.glb[key] !== summary[key]) problems.push(`glb-${key}`);
  }
  const budget = dsl.budgets[stage];
  if (summary.nodes > budget.maxNodes) problems.push("budget-nodes");
  if (summary.triangles > budget.maxTriangles) problems.push("budget-triangles");
  if (summary.materials > budget.maxMaterials) problems.push("budget-materials");
  if (summary.images > budget.maxImages) problems.push("budget-images");
  if (summary.bytes > budget.maxBytes) problems.push("budget-bytes");
  if (summary.textures || summary.animations || summary.skins) problems.push("glb-policy");
  for (const preview of record.outputs.previews) {
    const path = resolveInRepo(preview.path);
    if (!existsSync(path) || sha256File(path) !== preview.sha256) {
      problems.push(`preview:${preview.view}`);
    }
  }
  if (stage === "master") {
    const massing = artifactRecord(assetId, "massing").value;
    if (
      record.lineage.derivedFromMassing.glbSha256
      !== massing.outputs.glb.sha256
    ) {
      problems.push("massing-master-lineage");
    }
  }
  if (problems.length) fail(`${assetId} ${stage} 自动 QA 失败`, problems);
  return {
    assetId,
    stage,
    status: "pass",
    record: repoPath(recordPath),
    glb: summary,
    collisionSha256: sha256File(collisionPath),
    previewCount: record.outputs.previews.length,
  };
}


async function httpQa(assetId, stage, origin) {
  const manifest = readJson(join(ROOT, "public/models/building-engine-spike/manifest.json"));
  const asset = manifest.assets[assetId];
  const tier = asset?.tiers?.[stage];
  if (!tier) fail(`${assetId} ${stage} 未进入 Sandbox manifest`);
  const cleanOrigin = origin.replace(/\/+$/u, "");
  const pageUrl = `${cleanOrigin}/building-engine-sandbox?asset=${assetId}&tier=${stage}&view=canonical&qa=1`;
  const glbUrl = new URL(tier.path, cleanOrigin);
  const collisionUrl = new URL(asset.collision.path, cleanOrigin);
  const [pageResponse, glbResponse, collisionResponse] = await Promise.all([
    fetch(pageUrl),
    fetch(glbUrl),
    fetch(collisionUrl),
  ]);
  const glbBytes = Buffer.from(await glbResponse.arrayBuffer());
  const collisionBytes = Buffer.from(await collisionResponse.arrayBuffer());
  const result = {
    schemaVersion: 1,
    assetId,
    stage,
    status: (
      pageResponse.ok
      && glbResponse.ok
      && collisionResponse.ok
      && sha256Bytes(glbBytes) === tier.sha256
      && sha256Bytes(collisionBytes) === asset.collision.sha256
    ) ? "http-pass-awaiting-browser-visual" : "failed",
    origin: cleanOrigin,
    page: { url: pageUrl, status: pageResponse.status },
    glb: {
      url: glbUrl.toString(),
      status: glbResponse.status,
      sha256: sha256Bytes(glbBytes),
      bytes: glbBytes.length,
    },
    collision: {
      url: collisionUrl.toString(),
      status: collisionResponse.status,
      sha256: sha256Bytes(collisionBytes),
      bytes: collisionBytes.length,
    },
  };
  const output = join(casePaths(assetId).recordRoot, `sandbox-http-${stage}.json`);
  writeJson(output, result);
  if (result.status === "failed") fail(`${assetId} ${stage} Sandbox HTTP QA 失败`, result);
  return result;
}


function validateSandboxRecord(path, assetId, stage, target) {
  const resolved = resolveInRepo(path);
  const record = readJson(resolved);
  const problems = [];
  if (record.assetId !== assetId) problems.push("assetId");
  if (record.stage !== stage) problems.push("stage");
  if (record.status !== "pass") problems.push("status");
  if (record.glbSha256 !== target.glbSha256) problems.push("glbSha256");
  if (record.collisionSha256 !== target.collisionSha256) problems.push("collisionSha256");
  if (!record.viewport || record.pageVisibility !== "visible") problems.push("runtime-conditions");
  if (!(record.canvas?.width > 0 && record.canvas?.height > 0)) problems.push("canvas");
  if (record.consoleErrors !== 0 || record.pageErrors !== 0) problems.push("errors");
  if (record.modelVisible !== true || record.groundContact !== "pass") problems.push("visual");
  if (record.openPathCheck !== "pass") problems.push("collision");
  if (problems.length) fail(`Sandbox 视觉记录不能批准 ${assetId} ${stage}`, problems);
  return { path: repoPath(resolved), sha256: sha256File(resolved) };
}


function reviewDecision(options) {
  const assetId = options.asset;
  if (!assetId || !availableAssets().includes(assetId)) fail("review 需要有效 --asset");
  const gate = options.gate;
  if (!["evidence", "massing", "final"].includes(gate)) fail("无效 --gate");
  const decision = options.decision;
  const decisions = {
    evidence: new Set(["approved", "needs-more-evidence", "rejected"]),
    massing: new Set(["approved", "changes-requested", "blocked"]),
    final: new Set([
      "approved-spike",
      "approved-spike-with-known-unknowns",
      "changes-requested",
      "blocked",
    ]),
  };
  if (!decisions[gate].has(decision)) fail(`${gate} 不支持 decision=${decision}`);
  const reviewer = options.reviewer;
  if (!reviewer) fail("review 需要 --reviewer");
  const paths = casePaths(assetId);
  const caseData = readJson(paths.casePath);
  let target = null;
  let sandbox = null;
  if (gate === "massing" || gate === "final") {
    const stage = gate === "massing" ? "massing" : "master";
    qaArtifact(assetId, stage);
    target = currentArtifactTarget(assetId, stage);
    const approving = decision === "approved" || decision.startsWith("approved-spike");
    if (approving) {
      if (!options["sandbox-record"]) {
        fail(`${gate} 批准需要 --sandbox-record <path>`);
      }
      sandbox = validateSandboxRecord(
        options["sandbox-record"],
        assetId,
        stage,
        target,
      );
    }
  }
  const outputPath = nextReviewPath(assetId, gate);
  const review = {
    schemaVersion: 1,
    reviewVersion: reviewFiles(assetId, gate).length + 1,
    assetId,
    gate,
    decision,
    reviewedAt: new Date().toISOString(),
    reviewer,
    reviewerType: options["reviewer-type"] ?? "independent-manual-review",
    caseVersion: caseData.caseVersion,
    target,
    sandbox,
    note: options.note ?? "",
  };
  writeJson(outputPath, review);
  if (gate === "evidence") {
    caseData.reviews.evidence = repoPath(outputPath);
  } else {
    caseData.reviews[gate] = [...caseData.reviews[gate], repoPath(outputPath)];
  }
  writeJson(paths.casePath, caseData);
  return { status: "recorded", review: repoPath(outputPath), decision };
}


function statusFor(assetId) {
  const paths = casePaths(assetId);
  const artifact = {};
  for (const stage of ["massing", "master"]) {
    const recordPath = join(paths.recordRoot, `${stage}.json`);
    artifact[stage] = existsSync(recordPath)
      ? {
          built: true,
          glbSha256: readJson(recordPath).outputs.glb.sha256,
        }
      : { built: false };
  }
  const reviews = {};
  for (const gate of ["evidence", "massing", "final"]) {
    const review = latestReview(assetId, gate);
    reviews[gate] = review
      ? {
          decision: review.decision,
          reviewedAt: review.reviewedAt,
          target: review.target ?? null,
        }
      : null;
  }
  return { assetId, artifact, reviews };
}


function inspectEnvironment() {
  const blender = blenderBinary();
  const version = spawnSync(blender, ["--version"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  return {
    root: ROOT,
    assets: availableAssets(),
    archetype: "garden-villa",
    blender: {
      binary: blender,
      available: version.status === 0,
      version: version.stdout?.split(/\r?\n/u).slice(0, 2) ?? [],
    },
    compiler: {
      path: repoPath(COMPILER_PATH),
      sha256: sha256File(COMPILER_PATH),
    },
    schema: {
      path: repoPath(SCHEMA_PATH),
      sha256: sha256File(SCHEMA_PATH),
    },
    artProfile: {
      path: repoPath(PROFILE_PATH),
      sha256: sha256File(PROFILE_PATH),
    },
  };
}


function usage() {
  return `用法：
  node scripts/building_engine_spike.mjs inspect
  node scripts/building_engine_spike.mjs validate --asset <id|all>
  node scripts/building_engine_spike.mjs build --asset <id|all> --stage <massing|master|all>
  node scripts/building_engine_spike.mjs review --asset <id> --gate <evidence|massing|final> --decision <decision> --reviewer <name>
  node scripts/building_engine_spike.mjs qa --asset <id|all> [--stage <massing|master|all>] [--sandbox-origin <origin>]
  node scripts/building_engine_spike.mjs status --asset <id|all>`;
}


export async function main(argv = process.argv.slice(2)) {
  const { command, options } = parseCli(argv);
  if (!command || command === "help" || command === "--help") {
    console.log(usage());
    return;
  }
  let result;
  if (command === "inspect") {
    result = inspectEnvironment();
  } else if (command === "validate") {
    result = selectedAssets(options.asset).map((assetId) => validateAsset(assetId));
  } else if (command === "build") {
    const stage = options.stage;
    if (!["massing", "master", "all"].includes(stage)) fail("build 需要有效 --stage");
    const outputs = [];
    for (const assetId of selectedAssets(options.asset)) {
      validateAsset(assetId);
      const stages = stage === "all" ? ["massing", "master"] : [stage];
      for (const currentStage of stages) {
        if (currentStage === "master") assertMassingApproved(assetId);
        runCompiler(assetId, currentStage);
        outputs.push(qaArtifact(assetId, currentStage));
        refreshRuntimeManifest();
      }
    }
    result = outputs;
  } else if (command === "review") {
    result = reviewDecision(options);
  } else if (command === "qa") {
    const stage = options.stage ?? "all";
    if (!["massing", "master", "all"].includes(stage)) fail("qa 需要有效 --stage");
    const outputs = [];
    for (const assetId of selectedAssets(options.asset)) {
      validateAsset(assetId);
      const stages = stage === "all"
        ? ["massing", "master"].filter((name) => (
            existsSync(join(casePaths(assetId).recordRoot, `${name}.json`))
          ))
        : [stage];
      for (const currentStage of stages) {
        const artifact = qaArtifact(assetId, currentStage);
        const runtime = options["sandbox-origin"]
          ? await httpQa(assetId, currentStage, options["sandbox-origin"])
          : null;
        outputs.push({ artifact, runtime });
      }
    }
    result = outputs;
  } else if (command === "status") {
    result = selectedAssets(options.asset).map(statusFor);
  } else {
    fail(`未知命令：${command}`);
  }
  console.log(JSON.stringify(result, null, 2));
}


if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(JSON.stringify({
      status: "failed",
      error: error.message,
      details: error.details,
    }, null, 2));
    process.exitCode = 1;
  });
}
