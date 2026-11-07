import "server-only";

import { getCurrentArtist, isAdmin } from "@/lib/admin-auth";
import { getAdminClient } from "@/lib/supabase-admin";

/* 작가 커뮤니티 (승인된 작가 + 회장만)
   - 글·댓글은 Supabase 의 community_posts / community_comments 표 (방문자는 읽을 수 없는 표, 서버 비밀 키로만)
   - 익명 글·댓글: 작가들에게는 "익명"으로만 보이고, 회장에게만 실명이 같이 보임
     → 실명(작가 id·이름)은 서버에서 빼고 화면으로 보내므로, 브라우저에서 몰래 볼 수도 없음
   - 지우기: 내가 쓴 글·댓글 또는 회장 */

/** 지금 커뮤니티를 보고 있는 사람 */
export type CommunityViewer = {
  /** 승인된 작가로 로그인했으면 그 작가 id (회장으로만 들어왔으면 null) */
  artistId: string | null;
  /** 회장 로그인 여부 (실명 보기·모든 글 지우기) */
  isOwner: boolean;
  /** 글을 쓸 때 실명으로 보일 이름 */
  name: string;
};

/** 커뮤니티에 들어올 수 있는 사람인지 확인. 승인된 작가 또는 회장이 아니면 null */
export async function getCommunityViewer(): Promise<CommunityViewer | null> {
  const [artist, owner] = await Promise.all([getCurrentArtist(), isAdmin()]);
  if (artist?.status === "approved") return { artistId: artist.id, isOwner: owner, name: artist.name };
  if (owner) return { artistId: null, isOwner: true, name: "회장" };
  return null;
}

/** 화면에 보내는 글 (실명은 볼 수 있는 사람에게만 들어감) */
export type CommunityPostView = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  /** 화면에 보일 이름: "익명" 또는 작가 이름 / "회장" */
  displayName: string;
  /** 익명 글일 때 회장에게만 보이는 실명 */
  realNameForOwner: string | null;
  isAnonymous: boolean;
  /** 내 글이면 true (지우기 버튼) */
  isMine: boolean;
  canDelete: boolean;
  commentCount: number;
};

export type CommunityCommentView = {
  id: string;
  body: string;
  createdAt: string;
  displayName: string;
  realNameForOwner: string | null;
  isAnonymous: boolean;
  /** 이 글을 쓴 사람이 단 댓글이면 true ("글쓴이" 표시) */
  isPostAuthor: boolean;
  isMine: boolean;
  canDelete: boolean;
};

type AuthorRow = { author_artist_id: string | null; is_owner: boolean; is_anonymous: boolean };

/** 작가 id → 이름 표 */
async function artistNames(ids: (string | null)[]) {
  const supabase = getAdminClient();
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (!supabase || unique.length === 0) return new Map<string, string>();
  const { data } = await supabase.from("artists").select("id, name").in("id", unique);
  return new Map((data ?? []).map((a: { id: string; name: string }) => [a.id, a.name]));
}

function realName(row: AuthorRow, names: Map<string, string>) {
  if (row.is_owner && !row.author_artist_id) return "회장";
  return (row.author_artist_id && names.get(row.author_artist_id)) || "(지워진 작가)";
}

function isMine(row: AuthorRow, viewer: CommunityViewer) {
  return viewer.artistId ? row.author_artist_id === viewer.artistId : row.is_owner && !row.author_artist_id;
}

/** 같은 사람이 쓴 것인지 (글쓴이 표시용) */
function sameAuthor(a: AuthorRow, b: AuthorRow) {
  return a.author_artist_id ? a.author_artist_id === b.author_artist_id : a.is_owner && b.is_owner && !b.author_artist_id;
}

function describe(row: AuthorRow, names: Map<string, string>, viewer: CommunityViewer) {
  const name = realName(row, names);
  return {
    displayName: row.is_anonymous ? "익명" : name,
    realNameForOwner: row.is_anonymous && viewer.isOwner ? name : null,
    isAnonymous: row.is_anonymous,
  };
}

type PostRow = AuthorRow & { id: string; title: string; body: string; created_at: string };
type CommentRow = AuthorRow & { id: string; post_id: string; body: string; created_at: string };

/** 글 목록 (최신 글이 위) */
export async function getCommunityPosts(viewer: CommunityViewer): Promise<CommunityPostView[]> {
  const supabase = getAdminClient();
  if (!supabase) return [];
  const { data: posts, error } = await supabase
    .from("community_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[getCommunityPosts] Supabase 읽기 실패:", error.message);
    return [];
  }
  const rows = (posts ?? []) as PostRow[];
  const { data: commentRows } = rows.length
    ? await supabase.from("community_comments").select("post_id").in("post_id", rows.map((p) => p.id))
    : { data: [] };
  const counts = new Map<string, number>();
  for (const c of (commentRows ?? []) as { post_id: string }[]) counts.set(c.post_id, (counts.get(c.post_id) ?? 0) + 1);

  const names = await artistNames(rows.map((p) => p.author_artist_id));
  return rows.map((p) => {
    const mine = isMine(p, viewer);
    return {
      id: p.id,
      title: p.title,
      body: p.body,
      createdAt: p.created_at,
      ...describe(p, names, viewer),
      isMine: mine,
      canDelete: mine || viewer.isOwner,
      commentCount: counts.get(p.id) ?? 0,
    };
  });
}

/** 글 하나 + 댓글들 */
export async function getCommunityPost(
  id: string,
  viewer: CommunityViewer,
): Promise<{ post: CommunityPostView; comments: CommunityCommentView[] } | null> {
  const supabase = getAdminClient();
  if (!supabase) return null;
  const { data: post } = await supabase.from("community_posts").select("*").eq("id", id).maybeSingle();
  if (!post) return null;
  const { data: comments } = await supabase
    .from("community_comments")
    .select("*")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  const p = post as PostRow;
  const rows = (comments ?? []) as CommentRow[];
  const names = await artistNames([p.author_artist_id, ...rows.map((c) => c.author_artist_id)]);
  const postMine = isMine(p, viewer);

  return {
    post: {
      id: p.id,
      title: p.title,
      body: p.body,
      createdAt: p.created_at,
      ...describe(p, names, viewer),
      isMine: postMine,
      canDelete: postMine || viewer.isOwner,
      commentCount: rows.length,
    },
    comments: rows.map((c) => {
      const mine = isMine(c, viewer);
      return {
        id: c.id,
        body: c.body,
        createdAt: c.created_at,
        ...describe(c, names, viewer),
        isPostAuthor: sameAuthor(p, c),
        isMine: mine,
        canDelete: mine || viewer.isOwner,
      };
    }),
  };
}

/** 글·댓글을 쓸 때 저장할 "누가 썼는지" 값 */
export function authorFields(viewer: CommunityViewer, anonymous: boolean) {
  return {
    author_artist_id: viewer.artistId,
    is_owner: viewer.artistId === null && viewer.isOwner,
    is_anonymous: anonymous,
  };
}

/** 지울 수 있는지 (내 것 또는 회장) */
export function canDeleteRow(row: AuthorRow, viewer: CommunityViewer) {
  return viewer.isOwner || isMine(row, viewer);
}
