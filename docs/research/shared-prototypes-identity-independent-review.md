# Shared Prototype Identity Independent Visual Review

## 2026-07-25 isolated Three.js final review

本节是在保留下方 Blender / GLB 初审原文的基础上，对材质修复后的真实
Three.js isolated gallery 追加独立复审。

复审材料：

- `docs/research/shared-prototypes-identity-manifest.json`
- `docs/research/shared-prototypes-identity-runtime-qa.json`
- `test_artifacts/all-models/identity/shared-prototypes/test_shared-prototypes-identity-browser-evidence.json`
- `test_shared-prototypes-identity-threejs-vegetation.jpg`
- `test_shared-prototypes-identity-threejs-street-furniture.jpg`

复审结论：

- 8 个当前 GLB 的 SHA 与 manifest 全部一致；合计 `159,748 bytes`、
  `1,916 triangles`，8/8 无图片、贴图、动画和根变换；
- 首轮运行时发现所有 `baseColorFactor` 退化为默认 0.8 灰色，修复生成器
  的 Principled BSDF PBR 参数并全量重建后，8/8 材质均为非默认色；
- `xinhua-plane-tree` 的高位多分叉、非对称冠形与树皮斑块可读；
  7 个街具的关键轮廓和分色均可读；
- isolated shape visual、material visual、load / render 均为 `8/8`；
- 两个页面均为 1280×720、DPR 2、visible、生产静态构建、禁用缓存，
  每页 8/8 当前 SHA GLB HTTP 200，runtime error 与 console error 为 0；
- 两个视觉分组都会预载全部 8 个 GLB，因此不能把本结果解释为按组加载优化；
- 种球、垃圾箱更细标签 / 开口等小细节在当前截图屏幕占比下不能独立确认；
- map position、scale、yaw、碰撞、通行与同条件性能基线均未验证。

最终计数：

- Blender visual：8/8
- GLB structural / material：8/8
- Isolated Three.js shape / material / load-render：8/8
- Map placement：0/8
- Collision and passage：0/8
- Formal Identity：0/8

因此本批次只关闭 isolated gallery 门，不得进入正式地图放行。

- Review date: 2026-07-25
- Scope: 1 confirmed plane-tree prototype + 7 released street-furniture prototypes
- Reviewer role: independent visual and structural review
- Blender visual pass: 8 / 8
- GLB structural pass: 8 / 8
- Formal Identity pass: 0 / 8

## Evidence reviewed

- Identity Brief:
  `docs/research/shared-prototypes-identity-model-brief.md`
- Massing release source:
  `docs/research/shared-prototypes-massing-manifest.json`
- Final Massing independent review:
  `docs/research/shared-prototypes-massing-independent-review-final.md`
- Canonical contact sheet:
  `test_artifacts/all-models/identity/shared-prototypes/test_shared-prototypes-identity-canonical-contact-sheet.png`
- Side contact sheet:
  `test_artifacts/all-models/identity/shared-prototypes/test_shared-prototypes-identity-side-contact-sheet.png`
- Per-asset build records:
  `docs/research/build-records/tiers/shared-prototypes/identity/`

## Scope gate

The generated set exactly matches the eight assets released by the formal
Massing review. `shangsheng-campus-tree`, `huashan-canopy-tree`,
`huashan-understory`, and `road-edge-shrub` are absent. Their species remain
unknown, so no species Identity was invented or borrowed from the Xinhua plane
tree.

## Per-asset visual decision

| Asset | Blender visual decision | Evidence boundary retained |
| --- | --- | --- |
| `xinhua-plane-tree` | Pass：canonical 与 side 均可读出连续渐细树干、高位五向主叉、不对称冠隙、浅色剥落斑块和少量果球；根颈落地。 | 只代表已确认悬铃木原型；不声称任一实例的年龄、胸径、测绘高度或修剪历史。 |
| `lane-lamp-short-arm` | Pass：细杆、单侧短臂、下垂灯头与小面积灯面在两视角完整，底座落地。 | 厂家、绝对高度、背面电气结构 unknown；灯面材质不证明真实发光状态。 |
| `cantilever-umbrella` | Pass：偏置侧柱、水平悬臂、斜撑、红色四坡近方形伞面和重底座清楚；没有悬空零件。 | 只采用幸福里外摆结构语言；不复制 logo、织物文字或厂家拼缝。 |
| `outdoor-table-set` | Pass：圆桌、中央柱脚与四把独立带靠背座椅完整；canonical / side 的四周关系一致。 | 通用外摆原型，不绑定特定店铺、材质品牌或精确工程尺寸。 |
| `slatted-bench` | Pass：五条座板、四条靠背板和两端深色框脚可读；侧视没有靠背与座面重合。 | 条板数量是低多边形可读性参数；紧固件、厂牌与局部近景 unknown。 |
| `rectangular-planter` | Pass：矩形箱体、凸起口沿、内凹种植面和三团不同高度植被在两视角分离清楚。 | 植物只表达种植体轮廓，不声明物种、季节或逐件尺寸。 |
| `shanghai-dual-classification-bin` | Pass：不锈钢框、双顶投口、青/蓝并列箱门和中央分隔明确；未出现文字、图标或品牌。 | 证据只支持上海城市类型，不证明新华路每个实例为同型号。 |
| `irregular-stone-bollard` | Pass：膝高宽体、八点不等边体块与轻微斜顶在 canonical / side 均可读；不是尖顶细柱。 | 深色石材为保守色盘；背面、石材品种、雕刻与精确尺寸 unknown。 |

## Structural audit

Bundled GLB audit command:

```text
python3 /Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py \
  --forbid-images --max-nodes 4 \
  public/models/tiers/shared-prototypes/identity/*.glb
```

Result:

- 8 / 8 `status=ok`;
- total `159,748 bytes`;
- total `1,916 triangles`;
- 8 / 8 have `0 images`, `0 textures`, `0 animations`;
- 8 / 8 have no transformed root nodes;
- every asset remains within its per-asset triangles, nodes, materials and
  binary-size budget;
- maximum node/material count is `4`, used by the dual-classification bin and
  plane tree to retain evidence-relevant material separation.

## Gate conclusion

This review passes the generated Blender silhouettes and GLB structure only.
It does not promote any asset to formal Identity.

Formal Identity remains blocked for all 8 assets until runtime, map placement,
collision and performance are validated in the actual Three.js page, canonical
directions are reproduced, and an independent final runtime review closes any
placement or access blockers. Therefore:

- Generated Identity assets: 8 / 8
- Blender visual pass: 8 / 8
- GLB structural pass: 8 / 8
- Formal Identity pass: 0 / 8
