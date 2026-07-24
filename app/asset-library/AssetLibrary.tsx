"use client";

import { Bounds, Center, ContactShadows, PerspectiveCamera, View, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import Link from "next/link";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Box3, Group, Mesh, Object3D, Vector3 } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  CantileverCafeUmbrella,
  HeritageLaneLamp,
  IrregularStoneBollard,
  OutdoorDiningSet,
  SlattedBench,
  StreetPlanter,
} from "../scene/shared-street-assets";
import {
  ALL_ASSETS,
  BUILDING_ASSETS,
  CATEGORY_META,
  type AssetCategory,
  type AssetRecord,
  type AssetStatus,
  type QualityLevel,
} from "./asset-data";
import styles from "./asset-library.module.css";

const CATEGORY_ORDER: AssetCategory[] = ["buildings", "lighting", "trees", "decor", "characters"];

const STATUS_META: Record<AssetStatus, { label: string; className: string }> = {
  online: { label: "线上", className: styles.statusOnline },
  ready: { label: "已就绪", className: styles.statusReady },
  pilot: { label: "实验", className: styles.statusPilot },
  internal: { label: "内部", className: styles.statusInternal },
  pending: { label: "待制作", className: styles.statusPending },
  archived: { label: "历史", className: styles.statusArchived },
};

function StatusBadge({ status }: { status: AssetStatus }) {
  const meta = STATUS_META[status];
  return <span className={`${styles.statusBadge} ${meta.className}`}>{meta.label}</span>;
}

function useIsVisible(rootMargin = "240px") {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin });
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);
  return { ref, visible };
}

function AutoTurn({ children, speed = 0.12 }: { children: ReactNode; speed?: number }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * speed;
  });
  return <group ref={group}>{children}</group>;
}

