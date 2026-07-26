export const SHANGHAI_CINEMA_MASSING_MODEL_PATH =
  "/models/xinhua-road/shanghai-cinema-massing.glb";
export const SHANGHAI_CINEMA_MASSING_CACHE_VERSION = "20260725-massing-1";
export const SHANGHAI_CINEMA_MASSING_GLB_SHA256 =
  "e1635a7796ad9ca4f7699e5559c73c4a02591b601e9d300f8a874c73a7a513ab";

export const SHANGHAI_CINEMA_MASSING_GLB_BOUNDS = Object.freeze({
  minX: -19,
  maxX: 19,
  minY: 0,
  maxY: 17.225000381469727,
  minZ: -11.800000190734863,
  maxZ: 14.199999809265137,
});

export const SHANGHAI_CINEMA_MAP_CALIBRATION = Object.freeze({
  position: Object.freeze([74.1, 80.9]),
  yaw: 2.761592653589793,
  scale: 1,
  terrainY: 0.909780347,
  terrainClearance: 0.1,
  placementY: 1.009780347,
  start: Object.freeze([101, 112]),
  forward: Object.freeze([-0.654, -0.756]),
  cameraTargetHeight: 2.8,
  localBounds: Object.freeze({
    minX: -19,
    maxX: 19,
    minZ: -11.8,
    maxZ: 14.2,
  }),
  localObstacles: Object.freeze([
    Object.freeze({ minX: -10.5, maxX: 10.5, minZ: -7.3, maxZ: 6.2 }),
    Object.freeze({ minX: -14.4, maxX: -10.5, minZ: -10, maxZ: 4.5 }),
    Object.freeze({ minX: 10.5, maxX: 14.4, minZ: -10, maxZ: 4.5 }),
  ]),
});

export const SHANGHAI_CINEMA_MCP3_QA_VIEWS = Object.freeze({
  canonical: Object.freeze({
    cameraBlender: Object.freeze([12, -50, 7]),
    targetBlender: Object.freeze([0, -0.6, 6.2]),
    lensMm: 48,
  }),
  side: Object.freeze({
    cameraBlender: Object.freeze([39, -34, 8.5]),
    targetBlender: Object.freeze([4, -0.2, 6.5]),
    lensMm: 52,
  }),
  entrance: Object.freeze({
    cameraBlender: Object.freeze([10, -45, 5.5]),
    targetBlender: Object.freeze([0, -1, 6]),
    lensMm: 48,
  }),
});

export const SHANGHAI_CINEMA_MCP3_HUMAN_SCALE = Object.freeze({
  heightMeters: 1.8,
  metersPerSceneUnit: 2.7,
  heightSceneUnits: 1.8 / 2.7,
});

export function blenderPointToShanghaiCinemaRuntimeLocal([
  blenderX,
  blenderY,
  blenderZ,
]) {
  // 生成器导出前镜像 X，glTF 转为 Y-up，组件再反射 glTF Z。
  return [-blenderX, blenderZ, blenderY];
}

export function shanghaiCinemaBlenderPointToWorld({
  point,
  position = SHANGHAI_CINEMA_MAP_CALIBRATION.position,
  yaw = SHANGHAI_CINEMA_MAP_CALIBRATION.yaw,
  scale = SHANGHAI_CINEMA_MAP_CALIBRATION.scale,
  baseY = 0,
  detailScale = 1,
}) {
  const [localX, localY, localZ] =
    blenderPointToShanghaiCinemaRuntimeLocal(point);
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  return [
    (position[0] + scale * (cosine * localX + sine * localZ)) * detailScale,
    (baseY + scale * localY) * detailScale,
    (position[1] + scale * (-sine * localX + cosine * localZ)) * detailScale,
  ];
}
