"use client";

import {
  Float,
  Html,
  RoundedBox,
  Shadow,
  useAnimations,
  useGLTF,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  DirectionalLight,
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
  cameraRelativeInputToPlanarMove,
  composeCameraOffset,
  dampingFactor,
  dampTangentTowards,
  explorationVerticalFov,
  nextCameraZoomDistance,
  normalizeWheelDeltaY,
  remainingDeadlineMs,
  resolvePlanarSpringArm,
  type MapObstacle,
  type MapPolygonPoint,
  resolvePolygonMovement,
  screenInputToPlanarMove,
  stepSpringArmLength,
  transformMapObstacle,
  transformMapPoint,
} from "./world-math";
import {
  XINHUA_ATMOSPHERES,
  type XinhuaAtmosphere,
  type XinhuaAtmosphereStyle,
} from "./atmosphere-contract";
import { resetCameraQa, updateCameraQa } from "./camera-qa";

const WORLD_UP = new Vector3(0, 1, 0);
const INTRO_CAMERA_DIRECTION = new Vector3(126, 142, 138).normalize();
const OVERVIEW_CAMERA_DIRECTION = new Vector3(1, 1.18, 1).normalize();
const INTRO_MAP_RADIUS = Math.hypot(
  (XINHUA_BOUNDS.maxX - XINHUA_BOUNDS.minX) / 2,
  (XINHUA_BOUNDS.maxZ - XINHUA_BOUNDS.minZ) / 2,
) * 1.08;
const CAMERA_DISTANCE = 5;
const CAMERA_HEIGHT = 1.95;
const CAMERA_TARGET_HEIGHT = 1.45;
const CAMERA_SHOULDER_OFFSET = 0.9;
const CAMERA_TARGET_SHOULDER_OFFSET = 0.12;
const CAMERA_FOLLOW_DAMPING = 3.2;
const CAMERA_ORBIT_DAMPING = 18;
const CAMERA_ARM_RECOVERY_DAMPING = 6;
const CAMERA_COLLISION_RADIUS = 0.26;
const CAMERA_COLLISION_MARGIN = 0.08;
const CAMERA_MANUAL_FOLLOW_GRACE_SECONDS = 0.35;
const CAMERA_MIN_ZOOM_DISTANCE = 4.6;
const CAMERA_MAX_ZOOM_DISTANCE = 12.5;
const CAMERA_ROTATION_SPEED_X = 0.005;
const CAMERA_ROTATION_SPEED_Y = 0.004;
const CHARACTER_TURN_DAMPING = 7.2;
const CHARACTER_MODEL_PATH = "/models/character/rain-summer-wanderer.glb?v=f9721e54f034";
// Rain 的原始身高比旧角色低约 11%；1.3 倍可保持正式地图中的既有屏幕占比。
const CHARACTER_VISUAL_SCALE = 1.3;
const CHARACTER_MAX_TURN_SPEED = 8.5;
const EXPLORE_WALK_SPEED = 3.1;
const EXPLORE_RUN_SPEED = 6.8;
const CAMERA_DEFAULT_PITCH = CAMERA_HEIGHT / Math.hypot(CAMERA_DISTANCE, CAMERA_HEIGHT);
const PLAYER_RADIUS = 0.48;
export const DETAIL_WORLD_SCALE = 1.65;
const OVERVIEW_CHARACTER_SCALE = 22;
const OVERVIEW_MOVE_SPEED = 94;
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
const [xingfuliCanonicalX, xingfuliCanonicalZ] = xingfuliLocalToWorld(
  4,
  XINGFULI_PLACEMENT.localLaneCenterZ,
);
const [xingfuliPoolDetailX, xingfuliPoolDetailZ] = xingfuliLocalToWorld(5.5, -10.4);
const [xingfuliEntranceDetailX, xingfuliEntranceDetailZ] = xingfuliLocalToWorld(45, -5.5);
const ACTION_POSITION = new Vector3(actionX, terrainHeightAt(actionX, actionZ) + 0.34, actionZ);
const START_POSITION = new Vector3(startX, terrainHeightAt(startX, startZ) + 0.33, startZ);
const HERO_START_POSITION = new Vector3(
  heroStartX,
  terrainHeightAt(heroStartX, heroStartZ) + 0.33,
  heroStartZ,
);
const XINGFULI_CANONICAL_POSITION = new Vector3(
  xingfuliCanonicalX,
  terrainHeightAt(xingfuliCanonicalX, xingfuliCanonicalZ) + 0.33,
  xingfuliCanonicalZ,
);
const XINGFULI_POOL_DETAIL_POSITION = new Vector3(
  xingfuliPoolDetailX,
  terrainHeightAt(xingfuliPoolDetailX, xingfuliPoolDetailZ) + 0.33,
  xingfuliPoolDetailZ,
);
const XINGFULI_ENTRANCE_DETAIL_POSITION = new Vector3(
  xingfuliEntranceDetailX,
  terrainHeightAt(xingfuliEntranceDetailX, xingfuliEntranceDetailZ) + 0.33,
  xingfuliEntranceDetailZ,
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
  SHANGSHENG_XINSUO_POSITION[0] + 50,
  SHANGSHENG_XINSUO_POSITION[1],
);

