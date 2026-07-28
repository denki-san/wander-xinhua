# 新华漫游建筑引擎：`garden-villa` Spike 方案

- Status: `approved-for-local-spike`
- Baseline commit: `556d0bbe540f5da89ab90522c6a1333c0feb3e24`
- Branch: `codex/building-engine-spike`
- Product surface: 一个本地 CLI 与一个真实 Three.js Sandbox
- Phase-one formula: 一个 Archetype、两栋建筑、一个 CLI、三个审核门
- In scope archetype: `garden-villa`
- In scope assets: `house-315`、`sun-ke-villa`
- Out of scope archetypes: `lilong-street`、`public-hybrid`
- Explicitly excluded: 后台、数据库、Worker、任务队列、Meshy、部署、合并与远端发布

## 1. 本轮结论

第一阶段不再以“五栋、三个 archetype、完整三档 Runtime Package”为起点。本轮只验证
一个更小、但能证伪核心假设的 Spike：

> 同一个 `garden-villa` Compiler 能否只通过修改 Building DSL，生成两栋不同的
> 花园住宅，并通过证据、Massing 校准和最终对照三个门。

唯一主路径是：

```text
审核后的图片证据
→ 最小 Building DSL
→ garden-villa Compiler
→ Massing
→ 人工校准
→ Low-poly Master
→ GLB / 碰撞自动检查
→ 真实 Three.js Sandbox
→ 最终人工对照
```

本轮不派生独立 Identity，不建设 Hero / Identity / Massing 三档切换，不把现有
生产资产替换为 Spike 产物。`Low-poly Master` 是本轮唯一完整模型；Massing 只是
校准检查点。

## 2. Scope 冻结

### 2.1 In scope

| 稳定资产 ID | 角色 | 选择理由 | 本轮状态 |
| --- | --- | --- | --- |
| `house-315` | 第一栋、反向表达样本 | 官方正面、俯瞰、入口、门牌和身份细节已闭合；现有合格资产可作为只读对照 | `in-scope` |
| `sun-ke-villa` | 第二栋、同类差异样本 | 官方 canonical、右前纵深、北入口和 OSM footprint 覆盖充分；单体花园住宅，且历史三层验收完整 | `in-scope` |

两栋都是模型资产，不把同一模型的运行时实例计为新建筑。

### 2.2 Hold 与 blocked-evidence

| 对象 | 状态 | 原因 |
| --- | --- | --- |
| `villa-le-bec` | `hold` | 一个 Case 内包含两栋主体与庭院关系，历史 Hero / Identity 仍有阻塞，不适合本次最小“第二栋单体住宅”验证 |
| `xinhua-villas-211` | `blocked-evidence` | 只允许 compound conservative Massing；成员位置、纵深和 house-number 绑定不足 |
| `xinhua-villas-329` | `blocked-evidence` | 旧 Hero 存在跨资产污染；当前证据只支持部分成员 conservative Massing |
| `one-step-garden` | `hold` | 更接近建筑与商业场地组合，不作为本轮第二栋单体住宅 |
| `lilong-street` | `hold` | 不实现 schema、compiler 或样本 |
| `public-hybrid` | `hold` | 不实现 schema、compiler 或样本 |
| Meshy 与所有 Meshy QA | `hold` | 不属于建筑主体 Compiler 的完成依赖，本轮不继续测试 |

若后续发现 `sun-ke-villa` 的现有证据、来源权利或主体绑定不满足本方案的 Evidence
Gate，必须把它改为 `blocked-evidence`，不得临时换用生成式补全或在 Python 中
硬编码伪事实。

## 3. 证据真值与预检

### 3.1 外置证据快照

本轮不重新下载参考图，不覆盖仓库工作副本，使用已存在的不可变快照：

```text
/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence/
└── snapshots/
    └── 2026-07-27-storage-migration-52db477/
        ├── repository/
        ├── manifest.json
        └── SHA256SUMS
```

快照合同：

- `snapshotId`: `2026-07-27-storage-migration-52db477`
- `fileCount`: `980`
- `byteCount`: `451461120`
- `wikiEligible`: `false`
- 本轮 `shasum -a 256 -c SHA256SUMS`: 全量通过

