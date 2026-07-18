# Urban Wanderer Character Brief

## 目标

为《新华漫游志》重做持续占据后肩近景的中国城市漫游者。默认形象偏中性、略 masculine，不以明显性别、职业、任务或冒险背景限制玩家代入。上装和下装必须保留独立替换能力，本期暂不实现换装 UI。

用户明确要求：

- 不使用背包、挎包、手提包、肩带或替代携带物。
- 不复制 Messenger 或小红书演示中的人物、服装、贴图和动作。
- 人物需要与当前低多边形、墨线、纸张质感的街区协调。
- 本轮只改人物和跟随镜头，不修改建筑、街具、POI 或真实空间比例。

## 候选研究与选择

研究时间：2026-07-18。

| 候选 | 结论 |
| --- | --- |
| Quaternius Universal Base Characters + Fantasy Outfits | 骨架和细节较新，但免费服装轮廓仍明显偏奇幻；上一版的腰带、靴筒和短袖叠长袖不符合城市漫游者目标 |
| Quaternius Ultimate Modular Men Pack | 官方 CC0，11 个角色均拆为 Head、Body、Legs、Feet 四个模块；包含 Casual、Hoodie 和 Suit，现代服装轮廓更合适 |
| MakeHuman / MPFB | 官方核心资产和导出人物可按 CC0 使用，人体与服装更写实平滑；但写实比例、贴图和服装适配管线与当前墨线低模街区差异过大，若只为消除分面替换会扩大美术与运行时复杂度 |
| Kenney Modular Characters | 官方 CC0、模块化清楚，但比例和几何更偏玩具积木，不能解决当前希望降低色块感的问题 |
| OpenGameArt 零散 CC0 人物 | 授权清楚，但多数缺少完整动作、模块化服装或稳定游戏骨架，整合成本与最终一致性较差 |

最终选择 Quaternius Ultimate Modular Men Pack：

- 官方页面：https://quaternius.com/packs/ultimatemodularcharacters.html
- 官方共享目录：https://drive.google.com/drive/folders/1USAAquX2JJWuA2m6zol0KUkFe3UkZ8zX
- MakeHuman 授权复核：https://static.makehumancommunity.org/about/license.html
- Kenney 模块化人物复核：https://kenney.nl/assets/modular-characters
- 本地授权证据：`assets/models/source/character/QUATERNIUS_MODULAR_MEN_LICENSE.txt`
- 授权：CC0 1.0 Universal。

本地源文件与 SHA-256：

| 文件 | 用途 | SHA-256 |
| --- | --- | --- |
| `quaternius-modular-men/Suit.gltf` | 短发头部和目标骨架 | `6c89fbb31b96c1a63ad94e3dee0942bd7b34bc789a5d39fd6a6a1738a9214fb3` |
| `quaternius-modular-men/Casual_Hoodie.gltf` | 中性连帽上装 | `dd74886c26998a0fa888b4ce557a0932d7d97b0265dd4c763154d081b7a6cb98` |
| `quaternius-modular-men/Casual_2.gltf` | 直筒长裤和运动鞋 | `55c654d09a2a5ff6e3bd6158d4a1b462f181cd6f1e12a0f5e9d959f9c3abc438` |

## 本地参考图

| 文件 | 来源与用途 | 视角 |
| --- | --- | --- |
| `assets/models/source/character/references/ultimate-modular-men-preview.jpg` | Quaternius 官方总览，比较 11 套人物的服装轮廓和模块边界 | 正面群像 |
| `assets/models/source/character/urban-wanderer-preview.png` | 本项目固定机位 Blender 预览 | 正面三分之四全身 |

官方预览图 SHA-256：`ccf065362f4035d5a62a7a18dcb092365670d1e0877e55c1de0b5cc184652e4b`。

Canonical comparison view：人物正面三分之四、镜头接近胸口高度、覆盖全身。运行时另输出桌面和移动端后肩截图，作为真实游戏视角证据。

## 最终组合

- `Slot_Head_Default`：来自 `Suit_Head`，保留短侧分发型；轻微收窄头宽并降低眼睛高度，不做夸张民族特征。
- `Slot_Upper_Default`：来自 `Casual_Hoodie`，无 Logo、无职业符号、无外置配件。
- `Slot_Lower_Default`：来自 `Casual_2` 的直筒长裤。
- `Slot_Shoes_Default`：来自 `Casual_2` 的低帮运动鞋。
- `Urban_Wanderer_Rig`：四个模块共享的 Humanoid 骨架。

这四个命名网格独立蒙皮，可在未来替换头部、上装、下装和鞋子而不改变移动代码。上装和下装的运行时选择 UI 本期省略。

## 视觉推导

- 黑色侧分短发、暖中性东亚肤色和稍窄眼型共同建立中国城市青年印象，但不通过夸张眼形、肤色或脸型制造刻板符号。
- 灰绿色连帽上装、深蓝灰直筒裤和暖灰运动鞋使用邻近低饱和色，不再通过大面积高对比色块区分身体部件。
- 服装只使用高粗糙度、无金属材质；移除未使用的 UV、顶点色和贴图，减少运行时体积。
- 源 glTF 为硬法线拆分了大量同位置顶点；生成器在清理未使用属性后焊接完全重合顶点并重算法线，使上衣、下装、皮肤和鞋面形成连续明暗，不依赖降低对比度掩盖色块。
- 不增加徽记、武器、背包、肩带或故事道具。
- 不使用 Messenger、小红书视频或第三方照片作为运行时纹理。

## 动画与运行时规格

- 单个 `urban-wanderer.glb` 同时包含模型、骨架和三个动作：
  - `Idle_Neutral`
  - `Walk`
  - `Run`
- 行走和奔跑按普通移动与 Shift 冲刺切换，动作交叉淡化时间为 0.16 秒。
- 跳跃仍使用现有角色整体位移，本期不增加单独跳跃姿势，以免引入不兼容骨架或过重游戏表现。
- 运行时 GLB：378,492 bytes、6,714 triangles、3,539 exported vertices、67 nodes、1 skin、9 materials、0 images。
- 角色只加载一个 GLB，不再额外下载 7.6MB 动画库。

## 镜头规格

- 距离：`5.0`
- 高度：`1.95`
- 目标高度：`1.45`
- 角色视觉缩放：`1.15`
- 右肩偏置：`0.9`
- 目标侧偏：`0.12`

目标是桌面后肩视图中角色约占画面高度 36%～40%，移动端约占 40% 左右，同时不遮挡街巷消失点。

## 验收要求

- 桌面 1440×1024 和移动端 390×844 均输出实机截图。
- 待机、行走、奔跑动作均在真实页面运行。
- 浏览器 page errors 为空。
- GLB 节点和源码均不得包含 `Backpack`、`Bag`、`ShoulderStrap`。
- 自动测试覆盖模块节点、骨架、动作名、运行时体积和源码授权。
- 保留英文命名的生成器、GLB、Blend 和固定机位预览。

## 明确省略

- 本期不做换装 UI、面部表情状态机、布料模拟和发丝物理。
- 不做背包、挎包、手提包或其他替代携带物。
- 不新增角色任务、NPC 或场景物件。
- 不追求写实皮肤；目标是与当前墨线、纸张和低多边形街区协调的精致写意人物。
