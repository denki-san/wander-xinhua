# Xinhua Autumn Storybook V2 Brief

研究与实施日期：2026-07-23

## Scope

- 主入口：`/?start=garden179`
- 目标：把真实 Three.js 场景逐项逼近用户确认的秋日绘本目标图。
- 涉及资产：Rain 角色、新华路 A/B/C 梧桐、道路与人行道、地表材质、
  既有新华路建筑运行时材质和秋日下午光照。
- 非目标：不把 AI 目标图当作真实建筑证据，不改变 OSM 道路中心线，不用
  目标图作为运行时贴图，不重做已经通过照片还原门的建筑体块。

## Preflight Gate

- Blender：`/Applications/Blender.app/Contents/MacOS/Blender`，
  5.2.0 LTS；受限沙箱中的 Metal 初始化会崩溃，正式生成使用已批准的
  headless 沙箱外路径。
- 单资产生成：
  - 角色：`scripts/create_rain_summer_character.py`，只写 Rain Blend、GLB、
    build record 和 `test_rain_` 预览；
  - 梧桐：`scripts/create_xinhua_road_models.py --asset=plane-tree-a|b|c`，
    可逐棵生成，不覆盖其他建筑。
- GLB 审计：仓库没有独立 `scripts/audit_glb.py`；使用既有 Node GLB 结构测试
  和 build record 解析作为回退，锁定节点、材质、图片、动画、bounds 与 SHA。
- 本地预览：`test_local_preview.command`；正式验收同时使用开发入口和真实
  `?start=` 页面。
- 浏览器：standalone `agent-browser` 不存在；使用 in-app Browser/Chrome
  路径截取真实 WebGL 画面。
- 基线提交：`e4862abfafc9c23a794a9cd8d793249cad0b25d9`。
- 基线截图：
  `test_artifacts/test_xinhua_autumn_storybook_hero.png`。

## References and View Coverage

| 槽位 | 本地证据 | 解决的问题 | 边界 |
| --- | --- | --- | --- |
| Canonical style target | `docs/research/assets/style-references/xinhua-autumn-storybook-target.png` | 构图、云层、暖光、树冠空隙、道路/草地/建筑关系 | AI 图，只证明审美目标 |
| Canonical real plane tree | `research/references/plane-tree/plane-tree-canonical.jpg` | 高位分叉、树干收分、整树比例 | 真实物种证据 |
| Avenue plane trees | `research/references/plane-tree/plane-tree-avenue.jpg` | 行道树间距、相邻树冠连接、可见枝架 | 真实街道树阵证据 |
| Bark detail | `research/references/plane-tree/plane-tree-bark.jpg` | 斑驳浅深树皮 | 真实材质证据 |
| Rain canonical | `docs/research/assets/character-references/rain-v1-rig-preview.png` | 发型、头身、服装和面部身份 | CC-BY 角色证据 |
| Xinhua autumn | `docs/research/assets/style-references/xinhua-autumn-plane-trees-canonical.jpg` | 上海秋季残绿与黄赭并存 | 真实季节证据 |

Canonical comparison view 使用
`docs/research/assets/style-references/xinhua-autumn-storybook-target.png`，
观察方向为沿新华路道路中心向纵深看，人物位于画面右侧三分线，建筑与树阵形成
双侧透视。它只作为风格和构图目标；建筑真实性继续由各自照片 Brief 约束。

## Evidence Classification

### Observed

- 当前 Rain 的 `Rain_hair_ponytail` 是独立网格，沿角色背后水平伸出约
  `0.428` 单位；邮差包完全来自运行时代码，不属于 Rain 原资产。
- A/B/C 梧桐当前每棵只有四到五条主枝，树冠由约七到八个大 icosphere
  组成，因此中远景会合并成圆团。
- 既有建筑 GLB 已经包含窗框、玻璃、砖瓦、入口灯和铺装缝等独立材质；
  当前冷灰光照与低对比材质让这些层级不够明显。
- 当前道路有 OSM 中心线和机动车路面，但没有沿新华路连续表达的人行道、
  路缘和草地过渡。

### Inferred

- 保留 Rain 主发、去掉横向高马尾与发圈，并创建绑定到 `Head` 骨骼的低马尾，
  能在不改动身体、动画和碰撞的前提下获得更自然的后视轮廓。
- 目标图中的建筑“AI 美化”主要来自暖白墙、深绿窗框、暖玻璃、明显檐口和
  局部入口发光，不需要也不应把 AI 图烘焙成建筑贴图。
- 不移动 OSM 中心线和照片校准后的建筑落点；通过更窄的新华路视觉沥青面、
  连续路缘/人行道、草地边带、树阵冠幅和固定机位改善空间关系。

### Unknown

- 目标图中的窗格数量、树枝位置和建筑表面细节由生成模型补全，不代表真实新华路。
- 低马尾在快速跑动时不做物理摆动；本轮使用刚性 Head 绑定，避免新增发丝骨骼
  破坏既有动作。
