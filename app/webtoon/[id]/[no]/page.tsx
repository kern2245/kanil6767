import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, List } from "lucide-react";

import { getEpisode, getEpisodes, getWebtoon } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { EpisodeComments } from "@/components/sections/episode-comments";
import { EpisodeReactions } from "@/components/sections/episode-reactions";
import { EpisodeViewCounter } from "@/components/sections/episode-view-counter";
import { formatViews, getViewCounts } from "@/lib/views";
import { getCurrentArtist } from "@/lib/admin-auth";
import { ReportButton } from "@/components/sections/report-button";
import { getT } from "@/lib/lang";
import type { Dict, Lang } from "@/lib/i18n";

/* 웹툰 뷰어 (주소: /webtoon/웹툰번호/회차번호)
   - 만화 그림을 위에서 아래로 이어 붙여 보여줌 (세로 스크롤)
   - 위·아래에 이전화 / 목록 / 다음화 버튼
   - 화면 아래에 떠 있는 바 + 💬 누르면 올라오는 댓글 창 (components/sections/episode-comments.tsx) */

export const revalidate = 60;

function EpisodeNav({
  webtoonId,
  prev,
  next,
  t,
}: {
  t: Dict["viewer"];
  webtoonId: string;
  prev?: number;
  next?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Button asChild={prev !== undefined} variant="outline" size="sm" disabled={prev === undefined}>
        {prev !== undefined ? (
          <Link href={`/webtoon/${webtoonId}/${prev}`}>
            <ChevronLeft />
            {t.prev}
          </Link>
        ) : (
          <span>
            <ChevronLeft />
            {t.prev}
          </span>
        )}
      </Button>
      <Button asChild variant="ghost" size="sm">
        <Link href={`/webtoon/${webtoonId}`}>
          <List />
          {t.list}
        </Link>
      </Button>
      <Button asChild={next !== undefined} variant="outline" size="sm" disabled={next === undefined}>
        {next !== undefined ? (
          <Link href={`/webtoon/${webtoonId}/${next}`}>
            {t.next}
            <ChevronRight />
          </Link>
        ) : (
          <span>
            {t.next}
            <ChevronRight />
          </span>
        )}
      </Button>
    </div>
  );
}

export default async function EpisodeViewerPage(props: PageProps<"/webtoon/[id]/[no]">) {
  const { id, no } = await props.params;
  const number = Number(no);
  if (!Number.isInteger(number)) notFound();

  const [webtoon, episode, episodes] = await Promise.all([
    getWebtoon(id),
    getEpisode(id, number),
    getEpisodes(id),
  ]);
  if (!webtoon || !episode) notFound();
  const views = (await getViewCounts([episode.id])).get(episode.id) ?? 0;
  const me = await getCurrentArtist();
  const loggedIn = Boolean(me && me.status !== "blocked");
  const { lang, t } = await getT();
  const tv = t.viewer;

  const index = episodes.findIndex((ep) => ep.number === number);
  const prev = index > 0 ? episodes[index - 1].number : undefined;
  const next = index >= 0 && index < episodes.length - 1 ? episodes[index + 1].number : undefined;

  return (
    <main className="flex-1">
      {/* 위쪽 바: 웹툰 제목 + 회차 */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href={`/webtoon/${id}`} aria-label={tv.backToList} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-5" />
          </Link>
          <p className="min-w-0 truncate text-sm">
            <span className="font-semibold">{webtoon.title}</span>
            <span className="ml-2 text-muted-foreground">
              {t.webtoon.ep(episode.number)} {episode.title}
            </span>
            <span className="ml-2 text-xs text-muted-foreground">· {t.webtoon.views(formatViews(views))}</span>
          </p>
          <div className="ml-auto shrink-0">
            <ReportButton
              targetType="episode"
              targetId={episode.id}
              loggedIn={loggedIn}
              returnPath={`/webtoon/${id}/${number}`}
              lang={lang}
            />
          </div>
        </div>
      </header>

      {/* 만화 그림 (세로로 이어 붙이기) */}
      <div className="mx-auto max-w-3xl">
        {episode.image_urls.length === 0 ? (
          <p className="py-24 text-center text-sm text-muted-foreground">{tv.noImages}</p>
        ) : (
          episode.image_urls.map((url, i) => (
            <Image
              key={url}
              src={url}
              alt={tv.imageAlt(episode.number, i + 1)}
              width={0}
              height={0}
              sizes="(min-width: 768px) 768px, 100vw"
              className="block h-auto w-full"
              priority={i < 2}
            />
          ))
        )}
      </div>

      {/* 화면에 안 보이는 조회수 기록 (5초 머물면 1번, 하루 1번) */}
      <EpisodeViewCounter episodeId={episode.id} />

      {/* 아래쪽: 좋아요 / 싫어요 → 이전화 / 목록 / 다음화 */}
      <div className="mx-auto max-w-3xl px-4 pt-10 pb-28">
        <EpisodeReactions episodeId={episode.id} path={`/webtoon/${id}/${number}`} t={tv} />
        <div className="mt-8">
          <EpisodeNav webtoonId={id} prev={prev} next={next} t={tv} />
        </div>
      </div>

      {/* 화면 아래에 떠 있는 바 + 💬 누르면 올라오는 댓글 창 */}
      <EpisodeComments
        episodeId={episode.id}
        path={`/webtoon/${id}/${number}`}
        listHref={`/webtoon/${id}`}
        prevHref={prev !== undefined ? `/webtoon/${id}/${prev}` : undefined}
        nextHref={next !== undefined ? `/webtoon/${id}/${next}` : undefined}
        lang={lang as Lang}
      />
    </main>
  );
}
