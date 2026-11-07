import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, Trash2 } from "lucide-react";

import { getCommunityPost, getCommunityViewer } from "@/lib/community";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { deleteComment, deletePost } from "../actions";
import { CommentForm } from "../_components/community-forms";
import { AuthorLabel, formatCommunityDate } from "../_components/author-label";

/* 작가 커뮤니티 글 보기 (주소: /artist/community/글번호)
   - 글 내용 + 댓글 목록 + 댓글 쓰기 (익명/실명 선택)
   - 지우기 버튼: 내 글·댓글 또는 회장에게만 보임 */

export const metadata = { title: "작가 커뮤니티" };

export default async function CommunityPostPage(props: PageProps<"/artist/community/[id]">) {
  await connection();
  const viewer = await getCommunityViewer();
  if (!viewer) redirect("/artist");

  const { id } = await props.params;
  const result = await getCommunityPost(id, viewer);
  if (!result) notFound();
  const { post, comments } = result;

  return (
    <Container className="max-w-3xl py-10">
      <Button asChild variant="ghost" size="sm">
        <Link href="/artist/community">
          <ArrowLeft />
          커뮤니티 목록
        </Link>
      </Button>

      {/* 글 */}
      <article className="mt-4 border-b pb-8">
        <h1 className="text-2xl font-semibold leading-snug break-words">{post.title}</h1>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <p className="flex flex-wrap items-center gap-2">
            <AuthorLabel displayName={post.displayName} realNameForOwner={post.realNameForOwner} isMine={post.isMine} />
            <span className="text-xs">{formatCommunityDate(post.createdAt)}</span>
          </p>
          {post.canDelete ? (
            <form action={deletePost}>
              <input type="hidden" name="id" value={post.id} />
              <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                <Trash2 />
                글 지우기
              </Button>
            </form>
          ) : null}
        </div>
        <p className="mt-6 leading-relaxed break-words whitespace-pre-wrap">{post.body}</p>
      </article>

      {/* 댓글 */}
      <section className="mt-8 space-y-5">
        <h2 className="text-lg font-semibold">
          댓글 <span className="text-muted-foreground">{comments.length}</span>
        </h2>
        <CommentForm postId={post.id} myName={viewer.name} />
        {comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">아직 댓글이 없어요.</p>
        ) : (
          <ul className="divide-y border-t">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <AuthorLabel
                      displayName={c.displayName}
                      realNameForOwner={c.realNameForOwner}
                      isMine={c.isMine}
                      isPostAuthor={c.isPostAuthor}
                    />
                    <span className="text-xs text-muted-foreground">{formatCommunityDate(c.createdAt)}</span>
                  </p>
                  <p className="mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap">{c.body}</p>
                </div>
                {c.canDelete ? (
                  <form action={deleteComment}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit" variant="ghost" size="icon" aria-label="댓글 지우기">
                      <Trash2 />
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
