"use client";

import { Html, RoundedBox, useGLTF } from "@react-three/drei";
import { Component, lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import {
  DoubleSide,
  ExtrudeGeometry,
  InstancedMesh,
  Mesh,
  Object3D,
  Shape,
  ShapeGeometry,
} from "three";
import landmarks from "./xinhua-landmarks-data.json";
import {
  SHANGSHENG_FACILITIES,
  SHANGSHENG_FACILITY_CLEARANCES,
  SHANGSHENG_LOCAL_FACILITY_OBSTACLES,
} from "./shangsheng-facilities";
import { terrainHeightAt } from "./terrain";
import { isPointInsidePolygon, type MapObstacle, type MapPolygonPoint } from "./world-math";
import type { ProgressiveBuildingTier } from "./progressive-loading";
import { ProgressiveFeatureBoundary } from "../progressive-feature-boundary";
import { FacilityPrototypeMassingMapAssets } from "./facility-prototype-massing";
import { SUN_KE_PORTE_COCHERE_COLUMN_OBSTACLES } from "./sun-ke-villa-tier-contract.mjs";

type Building = (typeof landmarks.shangshengXinsuo.buildings)[number];

const SITE = landmarks.shangshengXinsuo;
const ProgressiveSunKeVilla = lazy(async () => {
  const importedModels = await import("./shangsheng-full-models");
  return { default: importedModels.SunKeVillaModel };
});
const ProgressiveSunKeVillaIdentity = lazy(async () => {
  const importedModels = await import("./shangsheng-full-models");
  return { default: importedModels.SunKeVillaIdentityModel };
});
const ProgressiveNavyClub = lazy(async () => {
  const importedModels = await import("./shangsheng-full-models");
  return { default: importedModels.NavyClubModel };
});
export const SHANGSHENG_XINSUO_POSITION = SITE.position as [number, number];
const SITE_POSITION = SHANGSHENG_XINSUO_POSITION;
const SITE_BOUNDARY: MapPolygonPoint[] = SITE.boundary.map(([x, z]) => [x, z]);
const SHANGSHENG_MASSING_PATHS: Readonly<Record<number, string>> = {
  864847856: "/models/tiers/shangsheng-huashan/massing/osm-way-864847856-massing.glb?v=e1faaf0720cb",
  864847877: "/models/tiers/shangsheng-huashan/massing/osm-way-864847877-massing.glb?v=f233f9defd21",
  864847881: "/models/tiers/shangsheng-huashan/massing/osm-way-864847881-massing.glb?v=a25504b8d2d8",
  864847883: "/models/tiers/shangsheng-huashan/massing/osm-way-864847883-massing.glb?v=a9e117c239fd",
  864847892: "/models/tiers/shangsheng-huashan/massing/osm-way-864847892-massing.glb?v=6ccbc8d18fb3",
  1364679201: "/models/tiers/shangsheng-huashan/massing/osm-way-1364679201-massing.glb?v=92c691c02296",
  1364679204: "/models/tiers/shangsheng-huashan/massing/osm-way-1364679204-massing.glb?v=43f406f3db2b",
  1364679205: "/models/tiers/shangsheng-huashan/massing/osm-way-1364679205-massing.glb?v=26c29406ddac",
  1368808689: "/models/tiers/shangsheng-huashan/massing/osm-way-1368808689-massing.glb?v=f0b6944700af",
  1368808690: "/models/tiers/shangsheng-huashan/massing/osm-way-1368808690-massing.glb?v=40566f2abe43",
  1537478450: "/models/tiers/shangsheng-huashan/massing/osm-way-1537478450-massing.glb?v=96b5e87bbaaf",
};
export const SHANGSHENG_DETAIL_UPGRADE = {
  archWindowLayersBefore: 2,
  archWindowLayersAfter: 7,
  countryClubUpperWindowLayersBefore: 1,
  countryClubUpperWindowLayersAfter: 5,
  entranceStructurePartsBefore: 3,
  entranceStructurePartsAfter: 12,
} as const;

function shapeFromBoundary(points: readonly MapPolygonPoint[]) {
  const shape = new Shape();
  points.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  shape.closePath();
  return shape;
}

function localToWorldObstacle(obstacle: MapObstacle): MapObstacle {
  return {
    minX: SITE_POSITION[0] + obstacle.minX,
    maxX: SITE_POSITION[0] + obstacle.maxX,
    minZ: SITE_POSITION[1] + obstacle.minZ,
    maxZ: SITE_POSITION[1] + obstacle.maxZ,
  };
}

function boundaryBounds(boundary: readonly (readonly number[])[]): MapObstacle {
  return boundary.reduce((result, [x, z]) => ({
    minX: Math.min(result.minX, x),
    maxX: Math.max(result.maxX, x),
    minZ: Math.min(result.minZ, z),
    maxZ: Math.max(result.maxZ, z),
  }), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
}

export const SHANGSHENG_BUILDING_FOOTPRINTS: MapObstacle[] = SITE.buildings.flatMap(
  (building) => building.collision.map(localToWorldObstacle),
);

const SHANGSHENG_FIXED_OBSTACLES: MapObstacle[] = [
  ...SHANGSHENG_BUILDING_FOOTPRINTS,
  ...SUN_KE_PORTE_COCHERE_COLUMN_OBSTACLES.map(localToWorldObstacle),
  // 海军俱乐部泳池保留为不可穿越水面，南侧窄廊仍可通行。
  localToWorldObstacle({ minX: -23.05, maxX: -18.25, minZ: -5.7, maxZ: 5.2 }),
  ...SITE.fountains.map((fountain) => localToWorldObstacle(boundaryBounds(fountain.boundary))),
  ...SHANGSHENG_LOCAL_FACILITY_OBSTACLES.map(localToWorldObstacle),
];

export const SHANGSHENG_XINSUO_CAMERA_OBSTACLES: MapObstacle[] = [...SHANGSHENG_FIXED_OBSTACLES];

function SiteGround() {
  const geometry = useMemo(() => {
    const ground = new ShapeGeometry(shapeFromBoundary(SITE_BOUNDARY));
    ground.rotateX(-Math.PI / 2);
    return ground;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[0, 0.08, 0]} receiveShadow>
      <meshToonMaterial color="#aaa28d" side={DoubleSide} />
    </mesh>
  );
}

function FootprintVolume({ building, height }: { building: Building; height: number }) {
  const geometry = useMemo(() => {
    const boundary: MapPolygonPoint[] = building.boundary.map(([x, z]) => [x, z]);
    const volume = new ExtrudeGeometry(shapeFromBoundary(boundary), {
      depth: height,
      bevelEnabled: false,
      curveSegments: 1,
    });
    volume.rotateX(-Math.PI / 2);
    return volume;
  }, [building, height]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[0, 0.1, 0]} castShadow receiveShadow>
      <meshToonMaterial color={building.wall} />
    </mesh>
  );
}

function ArchWindow({ x, y, z, facing = 1, pointed = false }: { x: number; y: number; z: number; facing?: number; pointed?: boolean }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, -0.25, facing * 0.03]}>
        <boxGeometry args={[0.72, 1.25, 0.08]} />
        <meshToonMaterial color="#4d625c" />
      </mesh>
      {pointed ? (
        <mesh position={[0, 0.56, facing * 0.03]} rotation-z={Math.PI / 4}>
          <boxGeometry args={[0.52, 0.52, 0.08]} />
          <meshToonMaterial color="#4d625c" />
        </mesh>
      ) : (
        <mesh position={[0, 0.39, facing * 0.03]} rotation-z={Math.PI}>
          <torusGeometry args={[0.36, 0.08, 8, 20, Math.PI]} />
          <meshToonMaterial color="#4d625c" />
        </mesh>
      )}
      <mesh position={[0, -0.24, facing * 0.082]}>
        <boxGeometry args={[0.55, 1.05, 0.025]} />
        <meshToonMaterial color="#76908a" />
      </mesh>
      <mesh position={[0, -0.24, facing * 0.105]}>
        <boxGeometry args={[0.045, 1.03, 0.025]} />
        <meshBasicMaterial color="#d4cbb9" />
      </mesh>
      <mesh position={[0, -0.24, facing * 0.106]}>
        <boxGeometry args={[0.53, 0.04, 0.025]} />
        <meshBasicMaterial color="#d4cbb9" />
      </mesh>
      <mesh position={[0, -0.93, facing * 0.11]} castShadow>
        <boxGeometry args={[0.9, 0.1, 0.28]} />
        <meshToonMaterial color="#c9bda8" />
      </mesh>
      <mesh position={[0, 0.78, facing * 0.1]} castShadow>
        <boxGeometry args={[0.22, 0.16, 0.18]} />
        <meshToonMaterial color="#d2c4aa" />
      </mesh>
    </group>
  );
}

