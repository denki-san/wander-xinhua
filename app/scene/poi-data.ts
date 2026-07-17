import landmarkData from "./xinhua-landmarks-data.json" with { type: "json" };
import mapData from "./xinhua-map-data.json" with { type: "json" };
import roadLandmarkData from "./xinhua-road-landmarks-data.json" with { type: "json" };

export type MapPoi = {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  photo: {
    src: string;
    sourceLabel: string;
    sourceUrl: string;
  };
  position: readonly [number, number];
  startPreset: string;
};

const roadPhotos: Record<string, MapPoi["photo"]> = {
  "shanghai-cinema": {
    src: "https://news.cgtn.com/news/2023-06-14/Upgraded-Shanghai-Film-Art-Center-offers-more-immersive-experience-1kCY4faLMkw/img/196572101df24a5fb3e6f263fe6af184/196572101df24a5fb3e6f263fe6af184-1920.jpeg",
    sourceLabel: "CGTN",
    sourceUrl: "https://news.cgtn.com/news/2023-06-14/Upgraded-Shanghai-Film-Art-Center-offers-more-immersive-experience-1kCY4faLMkw/index.html",
  },
  "film-art-center": {
    src: "https://mma.prnewswire.com/media/2441607/Shanghai_Film_Art_Center.jpg?w=900",
    sourceLabel: "PR Newswire",
    sourceUrl: "https://www.prnewswire.com/apac/news-releases/fod-and-shanghai-film-art-center-debut-as-cultural-hub-amidst-26th-shanghai-international-film-festival-302175363.html",
  },
  "one-step-garden": {
    src: "https://img.timeoutshanghai.cn/202208/20220815050534554_Large.png",
    sourceLabel: "Time Out Shanghai",
    sourceUrl: "https://www.timeoutshanghai.cn/features/6714.html",
  },
  "xinhua-villas-211": {
    src: "https://cn.storage.shmedia.tech/ce5e6057fec24a38b5c4f6c4aa98b20b",
    sourceLabel: "上海长宁",
    sourceUrl: "https://www.shcn.gov.cn/col7343/20241227/1275366.html",
  },
  "xinhua-villas-329": {
    src: "https://cn.storage.shmedia.tech/13acf65ddfc74a1babd61397d5bd0d60",
    sourceLabel: "上海长宁",
    sourceUrl: "https://www.shcn.gov.cn/col7343/20241227/1275366.html",
  },
  "house-315": {
    src: "https://sghimages.shobserver.com/img/style/2026/01/19/092a3260-549c-4d15-8161-ef7637cc6197.jpg",
    sourceLabel: "上观新闻",
    sourceUrl: "https://www.jfdaily.com/sgh/detail?id=1697461",
  },
  "villa-le-bec": {
    src: "https://images.smartshanghai.com.cn/uploads/repository/2020/07/22/4d465399-eb52-4066-9139-6c5ca1697bb3.jpeg",
    sourceLabel: "SmartShanghai",
    sourceUrl: "https://www.smartshanghai.com/venue/11099/villa_le_bec",
  },
  "shanghai-orchestra": {
    src: "https://oss.gooood.cn/uploads/2019/07/000-renovation-project-of-shanghai-chinese-orchestra-located-at-no-336-xinhua-road-phase-i-china-by-tjad-472x303.jpg",
    sourceLabel: "gooood",
    sourceUrl: "https://www.gooood.cn/renovation-project-of-shanghai-chinese-orchestra-located-at-no-336-xinhua-road-phase-i-china-by-tjad.htm",
  },
  "xinhua-mansion": {
    src: "https://cn.storage.shmedia.tech/7a1732403fbe49449851aa2c8bfb53cd.jpeg",
    sourceLabel: "上海长宁",
    sourceUrl: "https://www.shcn.gov.cn/col5441/20230426/1235276.html",
  },
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
    photo: {
      src: "https://n.sinaimg.cn/sinakd20121/560/w1080h1080/20220310/ff2f-6c37175fe7efdf622685985fa90c0b99.jpg",
      sourceLabel: "上海商报",
      sourceUrl: "https://k.sina.com.cn/article_7517400647_1c0126e47059031uwk.html",
    },
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
    photo: {
      src: "https://cn.storage.shmedia.tech/af8b4d0831f444339b8ec18be74b6025",
      sourceLabel: "上海长宁",
      sourceUrl: "https://www.shcn.gov.cn/col7344/20240327/1257062.html",
    },
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
    photo: {
      src: "https://cn.storage.shmedia.tech/709aa6b87fe44a168204ef5486040eea",
      sourceLabel: "上海长宁",
      sourceUrl: "https://www.shcn.gov.cn/col6991/20250824/1296845.html",
    },
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
  photo: roadPhotos[landmark.id],
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
