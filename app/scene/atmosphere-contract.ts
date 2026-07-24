export const XINHUA_ATMOSPHERES = {
  "autumn-afternoon": {
    skyTexture: "/textures/sky/kenney-day-2048.jpg?v=6562e776856e",
    background: "#91bce3",
    fog: "#b8c8d7",
    sunColor: "#ffd09b",
    sunOffset: [-110, 50, 52] as const,
    skyFillColor: "#ffffff",
    skyFillOffset: [0, 0, 0] as const,
    ambientColor: "#ffffff",
    hemisphereSky: "#dceaf5",
    hemisphereGround: "#80644e",
    ambientIntensity: { explore: 0.34, overview: 0.74 },
    hemisphereIntensity: { explore: 0.82, overview: 1.08 },
    sunIntensity: { explore: 3.05, overview: 2.35 },
    skyFillIntensity: { explore: 0, overview: 0 },
  },
  "lighting-v3": {
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
    ambientIntensity: { explore: 0.055, overview: 0.42 },
    hemisphereIntensity: { explore: 0.42, overview: 0.86 },
    sunIntensity: { explore: 5.0, overview: 3.55 },
    skyFillIntensity: { explore: 2.15, overview: 0.82 },
  },
} as const;

export type XinhuaAtmosphereStyle = keyof typeof XINHUA_ATMOSPHERES;
export type XinhuaAtmosphere = (typeof XINHUA_ATMOSPHERES)[XinhuaAtmosphereStyle];

export const DEFAULT_XINHUA_ATMOSPHERE_STYLE: XinhuaAtmosphereStyle = "lighting-v3";
export const XINHUA_AUTUMN_ATMOSPHERE = XINHUA_ATMOSPHERES[DEFAULT_XINHUA_ATMOSPHERE_STYLE];
