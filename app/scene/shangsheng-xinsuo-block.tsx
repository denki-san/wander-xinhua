"use client";

import { Html, RoundedBox } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  DoubleSide,
  ExtrudeGeometry,
  InstancedMesh,
  Object3D,
  Shape,
  ShapeGeometry,
} from "three";
import landmarks from "./xinhua-landmarks-data.json";
import { isPointInsidePolygon, type MapObstacle, type MapPolygonPoint } from "./world-math";

type Building = (typeof landmarks.shangshengXinsuo.buildings)[number];

const SITE = landmarks.shangshengXinsuo;
export const SHANGSHENG_XINSUO_POSITION = SITE.position as [number, number];
const SITE_POSITION = SHANGSHENG_XINSUO_POSITION;
const SITE_BOUNDARY: MapPolygonPoint[] = SITE.boundary.map(([x, z]) => [x, z]);

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

const SHANGSHENG_FIXED_OBSTACLES: MapObstacle[] = [
  ...SITE.buildings.flatMap((building) => building.collision.map(localToWorldObstacle)),
  // 海军俱乐部泳池保留为不可穿越水面，南侧窄廊仍可通行。
  localToWorldObstacle({ minX: -23.05, maxX: -18.25, minZ: -5.7, maxZ: 5.2 }),
  ...SITE.fountains.map((fountain) => localToWorldObstacle(boundaryBounds(fountain.boundary))),
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
        <mesh key={index} position={[-building.width * 0.38 + index * building.width * 0.76 / 6, 4.5, facadeZ + 0.02]}>
          <boxGeometry args={[1.05, 0.92, 0.09]} />
          <meshToonMaterial color="#60706a" />
        </mesh>
      ))}
      <mesh position={[0, 5.42, facadeZ + 0.08]} castShadow>
        <boxGeometry args={[2.15, 1.08, 0.16]} />
        <meshToonMaterial color="#d0c2aa" />
      </mesh>
      <TiledRoof width={building.width} depth={building.depth} y={height + 0.52} color={building.roof} />
    </group>
  );
}

function SunKeVilla({ building }: { building: Building }) {
  const height = 7.45;
  const frontZ = building.depth / 2 + 0.12;
  return (
    <group
      name="shangsheng-sun-ke-villa"
      position={[building.position[0], 0.1, building.position[1]]}
      rotation-y={building.rotationY}
      userData={{ building: "sun-ke-villa", osmWayId: building.id }}
    >
      <RoundedBox args={[building.width * 0.74, height, building.depth]} radius={0.16} smoothness={2} position={[-building.width * 0.08, height / 2, 0]} castShadow receiveShadow>
        <meshToonMaterial color={building.wall} />
      </RoundedBox>
      <mesh position={[building.width * 0.37, height * 0.45, 0]} castShadow>
        <cylinderGeometry args={[building.depth * 0.42, building.depth * 0.46, height * 0.9, 12]} />
        <meshToonMaterial color="#aa957f" />
      </mesh>
      <mesh position={[building.width * 0.37, height * 0.94, 0]} castShadow>
        <coneGeometry args={[building.depth * 0.48, 1.55, 12]} />
        <meshToonMaterial color={building.roof} />
      </mesh>
      {[-1.35, 0, 1.35].map((x) => (
        <ArchWindow key={x} x={x - building.width * 0.14} y={1.75} z={frontZ} pointed />
      ))}
      {[-1.9, -0.65, 0.65, 1.9].map((x) => (
        <ArchWindow key={x} x={x - building.width * 0.14} y={4.55} z={frontZ} />
      ))}
      <TiledRoof width={building.width * 0.72} depth={building.depth} y={height + 0.28} color={building.roof} />
      <mesh position={[-building.width * 0.05, 0.16, frontZ + 2.1]} receiveShadow>
        <boxGeometry args={[building.width * 1.08, 0.14, 3.4]} />
        <meshToonMaterial color="#7e684f" />
      </mesh>
      {Array.from({ length: 22 }, (_, index) => {
        const side = index < 11 ? -1 : 1;
        return (
          <mesh key={index} position={[(index % 11 - 5) * 0.72, 0.48, frontZ + 3.5 + side * 1.35]} castShadow>
            <icosahedronGeometry args={[0.4 + index % 3 * 0.06, 1]} />
            <meshToonMaterial color={index % 3 ? "#4e7049" : "#d2c27e"} />
          </mesh>
        );
      })}
    </group>
  );
}

function PoolArcade({ x, z, side, level }: { x: number; z: number; side: number; level: number }) {
  return (
    <group position={[x, 0.1 + level * 2.65, z]} rotation-y={side > 0 ? -Math.PI / 2 : Math.PI / 2}>
      {[-0.58, 0.58].map((column) => (
        <mesh key={column} position={[column, 1.25, 0]} castShadow>
          <boxGeometry args={[0.14, 2.5, 0.18]} />
          <meshToonMaterial color="#efe9dc" />
        </mesh>
      ))}
      <mesh position={[0, 2.14, 0]} rotation-z={Math.PI}>
        <torusGeometry args={[0.58, 0.12, 8, 20, Math.PI]} />
        <meshToonMaterial color="#efe9dc" />
      </mesh>
    </group>
  );
}

