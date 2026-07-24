import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app/globals.css";
import { XinhuaExperienceLoader } from "./app/xinhua-experience-loader";

const root = document.getElementById("root");

if (!root) {
  throw new Error("找不到应用挂载节点");
}

createRoot(root).render(
  <StrictMode>
    <XinhuaExperienceLoader />
  </StrictMode>,
);
