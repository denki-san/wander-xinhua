# Wander Xinhua Street Surface and Dressing Research

## 研究问题

本轮研究聚焦四件事：

1. 柏油主干道怎样在不增加大量几何和 draw call 的前提下摆脱纯色塑料感；
2. 弄堂、小路和 service road 怎样与机动车道路形成材质层级；
3. 默认绿地或空地怎样增加低频细节，但不铺满高开销草叶；
4. 花箱、路边植物、路灯和垃圾桶怎样以可复用、可降级的方式进入新华路街景。

本轮不是复刻某一件真实街具，也不把通用街具当作历史事实。道路骨架继续以项目已有 OSM 数据为准；新增表面和街具属于风格化、可回退的程序化 dressing。

## 公开资料

### Three.js 官方文档

- InstancedMesh：<https://threejs.org/docs/pages/InstancedMesh.html>
- CanvasTexture：<https://threejs.org/docs/pages/CanvasTexture.html>
- Texture：<https://threejs.org/docs/pages/Texture.html>
- Three.js terrain 示例：<https://threejs.org/examples/webgl_geometry_terrain>

观察：

- `InstancedMesh` 面向相同 geometry/material、不同变换的大量重复对象，直接目标是减少 draw calls；
- `CanvasTexture` 可在浏览器中从 canvas 生成纹理，并立即标记上传；
- `Texture` 默认支持 mipmap；重复纹理需要 `RepeatWrapping`，提高 anisotropy 会增加采样成本；
- Three.js 官方 terrain 示例证明程序化高度和生成纹理是标准可行路径，但没有直接给出本项目移动端预算。

### NVIDIA GPU Gems

- Rendering Countless Blades of Waving Grass：<https://developer.nvidia.com/gpugems/gpugems/part-i/natural-effects/chapter-7-rendering-countless-blades-waving-grass>
- Inside Geometry Instancing：<https://developer.nvidia.com/gpugems/gpugems2/part-i/geometric-complexity/chapter-3-inside-geometry-instancing>

观察：

- 大面积逐根草叶不可取；经典替代是少量交叉面片或成簇几何；
- 草地若要动态，应把大量重复对象组织成少量批次，而不是每簇单独 draw call；
- 大量小物件的瓶颈常常不是三角面本身，而是批次提交、材质切换和 draw calls；
- 静态批处理与几何实例化适合不同对象，本项目可混用：道路离线/初始化合并，重复街具实例化。

### 公开街道设计指南

- NACTO Sidewalk Zones：<https://nacto.org/publication/urban-street-design-guide/street-design-elements/sidewalks/sidewalk-zones/>
- NYC Street Design Manual：<https://www.nyc.gov/html/dot/downloads/pdf/sdm_lores.pdf>
- NYC Public Design Commission Guidelines：<https://www.nyc.gov/site/designcommission/design-review/design-guidelines/design-guidelines.page>

观察：

- 路灯、长椅、垃圾桶、树池和花箱应集中在 curb 与步行净空之间的 street-furniture/furnishing zone；
- 这一区带同时形成机动车与行人的缓冲，避免街具随机散落到主通道；
- 同一街区或整段道路使用一致灯具语言，比逐点堆叠不同造型更连贯，也能减少视觉杂乱；
- 指南的真实尺寸不能直接搬到本项目，仍需按 `1 场景单位 = 2.7 米` 和当前道路比例校准。

## LLM Wiki 回查

目标项目：`Threejs-3d-research`。

回读文件：

- `raw/sources/threejs-modeling-knowledge-base/image-to-threejs/img2threejs-xhs/wander-xinhua-assessment.md`
- `raw/sources/threejs-modeling-knowledge-base/procedural-cozy-building/townscaper-modular-generation-rules.md`
- `wiki/methodology/程序化-threejs-小资产试点评估方法.md`

观察：

- Wiki 已把路灯、垃圾桶、花箱、长椅等列为程序化 Three.js 小资产的高适配对象；
- Wiki 明确要求记录 JS 增量、首次构建、三角面、draw calls、内存和移动端 FPS，而不能只看 GLB 体积；
- Townscaper 研究建议将结构与装饰分开：道路和真实地标保持确定，植物、灯光和可隐藏装饰按设备档位控制密度；
- 真实地标继续走照片参考 Blender/GLB 流程，通用小资产可以走参数化 factory 和实例化路线。

## 实现决策

### 柏油路

- 保留现有按道路等级合并的 6 个道路网格，不拆成逐段 mesh；
- 共享一张 `128 × 128` 的确定性 `CanvasTexture`；
- 为合并后的道路网格生成 world-space planar UV，避免每段道路出现不同缩放；
- 保留道路等级色盘，并用低频顶点色变化增加修补、旧化和光照层次；
- 不使用 normal map、roughness map、实时噪声动画或逐段 decal。

### 小路

- `lane` 和 `service` 共用暖灰、偏土质的小纹理；
- 所有小路边肩合并成一个额外网格和一个额外 draw call；
- 边肩只做低矮视觉层，不进入新碰撞，避免改变现有可行走逻辑。

### 默认绿地

