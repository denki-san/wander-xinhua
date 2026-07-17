# Learnings

## [LRN-20260717-010] correction

**Logged**: 2026-07-17T20:20:00+08:00
**Priority**: critical
**Status**: resolved
**Area**: deployment

### Summary
用户所说的“世界地图”是曾在独立工作树实际测试的双尺度全览导航，不能仅凭名称相近就当作普通首页远景或在单一部署入口上做判断。

### Details
用户曾在 `dual-scale-map-navigation` 的 3003 预览中连续验收地图缩放、无建筑碰撞、屏幕绝对方向、人物居中跟随、移动速度与 POI 实景卡片。该功能已经合入 `e329467`，但后续 Sites v6 `b24e8cf` 在加入新 POI 时误删全览状态、POI 数据、样式和回归测试，导致线上出现“新地标存在、世界地图消失”。

### Suggested Action
发布前必须分别核对 GitHub 源码提交、Sites 当前生产版本和 VPS 自定义域名；合并并行功能时以最新共同父提交为基线，通过全览专项测试及真实入口点击验收，禁止用陈旧工作区快照覆盖已经合并的功能。

### Metadata
- Source: user_feedback
- Related Files: app/xinhua-experience.tsx, app/scene/xinhua-world.tsx, app/scene/poi-data.ts, tests/test_dual_scale_navigation.test.mjs
- Tags: world-map, sites, deployment-regression, worktree, user-tested
- See Also: LRN-20260717-005, LRN-20260717-006, LRN-20260717-007

### Resolution
- **Resolved**: 2026-07-17T20:20:00+08:00
- **Notes**: 已从 Sites v6 建立隔离修复分支，恢复 `e329467` 的世界地图功能并保留 v6 新增 POI 资产。

---

## [LRN-20260716-005] correction

**Logged**: 2026-07-16T14:08:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
Kimi WebBridge 更新后不能把 daemon `status` 探针误报当成浏览器助手不可用，实际命令结果优先。

### Details
`status` 连续返回 PID 存在但 HTTP 探针失败，用户在 Chrome 中确认“浏览器助手已就绪”。随后不重启 daemon，直接执行同一 session 的 `navigate`、`snapshot` 和 `screenshot` 全部成功。

### Suggested Action
先执行一次无破坏性的实际 `navigate` 或 `list_tabs`；只有真实命令也连接失败时，才按 skill 的 daemon 恢复流程处理。

### Metadata
- Source: user_feedback
- Related Files: .learnings/ERRORS.md
- Tags: kimi-webbridge, status-probe, browser-extension, verification

---

## [LRN-20260716-001] correction

**Logged**: 2026-07-16T00:10:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
真实社区场景不应先套用球形世界隐喻；地图拓扑必须先服从产品对真实空间的表达目标。

### Details
用户最初反馈后退镜头回顶部与建筑倾斜，进一步讨论后明确产品要表达真实新华路社区，而不是虚拟球形地区。继续修补球面法线只能解决技术症状，不能解决空间隐喻不符合产品目标的根因。

### Suggested Action
已改为有限 X/Z 平面街区：Y 轴统一垂直，加入地图与建筑碰撞、实体围挡、相机水平转向和穿墙避让，并为后退转向、边界与沿墙滑动补充回归测试。

### Metadata
- Source: user_feedback
- Related Files: app/scene/xinhua-world.tsx, app/xinhua-experience.tsx
- Tags: camera, flat-world, movement, model-orientation, product-direction

---

## [LRN-20260716-003] correction

**Logged**: 2026-07-16T01:05:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
第三人称闲逛产品的主角是持续占据视觉中心的核心资产，不能使用只满足碰撞和动画验证的几何占位模型发布。

### Details
当前角色虽然具备行走、奔跑和跳跃逻辑，但头脸只有球体与两点眼睛，四肢为单段胶囊，服装和背包缺少结构层次，近景与移动端都会显得粗糙。

### Suggested Action
保持原创程序化建模与现有轻量运行时，重建头脸、发型、躯干服装、双段四肢和信使背包，并从角色正面、背面与手机近景分别验收。

### Resolution
已完成分层角色模型、行走动画调整及桌面正反面和移动端视觉验收，并增加源码结构回归测试防止退回占位模型。

### Metadata
- Source: user_feedback
- Related Files: app/scene/xinhua-world.tsx, tests/rendered-html.test.mjs
- Tags: character-model, art-quality, third-person, visual-regression

---

## [LRN-20260716-002] best_practice

**Logged**: 2026-07-16T00:42:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: deployment

