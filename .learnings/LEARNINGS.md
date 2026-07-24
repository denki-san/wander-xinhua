# Learnings

## [LRN-20260724-001] correction

**Logged**: 2026-07-24T20:15:00+08:00
**Priority**: high
**Status**: resolved
**Area**: research

### Summary
用户要求“在 OpenThree 网站里面找可用项目”时，研究对象应是站内列出的项目卡片及其源码，不能把目录站自身当成唯一被评审对象。

### Details
第一次记录只核验了 OpenThree 目录仓库的定位和 Apache-2.0 许可证边界，虽然该信息仍可作为入口证据，但没有完成用户要的项目筛选。用户明确纠正后，改从目录配置中抽取 `three-player-controller`、`THREE-CustomShaderMaterial`、`threepipe` 三个与当前 R3F 场景最相关的卡片，逐一检查上游源码、版本、许可证、依赖和与现有相机/碰撞/渲染架构的兼容性。

### Suggested Action
对于目录、导航站、市场或案例集合，先确认用户要研究“站本身”还是“站内条目”。后者必须建立候选池，逐项以其原始仓库为证据源，并将目录的许可证与各子项目的许可证严格分开。

### Metadata
- Source: user_feedback
- Related Files: docs/knowledge-sources/openthree-source-and-wander-xinhua-assessment-2026-07-24.md, docs/knowledge-sources/openthree-candidate-projects-and-wander-xinhua-selection-2026-07-24.md
- Tags: research-scope, openthree, project-selection, source-audit

### Resolution
- **Resolved**: 2026-07-24T20:15:00+08:00
- **Notes**: 已完成三项站内项目的源码级筛选并明确运行时、资产和许可证边界。

---

## [LRN-20260719-016] correction

**Logged**: 2026-07-19T13:35:00+08:00
**Priority**: critical
**Status**: resolved
**Area**: frontend

### Summary
全览态不能用一个大 Suspense 边界包住整组新华路建筑；单个大模型慢就会让所有建筑一起消失，并拖延 POI 实景缩略图的可见时间。

### Details
线上复核发现，人物 GLB 已加载后，新华路 14 个建筑仍全部缺失，网络时序只完成第一棵梧桐树模型。`XinhuaRoadLandmarks` 内部连续调用 14 次 `useGLTF`，外部却只有一个 `fallback={null}`；这会产生加载瀑布和整组全有或全无的表现。POI 卡片同时使用最高 3.4MB 的原图，在静态资源响应较慢时只显示绿色底色。Sites v13 进一步确认，即使轻量图已经 `complete` 且 `naturalWidth=640`，重 WebGL 页面里的 `decoding="async"` 仍可能延迟实际绘制；显式执行 `img.decode()` 后照片才进入截图。

### Suggested Action
每栋建筑、每个梧桐树变体和上生·新所的大 GLB 都必须拥有自己的 Suspense 边界；建筑未完成时显示与真实落位一致的轻量体块，完成一栋就替换一栋。POI 卡片使用独立的 640px 轻量缩略图，在首页预取并显式解码默认地点；实际可见图片使用同步解码提示。验收必须看截图，不能只看 HTTP、`complete` 或 `naturalWidth`。

### Metadata
- Source: user_feedback
- Related Files: app/scene/xinhua-road-landmarks.tsx, app/scene/shangsheng-xinsuo-block.tsx, app/scene/poi-data.ts, app/xinhua-experience.tsx
- Tags: suspense-waterfall, landmark-loading, overview, poi-thumbnail, visual-regression
- See Also: LRN-20260719-015, LRN-20260717-010

---

## [LRN-20260719-015] correction

**Logged**: 2026-07-19T00:18:00+08:00
**Priority**: critical
**Status**: resolved
**Area**: frontend

### Summary
人物替换必须同时验收全览与探索、加载 fallback 与加载完成两套状态；只看探索态会把旧卡通角色发布出去。

