# Nonbuilding Modeling and Ordinary District Plan

- Date: 2026-07-25
- Branch: `codex/deferred-nonbuilding-models-v3`
- Worktree: `/Users/lei/App_developing/wander-xinhua-nonbuilding-models-v3`
- Recovery base: `3044cd89f801250afcd477dfbcbc7da358bf4b11`
- Scope: 树木、装饰物、街具、Facility / Shared Prototype、普通 OSM 街区代理、行人、车辆及其它非 18 栋建筑资产
- Explicit exclusions: 不覆盖 18 栋建筑资产；本批不修改公共 registry、production manifest、18 栋运行时入口，不整体合并回主线

## 一句话决策

对绝大多数静态非建筑小物，采用“同一个经过验收的低模 + 超出可见阈值完全隐藏”是正确的；不需要再做一个肉眼几乎无法区分的远距离低模。

但需要把三件事分开：

1. **模型档位**：一个正式低模通常够用；
2. **渲染档位**：模型不变，也可以提前关闭阴影、灯光、交互和动画；
3. **模拟档位**：行人和车辆必须有近处完整更新、远处降频、范围外卸载三个状态，否则 CPU 开销不会因为同一个低模而消失。

这套方案不是把建筑 Hero / Identity / Massing 原样复制到小物上，而是建立更轻的 `Visible Low-poly → Hidden` 资产合同，再为动态主体增加独立的模拟合同。

## 当前事实、推断与方案决定

### 已观察事实

- 当前主线的 district massing 输入包含 878 个 OSM `building` way，没有 `building:part`。
- 当前 overview district massing 接受 730 个、由已创作区域排除 104 个、因道路退界冲突拒绝 44 个。
- 当前输出为一个 680,384 bytes 的 GLB，10 个 mesh、3 个材质、11,779 triangles、0 张图片。
- 该 GLB 只在 `overview` 使用，没有 collision、raycast、交互和投影；弱网初次进入可以不请求。
- 当前地图单位合同为 `1 scene unit = 2.7 m`。
- 18 栋建筑的现行质量合同要求玩家可见层至少是可识别的 Identity；Massing 是内部技术占位。
- 小红书证据直接支持：连续林荫、自行车、少量外摆、社区花园、幸福里水景街具、上生新所林下设施及多种行人活动。
- 本轮社交证据没有形成可信的汽车类型或时段密度样本。

### 合理推断

- 普通街区建筑可以由 OSM footprint、层数/高度与有限规则生成“背景街墙代理”，但这种代理不能被称为真实立面复原。
- 大量重复街具适合 Shared Prototype + data-driven placement + `InstancedMesh`。
- 行人和车辆的“鲜活感”主要来自时空分布、停留行为与低频变体，而不是单个模型的高面数。
- 18 栋建筑升级过程中，依附于建筑 mesh node 名称或顶点的街具定位很容易失效。

### 本方案决定

- 静态小物默认只生产一个正式低模；远处直接隐藏。
- 大树、地点专属雕塑、可读导视与强交互 Facility 可以例外，但例外需要单独 Brief。
- 非建筑 placement 使用语义锚点，不绑定 18 栋 GLB 内部节点。
- overview 白模不进入 explore，也不参与碰撞和室内漫游。
- 未建模普通建筑在 explore 中只允许“外部街景代理”或“不可进入的街道详情”，不让用户进入空盒子。
- 行人和车辆先做新华路活力样板走廊，再扩展到全地图，避免全图一次性铺满后难以调优。

## 864 栋、878 个 OSM 对象、730 个新版白模的关系

旧 recovery 数据把同一批 878 个 OSM building 分为：

| 旧角色 | 数量 |
| --- | ---: |
| `ordinary-building` | 864 |
| `core-area` | 12 |
| `named-landmark` | 2 |
| 合计 | 878 |