### Summary
静态 Vite 构建的公开元数据来源是根目录 `index.html`，不能只更新 Next `app/layout.tsx`。

### Details
平面街区首次同步后，公网 HTML 仍显示旧的“3D 小世界”描述。原因是静态部署走 `vite.static.config.ts` 与根目录 `index.html`，`app/layout.tsx` 的 metadata 不会注入该入口。

### Suggested Action
场景定位或 SEO 文案变更时同步更新两个入口，并在 `rendered-html.test.mjs` 中直接验证最终 `dist-static/index.html`。

### Metadata
- Source: self_discovery
- Related Files: index.html, app/layout.tsx, tests/rendered-html.test.mjs
- Tags: static-build, metadata, deployment, regression-test

---

## [LRN-20260716-004] correction

**Logged**: 2026-07-16T04:05:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
低多边形手绘风格不等于 Minecraft 式方块堆砌；真实地标区块必须先锁定可识别结构、空间比例、立面颜色与核心街具，再做风格化简化。

### Details
“幸福里”是居民能够识别的真实地点。只放通用盒子建筑，即使颜色接近，也无法满足“走到这里就知道是幸福里”的产品目标。公开地图负责拓扑，多个角度的外观照片负责立面与设施，Messenger 只负责手绘渲染语言，三类证据不能混用。

### Suggested Action
已建立独立的幸福里建模基准与七栋固定建筑规格，加入入口垂直绿墙、倒影池、池中树、喷泉石景、木桥、街灯、长椅、红伞、屋顶亭和水塔，并增加源码回归测试，防止退回通用街区随机排布。

### Metadata
- Source: user_feedback
- Related Files: app/scene/xingfuli-block.tsx, docs/research/xingfuli-reference.md, tests/rendered-html.test.mjs
- Tags: landmark-modeling, proportion, visual-identity, non-minecraft, xingfuli

---
## [LRN-20260717-001] best_practice

**Logged**: 2026-07-17T00:58:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
相邻且带旋转广场的地标，快速定位点不能只根据单栋建筑 AABB 沿一个坐标轴后移。

### Details
上海电影艺术中心与上海影城相邻。将艺术中心起点只沿 Z 轴后移后，角色虽然离开自身碰撞盒，却进入相邻影城旋转广场的实际几何包络，相机退避后形成顶视角。单栋 AABB 检查不足以证明首屏构图安全。

### Suggested Action
沿道路切向和建筑视线共同选择斜向观察点；每个 `?start=` 入口都必须在真实 WebGL 中点击进入、等待相机稳定并截图验证。

### Metadata
- Source: self_discovery
- Related Files: app/scene/xinhua-road-landmarks.tsx, test_artifacts/test_film_art_runtime_final.png
- Tags: camera, start-preset, collision, visual-qa, adjacent-landmarks

### Resolution
- **Resolved**: 2026-07-17T00:59:00+08:00
- **Notes**: 艺术中心观察点改为沿新华路向西斜移，并保留运行时截图复核。

---

## [LRN-20260717-002] correction

**Logged**: 2026-07-17T07:48:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
同一批照片参考地标必须以已获用户认可的海军俱乐部样板为最低精细度，而不能只满足“轮廓可区分”和技术接入完成。

### Details
首版八个新华路地标具备独立轮廓、材质和 GLB，但文件体量、立面构件、屋面层级、门窗细节、庭院设施和照片辨识度明显低于海军俱乐部样板。结构测试、60 FPS 和无报错不能替代艺术质量验收。

### Suggested Action
把海军俱乐部的细节密度拆成可量化基线：主体之外必须覆盖立面深度、重复构件、屋面收边、入口节点、场地小品、材质变化和多角度运行时截图；逐栋升级后再判定完成。

### Metadata
- Source: user_feedback
- Related Files: scripts/create_navy_club_model.py, scripts/create_xinhua_road_models.py, app/scene/xinhua-road-landmarks.tsx
- Tags: art-quality, landmark-modeling, photo-reference, detail-density, visual-qa
- See Also: LRN-20260716-004

### Resolution
- **Resolved**: 2026-07-17T09:02:00+08:00
- **Notes**: 8 个地标已补齐屋顶、门窗、入口、场地和庭院构件；上海影城按照片重做椭圆曲面主体。全部 GLB 为单运行时节点且不含照片贴图，49 项测试与浏览器视觉验收通过。

---

## [LRN-20260717-003] correction

