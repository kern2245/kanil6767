import Link from "next/link";
import { Gamepad2, Swords, TreePalm, type LucideIcon } from "lucide-react";

import { siteConfig } from "@/site.config";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";
import { getT } from "@/lib/lang";

/* 미니게임 고르는 페이지 (주소: /games) — 상단 메뉴 "미니게임"을 누르면 여기로 옴
   - 게임 카드 순서 바꾸기 / 새 게임 추가: 아래 GAMES 목록
   - 카드 글자: site.config.ts 의 game, island, brawl / 페이지 제목: site.config.ts 의 games */

const GAMES: { key: "game" | "island" | "brawl"; icon: LucideIcon }[] = [
  { key: "brawl", icon: Swords },
  { key: "game", icon: Gamepad2 },
  { key: "island", icon: TreePalm },
];

export async function generateMetadata() {
  const { lang } = await getT();
  const g = siteConfig.games[lang];
  return { title: g.title, description: g.text };
}

export default async function GamesPage() {
  const { lang } = await getT();
  const g = siteConfig.games[lang];

  return (
    <>
      <Navbar />
      <main className="flex-1 py-8 sm:py-14">
        <Container>
          <SectionHeader eyebrow={g.eyebrow} title={g.title} description={g.text} />
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {GAMES.map(({ key, icon: Icon }) => {
              const game = siteConfig[key];
              const t = game[lang];
              return (
                <Link
                  key={key}
                  href={game.href}
                  className="group flex flex-col rounded-2xl border border-border/60 bg-muted p-5 transition-colors hover:border-primary/60"
                >
                  <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform group-hover:-rotate-6">
                    <Icon className="size-6" />
                  </span>
                  <h2 className="mt-4 text-lg font-bold tracking-tight">{t.title}</h2>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{t.text}</p>
                  <span className="mt-4 inline-flex w-fit items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                    {t.cta}
                  </span>
                </Link>
              );
            })}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
