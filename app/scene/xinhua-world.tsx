"use client";

import {
  Float,
  Html,
  RoundedBox,
  useAnimations,
  useGLTF,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  Group,
  Matrix4,
  MathUtils,
  Object3D,
  Quaternion,
  type PerspectiveCamera,
  Vector3,
} from "three";
import {
  Suspense,
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { inputState, resetInput } from "./input";
import {
  MAP_POIS,
  nearestMapPoi,
  OVERVIEW_POI_LABEL_OFFSETS,
} from "./poi-data";
import {
  HuashanGreenBlock,
  HUASHAN_GREEN_CAMERA_OBSTACLES,
  HUASHAN_GREEN_OBSTACLES,
  HUASHAN_GREEN_POSITION,
} from "./huashan-green-block";
import {
  ShangshengXinsuoBlock,
  SHANGSHENG_XINSUO_CAMERA_OBSTACLES,
  SHANGSHENG_XINSUO_OBSTACLES,
  SHANGSHENG_XINSUO_POSITION,
} from "./shangsheng-xinsuo-block";
import { XingfuliBlock, XINGFULI_OBSTACLES } from "./xingfuli-block";
import {
  XinhuaRoadLandmarks,
  XinhuaRoadPlaneTrees,
  XINHUA_ROAD_CAMERA_OBSTACLES,
  XINHUA_ROAD_OBSTACLES,
  XINHUA_ROAD_START_PRESETS,
} from "./xinhua-road-landmarks";
import {
  XINGFULI_PLACEMENT,
  XINHUA_BOUNDARY,
  XINHUA_BOUNDS,
  XinhuaStreetMap,
} from "./xinhua-map";
import { terrainHeightAt } from "./terrain";
import {
  composeCameraOffset,
  dampingFactor,
  dampTangentTowards,
  isPlanarCameraCandidateClearInPolygon,
  type MapObstacle,
  type MapPolygonPoint,
  resolvePolygonMovement,
  screenInputToPlanarMove,
  transformMapObstacle,
  transformMapPoint,
} from "./world-math";

const WORLD_UP = new Vector3(0, 1, 0);
const INTRO_CAMERA_DIRECTION = new Vector3(126, 142, 138).normalize();
const OVERVIEW_CAMERA_DIRECTION = new Vector3(1, 1.18, 1).normalize();
const INTRO_MAP_RADIUS = Math.hypot(
  (XINHUA_BOUNDS.maxX - XINHUA_BOUNDS.minX) / 2,
  (XINHUA_BOUNDS.maxZ - XINHUA_BOUNDS.minZ) / 2,
) * 1.08;
const CAMERA_DISTANCE = 6.4;
const CAMERA_HEIGHT = 2.65;
const CAMERA_TARGET_HEIGHT = 1.65;
const CAMERA_SHOULDER_OFFSET = 0.62;
const CAMERA_TARGET_SHOULDER_OFFSET = 0.18;
const CAMERA_FOLLOW_DAMPING = 3.2;
const CAMERA_ORBIT_DAMPING = 18;
const CAMERA_POSITION_DAMPING = 10;
const CAMERA_ROTATION_SPEED_X = 0.005;
const CAMERA_ROTATION_SPEED_Y = 0.004;
const CHARACTER_TURN_DAMPING = 9;
const CHARACTER_MODEL_PATH = "/models/character/urban-messenger.glb";
const CHARACTER_HIDDEN_NODES = new Set([
  "Knife_Offhand",
  "1H_Crossbow",
  "2H_Crossbow",
  "Knife",
  "Throwable",
  "Rogue_Cape",
]);
const CHARACTER_MAX_TURN_SPEED = 8;
const CAMERA_FALLBACK_HEIGHT = 2.45;
const CAMERA_FALLBACK_YAWS = [
  Math.PI / 4,
  -Math.PI / 4,
  Math.PI / 2,
  -Math.PI / 2,
  Math.PI,
];
const CAMERA_FALLBACK_RADII = [3.8, 3.0, 2.2, 1.45, 0.82, 0.42];
const CAMERA_DEFAULT_PITCH = CAMERA_HEIGHT / Math.hypot(CAMERA_DISTANCE, CAMERA_HEIGHT);
const PLAYER_RADIUS = 0.48;
export const DETAIL_WORLD_SCALE = 1.65;
const OVERVIEW_CHARACTER_SCALE = 22;
const OVERVIEW_MOVE_SPEED = 108;
const OVERVIEW_POI_DISTANCE = 42;
const OVERVIEW_CAMERA_FILL = 0.24;
const BASE_XINGFULI_VERTICAL_SCALE = 0.3;
const XINGFULI_SURFACE_LOCAL_Y = 0.26;
const XINGFULI_OSM_POSITION: MapPolygonPoint = [
  XINGFULI_PLACEMENT.position[0],
  XINGFULI_PLACEMENT.position[1],
];
// OSM 步行中心线的番禺路端落在路口中心。模型需退到道路边缘，不能把铺装和建筑压到机动车道。
export const XINGFULI_FANYU_CLEARANCE = 4.1;
const XINGFULI_MODEL_LENGTH = 94;
export const XINGFULI_LONGITUDINAL_SCALE = XINGFULI_PLACEMENT.horizontalScale
  - XINGFULI_FANYU_CLEARANCE / XINGFULI_MODEL_LENGTH;
const XINGFULI_AXIS_X: MapPolygonPoint = [
  Math.cos(XINGFULI_PLACEMENT.rotationY),
  -Math.sin(XINGFULI_PLACEMENT.rotationY),
];
const XINGFULI_POSITION: MapPolygonPoint = [
  XINGFULI_OSM_POSITION[0] - XINGFULI_AXIS_X[0] * XINGFULI_FANYU_CLEARANCE / 2,
  XINGFULI_OSM_POSITION[1] - XINGFULI_AXIS_X[1] * XINGFULI_FANYU_CLEARANCE / 2,
];
const XINGFULI_BASE_Y = terrainHeightAt(XINGFULI_POSITION[0], XINGFULI_POSITION[1]) + 0.18
  + (BASE_XINGFULI_VERTICAL_SCALE - XINGFULI_PLACEMENT.verticalScale) * XINGFULI_SURFACE_LOCAL_Y;
const SHADOW_CENTER = new Vector3(
  (XINGFULI_POSITION[0] + HUASHAN_GREEN_POSITION[0] + SHANGSHENG_XINSUO_POSITION[0]) / 3,
  0,
  (XINGFULI_POSITION[1] + HUASHAN_GREEN_POSITION[1] + SHANGSHENG_XINSUO_POSITION[1]) / 3,
);

function xingfuliLocalToWorld(x: number, z: number) {
  return transformMapPoint(
    x,
    z,
    XINGFULI_POSITION,
    XINGFULI_PLACEMENT.rotationY,
    XINGFULI_PLACEMENT.horizontalScale,
    XINGFULI_PLACEMENT.localLaneCenterZ,
    XINGFULI_LONGITUDINAL_SCALE,
  );
}

const [actionX, actionZ] = xingfuliLocalToWorld(-48, XINGFULI_PLACEMENT.localLaneCenterZ);
const [startX, startZ] = xingfuliLocalToWorld(-65, XINGFULI_PLACEMENT.localLaneCenterZ);
const [heroStartX, heroStartZ] = xingfuliLocalToWorld(-39.5, XINGFULI_PLACEMENT.localLaneCenterZ);
const ACTION_POSITION = new Vector3(actionX, terrainHeightAt(actionX, actionZ) + 0.34, actionZ);
const START_POSITION = new Vector3(startX, terrainHeightAt(startX, startZ) + 0.33, startZ);
const HERO_START_POSITION = new Vector3(
  heroStartX,
  terrainHeightAt(heroStartX, heroStartZ) + 0.33,
  heroStartZ,
);
const START_FORWARD = new Vector3(
  Math.cos(XINGFULI_PLACEMENT.rotationY),
  0,
  -Math.sin(XINGFULI_PLACEMENT.rotationY),
).normalize();
function groundedPosition(x: number, z: number) {
  return new Vector3(x, terrainHeightAt(x, z) + 0.33, z);
}

const HUASHAN_START_POSITION = groundedPosition(
  HUASHAN_GREEN_POSITION[0] + 3.2228,
  HUASHAN_GREEN_POSITION[1] + 30.9915,
);
const HUASHAN_COURT_START_POSITION = groundedPosition(
  HUASHAN_GREEN_POSITION[0] + 4,
  HUASHAN_GREEN_POSITION[1] + 33,
);
const HUASHAN_BRIDGE_START_POSITION = groundedPosition(
  HUASHAN_GREEN_POSITION[0] - 16.4,
  HUASHAN_GREEN_POSITION[1] + 40.4,
);
const SHANGSHENG_START_POSITION = groundedPosition(
  SHANGSHENG_XINSUO_POSITION[0] + 25,
  SHANGSHENG_XINSUO_POSITION[1] + 15,
);
const SHANGSHENG_POOL_START_POSITION = groundedPosition(
  SHANGSHENG_XINSUO_POSITION[0] - 20.65,
  SHANGSHENG_XINSUO_POSITION[1] - 6.65,
);
const SUNKE_START_POSITION = groundedPosition(
  SHANGSHENG_XINSUO_POSITION[0] + 45,
  SHANGSHENG_XINSUO_POSITION[1] + 10,
);

type StartPreset = {
  position: Vector3;
  forward: Vector3;
};

function requestedStartPreset(requestedName?: string): StartPreset {
  const name = requestedName ?? (typeof window === "undefined"
    ? ""
    : new URLSearchParams(window.location.search).get("start"));
  if (name === "xingfuli" || name === "hero") {
    return {
      position: HERO_START_POSITION.clone(),
      forward: START_FORWARD.clone(),
    };
  }
  if (name === "huashan") {
    return {
      position: HUASHAN_START_POSITION.clone(),
      forward: new Vector3(-0.8, 0, 0.6).normalize(),
    };
  }
  if (name === "court") {
    return {
      position: HUASHAN_COURT_START_POSITION.clone(),
      forward: new Vector3(0.7, 0, 0.7).normalize(),
    };
  }
  if (name === "bridge") {
    return {
      position: HUASHAN_BRIDGE_START_POSITION.clone(),
      forward: new Vector3(Math.cos(0.13), 0, -Math.sin(0.13)).normalize(),
    };
  }
  if (name === "shangsheng") {
    return {
      position: SHANGSHENG_START_POSITION.clone(),
      forward: new Vector3(-0.75, 0, -0.66).normalize(),
    };
  }
  if (name === "pool") {
    return {
      position: SHANGSHENG_POOL_START_POSITION.clone(),
      forward: new Vector3(0, 0, 1),
    };
  }
  if (name === "sunke") {
    return {
      position: SUNKE_START_POSITION.clone(),
      forward: new Vector3(-0.1, 0, -0.995).normalize(),
    };
  }
  const xinhuaRoadPreset = name ? XINHUA_ROAD_START_PRESETS[name] : undefined;
  if (xinhuaRoadPreset) {
    const [x, z] = xinhuaRoadPreset.position;
    const [forwardX, forwardZ] = xinhuaRoadPreset.forward;
    return {
      position: groundedPosition(x, z),
      forward: new Vector3(forwardX, 0, forwardZ).normalize(),
    };
  }
  return {
    position: START_POSITION.clone(),
    forward: START_FORWARD.clone(),
  };
}

const XINGFULI_WORLD_OBSTACLES = XINGFULI_OBSTACLES.map((obstacle) => transformMapObstacle(
  obstacle,
  XINGFULI_POSITION,
  XINGFULI_PLACEMENT.rotationY,
  XINGFULI_PLACEMENT.horizontalScale,
  XINGFULI_PLACEMENT.localLaneCenterZ,
  XINGFULI_LONGITUDINAL_SCALE,
));

const WORLD_OBSTACLES: MapObstacle[] = [
  ...XINGFULI_WORLD_OBSTACLES,
  ...HUASHAN_GREEN_OBSTACLES,
  ...SHANGSHENG_XINSUO_OBSTACLES,
  ...XINHUA_ROAD_OBSTACLES,
];

const WORLD_CAMERA_OBSTACLES: MapObstacle[] = [
  ...XINGFULI_WORLD_OBSTACLES,
  ...HUASHAN_GREEN_CAMERA_OBSTACLES,
  ...SHANGSHENG_XINSUO_CAMERA_OBSTACLES,
  ...XINHUA_ROAD_CAMERA_OBSTACLES,
];

function GroundAnchor({
  x,
  z,
  y = 0,
  yaw = 0,
  children,
}: {
  x: number;
  z: number;
  y?: number;
  yaw?: number;
  children: ReactNode;
}) {
  return (
    <group position={[x, y, z]} rotation-y={yaw}>
      {children}
    </group>
  );
}

function ActionInstallation({ onOpenAction }: { onOpenAction: () => void }) {
  return (
    <GroundAnchor
      x={ACTION_POSITION.x}
      z={ACTION_POSITION.z}
      y={ACTION_POSITION.y}
      yaw={XINGFULI_PLACEMENT.rotationY}
    >
      <group
        scale={0.7}
        data-action-point="one-square-metre"
        onClick={(event) => {
          event.stopPropagation();
          onOpenAction();
        }}
      >
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <boxGeometry args={[2.35, 0.12, 2.35]} />
          <meshToonMaterial color="#e8b94f" />
        </mesh>
        <mesh position={[0, 0.12, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[1.45, 0.09, 8, 42]} />
          <meshBasicMaterial color="#fff1b1" />
        </mesh>
        {[[-0.94, -0.94], [0.94, -0.94], [-0.94, 0.94], [0.94, 0.94]].map(([x, z], index) => (
          <group key={index} position={[x, 0.28, z]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.24, 0.3, 0.48, 8]} />
              <meshToonMaterial color="#c45d4c" />
            </mesh>
            <mesh position={[0, 0.42, 0]} castShadow>
              <icosahedronGeometry args={[0.38, 1]} />
              <meshToonMaterial color="#4f8465" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 1.22, -0.82]} castShadow>
          <boxGeometry args={[1.65, 0.92, 0.12]} />
          <meshToonMaterial color="#f0ede0" />
        </mesh>
        <mesh position={[0, 1.22, -0.75]}>
          <boxGeometry args={[1.05, 0.08, 0.025]} />
          <meshBasicMaterial color="#cf604d" />
        </mesh>
        <Float speed={2.1} rotationIntensity={0.08} floatIntensity={0.28}>
          <group position={[0, 2.45, 0]}>
            <mesh castShadow>
              <boxGeometry args={[1.15, 0.78, 0.22]} />
              <meshToonMaterial color="#fff2cc" />
            </mesh>
            <mesh position={[0, 0.07, 0.125]} rotation-z={Math.PI / 4}>
              <boxGeometry args={[0.66, 0.66, 0.035]} />
              <meshToonMaterial color="#d36c54" />
            </mesh>
          </group>
        </Float>
        <Html center position={[0, 3.45, 0]} distanceFactor={9} transform sprite>
          <button type="button" className="world-label" onClick={onOpenAction}>一平米行动</button>
        </Html>
      </group>
    </GroundAnchor>
  );
}

function FlatNeighborhood({
  onOpenAction,
  detailScale = 1,
  showDetailModels = false,
  showDetailLabels = true,
}: {
  onOpenAction: () => void;
  detailScale?: number;
  showDetailModels?: boolean;
  showDetailLabels?: boolean;
}) {
  return (
    <group scale={[detailScale, detailScale, detailScale]}>
      <XinhuaStreetMap />
      <group
        position={[XINGFULI_POSITION[0], XINGFULI_BASE_Y, XINGFULI_POSITION[1]]}
        rotation-y={XINGFULI_PLACEMENT.rotationY}
        data-landmark-position="osm-way-400066625"
      >
        <group scale={[
          XINGFULI_LONGITUDINAL_SCALE,
          XINGFULI_PLACEMENT.verticalScale,
          XINGFULI_PLACEMENT.horizontalScale,
        ]}>
          <group position={[0, 0, -XINGFULI_PLACEMENT.localLaneCenterZ]}>
            <XingfuliBlock />
          </group>
        </group>
      </group>
      <HuashanGreenBlock />
      {showDetailModels && (
        <>
          <Suspense fallback={null}>
            <ShangshengXinsuoBlock />
          </Suspense>
          <Suspense fallback={null}>
            <XinhuaRoadPlaneTrees />
          </Suspense>
          <Suspense fallback={null}>
            <XinhuaRoadLandmarks showLabels={showDetailLabels} />
          </Suspense>
        </>
      )}
      <ActionInstallation onOpenAction={onOpenAction} />
    </group>
  );
}

function CharacterHead() {
  return (
    <group position={[0, 2.14, 0.02]}>
      <mesh position={[0, -0.48, -0.01]} castShadow>
        <cylinderGeometry args={[0.17, 0.19, 0.28, 14]} />
        <meshToonMaterial color="#d9a98a" />
      </mesh>
      <mesh scale={[0.94, 1.05, 0.9]} castShadow>
        <sphereGeometry args={[0.46, 24, 18]} />
        <meshToonMaterial color="#e9bea0" />
      </mesh>
      {[-0.46, 0.46].map((x) => (
        <mesh key={x} position={[x, 0, 0]} scale={[0.42, 0.72, 0.34]} castShadow>
          <sphereGeometry args={[0.2, 14, 10]} />
          <meshToonMaterial color="#dfae90" />
        </mesh>
      ))}

      <mesh position={[0, 0.08, -0.02]} scale={[1.03, 1, 1.02]} castShadow>
        <sphereGeometry args={[0.475, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshToonMaterial color="#293f3b" />
      </mesh>
      {[-0.31, -0.1, 0.12, 0.31].map((x, index) => (
        <mesh
          key={x}
          position={[x, 0.19 - Math.abs(x) * 0.18, 0.38]}
          rotation-z={(index - 1.5) * 0.16}
          castShadow
        >
          <coneGeometry args={[0.115, 0.34 - Math.abs(x) * 0.15, 8]} />
          <meshToonMaterial color={index % 2 ? "#304943" : "#293f3b"} />
        </mesh>
      ))}
      {[-0.36, 0.36].map((x) => (
        <mesh key={x} position={[x, -0.04, -0.23]} scale={[0.7, 1.25, 0.62]} castShadow>
          <sphereGeometry args={[0.25, 14, 10]} />
          <meshToonMaterial color="#293f3b" />
        </mesh>
      ))}

      {[-0.17, 0.17].map((x) => (
        <group key={x} position={[x, 0.03, 0.405]}>
          <mesh scale={[1, 0.72, 0.32]}>
            <sphereGeometry args={[0.085, 14, 10]} />
            <meshBasicMaterial color="#f8edd7" />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <sphereGeometry args={[0.037, 12, 8]} />
            <meshBasicMaterial color="#273936" />
          </mesh>
          <mesh position={[0.012, 0.012, 0.064]}>
            <sphereGeometry args={[0.012, 8, 6]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, 0.16, 0.405]} rotation-z={x * -0.48}>
          <boxGeometry args={[0.13, 0.025, 0.022]} />
          <meshBasicMaterial color="#32423e" />
        </mesh>
      ))}
      <mesh position={[0, -0.055, 0.438]} rotation-x={Math.PI / 2}>
        <coneGeometry args={[0.035, 0.075, 8]} />
        <meshToonMaterial color="#d79b7d" />
      </mesh>
      <mesh position={[0, -0.19, 0.425]} rotation-z={0.08}>
        <torusGeometry args={[0.075, 0.015, 6, 18, Math.PI]} />
        <meshBasicMaterial color="#a85f55" />
      </mesh>
      {[-0.28, 0.28].map((x) => (
        <mesh key={x} position={[x, -0.1, 0.4]}>
          <circleGeometry args={[0.065, 16]} />
          <meshBasicMaterial color="#dc8c80" transparent opacity={0.34} />
        </mesh>
      ))}
    </group>
  );
}

function MessengerBackpack() {
  return (
    <group position={[0, 1.27, -0.4]}>
      <RoundedBox args={[0.76, 0.88, 0.3]} radius={0.14} smoothness={3} castShadow>
        <meshToonMaterial color="#b94f45" />
      </RoundedBox>
      <RoundedBox args={[0.7, 0.34, 0.09]} radius={0.08} smoothness={2} position={[0, 0.24, -0.19]} castShadow>
        <meshToonMaterial color="#d86a50" />
      </RoundedBox>
      <mesh position={[0, 0.14, -0.25]} rotation-z={Math.PI / 4} castShadow>
        <boxGeometry args={[0.3, 0.3, 0.045]} />
        <meshToonMaterial color="#fff0c8" />
      </mesh>
      <mesh position={[0, 0.14, -0.28]} rotation-z={Math.PI / 4}>
        <boxGeometry args={[0.16, 0.16, 0.025]} />
        <meshBasicMaterial color="#d3624d" />
      </mesh>
      {[-0.25, 0.25].map((x) => (
        <RoundedBox key={x} args={[0.22, 0.3, 0.22]} radius={0.06} smoothness={2} position={[x, -0.24, -0.05]} castShadow>
          <meshToonMaterial color="#9f463f" />
        </RoundedBox>
      ))}
      <mesh position={[0, 0.51, 0]} rotation-x={Math.PI / 2} castShadow>
        <torusGeometry args={[0.16, 0.035, 8, 16, Math.PI]} />
        <meshToonMaterial color="#394d48" />
      </mesh>
    </group>
  );
}

function CharacterTorso() {
  return (
    <group>
      <RoundedBox args={[0.88, 0.98, 0.55]} radius={0.18} smoothness={3} position={[0, 1.29, 0]} castShadow>
        <meshToonMaterial color="#d9823f" />
      </RoundedBox>
      <RoundedBox args={[0.4, 0.7, 0.075]} radius={0.08} smoothness={2} position={[0, 1.29, 0.31]}>
        <meshToonMaterial color="#f1dfba" />
      </RoundedBox>
      {[-0.24, 0.24].map((x) => (
        <mesh key={x} position={[x, 1.49, 0.345]} rotation-z={x * -1.05} castShadow>
          <boxGeometry args={[0.16, 0.48, 0.065]} />
          <meshToonMaterial color="#bb5a3f" />
        </mesh>
      ))}
      {[-0.27, 0.27].map((x) => (
        <mesh key={x} position={[x, 1.31, 0.35]} castShadow>
          <capsuleGeometry args={[0.045, 0.62, 3, 8]} />
          <meshToonMaterial color="#40524d" />
        </mesh>
      ))}
      {[1.45, 1.25, 1.05].map((y) => (
        <mesh key={y} position={[0, y, 0.365]}>
          <sphereGeometry args={[0.027, 8, 6]} />
          <meshBasicMaterial color="#344944" />
        </mesh>
      ))}
      <mesh position={[0, 0.79, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.39, 0.2, 14]} />
        <meshToonMaterial color="#344d48" />
      </mesh>
      <MessengerBackpack />
    </group>
  );
}

function CharacterArm({
  side,
  armRef,
}: {
  side: -1 | 1;
  armRef: RefObject<Group | null>;
}) {
  return (
    <group ref={armRef} position={[side * 0.49, 1.68, 0]} rotation-z={side * -0.08}>
      <mesh position={[0, -0.25, 0]} castShadow>
        <capsuleGeometry args={[0.145, 0.28, 5, 10]} />
        <meshToonMaterial color="#c96b3e" />
      </mesh>
      <mesh position={[0, -0.51, 0]} castShadow>
        <sphereGeometry args={[0.14, 14, 10]} />
        <meshToonMaterial color="#d89b7b" />
      </mesh>
      <mesh position={[0, -0.67, 0.015]} castShadow>
        <capsuleGeometry args={[0.12, 0.23, 5, 10]} />
        <meshToonMaterial color="#e1ae8e" />
      </mesh>
      <mesh position={[0, -0.9, 0.04]} scale={[0.92, 1.08, 0.82]} castShadow>
        <sphereGeometry args={[0.14, 14, 10]} />
        <meshToonMaterial color="#e7b798" />
      </mesh>
    </group>
  );
}

function CharacterLeg({
  side,
  legRef,
}: {
  side: -1 | 1;
  legRef: RefObject<Group | null>;
}) {
  return (
    <group ref={legRef} position={[side * 0.22, 0.88, 0]}>
      <mesh position={[0, -0.25, 0]} castShadow>
        <capsuleGeometry args={[0.17, 0.28, 5, 10]} />
        <meshToonMaterial color="#526b62" />
      </mesh>
      <mesh position={[0, -0.49, 0]} castShadow>
        <sphereGeometry args={[0.155, 14, 10]} />
        <meshToonMaterial color="#405851" />
      </mesh>
      <mesh position={[0, -0.65, 0]} castShadow>
        <capsuleGeometry args={[0.14, 0.24, 5, 10]} />
        <meshToonMaterial color="#314b46" />
      </mesh>
      <RoundedBox args={[0.34, 0.2, 0.56]} radius={0.07} smoothness={2} position={[0, -0.88, 0.12]} castShadow>
        <meshToonMaterial color="#263b38" />
      </RoundedBox>
      <mesh position={[0, -0.99, 0.14]} castShadow>
        <boxGeometry args={[0.35, 0.07, 0.58]} />
        <meshToonMaterial color="#e9d9b4" />
      </mesh>
    </group>
  );
}

function ProceduralMessengerCharacter({
  outerRef,
  scale = 1,
}: {
  outerRef: RefObject<Group | null>;
  scale?: number;
}) {
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const body = useRef<Group>(null);

  useFrame(({ clock }) => {
    const analogStrength = Math.min(1, Math.hypot(inputState.moveX, inputState.moveY));
    const keyboardMoving = inputState.forward || inputState.back || inputState.left || inputState.right;
    const moveStrength = analogStrength > 0 ? analogStrength : (keyboardMoving ? 1 : 0);
    const strideStrength = Math.sqrt(moveStrength);
    const stride = Math.sin(
      clock.elapsedTime * (inputState.sprint ? 12 : 5.5 + moveStrength * 2.5),
    ) * strideStrength;
    if (leftArm.current) leftArm.current.rotation.x = stride * 0.58;
    if (rightArm.current) rightArm.current.rotation.x = -stride * 0.58;
    if (leftLeg.current) leftLeg.current.rotation.x = -stride * 0.52;
    if (rightLeg.current) rightLeg.current.rotation.x = stride * 0.52;
    if (body.current) {
      body.current.position.y = moveStrength > 0
        ? Math.abs(stride) * 0.038
        : Math.sin(clock.elapsedTime * 2.3) * 0.014;
      body.current.rotation.z = moveStrength > 0
        ? stride * 0.014
        : Math.sin(clock.elapsedTime * 1.2) * 0.006;
    }
  });

  return (
    <group ref={outerRef} scale={scale}>
      <group ref={body} scale={0.9}>
        <CharacterTorso />
        <CharacterHead />
        <CharacterArm side={-1} armRef={leftArm} />
        <CharacterArm side={1} armRef={rightArm} />
        <CharacterLeg side={-1} legRef={leftLeg} />
        <CharacterLeg side={1} legRef={rightLeg} />
      </group>
    </group>
  );
}

type MessengerCharacterProps = {
  outerRef: RefObject<Group | null>;
  scale?: number;
};

function DetailedMessengerCharacter({
  outerRef,
  scale = 1,
}: MessengerCharacterProps) {
  const { scene, animations } = useGLTF(CHARACTER_MODEL_PATH);
  const model = useMemo(() => {
    scene.traverse((object) => {
      if (CHARACTER_HIDDEN_NODES.has(object.name)) object.visible = false;
      const mesh = object as Object3D & {
        isMesh?: boolean;
        castShadow?: boolean;
        receiveShadow?: boolean;
        frustumCulled?: boolean;
      };
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // 绑定姿势之外的动作可能超出静态包围盒；关闭单体裁剪可避免腿或头在屏幕边缘闪失。
        mesh.frustumCulled = false;
      }
    });
    return scene;
  }, [scene]);
  const { actions } = useAnimations(animations, model);
  const activeAction = useRef<string | null>(null);

  useEffect(() => {
    const idle = actions.Unarmed_Idle ?? actions.Idle;
    const idleName = actions.Unarmed_Idle ? "Unarmed_Idle" : "Idle";
    idle?.reset().fadeIn(0.12).play();
    activeAction.current = idle ? idleName : null;
    return () => {
      activeAction.current = null;
    };
  }, [actions]);

  useFrame(() => {
    const analogStrength = Math.min(1, Math.hypot(inputState.moveX, inputState.moveY));
    const keyboardMoving = inputState.forward || inputState.back || inputState.left || inputState.right;
    const moveStrength = analogStrength > 0 ? analogStrength : (keyboardMoving ? 1 : 0);
    const nextAction = moveStrength <= 0.02
      ? (actions.Unarmed_Idle ? "Unarmed_Idle" : "Idle")
      : (inputState.sprint || moveStrength > 0.88 ? "Running_A" : "Walking_A");

    if (activeAction.current === nextAction) return;
    if (activeAction.current) actions[activeAction.current]?.fadeOut(0.16);
    actions[nextAction]?.reset().fadeIn(0.16).play();
    activeAction.current = nextAction;
  });

  return (
    <group ref={outerRef} scale={scale}>
      <group position={[0, -0.28, 0]}>
        <primitive object={model} scale={1.02} />
        <group scale={0.72} position={[0, 0.05, 0.02]}>
          <MessengerBackpack />
        </group>
      </group>
    </group>
  );
}

function MessengerCharacter(props: MessengerCharacterProps) {
  // 角色模型单独进入 Suspense，避免首次载入 GLB 时把地面、建筑与相机一起挂起。
  return (
    <Suspense fallback={<ProceduralMessengerCharacter {...props} />}>
      <DetailedMessengerCharacter {...props} />
    </Suspense>
  );
}

function useKeyboardControls() {
  useEffect(() => {
    type KeyboardInputKey = "forward" | "back" | "left" | "right" | "sprint" | "jump";
    const mapping: Record<string, KeyboardInputKey> = {
      KeyW: "forward", ArrowUp: "forward",
      KeyS: "back", ArrowDown: "back",
      KeyA: "left", ArrowLeft: "left",
      KeyD: "right", ArrowRight: "right",
      ShiftLeft: "sprint", ShiftRight: "sprint",
      Space: "jump",
    };
    const setKey = (event: KeyboardEvent, value: boolean) => {
      const key = mapping[event.code];
      if (!key) return;
      event.preventDefault();
      inputState[key] = value;
    };
    const keydown = (event: KeyboardEvent) => setKey(event, true);
    const keyup = (event: KeyboardEvent) => setKey(event, false);
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", resetInput);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", resetInput);
      resetInput();
    };
  }, []);
}

