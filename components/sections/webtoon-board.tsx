"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";

import type { Webtoon, Weekday } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 요일 탭 한 개 (mon~sun) */
export type BoardTab = { key: Weekday; label: string; items: Webtoon[] };

/** 웹툰 카드 한 개: 표지 + (UP / 완결) 제목
    UP 표시: 완전 자동 — 새 회차가 공개된 그날(한국 날짜)에만 붙고, 다음 날이면 사라집니다. (계산은 lib/data.ts 의 is_new)
    ("UP 항상 표시" 체크는 없앴어요. 예전에 켜 둔 값이 있어도 무시합니다)
    완결 웹툰은 UP 대신 "완결" 표시가 붙습니다. */
export function WebtoonCard({ webtoon }: { webtoon: Webtoon }) {
  const showUp = !webtoon.is_completed && Boolean(webtoon.is_new);
  return (
    <article className="group">
      <div className="relative aspect-[160/207] overflow-hidden rounded-xl bg-muted">
        {webtoon.cover_url ? (
          <Image
            src={webtoon.cover_url}
            alt={webtoon.title}
            fill
            sizes="(min-width: 768px) 14vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-6" />
          </div>
        )}
      </div>
      <h3 className="mt-2 flex items-center gap-1 text-sm font-medium leading-snug">
        {showUp ? (
          <span className="shrink-0 rounded-full border border-up px-1.5 text-[10px] font-bold leading-4 text-up">
            UP
          </span>
        ) : null}
        {webtoon.is_completed ? (
          <span className="shrink-0 rounded-full border border-muted-foreground/50 px-1.5 text-[10px] font-bold leading-4 text-muted-foreground">
            완결
          </span>
        ) : null}
        <span className="truncate">{webtoon.title}</span>
      </h3>
    </article>
  );
}

/** 웹툰 칸 (표지 그리드). 웹툰 칸 수: 휴대폰 3칸 → 태블릿 5칸 → 데스크톱 7칸 */
function WebtoonGrid({ items }: { items: Webtoon[] }) {
  return (
    <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-5 lg:grid-cols-7">
      {items.map((w) =>
        // 예시 웹툰은 눌러도 이동하지 않음, 실제 웹툰은 웹툰 페이지(회차 목록)로 이동
        w.id.startsWith("sample-") ? (
          <WebtoonCard key={w.id} webtoon={w} />
        ) : (
          <Link key={w.id} href={`/webtoon/${w.id}`}>
            <WebtoonCard webtoon={w} />
          </Link>
        ),
      )}
    </div>
  );
}

type Heading = { eyebrow: string; title: string };

/** 웹툰 판 (첫 화면).
    - 큰 제목 자리가 버튼 2개: "요일별 웹툰" | "완결 웹툰" — 누르면 아래 내용이 바뀜 (고른 쪽은 밝게, 아닌 쪽은 흐리게)
    - 요일별 웹툰: 요일 탭(월~일)을 누르면 그 요일 웹툰만 보임. 처음엔 오늘 요일이 골라져 있음
      요일 탭은 둥근 알약 모양, 고른 요일은 보라 배경 (색: app/globals.css 의 --tab-active)
    - 완결 웹툰: 회장·작가 페이지에서 "완결"에 체크한 웹툰 (요일별 웹툰에서는 빠짐) */
export function WebtoonBoard({
  columns,
  completed,
  today,
  weekly,
  completedHeading,
}: {
  columns: BoardTab[];
  completed: Webtoon[];
  today: Weekday;
  weekly: Heading;
  completedHeading: Heading & { empty: string };
}) {
  const [view, setView] = useState<"weekly" | "completed">("weekly");
  const [selected, setSelected] = useState<Weekday>(today);
  // 정렬: 기본순(회장이 정한 순서) / 인기순(조회수 + 좋아요×3)
  const [sort, setSort] = useState<"default" | "popular">("default");
  const current = columns.find((c) => c.key === selected) ?? columns[0];
  // 인기순이면 인기 점수 높은 순으로 (같으면 원래 순서)
  const sorted = (items: Webtoon[]) =>
    sort === "popular" ? [...items].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)) : items;
  const views = [
    { key: "weekly", ...weekly },
    { key: "completed", ...completedHeading },
  ] as const;

  return (
    <div>
      {/* 큰 제목 = 버튼 (요일별 웹툰 | 완결 웹툰) */}
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {view === "weekly" ? weekly.eyebrow : completedHeading.eyebrow}
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2" role="tablist" aria-label="웹툰 종류">
        {views.map((v) => (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={view === v.key}
            onClick={() => setView(v.key)}
            className={cn(
              "text-3xl font-semibold tracking-tight transition-colors sm:text-4xl",
              view === v.key ? "text-foreground" : "text-muted-foreground/50 hover:text-muted-foreground",
            )}
          >
            {v.title}
          </button>
        ))}
      </div>

      {/* 정렬: 기본순 / 인기순 🔥 */}
      <div className="flex shrink-0 gap-1 rounded-full bg-muted p-1 text-xs font-semibold" role="group" aria-label="정렬">
        {(
          [
            ["default", "기본순"],
            ["popular", "🔥 인기순"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={sort === key}
            onClick={() => setSort(key)}
            className={cn(
              "rounded-full px-3 py-1.5 transition-colors",
              sort === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      </div>

      {view === "completed" ? (
        completed.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{completedHeading.empty}</p>
        ) : (
          <div className="mt-8">
            <WebtoonGrid items={sorted(completed)} />
          </div>
        )
      ) : (
        <WeekdayTabs
          columns={columns}
          current={{ ...current, items: sorted(current.items) }}
          selected={selected}
          onSelect={setSelected}
          today={today}
          // 고른 요일이 비었을 때 대신 보여줄 웹툰: 다른 요일 연재작을 인기순으로 7개
          suggestions={columns
            .flatMap((c) => c.items)
            .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
            .slice(0, 7)}
        />
      )}
    </div>
  );
}

/** 요일 탭(월~일) + 고른 요일의 웹툰 */
function WeekdayTabs({
  columns,
  current,
  selected,
  onSelect,
  today,
  suggestions,
}: {
  columns: BoardTab[];
  current: BoardTab;
  selected: Weekday;
  onSelect: (day: Weekday) => void;
  today: Weekday;
  suggestions: Webtoon[];
}) {
  const setSelected = onSelect;
  return (
    <div className="mt-8">
      {/* 요일 탭 */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="tablist" aria-label="요일 선택">
        {columns.map((col) => (
          <button
            key={col.key}
            type="button"
            role="tab"
            aria-selected={col.key === selected}
            onClick={() => setSelected(col.key)}
            className={cn(
              "rounded-full py-2 text-sm font-semibold transition-colors",
              col.key === selected
                ? "bg-tab-active text-tab-active-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {col.label}
            <span className="hidden md:inline">요웹툰</span>
            {col.key === today ? (
              <span className="ml-0.5 text-[10px] font-normal">
                •<span className="hidden md:inline">오늘</span>
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* 고른 요일의 웹툰만 */}
      {current.items.length === 0 ? (
        suggestions.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">준비 중입니다.</p>
        ) : (
          // 이 요일엔 연재작이 없으면 → 텅 빈 화면 대신 다른 요일 인기 웹툰 추천
          <div className="mt-8">
            <p className="text-sm text-muted-foreground">
              {current.label}요일엔 아직 연재 웹툰이 없어요. 이런 웹툰은 어때요? 🔥
            </p>
            <WebtoonGrid items={suggestions} />
          </div>
        )
      ) : (
        <WebtoonGrid items={current.items} />
      )}
    </div>
  );
}
