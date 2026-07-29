"use client";

import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box3,
  Mesh,
  Object3D,
  OrthographicCamera,
  Vector3,
} from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import styles from "./building-engine-sandbox.module.css";

type TierName = "massing" | "master";
type ViewName = "canonical" | "side" | "entrance";
type VectorTuple = [number, number, number];

type CameraContract = {
  position: VectorTuple;
  target: VectorTuple;
  orthoScale: number;
};

type TierContract = {
  path: string;
  sha256: string;
  bytes: number;
  bounds: {
    min: VectorTuple;
    max: VectorTuple;
  };
};

type AssetContract = {
  name: string;
  archetype: "garden-villa";
  coordinateContract: {
    sceneUnitMeters: number;
    front: "local-negative-y";
    groundDatum: number;
  };
  cameras: Record<ViewName, CameraContract>;
  tiers: Partial<Record<TierName, TierContract>>;
  collision: {
    path: string;
    sha256: string;
    obstacleCount: number;
    openPathCount: number;
  };
};

type RuntimeManifest = {
  schemaVersion: number;
  archetype: "garden-villa";
  assets: Record<string, AssetContract>;
};

type CollisionObstacle = {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type OpenPath = {
  id: string;
  from: [number, number];
  to: [number, number];
  width: number;
};

type CollisionContract = {
  assetId: string;
  obstacles: CollisionObstacle[];
  requiredOpenPaths: OpenPath[];
};

type RuntimeBounds = {
  min: VectorTuple;
  max: VectorTuple;
};

const MANIFEST_PATH = "/models/building-engine-spike/manifest.json";
const TIER_ORDER: TierName[] = ["massing", "master"];
const VIEWS: ViewName[] = ["canonical", "side", "entrance"];
const VIEW_LABELS: Record<ViewName, string> = {
  canonical: "主对照",
  side: "侧向纵深",
  entrance: "入口细节",
};

function blenderToThree([x, y, z]: VectorTuple): VectorTuple {
  return [x, z, -y];
}

function segmentIntersectsExpandedObstacle(
  path: OpenPath,
  obstacle: CollisionObstacle,
) {
  const padding = path.width * 0.5;
  const minX = obstacle.minX - padding;
  const maxX = obstacle.maxX + padding;
  const minY = obstacle.minY - padding;
  const maxY = obstacle.maxY + padding;
  const dx = path.to[0] - path.from[0];
  const dy = path.to[1] - path.from[1];
  let lower = 0;
  let upper = 1;

  for (const [origin, delta, minimum, maximum] of [
    [path.from[0], dx, minX, maxX],
    [path.from[1], dy, minY, maxY],
  ] as const) {
    if (Math.abs(delta) < 1e-9) {
      if (origin < minimum || origin > maximum) return false;
      continue;
    }
    const first = (minimum - origin) / delta;
    const second = (maximum - origin) / delta;
    lower = Math.max(lower, Math.min(first, second));
    upper = Math.min(upper, Math.max(first, second));
    if (lower > upper) return false;
  }
  return lower <= upper;
}

function openPathsAreClear(collision: CollisionContract | null) {
  if (!collision) return false;
  return collision.requiredOpenPaths.every((path) => (
    collision.obstacles.every(
      (obstacle) => !segmentIntersectsExpandedObstacle(path, obstacle),
    )
  ));
}

function CameraRig({ contract }: { contract: CameraContract }) {
  const appliedKey = useRef("");
  useFrame((state) => {
    const { camera, size } = state;
    if (!(camera instanceof OrthographicCamera)) return;
    const nextKey = [
      ...contract.position,
      ...contract.target,
      contract.orthoScale,
      size.width,
      size.height,
    ].join(":");
    if (appliedKey.current === nextKey) return;
    const aspect = size.width / Math.max(1, size.height);
    const halfHeight = contract.orthoScale * 0.5;
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.near = 0.05;
    camera.far = 250;
    camera.position.fromArray(blenderToThree(contract.position));
    camera.lookAt(new Vector3(...blenderToThree(contract.target)));
    camera.updateProjectionMatrix();
    appliedKey.current = nextKey;
    state.invalidate();
  });
  return null;
}

function RuntimeModel({
  path,
  onReady,
}: {
  path: string;
  onReady: (path: string, bounds: RuntimeBounds) => void;
}) {
  const { scene } = useGLTF(path);
  const model = useMemo(() => {
    const result = clone(scene) as Object3D;
    result.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return result;
  }, [scene]);

  useEffect(() => {
    model.updateMatrixWorld(true);
    const box = new Box3().setFromObject(model);
    onReady(path, {
      min: box.min.toArray() as VectorTuple,
      max: box.max.toArray() as VectorTuple,
    });
  }, [model, onReady, path]);

  return <primitive object={model} />;
}

function HumanScale({ bounds }: { bounds: RuntimeBounds }) {
  const height = 1.8 / 2.7;
  const x = bounds.min[0] + (bounds.max[0] - bounds.min[0]) * 0.08;
  const z = bounds.max[2] + Math.max(0.7, (bounds.max[0] - bounds.min[0]) * 0.05);
  return (
    <group position={[x, 0, z]} aria-label="1.8 米人物尺度尺">
      <mesh position={[0, height * 0.38, 0]} castShadow>
        <cylinderGeometry args={[height * 0.15, height * 0.15, height * 0.75, 10]} />
        <meshStandardMaterial color="#d46f3d" roughness={0.9} />
      </mesh>
      <mesh position={[0, height * 0.87, 0]} castShadow>
        <sphereGeometry args={[height * 0.13, 12, 8]} />
        <meshStandardMaterial color="#d46f3d" roughness={0.9} />
      </mesh>
    </group>
  );
}

function CollisionOverlay({ collision }: { collision: CollisionContract }) {
  return (
    <group>
      {collision.obstacles.map((obstacle) => {
        const width = obstacle.maxX - obstacle.minX;
        const depth = obstacle.maxY - obstacle.minY;
        return (
          <mesh
            key={obstacle.id}
            position={[
              (obstacle.minX + obstacle.maxX) * 0.5,
              0.035,
              -(obstacle.minY + obstacle.maxY) * 0.5,
            ]}
          >
            <boxGeometry args={[width, 0.05, depth]} />
            <meshStandardMaterial color="#b64b3c" transparent opacity={0.28} />
          </mesh>
        );
      })}
      {collision.requiredOpenPaths.map((path) => {
        const dx = path.to[0] - path.from[0];
        const dz = -(path.to[1] - path.from[1]);
        const length = Math.hypot(dx, dz);
        const angle = -Math.atan2(dz, dx);
        return (
          <mesh
            key={path.id}
            position={[
              (path.from[0] + path.to[0]) * 0.5,
              0.075,
              -(path.from[1] + path.to[1]) * 0.5,
            ]}
            rotation-y={angle}
          >
            <boxGeometry args={[length, 0.035, path.width]} />
            <meshStandardMaterial color="#59a978" transparent opacity={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function QaScene({
  camera,
  collision,
  modelPath,
  onModelReady,
  runtimeBounds,
  showCollision,
}: {
  camera: CameraContract;
  collision: CollisionContract | null;
  modelPath: string;
  onModelReady: (path: string, bounds: RuntimeBounds) => void;
  runtimeBounds: RuntimeBounds | null;
  showCollision: boolean;
}) {
  const target = blenderToThree(camera.target);
  return (
    <>
      <color attach="background" args={["#d7cba9"]} />
      <fog attach="fog" args={["#d7cba9", 32, 90]} />
      <CameraRig contract={camera} />
      <ambientLight intensity={1.35} color="#fff3d9" />
      <hemisphereLight args={["#dce7e1", "#51483c", 1.6]} />
      <directionalLight
        position={[-10, 18, 14]}
        color="#ffd3a0"
        intensity={3.4}
        castShadow
      />
      <directionalLight position={[12, 10, -8]} color="#b8cbd0" intensity={1.15} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.025} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#667065" roughness={1} />
      </mesh>
      <gridHelper args={[50, 50, "#879187", "#717a72"]} position-y={0.002} />
      <Suspense fallback={null}>
        <RuntimeModel path={modelPath} onReady={onModelReady} />
      </Suspense>
      {runtimeBounds ? <HumanScale bounds={runtimeBounds} /> : null}
      {showCollision && collision ? <CollisionOverlay collision={collision} /> : null}
      <OrbitControls
        makeDefault
        target={target}
        enableDamping={false}
        enablePan
        enableRotate
        zoomToCursor={false}
      />
    </>
  );
}

function writeQaQuery(assetId: string, tier: TierName, view: ViewName) {
  const url = new URL(window.location.href);
  url.searchParams.set("asset", assetId);
  url.searchParams.set("tier", tier);
  url.searchParams.set("view", view);
  window.history.replaceState(null, "", url);
}

export function BuildingEngineSandbox() {
  const searchParams = useSearchParams();
  const [manifest, setManifest] = useState<RuntimeManifest | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [assetId, setAssetId] = useState(searchParams.get("asset") ?? "house-315");
  const [tier, setTier] = useState<TierName>(
    searchParams.get("tier") === "master" ? "master" : "massing",
  );
  const [view, setView] = useState<ViewName>(
    VIEWS.includes(searchParams.get("view") as ViewName)
      ? searchParams.get("view") as ViewName
      : "canonical",
  );
  const [collisionState, setCollisionState] = useState<{
    path: string;
    value: CollisionContract;
  } | null>(null);
  const [loadedModel, setLoadedModel] = useState<{
    path: string;
    bounds: RuntimeBounds;
  } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [showCollision, setShowCollision] = useState(
    searchParams.get("qa") === "1",
  );

  useEffect(() => {
    let cancelled = false;
    fetch(MANIFEST_PATH, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
        return response.json() as Promise<RuntimeManifest>;
      })
      .then((value) => {
        if (!cancelled) setManifest(value);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setManifestError(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const assetEntries = useMemo(
    () => Object.entries(manifest?.assets ?? {}),
    [manifest],
  );
  const asset = manifest?.assets[assetId] ?? assetEntries[0]?.[1] ?? null;
  const resolvedAssetId = manifest?.assets[assetId] ? assetId : assetEntries[0]?.[0] ?? assetId;
  const resolvedTier: TierName = asset?.tiers[tier] ? tier : "massing";
  const tierContract = asset?.tiers[resolvedTier] ?? null;
  const collision = (
    asset
    && collisionState?.path === asset.collision.path
      ? collisionState.value
      : null
  );
  const runtimeBounds = (
    tierContract
    && loadedModel?.path === tierContract.path
      ? loadedModel.bounds
      : null
  );

  useEffect(() => {
    if (!asset) return;
    let cancelled = false;
    fetch(asset.collision.path, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`collision HTTP ${response.status}`);
        return response.json() as Promise<CollisionContract>;
      })
      .then((value) => {
        if (!cancelled) {
          setCollisionState({ path: asset.collision.path, value });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error("建筑碰撞合同载入失败", error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [asset]);

  useEffect(() => {
    if (!asset || !tierContract) return;
    writeQaQuery(resolvedAssetId, resolvedTier, view);
  }, [asset, resolvedAssetId, resolvedTier, tierContract, view]);

  const handleModelReady = useCallback((path: string, bounds: RuntimeBounds) => {
    setLoadedModel({ path, bounds });
  }, []);
  const handleCanvasSize = useCallback((width: number, height: number) => {
    setCanvasSize({ width, height });
  }, []);

  const modelReady = Boolean(tierContract && loadedModel?.path === tierContract.path);
  const groundContact = Boolean(
    runtimeBounds
    && Math.abs(runtimeBounds.min[1] - (asset?.coordinateContract.groundDatum ?? 0)) <= 0.001,
  );
  const openPathClear = openPathsAreClear(collision);
  const renderReady = Boolean(
    manifest
    && asset
    && tierContract
    && modelReady
    && collision
    && canvasSize.width > 0
    && canvasSize.height > 0,
  );

  if (manifestError) {
    return (
      <main className={styles.error} data-qa-route="building-engine-sandbox">
        <p>Sandbox manifest 载入失败：{manifestError}</p>
      </main>
    );
  }

  return (
    <main
      className={styles.shell}
      data-qa-route="building-engine-sandbox"
      data-qa-ready={manifest ? "true" : "false"}
      data-qa-render-ready={renderReady ? "true" : "false"}
      data-qa-asset={resolvedAssetId}
      data-qa-tier={resolvedTier}
      data-qa-view={view}
      data-qa-model-path={tierContract?.path ?? ""}
      data-qa-collision-path={asset?.collision.path ?? ""}
      data-qa-glb-sha={tierContract?.sha256 ?? ""}
      data-qa-collision-sha={asset?.collision.sha256 ?? ""}
      data-qa-model-visible={modelReady ? "true" : "false"}
      data-qa-ground-contact={groundContact ? "pass" : "pending"}
      data-qa-open-path-check={openPathClear ? "pass" : "pending"}
      data-qa-canvas={`${canvasSize.width}x${canvasSize.height}`}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>BUILDING ENGINE SPIKE</p>
          <h1>garden-villa · Three.js Sandbox</h1>
        </div>
        <div className={styles.status}>
          <span className={renderReady ? styles.passDot : styles.waitDot} />
          <span>{renderReady ? "runtime-ready" : "loading"}</span>
        </div>
      </header>

      <section className={styles.layout}>
        <div className={styles.viewer}>
          {asset && tierContract ? (
            <Canvas
              orthographic
              dpr={[1, 1.5]}
              frameloop="demand"
              camera={{ position: [0, 8, 20], near: 0.05, far: 250 }}
              gl={{ antialias: true, alpha: false }}
              onCreated={({ gl, size }) => {
                gl.domElement.dataset.qaCanvas = "building-engine";
                handleCanvasSize(size.width, size.height);
              }}
              shadows
            >
              <QaScene
                camera={asset.cameras[view]}
                collision={collision}
                modelPath={tierContract.path}
                onModelReady={handleModelReady}
                runtimeBounds={runtimeBounds}
                showCollision={showCollision}
              />
            </Canvas>
          ) : null}
          <div className={styles.legend}>
            <span>橙色 = 1.8 m 人物</span>
            <span>红色 = 碰撞体</span>
            <span>绿色 = 必须开放路径</span>
          </div>
          {!renderReady ? (
            <div className={styles.loading} data-qa-loading-message>
              正在载入当前 SHA 的 GLB 与碰撞合同…
            </div>
          ) : null}
        </div>

        <aside className={styles.panel}>
          <section>
            <p className={styles.label}>审核对象</p>
            <h2>{asset?.name ?? "载入中"}</h2>
            <p className={styles.muted}>
              {resolvedTier} · {VIEW_LABELS[view]} · 1 scene unit ={" "}
              {asset?.coordinateContract.sceneUnitMeters ?? 2.7} m
            </p>
          </section>

          <section>
            <p className={styles.label}>建筑</p>
            <div className={styles.buttonGrid}>
              {assetEntries.map(([candidateId, candidate]) => (
                <button
                  key={candidateId}
                  type="button"
                  className={candidateId === resolvedAssetId ? styles.active : ""}
                  onClick={() => {
                    setAssetId(candidateId);
                    if (!candidate.tiers[tier]) setTier("massing");
                  }}
                  data-qa-asset-button={candidateId}
                >
                  {candidate.name}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className={styles.label}>层级</p>
            <div className={styles.buttonGrid}>
              {TIER_ORDER.map((candidateTier) => (
                <button
                  key={candidateTier}
                  type="button"
                  disabled={!asset?.tiers[candidateTier]}
                  className={candidateTier === resolvedTier ? styles.active : ""}
                  onClick={() => setTier(candidateTier)}
                  data-qa-tier-button={candidateTier}
                >
                  {candidateTier === "massing" ? "Massing" : "Low-poly Master"}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className={styles.label}>固定机位</p>
            <div className={styles.viewGrid}>
              {VIEWS.map((candidateView) => (
                <button
                  key={candidateView}
                  type="button"
                  className={candidateView === view ? styles.active : ""}
                  onClick={() => setView(candidateView)}
                  data-qa-view-button={candidateView}
                >
                  {VIEW_LABELS[candidateView]}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.checks}>
            <p className={styles.label}>自动检查</p>
            <dl>
              <div>
                <dt>模型可见</dt>
                <dd data-qa-check="model-visible">{modelReady ? "pass" : "pending"}</dd>
              </div>
              <div>
                <dt>地面接触</dt>
                <dd data-qa-check="ground-contact">{groundContact ? "pass" : "pending"}</dd>
              </div>
              <div>
                <dt>开放路径</dt>
                <dd data-qa-check="open-path">{openPathClear ? "pass" : "pending"}</dd>
              </div>
              <div>
                <dt>Canvas</dt>
                <dd>{canvasSize.width} × {canvasSize.height}</dd>
              </div>
            </dl>
            <button
              type="button"
              className={showCollision ? styles.active : ""}
              onClick={() => setShowCollision((current) => !current)}
              data-qa-collision-toggle
            >
              {showCollision ? "隐藏碰撞叠层" : "显示碰撞叠层"}
            </button>
          </section>

          <section className={styles.hashes}>
            <p className={styles.label}>当前不可变目标</p>
            <code>GLB {tierContract?.sha256.slice(0, 16) ?? "—"}</code>
            <code>COL {asset?.collision.sha256.slice(0, 16) ?? "—"}</code>
          </section>
        </aside>
      </section>
    </main>
  );
}
