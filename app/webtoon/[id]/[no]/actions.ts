"use server";

/* 회차 화면 아래 댓글 칸의 버튼들이 실제로 하는 일 (서버에서 실행됨)
   - addComment    : 댓글 달기 (로그인한 회원 — 독자·작가 한 계정, 작가면 "작가" 표시 / 회장 — "회장" 표시)
   - deleteComment : 댓글 지우기 (쓴 회원 본인 또는 회장)
   로그인·가입은 맨 위 "로그인"(/login, app/login/actions.ts) */

import { revalidatePath } from "next/cache";

import { getCurrentArtist, isAdmin } from "@/lib/admin-auth";
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

/* ---------- 댓글 달기 / 지우기 ---------- */

/** 지금 댓글을 다는 사람: 로그인한 회원(막힌 계정 제외) → 회원 / 회장 로그인 → 회장 (이 순서)
    회원 댓글은 artist_id 에 기록 (작가로 승급된 회원이면 화면에 "작가" 표시) */
async function getCommenter() {
  const member = await getCurrentArtist();
  if (member && member.status !== "blocked") return { kind: "artist" as const, id: member.id, name: member.name };
  if (await isAdmin()) return { kind: "owner" as const, id: null, name: "회장" };
  return null;
}

export async function addComment(_prev: CommentActionState, formData: FormData): Promise<CommentActionState> {
  const commenter = await getCommenter();
  if (!commenter) return { message: "로그인이 필요해요. 새로고침 후 다시 로그인해 주세요." };

  const episodeId = String(formData.get("episodeId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!episodeId) return { message: "회차 정보가 없어요. 새로고침 후 다시 해 주세요." };
  if (!body) return { message: "댓글 내용을 입력해 주세요." };
  if (body.length > MAX_COMMENT_LENGTH) return { message: `댓글은 ${MAX_COMMENT_LENGTH}글자까지 쓸 수 있어요.` };

  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다." };

  const { error } = await supabase.from("comments").insert({
    episode_id: episodeId,
    // 회원 댓글이면 artist_id, 회장 댓글이면 is_owner 에 기록
    artist_id: commenter.kind === "artist" ? commenter.id : null,
    ...(commenter.kind === "owner" ? { is_owner: true } : {}),
    author_name: commenter.name,
    body,
  });
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
    const commenter = await getCommenter();
    if (!commenter || commenter.kind === "owner") return;
    // 내 댓글만 지워지도록 artist_id 도 같이 확인
    await supabase.from("comments").delete().eq("id", commentId).eq("artist_id", commenter.id);
  }
  refresh(formData);
}