**Logged**: 2026-07-17T08:22:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
地标照片中可确认的建筑名和店名是核心识别构件，不能用抽象方块、孔洞或无字招牌替代。

### Details
上海影城正面白色环带上的四个构件实际是“上海影城”四个字。抽象化后即使体量和曲面接近，仍会让建筑失去最直接的身份信息；同一问题也适用于一尺花园、Villa Le Bec、上海民族乐团等门头。

### Suggested Action
把照片中能够确认的中文和英文名称转成立体网格文字随 GLB 导出，并逐栋核对；无法从参考中确认的住宅门头不臆造。对字体网格降低曲线采样，兼顾清晰度与 WebGL 面数。

### Metadata
- Source: user_feedback
- Related Files: scripts/create_xinhua_road_models.py, docs/research/xinhua-road-landmarks-reference.md, tests/test_xinhua_road_models.test.mjs
- Tags: signage, typography, landmark-identity, photo-reference, webgl
- See Also: LRN-20260717-002

### Resolution
- **Resolved**: 2026-07-17T09:01:00+08:00
- **Notes**: 七处可确认门头均改成立体网格文字，字体曲线采样经 WebGL 优化，并由结构测试锁定。

---

## [LRN-20260717-004] correction

**Logged**: 2026-07-17T08:38:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Blender 立体文字不能只在单体预览中确认存在，还必须从网页实际街道观看面核对字序与正反面。

### Details
文字曲线转为网格后使用竖直旋转，Blender 预览中轮廓存在，但网页端实际从背面读取，导致“上海影城”“上海电影艺术中心”“上海民族乐团”等全部水平镜像。几何存在和文字可读是两项不同的验收条件。

### Suggested Action
文字转网格后统一翻转本地 X 并应用变换；重新导出所有带门头的 GLB，从实际 `?start=` 入口截图确认中文和英文均按正常字序显示。

### Metadata
- Source: user_feedback
- Related Files: scripts/create_xinhua_road_models.py, tests/test_xinhua_road_models.test.mjs
- Tags: signage, mirrored-text, blender, glb, runtime-qa
- See Also: LRN-20260717-003

### Resolution
- **Resolved**: 2026-07-17T09:01:00+08:00
- **Notes**: 统一翻转文字网格本地 X 并应用变换；上海影城、电影艺术中心和民族乐团运行时截图均恢复正常字序，完整测试通过。

---

## [LRN-20260717-005] correction

**Logged**: 2026-07-17T14:52:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
GLB 审计通过不代表网页运行时完整渲染；植被实例化必须保留全部材质分片，放置还要同时校验道路和建筑占地，人物碰撞与摄像机碰撞也不能共用同一层。

### Details
梧桐树 GLB 保留了树干、深浅斑痕和三层树冠共 6 个材质分片，但网页实例化只读取第一个 Mesh，导致树冠与斑痕全部消失。树阵只避让入口点，没有避让建筑碰撞范围，因而会穿进房屋。摄像机直接复用人物的建筑碰撞体，也会在人物贴近墙面转动视角时被锁死。

### Suggested Action
运行时按 GLB 的全部 Mesh 分片分别实例化；用建筑实际包络过滤树位，并以道路中心线和渲染宽度检查建筑退界；人物继续使用硬碰撞，摄像机改用独立透明层与可收缩 Spring Arm，最后从真实网页视角截图验收。

### Metadata
- Source: user_feedback
- Related Files: app/scene/xinhua-road-landmarks.tsx, app/scene/xinhua-world.tsx, app/scene/xinhua-road-landmarks-data.json
- Tags: instancing, vegetation, placement, collision-layers, spring-arm, runtime-qa
- See Also: LRN-20260717-002

### Resolution
- **Resolved**: 2026-07-17T15:05:00+08:00
- **Notes**: 运行时按 6 个 Mesh 分片实例化梧桐树；生产与测试共享树位生成及相机透明层，逐棵验证建筑和入口避让；315 号完成道路退界，Spring Arm 最小收缩调整为 6%；53 项测试、定向 lint、真实 WebGL 与独立代码复核全部通过。

---

## [LRN-20260717-006] correction

**Logged**: 2026-07-17T15:23:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
建筑与道路在几何上不相交仍不足以通过街景验收，带门房和围墙的院落必须保留明确可见的路外空带。

### Details
初版退界只要求模型包络位于柏油边缘外约 0.96 个场景单位，测试可以通过，但 329 弄的门房和围墙在第三人称透视中仍像压在车道上。院落模型自身比例偏大也放大了这一视觉问题。

