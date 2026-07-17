import { mkdir, writeFile } from "node:fs/promises";

const RUN_STAMP = new Date().toISOString()
  .replace(/[-:]/g, "")
  .replace("T", "-")
  .slice(0, 15);
const OUTPUT = new URL(
  `../docs/research/data/requested-pois-osm-${RUN_STAMP}.json`,
  import.meta.url,
);
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const RESEARCH_BBOX = "31.19,121.40,31.22,121.44";

const targets = [
  {
    id: "hudec-memorial",
    name: "邬达克纪念馆",
    nameTokens: ["邬达克", "Hudec"],
    street: "番禺路",
    houseNumber: "129",
    queries: ["邬达克纪念馆 上海", "番禺路129号 上海"],
    fallback: [31.209864, 121.42541],
    radius: 95,
  },
  {
    id: "xinhua-pocket-park",
    name: "新华路口袋公园",
    nameTokens: ["新华路口袋公园", "Pocket Park"],
    street: "新华路",
    houseNumber: "359",
    queries: ["新华路口袋公园 上海", "新华路359号 上海"],
    fallback: [31.205074365, 121.421193873],
    fallbackEvidence: "新华路359号沿街、345弄入口与既有365弄定位之间的道路投影",
    radius: 110,
  },
  {
    id: "xinhua-community-center",
    name: "新华·社区营造中心",
    nameTokens: ["社区营造中心", "社区营造"],
    street: "新华路",
    houseNumber: "345",
    queries: ["新华社区营造中心 上海", "新华路345弄4号 上海"],
    radius: 135,
  },
  {
    id: "debi-fahua-525",
    name: "德必法华525",
    nameTokens: ["德必法华", "法华525"],
    street: "法华镇路",
    houseNumber: "525",
    queries: ["德必法华525 上海", "法华镇路525号 上海"],
    fallback: [31.206955132, 121.420201356],
    fallbackEvidence: "法华镇路503号近香花桥路、525号在其西侧及525原法华寺遗址的公开资料综合推定",
    radius: 155,
  },
  {
    id: "fics-xinhua-365",
    name: "FICS新华365",
    nameTokens: ["FICS", "新华365", "新华公馆"],
    street: "新华路",
    houseNumber: "365",
    queries: ["FICS新华365 上海", "新华路365弄 上海"],
    fallback: [31.204634705, 121.420655078],
    fallbackEvidence: "既有新华公馆模型位置与新华路365弄完整园区范围综合定位",
    radius: 175,
  },
];

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(120_000),
    headers: {
      "User-Agent": "WanderXinhuaResearch/1.0 (local reference collection)",
      Accept: "application/json",
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

function elementCenter(element) {
  if (Number.isFinite(element.lat) && Number.isFinite(element.lon)) {
    return [Number(element.lat), Number(element.lon)];
  }
  if (Number.isFinite(element.center?.lat) && Number.isFinite(element.center?.lon)) {
    return [Number(element.center.lat), Number(element.center.lon)];
  }
  if (element.geometry?.length) {
    const points = element.geometry.filter(
      (point) => Number.isFinite(point.lat) && Number.isFinite(point.lon),
    );
    if (points.length) {
      return [
        points.reduce((sum, point) => sum + Number(point.lat), 0) / points.length,
        points.reduce((sum, point) => sum + Number(point.lon), 0) / points.length,
      ];
    }
  }
  return null;
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[·\s弄号栋幢\-+＋]/g, "");
}

function seedScore(target, element) {
  const tags = element.tags ?? {};
  const name = normalize([tags.name, tags["name:en"], tags.old_name].join(" "));
  const street = normalize(tags["addr:street"]);
  const houseNumber = normalize(tags["addr:housenumber"]);
  let score = 0;
  if (target.nameTokens.some((token) => name.includes(normalize(token)))) score += 100;
  if (houseNumber.includes(normalize(target.houseNumber))) score += 35;
  if (street.includes(normalize(target.street))) score += 25;
  if (tags.building) score += 3;
  return score;
}

async function fetchOverpass(query) {
  const failures = [];
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(120_000),
      headers: {
        "User-Agent": "WanderXinhuaResearch/1.0 (local reference collection)",
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: new URLSearchParams({ data: query }),
    });
    if (response.ok) {
      return { endpoint, data: await response.json() };
    }
    failures.push(`${response.status} ${response.statusText}: ${endpoint}`);
  }
  throw new Error(`Overpass 查询失败：${failures.join("；")}`);
}

