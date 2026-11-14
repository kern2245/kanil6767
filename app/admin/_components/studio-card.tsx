"use client";

import { useState } from "react";
import Image from "next/image";
import { BarChart3, CalendarClock, EyeOff, Globe, ImageIcon, Layers, Pencil, Settings2 } from "lucide-react";

import type { PublishOption } from "@/lib/publish-time";
import type { Webtoon } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CompleteButton, CoverButtons, DeleteWebtoonButton, WebtoonForm } from "./webtoon-form";
import { EpisodeManager } from "./episode-manager";

/* 작가 스튜디오 — 웹툰 한 개 카드 (회장 페이지 "웹툰" 탭, 작가 페이지가 같이 씀)
   - 왼쪽: 큰 표지 / 오른쪽: 제목, 요일·완결, 회차 수, 다음 공개 예약
   - 아래 탭 3개: 회차 관리 · 정보 수정 · 표지·설정 (누르면 열리고, 한 번 더 누르면 닫힘)
   - 한국판 / 영어판은 서로 따로인 웹툰 (예전 "영어판" 탭은 없앰 — english-manager.tsx 는 안 씀) */

type EpisodeRow = {
  id: string;
  number: number;
  title: string;
  imageCount: number;
  scheduledLabel: string | null;
  thumbnailUrl: string | null;
  /** 영어판: 영어 회차 제목 / 영어판 그림 장수 */
  titleEn: string;
  enImageCount: number;
  /** 작가 통계: 조회수 · 좋아요 · 싫어요 · 댓글 수 */
  stats: { views: number; likes: number; dislikes: number; comments: number };
};

type Tab = "episodes" | "edit" | "settings";

const TABS: { key: Tab; label: string; icon: typeof Layers }[] = [
  { key: "episodes", label: "회차 관리", icon: Layers },
  { key: "edit", label: "정보 수정", icon: Pencil },
  { key: "settings", label: "표지·설정", icon: Settings2 },
];

export function StudioCard({
  webtoon,
  dayLabel,
  episodes,
  publishChoices,
  ownerLabel,
  canComplete,
}: {
  webtoon: Webtoon;
  /** "토요웹툰" 처럼 */
  dayLabel: string;
  episodes: EpisodeRow[];
  publishChoices: PublishOption[];
  /** 회장 페이지에서만: 올린 작가 이름 (작가 화면에서는 null) */
  ownerLabel: string | null;
  /** 회장 페이지에서만 "완결로 넘기기" 버튼 */
  canComplete: boolean;
}) {
  const [tab, setTab] = useState<Tab | null>(null);
  const nextScheduled = episodes.find((ep) => ep.scheduledLabel)?.scheduledLabel ?? null;
  // 작가 통계 합계 (모든 회차)
  const total = episodes.reduce(
    (acc, ep) => ({
      views: acc.views + ep.stats.views,
      likes: acc.likes + ep.stats.likes,
      comments: acc.comments + ep.stats.comments,
    }),
    { views: 0, likes: 0, comments: 0 },
  );

  return (
    <li className="overflow-hidden rounded-2xl border bg-muted/20">
      {/* 위: 표지 + 정보 */}
      <div className="flex gap-4 p-4 sm:gap-5 sm:p-5">
        <div className="relative aspect-[160/207] w-24 shrink-0 overflow-hidden rounded-xl bg-muted shadow-sm sm:w-28">
          {webtoon.cover_url ? (
            <Image src={webtoon.cover_url} alt="" fill sizes="112px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <ImageIcon className="size-6" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 text-lg font-semibold leading-snug break-words">{webtoon.title}</h3>
            <DeleteWebtoonButton id={webtoon.id} coverUrl={webtoon.cover_url} />
          </div>

          {/* 작은 표시들 */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            {webtoon.is_completed ? (
              <span className="rounded-full border border-muted-foreground/50 px-2 py-0.5 font-medium text-muted-foreground">
                완결
              </span>
            ) : (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary">{dayLabel}</span>
            )}
            {/* 한국판 / 영어판 */}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                webtoon.lang === "en" ? "border border-primary/60 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              <Globe className="size-3" />
              {webtoon.lang === "en" ? "영어판" : "한국판"}
            </span>
            {!webtoon.is_visible ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                <EyeOff className="size-3" />
                숨김
              </span>
            ) : null}
            {ownerLabel ? <span className="text-muted-foreground">· {ownerLabel}</span> : null}
          </div>

          <dl className="mt-auto grid gap-1 pt-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Layers className="size-4 shrink-0" />
              <dt className="sr-only">회차</dt>
              <dd>
                총 <span className="font-semibold text-foreground">{episodes.length}</span>화
              </dd>
            </div>
            <div className="flex items-center gap-1.5" title="모든 회차 합계: 조회 · 좋아요 · 댓글">
              <BarChart3 className="size-4 shrink-0" />
              <dt className="sr-only">통계</dt>
              <dd>
                조회 <span className="font-semibold text-foreground">{total.views}</span> · 👍{" "}
                <span className="font-semibold text-foreground">{total.likes}</span> · 💬{" "}
                <span className="font-semibold text-foreground">{total.comments}</span>
              </dd>
            </div>
            {nextScheduled ? (
              <div className="flex items-center gap-1.5">
                <CalendarClock className="size-4 shrink-0" />
                <dt className="sr-only">다음 공개</dt>
                <dd>
                  다음 공개 <span className="font-semibold text-foreground">{nextScheduled}</span>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      {/* 탭 */}
      <div className="grid grid-cols-3 border-t" role="tablist" aria-label={`${webtoon.title} 관리`}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(tab === key ? null : key)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 border-b-2 py-3 text-xs font-medium transition-colors sm:flex-row sm:gap-1.5 sm:text-sm",
              tab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {/* 탭 내용 (닫혀 있으면 안 보임) */}
      {tab ? (
        <div className="border-t bg-background/40 p-4 sm:p-5">
          {tab === "episodes" ? (
            <EpisodeManager webtoonId={webtoon.id} episodes={episodes} publishChoices={publishChoices} />
          ) : tab === "edit" ? (
            <WebtoonForm webtoon={webtoon} />
          ) : (
            <div className="grid gap-3">
              <p className="text-sm font-medium">표지</p>
              <CoverButtons id={webtoon.id} hasCover={Boolean(webtoon.cover_url)} />
              {canComplete ? (
                <>
                  <p className="mt-2 text-sm font-medium">연재 상태 (회장만)</p>
                  <CompleteButton id={webtoon.id} completed={Boolean(webtoon.is_completed)} />
                </>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </li>
  );
}
