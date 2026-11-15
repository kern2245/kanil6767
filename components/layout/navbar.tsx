import Link from "next/link";
import { Search } from "lucide-react";

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
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      {/* 휴대폰: 1줄 = 사이트 이름 · 언어 · 로그인 / 2줄 = 화면 폭 꽉 찬 검색 칸
          컴퓨터(sm 이상): 한 줄에 이름 · 검색 · 언어 · 로그인 */}
      <Container className="flex flex-wrap items-center gap-x-2 gap-y-2 py-2 sm:h-16 sm:flex-nowrap sm:gap-4 sm:py-0">
        <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight">
          {siteConfig.name}
        </Link>

        {/* 웹툰 검색 (휴대폰에서는 맨 아래 줄로 내려가 폭을 꽉 채움) */}
        <form action="/search" role="search" className="relative order-last w-full sm:order-none sm:ml-auto sm:w-auto">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            placeholder={t.nav.search}
            aria-label={t.nav.search}
            className="h-10 w-full min-w-0 rounded-full bg-muted pr-3 pl-9 text-base outline-none transition-[width] focus:ring-2 focus:ring-ring/50 sm:h-9 sm:w-56 sm:focus:w-64"
          />
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0 sm:gap-4">
          {siteConfig.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground md:inline"
            >
              {item.label}
            </a>
          ))}

          {/* 언어 바꾸기 (한국어 ↔ 영어) */}
          <LangToggle lang={lang} label={t.nav.switchTo} />

          {/* 로그인 / 내 이름 · 로그아웃 */}
          <UserMenu />
        </div>
      </Container>
    </header>
  );
}
