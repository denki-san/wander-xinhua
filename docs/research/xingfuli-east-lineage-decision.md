# Xingfuli East Preserved-Tier Decision

## Outcome

`xingfuli-east` 的 Hero、Identity、Massing 三档二进制继续原样保留，不重建、不覆盖。三份 GLB 与 Recovery Worktree 完全同 SHA，结构审计均通过；但严格 tier lineage、番禺路净距和 east 专属 start/camera 仍为 blocked，因此本轮不能宣称整栋验收完成。

机器可复算的完整数值与输入 SHA 见 `docs/research/xingfuli-east-tier-map-audit.json`。

## Preserved assets

| Tier | GLB SHA-256 | Blend SHA-256 | Result |
| --- | --- | --- | --- |
| Hero | `4dc21aa6f137daa076a6da1948b0c08c15310789541ee59af06c352febea4327` | `487c3b61669941801f6605ecec3e9711fa1e6cff27c53cc2fc96e4439fbb2d72` | Binary pass, preserved |
| Identity | `d83f31ef60d01b342dd350605bafa71b87152e9f7ea9cd8fb04cbe80eb50e592` | `62156aade12bf810dbd0c1e584acf30535db18b18ce867c183582996dde1cf7b` | Binary pass, preserved |
| Massing | `5924e935ed9cba120c77396f28adbea12368ad31448c63ad67c5b75a96d319ee` | `12b9d9496388b6b4e1cb0514cb8c14b970849e09495b6609bf9ceaf790285278` | Binary pass, preserved |

Generator `scripts/create_xingfuli_models.py` 支持显式 `--segment=east`，但 Recovery/current 已有阶段禁止重做，本轮没有运行生成命令。

## Evidence boundary

- Observed: 九张本地参考图覆盖 canonical、纵深、番禺路入口和场地细节；OSM `way/400066625` 是一条两点 pedestrian 中心线。
- Inferred: `xingfuli-east` 与 `north-east-entry` / `south-east-entry` 的对应来自项目 layout 和照片顺序。
- Unknown: east 单栋精确 footprint、施工图尺寸、背立面、屋顶机电和 2026 租户状态。

因此 OSM 可以裁决整体长轴、锚点和入口道路关系，不能单独证明 east 建筑 footprint。

## Blockers

1. **Strict tier lineage**：build records 没有记录 Identity 的 Hero 来源 SHA，也没有记录 Massing 的 Identity 来源 SHA。现有生成时间是 Massing → Identity → Hero final，不能反向推定为严格 Hero → Identity → Massing 派生。二进制继续保留，等待主窗口决定如何补 provenance，不允许用重建覆盖已有成果。
2. **Map / road gate**：整体 OSM 锚点和方向可从原始快照复算通过；但按当前 `rotationY`、非均匀 scale 和番禺路 tertiary asphalt 宽度复算，`south-east-entry`、入口矩阵墙与 east lane base 都与道路面相交。由于缺少 east 单栋权威 footprint，本栋分支不猜新位置、不任意缩放。
3. **East start/camera**：三段既有三条确定性路线仍保持通行；`west-to-east-main` 终点也未被阻挡。但 Fast Mode 入口 `xingfuli-canonical` 位于本地 `x=4`，不针对 east；east 专属 `xingfuli-entrance-detail` 位于本地 `[45,-5.5]`，当前被 `east-entry-bollard-2` 的生产碰撞体覆盖。

## Main-window actions

1. 证据裁决：确认是否接受“同一确定性生成器 + preserved SHA”的补充 lineage 证明；若不接受，维持 blocked，仍不得重做三档。
2. 公共地图整合：在 shared map/runtime 所有者窗口修正 east 南侧体量、入口矩阵墙和铺地与番禺路的关系；必须以新增 footprint/测绘证据或明确的道路边界为依据。
3. 公共 runtime 整合：把 east 专属 QA 起点移出 `east-entry-bollard-2` 的 player-radius 范围，或基于真实入口证据调整石桩；不得在本建筑分支改共享装饰与碰撞。
4. 修复后以 `/?start=xingfuli-entrance-detail&cameraQa=1&qaAutoStart=1` 做 east 同机位 Three.js 复验，再进入批量 Blender MCP 三门终审。