参考图、运行时截图和逐资产证据仍是动态证据，不进入 `Threejs-3d-research`。
Building Case 只保存快照 ID、相对路径、SHA 和抽象后的 Claim。

### 3.2 `house-315` 覆盖

Canonical：

`docs/research/assets/poi-references/house-315/house-315-front-official-2023.jpg`

| 证据槽位 | 证据 | 状态 | 降级策略 |
| --- | --- | --- | --- |
| Canonical | 官方 2023 沿街正面 | `supported` | 无 |
| Side / depth | 上观俯瞰 Image 242 | `supported-for-massing` | 不承诺测绘尺寸 |
| Entrance / identity | Image 244 / 245 | `supported` | 不复制文字或 logo |
| Address binding | Image 243 | `supported` | 无 |
| Rear detail | 只有局部俯瞰 | `unknown` | 背面保持低细节 |
| Surveyed dimensions | 无 | `unknown` | 使用已审核视觉比例与 OSM 候选，明确为推断 |

至少保留的三个身份构件：

1. 中央高、前出的半木构山墙；
2. 相连陡坡红瓦屋顶、横向主脊与非对称左右翼；
3. 上白下红立面分区与中央入口关系。

### 3.3 `sun-ke-villa` 覆盖

Canonical：

`docs/research/assets/poi-references/sun-ke-villa/sun-ke-villa-front-canonical.jpg`

| 证据槽位 | 证据 | 状态 | 降级策略 |
| --- | --- | --- | --- |
| Canonical | 长宁区政府花园正立面 | `supported` | 无 |
| Side / depth | 上海市民政局右前斜视 | `supported` | 隐藏侧面保持保守 |
| Entrance / identity | 长宁区政府北入口 + 用户近景 | `supported` | 不承诺室内可进入 |
| Footprint / orientation | OSM way `864847877` + 南北立面证据 | `supported-with-inference` | 凹凸与高度继续标记为推断 |
| Rear / roof details | 植被遮挡部分 | `partial` | 省略不可验证细节 |

至少保留的三个身份构件：

1. 花园正立面的三联尖券门廊与二层连续拱窗；
2. 右侧圆角塔楼、窄高窗与低弧形红瓦屋面；
3. 明显向北外挑、厚柱支撑且保持覆盖车道开放的 porte-cochère。

### 3.4 工具预检

| 工具或入口 | 本轮结果 | 回退 |
| --- | --- | --- |
| Blender | `5.2.0 LTS` 可用 | 无 |
| 单资产 Compiler | 本 Spike 必须支持 `--asset` | 不允许批量覆盖其他资产 |
| `scripts/audit_glb.py` | 对两栋现有 Massing / Master 基线通过 | 无 |
| 静态构建 | `npm run build:static` 通过 | 必要时使用开发模式 |
| Blender MCP | 当前无法连接 Add-on | 固定机位 Headless Blender；必须记录未执行 MCP |
| Browser / Sandbox | 本轮实现后使用真实页面验收 | 不用 isolated GLB 审计代替 |

## 4. 三个审核门

三个门都使用版本化 JSON 记录。自动检查可以阻塞，但不能自动批准。

### Gate E：Evidence

目的：确认图片是否足以支持当前资产进入参数化生产。

必须满足：

- 主体、地址或场地绑定可追溯；
- Canonical、Side / Depth、Entrance / Identity 三个槽位均有证据；
- 至少三处身份构件分别绑定 Evidence Claim；
- `observed / inferred / unknown` 分开；
- 原始参考图已在外置不可变快照中并通过 SHA；
- 权利边界为研究参考，不进入 GLB 或运行时贴图；
- 关键冲突未解决时必须失败。

结果：

- `approved`
- `needs-more-evidence`
- `rejected`

只有 `approved` 可以执行 Massing 编译。

### Gate M：Massing Calibration

目的：在添加身份细节前确认比例、体块、朝向、地面和碰撞通道。

CLI 自动准备：