function RuntimeModel({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  const model = useMemo(() => {
    const result = clone(scene) as Object3D;
    result.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    const bounds = new Box3().setFromObject(result);
    const size = bounds.getSize(new Vector3());
    if (size.z > size.x * 0.96) result.rotation.y = -0.42;
    return result;
  }, [scene]);
  return <primitive object={model} scale={[1, 1, -1]} />;
}

function ProceduralPreview({ kind }: { kind: string }) {
  if (kind === "lane-lamp") return <HeritageLaneLamp seed={2} evidenceRef="asset-library" />;
  if (kind === "umbrella") return <CantileverCafeUmbrella seed={7} evidenceRef="asset-library" />;
  if (kind === "dining") return <OutdoorDiningSet variant="colorful-folding" seed={9} evidenceRef="asset-library" />;
  if (kind === "bench") return <SlattedBench seed={4} evidenceRef="asset-library" />;
  if (kind === "planter") return <StreetPlanter variant="long" seed={6} evidenceRef="asset-library" />;
  if (kind === "bollard") return <IrregularStoneBollard variant={1} seed={3} evidenceRef="asset-library" />;
  if (kind === "paving") {
    return (
      <group>
        {Array.from({ length: 28 }, (_, index) => (
          <mesh
            key={index}
            position={[(index % 7 - 3) * 0.62, 0, (Math.floor(index / 7) - 1.5) * 0.72]}
            rotation-y={(index % 3 - 1) * 0.04}
            receiveShadow
          >
            <boxGeometry args={[0.56, 0.08, 0.66]} />
            <meshStandardMaterial color={["#807d72", "#999487", "#6e716b"][index % 3]} roughness={0.94} />
          </mesh>
        ))}
      </group>
    );
  }
  if (kind === "ground-cover") {
    return (
      <group>
        {Array.from({ length: 18 }, (_, index) => {
          const angle = index * 2.1;
          const radius = 0.35 + (index % 6) * 0.25;
          return (
            <mesh key={index} position={[Math.cos(angle) * radius, 0.3 + index % 3 * 0.06, Math.sin(angle) * radius]}>
              <icosahedronGeometry args={[0.42 + index % 4 * 0.06, 1]} />
              <meshToonMaterial color={["#64784b", "#84905d", "#496a4d"][index % 3]} />
            </mesh>
          );
        })}
      </group>
    );
  }
  if (kind === "campus-tree" || kind === "huashan-tree") {
    const detailed = kind === "huashan-tree";
    return (
      <group>
        <mesh position={[0, 2.5, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.29, 5, 9]} />
          <meshToonMaterial color="#6b5948" />
        </mesh>
        <mesh position={[0, 5.5, 0]} castShadow>
          <icosahedronGeometry args={[2.1, 2]} />
          <meshToonMaterial color="#506f4c" />
        </mesh>
        {detailed && (
          <>
            <mesh position={[1.05, 5, 0.3]} castShadow>
              <icosahedronGeometry args={[1.25, 1]} />
              <meshToonMaterial color="#6e8556" />
            </mesh>
            <mesh position={[0, 0.24, 0]} castShadow>
              <cylinderGeometry args={[0.48, 0.72, 0.45, 10]} />
              <meshToonMaterial color="#75624c" />
            </mesh>
          </>
        )}
      </group>
    );
  }
  if (kind === "sunset-light") {
    return (
      <group>
        <mesh position={[0, 1.2, 0]} castShadow>
          <boxGeometry args={[4.4, 2.4, 3]} />
          <meshToonMaterial color="#c8ae8a" />
        </mesh>
        <mesh position={[0, 2.7, 0]} rotation-y={Math.PI / 4} castShadow>
          <coneGeometry args={[3.25, 1.5, 4]} />
          <meshToonMaterial color="#784c3e" />
        </mesh>
        {[-1.25, 0, 1.25].map((x) => (
          <mesh key={x} position={[x, 1.3, 1.51]}>
            <boxGeometry args={[0.58, 0.86, 0.08]} />
            <meshStandardMaterial color="#3f5c5c" roughness={0.35} />
          </mesh>
        ))}
      </group>
    );
  }
  return (
    <group>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[1.8, 1.1, 1.4]} />
        <meshBasicMaterial color="#d8d4ca" wireframe />
      </mesh>
    </group>
  );
}

function AssetScene({ model, preview }: { model?: string; preview?: string }) {
  return (
    <>
      <color attach="background" args={["#cfd9de"]} />
      <fog attach="fog" args={["#cfd9de", 24, 55]} />
      <PerspectiveCamera makeDefault position={[8.8, 6.4, 11]} fov={32} />
      <ambientLight color="#fff0da" intensity={0.55} />
      <hemisphereLight args={["#bfd7e7", "#615342", 1.15]} />
      <directionalLight
        position={[-8, 11, -14]}
        color="#ffc47f"
        intensity={4.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[8, 7, 10]} color="#a8c6d8" intensity={1.8} />
      <Bounds fit clip observe margin={1.3}>
        <Center top>
          <AutoTurn speed={model?.includes("character") ? 0.04 : 0.1}>
            {model ? <RuntimeModel path={model} /> : <ProceduralPreview kind={preview ?? "missing"} />}
          </AutoTurn>
        </Center>
      </Bounds>
      <ContactShadows position={[0, -0.02, 0]} opacity={0.4} scale={18} blur={2.5} far={12} color="#354544" />
    </>
  );
}

function LivePreview({ model, preview, label }: { model?: string; preview?: string; label: string }) {
  const { ref, visible } = useIsVisible();
  return (
    <div className={styles.preview}>
      <View
        ref={ref}
        className={styles.previewViewport}
        aria-label={`${label} 的实时三维预览`}
        frames={visible ? Infinity : 1}
      >
        {visible && (
          <Suspense fallback={null}>
            <AssetScene model={model} preview={preview} />
          </Suspense>
        )}
      </View>
      <div className={styles.previewChrome}>
        <span className={styles.liveDot} />
        实时 3D
      </div>
    </div>
  );
}

