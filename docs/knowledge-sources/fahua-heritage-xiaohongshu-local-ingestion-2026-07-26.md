# 法华遗韵小红书本地帧证据接入（2026-07-26）

## 来源与保留边界

- 平台：小红书；笔记：`人文新华 法华遗韵`；作者：`AA禅艺居`；页面日期：`04-19`。
- URL：`https://www.xiaohongshu.com/explore/69e4f467000000001e00f7ab`。
- 采集记录时间：`2026-07-26T21:31:00+08:00`；查询：`法华遗韵 上海`。
- 原始证据只读位置：`/Volumes/plugin/3D_Modeling_ThreeJS_Knowledge_Base/wander-xinhua/building-evidence/fahua-heritage/xhs-2026-07-26/`。
- 原视频没有保存；本次只接入其中两张已存在的可见视频帧。
- U 盘 manifest 误写为 `test_xhs_fahua-heritage_195s.png` 与 `test_xhs_fahua-heritage_197s.png`；真实文件为 `test_fahua-heritage-xhs-195s.png` 与 `test_fahua-heritage-xhs-197s.png`。U 盘 manifest、说明文件和图片均未修改。

## 本地副本

- `docs/research/assets/xiaohongshu/fahua-heritage/original/test_fahua-heritage-xhs-195s.png` — SHA-256 `ad69d9e052daa46e79f6f11bdcde1b328cd5611c5fc211d16b171ca6aaf2cf40`。
- `docs/research/assets/xiaohongshu/fahua-heritage/original/test_fahua-heritage-xhs-197s.png` — SHA-256 `76eeb64bf9aac3781f17aeaedc6aec3f7c4c273ba4e36185224a7da1e4937980`。

## 观察

- `195.49625s`：完整四柱三间展板构筑物；右侧短瓦檐、侧板纵深、相邻青绿色墙面和 `518` 门牌、前方铺地与边缘高差均可见。
- `197.375981s`：近正面完整牌坊；左侧窄通行界面、完整铺地、相邻墙面关系和路缘高差可见。
- 两帧属于同一连续视频镜头，从右前斜向进入近正面。

## 推断与未知

推断：连续镜头支持右侧构造具有可见纵深，也支持构筑物与相邻墙面、前方铺地之间的关系。`518` 仅是相邻墙面可见门牌，不能单独作为精确地图锚点或法定地址。

未知：完整背面、精确位置与朝向、实测 footprint/尺度、道路和步道边界、完整可步行净空均未解决。

## 裁决

- side/depth evidence：`pass-xhs-continuous-video`
- street context evidence：`pass-xhs-continuous-video`
- exact map、背面与尺度：`pending`
- 本次不建模、不地图校准、不升级 MCP、不改 runtime/registry，也不触碰 Recovery/Hold。
