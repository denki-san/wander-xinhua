import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "新华信使｜新华路 3D 闲逛",
  description: "进入上海新华路的手绘 3D 社区街区，自由闲逛，并发现唯一的一平米行动点。无需登录。",
  applicationName: "新华信使",
  keywords: ["新华路", "幸福里", "一平米行动", "社区地图", "上海"],
  openGraph: {
    title: "新华信使｜新华路 3D 闲逛",
    description: "在有边界的手绘 3D 新华路社区里随便走走。",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "新华信使｜新华路 3D 闲逛",
    description: "在有边界的手绘 3D 新华路社区里随便走走。",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#69b9b5",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