function TiledRoof({ width, depth, y, color }: { width: number; depth: number; y: number; color: string }) {
  return (
    <mesh position={[0, y, 0]} rotation-y={Math.PI / 4} scale={[width * 0.69, 1, depth * 0.69]} castShadow>
      <coneGeometry args={[1, 1.25, 4]} />
      <meshToonMaterial color={color} />
    </mesh>
  );
}

function CountryClub({ building }: { building: Building }) {
  const height = 6.35;
  const facadeZ = building.depth / 2 + 0.04;
  const arches = 9;
  return (
    <group
      name="shangsheng-country-club"
      position={[building.position[0], 0.1, building.position[1]]}
      rotation-y={building.rotationY}
      userData={{ building: "country-club", osmWayId: building.id }}
    >
      <RoundedBox args={[building.width, height, building.depth]} radius={0.12} smoothness={2} position={[0, height / 2, 0]} castShadow receiveShadow>
        <meshToonMaterial color={building.wall} />
      </RoundedBox>
      {Array.from({ length: arches }, (_, index) => {
        const x = -building.width * 0.42 + index * building.width * 0.84 / (arches - 1);
        return <ArchWindow key={index} x={x} y={1.7} z={facadeZ} />;
      })}
      {Array.from({ length: 7 }, (_, index) => (
        <group key={index} position={[-building.width * 0.38 + index * building.width * 0.76 / 6, 4.5, facadeZ + 0.02]}>
          <mesh>
            <boxGeometry args={[1.05, 0.92, 0.09]} />
            <meshToonMaterial color="#60706a" />
          </mesh>
          <mesh position={[0, 0, 0.06]}>
            <boxGeometry args={[0.82, 0.7, 0.035]} />
            <meshToonMaterial color="#7f9992" />
          </mesh>
          <mesh position={[0, 0, 0.09]}>
            <boxGeometry args={[0.04, 0.68, 0.025]} />
            <meshBasicMaterial color="#d5cab6" />
          </mesh>
          <mesh position={[0, 0, 0.091]}>
            <boxGeometry args={[0.8, 0.035, 0.025]} />
            <meshBasicMaterial color="#d5cab6" />
          </mesh>
          <mesh position={[0, -0.51, 0.08]} castShadow>
            <boxGeometry args={[1.18, 0.09, 0.24]} />
            <meshToonMaterial color="#cdbfa8" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 5.42, facadeZ + 0.08]} castShadow>
        <boxGeometry args={[2.15, 1.08, 0.16]} />
        <meshToonMaterial color="#d0c2aa" />
      </mesh>
      <TiledRoof width={building.width} depth={building.depth} y={height + 0.52} color={building.roof} />
    </group>
  );
}

function SunKeVillaFallback({ building }: { building: Building }) {
  const wall = building.wall;
  const roof = building.roof;
  return (
    <group
      name="shangsheng-sun-ke-villa"
      position={[building.position[0], 0.1, building.position[1]]}
      rotation-y={building.rotationY}
      userData={{
        building: "sun-ke-villa",
        osmWayId: building.id,
        tier: "programmatic-fallback",
        canonicalFront: "local +Z",
      }}
    >
      <RoundedBox
        args={[4.95, 3.68, 4.08]}
        radius={0.08}
        smoothness={2}
        position={[-0.42, 1.84, 0]}
        castShadow
        receiveShadow
      >
        <meshToonMaterial color={wall} />
      </RoundedBox>
      <RoundedBox
        args={[1.82, 2.68, 3.72]}
        radius={0.06}
        smoothness={2}
        position={[-2.92, 1.34, -0.08]}
        castShadow
        receiveShadow
      >
        <meshToonMaterial color="#aa957f" />
      </RoundedBox>
      <mesh position={[2.18, 1.82, -0.58]} castShadow receiveShadow>
        <cylinderGeometry args={[1.23, 1.23, 3.64, 12]} />
        <meshToonMaterial color="#aa957f" />
      </mesh>
      <TiledRoof width={5.18} depth={4.34} y={4.05} color={roof} />
      <group position={[-2.92, 0, -0.08]}>
        <TiledRoof width={2.04} depth={3.92} y={2.9} color={roof} />
      </group>
      <mesh position={[2.18, 3.83, -0.58]} castShadow>
        <coneGeometry args={[1.29, 0.34, 12]} />
        <meshToonMaterial color={roof} />
      </mesh>
      <mesh position={[1.04, 4.39, 0.58]} castShadow>
        <boxGeometry args={[0.45, 1.32, 0.4]} />
        <meshToonMaterial color="#9f8e7a" />
      </mesh>
      {[-1.62, -0.42, 0.78].map((x) => (
        <ArchWindow key={`south-${x}`} x={x} y={1.16} z={2.12} pointed />
      ))}
      {[-1.78, -0.88, 0.02, 0.92].map((x) => (
        <ArchWindow key={`south-upper-${x}`} x={x} y={2.82} z={2.12} />
      ))}
      {[-0.25, 0.48, 1.21].map((x) => (
        <ArchWindow
          key={`north-upper-${x}`}
          x={x}
          y={2.68}
          z={-2.12}
          facing={-1}
          pointed
        />
      ))}
      <ArchWindow x={-1.25} y={1.16} z={-2.13} facing={-1} />

      <group position={[-1.22, 0, -3.36]}>
        <mesh position={[0, 0.1, 0]} receiveShadow>
          <boxGeometry args={[2.56, 0.2, 2.92]} />
          <meshToonMaterial color="#8a6048" />
        </mesh>
        {[-0.88, 0.88].flatMap((x) => (
          [-1.22, 0.88].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 1.08, z]} castShadow>
              <boxGeometry args={[
                Math.abs(z + 1.22) < 0.01 ? 0.4 : 0.32,
                2.16,
                Math.abs(z + 1.22) < 0.01 ? 0.4 : 0.32,
              ]} />
              <meshToonMaterial color={wall} />
            </mesh>
          ))
        ))}
        {[-0.88, 0.88].map((x) => (
          <mesh key={`beam-${x}`} position={[x, 2.2, 0]} castShadow>
            <boxGeometry args={[0.24, 0.24, 2.92]} />
            <meshToonMaterial color={wall} />
          </mesh>
        ))}
        <TiledRoof width={2.74} depth={3.14} y={2.72} color={roof} />
        <mesh position={[0, 2.02, -1.47]} rotation-z={0}>
          <torusGeometry args={[0.88, 0.1, 6, 18, Math.PI]} />
          <meshToonMaterial color="#d1be9e" />
        </mesh>
      </group>
    </group>
  );
}