### Suggested Action
一般地标在路缘外保留至少 3 个场景单位；带门房的 329 弄保留 5.5 个场景单位，并从用户实际行走视角复核，而不能只依赖俯视几何距离。

### Metadata
- Source: user_feedback
- Related Files: app/scene/xinhua-road-landmarks-data.json, tests/test_xinhua_road_models.test.mjs
- Tags: road-setback, visual-clearance, landmark-scale, runtime-qa
- See Also: LRN-20260717-005

### Resolution
- **Resolved**: 2026-07-17T15:23:00+08:00
- **Notes**: 329 弄与 315 号通过向路外平移获得可见退界；曾采用的缩放方案被用户否决并已在 LRN-20260717-007 中完全恢复。

---

## [LRN-20260717-007] correction

**Logged**: 2026-07-17T15:28:00+08:00
**Priority**: critical
**Status**: resolved
**Area**: frontend

### Summary
地图与房屋使用同一既定比例，任何道路退界问题都不得通过缩放房屋解决。

### Details
为了让 329 弄门房与道路形成更明显的视觉间距，错误地把两处新华别墅比例从 0.62 缩到 0.48，并把 315 号从 0.9 缩到 0.82。这破坏了地图、人物和房屋之间已经确定的统一比例关系。

### Suggested Action
恢复全部原始比例，只沿道路法线平移建筑；在测试中锁定关键地标比例，确保后续退界修复只能改变位置。

### Metadata
- Source: user_feedback
- Related Files: app/scene/xinhua-road-landmarks-data.json, tests/test_xinhua_road_models.test.mjs
- Tags: world-scale, landmark-scale, road-setback, regression
- See Also: LRN-20260717-006

### Resolution
- **Resolved**: 2026-07-17T15:28:00+08:00
- **Notes**: 两处新华别墅恢复 0.62，315 号恢复 0.9；三处建筑仅沿路外方向平移，并新增不可通过缩放解决退界的比例锁定测试。

---

## [LRN-20260717-008] best_practice

**Logged**: 2026-07-17T16:28:00+08:00
**Priority**: high
**Status**: resolved
**Area**: docs

### Summary
新建真实建筑模型前，必须先把真实照片、来源和标准对比视角保存到项目中。

### Details
只在研究文档中保留网页链接，会让建模、运行时截图和后续复核使用不同证据。真实照片先落项目后，可以固定建筑地址、观察方向和来源，并让建模 brief、Blender 几何、网页相机和最终对照表引用同一份资料。

### Suggested Action
把本地参考照片设为硬性工作流门槛：先保存照片和来源元数据，再选择标准对比视角，然后写 brief、建模、导出并在实际网页中复现相同方向。

### Metadata
- Source: user_feedback
- Related Files: docs/research/landmark-model-comparison.md, docs/research/assets/landmark-comparison/
- Tags: photo-reference, workflow-gate, canonical-view, runtime-qa

### Resolution
- **Resolved**: 2026-07-17T16:28:00+08:00
- **Notes**: 已写回 photo-reference-webgl-modeling skill 及 modeling checklist；当前 8 个独立模型、9 个落地点的真实照片和系统截图已按同一目录归档。

---

## [LRN-20260717-009] correction

**Logged**: 2026-07-17T18:31:00+08:00
**Priority**: critical
**Status**: wont_fix
**Area**: frontend

### Summary
把全部道路烘焙进整张地形 CanvasTexture 会在近距离斜视角严重模糊，不能用作道路共面方案。

### Details
第一次错误实现把全部道路改成统一高度的 BoxGeometry，并把道路下方地形一起压平，出现可见侧壁。随后改成把全区道路烘焙进一张 2048px 地形纹理；虽然没有几何厚度，但第三人称近距离斜视时道路边缘、中心线和文字都经过纹理缩小过滤，整体发糊，视觉效果比原版更差。

### Suggested Action
按用户要求恢复原有清晰道路渲染。以后若重新处理共面问题，不能使用全区单张 CanvasTexture；需要先做小范围原型并从第三人称斜视近景验收，未通过前不得替换全场道路。

### Metadata
- Source: user_feedback
- Related Files: app/scene/terrain.ts, app/scene/xinhua-map.tsx, tests/test_terrain.test.mjs
- Tags: terrain, road-surface, coplanar-overlay, no-thickness, visual-regression

### Resolution
- **Resolved**: 2026-07-17T19:02:00+08:00
- **Notes**: 用户明确否决 CanvasTexture 视觉效果；已完整恢复修改前的道路几何与测试，不再保留模糊纹理方案。

---
