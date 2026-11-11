"use client";

import { useActionState } from "react";
import { ChevronDown, Mail } from "lucide-react";

import { memberLogin, type LoginState } from "../actions";
import { Button } from "@/components/ui/button";
import { getDict, type Lang } from "@/lib/i18n";

/* 이메일 로그인 칸 — 예전에 이메일로 가입한 회원용 (평소엔 접혀 있음)
   새로 가입은 "구글로 시작하기"로만 받아요 (가짜 이메일 가입 막기) */

// 16px(text-base): 아이폰·아이패드에서 입력칸을 눌러도 화면이 확대되지 않게
const inputClass =
  "h-11 w-full rounded-xl border bg-background/60 px-4 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/40";

export function LoginForm({ next, lang = "ko" }: { next: string; lang?: Lang }) {
  const t = getDict(lang).login;
  const [state, action, pending] = useActionState<LoginState, FormData>(memberLogin, {});

  return (
    // 로그인 실패 메시지가 있으면 펼친 채로
    <details className="group" open={Boolean(state.message)}>
      <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        <Mail className="size-4" />
        {t.oldEmail}
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
      </summary>

      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="next" value={next} />
        <input name="email" type="email" placeholder={t.email} required autoComplete="email" className={inputClass} />
        <input
          name="password"
          type="password"
          placeholder={t.password}
          required
          autoComplete="current-password"
          className={inputClass}
        />
        {state.message ? <p className="text-sm text-destructive">{state.message}</p> : null}
        <Button type="submit" className="h-11 w-full" disabled={pending}>
          {pending ? t.checking : t.submit}
        </Button>
      </form>
    </details>
  );
}