class SunKeVillaErrorBoundary extends Component<
  { building: Building; children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback
        ?? <SunKeVillaFallback building={this.props.building} />;
    }
    return this.props.children;
  }
}

function GenericCampusBuilding({ building }: { building: Building }) {
  const floorHeight = building.feature === "new-campus" ? 2.35 : 2.05;
  const height = building.floors * floorHeight;
  const glass = building.feature === "new-campus" ? "#668889" : "#6f7771";
  return (
    <group name={`shangsheng-${building.feature}-${building.id}`} userData={{ building: building.feature, osmWayId: building.id }}>
      <FootprintVolume building={building} height={height} />
      <group position={[building.position[0], 0.1, building.position[1]]} rotation-y={building.rotationY}>
        {Array.from({ length: Math.max(2, building.floors) }, (_, floor) => (
          <group key={floor} position={[0, 1.3 + floor * floorHeight, 0]}>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[0, 0, side * (building.depth / 2 + 0.08)]}>
                <boxGeometry args={[building.width * 0.78, 0.72, 0.12]} />
                <meshToonMaterial color={glass} />
              </mesh>
            ))}
          </group>
        ))}
        {building.feature === "industrial" && (
          <>
            {/* 工业改造楼用连续大窗、锯齿屋顶和玻璃入口表达旧厂房骨架。 */}
            {Array.from({ length: Math.max(3, Math.floor(building.width / 2.6)) }, (_, index) => (
              <group key={`industrial-window-${index}`} position={[
                -building.width * 0.42 + index * building.width * 0.84
                  / Math.max(1, Math.floor(building.width / 2.6) - 1),
                height * 0.48,
                building.depth / 2 + 0.13,
              ]}>
                <mesh castShadow>
                  <boxGeometry args={[1.35, Math.max(1.8, height * 0.52), 0.14]} />
                  <meshToonMaterial color="#4e6867" />
                </mesh>
                <mesh position={[0, 0, 0.09]}>
                  <boxGeometry args={[0.08, Math.max(1.75, height * 0.5), 0.04]} />
                  <meshBasicMaterial color="#c5b9a5" />
                </mesh>
              </group>
            ))}
            {Array.from({ length: Math.max(2, Math.round(building.width / 4.4)) }, (_, index) => (
              <mesh
                key={`sawtooth-${index}`}
                position={[
                  -building.width * 0.34 + index * building.width * 0.68
                    / Math.max(1, Math.round(building.width / 4.4) - 1),
                  height + 0.72,
                  0,
                ]}
                rotation-x={Math.PI / 2}
                castShadow
              >
                <cylinderGeometry args={[1.22, 1.22, building.depth * 0.78, 3]} />
                <meshToonMaterial color={building.roof} />
              </mesh>
            ))}
            <group position={[building.width * 0.27, 1.75, building.depth / 2 + 1.05]}>
              <RoundedBox args={[building.width * 0.26, 3.2, 1.9]} radius={0.08} smoothness={2} castShadow>
                <meshToonMaterial color="#587b7c" transparent opacity={0.9} />
              </RoundedBox>
              <mesh position={[0, 1.86, 0.5]} rotation-x={-0.18} castShadow>
                <boxGeometry args={[building.width * 0.34, 0.14, 2.4]} />
                <meshToonMaterial color="#2c3735" />
              </mesh>
            </group>
          </>
        )}
        {building.feature === "new-campus" && (
          <>
            {/* 二期体量增加竖向金属鳍片、悬挑玻璃盒和屋顶花架，弱化单一方盒感。 */}
            {Array.from({ length: Math.max(5, Math.floor(building.width / 2.2)) }, (_, index) => (
              <mesh
                key={`facade-fin-${index}`}
                position={[
                  -building.width * 0.43 + index * building.width * 0.86
                    / Math.max(1, Math.floor(building.width / 2.2) - 1),
                  height * 0.52,
                  building.depth / 2 + 0.2,
                ]}
                rotation-y={(index % 3 - 1) * 0.12}
                castShadow
              >
                <boxGeometry args={[0.12, height * 0.74, 0.48]} />
                <meshToonMaterial color={index % 2 ? "#303c3a" : "#d4cdbf"} />
              </mesh>
            ))}
            <group position={[-building.width * 0.24, height * 0.58, building.depth / 2 + 0.62]}>
              <RoundedBox args={[building.width * 0.32, height * 0.34, 1.28]} radius={0.1} smoothness={2} castShadow>
                <meshToonMaterial color="#72999a" transparent opacity={0.88} />
              </RoundedBox>
              {[-0.32, 0, 0.32].map((ratio) => (
                <mesh key={ratio} position={[building.width * 0.32 * ratio, 0, 0.68]}>
                  <boxGeometry args={[0.07, height * 0.31, 0.06]} />
                  <meshBasicMaterial color="#2e3d3b" />
                </mesh>
              ))}
            </group>
            <group position={[building.width * 0.2, height + 0.58, 0]}>
              {[-1.8, 0, 1.8].map((x) => (
                <mesh key={x} position={[x, 0.55, 0]} castShadow>
                  <boxGeometry args={[0.13, 1.1, building.depth * 0.46]} />
                  <meshToonMaterial color="#454c48" />
                </mesh>
              ))}
              <mesh position={[0, 1.08, 0]} castShadow>
                <boxGeometry args={[4.5, 0.16, building.depth * 0.48]} />
                <meshToonMaterial color="#73644f" />
              </mesh>
            </group>
          </>
        )}
        <mesh position={[0, height + 0.18, 0]} castShadow>
          <boxGeometry args={[building.width * 0.96, 0.32, building.depth * 0.96]} />
          <meshToonMaterial color={building.roof} />
        </mesh>
      </group>
    </group>
  );
}

