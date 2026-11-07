import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, MessageCircle } from "lucide-react";

import { getCommunityPosts, getCommunityViewer } from "@/lib/community";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { PostForm } from "./_components/community-forms";
import { AuthorLabel, formatCommunityDate } from "./_components/author-label";

/* 작가 커뮤니티 (주소: /artist/community) — 작가 페이지의 "커뮤니티" 버튼으로 들어옴
   - 승인된 작가 + 회장만 들어올 수 있음 (아니면 작가 페이지로 돌려보냄)
   - 위: 글 쓰기 (익명/실명 선택) / 아래: 글 목록 (최신 글이 위) */

export const metadata = { title: "작가 커뮤니티" };

export default async function CommunityPage() {
  await connection(); // 로그인 상태·새 글이 바로 반영되게 접속할 때마다 새로 만듦
  const viewer = await getCommunityViewer();
  if (!viewer) redirect("/artist");

  const posts = await getCommunityPosts(viewer);

  return (
    <Container className="max-w-3xl py-10">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="작가 페이지로 돌아가기">
          <Link href="/artist">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">작가 커뮤니티</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        승인된 작가와 회장만 볼 수 있어요. 익명으로 쓴 글·댓글은 작가들에게 이름이 안 보이고, 회장만 실명을 확인할 수 있어요.
      </p>

      {/* 글 쓰기 */}
      <details className="mt-8 rounded-xl border px-5 py-4">
        <summary className="cursor-pointer text-sm font-medium">✏️ 글 쓰기</summary>
        <div className="pt-4">
          <PostForm myName={viewer.name} />
        </div>
      </details>

      {/* 글 목록 */}
      <h2 className="mt-10 border-b pb-3 text-lg font-semibold">
        글 <span className="text-muted-foreground">{posts.length}</span>
      </h2>
      {posts.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">아직 글이 없어요. 첫 글을 남겨 보세요!</p>
      ) : (
        <ul className="divide-y">
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={`/artist/community/${post.id}`} className="block py-4 transition-colors hover:bg-muted/30">
                <p className="flex items-center gap-2 font-medium">
                  <span className="min-w-0 truncate">{post.title}</span>
                  {post.commentCount > 0 ? (
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-xs text-primary">
                      <MessageCircle className="size-3.5" />
                      {post.commentCount}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <AuthorLabel
                    displayName={post.displayName}
                    realNameForOwner={post.realNameForOwner}
                    isMine={post.isMine}
                  />
                  <span className="text-xs">{formatCommunityDate(post.createdAt)}</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
