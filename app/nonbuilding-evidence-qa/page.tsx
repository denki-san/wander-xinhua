import type { Metadata } from "next";
import { Suspense } from "react";
import { NonbuildingEvidenceQa } from "./NonbuildingEvidenceQa";

export const metadata: Metadata = {
  title: "非建筑证据模型 QA｜漫步新华",
  description: "隔离验证证据驱动街景资产的 visible-low / hidden 两态合同。",
};

export default function NonbuildingEvidenceQaPage() {
  return (
    <Suspense fallback={<main data-qa-route="nonbuilding-evidence" data-qa-ready="false" />}>
      <NonbuildingEvidenceQa />
    </Suspense>
  );
}
