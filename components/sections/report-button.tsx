"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Flag } from "lucide-react";

import { submitReport, type ReportState } from "@/app/report/actions";
import { Button } from "@/components/ui/button";

/* 🚩 신고 버튼 — 누르면 작은 칸이 열리고 이유를 골라 신고 (로그인한 회원만)
   로그인 안 했으면 로그인 페이지로 (로그인 뒤 보던 곳으로 돌아옴) */

const REASONS = ["욕설·비방", "선정적·폭력적", "다른 작품 베끼기(도용)", "광고·도배", "기타"];

export function ReportButton({
  targetType,
  targetId,
  loggedIn,
  returnPath,
  label = "신고",
}: {
  targetType: "webtoon" | "episode" | "comment";
  targetId: string;
  loggedIn: boolean;
  /** 로그인 뒤 돌아올 주소 */
  returnPath: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ReportState, FormData>(submitReport, {});
  const triggerClass =
    "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-destructive";

  if (!loggedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(returnPath)}`} className={triggerClass} title="로그인하고 신고하기">
        <Flag className="size-3.5" />
        {label}
      </Link>
    );
  }

  return (
    <div className="relative inline-block">
      <button type="button" onClick={() => setOpen((v) => !v)} className={triggerClass} aria-expanded={open}>
        <Flag className="size-3.5" />
        {label}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-xl border bg-background p-3 text-left shadow-xl">
          {state.ok ? (
            <p className="text-sm">{state.message}</p>
          ) : (
            <form action={action} className="grid gap-2">
              <input type="hidden" name="targetType" value={targetType} />
              <input type="hidden" name="targetId" value={targetId} />
              <p className="text-sm font-semibold">신고 이유</p>
              <select name="reason" required className="h-9 rounded-lg border bg-background px-2 text-base sm:text-sm">
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <input
                name="detail"
                maxLength={200}
                placeholder="자세한 내용 (선택)"
                className="h-9 rounded-lg border bg-background px-2 text-base sm:text-sm"
              />
              {state.message ? <p className="text-xs text-destructive">{state.message}</p> : null}
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
                  닫기
                </Button>
                <Button type="submit" size="sm" variant="destructive" disabled={pending}>
                  {pending ? "보내는 중..." : "신고하기"}
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
