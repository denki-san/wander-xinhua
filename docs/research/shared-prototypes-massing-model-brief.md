# 共享植被与街具 Massing 模型 Brief

## 1. 主体与范围

本批次只建立全地图共享原型的 Massing，不提前放行 Identity 或 Hero：

| Prototype ID | 文件 slug | 实例范围 | 物种/类型证据 |
| --- | --- | ---: | --- |
| `prototype:vegetation:xinhua-plane-tree` | `xinhua-plane-tree` | 新华路 28 + 幸福里 3 | 悬铃木已确认 |
| `prototype:vegetation:shangsheng-campus-tree` | `shangsheng-campus-tree` | 29 | 树种 unknown |
| `prototype:vegetation:huashan-canopy-tree` | `huashan-canopy-tree` | 112 | 树种 unknown |
| `prototype:vegetation:huashan-understory` | `huashan-understory` | 73 | 树种 unknown |
| `prototype:vegetation:road-edge-shrub` | `road-edge-shrub` | 12 | 树种 unknown |
| `prototype:street-furniture:lane-lamp-short-arm` | `lane-lamp-short-arm` | 全地图共享 | 幸福里与新华路街景证据 |
| `prototype:street-furniture:cantilever-umbrella` | `cantilever-umbrella` | 全地图共享 | 幸福里外摆证据 |
| `prototype:street-furniture:outdoor-table-set` | `outdoor-table-set` | 全地图共享 | 幸福里外摆证据 |
| `prototype:street-furniture:slatted-bench` | `slatted-bench` | 全地图共享 | 幸福里水景/庭院证据 |
| `prototype:street-furniture:rectangular-planter` | `rectangular-planter` | 全地图共享 | 幸福里与新华路路缘证据 |
| `prototype:street-furniture:shanghai-dual-classification-bin` | `shanghai-dual-classification-bin` | 全地图共享 | 上海公共双分类箱参考 |
| `prototype:street-furniture:irregular-stone-bollard` | `irregular-stone-bollard` | 全地图共享 | 幸福里番禺路入口证据 |

本 Brief 覆盖 Massing。Identity 与 Hero 必须在本批正式运行时门通过后另建批次记录。

## 2. 工具预检

- Blender：`/opt/homebrew/bin/blender`，5.2.0 LTS，Headless 已通过；
- 确定性生成器：`scripts/create_shared_prototype_massing_models.py`；
- GLB 审计：生成器内置 glTF 2.0、SHA、bounds、节点、三角面、材质、图片和根变换审计；
- 本地预览：`npm run build:static` + `http://127.0.0.1:4173/`；
- 浏览器入口：计划使用 `?qaSharedPrototypeTier=massing` 的真实 Three.js gallery；
- 回退路径：若 gallery 未完成，只能记录 Blender / GLB 已生成，不得声称 Massing 正式通过。

## 3. 坐标、比例和原点

- `1 Blender unit = 1 authored scene unit = 2.7m`；
- `Z` 为 Blender 高度，运行时导入后以项目标准轴转换；
- 正面默认朝 Blender `-Y`；
- 所有原型的地面中心为 `(0, 0, 0)`；
- Massing 只表达占地、总高和主轮廓；不得包含照片、文字、商标或运行时贴图；
- 每个实例继续使用 `docs/research/model-placement-registry-20260725.json` 的稳定 ID、位置、yaw 与 scale，本批不改放置。

## 4. 参考证据与视角矩阵

### 4.1 本地证据

| 证据 | 用途 |
| --- | --- |
| `research/references/plane-tree/plane-tree-canonical.jpg` | 悬铃木高位分叉与整树比例 |
| `research/references/plane-tree/plane-tree-avenue.jpg` | 新华路树阵冠幅与道路关系 |
| `research/references/plane-tree/plane-tree-bark.jpg` | Hero 后续树皮证据；Massing 不表达材质 |
| `docs/research/assets/xinhua-road-panyu-2023-reference.jpg` | 新华路路缘植被、树阵和街具尺度 |
| `docs/research/assets/xinhua-road-house-198-reference.jpg` | 侧向道路与路缘关系 |
| `docs/research/assets/xinhua-road-house-199-reference.jpg` | 入口侧道路净空 |
| `docs/research/assets/shanghai-street-bin-weihai-2023-reference.jpg` | 双分类箱整体比例与正面 |
| `docs/research/assets/poi-references/xingfuli/courtyard-canonical.jpg` | 幸福里树、外摆、长椅和花箱 |
| `docs/research/assets/poi-references/xingfuli/water-lane.jpg` | 水景侧向街具关系 |
| `docs/research/assets/poi-references/xingfuli/xingfuli-panyu-entrance-shanghai-changning-2018.jpeg` | 番禺路入口矮石桩 |

