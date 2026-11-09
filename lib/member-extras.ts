import "server-only";

import { getAdminClient } from "@/lib/supabase-admin";

/* 회원 편의 기능 (서버 비밀 키로만 읽고 씀)
   - 관심 웹툰 ⭐ (favorites) — last_seen_at 이후 새 회차가 공개되면 "새 회차" 알림
   - 이어보기 📖 (reading_history) — 웹툰마다 마지막으로 본 회차 */

/** 이 회원이 이 웹툰을 관심 웹툰으로 했는지 + 마지막으로 본 회차 */
export async function getMemberWebtoonState(memberId: string, webtoonId: string) {
  const supabase = getAdminClient();
  if (!supabase) return { favorite: false, lastEpisode: null as number | null };
  const [fav, reading] = await Promise.all([
    supabase.from("favorites").select("webtoon_id").eq("member_id", memberId).eq("webtoon_id", webtoonId).maybeSingle(),
    supabase
      .from("reading_history")
      .select("episode_number")
      .eq("member_id", memberId)
      .eq("webtoon_id", webtoonId)
      .maybeSingle(),
  ]);
  return {
    favorite: Boolean(fav.data),
    lastEpisode: (reading.data?.episode_number as number | undefined) ?? null,
  };
}

/** 관심 웹툰 페이지를 봤다고 기록 → 그때까지 나온 회차는 "새 회차" 알림에서 빠짐 */
export async function markFavoriteSeen(memberId: string, webtoonId: string) {
  const supabase = getAdminClient();
  if (!supabase) return;
  await supabase
    .from("favorites")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("member_id", memberId)
    .eq("webtoon_id", webtoonId);
}

export type FavoriteItem = {
  webtoonId: string;
  title: string;
  coverUrl: string | null;
  /** 마지막으로 본 회차 (없으면 null) */
  lastEpisode: number | null;
  /** 관심 웹툰 페이지를 마지막으로 본 뒤 새 회차가 공개됐으면 true */
  hasNew: boolean;
};

/** 내 관심 웹툰 목록 (설정 페이지·알림용). 공개 전 회차·숨긴 웹툰은 빼고 계산 */
export async function getFavorites(memberId: string): Promise<FavoriteItem[]> {
  const supabase = getAdminClient();
  if (!supabase) return [];
  const { data: favs } = await supabase
    .from("favorites")
    .select("webtoon_id, last_seen_at, created_at")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });
  const rows = (favs ?? []) as { webtoon_id: string; last_seen_at: string }[];
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.webtoon_id);

  const nowIso = new Date().toISOString();
  const [webtoons, episodes, reading] = await Promise.all([
    supabase.from("webtoons").select("id, title, cover_url, is_visible").in("id", ids),
    supabase.from("episodes").select("webtoon_id, publish_at").in("webtoon_id", ids).lte("publish_at", nowIso),
    supabase.from("reading_history").select("webtoon_id, episode_number").eq("member_id", memberId).in("webtoon_id", ids),
  ]);
  const webtoonMap = new Map(
    ((webtoons.data ?? []) as { id: string; title: string; cover_url: string | null; is_visible: boolean }[])
      .filter((w) => w.is_visible)
      .map((w) => [w.id, w]),
  );
  const latest = new Map<string, number>();
  for (const ep of (episodes.data ?? []) as { webtoon_id: string; publish_at: string }[]) {
    const t = new Date(ep.publish_at).getTime();
    if (t > (latest.get(ep.webtoon_id) ?? 0)) latest.set(ep.webtoon_id, t);
  }
  const readingMap = new Map(
    ((reading.data ?? []) as { webtoon_id: string; episode_number: number }[]).map((r) => [r.webtoon_id, r.episode_number]),
  );

  return rows
    .filter((r) => webtoonMap.has(r.webtoon_id))
    .map((r) => {
      const w = webtoonMap.get(r.webtoon_id)!;
      return {
        webtoonId: w.id,
        title: w.title,
        coverUrl: w.cover_url,
        lastEpisode: readingMap.get(w.id) ?? null,
        hasNew: (latest.get(w.id) ?? 0) > new Date(r.last_seen_at).getTime(),
      };
    });
}
