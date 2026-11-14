import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ChevronRight, ImageIcon, Star } from "lucide-react";

import { siteConfig } from "@/site.config";
import { getEpisodes, getWebtoon } from "@/lib/data";
import { formatViews, getViewCounts } from "@/lib/views";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { getCurrentArtist } from "@/lib/admin-auth";
import { getMemberWebtoonState, markFavoriteSeen } from "@/lib/member-extras";
import { toggleFavorite } from "@/app/webtoon/[id]/[no]/actions";
import { ReportButton } from "@/components/sections/report-button";
import { getT } from "@/lib/lang";

/* 웹툰 페이지 (주소: /webtoon/웹툰번호)
   - 위쪽: 표지 + 제목 + 연재 요일 + "첫화 보기" / (로그인 회원) "이어보기 N화" · ⭐ 관심 웹툰 · 🚩 신고
   - 아래쪽: 회차 목록 (최신 회차가 위, 회차마다 썸네일 — 없으면 무프사)
   - 회차는 관리자 페이지 "웹툰" 탭 → 각 웹툰의 "회차 관리"에서 올립니다. */


/* 탭 제목·카톡 공유 미리보기: 웹툰 제목 + 표지 그림 */
export async function generateMetadata(props: PageProps<"/webtoon/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const [webtoon, { lang }] = await Promise.all([getWebtoon(id), getT()]);
  if (!webtoon) return {};
  const title = webtoon.title;
  const description =
    lang === "en" ? `Read "${title}" free on Sekai.` : `세카이에서 웹툰 「${title}」을 무료로 보세요.`;
  return {
    title,
    description,
    alternates: { canonical: `/webtoon/${id}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: [webtoon.cover_url ?? "/opengraph-image"],
    },
  };
}

export default async function WebtoonPage(props: PageProps<"/webtoon/[id]">) {
  const { id } = await props.params;
  const webtoon = await getWebtoon(id);
  if (!webtoon) notFound();

  const episodes = await getEpisodes(id);
  const newestFirst = [...episodes].reverse();
  const viewCounts = await getViewCounts(episodes.map((ep) => ep.id));
  const totalViews = [...viewCounts.values()].reduce((a, b) => a + b, 0);
  const { lang, t } = await getT();
  const dayLabel =
    lang === "ko"
      ? siteConfig.webtoons.weekdays.find((d) => d.key === webtoon.weekday)?.label
      : webtoon.weekday
        ? ({ mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" } as const)[webtoon.weekday]
        : undefined;
  const tw = t.webtoon;
  // 영어 화면이면 영어 제목 (없으면 원래 제목)
  const title = webtoon.title;

  // 로그인 회원: 관심 웹툰 여부 · 이어보기 (관심 웹툰이면 "봤음" 기록 → 새 회차 알림 꺼짐)
  const current = await getCurrentArtist();
  const member = current && current.status !== "blocked" ? current : null;
  const state = member ? await getMemberWebtoonState(member.id, id) : { favorite: false, lastEpisode: null };
  if (member && state.favorite) await markFavoriteSeen(member.id, id);
  const continueEpisode =
    state.lastEpisode !== null && episodes.some((ep) => ep.number === state.lastEpisode) ? state.lastEpisode : null;

  return (
    <>
      <Navbar />
      <main className="flex-1 py-10">
        <Container className="max-w-3xl">
          {/* 웹툰 정보 */}
          <div className="flex gap-5">
            <div className="relative aspect-[160/207] w-32 shrink-0 overflow-hidden rounded-md bg-muted sm:w-40">
              {webtoon.cover_url ? (
                <Image src={webtoon.cover_url} alt={title} fill sizes="160px" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="size-6" />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-col justify-center">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
              {dayLabel ? <p className="mt-2 text-sm text-muted-foreground">{tw.dayWebtoon(dayLabel)}</p> : null}
              <p className="mt-1 text-sm text-muted-foreground">{tw.stats(episodes.length, formatViews(totalViews))}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {continueEpisode !== null ? (
                  <Button asChild size="sm">
                    <Link href={`/webtoon/${id}/${continueEpisode}`}>
                      <BookOpen />
                      {tw.continue(continueEpisode)}
                    </Link>
                  </Button>
                ) : null}
                {episodes.length > 0 ? (
                  <Button asChild size="sm" variant={continueEpisode !== null ? "outline" : "default"}>
                    <Link href={`/webtoon/${id}/${episodes[0].number}`}>{tw.first}</Link>
                  </Button>
                ) : null}
                {member ? (
                  <form action={toggleFavorite}>
                    <input type="hidden" name="webtoonId" value={id} />
                    <Button type="submit" size="sm" variant="outline" aria-pressed={state.favorite}>
                      <Star className={state.favorite ? "fill-current text-up" : ""} />
                      {state.favorite ? tw.favorite : tw.addFavorite}
                    </Button>
                  </form>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/login?next=/webtoon/${id}`}>
                      <Star />
                      {tw.addFavorite}
                    </Link>
                  </Button>
                )}
                <ReportButton targetType="webtoon" targetId={id} loggedIn={member !== null} returnPath={`/webtoon/${id}`} lang={lang} />
              </div>
            </div>
          </div>

          {/* 회차 목록 */}
          <h2 className="mt-10 border-b pb-3 text-lg font-semibold">{tw.episodes}</h2>
          {newestFirst.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{tw.noEpisodes}</p>
          ) : (
            <ul className="divide-y">
              {newestFirst.map((ep) => (
                <li key={ep.id}>
                  <Link
                    href={`/webtoon/${id}/${ep.number}`}
                    className="flex items-center gap-3 py-3 transition-colors hover:text-foreground"
                  >
                    {/* 회차 썸네일 (없으면 무프사) */}
                    <div className="relative aspect-[5/3] w-20 shrink-0 overflow-hidden rounded-md bg-muted sm:w-24">
                      {ep.thumbnail_url ? (
                        <Image src={ep.thumbnail_url} alt="" fill sizes="96px" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="size-5" />
                        </div>
                      )}
                    </div>
                    <span className="w-12 shrink-0 text-sm text-muted-foreground">{tw.ep(ep.number)}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{ep.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {tw.views(formatViews(viewCounts.get(ep.id) ?? 0))} ·{" "}
                      {new Date(ep.publish_at ?? ep.created_at).toLocaleDateString(tw.dateLocale, { timeZone: tw.timeZone })}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}
