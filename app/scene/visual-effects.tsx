"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Effect, EffectAttribute } from "postprocessing";
import {
  BackSide,
  Color,
  Group,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  Uniform,
  Vector2,
  Vector3,
  type Mesh,
} from "three";
import mapData from "./xinhua-map-data.json";
import { XINHUA_AUTUMN_ATMOSPHERE } from "./atmosphere-contract";

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
  constructor() {
    super("XinhuaInkOutline", outlineFragment, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, Uniform>([
        ["uColor", new Uniform(new Color("#31423f"))],
        ["uStrength", new Uniform(0.48)],
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

export function InkOutline() {
  const effect = useMemo(() => new InkOutlineEffect(), []);
  useEffect(() => () => effect.dispose(), [effect]);
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
  color = mix(vec3(luminance), color, 1.015);
  color = (color - 0.5) * 1.035 + 0.5;
  color *= vec3(1.028, 1.008, 0.97);
  float grain = noise(uv * uResolution * 0.28 + uTime * 0.03) * 0.55
              + noise(uv * uResolution * 0.065) * 0.45;
  color *= 0.988 + grain * 0.024;
  color.r *= 1.0 + (grain - 0.5) * 0.009;
  color.b *= 1.0 - (grain - 0.5) * 0.009;
  // 沿真实视口边缘做纸张晕染，避免圆形暗角在宽屏或窄屏上被裁成残缺光圈。
  vec2 edge = abs(uv * 2.0 - 1.0);
  float edgeWash = smoothstep(0.64, 1.0, max(edge.x, edge.y));
  color *= 1.0 - edgeWash * 0.012;
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
  color = mix(color, vec3(1.0, 0.92, 0.79), cloudHighlight * 0.34);
  float warmHorizon = 1.0 - smoothstep(0.02, 0.48, upperHeight);
  color = mix(color, vec3(1.0, 0.86, 0.67), warmHorizon * 0.22);
  color *= 1.075;

  float sunFacing = dot(normalize(vWorldDirection), normalize(uSunDirection));
  float sunHalo = smoothstep(0.945, 0.9985, sunFacing);
  float sunDisc = smoothstep(0.9984, 0.99965, sunFacing);
  color += vec3(1.0, 0.67, 0.34) * sunHalo * 0.17;
  color = mix(color, vec3(1.0, 0.82, 0.50), sunDisc * 0.92);

  gl_FragColor = vec4(color, 1.0);
}
`;

export function AutumnStorybookSky() {
  const sky = useTexture(XINHUA_AUTUMN_ATMOSPHERE.skyTexture, (texture) => {
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.needsUpdate = true;
  });
  const mesh = useRef<Mesh>(null);
  const material = useMemo(() => {
    const [sunX, sunY, sunZ] = XINHUA_AUTUMN_ATMOSPHERE.sunOffset;
    return new ShaderMaterial({
      vertexShader: autumnSkyVertex,
      fragmentShader: autumnSkyFragment,
      side: BackSide,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uSky: new Uniform(sky),
        uSunDirection: new Uniform(new Vector3(sunX, sunY, sunZ).normalize()),
      },
    });
  }, [sky]);

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

const STORYBOOK_CLOUD_CLUSTERS = [
  { position: [-64, 58, -188], scale: 5.8, tint: "#fff1d7", yaw: 0.14 },
  { position: [70, 64, -205], scale: 6.8, tint: "#fae9cd", yaw: -0.22 },
  { position: [4, 88, -250], scale: 5.2, tint: "#fff7e6", yaw: 0.48 },
  { position: [-112, 42, -252], scale: 4.4, tint: "#f5e4c8", yaw: -0.56 },
] as const;

const STORYBOOK_CLOUD_PARTS = [
  [0, 0, 0, 1.7, 0.66, 0.72],
  [-1.34, -0.08, 0.1, 1.08, 0.52, 0.58],
  [1.38, -0.05, -0.12, 1.18, 0.55, 0.62],
  [-0.48, 0.42, -0.05, 1.02, 0.76, 0.64],
  [0.54, 0.34, 0.08, 0.92, 0.69, 0.6],
] as const;

function StorybookCloudCluster({
  position,
  scale,
  tint,
  yaw,
}: {
  position: readonly [number, number, number];
  scale: number;
  tint: string;
  yaw: number;
}) {
  return (
    <group position={position} scale={scale} rotation-y={yaw}>
      {STORYBOOK_CLOUD_PARTS.map(([x, y, z, scaleX, scaleY, scaleZ], index) => (
        <mesh
          key={`${x}-${y}-${index}`}
          position={[x, y, z]}
          scale={[scaleX, scaleY, scaleZ]}
          renderOrder={-5}
        >
          <icosahedronGeometry args={[1, 2]} />
          <meshBasicMaterial
            color={index % 2 === 0 ? tint : "#fff7e5"}
            fog={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export function StorybookCloudLayer() {
  const group = useRef<Group>(null);
  useFrame(({ camera }) => {
    if (!group.current) return;
    group.current.position.copy(camera.position);
    group.current.quaternion.copy(camera.quaternion);
  });
  return (
    <group
      ref={group}
      name="xinhua-storybook-cloud-layer"
      userData={{ atmosphere: "camera-relative-low-poly-clouds", clusters: 4 }}
    >
      {STORYBOOK_CLOUD_CLUSTERS.map((cluster) => (
        <StorybookCloudCluster key={cluster.position.join("-")} {...cluster} />
      ))}
    </group>
  );
}

useTexture.preload(XINHUA_AUTUMN_ATMOSPHERE.skyTexture);
