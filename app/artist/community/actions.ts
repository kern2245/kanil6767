"use server";

/* 작가 커뮤니티 버튼들이 실제로 하는 일 (서버에서 실행됨)
   - createPost / deletePost       : 글 쓰기 / 지우기
   - createComment / deleteComment : 댓글 쓰기 / 지우기
   모두 "승인된 작가 또는 회장"인지 먼저 확인하고, 지우기는 내 것 또는 회장만. */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { authorFields, canDeleteRow, getCommunityViewer } from "@/lib/community";
import { getAdminClient } from "@/lib/supabase-admin";

export type CommunityActionState = { ok?: boolean; message?: string };

const NO_ACCESS = "승인된 작가 또는 회장만 쓸 수 있어요. 새로고침 후 다시 로그인해 주세요.";

export async function createPost(_prev: CommunityActionState, formData: FormData): Promise<CommunityActionState> {
  const viewer = await getCommunityViewer();
  if (!viewer) return { message: NO_ACCESS };
  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다." };

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const anonymous = formData.get("anonymous") === "on";
  if (!title) return { message: "제목을 입력해 주세요." };
  if (title.length > 100) return { message: "제목은 100글자까지 쓸 수 있어요." };
  if (!body) return { message: "내용을 입력해 주세요." };
  if (body.length > 5000) return { message: "내용은 5000글자까지 쓸 수 있어요." };

  const { data, error } = await supabase
    .from("community_posts")
    .insert({ title, body, ...authorFields(viewer, anonymous) })
    .select("id")
    .single();
  if (error) return { message: `저장 실패: ${error.message}` };

  revalidatePath("/artist/community");
  redirect(`/artist/community/${data.id}`);
}

export async function deletePost(formData: FormData) {
  const viewer = await getCommunityViewer();
  const supabase = getAdminClient();
  const id = String(formData.get("id") ?? "");
  if (!viewer || !supabase || !id) return;

  const { data: post } = await supabase
    .from("community_posts")
    .select("author_artist_id, is_owner, is_anonymous")
    .eq("id", id)
    .maybeSingle();
  if (!post || !canDeleteRow(post, viewer)) return;

  await supabase.from("community_posts").delete().eq("id", id); // 댓글도 함께 지워짐
  revalidatePath("/artist/community");
  redirect("/artist/community");
}

export async function createComment(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const viewer = await getCommunityViewer();
  if (!viewer) return { message: NO_ACCESS };
  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다." };

  const postId = String(formData.get("postId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const anonymous = formData.get("anonymous") === "on";
  if (!postId) return { message: "글 정보가 없어요. 새로고침 후 다시 해 주세요." };
  if (!body) return { message: "댓글 내용을 입력해 주세요." };
  if (body.length > 1000) return { message: "댓글은 1000글자까지 쓸 수 있어요." };

  const { error } = await supabase
    .from("community_comments")
    .insert({ post_id: postId, body, ...authorFields(viewer, anonymous) });
  if (error) return { message: `댓글 저장 실패: ${error.message}` };

  revalidatePath(`/artist/community/${postId}`);
  revalidatePath("/artist/community");
  return { ok: true };
}

export async function deleteComment(formData: FormData) {
  const viewer = await getCommunityViewer();
  const supabase = getAdminClient();
  const id = String(formData.get("id") ?? "");
  if (!viewer || !supabase || !id) return;

  const { data: comment } = await supabase
    .from("community_comments")
    .select("post_id, author_artist_id, is_owner, is_anonymous")
    .eq("id", id)
    .maybeSingle();
  if (!comment || !canDeleteRow(comment, viewer)) return;

  await supabase.from("community_comments").delete().eq("id", id);
  revalidatePath(`/artist/community/${comment.post_id}`);
  revalidatePath("/artist/community");
}
