"use client";

import { useActionState, useEffect, useRef } from "react";

import type { ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

const inputClass =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50";

/** 새 비밀번호 입력 칸 (같은 비밀번호를 두 번 입력해서 저장). 작가 페이지 "비밀번호 바꾸기"에서 씁니다. */
export function ArtistPasswordForm({
  onSave,
  buttonLabel = "저장",
}: {
  onSave: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  buttonLabel?: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(onSave, {});
  const formRef = useRef<HTMLFormElement>(null);

  // 저장에 성공하면 입력 칸 비우기
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-4">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">새 비밀번호 (4글자 이상)</span>
        <input name="password" type="password" required minLength={4} autoComplete="new-password" className={inputClass} />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">한 번 더 입력</span>
        <input name="confirm" type="password" required minLength={4} autoComplete="new-password" className={inputClass} />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : buttonLabel}
        </Button>
        {state.message ? (
          <p className={state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}
