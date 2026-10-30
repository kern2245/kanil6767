"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";

import type { Webtoon, Weekday } from "@/lib/types";
import { cn } from "@/lib/utils";

type Column = { key: Weekday; label: string; items: Webtoon[] };

/** 웹툰 카드 한 개: 표지 + (UP) 제목
    UP 표시: 오늘(한국 시간) 연재 요일인 웹툰은 자동으로 붙고, 날짜가 바뀌면 다음 요일로 넘어갑니다.
    관리자에서 "UP 항상 표시"를 켠 웹툰은 요일과 상관없이 붙습니다. */
function WebtoonCard({ webtoon, today }: { webtoon: Webtoon; today: Weekday }) {
  const showUp = webtoon.is_up || webtoon.weekday === today;
  return (
    <article className="group">
      <div className="relative aspect-[160/207] overflow-hidden rounded-md bg-muted">
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
          <span className="shrink-0 rounded-sm border border-up px-1 text-[10px] font-bold leading-4 text-up">
            UP
          </span>
        ) : null}
        <span className="truncate">{webtoon.title}</span>
      </h3>
    </article>
  );
}

/** 요일별 웹툰 판.
    - 위쪽 요일 탭(월~일)을 누르면 그 요일 웹툰만 아래에 보입니다. 처음엔 오늘 요일이 골라져 있음
    - 고른 요일 탭은 초록 배경 (색: app/globals.css 의 --tab-active)
    - 웹툰 칸 수: 휴대폰 3칸 → 태블릿 5칸 → 데스크톱 7칸 */
export function WebtoonBoard({ columns, today }: { columns: Column[]; today: Weekday }) {
  const [selected, setSelected] = useState<Weekday>(today);
  const current = columns.find((c) => c.key === selected) ?? columns[0];

  return (
    <div className="mt-8">
      {/* 요일 탭 */}
      <div className="grid grid-cols-7 border" role="tablist" aria-label="요일 선택">
        {columns.map((col) => (
          <button
            key={col.key}
            type="button"
            role="tab"
            aria-selected={col.key === selected}
            onClick={() => setSelected(col.key)}
            className={cn(
              "border-r py-3 text-sm font-semibold transition-colors last:border-r-0",
              col.key === selected
                ? "bg-tab-active text-tab-active-foreground"
                : "text-muted-foreground hover:text-foreground",
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
        <p className="py-16 text-center text-sm text-muted-foreground">준비 중입니다.</p>
      ) : (
        <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-5 lg:grid-cols-7">
          {current.items.map((w) => (
            <WebtoonCard key={w.id} webtoon={w} today={today} />
          ))}
        </div>
      )}
    </div>
  );
}
