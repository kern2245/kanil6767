import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";

import { isAdmin, isArtist, isArtistPasswordSet } from "@/lib/admin-auth";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { artistLogin, artistLogout } from "@/app/admin/actions";
import { LoginForm } from "@/app/admin/_components/login-form";
import { WebtoonManager } from "@/app/admin/_components/webtoon-manager";

/* 작가 페이지 (주소: /artist) — 맨 아래 "작가" 버튼으로 들어옴
   1) 작가 비밀번호(ARTIST_PASSWORD)가 설정 안 됐으면 → 설정 안내
   2) 작가로 로그인 안 했으면 → 작가 로그인 화면 (회장으로 로그인돼 있어도 들어올 수 있음)
   3) 로그인했으면 → 웹툰 추가·수정·삭제 + 회차 올리기 (사이트 설정은 회장만) */

export const metadata = { title: "작가" };

export default async function ArtistPage() {
  // 미리 만들어 두지 않고 접속할 때마다 확인 (Vercel 에 비밀번호를 나중에 넣어도 바로 반영되게)
  await connection();

  if (!isArtistPasswordSet()) {
    return (
      <Container>
        <div className="mx-auto mt-16 max-w-xl rounded-xl border bg-muted/50 p-8">
          <h1 className="text-xl font-semibold">작가 비밀번호를 먼저 설정하세요</h1>
          <div className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p>
              1. 프로젝트 폴더의 <code>.env.local</code> 에 <code>ARTIST_PASSWORD=원하는비밀번호</code> 한 줄을
              추가하고 개발 서버를 다시 켭니다.
            </p>
            <p>
              2. 인터넷 사이트(Vercel)에도 Settings → Environment Variables 에 <code>ARTIST_PASSWORD</code> 를
              같은 값으로 추가합니다.
            </p>
          </div>
        </div>
      </Container>
    );
  }

  const [artist, admin] = await Promise.all([isArtist(), isAdmin()]);
  if (!artist && !admin) {
    return (
      <Container>
        <LoginForm title="작가 로그인" onLogin={artistLogin} />
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="사이트로 돌아가기">
            <Link href="/">
              <ArrowLeft />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">작가</h1>
        </div>
        {artist ? (
          <form action={artistLogout}>
            <Button type="submit" variant="outline" size="sm">
              로그아웃
            </Button>
          </form>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">웹툰을 추가하고, 회차(만화 그림·PDF)를 올릴 수 있어요.</p>
      <WebtoonManager />
    </Container>
  );
}