function ShangshengMassingTierAsset({
  building,
  showDirectionQa = false,
}: {
  building: Building;
  showDirectionQa?: boolean;
}) {
  const path = SHANGSHENG_MASSING_PATHS[building.id];
  const { scene } = useGLTF(path);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    return clone;
  }, [scene]);
  const qaDirection = showDirectionQa && typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("qaModelDirection")
    : undefined;
  const showSouthLabel = showDirectionQa && qaDirection !== "north";
  const showNorthLabel = showDirectionQa && qaDirection === "north";
  return (
    <group
      position={[building.position[0], 0.1, building.position[1]]}
      rotation-y={building.rotationY}
      userData={{
        modelTier: "massing",
        sourceWayId: building.id,
        source: path,
        geometryEvidence: "observed-osm-footprint",
        authoredFootprintAxis: "-BlenderY",
        exportedFootprintAxis: "ThreeZ",
        runtimeScale: [1, 1, 1],
      }}
    >
      <primitive object={model} />
      {showDirectionQa && building.id === 864847877 && (
        <>
          <mesh
            name="test-sun-ke-garden-south-facade-marker"
            position={[0, 0.08, building.depth / 2 + 0.18]}
          >
            <boxGeometry args={[building.width * 0.72, 0.12, 0.16]} />
            <meshBasicMaterial color="#4f9f72" />
          </mesh>
          {showSouthLabel && (
            <Html
              center
              transform
              sprite
              occlude
              position={[0, 3.2, building.depth / 2 + 0.32]}
              distanceFactor={4}
              style={{ pointerEvents: "none" }}
            >
              <span className="map-road-label map-landmark-label">
                花园南立面 · canonical
              </span>
            </Html>
          )}
          <mesh
            name="test-sun-ke-north-entrance-marker"
            position={[0, 0.08, -building.depth / 2 - 0.18]}
          >
            <boxGeometry args={[building.width * 0.48, 0.12, 0.16]} />
            <meshBasicMaterial color="#a76855" />
          </mesh>
          {showNorthLabel && (
            <Html
              center
              transform
              sprite
              occlude
              position={[0, 3.2, -building.depth / 2 - 0.32]}
              distanceFactor={4}
              style={{ pointerEvents: "none" }}
            >
              <span className="map-road-label map-landmark-label">
                北侧入口
              </span>
            </Html>
          )}
        </>
      )}
    </group>
  );
}

