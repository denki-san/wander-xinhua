import type { Metadata } from "next";
import { WorkflowDashboard } from "./WorkflowDashboard";

export const metadata: Metadata = {
  title: "工作流程｜新华漫游志资产后台",
  description: "建筑资产从参考证据到 Three.js 运行时验收的工作流程总览。",
};

export default function AssetWorkflowPage() {
  return <WorkflowDashboard />;
}
