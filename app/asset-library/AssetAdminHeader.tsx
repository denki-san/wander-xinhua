"use client";

import Link from "next/link";
import styles from "./asset-admin-header.module.css";

export type AssetAdminPage = "overview" | "workflow";

export function AssetAdminHeader({ active }: { active: AssetAdminPage }) {
  return (
    <header className={styles.header}>
      <div className={styles.brand} aria-label="个人资产后台">
        <span className={styles.brandMark}>资</span>
        <span>
          <strong>资产后台</strong>
          <small>Asset Library</small>
        </span>
      </div>
      <nav className={styles.navigation} aria-label="资产后台页面">
        <Link className={active === "overview" ? styles.active : ""} href="/asset-library">
          资产总览
        </Link>
        <Link className={active === "workflow" ? styles.active : ""} href="/asset-library/workflow">
          工作流程
        </Link>
      </nav>
      <div className={styles.headerMeta}>
        <span className={styles.syncDot} />
        生产资产快照 · 2026.07.25
      </div>
    </header>
  );
}