新版 overview district massing 不再直接沿用这个角色分类，而是用“是否应被已创作区域替换”和“是否与道路退界冲突”决定是否显示。对同一批 OSM ID 的对应关系为：

| 旧分类到新版结果 | 数量 |
| --- | ---: |
| 旧 864 中被新版接受 | 730 |
| 旧 864 中被 authored replacement 排除 | 90 |
| 旧 864 中因道路退界冲突拒绝 | 44 |
| 旧 `core-area` + `named-landmark` 被 replacement 排除 | 14 |
| 新版排除合计 | 104 |

所以：

```text
旧 864 ordinary = 新版 730 accepted + 90 replacement-excluded + 44 road-rejected
新版 104 excluded = 旧 ordinary 中的 90 + 旧非 ordinary 的 14
```

结论是，864 不是“还要制作 864 栋普通详情建筑”，也不是新版白模实际显示数。它是旧 inventory 的一次角色分类结果。当前 overview 背景层的有效生产口径是 730 个 accepted massing。

## 两种“白模”必须分开

### A. 18 栋建筑的单体 Massing

用途：

- 资产管理页预览；
- 对齐 origin、rotation、scale、ground contact；
- 检查碰撞与替换关系；
- 在 Hero / Identity 尚未完成时表达生产状态。

它是制作与 QA 资产，不应成为玩家长期看到的正式建筑。

### B. 全街区的 OSM district massing

用途：

- overview 中建立城市连续性；
- 让道路、片区和 18 栋/已创作 POI 处在可理解的城市背景中；
- 作为轻量、非交互、非实测的地理上下文。

它不是 730 个可进入建筑，也不是 730 个详情页资产。它不进入 explore、不承担碰撞、不提供室内、不接管建筑卡片。

这两个系统可以使用同一世界坐标和 replacement 边界，但不能共享“玩家可见质量含义”。

## 从白模到详情体验的四级产品状态

### 级别 0：Overview Context

- 显示 730 个 district massing 背景；
- 只证明 footprint、近似高度和街区连续性；
- 不可点击或只作为区域选择背景；
- 已创作 POI 由 replacement mask 接管。

### 级别 1：Ordinary Street Vignette

适用于没有真实建筑模型的普通建筑：

- 点击后仍停留在建筑外部；
- 相机落到最近合法人行道/街角，不穿入盒体；
- 显示地址、街区、使用类型或研究状态卡片；
- 周围加载树木、街具、行人、自行车和店前活动；
- 建筑本体可以保持不可进入的街墙代理。

这个级别已经能让用户“看到一栋普通建筑所在的生活环境”，但不伪装成室内参观。

### 级别 2：Streetwall Proxy

当一个路段值得更完整展示、但没有逐栋照片时：

- 离线按 footprint、可用层数、屋顶标签与街道方向生成封闭外壳；
- 使用少量经过验收的上海街墙语法：层间线、窗带、入口凹槽、空调机位、雨棚；
- 所有非 OSM 细节必须标记为 inferred；
- 保持门洞封闭或明显不可进入；
- 独立碰撞壳，绝不使用 overview district massing 做碰撞。

它是“城市背景代理”，不是现实建筑复刻，也不进入 18 栋 Hero / Identity 资产体系。

### 级别 3：Authored POI Identity / Hero

当建筑有名称、历史身份、可进入价值或足够照片证据时：

- 转入现有 18 栋同等级的证据、Brief、Identity / Hero 和运行时验收流程；
- replacement 使用稳定 OSM ref 或显式 polygon/mask；
- 是否有室内由独立 interior / navigation 合同决定，不因外立面完成而自动开放进入。

## 非建筑资产分类

