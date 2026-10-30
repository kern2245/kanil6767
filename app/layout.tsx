import type { Metadata } from "next";
import Script from "next/script";

import { siteConfig } from "@/site.config";
import "./globals.css";

/* 모든 페이지를 감싸는 가장 바깥 틀. 보통은 수정할 일이 거의 없습니다.
   다크 모드로 시작하고 싶으면 <html> 의 className 에 "dark" 를 추가하세요. */
export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
};

/* 접속할 때마다 제목 그라데이션 팔레트(1~6)를 무작위로 고르는 작은 스크립트.
   화면이 그려지기 전에 실행돼서 색이 깜빡이지 않습니다. 팔레트 색은 app/globals.css 에 있습니다. */
const PALETTE_COUNT = 6;
const pickPaletteScript = `document.documentElement.dataset.palette = String(Math.floor(Math.random() * ${PALETTE_COUNT}) + 1);`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="dark h-full" suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        {children}
        <Script id="pick-palette" strategy="beforeInteractive">
          {pickPaletteScript}
        </Script>
      </body>
    </html>
  );
}