- Massing `.blend` 与 `.glb`；
- canonical、side / depth、entrance 三张 `test_` 固定机位图；
- GLB SHA、bounds、节点、三角面、材质、图片与字节；
- 碰撞矩形与开放通道检查；
- 真实 Three.js Sandbox 的 Massing URL 与 QA 状态。

人工或显式手工审查必须判断：

- 主轮廓与体块层级是否对应证据；
- local `-Y` 正面、`1 unit = 2.7m`、ground datum 是否正确；
- 入口、道路或覆盖车道没有被碰撞封闭；
- Canonical 构图和人物尺度是否合理；
- `unknown` 是否仍保持低细节。

结果：

- `approved`
- `changes-requested`
- `blocked`

只有当前 Massing SHA 对应的记录为 `approved`，CLI 才允许生成 Low-poly Master。
Massing 二进制变化后旧批准自动失效。

### Gate F：Final Comparison

目的：确认 Low-poly Master 在证据、Blender、GLB 和真实 Sandbox 中共同成立。

CLI 自动准备：

- Low-poly Master `.blend` 与 `.glb`；
- canonical、side / depth、entrance 固定机位；
- 当前 GLB 和碰撞自动检查；
- 参考 / Blender / Three.js 三联对照路径；
- Sandbox 中的资源状态、canvas、相机、地面和碰撞 QA 状态。

最终手工审查必须判断：

- 三处身份构件在目标距离可读；
- 轮廓、入口、纵深和色块与证据一致；
- 没有把不可见背面做成过度具体的伪细节；
- GLB 当前 SHA 与 Sandbox 当前加载资源一致；
- 真实页面无新增 console error，模型可见且接地；
- 碰撞不封闭入口、庭院、道路或 porte-cochère。

结果：

- `approved-spike`
- `approved-spike-with-known-unknowns`
- `changes-requested`
- `blocked`

`approved-spike` 只证明本地 Spike，不等于 production integration、发布或部署。

## 5. 最小 Building DSL

DSL 是 Compiler 的唯一几何输入。Python 中不得按 `assetId` 写分支。

```json
{
  "schemaVersion": 1,
  "assetId": "house-315",
  "archetype": "garden-villa",
  "artProfile": "xinhua-autumn-lowpoly-v1",
  "evidence": {
    "casePath": "building-engine/cases/house-315/building-case.json",
    "claimIds": []
  },
  "coordinateContract": {
    "sceneUnitMeters": 2.7,
    "front": "local-negative-y",
    "groundDatum": 0
  },
  "materials": {},
  "massing": {
    "volumes": [],
    "roofs": []
  },
  "master": {
    "openings": [],
    "features": []
  },
  "collision": {
    "obstacles": [],
    "requiredOpenPaths": []
  },
  "runtime": {
    "canonicalCamera": {},
    "sandboxScale": 1
  },
  "budgets": {
    "massing": {},
    "master": {}
  },
  "unknowns": []
}
```

### 5.1 V0 支持范围

`massing.volumes`：

- `box`
- `cylinder`

`massing.roofs`：

- `gable`
- `hipped`
- `flat`

`master.openings`：

- `rect-window`
- `arched-opening`
- `window-row`

`master.features`：

- `timber-gable`
- `balcony`
- `round-tower`
- `chimney`
- `porte-cochere`
- `trim-band`

本轮不支持：

- 任意曲面 CAD；
- 室内；
- 逐片瓦、砖缝或写实 PBR；
- 贴图、照片或 logo；
- 里弄连续立面；
- 公共建筑 Hybrid 轮廓；
- 第三方生成网格。

出现未知类型、越界参数、缺 Evidence Claim 或未消费字段时，Compiler 必须给出
coverage report 并以非零状态退出，不能静默忽略。

### 5.2 Compiler coverage report

每个字段归入：

- `compiled`
- `inferred`
- `unsupported`
- `ignored`
- `conflict`

正式 Spike 构建要求：

- `unsupported = 0`
- `ignored = 0`
- `conflict = 0`
- 所有 `inferred` 都能回指审核后的 Claim

## 6. 一个 CLI

唯一入口：

```bash
node scripts/building_engine_spike.mjs <command> [options]
```

支持命令：

