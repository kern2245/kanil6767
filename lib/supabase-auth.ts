import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/* 회장 "GitHub로 로그인" 전용 Supabase 연결 (서버에서만 실행)
   - Supabase 가 로그인 중에 잠깐 기억해야 하는 값(일회용 확인 코드)을 쿠키에 10분만 보관합니다.
   - 로그인 확인이 끝나면 이 쿠키들은 지우고, 회장 로그인은 lib/admin-auth.ts 의 쿠키로 기억합니다.
   - 쿠키를 쓰기 때문에 서버 액션(actions.ts)이나 app/auth/callback/route.ts 안에서만 부릅니다. */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const STORAGE_KEY = "sb-owner-auth";

export async function getAuthClient() {
  if (!url || !publicKey) return null;
  const store = await cookies();
  return createClient(url, publicKey, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: STORAGE_KEY,
      storage: {
        getItem: (key) => store.get(key)?.value ?? null,
        setItem: (key, value) => {
          store.set(key, value, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 10,
          });
        },
        removeItem: (key) => {
          store.delete(key);
        },
      },
    },
  });
}

/** 로그인 확인이 끝난 뒤 Supabase 로그인용 임시 쿠키를 모두 지움 */
export async function clearAuthCookies() {
  const store = await cookies();
  for (const c of store.getAll()) {
    if (c.name.startsWith(STORAGE_KEY)) store.delete(c.name);
  }
}