上生与华山树种没有逐株证据。本批只以运行时已有实例高度/冠幅建立通用体块，明确标记 `species unknown`，不借用新华路悬铃木照片冒充物种证据。

### 4.2 视角覆盖

| 原型族 | Canonical | 侧向/纵深 | 入口/身份细节 | 缺口 |
| --- | --- | --- | --- | --- |
| 新华路悬铃木 | 单树三分之四视角 | 道路树阵 | 根颈/高位分叉 | 单棵真实高度 unknown |
| 上生/华山乔木 | 园区或绿地总体 | 场地侧向 | 无逐株身份视图 | 树种、树龄、逐株高度 unknown |
| 林下层/灌木 | 路缘或林下总体 | 道路侧向 | 无逐株身份视图 | 物种与种植密度 unknown |
| 灯、伞、桌椅、长椅、花箱 | 幸福里总体 | 水景/主巷侧向 | 相应局部构件 | 精确厂家尺寸 unknown |
| 垃圾桶 | 正面 canonical | 公共空间侧向 unknown | 双投口/双面板 | 新华路逐点型号与数量 unknown |
| 矮石桩 | 番禺路入口 | 入口纵深 | 深色膝高方体 | 背面与精确石材 unknown |

固定 canonical 方向为本地 `(6, -8, 6)` 看向原点；side 为 `(-7, -5, 4.8)`。运行时 gallery 必须保持相同正面语义。

## 5. 观察、推断与未知

### 观察

- 新华路悬铃木具有高位分叉、非对称冠幅和明显树干；
- 幸福里短臂灯是细深灰杆、短横臂和单灯头；
- 悬臂伞具有侧柱、横臂、支撑和近方形伞面；
- 桌椅、长椅、花箱、垃圾桶与矮石桩都可由清晰硬表面主轮廓识别；
- 公共垃圾桶是横向双分类箱，正面存在两个分类区和双投口；
- 入口矮石桩是深色、膝高、轻微不规则的方体，不是尖顶路桩。

### 合理推断

- Massing 可合并同原型所有部件为一个无贴图网格，以轮廓、占地和净空为主；
- 树木 Massing 以树干 + 冠幅表示，不复制 Hero 细枝；
- 未确认树种的两类乔木只表达运行时既有高度/冠幅族，不表达叶形或树皮身份；
- 通用街具精确工程尺寸以当前经过人物尺度验收的运行时组件为近似，不宣称测绘值。

### 未知

- 上生与华山逐株树种、树龄、胸径和真实高度；
- 林下层与道路灌木的具体物种；
- 每件街具的厂家、生产年代、逐点现实型号与精确尺寸；
- 所有原型背面不可见的小结构；
- 是否所有地图实例仍对应 2026 年现场状态。

## 6. 主体独有识别构件

| 原型 | 至少三处 Massing 识别构件 |
| --- | --- |
| 新华路悬铃木 | 明显树干、高位主叉、宽而不对称的冠幅 |
| 上生庭院树 | 中等树干、分层冠幅、偏斜顶部轮廓 |
| 华山乔木 | 较粗树干、宽大低冠、接近连续林冠的横向体量 |
| 华山林下层 | 低矮、三团分叉冠体、明显冠幅缺口 |
| 道路灌木 | 路缘尺度、三团 faceted 冠体、横向不对称 |
| 短臂灯 | 细高灯杆、单侧短横臂、下垂灯头 |
| 悬臂伞 | 偏置侧柱、长横臂、近方形伞面 |
| 户外桌椅 | 中央桌面、支撑脚、四周座位体量 |
| 条板长椅 | 长座面、靠背、两端支脚 |
| 矩形花箱 | 深色箱体、顶部种植体、长/方占地 |
| 双分类箱 | 横向箱体、平顶盖、并列双投口区域 |
| 不规则矮石桩 | 膝高方体、轻微斜置、深色宽底座 |

## 7. 运行时与预算

- 单个 Massing GLB：目标 `< 80KB`、`< 500 triangles`、`0 images/textures`；
- 根节点不得带平移、旋转或缩放；
- 原型 GLB 不直接增加实例数；运行时继续实例化；
- 小型街具碰撞维持现有 `none` 或 `base-only`，不得因新模型扩大；
- gallery 只作为 QA 入口，不能默认进入生产地图；
- Massing 正式门必须有 canonical/side、Three.js gallery、资源请求、地面接触、比例和旋转证据。

## 8. 分批质量门

1. 生成 12 个可编辑 `.blend`、12 个 GLB、24 张双视角和 12 个 build record；
2. GLB 审计全部通过；
3. 在真实 Three.js gallery 中确认 12 个原型完整、落地、方向可读；
4. 独立审查确认后，才允许为本批建立 Identity；
5. Identity 通过后才允许建立 Hero；已存在的悬铃木 Hero A/B/C 只保留为候选，需补正式三档关系记录。
