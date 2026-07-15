import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app/globals.css";
import { XinhuaExperience } from "./app/xinhua-experience";

const root = document.getElementById("root");

if (!root) {
  throw new Error("找不到应用挂载节点");
}

createRoot(root).render(
  <StrictMode>
    <XinhuaExperience />
  </StrictMode>,
);
