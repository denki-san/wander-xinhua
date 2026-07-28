"use client";

import { useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Mesh, Object3D, Vector3 } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import styles from "./nonbuilding-evidence-qa.module.css";

const METERS_PER_SCENE_UNIT = 2.7;
const FAR_HIDE_DISTANCE_METERS = 18;
const DEFAULT_DISTANCE_METERS = 4;

const ASSETS = [
  {
    slug: "xingfuli-pointed-entry-bollard",
    name: "幸福里当前入口尖顶路桩",
    location: "番禺路 381 号入口附近",
    evidence: "入口图反复显示方柱身、四坡尖顶帽和离散排列。",
    path: "/models/nonbuilding/xingfuli-current-street-furniture/xingfuli-pointed-entry-bollard-visible-low.glb",
    defaultDistanceMeters: 4,
    hideDistanceMeters: FAR_HIDE_DISTANCE_METERS,
    targetHeightMeters: 0.15,
    mountHeightMeters: 0,
  },
  {
    slug: "xingfuli-water-edge-stone-seat-round",
    name: "幸福里临水圆形石座",
    location: "幸福里内部水景段",
    evidence: "水边近景和纵深图共同证明近球形、底部收平的座具。",
    path: "/models/nonbuilding/xingfuli-current-street-furniture/xingfuli-water-edge-stone-seat-round-visible-low.glb",
    defaultDistanceMeters: 4,
    hideDistanceMeters: FAR_HIDE_DISTANCE_METERS,
    targetHeightMeters: 0.12,
    mountHeightMeters: 0,
  },
  {
    slug: "xingfuli-water-edge-stone-seat-long",
    name: "幸福里临水长形石座",
    location: "幸福里内部水景段",
    evidence: "多件重复实例证明长椭圆轮廓、圆钝端部和低矮顶部。",
    path: "/models/nonbuilding/xingfuli-current-street-furniture/xingfuli-water-edge-stone-seat-long-visible-low.glb",
    defaultDistanceMeters: 4,
    hideDistanceMeters: FAR_HIDE_DISTANCE_METERS,
    targetHeightMeters: 0.12,
    mountHeightMeters: 0,
  },
  {
    slug: "xingfuli-water-edge-slim-planter",
    name: "幸福里临水窄型花槽",
    location: "幸福里内部线性水景边缘",
    evidence: "多张水景图反复显示窄矩形槽体、可见土层和高低不等植物。",
    path: "/models/nonbuilding/xingfuli-current-street-furniture/xingfuli-water-edge-slim-planter-visible-low.glb",
    defaultDistanceMeters: 4,
    hideDistanceMeters: FAR_HIDE_DISTANCE_METERS,
    targetHeightMeters: 0.16,
    mountHeightMeters: 0,
  },
] as const;

type AssetSlug = (typeof ASSETS)[number]["slug"];

function resolveAsset(slug: string | null) {
  return ASSETS.find((asset) => asset.slug === slug) ?? ASSETS[0];
}

function parseDistance(value: string | null, fallback = DEFAULT_DISTANCE_METERS) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(60, Math.max(3, parsed));
}

function CameraRig({
  distanceMeters,
  targetHeightMeters,
}: {
  distanceMeters: number;
  targetHeightMeters: number;
}) {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    const distance = distanceMeters / METERS_PER_SCENE_UNIT;
    const targetHeight = targetHeightMeters / METERS_PER_SCENE_UNIT;
    camera.position.set(
      distance * 0.12,
      Math.max(0.44, targetHeight + distance * 0.06),
      distance,
    );
    camera.lookAt(new Vector3(0, targetHeight, 0));
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, distanceMeters, invalidate, targetHeightMeters]);
  return null;
}

function RuntimeModel({
  path,
  onReady,
}: {
  path: string;
  onReady: (path: string) => void;
}) {
  const { scene } = useGLTF(path);
  const model = useMemo(() => {
    const result = clone(scene) as Object3D;
    result.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });
    return result;
  }, [scene]);
  useEffect(() => {
    onReady(path);
  }, [onReady, path]);
  return <primitive object={model} />;
}