function CampusMassingBuildings({ onlyModelId }: { onlyModelId?: string }) {
  return (
    <group
      name="shangsheng-campus-massing"
      userData={{ stage: "massing", qaModelId: onlyModelId }}
    >
      {SITE.buildings.map((building) => {
        if (onlyModelId && onlyModelId !== `osm-way-${building.id}`) {
          return null;
        }
        const floorHeight = building.feature === "new-campus" ? 2.35 : 2.05;
        return (
          <Suspense
            key={building.id}
            fallback={(
              <FootprintVolume
                building={building}
                height={building.floors * floorHeight}
              />
            )}
          >
            <ShangshengMassingTierAsset
              building={building}
              showDirectionQa={Boolean(onlyModelId)}
            />
          </Suspense>
        );
      })}
    </group>
  );
}

function CampusBuildings({
  stage,
  qaModelId,
  sunKeTierQa,
}: {
  stage: ProgressiveBuildingTier;
  qaModelId?: string;
  sunKeTierQa?: ProgressiveBuildingTier;
}) {
  if (stage === "massing" && !sunKeTierQa) {
    return <CampusMassingBuildings onlyModelId={qaModelId} />;
  }
  const loadFullModels = stage === "full";
  return (
    <group>
      {SITE.buildings.map((building) => {
        if (building.feature === "sun-ke-villa") {
          const sunKeTier = sunKeTierQa ?? stage;
          if (sunKeTier === "massing") {
            return (
              <Suspense
                key={building.id}
                fallback={(
                  <FootprintVolume
                    building={building}
                    height={5.05}
                  />
                )}
              >
                <ShangshengMassingTierAsset building={building} />
              </Suspense>
            );
          }
          const identityFallback = <SunKeVillaFallback building={building} />;
          const identity = (
            <SunKeVillaErrorBoundary
              building={building}
              fallback={identityFallback}
            >
              <Suspense fallback={identityFallback}>
                <ProgressiveSunKeVillaIdentity building={building} />
              </Suspense>
            </SunKeVillaErrorBoundary>
          );
          if (sunKeTier === "identity") {
            return <group key={building.id}>{identity}</group>;
          }
          return (
            <SunKeVillaErrorBoundary
              key={building.id}
              building={building}
              fallback={identity}
            >
              <Suspense fallback={identity}>
                <ProgressiveSunKeVilla building={building} />
              </Suspense>
            </SunKeVillaErrorBoundary>
          );
        }
        if (building.feature === "country-club") return <CountryClub key={building.id} building={building} />;
        if (building.feature === "navy-club") {
          if (!loadFullModels) {
            return <GenericCampusBuilding key={building.id} building={building} />;
          }
          return (
            <ProgressiveFeatureBoundary
              key={building.id}
              fallback={<GenericCampusBuilding building={building} />}
            >
              <Suspense fallback={<GenericCampusBuilding building={building} />}>
                <ProgressiveNavyClub building={building} />
              </Suspense>
            </ProgressiveFeatureBoundary>
          );
        }
        return <GenericCampusBuilding key={building.id} building={building} />;
      })}
    </group>
  );
}

