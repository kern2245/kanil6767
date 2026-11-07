"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import {
  adminDeleteCommunityComment,
  adminDeleteCommunityPost,
  adminDeleteCommunityPosts,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import type { CommunityCommentView, CommunityPostView } from "@/lib/community";

/* 회장 페이지 "커뮤니티" 탭 — 작가 커뮤니티의 모든 글·댓글을 실명과 함께 보고 지우기 (회장 전용)
   - 글 앞 체크박스로 여러 개 골라서 "골라서 지우기"
   - 글마다 "이 글 지우기", 댓글마다 휴지통 버튼
   - 지우기 전에 한 번 더 물어봄. 글을 지우면 그 글의 댓글도 함께 지워져요. */

type PostWithComments = CommunityPostView & { comments: CommunityCommentView[] };

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** 쓴 사람: 익명이면 "익명 (실명: ○○)" */
function Author({ item }: { item: { displayName: string; realNameForOwner: string | null } }) {
  return (
    <span>
      <span className="font-semibold">{item.displayName}</span>
      {item.realNameForOwner ? <span className="text-muted-foreground"> (실명: {item.realNameForOwner})</span> : null}
    </span>
  );
}

export function CommunityManager({ posts }: { posts: PostWithComments[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const allChecked = posts.length > 0 && selected.length === posts.length;

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // 어떤 버튼을 눌렀는지 보고 알맞게 한 번 더 물어보기
  function confirmDelete(e: React.FormEvent<HTMLFormElement>) {
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const kind = submitter?.dataset.kind;
    const message =
      kind === "bulk"
        ? `고른 글 ${selected.length}개를 지울까요? 댓글도 함께 지워지고 되돌릴 수 없어요.`
        : kind === "post"
          ? "이 글을 지울까요? 댓글도 함께 지워지고 되돌릴 수 없어요."
          : "이 댓글을 지울까요? 되돌릴 수 없어요.";
    if (!window.confirm(message)) {
      e.preventDefault();
      return;
    }
    if (kind === "bulk") setTimeout(() => setSelected([]), 0);
  }

  if (posts.length === 0) {
    return <p className="mt-6 text-sm text-muted-foreground">아직 커뮤니티 글이 없어요.</p>;
  }

  return (
    <form action={adminDeleteCommunityPosts} onSubmit={confirmDelete} className="mt-6">
      {/* 위쪽: 전체 선택 + 골라서 지우기 */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-background py-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={() => setSelected(allChecked ? [] : posts.map((p) => p.id))}
          />
          전체 선택 ({selected.length}/{posts.length})
        </label>
        <Button type="submit" size="sm" variant="destructive" data-kind="bulk" disabled={selected.length === 0}>
          <Trash2 />
          골라서 지우기 ({selected.length})
        </Button>
      </div>

      <ul className="divide-y">
        {posts.map((post) => (
          <li key={post.id} className="py-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                name="ids"
                value={post.id}
                checked={selected.includes(post.id)}
                onChange={() => toggle(post.id)}
                aria-label={`${post.title} 고르기`}
                className="mt-1.5"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium break-words">{post.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <Author item={post} /> · {formatDate(post.createdAt)} · 댓글 {post.commentCount}
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-muted-foreground">내용·댓글 보기</summary>
                  <p className="mt-2 rounded-lg bg-muted/40 p-3 text-sm leading-relaxed break-words whitespace-pre-wrap">
                    {post.body}
                  </p>
                  {post.comments.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {post.comments.map((c) => (
                        <li key={c.id} className="flex items-start gap-2 rounded-lg border p-2 text-sm">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">
                              <Author item={c} />
                              {c.isPostAuthor ? " · 글쓴이" : ""} · {formatDate(c.createdAt)}
                            </p>
                            <p className="mt-0.5 break-words whitespace-pre-wrap">{c.body}</p>
                          </div>
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon"
                            formAction={adminDeleteCommunityComment}
                            name="commentId"
                            value={c.id}
                            data-kind="comment"
                            aria-label="댓글 지우기"
                            className="text-destructive"
                          >
                            <Trash2 />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </details>
              </div>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                formAction={adminDeleteCommunityPost}
                name="postId"
                value={post.id}
                data-kind="post"
                className="shrink-0 text-destructive"
              >
                <Trash2 />
                이 글 지우기
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </form>
  );
}
