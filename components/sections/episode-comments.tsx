import { Trash2 } from "lucide-react";

import { deleteComment, readerLogout } from "@/app/webtoon/[id]/[no]/actions";
import { getCurrentArtist, isAdmin } from "@/lib/admin-auth";
import { getComments } from "@/lib/data";
import { getCurrentReader } from "@/lib/reader-auth";
import { Button } from "@/components/ui/button";
import { CommentForm, CommentSheet, ReaderAuthForm } from "./comment-forms";

/* 회차 댓글 (웹툰 앱처럼)
   - 화면 아래에 항상 떠 있는 바: 이전화 · 목록 · 💬댓글 수 · 다음화
   - 💬 를 누르면 댓글 창이 아래에서 올라옴
   - 누구나 댓글을 볼 수 있고, 댓글 달기는 로그인한 독자 또는 회장이 승인한 작가 계정
     (작가 계정은 독자 가입 없이 바로 댓글, 댓글에 "작가" 표시 / 회장도 바로 댓글, "회장" 표시
      / 아무 로그인도 안 했으면 독자 로그인·가입 칸)
   - 지우기 버튼: 내가 쓴 댓글 또는 회장에게만 보임 */

/** 작가 계정으로 쓴 댓글에 붙는 "작가" 표시 */
function ArtistBadge() {
  return (
    <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold leading-4 text-primary-foreground">작가</span>
  );
}

/** 회장이 쓴 댓글에 붙는 "회장" 표시 */
function OwnerBadge() {
  return (
    <span className="rounded-full border border-primary px-1.5 text-[10px] font-bold leading-4 text-primary">회장</span>
  );
}

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
  const [comments, reader, admin, artist] = await Promise.all([
    getComments(episodeId),
    getCurrentReader(),
    isAdmin(),
    getCurrentArtist(),
  ]);
  // 회장이 승인한 작가 계정으로 로그인했으면 → 독자 가입 없이 작가로 댓글 달기
  const approvedArtist = artist?.status === "approved" ? artist : null;

  return (
    <CommentSheet count={comments.length} listHref={listHref} prevHref={prevHref} nextHref={nextHref}>
      <div className="space-y-5">
        {/* 댓글 쓰기 / 로그인 */}
        {approvedArtist ? (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm">
              <ArtistBadge />
              <span className="font-semibold">{approvedArtist.name}</span>
              <span className="text-muted-foreground"> 작가님으로 댓글 달기</span>
            </p>
            <CommentForm episodeId={episodeId} path={path} />
          </div>
        ) : admin ? (
          // 회장 로그인 → 독자 가입 없이 "회장"으로 댓글 달기
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm">
              <OwnerBadge />
              <span className="text-muted-foreground">회장으로 댓글 달기</span>
            </p>
            <CommentForm episodeId={episodeId} path={path} />
          </div>
        ) : reader ? (
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
              const canDelete =
                admin ||
                (approvedArtist !== null && approvedArtist.id === comment.artist_id) ||
                (approvedArtist === null && reader !== null && reader.id === comment.reader_id);
              return (
                <li key={comment.id} className="flex gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm">
                      {comment.artist_id ? <ArtistBadge /> : null}
                      {comment.is_owner ? <OwnerBadge /> : null}
                      <span className="font-semibold">{comment.author_name}</span>
                      <span className="ml-1 text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
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
