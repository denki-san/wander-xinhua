import { writeFile } from "node:fs/promises";

const output = new URL("../docs/research/data/xinhua-landmarks-overpass-20260717.json", import.meta.url);
const bbox = "31.19,121.40,31.22,121.44";
const query = `[out:json][timeout:120];(
  nwr["name"~"上海影城|上海电影艺术中心|一尺花园|安和花园|外国弄堂|新华别墅|Villa Le Bec|上海民族乐团|新华公馆",i](${bbox});
  nwr["addr:street"="新华路"]["addr:housenumber"~"^(160|179|200|211|315|321|329|336|365)"](${bbox});
  way["heritage"](${bbox});
);out tags center geom;`;

const endpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

let result;
const errors = [];
for (const endpoint of endpoints) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "wander-xinhua-research/0.1",
      },
      body: new URLSearchParams({ data: query }),
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    result = await response.json();
    result.research = { endpoint, query, fetchedAt: new Date().toISOString() };
    break;
  } catch (error) {
    errors.push(`${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (!result) throw new Error(`所有 Overpass 端点均失败：${errors.join(" | ")}`);
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ output: output.pathname, elements: result.elements.length, errors }, null, 2));
