"use client";

import { useContext, useEffect, useMemo } from "react";
import { EffectComposerContext } from "@react-three/postprocessing";
import { Effect, EffectAttribute } from "postprocessing";
import { BackSide, Color, ShaderMaterial, Uniform, Vector2, type Texture } from "three";

// 这两个 shader 的组织方式参考 promptwhisper/messenger 的 MIT 实现；
// 参数与颜色为“新华信使”重新标定，不使用原站的模型、贴图或媒体资产。
const outlineFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
uniform float uThreshold;
uniform float uNormalThreshold;
uniform vec2 uTexel;
uniform sampler2D uNormalBuffer;

vec3 readNormal(const in vec2 uv) {
  return texture2D(uNormalBuffer, uv).xyz * 2.0 - 1.0;
}

const vec2 DIRS[8] = vec2[8](
  vec2(1.0, 0.0), vec2(-1.0, 0.0), vec2(0.0, 1.0), vec2(0.0, -1.0),
  vec2(0.707, 0.707), vec2(-0.707, 0.707), vec2(0.707, -0.707), vec2(-0.707, -0.707)
);

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  float centerDepth = -getViewZ(depth);
  vec3 centerNormal = readNormal(uv);
  float depthDelta = 0.0;
  float normalDelta = 0.0;
  for (int i = 0; i < 8; i++) {
    vec2 offset = DIRS[i] * uTexel * 1.35;
    float sampleDepth = -getViewZ(readDepth(uv + offset));
    depthDelta = max(depthDelta, abs(centerDepth - sampleDepth));
    normalDelta = max(normalDelta, 1.0 - max(0.0, dot(centerNormal, readNormal(uv + offset))));
  }
  float depthEdge = step(uThreshold, depthDelta / max(centerDepth, 1.0));
  float normalEdge = step(uNormalThreshold, normalDelta) * 0.7;
  float edge = max(depthEdge, normalEdge) * uStrength;
  outputColor = vec4(mix(inputColor.rgb, uColor, edge), inputColor.a);
}
`;

class InkOutlineEffect extends Effect {
  constructor() {
    super("XinhuaInkOutline", outlineFragment, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, Uniform>([
        ["uColor", new Uniform(new Color("#263c38"))],
        ["uStrength", new Uniform(0.82)],
        ["uThreshold", new Uniform(0.055)],
        ["uNormalThreshold", new Uniform(0.46)],
        ["uTexel", new Uniform(new Vector2(1, 1))],
        ["uNormalBuffer", new Uniform<Texture | null>(null)],
      ]),
    });
  }

  setSize(width: number, height: number) {
    (this.uniforms.get("uTexel")?.value as Vector2).set(1 / width, 1 / height);
  }
}

export function InkOutline() {
  const { normalPass } = useContext(EffectComposerContext);
  const effect = useMemo(() => new InkOutlineEffect(), []);

  useEffect(() => {
    const uniform = effect.uniforms.get("uNormalBuffer");
    if (uniform && normalPass) uniform.value = normalPass.texture;
  }, [effect, normalPass]);

  return <primitive object={effect} dispose={null} />;
}

const paperFragment = /* glsl */ `
uniform vec2 uResolution;
uniform float uTime;

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
  color = mix(vec3(luminance), color, 0.86);
  color = (color - 0.5) * 1.035 + 0.5;
  float grain = noise(uv * uResolution * 0.28 + uTime * 0.03) * 0.55
              + noise(uv * uResolution * 0.065) * 0.45;
  color *= 0.955 + grain * 0.09;
  color.r *= 1.0 + (grain - 0.5) * 0.025;
  color.b *= 1.0 - (grain - 0.5) * 0.025;
  float vignette = smoothstep(0.28, 0.78, length(uv - 0.5));
  color *= 1.0 - vignette * 0.08;
  outputColor = vec4(color, inputColor.a);
}
`;

class PaperWashEffect extends Effect {
  constructor() {
    super("XinhuaPaperWash", paperFragment, {
      uniforms: new Map<string, Uniform>([
        ["uResolution", new Uniform(new Vector2(1, 1))],
        ["uTime", new Uniform(0)],
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

export function PaperWash() {
  const effect = useMemo(() => new PaperWashEffect(), []);
  return <primitive object={effect} dispose={null} />;
}

const skyVertex = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const skyFragment = /* glsl */ `
varying vec3 vDirection;

float hash(vec3 p) {
  return fract(sin(dot(p, vec3(12.989, 78.233, 45.164))) * 43758.5453);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z
  );
}

void main() {
  float height = clamp(vDirection.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 horizon = vec3(0.22, 0.60, 0.58);
  vec3 zenith = vec3(0.10, 0.45, 0.48);
  vec3 color = mix(horizon, zenith, smoothstep(0.0, 0.86, height));
  float cloud = noise(vDirection * 3.2) * 0.65 + noise(vDirection * 9.0) * 0.35;
  cloud = smoothstep(0.50, 0.66, cloud);
  color = mix(color, vec3(0.30, 0.65, 0.62), cloud * 0.30);
  gl_FragColor = vec4(color, 1.0);
}
`;

export function WatercolourSky() {
  const material = useMemo(
    () => new ShaderMaterial({
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      side: BackSide,
      depthWrite: false,
    }),
    [],
  );

  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[420, 40, 24]} />
    </mesh>
  );
}
