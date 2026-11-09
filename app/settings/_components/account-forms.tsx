"use client";

import { useActionState, useEffect, useRef } from "react";

import { changeMyNickname, changeMyPassword } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

/* 설정 페이지 입력 칸 — 닉네임 바꾸기 / 비밀번호 바꾸기
   (해킹 막기 규칙은 서버 lib/admin-auth.ts: 지금 비밀번호 확인, 8글자+글자·숫자, 닉네임 겹침·사칭 금지) */

type State = { ok?: boolean; message?: string };

// 16px(text-base): 아이폰·아이패드에서 입력칸을 눌러도 화면이 확대되지 않게
const inputClass =
  "h-11 w-full rounded-lg border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-ring/50";

function Message({ state }: { state: State }) {
  if (!state.message) return null;
  return <p className={state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>{state.message}</p>;
}

export function NicknameForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState<State, FormData>(changeMyNickname, {});
  return (
    <form action={action} className="grid gap-3 p-4">
      <input name="name" required maxLength={20} defaultValue={current} className={inputClass} aria-label="새 닉네임" />
      <p className="text-xs text-muted-foreground">다른 회원과 같은 닉네임, &quot;회장·관리자&quot;처럼 헷갈리는 닉네임은 못 써요.</p>
      <Message state={state} />
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "바꾸는 중..." : "닉네임 바꾸기"}
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<State, FormData>(changeMyPassword, {});
  const formRef = useRef<HTMLFormElement>(null);

  // 바꾸면 칸 비우기 (비밀번호가 화면에 남지 않게)
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-3 p-4">
      <input
        name="current"
        type="password"
        required
        autoComplete="current-password"
        placeholder="지금 비밀번호"
        className={inputClass}
      />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="새 비밀번호 (8글자 이상, 글자+숫자)"
        className={inputClass}
      />
      <input
        name="confirm"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="새 비밀번호 한 번 더"
        className={inputClass}
      />
      <p className="text-xs text-muted-foreground">바꾸면 다른 기기(휴대폰 등)에서는 자동으로 로그아웃돼요.</p>
      <Message state={state} />
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "바꾸는 중..." : "비밀번호 바꾸기"}
        </Button>
      </div>
    </form>
  );
}
