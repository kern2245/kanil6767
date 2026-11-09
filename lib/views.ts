import "server-only";

import { getAdminClient } from "@/lib/supabase-admin";

/** 회차별 조회수 (episode_views 표의 줄 수 = 하루 1번씩 센 사람 수). 서버 비밀 키로만 읽음. */
export async function getViewCounts(episodeIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const supabase = getAdminClient();
  if (!supabase || episodeIds.length === 0) return counts;
  const { data, error } = await supabase.from("episode_views").select("episode_id").in("episode_id", episodeIds);
  if (error) {
    console.error("[getViewCounts] Supabase 읽기 실패:", error.message);
    return counts;
  }
  for (const row of (data ?? []) as { episode_id: string }[]) {
    counts.set(row.episode_id, (counts.get(row.episode_id) ?? 0) + 1);
  }
  return counts;
}

/** 조회수를 "1,234" 처럼 */
export function formatViews(n: number) {
  return n.toLocaleString("ko-KR");
}

/** 웹툰별 인기 점수 = 모든 회차 조회수 + 좋아요 × 3 (첫 화면 "인기순" 정렬용) */
export async function getPopularity(webtoonIds: string[]): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  const supabase = getAdminClient();
  if (!supabase || webtoonIds.length === 0) return scores;
  const { data: episodes } = await supabase
    .from("episodes")
    .select("id, webtoon_id")
    .in("webtoon_id", webtoonIds)
    .lte("publish_at", new Date().toISOString());
  const rows = (episodes ?? []) as { id: string; webtoon_id: string }[];
  if (rows.length === 0) return scores;
  const ownerOf = new Map(rows.map((e) => [e.id, e.webtoon_id]));
  const episodeIds = rows.map((e) => e.id);
  const [views, likes] = await Promise.all([
    getViewCounts(episodeIds),
    supabase.from("episode_reactions").select("episode_id").in("episode_id", episodeIds).eq("reaction", "like"),
  ]);
  const add = (episodeId: string, n: number) => {
    const w = ownerOf.get(episodeId);
    if (w) scores.set(w, (scores.get(w) ?? 0) + n);
  };
  for (const [episodeId, n] of views) add(episodeId, n);
  for (const r of (likes.data ?? []) as { episode_id: string }[]) add(r.episode_id, 3);
  return scores;
}
