import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getCurrentArtist } from "@/lib/admin-auth";
import { Navbar } from "@/components/layout/navbar";
import { Container } from "@/components/layout/container";
import { LoginForm } from "./_components/login-form";
import { SocialButtons } from "./_components/social-buttons";

/* 회원 로그인 / 가입 (주소: /login) — 맨 위 "로그인" 버튼으로 들어옴
   독자·작가가 한 계정. ?next=/주소 가 있으면 로그인 뒤 그 주소로 돌아감 (예: 댓글 달던 회차) */

export const metadata = { title: "로그인" };

export default async function LoginPage(props: PageProps<"/login">) {
  await connection();
  const { next, error } = await props.searchParams;
  // 구글 로그인이 안 됐을 때 안내
  const ERRORS: Record<string, string> = {
    google: "구글 로그인을 시작하지 못했어요. 잠시 뒤 다시 해 주세요.",
    social: "로그인에 실패했어요. 다시 해 주세요.",
    "no-email": "구글에서 이메일 정보를 받지 못했어요. 다시 해 주세요.",
    unverified: "확인되지 않은 이메일이라 가입할 수 없어요. 이메일이 확인된 계정으로 해 주세요.",
    blocked: "회장이 막은 계정이에요. 회장에게 문의해 주세요.",
    supabase: "Supabase가 연결되지 않았습니다.",
  };
  const errorMessage = typeof error === "string" ? ERRORS[error] : undefined;
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  // 이미 로그인했으면 돌아갈 곳으로
  const member = await getCurrentArtist();
  if (member && member.status !== "blocked") redirect(nextPath);

  return (
    <>
      <Navbar />
      <main className="flex-1 py-16">
        <Container>
          <h1 className="text-center text-2xl font-semibold">세카이 로그인</h1>
          <p className="mt-2 mb-8 text-center text-sm text-muted-foreground">
            독자·작가 모두 같은 계정으로 로그인해요.
          </p>
          {errorMessage ? (
            <p className="mx-auto mb-4 max-w-sm rounded-lg border border-destructive/40 p-3 text-center text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
          <SocialButtons next={nextPath} />
          <div className="mx-auto my-6 flex max-w-sm items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            또는 예전 이메일 계정으로
            <span className="h-px flex-1 bg-border" />
          </div>
          <LoginForm next={nextPath} />
        </Container>
      </main>
    </>
  );
}
