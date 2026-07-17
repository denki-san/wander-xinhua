# 新增 POI 建模基准

本文记录邬达克纪念馆、新华路口袋公园、新华·社区营造中心、德必法华 525／法华遗韵、FICS 新华 365 的参考来源、建模判断和验收口径。照片只作为人工结构与配色参考，不进入运行时贴图。

## 共通约束

- 风格：延续现有低多边形、手绘感、暖灰和低饱和植被的街区语言；各地标必须依靠轮廓和至少三处专属构件可辨认。
- 比例：沿用 `1 Blender/场景单位 = 2.7 米`；地标数据的 `scale` 只做照片与路网之间的小幅视觉校准，不承担米制换算。
- 坐标：经纬度和建筑轮廓优先使用本次新增的 OSM/Overpass 快照；仅有地址而缺少轮廓时，位置判断必须在文中标为推断。
- 朝向：Blender 模型正面朝本地 `-Y`，导入 Three.js 后由场景放置数据控制朝向。
- 资产政策：不嵌入参考照片，不复制摄影素材，不使用受保护商标贴图；中文 POI 名称以原创几何文字或运行时 HTML 标签表达。
- 碰撞：实体建筑、围墙和不可穿越水体进入人物碰撞；可步行园路、庭院、草坪和口袋公园路径保持开放。
- 摄像机：每个 POI 提供独立 `?start=` 入口，出生点和第三人称相机均不得落在建筑包络内。

## 邬达克纪念馆

- 地址：上海市长宁区番禺路 129 号。
- 建筑事实：1930 年建成，三层，都铎复兴风格，原名邬达克旧居。
- 位置证据：OSM way `494633921`，含完整建筑轮廓、地址、层数和历史建筑标签；新快照投影中心约为场景坐标 `[91.34, -131.74]`。
- 主要参考：
  - Wikimedia Commons：<https://commons.wikimedia.org/wiki/File:Hudec_House.jpeg>
  - 上海长宁《邬达克在番禺路的家，是如何设计的？》：<https://www.shcn.gov.cn/col6991/20260405/1307940.html>
  - 上海市政府英文资料：<https://service.shanghai.gov.cn/sheninfo/specialdetail.aspx?Id=94fd19b2-4068-4cad-82fd-317f0650bb61>
- 本地照片：
  - `docs/research/assets/requested-poi-references/hudec-memorial-front-wikimedia.jpg`
  - `docs/research/assets/requested-poi-references/hudec-memorial-west-elevations.jpg`
- 典型对照图：`hudec-memorial-front-wikimedia.jpg`，正立面略偏右视角。
- 轮廓与体量：陡峭双坡屋面、右侧老虎窗、两端高烟囱、白墙与深色半木构形成强对比。
- 开窗节奏：首层和二层为窄高分格窗，右侧入口有突出陡坡小门廊。
- 材料：暖白灰泥、近黑色木构、深灰褐瓦、红砖烟囱、暗绿玻璃。
- 专属识别点：
  1. 深色都铎半木构；
  2. 陡坡屋顶与老虎窗；
  3. 三角入口门廊；
  4. 红砖拱门与围墙；
  5. 前院圆形树池。
- 场地环境：保留前院铺装、圆形树池、矮绿篱和街侧红砖围墙。
- 省略：室内陈列、真实品牌牌匾细节和被植被完全遮挡的后立面。
- 碰撞：主楼、门廊、围墙和圆形树池分别处理，入口步道保持可进入。

## 新华路口袋公园

- 地址：新华路 359 号新华社区青年中心旁。
- 建成时间：2020 年 9 月 29 日。
- 设计：水石设计；场地约 106 平方米，长约 22 米，最宽不足 4.2 米。
- 位置证据：地址与设计方资料明确；OSM 无独立条目，按 345 弄入口、既有 365 弄落点和新华路中心线推定为场景坐标 `[-56.9, 66.3]`，快照明确标记 `inferred: true`。
- 主要参考：
  - 水石设计授权发布资料：<https://mooool.com/pocket-park-on-xinhua-road-shanghai-byshuishi.html>
  - 小红书路线笔记：<https://www.xiaohongshu.com/explore/6839b9ee000000001200584c>
- 本地照片：
  - `docs/research/assets/requested-poi-references/xinhua-pocket-park-canonical.jpg`
  - `docs/research/assets/requested-poi-references/xinhua-pocket-park-signage.jpg`