| 类别 | 生产方式 | 默认模型档位 | 典型交互/碰撞 |
| --- | --- | --- | --- |
| 普通树木/灌木 | Shared Prototype + 实例化 | 1 个低模 + 隐藏 | 树干简化碰撞；灌木通常无碰撞 |
| 地点专属大树 | 单体或小族系 | 1 个 Identity-like 低模；必要时季节材质变体 | 树干碰撞；不需要高模远近切换 |
| 长椅、垃圾桶、阻车柱、花箱 | Shared Prototype + 实例化 | 1 个低模 + 隐藏 | 近处简化碰撞 |
| 路牌、街钟、方向牌、导视 | Facility | 1 个低模；文字可独立贴图/矢量层 | 可读/可交互对象单独 raycast |
| 水景、社区花园、遮棚 | Site Facility | 轻量场地模块 | 独立碰撞与禁入区 |
| 餐牌、雨棚、外摆、旗帜 | Dressing | 1 个低模 + 变体 | 通常无交互；必要时低碰撞 |
| 停放自行车 | Shared Prototype | 1 个低模 + 颜色/姿态变体 | 大批量无碰撞或合并阻挡区 |
| 行人 | Shared rig / animation | 1 个低模角色族 | 动态避障/活动状态 |
| 汽车 | Shared vehicle family | 1 个低模车型族 | 路径代理；不做完整刚体交通 |
| 普通建筑街墙 | Offline procedural proxy | 1 个背景代理 | 封闭简化碰撞；不可进入 |

### Facility 与 Shared Prototype 的区别

`Shared Prototype` 是可被大量复用的几何/材质族，例如同一套长椅、花箱、自行车和梧桐树。

`Facility` 是带有地点功能和运行时语义的设施实例，例如：

- `xinhua-community-center/garden-bed-01`
- `xingfuli/water-edge-bollard-02`
- `shangsheng/wayfinding-clock-01`

Facility 可以引用一个 Shared Prototype，但还必须有位置证据、anchor、collision、interaction、维护状态和地点归属。不要把地点专属 Facility 烘焙进建筑 GLB。

## 兼容 18 栋模型升级的接口

### 稳定命名空间

```text
building/<buildingId>/...
environment/prototype/<prototypeId>
environment/facility/<facilityId>
environment/placement/<placementId>
agent/pedestrian/<agentId>
agent/vehicle/<agentId>
```

非建筑资产不复用 18 栋建筑资产 ID，也不写进建筑 tier manifest。

### 语义锚点

每个 placement 至少记录：

```json
{
  "placementId": "xingfuli-water-edge-chair-01",
  "prototypeId": "street-chair-folding-v1",
  "zoneId": "xingfuli",
  "anchor": {
    "type": "site-boundary-offset",
    "sourceId": "xingfuli",
    "segment": 12,
    "normalizedOffset": 0.42,
    "lateralOffsetMeters": 1.1
  },
  "seed": 24017,
  "evidenceRefs": [
    "xhs/682071e0000000000303e0ba/image-10.webp"
  ],
  "confidence": "high",
  "collision": "none",
  "mobileTier": "near"
}
```

优先 anchor 类型：

- `road-curb-offset`
- `sidewalk-centerline`
- `site-boundary-offset`
- `entrance-socket`
- `courtyard-zone`
- `water-edge-offset`
- `building-footprint-offset`

不要默认使用：

- 建筑 GLB 的 vertex index；
- 临时 mesh 名称；
- 18 栋生成器内部 collection 名；
- 没有来源说明的绝对 world position。

### 建筑升级时的重绑定

1. 18 栋模型可以升级 Hero / Identity 二进制，只要 world origin、front、ground 和 footprint replacement 合同不变；
2. 依赖建筑入口的附件只绑定稳定 `entrance-socket`；
3. 未建立稳定 socket 前，外摆和街具绑定 site/road anchor；
4. 每次建筑 bounds 或 replacement mask 变化，运行 placement clearance test；
5. 街具与建筑的碰撞、阴影和加载失败必须互相隔离；
6. 建筑附件若属于身份构件，例如不可分割的门头，应留在建筑资产流程；可移动餐牌、桌椅、花箱留在 dressing 流程。

