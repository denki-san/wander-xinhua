import type { Metadata } from "next";
import { Suspense } from "react";
import { MeshyStreetAssetsQa } from "./MeshyStreetAssetsQa";

export const metadata: Metadata = {
  title: "Meshy 街景资产 QA｜漫步新华",
  description: "隔离验证由 Meshy Agent 网页候选编译得到的十件低模街景资产。",
};

export default function MeshyStreetAssetsQaPage() {
  return (
    <Suspense
      fallback={
        <main data-qa-route="meshy-street-assets" data-qa-ready="false" />
      }
    >
      <MeshyStreetAssetsQa />
    </Suspense>
  );
}
