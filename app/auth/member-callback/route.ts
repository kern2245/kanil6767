import { NextResponse, type NextRequest } from "next/server";

import { loginWithSocialAccount } from "@/lib/admin-auth";
import { clearAuthCookies, getAuthClient } from "@/lib/supabase-auth";
import { safeNextPath } from "@/lib/safe-path";

/* 구글 · 카카오 로그인 후 돌아오는 주소 (/auth/member-callback) — 회원(독자·작가) 전용
   - 구글/카카오가 "확인된 이메일"을 알려준 계정만 받음 (가짜 이메일 막기)
   - 같은 이메일 회원이 있으면 그 계정으로, 없으면 새 회원으로 → 원래 보던 곳(next)으로 돌아감
   (회장 GitHub 로그인은 따로: app/auth/callback/route.ts) */

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/login?error=${reason}&next=${encodeURIComponent(next)}`, request.url));

  if (!code) return fail("social");

  const supabase = await getAuthClient();
  if (!supabase) return fail("supabase");

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  await clearAuthCookies(); // Supabase 임시 로그인 쿠키는 바로 정리 (회원 로그인은 우리 쿠키로 기억)
  if (error || !data.user) return fail("social");

  const user = data.user;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const email = user.email ?? (typeof meta.email === "string" ? meta.email : "");
  // 구글/카카오가 이메일을 확인해 준 경우만 (확인 안 된 이메일로 남의 계정에 들어가는 것 막기)
  const verified = Boolean(user.email_confirmed_at) || meta.email_verified === true;
  if (!email) return fail("no-email");
  if (!verified) return fail("unverified");

  const name = String(meta.full_name ?? meta.name ?? meta.nickname ?? meta.preferred_username ?? "").trim();
  const avatar = String(meta.avatar_url ?? meta.picture ?? "");
  const result = await loginWithSocialAccount({
    email,
    name,
    avatarUrl: avatar.startsWith("https://") ? avatar : null,
  });
  if (!result.ok) return fail(result.message.includes("막은") ? "blocked" : "social");

  return NextResponse.redirect(new URL(next, request.url));
}
