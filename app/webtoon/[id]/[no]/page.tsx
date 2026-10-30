import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, List } from "lucide-react";

import { getEpisode, getEpisodes, getWebtoon } from "@/lib/data";
import { Button } from "@/components/ui/button";

/* 웹툰 뷰어 (주소: /webtoon/웹툰번호/회차번호)
   - 만화 그림을 위에서 아래로 이어 붙여 보여줌 (세로 스크롤)
   - 위·아래에 이전화 / 목록 / 다음화 버튼 */

export const revalidate = 60;

function EpisodeNav({
  webtoonId,
  prev,
  next,
}: {
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
            이전화
          </Link>
        ) : (
          <span>
            <ChevronLeft />
            이전화
          </span>
        )}
      </Button>
      <Button asChild variant="ghost" size="sm">
        <Link href={`/webtoon/${webtoonId}`}>
          <List />
          목록
        </Link>
      </Button>
      <Button asChild={next !== undefined} variant="outline" size="sm" disabled={next === undefined}>
        {next !== undefined ? (
          <Link href={`/webtoon/${webtoonId}/${next}`}>
            다음화
            <ChevronRight />
          </Link>
        ) : (
          <span>
            다음화
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

  const index = episodes.findIndex((ep) => ep.number === number);
  const prev = index > 0 ? episodes[index - 1].number : undefined;
  const next = index >= 0 && index < episodes.length - 1 ? episodes[index + 1].number : undefined;

  return (
    <main className="flex-1">
      {/* 위쪽 바: 웹툰 제목 + 회차 */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href={`/webtoon/${id}`} aria-label="회차 목록으로" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-5" />
          </Link>
          <p className="min-w-0 truncate text-sm">
            <span className="font-semibold">{webtoon.title}</span>
            <span className="ml-2 text-muted-foreground">
              {episode.number}화 {episode.title}
            </span>
          </p>
        </div>
      </header>

      {/* 만화 그림 (세로로 이어 붙이기) */}
      <div className="mx-auto max-w-3xl">
        {episode.image_urls.length === 0 ? (
          <p className="py-24 text-center text-sm text-muted-foreground">이 회차에는 아직 그림이 없습니다.</p>
        ) : (
          episode.image_urls.map((url, i) => (
            <Image
              key={url}
              src={url}
              alt={`${episode.number}화 ${i + 1}번째 그림`}
              width={0}
              height={0}
              sizes="(min-width: 768px) 768px, 100vw"
              className="block h-auto w-full"
              priority={i < 2}
            />
          ))
        )}
      </div>

      {/* 아래쪽: 이전화 / 목록 / 다음화 */}
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EpisodeNav webtoonId={id} prev={prev} next={next} />
      </div>
    </main>
  );
}
