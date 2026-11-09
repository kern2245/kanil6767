"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, List, MessageCircle, X } from "lucide-react";

import { addComment, type CommentActionState } from "@/app/webtoon/[id]/[no]/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* 댓글 칸에서 쓰는 화면 조각들
   - CommentSheet   : 화면 아래에 떠 있는 바(이전화 · 목록 · 💬댓글 · 다음화) + 💬를 누르면 아래에서 올라오는 댓글 창
   - CommentForm    : 로그인한 독자에게 보이는 댓글 쓰기 칸 */

type SheetProps = {
  count: number;
  listHref: string;
  prevHref?: string;
  nextHref?: string;
  children: React.ReactNode;
};

function BarLink({ href, children, label }: { href?: string; children: React.ReactNode; label: string }) {
  const className = "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs";
  if (!href) {
    return (
      <span aria-disabled className={cn(className, "text-muted-foreground/40")}>
        {children}
        {label}
      </span>
    );
  }
  return (
    <Link href={href} className={cn(className, "text-muted-foreground hover:text-foreground")}>
      {children}
      {label}
    </Link>
  );
}

export function CommentSheet({ count, listHref, prevHref, nextHref, children }: SheetProps) {
  const [open, setOpen] = useState(false);

  // 창이 열려 있는 동안: 뒤 화면 스크롤 막기 + Esc 키로 닫기
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* 화면 아래에 항상 떠 있는 바 */}
      <nav
        aria-label="회차 이동과 댓글"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto flex max-w-3xl items-stretch px-2">
          <BarLink href={prevHref} label="이전화">
            <ChevronLeft className="size-5" />
          </BarLink>
          <BarLink href={listHref} label="목록">
            <List className="size-5" />
          </BarLink>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <MessageCircle className="size-5" />
            댓글 {count}
          </button>
          <BarLink href={nextHref} label="다음화">
            <ChevronRight className="size-5" />
          </BarLink>
        </div>
      </nav>

      {/* 뒤 화면 어둡게 (누르면 닫힘) */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-50 bg-black/50 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* 아래에서 올라오는 댓글 창 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="댓글"
        aria-hidden={!open}
        inert={!open}
        className={cn(
          // 휴대폰: 화면 아래에 딱 붙어서 올라옴 / 태블릿(아이패드·갤럭시탭) 이상: 가운데에 떠 있는 카드처럼
          "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] max-w-3xl flex-col rounded-t-2xl border-t bg-background shadow-2xl transition-transform duration-300 ease-out",
          "md:bottom-[calc(1rem+env(safe-area-inset-bottom))] md:max-h-[80dvh] md:max-w-2xl md:rounded-2xl md:border",
          open ? "translate-y-0" : "translate-y-[calc(100%+2rem)]",
        )}
      >
        <div className="relative flex items-center justify-center border-b px-4 py-3">
          <span className="absolute top-1.5 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
          <h2 className="mt-1 text-base font-semibold">
            댓글 <span className="text-muted-foreground">{count}</span>
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="댓글 닫기"
            className="absolute right-3 rounded-full p-2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:px-6 md:pb-6">
          {children}
        </div>
      </div>
    </>
  );
}

export function CommentForm({ episodeId, path }: { episodeId: string; path: string }) {
  const [state, action, pending] = useActionState<CommentActionState, FormData>(addComment, {});
  const formRef = useRef<HTMLFormElement>(null);

  // 댓글이 잘 올라가면 입력 칸 비우기
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="episodeId" value={episodeId} />
      <input type="hidden" name="path" value={path} />
      <textarea
        name="body"
        required
        maxLength={500}
        rows={3}
        placeholder="댓글을 남겨 주세요 (500자까지)"
        className="w-full resize-y rounded-lg border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring/50"
      />
      {state.message ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "올리는 중..." : "댓글 달기"}
        </Button>
      </div>
    </form>
  );
}
