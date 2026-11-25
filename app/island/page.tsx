import { siteConfig } from "@/site.config";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/container";
import { GameFrame } from "@/app/game/game-frame";
import { getT } from "@/lib/lang";

/* 꼬미의 무인도 30일 게임 페이지 (주소: /island)
   - 게임 자체는 public/games/komi-island.html (한 파일짜리 게임) 을 화면 안 창(iframe)으로 보여줌
   - 게임 고치기: 그 html 파일을 바꾸면 됨 / 글자: site.config.ts 의 island
   - 게임 진행은 각 사람의 브라우저에만 저장 (서버 저장 없음) */

export async function generateMetadata() {
  const { lang } = await getT();
  const g = siteConfig.island[lang];
  return { title: g.title, description: g.text };
}

export default async function IslandPage() {
  const { lang } = await getT();
  const g = siteConfig.island[lang];

  return (
    <>
      <Navbar />
      <main className="flex-1 py-4 sm:py-8">
        <Container className="max-w-xl px-0 sm:px-8">
          <h1 className="sr-only">{g.title}</h1>
          <GameFrame src="/games/komi-island.html?v=1" title={g.title} />
        </Container>
      </main>
      <Footer />
    </>
  );
}
