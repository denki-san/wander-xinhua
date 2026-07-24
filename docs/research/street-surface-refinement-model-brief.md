# Street Surface Refinement Model Brief

## Subject and scope

- Subject: 新华路道路标线、低多边形路缘灌木、上海公共双分类废物箱；
- Address/coverage: 新华路淮海西路至延安西路；垃圾桶参考仅代表上海公共区域常见类型，不宣称是新华路逐点复刻；
- Intended stylization: 与现有 Summer Afternoon 绘本低模风格一致，保留真实结构语言，不复制文字、商标或照片贴图；
- Runtime form: 确定性 Three.js primitive geometry + `InstancedMesh`。本轮不新建 GLB/Blend，因为对象是少量共享几何的通用 dressing，继续遵守 Wiki 中“通用街具实例化、无碰撞、无 PointLight”的结论。

## Toolchain preflight

- Blender: `/opt/homebrew/bin/blender`, 5.2.0 LTS，可用但本轮不打开；
- Deterministic generator: `app/scene/shared-street-assets.tsx` 与 `app/scene/xinhua-map.tsx`；
- Placement generator: `app/scene/street-dressing-placement.mjs`；
- GLB audit: 仓库没有 `scripts/audit_glb.py`，且本轮不产生 GLB，回退为源码结构测试、三角面预算与真实 Three.js 页面验收；
- Local preview: 原 `4317` 预览进程在本轮开始时已停止，实施后重新构建并启动；
- Browser acceptance: `/?start=cinema` 与 `/?start=film-art`。preset 必须使用地标数据的 `query`，不能使用内部 `id`。

## Scale and coordinate convention

- `XINHUA_ENVIRONMENT_SCALE = 5`；
- 新华路 OSM 数据为 2 lanes，共五段 surface road；
- Y 为高度，场景道路使用 `[x, z]` 平面坐标；
- 新增标线只做视觉层，不改变角色或车辆碰撞。

## Reference evidence

- Manifest: `docs/research/street-surface-refinement-reference-manifest.json`；
- Canonical photo: `docs/research/assets/xinhua-road-panyu-2023-reference.jpg`；
- Canonical direction: 新华路近番禺路沿道路向东，heading 约 `89.35°`；
- Side/lateral: `xinhua-road-house-198-reference.jpg`；
- Entrance/road-edge: `xinhua-road-house-199-reference.jpg`；
- Bin detail: `shanghai-street-bin-weihai-2023-reference.jpg`。

## Observed

### Road

- 2023 canonical 照片中，新华路为深灰柏油、双向两车道；
- 道路中心是分段黄色短虚线，不是贯通全路的连续黄色线；
- 两侧存在红色非机动车带，靠机动车道一侧用白色连续线分隔；
- 近番禺路路段的路缘可见黄色处理，梧桐、路缘绿化和人行道形成清晰横向层级。

### Bin

- 上海公共废物箱参考为横向双分类矩形箱体；
- 主体是银灰金属框和青灰侧板；
- 正面有黑色“其他垃圾”面板与蓝色“可回收物”面板；
- 上部为两个独立投口，并由平直金属顶盖覆盖。

### Vegetation

- 实景绿化由多株细叶植物和不规则灌木共同组成；
- 当前单个扁平 icosahedron 在运行时读成一坨圆馒头，缺少冠幅分叉、缺口和方向性。

## Inferred

- 红色非机动车带可用窄条合并几何表达，不必增加贴图；
- 黄色中心虚线以约 4 米实线、6–7 米间隔的视觉节奏近似；精确工程尺寸未从照片测量；
- 垃圾桶可使用无文字的黑/蓝色面板保留分类识别，不复制现实图标；
- 灌木采用三块不同尺度和偏移的低面数凸多面体合并为一个共享 geometry，可在维持单批次的同时消除单球体轮廓。

## Unknown

- canonical 以外所有路段是否连续使用相同红色非机动车铺装；
- 新华路每一个公共废物箱的具体型号、数量和逐点位置；
- 夜间路灯是否常亮及真实色温；
- 道路标线的精确工程长度、宽度和近年维护差异。

## Identifying construction

1. 黄色短虚线中心标线，沿每条新华路 OSM polyline 单独采样，不跨路口连成一条斜线；
2. 两侧红色非机动车带与白色连续分隔线；
3. 银灰双分类矩形废物箱，黑/蓝双面板、双投口、平顶盖；
4. 灌木由三块不等大的 faceted crown 合并，保留冠幅缺口和不对称轮廓；
5. 所有同类资产仍由一个共享组件与集中 batch state 控制。

## Placement, clearance and collision

- 道路标线贴在道路顶面上方约 `0.01–0.02`，避免 z-fighting；
- 街具继续使用现有 building footprint、入口 `9.2` 净空和梧桐 clearance；
- 通用街具保持 `collision: none`，避免小物件卡住角色；
- 相机与入口通道不得因视觉体量增加而被遮断。

## Screen and performance budget

- 中心虚线、非机动车带和白色分隔线按类型各合并为少量 mesh；
- 灌木三块冠体在初始化时合并成一个 geometry，维持一个 shrub `InstancedMesh`；
- 垃圾桶允许从 2 个共享批次提高到不超过 6 个共享批次，但实例数量不增加；
- 不新增图片贴图、透明材质、动画风、PointLight、独立碰撞或逐实例 draw call；
- low-tier 继续从安全 full 集合确定性抽稀。

## Acceptance

- canonical 方向能读出黄色虚线节奏、红色非机动车带和白色分隔线；
- 不再出现贯通全图的单根斜中心线；
- 灌木轮廓有明显低多边形折面、层次和缺口，不再像单个馒头；
- 垃圾桶一眼读成银灰双分类矩形废物箱；
- 集中状态可一次切换全部路灯亮灭、花箱/垃圾桶/灌木显隐；
- `npm run lint`、`npm test`、真实生产预览、控制台和帧采样通过。
