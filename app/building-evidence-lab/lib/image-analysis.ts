export type ImageAnalysis = {
  width: number;
  height: number;
  aspectRatio: number;
  averageHex: string;
  shadowHex: string;
  highlightHex: string;
  brightness: number;
  edgeDensity: number;
  upperContrast: number;
  verticalBias: number;
  warmth: number;
};

export type GeneratedProfile = {
  width: number;
  depth: number;
  floors: number;
  bays: number;
  roofPitch: number;
  roofStyle: "gable" | "hip" | "flat";
  facadeColor: string;
  accentColor: string;
  roofColor: string;
  confidence: number;
};

type RGB = { r: number; g: number; b: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rgbToHex({ r, g, b }: RGB) {
  return `#${[r, g, b]
    .map((value) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0"))
    .join("")}`;
}

function luminance(r: number, g: number, b: number) {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function mixColor(color: RGB, target: RGB, amount: number): RGB {
  return {
    r: color.r + (target.r - color.r) * amount,
    g: color.g + (target.g - color.g) * amount,
    b: color.b + (target.b - color.b) * amount,
  };
}

export function analyzePixelData(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): ImageAnalysis {
  if (width < 1 || height < 1 || pixels.length < width * height * 4) {
    throw new Error("图像像素数据不完整");
  }

  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  let shadowRed = 0;
  let shadowGreen = 0;
  let shadowBlue = 0;
  let shadowCount = 0;
  let highlightRed = 0;
  let highlightGreen = 0;
  let highlightBlue = 0;
  let highlightCount = 0;
  let upperLight = 0;
  let lowerLight = 0;
  let upperCount = 0;
  let lowerCount = 0;
  let horizontalEdges = 0;
  let verticalEdges = 0;

  const gray = new Float32Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = (y * width + x) * 4;
      const alpha = pixels[pixelIndex + 3] / 255;
      if (alpha < 0.1) continue;

      const r = pixels[pixelIndex];
      const g = pixels[pixelIndex + 1];
      const b = pixels[pixelIndex + 2];
      const light = luminance(r, g, b);
      gray[y * width + x] = light;
      red += r;
      green += g;
      blue += b;
      count += 1;

      if (light < 92) {
        shadowRed += r;
        shadowGreen += g;
        shadowBlue += b;
        shadowCount += 1;
      }
      if (light > 176) {
        highlightRed += r;
        highlightGreen += g;
        highlightBlue += b;
        highlightCount += 1;
      }
      if (y < height * 0.45) {
        upperLight += light;
        upperCount += 1;
      } else if (y > height * 0.55) {
        lowerLight += light;
        lowerCount += 1;
      }
    }
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const current = gray[y * width + x];
      horizontalEdges += Math.abs(current - gray[y * width + x + 1]);
      verticalEdges += Math.abs(current - gray[(y + 1) * width + x]);
    }
  }

  const safeCount = Math.max(1, count);
  const average = { r: red / safeCount, g: green / safeCount, b: blue / safeCount };
  const shadow = shadowCount
    ? { r: shadowRed / shadowCount, g: shadowGreen / shadowCount, b: shadowBlue / shadowCount }
    : mixColor(average, { r: 46, g: 54, b: 52 }, 0.52);
  const highlight = highlightCount
    ? {
      r: highlightRed / highlightCount,
      g: highlightGreen / highlightCount,
      b: highlightBlue / highlightCount,
    }
    : mixColor(average, { r: 241, g: 232, b: 211 }, 0.58);
  const edgeDenominator = Math.max(1, (width - 2) * (height - 2) * 255);
  const upperAverage = upperLight / Math.max(1, upperCount);
  const lowerAverage = lowerLight / Math.max(1, lowerCount);

  return {
    width,
    height,
    aspectRatio: width / height,
    averageHex: rgbToHex(average),
    shadowHex: rgbToHex(shadow),
    highlightHex: rgbToHex(highlight),
    brightness: Math.round(luminance(average.r, average.g, average.b)),
    edgeDensity: clamp((horizontalEdges + verticalEdges) / edgeDenominator, 0, 1),
    upperContrast: clamp(Math.abs(upperAverage - lowerAverage) / 180, 0, 1),
    verticalBias: clamp((verticalEdges - horizontalEdges) / Math.max(1, verticalEdges + horizontalEdges), -1, 1),
    warmth: clamp((average.r - average.b + 80) / 160, 0, 1),
  };
}