function PlayableMessenger({
  onNearAction,
  startPreset,
  onPositionChange,
}: {
  onNearAction: (near: boolean) => void;
  startPreset?: string;
  onPositionChange: (position: readonly [number, number]) => void;
}) {
  const { camera, gl } = useThree();
  const outer = useRef<Group>(null);
  const initialStart = useMemo(() => requestedStartPreset(startPreset), [startPreset]);
  const initialForward = useMemo(() => initialStart.forward.clone(), [initialStart]);
  const initialCameraOffset = useMemo(
    () => initialForward.clone().multiplyScalar(-CAMERA_DISTANCE).addScaledVector(WORLD_UP, CAMERA_HEIGHT),
    [initialForward],
  );
  const characterPosition = useRef(initialStart.position.clone());
  const forward = useRef(initialForward.clone());
  const cameraOffset = useRef(initialCameraOffset.clone());
  const cameraGoalOffset = useRef(initialCameraOffset.clone());
  const lastSafeCameraPosition = useRef<Vector3 | null>(null);
  const moveCameraForward = useRef(initialForward.clone());
  const moveCameraRight = useRef(initialForward.clone().cross(WORLD_UP).normalize());
  const driveSignature = useRef("");
  const jumpHeight = useRef(0);
  const jumpVelocity = useRef(0);
  const jumpHeld = useRef(false);
  const dragging = useRef(false);
  const dragPointerId = useRef<number | null>(null);
  const lastDragPointer = useRef({ x: 0, y: 0 });
  const dragDelta = useRef({ x: 0, y: 0 });
  const zoom = useRef(initialCameraOffset.length());
  const wasNear = useRef(false);
  const onNearRef = useRef(onNearAction);
  const onPositionRef = useRef(onPositionChange);
  const positionReportElapsed = useRef(0);
  useKeyboardControls();

  useLayoutEffect(() => {
    const currentPosition = characterPosition.current;
    const surfaceHeight = terrainHeightAt(currentPosition.x, currentPosition.z);
    const scaledSurfaceHeight = surfaceHeight * DETAIL_WORLD_SCALE;
    const cameraBase = new Vector3(
      currentPosition.x * DETAIL_WORLD_SCALE,
      scaledSurfaceHeight + 0.33,
      currentPosition.z * DETAIL_WORLD_SCALE,
    );
    const cameraRight = initialForward.clone().cross(WORLD_UP).normalize();
    cameraBase.addScaledVector(cameraRight, CAMERA_SHOULDER_OFFSET);
    const cameraTarget = new Vector3(
      currentPosition.x * DETAIL_WORLD_SCALE,
      scaledSurfaceHeight + CAMERA_TARGET_HEIGHT,
      currentPosition.z * DETAIL_WORLD_SCALE,
    );
    cameraTarget.addScaledVector(cameraRight, CAMERA_TARGET_SHOULDER_OFFSET);
    // 首页相机离街区很远。进入游玩态时先同步切到角色身后，保证新建的游戏
    // 后处理合成器从正确视角绘制首帧，不把首页全景缓存带进游戏画面。
    camera.position.copy(cameraBase).add(cameraOffset.current);
    camera.up.copy(WORLD_UP);
    camera.lookAt(cameraTarget);
    if (isPlanarCameraCandidateClearInPolygon(
      currentPosition.x,
      currentPosition.z,
      camera.position.x / DETAIL_WORLD_SCALE,
      camera.position.z / DETAIL_WORLD_SCALE,
      XINHUA_BOUNDARY,
      WORLD_CAMERA_OBSTACLES,
      0.25,
      0.18,
    )) {
      lastSafeCameraPosition.current = camera.position.clone();
    }
    onPositionRef.current([currentPosition.x, currentPosition.z]);
  }, [camera, initialForward]);

  useEffect(() => {
    onNearRef.current = onNearAction;
  }, [onNearAction]);

  useEffect(() => {
    onPositionRef.current = onPositionChange;
  }, [onPositionChange]);

  useEffect(() => () => {
    onPositionRef.current([characterPosition.current.x, characterPosition.current.z]);
  }, []);

  const scratch = useMemo(() => ({
    quaternion: new Quaternion(),
    basis: new Matrix4(),
    right: new Vector3(),
    move: new Vector3(),
    cameraForward: new Vector3(),
    cameraRight: new Vector3(),
    cameraHorizontal: new Vector3(),
    desiredHorizontal: new Vector3(),
    displacement: new Vector3(),
    cameraPosition: new Vector3(),
    cameraLerp: new Vector3(),
    cameraBase: new Vector3(),
    cameraTarget: new Vector3(),
    revertedOffset: new Vector3(),
    fallbackBase: new Vector3(),
    fallbackDirection: new Vector3(),
  }), []);

  useEffect(() => {
    const canvas = gl.domElement;
    const pointerDown = (event: PointerEvent) => {
      if (dragPointerId.current !== null) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragPointerId.current = event.pointerId;
      lastDragPointer.current = { x: event.clientX, y: event.clientY };
      dragging.current = true;
      canvas.setPointerCapture(event.pointerId);
    };
    const pointerUp = (event: PointerEvent) => {
      if (dragPointerId.current !== event.pointerId) return;
      dragPointerId.current = null;
      dragging.current = false;
    };
    const pointerMove = (event: PointerEvent) => {
      if (!dragging.current || dragPointerId.current !== event.pointerId) return;
      const x = event.clientX - lastDragPointer.current.x;
      const y = event.clientY - lastDragPointer.current.y;
      // 切回页面或系统手势可能产生异常大跳变，限制单次增量避免镜头瞬移。
      dragDelta.current.x += Math.max(-120, Math.min(120, x));
      dragDelta.current.y += Math.max(-120, Math.min(120, y));
      lastDragPointer.current = { x: event.clientX, y: event.clientY };
    };
    const cancelDrag = () => {
      dragPointerId.current = null;
      dragging.current = false;
      dragDelta.current.x = 0;
      dragDelta.current.y = 0;
    };
    const wheel = (event: WheelEvent) => {
      zoom.current = Math.min(12.5, Math.max(6.4, zoom.current * (1 + event.deltaY * 0.0012)));
    };
    canvas.addEventListener("pointerdown", pointerDown);
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointercancel", pointerUp);
    window.addEventListener("pointermove", pointerMove);
    window.addEventListener("blur", cancelDrag);
    canvas.addEventListener("wheel", wheel, { passive: true });
    return () => {
      canvas.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", pointerUp);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("blur", cancelDrag);
      canvas.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const currentForward = forward.current;
    const currentPosition = characterPosition.current;
    const s = scratch;

    const analogMagnitude = Math.hypot(inputState.moveX, inputState.moveY);
    const usingAnalog = analogMagnitude > 0;
    const z = usingAnalog
      ? -inputState.moveY
      : (inputState.forward ? 1 : 0) - (inputState.back ? 1 : 0);
    const x = usingAnalog
      ? inputState.moveX
      : (inputState.right ? 1 : 0) - (inputState.left ? 1 : 0);
    const moving = Math.hypot(x, z) > 1e-4;

    if (dragDelta.current.x !== 0) {
      s.quaternion.setFromAxisAngle(
        WORLD_UP,
        -dragDelta.current.x * CAMERA_ROTATION_SPEED_X,
      );
      cameraGoalOffset.current.applyQuaternion(s.quaternion);
    }
    if (dragDelta.current.y !== 0) {
      s.revertedOffset.copy(cameraGoalOffset.current);
      s.right.copy(WORLD_UP).cross(cameraGoalOffset.current).normalize();
      s.quaternion.setFromAxisAngle(
        s.right,
        -dragDelta.current.y * CAMERA_ROTATION_SPEED_Y,
      );
      cameraGoalOffset.current.applyQuaternion(s.quaternion);
      const pitch = cameraGoalOffset.current.dot(WORLD_UP) / cameraGoalOffset.current.length();
      if (pitch > 0.93 || pitch < 0.12) cameraGoalOffset.current.copy(s.revertedOffset);
    }
    dragDelta.current.x = 0;
    dragDelta.current.y = 0;
    cameraGoalOffset.current.setLength(zoom.current);

    if (!dragging.current && moving) {
      // 手动旋转在静止时会停留在任意圆周角；移动时再柔和回到角色身后。
      s.cameraHorizontal.copy(cameraGoalOffset.current).projectOnPlane(WORLD_UP);
      s.desiredHorizontal.copy(currentForward).multiplyScalar(-1);
      dampTangentTowards(
        s.cameraHorizontal,
        s.desiredHorizontal,
        WORLD_UP,
        CAMERA_FOLLOW_DAMPING,
        delta,
        s.cameraHorizontal,
      );
      const currentPitch = Math.min(0.93, Math.max(
        0.12,
        cameraGoalOffset.current.dot(WORLD_UP) / cameraGoalOffset.current.length(),
      ));
      const pitch = currentPitch
        + (CAMERA_DEFAULT_PITCH - currentPitch) * dampingFactor(CAMERA_FOLLOW_DAMPING, delta);
      composeCameraOffset(
        s.cameraHorizontal,
        WORLD_UP,
        zoom.current,
        pitch,
        cameraGoalOffset.current,
      );
    }

    // 输入只改变目标轨道；真实相机用帧率无关阻尼追赶，消除逐像素硬跳。
    s.cameraHorizontal.copy(cameraOffset.current).projectOnPlane(WORLD_UP);
    s.desiredHorizontal.copy(cameraGoalOffset.current).projectOnPlane(WORLD_UP);
    dampTangentTowards(
      s.cameraHorizontal,
      s.desiredHorizontal,
      WORLD_UP,
      CAMERA_ORBIT_DAMPING,
      delta,
      s.cameraHorizontal,
    );
    const currentPitch = Math.min(0.93, Math.max(
      0.12,
      cameraOffset.current.dot(WORLD_UP) / cameraOffset.current.length(),
    ));
    const goalPitch = Math.min(0.93, Math.max(
      0.12,
      cameraGoalOffset.current.dot(WORLD_UP) / cameraGoalOffset.current.length(),
    ));
    const pitch = currentPitch
      + (goalPitch - currentPitch) * dampingFactor(CAMERA_ORBIT_DAMPING, delta);
    composeCameraOffset(
      s.cameraHorizontal,
      WORLD_UP,
      zoom.current,
      pitch,
      cameraOffset.current,
    );

    s.cameraForward.copy(cameraOffset.current).multiplyScalar(-1).projectOnPlane(WORLD_UP);
    if (s.cameraForward.lengthSq() < 0.001) s.cameraForward.copy(currentForward);
    s.cameraForward.normalize();
    s.cameraRight.copy(s.cameraForward).cross(WORLD_UP).normalize();

    if (moving) {
      const signature = usingAnalog ? "analog" : `${x}:${z}`;
      if (signature !== driveSignature.current) {
        moveCameraForward.current.copy(s.cameraForward);
        moveCameraRight.current.copy(s.cameraRight);
        driveSignature.current = signature;
      }
      s.move.set(0, 0, 0)
        .addScaledVector(moveCameraForward.current, z)
        .addScaledVector(moveCameraRight.current, x)
        .normalize();
      const speed = inputState.sprint ? 9.2 : 3.6 * (usingAnalog ? analogMagnitude : 1);
      s.displacement.copy(s.move).multiplyScalar(speed * delta);
      resolvePolygonMovement(
        currentPosition,
        s.displacement,
        XINHUA_BOUNDARY,
        WORLD_OBSTACLES,
        PLAYER_RADIUS,
        currentPosition,
      );
      dampTangentTowards(
        currentForward,
        s.move,
        WORLD_UP,
        CHARACTER_TURN_DAMPING,
        delta,
        currentForward,
        CHARACTER_MAX_TURN_SPEED,
      );
    } else {
      driveSignature.current = "";
    }

    if (inputState.jump && !jumpHeld.current && jumpHeight.current <= 0.001) {
      jumpVelocity.current = 5.2;
    }
    jumpHeld.current = inputState.jump;
    if (jumpVelocity.current !== 0 || jumpHeight.current > 0) {
      jumpHeight.current += jumpVelocity.current * delta;
      jumpVelocity.current -= 15.5 * delta;
      if (jumpHeight.current <= 0) {
        jumpHeight.current = 0;
        jumpVelocity.current = 0;
      }
    }

    const surfaceHeight = terrainHeightAt(currentPosition.x, currentPosition.z);
    const scaledSurfaceHeight = surfaceHeight * DETAIL_WORLD_SCALE;
    if (outer.current) {
      outer.current.position.set(
        currentPosition.x * DETAIL_WORLD_SCALE,
        scaledSurfaceHeight + 0.33 + jumpHeight.current,
        currentPosition.z * DETAIL_WORLD_SCALE,
      );
      s.right.copy(WORLD_UP).cross(currentForward).normalize();
      s.basis.makeBasis(s.right, WORLD_UP, currentForward);
      outer.current.quaternion.setFromRotationMatrix(s.basis);
    }

    s.cameraTarget.set(
      currentPosition.x * DETAIL_WORLD_SCALE,
      scaledSurfaceHeight + CAMERA_TARGET_HEIGHT + jumpHeight.current,
      currentPosition.z * DETAIL_WORLD_SCALE,
    ).addScaledVector(s.cameraRight, CAMERA_TARGET_SHOULDER_OFFSET);
    s.cameraBase.set(
      currentPosition.x * DETAIL_WORLD_SCALE,
      scaledSurfaceHeight + 0.33 + jumpHeight.current,
      currentPosition.z * DETAIL_WORLD_SCALE,
    ).addScaledVector(s.cameraRight, CAMERA_SHOULDER_OFFSET);
    s.cameraPosition.copy(s.cameraBase).add(cameraOffset.current);
    // 相机绕转经过硬碰撞层或地图边缘时沿视线向角色收近；街景地标使用
    // 独立透明层，人物仍受建筑阻挡，但镜头不会被整栋模型的外包络卡死。
    let cameraClear = false;
    for (let step = 0; step <= 16; step += 1) {
      const scale = Math.max(0.06, 1 - step * 0.06);
      s.cameraPosition.copy(s.cameraBase).addScaledVector(cameraOffset.current, scale);
      if (isPlanarCameraCandidateClearInPolygon(
        currentPosition.x,
        currentPosition.z,
        s.cameraPosition.x / DETAIL_WORLD_SCALE,
        s.cameraPosition.z / DETAIL_WORLD_SCALE,
        XINHUA_BOUNDARY,
        WORLD_CAMERA_OBSTACLES,
        0.25,
        0.18,
      )) {
        cameraClear = true;
        break;
      }
    }
    if (!cameraClear) {
      s.fallbackBase.copy(cameraOffset.current).projectOnPlane(WORLD_UP);
      if (s.fallbackBase.lengthSq() < 0.001) s.fallbackBase.copy(currentForward).multiplyScalar(-1);
      s.fallbackBase.normalize();
      fallbackSearch: for (const radius of CAMERA_FALLBACK_RADII) {
        for (const yaw of CAMERA_FALLBACK_YAWS) {
          s.fallbackDirection.copy(s.fallbackBase).applyAxisAngle(WORLD_UP, yaw);
          s.cameraPosition.copy(s.cameraBase)
            .addScaledVector(s.fallbackDirection, radius)
            .addScaledVector(WORLD_UP, CAMERA_FALLBACK_HEIGHT);
          if (isPlanarCameraCandidateClearInPolygon(
            currentPosition.x,
            currentPosition.z,
            s.cameraPosition.x / DETAIL_WORLD_SCALE,
            s.cameraPosition.z / DETAIL_WORLD_SCALE,
            XINHUA_BOUNDARY,
            WORLD_CAMERA_OBSTACLES,
            0.18,
            0.12,
          )) {
            cameraClear = true;
            break fallbackSearch;
          }
        }
      }
    }
    // 极端夹角优先保留上一帧合法位置；若角色移动后视线也失效，再验证一个
    // 位于角色安全半径内的紧凑低位候选，绝不把未经检查的位置交给相机。
    if (!cameraClear) {
      const lastSafe = lastSafeCameraPosition.current;
      if (lastSafe && isPlanarCameraCandidateClearInPolygon(
        currentPosition.x,
        currentPosition.z,
        lastSafe.x / DETAIL_WORLD_SCALE,
        lastSafe.z / DETAIL_WORLD_SCALE,
        XINHUA_BOUNDARY,
        WORLD_CAMERA_OBSTACLES,
        0.18,
        0.12,
      )) {
        s.cameraPosition.copy(lastSafe);
        cameraClear = true;
      }
    }
    if (!cameraClear) {
      s.cameraPosition.set(
        currentPosition.x * DETAIL_WORLD_SCALE,
        scaledSurfaceHeight + CAMERA_TARGET_HEIGHT + 0.45 + jumpHeight.current,
        currentPosition.z * DETAIL_WORLD_SCALE,
      ).addScaledVector(currentForward, -0.16);
      cameraClear = isPlanarCameraCandidateClearInPolygon(
        currentPosition.x,
        currentPosition.z,
        s.cameraPosition.x / DETAIL_WORLD_SCALE,
        s.cameraPosition.z / DETAIL_WORLD_SCALE,
        XINHUA_BOUNDARY,
        WORLD_CAMERA_OBSTACLES,
        0.12,
        0.08,
      );
    }
    if (cameraClear) {
      s.cameraLerp.copy(camera.position).lerp(
        s.cameraPosition,
        dampingFactor(CAMERA_POSITION_DAMPING, delta),
      );
      if (isPlanarCameraCandidateClearInPolygon(
        currentPosition.x,
        currentPosition.z,
        s.cameraLerp.x / DETAIL_WORLD_SCALE,
        s.cameraLerp.z / DETAIL_WORLD_SCALE,
        XINHUA_BOUNDARY,
        WORLD_CAMERA_OBSTACLES,
        0.25,
        0.12,
      )) {
        camera.position.copy(s.cameraLerp);
      } else {
        camera.position.copy(s.cameraPosition);
      }
      lastSafeCameraPosition.current?.copy(camera.position);
      if (!lastSafeCameraPosition.current) lastSafeCameraPosition.current = camera.position.clone();
    }
    camera.up.copy(WORLD_UP);
    camera.lookAt(s.cameraTarget);

    const near = Math.hypot(
      currentPosition.x - ACTION_POSITION.x,
      currentPosition.z - ACTION_POSITION.z,
    ) < 3.2;
    if (near !== wasNear.current) {
      wasNear.current = near;
      onNearRef.current(near);
    }
    positionReportElapsed.current += delta;
    if (positionReportElapsed.current >= 0.25) {
      positionReportElapsed.current = 0;
      onPositionRef.current([currentPosition.x, currentPosition.z]);
    }
  });

  return <MessengerCharacter outerRef={outer} />;
}

type OverviewLabelStyle = CSSProperties & {
  "--overview-label-x": string;
  "--overview-label-y": string;
  "--overview-leader-length": string;
  "--overview-leader-angle": string;
  "--overview-leader-opacity": string;
};

function overviewLabelStyle(offset: readonly [number, number]): OverviewLabelStyle {
  const [x, y] = offset;
  const length = Math.hypot(x, y);
  return {
    "--overview-label-x": `${x}px`,
    "--overview-label-y": `${y}px`,
    "--overview-leader-length": `${length}px`,
    "--overview-leader-angle": `${Math.atan2(-y, -x)}rad`,
    "--overview-leader-opacity": length >= 14 ? "1" : "0",
  };
}

function OverviewPoiMarkers({ nearPoiId }: { nearPoiId: string | null }) {
  return (
    <group data-overview-poi-count={MAP_POIS.length}>
      {MAP_POIS.map((poi) => {
        const near = poi.id === nearPoiId;
        const [x, z] = poi.position;
        const y = terrainHeightAt(x, z) + 1.1;
        return (
          <group key={poi.id} position={[x, y, z]} scale={near ? 1.18 : 1}>
            <mesh rotation-x={Math.PI / 2}>
              <torusGeometry args={[near ? 8.8 : 6.6, near ? 1.25 : 0.75, 10, 42]} />
              <meshBasicMaterial color={near ? "#fff2a8" : "#c85f4c"} />
            </mesh>
            <mesh position={[0, 4.8, 0]}>
              <coneGeometry args={[2.8, 7.2, 8]} />
              <meshToonMaterial color={near ? "#efbd49" : "#c85f4c"} />
            </mesh>
            <Html center position={[0, 12.5, 0]} distanceFactor={180} transform sprite>
              <span
                className="overview-poi-label-anchor"
                data-overview-poi={poi.id}
                style={overviewLabelStyle(OVERVIEW_POI_LABEL_OFFSETS[poi.id] ?? [0, 0])}
              >
                <span className={`overview-poi-label${near ? " is-near" : ""}`}>
                  {poi.name}
                </span>
              </span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function OverviewMessenger({
  initialPosition,
  cameraFocus,
  onNearPoi,
  onPositionChange,
}: {
  initialPosition: readonly [number, number];
  cameraFocus: RefObject<Vector3>;
  onNearPoi: (poiId: string | null) => void;
  onPositionChange: (position: readonly [number, number]) => void;
}) {
  const { camera } = useThree();
  const outer = useRef<Group>(null);
  const position = useRef(new Vector3(
    initialPosition[0],
    terrainHeightAt(initialPosition[0], initialPosition[1]) + 0.33,
    initialPosition[1],
  ));
  const forward = useRef(new Vector3(-1, 0, -1).normalize());
  const nearPoi = useRef<string | null>(null);
  const onNearPoiRef = useRef(onNearPoi);
  const onPositionRef = useRef(onPositionChange);
  const scratchMove = useMemo(() => new Vector3(), []);
  const scratchDisplacement = useMemo(() => new Vector3(), []);
  const scratchBasis = useMemo(() => new Matrix4(), []);
  const scratchRight = useMemo(() => new Vector3(), []);
  useKeyboardControls();

  useEffect(() => {
    onNearPoiRef.current = onNearPoi;
  }, [onNearPoi]);

  useEffect(() => {
    onPositionRef.current = onPositionChange;
  }, [onPositionChange]);

  useEffect(() => () => {
    onPositionRef.current([position.current.x, position.current.z]);
    onNearPoiRef.current(null);
  }, []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const analogMagnitude = Math.hypot(inputState.moveX, inputState.moveY);
    const usingAnalog = analogMagnitude > 0;
    const z = usingAnalog
      ? -inputState.moveY
      : (inputState.forward ? 1 : 0) - (inputState.back ? 1 : 0);
    const x = usingAnalog
      ? inputState.moveX
      : (inputState.right ? 1 : 0) - (inputState.left ? 1 : 0);
    if (Math.hypot(x, z) > 1e-4) {
      screenInputToPlanarMove(camera.matrixWorld, x, z, WORLD_UP, scratchMove);
      const speed = OVERVIEW_MOVE_SPEED * (inputState.sprint ? 1.45 : 1)
        * (usingAnalog ? analogMagnitude : 1);
      scratchDisplacement.copy(scratchMove).multiplyScalar(speed * delta);
      resolvePolygonMovement(
        position.current,
        scratchDisplacement,
        XINHUA_BOUNDARY,
        [],
        PLAYER_RADIUS,
        position.current,
      );
      dampTangentTowards(
        forward.current,
        scratchMove,
        WORLD_UP,
        CHARACTER_TURN_DAMPING,
        delta,
        forward.current,
        CHARACTER_MAX_TURN_SPEED,
      );
    }

    position.current.y = terrainHeightAt(position.current.x, position.current.z) + 0.33;
    cameraFocus.current.copy(position.current);
    if (outer.current) {
      outer.current.position.copy(position.current);
      scratchRight.copy(WORLD_UP).cross(forward.current).normalize();
      scratchBasis.makeBasis(scratchRight, WORLD_UP, forward.current);
      outer.current.quaternion.setFromRotationMatrix(scratchBasis);
    }

    const closestId = nearestMapPoi(
      [position.current.x, position.current.z],
      OVERVIEW_POI_DISTANCE,
    )?.id ?? null;
    if (closestId !== nearPoi.current) {
      nearPoi.current = closestId;
      onNearPoiRef.current(closestId);
    }
  });

  return <MessengerCharacter outerRef={outer} scale={OVERVIEW_CHARACTER_SCALE} />;
}

function OverviewCamera({
  active,
  focus,
}: {
  active: boolean;
  focus: RefObject<Vector3>;
}) {
  const { camera } = useThree();
  const target = useMemo(() => new Vector3(0, 0, 0), []);
  const desired = useMemo(() => new Vector3(), []);

  useFrame(() => {
    if (!active) return;
    target.copy(focus.current);
    const perspective = camera as PerspectiveCamera;
    const verticalHalfFov = MathUtils.degToRad(perspective.fov / 2);
    const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * perspective.aspect);
    const fitDistance = INTRO_MAP_RADIUS * OVERVIEW_CAMERA_FILL
      / Math.sin(Math.min(verticalHalfFov, horizontalHalfFov));
    desired.copy(target).addScaledVector(OVERVIEW_CAMERA_DIRECTION, fitDistance);
    camera.position.copy(desired);
    camera.up.copy(WORLD_UP);
    camera.lookAt(target);
  });

  return null;
}

export function IntroCamera({ active = true }: { active?: boolean }) {
  const { camera } = useThree();
  const target = useMemo(() => new Vector3(0, 0, 0), []);
  const desired = useMemo(() => new Vector3(), []);
  const direction = useMemo(() => new Vector3(), []);
  const activeRef = useRef(active);
  const reducedMotion = useRef(
    typeof window !== "undefined"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reducedMotion.current = query.matches;
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useLayoutEffect(() => {
    activeRef.current = active;
  }, [active]);

  useFrame((_, delta) => {
    if (!activeRef.current) return;
    const perspective = camera as PerspectiveCamera;
    const verticalHalfFov = MathUtils.degToRad(perspective.fov / 2);
    const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * perspective.aspect);
    // 以更窄的视场角计算距离，横屏和竖屏都能完整容纳新华社区边界。
    const fitDistance = INTRO_MAP_RADIUS
      / Math.sin(Math.min(verticalHalfFov, horizontalHalfFov));
    // 首页使用稳定的静态全景。密集道路在远景下逐帧旋转会产生亚像素闪烁和摩尔纹。
    direction.copy(INTRO_CAMERA_DIRECTION);
    desired.copy(target).addScaledVector(direction, fitDistance);
    if (reducedMotion.current) camera.position.copy(desired);
    else camera.position.lerp(desired, Math.min(1, delta * 2.5));
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
  });
  return null;
}

export function XinhuaWorld({
  mode,
  onNearAction,
  onOpenAction,
  nearPoiId,
  overviewStartPosition,
  destinationPreset,
  onNearPoi,
  onPositionChange,
}: {
  mode: "intro" | "overview" | "explore";
  onNearAction: (near: boolean) => void;
  onOpenAction: () => void;
  nearPoiId: string | null;
  overviewStartPosition: readonly [number, number];
  destinationPreset?: string;
  onNearPoi: (poiId: string | null) => void;
  onPositionChange: (position: readonly [number, number]) => void;
}) {
  const exploring = mode === "explore";
  const overview = mode === "overview";
  const overviewCameraFocus = useRef(new Vector3(
    overviewStartPosition[0],
    terrainHeightAt(overviewStartPosition[0], overviewStartPosition[1]) + 0.33,
    overviewStartPosition[1],
  ));
  const shadowTarget = useMemo(() => {
    const target = new Object3D();
    target.position.copy(SHADOW_CENTER);
    return target;
  }, []);

  useLayoutEffect(() => {
    if (!overview) return;
    overviewCameraFocus.current.set(
      overviewStartPosition[0],
      terrainHeightAt(overviewStartPosition[0], overviewStartPosition[1]) + 0.33,
      overviewStartPosition[1],
    );
  }, [overview, overviewStartPosition]);

  return (
    <>
      {exploring && (
        <fog attach="fog" args={[
          "#73aaa6",
          78 * DETAIL_WORLD_SCALE,
          190 * DETAIL_WORLD_SCALE,
        ]} />
      )}
      <color attach="background" args={[new Color("#69bab6")]} />
      <ambientLight intensity={exploring ? 0.58 : 1.15} />
      <hemisphereLight args={["#eff8e9", "#536056", exploring ? 0.72 : 1.45]} />
      <primitive object={shadowTarget} />
      <directionalLight
        position={[SHADOW_CENTER.x + 70, 120, SHADOW_CENTER.z + 90]}
        target={shadowTarget}
        intensity={exploring ? 2.65 : 2.1}
        color="#fff2ce"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={520}
        shadow-camera-left={-240}
        shadow-camera-right={240}
        shadow-camera-top={240}
        shadow-camera-bottom={-240}
        shadow-bias={-0.00025}
      />
      <FlatNeighborhood
        onOpenAction={onOpenAction}
        detailScale={exploring ? DETAIL_WORLD_SCALE : 1}
        showDetailModels={mode !== "intro"}
        showDetailLabels={false}
      />
      <IntroCamera active={mode === "intro"} />
      {overview && (
        <>
          <OverviewPoiMarkers nearPoiId={nearPoiId} />
          <OverviewMessenger
            initialPosition={overviewStartPosition}
            cameraFocus={overviewCameraFocus}
            onNearPoi={onNearPoi}
            onPositionChange={onPositionChange}
          />
        </>
      )}
      <OverviewCamera active={overview} focus={overviewCameraFocus} />
      {exploring && (
        <PlayableMessenger
          onNearAction={onNearAction}
          startPreset={destinationPreset}
          onPositionChange={onPositionChange}
        />
      )}
    </>
  );
}
