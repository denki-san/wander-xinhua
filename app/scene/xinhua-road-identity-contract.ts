export type XinhuaRoadIdentityKind =
  | "cinema"
  | "arts-cluster"
  | "garden-house"
  | "villa-row"
  | "townhouse"
  | "modern-villa"
  | "orchestra-hall"
  | "memorial-villa"
  | "pocket-park"
  | "community-center"
  | "industrial-campus"
  | "heritage-gate"
  | "creative-campus";

/**
 * 全览 Identity 不读取 GLB，而是用每处地标自己的轻量建筑缩影维持识别性。
 * 映射必须覆盖 xinhua-road-landmarks-data.json 中的全部地标。
 */
export const XINHUA_ROAD_IDENTITY_KIND_BY_ID = {
  "shanghai-cinema": "cinema",
  "film-art-center": "arts-cluster",
  "one-step-garden": "garden-house",
  "xinhua-villas-211": "villa-row",
  "xinhua-villas-329": "villa-row",
  "house-315": "townhouse",
  "villa-le-bec": "modern-villa",
  "shanghai-orchestra": "orchestra-hall",
  "hudec-memorial": "memorial-villa",
  "xinhua-pocket-park": "pocket-park",
  "xinhua-community-center": "community-center",
  "debi-fahua-525": "industrial-campus",
  "fahua-heritage": "heritage-gate",
  "fics-xinhua-365": "creative-campus",
} as const satisfies Record<string, XinhuaRoadIdentityKind>;

export function xinhuaRoadIdentityKind(landmarkId: string): XinhuaRoadIdentityKind {
  return XINHUA_ROAD_IDENTITY_KIND_BY_ID[
    landmarkId as keyof typeof XINHUA_ROAD_IDENTITY_KIND_BY_ID
  ] ?? "townhouse";
}
