"use client";

import { useEffect } from "react";

import { recordView, rememberReading } from "@/app/webtoon/[id]/[no]/actions";

/** 화면에는 안 보이는 조각: 회차 화면에 5초 이상 머물면(화면이 보이는 상태로) 조회수를 한 번 기록
    → 들어오자마자 나가거나, 새로고침 연타로는 안 올라감. (하루 1번 제한은 서버에서) */
const STAY_MS = 5000;

export function EpisodeViewCounter({ episodeId }: { episodeId: string }) {
  // 이어보기: 들어오자마자 "이 회차까지 봤어요" 기억 (로그인 회원만, 서버에서 확인)
  useEffect(() => {
    void rememberReading(episodeId);
  }, [episodeId]);

  useEffect(() => {
    let done = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const start = () => {
      if (done || timer || document.visibilityState !== "visible") return;
      timer = setTimeout(() => {
        done = true;
        void recordView(episodeId);
      }, STAY_MS);
    };
    const stop = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [episodeId]);

  return null;
}
