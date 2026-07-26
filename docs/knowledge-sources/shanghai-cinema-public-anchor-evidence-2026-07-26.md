---
type: evidence-source
title: Shanghai Cinema public exact-anchor evidence rescue
status: blocked-no-dimensioned-site-plan
asset_id: shanghai-cinema
researched_at: 2026-07-26
tags: [wander-xinhua, shanghai-cinema, map-calibration, official-source, exact-anchor]
---
# 上海影城公开精确锚点补证

## 范围

本来源仅服务严格 18 栋中的 `shanghai-cinema`。它不授权树木、装饰物、普通
OSM 体块、全地图资产或其他建筑变更，也不覆盖 Recovery/Hold。

结构化裁决记录：
`docs/research/shanghai-cinema-public-exact-anchor-rescue-2026-07-26.json`。

## 研究问题与质量门

问题是：能否找到带北箭头、比例尺，并至少把两个上海影城主体点同时绑定到
总平/WGS84 与当前 GLB 本地坐标的官方或设计方资料？

最低通过条件：

1. 北箭头；
2. 比例尺或尺寸链；
3. 两个非重合、同时能在总平和 GLB 中唯一定位的主体点；
4. 若比例仍未锁定，再增加比例数据或第三个非共线点。

只有透视照片、地址、OSM 面积质心或未绑定的重叠 way 均不足以通过。

## 来源

### 上海市文化和旅游局

- URL:
  `https://whlyj.sh.gov.cn/gqfc/20230606/d8c37f8ae8754ffb8c65e9cf6bf2b000.html`
- 观察：官方报道明确，影城门前原本台阶环绕的空间改为平缓公共广场，并
  “无缝衔接人行道”。
- 边界：页面没有北箭头、比例尺或双控制点。

### 上海市长宁区规划和自然资源局

- URL: `https://www.shcn.gov.cn/col7696/20230331/1233581.html`
- 观察：页面记录上海影城立面改造项目及竣工规划资源验收推进。
- 边界：公开正文没有可地理配准的主体总平。

### 上海市长宁区人民政府施工许可索引

- URL:
  `https://zwgk.shcn.gov.cn/xxgk/jzscgl-jgwzdgz/2022/313/64863.html`
- 观察：上海影城修缮项目地址为新华路 160 号，项目编号为
  `2102CN0309D01`。
- 边界：许可索引没有公开场地图、北箭头、比例尺或控制点。

### 上海市规划和自然资源局

- URL: `https://ghzyj.sh.gov.cn/cn/20211118/758d1e18ca8b4aaf8c7d9f17b98952df.html`
- 观察：番禺路周边更新以南部上海影城城市更新项目为核心。
- 边界：这是区域级策略，不是建筑级地理配准资料。

### ARCHINA / 华建集团上海建筑设计研究院项目资料

- URL:
  `https://www.archina.com/index.php?a=show&g=works&id=156570&m=index`
- 观察：既有本地参考清单保存了该项目的建成立面、GRC 飘带、玻璃幕墙、
  旋转楼梯和设计模型资料。
- 边界：这些资料可服务视觉结构判断，但没有满足本次双点地理配准门的总平。
  本轮页面复核遇到重定向失败，因此地图裁决不依赖该页面。

## 观察

- 官方“公共广场无缝衔接人行道”的表述支持用户指出的当前退界观感错误。
- 既有精确审计量化：当前 plaza envelope 相对同一 OSM 主体 footprint
  多退 `9.121581436197431` scene units。
- SHA 锁定 accepted Blend 的建筑专属 exporter 已在两个独立 Blender
  进程中精确复现 public Hero；Hero source reproduction 已闭合。
- 本轮公开一手资料没有返回满足北箭头、比例尺与双控制点条件的正式总平。

## 推断

- 当前画面中的退界过远不是单纯道路宽度样式造成。
- 官方街道界面描述可以否定当前观感，但不能单独决定应平移 registry、
  修改模型本地原点、重做 footprint，还是组合处理。

## 未知

- 主入口中心、主丝带端点和塔楼角点的 WGS84 坐标。
- 改造后路缘、人行道和主体墙线的测绘边界。
- OSM 综合体外轮廓与建成墙线的误差。
- 小红书登录态内容是否含可标定侧向街景、航拍或正式总平。

## 当前裁决

- 保留 Hero、Hybrid Identity、Massing、Blender MCP 1/2/3 和已通过的
  Three.js 三档证据，不重做。
- 精确地图锚点继续阻塞；不移动 registry，不修改公共道路或碰撞。
- 用户睡眠期间不访问其登录浏览器。
- 用户可用时再慢速搜索小红书。若仍无法补齐质量门，按用户授权只从游戏
  registry/runtime 停用本栋；所有 GLB、Blend、生成器、证据和
  Recovery/Hold 文件永久保留。
