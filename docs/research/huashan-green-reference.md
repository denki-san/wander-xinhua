# Huashan Greenland modeling reference

## 地理定位

- 华山绿地主入口为华山路 1500 号，OSM 场地边界为 way `444342095`。
- 本地原始快照：`docs/research/data/huashan-green-overpass-20260716.json`。
- OSM 内部 footway、篮球场 way `743778425` 和一层配套建筑 way `743778426` 使用与新华路街道相同的投影。

## 必须可识别的环境

1. 城市森林：高密度成熟乔木、深浅不同的林下灌木和透光林冠，而不是一块空草坪。
2. 园路系统：按 OSM 真实 footway 呈现灰褐/石灰色曲折步道，并保留主次路宽差异。
3. 水景与栈桥：浅水池、水生植物、低矮木栈桥和亲水岸线，对应 2019 年水体清淤、木栈道修复与“栈桥生趣”。
4. 运动休憩：篮球场、围网、球架、健身点、儿童活动区、长椅与公共照明。
5. 林森鸟啼：鸟笼架/观鸟架作为小型地标，搭配密林和庭院灯。
6. 幸福角微更新：在幸福路、泰安路转角以浅色花架、花境和仪式性小庭院表达 2025 年底完成的“公园+幸福”节点，不新增任务或故事。

## 公开参考

- 长宁区政府 2026 年微更新说明：<https://www.shcn.gov.cn/col7560/20260319/1307134.html>
- 2019 年改造内容：<https://www.sohu.com/a/302286416_391447>
- 长宁区政府跑步路线实景组：<https://www.shcn.gov.cn/col6991/20250824/1296845.html>
- 长宁区公园城市规划：<https://zwgk.shcn.gov.cn/xxgk/zdxzjc-2024/2024/92/72630/733d05ebd722401ba49e609c2939df0f.pdf>
- OpenStreetMap 场地：<https://www.openstreetmap.org/way/444342095>

## 本地照片组与同主体核验（2026-07-17）

| 本地文件 | 角度 | 同主体交叉证据 |
| --- | --- | --- |
| `docs/research/assets/poi-references/huashan-greenland/running-track-canonical.jpg` | 跑道入口标准视图 | 红色弹性跑道、米色边线、成熟乔木与林下绿地 |
| `docs/research/assets/poi-references/huashan-greenland/curved-track.jpg` | 弯道侧视 | 同色跑道与边线进入连续密林，路缘和照明语言一致 |
| `docs/research/assets/poi-references/huashan-greenland/forest-track.jpg` | 林中纵深视图 | 同一红色跑道、成熟树阵、灌木层和透视连续关系 |

三张照片来自同一长宁区政府跑步路线页面，并连续展示华山绿地内部同材质跑道；红色路面、米色边线、成熟乔木密度和林下植被重复出现，判定为同一公园路线。`running-track-canonical.jpg` 为卡片标准图。

## 本轮细节提升门槛

- 改造前基线：`55` 个 JSX mesh 标签、`27` 个 geometry 标签。
- 新增细节必须来自照片或 OSM：跑道双侧边线、排水沟、里程标、路灯、树池/根部、灌木层、休息座椅和入口导向构件。
- OSM way `444342095` 继续约束公园边界；跑道与步道不得阻断主路，树木碰撞仅使用树干半径，绝不使用树冠包围盒。

未在公开地图中出现精确轮廓的水体、栈桥和微更新花园，只按公开文字与照片做风格化复原，不冒充测绘数据。
