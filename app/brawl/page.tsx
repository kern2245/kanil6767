import { siteConfig } from "@/site.config";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/container";
import { BrawlFrame } from "@/app/brawl/brawl-frame";
import { getT } from "@/lib/lang";

/* 꼬미 대난투 게임 페이지 (주소: /brawl)
   - 게임 자체는 public/games/komi-brawl.html (한 파일짜리 게임)
   - 온라인 대전 통신은 brawl-frame.tsx 가 Supabase 실시간 기능으로 대신 해 줌
   - 글자: site.config.ts 의 brawl */

export async function generateMetadata() {
  const { lang } = await getT();
  const g = siteConfig.brawl[lang];
  return { title: g.title, description: g.text };
}

export default async function BrawlPage() {
  const { lang } = await getT();
  const g = siteConfig.brawl[lang];

  return (
    <>
      <Navbar />
      <main className="flex-1 py-4 sm:py-8">
        <Container className="max-w-xl px-0 sm:px-8">
          <h1 className="sr-only">{g.title}</h1>
          <BrawlFrame src={`/games/komi-brawl.html?v=2${lang === "en" ? "&lang=en" : ""}`} title={g.title} />
        </Container>
      </main>
      <Footer />
    </>
  );
}
