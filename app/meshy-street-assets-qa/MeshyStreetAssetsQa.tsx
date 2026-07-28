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
import styles from "./meshy-street-assets-qa.module.css";

const METERS_PER_SCENE_UNIT = 2.7;
const MODEL_SCALE = 1 / METERS_PER_SCENE_UNIT;

const ASSETS = [
  {
    slug: "plane-tree-straight-sparse",
    name: "直干疏冠法国梧桐",
    use: "少量近景行道树候选",
    path: "/models/nonbuilding/meshy-agent-street-assets/plane-tree-straight-sparse-visible-low.glb",
    widthMeters: 7.15,
    heightMeters: 10,
    defaultDistanceMeters: 24,
    hideDistanceMeters: 50,
    mountHeightMeters: 0,
  },
  {
    slug: "lane-lamp-short-arm",
    name: "里弄短臂路灯",
    use: "里弄、庭院与道路边缘重复街具",
    path: "/models/nonbuilding/meshy-agent-street-assets/lane-lamp-short-arm-visible-low.glb",
    widthMeters: 1.07,
    heightMeters: 3.36,
    defaultDistanceMeters: 10,
    hideDistanceMeters: 28,
    mountHeightMeters: 0,
  },
  {
    slug: "slatted-bench-backrest",
    name: "条板靠背长椅",
    use: "庭院、水边和店前",
    path: "/models/nonbuilding/meshy-agent-street-assets/slatted-bench-backrest-visible-low.glb",
    widthMeters: 2.08,
    heightMeters: 0.93,
    defaultDistanceMeters: 5,
    hideDistanceMeters: 18,
    mountHeightMeters: 0,
  },
  {
    slug: "street-planter-long",
    name: "长条街景花箱",
    use: "店前、水景边缘和道路节点",
    path: "/models/nonbuilding/meshy-agent-street-assets/street-planter-long-visible-low.glb",
    widthMeters: 1.4,
    heightMeters: 0.55,
    defaultDistanceMeters: 5,
    hideDistanceMeters: 18,
    mountHeightMeters: 0,
  },
  {
    slug: "stone-bollard-squat",
    name: "矮方不规则石桩",
    use: "入口、道路边缘和步行空间",
    path: "/models/nonbuilding/meshy-agent-street-assets/stone-bollard-squat-visible-low.glb",
    widthMeters: 0.6,
    heightMeters: 0.75,
    defaultDistanceMeters: 4,
    hideDistanceMeters: 18,
    mountHeightMeters: 0,
  },
  {
    slug: "shanghai-dual-classification-bin",
    name: "上海双分类垃圾桶",
    use: "道路、口袋公园和公共入口",
    path: "/models/nonbuilding/meshy-agent-street-assets/shanghai-dual-classification-bin-visible-low.glb",
    widthMeters: 0.9,
    heightMeters: 0.91,
    defaultDistanceMeters: 4,
    hideDistanceMeters: 18,
    mountHeightMeters: 0,
  },
  {
    slug: "cantilever-cafe-umbrella",
    name: "悬臂咖啡伞",
    use: "咖啡店外摆与庭院休憩区",
    path: "/models/nonbuilding/meshy-agent-street-assets/cantilever-cafe-umbrella-visible-low.glb",
    widthMeters: 2.8,
    heightMeters: 2.57,
    defaultDistanceMeters: 10,
    hideDistanceMeters: 24,
    mountHeightMeters: 0,
  },
  {
    slug: "outdoor-dining-dark-wood",
    name: "深色木金属户外桌椅",
    use: "咖啡店、餐厅和庭院外摆",
    path: "/models/nonbuilding/meshy-agent-street-assets/outdoor-dining-dark-wood-visible-low.glb",
    widthMeters: 2.4,
    heightMeters: 0.9,
    defaultDistanceMeters: 6,
    hideDistanceMeters: 18,
    mountHeightMeters: 0,
  },
  {
    slug: "vintage-step-through-bicycle",
    name: "复古弯梁自行车",
    use: "建筑入口、围墙与店前的少量身份道具",
    path: "/models/nonbuilding/meshy-agent-street-assets/vintage-step-through-bicycle-visible-low.glb",
    widthMeters: 1.76,
    heightMeters: 1.1,
    defaultDistanceMeters: 5,
    hideDistanceMeters: 18,
    mountHeightMeters: 0,
  },
  {
    slug: "wall-ac-outdoor-unit",
    name: "壁挂空调外机",
    use: "建筑立面的重复生活细节",
    path: "/models/nonbuilding/meshy-agent-street-assets/wall-ac-outdoor-unit-visible-low.glb",
    widthMeters: 0.8,
    heightMeters: 0.55,
    defaultDistanceMeters: 5,
    hideDistanceMeters: 18,
    mountHeightMeters: 2.2,
  },
] as const;

