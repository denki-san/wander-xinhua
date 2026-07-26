import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("运行时 console 遥测只在显式 QA 参数下于应用模块前启动", () => {
  assert.match(source, /qaRuntimeTelemetry/);
  assert.match(source, /parameters\.get\("qaRuntimeTelemetry"\) !== "1"/);
  assert.ok(
    source.indexOf("qaRuntimeTelemetry")
      < source.indexOf('<script type="module" src="/static-entry.tsx">'),
  );
  assert.match(source, /runtimeQaConsoleErrors/);
  assert.match(source, /runtimeQaConsoleWarnings/);
  assert.match(source, /runtimeQaWindowErrors/);
  assert.match(source, /runtimeQaUnhandledRejections/);
  assert.match(source, /slice\(-20\)/);
});
