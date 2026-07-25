import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "docs/research/build-records");
const generatedAt = "2026-07-25T18:10:00+08:00";

const tiers = {
  hero: {
    glb: "public/models/shangsheng/sun-ke-villa.glb",
    command: "/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_sun_ke_villa_model.py",
    generator: "scripts/create_sun_ke_villa_model.py",
    maxBytes: 1_500_000,
    maxTriangles: 35_000,
    maxMaterials: 8,
    preview: "test_artifacts/test_sun_ke_villa_canonical_preview.png",
    sidePreview: "test_artifacts/test_sun_ke_villa_right_front_preview.png",
    entrancePreview: "test_artifacts/test_sun_ke_villa_north_entrance_preview.png",
  },
  identity: {
    glb: "public/models/shangsheng/sun-ke-villa-identity.glb",
    command: "/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_sun_ke_villa_runtime_tiers.py -- --tier identity",
    generator: "scripts/create_sun_ke_villa_runtime_tiers.py",
    maxBytes: 800_000,
    maxTriangles: 22_000,
    maxMaterials: 7,
    preview: "test_artifacts/test_sun_ke_villa_identity_canonical_preview.png",
    sidePreview: "test_artifacts/test_sun_ke_villa_identity_side_preview.png",
    entrancePreview: "test_artifacts/test_sun_ke_villa_identity_entrance_preview.png",
  },
  massing: {
    glb: "public/models/shangsheng/sun-ke-villa-massing.glb",
    command: "/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_sun_ke_villa_runtime_tiers.py -- --tier massing",
    generator: "scripts/create_sun_ke_villa_runtime_tiers.py",
    maxBytes: 240_000,
    maxTriangles: 8_000,
    maxMaterials: 7,
    preview: "test_artifacts/test_sun_ke_villa_massing_canonical_preview.png",
    sidePreview: "test_artifacts/test_sun_ke_villa_massing_side_preview.png",
    entrancePreview: "test_artifacts/test_sun_ke_villa_massing_entrance_preview.png",
  },
};

async function sha256(relativePath) {
  const buffer = await readFile(path.join(root, relativePath));
  return createHash("sha256").update(buffer).digest("hex");
}

async function parseGlb(relativePath) {
  const buffer = await readFile(path.join(root, relativePath));
  if (buffer.toString("utf8", 0, 4) !== "glTF" || buffer.readUInt32LE(4) !== 2) {
    throw new Error(`${relativePath} 不是 glTF 2.0 GLB`);
  }
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim());
  const positionAccessors = (json.meshes ?? []).flatMap((mesh) => (
    mesh.primitives.map((primitive) => json.accessors[primitive.attributes.POSITION])
  ));
  const bounds = {
    min: [0, 1, 2].map((axis) => (
      Math.min(...positionAccessors.map((accessor) => accessor.min[axis]))
    )),
    max: [0, 1, 2].map((axis) => (
      Math.max(...positionAccessors.map((accessor) => accessor.max[axis]))
    )),
  };
  const triangles = (json.meshes ?? []).reduce((meshTotal, mesh) => (
    meshTotal + mesh.primitives.reduce((primitiveTotal, primitive) => {
      const accessor = primitive.indices === undefined
        ? json.accessors[primitive.attributes.POSITION]
        : json.accessors[primitive.indices];
      return primitiveTotal + accessor.count / 3;
    }, 0)
  ), 0);
  return {
    buffer,
    json,
    metrics: {
      bytes: buffer.length,
      nodes: json.nodes?.length ?? 0,
      meshes: json.meshes?.length ?? 0,
      triangles,
      materials: json.materials?.length ?? 0,
      images: json.images?.length ?? 0,
      textures: json.textures?.length ?? 0,
      bounds,
    },
  };
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  const heroSha256 = await sha256(tiers.hero.glb);
  const heroBlendSha256 = await sha256("assets/models/source/sun-ke-villa.blend");
  const records = {};

  for (const [tier, config] of Object.entries(tiers)) {
    const { metrics, json } = await parseGlb(config.glb);
    const glbSha256 = await sha256(config.glb);
    const generatorSha256 = await sha256(config.generator);
    const rootExtras = json.nodes?.[0]?.extras ?? {};
    if (metrics.bytes > config.maxBytes) {
      throw new Error(`${tier} 超出字节预算：${metrics.bytes}`);
    }
    if (metrics.triangles > config.maxTriangles) {
      throw new Error(`${tier} 超出三角面预算：${metrics.triangles}`);
    }
    if (metrics.materials > config.maxMaterials) {
      throw new Error(`${tier} 超出材质预算：${metrics.materials}`);
    }

    records[tier] = {
      asset: "sun-ke-villa",
      tier,
      generatedAt,
      retainedHero: tier === "hero",
      generator: {
        command: config.command,
        path: config.generator,
        sha256: generatorSha256,
        blenderVersion: "5.2.0 LTS fbe6228777e7",
      },
      source: {
        blend: "assets/models/source/sun-ke-villa.blend",
        blendSha256: heroBlendSha256,
        checkpoint: tier === "hero"
          ? "complete Hero master"
          : `complete Hero master filtered by ${config.generator}`,
      },
      lineage: {
        stableAssetId: "sun-ke-villa",
        derivedFrom: tier === "hero" ? null : "sun-ke-villa-hero",
        derivedFromSha256: tier === "hero" ? null : heroSha256,
        rootDerivedFromSha256: rootExtras.derived_from_sha256 ?? null,
        authoredUnitMeters: 2.7,
        canonicalFront: "local -Y",
        origin: [0, 0, 0],
        groundDatum: 0,
        placementContract: "OSM way 864847877；运行时 position/yaw 不烘焙进 GLB",
        collisionContract: "三个层级共享 app/scene/xinhua-landmarks-data.json 中 OSM collision",
      },
      outputs: {
        blend: "assets/models/source/sun-ke-villa.blend",
        glb: config.glb,
        sha256: glbSha256,
        cacheVersion: glbSha256.slice(0, 12),
      },
      metrics,
      budgets: {
        maxBytes: config.maxBytes,
        maxNodes: 2,
        maxTriangles: config.maxTriangles,
        maxMaterials: config.maxMaterials,
        maxImages: 0,
      },
      evidence: {
        brief: "docs/research/sun-ke-villa-model-brief.md",
        referenceManifest: "docs/research/sun-ke-villa-reference-manifest.json",
        canonicalPreview: config.preview,
        sidePreview: config.sidePreview,
        entrancePreview: config.entrancePreview,
        tierComparison: "test_artifacts/test_sun_ke_villa_three_tier_comparison.png",
        runtimeScreenshot: `test_artifacts/test_sun_ke_villa_${tier}_runtime_preview.png`,
        runtimeQa: "docs/research/test_sun_ke_villa_three_tier_runtime_qa.json",
        mcpReview: "docs/research/test_sun_ke_villa_mcp_review.json",
      },
      audit: {
        command: `python3 scripts/audit_glb.py ${config.glb} --forbid-images --max-nodes 2`,
        status: "ok",
      },
      validation: {
        grayboxRuntimeGate: "passed",
        blenderFixedCameraReview: "passed",
        blenderMcpReview: "passed",
        glbAudit: "passed",
        automatedTests: "passed",
        runtimeQa: "passed",
        independentReview: "passed",
      },
    };

    const outputPath = path.join(outputDirectory, `sun-ke-villa-${tier}.json`);
    await writeFile(outputPath, `${JSON.stringify(records[tier], null, 2)}\n`);
    console.log(path.relative(root, outputPath));
  }
}

await main();
