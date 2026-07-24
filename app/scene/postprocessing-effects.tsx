"use client";

import { useEffect, useMemo } from "react";
import { Effect, EffectAttribute } from "postprocessing";
import { Color, Uniform, Vector2 } from "three";
import type { XinhuaAtmosphereStyle } from "./atmosphere-contract";

const AUTUMN_AFTERNOON_OUTLINE_STRENGTH = 0.56;
const LIGHTING_V3_OUTLINE_STRENGTH = 0.32;

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
  const strength = atmosphereStyle === "lighting-v3"
    ? LIGHTING_V3_OUTLINE_STRENGTH
    : AUTUMN_AFTERNOON_OUTLINE_STRENGTH;
  const effect = useMemo(() => new InkOutlineEffect(strength), [strength]);
  useEffect(() => () => effect.dispose(), [effect]);
  return <primitive object={effect} dispose={null} />;
}

const paperFragment = /* glsl */ `
uniform vec2 uResolution;
uniform float uTime;
uniform float uLightingV3;

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
  color = mix(vec3(luminance), color, mix(0.93, 1.035, uLightingV3));
  color = (color - 0.5) * mix(1.018, 1.04, uLightingV3) + 0.5;
  float warmHighlight = smoothstep(0.44, 0.9, luminance);
  vec3 lightingV3Highlight = mix(vec3(0.978, 0.996, 1.022), vec3(1.038, 1.01, 0.96), warmHighlight);
  color *= mix(vec3(1.0), lightingV3Highlight, uLightingV3);
  float grain = noise(uv * uResolution * 0.28 + uTime * 0.03) * 0.55
              + noise(uv * uResolution * 0.065) * 0.45;
  color *= mix(0.972 + grain * 0.055, 0.991 + grain * 0.018, uLightingV3);
  color.r *= 1.0 + (grain - 0.5) * mix(0.016, 0.007, uLightingV3);
  color.b *= 1.0 - (grain - 0.5) * mix(0.016, 0.007, uLightingV3);
  vec2 edge = abs(uv * 2.0 - 1.0);
  float edgeWash = smoothstep(0.64, 1.0, max(edge.x, edge.y));
  color *= 1.0 - edgeWash * mix(0.03, 0.009, uLightingV3);
  outputColor = vec4(color, inputColor.a);
}
`;

class PaperWashEffect extends Effect {
  constructor(atmosphereStyle: XinhuaAtmosphereStyle) {
    super("XinhuaPaperWash", paperFragment, {
      uniforms: new Map<string, Uniform>([
        ["uResolution", new Uniform(new Vector2(1, 1))],
        ["uTime", new Uniform(0)],
        ["uLightingV3", new Uniform(atmosphereStyle === "lighting-v3" ? 1 : 0)],
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