### Details
新 `urban-wanderer.glb` 在探索态已正确加载，但全览首次进入时仍使用旧的程序化橙色卡通人物作为 Suspense fallback。线上移动网络加载 378KB GLB 实测约 5.1 秒，这段时间旧人物会以全览尺度显示；在用户截图中，它呈现为巨大的橙色背带角色，直接违反中性中国城市漫游者和无背包的视觉要求。

### Suggested Action
删除旧橙色前襟、背带和大头比例的 fallback，改为与最终人物相同的黑色短发、灰绿上装、黑色直筒裤和自然比例。人物发布验收必须覆盖：全览点击后即时截图、全览模型加载完成截图、探索态截图、移动端截图，并核对实际角色 GLB 网络请求完成前后的画面。

### Metadata
- Source: user_feedback
- Related Files: app/scene/xinhua-world.tsx, tests/test_character_asset.test.mjs, tests/test_dual_scale_navigation.test.mjs
- Tags: character-fallback, overview, suspense, visual-regression, no-backpack
- See Also: LRN-20260718-012, LRN-20260718-013

### Resolution
- **Resolved**: 2026-07-19T13:58:00+08:00
- **Notes**: 全览加载占位已替换为黑色短发、灰绿上装、黑色长裤的自然比例无背包角色；加载完成角色保持原有比例，桌面全览与手机探索态均已截图验证。

---

## [LRN-20260718-014] best_practice

**Logged**: 2026-07-18T16:52:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
低模人物即使所有面都设为平滑，拆分法线产生的同位置重复顶点仍会阻断插值；应先清理未使用属性并焊接重复顶点，再重算法线。

### Details
Quaternius 模块导入后，上衣 6132 个顶点中有 4606 个同位置重复点，下装 1492 个中有 1123 个。`polygon.use_smooth = True` 只能平滑拓扑相连的面，因此第一版实机仍出现大面积三角色块。移除未使用 UV、顶点色、自定义硬法线和 sharp edge 后，以极小容差焊接完全重合顶点，角色三角面仍保持约 6700，但 GLB 从 823KB 降到约 370KB，实机背部明暗变为连续渐变。

### Suggested Action
处理拆法线低模人物时，先统计同位置重复顶点比例；焊接后必须重新检查蒙皮、材质边界、动作、正面预览和真实 WebGL 页面。资产测试应锁定骨骼、模块、三角面、动作和禁用节点，不应把较大的文件体积当作质量指标。

### Metadata
- Source: error
- Related Files: scripts/create_urban_wanderer_character.py, tests/test_character_asset.test.mjs
- Tags: character-model, normals, remove-doubles, gltf, runtime-size, visual-qa
- See Also: LRN-20260718-012, ERR-20260718-066

### Resolution
- **Resolved**: 2026-07-18T16:52:00+08:00
- **Notes**: 第二版已在固定 Blender 预览、1440×1024 桌面页和 390×844 手机页验证，未见裂缝、背包或浏览器错误。

---

## [LRN-20260718-013] correction

**Logged**: 2026-07-18T14:22:00+08:00
**Priority**: critical
**Status**: in_progress
**Area**: frontend

### Summary
新华路项目的主角必须被明确读成中国人、偏中性且略 masculine，并且用户明确不要背包；不能把开源角色默认的性别、肤色、五官印象或“信使背包”当作既定产品身份。

### Details
第一版 Quaternius 骨架、服装和动画在浏览器里工作正常，但所选深肤色女性头部和西式短发不符合本地上海街区语境；背包虽然已降低饱和度，仍然是用户不需要的视觉道具。角色也不应具有明显性别或职业背景，应让不同玩家都能代入。

### Suggested Action
保留已验证的骨架和动作系统，默认改用偏中性男性头部、黑色侧分短发、暖中性东亚肤色、深棕眼睛和宽松低饱和服装；从程序化 fallback、GLB、文档与测试中彻底删除背包。上装、下装、鞋和头发必须保留独立模块，为未来换装留接口，并用正面预览和后肩实机截图共同验收。

