"use client";

import { lazy, Suspense, useState } from "react";
import { ProgressiveFeatureBoundary } from "./progressive-feature-boundary";
import { XinhuaCoverMedia, XinhuaIntroSurface } from "./xinhua-intro-surface";

async function loadXinhuaExperience() {
  const importedExperience = await import("./xinhua-experience");
  return { default: importedExperience.XinhuaExperience };
}

const ProgressiveXinhuaExperience = lazy(loadXinhuaExperience);
const RetriedXinhuaExperience = lazy(loadXinhuaExperience);
const FinalXinhuaExperienceAttempt = lazy(loadXinhuaExperience);

function XinhuaBootShell() {
  return (
    <main
      className="xinhua-stage is-intro progressive-boot-shell"
      data-progressive-stage="shell"
      aria-busy="true"
    >
      <XinhuaIntroSurface loadingMessage="正在搭起可行走的街区" />
    </main>
  );
}

function XinhuaBootError({ onRetry }: { onRetry: () => void }) {
  return (
    <main
      className="xinhua-stage is-intro progressive-boot-shell"
      data-progressive-stage="error"
    >
      <XinhuaCoverMedia />
      <section className="progressive-boot-error" aria-labelledby="intro-error-title">
        <h1 id="intro-error-title">街区组件没有完整到达</h1>
        <p role="alert">当前画面没有丢失存档，可以重新请求轻量街区入口。</p>
        <button type="button" onClick={onRetry}>重新连接</button>
      </section>
    </main>
  );
}

export function XinhuaExperienceLoader() {
  const [attempt, setAttempt] = useState(0);
  const retry = () => {
    setAttempt((current) => {
      if (current < 2) return current + 1;
      window.location.reload();
      return current;
    });
  };

  return (
    <ProgressiveFeatureBoundary
      resetKey={attempt}
      fallback={<XinhuaBootError onRetry={retry} />}
    >
      <Suspense fallback={<XinhuaBootShell />}>
        {attempt === 0 ? (
          <ProgressiveXinhuaExperience />
        ) : attempt === 1 ? (
          <RetriedXinhuaExperience />
        ) : (
          <FinalXinhuaExperienceAttempt />
        )}
      </Suspense>
    </ProgressiveFeatureBoundary>
  );
}