type AssetSlug = (typeof ASSETS)[number]["slug"];

function resolveAsset(value: string | null) {
  return ASSETS.find((asset) => asset.slug === value) ?? ASSETS[0];
}

function parseDistance(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(55, Math.max(3, parsed));
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
      distance * 0.16,
      Math.max(0.5, targetHeight + distance * 0.06),
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
  return <primitive object={model} scale={MODEL_SCALE} />;
}

function HumanScaleRuler({ assetWidthMeters }: { assetWidthMeters: number }) {
  const height = 1.75 / METERS_PER_SCENE_UNIT;
  const rulerX =
    -Math.min(1.55, (assetWidthMeters / METERS_PER_SCENE_UNIT) * 0.58) - 0.12;
  return (
    <group position={[rulerX, 0, 0.04]} aria-label="1.75 米人物尺度尺">
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
  asset,
  distanceMeters,
  onModelReady,
  visible,
}: {
  asset: (typeof ASSETS)[number];
  distanceMeters: number;
  onModelReady: (path: string) => void;
  visible: boolean;
}) {
  const targetHeightMeters =
    asset.mountHeightMeters > 0
      ? asset.mountHeightMeters
      : asset.heightMeters * 0.48;
  return (
    <>
      <color attach="background" args={["#d8dfdc"]} />
      <fog attach="fog" args={["#d8dfdc", 8, 24]} />
      <CameraRig
        distanceMeters={distanceMeters}
        targetHeightMeters={targetHeightMeters}
      />
      <ambientLight intensity={0.82} color="#fff4df" />
      <hemisphereLight args={["#d9e7eb", "#655744", 1.22]} />
      <directionalLight
        position={[-3, 5, 4]}
        color="#ffd7a0"
        intensity={3.5}
        castShadow
      />
      <directionalLight position={[4, 3, -3]} color="#afc6d2" intensity={1.3} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.004} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#7f8983" roughness={0.96} />
      </mesh>
      <gridHelper args={[12, 48, "#9ca59f", "#9ca59f"]} position-y={0.002} />
      {asset.mountHeightMeters > 0 && (
        <mesh
          position={[0, asset.mountHeightMeters / METERS_PER_SCENE_UNIT, -0.02]}
        >
          <planeGeometry args={[2.4, 2.4]} />
          <meshStandardMaterial color="#b8b3a8" roughness={0.9} />
        </mesh>
      )}
      <HumanScaleRuler assetWidthMeters={asset.widthMeters} />
      {visible && (
        <Suspense fallback={null}>
          <group position-y={asset.mountHeightMeters / METERS_PER_SCENE_UNIT}>
            <RuntimeModel path={asset.path} onReady={onModelReady} />
          </group>
        </Suspense>
      )}
    </>
  );
}

function writeQuery(asset: AssetSlug, distanceMeters: number) {
  const url = new URL(window.location.href);
  url.searchParams.set("asset", asset);
  url.searchParams.set("distance", String(distanceMeters));
  window.history.replaceState(null, "", url);
}

