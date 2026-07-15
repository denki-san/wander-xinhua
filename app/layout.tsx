import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "新华信使｜幸福里一平米行动地图",
  description: "从幸福里出发，用三次轻行动认识新华路街区。无需登录，打开即可漫游。",
  applicationName: "新华信使",
  keywords: ["新华路", "幸福里", "一平米行动", "社区地图", "上海"],
  openGraph: {
    title: "新华信使｜幸福里一平米行动地图",
    description: "把街区装进一封可以行走的信里。",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "新华信使｜幸福里一平米行动地图",
    description: "把街区装进一封可以行走的信里。",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f7edd7",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
