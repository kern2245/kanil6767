import Link from "next/link";
import { LogIn, LogOut, PenSquare } from "lucide-react";

import { getCurrentArtist } from "@/lib/admin-auth";
import { memberLogout } from "@/app/login/actions";

/* 맨 위 검색 칸 옆 "로그인" 자리 (서버에서 로그인 상태 확인)
   - 로그인 안 함: "로그인" 버튼 → /login
   - 로그인함: 내 닉네임 (작가면 "작가" 표시 + "작가 스튜디오" 버튼) + 로그아웃 */
export async function UserMenu() {
  const member = await getCurrentArtist();

  if (!member || member.status === "blocked") {
    return (
      <Link
        href="/login"
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <LogIn className="size-4" />
        로그인
      </Link>
    );
  }

  const isArtist = member.status === "approved";
  return (
    <div className="flex shrink-0 items-center gap-2">
      {isArtist ? (
        <Link
          href="/artist"
          className="hidden h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors hover:bg-muted sm:inline-flex"
        >
          <PenSquare className="size-4" />
          작가 스튜디오
        </Link>
      ) : null}
      <span className="flex max-w-28 items-center gap-1 truncate text-sm font-semibold">
        {isArtist ? (
          <span className="shrink-0 rounded-full bg-primary px-1.5 text-[10px] font-bold leading-4 text-primary-foreground">
            작가
          </span>
        ) : null}
        <span className="truncate">{member.name}</span>
      </span>
      <form action={memberLogout}>
        <button
          type="submit"
          aria-label="로그아웃"
          title="로그아웃"
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}
