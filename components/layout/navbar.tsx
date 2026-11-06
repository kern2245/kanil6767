import Link from "next/link";
import { Search } from "lucide-react";

import { siteConfig } from "@/site.config";
import { Container } from "@/components/layout/container";

/** 상단 메뉴.
    - 왼쪽: 사이트 이름 / 오른쪽: 웹툰 검색 칸 (관리자 '비밀 버튼'은 맨 아래 푸터에 있음)
    - 검색하면 /search?q=검색어 페이지로 이동 (app/search/page.tsx)
    - 메뉴 항목은 site.config.ts 의 nav 에서 바꿉니다. (지금은 비어 있음) */
export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight">
          {siteConfig.name}
        </Link>

        <div className="flex min-w-0 items-center gap-6">
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
          <form action="/search" role="search" className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              placeholder="웹툰 검색"
              aria-label="웹툰 검색"
              className="h-9 w-40 rounded-full border bg-muted/50 pr-3 pl-9 text-sm outline-none transition-[width] focus:w-52 focus:ring-2 focus:ring-ring/50 sm:w-56 sm:focus:w-64"
            />
          </form>
        </div>
      </Container>
    </header>
  );
}
