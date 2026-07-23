import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "新华漫游志｜新华路 3D 闲逛",
  description: "进入按真实行政边界和道路比例重建的上海新华路手绘 3D 街区，自由闲逛，并发现唯一的一平米行动点。无需登录。",
  applicationName: "新华漫游志",
  keywords: ["新华路", "幸福里", "一平米行动", "社区地图", "上海"],
  openGraph: {
    title: "新华漫游志｜新华路 3D 闲逛",
    description: "在上海秋日暖光与梧桐树影里，沿着手绘 3D 新华路社区随便走走。",
    type: "website",
    locale: "zh_CN",
    images: [{ url: "/og.png", width: 1732, height: 909, alt: "新华路秋日绘本漫游" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "新华漫游志｜新华路 3D 闲逛",
    description: "在上海秋日暖光与梧桐树影里，沿着手绘 3D 新华路社区随便走走。",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#91bce3",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
