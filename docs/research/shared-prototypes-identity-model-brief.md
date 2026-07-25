# Shared Prototypes Identity Model Brief

审计日期：2026-07-25  
批次：1 个已确认悬铃木原型 + 7 个已放行街具原型  
范围：只建立 Identity 资产；不处理其余 4 个 generic vegetation，不接入地图，
不把 Blender / GLB 生成结果记为正式 Identity 通过。

## 1. 准入与工具预检

- 准入真值：
  `docs/research/shared-prototypes-massing-manifest.json` 与
  `docs/research/shared-prototypes-massing-independent-review-final.md`；
- 放行资产：
  `xinhua-plane-tree`、`lane-lamp-short-arm`、`cantilever-umbrella`、
  `outdoor-table-set`、`slatted-bench`、`rectangular-planter`、
  `shanghai-dual-classification-bin`、`irregular-stone-bollard`；
- 明确排除：
  `shangsheng-campus-tree`、`huashan-canopy-tree`、`huashan-understory`、
  `road-edge-shrub`，因为树种/物种 Identity 仍被阻断；
- Blender：`/opt/homebrew/bin/blender` 5.2.0 LTS，Headless 可用；
- GLB 结构审计：
  `/Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py`；
- 生成器：`scripts/create_shared_prototype_identity_models.py`，必须支持
  `--asset <slug>`；
- 当前批次不改运行时代码，因此 gallery、地图放置、碰撞和性能均保持 pending。

## 2. 坐标、比例与文件合同

- Blender `Z` 向上，正面默认朝本地 `-Y`；Three.js 导入后 `Y` 向上；
- `1 Blender unit = 1 authored scene unit = 2.7m`，该值是项目换算合同，
  不是现场测量；
- 原型地面中心为 `(0, 0, 0)`，GLB 不烘焙世界位置、yaw 或实例缩放；
- 幸福里存在非均匀场地变换，街具本地尺寸不得直接冒充实测米制尺寸；
- 参考照片只作研究证据，不嵌入 GLB，不复制可读品牌、分类文字或标志；
- 输出：
  - `assets/models/source/tiers/shared-prototypes/identity/<slug>-identity.blend`
  - `public/models/tiers/shared-prototypes/identity/<slug>-identity.glb`
  - `test_artifacts/all-models/identity/shared-prototypes/test_<slug>-identity-*.png`
  - `docs/research/build-records/tiers/shared-prototypes/identity/<slug>-identity.json`

## 3. 证据与视角覆盖

| 原型 | Canonical | 侧向 / 纵深 | 身份细节 | 缺口与降级 |
| --- | --- | --- | --- | --- |
| 新华路悬铃木 | `research/references/plane-tree/plane-tree-canonical.jpg`，近正面整树 | `plane-tree-avenue.jpg`，道路树阵 | `plane-tree-bark.jpg`，剥落树皮 | 单棵真实高度、树龄、修剪史 unknown；只做可复用物种原型 |
| 短臂灯 | `courtyard-canonical.jpg` 与既有现场组合 | 主巷 / 水景纵深 | 细杆、短臂、单灯头 | 厂家、绝对高度、背面接线 unknown |
| 悬臂伞 | `courtyard-canonical.jpg` | `water-lane.jpg` | 红伞面、偏置侧柱、横臂与斜撑 | 厂家、织物拼缝、2026 外摆状态 unknown |
| 户外桌椅 | `courtyard-canonical.jpg` | `water-lane.jpg` | 圆桌、中央支撑、四周座位 | 具体店铺款式和精确尺寸 unknown |
| 条板长椅 | 幸福里中庭整体 | 水景侧向 | 条板座面、靠背、两端金属支脚 | 局部近景不足，条板数量为保守推断 |
| 矩形花箱 | 中庭 / 路缘整体 | 主巷纵深 | 深色箱体、顶部口沿、种植体 | 植物物种、季节和单件尺寸 unknown |
| 上海双分类箱 | `docs/research/assets/shanghai-street-bin-weihai-2023-reference.jpg`，正右前 | 城市道路关系 | 不锈钢框、并列箱门、双投口 | 仅证明上海城市类型，不证明新华路逐点同型号；文字/logo 禁止复制 |
| 不规则矮石桩 | `xingfuli-panyu-entrance-shanghai-changning-2018.jpeg` | 入口纵深 | 膝高、宽底、轻微不规则深色石块 | 背面、石材品种与精确尺寸 unknown |

