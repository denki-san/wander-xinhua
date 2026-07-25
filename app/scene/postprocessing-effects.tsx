"use client";

import { useEffect, useMemo } from "react";
import { Effect, EffectAttribute } from "postprocessing";
import { Color, Uniform, Vector2 } from "three";
import {
  XINHUA_ATMOSPHERES,
  type XinhuaAtmosphereStyle,
} from "./atmosphere-contract";

const outlineFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
uniform float uThreshold;
uniform float uColorThreshold;
uniform vec2 uTexel;

const vec2 DIRS[8] = vec2[8](
  vec2(1.0, 0.0), vec2(-1.0, 0.0), vec2(0.0, 1.0), vec2(0.0, -1.0),
  vec2(0.707, 0.707), vec2(-0.707, 0.707), vec2(0.707, -0.707), vec2(-0.707, -0.707)
);

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  float centerDepth = -getViewZ(depth);
  vec3 centerColor = inputColor.rgb;
  float depthDelta = 0.0;
  float colorDelta = 0.0;
  for (int i = 0; i < 8; i++) {
    vec2 offset = DIRS[i] * uTexel * 1.35;
    float sampleDepth = -getViewZ(readDepth(uv + offset));
    depthDelta = max(depthDelta, abs(centerDepth - sampleDepth));
    vec3 sampleColor = texture2D(inputBuffer, uv + offset).rgb;
    colorDelta = max(colorDelta, length(centerColor - sampleColor) / 1.732);
  }
  float depthEdge = step(uThreshold, depthDelta / max(centerDepth, 1.0));
  float colorEdge = smoothstep(uColorThreshold, uColorThreshold * 2.15, colorDelta) * 0.52;
  float edge = max(depthEdge, colorEdge) * uStrength;
  outputColor = vec4(mix(inputColor.rgb, uColor, edge), inputColor.a);
}
`;

class InkOutlineEffect extends Effect {
  constructor(strength: number) {
    super("XinhuaInkOutline", outlineFragment, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, Uniform>([
        ["uColor", new Uniform(new Color("#31423f"))],
        ["uStrength", new Uniform(strength)],
        ["uThreshold", new Uniform(0.052)],
        ["uColorThreshold", new Uniform(0.086)],
        ["uTexel", new Uniform(new Vector2(1, 1))],
      ]),
    });
  }

  setSize(width: number, height: number) {
    (this.uniforms.get("uTexel")?.value as Vector2).set(1 / width, 1 / height);
  }
}

export function InkOutline({ atmosphereStyle }: { atmosphereStyle: XinhuaAtmosphereStyle }) {
  const strength = XINHUA_ATMOSPHERES[atmosphereStyle].effects.outlineStrength;
  const effect = useMemo(() => new InkOutlineEffect(strength), [strength]);
  useEffect(() => () => effect.dispose(), [effect]);
  return <primitive object={effect} dispose={null} />;
}

const paperFragment = /* glsl */ `
uniform vec2 uResolution;
uniform float uTime;
uniform float uSaturation;
uniform float uContrast;
uniform vec3 uHighlightColor;
uniform float uHighlightStrength;
uniform float uGrainBase;
uniform float uGrainRange;
uniform float uGrainChromatic;
uniform float uEdgeWash;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = inputColor.rgb;
  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(luminance), color, uSaturation);
  color = (color - 0.5) * uContrast + 0.5;
  float highlightMask = smoothstep(0.44, 0.9, luminance);
  color *= mix(vec3(1.0), uHighlightColor, highlightMask * uHighlightStrength);
  float grain = noise(uv * uResolution * 0.28 + uTime * 0.03) * 0.55
              + noise(uv * uResolution * 0.065) * 0.45;
  color *= uGrainBase + grain * uGrainRange;
  color.r *= 1.0 + (grain - 0.5) * uGrainChromatic;
  color.b *= 1.0 - (grain - 0.5) * uGrainChromatic;
  vec2 edge = abs(uv * 2.0 - 1.0);
  float edgeWash = smoothstep(0.64, 1.0, max(edge.x, edge.y));
  color *= 1.0 - edgeWash * uEdgeWash;
  outputColor = vec4(color, inputColor.a);
}
`;

class PaperWashEffect extends Effect {
  constructor(atmosphereStyle: XinhuaAtmosphereStyle) {
    const paper = XINHUA_ATMOSPHERES[atmosphereStyle].effects.paper;
    super("XinhuaPaperWash", paperFragment, {
      uniforms: new Map<string, Uniform>([
        ["uResolution", new Uniform(new Vector2(1, 1))],
        ["uTime", new Uniform(0)],
        ["uSaturation", new Uniform(paper.saturation)],
        ["uContrast", new Uniform(paper.contrast)],
        ["uHighlightColor", new Uniform(new Color(paper.highlightColor))],
        ["uHighlightStrength", new Uniform(paper.highlightStrength)],
        ["uGrainBase", new Uniform(paper.grainBase)],
        ["uGrainRange", new Uniform(paper.grainRange)],
        ["uGrainChromatic", new Uniform(paper.grainChromatic)],
        ["uEdgeWash", new Uniform(paper.edgeWash)],
      ]),
    });
  }

  setSize(width: number, height: number) {
    (this.uniforms.get("uResolution")?.value as Vector2).set(width, height);
  }

  update(_renderer: unknown, _inputBuffer: unknown, deltaTime: number) {
    const time = this.uniforms.get("uTime");
    if (time) time.value += deltaTime;
  }
}

export function PaperWash({ atmosphereStyle }: { atmosphereStyle: XinhuaAtmosphereStyle }) {
  const effect = useMemo(() => new PaperWashEffect(atmosphereStyle), [atmosphereStyle]);
  useEffect(() => () => effect.dispose(), [effect]);
  return <primitive object={effect} dispose={null} />;
}
