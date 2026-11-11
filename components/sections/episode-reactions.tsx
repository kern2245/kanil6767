import Link from "next/link";
import { ThumbsDown, ThumbsUp } from "lucide-react";

import { toggleReaction } from "@/app/webtoon/[id]/[no]/actions";
import { getCurrentArtist } from "@/lib/admin-auth";
import { getAdminClient } from "@/lib/supabase-admin";
import { cn } from "@/lib/utils";
import { getDict, type Dict } from "@/lib/i18n";

/* 회차 좋아요 / 싫어요 (만화 그림 바로 아래)
   - 누구나 개수를 볼 수 있음
   - 로그인한 회원만 누를 수 있음 (같은 걸 다시 누르면 취소, 다른 걸 누르면 바뀜) — 내가 누른 쪽은 보라색
   - 로그인 안 했으면 버튼을 누르면 로그인 페이지로 (로그인 뒤 이 회차로 돌아옴) */

export async function EpisodeReactions({
  episodeId,
  path,
  t = getDict("ko").viewer,
}: {
  episodeId: string;
  path: string;
  t?: Dict["viewer"];
}) {
  const supabase = getAdminClient();
  const me = await getCurrentArtist();
  const member = me && me.status !== "blocked" ? me : null;

  const { data } = supabase
    ? await supabase.from("episode_reactions").select("member_id, reaction").eq("episode_id", episodeId)
    : { data: [] };
  const rows = (data ?? []) as { member_id: string; reaction: "like" | "dislike" }[];
  const likes = rows.filter((r) => r.reaction === "like").length;
  const dislikes = rows.length - likes;
  const mine = member ? rows.find((r) => r.member_id === member.id)?.reaction : undefined;

  const buttons = [
    { reaction: "like" as const, label: t.like, count: likes, Icon: ThumbsUp },
    { reaction: "dislike" as const, label: t.dislike, count: dislikes, Icon: ThumbsDown },
  ];
  const baseClass =
    "inline-flex h-12 min-w-28 items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors";

  return (
    <div className="flex items-center justify-center gap-3">
      {buttons.map(({ reaction, label, count, Icon }) => {
        const active = mine === reaction;
        const className = cn(
          baseClass,
          active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
        );
        const inner = (
          <>
            <Icon className={cn("size-5", active ? "fill-current" : "")} />
            <span className="sr-only">{label}</span>
            <span>{count}</span>
          </>
        );
        return member ? (
          <form key={reaction} action={toggleReaction}>
            <input type="hidden" name="episodeId" value={episodeId} />
            <input type="hidden" name="reaction" value={reaction} />
            <input type="hidden" name="path" value={path} />
            <button type="submit" aria-pressed={active} title={active ? t.undo(label) : label} className={className}>
              {inner}
            </button>
          </form>
        ) : (
          <Link
            key={reaction}
            href={`/login?next=${encodeURIComponent(path)}`}
            title={t.loginTo(label)}
            className={className}
          >
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
