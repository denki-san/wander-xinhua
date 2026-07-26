# 剩余 10 栋建筑 Fast Mode

## 目的与边界

Fast Mode 用于当前尚未完成优化的 10 栋建筑。它在不降低证据门、Massing
真实地图门、Blender MCP 三门和 Three.js 实页验收标准的前提下，去掉每栋重复
执行的全仓构建、全仓测试和人工查找 QA 入口。

范围由
[`building-pipeline-fast-mode.json`](building-pipeline-fast-mode.json) 唯一定义。
已经合并进 `main` 的 8 栋建筑记录在 `completedBuildingIds` 中，Fast Mode 会明确
拒绝重新选择它们；树木、装饰、普通 OSM、全地图 Massing 和 Recovery/Hold 同样
不进入此管线。

Manifest 中的测试、GLB 和 URL 是当前 `main` 可运行的基线。某栋优化分支新增
专项测试、三档 GLB 或确定性 QA 路径时，必须在同一分支更新该栋条目，不能把尚未
落地的文件预先写入 `main`。

## 单栋 Worktree

1. 建立单栋专用 Worktree，先补足 canonical、侧向/纵深、入口/身份细节证据；
2. Massing 完成后执行 MCP 1 和真实地图门；
3. Hero 完成后执行 MCP 2；
4. Identity 完成后重新核验 Massing，再执行 MCP 3；
5. 每次提交前运行本栋专项检查：

```bash
npm run building:fast -- --building shanghai-cinema
```

默认命令只运行 Manifest 中本栋相关的测试、共享范围守卫和 GLB 结构审计，不执行
`build:static`、`build:sites` 或全仓测试，因此不能单独作为“项目已完成”的证据。

## 主窗口 2～3 栋批次

先预览批次命令和 QA 入口：

```bash
npm run building:fast -- \
  --batch shanghai-cinema,xinhua-villas-211,xinhua-villas-329 \
  --plan
```

公共 registry、runtime、地图数据和共享测试只由主窗口串行整合。整合一个 2～3 栋
批次后执行：

```bash
npm run building:fast -- \
  --batch shanghai-cinema,xinhua-villas-211,xinhua-villas-329 \
  --full
```

`--full` 先运行批次专项检查，再执行一次完整 `npm test` 和一次 `npm run lint`。
部署前仍须以同一提交完成目标发布面的验收。

## Three.js 直达验收

每栋条目至少保存一个当前真实存在的 `?start=` 路由，并显式追加
`qaAutoStart=1&cameraQa=1`。`qaAutoStart=1` 只用于 QA，默认产品入口仍停留在
intro。只有某一档模型和 selector 已在当前分支实现并通过测试后，才能新增对应的
Hero、Identity 或 Massing 直达 URL。

## 不能省略的质量门

- 证据门与 observed / inferred / unknown 分离；
- 三处主体独有身份构件；
- Massing 真实地图门与坐标轴完整链测试；
- MCP 1 / 2 / 3；
- GLB build record 与结构审计；
- Three.js 三档、fallback、碰撞、控制台、资源和性能验收；
- 被证据或地图门阻塞时记录 blocker，不用缩小碰撞盒、复制范围外资产等方式过门。
