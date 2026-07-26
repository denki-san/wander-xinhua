# 剩余 10 栋建筑公开调研证据索引

## 范围

本索引只整理剩余 10 栋建筑的公开调研证据，不包含候选 GLB、Blender
工程、生成器、运行时接线、测试截图、完成状态或生产发布结论。

本批证据包含：

- 13 份可供检索的 `docs/knowledge-sources/` Markdown；
- 21 份来源清单、公开检索记录、查询合同或证据清单；
- 27 张只用于研究对照的本地参考图；
- 1 份未取得原始媒体的目录状态说明；
- 本索引 1 份。

原始图片只读保留，不嵌入 GLB，不作为运行时贴图。证据中的
`blocked`、`prepared`、`unknown` 等状态保持原样，不因进入 `main`
而升级为建模授权或建筑完成结论。

## 建筑与证据入口

| 建筑 | 主要 Markdown | 结构化证据与本地素材 | 当前边界 |
| --- | --- | --- | --- |
| Shanghai Cinema | `docs/knowledge-sources/shanghai-cinema-public-anchor-evidence-2026-07-26.md`、`shanghai-cinema-public-exact-anchor-rescue-2026-07-26.md`、`shanghai-cinema-official-anchor-evidence-exhaustion-2026-07-26.md` | `docs/research/shanghai-cinema-*.json`、`shanghai-cinema-exact-anchor-road-setback-audit.md` | 公开检索未取得可标定总平，不能据此修改精确锚点 |
| Xinhua Villas 211 | `docs/knowledge-sources/xinhua-villas-211-public-primary-source-rescue-2026-07-26.md` | 对应 rescue JSON、reference manifest、`docs/research/assets/poi-references/xinhua-villas-211/` | 成员身份信息有所增加，但 member-to-way 绑定仍未闭合 |
| Xinhua Villas 329 | `docs/knowledge-sources/xinhua-villas-329-subject-contract-public-rescue-2026-07-26.md`、`xinhua-villas-329-xhs-evidence.md` | 对应 subject JSON、XHS inventory、reference manifest、官方照片和 XHS 参考图目录 | 历史建筑群与单体语义仍需授权，图片只能作为参考 |
| Shanghai Orchestra | `docs/knowledge-sources/shanghai-orchestra-public-primary-source-rescue-2026-07-26.md` | 对应 rescue JSON、reference manifest、`docs/research/assets/poi-references/shanghai-orchestra/` | 地址与功能得到佐证，正式地图成员关系仍阻塞 |
| Xinhua Community Center | `docs/knowledge-sources/xinhua-community-center-official-service-road-evidence-exhaustion-2026-07-26.md` | 对应 exhaustion JSON、reference manifest | 缺少可测量的服务道路合同，不能据此移动或重建 |
| Debi Fahua 525 | `docs/knowledge-sources/debi-fahua-525-public-primary-source-rescue-2026-07-26.md` | 对应 primary-source rescue JSON | 公开资料没有闭合地图和成员关系 |
| Fahua Heritage | `docs/knowledge-sources/fahua-heritage-public-evidence-rescue-2026-07-26.md`、`fahua-heritage-xiaohongshu-query-contract-2026-07-26.md` | 对应 public rescue JSON、Xiaohongshu query contract JSON | 已找到街景语境；后侧和地图边界仍阻塞，XHS 查询尚未执行 |
| FICS Xinhua 365 | `docs/knowledge-sources/fics-xinhua-365-public-primary-source-rescue-2026-07-26.md` | 对应 primary-source rescue JSON | 公开语境通过，正式成员和道路表面语义仍阻塞 |
| Xingfuli West | `docs/knowledge-sources/xingfuli-user-photo-route-2026-07-26.md` | 用户照片序列、West reference manifest、West XHS query contract、共享 `xingfuli-reference-manifest.json` | 查询合同已准备，不能据此直接改变 placement 或 collision |
| Xingfuli East | `docs/knowledge-sources/xingfuli-user-photo-route-2026-07-26.md` | 用户照片序列、East XHS query contract、共享 `xingfuli-reference-manifest.json` | 查询尚未执行，地图阻塞未解除 |

## 使用规则

1. 先阅读对应 Markdown，再读取同名或表中列出的 JSON。
2. 结论必须继续区分观察、推断和未知；不得把“公开检索耗尽”改写为
   “不存在其他证据”。
3. 本地图片只用于参考、审计和 canonical comparison，不复制受保护商标，
   不直接进入运行时资产。
4. 后续取得新的原始证据时新建文件或增量清单，不覆盖、删除本批原始证据。
5. 建筑优化完成仍需独立满足 Blender、GLB 和 Three.js 三层验收，本索引不代表
   任何一栋建筑已经完成。
