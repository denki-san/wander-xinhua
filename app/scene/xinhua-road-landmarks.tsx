"use client";

import { Html, useGLTF } from "@react-three/drei";
import {
  Color,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
  type Object3D,
} from "three";
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  autumnShadowSurfaceHeightAt,
  terrainHeightAt,
} from "./terrain";
import {
  PLANE_TREE_GROUND_INSET,
  PlaneTreeInstances,
  cloneAutumnPlaneTreeMaterial,
  type PlaneTreeInstancePlacement,
  type PlaneTreeVariant,
} from "./plane-tree-instances";
import type { MapObstacle, MapPolygonPoint } from "./world-math";
import {
  buildPlaneTreePlacements,
  XINHUA_ROAD_TRANSPARENT_CAMERA_OBSTACLES,
} from "./xinhua-road-placement.mjs";
import type { XinhuaAtmosphere } from "./atmosphere-contract";
import landmarkData from "./xinhua-road-landmarks-data.json" with { type: "json" };

type LandmarkPlacement = {
  id: string;
  query: string;
  aliases?: string[];
  name: string;
  address: string;
  model: string;
  cacheVersion?: string;
  position: MapPolygonPoint;
  yaw: number;
  scale: number;
  localBounds: MapObstacle;
  localObstacles?: MapObstacle[];
  start: MapPolygonPoint;
  forward: MapPolygonPoint;
  cameraTargetHeight?: number;
  poi?: boolean;
  labelHeight?: number;
  labelOffset?: MapPolygonPoint;
  positioning?: string;
};

// 160 号使用 OSM way 292250766 的建筑轮廓中心；其余位置由新华路中心线、
// 345 弄入口和门牌递增方向校准。奇数门牌位于北侧，偶数门牌位于南侧。
export const XINHUA_ROAD_LANDMARKS = landmarkData.landmarks as unknown as readonly LandmarkPlacement[];

function transformedFootprint(
  { position, yaw, scale }: LandmarkPlacement,
  localBounds: MapObstacle,
): MapObstacle {
  const [positionX, positionZ] = position;
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  const worldX: number[] = [];
  const worldZ: number[] = [];

  for (const localX of [localBounds.minX, localBounds.maxX]) {
    for (const sourceZ of [localBounds.minZ, localBounds.maxZ]) {
      // GlbModel 会把 Blender 导出的 Z 轴翻转到场景坐标，这里使用完全相同的变换。
      const localZ = -sourceZ;
      worldX.push(positionX + scale * (cosine * localX + sine * localZ));
      worldZ.push(positionZ + scale * (-sine * localX + cosine * localZ));
    }
  }

  const margin = landmarkData.collisionMargin;
  return {
    minX: Math.min(...worldX) - margin,
    maxX: Math.max(...worldX) + margin,
    minZ: Math.min(...worldZ) - margin,
    maxZ: Math.max(...worldZ) + margin,
  };
}

// 所有地标均按真实建筑、墙体、水池或纪念展板拆分碰撞；
// 广场、车道、草坪、庭院铺装和口袋公园路径保持可步行。
export const XINHUA_ROAD_OBSTACLES: MapObstacle[] = XINHUA_ROAD_LANDMARKS.flatMap(
  (landmark) => (landmark.localObstacles ?? [landmark.localBounds]).map(
    (localObstacle) => transformedFootprint(landmark, localObstacle),
  ),
);
const XINHUA_ROAD_MODEL_FOOTPRINTS: MapObstacle[] = XINHUA_ROAD_LANDMARKS.map(
  (landmark) => transformedFootprint(landmark, landmark.localBounds),
);
// 人物仍被建筑阻挡，但第三人称摄像机把街景地标视为透明层。
// 这样人物贴近门面转动视角时，镜头可以短暂穿过建筑，而不会被锁在门前。
export const XINHUA_ROAD_CAMERA_OBSTACLES = XINHUA_ROAD_TRANSPARENT_CAMERA_OBSTACLES as MapObstacle[];
export const XINHUA_ROAD_START_PRESETS = Object.fromEntries(
  XINHUA_ROAD_LANDMARKS.flatMap(({ query, aliases = [], start, forward, cameraTargetHeight }) => (
    [query, ...aliases].map((preset) => [preset, { position: start, forward, cameraTargetHeight }])
  )),
) as Record<string, { position: MapPolygonPoint; forward: MapPolygonPoint; cameraTargetHeight?: number }>;

