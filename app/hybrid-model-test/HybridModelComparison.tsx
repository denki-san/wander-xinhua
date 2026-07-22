"use client";

import { useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Component,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import styles from "./hybrid-model-test.module.css";

type TestMode = "baseline" | "hybrid";
type DistancePreset = "far" | "medium" | "near";
type LoadTier = "massing" | "identity" | "detail";

type Transform = {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: [number, number, number];
};

type RuntimeMetrics = {
  mode: TestMode;
  distancePreset: DistancePreset;
  tier: LoadTier;
  ready: boolean;
  readyMs: number | null;
  sampleMs: number;
  fps: number | null;
  p95FrameMs: number | null;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  glbRequests: Array<{
    file: string;
    durationMs: number;
    transferBytes: number;
    decodedBytes: number;
  }>;
};

declare global {
  interface Window {
    __HYBRID_MODEL_TEST__?: RuntimeMetrics;
  }
}

const FULL_MODEL = "/models/xinhua-road/shanghai-cinema.glb?v=20260721-cinema-7";
const IDENTITY_MODEL = "/models/xinhua-road/shanghai-cinema-hybrid-identity.glb?v=20260722-hybrid-1";
const TEST_STARTED_AT = typeof performance === "undefined" ? 0 : performance.now();

const CAMERA_POSITIONS: Record<DistancePreset, [number, number, number]> = {
  far: [0, 22, 82],
  medium: [8, 17, 49],
  near: [10, 12.5, 32],
};

function cinemaFrontZ(x: number) {
  const radiusX = 15.2;
  const radiusZ = 7.15;
  const normalized = Math.min(1, Math.abs(x) / radiusX);
  return 0.35 - radiusZ * Math.sqrt(Math.max(0, 1 - normalized * normalized));
}

function blenderPosition(x: number, y: number, z: number): [number, number, number] {
  // 完整 GLB 在导出时镜像 X、运行时再翻转 Z；代码构件使用同一坐标约定。
  return [-x, z, y];
}

function cloneConfiguredScene(source: Group) {
  const clone = source.clone(true);
  clone.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return clone;
}

function FullCinema({ onReady }: { onReady: () => void }) {
  const { scene } = useGLTF(FULL_MODEL);
  const model = useMemo(() => cloneConfiguredScene(scene), [scene]);
  useEffect(onReady, [onReady]);
  return <primitive object={model} scale={[1, 1, -1]} />;
}

function IdentityCinema({ onReady }: { onReady: () => void }) {
  const { scene } = useGLTF(IDENTITY_MODEL);
  const model = useMemo(() => cloneConfiguredScene(scene), [scene]);
  useEffect(onReady, [onReady]);
  return <primitive object={model} scale={[1, 1, -1]} />;
}

class ModelBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function useInstanceMatrices(ref: React.RefObject<InstancedMesh | null>, transforms: Transform[]) {
  useLayoutEffect(() => {
    const instances = ref.current;
    if (!instances) return;
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const position = new Vector3();
    const scale = new Vector3();
    const rotation = new Object3D();
    transforms.forEach((transform, index) => {
      position.set(...transform.position);
      rotation.rotation.set(...(transform.rotation ?? [0, 0, 0]));
      quaternion.setFromEuler(rotation.rotation);
      scale.set(...transform.scale);
      matrix.compose(position, quaternion, scale);
      instances.setMatrixAt(index, matrix);
    });
    instances.instanceMatrix.needsUpdate = true;
    instances.computeBoundingSphere();
  }, [ref, transforms]);
}

function BoxInstances({
  transforms,
  color,
  roughness = 0.7,
  metalness = 0,
  opacity = 1,
  depthWrite = true,
}: {
  transforms: Transform[];
  color: string;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  depthWrite?: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  useInstanceMatrices(ref, transforms);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, transforms.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={depthWrite}
      />
    </instancedMesh>
  );
}

function CylinderInstances({ transforms, color, radialSegments = 10 }: {
  transforms: Transform[];
  color: string;
  radialSegments?: number;
}) {
  const ref = useRef<InstancedMesh>(null);
  useInstanceMatrices(ref, transforms);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, transforms.length]} castShadow receiveShadow>
      <cylinderGeometry args={[1, 1, 1, radialSegments]} />
      <meshStandardMaterial color={color} roughness={0.42} metalness={0.35} />
    </instancedMesh>
  );
}

