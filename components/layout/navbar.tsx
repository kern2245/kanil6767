import Link from "next/link";
import { PenLine, Search } from "lucide-react";

import { siteConfig } from "@/site.config";
import { Container } from "@/components/layout/container";
import { UserMenu } from "@/components/layout/user-menu";
import { LangToggle } from "@/components/layout/lang-toggle";
import { getT } from "@/lib/lang";

/** 상단 메뉴.
    - 왼쪽: 사이트 이름 / 오른쪽: 웹툰 검색 칸 + 로그인 (components/layout/user-menu.tsx)
    - 검색하면 /search?q=검색어 페이지로 이동 (app/search/page.tsx)
    - 메뉴 항목은 site.config.ts 의 nav 에서 바꿉니다. (지금은 비어 있음) */
export async function Navbar() {
  const { lang, t } = await getT();
  return (
    <>
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      {/* 휴대폰: 이름 · 올리기 · 언어 · 로그인(글자만) — 검색은 메뉴 아래 네이버식 검색창
          컴퓨터(sm 이상): 이름 · 올리기 · 검색 칸 · 언어 · 로그인 버튼 */}
      <Container className="flex h-14 items-center gap-1 sm:h-16 sm:gap-4">
        <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight">
          {siteConfig.name}
        </Link>

        {/* 내 웹툰 올리기 (사이트 이름 바로 옆) */}
        <Link
          href={siteConfig.hero.secondaryCta.href}
          className="ml-1.5 inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-border px-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted sm:ml-3 sm:h-9 sm:px-3.5 sm:text-sm"
        >
          <PenLine className="size-3 sm:size-4" />
          {/* 휴대폰: 짧게 "올리기" / 컴퓨터: "내 웹툰 올리기" */}
          <span className="sm:hidden">{lang === "ko" ? "올리기" : "Publish"}</span>
          <span className="hidden sm:inline">{lang === "ko" ? siteConfig.hero.secondaryCta.label : t.hero.create}</span>
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-4">
          {siteConfig.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground md:inline"
            >
              {item.label}
            </a>
          ))}

          {/* 컴퓨터: 웹툰 검색 칸 */}
          <form action="/search" role="search" className="relative hidden sm:block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              placeholder={t.nav.search}
              aria-label={t.nav.search}
              className="h-9 w-56 rounded-full bg-muted pr-3 pl-9 text-base outline-none transition-[width] focus:w-64 focus:ring-2 focus:ring-ring/50"
            />
          </form>

          {/* 언어 바꾸기 (한국어 ↔ 영어) */}
          <LangToggle lang={lang} label={t.nav.switchTo} />

          {/* 로그인 / 내 이름 · 로그아웃 */}
          <UserMenu />
        </div>
      </Container>
    </header>

    {/* 휴대폰 전용: 네이버처럼 둥근 긴 검색창 (메뉴 바로 아래, 항상 보임)
        글자 칸 · 오른쪽 보라 돋보기 버튼 → /search?q=검색어 */}
    <Container className="pt-3 pb-1 sm:hidden">
      <form
        action="/search"
        role="search"
        className="flex h-13 items-center gap-2 rounded-full border border-border/60 bg-muted pr-1.5 pl-5 shadow-sm focus-within:ring-2 focus-within:ring-ring/50"
      >
        <input
          type="search"
          name="q"
          placeholder={t.nav.search}
          aria-label={t.nav.search}
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          aria-label={t.nav.search}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Search className="size-5" />
        </button>
      </form>
    </Container>
    </>
  );
}
