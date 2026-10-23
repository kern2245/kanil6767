"use client";

import { useActionState } from "react";

import { saveHero, type ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import type { HeroTexts } from "@/lib/types";

const inputClass =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50";
const textareaClass =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50";

/** 첫 화면(히어로) 글자 수정 칸. 칸을 비우고 저장하면 site.config.ts 의 기본 글자로 돌아갑니다. */
export function HeroForm({ texts }: { texts: HeroTexts }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveHero, {});

  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">작은 윗글씨</span>
        <input name="eyebrow" defaultValue={texts.eyebrow} className={inputClass} />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">큰 제목</span>
        <textarea name="title" rows={2} defaultValue={texts.title} className={textareaClass} />
        <span className="text-xs text-muted-foreground">Enter 로 줄을 바꾸면 사이트에서도 줄이 바뀝니다.</span>
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">소개 문장</span>
        <textarea name="description" rows={3} defaultValue={texts.description} className={textareaClass} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">첫 번째 버튼 글자</span>
          <input name="primary_label" defaultValue={texts.primaryLabel} className={inputClass} />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">두 번째 버튼 글자</span>
          <input name="secondary_label" defaultValue={texts.secondaryLabel} className={inputClass} />
        </label>
      </div>

      <p className="text-xs text-muted-foreground">칸을 비우고 저장하면 처음 기본 글자로 돌아갑니다.</p>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : "저장"}
        </Button>
        {state.message ? (
          <p className={state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
