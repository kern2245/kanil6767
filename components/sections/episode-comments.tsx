import { Trash2 } from "lucide-react";

import { deleteComment, readerLogout } from "@/app/webtoon/[id]/[no]/actions";
import { isAdmin } from "@/lib/admin-auth";
import { getComments } from "@/lib/data";
import { getCurrentReader } from "@/lib/reader-auth";
import { Button } from "@/components/ui/button";
import { CommentForm, CommentSheet, ReaderAuthForm } from "./comment-forms";

/* 회차 댓글 (웹툰 앱처럼)
   - 화면 아래에 항상 떠 있는 바: 이전화 · 목록 · 💬댓글 수 · 다음화
   - 💬 를 누르면 댓글 창이 아래에서 올라옴
   - 누구나 댓글을 볼 수 있고, 댓글 달기는 로그인한 독자만 (로그인 안 했으면 로그인 / 가입하기 칸이 보임)
   - 지우기 버튼: 내가 쓴 댓글 또는 회장에게만 보임 */

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  episodeId: string;
  path: string;
  listHref: string;
  prevHref?: string;
  nextHref?: string;
};

export async function EpisodeComments({ episodeId, path, listHref, prevHref, nextHref }: Props) {
  const [comments, reader, admin] = await Promise.all([getComments(episodeId), getCurrentReader(), isAdmin()]);

  return (
    <CommentSheet count={comments.length} listHref={listHref} prevHref={prevHref} nextHref={nextHref}>
      <div className="space-y-5">
        {/* 댓글 쓰기 / 로그인 */}
        {reader ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>
                <span className="font-semibold">{reader.nickname}</span>
                <span className="text-muted-foreground"> 님으로 댓글 달기</span>
              </span>
              <form action={readerLogout}>
                <input type="hidden" name="path" value={path} />
                <button type="submit" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                  로그아웃
                </button>
              </form>
            </div>
            <CommentForm episodeId={episodeId} path={path} />
          </div>
        ) : (
          <ReaderAuthForm path={path} />
        )}

        {/* 댓글 목록 */}
        {comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">아직 댓글이 없어요. 첫 댓글을 남겨 보세요!</p>
        ) : (
          <ul className="divide-y border-t">
            {comments.map((comment) => {
              const canDelete = admin || reader?.id === comment.reader_id;
              return (
                <li key={comment.id} className="flex gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">{comment.author_name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                    </p>
                    <p className="mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap">{comment.body}</p>
                  </div>
                  {canDelete ? (
                    <form action={deleteComment}>
                      <input type="hidden" name="commentId" value={comment.id} />
                      <input type="hidden" name="path" value={path} />
                      <Button type="submit" variant="ghost" size="icon" aria-label="댓글 지우기">
                        <Trash2 />
                      </Button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </CommentSheet>
  );
}
