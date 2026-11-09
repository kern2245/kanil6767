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
