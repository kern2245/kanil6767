"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";

import { loadGameSave, storeGameSave } from "@/app/game/actions";
import { cn } from "@/lib/utils";

/* 게임 화면(iframe) + 게임이 보내는 알림 받기
   - "komi-fullscreen": 게임을 처음 누름 → 전체 화면으로
     (휴대폰 전체 화면 기능이 되면 그걸 쓰고, 아이폰처럼 안 되면 화면을 꽉 채우는 방식으로)
   - "komi-ready": 게임이 켜짐 → 로그인 회원이면 서버 세이브와 비교해서 더 최신 기록으로 맞춤 ("komi-sync" 로 답장)
   - "komi-save": 게임이 기록을 저장함 → 로그인 회원이면 서버에도 저장 (20초에 한 번, 창을 닫을 때 한 번 더) */
// PC 전체 화면에서 쓰는 "폰 모양" 게임 크기 (세로:가로 = 약 2:1)
const PHONE_W = 420;
const PHONE_H = 860;
const UPLOAD_GAP_MS = 20000;

export function GameFrame({ src, title }: { src: string; title: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [full, setFull] = useState(false); // 화면 꽉 채우기 상태 (진짜 전체 화면 포함)
  const [scale, setScale] = useState(0); // PC(가로 화면) 전체 화면일 때 폰 모양 게임을 키우는 배율, 0 = 폰처럼 꽉 채움
  const cloud = useRef({ on: false, pending: null as unknown, lastUp: 0 }); // 서버 저장 상태

  // 가로가 더 긴 화면(PC)이면 폰 크기(PHONE_W x PHONE_H) 게임을 화면 높이에 맞게 키움
  useEffect(() => {
    if (!full) return;
    const fit = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setScale(w > h ? Math.min(h / PHONE_H, w / PHONE_W) : 0);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [full]);

  const enterFull = useCallback(async () => {
    const box = boxRef.current;
    setFull(true);
    try {
      if (box?.requestFullscreen && !document.fullscreenElement) await box.requestFullscreen();
    } catch {
      // 전체 화면이 안 되는 기기 → 화면 꽉 채우기만 유지
    }
  }, []);

  const exitFull = useCallback(() => {
    setFull(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  // 뒤로가기·Esc 로 전체 화면이 꺼지면 같이 원래대로
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setFull(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // 꽉 채우기 중에는 뒤 페이지가 스크롤되지 않게
  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [full]);

  // 서버에 올릴 기록이 있으면 올림 (force = 시간 상관없이 지금)
  const upload = useCallback((force: boolean) => {
    const c = cloud.current;
    if (!c.on || c.pending === null) return;
    if (!force && Date.now() - c.lastUp < UPLOAD_GAP_MS) return;
    const data = c.pending;
    c.pending = null;
    c.lastUp = Date.now();
    storeGameSave(data).catch(() => {});
  }, []);

  useEffect(() => {
    const post = (msg: unknown) => frameRef.current?.contentWindow?.postMessage(msg, window.location.origin);
    const onMessage = async (e: MessageEvent) => {
      // 우리 사이트의 게임 창에서 온 알림만 받음
      if (e.origin !== window.location.origin || e.source !== frameRef.current?.contentWindow) return;
      const data = e.data as { type?: string; fresh?: boolean; last?: number; data?: unknown } | null;
      if (!data) return;
      if (data.type === "komi-fullscreen") {
        enterFull();
      } else if (data.type === "komi-ready") {
        let res: Awaited<ReturnType<typeof loadGameSave>> = { loggedIn: false, ready: false, data: null };
        try {
          res = await loadGameSave();
        } catch {
          // 서버에 못 닿으면 이 기기 기록만 씀
        }
        cloud.current.on = res.loggedIn && res.ready;
        const server = res.data;
        const serverLast = typeof server?.last === "number" ? server.last : 0;
        const newer = server && (data.fresh || serverLast > (data.last ?? 0));
        post({ type: "komi-sync", cloud: cloud.current.on, login: res.loggedIn, data: newer ? server : null });
      } else if (data.type === "komi-save") {
        cloud.current.pending = data.data;
        upload(false);
      }
    };
    // 창을 닫거나 다른 앱으로 갈 때 마지막 기록을 한 번 더 올림
    const onHide = () => {
      if (document.visibilityState === "hidden") upload(true);
    };
    window.addEventListener("message", onMessage);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", onHide);
      upload(true); // 다른 페이지로 이동할 때도
    };
  }, [enterFull, upload]);

  const phone = full && scale > 0;

  return (
    <div
      ref={boxRef}
      className={cn(
        "relative",
        full && "fixed inset-0 z-50 h-dvh w-full bg-background",
        phone && "flex items-center justify-center overflow-hidden",
      )}
    >
      <div
        className={cn(full && !phone && "h-full w-full", phone && "shrink-0")}
        style={phone ? { width: PHONE_W, height: PHONE_H, transform: `scale(${scale})` } : undefined}
      >
        <iframe
          ref={frameRef}
          src={src}
          title={title}
          className={cn("block w-full border-0", full ? "h-full" : "h-[calc(100dvh-5rem)] min-h-[600px] sm:rounded-2xl")}
          allow="autoplay; fullscreen; clipboard-write"
        />
      </div>
      <button
        type="button"
        onClick={full ? exitFull : enterFull}
        aria-label={full ? "전체 화면 끄기" : "전체 화면"}
        className={cn(
          "absolute flex size-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow backdrop-blur hover:bg-background",
          full ? "top-[max(0.5rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2" : "right-2 bottom-2",
        )}
      >
        {full ? <X className="size-5" /> : <Maximize2 className="size-4" />}
      </button>
    </div>
  );
}
