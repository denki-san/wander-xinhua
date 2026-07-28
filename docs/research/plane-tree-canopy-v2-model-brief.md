# Blender Model Brief: Xinhua Road Plane Tree Canopy V2

## Scope

- Asset family: `xinhua-road-plane-tree-canopy-v2`
- Environment: 新华路悬铃木行道树阵
- Runtime components:
  `app/scene/xinhua-road-landmarks.tsx`、
  `app/scene/plane-tree-instances.tsx`
- Generator: `scripts/create_xinhua_plane_tree_canopy_v2.py`
- Identity source:
  `assets/models/source/xinhua-road/plane-tree-{a,b,c,d}.blend`
- Identity runtime:
  `public/models/xinhua-road/plane-tree-{a,b,c,d}.glb`
- Massing source:
  `assets/models/source/xinhua-road/plane-tree-massing-{a,b,c}.blend`
- Massing runtime:
  `public/models/xinhua-road/plane-tree-massing-{a,b,c}.glb`
- Start preset: `/?start=house315`
- Pilot boundary: 315号附近约150米，目标恰好18棵运行时树
- Full-route rollout: Hold，等待用户确认试验段

## Runtime Hero Disposition

- `public/models/building-evidence-lab/xinhua-plane-tree-hero.glb`
  保留为离线母版、来源对照和回滚资产。
- Hero SHA-256:
  `c5055a87b032b8a58ca3b76f29144d5fb289c4e51553d99a07881d1856ba3339`
- 产品运行时不再请求、渲染或预加载 Hero。
- Identity A/B/C 继承既有母版已确认的连续根颈、板根、斑驳树皮和高位分叉语言；
  本轮新增 D，并把四款结构改为更接近街道修剪型的横向树冠。
- 删除 Runtime Hero 不是删除文件；离线母版保持只读。

## Preflight Gate

- Worktree baseline:
  `2ca63104832304eb1212f59e435efe94aa0e2348`
- Blender:
  `/Applications/Blender.app/Contents/MacOS/Blender`，`5.2.0 LTS`
- Single-asset command:
  `/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/create_xinhua_plane_tree_canopy_v2.py -- --asset=<asset>`
- GLB audit:
  `python3 scripts/audit_glb.py <asset.glb> --forbid-images`
- Local preview:
  `npm run dev`
- Runtime path:
  `http://127.0.0.1:<port>/?start=house315`
- Blender MCP:
  2026-07-28 预检无法连接正在运行的 Blender。
- Fallback:
  确定性生成器、Headless Blender 固定机位 canonical/side/root 预览、
  GLB 审计和真实 Three.js 页面验收。

## Evidence

完整来源、外置路径、SHA-256、视角和边界见
`docs/research/plane-tree-canopy-v2-reference-manifest.json`。

原始图片只存在于外置快照
`/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/snapshots/2026-07-28-2ca6310-plane-tree-canopy-v2/`，
不进入仓库或 LLM Wiki。

### View Coverage Matrix

| Evidence slot | Evidence | Questions answered | Coverage |
| --- | --- | --- | --- |
| Canonical | 2022夏季、2025秋季道路中央纵深 | 连续冠层、拱廊轮廓、天空缝隙 | Supported |
| Side / oblique | 2023沿街侧向照片 | 冠层下缘、与建筑和人行道的关系 | Supported |
| Identity detail | 2025树干近景 | 斑驳树皮、主干尺度和不规则轮廓 | Supported |
| Single-tree rear | 无无遮挡背面 | 背面枝序 | Missing，保持保守 |
| Survey | 无测绘 | 株距、树高、胸径和冠幅 | Missing，不声明实测 |

### Canonical Comparison View

- Canonical evidence:
  `external-imports/plane-tree-canopy-v2/xinhua-official-canopy-2022.png`
- Observation direction: 沿新华路道路中心线观察纵深，罗盘方向未知。
- Runtime reproduction:
  从 `?start=house315` 转向道路纵深，画面同时看到两侧树干、横向主枝、
  相邻树冠搭接和约20%至30%的不规则天空缝隙。

### Observed

- 两侧冠层在道路上方连续搭接，但没有形成完全封死的绿色顶棚。
- 粗大主枝呈弯曲横展，落叶期仍形成清晰街道拱廊。
- 树冠外轮廓和下缘不规则，不是圆球堆叠。
- 树皮由灰褐、浅灰、黄褐块面组成，树干略弯且根颈外扩。

### Inferred

- 叶片可抽象为沿枝条分布的多尺度低模叶簇。
- 道路内侧横展枝应成为主要轮廓，建筑侧枝条相对收敛。
- 四个 Identity 变体通过主叉、倾斜、冠幅和冠隙改变结构；
  三个 Massing 变体保留不同远景轮廓。

### Unknown

- 每个历史树位的真实测绘坐标。
- 单棵树背面和被遮挡枝序。
- 精确树高、胸径、冠幅及个体树龄。
- 不同年份照片中的个体树对应关系。

## Quality Contract

### Identity

- Silhouette:
  高干、约总高30%至38%开始主分叉，冠幅明显大于树干高度的一半。
- Signature cue 1:
  2至3根粗大弯曲主枝横向伸向道路，形成拱廊。
- Signature cue 2:
  灰褐、浅灰和黄褐三段式斑驳树皮，连续根颈和低矮板根。
- Signature cue 3:
  多层小叶簇互相搭接，同时保留不规则冠隙和可读枝架。
- Omitted:
  单片叶脉、细小枝梢、不可见背面枝序和个体测绘特征。

### Position and Orientation