async function fetchSeedElements() {
  const numberPattern = targets.map((target) => target.houseNumber).join("|");
  const namePattern = targets.flatMap((target) => target.nameTokens).join("|");
  const query = `[out:json][timeout:120];
(
  nwr["name"~"${namePattern}",i](${RESEARCH_BBOX});
  nwr["addr:housenumber"~"^(${numberPattern})(弄|号)?$",i](${RESEARCH_BBOX});
);
out tags center geom;`;
  const response = await fetchOverpass(query);
  return { query, endpoint: response.endpoint, result: response.data };
}

async function geocode(target, seedElements) {
  const rankedSeeds = seedElements
    .map((element) => ({ element, score: seedScore(target, element), center: elementCenter(element) }))
    .filter((candidate) => candidate.score > 0 && candidate.center)
    .sort((a, b) => b.score - a.score);
  const selectedSeed = rankedSeeds[0];
  if (selectedSeed && selectedSeed.score >= 35) {
    return {
      attempts: [],
      selected: selectedSeed.element,
      latitude: selectedSeed.center[0],
      longitude: selectedSeed.center[1],
      inferred: selectedSeed.score < 100,
      source: "overpass-seed",
      seedScore: selectedSeed.score,
    };
  }
  if (target.fallback) {
    return {
      attempts: [],
      selected: null,
      latitude: target.fallback[0],
      longitude: target.fallback[1],
      inferred: true,
      source: "manual-fallback",
      evidence: target.fallbackEvidence ?? "已有项目研究快照",
    };
  }

  const attempts = [];
  for (const query of target.queries) {
    const url = new URL(NOMINATIM);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "5");
    const results = await fetchJson(url);
    attempts.push({ query, url: url.toString(), results });
    if (results.length) {
      return {
        attempts,
        selected: results[0],
        latitude: Number(results[0].lat),
        longitude: Number(results[0].lon),
        inferred: false,
        source: "nominatim",
      };
    }
  }
  if (!target.fallback) throw new Error(`无法定位：${target.name}`);
  return {
    attempts,
    selected: null,
    latitude: target.fallback[0],
    longitude: target.fallback[1],
    inferred: true,
    source: "manual-fallback",
    evidence: target.fallbackEvidence ?? "已有项目研究快照",
  };
}

function selectorsForTarget(target, latitude, longitude) {
  const around = `(around:${target.radius},${latitude},${longitude})`;
  return `
  nwr["name"]${around};
  nwr["addr:housenumber"]${around};
  way["building"]${around};
  way["highway"]${around};
  way["leisure"]${around};
  way["amenity"]${around};`;
}

function overpassQuery(locations) {
  return `[out:json][timeout:120];
(
${locations.map(({ target, location }) => selectorsForTarget(
    target,
    location.latitude,
    location.longitude,
  )).join("\n")}
);
out tags center geom;`;
}

function distanceMeters(latitudeA, longitudeA, latitudeB, longitudeB) {
  const latitudeScale = 110_540;
  const longitudeScale = 111_320 * Math.cos(
    ((latitudeA + latitudeB) * 0.5 * Math.PI) / 180,
  );
  return Math.hypot(
    (latitudeA - latitudeB) * latitudeScale,
    (longitudeA - longitudeB) * longitudeScale,
  );
}

const seed = await fetchSeedElements();
const locations = [];
for (const target of targets) {
  locations.push({
    target,
    location: await geocode(target, seed.result.elements),
  });
}
const query = overpassQuery(locations);
const neighborhood = await fetchOverpass(query);
const collected = locations.map(({ target, location }) => {
  const elements = neighborhood.data.elements.filter((element) => {
    const center = elementCenter(element);
    return center && distanceMeters(
      location.latitude,
      location.longitude,
      center[0],
      center[1],
    ) <= target.radius;
  });
  return {
    target,
    location,
    overpass: {
      endpoint: neighborhood.endpoint,
      query,
      osm3s: neighborhood.data.osm3s,
      elements,
    },
  };
});

await mkdir(new URL("../docs/research/data/", import.meta.url), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify({
  fetchedAt: new Date().toISOString(),
  seed: {
    endpoint: seed.endpoint,
    query: seed.query,
    osm3s: seed.result.osm3s,
    elements: seed.result.elements,
  },
  targets: collected,
}, null, 2)}\n`);

console.log(OUTPUT.pathname);
