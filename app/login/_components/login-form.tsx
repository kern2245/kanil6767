"use client";

import { useActionState, useState } from "react";

import { memberLogin, memberSignup, type LoginState } from "../actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 16px(text-base): 아이폰·아이패드에서 입력칸을 눌러도 화면이 확대되지 않게
const inputClass =
  "h-11 w-full rounded-lg border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-ring/50";

/** 로그인 / 가입하기 (위쪽 탭으로 바꿈). next: 로그인 뒤 돌아갈 주소 */
export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState<LoginState, FormData>(memberLogin, {});
  const [signupState, signupAction, signupPending] = useActionState<LoginState, FormData>(memberSignup, {});

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="로그인 또는 가입">
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
          {loginState.message ? <p className="text-sm text-destructive">{loginState.message}</p> : null}
          <Button type="submit" className="w-full" disabled={loginPending}>
            {loginPending ? "확인 중..." : "로그인"}
          </Button>
        </form>
      ) : (
        <form action={signupAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          <input name="email" type="email" placeholder="이메일 (로그인할 때 써요)" required autoComplete="email" className={inputClass} />
          <input name="name" placeholder="닉네임 (댓글·작가 이름으로 보여요)" required maxLength={20} className={inputClass} />
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
            가입하면 독자로 시작해서 댓글을 달 수 있어요. 웹툰을 올리고 싶으면 회장에게 작가 승급을 부탁하세요.
          </p>
        </form>
      )}
    </div>
  );
}