function NavyClub({ building }: { building: Building }) {
  const height = 5.7;
  const pool = { minX: -22.9, maxX: -18.4, minZ: -5.6, maxZ: 5.05 };
  const centerX = (pool.minX + pool.maxX) / 2;
  const centerZ = (pool.minZ + pool.maxZ) / 2;
  return (
    <group name="shangsheng-navy-club-and-pool" userData={{ building: "navy-club-and-pool", osmWayId: building.id }}>
      <FootprintVolume building={building} height={height} />
      <mesh position={[centerX, 0.22, centerZ]} receiveShadow>
        <boxGeometry args={[pool.maxX - pool.minX, 0.18, pool.maxZ - pool.minZ]} />
        <meshToonMaterial color="#69c0bc" />
      </mesh>
      <mesh position={[centerX, 0.31, centerZ]}>
        <boxGeometry args={[pool.maxX - pool.minX - 0.45, 0.035, 0.055]} />
        <meshBasicMaterial color="#e9e2bf" />
      </mesh>
      {Array.from({ length: 7 }, (_, index) => {
        const z = pool.minZ + 0.75 + index * (pool.maxZ - pool.minZ - 1.5) / 6;
        return [0, 1].flatMap((level) => [
          <PoolArcade key={`left-${level}-${index}`} x={pool.minX - 0.25} z={z} side={1} level={level} />,
          <PoolArcade key={`right-${level}-${index}`} x={pool.maxX + 0.25} z={z} side={-1} level={level} />,
        ]);
      })}
      {building.collision.map((wing, index) => (
        <mesh
          key={`navy-roof-${index}`}
          position={[(wing.minX + wing.maxX) / 2, height + 0.26, (wing.minZ + wing.maxZ) / 2]}
          castShadow
        >
          <boxGeometry args={[wing.maxX - wing.minX - 0.18, 0.34, wing.maxZ - wing.minZ - 0.18]} />
          <meshToonMaterial color={building.roof} />
        </mesh>
      ))}
    </group>
  );
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
        <mesh position={[0, height + 0.18, 0]} castShadow>
          <boxGeometry args={[building.width * 0.96, 0.32, building.depth * 0.96]} />
          <meshToonMaterial color={building.roof} />
        </mesh>
      </group>
    </group>
  );
}

function CampusBuildings() {
  return (
    <group>
      {SITE.buildings.map((building) => {
        if (building.feature === "sun-ke-villa") return <SunKeVilla key={building.id} building={building} />;
        if (building.feature === "country-club") return <CountryClub key={building.id} building={building} />;
        if (building.feature === "navy-club") return <NavyClub key={building.id} building={building} />;
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

function CampusTrees() {
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
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, CAMPUS_TREES.length]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1, 7]} />
        <meshToonMaterial color="#655446" />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, CAMPUS_TREES.length]} castShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshToonMaterial color="#426c49" />
      </instancedMesh>
    </group>
  );
}

function CampusLandscape() {
  return (
    <group>
      {SITE.fountains.map((fountain) => {
        const bounds = boundaryBounds(fountain.boundary);
        return (
          <group key={fountain.id} position={[(bounds.minX + bounds.maxX) / 2, 0.18, (bounds.minZ + bounds.maxZ) / 2]}>
            <mesh receiveShadow>
              <boxGeometry args={[bounds.maxX - bounds.minX, 0.14, bounds.maxZ - bounds.minZ]} />
              <meshToonMaterial color="#6eaaa3" />
            </mesh>
            <mesh position={[0, 0.35, 0]}>
              <cylinderGeometry args={[0.06, 0.09, 0.7, 8]} />
              <meshToonMaterial color="#d8e4d6" />
            </mesh>
          </group>
        );
      })}
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
        <Html center transform sprite position={[0, 1.78, 1.72]} distanceFactor={18} style={{ pointerEvents: "none" }}>
          <span className="map-road-label map-landmark-label map-landmark-label-dark">上生·新所</span>
        </Html>
      </group>
      {[[8, 5], [13, 6.5], [-9, -14], [34, 8], [-30, 20]].map(([x, z], index) => (
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
      <CampusTrees />
    </group>
  );
}

export function ShangshengXinsuoBlock() {
  return (
    <group
      name="shangsheng-xinsuo"
      position={[SITE_POSITION[0], 0.16, SITE_POSITION[1]]}
      userData={{ landmark: "shangsheng-xinsuo", osmWayId: 765939973 }}
    >
      <SiteGround />
      <CampusBuildings />
      <CampusLandscape />
      <Html center transform sprite position={[5, 12, -5]} distanceFactor={38} style={{ pointerEvents: "none" }}>
        <span className="map-road-label map-landmark-label">上生·新所</span>
      </Html>
    </group>
  );
}
