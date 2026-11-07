import "server-only";
import { createHash } from "crypto";
import { cookies } from "next/headers";

import { getAdminClient } from "@/lib/supabase-admin";
import { hashForStorage, matchesStored, normalizeEmail } from "@/lib/admin-auth";
import type { Reader } from "@/lib/types";

/* 독자 계정 (댓글 달기용)
   - 독자가 회차 화면 아래 댓글 칸에서 이메일 + 닉네임 + 비밀번호로 가입 → 바로 댓글 가능 (승인 없음)
   - 비밀번호는 Supabase 의 readers 표에 '알아볼 수 없게 바꾼 형태(scrypt)'로만 저장
   - 회장·작가 로그인과는 따로 기억합니다. */

const READER_COOKIE_NAME = "reader_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30일

type ReaderRow = Reader & { password_hash: string };
type AuthResult = { ok: true } | { ok: false; message: string };

/** 로그인 기억용 표시. 비밀번호가 바뀌면 값이 달라져서 다른 기기의 로그인은 풀립니다. */
function readerSignature(id: string, passwordHash: string) {
  return createHash("sha256").update(`vibe-starter:reader-session:${id}:${passwordHash}`).digest("hex");
}

async function getReaderRow(column: "id" | "email", value: string): Promise<ReaderRow | null> {
  const supabase = getAdminClient();
  if (!supabase) return null;
  const { data } = await supabase.from("readers").select("*").eq(column, value).maybeSingle();
  return (data as ReaderRow | null) ?? null;
}

async function startReaderSessionFor(row: Pick<ReaderRow, "id" | "password_hash">) {
  const store = await cookies();
  store.set(READER_COOKIE_NAME, `${row.id}.${readerSignature(row.id, row.password_hash)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** 지금 로그인한 독자. 로그인 안 했으면 null. 비밀번호 정보는 빼고 돌려줌. */
export async function getCurrentReader(): Promise<Reader | null> {
  const store = await cookies();
  const raw = store.get(READER_COOKIE_NAME)?.value;
  if (!raw) return null;
  const [id, signature] = raw.split(".");
  if (!id || !signature) return null;
  const row = await getReaderRow("id", id);
  if (!row || readerSignature(row.id, row.password_hash) !== signature) return null;
  return { id: row.id, email: row.email, nickname: row.nickname };
}

export async function endReaderSession() {
  const store = await cookies();
  store.delete(READER_COOKIE_NAME);
}

/** 독자 가입 (가입하면 바로 로그인 상태) */
export async function registerReader(email: string, nickname: string, password: string): Promise<AuthResult> {
  const supabase = getAdminClient();
  if (!supabase) return { ok: false, message: "Supabase가 연결되지 않았습니다." };

  const passwordHash = hashForStorage(password);
  const { data, error } = await supabase
    .from("readers")
    .insert({ email: normalizeEmail(email), nickname: nickname.trim(), password_hash: passwordHash })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, message: "이미 가입된 이메일이에요. 로그인해 주세요." };
    return { ok: false, message: `가입 실패: ${error.message}` };
  }
  await startReaderSessionFor({ id: data.id as string, password_hash: passwordHash });
  return { ok: true };
}

/** 독자 로그인 */
export async function loginReader(email: string, password: string): Promise<AuthResult> {
  const row = await getReaderRow("email", normalizeEmail(email));
  if (!row || !matchesStored(password, row.password_hash)) {
    return { ok: false, message: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }
  await startReaderSessionFor(row);
  return { ok: true };
}
