# Xinhua Road Subdistrict map reference

## 范围基准

新华路街道的官方四至为：东起江苏路、兴国路，西至凯旋路，南临淮海西路，北抵延安西路；辖区面积 2.2 平方公里。

- 官方来源：<https://zwgk.shcn.gov.cn/xxgk/qtzcwj-xhljdzcwj/2022/286/63744.html>
- OpenStreetMap 行政边界：relation `13469094`
- OSM 页面：<https://www.openstreetmap.org/relation/13469094>

## 数据快照

2026-07-16 使用 Nominatim 与 Overpass API 保存原始数据，不在运行时联网取图。首次抓取保留为：

- `docs/research/data/xinhua-boundary-osm-20260716.json`
- `docs/research/data/xinhua-roads-osm-20260716.json`

补充地下、覆盖道路标记后的当前生成基线也单独保留，没有覆盖首次数据：

- `docs/research/data/xinhua-boundary-osm-20260716-063706.json`
- `docs/research/data/xinhua-roads-osm-20260716-063706.json`

生成后的运行时地图数据为 `app/scene/xinhua-map-data.json`：

- 59 个简化后的行政边界折点；
- 308 段经过边界裁切的道路数据，其中 301 段为当前渲染的地表道路；
- 33 条有名称道路，并保留无名住宅路、里弄和 service road；
- 主干道路面使用深灰柏油材质，支路按道路等级递减宽度；
- `tunnel`、`covered` 或负 layer 道路保留在结构化数据中，但不冒充地表道路渲染；
- 水平比例统一为 1 个场景单位对应 13.5 米。

当前阶段不抓取或生成全街道建筑体量。除幸福里外，建筑留待后续按同一投影比例补充，避免把假建筑当成真实空间信息。

## 幸福里定位

- OpenStreetMap way：`400066625`
- OSM 页面：<https://www.openstreetmap.org/way/400066625>
- 公开地址：幸福路 67 号 / 番禺路 381 号
- OSM 中心线长度：约 147.7 米
- 场景锚点：`[21.3332, 2.5809]`
- 全局旋转：`2.997763` radians
- 水平缩放：`0.11638`

幸福里模型只在 Y 轴使用独立的风格化高度缩放；X/Z 位置、方向、长度和碰撞盒始终使用同一个地图投影与水平缩放。

## 重新生成

```bash
/opt/homebrew/bin/node scripts/test_generate_xinhua_map.mjs
```

脚本会用秒级时间戳和 `wx` 写入模式保存新的原始抓取结果，再生成边界裁切后的运行时数据；同名文件存在时会直接失败，不覆盖或删除既有抓取数据。

## 数据许可

地图数据来自 OpenStreetMap contributors，依据 ODbL 1.0 使用。页面页脚与 `docs/THIRD_PARTY_NOTICES.md` 均保留公开署名。

- <https://www.openstreetmap.org/copyright>