type TreePlacement = {
  id: string;
  variant: PlaneTreeVariant;
  position: MapPolygonPoint;
  yaw: number;
  scale: [number, number, number];
};

type AutumnLandmarkMaterial = Material & {
  color?: Color;
  emissive?: Color;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
};

export const XINHUA_HERO_PLANE_TREE_ID = "plane-tree-0-12";
export const XINHUA_HERO_PLANE_TREE_MODEL =
  "/models/building-evidence-lab/xinhua-plane-tree-hero.glb?v=3";
const XINHUA_HERO_PLANE_TREE_TARGET = [20.75, 95.57] as const;
// 上海影城和新华两佰是全览中的主识别建筑，首帧直接挂载，不能让地图只剩 POI 标签。
// 其余模型给附近卡片图片保留一个很短的高优先级窗口，再快速分批挂载，避免 35 MB
// 地标资源同时争抢连接，也避免旧版十余秒的空场。
const LANDMARK_IMMEDIATE_MODEL_IDS = new Set(["shanghai-cinema", "film-art-center"]);
const LANDMARK_OVERVIEW_LOAD_DELAY_MS = 320;
const LANDMARK_EXPLORE_LOAD_DELAY_MS = 240;
const LANDMARK_STAGGER_INTERVAL_MS = 180;

export const XINHUA_PLANE_TREE_PLACEMENTS = buildPlaneTreePlacements(
  XINHUA_ROAD_LANDMARKS,
  XINHUA_ROAD_MODEL_FOOTPRINTS,
) as unknown as TreePlacement[];

const XINHUA_PLANE_TREE_INSTANCES: PlaneTreeInstancePlacement[] =
  XINHUA_PLANE_TREE_PLACEMENTS.map((placement) => {
    const [x, z] = placement.position;
    return {
      ...placement,
      position: [x, terrainHeightAt(x, z) + 0.08, z],
    };
  });
function selectHeroPlaneTreePlacement(preferredId: string) {
  const preferred = XINHUA_PLANE_TREE_INSTANCES.find(
    (candidate) => candidate.id === preferredId,
  );
  if (preferred) return preferred;
  if (XINHUA_PLANE_TREE_INSTANCES.length === 0) {
    throw new Error("找不到可安全放置 Hero 梧桐的既有树位");
  }

  const [targetX, targetZ] = XINHUA_HERO_PLANE_TREE_TARGET;
  return XINHUA_PLANE_TREE_INSTANCES.reduce((closest, candidate) => {
    const closestDistance = Math.hypot(
      closest.position[0] - targetX,
      closest.position[2] - targetZ,
    );
    const candidateDistance = Math.hypot(
      candidate.position[0] - targetX,
      candidate.position[2] - targetZ,
    );
    return candidateDistance < closestDistance ? candidate : closest;
  });
}
const XINHUA_HERO_PLANE_TREE_PLACEMENT = selectHeroPlaneTreePlacement(
  XINHUA_HERO_PLANE_TREE_ID,
);
const XINHUA_LIGHTWEIGHT_PLANE_TREE_INSTANCES = XINHUA_PLANE_TREE_INSTANCES.filter(
  (placement) => placement.id !== XINHUA_HERO_PLANE_TREE_PLACEMENT.id,
);

