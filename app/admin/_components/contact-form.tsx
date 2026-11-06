"use client";

import { useActionState } from "react";

import { saveContactTexts, type ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import type { ContactTexts } from "@/lib/types";

const inputClass =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50";
const textareaClass =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50";

/** TEA TIME(연락처) 칸 글자 수정. 칸을 비우고 저장하면 site.config.ts 의 기본 글자로 돌아갑니다. */
export function ContactForm({ texts }: { texts: ContactTexts }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveContactTexts, {});

  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">작은 윗글씨</span>
        <input name="eyebrow" defaultValue={texts.eyebrow} className={inputClass} />
        <span className="text-xs text-muted-foreground">사이트에서는 대문자로 보여요. (예: tea time → TEA TIME)</span>
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">제목</span>
        <input name="title" defaultValue={texts.title} className={inputClass} />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">안내 문장</span>
        <textarea name="description" rows={3} defaultValue={texts.description} className={textareaClass} />
      </label>

      <p className="text-xs text-muted-foreground">칸을 비우고 저장하면 처음 기본 글자로 돌아갑니다.</p>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : "저장"}
        </Button>
        {state.message ? (
          <p className={state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}
