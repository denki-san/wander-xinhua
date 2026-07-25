import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const paths = {
  glb: "public/models/shangsheng/sun-ke-villa.glb",
  blend: "assets/models/source/sun-ke-villa.blend",
  generator: "scripts/create_sun_ke_villa_model.py",
  brief: "docs/research/sun-ke-villa-model-brief.md",
  evidence: "docs/research/sun-ke-villa-reference-manifest.json",
  mapQa: "docs/research/sun-ke-villa-massing-map-qa.json",
  blendAudit:
    "test_artifacts/all-models/hero/sun-ke-villa/"
    + "test_sun-ke-villa-hero-blend-audit.json",
  canonical: "test_artifacts/test_sun_ke_villa_canonical_preview.png",
  side: "test_artifacts/test_sun_ke_villa_right_front_preview.png",
  north: "test_artifacts/test_sun_ke_villa_north_entrance_preview.png",
  batchMassing: "test_artifacts/test_sun_ke_villa_batch_01_massing_preview.png",
  batchIdentity:
    "test_artifacts/test_sun_ke_villa_batch_02_identity_materials_preview.png",
  batchSite: "test_artifacts/test_sun_ke_villa_batch_03_site_preview.png",
  buildRecord:
    "docs/research/build-records/tiers/sun-ke-villa/hero/"
    + "sun-ke-villa-hero.json",
  scope: "docs/research/active-asset-scope-31.json",
  registry: "docs/research/all-models-production-registry.json",
};

const budgets = {
  maxTriangles: 35_000,
  maxNodes: 2,
  maxMaterials: 8,
  maxImages: 0,
  maxBytes: 1_500_000,
};

async function absoluteRead(path) {
  return readFile(resolve(root, path));
}

async function sha256(path) {
  return createHash("sha256").update(await absoluteRead(path)).digest("hex");
}

async function fileEvidence(path) {
  return {
    path,
    sha256: await sha256(path),
    bytes: (await stat(resolve(root, path))).size,
  };
}

async function readJson(path) {
  return JSON.parse(await absoluteRead(path));
}

async function writeJson(path, value) {
  const target = resolve(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
}

function parseGlb(buffer) {
  if (buffer.toString("utf8", 0, 4) !== "glTF") {
    throw new Error("Hero 文件不是有效 GLB");
  }
  const version = buffer.readUInt32LE(4);
  const totalLength = buffer.readUInt32LE(8);
  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.toString("utf8", 16, 20);
  if (version !== 2 || totalLength !== buffer.length || jsonType !== "JSON") {
    throw new Error("Hero GLB header 不符合 glTF 2.0");
  }
  return JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength));
}

function auditGlb(gltf, bytes, digest) {
  let triangles = 0;
  const minimum = [Infinity, Infinity, Infinity];
  const maximum = [-Infinity, -Infinity, -Infinity];
  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      if ((primitive.mode ?? 4) !== 4) {
        throw new Error("Hero 含非 TRIANGLES primitive");
      }
      const count = primitive.indices === undefined
        ? gltf.accessors[primitive.attributes.POSITION].count
        : gltf.accessors[primitive.indices].count;
      triangles += count / 3;
      const accessor = gltf.accessors[primitive.attributes.POSITION];
      for (let axis = 0; axis < 3; axis += 1) {
        minimum[axis] = Math.min(minimum[axis], accessor.min[axis]);
        maximum[axis] = Math.max(maximum[axis], accessor.max[axis]);
      }
    }
  }
  const nodesWithTransforms = (gltf.nodes ?? []).filter(
    (node) => node.translation || node.rotation || node.scale || node.matrix,
  );
  return {
    sha256: digest,
    bytes,
    nodes: gltf.nodes?.length ?? 0,
    meshes: gltf.meshes?.length ?? 0,
    primitives: (gltf.meshes ?? []).reduce(
      (sum, mesh) => sum + (mesh.primitives?.length ?? 0),
      0,
    ),
    materials: gltf.materials?.length ?? 0,
    materialNames: (gltf.materials ?? []).map(({ name }) => name),
    images: gltf.images?.length ?? 0,
    textures: gltf.textures?.length ?? 0,
    animations: gltf.animations?.length ?? 0,
    skins: gltf.skins?.length ?? 0,
    triangles,
    bounds: {
      min: minimum,
      max: maximum,
      size: maximum.map((value, axis) => value - minimum[axis]),
    },
    rootTransformNormalized: nodesWithTransforms.length === 0,
    nodesWithTransforms: nodesWithTransforms.map(({ name }) => name),
    extras: gltf.nodes?.[0]?.extras ?? {},
  };
}