### Metadata
- Source: user_feedback
- Related Files: scripts/create_urban_wanderer_character.py, app/scene/xinhua-world.tsx, docs/research/urban-wanderer-character-brief.md
- Tags: chinese-character, gender-neutral, masculine, modular-outfit, no-backpack, art-direction
- See Also: LRN-20260718-012

---

## [LRN-20260718-012] correction

**Logged**: 2026-07-18T14:05:00+08:00
**Priority**: high
**Status**: in_progress
**Area**: frontend

### Summary
第三人称主角不能只以“高面数、完整骨骼和动画齐全”作为质量标准；大块单色头发、服装与高饱和配件会让人物在后肩近景中像几个色块拼接。

### Details
当前 KayKit Rogue 资产虽然有 6,377 三角面、76 个动画和完整骨骼，但大头比例、整片棕色发型、绿色上衣与红色背包在后肩镜头里形成四个高对比大色块。自动结构测试全部通过，仍不能证明人物与新华漫游志的纸张、墨线和真实街区美术相匹配。

### Suggested Action
角色验收必须加入固定后肩近景、正面、侧面、移动中和 390×844 窄屏截图；优先使用比例更自然、可商用修改的开源骨骼角色，并通过低饱和城市服装、细分材质和更轻的轮廓控制色块面积。镜头距离、肩位偏移与人物屏占比要与角色同时调整。

### Metadata
- Source: user_feedback
- Related Files: app/scene/xinhua-world.tsx, public/models/character/urban-messenger.glb, tests/test_character_asset.test.mjs
- Tags: character-model, color-blocking, art-direction, camera, visual-regression
- See Also: LRN-20260716-003

---

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

## [LRN-20260717-011] correction

**Logged**: 2026-07-17T22:55:00+08:00
**Priority**: critical
**Status**: in_progress
**Area**: frontend

### Summary
POI 卡片必须使用可核验的对应场所实景，不能从来源文章里直接取首图或宣传横幅。

### Details
逐项下载当前 17 张卡片图后确认：上生·新所实际显示“2024 迎春消费季”宣传插画，华山绿地显示“为宁办实事”横幅，一尺花园显示的是 Villa Le Bec 门面。它们虽然来自相关或邻近内容页面，但并不是对应 POI 的真实外观，无法支持用户识别，也会误导后续建模。

### Suggested Action
为每个 POI 建立本地照片清单和来源元数据，逐张确认主体、地址及不同视角的一致性；卡片只引用已通过核验的本地典型实景图。测试禁止远程首图和未核验宣传图重新进入卡片。

### Metadata
- Source: user_feedback
- Related Files: app/scene/poi-data.ts, docs/research/poi-photo-model-audit.md
- Tags: poi-photo, subject-verification, card-image, modeling-evidence
- See Also: LRN-20260717-008

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

## [LRN-20260717-010] correction

**Logged**: 2026-07-17T22:18:00+08:00
**Priority**: critical
**Status**: resolved
**Area**: frontend

### Summary
世界地图不能通过隐藏详细模型换取加载性能；进入全览后必须显示地标，密集 POI 标签需要独立排布。

### Details
性能优化把 `showDetailModels` 绑定到闲逛态，导致全览态只剩定位环和名称牌，上海影城、上生·新所及新华路沿线大量真实建筑不可见。同时，多个相邻 POI 共用默认标签锚点，315 号、Villa Le Bec、329 弄等名称发生遮挡。

### Suggested Action
只在首屏 intro 延迟加载详细模型；进入 overview 后立即挂载。模型自带标签仅在 explore 显示，全览使用完整 POI 标签集及稳定的屏幕空间偏移和引导线。

### Metadata
- Source: user_feedback
- Related Files: app/scene/xinhua-world.tsx, app/scene/xinhua-road-landmarks.tsx, app/scene/poi-data.ts, app/globals.css
- Tags: world-map, landmark-visibility, label-layout, visual-regression

