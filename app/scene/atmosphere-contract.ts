type AtmosphereModeValue = {
  explore: number;
  overview: number;
};

type AtmosphereShadow = {
  mapSize: {
    standard: number;
    low: number;
    overview: number;
  };
  camera: {
    near: number;
    far: number;
    exploreHalfExtent: number;
    overviewHalfExtent: number;
  };
  bias: number;
  normalBias: number;
  radius: number;
};

export type XinhuaAtmosphere = {
  id: XinhuaAtmosphereStyle;
  label: string;
  icon: string;
  skyTexture: string;
  background: string;
  fog: string;
  sun: {
    color: string;
    offset: readonly [number, number, number];
    intensity: AtmosphereModeValue;
    shadow: AtmosphereShadow;
  };
  fill: {
    ambient: {
      color: string;
      intensity: AtmosphereModeValue;
    };
    hemisphere: {
      sky: string;
      ground: string;
      intensity: AtmosphereModeValue;
    };
    directional: {
      color: string;
      offset: readonly [number, number, number];
      intensity: AtmosphereModeValue;
    };
  };
  sky: {
    cloudTint: readonly [number, number, number];
    cloudTintStrength: number;
    horizonTint: readonly [number, number, number];
    horizonTintStrength: number;
    colorBalance: readonly [number, number, number];
    colorBalanceStrength: number;
    sunColor: readonly [number, number, number];
    haloEdge: number;
    haloStrength: number;
    discStrength: number;
  };
  effects: {
    outlineStrength: number;
    paper: {
      saturation: number;
      contrast: number;
      highlightColor: string;
      highlightStrength: number;
      grainBase: number;
      grainRange: number;
      grainChromatic: number;
      edgeWash: number;
    };
    quality: {
      ssaoStandard: boolean;
      outlineLowTier: boolean;
      paperLowTier: boolean;
    };
  };
};

export type XinhuaAtmosphereStyle = "noon" | "golden-hour";

export const XINHUA_ATMOSPHERES: Record<XinhuaAtmosphereStyle, XinhuaAtmosphere> = {
  noon: {
    id: "noon",
    label: "正午",
    icon: "☀",
    skyTexture: "/textures/sky/kenney-day-2048.jpg?v=6562e776856e",
    background: "#b8d8ef",
    fog: "#d0dde5",
    // 保留既有方位角以延续主街立面可读性，只把太阳抬高到约 47°。
    sun: {
      color: "#fff1d2",
      offset: [-55, 150, -135],
      intensity: { explore: 4.2, overview: 3.15 },
      shadow: {
        mapSize: { standard: 2048, low: 1024, overview: 1024 },
        camera: {
          near: 1,
          far: 300,
          exploreHalfExtent: 48,
          overviewHalfExtent: 240,
        },
        bias: -0.0001,
        normalBias: 0.01,
        radius: 1.2,
      },
    },
    fill: {
      ambient: {
        color: "#f7fbff",
        intensity: { explore: 0.12, overview: 0.48 },
      },
      hemisphere: {
        sky: "#d9edff",
        ground: "#8a7a68",
        intensity: { explore: 0.58, overview: 0.96 },
      },
      directional: {
        color: "#bfdcf0",
        offset: [92, 78, 112],
        intensity: { explore: 1.1, overview: 0.5 },
      },
    },
    sky: {
      cloudTint: [0.96, 0.99, 1],
      cloudTintStrength: 0.12,
      horizonTint: [0.84, 0.93, 1],
      horizonTintStrength: 0.08,
      colorBalance: [0.96, 1, 1.08],
      colorBalanceStrength: 0.12,
      sunColor: [1, 0.94, 0.76],
      haloEdge: 0.97,
      haloStrength: 0.08,
      discStrength: 0.78,
    },
    effects: {
      outlineStrength: 0.36,
      paper: {
        saturation: 1.01,
        contrast: 1.025,
        highlightColor: "#f6fbff",
        highlightStrength: 0.1,
        grainBase: 0.987,
        grainRange: 0.024,
        grainChromatic: 0.006,
        edgeWash: 0.012,
      },
      quality: {
        ssaoStandard: true,
        outlineLowTier: false,
        paperLowTier: false,
      },
    },
  },
  "golden-hour": {
    id: "golden-hour",
    label: "夕阳",
    icon: "◒",
    skyTexture: "/textures/sky/kenney-day-2048.jpg?v=6562e776856e",
    background: "#9fc4e4",
    fog: "#b9c7d1",
    // 直接迁移已验收的 lighting-v3，确保默认画面不发生无意回退。
    sun: {
      color: "#ffc47f",
      offset: [-62, 60, -150],
      intensity: { explore: 5, overview: 3.55 },
      shadow: {
        mapSize: { standard: 2048, low: 1024, overview: 1024 },
        camera: {
          near: 1,
          far: 280,
          exploreHalfExtent: 48,
          overviewHalfExtent: 240,
        },
        bias: -0.00012,
        normalBias: 0.012,
        radius: 1.65,
      },
    },
    fill: {
      ambient: {
        color: "#fff0da",
        intensity: { explore: 0.055, overview: 0.42 },
      },
      hemisphere: {
        sky: "#bfd7e7",
        ground: "#615342",
        intensity: { explore: 0.42, overview: 0.86 },
      },
      directional: {
        color: "#a8c6d8",
        offset: [-96, 54, 112],
        intensity: { explore: 2.15, overview: 0.82 },
      },
    },
    sky: {
      cloudTint: [1, 0.92, 0.79],
      cloudTintStrength: 0.34,
      horizonTint: [1, 0.86, 0.67],
      horizonTintStrength: 0.22,
      colorBalance: [0.92, 0.98, 1.08],
      colorBalanceStrength: 0.18,
      sunColor: [1, 0.82, 0.5],
      haloEdge: 0.945,
      haloStrength: 0.17,
      discStrength: 0.92,
    },
    effects: {
      outlineStrength: 0.32,
      paper: {
        saturation: 1.035,
        contrast: 1.04,
        highlightColor: "#fff0d6",
        highlightStrength: 0.24,
        grainBase: 0.991,
        grainRange: 0.018,
        grainChromatic: 0.007,
        edgeWash: 0.009,
      },
      quality: {
        ssaoStandard: true,
        outlineLowTier: false,
        paperLowTier: false,
      },
    },
  },
};

export const DEFAULT_XINHUA_ATMOSPHERE_STYLE: XinhuaAtmosphereStyle = "golden-hour";
export const XINHUA_AUTUMN_ATMOSPHERE = XINHUA_ATMOSPHERES[DEFAULT_XINHUA_ATMOSPHERE_STYLE];

export function resolveXinhuaAtmosphereStyle(
  value: string | null | undefined,
): XinhuaAtmosphereStyle {
  return value === "noon" || value === "golden-hour"
    ? value
    : DEFAULT_XINHUA_ATMOSPHERE_STYLE;
}
