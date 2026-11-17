import "server-only";

import { getAdminClient } from "@/lib/supabase-admin";

/* 꼬미 키우기 세이브 (표: game_saves — supabase/game-saves.sql)
   - 로그인 회원마다 게임 기록 한 줄. 휴대폰 ↔ PC 어디서든 이어서 하기.
   - 이상한 값(너무 큰 기록, 숫자가 아닌 스테이지 등)은 받지 않음. */

export type GameSave = Record<string, unknown>;

const MAX_CHARS = 20000; // 기록 크기 한도
const MIN_GAP_MS = 5000; // 너무 자주 저장하지 않게 (5초)

/** 게임 기록으로 보이는지 확인 → 맞으면 그대로, 아니면 null */
export function cleanSave(data: unknown): GameSave | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const d = data as GameSave;
  let text: string;
  try {
    text = JSON.stringify(d);
  } catch {
    return null;
  }
  if (text.length > MAX_CHARS) return null;
  const okNum = (v: unknown, max: number) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
  if (!okNum(d.stage, 100000) || !Number.isInteger(d.stage) || (d.stage as number) < 1) return null;
  if (!okNum(d.gold, 1e300)) return null;
  if (d.last !== undefined && !okNum(d.last, 8.64e15)) return null;
  return d;
}

/** 내 세이브 읽기. ready=false 면 표가 아직 없음 (SQL 실행 전) */
export async function readSave(memberId: string): Promise<{ ready: boolean; data: GameSave | null }> {
  const supabase = getAdminClient();
  if (!supabase) return { ready: false, data: null };
  const { data, error } = await supabase.from("game_saves").select("data").eq("member_id", memberId).maybeSingle();
  if (error) {
    console.error("[readSave] Supabase 읽기 실패:", error.message);
    return { ready: false, data: null };
  }
  return { ready: true, data: (data?.data as GameSave | undefined) ?? null };
}

/** 내 세이브 저장 (덮어쓰기). 저장했으면 true */
export async function writeSave(memberId: string, data: GameSave): Promise<boolean> {
  const supabase = getAdminClient();
  if (!supabase) return false;
  const { data: row } = await supabase.from("game_saves").select("updated_at").eq("member_id", memberId).maybeSingle();
  if (row && Date.now() - new Date(row.updated_at).getTime() < MIN_GAP_MS) return true; // 방금 저장함 → 건너뜀
  const { error } = await supabase
    .from("game_saves")
    .upsert({ member_id: memberId, data, updated_at: new Date().toISOString() });
  if (error) {
    console.error("[writeSave] Supabase 저장 실패:", error.message);
    return false;
  }
  return true;
}
