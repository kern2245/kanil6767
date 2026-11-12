import type { Metadata, Viewport } from "next";
import Script from "next/script";

import { siteConfig } from "@/site.config";
import { getT } from "@/lib/lang";
import "./globals.css";

/* 모든 페이지를 감싸는 가장 바깥 틀. 보통은 수정할 일이 거의 없습니다.
   다크 모드로 시작하고 싶으면 <html> 의 className 에 "dark" 를 추가하세요. */
export async function generateMetadata(): Promise<Metadata> {
  // 한국어: site.config.ts 의 title·description / 영어: lib/i18n.ts 의 site
  const { lang, t } = await getT();
  const title = lang === "ko" ? siteConfig.title : t.site.title;
  const description = lang === "ko" ? siteConfig.description : t.site.description;
  const name = lang === "ko" ? siteConfig.legal.serviceName : "Sekai";
  return {
    // 공유 그림(app/opengraph-image.tsx) 등 주소의 기준
    metadataBase: new URL(siteConfig.url),
    // 첫 화면 탭 이름은 title, 다른 페이지는 "페이지 이름 | 세카이" 로 보임
    title: { default: title, template: `%s | ${name}` },
    description,
    // 카톡·SNS 에 주소를 공유할 때 보이는 제목·소개
    openGraph: { title, description, siteName: name, locale: lang === "ko" ? "ko_KR" : "en_US", type: "website" },
  };
}

/* 휴대폰·태블릿 화면 설정
   viewportFit "cover": 아이폰·아이패드의 아래쪽 홈 막대 영역까지 알려줘서,
   회차 화면 아래 바가 홈 막대에 가려지지 않게 함 (env(safe-area-inset-bottom) 이 작동) */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/* 접속할 때마다 제목 그라데이션 팔레트(1~6)를 무작위로 고르는 작은 스크립트.
   화면이 그려지기 전에 실행돼서 색이 깜빡이지 않습니다. 팔레트 색은 app/globals.css 에 있습니다. */
const PALETTE_COUNT = 6;
const pickPaletteScript = `document.documentElement.dataset.palette = String(Math.floor(Math.random() * ${PALETTE_COUNT}) + 1);`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { lang } = await getT();
  return (
    <html lang={lang} className="dark h-full" suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        {children}
        <Script id="pick-palette" strategy="beforeInteractive">
          {pickPaletteScript}
        </Script>
      </body>
    </html>
  );
}