- 保留现有 Copernicus DEM 支持的低频地形和顶点色；
- 共享一张 `128 × 128` 程序纹理，增加草、土和枯黄斑驳；
- 不在全地图铺草叶；只在新华路 furnishing zone 外缘放少量实例化矮灌木；
- 这样默认空地仍从远景读成连续绿地，近景不再是完全平涂。

### 街具

- 路灯、花箱、垃圾桶和矮灌木沿新华路轴线确定性采样；
- 路灯靠近 curb，花箱和灌木逐步向外，不进入机动车道；
- 同类型对象使用 `InstancedMesh`，颜色和尺度只做小范围稳定变体；
- 不创建 PointLight，不给通用 dressing 新增碰撞；
- low-tier 降低数量，但不改变道路、POI、入口和角色碰撞。

## 预算合同

- 新增程序纹理：3 张，每张 `128 × 128`，运行时生成，不增加网络请求；
- 设计预算中的新增道路 draw call：小路合并边肩约 1 个；原 6 类道路 draw call 数不变；
- 设计预算中的新增街具 draw call：路灯 4、花箱 2、垃圾桶 2、灌木 1；这些是根据实例化网格结构推导的上限，不替代浏览器 `renderer.info` 实测；
- 街具总三角面保持在低数千级，低配档位减少实例数量；
- 不新增 GLB、图片贴图、透明草海、实时风动画或真实灯光。

## 观察、推断与未知

### 观察

- 当前道路已经按类型合并，默认地形已经使用顶点色和低频真实缓坡；
- 项目已有 `StreetLampInstances`、实例化铺地和梧桐树批次，可复用同一种性能策略；
- 当前默认道路材质主要是纯色，弄堂与 service road 的边缘层次不足；
- 当前项目已有独立 `Threejs-3d-research`，街具程序化路线与其中结论一致。

### 推断

- 共享小纹理、world-space UV 和低频顶点色能以较低成本改善纯色塑料感；
- 将街具放在 curb 外侧的统一带状区域，会比全图随机散布更像有设计的街道；
- 不启用 PointLight 和全图草叶能把性能风险控制在现有预算附近。

### 未知

- 本轮没有上海新华路整段街具的连续、同日期照片证据，因此街具造型和密度是风格化建议，不是历史复原；
- 浏览器实际 draw calls、GPU 时间和 FPS 必须在同视口、同构建、同预热条件下测量后才能下结论；
- 现有道路几何的简化 join 仍可能在极近距离暴露圆形接缝，本轮不重建道路拓扑。

## 验收入口

- 全览：`/`
- 新华路近景：`/?start=cinema`
- 另一段主路：`/?start=film-art`

验收必须检查：

- 柏油细节不会形成明显平铺接缝或摩尔纹；
- 小路边肩不抬高角色或封路；
- 默认绿地不出现透明排序问题；
- 街具不挡主路、入口或相机；
- low-tier 数量确实降低；
- 控制台无新增应用错误；
- 记录视口、预热、采样时长、页面可见性和构建模式。

## 本轮运行时验收

观察：

- 当前提交 `npm test` 通过 `127/127`，`npm run lint` 通过；
- 静态生产构建在 `1280 × 720`、页面可见、预热 7 秒的条件下完成 120 帧采样；
- 120 帧平均 `19.47 ms`，约 `51.37 FPS`，P95 为 `25 ms`；
- 采样后 JS heap 使用约 `44.8 MB`；
- 控制台 `0 error`，只有项目既有的 `THREE.Clock` deprecated warning；
- 上海影城段能看到柏油主路、默认绿地，以及路缘外侧的实例化路灯、花箱、垃圾桶和矮灌木；
- 转向后的近景能看到柏油与默认绿地的色温、粗糙度和低频纹理层级，未出现透明草片排序问题。

证据：

- `docs/research/test_street_surface_runtime_metrics.json`
- `test_artifacts/test_street_surface_shanghai_cinema_runtime_preview.png`
- `test_artifacts/test_street_surface_ground_detail_runtime_preview.png`

边界：

- 上述桌面截图与性能采样对应首版提交 `4aee14d`，但当时使用了无效的 `start=shanghai-cinema`，页面实际回退到默认起点；因此旧截图只能证明通用渲染状态，不能作为上海影城段验收。正确入口为 `start=cinema`，本轮后续验收必须重新采集；
- 本轮没有在同视口、同设备、同构建模式下采集旧版基线，因此不声明 FPS 或内存已经提升；
- 离角色很近的默认绿地仍保持抽象绘本色块，不把它包装成照片级草坪；
- 通用街具没有新增碰撞，最终精确位置仍需结合整段新华路连续实景证据再做一次人工校准。

## 知识库同步状态

- 已复制到独立 `Threejs-3d-research`：
  `raw/sources/threejs-modeling-knowledge-base/wander-xinhua/wander-xinhua-street-surface-and-dressing-research-2026-07-24.md`；
- 两次 Source Rescan 均返回空队列，原始 source 可通过 MCP 完整读取；
- 但精确主题检索尚未命中新 source，关系图也尚未生成节点；
- 因此当前状态是“原始 source 已同步、索引待生成”，不能宣称 Wiki 已完成学习。
