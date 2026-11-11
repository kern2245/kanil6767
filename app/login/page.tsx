import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getCurrentArtist } from "@/lib/admin-auth";
import { safeNextPath } from "@/lib/safe-path";
import { Navbar } from "@/components/layout/navbar";
import { Container } from "@/components/layout/container";
import { LoginForm } from "./_components/login-form";
import { SocialButtons } from "./_components/social-buttons";
import { getT } from "@/lib/lang";

/* 회원 로그인 / 가입 (주소: /login) — 맨 위 "로그인" 버튼으로 들어옴
   독자·작가가 한 계정. ?next=/주소 가 있으면 로그인 뒤 그 주소로 돌아감 (예: 댓글 달던 회차) */

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t.nav.login };
}

export default async function LoginPage(props: PageProps<"/login">) {
  await connection();
  const { next, error } = await props.searchParams;
  // 구글 로그인이 안 됐을 때 안내 (글자: lib/i18n.ts 의 login.errors)
  const { lang, t } = await getT();
  const errorMessage = typeof error === "string" ? t.login.errors[error] : undefined;
  const nextPath = safeNextPath(next);

  // 이미 로그인했으면 돌아갈 곳으로
  const member = await getCurrentArtist();
  if (member && member.status !== "blocked") redirect(nextPath);

  return (
    <>
      <Navbar />
      <main className="relative flex flex-1 items-center overflow-hidden py-16">
        {/* 뒤에 은은하게 퍼지는 보라 빛 */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl"
        />
        <Container className="relative">
          {/* 로그인 카드 */}
          <div className="mx-auto w-full max-w-sm rounded-3xl border bg-background/70 p-8 shadow-2xl backdrop-blur sm:p-10">
            <p className="text-center text-xs font-medium tracking-[0.3em] text-primary uppercase">{t.login.welcome}</p>
            <h1 className="title-gradient mt-2 text-center text-4xl font-bold tracking-tight">{lang === "ko" ? "세카이" : "Sekai"}</h1>
            <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
              {t.login.intro1}
              <br />
              {t.login.intro2}
            </p>

            {errorMessage ? (
              <p className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-center text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-8">
              <SocialButtons next={nextPath} t={t.login} />
              <p className="mt-3 text-center text-xs text-muted-foreground">{t.login.quick}</p>
            </div>

            <div className="my-7 h-px bg-border" />

            <LoginForm next={nextPath} lang={lang} />
          </div>
        </Container>
      </main>
    </>
  );
}