## 静态物件的“两状态”运行时合同

### 推荐状态

| 状态 | 几何 | 阴影 | 交互 | 使用场景 |
| --- | --- | --- | --- | --- |
| `visible-low` | 同一个正式低模 | 近处可开，稍远关闭 | 只对必要 Facility 开启 | 玩家附近与中距离 |
| `hidden` | 不挂载或整个 chunk 不可见 | 关闭 | 关闭 | 屏幕占比过小或超出活动区 |

不是每个物件各自执行昂贵的逐帧距离判断。按道路段、场地或空间网格组成 chunk，并用带滞回的可见性阈值切换。

### 首轮试验阈值

以下是 QA 起点，不是已经验证的生产值：

- 小街具：投影包围球小于约 1.5 px 时隐藏，恢复阈值约 2 px；
- 普通树木：小于约 3–4 px 或所在街区 chunk 超出可见范围时隐藏；
- 地面小装饰：比街具更早隐藏；
- 阴影：在几何隐藏前一个档位关闭；
- 以 `1 scene unit = 2.7 m` 换算，常规小物可先试 35–50 scene units 的隐藏带，再以 390 px 真机画面校准。

树冠是道路轮廓的一部分，不能像垃圾桶一样过早消失。如果 overview 需要更远的树带，优先使用独立的树冠密度代理或道路绿化层，而不是给每棵树再做一个远距离低模。

## 行人和车辆：一个低模，但三档模拟

### 行人

视觉：

- 6–10 个体型/服装配色变体；
- 共享骨骼；
- `idle / walk / sit / look / phone` 等少量动画；
- 中近距离使用同一角色低模。

模拟：

| 状态 | 更新 | 行为 |
| --- | --- | --- |
| `active-near` | 正常动画与路径更新 | 行走、停留、坐下、避让 |
| `coarse-far` | 低频更新并插值 | 只保留路线进度和简单状态 |
| `despawned` | 不更新、不渲染 | 保存 seed 与生成器状态即可 |

活动锚点：

- 新华路：稀疏步行、骑行、店前短停；
- 幸福里：就坐、进店、临水停留；
- 上生新所：慢行、拍照、餐饮就坐；
- 社区营造中心：入口进出、园艺、活动围观；
- 地铁和路口：通勤型短时脉冲。

### 车辆

第一版不做完整交通模拟。采用：

- 5–8 个低模车型/颜色变体；
- 道路中心线或车道 spline；
- `moving / yielding / turning / parked / despawned` 状态；
- 远处只更新 spline 参数并插值；
- 超出活动半径卸载；
- 路边停放车辆使用静态实例，与行驶车辆分开。

本轮小红书证据不足以决定车辆密度，因此首批车辆位置来自路网和现场观察，不从照片数量反推。车牌、品牌 Logo 和真实个人车辆特征不得复制。

### 首轮活动预算

建议先在“新华社区营造中心—新华 365—M2F—上海影城—幸福里—上生新所”走廊做一个可测样板：

| 对象 | 390 px 移动端起始预算 | 桌面起始预算 |
| --- | ---: | ---: |
| 同时活跃行人 | 8–12 | 16–24 |
| 同时活跃车辆 | 3–6 | 6–10 |
| 移动自行车 | 1–3 | 2–5 |
| 停放自行车实例 | 20–40 | 40–80 |

这是试验预算，不是性能提升声明。必须在相同视口、相同预热时间、相同构建模式下建立基线后再调整。

## 渲染管线影响

### 能复用的部分

- 现有 GLB 加载与缓存；
- Three.js frustum culling；
- Blender → GLB → build record 审计；
- 当前场景坐标、道路与 terrain height；
- overview / explore 模式边界；
- 现有弱网策略。

### 需要新增但应隔离的部分

