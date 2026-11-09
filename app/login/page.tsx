import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getCurrentArtist } from "@/lib/admin-auth";
import { Navbar } from "@/components/layout/navbar";
import { Container } from "@/components/layout/container";
import { LoginForm } from "./_components/login-form";

/* 회원 로그인 / 가입 (주소: /login) — 맨 위 "로그인" 버튼으로 들어옴
   독자·작가가 한 계정. ?next=/주소 가 있으면 로그인 뒤 그 주소로 돌아감 (예: 댓글 달던 회차) */

export const metadata = { title: "로그인" };

export default async function LoginPage(props: PageProps<"/login">) {
  await connection();
  const { next } = await props.searchParams;
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
          <LoginForm next={nextPath} />
        </Container>
      </main>
    </>
  );
}
