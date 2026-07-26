import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const sceneSource = await readFile(new URL("app/scene/xinhua-road-landmarks.tsx", root), "utf8");
const generatorSource = await readFile(new URL("scripts/create_requested_poi_models.py", root), "utf8");
const briefSource = await readFile(new URL("docs/research/requested-poi-model-brief.md", root), "utf8");
const identitySource = await readFile(new URL("app/scene/xinhua-road-identity-contract.ts", root), "utf8");
const identityRecipeSource = await readFile(
  new URL("app/scene/xinhua-road-massing.tsx", root),
  "utf8",
);
const data = JSON.parse(await readFile(new URL("app/scene/xinhua-road-landmarks-data.json", root), "utf8"));
const mapData = JSON.parse(await readFile(new URL("app/scene/xinhua-map-data.json", root), "utf8"));
const fahuaDisposition = JSON.parse(
  await readFile(
    new URL("docs/research/fahua-heritage-final-disposition.json", root),
    "utf8",
  ),
);

const requestedAssets = {
  "hudec-memorial": { bytes: 500_000, materials: 12 },
  "xinhua-pocket-park": { bytes: 300_000, materials: 10 },
  "xinhua-community-center": { bytes: 280_000, materials: 11 },
  "debi-fahua-525": { bytes: 850_000, materials: 12 },
  "fahua-heritage": { bytes: 500_000, materials: 7 },
  "fics-xinhua-365": { bytes: 2_400_000, materials: 30 },
};

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF", "文件必须是有效的 GLB");
  assert.equal(buffer.readUInt32LE(4), 2, "GLB 必须使用 glTF 2.0");
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim());
}

function containsPoint(obstacle, x, z) {
  return x >= obstacle.minX
    && x <= obstacle.maxX
    && z >= obstacle.minZ
    && z <= obstacle.maxZ;
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(new URL(path, root)))
    .digest("hex");
}

function inspectGlb(buffer) {
  const json = parseGlb(buffer);
  let primitives = 0;
  let triangles = 0;
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      primitives += 1;
      const position = json.accessors[primitive.attributes.POSITION];
      const indices = primitive.indices === undefined
        ? position
        : json.accessors[primitive.indices];
      triangles += indices.count / 3;
      for (let axis = 0; axis < 3; axis += 1) {
        bounds.min[axis] = Math.min(bounds.min[axis], position.min[axis]);
        bounds.max[axis] = Math.max(bounds.max[axis], position.max[axis]);
      }
    }
  }
  return {
    json,
    metrics: {
      bytes: buffer.length,
      nodes: json.nodes?.length ?? 0,
      meshes: json.meshes?.length ?? 0,
      primitives,
      triangles,
      materials: json.materials?.length ?? 0,
      images: json.images?.length ?? 0,
      textures: json.textures?.length ?? 0,
      bounds,
    },
  };
}

