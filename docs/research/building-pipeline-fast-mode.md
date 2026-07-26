# 18 栋建筑 Fast Mode

## 目的

在不降低证据、Massing 地图门、Blender MCP 三门和 Three.js 实页验收标准的
前提下，去掉每栋建筑重复执行的全仓构建、全仓测试、手动点击封面和重复查找入口。

Fast Mode 只覆盖
[`building-pipeline-fast-mode.json`](building-pipeline-fast-mode.json) 固定的 18 栋。
树木、装饰、普通 OSM、全地图 Massing 和 Recovery/Hold 不进入此管线，也不删除、
覆盖或整体合并。

[`building-pipeline-stop-policy.json`](building-pipeline-stop-policy.json)
是机器可读取的证据止损状态表。执行器每次运行都会校验它与18栋白名单完全一致，
并在专项测试、GLB 审计、MCP 或运行时晋级前先执行止损门。

## 新的执行节奏

### 单栋 Worktree

1. 证据只补足三类固定视角：canonical、侧向/纵深、入口/身份细节。缺失面写
   `Unknown`，不为追求图片数量无限搜索。
2. Massing 完成后执行 MCP 1 和真实地图门。
3. Hero 完成后执行 MCP 2。
4. Identity 完成后重新核验 Massing，再执行 MCP 3。
5. 每次提交前只跑本栋专项检查：

```bash
npm run building:fast -- --building film-art-center
```

这条命令只运行本栋相关测试、18 栋/Hold 范围守卫和本栋 GLB 结构审计，不运行
`build:static`、`build:sites` 或全仓测试。它不能单独作为“项目已完成”的证据。

### 主窗口 2～3 栋批次

先预览整合范围、测试命令和 QA 入口：

```bash
npm run building:fast -- \
  --batch film-art-center,one-step-garden,house-315 \
  --plan
```

公共 registry、runtime、地图数据和共享测试只由主窗口串行整合。整合完一个
2～3 栋批次后执行：

```bash
npm run building:fast -- \
  --batch film-art-center,one-step-garden,house-315 \
  --full
```

`--full` 会先跑批次专项检查，然后只执行一次完整 `npm test` 和一次 `npm run lint`。
部署前仍必须以同一提交完成本地、Sites 与 VPS 的发布验收。

## Three.js 直达验收

Fast Mode manifest 为每栋建筑保存真实 `?start=` 路由，并自动追加
`qaAutoStart=1&cameraQa=1`。`qaAutoStart=1` 仅用于 QA：首帧可用后调用与“出发”
按钮相同的进入逻辑，默认产品入口仍停留在 intro，不受影响。

上海影城、电影艺术中心、一尺花园和孙科别墅已列出 Hero / Identity / Massing
三档直达 URL；其余建筑在尚无正式三档 runtime selector 时只列固定场景入口，
不得把“能直达地图”误写为“三档通过”。

## 哪些步骤被合并，哪些不能省

- 合并：预检按批次一次；MCP 使用同一固定灯光/相机 rig 连续检查；专项测试按建筑
  去重；项目级构建和全仓回归按 2～3 栋一次；QA 路由跳过人工封面点击。
- 保留：证据门、三处身份构件、Massing 真实地图门、MCP 1/2/3、GLB build
  record、Three.js 三档与 fallback、碰撞/控制台/资源/性能验收。
- 停止规则：被证据或地图门阻塞时立即记录 blocker 并换下一栋，不在同一栋无限
  试错；不得用缩小碰撞盒、恢复污染资产或复制范围外成果来“过门”。

## 可执行证据止损门

每栋建筑的证据救援上限固定为：

1. 仓库本地证据、用户原图和官方/主来源合并为一轮；
2. 上一轮无解后，进入唯一一次连续小红书证据阶段；该阶段可以慢速查看多个
   关键词和候选，直到找到强证据或以可追溯记录证明检索穷尽；
3. 小红书找到可追溯、同一主体的有效证据时，将状态从 `research-only` 改为
   `active`，只恢复原先被阻塞的阶段；
4. 小红书仍无解时，将状态改为 `terminal-disabled`，关闭游戏运行时入口，但
   `preserveFiles` 必须保持 `true`，不得删除源文件、Blend、GLB、证据或 Hold；
5. `complete` 建筑只允许回归验证，不得重做已经合格的阶段。

处于 `research-only` 或 `terminal-disabled` 的建筑会被执行器自动跳过，不运行
专项测试、GLB 审计或 `--full` 全仓回归。例如：

```bash
npm run building:fast -- --building shanghai-cinema --plan
```

输出必须显示 `STOP`、当前两轮使用次数和唯一允许的下一步。若一个批次的三栋
全部命中止损门，执行器会直接成功结束并切换下一批，不再消耗建模与回归时间。

止损状态不得靠口头结论更新。每次小红书搜索都必须先保存来源、主体一致性和
搜索结果记录，再原子更新状态表；不得把 `research-only` 留在
`xiaohongshu=1/1`，也不得通过提高次数上限绕过终止规则。

单栋建筑的照片、视频、关键帧、地图锚点、院落归属、道路关系和分析以U盘
`/Volumes/plugin/3D_Modeling_ThreeJS_Knowledge_Base/wander-xinhua/building-evidence/`
为唯一存储，不接入 `Threejs-3d-research`，也不在仓库重复保存建筑媒体。
仓库只保留 stable asset ID、U盘证据指针和验收状态。只有可跨建筑复用的
Blender、Three.js、WebGL 方法知识才进入该 Wiki。
