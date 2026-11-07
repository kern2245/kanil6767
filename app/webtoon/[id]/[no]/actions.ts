"use server";

/* 회차 화면 아래 댓글 칸의 버튼들이 실제로 하는 일 (서버에서 실행됨)
   - readerSignup / readerLogin / readerLogout : 독자 가입·로그인·로그아웃
   - addComment    : 댓글 달기 (로그인한 독자만)
   - deleteComment : 댓글 지우기 (쓴 독자 본인 또는 회장) */

import { revalidatePath } from "next/cache";

import { isAdmin } from "@/lib/admin-auth";
import { endReaderSession, getCurrentReader, loginReader, registerReader } from "@/lib/reader-auth";
import { getAdminClient } from "@/lib/supabase-admin";

export type CommentActionState = { ok?: boolean; message?: string };

const MAX_COMMENT_LENGTH = 500;

/** 화면에서 보내온 회차 주소(/webtoon/웹툰번호/회차번호)만 새로고침 대상으로 허용 */
function episodePath(formData: FormData) {
  const path = String(formData.get("path") ?? "");
  return /^\/webtoon\/[\w-]+\/\d+$/.test(path) ? path : null;
}

function refresh(formData: FormData) {
  const path = episodePath(formData);
  if (path) revalidatePath(path);
}

/* ---------- 독자 가입 / 로그인 / 로그아웃 ---------- */

export async function readerSignup(_prev: CommentActionState, formData: FormData): Promise<CommentActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { message: "이메일 주소를 정확히 입력해 주세요." };
  if (!nickname) return { message: "닉네임을 입력해 주세요." };
  if (nickname.length > 20) return { message: "닉네임은 20글자까지 쓸 수 있어요." };
  if (password.length < 4) return { message: "비밀번호는 4글자 이상으로 정해 주세요." };
  if (password !== confirm) return { message: "두 칸의 비밀번호가 서로 다릅니다." };

  const result = await registerReader(email, nickname, password);
  if (!result.ok) return { message: result.message };
  refresh(formData);
  return { ok: true };
}

export async function readerLogin(_prev: CommentActionState, formData: FormData): Promise<CommentActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await loginReader(email, password);
  if (!result.ok) return { message: result.message };
  refresh(formData);
  return { ok: true };
}

export async function readerLogout(formData: FormData) {
  await endReaderSession();
  refresh(formData);
}

/* ---------- 댓글 달기 / 지우기 ---------- */

export async function addComment(_prev: CommentActionState, formData: FormData): Promise<CommentActionState> {
  const reader = await getCurrentReader();
  if (!reader) return { message: "로그인이 필요해요. 새로고침 후 다시 로그인해 주세요." };

  const episodeId = String(formData.get("episodeId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!episodeId) return { message: "회차 정보가 없어요. 새로고침 후 다시 해 주세요." };
  if (!body) return { message: "댓글 내용을 입력해 주세요." };
  if (body.length > MAX_COMMENT_LENGTH) return { message: `댓글은 ${MAX_COMMENT_LENGTH}글자까지 쓸 수 있어요.` };

  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다." };

  const { error } = await supabase
    .from("comments")
    .insert({ episode_id: episodeId, reader_id: reader.id, author_name: reader.nickname, body });
  if (error) return { message: `댓글 저장 실패: ${error.message}` };

  refresh(formData);
  return { ok: true };
}

export async function deleteComment(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "");
  if (!commentId) return;
  const supabase = getAdminClient();
  if (!supabase) return;

  if (await isAdmin()) {
    await supabase.from("comments").delete().eq("id", commentId);
  } else {
    const reader = await getCurrentReader();
    if (!reader) return;
    // 내 댓글만 지워지도록 reader_id 도 같이 확인
    await supabase.from("comments").delete().eq("id", commentId).eq("reader_id", reader.id);
  }
  refresh(formData);
}
