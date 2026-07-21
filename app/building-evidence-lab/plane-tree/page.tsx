import type { Metadata } from "next";
import { PlaneTreeViewer } from "../PlaneTreeViewer";

export const metadata: Metadata = {
  title: "Hero 梧桐树｜新华 Wonder",
  description: "一棵可实时旋转、拆解枝干并近看斑驳树皮的 WebGL 悬铃木 Hero 资产。",
};

export default function PlaneTreePage() {
  return <PlaneTreeViewer />;
}