export function MeshyStreetAssetsQa() {
  const searchParams = useSearchParams();
  const initialAsset = resolveAsset(searchParams.get("asset"));
  const [assetSlug, setAssetSlug] = useState<AssetSlug>(initialAsset.slug);
  const [distanceMeters, setDistanceMeters] = useState(() =>
    parseDistance(searchParams.get("distance"), initialAsset.defaultDistanceMeters),
  );
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const handleReady = useCallback((path: string) => setLoadedPath(path), []);
  const asset = resolveAsset(assetSlug);
  const visible = distanceMeters < asset.hideDistanceMeters;
  const renderReady = !visible || loadedPath === asset.path;

  useEffect(() => {
    writeQuery(asset.slug, distanceMeters);
  }, [asset.slug, distanceMeters]);

  return (
    <main
      className={styles.shell}
      data-qa-route="meshy-street-assets"
      data-qa-ready="true"
      data-qa-render-ready={renderReady ? "true" : "false"}
      data-qa-asset={asset.slug}
      data-qa-model-state={visible ? "visible-low" : "hidden"}
      data-qa-distance-meters={distanceMeters}
      data-qa-model-path={asset.path}
      data-qa-model-scale={MODEL_SCALE}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>MESHY AGENT · WEBGL ACCEPTANCE</p>
          <h1>十件低模街景资产</h1>
        </div>
        <div className={styles.status}>
          <span className={visible ? styles.visibleDot : styles.hiddenDot} />
          <span>{visible ? "visible-low" : "hidden"}</span>
        </div>
      </header>

      <section className={styles.layout}>
        <div className={styles.viewer}>
          <Canvas
            dpr={[1, 1.35]}
            frameloop="demand"
            camera={{ position: [0.4, 0.55, 2], fov: 34, near: 0.02, far: 40 }}
            gl={{ antialias: true, alpha: false }}
            shadows
          >
            <QaScene
              asset={asset}
              distanceMeters={distanceMeters}
              onModelReady={handleReady}
              visible={visible}
            />
          </Canvas>
          <div className={styles.legend}>
            <span>橙色尺 = 1.75 m</span>
            <span>GLB authored in meters</span>
            <span>runtime scale = 1 / 2.7</span>
          </div>
          {!visible && (
            <div className={styles.message} data-qa-hidden-message>
              <strong>达到该资产隐藏距离</strong>
              <span>当前 GLB 已停止渲染，未替换成伪 Massing。</span>
            </div>
          )}
          {visible && !renderReady && (
            <div className={styles.message} data-qa-loading-message>
              正在载入 visible-low GLB…
            </div>
          )}
        </div>

        <aside className={styles.panel}>
          <section>
            <p className={styles.label}>当前资产</p>
            <h2>{asset.name}</h2>
            <p className={styles.use}>{asset.use}</p>
            <dl className={styles.metrics}>
              <div>
                <dt>真实高度</dt>
                <dd>{asset.heightMeters.toFixed(2)} m</dd>
              </div>
              <div>
                <dt>隐藏距离</dt>
                <dd>{asset.hideDistanceMeters} m</dd>
              </div>
              <div>
                <dt>运行时缩放</dt>
                <dd>1 / 2.7</dd>
              </div>
            </dl>
          </section>

          <section>
            <p className={styles.label}>十件资产</p>
            <div className={styles.assetButtons}>
              {ASSETS.map((candidate) => (
                <button
                  key={candidate.slug}
                  type="button"
                  className={
                    candidate.slug === asset.slug ? styles.activeButton : ""
                  }
                  onClick={() => {
                    setAssetSlug(candidate.slug);
                    setDistanceMeters(candidate.defaultDistanceMeters);
                    setLoadedPath(null);
                  }}
                  data-qa-asset-button={candidate.slug}
                >
                  {candidate.name}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className={styles.label}>相机与两态</p>
            <label className={styles.slider}>
              <span>距离</span>
              <strong>{distanceMeters.toFixed(0)} m</strong>
              <input
                type="range"
                min="3"
                max="55"
                step="1"
                value={distanceMeters}
                onChange={(event) =>
                  setDistanceMeters(Number(event.currentTarget.value))
                }
                data-qa-distance-slider
              />
            </label>
            <div className={styles.distanceButtons}>
              {[4, 10, 18, 24, 50].map((distance) => (
                <button
                  key={distance}
                  type="button"
                  className={
                    distanceMeters === distance ? styles.activeButton : ""
                  }
                  onClick={() => setDistanceMeters(distance)}
                  data-qa-distance-button={distance}
                >
                  {distance} m
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className={styles.label}>隔离合同</p>
            <p className={styles.contract}>
              本页只加载本批 10 个 GLB，不修改生产 registry、地图摆位或建筑三档。
              具体地点接入前仍须重新对照真实照片。
            </p>
            <code>{asset.path}</code>
          </section>
        </aside>
      </section>
    </main>
  );
}
