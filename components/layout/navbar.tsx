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
      <Container className="flex h-16 items-center justify-between gap-3 sm:gap-4">
        <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight">
          {siteConfig.name}
        </Link>

        {/* 휴대폰: 남는 폭만큼만 검색 칸이 늘어나서 로그인 버튼이 화면 밖으로 안 밀려남 */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none sm:gap-4">
          {siteConfig.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground md:inline"
            >
              {item.label}
            </a>
          ))}

          {/* 웹툰 검색 */}
          <form action="/search" role="search" className="relative min-w-0 flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              placeholder={t.nav.search}
              aria-label={t.nav.search}
              className="h-9 w-full min-w-0 rounded-full bg-muted pr-3 pl-9 text-base outline-none transition-[width] focus:ring-2 focus:ring-ring/50 sm:w-56 sm:focus:w-64"
            />
          </form>

          {/* 언어 바꾸기 (한국어 ↔ 영어) */}
          <LangToggle lang={lang} label={t.nav.switchTo} />

          {/* 로그인 / 내 이름 · 로그아웃 */}
          <UserMenu />
        </div>
      </Container>
    </header>
  );
}