function AutumnPlaneTreeShadows({ atmosphere }: { atmosphere: XinhuaAtmosphere }) {
  const shadowLobes = useMemo(() => {
    const [sunX, , sunZ] = atmosphere.sunOffset;
    const shadowLength = Math.hypot(sunX, sunZ);
    const directionX = -sunX / shadowLength;
    const directionZ = -sunZ / shadowLength;
    const yaw = Math.atan2(directionX, directionZ);
    return XINHUA_PLANE_TREE_INSTANCES.flatMap((tree, treeIndex) => (
      Array.from({ length: 5 }, (_, lobeIndex) => {
        const distance = 1.05 + lobeIndex * 2.05;
        const sideOffset = Math.sin(treeIndex * 1.77 + lobeIndex * 2.13)
          * (0.42 + lobeIndex * 0.16);
        const positionX = tree.position[0] + directionX * distance
          + directionZ * sideOffset;
        const positionZ = tree.position[2] + directionZ * distance
          - directionX * sideOffset;
        return {
          position: [
            positionX,
            autumnShadowSurfaceHeightAt(positionX, positionZ),
            positionZ,
          ] as const,
          yaw,
          scale: [
            1.15 + lobeIndex * 0.34 + treeIndex % 3 * 0.14,
            1.5 + lobeIndex * 0.62,
          ] as const,
        };
      })
    ));
  }, [atmosphere]);
  const mesh = useRef<InstancedMesh>(null);
  const trunks = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!mesh.current || !trunks.current) return;
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const groundQuaternion = new Quaternion();
    const yawQuaternion = new Quaternion();
    const position = new Vector3();
    const scale = new Vector3();
    const up = new Vector3(0, 1, 0);
    const xAxis = new Vector3(1, 0, 0);
    groundQuaternion.setFromAxisAngle(xAxis, -Math.PI / 2);

    shadowLobes.forEach((shadow, index) => {
      position.set(...shadow.position);
      yawQuaternion.setFromAxisAngle(up, shadow.yaw);
      quaternion.multiplyQuaternions(yawQuaternion, groundQuaternion);
      scale.set(shadow.scale[0], shadow.scale[1], 1);
      matrix.compose(position, quaternion, scale);
      mesh.current?.setMatrixAt(index, matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();

    const [sunX, , sunZ] = atmosphere.sunOffset;
    const shadowLength = Math.hypot(sunX, sunZ);
    const directionX = -sunX / shadowLength;
    const directionZ = -sunZ / shadowLength;
    const yaw = Math.atan2(directionX, directionZ);
    XINHUA_PLANE_TREE_INSTANCES.forEach((tree, index) => {
      const positionX = tree.position[0] + directionX * 3.3;
      const positionZ = tree.position[2] + directionZ * 3.3;
      position.set(
        positionX,
        autumnShadowSurfaceHeightAt(positionX, positionZ),
        positionZ,
      );
      yawQuaternion.setFromAxisAngle(up, yaw);
      quaternion.multiplyQuaternions(yawQuaternion, groundQuaternion);
      scale.set(0.2 + index % 3 * 0.035, 6.8, 1);
      matrix.compose(position, quaternion, scale);
      trunks.current?.setMatrixAt(index, matrix);
    });
    trunks.current.instanceMatrix.needsUpdate = true;
    trunks.current.computeBoundingSphere();
  }, [atmosphere, shadowLobes]);

  return (
    <>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, shadowLobes.length]}
        renderOrder={1}
        userData={{
          atmosphere: "storybook-plane-tree-shadows",
          direction: "shared-autumn-sun",
          instanced: true,
        }}
      >
        <circleGeometry args={[1, 12]} />
        <meshBasicMaterial
          color="#1d3540"
          transparent
          opacity={0.22}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </instancedMesh>
      <instancedMesh
        ref={trunks}
        args={[undefined, undefined, XINHUA_PLANE_TREE_INSTANCES.length]}
        renderOrder={1}
        userData={{
          atmosphere: "storybook-plane-tree-trunk-shadows",
          direction: "shared-autumn-sun",
          instanced: true,
        }}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          color="#1a2c33"
          transparent
          opacity={0.24}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </instancedMesh>
    </>
  );
}

function AutumnLeafCarpet() {
  const leaves = useMemo(() => XINHUA_PLANE_TREE_INSTANCES.flatMap((tree, treeIndex) => (
    Array.from({ length: 4 }, (_, leafIndex) => {
      const phase = treeIndex * 1.71 + leafIndex * 2.39;
      const radius = 0.42 + ((treeIndex + leafIndex * 3) % 5) * 0.16;
      return {
        position: [
          tree.position[0] + Math.cos(phase) * radius,
          tree.position[1] + 0.025,
          tree.position[2] + Math.sin(phase) * radius,
        ] as const,
        yaw: phase * 1.83,
        scale: 0.72 + ((treeIndex + leafIndex) % 4) * 0.12,
        color: ["#c59a4e", "#a87339", "#d2ad63", "#7f7544"][
          (treeIndex + leafIndex) % 4
        ],
      };
    })
  )), []);
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const position = new Vector3();
    const scale = new Vector3();
    const up = new Vector3(0, 1, 0);
    leaves.forEach((leaf, index) => {
      position.set(...leaf.position);
      quaternion.setFromAxisAngle(up, leaf.yaw);
      scale.set(leaf.scale, 1, leaf.scale);
      matrix.compose(position, quaternion, scale);
      mesh.current?.setMatrixAt(index, matrix);
      mesh.current?.setColorAt(index, new Color(leaf.color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [leaves]);

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, leaves.length]}
      receiveShadow
      userData={{ vegetation: "xinhua-autumn-leaf-carpet", instanced: true }}
    >
      <boxGeometry args={[0.17, 0.012, 0.075]} />
      <meshStandardMaterial vertexColors roughness={0.98} metalness={0} />
    </instancedMesh>
  );
}

