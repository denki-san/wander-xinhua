import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./app/globals.css";
import { XinhuaExperience } from "./app/xinhua-experience";

const AssetLibrary = lazy(() => import("./app/asset-library/AssetLibrary").then((module) => ({
  default: module.AssetLibrary,
})));
const root = document.getElementById("root");
const routePath = window.location.pathname.replace(/\/+$/, "") || "/";
const assetLibraryRoute = routePath === "/asset-library";

if (!root) {
  throw new Error("找不到应用挂载节点");
}

createRoot(root).render(
  <StrictMode>
    {assetLibraryRoute ? (
      <Suspense fallback={<div role="status">正在装载资产总览…</div>}>
        <AssetLibrary />
      </Suspense>
    ) : <XinhuaExperience />}
  </StrictMode>,
);
