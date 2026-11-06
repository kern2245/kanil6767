"use client";

import { useActionState, useState } from "react";

import { artistLogin, artistSignup, type ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 w-full rounded-lg border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring/50";

/** 작가 로그인 / 가입 화면 (위쪽 탭으로 바꿈) */
export function ArtistAuth() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState<ActionState, FormData>(artistLogin, {});
  const [signupState, signupAction, signupPending] = useActionState<ActionState, FormData>(artistSignup, {});

  return (
    <div className="mx-auto mt-16 w-full max-w-sm">
      <h1 className="text-2xl font-semibold">작가</h1>

      <div className="mt-6 grid grid-cols-2 gap-2" role="tablist" aria-label="로그인 또는 가입">
        {(
          [
            ["login", "로그인"],
            ["signup", "가입하기"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className={cn(
              "rounded-full py-2 text-sm font-semibold transition-colors",
              mode === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "login" ? (
        <form action={loginAction} className="mt-6 space-y-4">
          <input name="email" type="email" placeholder="이메일" required autoComplete="email" className={inputClass} />
          <input
            name="password"
            type="password"
            placeholder="비밀번호"
            required
            autoComplete="current-password"
            className={inputClass}
          />
          {loginState.message ? <p className="text-sm text-destructive">{loginState.message}</p> : null}
          <Button type="submit" className="w-full" disabled={loginPending}>
            {loginPending ? "확인 중..." : "로그인"}
          </Button>
        </form>
      ) : (
        <form action={signupAction} className="mt-6 space-y-4">
          <input name="email" type="email" placeholder="이메일 (로그인할 때 써요)" required autoComplete="email" className={inputClass} />
          <input name="name" placeholder="작가 이름" required maxLength={40} className={inputClass} />
          <input
            name="password"
            type="password"
            placeholder="비밀번호 (4글자 이상)"
            required
            minLength={4}
            autoComplete="new-password"
            className={inputClass}
          />
          <input
            name="confirm"
            type="password"
            placeholder="비밀번호 한 번 더"
            required
            minLength={4}
            autoComplete="new-password"
            className={inputClass}
          />
          {signupState.message ? <p className="text-sm text-destructive">{signupState.message}</p> : null}
          <Button type="submit" className="w-full" disabled={signupPending}>
            {signupPending ? "가입 중..." : "가입하기"}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            가입하면 회장이 승인한 뒤부터 웹툰을 올릴 수 있어요.
          </p>
        </form>
      )}
    </div>
  );
}
