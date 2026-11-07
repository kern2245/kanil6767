import Image from "next/image";
import { EyeOff } from "lucide-react";

import { siteConfig } from "@/site.config";
import { getAdminClient } from "@/lib/supabase-admin";
import type { Episode, Webtoon } from "@/lib/types";
import { DeleteWebtoonButton, WebtoonForm } from "./webtoon-form";
import { EpisodeManager } from "./episode-manager";

/** 웹툰 관리 화면 (웹툰 추가 + 등록된 웹툰 목록 + 수정하기 + 회차 관리)
    관리자 페이지(/admin "웹툰" 탭)와 작가 페이지(/artist)가 같이 씁니다.
    로그인 확인은 이 화면을 부르는 페이지에서 먼저 합니다.
    - artistId 를 넘기면(작가 페이지): 그 작가가 올린 웹툰만 보임
    - 안 넘기면(회장): 모든 웹툰 + 각 웹툰을 올린 작가 이름
    수정·삭제 권한은 서버(actions.ts)에서도 한 번 더 확인합니다. */
export async function WebtoonManager({ artistId }: { artistId?: string }) {
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
  const { data: webtoonRows, error: webtoonError } = await webtoonQuery;

  // 회장 화면: 웹툰마다 올린 작가 이름 표시
  const { data: artistRows } = artistId ? { data: [] } : await supabase.from("artists").select("id, name");
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
    .select("id, webtoon_id, number, title, image_urls")
    .order("number", { ascending: true });
  const episodesOf = (webtoonId: string) =>
    ((episodeRows ?? []) as Pick<Episode, "id" | "webtoon_id" | "number" | "title" | "image_urls">[])
      .filter((ep) => ep.webtoon_id === webtoonId)
      .map((ep) => ({ id: ep.id, number: ep.number, title: ep.title, imageCount: ep.image_urls.length }));

  return (
    <>
      {webtoonError ? (
        <p className="mt-6 rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
          웹툰을 불러오지 못했습니다: {webtoonError.message}
          <br />
          supabase/schema.sql 을 Supabase SQL Editor 에서 다시 실행했는지 확인하세요.
        </p>
      ) : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="h-fit rounded-xl border p-6">
          <h2 className="mb-5 text-lg font-semibold">웹툰 추가</h2>
          <WebtoonForm />
        </section>

        <section>
          <h2 className="mb-5 text-lg font-semibold">
            등록된 웹툰 <span className="text-muted-foreground">({webtoons.length})</span>
          </h2>
          {webtoons.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 없습니다. 왼쪽에서 추가해 보세요. (지금 사이트에는 예시 웹툰이 보입니다)
            </p>
          ) : (
            <ul className="space-y-3">
              {webtoons.map((w) => (
                <li key={w.id} className="rounded-xl border">
                  <div className="flex items-center gap-4 p-4">
                    <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {w.cover_url ? (
                        <Image src={w.cover_url} alt="" fill sizes="48px" className="object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium">
                        {w.is_up ? <span className="text-xs font-bold text-up">UP</span> : null}
                        <span className="truncate">{w.title}</span>
                        {!w.is_visible ? (
                          <EyeOff className="size-4 shrink-0 text-muted-foreground" aria-label="숨김" />
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {w.is_completed ? "완결" : `${dayLabel(w.weekday)}요일`}
                        {!artistId ? ` · ${artistName(w.artist_id) ?? "회장"}` : null}
                      </p>
                    </div>
                    <DeleteWebtoonButton id={w.id} coverUrl={w.cover_url} />
                  </div>
                  <details className="border-t px-4 py-3">
                    <summary className="cursor-pointer text-sm text-muted-foreground">수정하기</summary>
                    <div className="pt-4">
                      <WebtoonForm webtoon={w} />
                    </div>
                  </details>
                  <details className="border-t px-4 py-3">
                    <summary className="cursor-pointer text-sm text-muted-foreground">
                      회차 관리 ({episodesOf(w.id).length}화)
                    </summary>
                    <div className="pt-4">
                      <EpisodeManager webtoonId={w.id} episodes={episodesOf(w.id)} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
