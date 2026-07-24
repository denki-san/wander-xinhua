# Blender Style Study Brief: Soft Toy Buildings

## Scope

- Style study slug: `soft-toy-buildings`
- Subjects:
  - 孙科别墅，上海市长宁区番禺路 60 号
  - 上海影城（上海电影艺术中心），上海市长宁区新华路 160 号
- Intended stylization: 软陶、磨砂塑料与微缩玩具城风格；保持真实建筑身份，不复制品牌图形。
- Runtime component: 本轮不替换正式场景，只生成隔离的 `test_` 样板资产和固定机位截图。
- Generator: `scripts/create_toy_building_style_previews.py`
- Editable sources:
  - `test_artifacts/models/test_toy_sun-ke-villa.blend`
  - `test_artifacts/models/test_toy_shanghai-cinema.blend`
- Preview GLBs:
  - `test_artifacts/models/test_toy_sun-ke-villa.glb`
  - `test_artifacts/models/test_toy_shanghai-cinema.glb`
- Validation command:
  - `python3 /Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py <asset> --forbid-images --max-nodes 8`

## Preflight Gate

- Blender binary and version: `/Applications/Blender.app/Contents/MacOS/Blender`，`5.2.0 LTS`。
- Generator affected assets: 新生成器只写入 `test_artifacts/models/`、`test_artifacts/test_toy_*_preview.png` 和对应 style-study build record；不覆盖正式 `.blend`、GLB 或运行时数据。
- Existing generator state: `scripts/create_xinhua_road_models.py` 存在用户未提交修改，本轮只读导入其当前上海影城构造函数，不编辑该文件。
- GLB audit command: 使用 skill 自带 `scripts/audit_glb.py`；仓库内没有重复脚本。
- Local preview command and port: `test_local_preview.command`，静态构建后绑定 `127.0.0.1:3002`。
- Browser/runtime validation path: 正式资产已有 `/?start=sunke` 与 `/?start=cinema`；本轮风格样板不接入，运行时门保持 Pending。
- Existing baseline:
  - 孙科别墅：`991,292 bytes / 1 node / 1 mesh / 8 materials / 0 images`，SHA-256 `8309b5b76ebdd42f2ec4cb433bf4586f54fbd29c15d57318cb61a3dada752ea2`。
  - 上海影城：`5,862,660 bytes / 1 node / 1 mesh / 13 materials / 0 images`，SHA-256 `c4d557038677c9c48577636843fb784b496f4a92fc9ea6bbb1d5ca78e822c062`。
- Fallback: 若当前工作区的上海影城构造函数不能隔离生成，则从正式 `.blend` 只读载入并写入新的 `test_` 副本；不得覆盖原资产。

## Evidence

### Reference photos

| Subject | Local path | View direction | Usage boundary |
| --- | --- | --- | --- |
| 孙科别墅 | `docs/research/assets/poi-references/sun-ke-villa/sun-ke-villa-front-canonical.jpg` | 花园正立面，近正视 | Research only |
| 孙科别墅 | `docs/research/assets/poi-references/sun-ke-villa/sun-ke-villa-right-front.jpg` | 花园右前斜视 | Research only |
| 孙科别墅 | `docs/research/assets/poi-references/sun-ke-villa/sun-ke-villa-north-entrance.jpg` | 北侧门廊与入口斜视 | Research only |
| 上海影城 | `docs/research/assets/poi-references/shanghai-cinema/shanghai-cinema-front-official.jpg` | Front-left three-quarter | Research only |
| 上海影城 | `docs/research/assets/poi-references/shanghai-cinema/shanghai-cinema-spiral-stair-official.jpg` | Right-front stair detail | Research only |
| 上海影城 | `docs/research/assets/poi-references/shanghai-cinema/shanghai-cinema-archina-ribbon-glass-detail-2024.jpeg` | 侧向玻璃与丝带细节 | Research only |

完整来源 URL、日期和 SHA-256 沿用：

- `docs/research/sun-ke-villa-reference-manifest.json`
- `docs/research/shanghai-cinema-reference-manifest.json`

### View coverage matrix

| Subject | Canonical | Side / oblique | Entrance / identity detail | Coverage |
| --- | --- | --- | --- | --- |
| 孙科别墅 | 花园正立面 | 右前斜视 | 北门廊 | Complete |
| 上海影城 | 左前正面 | 侧向幕墙 | 右侧旋转楼梯 | Complete |

### Canonical comparison view

- 孙科别墅：花园正立面，检查三联尖券、连续拱窗、塔楼、阳台和错落红瓦。
- 上海影城：左前正面，检查非对称丝带、椭圆开洞、玻璃大厅、旋转楼梯和后塔楼。
- 本轮截图尽量沿用现有 canonical 方向；风格判断优先于严格复刻摄影镜头。

### Evidence classification

#### Observed

- 两栋建筑的主体轮廓和身份构件已经由各自正式 Brief 与本地照片证明。
- 当前正式几何已通过既有 Blender、GLB 与 Three.js 验收，可作为风格样板的结构基线。

#### Inferred

- 软陶圆角、饱和度、材质粗糙度和微缩灯光属于用户选定的原创风格演绎，不是历史建筑事实。
- 玩具化只调整边缘、材质与视觉权重，不新增未经照片支持的建筑构件。

#### Unknown

- 软陶风在真实玩家视角、移动速度和不同设备上的最终可读性，需接入独立运行时变体后验证。
- 全场建筑、人物、道路和植物是否需要同等程度的玩具化，要在两栋样板确认后决定。

