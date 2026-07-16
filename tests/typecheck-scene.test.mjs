import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const run = promisify(execFile);
const cwd = fileURLToPath(new URL("../", import.meta.url));

test("地图与 3D 场景没有 TypeScript 类型错误", async () => {
  let output = "";
  try {
    await run("./node_modules/.bin/tsc", ["--noEmit", "--incremental", "false"], { cwd });
  } catch (error) {
    output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
  }
  const sceneErrors = output.split("\n").filter((line) => (
    /^app\/scene\//.test(line) || /^app\/xinhua-experience\.tsx/.test(line)
  ));
  assert.deepEqual(sceneErrors, []);
});
