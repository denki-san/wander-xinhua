import type { Metadata } from "next";
import "./building-evidence-lab.css";

export const metadata: Metadata = {
  title: "新华 Wonder｜建筑证据实验室",
  description:
    "从建筑参考照片提取证据，生成可编辑 Blender 资产，并在 Three.js 中验证体量、风格和漫游体验。",
  openGraph: {
    title: "新华 Wonder｜建筑证据实验室",
    description: "从照片证据到可漫游的 Three.js 地方。",
    type: "website",
    locale: "zh_CN",
    images: ["/building-evidence-lab-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "新华 Wonder｜建筑证据实验室",
    description: "从照片证据到可漫游的 Three.js 地方。",
    images: ["/building-evidence-lab-og.png"],
  },
};

export default function BuildingEvidenceLabLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
