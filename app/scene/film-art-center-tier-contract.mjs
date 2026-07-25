export const FILM_ART_CENTER_ASSET_ID = "film-art-center";
export const FILM_ART_CENTER_MASSING_SHA256 =
  "c89791dc3978b317cc2f8807a77f7a84b5c596f8d4cd01c1cffd05090e9584a6";
export const FILM_ART_CENTER_MASSING_MODEL_PATH =
  "/models/tiers/xinhua-road/massing/film-art-center-massing.glb"
  + `?v=${FILM_ART_CENTER_MASSING_SHA256.slice(0, 12)}`;

/**
 * 仅为真实地图门暴露单建筑 Massing；不改变生产默认 Identity/Hero 策略。
 */
export function resolveFilmArtCenterQaTier(search = "") {
  const parameters = new URLSearchParams(search);
  if (
    parameters.get("qaModelId") !== FILM_ART_CENTER_ASSET_ID
    || parameters.get("qaModelTier") !== "massing"
  ) return null;

  const forcedFallback = parameters.get("qaActiveFallback") === "massing";
  return {
    assetId: FILM_ART_CENTER_ASSET_ID,
    tier: "massing",
    sha256: FILM_ART_CENTER_MASSING_SHA256,
    modelPath: forcedFallback
      ? (
        "/models/tiers/xinhua-road/massing/"
        + "test_missing-film-art-center-massing.glb"
        + `?v=${FILM_ART_CENTER_MASSING_SHA256.slice(0, 12)}-fallback`
      )
      : FILM_ART_CENTER_MASSING_MODEL_PATH,
    forcedFallback,
    productionDefaultChanged: false,
  };
}
