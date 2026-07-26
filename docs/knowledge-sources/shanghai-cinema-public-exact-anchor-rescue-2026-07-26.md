---
type: evidence-source
title: Shanghai Cinema public exact-anchor rescue
status: map-anchor-blocked
asset_id: shanghai-cinema
collected_at: 2026-07-26
tags: [wander-xinhua, shanghai-cinema, map-calibration, public-primary-source]
---

# 上海影城公开 exact-anchor 补证

## 研究问题

公开的一手或设计方资料能否提供带北箭头、比例尺，并可把至少两个上海影城
主体点同时绑定到总平或 WGS84 与当前 GLB 本地坐标的证据？

本研究只服务 exact-18 的 `shanghai-cinema`。它不授权树木、装饰、全地图资产、
其他建筑或 Recovery/Hold 的任何改动。

## 来源

采集与主窗口回查日期均为 2026-07-26。

- 上海市文化和旅游局：
  <https://whlyj.sh.gov.cn/gqfc/20230606/d8c37f8ae8754ffb8c65e9cf6bf2b000.html>
- 上海市长宁区规划和自然资源局：
  <https://www.shcn.gov.cn/col7696/20230331/1233581.html>
- 上海市长宁区建设和管理委员会施工许可索引：
  <https://zwgk.shcn.gov.cn/xxgk/jzscgl-jgwzdgz/2022/313/64863.html>
- 上海市规划和自然资源局：
  <https://ghzyj.sh.gov.cn/cn/20211118/758d1e18ca8b4aaf8c7d9f17b98952df.html>
- ARCHINA 设计项目页：
  <https://www.archina.com/index.php?a=show&g=works&id=156570&m=index>
  （本次主窗口回查不可读，仅保留发现线索，不承担 map-anchor 结论。）

项目内结构化记录：
`docs/research/shanghai-cinema-public-exact-anchor-rescue-2026-07-26.json`。

## Observed

- 文旅局页面明确描述，改造前被台阶环绕的门前空间改为平缓公共广场，并与
  人行道连续衔接、面向市民开放。
- 长宁规资局页面确认上海影城立面改造项目及竣工规划资源验收推进。
- 长宁施工许可索引把 `2102CN0309D01` 绑定到“上海影城修缮项目”和
  新华路160号。
- 上海规资局页面提供番禺路片区和上海影城的区域更新语境，但不是建筑级总平。
- 上述可读取的一手页面均未公开同时满足北箭头、比例尺/尺寸链和两个可在
  当前 GLB 中唯一识别的地理控制点的图件。
- 当前建筑专属 exporter 已在两个独立 Blender 5.2.0 进程中逐字节复现
  已接受 Hero；Hero source drift 已关闭，不再是 blocker。

## Inferred

- 官方“公共广场与人行道连续衔接”的描述支持当前广场退界观感存在问题，
  但它只能加强问题可信度，不能求解新的平移、旋转、尺度或本地原点。
- 当前 map 失败更可能同时涉及规则化 footprint、前缘偏移与 anchor 关系，
  而不是一个可由道路距离等价平移解决的单变量误差。

## Unknown

- 主入口中心、主丝带端点、塔楼角点的 WGS84 坐标。
- 改造后墙线、路缘、人行道和主体外轮廓的测绘边界。
- OSM 综合体外轮廓与实际建成墙线之间的误差。
- 正确修复应落在 registry placement、GLB local origin、footprint，还是它们的组合。

## 裁决

公开补证没有达到 exact map anchor 门。当前三档资产、MCP 1/2/3 与 Three.js
既有合格阶段全部保留且不重做；不得任意平移、缩放、改窄道路或恢复旧 Film
AABB 冲突。

最小解锁证据是带北箭头和比例尺的官方、测绘、业主或设计方总平，并且至少标出
两个可在 OSM/WGS84 与当前 GLB 中同时唯一定位的主体点。若比例仍未固定，还需
尺寸测量或第三个非共线控制点。