const CAMPUS_TREES = Array.from({ length: 90 }, (_, index) => {
  const x = -38 + ((index * 31) % 1030) / 10;
  const z = -69 + ((index * 47) % 1360) / 10;
  return { x, z, index };
}).filter(({ x, z }) => (
  isPointInsidePolygon(x, z, SITE_BOUNDARY)
  && !SITE.buildings.some((building) => building.collision.some((box) => (
    x > box.minX - 1.4 && x < box.maxX + 1.4 && z > box.minZ - 1.4 && z < box.maxZ + 1.4
  )))
  && !(x > -5 && x < 14 && z > 1 && z < 10)
  && !SHANGSHENG_FACILITY_CLEARANCES.some((facility) => (
    Math.hypot(x - facility.x, z - facility.z) < facility.radius
  ))
)).slice(0, 44);

export const SHANGSHENG_XINSUO_OBSTACLES: MapObstacle[] = [
  ...SHANGSHENG_FIXED_OBSTACLES,
  ...CAMPUS_TREES.map(({ x, z }) => localToWorldObstacle({
    minX: x - 0.2,
    maxX: x + 0.2,
    minZ: z - 0.2,
    maxZ: z + 0.2,
  })),
];

function CampusTrees({ detailed }: { detailed: boolean }) {
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    CAMPUS_TREES.forEach(({ x, z, index }, instance) => {
      const height = 7.2 + index % 6 * 0.52;
      dummy.position.set(x, height * 0.42, z);
      dummy.scale.set(0.68, height * 0.82, 0.68);
      dummy.updateMatrix();
      trunks.current?.setMatrixAt(instance, dummy.matrix);
      dummy.position.set(x, height, z);
      dummy.scale.set(2.35 + index % 4 * 0.18, 2.05 + index % 3 * 0.18, 2.35 + index % 4 * 0.18);
      dummy.rotation.y = index * 0.67;
      dummy.updateMatrix();
      crowns.current?.setMatrixAt(instance, dummy.matrix);
    });
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true;
    if (crowns.current) crowns.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group userData={{ vegetation: detailed ? "detailed" : "programmatic-lightweight" }}>
      <instancedMesh
        ref={trunks}
        args={[undefined, undefined, CAMPUS_TREES.length]}
        castShadow={detailed}
      >
        <cylinderGeometry args={[0.12, 0.18, 1, 7]} />
        <meshToonMaterial color="#655446" />
      </instancedMesh>
      <instancedMesh
        ref={crowns}
        args={[undefined, undefined, CAMPUS_TREES.length]}
        castShadow={detailed}
      >
        <icosahedronGeometry args={[1, detailed ? 1 : 0]} />
        <meshToonMaterial color="#426c49" />
      </instancedMesh>
    </group>
  );
}

