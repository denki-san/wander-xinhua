import type { MapObstacle } from "./world-math";

export const SHANGSHENG_FACILITIES = {
  cafe: [7, 7],
  bicycleParking: [43, -3],
  readingTerrace: [-15, 30],
  wayfinding: [
    [54, -11, -0.18],
    [18, 9, 0.7],
  ],
} as const;

export const SHANGSHENG_LOCAL_FACILITY_OBSTACLES: MapObstacle[] = [
  { minX: 5.25, maxX: 8.75, minZ: 5.25, maxZ: 8.75 },
  { minX: 40.2, maxX: 45.8, minZ: -3.75, maxZ: -2.25 },
  { minX: -16.5, maxX: -13.5, minZ: 28.5, maxZ: 31.5 },
  { minX: 53.4, maxX: 54.6, minZ: -11.6, maxZ: -10.4 },
  { minX: 17.4, maxX: 18.6, minZ: 8.4, maxZ: 9.6 },
];

export const SHANGSHENG_FACILITY_CLEARANCES = [
  { x: 7, z: 7, radius: 5.2 },
  { x: 43, z: -3, radius: 4.2 },
  { x: -15, z: 30, radius: 6.2 },
  { x: 54, z: -11, radius: 1.4 },
  { x: 18, z: 9, radius: 1.4 },
] as const;