function ProgrammaticMassing() {
  const glassMaterial = useMemo(() => new MeshStandardMaterial({
    color: new Color("#4f7478"),
    roughness: 0.25,
    metalness: 0.06,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  }), []);
  const lightGlassMaterial = useMemo(() => new MeshStandardMaterial({
    color: new Color("#79a2a5"),
    roughness: 0.2,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  }), []);
  const ellipse = useMemo(() => new CylinderGeometry(1, 1, 1, 64), []);
  useEffect(() => () => {
    glassMaterial.dispose();
    lightGlassMaterial.dispose();
    ellipse.dispose();
  }, [ellipse, glassMaterial, lightGlassMaterial]);

  const glassBoxes = useMemo<Transform[]>(() => [
    { position: [-11.45, 2.35, 4.15], scale: [3.45, 4.3, 10.8] },
    { position: [11.45, 2.35, 4.15], scale: [3.45, 4.3, 10.8] },
    { position: [-7.4, 10.3, 5.2], scale: [7.35, 12.4, 4.05] },
  ], []);
  const whiteBoxes = useMemo<Transform[]>(() => [
    {
      position: [-12.15, 4.62, 4.0],
      rotation: [0, 0, -0.03],
      scale: [4.25, 0.36, 11.95],
    },
    {
      position: [12.15, 4.62, 4.0],
      rotation: [0, 0, 0.03],
      scale: [4.25, 0.36, 11.95],
    },
    { position: [-7.4 - 3.85, 10.225, 5.2], scale: [0.58, 13.35, 4.35] },
    { position: [-7.4 + 3.85, 10.225, 5.2], scale: [0.58, 13.35, 4.35] },
    { position: [-7.4, 16.85, 5.2], scale: [8.3, 0.75, 4.4] },
  ], []);
  return (
    <group name="hybrid-programmatic-massing">
      <mesh position={[0, 0.12, -1.2]} receiveShadow>
        <boxGeometry args={[38, 0.24, 26]} />
        <meshStandardMaterial color="#aaa69d" roughness={0.92} />
      </mesh>
      <mesh geometry={ellipse} material={glassMaterial} position={[0, 2.45, 0.35]} scale={[14.25, 4.65, 6.65]} />
      <mesh geometry={ellipse} material={lightGlassMaterial} position={[9.8, 7.9, 0.8]} scale={[4.45, 5.6, 3.45]} />
      <BoxInstances
        transforms={glassBoxes}
        color="#4f7478"
        roughness={0.25}
        metalness={0.06}
        opacity={0.7}
        depthWrite={false}
      />
      <BoxInstances transforms={whiteBoxes} color="#e4e1da" roughness={0.72} />
    </group>
  );
}

