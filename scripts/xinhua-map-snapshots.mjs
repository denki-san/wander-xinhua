import { readFile, readdir } from "node:fs/promises";

function snapshotStamp(name) {
  const match = name.match(/(\d{8})(?:-(\d{6}))?/);
  return match ? `${match[1]}${match[2] ?? "000000"}` : "";
}

export async function loadLatestCompleteRawSnapshot({
  researchDir,
  relationId,
  xingfuliWayId,
}) {
  const names = await readdir(researchDir);
  const roadNames = names
    .filter((name) => /^xinhua-roads-osm-\d{8}(?:-\d{6})?\.json$/.test(name))
    .sort((left, right) => snapshotStamp(right).localeCompare(snapshotStamp(left)));
  const errors = [];

  for (const roadName of roadNames) {
    const boundaryName = roadName.replace("xinhua-roads-", "xinhua-boundary-");
    if (!names.includes(boundaryName)) {
      errors.push(`${roadName}: 缺少配对边界文件`);
      continue;
    }

    try {
      const boundarySearch = JSON.parse(await readFile(new URL(boundaryName, researchDir), "utf8"));
      const roadData = JSON.parse(await readFile(new URL(roadName, researchDir), "utf8"));
      const boundary = Array.isArray(boundarySearch)
        ? boundarySearch.find((result) => result.osm_type === "relation" && result.osm_id === relationId)
        : null;
      const xingfuliWay = Array.isArray(roadData?.elements)
        ? roadData.elements.find((element) => element.id === xingfuliWayId)
        : null;

      if (boundary?.geojson?.type !== "Polygon") throw new Error("缺少有效行政边界 relation");
      if (!Array.isArray(roadData?.elements)) throw new Error("缺少道路 elements 数组");
      if (!xingfuliWay?.geometry || xingfuliWay.geometry.length < 2) throw new Error("缺少幸福里中心线 way");

      return {
        boundaryName,
        boundarySearch,
        roadName,
        roadData,
      };
    } catch (error) {
      errors.push(`${roadName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`没有可用于离线重放的完整 OSM 原始快照：\n${errors.join("\n")}`);
}
