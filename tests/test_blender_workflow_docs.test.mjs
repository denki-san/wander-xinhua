import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("仓库级规则要求执行可验证的 Blender 工作流", async () => {
  const agentRules = await readFile(new URL("AGENTS.md", root), "utf8");

  assert.match(agentRules, /docs\/research\/blender-ai-workflow\.md/);
  assert.match(agentRules, /canonical comparison view/);
  assert.match(agentRules, /Blender MCP/);
  assert.match(agentRules, /Headless Blender/);
  assert.match(agentRules, /Three\.js/);
  assert.match(agentRules, /npm test/);
  assert.match(agentRules, /npm run lint/);
});

test("工作流保留证据、生成器和三层验收门", async () => {
  const workflow = await readFile(
    new URL("docs/research/blender-ai-workflow.md", root),
    "utf8",
  );
  const template = await readFile(
    new URL("docs/research/templates/blender-model-brief-template.md", root),
    "utf8",
  );

  assert.match(workflow, /Research Gate/);
  assert.match(workflow, /Quality Contract/);
  assert.match(workflow, /MCP 与 Headless Blender 的分工/);
  assert.match(workflow, /Blender 验收/);
  assert.match(workflow, /GLB 验收/);
  assert.match(workflow, /Three\.js 运行时验收/);
  assert.match(workflow, /FICS 新华 365/);

  assert.match(template, /Observed/);
  assert.match(template, /Inferred/);
  assert.match(template, /Unknown/);
  assert.match(template, /Runtime budget/);
  assert.match(template, /Decision Log/);
});

test("内容研究工作流覆盖入库、视频拉片、调研和学习验证", async () => {
  const workflow = await readFile(
    new URL("docs/research/content-research-wiki-workflow.md", root),
    "utf8",
  );
  const knowledge = await readFile(
    new URL("docs/knowledge-sources/blender-threejs-modeling-playbook.md", root),
    "utf8",
  );

  assert.match(workflow, /怎么把内容放进去/);
  assert.match(workflow, /怎么对视频做拉片/);
  assert.match(workflow, /怎么做调研/);
  assert.match(workflow, /怎么让 LLM Wiki 学习/);
  assert.match(workflow, /均匀抽帧 \+ 场景变化帧 \+ 去重/);
  assert.match(workflow, /PC NVIDIA Whisper/);
  assert.match(workflow, /pending/);
  assert.match(workflow, /processing/);
  assert.match(knowledge, /Headless Blender/);
  assert.match(knowledge, /Blender、GLB、Three\.js 三层验收/);
});