function RepeatedDetails() {
  const silver = "#929f9d";
  const shadowWhite = "#cfd0ca";
  const lobbyMullions = useMemo<Transform[]>(() => Array.from({ length: 31 }, (_, index) => {
    const sourceX = -13.5 + index * 0.9;
    return {
      position: blenderPosition(sourceX, cinemaFrontZ(sourceX) + 0.5, 2.05),
      scale: [0.05, 3.95, 0.05],
    };
  }), []);
  const frontColumns = useMemo<Transform[]>(() => (
    [-9.6, -6.4, -3.2, 0, 3.2, 6.4, 9.6].map((sourceX) => ({
      position: blenderPosition(sourceX, cinemaFrontZ(sourceX) - 0.12, 2.05),
      scale: [0.14, 4, 0.14] as [number, number, number],
    }))
  ), []);
  const towerVertical = useMemo<Transform[]>(() => Array.from({ length: 9 }, (_, column) => ({
    position: blenderPosition(7.4 - 3.2 + column * 0.8, 3.145, 11.2),
    scale: [0.085, 8.2, 0.07],
  })), []);
  const towerHorizontal = useMemo<Transform[]>(() => Array.from({ length: 10 }, (_, row) => ({
    position: blenderPosition(7.4, 3.13, 7.2 + row * 0.9),
    scale: [6.75, 0.09, 0.075],
  })), []);
  const ribbonJoints = useMemo<Transform[]>(() => Array.from({ length: 37 }, (_, index) => {
    const sourceX = -14.7 + index * (29.4 / 36);
    const normalized = sourceX / 15.2;
    const lower = 3.92 + 0.48 * ((normalized + 1) * 0.5) + 0.23 * Math.cos(normalized * Math.PI);
    const crown = Math.max(0, 1 - ((normalized + 0.15) / 0.95) ** 2);
    const upper = 7.15 + 2.15 * crown + 0.15 * ((1 - normalized) * 0.5);
    if (((sourceX - 8.05) / 4.35) ** 2 < 1) return null;
    return {
      position: blenderPosition(sourceX, cinemaFrontZ(sourceX) - 0.025, (lower + upper) * 0.5),
      scale: [0.028, Math.max(0.2, upper - lower - 0.18), 0.055] as [number, number, number],
    };
  }).filter((value): value is Transform => value !== null), []);
  const stairSteps = useMemo<Transform[]>(() => {
    const start = new Vector3(11, -9.55, 0.35);
    const control = new Vector3(17.2, -7.15, 2.05);
    const end = new Vector3(14.55, -1.25, 4.35);
    return Array.from({ length: 32 }, (_, index) => {
      const t = index / 31;
      const point = start.clone().multiplyScalar((1 - t) ** 2)
        .add(control.clone().multiplyScalar(2 * (1 - t) * t))
        .add(end.clone().multiplyScalar(t ** 2));
      const tangent = control.clone().sub(start).multiplyScalar(2 * (1 - t))
        .add(end.clone().sub(control).multiplyScalar(2 * t));
      const angle = Math.atan2(tangent.y, tangent.x);
      return {
        position: blenderPosition(point.x, point.y, point.z),
        rotation: [0, -(angle + Math.PI / 2), 0] as [number, number, number],
        scale: [3.35, 0.17, 0.62] as [number, number, number],
      };
    });
  }, []);
  const shadowWhiteDetails = useMemo(
    () => [...towerVertical, ...towerHorizontal, ...stairSteps],
    [stairSteps, towerHorizontal, towerVertical],
  );

  return (
    <group name="hybrid-instanced-repeated-details">
      <CylinderInstances transforms={lobbyMullions} color={silver} />
      <CylinderInstances transforms={frontColumns} color="#e4e1da" radialSegments={20} />
      <BoxInstances transforms={shadowWhiteDetails} color={shadowWhite} />
      <BoxInstances transforms={ribbonJoints} color="#d6d5d0" />
    </group>
  );
}

function tierForDistance(distance: number): LoadTier {
  if (distance <= 38) return "detail";
  if (distance <= 60) return "identity";
  return "massing";
}

function tierForPreset(preset: DistancePreset): LoadTier {
  if (preset === "near") return "detail";
  if (preset === "medium") return "identity";
  return "massing";
}

function CameraAndTier({ preset, onTier }: {
  preset: DistancePreset;
  onTier: (tier: LoadTier) => void;
}) {
  const { camera } = useThree();
  const lastTier = useRef<LoadTier | null>(null);
  useLayoutEffect(() => {
    camera.position.set(...CAMERA_POSITIONS[preset]);
    camera.lookAt(0, 6, 0);
    camera.updateProjectionMatrix();
  }, [camera, preset]);
  useFrame(() => {
    const tier = tierForDistance(camera.position.distanceTo(new Vector3(0, 6, 0)));
    if (tier === lastTier.current) return;
    lastTier.current = tier;
    onTier(tier);
  });
  return null;
}

