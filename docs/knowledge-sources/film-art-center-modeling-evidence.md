# Shanghai Film Art Center / Xinhua 200 Modeling Evidence

## Subject boundary

- Observation: 上海电影艺术中心由多栋建筑共同组成；本模型只对应新华路200号历史花园住宅“新华两佰”，不对应新华路160号现代上海影城。
- Evidence: `docs/research/film-art-center-reference-manifest.json`; [千龙网](https://culture.qianlong.com/2025/0701/8514479.shtml); [长宁区人民政府](https://www.shcn.gov.cn/col6991/20240618/1261652.html).

## Observed architectural identity

- Observation: 南立面近对称，主体为三层白色花园住宅。
- Observation: 顶部是覆盖主体全宽的红色中式大屋顶，带密集瓦垄与四角起翘。
- Observation: 首层和二层均有连续柱列与深廊；二层前缘有连续白色栏杆和红瓦檐。
- Observation: 三层中央为内退凉廊，两侧是深色窗组。
- Observation: 南入口有黑底金字牌匾、深色门扇、台阶与成对卧狮。
- Evidence: `docs/research/assets/poi-references/film-art-center/`; [City News Service / shanghaigov](https://www.citynewsservice.cn/articles/cns/city-news/journey-through-time-and-style-explore-historic-buildings-along-xinhua-road-gno57axm).

## Inference and unknowns

- Inference: 公开资料没有测绘尺寸，本轮以照片比例和既有运行时包络重构立面，整体尺寸只作为视觉尺度。
- Inference: 两侧低矮玻璃空间只做场地提示，不扩展为完整四栋建筑群。
- Unknown: 精确长宽高、柱距、屋面坡度、东西侧与北立面、内部连接及长排玻璃房完整边界。

## Runtime decisions

- 模型正面保持朝 Blender 本地 `-Y`。
- `1 scene unit = 2.7 m`，但当前高度含风格化可读性补偿，不宣称实测。
- 草坪、入口路径和开放院落不使用单一大碰撞盒封闭。
- 参考照片仅用于研究，不进入 GLB 或运行时贴图。
