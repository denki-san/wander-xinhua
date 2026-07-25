# OSM Ordinary Buildings Massing Model Brief

## Overview

- Asset package: `osm-ordinary-buildings`
- Tier: `Massing`
- Scope: 新华路街道行政边界内 864 个 `ordinary-building` OSM footprint
- Source inventory: `docs/research/data/xinhua-building-inventory-20260724-185400.json`
- Editable sources: `assets/models/source/tiers/osm-ordinary/massing/`
- Runtime GLBs: `public/models/tiers/osm-ordinary/massing/`
- Build records: `docs/research/build-records/tiers/osm-ordinary/massing/`
- Runtime policy: 仅供 Massing QA；地图正常首次可见仍需 Identity，不直接展示裸灰模

这 864 个对象不是 864 个已完成身份研究的 POI。该批只把 OSM 可观察 footprint 转换为稳定、可编辑、可审计的分块 Blender Massing；任何立面、入口、屋顶、材质或真实高度推断都不得进入 Identity/Hero。

## Tool Preflight

- Blender 5.2.0 LTS Headless：已通过
- Deterministic generator：`scripts/create_osm_ordinary_massing_models.py`
- GLB audit：生成器内置 glTF 2.0、节点、网格、材质、图片、贴图、三角面、bounds 和根变换审计
- Local preview：现有 Vite static preview
- Browser acceptance：后续新增 `qaOsmBuildings=massing`，按分块加载和固定地图机位验收
- Fallback：若某 footprint 无法构成有效多边形，只记录为 rejected，不用方盒悄悄替代

## Evidence Boundary

### Observed

- OSM `building` / `building:part` geometry
- 每栋 footprint 顶点和面积
- OSM `building` 类型、名称和门牌（存在时）
- 13 栋 `building:levels` 派生高度所依据的公开标签

### Inferred

- footprint 最长边只作为 Massing 轴线，不是入口方向
- `building:levels × 3m` 的高度换算
- 分块边界和运行时加载顺序

### Unknown

- 865 个对象的真实高度
- 所有未明确记录建筑的正立面、背面、屋顶、材质和入口
- 无名称/门牌对象的可检索身份
- OSM footprint 与命名 POI、核心片区资产的最终去重关系

### Photo evidence status

普通未命名建筑无法按稳定名称逐栋检索照片，本批明确记录为 `photo-evidence-unavailable-for-massing`。这不授权虚构 Identity；有名称、门牌、保护身份或后续进入 Hero 的对象必须另建照片 manifest 和单体 Brief。

## Coverage Matrix

| View | Evidence | Status | Unknown handling |
| --- | --- | --- | --- |
| Map / top | OSM footprint | Complete | 直接使用观察几何 |
| Canonical oblique | 确定性 Blender 分块预览 | Generated | 只看 footprint、相对高度和落地 |
| Opposite oblique | 确定性 Blender 分块预览 | Generated | 不增加立面细节 |
| Entrance/detail | 无 | Unknown | Identity 前单独研究 |
| Street runtime | `qaOsmBuildings=massing` | Pending | 只做灰模和碰撞门 |

Canonical comparison 采用每个 180×180 scene-unit 分块的东南向斜俯视；观察方向和相机参数固定在生成器中。它是地图几何对照，不冒充照片视角。

## Coordinate Contract

- `1 Blender unit = 1 authored scene unit = 2.7m`
- Blender `X` 对应场景东向
- Blender `Y` 经 glTF 和运行时 Z 翻转后对应场景南向
- Blender `Z` 为高度
- 每块 GLB 顶点相对 chunk origin 烘焙，运行时 group 放置到 `[originX, 0, originZ]`
- 每栋底面固定 `Z=0`，不在生成器中猜地形高度

## Chunking and Stable Identity

- 固定网格范围：`[-360, 360] × [-360, 360]`
- 固定网格：4×4，每块 180 scene units
- 当前 14 个非空块；空块不生成文件
- 每栋保留稳定 `building:xinhua:osm-*` ID
- GLB node name 使用 `osm-way-*` 或 `osm-relation-*`
- 每栋 manifest 记录 chunk、node、footprint、height、证据等级和三档状态
- 不合并为无法追溯的单一 mesh

## Modeling Rules

1. 只从 footprint 垂直挤出干净封闭体块；
2. 不从旧 Hero remesh，不生成尖刺、裂片、悬浮薄片；
3. 一个 chunk 共用一个中性 Massing 材质；
4. 不添加窗、门、檐口、招牌或不受证据支持的屋顶；
5. `runtimeFallbackHeight=true` 的高度只作为显式 fallback；
6. 每栋网格和 GLB node 写入稳定 ID 与证据 extras；
7. 命名地标、核心片区和普通建筑的重叠在最终绑定前不自动删除。

## Budgets

- 单栋三角面：按 footprint 顶点确定，通常 12–40
- 单 chunk：目标 `< 6,000` triangles、`< 2MB`
- 材质：1 / chunk
- 图片与贴图：0
- 动画、骨骼：0
- 根节点平移、旋转、缩放：无

## Runtime and Collision Gate

- 先以 QA query 加载 14 个 chunk；
- 固定地图机位检查行政边界、比例、地面接触和 chunk seam；
- 抽样高层、低层、凹多边形与边界建筑；
- 逐 footprint 生成碰撞或空间索引，不以一个 chunk 大盒作为碰撞；
- 在 Identity 完成前不进入普通地图首屏；
- 没有同条件基线时不声称性能提升。

## Decision Log

### Iteration 0 — 2026-07-25

- Decision: 864 个普通 OSM 建筑采用 14 个固定空间 chunk，但保留 864 个独立节点和实例记录。
- Reason: 同时满足逐栋可追溯、Blender 可编辑和运行时分块预算。
- Evidence: OSM snapshot 与派生 inventory。
- Photo boundary: 无法稳定检索的未命名对象明确记录 unavailable；Identity/Hero 不继承该缺口。
- Map status: inventory-only，未授权自动去重或移动命名资产。
- Rollback: 所有产物写入新 tier 路径，不覆盖旧模型或爬取数据。
