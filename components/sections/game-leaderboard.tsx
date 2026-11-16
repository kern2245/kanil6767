import Link from "next/link";

import { siteConfig } from "@/site.config";
import { getCurrentArtist } from "@/lib/admin-auth";
import { getLeaderboard, getMyRank, type GameJob } from "@/lib/game-scores";
import { getLang } from "@/lib/lang";
import { cn } from "@/lib/utils";

/* 꼬미 키우기 순위표 (게임 페이지 /game 아래)
   - 1~20등: 닉네임 · 최고 스테이지 · 직업 / 로그인 회원은 "내 순위" 도 보임
   - 글자: site.config.ts 의 game / 기록 읽기: lib/game-scores.ts */

const JOB_ICON: Record<GameJob, string> = { sword: "🗡️", bow: "🏹", magic: "🔮", tamer: "🐵" };
const MEDAL = ["🥇", "🥈", "🥉"];

export async function GameLeaderboard() {
  const lang = await getLang();
  const g = siteConfig.game[lang];
  const [rows, me] = await Promise.all([getLeaderboard(20), getCurrentArtist()]);
  const member = me && me.status !== "blocked" ? me : null;
  const mine = member ? await getMyRank(member.id) : null;

  return (
    <section className="mt-8 rounded-2xl border border-border/60 bg-muted/40 p-4 sm:p-6">
      <h2 className="text-lg font-bold tracking-tight sm:text-xl">{g.boardTitle}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{g.boardHint}</p>

      {/* 내 순위 / 로그인 안내 */}
      <div className="mt-4 rounded-xl bg-background px-4 py-3 text-sm">
        {member ? (
          mine ? (
            <span className="font-semibold text-primary">{g.myRank(mine.rank, mine.bestStage)}</span>
          ) : (
            <span className="text-muted-foreground">{g.noRecord}</span>
          )
        ) : (
          <span className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
            {g.loginHint}
            <Link
              href="/login"
              className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              {g.login}
            </Link>
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{g.empty}</p>
      ) : (
        <ol className="mt-4 divide-y divide-border/60">
          {rows.map((r, i) => (
            <li
              key={r.memberId}
              className={cn(
                "flex items-center gap-3 py-2.5",
                member?.id === r.memberId && "-mx-2 rounded-lg bg-primary/10 px-2",
              )}
            >
              <span className="w-8 shrink-0 text-center text-sm font-bold tabular-nums">
                {i < 3 ? MEDAL[i] : i + 1}
              </span>
              {r.avatarUrl ? (
                // 회원이 올린 프사 주소라 일반 img 를 씀
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.avatarUrl} alt="" width={28} height={28} className="size-7 shrink-0 rounded-full object-cover" />
              ) : (
                <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background text-xs font-bold">
                  {r.name.trim().charAt(0) || "?"}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {r.name}
                {r.job ? <span className="ml-1.5" aria-hidden>{JOB_ICON[r.job]}</span> : null}
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums">
                <span className="mr-1 text-xs font-normal text-muted-foreground">{g.stage}</span>
                {r.bestStage}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
