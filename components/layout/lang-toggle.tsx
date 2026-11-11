"use client";

import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";

import { LANG_COOKIE, type Lang } from "@/lib/i18n";

/** 맨 위 "EN / 한" 버튼 — 누르면 언어가 바뀌고 1년 동안 기억해요 */
export function LangToggle({ lang, label }: { lang: Lang; label: string }) {
  const router = useRouter();
  const next: Lang = lang === "ko" ? "en" : "ko";
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
      aria-label={label}
      title={label}
      className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Globe className="size-4" />
      {next === "en" ? "EN" : "한"}
    </button>
  );
}