## Quality Contract

### Shared style language

- Silhouette: 保留真实外轮廓，体块读法更圆、更厚、更像收藏级微缩玩具。
- Edge language: 大体块倒角增大约 `1.5–1.8×`，细构件只做轻度柔边，避免缝隙闭合。
- Material language: 高 Roughness、低 Metallic、无照片贴图；玻璃采用薄荷青半透明塑料感。
- Palette:
  - 奶油墙面 `#F3DFC1`
  - 珊瑚屋顶/强调 `#D9795F`
  - 薄荷玻璃 `#78BDB4`
  - 暖白收边 `#FFF1D6`
  - 鼠尾草绿 `#7FAB6C`
  - 柔和深框 `#58615B`
  - 蜂蜜灯光 `#F3C66E`
- Lighting: 明亮棚拍式柔光、浅天空蓝背景、奶油色地面和明显但柔软的接触阴影。
- Camera: 轻微长焦，保持微缩模型感，不使用极端透视。

### Identity

#### 孙科别墅

- Signature cue 1: 三联尖券门廊。
- Signature cue 2: 二层连续圆拱窗与阳台。
- Signature cue 3: 右侧圆角塔楼和错落红瓦屋顶。

#### 上海影城

- Signature cue 1: 非对称白色连续丝带。
- Signature cue 2: 右侧横向椭圆开洞。
- Signature cue 3: 右侧旋转楼梯、左侧玻璃鼓体和后塔楼层级。

### Scale and orientation

- `1 Blender unit = 1 scene unit = 2.7 m`。
- 本轮不改变正式资产的世界尺寸、正面 `-Y` 约定和运行时旋转。
- 不通过整体夸张缩放伪造玩具感；主要依靠圆角、材质、色板和灯光。

### Runtime budget

- 孙科别墅：不超过 `40,000` triangles、`8` materials、`1.6 MB`。
- 上海影城：不超过 `100,000` triangles、`14` materials、`6.8 MB`。
- 两者均为静态资产，`0` images、`0` textures、`0` animation、`0` skin。

## Batch Plan

| Batch | Deliverable | Check | Status |
| --- | --- | --- | --- |
| Style contract | 共用色板、圆角、材质与灯光规则 | 两栋保持同一世界观 | Passed |
| Geometry styling | 柔边和圆润度调整 | 身份构件不被吞没 | Passed |
| Materials | 软陶、磨砂塑料和薄荷玻璃 | 无照片贴图 | Passed |
| Blender previews | 两栋 canonical 和 side 截图 | 轮廓、材质、构图可读 | Passed |
| GLB audit | 隔离 GLB 与 build record | 结构和预算通过 | Passed |
| Three.js runtime | 独立运行时变体 | 用户选定后执行 | Pending |

## Validation

- [x] 工具链、参考照片、视角覆盖、canonical 和正式资产基线已确认
- [x] 两栋至少三处身份构件已锁定
- [x] 输出路径隔离，不覆盖当前正式模型
- [x] Headless Blender 生成成功
- [x] 两栋 `.blend`、GLB 和 `test_` 截图存在
- [x] GLB 结构与预算通过
- [x] 目视确认两栋确属同一软陶玩具世界
- [ ] Three.js 运行时验证（本轮按用户“先看截图”要求暂缓）

## Decision Log

### Iteration 0 — Style study gate

- Changes: 选择孙科别墅与上海影城作为 B 风格样板，建立共用色板、圆角、材质、灯光和隔离输出合同。
- Evidence used: 两栋现有本地官方参考照片、专项 manifest、正式模型 Brief 与当前 GLB 基线。
- Blender result: Pending。
- GLB result: Pending。
- Runtime result: 本轮不接入，不作为生产完成声明。
- Remaining inference: 自由移动视角、全场一致性和设备性能待用户选定后验证。
- Rollback point: 所有新产物位于 `test_` 路径；删除样板不会影响正式资产。

### Iteration 1 — Two-building style study

- Changes: 使用统一奶油、珊瑚、薄荷与鼠尾草色板生成两栋软陶玩具样板；增大主要几何柔边，降低金属感，使用明亮棚拍式柔光。
- Evidence used: 孙科别墅三张本地官方照片与上海影城 canonical、侧向幕墙和楼梯细节照片；没有嵌入任何参考照片。
- Blender result: Blender `5.2.0 LTS` 在沙箱外 Headless 成功生成两栋可编辑 `.blend`，并各输出 canonical 与侧向 `1200 × 800` PNG。
- GLB result:
  - 孙科别墅：`1,599,808 bytes / 23,256 triangles / 1 node / 8 materials / 0 images`，审计通过。
  - 上海影城：`5,875,928 bytes / 83,820 triangles / 1 node / 13 materials / 0 images`，审计通过。
- Three-way comparison result: 本轮为风格选择样板，已完成参考照片与 Blender canonical 目视对照；尚未生成 Three.js 栏。
- Runtime result: 按用户“先看截图”要求保持 Pending，未替换正式模型或缓存版本。
- Independent review result: 第一轮上海影城因现有生成器按线性色值解释 sRGB 色板而过度发白；第二轮显式转换色彩空间并降低环境光，修复后主体、玻璃、楼梯和绿植层级可读。
- Remaining inference: 自由移动视角、场景整体配色、角色和植被一致性仍需独立运行时变体验证。
- Performance impact: 尚未接入正式页面，不声明 FPS 或加载性能变化。
- Rollback point: 所有产物均在 `test_artifacts` 和 `test_` build record；正式 GLB SHA 未变化。
