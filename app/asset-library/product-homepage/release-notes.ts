export type ReleaseNote = {
  id: string;
  date: string;
  version: string;
  title: string;
  summary: string;
  highlights: string[];
  category: "产品体验" | "场景资产" | "研究与资料";
  source: "local" | "github";
  commit?: string;
};

/**
 * 产品主页的公开变更真值。
 * GitHub 同步接入后，由构建脚本生成同结构数据；这里仍保留人工确认后的公开文案作为兜底。
 */
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    id: "2026-07-27-product-story",
    date: "2026-07-27",
    version: "v0.1.0",
    title: "产品主页与更新日历上线",
    summary: "为漫步新华建立一个可以持续讲述产品进展的公开入口。",
    highlights: ["首页占位信息架构", "按日期定位的 Changelog", "为 GitHub 构建期同步预留数据接口"],
    category: "产品体验",
    source: "local",
  },
  {
    id: "2026-07-26-asset-library",
    date: "2026-07-26",
    version: "v0.0.9",
    title: "生产资产库完成一次整理",
    summary: "把真实接入场景的建筑、光线、树木、装饰物与人物资产放进同一套可检索目录。",
    highlights: ["生产资产口径更清楚", "街道家具接入记录", "保留三档建筑质量信息"],
    category: "场景资产",
    source: "local",
    commit: "44b5cb9",
  },
  {
    id: "2026-07-24-lighting-research",
    date: "2026-07-24",
    version: "v0.0.8",
    title: "光线研究归档",
    summary: "把不同时间段的光照判断转化为可复用的场景语言，而不是一次性的截图效果。",
    highlights: ["光线预设研究", "运行时状态边界", "后续正午版本预留"],
    category: "研究与资料",
    source: "local",
    commit: "b336596",
  },
];

export const CHANGELOG_MONTH = {
  year: 2026,
  month: 7,
  label: "2026 年 7 月",
};
