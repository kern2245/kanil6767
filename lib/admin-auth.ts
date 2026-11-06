import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

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
   - 비밀번호는 .env.local 의 ARTIST_PASSWORD 값 (작가들끼리 같이 씀)
   - 관리자(회장) 로그인과는 따로 기억합니다. 관리자 확인(isAdmin)은 위 그대로. */

const ARTIST_COOKIE_NAME = "artist_session";

/** 작가 비밀번호가 .env.local 에 설정되어 있는지 */
export function isArtistPasswordSet() {
  return Boolean(process.env.ARTIST_PASSWORD);
}

/** 입력한 작가 비밀번호가 맞는지 */
export function checkArtistPassword(input: string) {
  const password = process.env.ARTIST_PASSWORD;
  if (!password) return false;
  return timingSafeEqual(hash(input), hash(password));
}

function artistSessionToken() {
  const password = process.env.ARTIST_PASSWORD;
  return password ? hash(`artist-session:${password}`).toString("hex") : null;
}

/** 지금 접속한 사람이 로그인한 작가인지 */
export async function isArtist() {
  const token = artistSessionToken();
  if (!token) return false;
  const store = await cookies();
  return store.get(ARTIST_COOKIE_NAME)?.value === token;
}

export async function startArtistSession() {
  const token = artistSessionToken();
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
