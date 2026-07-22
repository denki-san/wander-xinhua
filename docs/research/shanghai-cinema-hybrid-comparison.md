# 上海影城完整 GLB 与混合渲染真实案例对比

## 结论

本轮以真实 POI“上海影城（新华路 160 号）”验证以下运行时架构：

> 规则结构程序化生成，重复部件实例化，独特轮廓保留轻量 GLB，所有资产按距离和重要性分级加载。

测试结论为 **架构可行，但不应直接把当前试验版替换到生产场景**。

- 在固定 5Mbps / 80ms、禁用缓存条件下，桌面近景身份资产可见时间从 `9154ms` 降至 `824ms`；
- GLB 传输从 `5,862,660 bytes` 降至 `418,620 bytes`，减少 `92.86%`；
- 近景三角面从 `94,164` 降至 `11,464`，减少 `87.83%`；
- 最终合并同材质程序化体块和细节批次后，桌面近景 draw call 从初稿的 `21` 降到 `13`，低于完整 GLB 的 `15`；
- SwiftShader 同条件采样中，桌面近景 FPS 从 `7.1` 提升到 `17.2`；移动视口从 `19.4` 提升到 `44.6`。绝对值不代表真机 GPU，只能用于本轮相对比较；
- 白色连续丝带、右侧椭圆开洞、左侧玻璃鼓体与后塔楼四个身份线索仍可读；外楼梯栏板、门头字、场地小品和完整立面层次明显简化。

因此建议继续推进这条架构，但下一步应先把“可见质量合同”补到接近生产基线，再考虑替换上海影城线上资产。规则住宅和街区建筑会比上海影城更适合优先迁移。

## 研究与证据复用

本试验没有重新推断建筑事实，直接复用已经通过研究门槛的上海影城证据链：

- 主 Brief：`docs/research/shanghai-cinema-model-brief.md`；
- 参考清单：`docs/research/shanghai-cinema-reference-manifest.json`；
- Canonical：`docs/research/assets/poi-references/shanghai-cinema/shanghai-cinema-front-official.jpg`；
- 侧向：`docs/research/assets/poi-references/shanghai-cinema/shanghai-cinema-archina-ribbon-glass-detail-2024.jpeg`；
- 入口/身份细节：`docs/research/assets/poi-references/shanghai-cinema/shanghai-cinema-archina-oculus-stair-detail-2024.jpeg`；
- 原完整资产：`public/models/xinhua-road/shanghai-cinema.glb`。

参考照片只用于判断几何关系，没有进入 GLB 或运行时贴图。

## Preflight Gate

| 项目 | 结果 |
| --- | --- |
| Blender | `5.2.0 LTS`；沙箱内 Metal 设备探测崩溃，沙箱外 Headless 生成通过 |
| 单资产生成 | 新增 `scripts/create_shanghai_cinema_hybrid_identity.py`，只写试验资产，不覆盖完整上海影城 GLB |
| GLB 审计 | `audit_glb.py --forbid-images --max-nodes 8` 通过 |
| 本地预览 | Vinext `http://localhost:3013/hybrid-model-test` |
| 浏览器 | Chrome `150.0.7871.129`，CDP 固定桌面/移动视口与网络条件 |
| 基线 | 完整 GLB `5,862,660 bytes / 83,820 triangles / 13 materials` |

## 质量合同

### Identity

混合版必须保持以下身份构件：

1. 正面非对称连续白色丝带；
2. 丝带右侧水平椭圆开洞及玻璃内层；
3. 左侧高出的椭圆玻璃鼓体与上下环带；
4. 后方窄高玻璃塔楼。

### Geometry 分工

- 程序化：广场、玻璃大厅、左右玻璃翼、挑檐、塔楼主体；
- 实例化：31 根首层幕墙竖梃、7 根前柱、塔楼横竖格、白色板缝、32 级外楼梯；
- 轻量 GLB：白色丝带、椭圆洞口、左侧鼓体上下异形环带；
- 省略：门头字、座椅、花池、栏板完整结构、幕墙连接件和近景小品。

### 距离与重要性

| 距离层 | 触发范围 | 加载内容 | 目的 |
| --- | --- | --- | --- |
| Massing | `> 60` 场景单位 | 程序化主体，零 GLB | 地图远景立即出现正确占位和主尺度 |
| Identity | `38–60` 场景单位 | 主体 + `418,620 bytes` 身份 GLB | 优先恢复地标轮廓 |
| Detail | `≤ 38` 场景单位 | 主体 + 身份 GLB + 实例化重复构件 | 近景恢复窗格、板缝和楼梯节奏 |

### Runtime 预算

- 身份 GLB 小于完整 GLB 的 `10%`；
- 无图片、无贴图，不复制参考照片；
- 身份 GLB 不超过 8 个节点；
- 近景三角面小于完整基线的 `20%`；
- 近景 draw call 不高于完整基线；
- 5Mbps / 80ms 条件下身份资源 1 秒内完成。

## 实现产物

