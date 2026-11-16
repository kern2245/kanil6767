import Image from "next/image";
import Link from "next/link";
import { Gamepad2 } from "lucide-react";

import { siteConfig } from "@/site.config";
import { Container } from "@/components/layout/container";
import { getLang } from "@/lib/lang";

/* 첫 화면 '꼬미 키우기' 게임 배너 → 누르면 /game
   - 글자: site.config.ts 의 game / 꼬미 그림: public/games/komi-smirk.png */
export async function GameBanner() {
  const lang = await getLang();
  const g = siteConfig.game[lang];

  return (
    <section className="pt-6 sm:pt-10">
      <Container>
        <Link
          href={siteConfig.game.href}
          className="group flex items-center gap-4 overflow-hidden rounded-2xl border border-border/60 bg-muted p-4 transition-colors hover:border-primary/60 sm:gap-6 sm:p-6"
        >
          <Image
            src="/games/komi-smirk.png"
            alt=""
            width={331}
            height={398}
            className="h-20 w-auto shrink-0 transition-transform group-hover:-rotate-6 sm:h-28"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">{g.eyebrow}</p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight sm:text-2xl">{g.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{g.text}</p>
          </div>
          <span className="hidden shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:inline-flex">
            <Gamepad2 className="size-4" />
            {g.cta}
          </span>
        </Link>
      </Container>
    </section>
  );
}
