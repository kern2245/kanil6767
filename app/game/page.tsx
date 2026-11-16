import { siteConfig } from "@/site.config";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/container";
import { GameLeaderboard } from "@/components/sections/game-leaderboard";
import { GameFrame } from "@/app/game/game-frame";
import { getT } from "@/lib/lang";

/* 꼬미 키우기 게임 페이지 (주소: /game)
   - 게임 자체는 public/games/komi-idle.html (한 파일짜리 게임) 을 화면 안 창(iframe)으로 보여줌
   - 게임 고치기: 그 html 파일을 바꾸면 됨 / 글자: site.config.ts 의 game
   - 게임 진행(바나나·강화)은 각 사람의 브라우저에 저장, 최고 스테이지는 로그인 회원만 순위표(game_scores)에 저장 */

export async function generateMetadata() {
  const { lang } = await getT();
  const g = siteConfig.game[lang];
  return { title: g.title, description: g.text };
}

export default async function GamePage() {
  const { lang } = await getT();
  const g = siteConfig.game[lang];

  return (
    <>
      <Navbar />
      <main className="flex-1 py-4 sm:py-8">
        <Container className="max-w-xl px-0 sm:px-8">
          <h1 className="sr-only">{g.title}</h1>
          <GameFrame src="/games/komi-idle.html?v=9" title={g.title} />
        </Container>
        <Container className="max-w-xl pb-6">
          <GameLeaderboard />
        </Container>
      </main>
      <Footer />
    </>
  );
}
