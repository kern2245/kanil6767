"use client";

import { useActionState } from "react";

import type { ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

/** 비밀번호 한 칸짜리 로그인 칸 (지금은 쓰는 곳 없음 — 회장은 GitHub 로그인, 작가는 이메일 로그인).
    쓰려면 title 과 onLogin(서버 액션)을 꼭 넘겨야 합니다. */
export function LoginForm({
  title,
  onLogin,
}: {
  title: string;
  onLogin: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(onLogin, {});

  return (
    <form action={action} className="mx-auto mt-16 w-full max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <input
        type="password"
        name="password"
        placeholder="비밀번호"
        required
        autoFocus
        className="h-11 w-full rounded-lg border bg-background px-4 outline-none focus:ring-2 focus:ring-ring/50"
      />
      {state.message ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "확인 중..." : "로그인"}
      </Button>
    </form>
  );
}
