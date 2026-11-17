"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";

import { cn } from "@/lib/utils";

/* 게임 화면(iframe) + 게임이 보내는 알림 받기
   - "komi-fullscreen": 게임을 처음 누름 → 전체 화면으로
     (휴대폰 전체 화면 기능이 되면 그걸 쓰고, 아이폰처럼 안 되면 화면을 꽉 채우는 방식으로) */
// PC 전체 화면에서 쓰는 "폰 모양" 게임 크기 (세로:가로 = 약 2:1)
const PHONE_W = 420;
const PHONE_H = 860;

export function GameFrame({ src, title }: { src: string; title: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [full, setFull] = useState(false); // 화면 꽉 채우기 상태 (진짜 전체 화면 포함)
  const [scale, setScale] = useState(0); // PC(가로 화면) 전체 화면일 때 폰 모양 게임을 키우는 배율, 0 = 폰처럼 꽉 채움

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

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // 우리 사이트의 게임 창에서 온 알림만 받음
      if (e.origin !== window.location.origin || e.source !== frameRef.current?.contentWindow) return;
      const data = e.data as { type?: string } | null;
      if (data?.type === "komi-fullscreen") enterFull();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [enterFull]);

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
          allow="autoplay; fullscreen"
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
