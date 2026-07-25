import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const runtimePath = "app/scene/xinhua-road-landmarks-data.json";
const inventoryPath =
  "docs/research/data/xinhua-building-inventory-20260724-185400.json";
const outputPath = "docs/research/xinhua-road-map-binding-audit.json";
const authoredMetersPerSceneUnit = 2.7;

const decisions = {
  "shanghai-cinema": {
    geometryRole: "building",
    status: "bound",
    confidence: "high",
    wayIds: [292250766],
    evidence:
      "OSM 名称虽写 Shanghai Film Art Center，但门牌明确为新华路160号，位置和大体量轮廓与上海影城场地闭合。",
    recommendedAction: "保留绑定；下一轮按真实 footprint 校准分体和 scale。",
  },
  "film-art-center": {
    geometryRole: "building",
    status: "candidate-pending",
    confidence: "medium",
    wayIds: [864505138],
    evidence: "候选位置和体量相近，但 OSM 缺少名称与门牌字段。",
    recommendedAction: "补门牌或现场总平证据后再移动、缩放或改朝向。",
  },
  "one-step-garden": {
    geometryRole: "compound",
    status: "candidate-pending",
    confidence: "low",
    wayIds: [864485599],
    evidence:
      "候选靠近179号手工落点，但无门牌；照片已证明沿街白楼和后院红砖楼是不同体量。",
    recommendedAction: "先保留现有落点；补齐第二体量 footprint 后再做 compound 绑定。",
  },
  "xinhua-villas-211": {
    geometryRole: "compound",
    status: "compound-candidates-pending",
    confidence: "medium",
    wayIds: [864485596, 864485676, 864485597, 864485675, 864485593],
    evidence: "五个相邻 footprint 与弄堂组团吻合，但各成员门牌和照片尚未一一闭合。",
    recommendedAction: "按成员建立子建筑记录；禁止把五栋合并为单一大盒。",
  },
  "xinhua-villas-329": {
    geometryRole: "compound",
    status: "compound-candidates-pending",
    confidence: "medium",
    wayIds: [864493174, 864493244, 864485664, 864493173, 864493245],
    evidence: "候选组成相邻花园住宅组团，但代表建筑与各门牌尚未闭合。",
    recommendedAction: "保留组团候选；逐栋匹配照片和门牌后再确定 Hero 主体。",
  },
  "house-315": {
    geometryRole: "building",
    status: "candidate-pending",
    confidence: "medium",
    wayIds: [864485667],
    evidence: "候选距离手工落点近且轮廓规模合理，但 OSM 缺少315号门牌。",
    recommendedAction: "以候选约束 Massing；未闭合门牌前不直接替换运行时落点和 yaw。",
  },
  "villa-le-bec": {
    geometryRole: "compound",
    status: "candidate-pending",
    confidence: "low",
    wayIds: [864493176],
    evidence: "候选接近321号手工落点，但面积只可能覆盖组团中的单体，且无门牌字段。",
    recommendedAction: "继续找主住宅与原车库 footprint；未闭合前不合并场地。",
  },
  "shanghai-orchestra": {
    geometryRole: "compound",
    status: "candidate-pending",
    confidence: "low",
    wayIds: [864505166],
    evidence: "候选位于336号组团附近，但不能代表6、7、8号楼和保留体量的完整 compound。",
    recommendedAction: "按 TJAD 总平/子楼资料绑定各 footprint 后再重构 Hero。",
  },
  "hudec-memorial": {
    geometryRole: "building",
    status: "bound",
    confidence: "high",
    wayIds: [494633921],
    evidence: "OSM 同时具备邬达克纪念馆中英文名称、番禺路129号、三层和完整 footprint。",
    recommendedAction: "将 pivot 校准到 footprint；轴线 yaw 不能直接当入口朝向。",
  },
  "xinhua-pocket-park": {
    geometryRole: "site-feature",
    status: "not-a-building",
    confidence: "high",
    wayIds: [],
    evidence: "口袋公园是入口、墙、花池、路径和植被场地，不应绑定最近建筑 footprint。",
    recommendedAction: "使用场地边界和道路关系核验位置、尺度与朝向。",
  },
  "xinhua-community-center": {
    geometryRole: "building",
    status: "bound-with-node-corroboration",
    confidence: "medium",
    wayIds: [864493234],
    nodeIds: [13765678129],
    evidence: "way 提供 footprint，命名 OSM node 提供新华·社区营造中心主体语义，二者位置闭合。",
    recommendedAction: "保留组合绑定；下一轮校验4号楼入口与 footprint 正向。",
  },
  "debi-fahua-525": {
    geometryRole: "compound",
    status: "compound-candidates-pending",
    confidence: "medium",
    wayIds: [864847921, 864847920, 228966550, 864847917, 228966551],
    evidence: "五个相邻 footprint 覆盖园区组团，但子楼名称、入口和改造阶段未逐栋闭合。",
    recommendedAction: "逐栋建立子记录，并保留庭院和连通路径。",
  },
  "fahua-heritage": {
    geometryRole: "site-feature",
    status: "not-a-building",
    confidence: "high",
    wayIds: [],
    evidence: "法华遗韵是三间景观构筑物与展陈场地，最近建筑不能作为其 footprint。",
    recommendedAction: "按构筑物、展板和道路交会关系做场地校验。",
  },
  "fics-xinhua-365": {
    geometryRole: "compound",
    status: "compound-candidates-pending",
    confidence: "medium",
    wayIds: [864493178, 864493177, 864493179, 864493181, 864493230],
    evidence: "候选形成新华365园区组团，但主楼、配楼和庭院边界仍需照片/总平逐一闭合。",
    recommendedAction: "拆成子建筑记录；禁止用单一 GLB 根碰撞盒封闭园区。",
  },
};

