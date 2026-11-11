import { siteConfig } from "@/site.config";
import { getWebtoons } from "@/lib/data";
import { getPopularity } from "@/lib/views";
import type { Webtoon, Weekday } from "@/lib/types";
import { Container } from "@/components/layout/container";
import { WebtoonBoard, type BoardTab } from "@/components/sections/webtoon-board";
import { getLang } from "@/lib/lang";

/* 요일별 웹툰 목록 섹션.
   - 제목/요일 이름: site.config.ts 의 webtoons
   - 웹툰: 관리자 페이지(/admin)의 "웹툰" 탭에서 관리 (올리기 전에는 예시 웹툰이 보임)
   - 요일 탭을 누르면 그 요일 웹툰만 보임 (처음엔 한국 시간 기준 오늘 요일)
   - 큰 제목 "요일별 웹툰 | 완결 웹툰" 이 버튼이라, 누르면 완결 웹툰으로 바뀜 (완결 글자: site.config.ts 의 completedWebtoons)
   - 완결로 표시한 웹툰은 요일 탭에서는 빠짐 */

const WEEKDAY_BY_JS_DAY: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** 한국 시간 기준 오늘 요일 */
export function todayInKorea(): Weekday {
  const name = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Seoul" })
    .format(new Date())
    .toLowerCase()
    .slice(0, 3);
  return WEEKDAY_BY_JS_DAY.find((d) => d === name) ?? "mon";
}

export async function WebtoonWeekly() {
  const { webtoons } = siteConfig;
  const loaded = await getWebtoons();
  const lang = await getLang();
  // 인기 점수 붙이기 (예시 웹툰은 0)
  const scores = await getPopularity(loaded.filter((w) => !w.id.startsWith("sample-")).map((w) => w.id));
  const all = loaded.map((w) => ({ ...w, popularity: scores.get(w.id) ?? 0 }));
  const ongoing = all.filter((w: Webtoon) => !w.is_completed);

  const columns: BoardTab[] = webtoons.weekdays.map((day) => ({
    key: day.key,
    label: day.label,
    items: ongoing.filter((w) => w.weekday === day.key),
  }));

  return (
    <section id="webtoons" className="scroll-mt-16 py-16">
      <Container>
        <WebtoonBoard
          columns={columns}
          completed={all.filter((w) => w.is_completed)}
          today={todayInKorea()}
          weekly={{ eyebrow: webtoons.eyebrow, title: webtoons.title }}
          completedHeading={siteConfig.completedWebtoons}
          lang={lang}
        />
      </Container>
    </section>
  );
}
