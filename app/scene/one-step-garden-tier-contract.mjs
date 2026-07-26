export const ONE_STEP_GARDEN_ASSET_ID = "one-step-garden";

export const ONE_STEP_GARDEN_SOURCE_GLTF_BOUNDS = Object.freeze({
  minX: -7.25,
  maxX: 7.25,
  minZ: -9.325,
  maxZ: 6.9,
});

export const ONE_STEP_GARDEN_SOURCE_GLTF_OBSTACLES = Object.freeze([
  Object.freeze({ minX: -4.2, maxX: 4.2, minZ: -1.8, maxZ: 1.8 }),
  Object.freeze({ minX: -6.7, maxX: -3.3, minZ: -0.5, maxZ: 6.7 }),
  Object.freeze({ minX: 3.4, maxX: 6.6, minZ: -0.5, maxZ: 6.6 }),
  Object.freeze({ minX: -1.24, maxX: -1.06, minZ: 6.16, maxZ: 6.34 }),
  Object.freeze({ minX: 3.26, maxX: 3.44, minZ: 6.16, maxZ: 6.34 }),
  Object.freeze({ minX: -7, maxX: 7, minZ: -9.1, maxZ: -4.9 }),
  Object.freeze({ minX: -6.775, maxX: -3.525, minZ: -7.05, maxZ: -3.85 }),
  Object.freeze({ minX: 3.525, maxX: 6.775, minZ: -7.05, maxZ: -3.85 }),
]);

function mirrorZ({ minX, maxX, minZ, maxZ }) {
  return Object.freeze({
    minX,
    maxX,
    minZ: -maxZ,
    maxZ: -minZ,
  });
}

export const ONE_STEP_GARDEN_PLACEMENT = Object.freeze({
  position: Object.freeze([60.86, 120.73]),
  yaw: -0.38,
  scale: 0.88,
  start: Object.freeze([73, 109]),
  forward: Object.freeze([-0.925, 0.381]),
  localBounds: ONE_STEP_GARDEN_SOURCE_GLTF_BOUNDS,
  localObstacles: ONE_STEP_GARDEN_SOURCE_GLTF_OBSTACLES,
  sourceGltfBounds: ONE_STEP_GARDEN_SOURCE_GLTF_BOUNDS,
  renderedLocalBounds: mirrorZ(ONE_STEP_GARDEN_SOURCE_GLTF_BOUNDS),
  renderedLocalObstacles: Object.freeze(
    ONE_STEP_GARDEN_SOURCE_GLTF_OBSTACLES.map(mirrorZ),
  ),
  axisConversion: "gltf-z-mirrored-once-at-render",
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
    bounds: ONE_STEP_GARDEN_SOURCE_GLTF_BOUNDS,
    runtimeLocalBounds: ONE_STEP_GARDEN_PLACEMENT.renderedLocalBounds,
    origin: Object.freeze([0, 0, 0]),
    frontDirection: "blender-local-negative-y",
    runtimeFrontDirection: "three-local-negative-z",
    groundDatum: 0,
  });
}

export const ONE_STEP_GARDEN_TIERS = Object.freeze({
  hero: tier({
    name: "hero",
    path: "/models/tiers/xinhua-road/hero-v2/one-step-garden-hero.glb",
    cacheVersion: "20260725-hero-026565ba",
    sha256: "026565ba9dcb347c2dd1f9b23b277a2fdf795c6c26e3e46f4f8cd29c4dee2f2b",
    bytes: 259772,
    triangles: 3584,
    materials: 7,
  }),
  identity: tier({
    name: "identity",
    path: "/models/tiers/xinhua-road/identity-v1/one-step-garden-identity.glb",
    cacheVersion: "20260725-identity-928ecfca",
    sha256: "928ecfcace4a35e88ad68d34a2369fa673457275393ea65d8649d9de433b0497",
    bytes: 112456,
    triangles: 1484,
    materials: 6,
  }),
  massing: tier({
    name: "massing",
    path: "/models/tiers/xinhua-road/massing-v2/one-step-garden-massing.glb",
    cacheVersion: "20260725-massing-a87caeba",
    sha256: "a87caeba3b3ab4bc6735e6f3b98f424c15994895a8b51d8777d2cb98fb80e761",
    bytes: 18316,
    triangles: 204,
    materials: 3,
  }),
});

export const ONE_STEP_GARDEN_FALLBACK_CHAIN = Object.freeze({
  hero: "identity",
  identity: "massing",
  massing: null,
});

export function resolveOneStepGardenQa(search = "") {
  const parameters = new URLSearchParams(search);
  if (parameters.get("qaModelId") !== ONE_STEP_GARDEN_ASSET_ID) return null;
  const requestedTier = parameters.get("qaModelTier");
  if (!["hero", "identity", "massing"].includes(requestedTier)) return null;

  const requested = ONE_STEP_GARDEN_TIERS[requestedTier];
  const fallbackRequested =
    parameters.get("qaActiveFallback")
      === `${ONE_STEP_GARDEN_ASSET_ID}:${requestedTier}`;
  const hasLowerTier = ONE_STEP_GARDEN_FALLBACK_CHAIN[requestedTier] !== null;
  const forceFallback = fallbackRequested && hasLowerTier;
  const renderedTier = forceFallback
    ? ONE_STEP_GARDEN_FALLBACK_CHAIN[requestedTier]
    : requestedTier;
  const rendered = renderedTier
    ? ONE_STEP_GARDEN_TIERS[renderedTier]
    : requested;

  return Object.freeze({
    assetId: ONE_STEP_GARDEN_ASSET_ID,
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
    placement: ONE_STEP_GARDEN_PLACEMENT,
  });
}