- 典型对照图：`xinhua-pocket-park-canonical.jpg`，从入口向弄堂深处观察。
- 轮廓与空间：狭长弄堂型花园，蜿蜒浅色洗石路径贯穿，两侧镜面墙把空间视觉放大。场地“最宽不足 4.2 米”按 `2.7 米/场景单位` 换算为约 `1.55` 场景单位，不能把 4.2 米直接当场景单位。
- 材料：镜面不锈钢、耐候钢、浅灰洗石、深色木坐凳、粉紫和深绿植物。
- 专属识别点：
  1. 两侧连续折面镜墙；
  2. 耐候钢入口框和顶部起伏线；
  3. 标有新华路历史建筑信息的彩色旋转展板；
  4. 粉黛乱子草和低层花境；
  5. 入口木坐凳。
- 场地环境：完整保留可行走路径；花境和墙体构成窄而连续的边界。
- 省略：镜面中的真实摄影反射、二维码和具体展览文字。
- 碰撞：只阻挡镜墙、花池和坐凳，中心路径可全程行走。

## 新华·社区营造中心

- 地址：新华路 345 弄 4 号楼。
- 建筑事实：两层改造建筑，中心总场地约 840 平方米，主楼外有草坪、运动角和社区花园。
- 位置证据：上海长宁和人民网均明确地址；OSM node `13765678129` 精确标注“新华社区营造中心”，投影约为场景坐标 `[-74.78, 112.55]`。
- 主要参考：
  - 上海长宁《新华社区这个“大橘子”因何频频出圈？》：<https://www.shcn.gov.cn/col7343/20230609/1237981.html>
  - 上海长宁《全市首个！“新华·社区营造中心”正式启用》：<https://www.shcn.gov.cn/col7343/20220926/1222508.html>
  - 人民网上海：<https://sh.people.com.cn/n2/2022/0926/c134768-40139459.html>
- 本地照片：
  - `docs/research/assets/requested-poi-references/xinhua-community-center-front.jpg`
  - `docs/research/assets/requested-poi-references/xinhua-community-center-toy-house.jpg`
- 典型对照图：`xinhua-community-center-front.jpg`，主楼正面。
- 轮廓与体量：低矮两层白色建筑，平屋顶，立面中央有向前突出的银灰金属门斗。
- 开窗节奏：横向大窗、玻璃入口、左侧斜向雨棚和右侧白色小方砖。
- 材料：暖白涂料、白色小方砖、银灰金属、深灰窗框、浅木花箱。
- 专属识别点：
  1. 中央高挑银灰门斗；
  2. 橙色“4号”圆角标识；
  3. 橙色“大橘子”窗面图形；
  4. 入口无障碍坡道和木花箱；
  5. 林下黑色玩具交换屋。
- 场地环境：草坪、低碳花园、蓝色运动角和玩具交换屋作为可进入场景元素。
- 省略：室内货架、活动海报文字和临时市集摊位。
- 碰撞：主楼与玩具屋阻挡，草坪、入口坡道和公共活动区开放。

## 德必法华 525

- 地址：法华镇路 525 号。
- 建筑事实：约 5428.17 平方米、六层主楼和四进庭院；原法华寺旧址，保留“缘石”和两株古银杏。
- 位置证据：德必官网地址明确；OSM 缺少 525 号独立条目。先以道路锚点 `[-91, -13]` 建立研究快照，再结合道路南侧的 OSM 建筑群与法华镇路 525 号院落尺度，把资产中心退到 `[-102, -49]`；两步均标记为推定。该位置的完整场地包络已退出法华镇路和定西路路面。
- 主要参考：
  - 德必官网：<https://www.dobechina.com/projects/mandr/77>
  - 法华镇历史资料：<https://www.thepaper.cn/newsDetail_forward_1527205>
- 本地照片：
  - `docs/research/assets/requested-poi-references/debi-fahua-525-front.jpg`
  - `docs/research/assets/requested-poi-references/debi-fahua-525-courtyard.jpg`
  - `docs/research/assets/requested-poi-references/debi-fahua-525-garden.jpg`
  - `docs/research/assets/requested-poi-references/debi-fahua-525-heritage-stone.jpg`
- 典型对照图：`debi-fahua-525-front.jpg`，主楼入口左前仰视。
- 轮廓与体量：六层白灰现代主楼，竖向框架强烈，侧面外置折返楼梯；低层庭院建筑围绕竹林、鱼池和古树组织。
- 材料：白色涂料、深灰玻璃、黑色金属、浅色条石铺地、竹木和银杏绿。
- 专属识别点：
  1. 白色巨型竖框立面；
  2. 外置折返楼梯；
  3. 屋顶“法华 525”轮廓字；
  4. 竹林、鱼池和四进庭院；
  5. 古银杏与法华寺“缘石”。