```text
inspect
validate --asset <id|all>
build --asset <id|all> --stage <massing|master|all>
review --asset <id> --gate <evidence|massing|final> --decision <decision>
qa --asset <id|all> [--sandbox-origin <origin>]
status --asset <id|all>
```

约束：

- `build --stage massing` 要求 Gate E 已通过；
- `build --stage master` 要求 Gate M 对当前 Massing SHA 已通过；
- `qa` 运行 GLB、预算、碰撞、lineage 和可选 Sandbox HTTP 检查；
- `review` 只追加新记录，不覆盖旧记录；
- `--asset` 只能写该资产的 Spike 目录；
- `all` 顺序处理两栋，不并发运行 Blender；
- 任何失败返回非零退出码和机器可读错误摘要。

`package.json` 可以提供一个短别名，但不能再创建第二套 Runner。

## 7. `garden-villa` Compiler

Compiler 由一个确定性 Blender Python 文件实现：

```text
scripts/compile_garden_villa.py
```

它只认识 DSL 类型与 Art Profile，不认识 `house-315` 或 `sun-ke-villa` 业务分支。

固定顺序：

1. 读取并验证 DSL；
2. 重置 Blender 场景；
3. 生成 Massing volume 与 roof；
4. Massing 阶段保存 `.blend`、导出 `.glb`、渲染三机位；
5. Master 阶段从同一 DSL 重建同一 Massing；
6. 添加 openings 与 typed features；
7. 保存 Master `.blend`、导出 `.glb`、渲染三机位；
8. 写 build record；
9. 输出 current SHA 给 CLI。

禁止：

- 读取或覆盖现有 production `.blend` / GLB；
- 用现有 Hero mesh 作为隐藏输入；
- 为第二栋新增单案例 Python；
- 运行时全局 scale 修正错误 authored units；
- 导出参考图、测试尺标、灯光或相机。

## 8. Spike 产物边界

### 8.1 版本化生产输入

```text
building-engine/
├── art-profiles/
│   └── xinhua-autumn-lowpoly-v1.json
├── schema/
│   └── building-dsl.schema.json
└── cases/
    ├── house-315/
    │   ├── building-case.json
    │   ├── building-dsl.json
    │   └── reviews/
    └── sun-ke-villa/
        ├── building-case.json
        ├── building-dsl.json
        └── reviews/
```

### 8.2 隔离产物

```text
assets/models/source/building-engine-spike/<asset>/
├── <asset>-massing.blend
└── <asset>-master.blend

public/models/building-engine-spike/<asset>/
├── <asset>-massing.glb
├── <asset>-master.glb
└── <asset>-collision.json

docs/research/build-records/building-engine-spike/<asset>/
├── massing.json
└── master.json

test_artifacts/building-engine-spike/<asset>/
├── test_<asset>-massing-canonical.png
├── test_<asset>-massing-side.png
├── test_<asset>-massing-entrance.png
├── test_<asset>-master-canonical.png
├── test_<asset>-master-side.png
├── test_<asset>-master-entrance.png
└── test_<asset>-final-triptych.png
```

所有路径都与现有 production 资产隔离。现有 House 315、Sun Ke Villa、Meshy、
registry、runtime placement 和缓存版本不得被覆盖。

## 9. GLB 与碰撞自动检查

### 9.1 GLB

每个阶段记录并验证：

- SHA-256；
- bytes；
- bounds；
- nodes、meshes、primitives、triangles；
- materials、images、textures；
- root transform；
- non-finite POSITION；
- zero-area triangles；
- 预算；
- Massing → Master 的 DSL SHA lineage。

默认禁止图片与纹理。

### 9.2 碰撞

DSL 使用多个局部矩形 obstacle，不使用整院大盒。自动检查：

- obstacle 尺寸为正并位于合理 bounds 内；
- required open path 不与任何 obstacle 相交；
- 入口点、花园轴线或 porte-cochère 中线保持开放；
- Massing 与 Master 共用同一 collision contract；
- Sandbox 实际加载的 collision SHA 与当前 JSON 相同。

几何测试通过不等于玩家和相机运行时通过；Final Gate 仍要检查真实 Sandbox。

## 10. 真实 Three.js Sandbox

本轮新增内部页面：

