"use client";

import { useActionState } from "react";

import { memberLogin, type LoginState } from "../actions";
import { Button } from "@/components/ui/button";

/* 이메일 로그인 칸 — 예전에 이메일로 가입한 회원용
   새로 가입은 "구글로 시작하기"로만 받아요 (가짜 이메일 가입 막기) */

// 16px(text-base): 아이폰·아이패드에서 입력칸을 눌러도 화면이 확대되지 않게
const inputClass =
  "h-11 w-full rounded-lg border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-ring/50";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(memberLogin, {});

  return (
    <div className="mx-auto w-full max-w-sm">
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <input name="email" type="email" placeholder="이메일" required autoComplete="email" className={inputClass} />
        <input
          name="password"
          type="password"
          placeholder="비밀번호"
          required
          autoComplete="current-password"
          className={inputClass}
        />
        {state.message ? <p className="text-sm text-destructive">{state.message}</p> : null}
        <Button type="submit" variant="outline" className="w-full" disabled={pending}>
          {pending ? "확인 중..." : "이메일로 로그인"}
        </Button>
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          처음이신가요? 위의 <b>구글로 시작하기</b>를 누르면 바로 가입돼요.
        </p>
      </form>
    </div>
  );
}