- 低配置手机对更密树叶的热负载尚未知，必须在真实移动视口采样后决定密度上限。

## Quality Contract

### Character

- 删除 `AutumnWandererBag` 及全部邮差包网格。
- 不导出原 `Rain_hair_ponytail` 与 `Rain_hairband`。
- 新低马尾从后脑下缘自然向下，轮廓低于耳部并落到肩颈附近，绑定 `Head`；
  不穿头、不水平伸出、不新增碰撞。
- 保留 Rain 面部、围巾、上衣、牛仔裤、鞋和 Idle/Walk/Run。

### Plane Trees

- A/B/C 保留直立、偏冠、开放多叉三种结构。
- 每棵至少四条主枝、八条次枝和可见细枝；树冠不得由少量大球构成。
- 使用较小的非球形叶簇沿枝端分布，保留至少三处天空可见的冠隙。
- 目标游戏距离仍能读出高位分叉、浅深树皮和不对称冠幅。
- 三棵合计目标不超过 `1.4 MB`，最多六个材质分片、零图片、零贴图；
  继续通过 `InstancedMesh` 复用。

### Road, Grass and Building Relationship

- OSM 道路中心线、建筑照片校准落点、碰撞和起点不变。
- 新华路沥青视觉宽度从全局 tertiary 默认值中单独收紧约 12%；
  两侧增加连续浅暖灰人行道、深色路缘与橄榄草地过渡。
- 草地不是单一绿色：使用浅橄榄、干草金和阴影绿的确定性低频变化，
  路缘和树下增加少量落叶；不得覆盖机动车道。
- 建筑墙面、砖瓦、窗框、玻璃、绿植和灯光按材质名称做可回退的运行时
  look-dev；不得改变模型身份、logo 或真实结构。

### Lighting and Framing

- 目标时段保持 11 月下旬约 15:30，西南低太阳。
- 提高天空云层的奶油色亮部和地平线暖度，同时保留蓝灰空气透视。
- 建筑亮面为暖奶油色，阴影保持蓝灰；入口灯只作局部焦点，不让整栋楼发光。
- Canonical 固定机位中，道路消失点居中偏左，人物位于右侧三分线，
  树冠进入画面上缘且建筑不贴边裁切。

### Runtime and Validation

- 桌面 1440 × 900 与移动 390 × 844 均需真实 WebGL 截图。
- `?start=garden179`、`?start=film-art`、`?start=house315` 三个入口均检查。
- 控制台无应用 error；记录已知 Three.js deprecated warning。
- 同条件采样 RAF、GLB 体积和首屏请求；没有基线时不声称性能提升。
- `npm test`、`npm run lint` 与 GLB 结构测试通过后才可进入发布。

## Decision Log

### Iteration 0

- 用户选择：去掉背包；不以帽子遮挡发型问题，直接把高位横向马尾改成低位下垂马尾。
- 目标图用途：风格与构图目标，不是实际渲染或真实建筑证据。
- 结构优先级：先修普通梧桐大球冠、道路/人行道/草地关系和建筑材质层级，
  再微调后处理。
- 回退点：基线提交 `e4862ab` 及现有 Rain、A/B/C GLB 均保留在 Git 历史。

### Iteration 1 — 真实运行收敛

- 人物：删除运行时邮差包；第一次低马尾过长且在后视图中像三节大辫子，退回
  生成器把它缩成贴近后颈的两节短束。最终角色 GLB SHA 为
  `f9721e54f0348b7139bc36ca9db6fe1deffd2cb09f868b7dcf7c64c25ea4b011`。
- 道路：新华路独立为约 `13.2 m` 的两车道视觉沥青面，增加连续路缘、
  约 `2.16 m` 人行道和约 `1.08 m` 草地边带；OSM 中心线、建筑落点和碰撞
  未改变。游玩态隐藏全览用路面大字，减少画面噪声。
- 梧桐：A/B/C 从大圆球冠改为主枝/细枝/小叶簇；最终合计 `963764` 字节、
  `17160` 三角面，继续零图片并实例化。
- 建筑：墙面压到暖米灰，玻璃和窗框加深，入口灯与玻璃只保留低强度暖发光；
  没有把 AI 目标图烘焙成纹理。
- 天空和光：保留 Kenney 2K skybox，增强奶油云亮部，并增加四组镜头相对的
  低多边形奶油云；后处理加入轻微暖色偏移而不改变 UI。
- 实际验收：`garden179`、`film-art`、`house315` 三个入口均在 1440×900
  真实 WebGL 页面检查；`garden179` 另在 390×844 检查。控制台应用错误
  `0`，只有既有 Three.js deprecated warning。
- 对照证据：
  `test_artifacts/test_xinhua_autumn_storybook_v2_comparison.png`；
  从左到右为 AI 风格目标、真实树阵运行时、重点建筑运行时。