function cloneAutumnLandmarkMaterial(source: Material) {
  const material = source.clone() as AutumnLandmarkMaterial;
  const name = source.name.toLowerCase();
  const color = material.color;
  if (!color) return material;

  if (/灯|光|light|emissive/.test(name)) {
    color.lerp(new Color("#ffc273"), 0.42);
    if (material.emissive) {
      material.emissive.set("#ff9f47");
      material.emissiveIntensity = 1.28;
    }
    if (typeof material.roughness === "number") material.roughness = 0.62;
  } else if (/玻璃|glass/.test(name)) {
    color.lerp(new Color("#405b56"), 0.46);
    if (material.emissive) {
      material.emissive.set("#4a3925");
      material.emissiveIntensity = 0.16;
    }
    if (typeof material.roughness === "number") material.roughness = 0.34;
    if (typeof material.metalness === "number") material.metalness = 0.04;
  } else if (/窗框|深框|铁艺|金属|屋脊|瓦垄|板缝|铺装缝|frame/.test(name)) {
    color.lerp(new Color("#1d3330"), 0.42);
    if (typeof material.roughness === "number") material.roughness = 0.74;
  } else if (/红砖|砖墙|红瓦|屋顶|屋瓦|木|铜|brick|roof|wood/.test(name)) {
    color.lerp(new Color("#87503d"), 0.26);
    if (typeof material.roughness === "number") material.roughness = 0.88;
  } else if (/白|墙|灰泥|石材|浅石|曲面|门楼|象牙|cream|plaster|stone/.test(name)) {
    color.lerp(new Color("#cfbd9b"), 0.32);
    color.multiplyScalar(0.94);
    if (typeof material.roughness === "number") material.roughness = 0.84;
  } else if (/绿植|草坪|绿篱|灌木|garden|hedge|lawn/.test(name)) {
    color.lerp(new Color("#747548"), 0.32);
    if (typeof material.roughness === "number") material.roughness = 0.96;
  } else {
    color.lerp(new Color("#b79d78"), 0.045);
  }

  material.needsUpdate = true;
  return material;
}

function disposeModelMaterials(model: Object3D) {
  const materials = new Set<Material>();
  model.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    childMaterials.forEach((material) => materials.add(material));
  });
  materials.forEach((material) => material.dispose());
}

function configureModel(model: Object3D, autumnTree = false) {
  model.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const cloneMaterial = autumnTree
      ? cloneAutumnPlaneTreeMaterial
      : cloneAutumnLandmarkMaterial;
    child.material = Array.isArray(child.material)
      ? child.material.map(cloneMaterial)
      : cloneMaterial(child.material);
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return model;
}