function RuntimeSampler({ mode, distancePreset, tier, ready, readyMs, onMetrics }: {
  mode: TestMode;
  distancePreset: DistancePreset;
  tier: LoadTier;
  ready: boolean;
  readyMs: number | null;
  onMetrics: (metrics: RuntimeMetrics) => void;
}) {
  const { gl } = useThree();
  const deltas = useRef<number[]>([]);
  const sampleStarted = useRef<number | null>(null);
  const lastPublish = useRef(0);
  useFrame((_, delta) => {
    if (!ready) return;
    const now = performance.now();
    if (sampleStarted.current === null) sampleStarted.current = now;
    if (now - sampleStarted.current > 700 && deltas.current.length < 360) {
      deltas.current.push(delta * 1000);
    }
    if (now - lastPublish.current < 250) return;
    lastPublish.current = now;
    const sorted = [...deltas.current].sort((a, b) => a - b);
    const average = sorted.length
      ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length
      : null;
    const resources = performance.getEntriesByType("resource")
      .filter((entry) => entry.name.includes(".glb")) as PerformanceResourceTiming[];
    const metrics: RuntimeMetrics = {
      mode,
      distancePreset,
      tier,
      ready,
      readyMs,
      sampleMs: Math.round(now - (sampleStarted.current ?? now)),
      fps: average ? Number((1000 / average).toFixed(1)) : null,
      p95FrameMs: sorted.length
        ? Number(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))].toFixed(2))
        : null,
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      glbRequests: resources.map((entry) => ({
        file: new URL(entry.name).pathname.split("/").at(-1) ?? entry.name,
        durationMs: Number(entry.duration.toFixed(1)),
        transferBytes: entry.transferSize,
        decodedBytes: entry.decodedBodySize,
      })),
    };
    window.__HYBRID_MODEL_TEST__ = metrics;
    onMetrics(metrics);
  });
  return null;
}

function TestScene({ mode, distancePreset, tier, setTier, setReady, metrics, setMetrics }: {
  mode: TestMode;
  distancePreset: DistancePreset;
  tier: LoadTier;
  setTier: (tier: LoadTier) => void;
  setReady: (readyMs: number) => void;
  metrics: RuntimeMetrics | null;
  setMetrics: (metrics: RuntimeMetrics) => void;
}) {
  const readyCallback = useMemo(() => () => setReady(performance.now() - TEST_STARTED_AT), [setReady]);
  const showIdentity = tier === "identity" || tier === "detail";
  const showDetails = tier === "detail";
  const ready = metrics?.ready ?? false;

  useEffect(() => {
    if (mode === "hybrid" && tier === "massing") readyCallback();
  }, [mode, readyCallback, tier]);

  return (
    <>
      <color attach="background" args={["#9db0b2"]} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[-18, 28, 20]} intensity={2.4} castShadow />
      <directionalLight position={[22, 12, -14]} intensity={0.8} />
      <CameraAndTier preset={distancePreset} onTier={setTier} />
      {mode === "baseline" ? (
        <ModelBoundary fallback={<ProgrammaticMassing />}>
          <Suspense fallback={null}>
            <FullCinema onReady={readyCallback} />
          </Suspense>
        </ModelBoundary>
      ) : (
        <>
          <ProgrammaticMassing />
          {showIdentity && (
            <ModelBoundary fallback={null}>
              <Suspense fallback={null}>
                <IdentityCinema onReady={readyCallback} />
              </Suspense>
            </ModelBoundary>
          )}
          {showDetails && <RepeatedDetails />}
        </>
      )}
      <RuntimeSampler
        mode={mode}
        distancePreset={distancePreset}
        tier={tier}
        ready={ready}
        readyMs={metrics?.readyMs ?? null}
        onMetrics={setMetrics}
      />
    </>
  );
}

