"use client";

import { AssetAdminHeader } from "../AssetAdminHeader";
import {
  BUILDING_MANAGEMENT_RECORDS,
  STATUS_LABELS,
  WORKFLOW_STAGES,
} from "../building-management-data";
import styles from "./workflow-dashboard.module.css";

const total = BUILDING_MANAGEMENT_RECORDS.length;
const complete = BUILDING_MANAGEMENT_RECORDS.filter((item) => item.workflowState === "done").length;
const inProgress = BUILDING_MANAGEMENT_RECORDS.filter((item) => item.workflowState === "partial").length;
const pending = BUILDING_MANAGEMENT_RECORDS.filter((item) => item.workflowState === "missing").length;
const identityReady = BUILDING_MANAGEMENT_RECORDS.filter((item) => (
  item.qualityLevels.some((level) => level.id === "identity" && Boolean(level.model))
)).length;
const massingReady = BUILDING_MANAGEMENT_RECORDS.filter((item) => (
  item.qualityLevels.some((level) => level.id === "massing" && Boolean(level.model))
)).length;
const evidenceReady = BUILDING_MANAGEMENT_RECORDS.filter((item) => item.photos.length > 1).length;

const gapRows = [
  { label: "Identity 待制作", count: total - identityReady },
  { label: "Massing 待制作", count: total - massingReady },
  { label: "运行时对照待补", count: total - evidenceReady },
];

export function WorkflowDashboard() {
  return (
    <div className={styles.shell}>
      <AssetAdminHeader active="workflow" />
      <main className={styles.main}>
        <section className={styles.intro}>
          <div>
            <span className={styles.eyebrow}>BUILDING PIPELINE</span>
            <h1>建筑工作流程</h1>
            <p>流程和质量门统一放在这里；具体建筑的文档、照片与游戏入口在资产总览的建筑详情中查看。</p>
          </div>
          <div className={styles.summary}>
            <div><strong>{total}</strong><span>建筑资产</span></div>
            <div><strong>{complete}</strong><span>流程贯通</span></div>
            <div><strong>{inProgress}</strong><span>进行中</span></div>
            <div><strong>{pending}</strong><span>待补齐</span></div>
          </div>
        </section>

        <section className={styles.pipeline} aria-label="建筑资产工作流程">
          {WORKFLOW_STAGES.map((stage, index) => (
            <article key={stage.id} className={styles.stage}>
              <div className={styles.stageHead}>
                <span>{stage.index}</span>
                <small>{index === WORKFLOW_STAGES.length - 1 ? "完成门" : "下一道门"}</small>
              </div>
              <h2>{stage.title}</h2>
              <p>{stage.summary}</p>
              <div className={styles.gate}>
                <span>质量门</span>
                <strong>{stage.gate}</strong>
              </div>
            </article>
          ))}
        </section>

        <section className={styles.bottomGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <span className={styles.eyebrow}>CURRENT STATE</span>
                <h2>当前流程状态</h2>
              </div>
              <span>{total} 栋</span>
            </div>
            <div className={styles.stateBar} aria-label="建筑流程状态分布">
              <span style={{ flex: complete }} className={styles.done} />
              <span style={{ flex: inProgress }} className={styles.partial} />
              <span style={{ flex: pending }} className={styles.missing} />
            </div>
            <div className={styles.legend}>
              {(["done", "partial", "missing"] as const).map((state) => {
                const count = BUILDING_MANAGEMENT_RECORDS.filter((item) => item.workflowState === state).length;
                return (
                  <div key={state}>
                    <i className={styles[state]} />
                    <span>{STATUS_LABELS[state]}</span>
                    <strong>{count}</strong>
                  </div>
                );
              })}
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <span className={styles.eyebrow}>GAP QUEUE</span>
                <h2>待补队列</h2>
              </div>
            </div>
            <div className={styles.gaps}>
              {gapRows.map((row) => (
                <div key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.count}</strong>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className={styles.rules}>
          <div>
            <span className={styles.eyebrow}>TWO AXES</span>
            <h2>制作流程与运行时等级分开管理</h2>
          </div>
          <div className={styles.axis}>
            <strong>制作流程</strong>
            <p>描述资产从证据、Brief、建模、审计到运行时验收走到了哪里。</p>
          </div>
          <div className={styles.axis}>
            <strong>质量等级</strong>
            <p>Hero / Full、Hybrid Identity、Massing 是三个独立产物，缺少的等级保持空缺。</p>
          </div>
        </section>
      </main>
    </div>
  );
}
