export const XINGFULI_SEGMENT_IDS = Object.freeze([
  "xingfuli-west",
  "xingfuli-center",
  "xingfuli-east",
]);

const TIER_ORDER = Object.freeze(["hero", "identity", "massing"]);
const FALLBACK_CHAIN = Object.freeze({
  hero: "identity",
  identity: "massing",
  massing: null,
});

function tier(segment, name, sha256, bytes, cacheVersion, pathOverride = null) {
  const suffix = name === "hero" ? "" : `-${name}`;
  const path = pathOverride ?? `/models/xingfuli/${segment}${suffix}.glb`;
  return Object.freeze({
    name,
    path,
    cacheVersion,
    url: `${path}?v=${cacheVersion}`,
    sha256,
    bytes,
  });
}

export const XINGFULI_TIERS = Object.freeze({
  "xingfuli-west": Object.freeze({
    hero: tier(
      "xingfuli-west",
      "hero",
      "ababb1860c360f5807ce99b392a5388eba30f0991bdcb4f653c99752786bf853",
      317012,
      "20260723-final-1",
    ),
    identity: tier(
      "xingfuli-west",
      "identity",
      "163d214be91a4eacc45a383913e89e820757b97765f74c5b4be080f74f34426d",
      280424,
      "20260726-lineage-v2-163d214",
      "/models/tiers/xingfuli/identity-v2/xingfuli-west-identity-v2.glb",
    ),
    massing: tier(
      "xingfuli-west",
      "massing",
      "f6d67f041162e4c090ff16f65897837db64c64fb3cf5a8baf0a4462c4e8ac377",
      196312,
      "20260726-lineage-v2-f6d67f0",
      "/models/tiers/xingfuli/massing-v2/xingfuli-west-massing-v2.glb",
    ),
  }),
  "xingfuli-center": Object.freeze({
    hero: tier(
      "xingfuli-center",
      "hero",
      "860249a2656cf7af9aa2ef746f05cc7f39506ec1e8751df236e3c1e3f0f594b9",
      554080,
      "20260723-final-1",
    ),
    identity: tier(
      "xingfuli-center",
      "identity",
      "a6c1339d6a77f8f5b0b493b0f477c0aa0ccf9a9db42b6e571b01f343efef4f06",
      452504,
      "20260726-lineage-v2-a6c1339",
      "/models/tiers/xingfuli/identity-v2/xingfuli-center-identity-v2.glb",
    ),
    massing: tier(
      "xingfuli-center",
      "massing",
      "a36b840fa7773db56fba5c6bbd9b77ed08a03b588ebfc0a358d4a9e82b2b0d99",
      309700,
      "20260726-lineage-v2-a36b840",
      "/models/tiers/xingfuli/massing-v2/xingfuli-center-massing-v2.glb",
    ),
  }),
  "xingfuli-east": Object.freeze({
    hero: tier(
      "xingfuli-east",
      "hero",
      "4dc21aa6f137daa076a6da1948b0c08c15310789541ee59af06c352febea4327",
      499736,
      "20260723-final-1",
    ),
    identity: tier(
      "xingfuli-east",
      "identity",
      "3352d6174273a87a1a049df61a884255d451d424f36a203361cf74671a71db25",
      461300,
      "20260726-lineage-v2-3352d61",
      "/models/tiers/xingfuli/identity-v2/xingfuli-east-identity-v2.glb",
    ),
    massing: tier(
      "xingfuli-east",
      "massing",
      "c0defcbdc99c5939499db3ce33fb4d01cb8f8cf9f9a5fc49dd9270e8a23d3450",
      323544,
      "20260726-lineage-v2-c0defcb",
      "/models/tiers/xingfuli/massing-v2/xingfuli-east-massing-v2.glb",
    ),
  }),
});

export function resolveXingfuliQa(search = "") {
  const parameters = new URLSearchParams(search);
  const assetId = parameters.get("qaModelId");
  const requestedTier = parameters.get("qaModelTier");
  if (!XINGFULI_SEGMENT_IDS.includes(assetId)) return null;
  if (!TIER_ORDER.includes(requestedTier)) return null;

  const fallbackRequested = (
    parameters.get("qaActiveFallback") === `${assetId}:${requestedTier}`
  );
  const nextTier = FALLBACK_CHAIN[requestedTier];
  const forcedFallback = fallbackRequested && nextTier !== null;
  const renderedTier = forcedFallback ? nextTier : requestedTier;
  const requested = XINGFULI_TIERS[assetId][requestedTier];
  const rendered = XINGFULI_TIERS[assetId][renderedTier];

  return Object.freeze({
    assetId,
    requestedTier,
    renderedTier,
    modelPath: requested.url,
    renderedModelPath: rendered.url,
    sha256: requested.sha256,
    renderedSha256: rendered.sha256,
    forcedFallback,
    fallbackMode: forcedFallback
      ? "forced-deterministic-fallback"
      : fallbackRequested
        ? "no-lower-tier"
        : "none",
    fallbackReason: forcedFallback
      ? `forced-deterministic-${requestedTier}-to-${renderedTier}`
      : fallbackRequested
        ? "no-lower-tier-render-massing"
        : "none",
  });
}
