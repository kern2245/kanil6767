"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

/** 휴대폰 맨 위 돋보기: 누르면 메뉴 바로 아래에 검색 칸이 스르륵 뜸 (페이지 이동 없이)
    검색하면 /search?q=검색어 로 이동. 바깥(어두운 곳)이나 X 를 누르면 닫힘 */
export function MobileSearch({ placeholder, closeLabel }: { placeholder: string; closeLabel: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={placeholder}
        aria-expanded={open}
        title={placeholder}
        className="inline-flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
      >
        {open ? <X className="size-5" /> : <Search className="size-5" />}
      </button>

      {open ? (
        <>
          {/* 뒤를 살짝 어둡게: 누르면 닫힘 */}
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
            className="absolute inset-x-0 top-full z-40 h-[100dvh] bg-black/50"
          />
          {/* 메뉴 바로 아래에 뜨는 검색 칸 */}
          <form
            action="/search"
            role="search"
            onSubmit={(e) => {
              // 검색 페이지로 이동한 뒤 검색 칸 닫기
              e.preventDefault();
              const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
              router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
              setOpen(false);
            }}
            className="absolute inset-x-0 top-full z-50 border-b border-border/60 bg-background px-4 py-3 shadow-xl"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                name="q"
                autoFocus
                placeholder={placeholder}
                aria-label={placeholder}
                className="h-11 w-full rounded-full bg-muted pr-4 pl-11 text-base outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
          </form>
        </>
      ) : null}
    </div>
  );
}
