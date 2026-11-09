import Link from "next/link";
import { ArrowLeft, EyeOff, LogIn } from "lucide-react";

import { isAdmin, isAdminPasswordSet } from "@/lib/admin-auth";
import { getAdminClient } from "@/lib/supabase-admin";
import { getHeroTexts } from "@/lib/data";
import type { Ad } from "@/lib/types";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { logout, startGithubLogin } from "./actions";
import { HeroForm } from "./_components/hero-form";
import { AdForm, DeleteAdButton } from "./_components/ad-form";
import { WebtoonManager } from "./_components/webtoon-manager";
import { ArtistList } from "./_components/artist-list";
import { CommunityManager } from "./_components/community-manager";
import { ReportList } from "./_components/report-list";
import { getCommunityForOwner } from "@/lib/community";

/* 관리자 페이지 (주소: /admin)
   1) 비밀번호가 설정 안 됐으면 → 설정 안내
   2) 로그인 안 했으면 → 로그인 화면
   3) Supabase 연결 안 됐으면 → 연결 안내
   4) 모두 준비됐으면 → "히어로" 탭(글자) + "광고판" 탭(자동 슬라이드) + "웹툰" + "작가" + "커뮤니티"(작가 커뮤니티 글 지우기)
      + 섹션별 카드(항목) 관리 */

export const metadata = { title: "관리자" };

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-16 max-w-xl rounded-xl border bg-muted/50 p-8">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

/** 상단 바: 사이트로 돌아가기 + 로그아웃 */
function AdminTopBar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="사이트로 돌아가기">
          <Link href="/">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">관리자</h1>
      </div>
      <form action={logout}>
        <Button type="submit" variant="outline" size="sm">
          로그아웃
        </Button>
      </form>
    </div>
  );
}

/** 탭: 히어로 · 광고판 · 웹툰 · 회원 · 커뮤니티 · 신고 (예전 "기능" 예시 카드 탭은 사이트에 안 보여서 뺐어요) */
function SectionTabs({ current }: { current: string }) {
  const tabs = [
    { key: "hero", label: "히어로" },
    { key: "contact", label: "광고판" },
    { key: "webtoons", label: "웹툰" },
    { key: "artist", label: "회원" },
    { key: "community", label: "커뮤니티" },
    { key: "reports", label: "신고" },
  ];
  return (
    <nav className="mt-8 flex flex-wrap gap-2">
      {tabs.map((s) => (
        <Button key={s.key} asChild size="sm" variant={s.key === current ? "default" : "outline"}>
          <Link href={`/admin?section=${s.key}`}>{s.label}</Link>
        </Button>
      ))}
    </nav>
  );
}