function round(value, digits = 4) {
  return Number(value.toFixed(digits));
}

function axisDelta(a, b) {
  const halfTurn = Math.PI;
  let delta = Math.abs(a - b) % halfTurn;
  if (delta > halfTurn / 2) delta = halfTurn - delta;
  return round(delta);
}

function boundsMetrics(bounds, scale) {
  const widthSceneUnits = (bounds.maxX - bounds.minX) * scale;
  const depthSceneUnits = (bounds.maxZ - bounds.minZ) * scale;
  return {
    widthSceneUnits: round(widthSceneUnits),
    depthSceneUnits: round(depthSceneUnits),
    widthMeters: round(widthSceneUnits * authoredMetersPerSceneUnit, 2),
    depthMeters: round(depthSceneUnits * authoredMetersPerSceneUnit, 2),
    envelopeAreaSqMeters: round(
      widthSceneUnits *
        depthSceneUnits *
        authoredMetersPerSceneUnit *
        authoredMetersPerSceneUnit,
      1,
    ),
    note: "包络面积包含退界与场地，不等于建筑 footprint 面积。",
  };
}

const runtime = JSON.parse(await readFile(runtimePath, "utf8"));
const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
const buildingsByOsmId = new Map(
  inventory.buildings.map((building) => [building.osm.id, building]),
);

assert.equal(runtime.landmarks.length, 14);
assert.deepEqual(
  new Set(runtime.landmarks.map(({ id }) => id)),
  new Set(Object.keys(decisions)),
);

