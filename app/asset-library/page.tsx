import type { Metadata } from "next";
import { AssetLibrary } from "./AssetLibrary";

export const metadata: Metadata = {
  title: "资产总览｜漫步新华",
  description: "漫步新华建筑、光线、树木、装饰物与人物资产管理后台。",
};

export default function AssetLibraryPage() {
  return <AssetLibrary />;
}
