import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ImageIcon } from "lucide-react";

import { siteConfig } from "@/site.config";
import { getEpisodes, getWebtoon } from "@/lib/data";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

/* 웹툰 페이지 (주소: /webtoon/웹툰번호)
   - 위쪽: 표지 + 제목 + 연재 요일 + "첫화 보기" 버튼
   - 아래쪽: 회차 목록 (최신 회차가 위)
   - 회차는 관리자 페이지 "웹툰" 탭 → 각 웹툰의 "회차 관리"에서 올립니다. */

export const revalidate = 60;

export default async function WebtoonPage(props: PageProps<"/webtoon/[id]">) {
  const { id } = await props.params;
  const webtoon = await getWebtoon(id);
  if (!webtoon) notFound();

  const episodes = await getEpisodes(id);
  const newestFirst = [...episodes].reverse();
  const dayLabel = siteConfig.webtoons.weekdays.find((d) => d.key === webtoon.weekday)?.label;

  return (
    <>
      <Navbar />
      <main className="flex-1 py-10">
        <Container className="max-w-3xl">
          {/* 웹툰 정보 */}
          <div className="flex gap-5">
            <div className="relative aspect-[160/207] w-32 shrink-0 overflow-hidden rounded-md bg-muted sm:w-40">
              {webtoon.cover_url ? (
                <Image src={webtoon.cover_url} alt={webtoon.title} fill sizes="160px" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="size-6" />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-col justify-center">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{webtoon.title}</h1>
              {dayLabel ? <p className="mt-2 text-sm text-muted-foreground">{dayLabel}요웹툰</p> : null}
              <p className="mt-1 text-sm text-muted-foreground">총 {episodes.length}화</p>
              {episodes.length > 0 ? (
                <Button asChild size="sm" className="mt-4 w-fit">
                  <Link href={`/webtoon/${id}/${episodes[0].number}`}>첫화 보기</Link>
                </Button>
              ) : null}
            </div>
          </div>

          {/* 회차 목록 */}
          <h2 className="mt-10 border-b pb-3 text-lg font-semibold">회차</h2>
          {newestFirst.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">아직 올라온 회차가 없습니다.</p>
          ) : (
            <ul className="divide-y">
              {newestFirst.map((ep) => (
                <li key={ep.id}>
                  <Link
                    href={`/webtoon/${id}/${ep.number}`}
                    className="flex items-center gap-3 py-4 transition-colors hover:text-foreground"
                  >
                    <span className="w-12 shrink-0 text-sm text-muted-foreground">{ep.number}화</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{ep.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(ep.created_at).toLocaleDateString("ko-KR")}
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