type StartPreset = {
  position: Vector3;
  forward: Vector3;
  cameraTargetHeight?: number;
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
  if (name === "xingfuli-canonical") {
    return {
      position: XINGFULI_CANONICAL_POSITION.clone(),
      forward: START_FORWARD.clone(),
    };
  }
  if (name === "xingfuli-pool-detail") {
    return {
      position: XINGFULI_POOL_DETAIL_POSITION.clone(),
      forward: START_FORWARD.clone(),
    };
  }
  if (name === "xingfuli-entrance-detail") {
    return {
      position: XINGFULI_ENTRANCE_DETAIL_POSITION.clone(),
      forward: START_FORWARD.clone().negate(),
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
      // 从花园右前侧斜看正立面，避开自行车架与入口导视对三联尖券的遮挡。
      forward: new Vector3(-0.56, 0, -0.83).normalize(),
    };
  }
  const xinhuaRoadPreset = name ? XINHUA_ROAD_START_PRESETS[name] : undefined;
  if (xinhuaRoadPreset) {
    const [x, z] = xinhuaRoadPreset.position;
    const [forwardX, forwardZ] = xinhuaRoadPreset.forward;
    return {
      position: groundedPosition(x, z),
      forward: new Vector3(forwardX, 0, forwardZ).normalize(),
      cameraTargetHeight: xinhuaRoadPreset.cameraTargetHeight,
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
  atmosphere,
  detailScale = 1,
  showDetailModels = false,
  showDetailLabels = true,
  showRoadLabels = true,
  showHeroTree = false,
  priorityPreset,
  landmarkLoadMode = "overview",
}: {
  onOpenAction: () => void;
  atmosphere: XinhuaAtmosphere;
  detailScale?: number;
  showDetailModels?: boolean;
  showDetailLabels?: boolean;
  showRoadLabels?: boolean;
  showHeroTree?: boolean;
  priorityPreset?: string;
  landmarkLoadMode?: "overview" | "explore";
}) {
  return (
    <group scale={[detailScale, detailScale, detailScale]}>
      <XinhuaStreetMap showRoadLabels={showRoadLabels} />
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
            <XingfuliBlock loadDetailedArchitecture={showDetailModels} />
          </group>
        </group>
      </group>
      <HuashanGreenBlock />
      {showDetailModels && (
        <>
          <ShangshengXinsuoBlock />
          <XinhuaRoadPlaneTrees showHero={showHeroTree} atmosphere={atmosphere} />
          <XinhuaRoadLandmarks
            showLabels={showDetailLabels}
            priorityPreset={priorityPreset}
            loadMode={landmarkLoadMode}
          />
        </>
      )}
      <ActionInstallation onOpenAction={onOpenAction} />
    </group>
  );
}

function FallbackWandererHead() {
  return (
    <group position={[0, 1.68, 0]}>
      <mesh scale={[0.9, 1.02, 0.88]} castShadow>
        <sphereGeometry args={[0.23, 18, 14]} />
        <meshToonMaterial color="#c99373" />
      </mesh>
      <mesh position={[0, 0.075, -0.015]} scale={[0.98, 0.78, 0.96]} castShadow>
        <sphereGeometry args={[0.245, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
        <meshToonMaterial color="#111c1c" />
      </mesh>
      {[-0.085, 0.085].map((x) => (
        <mesh key={x} position={[x, 0.005, 0.205]}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshBasicMaterial color="#1b2423" />
        </mesh>
      ))}
    </group>
  );
}

function FallbackWandererTorso() {
  return (
    <group>
      <RoundedBox
        args={[0.56, 0.7, 0.32]}
        radius={0.12}
        smoothness={3}
        position={[0, 1.18, 0]}
        castShadow
      >
        <meshToonMaterial color="#657772" />
      </RoundedBox>
      <mesh position={[0, 1.5, -0.13]} rotation-x={Math.PI / 2} scale={[1, 0.72, 1]}>
        <torusGeometry args={[0.19, 0.045, 8, 20, Math.PI]} />
        <meshToonMaterial color="#536560" />
      </mesh>
    </group>
  );
}

function FallbackWandererArm({
  side,
  armRef,
}: {
  side: -1 | 1;
  armRef: RefObject<Group | null>;
}) {
  return (
    <group ref={armRef} position={[side * 0.36, 1.42, 0]} rotation-z={side * -0.06}>
      <mesh position={[0, -0.25, 0]} castShadow>
        <capsuleGeometry args={[0.095, 0.42, 5, 10]} />
        <meshToonMaterial color="#5b6d68" />
      </mesh>
      <mesh position={[0, -0.53, 0.015]} scale={[0.92, 1.08, 0.82]} castShadow>
        <sphereGeometry args={[0.095, 12, 8]} />
        <meshToonMaterial color="#c99373" />
      </mesh>
    </group>
  );
}

function FallbackWandererLeg({
  side,
  legRef,
}: {
  side: -1 | 1;
  legRef: RefObject<Group | null>;
}) {
  return (
    <group ref={legRef} position={[side * 0.15, 0.82, 0]}>
      <mesh position={[0, -0.29, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.46, 5, 10]} />
        <meshToonMaterial color="#202b2f" />
      </mesh>
      <RoundedBox
        args={[0.23, 0.16, 0.38]}
        radius={0.055}
        smoothness={2}
        position={[0, -0.67, 0.08]}
        castShadow
      >
        <meshToonMaterial color="#555650" />
      </RoundedBox>
    </group>
  );
}

function ProceduralWandererCharacter({
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
      <group ref={body}>
        <FallbackWandererTorso />
        <FallbackWandererHead />
        <FallbackWandererArm side={-1} armRef={leftArm} />
        <FallbackWandererArm side={1} armRef={rightArm} />
        <FallbackWandererLeg side={-1} legRef={leftLeg} />
        <FallbackWandererLeg side={1} legRef={rightLeg} />
      </group>
    </group>
  );
}

type WandererCharacterProps = {
  outerRef: RefObject<Group | null>;
  scale?: number;
};

function DetailedWandererCharacter({
  outerRef,
  scale = 1,
}: WandererCharacterProps) {
  const { scene, animations } = useGLTF(CHARACTER_MODEL_PATH);
  const model = useMemo(() => {
    scene.traverse((object) => {
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
    const idle = actions.Idle_Neutral;
    const idleName = "Idle_Neutral";
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
      ? "Idle_Neutral"
      : (inputState.sprint ? "Run" : "Walk");

    if (activeAction.current === nextAction) return;
    if (activeAction.current) actions[activeAction.current]?.fadeOut(0.16);
    actions[nextAction]?.reset().fadeIn(0.16).play();
    activeAction.current = nextAction;
  });

  return (
    <group ref={outerRef} scale={scale}>
      <primitive object={model} scale={CHARACTER_VISUAL_SCALE} />
    </group>
  );
}

function WandererCharacter(props: WandererCharacterProps) {
  // 角色模型单独进入 Suspense，避免首次载入 GLB 时把地面、建筑与相机一起挂起。
  return (
    <Suspense fallback={<ProceduralWandererCharacter {...props} />}>
      <DetailedWandererCharacter {...props} />
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

function PlayableWanderer({
  onNearAction,
  startPreset,
  onPositionChange,
  atmosphere,
  cameraQaEnabled,
}: {
  onNearAction: (near: boolean) => void;
  startPreset?: string;
  onPositionChange: (position: readonly [number, number]) => void;
  atmosphere: XinhuaAtmosphere;
  cameraQaEnabled: boolean;
}) {
  const { camera, gl } = useThree();
  const outer = useRef<Group>(null);
  const groundShadow = useRef<Group>(null);
  const initialStart = useMemo(() => requestedStartPreset(startPreset), [startPreset]);
  const initialForward = useMemo(() => initialStart.forward.clone(), [initialStart]);
  const cameraTargetHeight = initialStart.cameraTargetHeight ?? CAMERA_TARGET_HEIGHT;
  const initialCameraOffset = useMemo(
    () => initialForward.clone().multiplyScalar(-CAMERA_DISTANCE).addScaledVector(WORLD_UP, CAMERA_HEIGHT),
    [initialForward],
  );
  const characterPosition = useRef(initialStart.position.clone());
  const forward = useRef(initialForward.clone());
  const cameraOffset = useRef(initialCameraOffset.clone());
  const cameraGoalOffset = useRef(initialCameraOffset.clone());
  const resolvedArmLength = useRef<number | null>(null);
  const jumpHeight = useRef(0);
  const jumpVelocity = useRef(0);
  const jumpHeld = useRef(false);
  const dragging = useRef(false);
  const manualFollowGraceUntilMs = useRef(0);
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
      scaledSurfaceHeight + cameraTargetHeight,
      currentPosition.z * DETAIL_WORLD_SCALE,
    );
    cameraTarget.addScaledVector(cameraRight, CAMERA_TARGET_SHOULDER_OFFSET);
    const desiredCamera = cameraBase.clone().add(cameraOffset.current);
    const armDirection = desiredCamera.clone().sub(cameraTarget);
    const desiredArmLength = armDirection.length();
    const initialArm = resolvePlanarSpringArm(
      cameraTarget.x / DETAIL_WORLD_SCALE,
      cameraTarget.z / DETAIL_WORLD_SCALE,
      desiredCamera.x / DETAIL_WORLD_SCALE,
      desiredCamera.z / DETAIL_WORLD_SCALE,
      XINHUA_BOUNDARY,
      WORLD_CAMERA_OBSTACLES,
      CAMERA_COLLISION_RADIUS,
      CAMERA_COLLISION_MARGIN,
    );
    resolvedArmLength.current = desiredArmLength * initialArm.fraction;
    // 首页相机离街区很远。进入游玩态时先同步切到角色身后，保证新建的游戏
    // 后处理合成器从正确视角绘制首帧，不把首页全景缓存带进游戏画面。
    camera.position
      .copy(cameraTarget)
      .addScaledVector(armDirection.normalize(), resolvedArmLength.current);
    camera.up.copy(WORLD_UP);
    camera.lookAt(cameraTarget);
    onPositionRef.current([currentPosition.x, currentPosition.z]);
  }, [camera, cameraTargetHeight, initialForward]);

  useEffect(() => {
    onNearRef.current = onNearAction;
  }, [onNearAction]);

  useEffect(() => {
    onPositionRef.current = onPositionChange;
  }, [onPositionChange]);

  useEffect(() => () => {
    onPositionRef.current([characterPosition.current.x, characterPosition.current.z]);
    if (cameraQaEnabled) resetCameraQa();
  }, [cameraQaEnabled]);

  const scratch = useMemo(() => ({
    quaternion: new Quaternion(),
    basis: new Matrix4(),
    right: new Vector3(),
    move: new Vector3(),
    rigForward: new Vector3(),
    rigRight: new Vector3(),
    viewForward: new Vector3(),
    viewRight: new Vector3(),
    cameraHorizontal: new Vector3(),
    desiredHorizontal: new Vector3(),
    displacement: new Vector3(),
    desiredCamera: new Vector3(),
    armDirection: new Vector3(),
    cameraBase: new Vector3(),
    cameraTarget: new Vector3(),
    revertedOffset: new Vector3(),
    springArm: {
      fraction: 1,
      planarDistance: 0,
      blockerId: null as string | null,
    },
  }), []);

  useEffect(() => {
    const canvas = gl.domElement;
    const pointerDown = (event: PointerEvent) => {
      if (dragPointerId.current !== null) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragPointerId.current = event.pointerId;
      lastDragPointer.current = { x: event.clientX, y: event.clientY };
      dragging.current = true;
      manualFollowGraceUntilMs.current = performance.now()
        + CAMERA_MANUAL_FOLLOW_GRACE_SECONDS * 1_000;
      canvas.setPointerCapture(event.pointerId);
    };
    const pointerUp = (event: PointerEvent) => {
      if (dragPointerId.current !== event.pointerId) return;
      dragPointerId.current = null;
      dragging.current = false;
      manualFollowGraceUntilMs.current = performance.now()
        + CAMERA_MANUAL_FOLLOW_GRACE_SECONDS * 1_000;
    };
    const pointerMove = (event: PointerEvent) => {
      if (!dragging.current || dragPointerId.current !== event.pointerId) return;
      const x = event.clientX - lastDragPointer.current.x;
      const y = event.clientY - lastDragPointer.current.y;
      // 切回页面或系统手势可能产生异常大跳变，限制单次增量避免镜头瞬移。
      dragDelta.current.x += Math.max(-120, Math.min(120, x));
      dragDelta.current.y += Math.max(-120, Math.min(120, y));
      manualFollowGraceUntilMs.current = performance.now()
        + CAMERA_MANUAL_FOLLOW_GRACE_SECONDS * 1_000;
      lastDragPointer.current = { x: event.clientX, y: event.clientY };
    };
    const cancelDrag = () => {
      dragPointerId.current = null;
      dragging.current = false;
      manualFollowGraceUntilMs.current = 0;
      dragDelta.current.x = 0;
      dragDelta.current.y = 0;
    };
    const wheel = (event: WheelEvent) => {
      const deltaY = normalizeWheelDeltaY(
        event.deltaY,
        event.deltaMode,
        canvas.clientHeight,
      );
      zoom.current = nextCameraZoomDistance(
        zoom.current,
        deltaY,
        CAMERA_MIN_ZOOM_DISTANCE,
        CAMERA_MAX_ZOOM_DISTANCE,
      );
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
    const manualGraceMs = dragging.current
      ? CAMERA_MANUAL_FOLLOW_GRACE_SECONDS * 1_000
      : remainingDeadlineMs(manualFollowGraceUntilMs.current, performance.now());

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

    if (!dragging.current && manualGraceMs <= 0 && moving) {
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

    // rig 方向决定肩位；移动方向必须取最终真实镜头的屏幕前方，不能忽略肩位偏移。
    s.rigForward.copy(cameraOffset.current).multiplyScalar(-1).projectOnPlane(WORLD_UP);
    if (s.rigForward.lengthSq() < 0.001) s.rigForward.copy(currentForward);
    s.rigForward.normalize();
    s.rigRight.copy(s.rigForward).cross(WORLD_UP).normalize();
    camera.getWorldDirection(s.viewForward).projectOnPlane(WORLD_UP);
    if (s.viewForward.lengthSq() < 0.001) s.viewForward.copy(s.rigForward);
    s.viewForward.normalize();
    s.viewRight.copy(s.viewForward).cross(WORLD_UP).normalize();

    if (moving) {
      cameraRelativeInputToPlanarMove(
        s.viewForward,
        s.viewRight,
        x,
        z,
        s.move,
      ).normalize();
      const speed = inputState.sprint
        ? EXPLORE_RUN_SPEED
        : EXPLORE_WALK_SPEED * (usingAnalog ? analogMagnitude : 1);
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
    if (groundShadow.current) {
      const [sunX, , sunZ] = atmosphere.sunOffset;
      const shadowLength = Math.hypot(sunX, sunZ);
      const shadowX = -sunX / shadowLength;
      const shadowZ = -sunZ / shadowLength;
      groundShadow.current.position.set(
        currentPosition.x * DETAIL_WORLD_SCALE + shadowX * 1.15,
        scaledSurfaceHeight + 0.39,
        currentPosition.z * DETAIL_WORLD_SCALE + shadowZ * 1.15,
      );
      groundShadow.current.rotation.y = Math.atan2(shadowX, shadowZ);
    }

    s.cameraTarget.set(
      currentPosition.x * DETAIL_WORLD_SCALE,
      scaledSurfaceHeight + cameraTargetHeight + jumpHeight.current,
      currentPosition.z * DETAIL_WORLD_SCALE,
    ).addScaledVector(s.rigRight, CAMERA_TARGET_SHOULDER_OFFSET);
    s.cameraBase.set(
      currentPosition.x * DETAIL_WORLD_SCALE,
      scaledSurfaceHeight + 0.33 + jumpHeight.current,
      currentPosition.z * DETAIL_WORLD_SCALE,
    ).addScaledVector(s.rigRight, CAMERA_SHOULDER_OFFSET);
    s.desiredCamera.copy(s.cameraBase).add(cameraOffset.current);
    s.armDirection.subVectors(s.desiredCamera, s.cameraTarget);
    const desiredArmLength = s.armDirection.length();
    const springArm = resolvePlanarSpringArm(
      s.cameraTarget.x / DETAIL_WORLD_SCALE,
      s.cameraTarget.z / DETAIL_WORLD_SCALE,
      s.desiredCamera.x / DETAIL_WORLD_SCALE,
      s.desiredCamera.z / DETAIL_WORLD_SCALE,
      XINHUA_BOUNDARY,
      WORLD_CAMERA_OBSTACLES,
      CAMERA_COLLISION_RADIUS,
      CAMERA_COLLISION_MARGIN,
      s.springArm,
    );
    const collisionArmLength = desiredArmLength * springArm.fraction;
    const previousArmLength = resolvedArmLength.current ?? collisionArmLength;
    const currentResolvedArmLength = stepSpringArmLength(
      previousArmLength,
      collisionArmLength,
      CAMERA_ARM_RECOVERY_DAMPING,
      delta,
    );
    resolvedArmLength.current = currentResolvedArmLength;
    const cameraMode = springArm.blockerId
      ? "spring-compressed"
      : Math.abs(currentResolvedArmLength - desiredArmLength) > 0.02
        ? "spring-recovering"
        : "spring-clear";
    if (desiredArmLength > 1e-6) {
      s.armDirection.multiplyScalar(1 / desiredArmLength);
      camera.position
        .copy(s.cameraTarget)
        .addScaledVector(s.armDirection, currentResolvedArmLength);
    } else {
      camera.position.copy(s.cameraTarget);
    }
    camera.up.copy(WORLD_UP);
    camera.lookAt(s.cameraTarget);
    if (cameraQaEnabled) {
      updateCameraQa({
        active: true,
        inputX: x,
        inputY: z,
        moving,
        fov: (camera as PerspectiveCamera).fov,
        goalYawDegrees: MathUtils.radToDeg(Math.atan2(
          cameraGoalOffset.current.x,
          cameraGoalOffset.current.z,
        )),
        desiredArmYawDegrees: MathUtils.radToDeg(Math.atan2(
          s.desiredCamera.x - s.cameraTarget.x,
          s.desiredCamera.z - s.cameraTarget.z,
        )),
        actualArmYawDegrees: MathUtils.radToDeg(Math.atan2(
          camera.position.x - s.cameraTarget.x,
          camera.position.z - s.cameraTarget.z,
        )),
        desiredArmLength,
        resolvedArmLength: currentResolvedArmLength,
        blockerId: springArm.blockerId,
        cameraMode,
        manualGraceMs,
      });
    }

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

  return (
    <>
      <group ref={groundShadow}>
        <Shadow
          scale={[1.05, 4.4, 1]}
          color="#050807"
          colorStop={0.1}
          opacity={0.38}
          depthWrite={false}
          renderOrder={3}
        />
      </group>
      <WandererCharacter outerRef={outer} />
    </>
  );
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
            <Html
              center
              position={[0, 12.5, 0]}
              distanceFactor={180}
              transform
              sprite
              zIndexRange={[12, 0]}
            >
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

function OverviewWanderer({
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

  return <WandererCharacter outerRef={outer} scale={OVERVIEW_CHARACTER_SCALE} />;
}

function ResponsiveCameraProjection({ exploring }: { exploring: boolean }) {
  useFrame(({ camera, size }) => {
    const perspective = camera as PerspectiveCamera;
    const nextFov = exploring
      ? explorationVerticalFov(size.width, size.height)
      : 50;
    if (Math.abs(perspective.fov - nextFov) < 0.01) return;
    perspective.fov = nextFov;
    perspective.updateProjectionMatrix();
  });

  return null;
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

function AutumnLightRig({
  exploring,
  lowTier,
  atmosphereStyle,
  atmosphere,
}: {
  exploring: boolean;
  lowTier: boolean;
  atmosphereStyle: XinhuaAtmosphereStyle;
  atmosphere: XinhuaAtmosphere;
}) {
  const { camera } = useThree();
  const light = useRef<DirectionalLight>(null);
  const skyFill = useRef<DirectionalLight>(null);
  const focus = useRef(SHADOW_CENTER.clone());
  const desiredFocus = useMemo(() => new Vector3(), []);
  const target = useMemo(() => {
    const result = new Object3D();
    result.position.copy(SHADOW_CENTER);
    return result;
  }, []);
  const [sunX, sunY, sunZ] = atmosphere.sunOffset;
  const [fillX, fillY, fillZ] = atmosphere.skyFillOffset;
  const lightingV3 = atmosphereStyle === "lighting-v3";

  useFrame((_, delta) => {
    desiredFocus.set(
      exploring ? camera.position.x : SHADOW_CENTER.x,
      exploring ? Math.max(1.8, camera.position.y * 0.18) : SHADOW_CENTER.y,
      exploring ? camera.position.z : SHADOW_CENTER.z,
    );
    focus.current.lerp(
      desiredFocus,
      exploring ? dampingFactor(4.8, delta) : dampingFactor(2.4, delta),
    );
    target.position.copy(focus.current);
    target.updateMatrixWorld();
    light.current?.position.set(
      focus.current.x + sunX,
      focus.current.y + sunY,
      focus.current.z + sunZ,
    );
    skyFill.current?.position.set(
      focus.current.x + fillX,
      focus.current.y + fillY,
      focus.current.z + fillZ,
    );
  });

  return (
    <>
      <ambientLight
        color={atmosphere.ambientColor}
        intensity={exploring
          ? atmosphere.ambientIntensity.explore
          : atmosphere.ambientIntensity.overview}
      />
      <hemisphereLight
        args={[
          atmosphere.hemisphereSky,
          atmosphere.hemisphereGround,
          exploring
            ? atmosphere.hemisphereIntensity.explore
            : atmosphere.hemisphereIntensity.overview,
        ]}
      />
      <primitive object={target} />
      <directionalLight
        ref={light}
        position={[SHADOW_CENTER.x + sunX, sunY, SHADOW_CENTER.z + sunZ]}
        target={target}
        intensity={exploring
          ? atmosphere.sunIntensity.explore
          : atmosphere.sunIntensity.overview}
        color={atmosphere.sunColor}
        castShadow
        shadow-mapSize-width={exploring && !lowTier ? 2048 : 1024}
        shadow-mapSize-height={exploring && !lowTier ? 2048 : 1024}
        shadow-camera-near={lightingV3 ? 1 : 0.5}
        shadow-camera-far={lightingV3 ? 280 : 320}
        shadow-camera-left={exploring ? (lightingV3 ? -48 : -72) : -240}
        shadow-camera-right={exploring ? (lightingV3 ? 48 : 72) : 240}
        shadow-camera-top={exploring ? (lightingV3 ? 48 : 72) : 240}
        shadow-camera-bottom={exploring ? (lightingV3 ? -48 : -72) : -240}
        shadow-bias={lightingV3 ? -0.00012 : -0.00018}
        shadow-normalBias={lightingV3 ? 0.012 : 0.018}
        shadow-radius={lightingV3 ? 1.65 : 1}
      />
      <directionalLight
        ref={skyFill}
        position={[
          SHADOW_CENTER.x + fillX,
          fillY,
          SHADOW_CENTER.z + fillZ,
        ]}
        target={target}
        color={atmosphere.skyFillColor}
        intensity={exploring
          ? atmosphere.skyFillIntensity.explore
          : atmosphere.skyFillIntensity.overview}
      />
    </>
  );
}

export function XinhuaWorld({
  mode,
  lowTier,
  atmosphereStyle,
  onNearAction,
  onOpenAction,
  nearPoiId,
  overviewStartPosition,
  destinationPreset,
  cameraQaEnabled = false,
  onNearPoi,
  onPositionChange,
}: {
  mode: "intro" | "overview" | "explore";
  lowTier: boolean;
  atmosphereStyle: XinhuaAtmosphereStyle;
  onNearAction: (near: boolean) => void;
  onOpenAction: () => void;
  nearPoiId: string | null;
  overviewStartPosition: readonly [number, number];
  destinationPreset?: string;
  cameraQaEnabled?: boolean;
  onNearPoi: (poiId: string | null) => void;
  onPositionChange: (position: readonly [number, number]) => void;
}) {
  const exploring = mode === "explore";
  const overview = mode === "overview";
  const atmosphere = XINHUA_ATMOSPHERES[atmosphereStyle];
  const overviewCameraFocus = useRef(new Vector3(
    overviewStartPosition[0],
    terrainHeightAt(overviewStartPosition[0], overviewStartPosition[1]) + 0.33,
    overviewStartPosition[1],
  ));

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
          atmosphere.fog,
          92 * DETAIL_WORLD_SCALE,
          235 * DETAIL_WORLD_SCALE,
        ]} />
      )}
      <color
        attach="background"
        args={[new Color(atmosphere.background)]}
      />
      <AutumnLightRig
        exploring={exploring}
        lowTier={lowTier}
        atmosphereStyle={atmosphereStyle}
        atmosphere={atmosphere}
      />
      <FlatNeighborhood
        onOpenAction={onOpenAction}
        atmosphere={atmosphere}
        detailScale={exploring ? DETAIL_WORLD_SCALE : 1}
        showDetailModels={mode !== "intro"}
        showDetailLabels={false}
        showRoadLabels={!exploring}
        showHeroTree={exploring}
        priorityPreset={destinationPreset}
        landmarkLoadMode={exploring ? "explore" : "overview"}
      />
      <ResponsiveCameraProjection exploring={exploring} />
      <IntroCamera active={mode === "intro"} />
      {overview && (
        <>
          <OverviewPoiMarkers nearPoiId={nearPoiId} />
          <OverviewWanderer
            initialPosition={overviewStartPosition}
            cameraFocus={overviewCameraFocus}
            onNearPoi={onNearPoi}
            onPositionChange={onPositionChange}
          />
        </>
      )}
      <OverviewCamera active={overview} focus={overviewCameraFocus} />
      {exploring && (
        <PlayableWanderer
          onNearAction={onNearAction}
          startPreset={destinationPreset}
          onPositionChange={onPositionChange}
          atmosphere={atmosphere}
          cameraQaEnabled={cameraQaEnabled}
        />
      )}
    </>
  );
}
