export const XINHUA_AUTUMN_ATMOSPHERE = {
  skyTexture: "/textures/sky/kenney-day-2048.jpg?v=6562e776856e",
  background: "#91bce3",
  fog: "#b8c8d7",
  sunColor: "#ffd09b",
  sunOffset: [-110, 50, 52] as const,
  hemisphereSky: "#dceaf5",
  hemisphereGround: "#80644e",
  ambientIntensity: {
    explore: 0.34,
    overview: 0.74,
  },
  hemisphereIntensity: {
    explore: 0.82,
    overview: 1.08,
  },
  sunIntensity: {
    explore: 3.05,
    overview: 2.35,
  },
} as const;
