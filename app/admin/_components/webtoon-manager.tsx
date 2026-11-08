import { Plus } from "lucide-react";

import { siteConfig } from "@/site.config";
import { getAdminClient } from "@/lib/supabase-admin";
import { formatPublishAt, isScheduled, publishOptions } from "@/lib/publish-time";
import type { Episode, Webtoon } from "@/lib/types";
import { NewWebtoonForm } from "./webtoon-form";
import { StudioCard } from "./studio-card";

/** 웹툰 관리 화면 = "작가 스튜디오" (+ 새 웹툰 + 큰 표지 카드 목록, 카드 안에 회차 관리·정보 수정·표지·설정 탭)
    관리자 페이지(/admin "웹툰" 탭)와 작가 페이지(/artist)가 같이 씁니다.
    로그인 확인은 이 화면을 부르는 페이지에서 먼저 합니다.
    - artistId 를 넘기면(작가 페이지): 그 작가가 올린 웹툰만 보임
    - ownerOnly 를 켜면(회장이 작가 페이지에 들어왔을 때): 회장이 올린 웹툰(작가 없음)만 보임 → 남의 작가 웹툰은 못 고침
    - 둘 다 없으면(회장 페이지): 모든 웹툰 + 각 웹툰을 올린 작가 이름
    수정·삭제 권한은 서버(actions.ts)에서도 한 번 더 확인합니다. */
export async function WebtoonManager({ artistId, ownerOnly = false }: { artistId?: string; ownerOnly?: boolean }) {
  const supabase = getAdminClient();
  if (!supabase) {
    return (
      <p className="mt-6 rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
        Supabase가 연결되지 않았습니다. .env.local 을 확인하세요.
      </p>
    );
  }

  let webtoonQuery = supabase
    .from("webtoons")
    .select("*")
    .order("weekday", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (artistId) webtoonQuery = webtoonQuery.eq("artist_id", artistId);
  else if (ownerOnly) webtoonQuery = webtoonQuery.is("artist_id", null);
  const { data: webtoonRows, error: webtoonError } = await webtoonQuery;

  // 회장 페이지: 웹툰마다 올린 작가 이름 표시
  const { data: artistRows } =
    artistId || ownerOnly ? { data: [] } : await supabase.from("artists").select("id, name");
  const artistName = (id?: string | null) =>
    (artistRows ?? []).find((a: { id: string; name: string }) => a.id === id)?.name;

  const dayOrder = siteConfig.webtoons.weekdays.map((d) => d.key);
  const webtoons = ((webtoonRows ?? []) as Webtoon[]).sort(
    (a, b) => dayOrder.indexOf(a.weekday) - dayOrder.indexOf(b.weekday) || a.sort_order - b.sort_order,
  );
  const dayLabel = (key: string) => siteConfig.webtoons.weekdays.find((d) => d.key === key)?.label ?? key;

  // 웹툰별 회차 목록 (회차 관리용)
  const { data: episodeRows } = await supabase
    .from("episodes")
    .select("id, webtoon_id, number, title, image_urls, publish_at, thumbnail_url")
    .order("number", { ascending: true });
  const episodesOf = (webtoonId: string) =>
    (
      (episodeRows ?? []) as Pick<
        Episode,
        "id" | "webtoon_id" | "number" | "title" | "image_urls" | "publish_at" | "thumbnail_url"
      >[]
    )
      .filter((ep) => ep.webtoon_id === webtoonId)
      .map((ep) => ({
        id: ep.id,
        number: ep.number,
        title: ep.title,
        imageCount: ep.image_urls.length,
        // 아직 공개 전이면 "11월 14일(금) 0시" 같은 공개 예정 시간 (회차 목록에 "예약" 으로 보임)
        scheduledLabel: isScheduled(ep.publish_at) ? formatPublishAt(ep.publish_at as string) : null,
        thumbnailUrl: ep.thumbnail_url ?? null,
      }));

  return (
    <>
      {webtoonError ? (
        <p className="mt-6 rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
          웹툰을 불러오지 못했습니다: {webtoonError.message}
          <br />
          supabase/schema.sql 을 Supabase SQL Editor 에서 다시 실행했는지 확인하세요.
        </p>
      ) : null}

      <div className="mt-8 max-w-4xl">
        {/* 위: 내 웹툰 제목 + "+ 새 웹툰" (누르면 추가 칸이 펼쳐짐) */}
        <details className="group">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <h2 className="text-xl font-semibold">
              {artistId || ownerOnly ? "내 웹툰" : "등록된 웹툰"}{" "}
              <span className="text-muted-foreground">{webtoons.length}</span>
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
              <Plus className="size-4 transition-transform group-open:rotate-45" />
              <span className="group-open:hidden">새 웹툰</span>
              <span className="hidden group-open:inline">닫기</span>
            </span>
          </summary>
          <section className="mt-4 rounded-2xl border bg-muted/20 p-5 sm:p-6">
            <h3 className="mb-4 font-semibold">새 웹툰 만들기</h3>
            <NewWebtoonForm />
          </section>
        </details>

        {/* 웹툰 카드 목록 */}
        {webtoons.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            아직 웹툰이 없어요. 오른쪽 위 <b>+ 새 웹툰</b>을 눌러 첫 웹툰을 만들어 보세요.
          </div>
        ) : (
          <ul className="mt-6 grid gap-4">
            {webtoons.map((w) => (
              <StudioCard
                key={w.id}
                webtoon={w}
                dayLabel={`${dayLabel(w.weekday)}요웹툰`}
                episodes={episodesOf(w.id)}
                publishChoices={publishOptions(w.weekday, Boolean(w.is_completed))}
                ownerLabel={!artistId && !ownerOnly ? (artistName(w.artist_id) ?? "회장") : null}
                canComplete={!artistId && !ownerOnly}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
