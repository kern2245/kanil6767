import { NextResponse, type NextRequest } from "next/server";

import { siteConfig } from "@/site.config";
import { startAdminSession } from "@/lib/admin-auth";
import { clearAuthCookies, getAuthClient } from "@/lib/supabase-auth";

/* GitHub 로그인 후 돌아오는 주소 (/auth/callback)
   - GitHub 계정이 site.config.ts 의 ownerGithubLogin(kern2245)이면 → 회장 로그인 기억 → /admin
   - 다른 계정이면 → 회장 로그인 안 함 → /admin?error=not-owner */

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const back = (query: string) => NextResponse.redirect(new URL(`/admin${query}`, request.url));

  if (!code) return back("?error=github");

  const supabase = await getAuthClient();
  if (!supabase) return back("?error=supabase");

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  await clearAuthCookies(); // Supabase 임시 로그인 쿠키는 바로 정리

  if (error || !data.user) return back("?error=github");

  const githubLogin = String(data.user.user_metadata?.user_name ?? "").toLowerCase();
  if (githubLogin !== siteConfig.ownerGithubLogin.toLowerCase()) return back("?error=not-owner");

  await startAdminSession();
  return back("");
}
