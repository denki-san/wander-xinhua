# GeoLibre v2.3.0：帖子与官网核验笔记

## 研究范围与边界

- 用户提供的小红书标题：`GeoLibre v2.3.0正式版发布`。
- 用户提供的短链：<http://xhslink.cn/o/2sQtJgyOBge>。
- 采集时间：2026-07-27（Asia/Shanghai）。
- 本轮只做公开技术调研；未修改游戏运行时、地图数据、GLB、碰撞或 registry。
- 小红书短链在本轮 HTTP 与 HTTPS 访问均返回 `404 Not Found`，没有取得正文、作者、发布日期、图片或视频。因此帖子标题之外的内容一律标为“未知”，不能作为实现或体验事实。

## 已核验的来源

1. GeoLibre 官网：<https://geolibre.app/>。
2. 官方架构文档：<https://geolibre.app/architecture/>。
3. 官方 GitHub 仓库：<https://github.com/opengeos/GeoLibre>（MIT）。
4. 官方 v2.3.0 Release：<https://github.com/opengeos/GeoLibre/releases/tag/v2.3.0>，tag `v2.3.0`，commit `417e529`，发布于 2026-07-25。

## Observed：官网与 Release 可直接验证的事实

- GeoLibre 是开源、MIT 许可的 cloud-native GIS 应用；同一代码库可作为浏览器应用、Tauri desktop、Android 与 Jupyter 使用。核心技术栈为 Tauri v2、React、TypeScript、MapLibre GL JS、DuckDB-WASM Spatial 与 deck.gl。
- Web 版是静态站点，默认在浏览器本地处理加载的数据；只有用户选择远程 URL 或分享项目时，数据才会离开浏览器。项目文件是 `.geolibre.json`。
- v2.3.0 的直接功能更新包括：搜索框可跳转到手输经纬度；任意 CRS 的分隔文本图层；图层样式复制/粘贴；STAC/MosaicJSON 时间滑块；terrain 控件自动启用地形；热点分析、随机矢量抽取、GeoLens catalog、自动地图图例与 GeoPackage 图层选择。
- GeoLibre 的 3D globe 是可选的 CesiumJS secondary pane；主地图仍是 MapLibre。Cesium 被懒加载，官方文档称引擎约 4.8 MB，不进入默认 2D 启动路径。
- Globe 与 MapLibre 共用抽象的图层记录和地图视图状态；MapLibre Web-Mercator 的 zoom/pitch/bearing 会与 Cesium 的 camera 做双向同步。可同步到 Globe 的类型主要是 GeoJSON、XYZ/raster/WMTS/WMS 与 3D Tiles；PMTiles、MBTiles、Zarr、LiDAR、Gaussian splats、deck.gl 等仍标注为 2D-only。
- Cesium globe 依赖 Cesium Ion token；没有 token 时 3D 切换入口隐藏，保存为 globe 的项目会回退为 2D。

## Inferred：对 Wander Xinhua 有价值的学习

1. **它是 GIS 工作台，不是本项目运行时引擎替代品。** Wander Xinhua 目前是 React Three Fiber / Three.js 的可漫游叙事场景，包含角色、碰撞、资产分档与性能合同；把 GeoLibre 或 Cesium 嵌入现有首屏会带来两套 renderer、坐标与交互生命周期，收益不足以抵消复杂度。
2. **最有用的是“地图证据与运行时分层”的方法。** 可把 GeoLibre 作为离线/本地的 OSM、GeoJSON、GeoPackage、坐标与地形核验工作台：先确认地物、道路、footprint 和投影，再把经过审计的简化数据导入当前 Three.js 场景。这与项目现有 OSM 快照和 map-calibration 门槛一致。
3. **可复用的架构原则是共享数据合同，不是直接复用其代码。** GeoLibre 让 MapLibre 与 Cesium 围绕无 renderer 依赖的 `layer + view state` 同步；本项目若未来增加“平面地图 / 漫游场景 / 证据 QA”三视图，应该先定义版本化的空间数据、投影、尺度和相机合同，再分别由各 renderer 消费，避免一个 renderer 的坐标对象泄漏到另一个。
4. **性能与凭据要前置。** Cesium 的懒加载值得学习，但其 globe 又要求 Ion token。若未来评估真 3D 地球或 3D Tiles，应把首屏增量、token/服务许可、离线退化和 2D fallback 作为 PoC 的验收项；不能仅凭“开源”假定所有数据与服务免凭据。

## Unknown / needs_review

- 该小红书帖的作者、正文、配图/视频、实际演示路径及“提到的网站”是否仅指 GeoLibre 官网，均未能从失效短链确认。
- v2.3.0 Release 条目不能证明所有官网功能均首次在 2.3.0 引入；上文仅将 Release 明列的内容归为 v2.3.0。
- 未运行 GeoLibre Web，也未把任何本项目数据上传到 GeoLibre、其分享服务或第三方地图服务。

## 可执行的下一步（仅在需要时）

如果要验证价值，做一个独立、只读的地图 QA PoC：导入当前公开 OSM 快照与一个非敏感 GeoJSON，核对 CRS、道路/建筑 footprint、地形与坐标跳转；不接触 production registry，也不上传项目或敏感数据。验收输出应是坐标差异与来源记录，而不是截图式“看起来对”。
