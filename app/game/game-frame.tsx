"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { reportStage } from "@/app/game/actions";

/* 게임 화면(iframe) + 게임이 보내는 "스테이지 깼어요" 알림 받기
   - public/games/komi-idle.html 이 스테이지를 깰 때마다 { type: "komi-stage", stage, job } 를 보냄
   - 받으면 서버(app/game/actions.ts)에 전달 → 로그인 회원이면 순위표에 저장 → 순위표 새로고침 */
export function GameFrame({ src, title }: { src: string; title: string }) {
  const router = useRouter();
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onMessage = async (e: MessageEvent) => {
      // 우리 사이트의 게임 창에서 온 알림만 받음
      if (e.origin !== window.location.origin || e.source !== frameRef.current?.contentWindow) return;
      const data = e.data as { type?: string; stage?: unknown; job?: unknown } | null;
      if (!data || data.type !== "komi-stage") return;
      const { saved } = await reportStage(data.stage, data.job);
      if (saved) router.refresh(); // 새 기록이면 순위표 다시 그림
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  return (
    <iframe
      ref={frameRef}
      src={src}
      title={title}
      className="block h-[1180px] w-full border-0 sm:rounded-2xl"
      allow="autoplay"
    />
  );
}
