import "server-only";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import { getAdminClient } from "@/lib/supabase-admin";

/* 간단한 관리자 로그인
   - 비밀번호는 .env.local 의 ADMIN_PASSWORD 값
   - 로그인하면 8시간 동안 유지되는 쿠키를 저장
   - 아래쪽에 작가 로그인(ARTIST_PASSWORD)도 따로 있음 */

const COOKIE_NAME = "admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function hash(value: string) {
  return createHash("sha256").update(`vibe-starter:${value}`).digest();
}

/** 관리자 비밀번호가 .env.local 에 설정되어 있는지 */
export function isAdminPasswordSet() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

/** 입력한 비밀번호가 맞는지 */
export function checkPassword(input: string) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  return timingSafeEqual(hash(input), hash(password));
}

function sessionToken() {
  const password = process.env.ADMIN_PASSWORD;
  return password ? hash(`session:${password}`).toString("hex") : null;
}

/** 지금 접속한 사람이 로그인한 관리자인지 */
export async function isAdmin() {
  const token = sessionToken();
  if (!token) return false;
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === token;
}

export async function startAdminSession() {
  const token = sessionToken();
  if (!token) return;
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/* ---------- 작가 로그인 (웹툰·회차 올리기 전용) ----------
   - 작가 비밀번호는 회장 페이지 "작가" 탭에서 정합니다. (작가들끼리 같이 씀)
     Supabase 의 site_secrets 표에 '알아볼 수 없게 바꾼 형태(scrypt)'로만 저장됩니다.
   - .env.local / Vercel 의 ARTIST_PASSWORD 가 있으면 그것도 같이 통합니다.
   - 관리자(회장) 로그인과는 따로 기억합니다. 관리자 확인(isAdmin)은 위 그대로. */

const ARTIST_COOKIE_NAME = "artist_session";
const ARTIST_SECRET_KEY = "artist_password";

/** 비밀번호 → 저장용 문자열 "scrypt$소금$결과" (원래 비밀번호는 저장하지 않음) */
function hashForStorage(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 32).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function matchesStored(input: string, stored: string) {
  const [kind, salt, derived] = stored.split("$");
  if (kind !== "scrypt" || !salt || !derived) return false;
  const expected = Buffer.from(derived, "hex");
  const actual = scryptSync(input, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** 회장 페이지에서 정한 작가 비밀번호(저장용 문자열). 없으면 null. */
async function getStoredArtistSecret(): Promise<string | null> {
  const supabase = getAdminClient();
  if (!supabase) return null;
  const { data } = await supabase.from("site_secrets").select("value").eq("key", ARTIST_SECRET_KEY).maybeSingle();
  return (data?.value as string | undefined) ?? null;
}

/** 작가 비밀번호 저장 (회장만 부르도록 actions.ts 에서 isAdmin 확인 후 호출) */
export async function saveArtistPasswordToStore(password: string) {
  const supabase = getAdminClient();
  if (!supabase) return { ok: false as const, message: "Supabase가 연결되지 않았습니다." };
  const { error } = await supabase
    .from("site_secrets")
    .upsert({ key: ARTIST_SECRET_KEY, value: hashForStorage(password), updated_at: new Date().toISOString() });
  if (error) return { ok: false as const, message: `저장 실패: ${error.message}` };
  return { ok: true as const };
}

/** 작가 비밀번호가 정해져 있는지 (회장 페이지에서 정했거나, 환경변수에 있거나) */
export async function isArtistPasswordSet() {
  if (process.env.ARTIST_PASSWORD) return true;
  return Boolean(await getStoredArtistSecret());
}

/** 입력한 작가 비밀번호가 맞는지 */
export async function checkArtistPassword(input: string) {
  const stored = await getStoredArtistSecret();
  if (stored && matchesStored(input, stored)) return true;
  const envPassword = process.env.ARTIST_PASSWORD;
  return Boolean(envPassword) && timingSafeEqual(hash(input), hash(envPassword!));
}

/** 로그인 기억용 표시. 회장이 비밀번호를 바꾸면 값이 달라져서 기존 작가 로그인은 풀립니다. */
async function artistSessionToken() {
  const stored = await getStoredArtistSecret();
  if (stored) return hash(`artist-session:${stored}`).toString("hex");
  const envPassword = process.env.ARTIST_PASSWORD;
  return envPassword ? hash(`artist-session:${envPassword}`).toString("hex") : null;
}

/** 지금 접속한 사람이 로그인한 작가인지 */
export async function isArtist() {
  const token = await artistSessionToken();
  if (!token) return false;
  const store = await cookies();
  return store.get(ARTIST_COOKIE_NAME)?.value === token;
}

export async function startArtistSession() {
  const token = await artistSessionToken();
  if (!token) return;
  const store = await cookies();
  store.set(ARTIST_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endArtistSession() {
  const store = await cookies();
  store.delete(ARTIST_COOKIE_NAME);
}
