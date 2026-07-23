# Xinhua Autumn Lighting V3 Brief

研究与实施日期：2026-07-23

## Scope

- 基线提交：`869e92d83ea177cd4babe73d61ed5657e8f15ddd`。
- 主入口：`/?start=garden179`。
- 联动入口：`/?start=film-art`、`/?start=house315`。
- 目标：把上一版“有暖色但没有可读光照”修正为明确的上海秋日下午光照，
  并同步改善建筑、梧桐、道路、草地、人物和云层的空间层次。
- 非目标：不改变 OSM 中心线、建筑落点、碰撞和角色动画；不把 AI 风格目标
  或真实参考照片用作运行时贴图。

## Preflight Gate

- Blender：`/Applications/Blender.app/Contents/MacOS/Blender`，5.2.0 LTS。
- 本轮主要修改 Three.js 光照、阴影、材质响应和后处理，不重建已经验收的
  Rain、梧桐和建筑 GLB。
- 仓库没有独立 `scripts/audit_glb.py`；因为本轮不改 GLB，继续沿用 V2 已通过
  的结构审计与 build record，不用旧审计替代运行时验收。
- 本地页面使用项目开发入口和实际 `?start=` 深链接验收。
- 当前主工作区存在另一套开场封面实验，本轮在独立 worktree 中执行，避免覆盖。

## Reference Coverage

沿用
`docs/research/xinhua-autumn-atmosphere-reference-manifest.json`
中的本地参考：

| 槽位 | 本地证据 | 本轮用途 |
| --- | --- | --- |
| Canonical style | `docs/research/assets/style-references/xinhua-autumn-storybook-target.png` | 长阴影、受光面、树冠透光和暖冷关系 |
| Canonical real street | `docs/research/assets/style-references/xinhua-autumn-plane-trees-canonical.jpg` | 悬铃木树阵、斑驳日照和残绿/黄赭比例 |
| Brick and sidewalk | `docs/research/assets/style-references/xinhua-autumn-brick-wall.jpg` | 红砖、铺地与落叶在暖光中的关系 |
| Runtime baseline | `test_artifacts/test_xinhua_autumn_storybook_v2_comparison.png` | 证明 V2 明暗被补光洗平的实际画面 |

Canonical comparison view 继续沿新华路纵深观察，人物位于右侧三分线。

## Evidence Classification

### Observed

- V2 已有方向光，但探索态同时存在 AmbientLight 和 HemisphereLight；
  当前真实截图中建筑朝向面、道路、人物和树冠缺少清晰亮暗分区。
- 探索态方向光阴影范围约 `144 × 144` world units，2048 阴影贴图被摊薄；
  人物脚下与树下缺少可读接触阴影。
- 天空与云使用不受场景光照影响的材质，云没有明确受光边和阴影边。
- 建筑、道路、地面与梧桐已经启用 `castShadow` / `receiveShadow`，无需改动
  真实布局即可获得更强光照层次。

### Inferred

- 降低无方向补光、提高主光与阴影质量并增加极弱冷色反向补光，可以在不压黑
  阴影的情况下建立明确的秋日下午方向。
- 将探索态阴影投影视锥缩紧到实际第三人称可见范围，阴影边缘会比扩大整街区
  阴影更清晰；全览仍使用较大范围。
- 云层使用暖顶、冷底的两层材质，树叶轻微增加粗糙度与色差，可强化同一太阳
  方向，而不伪装成真实天气重演。

### Unknown

- 不同手机 GPU 对更高阴影质量的热负载存在差异；移动端保留较低贴图尺寸和
  简化接触效果。
- 固定艺术光照不对应 2026-07-23 某一时刻的物理太阳位置。

## Quality Contract

### Light Direction and Contrast

- 主时段：11 月下旬 15:20～15:50，西南低太阳。
- 太阳、天空太阳盘和方向光共享同一方向。
- Canonical 画面必须能直接看到人物、树干、树冠或建筑投下的长阴影。
- 建筑受光面与背光面的亮度差肉眼可辨，阴影仍保留蓝灰细节，不压成黑块。
- 人物脚底必须有稳定接触阴影，不能漂浮。

### Shadow Quality

