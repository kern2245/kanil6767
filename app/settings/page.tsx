import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ChevronRight, PenSquare } from "lucide-react";

import { getCurrentArtist } from "@/lib/admin-auth";
import { Navbar } from "@/components/layout/navbar";
import { Container } from "@/components/layout/container";
import { AvatarChange } from "@/components/layout/avatar-change";

/* 내 설정 (주소: /settings) — 맨 위 프사 메뉴의 "설정"으로 들어옴
   - 내 프사 + 이름 + 독자/작가
   - 프사 바꾸기 / 무프사로
   - 내 웹툰 스튜디오로 가기
   로그인 안 했으면 로그인 페이지로 보냄 */

export const metadata = { title: "설정" };

export default async function SettingsPage() {
  await connection();
  const me = await getCurrentArtist();
  if (!me || me.status === "blocked") redirect("/login?next=/settings");
  const isArtist = me.status === "approved";

  return (
    <>
      <Navbar />
      <main className="flex-1 py-10">
        <Container className="max-w-xl">
          <h1 className="text-2xl font-semibold">설정</h1>

          {/* 내 정보 */}
          <section className="mt-6 flex items-center gap-4 rounded-2xl border bg-muted/20 p-5">
            {me.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={me.avatar_url}
                alt=""
                width={64}
                height={64}
                className={`size-16 shrink-0 rounded-full object-cover ${isArtist ? "border-2 border-primary" : "border"}`}
              />
            ) : (
              <span
                aria-hidden
                className={`flex size-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold ${
                  isArtist ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                {me.name.trim().charAt(0) || "?"}
              </span>
            )}
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-lg font-semibold">
                {isArtist ? (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold leading-4 text-primary-foreground">
                    작가
                  </span>
                ) : null}
                <span className="truncate">{me.name}</span>
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {isArtist ? "작가" : "독자"} · {me.email}
              </p>
            </div>
          </section>

          {/* 프사 */}
          <section className="mt-4 overflow-hidden rounded-2xl border">
            <h2 className="border-b px-4 py-3 text-sm font-semibold">프사</h2>
            <AvatarChange hasAvatar={Boolean(me.avatar_url)} />
          </section>

          {/* 내 웹툰 */}
          <section className="mt-4 overflow-hidden rounded-2xl border">
            <Link
              href="/artist"
              className="flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <PenSquare className="size-4" />
              내 웹툰 스튜디오
              <ChevronRight className="ml-auto size-4 text-muted-foreground" />
            </Link>
          </section>
        </Container>
      </main>
    </>
  );
}
