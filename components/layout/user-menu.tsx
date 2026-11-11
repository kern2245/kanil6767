import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";

import { siteConfig } from "@/site.config";
import { getCurrentArtist, isAdmin } from "@/lib/admin-auth";
import { memberLogout } from "@/app/login/actions";
import { getFavorites } from "@/lib/member-extras";
import { logout as ownerLogout } from "@/app/admin/actions";
import { getT } from "@/lib/lang";
import type { Dict } from "@/lib/i18n";

/* 맨 위 검색 칸 옆 "로그인" 자리 (서버에서 로그인 상태 확인)
   - 아무 로그인도 안 함: "로그인" 버튼 → /login
   - 로그인하면 동그란 프사만 보임 (회장: GitHub 프로필 사진 / 회원: 닉네임 첫 글자, 작가는 보라색)
   - 프사를 누르면 작은 메뉴: (회원) 설정 / (회장) 회장 페이지 · 로그아웃
     (이름·프사 바꾸기·내 웹툰 스튜디오는 "설정" 페이지 /settings 안에) */

/** 회장 프사: GitHub 프로필 사진 (site.config.ts 의 ownerGithubLogin 계정) */
function OwnerAvatar() {
  return (
    // GitHub 프로필 사진 주소라 일반 img 를 씀 (next/image 는 허용 주소 설정이 필요해서)
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://github.com/${siteConfig.ownerGithubLogin}.png?size=64`}
      alt=""
      width={32}
      height={32}
      className="size-8 shrink-0 rounded-full border-2 border-primary object-cover"
    />
  );
}

/** 회원 프사: 올린 사진이 있으면 그 사진, 없으면 닉네임 첫 글자 동그라미 (작가는 보라 테두리/배경) */
function LetterAvatar({ name, artist, url }: { name: string; artist: boolean; url?: string | null }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={32}
        height={32}
        className={`size-8 shrink-0 rounded-full object-cover ${artist ? "border-2 border-primary" : "border"}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={
        artist
          ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
          : "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground"
      }
    >
      {name.trim().charAt(0) || "?"}
    </span>
  );
}

/** 프사만 보이고, 누르면 작은 메뉴가 열림 (이름 · 이동 · 로그아웃) */
function AvatarMenu({
  avatar,
  title,
  subtitle,
  link,
  logout,
  hideHeader = false,
  alert = false,
  extra,
  t,
}: {
  t: Dict;
  avatar: React.ReactNode;
  title: string;
  /** 이름 아래 작은 글씨 (없으면 안 보임) */
  subtitle?: string;
  link: { href: string; label: string } | null;
  logout: () => Promise<void>;
  /** true 면 메뉴 맨 위 이름 칸을 숨김 (회장) */
  hideHeader?: boolean;
  /** true 면 프사 오른쪽 위에 빨간 점 (관심 웹툰 새 회차) */
  alert?: boolean;
  /** 이름 칸 아래에 넣을 것 (회원: 프사 바꾸기) */
  extra?: React.ReactNode;
}) {
  return (
    <details className="relative shrink-0">
      <summary
        aria-label={`${title} ${t.nav.menu}`}
        title={title}
        className="flex cursor-pointer list-none rounded-full transition-opacity hover:opacity-90 [&::-webkit-details-marker]:hidden"
      >
        <span className="relative">
          {avatar}
          {alert ? (
            <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-destructive">
              <span className="sr-only">{t.nav.newEpisodeAlert}</span>
            </span>
          ) : null}
        </span>
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border bg-background shadow-xl">
        {hideHeader ? null : (
          <div className="border-b px-4 py-3">
            <p className="truncate text-sm font-semibold">{title}</p>
            {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
        )}
        {extra}
        {link ? (
          <Link
            href={link.href}
            className="flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-muted"
          >
            {link.label}
            {alert ? <span className="text-xs font-semibold text-destructive">{t.nav.newEpisode}</span> : null}
          </Link>
        ) : null}
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" />
            {t.nav.logout}
          </button>
        </form>
      </div>
    </details>
  );
}

export async function UserMenu() {
  const [current, owner, { t }] = await Promise.all([getCurrentArtist(), isAdmin(), getT()]);
  const member = current && current.status !== "blocked" ? current : null;

  // 회원 로그인 (회장보다 먼저: 회원 계정으로 쓰는 중이면 그 계정을 보여줌)
  if (member) {
    const isArtist = member.status === "approved";
    // 관심 웹툰에 새 회차가 나왔으면 빨간 점 (설정 → 관심 웹툰에서 확인)
    const hasNew = (await getFavorites(member.id)).some((f) => f.hasNew);
    return (
      <AvatarMenu
        avatar={<LetterAvatar name={member.name} artist={isArtist} url={member.avatar_url} />}
        title={member.name}
        hideHeader
        link={{ href: "/settings", label: t.nav.settings }}
        t={t}
        logout={memberLogout}
        alert={hasNew}
      />
    );
  }

  // 회장 로그인 → 회장 프사만
  if (owner) {
    return (
      <AvatarMenu
        avatar={<OwnerAvatar />}
        title={t.comments.owner}
        hideHeader
        link={{ href: "/admin", label: t.nav.ownerPage }}
        t={t}
        logout={ownerLogout}
      />
    );
  }

  return (
    <Link
      href="/login"
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
    >
      <LogIn className="size-4" />
      {t.nav.login}
    </Link>
  );
}
