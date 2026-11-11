import Link from "next/link";
import { LogIn, Trash2 } from "lucide-react";

import { deleteComment } from "@/app/webtoon/[id]/[no]/actions";
import { getCurrentArtist, isAdmin } from "@/lib/admin-auth";
import { getComments } from "@/lib/data";
import { getAdminClient } from "@/lib/supabase-admin";
import { Button } from "@/components/ui/button";
import { CommentForm, CommentSheet } from "./comment-forms";
import { ReportButton } from "./report-button";
import { getDict, type Lang } from "@/lib/i18n";

/* 회차 댓글 (웹툰 앱처럼)
   - 화면 아래에 항상 떠 있는 바: 이전화 · 목록 · 💬댓글 수 · 다음화
   - 💬 를 누르면 댓글 창이 아래에서 올라옴
   - 누구나 댓글을 볼 수 있고, 댓글 달기는 로그인한 회원(독자·작가 한 계정) 또는 회장
     (작가로 승급된 회원의 댓글에는 "작가", 회장 댓글에는 "회장" 표시
      / 로그인 안 했으면 "로그인하고 댓글 달기" 버튼 → /login, 로그인 뒤 이 회차로 돌아옴)
   - 지우기 버튼: 내가 쓴 댓글 또는 회장에게만 보임 */

/** 작가로 승급된 회원이 쓴 댓글에 붙는 "작가" 표시 */
function ArtistBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold leading-4 text-primary-foreground">{label}</span>
  );
}

/** 회장이 쓴 댓글에 붙는 "회장" 표시 */
function OwnerBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-primary px-1.5 text-[10px] font-bold leading-4 text-primary">{label}</span>
  );
}

function formatDate(value: string, lang: Lang) {
  const w = getDict(lang).webtoon;
  return new Date(value).toLocaleString(w.dateLocale, {
    timeZone: w.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 댓글 쓴 회원들 중 지금 "작가"인 회원 id (작가 표시용, 서버 비밀 키로 확인) */
async function artistIdsAmong(ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const supabase = getAdminClient();
  if (!supabase || unique.length === 0) return new Set<string>();
  const { data } = await supabase.from("artists").select("id").in("id", unique).eq("status", "approved");
  return new Set((data ?? []).map((a: { id: string }) => a.id));
}

type Props = {
  episodeId: string;
  path: string;
  listHref: string;
  prevHref?: string;
  nextHref?: string;
  lang?: Lang;
};

export async function EpisodeComments({ episodeId, path, listHref, prevHref, nextHref, lang = "ko" }: Props) {
  const t = getDict(lang).comments;
  const [comments, admin, current] = await Promise.all([getComments(episodeId), isAdmin(), getCurrentArtist()]);
  const member = current && current.status !== "blocked" ? current : null;
  const artistIds = await artistIdsAmong(comments.map((c) => c.artist_id));

  return (
    <CommentSheet count={comments.length} listHref={listHref} prevHref={prevHref} nextHref={nextHref} lang={lang}>
      <div className="space-y-5">
        {/* 댓글 쓰기 / 로그인 */}
        {member ? (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm">
              {member.status === "approved" ? <ArtistBadge label={t.artist} /> : null}
              <span className="font-semibold">{member.name}</span>
              <span className="text-muted-foreground">{t.as}</span>
            </p>
            <CommentForm episodeId={episodeId} path={path} lang={lang} />
          </div>
        ) : admin ? (
          // 회장 로그인 → "회장"으로 댓글 달기
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm">
              <OwnerBadge label={t.owner} />
              <span className="text-muted-foreground">{t.asOwner}</span>
            </p>
            <CommentForm episodeId={episodeId} path={path} lang={lang} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">{t.needLogin}</p>
            <Button asChild size="sm">
              <Link href={`/login?next=${encodeURIComponent(path)}`}>
                <LogIn />
                {t.loginButton}
              </Link>
            </Button>
          </div>
        )}

        {/* 댓글 목록 */}
        {comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <ul className="divide-y border-t">
            {comments.map((comment) => {
              const canDelete = admin || (member !== null && member.id === comment.artist_id);
              return (
                <li key={comment.id} className="flex gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm">
                      {comment.artist_id && artistIds.has(comment.artist_id) ? <ArtistBadge label={t.artist} /> : null}
                      {comment.is_owner ? <OwnerBadge label={t.owner} /> : null}
                      <span className="font-semibold">{comment.author_name}</span>
                      <span className="ml-1 text-xs text-muted-foreground">{formatDate(comment.created_at, lang)}</span>
                    </p>
                    <p className="mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap">{comment.body}</p>
                  </div>
                  {!canDelete ? (
                    <ReportButton targetType="comment" targetId={comment.id} loggedIn={member !== null} returnPath={path} lang={lang} />
                  ) : null}
                  {canDelete ? (
                    <form action={deleteComment}>
                      <input type="hidden" name="commentId" value={comment.id} />
                      <input type="hidden" name="path" value={path} />
                      <Button type="submit" variant="ghost" size="icon" aria-label={t.delete}>
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