1. `EnvironmentPrototypeCatalog`：非建筑原型及许可证、bounds、材质、移动端 tier；
2. `EnvironmentPlacementDataset`：语义锚点、seed、evidence、collision；
3. `ActivityZoneDataset`：不同地点和时段的行人/车辆生成规则；
4. chunk visibility manager：按屏幕占比/距离隐藏静态实例；
5. pedestrian/vehicle simulation scheduler：近处完整、远处降频、范围外卸载；
6. simplified collision layer：树干、长椅、花箱、阻车柱等少量必要碰撞；
7. deterministic seed：相同地点和时段可重复验收。

这些新增接口应先在非建筑分支内做局部目录和测试，不向公共 production registry 写入，直到某一类别完成独立验收并被主线明确接收。

### 主要性能风险

| 风险 | 成因 | 控制 |
| --- | --- | --- |
| draw call 爆炸 | 每个街具单独 mesh/material | 共享材质、InstancedMesh、空间 chunk |
| CPU 模拟过重 | 每个 NPC/车辆逐帧寻路 | 活动区、降频状态、预计算路线 |
| 阴影过重 | 树叶、人物、街具全部投影 | 近处白名单，稍远关闭，静态烘焙/接触影替代 |
| 透明 overdraw | 树叶卡片和大量玻璃 | 控制 alpha 面积、材质数量与排序 |
| 碰撞过密 | 每个自行车/椅子独立 collider | 合并阻挡区或仅重要物件碰撞 |
| 首屏流量增加 | 一次性加载全城 props/agents | intro 不加载；explore 按活动区延迟加载 |
| 18 栋升级后穿插 | world 坐标硬编码 | 语义锚点、clearance test、replacement boundary |

## Wiki 复查结论

本轮重新检索并读取了独立 `Threejs-3d-research` Wiki，相关节点形成一致结论：

| Wiki 节点 | 可用结论 | 对本方案的影响 |
| --- | --- | --- |
| `普通街区建筑适合离线结构编译加运行时细节分层` | 主结构离线编译；植物、灯光、居民和 dressing 运行时分层；视觉与碰撞分离 | 普通街墙不在浏览器里逐栋 extrusion |
| `arnis-普通建筑是程序化代理而非真实立面复原` | 规则建筑只能视为背景代理 | 禁止把 Streetwall Proxy 写成真实复原 |
| `Xinhua Scene Dressing Kit` | L1 地标、L2 语法、L3 dressing；需要 `assetId/variant/anchor/seed/collision/mobileTier/evidenceRef` | 形成 Prototype + Placement 数据合同 |
| `真实街区 Scene Dressing Kit 落地方法` | 语义锚点、稳定 seed、共享几何/材质、实例化、简化碰撞、真实运行时 QA | 直接决定本方案的运行时实现边界 |
| `Img2ThreeJS 适合作为程序化小资产试点而非真实建筑主路线` | 路灯、花箱、长椅、门、雨棚、箱体和简单设备适合试点 | 小资产可试 AI/程序化生成，但必须经过 Blender 和 GLB 审计 |
| `程序化城市生成在 wander-xinhua 中应限制为背景推断层` | 程序化生成不能替代真实道路、POI、地块和历史事实 | 普通建筑与街具的推断必须可追溯且可关闭 |

本次 Wiki 的价值不是给出一个现成资产库，而是确认了“离线结构 + 运行时 dressing + 语义锚点 + 稳定 seed + 分离碰撞”的正确管线。

## 开源街区模型库候选

### 推荐试用