export function mergeImageAnalyses(analyses: ImageAnalysis[]): ImageAnalysis {
  if (!analyses.length) {
    throw new Error("至少需要一张图片");
  }

  const base = analyses[0];
  const averageNumber = (key: keyof ImageAnalysis) => (
    analyses.reduce((sum, item) => sum + Number(item[key]), 0) / analyses.length
  );

  return {
    width: Math.round(averageNumber("width")),
    height: Math.round(averageNumber("height")),
    aspectRatio: averageNumber("aspectRatio"),
    averageHex: base.averageHex,
    shadowHex: base.shadowHex,
    highlightHex: base.highlightHex,
    brightness: Math.round(averageNumber("brightness")),
    edgeDensity: averageNumber("edgeDensity"),
    upperContrast: averageNumber("upperContrast"),
    verticalBias: averageNumber("verticalBias"),
    warmth: averageNumber("warmth"),
  };
}

function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  const number = Number.parseInt(clean, 16);
  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

export function profileFromAnalysis(analysis: ImageAnalysis): GeneratedProfile {
  const ratio = clamp(analysis.aspectRatio, 0.55, 2.2);
  const floors = clamp(Math.round(2 + (1.2 - ratio) * 1.4 + analysis.verticalBias * 1.8), 2, 5);
  const bays = clamp(Math.round(3 + analysis.edgeDensity * 14 + Math.max(0, ratio - 1) * 1.6), 3, 8);
  const roofPitch = Math.round(clamp(24 + analysis.upperContrast * 40 + (1 - analysis.brightness / 255) * 8, 18, 58));
  const facadeSource = hexToRgb(analysis.highlightHex);
  const accentSource = hexToRgb(analysis.averageHex);
  const shadowSource = hexToRgb(analysis.shadowHex);
  const facade = mixColor(facadeSource, { r: 232, g: 220, b: 194 }, 0.48);
  const accent = mixColor(accentSource, { r: 166, g: 87, b: 64 }, 0.38);
  const roof = mixColor(shadowSource, { r: 76, g: 89, b: 78 }, 0.45);
  const roofStyle = roofPitch > 43 ? "gable" : analysis.brightness > 188 ? "flat" : "hip";
  const confidence = Math.round(clamp(42 + analysis.edgeDensity * 115, 45, 78));

  return {
    width: Number(clamp(8 + (ratio - 0.7) * 3.2, 7.4, 13.2).toFixed(1)),
    depth: Number(clamp(5.2 + floors * 0.58 + analysis.upperContrast * 1.5, 5.8, 9.2).toFixed(1)),
    floors,
    bays,
    roofPitch,
    roofStyle,
    facadeColor: rgbToHex(facade),
    accentColor: rgbToHex(accent),
    roofColor: rgbToHex(roof),
    confidence,
  };
}

export const PRESET_ANALYSES: Record<string, ImageAnalysis> = {
  "wukang-mansion": {
    width: 960,
    height: 540,
    aspectRatio: 1.78,
    averageHex: "#8e7769",
    shadowHex: "#343938",
    highlightHex: "#d9d2c4",
    brightness: 139,
    edgeDensity: 0.24,
    upperContrast: 0.31,
    verticalBias: -0.04,
    warmth: 0.68,
  },
  "house-315": {
    width: 1080,
    height: 810,
    aspectRatio: 1.33,
    averageHex: "#8f8e80",
    shadowHex: "#28302d",
    highlightHex: "#e5e4dc",
    brightness: 142,
    edgeDensity: 0.19,
    upperContrast: 0.58,
    verticalBias: 0.08,
    warmth: 0.57,
  },
  "shanghai-cinema": {
    width: 500,
    height: 319,
    aspectRatio: 1.57,
    averageHex: "#c5c8c0",
    shadowHex: "#43514e",
    highlightHex: "#f2f1ec",
    brightness: 192,
    edgeDensity: 0.13,
    upperContrast: 0.27,
    verticalBias: -0.11,
    warmth: 0.48,
  },
  "hudec-memorial": {
    width: 2048,
    height: 1536,
    aspectRatio: 1.33,
    averageHex: "#74796e",
    shadowHex: "#252b29",
    highlightHex: "#dfddd2",
    brightness: 126,
    edgeDensity: 0.22,
    upperContrast: 0.66,
    verticalBias: 0.14,
    warmth: 0.54,
  },
};
