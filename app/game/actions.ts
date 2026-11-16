"use server";

/* 꼬미 키우기 게임이 하는 일 (서버에서 실행됨)
   - reportStage : 게임에서 스테이지를 깨면 기록을 보냄 → 로그인한 회원이면 순위표에 저장
     (로그인 안 했거나 막힌 계정은 저장 안 함. 저장 규칙은 lib/game-scores.ts) */

import { getCurrentArtist } from "@/lib/admin-auth";
import { GAME_JOBS, saveStage, type GameJob } from "@/lib/game-scores";

export async function reportStage(stage: unknown, job: unknown): Promise<{ saved: boolean }> {
  if (typeof stage !== "number" || !Number.isInteger(stage) || stage < 1 || stage > 100000) return { saved: false };
  const safeJob = GAME_JOBS.includes(job as GameJob) ? (job as GameJob) : null;

  const me = await getCurrentArtist();
  if (!me || me.status === "blocked") return { saved: false };

  return { saved: await saveStage(me.id, stage, safeJob) };
}
