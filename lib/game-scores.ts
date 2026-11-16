import "server-only";

import { getAdminClient } from "@/lib/supabase-admin";

/* 꼬미 키우기 순위표 (표: game_scores — supabase/game-scores.sql)
   - 회원마다 "최고 스테이지" 한 줄. 더 높은 기록만 저장.
   - 같은 스테이지면 먼저 세운 사람이 위.
   - 조작 막기: 게임은 손님 브라우저에서 돌아가서 완벽히 막을 수는 없지만,
     ① 한 번에 2스테이지보다 크게 뛰는 기록 ② 2초 안에 또 오른 기록 은 받지 않음 */

export const GAME_JOBS = ["sword", "bow", "magic", "tamer"] as const;
export type GameJob = (typeof GAME_JOBS)[number];

export type GameScore = {
  memberId: string;
  name: string;
  avatarUrl: string | null;
  bestStage: number;
  job: GameJob | null;
};

const MAX_JUMP = 2; // 한 번에 오를 수 있는 스테이지 수
const MIN_GAP_MS = 2000; // 기록이 오르는 최소 간격

type Row = {
  member_id: string;
  best_stage: number;
  job: GameJob | null;
  updated_at: string;
  artists: { name: string; status: string; avatar_url: string | null } | { name: string; status: string; avatar_url: string | null }[] | null;
};

/** 순위표 위에서부터 limit 명 (막힌 계정은 뺌). 표가 아직 없으면 빈 목록. */
export async function getLeaderboard(limit = 20): Promise<GameScore[]> {
  const supabase = getAdminClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("game_scores")
    .select("member_id, best_stage, job, updated_at, artists(name, status, avatar_url)")
    .gt("best_stage", 0)
    .order("best_stage", { ascending: false })
    .order("updated_at", { ascending: true })
    .limit(limit + 10);
  if (error) {
    console.error("[getLeaderboard] Supabase 읽기 실패:", error.message);
    return [];
  }
  return ((data ?? []) as Row[])
    .map((r) => ({ r, a: Array.isArray(r.artists) ? r.artists[0] : r.artists }))
    .filter(({ a }) => a && a.status !== "blocked")
    .slice(0, limit)
    .map(({ r, a }) => ({
      memberId: r.member_id,
      name: a!.name,
      avatarUrl: a!.avatar_url ?? null,
      bestStage: r.best_stage,
      job: r.job,
    }));
}

/** 내 최고 기록과 등수 (기록이 없으면 null) */
export async function getMyRank(memberId: string): Promise<{ rank: number; bestStage: number } | null> {
  const supabase = getAdminClient();
  if (!supabase) return null;
  const { data: mine } = await supabase
    .from("game_scores")
    .select("best_stage, updated_at")
    .eq("member_id", memberId)
    .maybeSingle();
  if (!mine || mine.best_stage <= 0) return null;
  const [higher, sameEarlier] = await Promise.all([
    supabase.from("game_scores").select("member_id", { count: "exact", head: true }).gt("best_stage", mine.best_stage),
    supabase
      .from("game_scores")
      .select("member_id", { count: "exact", head: true })
      .eq("best_stage", mine.best_stage)
      .lt("updated_at", mine.updated_at),
  ]);
  return { rank: (higher.count ?? 0) + (sameEarlier.count ?? 0) + 1, bestStage: mine.best_stage };
}

/** 새 스테이지 기록 저장. 더 높을 때만, 조작으로 보이면 거절. 저장했으면 true. */
export async function saveStage(memberId: string, stage: number, job: GameJob | null): Promise<boolean> {
  const supabase = getAdminClient();
  if (!supabase) return false;
  const { data: row } = await supabase
    .from("game_scores")
    .select("best_stage, updated_at")
    .eq("member_id", memberId)
    .maybeSingle();

  const best = row?.best_stage ?? 0;
  if (stage <= best) return false; // 더 높지 않음
  if (stage > best + MAX_JUMP) return false; // 너무 크게 뜀 → 조작 의심
  if (row && Date.now() - new Date(row.updated_at).getTime() < MIN_GAP_MS) return false; // 너무 빨리 오름

  const { error } = await supabase
    .from("game_scores")
    .upsert({ member_id: memberId, best_stage: stage, job, updated_at: new Date().toISOString() });
  if (error) {
    console.error("[saveStage] Supabase 저장 실패:", error.message);
    return false;
  }
  return true;
}
