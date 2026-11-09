"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageOff, ImagePlus } from "lucide-react";

import { updateMyAvatar, type AvatarResult } from "@/app/login/actions";

/** 프사 메뉴 안의 "프사 바꾸기" / "무프사로" (그림을 고르면 바로 올라감) */
export function AvatarChange({ hasAvatar }: { hasAvatar: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<AvatarResult | null>(null);

  async function send(data: FormData) {
    setPending(true);
    setStatus(null);
    const result = await updateMyAvatar(data);
    setStatus(result);
    setPending(false);
    if (result.ok) router.refresh();
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 그림을 다시 골라도 동작하게
    if (!file) return;
    const data = new FormData();
    data.set("avatar", file);
    void send(data);
  }

  function onReset() {
    if (!window.confirm("프사를 빼고 기본 모양(닉네임 첫 글자)으로 바꿀까요?")) return;
    const data = new FormData();
    data.set("remove", "on");
    void send(data);
  }

  const itemClass =
    "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50";

  return (
    <div className="border-b">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      <button type="button" disabled={pending} onClick={() => fileRef.current?.click()} className={itemClass}>
        <ImagePlus className="size-4" />
        {pending ? "올리는 중..." : "프사 바꾸기"}
      </button>
      {hasAvatar ? (
        <button type="button" disabled={pending} onClick={onReset} className={`${itemClass} text-muted-foreground`}>
          <ImageOff className="size-4" />
          무프사로
        </button>
      ) : null}
      {status?.message ? (
        <p className={`px-4 pb-2 text-xs ${status.ok ? "text-muted-foreground" : "text-destructive"}`}>{status.message}</p>
      ) : null}
    </div>
  );
}
