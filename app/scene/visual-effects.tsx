"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Effect, EffectAttribute } from "postprocessing";
import {
  BackSide,
  Color,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  Uniform,
  Vector2,
  Vector3,
  type Mesh,
} from "three";
import mapData from "./xinhua-map-data.json";
import {
  XINHUA_ATMOSPHERES,
  type XinhuaAtmosphereStyle,
} from "./atmosphere-contract";

const AUTUMN_AFTERNOON_OUTLINE_STRENGTH = 0.56;
const LIGHTING_V3_OUTLINE_STRENGTH = 0.32;

// 这两个 shader 的组织方式参考 promptwhisper/messenger 的 MIT 实现；
// 参数与颜色为“新华漫游志”重新标定，不使用原站的模型、贴图或媒体资产。
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
  // 沿真实视口边缘做纸张晕染，避免圆形暗角在宽屏或窄屏上被裁成残缺光圈。
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
      <sphereGeometry args={[420 * mapData.meta.environmentScale, 40, 24]} />
    </mesh>
  );
}

const autumnSkyVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldDirection;

void main() {
  vUv = uv;
  vWorldDirection = normalize(mat3(modelMatrix) * position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const autumnSkyFragment = /* glsl */ `
uniform sampler2D uSky;
uniform vec3 uSunDirection;
uniform float uLightingV3;
varying vec2 vUv;
varying vec3 vWorldDirection;

float wrappedDistance(float left, float right) {
  float delta = abs(left - right);
  return min(delta, 1.0 - delta);
}

void main() {
  vec2 skyUv = vec2(fract(vUv.x), clamp(vUv.y, 0.002, 0.998));
  vec3 color = texture2D(uSky, skyUv).rgb;

  // Kenney day 原图的太阳偏高。先用邻近天空修补，再绘制与真实方向光一致的低太阳。
  vec2 sourceSunDelta = vec2(
    wrappedDistance(skyUv.x, 0.916),
    abs(skyUv.y - 0.78)
  );
  float sourceSunMask = 1.0 - smoothstep(0.012, 0.052, length(sourceSunDelta));
  vec3 sourceSunRepair = texture2D(
    uSky,
    vec2(fract(skyUv.x - 0.075), skyUv.y)
  ).rgb;
  color = mix(color, sourceSunRepair, sourceSunMask * 0.96);

  float upperHeight = clamp(vWorldDirection.y, 0.0, 1.0);
  float sourceLuminance = dot(color, vec3(0.299, 0.587, 0.114));
  float cloudHighlight = smoothstep(0.69, 0.94, sourceLuminance);
  color = mix(color, vec3(1.0, 0.92, 0.79), cloudHighlight * 0.34 * uLightingV3);
  float warmHorizon = 1.0 - smoothstep(0.02, 0.48, upperHeight);
  color = mix(color, vec3(1.0, 0.86, 0.67), warmHorizon * mix(0.14, 0.22, uLightingV3));
  vec3 lightingV3Color = mix(vec3(sourceLuminance), color, 1.16) * vec3(0.92, 0.98, 1.08);
  color = mix(color, lightingV3Color, uLightingV3);

  float sunFacing = dot(normalize(vWorldDirection), normalize(uSunDirection));
  float sunHalo = smoothstep(mix(0.965, 0.945, uLightingV3), 0.9985, sunFacing);
  float sunDisc = smoothstep(0.9984, 0.99965, sunFacing);
  color += vec3(1.0, 0.67, 0.34) * sunHalo * mix(0.12, 0.17, uLightingV3);
  color = mix(color, vec3(1.0, 0.82, 0.50), sunDisc * 0.92);

  gl_FragColor = vec4(color, 1.0);
}
`;

export function AutumnStorybookSky({ atmosphereStyle }: { atmosphereStyle: XinhuaAtmosphereStyle }) {
  const atmosphere = XINHUA_ATMOSPHERES[atmosphereStyle];
  const sky = useTexture(atmosphere.skyTexture, (texture) => {
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.needsUpdate = true;
  });
  const mesh = useRef<Mesh>(null);
  const material = useMemo(() => {
    const [sunX, sunY, sunZ] = atmosphere.sunOffset;
    return new ShaderMaterial({
      vertexShader: autumnSkyVertex,
      fragmentShader: autumnSkyFragment,
      side: BackSide,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uSky: new Uniform(sky),
        uSunDirection: new Uniform(new Vector3(sunX, sunY, sunZ).normalize()),
        uLightingV3: new Uniform(atmosphereStyle === "lighting-v3" ? 1 : 0),
      },
    });
  }, [atmosphere, atmosphereStyle, sky]);

  useFrame(({ camera }) => {
    mesh.current?.position.copy(camera.position);
  });
  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh
      ref={mesh}
      material={material}
      renderOrder={-10}
      frustumCulled={false}
    >
      <sphereGeometry args={[420 * mapData.meta.environmentScale, 48, 28]} />
    </mesh>
  );
}

useTexture.preload(XINHUA_ATMOSPHERES["lighting-v3"].skyTexture);
