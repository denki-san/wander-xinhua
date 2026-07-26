# 新华别墅211弄 local-only same-member evidence rescue

## 裁决

本地证据救援未解除 Hero blocker，正式状态为
`blocked-local-evidence-exhausted-no-same-member-way-depth-lineage`。

accepted Massing v3 的九个 footprint 保持原样，不重开 MCP1、地图或碰撞。
仓内没有任何证据组合能同时满足：

1. 照片主体绑定到九个 accepted OSM way 中的具体 member；
2. 同一 member 有完整 side/depth、rear 与 roof-back；
3. Hero 从 accepted Massing SHA `ab05b4ec...` 确定性派生。

因此旧 Hero 继续保留为 hold，不是 MCP2 candidate；不授权新 Hero、Identity、
runtime、registry、Fast 或 exact 改动。

## 搜索量化

| 语料 | 数量 | 结果 |
| --- | ---: | --- |
| 唯一本地 ref tip | 72 | 全部纳入可达历史 |
| `xinhua-villas-211` 文本历史 commit | 43 | 无第二套 accepted-way Hero lineage |
| “新华别墅”文本历史 commit | 16 | 无新门牌 assignment |
| “211弄”文本历史 commit | 28 | 无新门牌 assignment |
| 当前树精确命中文件 | 56 | 已归类 |
| Recovery/Hold 精确命中文件 | 30 | 已归类 |
| 专用 manifest 历史版本 | 4 commit / 3 blob | union 仍为四个自有 capture |
| 共享 manifest 历史版本 | 6 commit / 6 blob | 旧版只增一个入口轴线 capture |
| 211 自有真实照片路径 | 6 | 5 个二进制 SHA、4 个摄影 capture |
| 自生成 / runtime 画面路径 | 13 | 全部拒绝为实景证据 |
| accepted member 绑定 | **0 / 9** | 九个 way 的门牌均 unknown |
| same-member 完整 depth set | **0** | blocker 保持 |

## 四个自有实拍 capture

- 冬季 compound 入口轴线：原图与 public POI 字节相同，thumbnail 是同一
  capture 的重编码；不绑定具体 member。
- 夏季 compound 入口轴线：与冬季照片是不同时间拍摄，但观察轴线相同；
  告示牌上的小地图不能可靠地理配准九个 footprint。
- 211弄1号正面：能观察暖色粗糙墙面、红瓦檐、拱形开口、退台和烟囱，
  但只有局部左翼，未覆盖完整侧后面，也不知道对应哪个 accepted way。
- 211弄2号正面斜视：能观察红坡屋顶、长老虎窗、玻璃前廊和半木构山墙，
  但无完整背面 / roof-back，也不知道对应哪个 accepted way。

这两张成员照片证明“有1号和2号两个不同成员”，不证明它们在 accepted
Massing 九个 footprint 中的位置、朝向或门牌 assignment。

## 拒绝的候选

旧“329代表图”已被既有审计判断为与211弄2号显示同一栋建筑，但本任务明确
禁止借用329素材。它的 public copy 与 thumbnail 合计三条路径、一个摄影
capture；即使越权纳入，仍没有 way assignment，也没有完整背面和 roof-back。
本地18张329 XHS图片与一张 contact sheet 未打开、未读取内容、未计入证据。

legacy Hero、Recovery voxel Massing、accepted Massing 的 canonical/side、
MCP1 与 Three.js 截图均是生成物。它们可以证明已有几何或页面状态，不能反向
证明真实成员身份、未见侧后面或门牌分配。

## Lineage 负证据

- accepted Massing v3：九 node / 九 mesh，134 triangles，所有 node 都有
  `source_way_id`，但 `house_number=unknown`。
- legacy Hero：全历史只有一个 GLB blob 和一个 Blend blob；生成器的相关
  函数在七个 commit 快照中内容相同，始终是四栋固定排布。
- Recovery Massing：从 legacy Hero 执行 `voxel-remesh-current-hero`，
  不是从 accepted 九-way Massing 派生。
- legacy Hero 没有 `accepted-massing-sha`、member identity 或
  `derivedFrom`，六个 accepted member 甚至超出其 local AABB。

文件名都含 `xinhua-villas-211` 不是 lineage；必须能回放同一 member、
footprint、origin、front、scale 与 collision semantics。

## 最小补证

1. 用授权总平、survey、可定向清晰门牌图或用户确认布局，把211-1或211-2
   绑定到九个 accepted OSM way 中的具体一个；
2. 为同一已绑定 member 提供独立侧向或斜后实拍，闭合进深、侧墙、完整
   roof-back 与背面；
3. 记录观察方向、入口方向、ground datum 和未知边界；
4. 新 Hero build record 必须记录 `derivedFrom` accepted Massing SHA
   `ab05b4ec...`，不得复用旧四栋 Hero。

本轮未联网、未访问浏览器/XHS、未打开 Blender、未重建模型，也未修改
Recovery/Hold、runtime、registry、Fast、exact、329或其他资产。
