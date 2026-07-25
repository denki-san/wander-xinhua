export const FILM_ART_CENTER_ASSET_ID = "film-art-center";
export const FILM_ART_CENTER_HERO_SHA256 =
  "33daaaf003b47b705e03c95d2fe2ac0973b815079753f868c95c3b0f2f9b8e1b";
export const FILM_ART_CENTER_HERO_CACHE_VERSION = "20260725-film-art-5";
export const FILM_ART_CENTER_HERO_MODEL_PATH =
  "/models/xinhua-road/film-art-center.glb"
  + `?v=${FILM_ART_CENTER_HERO_CACHE_VERSION}`;
export const FILM_ART_CENTER_IDENTITY_SHA256 =
  "a4d37446e27225815624e6382048ed1dc341f1e079f089755ed5fb68e520e869";
export const FILM_ART_CENTER_IDENTITY_CACHE_VERSION =
  "20260725-film-art-identity-1";
export const FILM_ART_CENTER_IDENTITY_MODEL_PATH =
  "/models/tiers/xinhua-road/identity/film-art-center-identity.glb"
  + `?v=${FILM_ART_CENTER_IDENTITY_CACHE_VERSION}`;
export const FILM_ART_CENTER_PRODUCTION_FALLBACK_TOKEN =
  "film-art-center-identity";
export const FILM_ART_CENTER_MASSING_SHA256 =
  "c89791dc3978b317cc2f8807a77f7a84b5c596f8d4cd01c1cffd05090e9584a6";
export const FILM_ART_CENTER_MASSING_MODEL_PATH =
  "/models/tiers/xinhua-road/massing/film-art-center-massing.glb"
  + `?v=${FILM_ART_CENTER_MASSING_SHA256.slice(0, 12)}`;

/**
 * 只为真实 production Identity Boundary 的失败回退验收替换请求地址。
 */
export function resolveFilmArtCenterProductionIdentitySource(search = "") {
  const parameters = new URLSearchParams(search);
  const forcedFallback = (
    parameters.get("qaProductionFallback")
    === FILM_ART_CENTER_PRODUCTION_FALLBACK_TOKEN
  );
  return {
    modelPath: forcedFallback
      ? (
        "/models/tiers/xinhua-road/identity/"
        + "test_missing-film-art-center-production-identity.glb"
        + `?v=${FILM_ART_CENTER_IDENTITY_SHA256.slice(0, 12)}-fallback`
      )
      : FILM_ART_CENTER_IDENTITY_MODEL_PATH,
    forcedFallback,
  };
}

/**
 * 为单建筑同机位运行时门暴露 Hero、Identity、Massing；不改变地图放置与 Hero 距离策略。
 */
export function resolveFilmArtCenterQaTier(search = "") {
  const parameters = new URLSearchParams(search);
  if (parameters.get("qaModelId") !== FILM_ART_CENTER_ASSET_ID) return null;

  const tier = parameters.get("qaModelTier");
  const asset = {
    hero: {
      sha256: FILM_ART_CENTER_HERO_SHA256,
      modelPath: FILM_ART_CENTER_HERO_MODEL_PATH,
    },
    identity: {
      sha256: FILM_ART_CENTER_IDENTITY_SHA256,
      modelPath: FILM_ART_CENTER_IDENTITY_MODEL_PATH,
    },
    massing: {
      sha256: FILM_ART_CENTER_MASSING_SHA256,
      modelPath: FILM_ART_CENTER_MASSING_MODEL_PATH,
    },
  }[tier];
  if (!asset) return null;

  const fallbackToken = parameters.get("qaActiveFallback");
  const forcedFallback = (
    fallbackToken === `${FILM_ART_CENTER_ASSET_ID}-${tier}`
    || (tier === "massing" && fallbackToken === "massing")
  );
  return {
    assetId: FILM_ART_CENTER_ASSET_ID,
    tier,
    sha256: asset.sha256,
    modelPath: forcedFallback
      ? (
        `/models/tiers/xinhua-road/${tier}/`
        + `test_missing-film-art-center-${tier}.glb`
        + `?v=${asset.sha256.slice(0, 12)}-fallback`
      )
      : asset.modelPath,
    forcedFallback,
    productionDefaultChanged: false,
  };
}