const entries = runtime.landmarks.map((landmark) => {
  const decision = decisions[landmark.id];
  const candidates = decision.wayIds.map((wayId) => {
    const building = buildingsByOsmId.get(wayId);
    assert.ok(building, `OSM way ${wayId} 不在建筑清单`);
    const [x, z] = building.positioning.authoredPosition;
    const dx = x - landmark.position[0];
    const dz = z - landmark.position[1];
    const distanceSceneUnits = Math.hypot(dx, dz);
    const candidateArea = building.positioning.footprintAreaSqMeters;
    const runtimeEnvelope = boundsMetrics(landmark.localBounds, landmark.scale);
    return {
      id: building.id,
      osmType: building.osm.type,
      osmId: wayId,
      name: building.osm.name,
      address: building.osm.address,
      authoredPosition: building.positioning.authoredPosition,
      distanceFromRuntimeSceneUnits: round(distanceSceneUnits),
      distanceFromRuntimeMeters: round(
        distanceSceneUnits * authoredMetersPerSceneUnit,
        2,
      ),
      footprintAreaSqMeters: candidateArea,
      runtimeEnvelopeToFootprintAreaRatio: round(
        runtimeEnvelope.envelopeAreaSqMeters / candidateArea,
        3,
      ),
      footprintAxisYawRadians: building.positioning.axisYawRadians,
      runtimeYawRadians: landmark.yaw,
      axisDeltaModuloPiRadians: axisDelta(
        building.positioning.axisYawRadians,
        landmark.yaw,
      ),
      yawEvidence: building.positioning.yawEvidence,
      axisIsNotEntranceDirection: true,
      horizontalScaleEvidence: building.positioning.scaleEvidence.horizontal,
      verticalScaleEvidence: building.positioning.scaleEvidence.vertical,
    };
  });

  return {
    runtimeId: landmark.id,
    query: landmark.query,
    name: landmark.name,
    address: landmark.address,
    geometryRole: decision.geometryRole,
    decision: {
      status: decision.status,
      confidence: decision.confidence,
      evidence: decision.evidence,
      recommendedAction: decision.recommendedAction,
      movementAuthorized: false,
      reason:
        "本轮先记录和核验；只有高置信绑定完成照片、门牌、footprint、尺度与入口方向闭环后才允许改运行时 placement。",
    },
    runtimeBaseline: {
      position: landmark.position,
      yawRadians: landmark.yaw,
      scale: landmark.scale,
      localBounds: landmark.localBounds,
      localObstacles: landmark.localObstacles,
      boundsMetrics: boundsMetrics(landmark.localBounds, landmark.scale),
    },
    osmWayCandidates: candidates,
    corroboratingOsmNodes: decision.nodeIds ?? [],
  };
});

const audit = {
  version: 1,
  auditedAt: "2026-07-25",
  status: "map-audit-recorded-placement-changes-not-authorized",
  coordinateContract: {
    authoredMetersPerSceneUnit,
    axis: "X east, Y up, Z south",
    yawRule:
      "footprint 最长边只证明体块轴线，不证明入口或 canonical 正向；yaw 必须由照片、入口和道路关系共同闭合。",
    scaleRule:
      "runtime bounds 是模型包络，OSM area 是 footprint；二者只用于风险比较，不直接按面积比缩放。",
  },
  sourceSnapshots: {
    runtime: runtimePath,
    osmBuildings: inventoryPath,
    namedNodeEvidence:
      "docs/research/data/requested-pois-osm-20260717-103840.json",
  },
  summary: {
    entries: entries.length,
    bound: entries.filter(({ decision }) =>
      decision.status.startsWith("bound"),
    ).length,
    pending: entries.filter(({ decision }) =>
      decision.status.includes("pending"),
    ).length,
    notBuildings: entries.filter(
      ({ decision }) => decision.status === "not-a-building",
    ).length,
    runtimePlacementsChanged: 0,
  },
  entries,
};

const serialized = `${JSON.stringify(audit, null, 2)}\n`;
if (process.argv.includes("--check")) {
  const existing = await readFile(outputPath, "utf8");
  assert.equal(existing, serialized, `${outputPath} 已与生成逻辑漂移`);
  console.log(`校验通过：${entries.length} 个道路 POI 地图审计记录未漂移。`);
} else {
  await writeFile(outputPath, serialized);
  console.log(`已写入 ${outputPath}，共 ${entries.length} 个道路 POI。`);
}
