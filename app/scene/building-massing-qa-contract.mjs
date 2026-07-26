export const BUILDING_MASSING_QA_CANDIDATES = Object.freeze({
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
});

export function resolveBuildingMassingQa(search = "") {
  const params = new URLSearchParams(search);
  if (params.get("qaModelTier") !== "massing") return null;
  const assetId = params.get("qaModelId");
  if (!assetId) return null;
  return BUILDING_MASSING_QA_CANDIDATES[assetId] ?? null;
}