const [
  glbBuffer,
  glbFile,
  blend,
  generator,
  brief,
  evidenceFile,
  mapQaFile,
  blendAudit,
  evidenceManifest,
  mapQa,
  scope,
  registry,
  canonical,
  side,
  north,
  batchMassing,
  batchIdentity,
  batchSite,
] = await Promise.all([
  absoluteRead(paths.glb),
  fileEvidence(paths.glb),
  fileEvidence(paths.blend),
  fileEvidence(paths.generator),
  fileEvidence(paths.brief),
  fileEvidence(paths.evidence),
  fileEvidence(paths.mapQa),
  readJson(paths.blendAudit),
  readJson(paths.evidence),
  readJson(paths.mapQa),
  readJson(paths.scope),
  readJson(paths.registry),
  fileEvidence(paths.canonical),
  fileEvidence(paths.side),
  fileEvidence(paths.north),
  fileEvidence(paths.batchMassing),
  fileEvidence(paths.batchIdentity),
  fileEvidence(paths.batchSite),
]);

for (const reference of [
  ...evidenceManifest.referencePhotos,
  ...(evidenceManifest.correctionEvidence ?? []),
]) {
  const actualSha = await sha256(reference.path);
  if (actualSha !== reference.sha256) {
    throw new Error(`参考证据 SHA 漂移：${reference.path}`);
  }
}
if (mapQa.acceptance.final !== "pass") {
  throw new Error("Massing 地图门未通过，不得冻结 Hero");
}
if (blendAudit.status !== "pass") {
  throw new Error("Hero Blend 缺少必要身份构件");
}

const glb = auditGlb(parseGlb(glbBuffer), glbFile.bytes, glbFile.sha256);
const budgetChecks = {
  triangles: glb.triangles <= budgets.maxTriangles,
  nodes: glb.nodes <= budgets.maxNodes,
  materials: glb.materials <= budgets.maxMaterials,
  images: glb.images <= budgets.maxImages,
  bytes: glb.bytes <= budgets.maxBytes,
};
const expectedExtras = {
  asset_id: "sun-ke-villa",
  osm_way_id: 864847877,
  meters_per_scene_unit: 2.7,
  canonical_front: "local -Y",
  reference_manifest: paths.evidence,
  reference_images_embedded: false,
};
for (const [key, value] of Object.entries(expectedExtras)) {
  if (glb.extras[key] !== value) {
    throw new Error(`Hero GLB extras.${key} 不匹配`);
  }
}
if (!Object.values(budgetChecks).every(Boolean)) {
  throw new Error(`Hero 超出预算：${JSON.stringify(budgetChecks)}`);
}
if (!glb.rootTransformNormalized || glb.animations || glb.skins) {
  throw new Error("Hero 根变换、动画或骨骼不符合静态资产合同");
}

