# Building Evidence Lab

《新华漫游志》的独立 Three.js 建筑研究 demo，用一栋新华路花园住宅展示：

- OSM footprint 与场景锚点；
- canonical / secondary 照片相机；
- 米制比例与艺术倍率分离；
- Identity、Position、Scale、Orientation 四项独立置信度；
- Evidence、Geometry、Cozy 三种观察模式；
- 推断区域、证据缺口和可编辑资产来源。

## Local development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run build
node --test tests/rendered-html.test.mjs
python3 /Users/lei/.codex/skills/photo-reference-webgl-modeling/scripts/audit_glb.py \
  public/models/house-315.glb --forbid-images --max-nodes 8
```

真实参考照片只保存在 `research/references/`，不作为页面贴图，也不嵌入 GLB。

## Codex × Blender

可验证的 Codex/Blender 协作方式、能力边界、任务模板和知识沉淀规范见 [research/codex-blender-playbook.md](research/codex-blender-playbook.md)。

已完成拉片的外部案例见 [GPT-5.6 Sol × Blender 视频拉片](research/external-xhs/6a546bdc0000000011019f0e/video-analysis.md)。
