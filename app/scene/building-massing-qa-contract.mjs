function splitObstacleAlongSourceZ(obstacle, maximumLength) {
  const length = obstacle.maxZ - obstacle.minZ;
  const segmentCount = Math.max(1, Math.ceil(length / maximumLength));
  const segmentLength = length / segmentCount;
  return Array.from({ length: segmentCount }, (_, index) => Object.freeze({
    minX: obstacle.minX,
    maxX: obstacle.maxX,
    minZ: obstacle.minZ + segmentLength * index,
    maxZ: obstacle.minZ + segmentLength * (index + 1),
  }));
}

export const BUILDING_MASSING_QA_CANDIDATES = Object.freeze({
  "xinhua-villas-211": Object.freeze({
    assetId: "xinhua-villas-211",
    requestedTier: "massing",
    modelPath:
      "/models/tiers/xinhua-road/massing-v3/xinhua-villas-211-massing.glb"
      + "?v=20260726-massing-ab05b4ec",
    buildRecord:
      "docs/research/build-records/tiers/xinhua-road/massing-v3/"
      + "xinhua-villas-211-massing.json",
    mapGate:
      "docs/research/xinhua-villas-211-massing-v3-integration-candidate.json",
    placement: Object.freeze({
      position: Object.freeze([38.32, 110.67]),
      yaw: -0.38,
      scale: 0.62,
    }),
    start: Object.freeze({
      position: Object.freeze([24.7, 89]),
      forward: Object.freeze([0, 1]),
    }),
    localObstacles: Object.freeze([
      Object.freeze({ minX: -14.885911, maxX: -6.425579, minZ: -16.961667, maxZ: -8.932183 }),
      Object.freeze({ minX: -4.003608, maxX: 3.593271, minZ: -17.265457, maxZ: -12.318421 }),
      Object.freeze({ minX: -17.724523, maxX: -12.136674, minZ: -6.419871, maxZ: -1.365112 }),
      Object.freeze({ minX: -10.270679, maxX: 3.871692, minZ: -8.101705, maxZ: -1.192926 }),
      Object.freeze({ minX: 6.265997, maxX: 11.240944, minZ: -10.296873, maxZ: 13.564915 }),
      Object.freeze({ minX: 9.085028, maxX: 22.558899, minZ: -21.092002, maxZ: -13.01248 }),
      Object.freeze({ minX: -32.228155, maxX: -24.61737, minZ: 7.831194, maxZ: 14.307884 }),
      Object.freeze({ minX: -18.911344, maxX: -7.262798, minZ: 5.94844, maxZ: 13.02446 }),
      Object.freeze({ minX: -5.474773, maxX: 3.637373, minZ: 5.069679, maxZ: 13.434163 }),
    ]),
  }),
  "villa-le-bec": Object.freeze({
    assetId: "villa-le-bec",
    requestedTier: "massing",
    modelPath:
      "/models/tiers/xinhua-road/massing-v2/villa-le-bec-massing.glb"
      + "?v=20260726-massing-593cc399",
    buildRecord:
      "docs/research/build-records/tiers/xinhua-road/massing-v2/"
      + "villa-le-bec-massing.json",
    mapGate: "docs/research/villa-le-bec-massing-map-gate.json",
  }),
  "xinhua-villas-329": Object.freeze({
    assetId: "xinhua-villas-329",
    requestedTier: "massing",
    modelPath:
      "/models/tiers/xinhua-road/massing-v3/xinhua-villas-329-massing.glb"
      + "?v=20260726-massing-f245efd0",
    buildRecord:
      "docs/research/build-records/tiers/xinhua-road/massing-v3/"
      + "xinhua-villas-329-massing.json",
    mapGate:
      "docs/research/xinhua-villas-329-massing-v3-integration-candidate.json",
  }),
  "hudec-memorial": Object.freeze({
    assetId: "hudec-memorial",
    requestedTier: "massing",
    modelPath:
      "/models/requested-pois/hudec-memorial-massing.glb"
      + "?v=20260726-hudec-massing-772ce8a8445a",
    buildRecord: "docs/research/build-records/hudec-memorial-massing.json",
    mapGate: "test_artifacts/test_hudec-memorial_map_calibration.json",
    placement: Object.freeze({
      position: Object.freeze([92.535374, -132.52181]),
      yaw: 0.153486288,
      scale: 0.88,
    }),
    start: Object.freeze({
      position: Object.freeze([92.5, -145]),
      forward: Object.freeze([0, 1]),
    }),
    localObstacles: Object.freeze([
      Object.freeze({ minX: -4.608, maxX: 4.104, minZ: -2.988, maxZ: 2.052 }),
      Object.freeze({ minX: 2.016, maxX: 4.752, minZ: -3.42, maxZ: 1.62 }),
      Object.freeze({ minX: -4.5, maxX: -0.9, minZ: -3.762, maxZ: -1.35 }),
      Object.freeze({ minX: 0.738, maxX: 1.1124, minZ: 1.926, maxZ: 3.186 }),
      Object.freeze({ minX: 2.7036, maxX: 3.078, minZ: 1.926, maxZ: 3.186 }),
      Object.freeze({ minX: -6.048, maxX: -2.448, minZ: 4.5216, maxZ: 4.9104 }),
      Object.freeze({ minX: 2.448, maxX: 6.048, minZ: 4.5216, maxZ: 4.9104 }),
    ]),
  }),
  "xinhua-community-center": Object.freeze({
    assetId: "xinhua-community-center",
    requestedTier: "massing",
    modelPath:
      "/models/tiers/xinhua-road/massing-v2/"
      + "xinhua-community-center-massing.glb"
      + "?v=20260726-massing-a0609064",
    buildRecord:
      "docs/research/build-records/tiers/xinhua-road/massing-v2/"
      + "xinhua-community-center-massing.json",
    mapGate: "docs/research/xinhua-community-center-massing-map-gate.json",
    placement: Object.freeze({
      position: Object.freeze([-74.78057782060566, 112.5501903703319]),
      yaw: 1.1800125527954972,
      scale: 1,
    }),
    start: Object.freeze({
      position: Object.freeze([-66.401198105, 115.83439432]),
      forward: Object.freeze([-0.9310421906207795, -0.3649115499460933]),
    }),
    localObstacles: Object.freeze([
      Object.freeze({
        minX: -6.2328073354853455,
        maxX: 6.3375736373407205,
        minZ: -2.0344502538968166,
        maxZ: 2.6093047586433475,
      }),
    ]),
  }),
  "xinhua-pocket-park": Object.freeze({
    assetId: "xinhua-pocket-park",
    requestedTier: "massing",
    modelPath:
      "/models/tiers/xinhua-road/massing-v2/"
      + "xinhua-pocket-park-massing.glb"
      + "?v=20260726-massing-cc89e36e",
    buildRecord:
      "docs/research/build-records/tiers/xinhua-road/massing-v2/"
      + "xinhua-pocket-park-massing.json",
    mapGate: "docs/research/xinhua-pocket-park-massing-map-qa.json",
    runtimePromotionAllowed: "pending-runtime-acceptance",
    legacyObstacleSuppressions: Object.freeze([
      Object.freeze({
        assetId: "fics-xinhua-365",
        obstacleIndexes: Object.freeze([2]),
        reason: "legacy-long-wall-aabb-conflicts-with-osm-clearance-8.248087",
      }),
    ]),
    // 中央通路仅比人物直径宽约 0.093 场景单位；人物半径已提供实体留距。
    // 这里禁用全局 0.2 冗余、把旋转长墙切片，并把碰撞壳收进墙体内侧约
    // 0.19 米，以补偿当前轴对齐方形人物碰撞在斜向通路中的保守投影。
    collisionMargin: 0,
    placement: Object.freeze({
      position: Object.freeze([-57.421934309, 67.06298037]),
      yaw: -0.398058989,
      scale: 0.88,
    }),
    start: Object.freeze({
      position: Object.freeze([-55.160193116, 61.684376543]),
      forward: Object.freeze([-0.387629821, 0.921815124]),
    }),
    // 仅镜墙为实体碰撞，中央路径、入口、种植带和座椅区域保持开放。
    localObstacles: Object.freeze([
      ...splitObstacleAlongSourceZ({
        minX: -0.84,
        maxX: -0.76,
        minZ: -4.6,
        maxZ: 4.6,
      }, 0.06),
      ...splitObstacleAlongSourceZ({
        minX: 0.76,
        maxX: 0.84,
        minZ: -4.6,
        maxZ: 4.6,
      }, 0.06),
    ]),
  }),
  "fics-xinhua-365": Object.freeze({
    assetId: "fics-xinhua-365",
    requestedTier: "massing",
    modelPath:
      "/models/tiers/xinhua-road/massing-v2/"
      + "fics-xinhua-365-massing.glb"
      + "?v=20260726-massing-e36f29a3",
    buildRecord:
      "docs/research/build-records/tiers/xinhua-road/massing-v2/"
      + "fics-xinhua-365-massing.json",
    mapGate: "docs/research/fics-xinhua-365-recovery-map-audit.json",
    runtimePromotionAllowed: false,
    blocker: "formal-membership-and-service-road-overlap",
    placement: Object.freeze({
      position: Object.freeze([-76.1, 75.2]),
      yaw: -0.38,
      scale: 0.9,
    }),
    start: Object.freeze({
      position: Object.freeze([-71.6, 43.8]),
      forward: Object.freeze([-0.096, 0.995]),
    }),
    // 五栋 OSM 灰模分别碰撞；这些盒只供阻塞诊断，不授权生产接线。
    localObstacles: Object.freeze([
      Object.freeze({ minX: -2.840463, maxX: 2.442968, minZ: -3.263749, maxZ: 1.209419 }),
      Object.freeze({ minX: -2.088969, maxX: 6.150009, minZ: 3.953862, maxZ: 12.356972 }),
      Object.freeze({ minX: -10.708587, maxX: -5.018219, minZ: -4.772031, maxZ: -1.832642 }),
      Object.freeze({ minX: -21.485395, maxX: -3.49291, minZ: 6.253774, maxZ: 10.304317 }),
      Object.freeze({ minX: 10.76934, maxX: 15.707629, minZ: -1.391146, maxZ: 2.879967 }),
    ]),
  }),
  "shanghai-orchestra": Object.freeze({
    assetId: "shanghai-orchestra",
    requestedTier: "massing",
    modelPath:
      "/models/tiers/xinhua-road/massing-v2/"
      + "shanghai-orchestra-massing.glb"
      + "?v=20260726-massing-63eb25ca",
    buildRecord:
      "docs/research/build-records/tiers/xinhua-road/massing-v2/"
      + "shanghai-orchestra-massing.json",
    mapGate: "docs/research/shanghai-orchestra-massing-map-gate.json",
    runtimePromotionAllowed: false,
    blocker: "formal-membership-evidence",
    placement: Object.freeze({
      position: Object.freeze([-44.4, 44]),
      yaw: 2.761592653589793,
      scale: 0.88,
    }),
    start: Object.freeze({
      position: Object.freeze([-28.5, 60]),
      forward: Object.freeze([-0.707, -0.707]),
    }),
    // 五个候选 footprint 分体碰撞；仅用于运行时诊断，不代表归属已裁定。
    localObstacles: Object.freeze([
      Object.freeze({ minX: -12.462237, maxX: -2.495484, minZ: -13.121194, maxZ: -4.317778 }),
      Object.freeze({ minX: 6.990277, maxX: 11.433858, minZ: -2.388907, maxZ: 6.949206 }),
      Object.freeze({ minX: -16.367495, maxX: -7.618803, minZ: -0.213896, maxZ: 7.052497 }),
      Object.freeze({ minX: 7.843147, maxX: 25.8515, minZ: -16.782836, maxZ: -3.77965 }),
      Object.freeze({ minX: -14.221787, maxX: -8.260416, minZ: 7.616155, maxZ: 10.66821 }),
    ]),
  }),
});

export function resolveBuildingMassingQa(search = "") {
  const params = new URLSearchParams(search);
  if (params.get("qaModelTier") !== "massing") return null;
  const assetId = params.get("qaModelId");
  if (!assetId) return null;
  return BUILDING_MASSING_QA_CANDIDATES[assetId] ?? null;
}
