import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";

import { getCurrentArtist, isAdmin } from "@/lib/admin-auth";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { artistLogout, changeArtistPassword } from "@/app/admin/actions";
import { ArtistPasswordForm } from "@/app/admin/_components/artist-password-form";
import { WebtoonManager } from "@/app/admin/_components/webtoon-manager";
import { ArtistAuth } from "./_components/artist-auth";

/* 작가 페이지 (주소: /artist) — 맨 아래 "작가" 버튼으로 들어옴. 회장 페이지와 따로 움직입니다.
   1) 로그인 안 했으면 → 로그인 / 가입하기 (이메일 + 비밀번호)
   2) 가입했지만 회장이 아직 승인 안 했으면 → "승인 대기" 안내
   3) 회장이 막았으면 → "막힌 계정" 안내
   4) 승인됐으면 → 내가 올린 웹툰만 추가·수정·삭제 + 회차 올리기 + 내 비밀번호 바꾸기
   회장으로 로그인돼 있고 작가 로그인을 안 했으면 → 회장이 직접 올린 웹툰만 관리 (다른 작가 웹툰은 안 보임, 회장 페이지에서 관리) */

export const metadata = { title: "작가" };

function TopBar({ title, showLogout }: { title: string; showLogout: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="사이트로 돌아가기">
          <Link href="/">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>
      {showLogout ? (
        <form action={artistLogout}>
          <Button type="submit" variant="outline" size="sm">
            로그아웃
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10 max-w-xl rounded-xl border bg-muted/50 p-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

export default async function ArtistPage() {
  // 미리 만들어 두지 않고 접속할 때마다 확인 (로그인·승인 상태가 바로 반영되게)
  await connection();

  const [artist, admin] = await Promise.all([getCurrentArtist(), isAdmin()]);

  // 작가 로그인 안 함
  if (!artist) {
    if (admin) {
      return (
        <Container className="py-10">
          <TopBar title="작가 (회장으로 보는 중)" showLogout={false} />
          <p className="mt-2 text-sm text-muted-foreground">
            작가 페이지에서는 회장이 직접 올린 웹툰만 보이고 고칠 수 있어요. 다른 작가의 웹툰은 회장 페이지에서 관리하세요.
          </p>
          <WebtoonManager ownerOnly />
        </Container>
      );
    }
    return (
      <Container>
        <ArtistAuth />
      </Container>
    );
  }

  if (artist.status === "pending") {
    return (
      <Container className="py-10">
        <TopBar title={`${artist.name} 작가님`} showLogout />
        <Notice title="회장 승인을 기다리는 중이에요">
          <p>가입은 끝났어요! 회장이 승인하면 이 페이지에서 웹툰을 올릴 수 있어요.</p>
          <p>승인된 뒤에 이 페이지를 새로고침해 주세요.</p>
        </Notice>
      </Container>
    );
  }

  if (artist.status === "blocked") {
    return (
      <Container className="py-10">
        <TopBar title={`${artist.name} 작가님`} showLogout />
        <Notice title="막힌 계정이에요">
          <p>회장이 이 계정을 막았어요. 궁금한 점은 회장에게 문의해 주세요.</p>
        </Notice>
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <TopBar title={`${artist.name} 작가님`} showLogout />
      <p className="mt-2 text-sm text-muted-foreground">
        내가 올린 웹툰만 보여요. 웹툰을 추가하고, 회차(만화 그림·PDF)를 올리고, 지울 수 있어요.
      </p>

      <WebtoonManager artistId={artist.id} />

      {/* 내 비밀번호 바꾸기 */}
      <details className="mt-10 max-w-xl rounded-xl border px-6 py-4">
        <summary className="cursor-pointer text-sm font-medium">내 비밀번호 바꾸기</summary>
        <p className="mt-3 mb-5 text-sm text-muted-foreground">로그인 이메일: {artist.email}</p>
        <ArtistPasswordForm onSave={changeArtistPassword} buttonLabel="바꾸기" />
      </details>
    </Container>
  );
}
