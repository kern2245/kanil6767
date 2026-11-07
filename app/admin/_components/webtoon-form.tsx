"use client";

import { useActionState, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";

import { deleteWebtoon, saveWebtoon, updateWebtoonCover, type ActionState } from "@/app/admin/actions";
import { ImageSlotButtons } from "./image-slot-buttons";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/site.config";
import type { Webtoon } from "@/lib/types";

const inputClass =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50";

/** 웹툰 추가/수정 입력 칸. webtoon 을 넘기면 '수정', 안 넘기면 '새로 추가' 모드.
    canSetCompleted: 회장만 true → "완결" 체크가 보임 (작가 화면에서는 안 보이고, 서버에서도 회장만 바꿀 수 있음) */
export function WebtoonForm({ webtoon, canSetCompleted = false }: { webtoon?: Webtoon; canSetCompleted?: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveWebtoon, {});
  const formRef = useRef<HTMLFormElement>(null);

  // 새로 추가에 성공하면 입력 칸 비우기
  useEffect(() => {
    if (state.ok && !webtoon) formRef.current?.reset();
  }, [state, webtoon]);

  return (
    <form ref={formRef} action={action} className="grid gap-4">
      {webtoon ? <input type="hidden" name="id" value={webtoon.id} /> : null}

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">제목 *</span>
        <input name="title" required defaultValue={webtoon?.title ?? ""} className={inputClass} />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">연재 요일 *</span>
        <select name="weekday" defaultValue={webtoon?.weekday ?? "mon"} className={inputClass}>
          {siteConfig.webtoons.weekdays.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}요일
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">표지 그림 (선택, 5MB 이하, 세로로 긴 그림 추천)</span>
        <input name="cover" type="file" accept="image/*" className="text-sm" />
      </label>

      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_up" defaultChecked={webtoon?.is_up ?? false} />
          UP 항상 표시 (끄면 새 회차를 올린 뒤 24시간만 자동 표시)
        </label>
        {canSetCompleted ? (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_completed" defaultChecked={webtoon?.is_completed ?? false} />
            완결 (첫 화면 &quot;완결 웹툰&quot; 칸으로 옮김 · 회장만)
          </label>
        ) : webtoon?.is_completed ? (
          <span className="text-muted-foreground">완결된 웹툰이에요 (완결은 회장만 바꿀 수 있어요)</span>
        ) : null}
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_visible" defaultChecked={webtoon?.is_visible ?? true} />
          사이트에 보이기
        </label>
        {webtoon?.cover_url ? (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="remove_cover" />
            무프사로 (표지 빼기)
          </label>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : webtoon ? "수정 저장" : "추가하기"}
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

/** 웹툰 목록의 표지 버튼: "표지 바꾸기" / "무프사로"(표지 없는 기본 모양) */
export function CoverButtons({ id, hasCover }: { id: string; hasCover: boolean }) {
  return <ImageSlotButtons id={id} hasImage={hasCover} label="표지" fileField="cover" action={updateWebtoonCover} />;
}

/** 웹툰 삭제 버튼 — 실수 방지를 위해 한 번 더 물어봅니다. */
export function DeleteWebtoonButton({ id, coverUrl }: { id: string; coverUrl: string | null }) {
  return (
    <form
      action={deleteWebtoon}
      onSubmit={(e) => {
        if (!window.confirm("정말 삭제할까요? 되돌릴 수 없습니다.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="cover_url" value={coverUrl ?? ""} />
      <Button type="submit" variant="ghost" size="sm" className="text-destructive">
        <Trash2 />
        삭제
      </Button>
    </form>
  );
}
