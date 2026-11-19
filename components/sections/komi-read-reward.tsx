"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/** 📖 웹툰 보면 꼬미 키우기 보상
    - 회차 맨 아래(좋아요 버튼 근처)까지 내려 보고, 화면에 20초 이상 머물렀으면 "읽음" 기록 (회차당 1번)
    - 기록은 이 브라우저의 localStorage("komi-reads")에만 저장 → 게임(public/games/komi-idle.html)이 읽어서 보상 지급
    - 기록되면 작은 안내 + 게임으로 가는 링크를 보여줌 */
const KEY = "komi-reads";
const MIN_MS = 20000;

type Read = { id: string; t: number; c?: boolean };

function load(): Read[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function KomiReadReward({ episodeId, lang }: { episodeId: string; lang: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"none" | "new" | "old">("none");

  useEffect(() => {
    const t0 = Date.now();
    let done = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const record = () => {
      if (done) return;
      done = true;
      try {
        const list = load();
        if (list.some((r) => r.id === episodeId)) {
          setState("old");
          return;
        }
        list.push({ id: episodeId, t: Date.now() });
        localStorage.setItem(KEY, JSON.stringify(list.slice(-300)));
        setState("new");
      } catch {
        /* 저장이 막힌 브라우저면 그냥 넘어감 */
      }
    };

    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting || done) return;
      const wait = MIN_MS - (Date.now() - t0);
      if (wait <= 0) record();
      else if (!timer) timer = setTimeout(record, wait);
    });
    if (ref.current) io.observe(ref.current);
    return () => {
      io.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [episodeId]);

  const en = lang === "en";
  return (
    <div ref={ref} className="mb-6">
      {state !== "none" && (
        <Link
          href="/game"
          className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm hover:bg-primary/15"
        >
          <span>
            {state === "new"
              ? en
                ? "🎁 Komi game reward earned for reading!"
                : "🎁 꼬미 키우기 보상 1개 받음!"
              : en
                ? "📖 Already rewarded for this episode"
                : "📖 이 화는 이미 보상을 받았어요"}
          </span>
          <span className="shrink-0 font-semibold text-primary">{en ? "Claim in game →" : "게임에서 받기 →"}</span>
        </Link>
      )}
    </div>
  );
}
