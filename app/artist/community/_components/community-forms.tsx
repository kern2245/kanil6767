"use client";

import { useActionState, useEffect, useRef } from "react";

import { createComment, createPost, type CommunityActionState } from "../actions";
import { Button } from "@/components/ui/button";

/* 작가 커뮤니티 입력 화면 조각들
   - PostForm    : 글 쓰기 (제목 + 내용 + 익명 체크)
   - CommentForm : 댓글 쓰기 (내용 + 익명 체크)
   익명으로 쓰면 작가들에게는 "익명"으로만 보이고, 회장만 실명을 볼 수 있어요. */

// 16px(text-base): 아이폰·아이패드에서 입력칸을 눌러도 화면이 확대되지 않게
const inputClass =
  "w-full rounded-lg border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-ring/50";

function AnonymousCheckbox({ name }: { name: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name="anonymous" />
      익명으로 쓰기
      <span className="text-xs text-muted-foreground">(작가들에게는 이름이 안 보여요. 회장만 확인 가능 · {name})</span>
    </label>
  );
}

export function PostForm({ myName }: { myName: string }) {
  const [state, action, pending] = useActionState<CommunityActionState, FormData>(createPost, {});
  return (
    <form action={action} className="grid gap-3">
      <input name="title" required maxLength={100} placeholder="제목" className={`${inputClass} h-11`} />
      <textarea
        name="body"
        required
        maxLength={5000}
        rows={6}
        placeholder="내용 (5000자까지)"
        className={`${inputClass} resize-y py-3`}
      />
      <AnonymousCheckbox name={`실명: ${myName}`} />
      {state.message ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "올리는 중..." : "글 올리기"}
        </Button>
      </div>
    </form>
  );
}

export function CommentForm({ postId, myName }: { postId: string; myName: string }) {
  const [state, action, pending] = useActionState<CommunityActionState, FormData>(createComment, {});
  const formRef = useRef<HTMLFormElement>(null);

  // 댓글이 올라가면 입력 칸 비우기
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-2">
      <input type="hidden" name="postId" value={postId} />
      <textarea
        name="body"
        required
        maxLength={1000}
        rows={3}
        placeholder="댓글 (1000자까지)"
        className={`${inputClass} resize-y py-3`}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AnonymousCheckbox name={`실명: ${myName}`} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "올리는 중..." : "댓글 달기"}
        </Button>
      </div>
      {state.message ? <p className="text-sm text-destructive">{state.message}</p> : null}
    </form>
  );
}
