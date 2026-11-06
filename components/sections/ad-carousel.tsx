"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Ad } from "@/lib/types";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 5000; // 다음 광고판으로 넘어가는 시간 (5초)

/** 광고판 슬라이드: 5초마다 다음 장, 점·화살표·손가락 밀기로 넘기기, 마우스를 올리면 잠깐 멈춤 */
export function AdCarousel({ ads }: { ads: Ad[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = ads.length;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  // 자동으로 넘기기 (2장 이상이고, 마우스가 올라가 있지 않을 때)
  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearInterval(timer);
  }, [count, paused]);

  const ad = ads[index] ?? ads[0];
  if (!ad) return null;
  const isExternal = ad.link_url?.startsWith("http");

  return (
    <div
      className="relative rounded-2xl border bg-muted/50 px-12 py-16 text-center sm:px-16"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        touchStartX.current = null;
      }}
      aria-roledescription="광고판"
    >
      {/* 광고판 내용 (바뀔 때 살짝 나타나는 효과) */}
      <div key={ad.id} className="animate-in fade-in duration-500" aria-live="polite">
        <SectionHeader
          eyebrow={ad.eyebrow ?? undefined}
          title={ad.title}
          description={ad.description ?? undefined}
          className="mx-auto"
        />
        {ad.link_url ? (
          <Button asChild className="mt-8">
            <a href={ad.link_url} {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              자세히 보기
            </a>
          </Button>
        ) : null}
      </div>

      {count > 1 ? (
        <>
          {/* 좌우 화살표 */}
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="이전 광고판"
            className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:left-4"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="다음 광고판"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:right-4"
          >
            <ChevronRight className="size-5" />
          </button>

          {/* 점 (● ○ ○) */}
          <div className="mt-10 flex justify-center gap-2">
            {ads.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`${i + 1}번째 광고판`}
                aria-current={i === index}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
