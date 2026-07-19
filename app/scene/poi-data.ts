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

// 全览相机的朝向固定，因此可以为密集地标保留稳定的屏幕空间错位。
// 这些偏移只移动名称牌，不改变真实 POI 坐标或建筑落点。
export const OVERVIEW_POI_LABEL_OFFSETS: Readonly<
  Record<string, readonly [number, number]>
> = {
  xingfuli: [0, -12],
  shangsheng: [0, -12],
  huashan: [0, -12],
  "shanghai-cinema": [18, 4],
  "film-art-center": [68, -18],
  "one-step-garden": [20, 8],
  "xinhua-villas-211": [-20, -8],
  "xinhua-villas-329": [-18, -26],
  "house-315": [54, 20],
  "villa-le-bec": [-58, 22],
  "shanghai-orchestra": [26, -16],
  "hudec-memorial": [0, -12],
  "xinhua-pocket-park": [-34, 26],
  "xinhua-community-center": [-18, 2],
  "debi-fahua-525": [0, -12],
  "fahua-heritage": [34, 8],
  "fics-xinhua-365": [-30, -26],
};

const roadPhotos: Record<string, MapPoi["photo"]> = {
  "shanghai-cinema": {
    src: "/images/poi-thumbnails/shanghai-cinema.jpg",
    sourceLabel: "CGTN",
    sourceUrl: "https://news.cgtn.com/news/2023-06-14/Upgraded-Shanghai-Film-Art-Center-offers-more-immersive-experience-1kCY4faLMkw/index.html",
  },
  "film-art-center": {
    src: "/images/poi-thumbnails/film-art-center.jpg",
    sourceLabel: "PR Newswire",
    sourceUrl: "https://www.prnewswire.com/apac/news-releases/fod-and-shanghai-film-art-center-debut-as-cultural-hub-amidst-26th-shanghai-international-film-festival-302175363.html",
  },
  "one-step-garden": {
    src: "/images/poi-thumbnails/one-step-garden.jpg",
    sourceLabel: "Time Out Shanghai",
    sourceUrl: "https://www.timeoutshanghai.cn/features/6714.html",
  },
  "xinhua-villas-211": {
    src: "/images/poi-thumbnails/xinhua-villas-211.jpg",
    sourceLabel: "上海长宁",
    sourceUrl: "https://www.shcn.gov.cn/col7343/20241227/1275366.html",
  },
  "xinhua-villas-329": {
    src: "/images/poi-thumbnails/xinhua-villas-329.jpg",
    sourceLabel: "上海长宁",
    sourceUrl: "https://www.shcn.gov.cn/col7343/20241227/1275366.html",
  },
  "house-315": {
    src: "/images/poi-thumbnails/house-315.jpg",
    sourceLabel: "上观新闻",
    sourceUrl: "https://www.jfdaily.com/sgh/detail?id=1697461",
  },
  "villa-le-bec": {
    src: "/images/poi-thumbnails/villa-le-bec.jpg",
    sourceLabel: "SmartShanghai",
    sourceUrl: "https://www.smartshanghai.com/venue/11099/villa_le_bec",
  },
  "shanghai-orchestra": {
    src: "/images/poi-thumbnails/shanghai-orchestra.jpg",
    sourceLabel: "gooood",
    sourceUrl: "https://www.gooood.cn/renovation-project-of-shanghai-chinese-orchestra-located-at-no-336-xinhua-road-phase-i-china-by-tjad.htm",
  },
  "xinhua-mansion": {
    src: "https://cn.storage.shmedia.tech/7a1732403fbe49449851aa2c8bfb53cd.jpeg",
    sourceLabel: "上海长宁",
    sourceUrl: "https://www.shcn.gov.cn/col5441/20230426/1235276.html",
  },
  "hudec-memorial": {
    src: "/images/poi-thumbnails/hudec-memorial.jpg",
    sourceLabel: "Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Hudec_House.jpeg",
  },
  "xinhua-pocket-park": {
    src: "/images/poi-thumbnails/xinhua-pocket-park.jpg",
    sourceLabel: "水石设计 / mooool",
    sourceUrl: "https://mooool.com/pocket-park-on-xinhua-road-shanghai-byshuishi.html",
  },
  "xinhua-community-center": {
    src: "/images/poi-thumbnails/xinhua-community-center.jpg",
    sourceLabel: "上海长宁",
    sourceUrl: "https://www.shcn.gov.cn/col7343/20230609/1237981.html",
  },
  "debi-fahua-525": {
    src: "/images/poi-thumbnails/debi-fahua-525.jpg",
    sourceLabel: "德必集团",
    sourceUrl: "https://www.dobechina.com/projects/mandr/77",
  },
  "fahua-heritage": {
    src: "/images/poi-thumbnails/fahua-heritage.jpg",
    sourceLabel: "澎湃新闻",
    sourceUrl: "https://www.thepaper.cn/newsDetail_forward_11011983",
  },
  "fics-xinhua-365": {
    src: "/images/poi-thumbnails/fics-xinhua-365.jpg",
    sourceLabel: "上观新闻",
    sourceUrl: "https://sghexport.shobserver.com/html/baijiahao/2024/07/02/1368152.html",
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
  "hudec-memorial": "走近番禺路上的邬达克旧居，从半木构立面、陡坡屋顶和前院理解这位建筑师的上海生活。",
  "xinhua-pocket-park": "走进不足四米宽的狭长花园，在镜墙、花境和弯曲步道之间体验街角微更新。",
  "xinhua-community-center": "进入新华社区的公共客厅，看看草坪、花园、运动角和玩具交换屋如何连接邻里生活。",
  "debi-fahua-525": "从法华镇路进入四进庭院，经过竹林、鱼池、古银杏与由旧建筑更新而来的办公空间。",
  "fahua-heritage": "穿过法华镇路口的纪念牌坊，从地名与街巷中寻找法华镇的历史线索。",
  "fics-xinhua-365": "漫游由花园洋房、红砖厂房和工业建筑共同更新而成的园区，观察不同年代空间的叠合。",
};

const majorPois: MapPoi[] = [
  {
    id: "xingfuli",
    name: "幸福里",
    eyebrow: "街区更新 · 番禺路",
    description: "从番禺路入口进入幸福里，在旧工业建筑、街巷商业与公共空间之间慢慢闲逛。",
    photo: {
      src: "/images/poi-thumbnails/xingfuli.jpg",
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
      src: "/images/poi-thumbnails/shangsheng.jpg",
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
      src: "/images/poi-thumbnails/huashan.jpg",
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
