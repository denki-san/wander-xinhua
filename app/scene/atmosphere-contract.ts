export const XINHUA_AUTUMN_ATMOSPHERE = {
  skyTexture: "/textures/sky/kenney-day-2048.jpg?v=6562e776856e",
  background: "#9fc4e4",
  fog: "#b9c7d1",
  sunColor: "#ffc47f",
  sunOffset: [-62, 60, -150] as const,
  skyFillColor: "#a8c6d8",
  skyFillOffset: [-96, 54, 112] as const,
  ambientColor: "#fff0da",
  hemisphereSky: "#bfd7e7",
  hemisphereGround: "#615342",
  ambientIntensity: {
    explore: 0.055,
    overview: 0.42,
  },
  hemisphereIntensity: {
    explore: 0.42,
    overview: 0.86,
  },
  sunIntensity: {
    explore: 5.0,
    overview: 3.55,
  },
  skyFillIntensity: {
    explore: 2.15,
    overview: 0.82,
  },
} as const;