- Coordinate source:
  现有 `xinhua-road-placement.mjs` 中心线与建筑避让逻辑。
- Pilot:
  `house315` 周边约150米，18棵；试验段外保持既有密度。
- Orientation:
  依据道路切线和道路侧别确定树冠道路内侧，不再全圆随机 yaw；
  只保留确定性小角度扰动。
- Scale:
  `1 scene unit = 2.7 m`；沿用现有运行时尺度合同，不声明测绘值。

### Collision and Access

- 碰撞继续使用现有树干级碰撞，不用树冠阻挡玩家或相机。
- 建筑入口、道路、人行道和315号启动点必须保持可达。
- 试验段使用主体级 `localObstacles`，不再把可步行庭院的整块 GLB bounds
  当作建筑实体；建筑净空仍为1.4 scene units。
- 既有树位入口净空保持9.2 scene units；315试验段在更密集的真实街道语境下
  使用5.4 scene units，且不得与任何主体级实体碰撞。

### Runtime Budget

| Tier | Count | Per-model budget | Shared runtime contract |
| --- | ---: | --- | --- |
| Identity | 4 variants | 2,500–4,500 tris，最多300 KB | 每款1 node、最多6 materials、0 images |
| Massing | 3 variants | 150–500 tris，最多40 KB | 每款1 node、最多3 materials、0 images |
| Runtime Hero | 0 | 不请求约2 MB Hero | 离线保留，不进产品 |

- Identity 和 Massing 分别通过 `InstancedMesh` 复用 Geometry/Material。
- 实例矩阵只在布局变化时写入。
- 不为单棵树 clone Geometry 或 Material。
- 试验段目标恰好18棵，不把全路线加密混入本轮。

## Batch Plan

| Batch | Deliverable | Blender check | Runtime check | Status |
| --- | --- | --- | --- | --- |
| Scope and evidence | Brief、来源清单、外置不可变快照 | N/A | N/A | Passed |
| Massing | 3个低模轮廓 | 固定机位轮廓 | overview/弱网替换 | GLB passed |
| Runtime calibration | 315号试验段18棵、道路定向 | N/A | 比例、朝向、入口和地面接触 | Code ready |
| Identity | A/B/C升级 + D新增 | canonical/side/root | 正常漫游近中景 | GLB passed |
| Materials | 树皮和叶簇调色 | 斑驳树皮、叶簇层次 | 夏/秋 palette 可读 | Blender passed |
| Collision | 现有树干级碰撞 | N/A | 入口和道路可达 | Pending |
| Optimization | 结构、体积和实例批次 | GLB audit | 首屏请求和采样 | Pending |

## Validation

- [x] 外置快照、manifest 和 SHA-256 校验通过
- [x] 4个 Identity 与3个 Massing 均由单资产命令可重复生成
- [x] 每个资产保存可编辑 `.blend`
- [x] 每个资产保存 `test_` canonical、side 和 root 预览
- [x] GLB root transform、节点、三角面、材质、图片和体积审计通过
- [x] `?start=house315` 试验段恰好18棵
- [x] 产品网络请求中没有 Runtime Hero
- [x] 道路内侧横展树冠朝向正确，邻树无明显同构重复
- [x] 入口、人行道和道路保持可达
- [x] 浏览器控制台无新增错误
- [x] 固定视口、预热、采样时长、页面可见性和构建模式均被记录
- [x] `npm test` 和 `npm run lint` 通过
- [x] 参考 / Blender / Three.js 三联图使用 `test_` 文件名

## Decision Log

### Iteration 1

- Decision:
  Runtime Hero 从产品中移除，约2 MB 的既有文件仅作离线母版。
- Reason:
  单株特殊加载对连续街景的辨识贡献低于其首屏带宽和独立路径复杂度。
- Pilot:
  先在315号附近约150米验证18棵、4 Identity + 3 Massing；
  未经用户确认不扩到新华路全线。
- Evidence:
  四张长宁区政府公开照片与既有 Hero/Identity 构件语言。
- Tool fallback:
  Blender MCP 未连接，使用 Headless Blender 固定机位和真实页面验收。
- Rollback:
  保留既有 Hero 文件和 Git 基线 `2ca6310`，运行时改动可独立回退。

### Iteration 2

- Blender result:
  4个 Identity 为4,284至4,364 tris、206,784至211,524 bytes；
  3个 Massing 均为356 tris、23,880 bytes。
- GLB result:
  全部为1 node / 1 mesh / 0 images / 0 textures；Identity 6 materials，
  Massing 3 materials。
- Runtime code:
  全览加载三款 Massing，探索加载四款 Identity；产品场景中不再引用 Hero URL。
- Pilot placement:
  315号约55.6 scene units 内为18棵，南北侧10/8；全场当前共46棵。
- Build record:
  `docs/research/build-records/plane-tree-family-canopy-v2.json`
- Remaining:
  等待用户确认试验段；新华路全线加密继续 Hold。

### Iteration 3

- Three.js result:
  `?start=house315` 探索态加载4个 Identity，全览加载3个 Massing，
  Runtime Hero 请求为0。
- Movement:
  内置确定性前进脚本从 `[-21.8, 67.6]` 移动到
  `[-18.6072, 72.8743]`；状态 complete，camera blocker 为 none。
- Performance:
  1280×577、可见页面、development、预热8秒、120帧为59.5 FPS；
  没有同条件旧基线，不声明性能提升。
- Console:
  page errors 0，console errors 0。
- Evidence:
  `docs/research/plane-tree-canopy-v2-runtime-acceptance.json`。