| 来源 | 官方事实 | 适合用途 | 不适合直接用于 |
| --- | --- | --- | --- |
| [Kenney City Kit (Roads)](https://kenney.nl/assets/city-kit-roads) | 70 files，CC0 | 道路/路缘/标识语义原型，快速验证尺度和 instancing | 新华路最终视觉风格 |
| [Kenney City Kit (Commercial)](https://kenney.nl/assets/city-kit-commercial) | 50 files，CC0 | 店前附件和模块拆分参考 | 上海真实沿街立面 |
| [Kenney City Kit (Suburban)](https://www.kenney.nl/assets/city-kit-suburban) | 40 files，CC0 | 低层背景代理 PoC | 历史住宅身份复原 |
| [Kenney Car Kit](https://kenney.nl/assets/car-kit) | 45 files，CC0 | 低模车辆族 PoC | 真实上海车型统计 |
| [Quaternius Modular Streets](https://quaternius.com/packs/modularstreets.html) | 25 models，FBX/OBJ/Blend，CC0 | 路段模块和街具拆分参考 | 直接替换项目道路数据 |
| [Quaternius Ultimate Stylized Nature](https://quaternius.com/packs/ultimatestylizednature.html) | 63 models，含 glTF/Blend，CC0 | 树木、灌木、花草的快速移动端试验 | 直接代表新华路真实树种 |
| [Quaternius Ultimate Animated Character](https://quaternius.com/packs/ultimatedanimatedcharacter.html) | 52 animated models，FBX/OBJ/Blend，CC0 | 行人骨骼、动画与并发量 PoC | 最终本地人物美术风格 |
| [Quaternius Cars Pack](https://quaternius.com/packs/cars.html) | 8 models，FBX/OBJ/Blend，CC0 | 极简车辆 PoC | 品牌化或高写实车辆 |

### 有条件使用

- [Quaternius Downtown City MegaKit](https://quaternius.com/packs/downtowncitymegakit.html) 有 315 个模块、glTF/Blend、CC0，且有优化纹理和简化碰撞思路；但官方明确是 Boston/NYC 风格，只适合研究模块化、假室内和碰撞方法，不应直接成为新华街区视觉。
- [OSM2World](https://osm2world.org/) 支持 glTF/GLB、250 多种 OSM tags 和 LOD，适合作为离线编译器对照或背景代理实验，不应替代当前 OSM snapshot/replacement 事实链。

OSM2World 的代码/资产开源不等于生成数据“无许可义务”。只要输出基于 OpenStreetMap 数据，就必须继续遵守 ODbL 署名与数据说明；当前项目已经有 OSM 署名机制，任何新生成链仍要保留来源、快照、query 和 hash。

### 导入门槛

任何第三方模型进入项目前都必须：

1. 保存官方 URL、许可证文本、下载日期和原包 hash；
2. 放入隔离的 import/quarantine 区，不直接进入 production；
3. 在 Blender 统一单位、坐标轴、pivot、front、ground、材质和贴图；
4. 移除品牌 Logo、示例场景、无用碰撞和引擎专属 shader；
5. 导出 GLB 后记录 SHA、bounds、nodes、triangles、materials、images、animations 和 skins；
6. 在实际 `?start=` 场景做移动端屏幕占比、阴影、碰撞、加载和控制台验收；
7. 只有视觉风格通过后才转为项目自己的 Shared Prototype。

## 现实证据包

原图已保存到：

```text
/Volumes/plugin/3D_Modeling_ThreeJS_Knowledge_Base/
  wander-xinhua/
    nonbuilding-street-life-xhs-2026-07-25/
      raw/xhs/<post-id>/image-NN.webp
```

当前共 6 篇、88 张、约 24 MB。仓库只保存：

- 逐图可能位置和证据等级；
- 图片中可见的物品/活动；
- 可以支持哪些模型或 placement 决策；
- 不确定与禁止推断项；
- U 盘只读路径。

详见：

- `docs/research/nonbuilding-xhs-reference-manifest.json`
- `docs/knowledge-sources/nonbuilding-xhs-street-life-research-2026-07-25.md`

## 分阶段实施

### Phase 0 — 冻结接口，不动 18 栋

- 建立 Prototype、Placement、Activity Zone schema；
- 记录坐标、anchor、seed、evidence 和 license；
- 建立与 18 栋 replacement/clearance 的只读兼容测试；
- 不修改公共 registry、production manifest 和 18 栋入口。

### Phase 1 — 树木

- 先做梧桐 3–4 个变体及灌木/绿篱族；
- 只在新华路样板段和上生新所/幸福里局部放置；
- 通过同一低模 + chunk hidden 验证；
- 单独提交，单独 build record，单独 runtime QA。

### Phase 2 — 装饰物与街具

- 自行车、长椅、餐牌、花箱、阻车柱、垃圾桶、路牌、低位灯；
- Shared Prototype + 证据驱动 placement；
- 先完成白天，再补夜间灯光政策；
- 单独提交。

### Phase 3 — Facility / Site Recipe

- 幸福里线性水景与外摆；
- 上生新所林下路径、木平台与低位灯；
- 社区营造中心花园与公告设施；
- 每个 site 独立 recipe 和 clearance；
- 按 site 或 facility 类别分提交。

### Phase 4 — 行人

- 共享骨骼、低模角色族、活动锚点和三档模拟；
- 先实现 walk / idle / sit；
- 在 390 px 真机下测 CPU、GPU、内存与可见密度；
- 单独提交。

### Phase 5 — 车辆与自行车

- 先路网 spline、低模车族和停放实例；
- 再加 yielding / turning；
- 不与行人系统一次提交；
- 补真实时段交通证据后再扩展密度。

### Phase 6 — 普通街墙代理

- 只在白模无法支撑 explore 画面的路段试点；
- 生成不可进入的 Streetwall Proxy；
- 与 overview district massing 保持不同运行时入口；
- 单独提交，不与 18 栋建筑资产混合。

## 按类别提交与回收规则

建议提交边界：

```text
docs: record nonbuilding evidence and compatibility plan
feat(environment): add plane-tree prototype family
feat(environment): add shared street-furniture prototypes
feat(facility): add xingfuli site recipe
feat(facility): add shangsheng site recipe
feat(agents): add pedestrian activity pilot
feat(agents): add vehicle route pilot
feat(district): add ordinary streetwall proxy pilot
```

以后只 cherry-pick 已通过独立验收的类别提交。不要整体 merge `codex/deferred-nonbuilding-models-v3`，也不要把 evidence、树木、NPC、车辆和普通建筑代理压成一个不可拆的大提交。

## 完成门槛

每一类资产只有同时满足以下条件才可进入主线候选：

1. 证据：本地图片、来源、位置等级、可见事实/推断/未知分开；
2. Blender：确定性生成器或可追溯修改、可编辑 `.blend`、固定机位预览；
3. GLB：build record、结构审计、许可证、体积和缓存版本；
4. Placement：语义锚点、seed、clearance、forbidden zone；
5. Three.js：真实 `?start=` 页面中的位置、朝向、地面接触、碰撞、遮挡与控制台；
6. 性能：同条件基线、390 px 移动端、可见性切换、阴影和模拟降频；
7. 隔离：没有覆盖 18 栋资产，没有无意修改公共 registry/production manifest；
8. Git：类别独立提交，可以单独 cherry-pick 或放弃。

## 最终建议

首个实现目标不要设为“全地图所有小物和人车”，而应设为一条可以完整验收的新华路活力走廊。该走廊同时包含林荫街道、咖啡店面、社区设施、上海影城前场、幸福里和上生新所，足以验证：

- 一个低模 + 远处隐藏是否真的够用；
- 树冠、街具、外摆、人群和车辆怎样共同形成生活感；
- 18 栋建筑替换后 placement 是否仍稳定；
- overview 白模如何自然过渡到外部街景，而不让用户进入空盒子；
- 移动端能承受多少静态实例与动态 agent。

样板走廊通过后，再按同一数据合同扩展到全地图。这样保留了未来升级空间，也不会让普通建筑、18 栋地标和非建筑资产互相缠住。