- Blender 生成器：`scripts/create_shanghai_cinema_hybrid_identity.py`；
- 可编辑源：`assets/models/source/xinhua-road/shanghai-cinema-hybrid-identity.blend`；
- 轻量 GLB：`public/models/xinhua-road/shanghai-cinema-hybrid-identity.glb`；
- A/B 页面：`/hybrid-model-test`；
- CDP 测试脚本：`scripts/test_hybrid_model_cdp.mjs`；
- 指标原始数据：`test_artifacts/test_shanghai-cinema_hybrid_metrics.json`；
- Build record：`docs/research/build-records/shanghai-cinema-hybrid-identity.json`。

## 测试条件

| 条件 | 固定值 |
| --- | --- |
| 构建模式 | Vinext development；两方案使用同一路由与同一 JS 包 |
| 浏览器 | Headless Chrome 150，SwiftShader |
| 视口 | 桌面 `1440 × 900`；移动 `390 × 844`；DPR 均为 `1` |
| 网络 | 下载 `5Mbps`，上传 `2Mbps`，RTT `80ms` |
| 缓存 | 每组前清空并禁用 |
| 预热 | 模型 ready 后跳过前 `700ms` 帧数据 |
| 采样 | 目标 `4.5s`；完整 GLB 因 SwiftShader 低帧率在 30s 超时点取得约 `3.0s` 有效样本 |
| 页面可见性 | 独立 CDP Target，前台 Headless 页面 |
| 阴影 | 关闭，DPR 固定为 1 |

`readyMs` 从客户端测试模块初始化开始计算，表示本轮模型阶段耗时，不等于包含 HTML/JS 下载的完整网页导航时间。

## 测试结果

| 方案 | 可见时间 | GLB | Draw calls | Triangles | FPS | P95 帧时 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 完整 GLB · 桌面近景 | `9154ms` | `5,862,660B` | `15` | `94,164` | `7.1` | `149.3ms` |
| 混合 · 桌面远景 | `91ms` | `0B` | `5` | `620` | `38.0` | `30.2ms` |
| 混合 · 桌面中景 | `818ms` | `418,620B` | `9` | `8,740` | `25.8` | `43.9ms` |
| 混合 · 桌面近景 | `824ms` | `418,620B` | `13` | `11,464` | `17.2` | `64.7ms` |
| 完整 GLB · 移动近景 | `9131ms` | `5,862,660B` | `14` | `94,056` | `19.4` | `54.4ms` |
| 混合 · 移动近景 | `814ms` | `418,620B` | `13` | `11,464` | `44.6` | `25.9ms` |

浏览器应用异常为 `0`。四组都有 Three.js 自身 `Clock` 弃用 warning，不是本试验新增错误。

## 视觉结果

通过：

- 主丝带横向跨度、洞口位置、鼓体和塔楼仍能形成上海影城的整体识别；
- 中景就加载身份轮廓，优先级高于窗格和楼梯等重复细节；
- 近景实例化构件能恢复首层竖向节奏和塔楼网格；
- 同一近景机位中没有轴向翻转、漂浮或 GLB 与程序化主体明显错位。

未达到完整基线：

- 右侧外楼梯仅保留级数节奏，没有完整玻璃栏板和双侧扶手；
- 左侧鼓体和左右玻璃翼的连接层次偏硬；
- 门头字、灯光、花池、座椅和铺装线省略；
- 程序化玻璃与身份 GLB 的材质层级比完整模型更深、更冷；
- 近景仍能看出这是性能试验版，不是最终美术替代版。

## Go / No-Go

### Go

- 继续开发通用 `Blender → recipe JSON` 导出器；
- 优先试迁规则住宅、里弄和街区楼体；
- 保留地标独有轮廓为小 GLB；
- 在世界地图阶段只加载 Massing，中景加载 Identity，近景加载实例细节；
- 把本轮“同材质程序化体块也必须实例化/合批”写入正式实现标准。

### No-Go

- 当前试验版不直接替换生产上海影城；
- 不把任意 Blender Mesh 顶点改写进 JS 冒充程序化优化；
- 不假设程序化一定减少 draw call；第一轮曾从 `15` 反增到 `21`，必须显式合批后才回到 `15`；
- 不用本轮 SwiftShader 的绝对 FPS 宣称真机性能，只使用同条件相对差异。

## Decision log

### 2026-07-22

- 选择上海影城而不是普通住宅，原因是它同时具备规则幕墙、重复细节和不可替代曲面，能覆盖架构的全部变量；
- 身份 GLB 只保留 6 个 Blender 源构件，合并为 1 个运行时节点；
- 第一轮近景 `21 draw calls`，确认程序化拆 Mesh 会抵消收益；第二轮把相同材质的玻璃体块和白色结构分别改为实例批次，桌面近景降到 `15`；移动补测仍比完整基线多 1 个 draw call，最终再把塔楼格线与楼梯并入同材质实例批次，桌面/移动近景均降到 `13`；
- 性能与加载门通过，近景视觉等价门未完全通过；结论为架构 Go、上海影城生产替换 No-Go。