function BuildingCard({ asset }: { asset: AssetRecord }) {
  const [selectedLevel, setSelectedLevel] = useState<QualityLevel>(
    asset.qualityLevels?.[0] ?? {
      id: "hero",
      name: "Hero / Full",
      status: asset.status,
      model: asset.model,
      note: "",
    },
  );
  const displayModel = selectedLevel.model ?? asset.model;
  return (
    <article className={`${styles.assetCard} ${styles.buildingCard}`}>
      <LivePreview model={displayModel} label={`${asset.name} ${selectedLevel.name}`} />
      <div className={styles.cardBody}>
        <div className={styles.cardTopline}>
          <span className={styles.assetCode}>{asset.id}</span>
          <StatusBadge status={asset.status} />
        </div>
        <h3>{asset.name}</h3>
        <p className={styles.subtitle}>{asset.subtitle}</p>
        <div className={styles.levels} aria-label={`${asset.name} 质量等级`}>
          {asset.qualityLevels?.map((level) => (
            <button
              key={level.id}
              type="button"
              className={`${styles.levelButton} ${selectedLevel.id === level.id ? styles.levelButtonActive : ""}`}
              onClick={() => setSelectedLevel(level)}
              disabled={!level.model && level.status === "pending"}
              title={level.note}
            >
              <span>{level.name}</span>
              <StatusBadge status={level.status} />
            </button>
          ))}
        </div>
        <p className={styles.levelNote}>{selectedLevel.note}</p>
      </div>
    </article>
  );
}

function StandardCard({ asset }: { asset: AssetRecord }) {
  const [variant, setVariant] = useState(0);
  let model = asset.model;
  if (asset.id === "plane-tree") {
    model = [
      "/models/xinhua-road/plane-tree-a.glb?v=36ffe252c43b",
      "/models/xinhua-road/plane-tree-b.glb?v=7c2e06d0794f",
      "/models/xinhua-road/plane-tree-c.glb?v=c4c14bd84d9c",
      "/models/building-evidence-lab/xinhua-plane-tree-hero.glb?v=3",
    ][variant];
  }
  return (
    <article className={styles.assetCard}>
      <LivePreview model={model} preview={asset.preview} label={asset.name} />
      <div className={styles.cardBody}>
        <div className={styles.cardTopline}>
          <span className={styles.assetCode}>{asset.id}</span>
          <StatusBadge status={asset.status} />
        </div>
        <h3>{asset.name}</h3>
        <p className={styles.subtitle}>{asset.subtitle}</p>
        {asset.variants && asset.variants.length > 0 && (
          <div className={styles.variantRow}>
            {asset.variants.map((item, index) => (
              <button
                key={item}
                type="button"
                className={`${styles.variantChip} ${variant === index ? styles.variantChipActive : ""}`}
                onClick={() => setVariant(index)}
              >
                {item}
              </button>
            ))}
          </div>
        )}
        {asset.note && <p className={styles.note}>{asset.note}</p>}
      </div>
    </article>
  );
}