function GlbModel({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  const model = useMemo(() => configureModel(scene.clone(true)), [scene]);
  useEffect(() => () => disposeModelMaterials(model), [model]);
  return <primitive object={model} scale={[1, 1, -1]} />;
}

function HeroPlaneTree() {
  const { scene } = useGLTF(XINHUA_HERO_PLANE_TREE_MODEL);
  const model = useMemo(() => configureModel(scene.clone(true), true), [scene]);
  useEffect(() => () => disposeModelMaterials(model), [model]);
  const [x, y, z] = XINHUA_HERO_PLANE_TREE_PLACEMENT.position;
  return (
    <group
      name="xinhua-road-hero-plane-tree"
      position={[x, y - PLANE_TREE_GROUND_INSET, z]}
      rotation-y={XINHUA_HERO_PLANE_TREE_PLACEMENT.yaw}
      scale={XINHUA_HERO_PLANE_TREE_PLACEMENT.scale}
      userData={{
        vegetation: "xinhua-plane-tree-hero",
        source: XINHUA_HERO_PLANE_TREE_MODEL,
        replaces: XINHUA_HERO_PLANE_TREE_PLACEMENT.id,
      }}
    >
      <primitive object={model} scale={[1, 1, -1]} />
    </group>
  );
}

export function XinhuaRoadPlaneTrees({
  showHero = false,
  atmosphere,
}: {
  showHero?: boolean;
  atmosphere: XinhuaAtmosphere;
}) {
  const lightweightPlacements = showHero
    ? XINHUA_LIGHTWEIGHT_PLANE_TREE_INSTANCES
    : XINHUA_PLANE_TREE_INSTANCES;
  return (
    <group
      name="xinhua-road-plane-trees"
      userData={{ variants: 3, arrangement: "deterministic-id-hash" }}
    >
      <AutumnPlaneTreeShadows atmosphere={atmosphere} />
      <PlaneTreeInstances
        name="xinhua-road-plane-tree-batches"
        placements={lightweightPlacements}
      />
      <AutumnLeafCarpet />
      {showHero && (
        <Suspense
          fallback={(
            <PlaneTreeInstances
              name="xinhua-road-hero-plane-tree-loading-fallback"
              placements={[XINHUA_HERO_PLANE_TREE_PLACEMENT]}
            />
          )}
        >
          <HeroPlaneTree />
        </Suspense>
      )}
    </group>
  );
}

function landmarkMatchesPreset(landmark: LandmarkPlacement, preset?: string) {
  return Boolean(preset && (
    landmark.id === preset
    || landmark.query === preset
    || landmark.aliases?.includes(preset)
  ));
}

export function XinhuaRoadLandmarks({
  showLabels = true,
  priorityPreset,
  loadMode = "overview",
}: {
  showLabels?: boolean;
  priorityPreset?: string;
  loadMode?: "overview" | "explore";
}) {
  const [mountedModelIds, setMountedModelIds] = useState<ReadonlySet<string>>(
    () => new Set(LANDMARK_IMMEDIATE_MODEL_IDS),
  );

  useEffect(() => {
    const priorityLandmark = XINHUA_ROAD_LANDMARKS.find((landmark) => (
      landmarkMatchesPreset(landmark, priorityPreset)
    ));
    const deferredLandmarks = XINHUA_ROAD_LANDMARKS.filter(
      (landmark) => (
        landmark.id !== priorityLandmark?.id
        && !LANDMARK_IMMEDIATE_MODEL_IDS.has(landmark.id)
      ),
    );
    const initialDelay = loadMode === "explore"
      ? LANDMARK_EXPLORE_LOAD_DELAY_MS
      : LANDMARK_OVERVIEW_LOAD_DELAY_MS;
    const timers = deferredLandmarks.map((landmark, index) => window.setTimeout(() => {
      setMountedModelIds((current) => new Set([...current, landmark.id]));
    }, initialDelay + index * LANDMARK_STAGGER_INTERVAL_MS));

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [loadMode, priorityPreset]);

  return (
    <group name="xinhua-road-photo-reference-landmarks">
      {XINHUA_ROAD_LANDMARKS.map((landmark) => {
        const [x, z] = landmark.position;
        const [labelOffsetX, labelOffsetZ] = landmark.labelOffset ?? [0, 0];
        const y = terrainHeightAt(x, z) + 0.1;
        const modelPath = landmark.cacheVersion
          ? `${landmark.model}?v=${landmark.cacheVersion}`
          : landmark.model;
        const shouldMountModel = mountedModelIds.has(landmark.id)
          || landmarkMatchesPreset(landmark, priorityPreset);
        return (
          <group
            key={landmark.id}
            name={landmark.id}
            userData={{
              landmark: landmark.id,
              address: landmark.address,
              positioning: landmark.positioning,
              modeling: "photo-reference-blender-glb",
            }}
          >
            <group position={[x, y, z]} rotation-y={landmark.yaw} scale={landmark.scale}>
              {shouldMountModel && (
                <Suspense fallback={null}>
                  <GlbModel path={modelPath} />
                </Suspense>
              )}
            </group>
            {showLabels && landmark.poi && (
              <Html
                center
                position={[
                  x + labelOffsetX,
                  y + (landmark.labelHeight ?? 8),
                  z + labelOffsetZ,
                ]}
                style={{ pointerEvents: "none" }}
              >
                <span
                  className="map-road-label map-landmark-label"
                  data-poi={landmark.id}
                  data-poi-address={landmark.address}
                >
                  {landmark.name}
                </span>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
