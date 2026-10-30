import { siteConfig } from "@/site.config";
import { getWebtoons } from "@/lib/data";
import type { Webtoon, Weekday } from "@/lib/types";
import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";
import { WebtoonBoard } from "@/components/sections/webtoon-board";

/* 요일별 웹툰 목록 섹션.
   - 제목/요일 이름: site.config.ts 의 webtoons
   - 웹툰: 관리자 페이지(/admin)의 "웹툰" 탭에서 관리 (올리기 전에는 예시 웹툰이 보임)
   - 요일 탭을 누르면 그 요일 웹툰만 보임 (처음엔 한국 시간 기준 오늘 요일) */

const WEEKDAY_BY_JS_DAY: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** 한국 시간 기준 오늘 요일 */
function todayInKorea(): Weekday {
  const name = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Seoul" })
    .format(new Date())
    .toLowerCase()
    .slice(0, 3);
  return WEEKDAY_BY_JS_DAY.find((d) => d === name) ?? "mon";
}

export async function WebtoonWeekly() {
  const { webtoons } = siteConfig;
  const all = await getWebtoons();

  const columns = webtoons.weekdays.map((day) => ({
    ...day,
    items: all.filter((w: Webtoon) => w.weekday === day.key),
  }));

  return (
    <section id="webtoons" className="scroll-mt-16 py-16">
      <Container>
        <SectionHeader eyebrow={webtoons.eyebrow} title={webtoons.title} />
        <WebtoonBoard columns={columns} today={todayInKorea()} />
      </Container>
    </section>
  );
}