- 场地环境：主院路径连续，竹林和水池形成可绕行的中心景观。
- 省略：办公室内、停车车辆和真实公司商标贴图。
- 碰撞：主楼、低层翼楼和鱼池阻挡；庭院、连廊下方和主要入口开放。

## 法华遗韵

- 地址：法华镇路与香花桥路交会处。
- 位置证据：澎湃转载上海长宁资料明确为“法华镇路香花桥路口”；地图中两条 OSM 道路中心线交点为场景坐标 `[-70.17, -0.57]`。参考照片显示它是紧邻建筑界面的三间纪念展板，不是横跨道路的通行牌坊；资产缩小到约 10 米宽并沿法华镇路方向放在交叉口东南侧人行界面，中心为 `[-63.4, -2.6]`。
- 主要参考：
  - <https://www.thepaper.cn/newsDetail_forward_11011983>
  - <https://www.thepaper.cn/newsDetail_forward_1527205>
- 本地照片：`docs/research/assets/requested-poi-references/fahua-heritage-arch.jpg`
- 典型对照图：`fahua-heritage-arch.jpg`，正立面。
- 轮廓与材料：灰石三间纪念构筑物，中间横额、两侧短瓦檐，中央和两侧嵌深褐说明牌。
- 专属识别点：
  1. 中央四柱三间石构；
  2. “法华遗韵”金字横额；
  3. 两侧灰瓦短檐；
  4. 深褐历史说明板；
  5. 柱头简化云纹。
- 碰撞：四根石柱、中央说明板和两侧展板均阻挡；它不是可穿行门洞。

## FICS 新华 365

- 地址：新华路 365 弄。
- 建筑事实：东华大学科技园改造项目，前身包含德式花园洋房、上海搪瓷研究所和学生宿舍；园区包含多栋不同年代建筑，2023 年底完成改造。
- 位置证据：政府资料和现有新华公馆落点明确；OSM 缺少园区独立条目。研究中心先按 365 弄和 345 弄路网估为 `[-75, 82]`；整张地面路网复核后，园区枢轴调整到 `[-76.1, 75.2]`，让完整建筑包络退出新华路路面，推定状态不变。
- 主要参考：
  - 上海长宁开工资料：<https://www.shcn.gov.cn/col8288/20230426/1235290.html>
  - 建成后实景报道：<https://sghexport.shobserver.com/html/baijiahao/2024/07/02/1368152.html>
- 本地照片：
  - `docs/research/assets/requested-poi-references/fics-xinhua-365-aerial.jpg`
  - `docs/research/assets/requested-poi-references/fics-xinhua-365-main-building.jpg`
  - `docs/research/assets/requested-poi-references/fics-xinhua-365-courtyard.jpg`
  - `docs/research/assets/requested-poi-references/fics-xinhua-365-built-logo.jpg`
  - `docs/research/assets/requested-poi-references/fics-xinhua-365-built-courtyard.jpg`
  - `docs/research/assets/requested-poi-references/fics-xinhua-365-built-mansion.jpg`
- 典型对照图：`fics-xinhua-365-aerial.jpg`，鸟瞰右前方向；实景细节以三张 `built-*` 照片为优先依据。
- 轮廓与体量：由花园洋房、红砖坡顶建筑、白色工业改造楼、带植物纹样或红色艺术涂层的中高层建筑组成，中央为开放广场。
- 材料：白灰涂料、红砖、深灰瓦、深色玻璃、红黄橙点状遮阳构件、橙色室外楼梯。
- 专属识别点：
  1. 屋顶立体“FICS 365”标识；
  2. 红黄橙六边形遮阳孔；
  3. 橙色室外楼梯；
  4. 红色艺术涂层立面；
  5. 新华公馆红砖拱窗与露台；
  6. 围绕中央广场组织的多年代建筑群。
- 场地环境：开放广场、条带铺装、树阵、露台和园区主入口均可步行；不再使用覆盖整个园区的单块铺地，以免遮盖地图道路。
- 省略：具体商户招牌、临时活动装置和车辆。
- 碰撞：按各栋建筑分别生成，不使用覆盖整个园区的单一碰撞盒；广场和建筑间通道必须连通。

## 参考图版权边界

- 地理位置研究快照：`docs/research/data/requested-pois-osm-20260717-103840.json`。
- 研究照片不打包进运行时 GLB；全览 POI 卡片只远程引用公开来源中的代表图，并保留可点击的来源链接。
- Wikimedia Commons 照片按其文件页许可使用并保留作者信息。
- 上海长宁、上观新闻、澎湃、德必官网和水石设计授权发布页中的图片版权归原作者或来源机构所有；本项目不进行二次发布或素材贴图使用。
