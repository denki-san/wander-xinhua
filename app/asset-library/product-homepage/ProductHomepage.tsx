"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CHANGELOG_MONTH, RELEASE_NOTES } from "./release-notes";
import styles from "./product-homepage.module.css";

const weekDays = ["一", "二", "三", "四", "五", "六", "日"];
const firstWeekday = 2;
const daysInMonth = 31;

function dayFromDate(date: string) {
  return Number(date.slice(-2));
}

export function ProductHomepage() {
  const [selectedId, setSelectedId] = useState(RELEASE_NOTES[0].id);
  const selected = useMemo(
    () => RELEASE_NOTES.find((item) => item.id === selectedId) ?? RELEASE_NOTES[0],
    [selectedId],
  );
  const releasesByDay = useMemo(
    () => new Map(RELEASE_NOTES.map((item) => [dayFromDate(item.date), item])),
    [],
  );
  const calendarCells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => index - firstWeekday + 1);

  return (
    <main className={styles.shell}>
      <nav className={styles.nav} aria-label="产品主页导航">
        <Link href="/asset-library" className={styles.brand}>
          <span className={styles.brandMark}>新</span>
          <span>新华漫游志</span>
        </Link>
        <div className={styles.navLinks}>
          <a href="#changelog">更新日志</a>
          <Link href="/asset-library">资产库</Link>
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="page-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>WANDER XINHUA · SHANGHAI</p>
          <h1 id="page-title">在新华路，<br /><em>慢一点发现。</em></h1>
          <p>
            一个以真实街区为起点的 3D 漫游产品。我们把建筑、树影、故事与一平米的在地行动，慢慢放回同一张地图。
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} href="/">进入漫游</Link>
            <a className={styles.secondaryAction} href="#changelog">查看最近更新 <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <div className={styles.placeCard} aria-label="产品定位">
          <span className={styles.cardNumber}>01</span>
          <div className={styles.cardScene} aria-hidden="true">
            <i /><i /><i /><b />
          </div>
          <p>不是导览地图，<br />是一段可以自己走进去的街区记忆。</p>
          <small>产品主页 · 占位版本</small>
        </div>
      </section>

      <section className={styles.statement} aria-label="产品说明">
        <p>从一栋房子、一片梧桐树影开始，<br />重新建立人与街区的关系。</p>
        <span>探索 · 记忆 · 共建</span>
      </section>

      <section id="changelog" className={styles.changelog} aria-labelledby="changelog-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>PRODUCT CHANGELOG</p>
            <h2 id="changelog-title">产品正在怎样生长</h2>
          </div>
          <p>每一次更新，留下一个可以回看的日期。</p>
        </div>

        <div className={styles.changelogGrid}>
          <section className={styles.calendarCard} aria-label={`${CHANGELOG_MONTH.label} 更新日历`}>
            <div className={styles.calendarHeading}>
              <div>
                <span>Release calendar</span>
                <strong>{CHANGELOG_MONTH.label}</strong>
              </div>
              <span className={styles.calendarStatus}>3 次更新</span>
            </div>
            <div className={styles.weekdays}>{weekDays.map((day) => <span key={day}>{day}</span>)}</div>
            <div className={styles.calendarGrid}>
              {calendarCells.map((day, index) => {
                if (day < 1) return <span key={`empty-${index}`} aria-hidden="true" />;
                const release = releasesByDay.get(day);
                const isSelected = release?.id === selected.id;
                return release ? (
                  <button
                    key={day}
                    type="button"
                    className={`${styles.calendarDay} ${styles.hasRelease} ${isSelected ? styles.selectedDay : ""}`}
                    aria-pressed={isSelected}
                    aria-label={`${CHANGELOG_MONTH.month} 月 ${day} 日：${release.title}`}
                    onClick={() => setSelectedId(release.id)}
                  >
                    {day}<i aria-hidden="true" />
                  </button>
                ) : <span key={day} className={styles.calendarDay}>{day}</span>;
              })}
            </div>
            <p className={styles.calendarHint}><i /> 有产品更新的日期，点击查看详情</p>
          </section>

          <article className={styles.releaseCard} aria-live="polite">
            <div className={styles.releaseMeta}>
              <span>{selected.version}</span>
              <span>{selected.category}</span>
              <time dateTime={selected.date}>{selected.date.replaceAll("-", ".")}</time>
            </div>
            <h3>{selected.title}</h3>
            <p>{selected.summary}</p>
            <ul>
              {selected.highlights.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <footer>
              <span>{selected.commit ? `关联仓库提交 · ${selected.commit}` : "人工确认的公开更新"}</span>
              <a href="#sync-design">同步方案 <span aria-hidden="true">→</span></a>
            </footer>
          </article>
        </div>

        <div className={styles.releaseList} aria-label="全部更新">
          {RELEASE_NOTES.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={item.id === selected.id ? styles.activeRelease : ""}
            >
              <time dateTime={item.date}>{item.date.slice(5).replace("-", ".")}</time>
              <span>{item.title}</span>
              <small>{item.version}</small>
            </button>
          ))}
        </div>
      </section>

      <section id="sync-design" className={styles.syncDesign} aria-labelledby="sync-title">
        <p className={styles.eyebrow}>GITHUB SYNC · NEXT</p>
        <h2 id="sync-title">GitHub 可以搬，但不直接搬到前端。</h2>
        <p>
          下一步由构建期脚本读取 GitHub Releases 与已确认的提交标题，生成当前目录下的静态数据；公开页面始终以人工确认文案为兜底，接口限流、私有仓库或同步失败都不会影响访问。
        </p>
      </section>

      <footer className={styles.footer}>
        <span>新华漫游志 · 产品主页占位版</span>
        <Link href="/asset-library">回到 Asset Library</Link>
      </footer>
    </main>
  );
}
