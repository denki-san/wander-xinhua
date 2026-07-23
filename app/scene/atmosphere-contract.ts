export const XINHUA_AUTUMN_ATMOSPHERE = {
  skyTexture: "/textures/sky/kenney-day-2048.jpg?v=6562e776856e",
  background: "#91bce3",
  fog: "#c6d1da",
  sunColor: "#ffc27d",
  sunOffset: [-108, 39, 50] as const,
  hemisphereSky: "#cedfeb",
  hemisphereGround: "#705a43",
  toneMappingExposure: 1.03,
  ambientIntensity: {
    explore: 0.2,
    overview: 0.56,
  },
  hemisphereIntensity: {
    explore: 0.58,
    overview: 0.82,
  },
  sunIntensity: {
    explore: 3.0,
    overview: 2.3,
  },
} as const;
