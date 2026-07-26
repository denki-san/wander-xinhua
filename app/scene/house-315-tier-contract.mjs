export const HOUSE_315_ASSET_ID = "house-315";

export const HOUSE_315_SOURCE_GLTF_BOUNDS = Object.freeze({
  minX: -7.675,
  maxX: 7.225,
  minZ: -4.575,
  maxZ: 4.84,
});

export const HOUSE_315_SOURCE_LOCAL_OBSTACLES = Object.freeze([
  Object.freeze({
    minX: -7.675,
    maxX: -2.1254,
    minZ: -4.575,
    maxZ: 1.307215,
  }),
  Object.freeze({
    minX: -2.1254,
    maxX: 7.225,
    minZ: -4.575,
    maxZ: 1.307215,
  }),
  Object.freeze({
    minX: -6.432454,
    maxX: -2.108321,
    minZ: 1.307215,
    maxZ: 4.84,
  }),
]);

function mirrorZ({ minX, maxX, minZ, maxZ }) {
  return Object.freeze({
    minX,
    maxX,
    minZ: -maxZ,
    maxZ: -minZ,
  });
}

export const HOUSE_315_PLACEMENT = Object.freeze({
  position: Object.freeze([-20.127789, 82.330463]),
  yaw: -0.401372,
  scale: 0.754254,
  start: Object.freeze([-21.8, 67.6]),
  forward: Object.freeze([0.152032, 0.988376]),
  localBounds: HOUSE_315_SOURCE_GLTF_BOUNDS,
  localObstacles: HOUSE_315_SOURCE_LOCAL_OBSTACLES,
  sourceGltfBounds: HOUSE_315_SOURCE_GLTF_BOUNDS,
  renderedLocalBounds: mirrorZ(HOUSE_315_SOURCE_GLTF_BOUNDS),
  renderedLocalObstacles: Object.freeze(
    HOUSE_315_SOURCE_LOCAL_OBSTACLES.map(mirrorZ),
  ),
  axisConversion: "gltf-z-mirrored-once-at-render",
  mapPositionStatus: "osm-calibrated-runtime-pass",
  mapSourceWayId: 864485667,
  collisionSource: "osm-way-864485667-three-rectangle-decomposition",
});

function tier({
  name,
  path,
  cacheVersion,
  sha256,
  bytes,
  triangles,
  materials,
}) {
  return Object.freeze({
    name,
    path,
    cacheVersion,
    url: `${path}?v=${cacheVersion}`,
    sha256,
    bytes,
    triangles,
    materials,
    bounds: HOUSE_315_SOURCE_GLTF_BOUNDS,
    runtimeLocalBounds: HOUSE_315_PLACEMENT.renderedLocalBounds,
    origin: Object.freeze([0, 0, 0]),
    frontDirection: "blender-local-negative-y",
    runtimeFrontDirection: "three-local-negative-z",
    groundDatum: 0,
  });
}

export const HOUSE_315_TIERS = Object.freeze({
  hero: tier({
    name: "hero",
    path: "/models/tiers/xinhua-road/hero-v2/house-315-hero.glb",
    cacheVersion: "20260725-hero-ad414549",
    sha256: "ad414549bf6953bdeffe9b43d56b589101becf1a8c9efb57ac34446eac92f964",
    bytes: 212908,
    triangles: 2936,
    materials: 6,
  }),
  identity: tier({
    name: "identity",
    path: "/models/tiers/xinhua-road/identity-v1/house-315-identity.glb",
    cacheVersion: "20260725-identity-425e21b9",
    sha256: "425e21b9773140d6a77604eb6de145996c8e36e6740498dbc41855ee43b2f12d",
    bytes: 62288,
    triangles: 776,
    materials: 6,
  }),
  massing: tier({
    name: "massing",
    path: "/models/tiers/xinhua-road/massing-v2/house-315-massing.glb",
    cacheVersion: "20260725-massing-e9d62cfc",
    sha256: "e9d62cfc7ffba69145d62508656a033a873e5769171414aff2124f7320389832",
    bytes: 17352,
    triangles: 176,
    materials: 4,
  }),
});

export const HOUSE_315_FALLBACK_CHAIN = Object.freeze({
  hero: "identity",
  identity: "massing",
  massing: null,
});

export function resolveHouse315Qa(search = "") {
  const parameters = new URLSearchParams(search);
  if (parameters.get("qaModelId") !== HOUSE_315_ASSET_ID) return null;
  const requestedTier = parameters.get("qaModelTier");
  if (!["hero", "identity", "massing"].includes(requestedTier)) return null;

  const requested = HOUSE_315_TIERS[requestedTier];
  const fallbackRequested = (
    parameters.get("qaActiveFallback")
    === `${HOUSE_315_ASSET_ID}:${requestedTier}`
  );
  const hasLowerTier = HOUSE_315_FALLBACK_CHAIN[requestedTier] !== null;
  const forceFallback = fallbackRequested && hasLowerTier;
  const renderedTier = forceFallback
    ? HOUSE_315_FALLBACK_CHAIN[requestedTier]
    : requestedTier;
  const rendered = renderedTier
    ? HOUSE_315_TIERS[renderedTier]
    : requested;

  return Object.freeze({
    assetId: HOUSE_315_ASSET_ID,
    requestedTier,
    renderedTier,
    modelPath: requested.url,
    renderedModelPath: rendered.url,
    sha256: requested.sha256,
    renderedSha256: rendered.sha256,
    forcedFallback: forceFallback,
    fallbackMode: forceFallback
      ? "forced-deterministic-fallback"
      : fallbackRequested
        ? "no-lower-tier"
        : "none",
    fallbackReason: forceFallback
      ? `forced-deterministic-${requestedTier}-to-${renderedTier}`
      : fallbackRequested
        ? "no-lower-tier-render-massing"
        : "none",
    placement: HOUSE_315_PLACEMENT,
  });
}