- 桌面探索态主阴影贴图不低于 2048；移动低配使用 1024。
- 探索态投影视锥以角色附近可见区域为主，不为覆盖整个社区牺牲近景清晰度。
- 道路、草地、人行道、建筑和树木继续接收真实阴影；玻璃与水面不投不透明影。
- 使用与新版 Three.js 兼容的 PCF 阴影类型，消除 PCFSoft deprecated warning。

### Materials and Atmosphere

- 梧桐叶保留残绿、黄赭、焦糖，受光侧略暖、阴影侧保持橄榄色。
- 建筑白墙、红砖、深绿窗框和暖灯保持身份，不用全局橙色滤镜替代光照。
- 道路保持中性深灰；阳光通过阴影和邻近反射体现，而不是把沥青染黄。
- 云层有暖亮顶和冷灰底，太阳附近云缘更亮。
- 后处理只做轻微色调塑形，不能抹平真实光照，也不能产生大面积油画糊感。

### Runtime Validation

- 桌面 `1440 × 900`：`garden179`、`film-art`、`house315`。
- 移动 `390 × 844`：`garden179`。
- 所有截图必须来自真实浏览器 WebGL 运行，不做 imagegen 或离线美化。
- 控制台应用 error 为 0；记录上游 warning。
- `npm test`、`npm run lint` 和静态构建通过。

## Decision Log

### Iteration 0

- 首要根因不是“灯不存在”，而是补光和大范围阴影把方向光的视觉结果洗平。
- 本轮先修光照系统，再调整材质和气氛；不重新移动道路或建筑。
- 回退点为提交 `869e92d` 和 Sites 版本 25。

### Iteration 1：真实阴影可见性

- 探索态主光阴影视锥从约 `144 × 144` 缩紧到 `96 × 96`，桌面保持 2048，
  移动端使用 1024；实测阴影贴图成功分配，场景中有 1174 个投影对象和
  386 个接收对象。
- 降低 AmbientLight，保留低强度 HemisphereLight；主光提高到 5.0，
  避免以无方向的橙色滤镜伪装太阳。
- 使用 ACES tone mapping；试验过 Neutral 与 AgX，但前者把白墙推得过橙，
  后者削弱明暗，因此回退。

### Iteration 2：画面可读性

- 增加与太阳方向一致的低成本梧桐树冠斑驳影和树干长影。它们是绘本化视觉
  补充，不替代 Three.js 真实 shadow map，也不改变任何树位或碰撞。
- 每个斑驳影与树干影都按自身延伸后的 X/Z 重新采样缓坡高度，仅保留
  `0.024` 场景单位防闪烁余量，避免沿用树根高度导致悬空或穿地。
- 人物增加与真实位置联动的落地长影，解决第三人称相机下人物阴影恰好藏在
  角色背后、肉眼误判“没有光照”的问题。
- 云层改为暖顶冷底的 Toon 材质；道路、地面、落叶改为会响应光照的
  Standard 材质；梧桐叶色改为残绿、金黄和焦糖，并只保留极弱 emissive。
- 增加桌面 SSAO 作为接触层次，移动端关闭 SSAO 和描边以控制成本；两端都
  保留同一 ACES 与 PaperWash 色彩契约。

### Final Parameters

- 主光：`#ffc47f`，相对角色 `[-62, 60, -150]`，探索强度 `5.0`。
- 冷补光：`#a8c6d8`，相对角色 `[-96, 54, 112]`，探索强度 `2.15`。
- 阴影：桌面 2048、移动 1024，探索范围 `±48`，`near=1`、`far=280`。
- 后处理：桌面 SSAO + 轻描边 + ACES + PaperWash；移动 ACES + PaperWash。

### Runtime Validation

- 桌面 `1440 × 900` 已验收 `garden179`、`film-art`、`house315` 和新华路
  梧桐纵深视角；人物落地长影、建筑暖阳/冷阴面和秋色树冠均可见。
- 移动 `390 × 844` 已验收 `garden179`；低配路径关闭 SSAO 与描边后，
  人物长影与建筑方向光仍然清晰，没有依赖桌面后处理伪造层次。
- 全新 Chrome 标签页应用 error 为 0；保留一条 Three.js 上游
  `THREE.Clock` 弃用 warning。
- `npm test`：118/118；生产构建、TypeScript 与 `npm run lint` 均通过。
