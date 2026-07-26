# 18 栋建筑 Fast Mode

## 目的

在不降低证据、Massing 地图门、Blender MCP 三门和 Three.js 实页验收标准的
前提下，去掉每栋建筑重复执行的全仓构建、全仓测试、手动点击封面和重复查找入口。

Fast Mode 只覆盖
[`building-pipeline-fast-mode.json`](building-pipeline-fast-mode.json) 固定的 18 栋。
树木、装饰、普通 OSM、全地图 Massing 和 Recovery/Hold 不进入此管线，也不删除、
覆盖或整体合并。

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
