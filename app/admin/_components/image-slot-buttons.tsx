"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageOff, ImagePlus } from "lucide-react";

import type { ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

/** 그림 한 칸(웹툰 표지, 회차 썸네일)의 버튼 2개
    - "○○ 바꾸기": 그림을 고르면 바로 올라감
    - "무프사로": 그림을 빼고 기본 모양(그림 없음)으로 되돌림 — 마음에 안 드는 그림을 올렸을 때
    action 은 서버 함수: FormData 에 id + (file 또는 remove=on) 를 받아요. */
export function ImageSlotButtons({
  id,
  hasImage,
  label,
  fileField,
  action,
}: {
  id: string;
  hasImage: boolean;
  /** 버튼에 보일 이름 (예: "표지", "썸네일") */
  label: string;
  /** 서버로 보낼 파일 칸 이름 (예: "cover", "thumbnail") */
  fileField: string;
  action: (data: FormData) => Promise<ActionState>;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<ActionState | null>(null);

  async function send(data: FormData) {
    setPending(true);
    setStatus(null);
    const result = await action(data);
    setStatus(result);
    setPending(false);
    if (result.ok) router.refresh();
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 그림을 다시 골라도 동작하게
    if (!file) return;
    const data = new FormData();
    data.set("id", id);
    data.set(fileField, file);
    void send(data);
  }

  function onReset() {
    if (!window.confirm(`${label}을(를) 빼고 무프사(그림 없는 기본 모양)로 바꿀까요?`)) return;
    const data = new FormData();
    data.set("id", id);
    data.set("remove", "on");
    void send(data);
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => fileRef.current?.click()}>
        <ImagePlus />
        {pending ? "올리는 중..." : hasImage ? `${label} 바꾸기` : `${label} 넣기`}
      </Button>
      {hasImage ? (
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onReset}>
          <ImageOff />
          무프사로
        </Button>
      ) : null}
      {status?.message ? (
        <span className={status.ok ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>{status.message}</span>
      ) : null}
    </div>
  );
}