function readTestParams(search: string): { mode: TestMode; distancePreset: DistancePreset } {
  const params = new URLSearchParams(search);
  const mode = params.get("mode") === "baseline" ? "baseline" : "hybrid";
  const distance = params.get("distance");
  const distancePreset = distance === "far" || distance === "medium" ? distance : "near";
  return { mode, distancePreset };
}

function HydratedComparison({ mode, distancePreset }: {
  mode: TestMode;
  distancePreset: DistancePreset;
}) {
  const [tier, setTier] = useState<LoadTier>(() => tierForPreset(distancePreset));
  const [metrics, setMetrics] = useState<RuntimeMetrics | null>(null);
  const setReady = useMemo(() => (readyMs: number) => {
    setMetrics((current) => ({
      mode,
      distancePreset,
      tier,
      ready: true,
      readyMs: Math.round(readyMs),
      sampleMs: current?.sampleMs ?? 0,
      fps: current?.fps ?? null,
      p95FrameMs: current?.p95FrameMs ?? null,
      drawCalls: current?.drawCalls ?? 0,
      triangles: current?.triangles ?? 0,
      geometries: current?.geometries ?? 0,
      textures: current?.textures ?? 0,
      glbRequests: current?.glbRequests ?? [],
    }));
  }, [distancePreset, mode, tier]);

  const links = [
    ["baseline", "near", "完整 GLB · 近景"],
    ["hybrid", "far", "混合 · 远景"],
    ["hybrid", "medium", "混合 · 中景"],
    ["hybrid", "near", "混合 · 近景"],
  ] as const;
  const displayMetrics = metrics ?? {
    mode,
    distancePreset,
    tier,
    ready: false,
    readyMs: null,
    sampleMs: 0,
    fps: null,
    p95FrameMs: null,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    glbRequests: [],
  };

  return (
    <section className={styles.shell} data-test-ready={displayMetrics.ready ? "true" : "false"}>
      <div className={styles.canvas}>
        <Canvas
          dpr={1}
          shadows={false}
          camera={{ fov: 42, near: 0.1, far: 300 }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        >
          <TestScene
            mode={mode}
            distancePreset={distancePreset}
            tier={tier}
            setTier={setTier}
            setReady={setReady}
            metrics={metrics}
            setMetrics={setMetrics}
          />
        </Canvas>
      </div>
      <aside className={styles.panel}>
        <p className={styles.eyebrow}>真实案例 A/B · XH-160</p>
        <h1 className={styles.title}>上海影城混合渲染测试</h1>
        <p className={styles.summary}>
          完整 GLB 对比程序化主体、实例化重复构件、轻量身份轮廓 GLB 与距离分级加载。
        </p>
        <nav className={styles.links} aria-label="测试场景">
          {links.map(([linkMode, distance, label]) => {
            const active = mode === linkMode && distancePreset === distance;
            return (
              <a
                key={`${linkMode}-${distance}`}
                className={`${styles.link} ${active ? styles.linkActive : ""}`}
                href={`/hybrid-model-test?mode=${linkMode}&distance=${distance}`}
              >
                {label}
              </a>
            );
          })}
        </nav>
        <pre id="test-hybrid-metrics" className={styles.metrics}>
          {JSON.stringify(displayMetrics, null, 2)}
        </pre>
      </aside>
      <div className={styles.badge}>
        {mode === "baseline" ? "完整 GLB" : `混合方案 · ${tier}`}
      </div>
    </section>
  );
}

const subscribeToStaticLocation = () => () => {};

export function HybridModelComparison() {
  const hydrated = useSyncExternalStore(
    subscribeToStaticLocation,
    () => true,
    () => false,
  );
  const search = useSyncExternalStore(
    subscribeToStaticLocation,
    () => window.location.search,
    () => "",
  );
  if (!hydrated) {
    return <section className={styles.shell} data-test-ready="false" />;
  }
  const { mode, distancePreset } = readTestParams(search);
  return (
    <HydratedComparison
      key={`${mode}-${distancePreset}`}
      mode={mode}
      distancePreset={distancePreset}
    />
  );
}
