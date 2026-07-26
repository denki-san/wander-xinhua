# 法华遗韵 local-only evidence rescue

## 正式裁决

本地证据救援未解除 blocker，状态为
`blocked-local-evidence-rescue-exhausted`。

当前仓库、历史 Git、Recovery/Hold、OSM/地图和生成记录中，真实同主体素材仍
只有一个正面摄影 capture。没有合格侧后/纵深、道路侧接近路径或 site boundary
证据，因此：

- canonical front：通过；
- depth / side：`0` 张，blocked；
- street / entry interface：`0` 张，blocked；
- formal map：blocked；
- 不授权新建模、移动 placement、修改 runtime/registry 或公共 Fast/exact。

## 搜索量化

| 语料 | 数量 | 结果 |
| --- | ---: | --- |
| 唯一本地 Git ref tip | 72 | 全部纳入可达历史 |
| 改动 `fahua-heritage` 的历史 commit | 20 | 未发现第二实景机位 |
| 改动“法华遗韵”的历史 commit | 11 | 未发现第二实景机位 |
| 当前树精确文本命中文件 | 16 | manifest、brief、runtime、generator 与既有 disposition |
| Recovery/Hold 精确文本命中文件 | 20 | Massing、map binding、runtime QA 与生产计划 |
| 历史 manifest 版本 | 6 个唯一 blob | 全部只有 `1 × front` |
| 历史相关图片路径 | 8 | 3 个同主体真实路径、1 个错误主体、4 个自生成画面 |
| 同主体真实图片唯一 SHA | 2 | 同一正面照片的原图/复制与 thumbnail 重编码 |
| 同主体唯一摄影 capture | **1** | 仅正面 |

`docs/research/assets/requested-poi-references/fahua-heritage-arch.jpg` 与
`public/images/poi/fahua-heritage.jpg` 字节完全相同；thumbnail 虽有不同 SHA
和尺寸，但目视是同一正面照片的另一编码/裁切，不能算第二视角。

## 候选拒绝

- `debi-fahua-525-heritage-stone.jpg` 是德必法华525园区内“缘石”和水景，
  不含本构筑物，属于 wrong subject。
- legacy preview 是单张正面驱动模型的渲染。
- Recovery Massing side 是从该 legacy Hero voxel-remesh 后得到的侧视，
  只能显示模型推断厚度，不能证明真实纵深。
- Recovery Three.js 图中的道路关系来自当前 registry placement；拿它验证
  placement 会形成自证循环。

## OSM 与地图负证据

`requested-pois-osm-20260717-103840.json` 没有 `fahua-heritage` target；
Recovery map-binding 对本栋记录：

```text
geometryRole=site-feature
osmWayCandidates=[]
corroboratingOsmNodes=[]
```

当前法华镇路和香花桥路的静态 asphalt 净距分别为 `0.829113` 与
`3.061200` 场景单位，只证明当前矩形没有压入路面。最近建筑
`way/292250767` 距当前资产包络 `10.209695` 场景单位（`27.566 m`），且标签
为“丹蓝打印店”、`building=university`，不能替代法华遗韵 site footprint。

因此仓内仍没有构筑物 OSM geometry、entrance、路缘/人行界面边界或真实街景，
无法证明 position、yaw、scale、厚度和可绕行范围。

## 最小补证

1. 一张同主体侧向或斜后实景，同时显示柱/展板厚度、短瓦檐进深和背面关系；
2. 一张同主体街道宽景或带北向/比例的场地总平，同时显示任一相邻道路、
   路缘/人行界面、构筑物全体和右侧贴邻墙面；
3. 明确观察方向；如需改 placement，还需要两个能在 GLB 与 WGS84/总平中
   共同定位的非重合点。

本对象不是通行建筑，street/entry 门应理解为“道路侧接近路径与展板前人行
界面”，不要求虚构门洞。

## 范围与策略

公共 cross 文件使用审查时 baseline Git blob
`5bde93350c1845278a54f5a34a598aa92d0c681d`；Recovery/Hold 只读取
`3044cd89f801250afcd477dfbcbc7da358bf4b11` 中的 blob，没有复制或修改。
本轮未联网、未访问浏览器/Xiaohongshu、未打开 Blender，也未触碰公共
runtime、registry、Fast/exact、树木、装饰、全地图或其他建筑。