### Resolution
- **Resolved**: 2026-07-17T22:36:00+08:00
- **Notes**: 全览态现会挂载全部详细建筑，建筑自带标签只保留在闲逛态；17 个全览名称牌采用独立偏移与引导线。1280×720 实际页面测得 17/17 标签可见、标签相交数为 0，浏览器控制台无错误。

---
## [LRN-20260719-017] correction

**Logged**: 2026-07-19T22:20:00+08:00
**Priority**: high
**Status**: resolved
**Area**: docs

### Summary
移动硬盘已有完整知识库时，不应把 Markdown 再复制到仓库或旧 Wiki；仓库应使用符号链接，并为该领域建立独立 LLM Wiki。

### Details
`/Volumes/plugin/3D_Modeling_ThreeJS_Knowledge_Base` 已保存 Fable-5、Summer Afternoon、完整评论、相似产品、照片建模工作流和 Blender 视频拉片。重复复制到 `wander-xinhua/docs/knowledge-sources/` 会产生无价值副本，把资料加入 TowerOld `xhs-creator-wiki` 还会污染项目边界。正确路线是：仓库目录使用符号链接；新建独立 `Threejs-3d-research` Wiki；由于 LLM Wiki 扫描器不跟随目录符号链接，同一移动硬盘内的 `raw/sources/` 使用 hard link，共享 inode 而不重复占用文件内容空间。

### Suggested Action
知识迁移先检查原始知识库和领域边界。空间敏感时，仓库使用符号链接、同盘 Wiki 使用 hard link；为新领域创建独立 Wiki 项目，写好 `purpose.md`，触发扫描并确认资料进入来源目录或 ingest queue。用户允许后台处理时，无需等待全部生成完成。

### Metadata
- Source: user_feedback
- Related Files: `docs/knowledge-sources/threejs-modeling-knowledge-base`
- Tags: symlink, hard-link, llm-wiki, project-boundary, storage, single-source-of-truth

### Resolution
- **Resolved**: 2026-07-19T22:45:00+08:00
- **Notes**: 已删除本轮新建的所有 Markdown 副本，保留 Plugin 盘唯一原件；仓库保留符号链接；新建独立 Wiki `Threejs-3d-research`（项目 ID `0e0c3670-c275-42f9-8c06-6de01e3683b5`），用 hard link 接入来源并写明 purpose。TowerOld 旧 Wiki 不再承载此研究。

---

## [LRN-20260723-018] correction

**Logged**: 2026-07-23T10:40:00+08:00
**Priority**: critical
**Status**: pending
**Area**: frontend

### Summary
盛夏绘本的人物不能继续用程序化球体和胶囊体细修，应优先采用专业作者完成的整套角色。

### Details
当前 style-lab 人物动作生硬、手部明显过大，继续调节局部比例无法解决造型、骨骼和动画品质不足。用户不做 3D 设计，不应要求用户判断拓扑、蒙皮或手部参数。

### Suggested Action
直接淘汰程序化人物，筛选授权清晰、已绑定骨骼、带 Idle/Walk 动画的完整成品角色；由实现侧完成格式转换、动画适配和性能优化，只让用户在同一盛夏场景和镜头中比较最终视觉。

### Metadata
- Source: user_feedback
- Related Files: `app/style-lab/StyleLab.tsx`, `public/models/character/urban-wanderer.glb`
- Tags: character, rig, animation, proportion, style-lab, visual-quality

---

## [LRN-20260723-019] correction

**Logged**: 2026-07-23T18:50:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
“从全览出发”所在页面指现有游戏入口页本身，不代表进入主页或进入游戏时的转场设计。

### Details
用户要比较的是同一个入口页面的三种视觉方案：标题统一改为“漫步新华”，按钮统一改为“出发”，背景可以重做或基于原有全览图重新设计。上一轮错误地把任务扩展成了进入游戏的动画仪式与过渡方案，偏离了页面层级和文案边界。