固定 Blender canonical 为 `(6, -8, 6)` 看向主体中心；side 为
`(-7, -5, 4.8)`。悬铃木允许纵向 portrait framing，其余街具保持同一正面语义。

## 4. Observed / Inferred / Unknown

### Observed

- 悬铃木具有浅色斑驳树干、高位多向分叉、宽而不对称的树冠和可见冠隙；
- 幸福里外摆照片直接支持红色侧柱悬臂伞、圆桌和四周座位关系；
- 共享街具 Massing 已在真实 gallery 中通过地面接触、方向与人物尺度门；
- 上海公共箱参考直接支持横向双箱体、不锈钢外框、两个顶投口和两个正面分类区；
- 番禺路入口照片直接支持一排深色、膝高、宽底且轻微不规则的矮石桩。

### Inferred

- 短臂灯、长椅和花箱的局部结构以已验收运行时包络与幸福里整体照片共同补足；
- 桌椅和伞只建立通用原型，不逐一复刻店铺外摆；
- 悬铃木 Identity 使用原创确定性枝序和叶团，不复刻某一棵照片中的全部枝条；
- 条板数量、灯罩厚度、伞面拼接和花箱口沿是低多边形可读性参数。

### Unknown

- 街具厂家、型号、生产年代、隐藏背面、紧固件和工程尺寸；
- 悬铃木每个实例的树龄、胸径、真实高度、修剪与健康状态；
- 花箱植物物种与季节状态；
- 2026 年以后现场换新、移位、临时外摆和运营变化。

## 5. Identity 识别构件与省略项

| 原型 | 至少三处识别构件 | Identity 有意省略 |
| --- | --- | --- |
| 新华路悬铃木 | 连续渐细树干；高位五向主叉；不对称冠隙；浅色树皮斑块；少量悬挂果球 | 逐叶 Hero 密度、单株测绘、风动画 |
| 短臂灯 | 细高深灰杆；单侧短横臂；下垂梯形灯头与暖色灯面 | 厂牌、螺丝、电气结构 |
| 悬臂伞 | 偏置侧柱；水平悬臂与斜撑；红色近方形四坡伞面；重底座 | Logo、织物印字、细缝 |
| 户外桌椅 | 圆桌面；中央柱脚；四把独立座椅；可读靠背 | 店铺品牌、软垫纹理 |
| 条板长椅 | 多条木座板；分条靠背；两端深色金属框脚 | 紧固件、厂牌 |
| 矩形花箱 | 外箱与凸起口沿；内凹种植面；三团不同高度植被轮廓 | 植物物种与单叶 |
| 双分类箱 | 不锈钢框；两个深色顶投口；并列双色箱门；中部竖向分隔 | 分类文字、图标、二维码、品牌 |
| 不规则矮石桩 | 膝高宽体；不等边八点体块；轻微偏斜顶面；深色石材 | 石材品种、雕刻与不可见背面 |

## 6. 预算

| 类型 | Max triangles | Max nodes | Max materials | Max bytes | Images / textures / animation |
| --- | ---: | ---: | ---: | ---: | --- |
| `xinhua-plane-tree` | 6,000 | 4 | 4 | 786,432 | 0 / 0 / 0 |
| 每个街具 | 2,500 | 4 | 4 | 262,144 | 0 / 0 / 0 |

静态部件按材质合并；可编辑 `.blend` 保留命名后的合并组。碰撞不从视觉网格生成：
树只允许树干代理，灯/伞只允许底座代理，桌椅/长椅/花箱沿用现有简化边界。

## 7. 质量门与完成边界

1. 先生成 8 个 `.blend`、8 个 GLB、16 张双视角与 8 个 build record；
2. 结构审计必须验证 SHA、bounds、节点、三角面、材质、图片、贴图、动画、
   文件体积和根变换；
3. 生成器与单资产模式均通过后，只可标记
   `blender-glb-generated-runtime-gate-pending`；
4. 本批不接入 gallery 或地图，不验证实例尺度、朝向、通行、碰撞、控制台和性能；
5. 因此 manifest 的 `formalIdentityPassCount` 必须保持 `0`；
6. 后续只有 reference / Blender / Three.js 三联对照、真实地图和独立终审全部通过，
   才能改为正式 Identity 通过。
