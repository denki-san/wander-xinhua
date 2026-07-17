import landmarkData from "./xinhua-landmarks-data.json" with { type: "json" };
import mapData from "./xinhua-map-data.json" with { type: "json" };
import roadLandmarkData from "./xinhua-road-landmarks-data.json" with { type: "json" };

export type MapPoi = {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  position: readonly [number, number];
  startPreset: string;
};

const roadDescriptions: Record<string, string> = {
  "shanghai-cinema": "从新华路的银幕记忆出发，看看上海影城与街区电影文化的新旧交叠。",
  "film-art-center": "沿新华路进入电影艺术中心一带，感受影像、展映与城市生活的连接。",
  "one-step-garden": "藏在新华路弄堂里的花园空间，适合慢下来看看街角植物与小院生活。",
  "xinhua-villas-211": "走进新华路 211 弄的外国弄堂，观察花园住宅与街巷尺度。",
  "xinhua-villas-329": "从新华路 329 弄继续探访成片的历史住宅与安静里弄。",
  "house-315": "靠近新华路 315 号住宅，看看街道沿线保存下来的居住建筑。",
  "villa-le-bec": "一栋被餐饮重新激活的老洋房，也是新华路生活方式变化的一个切片。",
  "shanghai-orchestra": "在上海民族乐团周边闲逛，寻找音乐空间与日常街区相遇的地方。",
  "xinhua-mansion": "探访新华公馆所在的历史建筑群，观察院落、围墙和街道之间的关系。",
};

const majorPois: MapPoi[] = [
  {
    id: "xingfuli",
    name: "幸福里",
    eyebrow: "街区更新 · 番禺路",
    description: "从番禺路入口进入幸福里，在旧工业建筑、街巷商业与公共空间之间慢慢闲逛。",
    position: [
      mapData.landmarks.xingfuli.position[0],
      mapData.landmarks.xingfuli.position[1],
    ],
    startPreset: "xingfuli",
  },
  {
    id: "shangsheng",
    name: "上生·新所",
    eyebrow: "历史建筑群 · 延安西路",
    description: "进入上生·新所，逛孙科别墅、海军俱乐部泳池和哥伦比亚乡村俱乐部等空间。",
    position: [
      landmarkData.shangshengXinsuo.position[0],
      landmarkData.shangshengXinsuo.position[1],
    ],
    startPreset: "shangsheng",
  },
  {
    id: "huashan",
    name: "华山绿地",
    eyebrow: "社区公园 · 华山路",
    description: "从华山绿地开始散步，穿过林荫、草地、球场与连接街区的步行路径。",
    position: [
      landmarkData.huashanGreenland.position[0],
      landmarkData.huashanGreenland.position[1],
    ],
    startPreset: "huashan",
  },
];

const roadPois: MapPoi[] = roadLandmarkData.landmarks.map((landmark) => ({
  id: landmark.id,
  name: landmark.name,
  eyebrow: landmark.address,
  description: roadDescriptions[landmark.id] ?? `从${landmark.address}进入，近距离看看这处新华路地标。`,
  position: [landmark.position[0], landmark.position[1]] as const,
  startPreset: landmark.query,
}));

export const MAP_POIS: MapPoi[] = [...majorPois, ...roadPois];

export function mapPoiById(id: string | null) {
  return MAP_POIS.find((poi) => poi.id === id) ?? null;
}

export function nearestMapPoi(
  position: readonly [number, number],
  maximumDistance: number,
) {
  let nearest: MapPoi | null = null;
  let nearestDistance = maximumDistance;
  for (const poi of MAP_POIS) {
    const distance = Math.hypot(position[0] - poi.position[0], position[1] - poi.position[1]);
    if (distance < nearestDistance) {
      nearest = poi;
      nearestDistance = distance;
    }
  }
  return nearest;
}
