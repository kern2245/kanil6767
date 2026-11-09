import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ChevronRight, ImageIcon, PenSquare, Star } from "lucide-react";

import { getCurrentArtist } from "@/lib/admin-auth";
import { Navbar } from "@/components/layout/navbar";
import { Container } from "@/components/layout/container";
import { AvatarChange } from "@/components/layout/avatar-change";
import { NicknameForm, PasswordForm } from "./_components/account-forms";
import { getFavorites } from "@/lib/member-extras";

/* 내 설정 (주소: /settings) — 맨 위 프사 메뉴의 "설정"으로 들어옴
   - 내 프사 + 이름 + 독자/작가
   - 프사 바꾸기 / 무프사로
   - 닉네임 바꾸기 (겹침·사칭 금지) / 비밀번호 바꾸기 (지금 비밀번호 확인, 8글자+글자·숫자)
   - 관심 웹툰 목록 (새 회차 표시 + 이어보기)
   - 내 웹툰 스튜디오로 가기
   로그인 안 했으면 로그인 페이지로 보냄 */

export const metadata = { title: "설정" };

export default async function SettingsPage() {
  await connection();
  const me = await getCurrentArtist();
  if (!me || me.status === "blocked") redirect("/login?next=/settings");
  const isArtist = me.status === "approved";
  const favorites = await getFavorites(me.id);

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

          {/* 관심 웹툰 ⭐ (새 회차 알림 + 이어보기) */}
          <section className="mt-4 overflow-hidden rounded-2xl border">
            <h2 className="flex items-center gap-1.5 border-b px-4 py-3 text-sm font-semibold">
              <Star className="size-4" />
              관심 웹툰 <span className="text-muted-foreground">{favorites.length}</span>
            </h2>
            {favorites.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">
                웹툰 페이지에서 ⭐ <b>관심 추가</b>를 누르면 여기에 모이고, 새 회차가 나오면 알려 드려요.
              </p>
            ) : (
              <ul className="divide-y">
                {favorites.map((f) => (
                  <li key={f.webtoonId} className="flex items-center gap-3 px-4 py-3">
                    <div className="relative aspect-[160/207] w-10 shrink-0 overflow-hidden rounded bg-muted">
                      {f.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.coverUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="size-4" />
                        </div>
                      )}
                    </div>
                    <Link href={`/webtoon/${f.webtoonId}`} className="min-w-0 flex-1 hover:underline">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        <span className="truncate">{f.title}</span>
                        {f.hasNew ? (
                          <span className="shrink-0 rounded-full bg-destructive px-1.5 text-[10px] font-bold leading-4 text-white">
                            새 회차
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {f.lastEpisode !== null ? `${f.lastEpisode}화까지 봤어요` : "아직 안 봤어요"}
                      </p>
                    </Link>
                    {f.lastEpisode !== null ? (
                      <Link
                        href={`/webtoon/${f.webtoonId}/${f.lastEpisode}`}
                        className="shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted"
                      >
                        이어보기
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 프사 */}
          <section className="mt-4 overflow-hidden rounded-2xl border">
            <h2 className="border-b px-4 py-3 text-sm font-semibold">프사</h2>
            <AvatarChange hasAvatar={Boolean(me.avatar_url)} />
          </section>

          {/* 닉네임 */}
          <section className="mt-4 overflow-hidden rounded-2xl border">
            <h2 className="border-b px-4 py-3 text-sm font-semibold">닉네임</h2>
            <NicknameForm current={me.name} />
          </section>

          {/* 비밀번호 */}
          <section className="mt-4 overflow-hidden rounded-2xl border">
            <h2 className="border-b px-4 py-3 text-sm font-semibold">비밀번호</h2>
            <PasswordForm />
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
