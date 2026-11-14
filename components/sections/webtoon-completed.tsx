import Link from "next/link";

import { siteConfig } from "@/site.config";
import { getWebtoons } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";
import { WebtoonCard } from "@/components/sections/webtoon-board";

/* 완결 웹툰 섹션 (요일별 웹툰 바로 아래, 같은 모양의 큰 제목)
   - 제목 글자: site.config.ts 의 completedWebtoons
   - 회장·작가 페이지에서 "완결"에 체크한 웹툰만 모여서 보임 (요일별 웹툰에서는 빠짐)
   - 웹툰 칸 수: 휴대폰 3칸 → 태블릿 5칸 → 데스크톱 7칸 (요일별 웹툰과 같음) */

export async function WebtoonCompleted() {
  const { completedWebtoons } = siteConfig;
  const completed = (await getWebtoons(await getLang())).filter((w) => w.is_completed);

  return (
    <section id="completed" className="scroll-mt-16 py-16">
      <Container>
        <SectionHeader eyebrow={completedWebtoons.eyebrow} title={completedWebtoons.title} />
        {completed.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{completedWebtoons.empty}</p>
        ) : (
          <div className="mt-8 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-5 lg:grid-cols-7">
            {completed.map((w) => (
              <Link key={w.id} href={`/webtoon/${w.id}`}>
                <WebtoonCard webtoon={w} />
              </Link>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
