"use server";

/* 회차 화면 아래 댓글 칸의 버튼들이 실제로 하는 일 (서버에서 실행됨)
   - addComment    : 댓글 달기 (로그인한 회원 — 독자·작가 한 계정, 작가면 "작가" 표시 / 회장 — "회장" 표시)
   - deleteComment : 댓글 지우기 (쓴 회원 본인 또는 회장)
   - toggleReaction : 회차 좋아요 / 싫어요 누르기·취소 (로그인한 회원)
   - recordView     : 조회수 기록 (하루 1번 · 작가 본인·봇 제외 · 5초 머문 뒤)
   로그인·가입은 맨 위 "로그인"(/login, app/login/actions.ts) */

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";

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

/* ---------- 좋아요 / 싫어요 ----------
   로그인한 회원만. 회차마다 하나만 고를 수 있고, 같은 걸 한 번 더 누르면 취소, 다른 걸 누르면 바뀜 */

export async function toggleReaction(formData: FormData) {
  const me = await getCurrentArtist();
  if (!me || me.status === "blocked") return;
  const episodeId = String(formData.get("episodeId") ?? "");
  const reaction = String(formData.get("reaction") ?? "");
  if (!episodeId || (reaction !== "like" && reaction !== "dislike")) return;
  const supabase = getAdminClient();
  if (!supabase) return;

  const { data: existing } = await supabase
    .from("episode_reactions")
    .select("reaction")
    .eq("episode_id", episodeId)
    .eq("member_id", me.id)
    .maybeSingle();

  if (existing?.reaction === reaction) {
    // 같은 걸 다시 누름 → 취소
    await supabase.from("episode_reactions").delete().eq("episode_id", episodeId).eq("member_id", me.id);
  } else {
    // 처음 누르거나 반대로 바꿈
    await supabase
      .from("episode_reactions")
      .upsert({ episode_id: episodeId, member_id: me.id, reaction }, { onConflict: "episode_id,member_id" });
  }
  refresh(formData);
}

/* ---------- 조회수 (주작 막기) ----------
   - 회차 화면에 5초 이상 머물면 화면이 이걸 한 번 부름 (episode-view-counter.tsx)
   - 같은 사람은 한 회차를 하루(한국 날짜)에 1번만 셈: 로그인 회원은 회원번호, 아니면 브라우저 익명번호(쿠키 1년)
   - 작가 본인(그 웹툰을 올린 회원), 회장이 올린 웹툰을 회장이 보는 것, 봇(검색 로봇 등)은 안 셈 */

const VIEWER_COOKIE = "viewer_id";
const BOT_PATTERN = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i;

export async function recordView(episodeId: string) {
  if (!episodeId) return;
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  if (!ua || BOT_PATTERN.test(ua)) return; // 봇은 안 셈

  const supabase = getAdminClient();
  if (!supabase) return;

  const { data: episode } = await supabase
    .from("episodes")
    .select("id, webtoons(artist_id)")
    .eq("id", episodeId)
    .maybeSingle();
  if (!episode) return;
  const webtoon = (Array.isArray(episode.webtoons) ? episode.webtoons[0] : episode.webtoons) as
    | { artist_id: string | null }
    | null;

  const me = await getCurrentArtist();
  const member = me && me.status !== "blocked" ? me : null;
  // 작가 본인 조회는 안 셈
  if (member && webtoon?.artist_id === member.id) return;
  if (!webtoon?.artist_id && (await isAdmin())) return;

  // 누가 봤는지 구분하는 값 (로그인 회원 / 브라우저 익명번호)
  let viewerKey: string;
  if (member) {
    viewerKey = `m:${member.id}`;
  } else {
    const store = await cookies();
    let anon = store.get(VIEWER_COOKIE)?.value;
    if (!anon || !/^[\w-]{10,64}$/.test(anon)) {
      anon = randomUUID();
      store.set(VIEWER_COOKIE, anon, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    viewerKey = `a:${anon}`;
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  // 같은 사람·같은 날이면 이미 있으니 무시됨 (하루 1번)
  await supabase
    .from("episode_views")
    .upsert(
      { episode_id: episodeId, viewer_key: viewerKey, view_date: today },
      { onConflict: "episode_id,viewer_key,view_date", ignoreDuplicates: true },
    );
}