function closeNumber(actual, expected, tolerance = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} 应接近 ${expected}`,
  );
}

function closeArray(actual, expected, tolerance = 1e-6) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => closeNumber(value, expected[index], tolerance));
}

function transformedPolygon(landmark) {
  const cosine = Math.cos(landmark.yaw);
  const sine = Math.sin(landmark.yaw);
  return [
    [landmark.localBounds.minX, landmark.localBounds.minZ],
    [landmark.localBounds.maxX, landmark.localBounds.minZ],
    [landmark.localBounds.maxX, landmark.localBounds.maxZ],
    [landmark.localBounds.minX, landmark.localBounds.maxZ],
  ].map(([localX, sourceZ]) => [
    landmark.position[0] + landmark.scale * (
      cosine * localX + sine * -sourceZ
    ),
    landmark.position[1] + landmark.scale * (
      -sine * localX + cosine * -sourceZ
    ),
  ]);
}

function pointSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const ratio = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, (
      (point[0] - start[0]) * dx + (point[1] - start[1]) * dz
    ) / lengthSquared));
  return Math.hypot(
    point[0] - (start[0] + dx * ratio),
    point[1] - (start[1] + dz * ratio),
  );
}

function minimumRoadDistance(polygon, roadName) {
  let minimum = Infinity;
  for (const road of mapData.roads.filter(
    (candidate) => (
      candidate.name === roadName
      && !candidate.tunnel
      && candidate.layer >= 0
    ),
  )) {
    for (const point of polygon) {
      for (let index = 1; index < road.points.length; index += 1) {
        minimum = Math.min(
          minimum,
          pointSegmentDistance(
            point,
            road.points[index - 1],
            road.points[index],
          ),
        );
      }
    }
  }
  return minimum;
}

test("本轮 6 个模型均保留 GLB、可编辑 Blend 和固定机位预览", async () => {
  for (const [slug, threshold] of Object.entries(requestedAssets)) {
    const glbUrl = new URL(`public/models/requested-pois/${slug}.glb`, root);
    const blendUrl = new URL(`assets/models/source/requested-pois/${slug}.blend`, root);
    const previewUrl = new URL(`test_artifacts/test_${slug}_preview.png`, root);
    const [glbStats, blendStats, previewStats, buffer] = await Promise.all([
      stat(glbUrl),
      stat(blendUrl),
      stat(previewUrl),
      readFile(glbUrl),
    ]);
    assert.ok(glbStats.size >= threshold.bytes, `${slug} 不得退化为简陋占位模型`);
    assert.ok(blendStats.size > 500_000, `${slug} 必须保留可编辑 Blender 源文件`);
    assert.ok(previewStats.size > 20_000, `${slug} 必须保留固定机位预览`);
    const glb = parseGlb(buffer);
    assert.equal(glb.nodes?.length, 1, `${slug} 应只有一个运行时节点`);
    assert.equal(glb.meshes?.length, 1, `${slug} 应合并为一个运行时网格`);
    assert.ok((glb.materials?.length ?? 0) >= threshold.materials, `${slug} 材质分层不足`);
    assert.equal(glb.images, undefined, `${slug} 不得嵌入参考照片`);
    assert.equal(glb.textures, undefined, `${slug} 不得依赖照片贴图`);
  }
});

test("五组用户指定地点均成为 POI，并保留六个独立可识别模型", () => {
  const requested = data.landmarks.filter(({ poi }) => poi);
  assert.deepEqual(
    requested.map(({ name }) => name).sort(),
    ["FICS新华365", "德必法华525", "新华·社区营造中心", "新华路口袋公园", "法华遗韵", "邬达克纪念馆"].sort(),
  );
  for (const landmark of requested) {
    assert.match(landmark.model, /^\/models\/.+\.glb$/);
    assert.ok(landmark.labelHeight > 4, `${landmark.name} 必须有独立 POI 标签高度`);
    assert.ok(landmark.positioning, `${landmark.name} 必须记录落位证据`);
    assert.ok(landmark.localObstacles.length >= 2, `${landmark.name} 必须使用拆分碰撞`);
  }
  const fics = requested.find(({ id }) => id === "fics-xinhua-365");
  assert.deepEqual(fics.aliases, ["xinhua365"]);
  assert.equal(fics.localObstacles.length, 6, "FICS 应按多栋建筑拆分碰撞");
  assert.deepEqual(fics.labelOffset, [10, -2], "FICS 标签必须避开相邻社区中心标签");
  const expectedCacheVersions = {
    "hudec-memorial": "20260726-hero-598b2ba19e24",
    "xinhua-pocket-park": "20260726-hero-c6ef6f107e3c",
    "xinhua-community-center": "20260718-detail-1",
    "debi-fahua-525": "20260718-detail-1",
    "fahua-heritage": "20260718-detail-1",
    "fics-xinhua-365": "20260718-detail-1",
  };
  for (const [id, expectedCacheVersion] of Object.entries(
    expectedCacheVersions,
  )) {
    const landmark = requested.find((candidate) => candidate.id === id);
    assert.equal(
      landmark.cacheVersion,
      expectedCacheVersion,
      `${id} 必须冻结当前生产 Hero 的缓存版本`,
    );
  }
});

test("口袋公园与园区广场保持可步行，法华遗韵中央说明板参与碰撞", () => {
  const pocket = data.landmarks.find(({ id }) => id === "xinhua-pocket-park");
  assert.ok(pocket.localObstacles.every((obstacle) => !containsPoint(obstacle, 0, 0)));

  const heritage = data.landmarks.find(({ id }) => id === "fahua-heritage");
  assert.ok(
    heritage.localObstacles.some((obstacle) => containsPoint(obstacle, 0, -0.5)),
    "中央历史说明板不是门洞，必须阻挡人物穿模",
  );

  const fics = data.landmarks.find(({ id }) => id === "fics-xinhua-365");
  assert.ok(fics.localObstacles.every((obstacle) => !containsPoint(obstacle, 0, 0)));

  assert.match(sceneSource, /landmark\.localObstacles \?\? \[landmark\.localBounds\]/);
  assert.match(sceneSource, /XINHUA_ROAD_MODEL_FOOTPRINTS/);
  assert.match(generatorSource, /heritage-center-panel/);
});

test("运行时渲染 POI 标签，并兼容原新华公馆直达参数", () => {
  assert.match(sceneSource, /data-poi=\{landmark\.id\}/);
  assert.match(sceneSource, /data-poi-address=\{landmark\.address\}/);
  assert.match(sceneSource, /className="map-road-label map-landmark-label"/);
  assert.doesNotMatch(sceneSource, /distanceFactor=\{landmark\.labelDistanceFactor/);
  assert.match(sceneSource, /landmark\.cacheVersion/);
  assert.match(sceneSource, /\[query, \.\.\.aliases\]/);
  assert.match(sceneSource, /XINHUA_ROAD_START_PRESETS/);
});

test("建模脚本和基准文档覆盖照片归纳、六个生成器与园区完整性", () => {
  assert.match(generatorSource, /照片只用于人工提炼轮廓、材质和识别构件/);
  for (const builder of [
    "build_hudec_memorial",
    "build_xinhua_pocket_park",
    "build_xinhua_community_center",
    "build_debi_fahua_525",
    "build_fahua_heritage",
    "build_fics_xinhua_365",
  ]) {
    assert.match(generatorSource, new RegExp(`def ${builder}`));
  }
  assert.match(generatorSource, /base\.build_xinhua_mansion\(\)/);
  for (const cue of ["都铎半木构", "连续折面镜墙", "大橘子", "外置折返楼梯", "法华遗韵", "FICS 365"]) {
    assert.match(`${briefSource}\n${generatorSource}`, new RegExp(cue));
  }
  assert.match(briefSource, /requested-pois-osm-20260717-103840\.json/);
  assert.match(briefSource, /不打包进运行时 GLB/);
});

test("法华遗韵 final disposition 只裁决本栋且保留 Recovery 合格子阶段", async () => {
  assert.equal(fahuaDisposition.assetId, "fahua-heritage");
  assert.equal(
    fahuaDisposition.baseCommit,
    "f8cafd25ff804ec283e7b189f8dfabcead284346",
  );
  assert.equal(fahuaDisposition.scope.binaryRebuilt, false);
  assert.equal(fahuaDisposition.scope.qualifiedRecoveryStageRerun, false);
  assert.equal(fahuaDisposition.scope.browserOrXhsAccessed, false);
  assert.equal(fahuaDisposition.scope.productionSharedFilesModified, false);
  assert.equal(fahuaDisposition.scope.legacyAssetOverwrittenOrDeleted, false);
  assert.deepEqual(
    fahuaDisposition.recoveryMassing.preservedPasses,
    [
      "GLB structural audit",
      "single Massing material and budget",
      "production-preview page playable",
      "camera spring clear",
      "single runtime visual screenshot",
    ],
  );
  assert.equal(
    fahuaDisposition.recoveryMassing.preservedVerdict,
    "conditional-geometry-usable-gate-blocked",
  );
  assert.equal(fahuaDisposition.recoveryMassing.rerunRequiredNow, false);
  assert.equal(fahuaDisposition.recoveryMassing.integrationAuthorized, false);
  assert.equal(
    fahuaDisposition.gates.overall,
    "blocked-local-evidence-exhausted-xhs-pending",
  );
});

test("法华遗韵新增纵深证据后仍不得把背面和地图未知补写成事实", async () => {
  const manifest = JSON.parse(
    await readFile(new URL(fahuaDisposition.inputs.referenceManifest.path, root)),
  );
  const entry = manifest.pois.find(({ id }) => id === "fahua-heritage");
  assert.equal(
    entry.photoStatus,
    "verified-same-structure-xhs-depth-street-map-pending",
  );
  assert.equal(entry.referencePhotos.length, 3);
  assert.equal(entry.referencePhotos[0].view, "front");
  assert.equal(entry.referencePhotos[0].captureDate, "unknown");
  assert.equal(
    entry.referencePhotos[0].path,
    fahuaDisposition.inputs.referencePhoto.path,
  );
  assert.deepEqual(
    entry.referencePhotos.slice(1).map(({ view }) => view),
    [
      "right-front-depth-and-street-interface",
      "near-front-left-passage-and-curb",
    ],
  );
  const sharedCheckpointInputs = new Set([
    "publicRegistry",
    "identityContract",
    "identityRecipeSource",
    "referenceManifest",
    "modelBrief",
  ]);
  for (const [name, input] of Object.entries(fahuaDisposition.inputs)) {
    if (sharedCheckpointInputs.has(name)) {
      // 法华 checkpoint 不拥有公共运行时；主窗口也可以在 manifest/Brief 追加证据。
      // 当前文件可合法变化，但 review-time 指纹必须继续保留。
      assert.match(input.sha256, /^[0-9a-f]{64}$/);
      continue;
    }
    assert.equal(await sha256(input.path), input.sha256, input.path);
  }
  assert.equal(fahuaDisposition.evidenceGate.coverage.canonicalFront, "pass-preserved");
  assert.equal(fahuaDisposition.evidenceGate.coverage.sideOrDepth, "missing");
  assert.equal(
    fahuaDisposition.evidenceGate.coverage.streetContextAndSiteBoundary,
    "missing",
  );
  assert.ok(fahuaDisposition.evidenceGate.unknown.length >= 5);
  assert.equal(fahuaDisposition.evidenceGate.newModelingAuthorized, false);
  assert.equal(fahuaDisposition.evidenceGate.xhsSearchRequiredBeforeNextModeling, true);
  assert.equal(fahuaDisposition.evidenceGate.xhsSearchPerformedInThisCheckpoint, false);
});

test("法华遗韵 legacy Hero 指纹和 GLB 结构保持精确，不冒充 MCP2", async () => {
  const hero = fahuaDisposition.legacyHero;
  for (const artifact of [hero.generator, hero.blend, hero.glb, hero.preview]) {
    assert.equal(await sha256(artifact.path), artifact.sha256, artifact.path);
    if (artifact.bytes !== undefined) {
      assert.equal((await stat(new URL(artifact.path, root))).size, artifact.bytes);
    }
  }
  const { json, metrics } = inspectGlb(
    await readFile(new URL(hero.glb.path, root)),
  );
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
    assert.equal(metrics[key], hero.glb[key], `legacyHero.glb.${key}`);
  }
  closeArray(metrics.bounds.min, hero.glb.bounds.min);
  closeArray(metrics.bounds.max, hero.glb.bounds.max);
  assert.equal(json.nodes[0].name, hero.glb.rootNode);
  assert.equal(json.nodes[0].translation, undefined);
  assert.equal(json.nodes[0].rotation, undefined);
  assert.equal(json.nodes[0].scale, undefined);
  assert.equal(hero.heroBuildRecordExists, false);
  assert.equal(hero.sameCameraTriptychExists, false);
  assert.equal(hero.mcp2Authorized, false);
  assert.equal(
    hero.mcp2Status,
    "not-entered-formal-massing-and-map-not-passed",
  );
});

test("法华遗韵当前地图静态净距与出生点成立，但不替代正式地图步行门", () => {
  const landmark = data.landmarks.find(({ id }) => id === "fahua-heritage");
  const audit = fahuaDisposition.staticMapAudit;
  const polygon = transformedPolygon(landmark);
  const fahuazhenDistance = minimumRoadDistance(polygon, "法华镇路");
  const xianghuaqiaoDistance = minimumRoadDistance(polygon, "香花桥路");
  closeNumber(
    fahuazhenDistance,
    audit.roads.fahuazhen.minimumCenterlineDistanceSceneUnits,
  );
  closeNumber(
    xianghuaqiaoDistance,
    audit.roads.xianghuaqiao.minimumCenterlineDistanceSceneUnits,
  );
  closeNumber(
    fahuazhenDistance - audit.roads.fahuazhen.roadWidthSceneUnits / 2,
    audit.roads.fahuazhen.minimumAsphaltEdgeClearanceSceneUnits,
  );
  closeNumber(
    xianghuaqiaoDistance - audit.roads.xianghuaqiao.roadWidthSceneUnits / 2,
    audit.roads.xianghuaqiao.minimumAsphaltEdgeClearanceSceneUnits,
  );
  assert.ok(
    audit.roads.fahuazhen.minimumAsphaltEdgeClearanceSceneUnits
      >= audit.roads.fahuazhen.projectMinimumClearanceSceneUnits,
  );
  assert.deepEqual(audit.otherLandmarkEnvelopeOverlaps, []);
  assert.equal(landmark.localObstacles.length, audit.localObstacleCount);
  assert.ok(audit.start.minimumSplitObstacleDistanceSceneUnits > 2);
  assert.ok(audit.start.headingErrorDegrees < 0.1);
  assert.equal(
    audit.formalMapAcceptance,
    "blocked-missing-street-context-site-boundary-and-walkaround",
  );
});

test("generic heritage-gate 配方与三档缺口保持显式，不能把 fallback 算作 Identity", () => {
  assert.match(
    identitySource,
    /"fahua-heritage": "heritage-gate"/,
  );
  assert.match(
    identitySource,
    /: "programmatic-miniature"/,
  );
  assert.match(
    identityRecipeSource,
    /if \(kind === "heritage-gate"\)/,
  );
  assert.equal(
    fahuaDisposition.identityDisposition.status,
    "blocked-programmatic-recipe-not-subject-faithful",
  );
  assert.equal(fahuaDisposition.identityDisposition.standaloneGlbExists, false);
  assert.equal(fahuaDisposition.identityDisposition.derivedFromAcceptedHero, false);
  assert.equal(fahuaDisposition.identityDisposition.mcp3Status, "not-reachable");
  assert.equal(
    fahuaDisposition.threeJsDisposition.status,
    "not-entered-three-tier-acceptance",
  );
  assert.equal(fahuaDisposition.threeJsDisposition.formalTierContractExists, false);
  assert.equal(fahuaDisposition.threeJsDisposition.performanceSample, "not-entered");
  assert.equal(
    fahuaDisposition.gameDisposition.ifXhsStillCannotSupplyMinimumCoverage,
    "main-window-removes-building-from-game registry/runtime while retaining all files and Recovery/Hold artifacts",
  );
});