function HumanScaleRuler() {
  const height = 1.75 / METERS_PER_SCENE_UNIT;
  return (
    <group position={[-0.33, 0, 0.02]} aria-label="1.75 米人物尺度尺">
      <mesh position={[0, height * 0.46, 0]} castShadow>
        <capsuleGeometry args={[0.035, height * 0.66, 4, 8]} />
        <meshStandardMaterial color="#d8793e" roughness={0.82} />
      </mesh>
      <mesh position={[0, height * 0.91, 0]} castShadow>
        <sphereGeometry args={[0.055, 12, 10]} />
        <meshStandardMaterial color="#d8793e" roughness={0.82} />
      </mesh>
    </group>
  );
}

function QaScene({
  assetPath,
  distanceMeters,
  targetHeightMeters,
  mountHeightMeters,
  onModelReady,
  visible,
}: {
  assetPath: string;
  distanceMeters: number;
  targetHeightMeters: number;
  mountHeightMeters: number;
  onModelReady: (path: string) => void;
  visible: boolean;
}) {
  return (
    <>
      <color attach="background" args={["#d8dfdc"]} />
      <fog attach="fog" args={["#d8dfdc", 6, 13]} />
      <CameraRig
        distanceMeters={distanceMeters}
        targetHeightMeters={targetHeightMeters}
      />
      <ambientLight intensity={0.8} color="#fff4df" />
      <hemisphereLight args={["#d9e7eb", "#655744", 1.25]} />
      <directionalLight
        position={[-3, 5, 4]}
        color="#ffd7a0"
        intensity={3.8}
        castShadow
      />
      <directionalLight position={[4, 3, -3]} color="#afc6d2" intensity={1.4} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.004} receiveShadow>
        <planeGeometry args={[7, 7]} />
        <meshStandardMaterial color="#7f8983" roughness={0.96} />
      </mesh>
      <gridHelper args={[7, 28, "#9ca59f", "#9ca59f"]} position-y={0.002} />
      <HumanScaleRuler />
      {visible ? (
        <Suspense fallback={null}>
          <group position-y={mountHeightMeters / METERS_PER_SCENE_UNIT}>
            <RuntimeModel path={assetPath} onReady={onModelReady} />
          </group>
        </Suspense>
      ) : null}
    </>
  );
}

function writeQaQuery(asset: AssetSlug, distanceMeters: number) {
  const url = new URL(window.location.href);
  url.searchParams.set("asset", asset);
  url.searchParams.set("distance", String(distanceMeters));
  window.history.replaceState(null, "", url);
}

