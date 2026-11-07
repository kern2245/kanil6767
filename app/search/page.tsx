import Link from "next/link";

import { searchWebtoons } from "@/lib/data";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/container";
import { WebtoonCard } from "@/components/sections/webtoon-board";

/* 웹툰 검색 결과 페이지 (주소: /search?q=검색어)
   - 위쪽 메뉴의 "웹툰 검색" 칸에서 검색하면 여기로 옵니다.
   - 제목에 검색어가 들어간 웹툰을 표지 카드로 보여주고, 누르면 웹툰 페이지로 이동 */

export const metadata = { title: "웹툰 검색" };

export default async function SearchPage(props: PageProps<"/search">) {
  const { q } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const results = query ? await searchWebtoons(query) : [];

  return (
    <>
      <Navbar />
      <main className="flex-1 py-10">
        <Container>
          <h1 className="text-2xl font-semibold tracking-tight">
            {query ? (
              <>
                &lsquo;{query}&rsquo; 검색 결과 <span className="text-muted-foreground">({results.length})</span>
              </>
            ) : (
              "웹툰 검색"
            )}
          </h1>

          {!query ? (
            <p className="py-16 text-center text-sm text-muted-foreground">위쪽 검색 칸에 웹툰 제목을 입력해 보세요.</p>
          ) : results.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              &lsquo;{query}&rsquo;(이)가 들어간 웹툰이 없습니다.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-5 lg:grid-cols-7">
              {results.map((w) => (
                <Link key={w.id} href={`/webtoon/${w.id}`}>
                  <WebtoonCard webtoon={w} />
                </Link>
              ))}
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}
