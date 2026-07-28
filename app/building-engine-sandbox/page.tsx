import type { Metadata } from "next";
import { Suspense } from "react";
import { BuildingEngineSandbox } from "./BuildingEngineSandbox";

export const metadata: Metadata = {
  title: "新华漫游建筑引擎 Sandbox｜漫步新华",
  description: "隔离审核 garden-villa Massing 与 Low-poly Master 的真实 Three.js 页面。",
};

export default function BuildingEngineSandboxPage() {
  return (
    <Suspense
      fallback={(
        <main
          data-qa-route="building-engine-sandbox"
          data-qa-ready="false"
          data-qa-render-ready="false"
        />
      )}
    >
      <BuildingEngineSandbox />
    </Suspense>
  );
}
