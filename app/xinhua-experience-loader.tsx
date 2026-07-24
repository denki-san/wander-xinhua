"use client";

/* eslint-disable @next/next/no-img-element -- 启动壳必须在 Three.js 代码到达前直接显示本地封面。 */

import { lazy, Suspense, useState } from "react";
import { ProgressiveFeatureBoundary } from "./progressive-feature-boundary";

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
      <section className="intro-ui" aria-labelledby="intro-title">
        <img
          className="intro-cover-image"
          src="/images/xinhua-pocket-toy-cover.jpg"
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="high"
        />
        <h1 id="intro-title" aria-label="漫步新华路">
          <span>漫</span><span>步</span><span>新</span><span>华</span><span>路</span>
        </h1>
        <button type="button" disabled>正在准备</button>
        <p className="progressive-boot-status" role="status">
          正在搭起可行走的街区骨架…
        </p>
      </section>
    </main>
  );
}

function XinhuaBootError({ onRetry }: { onRetry: () => void }) {
  return (
    <main
      className="xinhua-stage is-intro progressive-boot-shell"
      data-progressive-stage="error"
    >
      <section className="intro-ui progressive-boot-error" aria-labelledby="intro-error-title">
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
