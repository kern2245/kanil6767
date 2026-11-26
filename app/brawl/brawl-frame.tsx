"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { GameFrame } from "@/app/game/game-frame";
import { getPublicClient } from "@/lib/supabase";

/* 꼬미 대난투 게임 화면 + 온라인 대전 "전달자"
   게임(iframe)은 직접 인터넷 통신을 하지 않고, 이 화면 조각에 부탁함:
   - 게임 → 여기: "brawl:hello"(준비됐어요) / "brawl:join"(방 들어가기) / "brawl:send"(소식 보내기) / "brawl:leave"(나가기)
   - 여기 → 게임: "brawl:hello"(내 번호, 온라인 가능?) / "brawl:joined" / "brawl:presence"(방에 있는 사람들) / "brawl:msg"(받은 소식) / "brawl:error"
   통신은 Supabase 실시간(Realtime) 채널 사용 — 데이터베이스에 저장하지 않고 주고받기만 함 */

type Msg = { type?: string; channel?: string; presence?: Record<string, unknown> | null; event?: string; payload?: unknown };

export function BrawlFrame({ src, title }: { src: string; title: string }) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = getPublicClient();
    const myId = crypto.randomUUID();
    let channel: RealtimeChannel | null = null;
    let chain: Promise<unknown> = Promise.resolve(); // 보내기·나가기 순서를 지키기 위한 줄 세우기

    const frameWin = () => boxRef.current?.querySelector("iframe")?.contentWindow ?? null;
    const post = (m: unknown) => frameWin()?.postMessage(m, window.location.origin);
    const hello = () => post({ type: "brawl:hello", id: myId, online: !!supabase });

    const leave = () => {
      const ch = channel;
      channel = null;
      if (!ch || !supabase) return;
      chain = chain.then(() => supabase.removeChannel(ch)).catch(() => {});
    };

    const join = (name: string, presence: Record<string, unknown> | null | undefined) => {
      leave();
      if (!supabase) return;
      const ch = supabase.channel(name, { config: { broadcast: { self: false }, presence: { key: myId } } });
      channel = ch;
      ch.on("broadcast", { event: "m" }, ({ payload }) => {
        if (channel !== ch) return;
        const p = payload as { e?: string; d?: unknown };
        post({ type: "brawl:msg", event: p.e, payload: p.d });
      });
      if (presence) {
        ch.on("presence", { event: "sync" }, () => {
          if (channel !== ch) return;
          const list = Object.values(ch.presenceState()).flat();
          post({ type: "brawl:presence", list });
        });
      }
      chain = chain.then(
        () =>
          new Promise<void>((resolve) => {
            ch.subscribe(async (status) => {
              if (channel !== ch) return resolve();
              if (status === "SUBSCRIBED") {
                if (presence) await ch.track(presence).catch(() => {});
                post({ type: "brawl:joined" });
                resolve();
              } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                post({ type: "brawl:error" });
                resolve();
              }
            });
          }),
      );
    };

    const send = (event: string | undefined, payload: unknown) => {
      const ch = channel;
      if (!ch || !event) return;
      chain = chain.then(() => ch.send({ type: "broadcast", event: "m", payload: { e: event, d: payload } })).catch(() => {});
    };

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frameWin()) return;
      const m = e.data as Msg | null;
      if (!m || typeof m.type !== "string" || !m.type.startsWith("brawl:")) return;
      if (m.type === "brawl:hello") hello();
      else if (m.type === "brawl:join" && typeof m.channel === "string" && m.channel.startsWith("komi-brawl-")) join(m.channel, m.presence);
      else if (m.type === "brawl:send") send(m.event, m.payload);
      else if (m.type === "brawl:leave") leave();
    };

    window.addEventListener("message", onMessage);
    const frame = boxRef.current?.querySelector("iframe");
    frame?.addEventListener("load", hello);
    hello();
    return () => {
      window.removeEventListener("message", onMessage);
      frame?.removeEventListener("load", hello);
      leave();
    };
  }, []);

  return (
    <div ref={boxRef}>
      <GameFrame src={src} title={title} />
    </div>
  );
}
