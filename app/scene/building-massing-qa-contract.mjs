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
});

export function resolveBuildingMassingQa(search = "") {
  const params = new URLSearchParams(search);
  if (params.get("qaModelTier") !== "massing") return null;
  const assetId = params.get("qaModelId");
  if (!assetId) return null;
  return BUILDING_MASSING_QA_CANDIDATES[assetId] ?? null;
}