export default async function AdminPage(props: PageProps<"/admin">) {
  const searchParams = await props.searchParams;

  if (!isAdminPasswordSet()) {
    return (
      <Container>
        <Notice title="관리자 비밀번호를 먼저 설정하세요">
          <p>
            1. 프로젝트 폴더의 <code>.env.example</code> 파일을 복사해서 이름을{" "}
            <code>.env.local</code> 로 바꿉니다.
          </p>
          <p>
            2. <code>ADMIN_PASSWORD=</code> 뒤에 원하는 비밀번호를 적고 저장합니다.
          </p>
          <p>3. 개발 서버를 껐다가(Ctrl + C) 다시 켭니다(npm run dev).</p>
        </Notice>
      </Container>
    );
  }

  // 회장 로그인: GitHub(site.config.ts 의 ownerGithubLogin) 계정으로만
  if (!(await isAdmin())) {
    const error = typeof searchParams.error === "string" ? searchParams.error : undefined;
    const errorMessage =
      error === "not-owner"
        ? "회장 계정이 아니에요. 회장 GitHub 계정으로 로그인해 주세요."
        : error === "github"
          ? "GitHub 로그인에 실패했어요. 다시 시도해 주세요. (계속 안 되면 Supabase의 GitHub 연결 설정을 확인하세요)"
          : error === "supabase"
            ? "Supabase가 연결되지 않았습니다. .env.local 을 확인하세요."
            : null;
    return (
      <Container>
        <div className="mx-auto mt-16 w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-semibold">회장 로그인</h1>
          <p className="text-sm text-muted-foreground">회장 GitHub 계정으로만 들어갈 수 있어요.</p>
          <form action={startGithubLogin}>
            <Button type="submit" className="w-full">
              <LogIn />
              GitHub로 로그인
            </Button>
          </form>
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        </div>
      </Container>
    );
  }

  const supabase = getAdminClient();
  if (!supabase) {
    return (
      <Container>
        <Notice title="Supabase 연결이 필요합니다">
          <p>로그인은 됐어요! 이제 카드를 저장할 데이터베이스를 연결할 차례입니다.</p>
          <p>
            README.md 의 <b>「Supabase 연결하기」</b> 순서대로 <code>.env.local</code> 에 주소와
            키를 넣고, 개발 서버를 다시 켜 주세요.
          </p>
        </Notice>
      </Container>
    );
  }

  const requested = typeof searchParams.section === "string" ? searchParams.section : undefined;
  const isHeroTab = requested === "hero";

  // "히어로" 탭: 첫 화면 글자 수정
  if (isHeroTab) {
    const heroTexts = await getHeroTexts();
    return (
      <Container className="py-10">
        <AdminTopBar />
        <SectionTabs current="hero" />
        <section className="mt-8 max-w-2xl rounded-xl border p-6">
          <h2 className="mb-5 text-lg font-semibold">첫 화면(히어로) 글자</h2>
          <HeroForm texts={heroTexts} />
        </section>
      </Container>
    );
  }

  // "광고판" 탭: 메인 화면 자동 슬라이드 광고판 추가·수정·삭제 (예전 TEA TIME 칸)
  if (requested === "contact") {
    const { data: adRows, error: adError } = await supabase
      .from("ads")
      .select("*")
      .order("created_at", { ascending: true });
    const ads = (adRows ?? []) as Ad[];
    return (
      <Container className="py-10">
        <AdminTopBar />
        <SectionTabs current="contact" />

        {adError ? (
          <p className="mt-6 rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
            광고판을 불러오지 못했습니다: {adError.message}
          </p>
        ) : null}

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section className="h-fit rounded-xl border p-6">
            <h2 className="mb-5 text-lg font-semibold">광고판 추가</h2>
            <AdForm />
          </section>

          <section>
            <h2 className="mb-1 text-lg font-semibold">
              광고판 <span className="text-muted-foreground">({ads.length})</span>
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              메인 화면에서 위에서부터 순서대로 5초마다 넘어가요. (먼저 만든 광고판이 먼저)
            </p>
            {ads.length === 0 ? (
              <p className="text-sm text-muted-foreground">아직 없습니다. 왼쪽에서 추가해 보세요.</p>
            ) : (
              <ul className="space-y-3">
                {ads.map((ad, i) => (
                  <li key={ad.id} className="rounded-xl border">
                    <div className="flex items-center gap-3 p-4">
                      <span className="w-6 shrink-0 text-sm text-muted-foreground">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 font-medium">
                          <span className="truncate">{ad.title}</span>
                          {!ad.is_visible ? (
                            <EyeOff className="size-4 shrink-0 text-muted-foreground" aria-label="숨김" />
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {ad.eyebrow ?? ""}
                          {ad.link_url ? ` · 링크: ${ad.link_url}` : ""}
                        </p>
                      </div>
                      <DeleteAdButton id={ad.id} title={ad.title} />
                    </div>
                    <details className="border-t px-4 py-3">
                      <summary className="cursor-pointer text-sm text-muted-foreground">수정하기</summary>
                      <div className="pt-4">
                        <AdForm ad={ad} />
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </Container>
    );
  }

  // "회원" 탭: 가입한 회원 목록 — 작가로 승급 / 독자로 / 막기 / 삭제
  if (requested === "artist") {
    return (
      <Container className="py-10">
        <AdminTopBar />
        <SectionTabs current="artist" />
        <section className="mt-8 max-w-3xl">
          <h2 className="text-lg font-semibold">회원 목록</h2>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">
            누구나 맨 위 &lsquo;로그인&rsquo;에서 가입하면 댓글도 달고 웹툰도 올릴 수 있어요. <b>작가로 승급</b>하면 이름 앞에
            &lsquo;작가&rsquo; 표시가 붙고 작가 커뮤니티에 들어갈 수 있어요.
          </p>
          <ArtistList />
        </section>
      </Container>
    );
  }

  // "커뮤니티" 탭: 작가 커뮤니티 글·댓글을 실명과 함께 보고 지우기 (회장 전용)
  if (requested === "community") {
    const posts = await getCommunityForOwner();
    return (
      <Container className="py-10">
        <AdminTopBar />
        <SectionTabs current="community" />
        <section className="mt-8 max-w-3xl">
          <h2 className="text-lg font-semibold">
            작가 커뮤니티 관리 <span className="text-muted-foreground">({posts.length})</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            회장만 보는 화면이에요. 익명 글·댓글도 실명이 같이 보여요. 문제 있는 글은 골라서 한꺼번에 지울 수 있어요.
          </p>
          <CommunityManager posts={posts} />
        </section>
      </Container>
    );
  }

  // "신고" 탭: 회원이 신고한 웹툰·회차·댓글 처리
  if (requested === "reports") {
    return (
      <Container className="py-10">
        <AdminTopBar />
        <SectionTabs current="reports" />
        <section className="mt-8 max-w-3xl">
          <h2 className="text-lg font-semibold">신고</h2>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">
            회원이 신고한 웹툰·회차·댓글이에요. 확인하고 지우거나 숨기거나, 문제가 없으면 &lsquo;처리 완료&rsquo;를 눌러 주세요.
          </p>
          <ReportList />
        </section>
      </Container>
    );
  }

  // "웹툰" 탭 (처음 들어오면 이 탭): 요일별 웹툰 추가·수정·삭제
  return (
    <Container className="py-10">
      <AdminTopBar />
      <SectionTabs current="webtoons" />
      <WebtoonManager />
    </Container>
  );
}
