"use client";

import { useActionState, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";

import { deleteAd, saveAd, type ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import type { Ad } from "@/lib/types";

const inputClass =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50";
const textareaClass =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50";

/** 광고판 추가/수정 칸. ad 를 넘기면 '수정', 안 넘기면 '새로 추가' */
export function AdForm({ ad }: { ad?: Ad }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveAd, {});
  const formRef = useRef<HTMLFormElement>(null);

  // 새로 추가에 성공하면 입력 칸 비우기
  useEffect(() => {
    if (state.ok && !ad) formRef.current?.reset();
  }, [state, ad]);

  return (
    <form ref={formRef} action={action} className="grid gap-4">
      {ad ? <input type="hidden" name="id" value={ad.id} /> : null}

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">작은 윗글씨</span>
        <input name="eyebrow" defaultValue={ad?.eyebrow ?? ""} placeholder="예: tea time" className={inputClass} />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">제목 *</span>
        <input name="title" required defaultValue={ad?.title ?? ""} className={inputClass} />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">안내 문장</span>
        <textarea name="description" rows={2} defaultValue={ad?.description ?? ""} className={textareaClass} />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">링크 (선택)</span>
        <input
          name="link_url"
          defaultValue={ad?.link_url ?? ""}
          placeholder="예: https://instagram.com/... 또는 /webtoon/..."
          className={inputClass}
        />
        <span className="text-xs text-muted-foreground">넣으면 광고판에 &ldquo;자세히 보기&rdquo; 버튼이 생겨요.</span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_visible" defaultChecked={ad?.is_visible ?? true} />
        사이트에 보이기
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : ad ? "수정 저장" : "추가하기"}
        </Button>
        {state.message ? (
          <p className={state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}

/** 광고판 삭제 버튼 — 한 번 더 물어봅니다. */
export function DeleteAdButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deleteAd}
      onSubmit={(e) => {
        if (!window.confirm(`"${title}" 광고판을 삭제할까요? 되돌릴 수 없습니다.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm" className="text-destructive">
        <Trash2 />
        삭제
      </Button>
    </form>
  );
}