function WayfindingTotem({ x, z, yaw = 0 }: { x: number; z: number; yaw?: number }) {
  return (
    <group name="shangsheng-wayfinding" position={[x, 0.18, z]} rotation-y={yaw} userData={{ facility: "wayfinding" }}>
      <mesh position={[0, 1.75, 0]} castShadow>
        <cylinderGeometry args={[0.48, 0.62, 3.5, 6]} />
        <meshToonMaterial color="#252d2b" />
      </mesh>
      {[0.92, 1.55, 2.18].map((y, index) => (
        <group key={y} position={[index % 2 ? -0.62 : 0.62, y, 0]} rotation-y={index % 2 ? Math.PI : 0}>
          <mesh castShadow>
            <coneGeometry args={[0.34, 1.22, 3]} />
            <meshToonMaterial color={["#d4aa52", "#d6cfbd", "#6f9a91"][index]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CafePavilion() {
  return (
    <group
      name="shangsheng-cafe-pavilion"
      position={[SHANGSHENG_FACILITIES.cafe[0], 0.2, SHANGSHENG_FACILITIES.cafe[1]]}
      userData={{ facility: "cafe-pavilion" }}
    >
      <mesh position={[0, 2.72, 0]} rotation-y={Math.PI / 6} castShadow>
        <cylinderGeometry args={[3.4, 3.4, 0.3, 6]} />
        <meshToonMaterial color="#313a37" />
      </mesh>
      {Array.from({ length: 6 }, (_, index) => {
        const angle = index / 6 * Math.PI * 2;
        return (
          <mesh key={index} position={[Math.cos(angle) * 2.65, 1.35, Math.sin(angle) * 2.65]} castShadow>
            <cylinderGeometry args={[0.08, 0.11, 2.7, 7]} />
            <meshToonMaterial color="#37423e" />
          </mesh>
        );
      })}
      <group position={[0, 0.56, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[1.45, 1.62, 1.12, 8]} />
          <meshToonMaterial color="#b49b78" />
        </mesh>
        <mesh position={[0, 0.2, 1.45]}>
          <boxGeometry args={[1.5, 0.5, 0.08]} />
          <meshToonMaterial color="#567a78" />
        </mesh>
      </group>
      {[-4.2, 4.2].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.72, 0]} castShadow>
            <cylinderGeometry args={[0.58, 0.58, 0.12, 12]} />
            <meshToonMaterial color="#8e674b" />
          </mesh>
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.09, 0.7, 7]} />
            <meshToonMaterial color="#34413d" />
          </mesh>
          {[-1, 1].map((z) => (
            <mesh key={z} position={[0, 0.42, z]} castShadow>
              <cylinderGeometry args={[0.42, 0.34, 0.54, 6]} />
              <meshToonMaterial color="#52635c" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function BicycleParking() {
  return (
    <group
      name="shangsheng-bicycle-parking"
      position={[
        SHANGSHENG_FACILITIES.bicycleParking[0],
        0.2,
        SHANGSHENG_FACILITIES.bicycleParking[1],
      ]}
      rotation-y={0.15}
      userData={{ facility: "bicycle-parking" }}
    >
      {Array.from({ length: 7 }, (_, index) => (
        <group key={index} position={[(index - 3) * 0.78, 0, 0]}>
          <mesh position={[0, 0.52, 0]} rotation-y={Math.PI / 2}>
            <torusGeometry args={[0.52, 0.055, 7, 18, Math.PI]} />
            <meshToonMaterial color="#2e3b38" />
          </mesh>
          {index % 2 === 0 && (
            <>
              {[-0.36, 0.36].map((x) => (
                <mesh key={x} position={[x, 0.4, 0.28]} rotation-y={Math.PI / 2}>
                  <torusGeometry args={[0.32, 0.045, 7, 18]} />
                  <meshToonMaterial color="#667c73" />
                </mesh>
              ))}
              <mesh position={[0, 0.62, 0.28]} rotation-z={-0.42}>
                <cylinderGeometry args={[0.035, 0.035, 0.88, 7]} />
                <meshToonMaterial color="#9b684d" />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
}

function ReadingTerrace() {
  return (
    <group
      name="shangsheng-reading-terrace"
      position={[
        SHANGSHENG_FACILITIES.readingTerrace[0],
        0.2,
        SHANGSHENG_FACILITIES.readingTerrace[1],
      ]}
      userData={{ facility: "outdoor-reading" }}
    >
      <mesh position={[0, 0.05, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[2.7, 4.8, 8]} />
        <meshToonMaterial color="#968f7e" />
      </mesh>
      {Array.from({ length: 8 }, (_, index) => {
        const angle = index / 8 * Math.PI * 2;
        return (
          <group key={index} position={[Math.cos(angle) * 3.65, 0, Math.sin(angle) * 3.65]} rotation-y={-angle}>
            <mesh position={[0, 0.48, 0]} castShadow>
              <boxGeometry args={[1.45, 0.14, 0.46]} />
              <meshToonMaterial color="#936848" />
            </mesh>
            <mesh position={[0, 0.92, -0.18]} rotation-x={-0.24} castShadow>
              <boxGeometry args={[1.38, 0.65, 0.12]} />
              <meshToonMaterial color="#a97853" />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 0.86, 0]} rotation-y={Math.PI / 8} castShadow>
        <cylinderGeometry args={[1.2, 1.42, 1.72, 8]} />
        <meshToonMaterial color="#495a54" />
      </mesh>
      <mesh position={[0, 1.78, 0]} rotation-x={-0.16} castShadow>
        <boxGeometry args={[1.85, 0.12, 1.24]} />
        <meshToonMaterial color="#d6c6a4" />
      </mesh>
    </group>
  );
}

function CampusLandscape({
  detailed,
  facilityMassingMapQaId,
}: {
  detailed: boolean;
  facilityMassingMapQaId?: string;
}) {
  return (
    <group>
      {SITE.fountains.map((fountain) => {
        if (
          facilityMassingMapQaId
          === `shangsheng-fountain-osm-${fountain.id}`
        ) {
          return null;
        }
        const bounds = boundaryBounds(fountain.boundary);
        return (
          <group key={fountain.id} position={[(bounds.minX + bounds.maxX) / 2, 0.18, (bounds.minZ + bounds.maxZ) / 2]}>
            <mesh receiveShadow>
              <boxGeometry args={[bounds.maxX - bounds.minX, 0.14, bounds.maxZ - bounds.minZ]} />
              <meshToonMaterial color="#6eaaa3" />
            </mesh>
            {detailed && (
              <mesh position={[0, 0.35, 0]}>
                <cylinderGeometry args={[0.06, 0.09, 0.7, 8]} />
                <meshToonMaterial color="#d8e4d6" />
              </mesh>
            )}
          </group>
        );
      })}
      {facilityMassingMapQaId !== "shangsheng-main-entry" && (
      <group name="shangsheng-main-entry" position={[58, 0.18, -14]} userData={{ landscape: "columbia-circle-entry" }}>
        <mesh position={[0, 1.75, 0]} castShadow>
          <boxGeometry args={[8.4, 0.38, 3.2]} />
          <meshToonMaterial color="#202724" />
        </mesh>
        {[-3.8, 3.8].map((x) => (
          <mesh key={x} position={[x, 0.88, 0]} castShadow>
            <boxGeometry args={[0.28, 1.76, 3.2]} />
            <meshToonMaterial color="#1f2926" />
          </mesh>
        ))}
        <mesh position={[0, 2.04, 0]} castShadow>
          <boxGeometry args={[8.72, 0.18, 3.48]} />
          <meshToonMaterial color="#303936" />
        </mesh>
        {[-2.55, 0, 2.55].map((x) => (
          <mesh key={x} position={[x, 1.03, 0]} rotation-z={x === 0 ? 0 : Math.sign(x) * 0.4} castShadow>
            <boxGeometry args={[0.16, 1.74, 3.1]} />
            <meshToonMaterial color="#39423e" />
          </mesh>
        ))}
        {detailed && [-3.5, -1.2, 1.2, 3.5].map((x) => (
          <group key={x} position={[x, 1.62, 1.55]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.11, 0.15, 0.24, 10]} />
              <meshToonMaterial color="#b28a50" />
            </mesh>
            <mesh position={[0, -0.18, 0]}>
              <sphereGeometry args={[0.1, 10, 8]} />
              <meshBasicMaterial color="#f0ca78" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.12, 1.48]} receiveShadow>
          <boxGeometry args={[8.15, 0.08, 0.34]} />
          <meshToonMaterial color="#8d806b" />
        </mesh>
        <Html center transform sprite position={[0, 1.78, 1.72]} distanceFactor={18} style={{ pointerEvents: "none" }}>
          <span className="map-road-label map-landmark-label map-landmark-label-dark">上生·新所</span>
        </Html>
      </group>
      )}
      {detailed && (
        <>
          {[[8, 5], [13, 6.5], [-9, -14], [34, 8]].map(([x, z], index) => (
            <group key={`${x}-${z}`} position={[x, 0.25, z]} rotation-y={index * 0.63}>
              <mesh position={[0, 0.4, 0]} castShadow>
                <boxGeometry args={[2.2, 0.14, 0.62]} />
                <meshToonMaterial color="#8b6549" />
              </mesh>
              <mesh position={[0, 0.04, 0]} receiveShadow>
                <cylinderGeometry args={[1.15, 1.15, 0.08, 20]} />
                <meshToonMaterial color="#8f8978" />
              </mesh>
            </group>
          ))}
          {facilityMassingMapQaId !== "shangsheng-cafe-pavilion"
            && <CafePavilion />}
          {facilityMassingMapQaId !== "shangsheng-bicycle-parking"
            && <BicycleParking />}
          {facilityMassingMapQaId !== "shangsheng-reading-terrace"
            && <ReadingTerrace />}
          {facilityMassingMapQaId !== "shangsheng-wayfinding-totem"
            && SHANGSHENG_FACILITIES.wayfinding.map(([x, z, yaw]) => (
            <WayfindingTotem key={`${x}-${z}`} x={x} z={z} yaw={yaw} />
          ))}
        </>
      )}
      {facilityMassingMapQaId?.startsWith("shangsheng-") && (
        <FacilityPrototypeMassingMapAssets
          site="shangsheng"
          onlyAssetId={facilityMassingMapQaId}
        />
      )}
      <CampusTrees detailed={detailed} />
    </group>
  );
}

export function ShangshengXinsuoBlock({
  showEnvironmentDetails,
  stage = "full",
  qaModelId,
  sunKeTierQa,
  facilityMassingMapQaId,
}: {
  showEnvironmentDetails?: boolean;
  stage?: ProgressiveBuildingTier;
  qaModelId?: string;
  sunKeTierQa?: ProgressiveBuildingTier;
  facilityMassingMapQaId?: string;
}) {
  const identityReady = stage === "identity" || stage === "full";
  const environmentDetailed = showEnvironmentDetails ?? stage === "full";
  return (
    <group
      name="shangsheng-xinsuo"
      position={[
        SITE_POSITION[0],
        terrainHeightAt(SITE_POSITION[0], SITE_POSITION[1]) + 0.16,
        SITE_POSITION[1],
      ]}
      userData={{
        landmark: "shangsheng-xinsuo",
        osmWayId: 765939973,
        stage,
        progressive: true,
      }}
    >
      <SiteGround />
      <CampusBuildings
        stage={stage}
        qaModelId={qaModelId}
        sunKeTierQa={sunKeTierQa}
      />
      {identityReady && (
        <CampusLandscape
          detailed={environmentDetailed}
          facilityMassingMapQaId={facilityMassingMapQaId}
        />
      )}
      {identityReady && (
        <Html center transform sprite position={[5, 12, -5]} distanceFactor={38} style={{ pointerEvents: "none" }}>
          <span className="map-road-label map-landmark-label">上生·新所</span>
        </Html>
      )}
    </group>
  );
}

export function shangshengMassingQaFrame(modelId: string) {
  const wayId = Number(modelId.replace("osm-way-", ""));
  const building = SITE.buildings.find(({ id }) => id === wayId);
  if (!building) return null;
  const xs = building.boundary.map(([x]) => x);
  const zs = building.boundary.map(([, z]) => z);
  const centerLocalX = (Math.min(...xs) + Math.max(...xs)) * 0.5;
  const centerLocalZ = (Math.min(...zs) + Math.max(...zs)) * 0.5;
  return {
    wayId,
    worldPosition: [
      SITE_POSITION[0] + centerLocalX,
      SITE_POSITION[1] + centerLocalZ,
    ] as const,
    width: building.width,
    depth: building.depth,
    height: wayId === 864847877
      ? 5.05
      : wayId === 864847892
        ? 1.4444
        : 3.8889,
    yaw: building.rotationY,
  };
}