const lineageId = `sun-ke-villa-hero-${glb.sha256.slice(0, 12)}`;
const buildRecord = {
  version: 1,
  auditedAt: "2026-07-25T12:35:00+08:00",
  assetId: "sun-ke-villa",
  tier: "hero",
  status: "complete-master-frozen",
  lineageId,
  frozenMaster: {
    glb: glbFile,
    blend,
    generator,
    frozenAt: "2026-07-25T12:35:00+08:00",
    mayDeriveIdentity: true,
  },
  evidence: {
    manifest: evidenceFile,
    brief,
    massingMapQa: mapQaFile,
    referencePhotos: evidenceManifest.referencePhotos.map(
      ({ id, path, sha256: digest, viewDirection, publisher }) => ({
        id,
        path,
        sha256: digest,
        viewDirection,
        publisher,
      }),
    ),
    observedInCurrentReview: [
      "花园立面三联尖券门廊",
      "二层连续拱窗与深色阳台",
      "右侧圆角塔楼与红瓦屋顶",
      "向北外挑的 porte-cochère、前端山墙圆拱与成组尖拱窗",
    ],
    inferredOrSimplified: [
      "精确高度与隐藏立面仍为推断",
      "北侧门廊纵深与屋面曲线为风格化简化",
      "逐片瓦、真实拉毛纹理和室内不纳入运行时 Hero",
    ],
  },
  blender: {
    ...blendAudit,
    auditPath: paths.blendAudit,
  },
  glb,
  budgets: {
    contract: budgets,
    checks: budgetChecks,
    status: "pass",
  },
  previews: {
    canonical,
    rightFront: side,
    northEntrance: north,
    batches: {
      massing: batchMassing,
      identityFeaturePhase: batchIdentity,
      site: batchSite,
    },
  },
  mapContract: {
    sourceWayId: 864847877,
    mapQa: paths.mapQa,
    position: "pass",
    scale: "pass-with-inferred-height",
    orientation: "pass",
    collision: "pass",
  },
  runtimeContract: {
    cacheUrl:
      `/models/shangsheng/sun-ke-villa.glb?v=${glb.sha256.slice(0, 12)}`,
    currentHistoricRuntimeEvidence:
      "test_artifacts/test_sun_ke_villa_runtime_preview.png",
    allTierRuntimeAcceptance: "pending-after-identity-derivation",
  },
  identityDerivationContract: {
    requiredHeroGlbSha256: glb.sha256,
    requiredHeroBlendSha256: blend.sha256,
    sourceLineageId: lineageId,
    status: "allowed",
  },
  limitations: [
    "冻结表示现有 Hero master 通过当前证据、Blender、GLB 与地图前置门，不等于三档运行时已完成。",
    "任何 Identity 产物都必须记录这里的 Hero GLB/Blend SHA；SHA 不一致即 provisional。",
  ],
  nextGate: "derive-identity-from-frozen-hero-master",
};

const activeScopeAsset = scope.assets.find(({ id }) => id === "sun-ke-villa");
if (!activeScopeAsset) throw new Error("active-31 scope 缺少 sun-ke-villa");
activeScopeAsset.hero.state = "complete-master-frozen";
activeScopeAsset.hero.lineageId = lineageId;
activeScopeAsset.hero.buildRecord = paths.buildRecord;
activeScopeAsset.identity.state = "missing-ready-to-derive-from-frozen-hero";
activeScopeAsset.nextGate = buildRecord.nextGate;

const registryAsset = registry.buildingCollections?.shangsheng?.find(
  ({ id }) => id === "building:shangsheng:osm-way-864847877",
);
if (!registryAsset) throw new Error("生产 registry 缺少孙科别墅");
registryAsset.hero = "complete-master-frozen";
registryAsset.heroBuildRecord = paths.buildRecord;
registryAsset.heroLineageId = lineageId;
registryAsset.identity = "missing-ready-to-derive-from-frozen-hero";

await Promise.all([
  writeJson(paths.buildRecord, buildRecord),
  writeJson(paths.scope, scope),
  writeJson(paths.registry, registry),
]);

console.log(JSON.stringify({
  status: buildRecord.status,
  lineageId,
  heroGlbSha256: glb.sha256,
  heroBlendSha256: blend.sha256,
  triangles: glb.triangles,
  bounds: glb.bounds,
  nextGate: buildRecord.nextGate,
}, null, 2));
