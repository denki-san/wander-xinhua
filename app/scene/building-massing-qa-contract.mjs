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
});

export function resolveBuildingMassingQa(search = "") {
  const params = new URLSearchParams(search);
  if (params.get("qaModelTier") !== "massing") return null;
  const assetId = params.get("qaModelId");
  if (!assetId) return null;
  return BUILDING_MASSING_QA_CANDIDATES[assetId] ?? null;
}
