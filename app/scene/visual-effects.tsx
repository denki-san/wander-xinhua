"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BackSide,
  Group,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  Uniform,
  Vector3,
  type Mesh,
} from "three";
import mapData from "./xinhua-map-data.json";
import {
  XINHUA_ATMOSPHERES,
  type XinhuaAtmosphereStyle,
} from "./atmosphere-contract";

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
          <meshToonMaterial
            color={index >= 3 ? "#fff7e6" : index % 2 === 0 ? tint : "#ead8bd"}
            emissive={index >= 3 ? "#8b5d31" : "#3f5361"}
            emissiveIntensity={index >= 3 ? 0.12 : 0.045}
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