export function NonbuildingEvidenceQa() {
  const searchParams = useSearchParams();
  const [assetSlug, setAssetSlug] = useState<AssetSlug>(
    () => resolveAsset(searchParams.get("asset")).slug,
  );
  const [distanceMeters, setDistanceMeters] = useState(
    () => parseDistance(
      searchParams.get("distance"),
      resolveAsset(searchParams.get("asset")).defaultDistanceMeters,
    ),
  );
  const [loadedAssetPath, setLoadedAssetPath] = useState<string | null>(null);
  const handleModelReady = useCallback((path: string) => {
    setLoadedAssetPath(path);
  }, []);

  const asset = resolveAsset(assetSlug);
  const visible = distanceMeters < asset.hideDistanceMeters;
  const runtimeState = visible ? "visible-low" : "hidden";
  const renderReady = !visible || loadedAssetPath === asset.path;

  useEffect(() => {
    writeQaQuery(asset.slug, distanceMeters);
  }, [asset.slug, distanceMeters]);

  return (
    <main
      className={styles.shell}
      data-qa-route="nonbuilding-evidence"
      data-qa-ready="true"
      data-qa-render-ready={renderReady ? "true" : "false"}
      data-qa-asset={asset.slug}
      data-qa-model-state={runtimeState}
      data-qa-distance-meters={distanceMeters}
      data-qa-model-path={asset.path}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>NONBUILDING EVIDENCE QA</p>
          <h1>幸福里当前街具 · 两态验证</h1>
        </div>
        <div className={styles.headerStatus}>
          <span className={visible ? styles.visibleDot : styles.hiddenDot} />
          <span data-qa-state-label>{runtimeState}</span>
        </div>
      </header>

      <section className={styles.layout}>
        <div className={styles.viewer}>
          <Canvas
            dpr={[1, 1.35]}
            frameloop="demand"
            camera={{ position: [0.4, 0.55, 1.48], fov: 34, near: 0.02, far: 30 }}
            gl={{ antialias: true, alpha: false }}
            shadows
          >
            <QaScene
              assetPath={asset.path}
              distanceMeters={distanceMeters}
              targetHeightMeters={asset.targetHeightMeters}
              mountHeightMeters={asset.mountHeightMeters}
              onModelReady={handleModelReady}
              visible={visible}
            />
          </Canvas>
          <div className={styles.viewerLegend}>
            <span>橙色尺 = 1.75 m</span>
            <span>1 scene unit = 2.7 m</span>
          </div>
          {!visible && (
            <div className={styles.hiddenMessage} data-qa-hidden-message>
              <strong>远景已隐藏</strong>
              <span>没有 Massing 替身，也不会发起该 GLB 的首次加载。</span>
            </div>
          )}
          {visible && !renderReady && (
            <div className={styles.loadingMessage} data-qa-loading-message>
              正在载入 visible-low GLB…
            </div>
          )}
        </div>

        <aside className={styles.panel}>
          <section>
            <p className={styles.label}>当前资产</p>
            <h2>{asset.name}</h2>
            <p className={styles.location}>{asset.location}</p>
            <p className={styles.evidence}>{asset.evidence}</p>
          </section>

          <section>
            <p className={styles.label}>模型选择</p>
            <div className={styles.assetButtons}>
              {ASSETS.map((candidate) => (
                <button
                  key={candidate.slug}
                  type="button"
                  className={candidate.slug === asset.slug ? styles.activeButton : ""}
                  onClick={() => {
                    setAssetSlug(candidate.slug);
                    setDistanceMeters(candidate.defaultDistanceMeters);
                  }}
                  data-qa-asset-button={candidate.slug}
                >
                  {candidate.name.replace("幸福里", "")}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className={styles.label}>距离状态</p>
            <div className={styles.distanceButtons}>
              {[
                { label: "近景", value: 4 },
                { label: "推荐", value: asset.defaultDistanceMeters },
                { label: "远景隐藏", value: asset.hideDistanceMeters + 4 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className={distanceMeters === preset.value ? styles.activeButton : ""}
                  onClick={() => setDistanceMeters(preset.value)}
                  data-qa-distance-button={preset.value}
                >
                  {preset.label} · {preset.value}m
                </button>
              ))}
            </div>
            <label className={styles.sliderLabel}>
              <span>相机距离</span>
              <strong>{distanceMeters.toFixed(0)} m</strong>
              <input
                type="range"
                min="3"
                max="60"
                step="1"
                value={distanceMeters}
                onChange={(event) => setDistanceMeters(Number(event.target.value))}
                data-qa-distance-slider
              />
            </label>
          </section>

          <section className={styles.contract}>
            <p className={styles.label}>兼容与加载合同</p>
            <dl>
              <div>
                <dt>近景 / 稍远</dt>
                <dd>同一份 visible-low GLB</dd>
              </div>
              <div>
                <dt>≥ {asset.hideDistanceMeters} m</dt>
                <dd>hidden，完全不渲染</dd>
              </div>
              <div>
                <dt>建筑三档</dt>
                <dd>不修改 Hero / Identity / Massing</dd>
              </div>
              <div>
                <dt>生产地图</dt>
                <dd>本批 0 实例、0 registry 改动</dd>
              </div>
            </dl>
            <code data-qa-runtime-path>{asset.path}</code>
          </section>
        </aside>
      </section>
    </main>
  );
}
