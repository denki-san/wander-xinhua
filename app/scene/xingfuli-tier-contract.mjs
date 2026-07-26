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
      "69dc45a7237bd563204aa0189a0e3396b183d7b822e9ee676f2f5db72894aca1",
      279108,
      "1",
    ),
    massing: tier(
      "xingfuli-west",
      "massing",
      "178c1bbf89a15a082c596cae6e994f042997998fef02a3bf6fcaecdb104e5c04",
      194984,
      "1",
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
      "d83f31ef60d01b342dd350605bafa71b87152e9f7ea9cd8fb04cbe80eb50e592",
      439020,
      "1",
    ),
    massing: tier(
      "xingfuli-east",
      "massing",
      "5924e935ed9cba120c77396f28adbea12368ad31448c63ad67c5b75a96d319ee",
      289288,
      "1",
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