```text
/building-engine-sandbox
```

确定性 QA URL：

```text
/building-engine-sandbox?asset=house-315&tier=massing&view=canonical&qa=1
/building-engine-sandbox?asset=house-315&tier=master&view=canonical&qa=1
/building-engine-sandbox?asset=sun-ke-villa&tier=massing&view=canonical&qa=1
/building-engine-sandbox?asset=sun-ke-villa&tier=master&view=canonical&qa=1
```

页面必须：

- 使用项目真实 React Three Fiber / Three.js 运行时加载 GLB；
- 显示 ground、`1.8 m` 人物尺标、当前 tier 与资产 ID；
- 按 DSL 的 canonical / side / entrance 固定机位切换；
- 读取并显示 collision contract；
- 暴露只读 QA 状态：GLB URL、加载状态、canvas 尺寸、bounds、当前 view、
  collision SHA、console / resource 错误摘要；
- 支持确定性开放路径检查；
- 不注册到 production 地图、不修改公共 asset registry。

isolated Blender render 或 GLB Viewer 不能替代此页。

## 11. 实施顺序

### S0：方案与证据冻结

- 本文收缩为 Spike；
- 两栋 scope 冻结；
- 外置证据快照全量校验；
- Case、Claim、Brief 和预算就绪。

### S1：合同与 CLI

- DSL schema；
- Art Profile；
- 两栋 Case 与 DSL；
- 一个 CLI；
- coverage 与 gate 状态机测试。

### S2：Massing 与 Gate M

- 同一 Compiler 生成两栋 Massing；
- 固定机位与 GLB / 碰撞自动检查；
- 真实 Sandbox Massing；
- 为当前 SHA 写入手工校准结论。

### S3：Low-poly Master 与 Gate F

- 不修改 Python，只修改 / 消费两份 DSL；
- 生成两栋 Master；
- 自动 QA；
- 真实 Sandbox；
- 参考 / Blender / Three.js 最终对照。

### S4：本地收口

- 专项测试；
- `npm test`；
- `npm run lint`；
- 外置动态证据新快照与全量 SHA；
- 本地提交；
- 不 push、不合并、不部署。

## 12. Spike 完成定义

同时满足以下条件才可称为 `spike-complete`：

- 只有 `garden-villa` 一个 archetype；
- `house-315` 与 `sun-ke-villa` Evidence Gate 均通过；
- 两栋使用同一个 DSL schema、Art Profile 和 Python Compiler；
- 第二栋不需要修改 Compiler Python；
- CLI 是唯一 Runner，支持单资产；
- 两栋 Massing 均有当前 SHA 对应的 Gate M 记录；
- 两栋 Low-poly Master、`.blend`、GLB 和固定机位产物齐全；
- GLB、预算、lineage 与碰撞自动检查通过；
- 两栋在真实 Three.js Sandbox 中可见、接地、方向正确；
- Final Gate 有当前 SHA 对应的手工结论；
- 新动态证据进入新的不可变外置快照并全量 SHA 通过；
- 专项测试、`npm test` 和 `npm run lint` 通过；
- 未修改 production registry、placement 或现有 production GLB；
- 未继续 Meshy QA；
- 未建设后台、数据库、Worker 或任务队列；
- 未 push、合并或部署。

以下只能报告为 `partial`：

- Compiler 与 GLB 已生成，但没有 Gate M；
- 自动 QA 通过，但没有真实 Sandbox；
- Sandbox 可见，但没有最终证据对照；
- 第二栋只靠推断补足关键结构；
- 新截图与指标尚未进入外置快照；
- 只通过专项测试，未通过项目级测试与 lint。

## 13. Go / No-go

本 Spike 只回答三个问题：

1. 两栋不同花园住宅是否可以只改 DSL、不改 Compiler Python？
2. 三个审核门是否能阻止证据不足、未校准 Massing 和未对照成品继续前进？
3. 一个 CLI 是否足以把 Blender、GLB、碰撞和真实 Sandbox 串成可重复链路？

如果任一答案为否，下一轮先修 DSL、Compiler 或 gate contract，不进入
`lilong-street`、`public-hybrid`，也不建设任何后台。