export function AssetLibrary() {
  const container = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState<AssetCategory | "all">("all");
  const [query, setQuery] = useState("");

  const onlineCounts = useMemo(() => Object.fromEntries(
    CATEGORY_ORDER.map((category) => [
      category,
      ALL_ASSETS.filter((asset) => asset.category === category && asset.status === "online").length,
    ]),
  ) as Record<AssetCategory, number>, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return ALL_ASSETS.filter((asset) => (
      (activeCategory === "all" || asset.category === activeCategory)
      && (!normalized || `${asset.name} ${asset.subtitle} ${asset.id}`.toLowerCase().includes(normalized))
    ));
  }, [activeCategory, query]);

  const readyIdentityCount = BUILDING_ASSETS.filter((asset) => (
    asset.qualityLevels?.some((level) => level.id === "identity" && ["ready", "online"].includes(level.status))
  )).length;
  const onlineTotal = ALL_ASSETS.filter((asset) => asset.status === "online").length;

  return (
    <div ref={container} className={styles.shell}>
      <Canvas
        className={styles.canvas}
        eventSource={container}
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <View.Port />
      </Canvas>

      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="返回新华漫游志">
          <span className={styles.brandMark}>新</span>
          <span>
            <strong>新华漫游志</strong>
            <small>Asset Library</small>
          </span>
        </Link>
        <div className={styles.headerMeta}>
          <span className={styles.syncDot} />
          生产资产快照 · 2026.07.25
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>资产管理后台 / 一页总览</p>
            <h1>现在拥有什么，<br /><em>一眼看清。</em></h1>
            <p className={styles.heroCopy}>
              只统计真实接入场景的生产资产。建筑三档完整列出，实验、内部占位与待制作状态不会混入线上总数。
            </p>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.primaryStat}>
              <span>线上资产类型</span>
              <strong>{onlineTotal}</strong>
              <small>跨 5 个分类</small>
            </div>
            <div className={styles.miniStats}>
              <div><span>建筑 Hero</span><strong>{BUILDING_ASSETS.length}</strong></div>
              <div><span>Identity 就绪</span><strong>{readyIdentityCount}</strong></div>
              <div><span>线上树木实例</span><strong>188</strong></div>
            </div>
          </div>
        </section>

        <section className={styles.toolbar} aria-label="资产筛选">
          <div className={styles.categoryTabs}>
            <button
              type="button"
              className={activeCategory === "all" ? styles.tabActive : ""}
              onClick={() => setActiveCategory("all")}
            >
              全部 <span>{ALL_ASSETS.length}</span>
            </button>
            {CATEGORY_ORDER.map((category) => (
              <button
                key={category}
                type="button"
                className={activeCategory === category ? styles.tabActive : ""}
                onClick={() => setActiveCategory(category)}
              >
                {CATEGORY_META[category].label} <span>{onlineCounts[category]}</span>
              </button>
            ))}
          </div>
          <label className={styles.search}>
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索名称、门牌号或资产 ID"
            />
          </label>
        </section>

        {CATEGORY_ORDER.map((category) => {
          const assets = filtered.filter((asset) => asset.category === category);
          if (assets.length === 0) return null;
          const variants = assets.reduce((total, asset) => total + Math.max(asset.variants?.length ?? 0, 1), 0);
          return (
            <section key={category} className={styles.categorySection}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.sectionIndex}>{String(CATEGORY_ORDER.indexOf(category) + 1).padStart(2, "0")}</span>
                  <h2>{CATEGORY_META[category].label}</h2>
                </div>
                <p>
                  {assets.length} {CATEGORY_META[category].short}
                  {category !== "buildings" && ` · ${variants} 个形态`}
                </p>
              </div>
              <div className={`${styles.assetGrid} ${category === "buildings" ? styles.buildingGrid : ""}`}>
                {assets.map((asset) => (
                  category === "buildings"
                    ? <BuildingCard key={asset.id} asset={asset} />
                    : <StandardCard key={asset.id} asset={asset} />
                ))}
              </div>
              {category === "lighting" && (
                <div className={styles.roadmap}>
                  <span>下一套光线</span>
                  <strong>正午</strong>
                  <p>预留资产位，尚未接入生产配置，不计入当前总数。</p>
                </div>
              )}
            </section>
          );
        })}

        {filtered.length === 0 && (
          <div className={styles.emptyState}>
            <strong>没有匹配的资产</strong>
            <p>换一个关键词，或清除当前分类筛选。</p>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <span>WANDER XINHUA · INTERNAL ASSET LIBRARY</span>
        <span>数据来源：生产注册表与运行时代码</span>
      </footer>
    </div>
  );
}
