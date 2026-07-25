export const SHANGHAI_CINEMA_MASSING_MODEL_PATH =
  "/models/tiers/shanghai-cinema/massing/shanghai-cinema-massing.glb";
export const SHANGHAI_CINEMA_MASSING_CACHE_VERSION = "be6963875918";
export const SHANGHAI_CINEMA_MASSING_GLB_SHA256 =
  "be69638759187a16e23e563009a487bd480ff9c37f9cf74e557ede9553691d70";

export const SHANGHAI_CINEMA_MASSING_GLB_BOUNDS = {
  minX: -17.025519,
  maxX: 15.200174,
  minZ: -9.970999,
  maxZ: 11.22396,
  height: 17.225,
};

// Blender MCP 三视角证据固定为 1080 × 760。运行时复核应保留同一垂直构图，
// 不能随浏览器宽高比变化而把侧翼或塔楼裁出画面。
export const SHANGHAI_CINEMA_MASSING_REVIEW_RENDER_SIZE = [1080, 760];

export const SHANGHAI_CINEMA_MASSING_QA_VIEWS = {
  canonical: {
    cameraBlender: [12, -50, 7],
    targetBlender: [0, -0.6, 6.2],
    lensMm: 48,
  },
  side: {
    cameraBlender: [39, -34, 8.5],
    targetBlender: [4, -0.2, 6.5],
    lensMm: 52,
  },
  entrance: {
    cameraBlender: [14, -57, 5.5],
    targetBlender: [0, -0.8, 5.8],
    lensMm: 52,
  },
};

export function blenderPointToShanghaiCinemaRuntimeLocal([
  blenderX,
  blenderY,
  blenderZ,
]) {
  // 生成器在导出前镜像 X，glTF 转为 Y-up，组件再反射 glTF Z。
  return [-blenderX, blenderZ, blenderY];
}

export function shanghaiCinemaBlenderPointToWorld({
  point,
  position,
  yaw,
  scale = 1,
  baseY = 0,
  detailScale = 1,
}) {
  const [localX, localY, localZ] =
    blenderPointToShanghaiCinemaRuntimeLocal(point);
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  return [
    (
      position[0]
      + scale * (cosine * localX + sine * localZ)
    ) * detailScale,
    (baseY + scale * localY) * detailScale,
    (
      position[1]
      + scale * (-sine * localX + cosine * localZ)
    ) * detailScale,
  ];
}
