import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";

import { isAdmin, isArtist, isArtistPasswordSet } from "@/lib/admin-auth";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { artistLogin, artistLogout, changeArtistPassword, createArtistPassword } from "@/app/admin/actions";
import { LoginForm } from "@/app/admin/_components/login-form";
import { ArtistPasswordForm } from "@/app/admin/_components/artist-password-form";
import { WebtoonManager } from "@/app/admin/_components/webtoon-manager";

/* 작가 페이지 (주소: /artist) — 맨 아래 "작가" 버튼으로 들어옴. 회장 페이지와 따로 움직입니다.
   1) 작가 비밀번호가 아직 없으면 → 여기서 바로 "작가 비밀번호 만들기" (만들면 바로 로그인)
   2) 작가로 로그인 안 했으면 → 작가 로그인 화면 (회장으로 로그인돼 있어도 들어올 수 있음)
   3) 로그인했으면 → 웹툰 추가·수정·삭제 + 회차 올리기 + "작가 비밀번호 바꾸기" (사이트 설정은 회장만) */

export const metadata = { title: "작가" };

export default async function ArtistPage() {
  // 미리 만들어 두지 않고 접속할 때마다 확인 (비밀번호를 만들면 바로 반영되게)
  await connection();

  if (!(await isArtistPasswordSet())) {
    return (
      <Container>
        <div className="mx-auto mt-16 w-full max-w-sm">
          <h1 className="text-2xl font-semibold">작가 비밀번호 만들기</h1>
          <p className="mt-2 mb-6 text-sm leading-relaxed text-muted-foreground">
            처음 한 번만 만들면 돼요. 만든 비밀번호는 웹툰 그리는 분들끼리만 나눠 쓰세요.
          </p>
          <ArtistPasswordForm onSave={createArtistPassword} buttonLabel="만들고 들어가기" showStatus={false} />
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

      {/* 작가 비밀번호 바꾸기 */}
      <details className="mt-10 max-w-xl rounded-xl border px-6 py-4">
        <summary className="cursor-pointer text-sm font-medium">작가 비밀번호 바꾸기</summary>
        <p className="mt-3 mb-5 text-sm text-muted-foreground">
          바꾸면 다른 작가들은 새 비밀번호로 다시 로그인해야 해요.
        </p>
        <ArtistPasswordForm onSave={changeArtistPassword} buttonLabel="바꾸기" showStatus={false} />
      </details>
    </Container>
  );
}
