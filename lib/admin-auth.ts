import "server-only";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import { siteConfig } from "@/site.config";
import { getAdminClient } from "@/lib/supabase-admin";
import type { Artist } from "@/lib/types";

/* 회장(관리자) 로그인
   - 회장은 "GitHub로 로그인"으로만 들어옵니다. site.config.ts 의 ownerGithubLogin 계정만 통과.
     (GitHub 계정 확인은 app/auth/callback/route.ts 에서 하고, 통과하면 startAdminSession 호출)
   - 회장 비밀번호로 들어가는 방법은 없앴습니다. .env.local 의 ADMIN_PASSWORD 는
     '로그인 기억 쿠키'를 다른 사람이 흉내 내지 못하게 하는 서버 비밀값으로만 씁니다.
   - 로그인하면 8시간 동안 유지되는 쿠키를 저장
   - 아래쪽에 작가 계정(작가마다 이메일+비밀번호, 회장 승인)도 따로 있음 */

const COOKIE_NAME = "admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function hash(value: string) {
  return createHash("sha256").update(`vibe-starter:${value}`).digest();
}

/** 서버 비밀값(ADMIN_PASSWORD)이 .env.local / Vercel 에 설정되어 있는지 */
export function isAdminPasswordSet() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

/** 회장 로그인 기억 값 — GitHub 회장 계정 + 서버 비밀값으로 만듦 (예전 비밀번호 로그인 쿠키는 더 이상 안 통함) */
function sessionToken() {
  const secret = process.env.ADMIN_PASSWORD;
  return secret ? hash(`owner-session:github:${siteConfig.ownerGithubLogin.toLowerCase()}:${secret}`).toString("hex") : null;
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


/* ---------- 회원 계정 (독자·작가 한 계정, 이메일 + 비밀번호) ----------
   - 누구나 맨 위 "로그인"(/login)에서 가입 → 독자(member). 댓글 가능
   - 회장이 "회원" 탭에서 "작가로 승급"(approved) 해야 웹툰을 올릴 수 있음
   - 비밀번호는 Supabase 의 artists 표에 '알아볼 수 없게 바꾼 형태(scrypt)'로만 저장
   - 관리자(회장) 로그인과는 따로 기억합니다. 관리자 확인(isAdmin)은 위 그대로. */

const ARTIST_COOKIE_NAME = "artist_session";
/** 회원 로그인 유지 기간: 30일 */
const MEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** 비밀번호 → 저장용 문자열 "scrypt$소금$결과" (원래 비밀번호는 저장하지 않음) */
export function hashForStorage(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 32).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function matchesStored(input: string, stored: string) {
  const [kind, salt, derived] = stored.split("$");
  if (kind !== "scrypt" || !salt || !derived) return false;
  const expected = Buffer.from(derived, "hex");
  const actual = scryptSync(input, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** 이메일은 소문자·앞뒤 공백 없이 저장/비교 */
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

type ArtistRow = Artist & { password_hash: string; failed_logins?: number; locked_until?: string | null };

/* ---------- 해킹 막기 규칙 ----------
   - 새 비밀번호는 8글자 이상
   - 로그인 비밀번호를 5번 연속 틀리면 10분 동안 그 계정 로그인 잠금
   - 비밀번호를 바꾸려면 지금 비밀번호를 한 번 더 확인
   - 비밀번호를 바꾸면 다른 기기의 로그인은 자동으로 풀림 (로그인 기억 값에 비밀번호 정보가 들어 있어서)
   - 닉네임은 다른 회원과 겹치면 안 되고, "회장"·"관리자"처럼 사칭할 수 있는 이름은 못 씀 */

export const MIN_PASSWORD_LENGTH = 8;
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 10;
const FORBIDDEN_NAMES = ["회장", "관리자", "운영자", "운영진", "admin", "administrator", "세카이", "sekai"];

/** 새 비밀번호 검사 (괜찮으면 null, 아니면 안내 문구) */
export function checkNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `비밀번호는 ${MIN_PASSWORD_LENGTH}글자 이상으로 정해 주세요.`;
  if (password.length > 100) return "비밀번호가 너무 길어요.";
  if (!/[A-Za-z가-힣]/.test(password) || !/\d/.test(password)) return "비밀번호에 글자와 숫자를 섞어 주세요.";
  if (password !== confirm) return "두 칸의 비밀번호가 서로 다릅니다.";
  return null;
}

/** 닉네임 검사: 1~20글자, 사칭 금지, 다른 회원과 겹치면 안 됨 (괜찮으면 null) */
export async function checkNickname(name: string, selfId?: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return "닉네임을 입력해 주세요.";
  if (trimmed.length > 20) return "닉네임은 20글자까지 쓸 수 있어요.";
  const plain = trimmed.replace(/\s/g, "").toLowerCase();
  if (FORBIDDEN_NAMES.some((w) => plain.includes(w))) return "그 닉네임은 쓸 수 없어요. (회장·관리자 등 사칭 방지)";
  const supabase = getAdminClient();
  if (!supabase) return "Supabase가 연결되지 않았습니다.";
  // % 와 _ 는 검색 기호라서 글자 그대로 비교하도록 앞에 \ 를 붙임 (대소문자 무시하고 같은 이름 찾기)
  const escaped = trimmed.replace(/[\\%_]/g, (c) => "\\" + c);
  const { data } = await supabase.from("artists").select("id").ilike("name", escaped);
  if ((data ?? []).some((row: { id: string }) => row.id !== selfId)) return "이미 다른 회원이 쓰는 닉네임이에요.";
  return null;
}

/** 로그인 기억용 표시. 비밀번호를 바꾸면 값이 달라져서 다른 기기의 로그인은 풀립니다. */
function artistSignature(id: string, passwordHash: string) {
  return hash(`artist-session:${id}:${passwordHash}`).toString("hex");
}

async function getArtistRow(column: "id" | "email", value: string): Promise<ArtistRow | null> {
  const supabase = getAdminClient();
  if (!supabase) return null;
  const { data } = await supabase.from("artists").select("*").eq(column, value).maybeSingle();
  return (data as ArtistRow | null) ?? null;
}

/** 지금 로그인한 작가 (상태 상관없이). 로그인 안 했으면 null. 비밀번호 정보는 빼고 돌려줌. */
export async function getCurrentArtist(): Promise<Artist | null> {
  const store = await cookies();
  const raw = store.get(ARTIST_COOKIE_NAME)?.value;
  if (!raw) return null;
  const [id, signature] = raw.split(".");
  if (!id || !signature) return null;
  const row = await getArtistRow("id", id);
  if (!row || artistSignature(row.id, row.password_hash) !== signature) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    status: row.status,
    created_at: row.created_at,
    avatar_url: row.avatar_url ?? null,
  };
}

/** 지금 접속한 회원이 웹툰을 올릴 수 있으면 그 회원 id (독자·작가 모두 가능, 막힌 계정만 안 됨)
    ("작가" 승급은 이름 앞 "작가" 표시 + 작가 커뮤니티 입장) */
export async function getApprovedArtistId(): Promise<string | null> {
  const artist = await getCurrentArtist();
  return artist && artist.status !== "blocked" ? artist.id : null;
}

async function startArtistSessionFor(row: Pick<ArtistRow, "id" | "password_hash">) {
  const store = await cookies();
  store.set(ARTIST_COOKIE_NAME, `${row.id}.${artistSignature(row.id, row.password_hash)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MEMBER_MAX_AGE_SECONDS,
  });
}

export async function endArtistSession() {
  const store = await cookies();
  store.delete(ARTIST_COOKIE_NAME);
}

type AuthResult = { ok: true } | { ok: false; message: string };

/** 회원 가입 (독자 = member 상태로 만들고 바로 로그인 상태로 기억. 작가 승급은 회장이 "회원" 탭에서) */
export async function registerArtist(email: string, name: string, password: string): Promise<AuthResult> {
  const supabase = getAdminClient();
  if (!supabase) return { ok: false, message: "Supabase가 연결되지 않았습니다." };
  if (password.length < MIN_PASSWORD_LENGTH) return { ok: false, message: `비밀번호는 ${MIN_PASSWORD_LENGTH}글자 이상으로 정해 주세요.` };
  const nameError = await checkNickname(name);
  if (nameError) return { ok: false, message: nameError };

  const passwordHash = hashForStorage(password);
  const { data, error } = await supabase
    .from("artists")
    .insert({ email: normalizeEmail(email), name: name.trim(), password_hash: passwordHash, status: "member" })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, message: "이미 가입된 이메일이에요. 로그인해 주세요." };
    return { ok: false, message: `가입 실패: ${error.message}` };
  }
  await startArtistSessionFor({ id: data.id as string, password_hash: passwordHash });
  return { ok: true };
}

/** 회원 로그인 (막힌 계정은 로그인 불가, 5번 틀리면 10분 잠금) */
export async function loginArtist(email: string, password: string): Promise<AuthResult> {
  const wrong = { ok: false as const, message: "이메일 또는 비밀번호가 올바르지 않습니다." };
  const row = await getArtistRow("email", normalizeEmail(email));
  if (!row) return wrong;

  const supabase = getAdminClient();
  const lockedUntil = row.locked_until ? new Date(row.locked_until).getTime() : 0;
  if (lockedUntil > Date.now()) {
    const minutes = Math.ceil((lockedUntil - Date.now()) / 60000);
    return { ok: false, message: `비밀번호를 여러 번 틀려서 잠겼어요. ${minutes}분 뒤에 다시 해 주세요.` };
  }

  if (!matchesStored(password, row.password_hash)) {
    const failed = (row.failed_logins ?? 0) + 1;
    if (supabase) {
      await supabase
        .from("artists")
        .update(
          failed >= MAX_FAILED_LOGINS
            ? { failed_logins: 0, locked_until: new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() }
            : { failed_logins: failed },
        )
        .eq("id", row.id);
    }
    if (failed >= MAX_FAILED_LOGINS) {
      return { ok: false, message: `비밀번호를 ${MAX_FAILED_LOGINS}번 틀려서 ${LOCK_MINUTES}분 동안 잠겼어요.` };
    }
    return { ok: false, message: `${wrong.message} (${MAX_FAILED_LOGINS - failed}번 더 틀리면 ${LOCK_MINUTES}분 잠금)` };
  }

  if (row.status === "blocked") return { ok: false, message: "회장이 막은 계정이에요. 회장에게 문의해 주세요." };
  if (supabase && ((row.failed_logins ?? 0) > 0 || row.locked_until)) {
    await supabase.from("artists").update({ failed_logins: 0, locked_until: null }).eq("id", row.id);
  }
  await startArtistSessionFor(row);
  return { ok: true };
}

/** 본인 비밀번호 바꾸기 — 지금 비밀번호가 맞아야 함. 바꾼 기기는 계속 로그인, 다른 기기는 로그인 풀림 */
export async function changeOwnArtistPassword(
  artistId: string,
  currentPassword: string,
  newPassword: string,
): Promise<AuthResult> {
  const supabase = getAdminClient();
  if (!supabase) return { ok: false, message: "Supabase가 연결되지 않았습니다." };
  const row = await getArtistRow("id", artistId);
  if (!row || !matchesStored(currentPassword, row.password_hash)) {
    return { ok: false, message: "지금 비밀번호가 맞지 않아요." };
  }
  const passwordHash = hashForStorage(newPassword);
  const { error } = await supabase.from("artists").update({ password_hash: passwordHash }).eq("id", artistId);
  if (error) return { ok: false, message: `저장 실패: ${error.message}` };
  await startArtistSessionFor({ id: artistId, password_hash: passwordHash });
  return { ok: true };
}

/** 본인 닉네임 바꾸기 (겹침·사칭 검사) */
export async function changeOwnNickname(artistId: string, name: string): Promise<AuthResult> {
  const supabase = getAdminClient();
  if (!supabase) return { ok: false, message: "Supabase가 연결되지 않았습니다." };
  const nameError = await checkNickname(name, artistId);
  if (nameError) return { ok: false, message: nameError };
  const { error } = await supabase.from("artists").update({ name: name.trim() }).eq("id", artistId);
  if (error) return { ok: false, message: `저장 실패: ${error.message}` };
  return { ok: true };
}

/* ---------- 구글 · 카카오로 로그인 (회원) ----------
   - 구글/카카오가 "확인된 이메일"이라고 알려준 계정만 받음 (가짜 이메일 가입 막기)
   - 같은 이메일로 이미 가입한 회원이 있으면 그 계정으로 로그인 (계정 하나로 이어짐)
   - 처음이면 회원(독자)으로 새로 만듦: 닉네임은 구글/카카오 이름 (겹치거나 사칭이면 뒤에 숫자),
     프사는 구글/카카오 프로필 사진, 비밀번호는 아무도 모르는 무작위 값 (이메일 로그인은 안 되고 소셜 로그인으로만) */

export async function loginWithSocialAccount(input: {
  email: string;
  name: string;
  avatarUrl: string | null;
}): Promise<AuthResult> {
  const supabase = getAdminClient();
  if (!supabase) return { ok: false, message: "Supabase가 연결되지 않았습니다." };
  const email = normalizeEmail(input.email);

  const existing = await getArtistRow("email", email);
  if (existing) {
    if (existing.status === "blocked") return { ok: false, message: "회장이 막은 계정이에요. 회장에게 문의해 주세요." };
    if (!existing.avatar_url && input.avatarUrl) {
      await supabase.from("artists").update({ avatar_url: input.avatarUrl }).eq("id", existing.id);
    }
    await startArtistSessionFor(existing);
    return { ok: true };
  }

  // 닉네임 정하기: 이름 그대로 → 안 되면 이름+숫자 → 그래도 안 되면 "회원+숫자"
  const base = input.name.trim().slice(0, 16) || "회원";
  let name = base;
  for (let i = 0; i < 20 && (await checkNickname(name)); i++) {
    name = `${i < 10 ? base : "회원"}${Math.floor(1000 + Math.random() * 9000)}`;
  }
  if (await checkNickname(name)) return { ok: false, message: "닉네임을 정하지 못했어요. 다시 시도해 주세요." };

  const passwordHash = hashForStorage(randomBytes(24).toString("hex"));
  const { data, error } = await supabase
    .from("artists")
    .insert({ email, name, password_hash: passwordHash, status: "member", avatar_url: input.avatarUrl })
    .select("id")
    .single();
  if (error) return { ok: false, message: `가입 실패: ${error.message}` };
  await startArtistSessionFor({ id: data.id as string, password_hash: passwordHash });
  return { ok: true };
}
