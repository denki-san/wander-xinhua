export const SHANGHAI_CINEMA_ASSET_ID = "shanghai-cinema";
export const SHANGHAI_CINEMA_SHA256 =
  "c4d557038677c9c48577636843fb784b496f4a92fc9ea6bbb1d5ca78e822c062";
export const SHANGHAI_CINEMA_BYTES = 5_862_660;
export const SHANGHAI_CINEMA_CACHE_VERSION =
  `sha256-${SHANGHAI_CINEMA_SHA256}`;
export const SHANGHAI_CINEMA_CDN_URL =
  "https://xinhua.denkisan.me/cdn/sha256/c4d557038677c9c48577636843fb784b496f4a92fc9ea6bbb1d5ca78e822c062/shanghai-cinema.glb.bin.js";
export const SHANGHAI_CINEMA_LOCAL_FALLBACK_PATH =
  "/models/xinhua-road/shanghai-cinema.glb";
export const SHANGHAI_CINEMA_LOCAL_FALLBACK = (
  `${SHANGHAI_CINEMA_LOCAL_FALLBACK_PATH}?v=${SHANGHAI_CINEMA_CACHE_VERSION}`
);

export const SHANGHAI_CINEMA_DELIVERY_CONTRACT = Object.freeze({
  assetId: SHANGHAI_CINEMA_ASSET_ID,
  primary: SHANGHAI_CINEMA_CDN_URL,
  fallback: SHANGHAI_CINEMA_LOCAL_FALLBACK,
  sha256: SHANGHAI_CINEMA_SHA256,
  bytes: SHANGHAI_CINEMA_BYTES,
});

function forcesLocalFallback(search) {
  const requested = new URLSearchParams(search).get("asset-cdn-fallback");
  if (!requested) return false;
  return requested
    .split(",")
    .map((value) => value.trim())
    .some((value) => (
      value === "all" || value === SHANGHAI_CINEMA_ASSET_ID
    ));
}

export function resolveShanghaiCinemaDelivery(
  search = "",
  contract = SHANGHAI_CINEMA_DELIVERY_CONTRACT,
) {
  const resolvedContract = contract ?? {
    ...SHANGHAI_CINEMA_DELIVERY_CONTRACT,
    primary: null,
  };
  const useLocal = (
    !resolvedContract.primary
    || forcesLocalFallback(search)
  );
  return {
    assetId: SHANGHAI_CINEMA_ASSET_ID,
    requestedPath: resolvedContract.primary
      ?? SHANGHAI_CINEMA_LOCAL_FALLBACK,
    loadedPath: useLocal
      ? resolvedContract.fallback ?? SHANGHAI_CINEMA_LOCAL_FALLBACK
      : resolvedContract.primary,
    status: useLocal ? "local-fallback" : "cdn",
    sha256: resolvedContract.sha256 ?? SHANGHAI_CINEMA_SHA256,
    bytes: resolvedContract.bytes ?? SHANGHAI_CINEMA_BYTES,
  };
}