### Suggested Action
以后遇到“那个按钮的页面”“进入游戏之前的页面”等描述时，先以当前 DOM 和实际截图确认页面层级；设计比较必须固定用户已明确的标题、按钮和功能，只改变背景、构图与视觉语言，不额外引入转场叙事。

### Metadata
- Source: user_feedback
- Related Files: app/xinhua-experience.tsx, app/globals.css
- Tags: intro-page, overview-background, design-scope, copy, correction

### Resolution
- **Resolved**: 2026-07-23T19:19:00+08:00
- **Notes**: 已从实际入口 DOM 截取无 UI 全览底图，后续三案固定为同一“漫步新华 / 出发”入口页，不再扩展为转场。

---

## [LRN-20260723-020] correction

**Logged**: 2026-07-23T19:12:20+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
“全新的视觉风格”意味着不继承现有水彩、中式书法、印章或古风按钮语言，应从国际化现代体系重新起稿。

### Details
上一轮虽然改对了入口页层级和“漫步新华 / 出发”文案，但仍沿用宋体、竖排、朱红印章按钮、米纸与墨绿等本土化符号。用户明确不想要这种中国古风感觉；新的三案需要使用现代无衬线中文、全球化游戏 UI 控件和全新的色彩/材质系统，不要求与现有页面风格一致。

### Suggested Action
入口页设计比较先锁定“禁用视觉语汇”：书法/宋体主标题、竖排、印章/封蜡式按钮、米纸、传统朱红与古典装饰边框。新方案从未来夜景、流体数字渐变、国际主义排版等现代方向分别起稿，同时固定页面功能和文案。

### Metadata
- Source: user_feedback
- Related Files: app/xinhua-experience.tsx, app/globals.css
- Tags: intro-page, modern-ui, international-style, typography, button, correction
- See Also: LRN-20260723-019

### Resolution
- **Resolved**: 2026-07-23T19:19:00+08:00
- **Notes**: 已重做全息城市、流体极光和国际主义海报三案；全部使用现代无衬线中文和国际化按钮，并通过源码检查排除宋体、楷体、竖排、印章与传统装饰。

---

## [LRN-20260724-002] correction

**Logged**: 2026-07-24T20:48:12+08:00
**Priority**: high
**Status**: in_progress
**Area**: frontend

### Summary
既有调研和 Wiki 结论只能生成候选方案，不能替代当前项目中的独立反证与运行时验证。

### Details
第三人称相机与操作手感研究包含源码观察、外部范式和待验证参数。用户明确要求先判断方案本身是否好，不能因为研究已写入 Wiki 就直接照搬。尤其是 fallback yaw 是否构成主要体感问题、58–62° FOV、350ms 镜头宽限期、相机半径及恢复阻尼，都必须在当前场景中以基线、确定性轨迹和真实视口验证。

### Suggested Action
把研究结论改写为可证伪假设；先保存基线证据，再以单元/轨迹测试验证数学不变量，最后在真实 `?start=` 场景按相同视口、DPR、路径和预热条件做前后对照。实测不支持的参数或架构应淘汰或修改，并在交付中区分 observed、inferred、confirmed。

### Metadata
- Source: user_feedback
- Related Files: `docs/knowledge-sources/wander-xinhua-third-person-camera-collision-and-mobile-controls-research-2026-07-24.md`, `app/scene/xinhua-world.tsx`, `app/scene/world-math.ts`
- Tags: research-validation, falsification, camera, controls, runtime-qa

### Resolution
- **Resolved**: 2026-07-24T22:35:00+08:00
- **Notes**: 已把既有结论改写成七条可证伪假设。真实 `xingfuli-canonical` 整圈基线推翻了“fallback yaw 是主因”，定位到离散缩臂切换；独立代码审查又用反例推翻固定步长边界采样、rig 方向代替真实视线、physics delta 计宽限期和零臂长初始化。修正后通过 138 项全量测试、lint、四视口、等价整圈 A/B 与长预热性能对照；持续摇杆加双指体感单列为用户真机验收，不作为自动化已确认项。

---
