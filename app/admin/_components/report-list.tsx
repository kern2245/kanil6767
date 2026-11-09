import Link from "next/link";

import { getAdminClient } from "@/lib/supabase-admin";
import { deleteReportedComment, hideReportedWebtoon, resolveReport } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

/* 회장 페이지 "신고" 탭: 처리 안 된 신고 목록 (최신이 위)
   - 무엇이 신고됐는지(웹툰/회차/댓글 내용) + 누가 · 왜 · 언제
   - 버튼: 보러 가기 / 댓글 지우기 / 웹툰 숨기기 / 처리 완료(문제 없음) */

type ReportRow = {
  id: string;
  target_type: "webtoon" | "episode" | "comment";
  target_id: string;
  reporter_id: string | null;
  reason: string;
  created_at: string;
};

const TYPE_LABEL = { webtoon: "웹툰", episode: "회차", comment: "댓글" } as const;

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function ReportList() {
  const supabase = getAdminClient();
  if (!supabase) return <p className="text-sm text-destructive">Supabase가 연결되지 않았습니다.</p>;

  const { data, error } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reporter_id, reason, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    return (
      <p className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
        신고를 불러오지 못했습니다: {error.message}
      </p>
    );
  }
  const reports = (data ?? []) as ReportRow[];
  if (reports.length === 0) return <p className="text-sm text-muted-foreground">처리할 신고가 없어요. 👍</p>;

  const idsOf = (t: ReportRow["target_type"]) => [
    ...new Set(reports.filter((r) => r.target_type === t).map((r) => r.target_id)),
  ];
  const [webtoons, episodes, comments, reporters] = await Promise.all([
    supabase.from("webtoons").select("id, title, is_visible").in("id", idsOf("webtoon")),
    supabase.from("episodes").select("id, number, title, webtoon_id, webtoons(title)").in("id", idsOf("episode")),
    supabase.from("comments").select("id, body, author_name, episode_id, episodes(number, webtoon_id)").in("id", idsOf("comment")),
    supabase.from("artists").select("id, name").in("id", [...new Set(reports.map((r) => r.reporter_id).filter(Boolean))] as string[]),
  ]);
  const one = <T,>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  const webtoonMap = new Map((webtoons.data ?? []).map((w: { id: string; title: string; is_visible: boolean }) => [w.id, w]));
  const episodeMap = new Map(
    (episodes.data ?? []).map((e) => [
      e.id as string,
      {
        number: e.number as number,
        title: e.title as string,
        webtoonId: e.webtoon_id as string,
        webtoonTitle: one(e.webtoons as { title: string } | { title: string }[] | null)?.title ?? "",
      },
    ]),
  );
  const commentMap = new Map(
    (comments.data ?? []).map((c) => {
      const ep = one(c.episodes as { number: number; webtoon_id: string } | { number: number; webtoon_id: string }[] | null);
      return [c.id as string, { body: c.body as string, author: c.author_name as string, ep }];
    }),
  );
  const reporterMap = new Map((reporters.data ?? []).map((a: { id: string; name: string }) => [a.id, a.name]));

  return (
    <ul className="space-y-3">
      {reports.map((r) => {
        let what = "(지워진 대상)";
        let href: string | null = null;
        let hideWebtoonId: string | null = null;
        if (r.target_type === "webtoon") {
          const w = webtoonMap.get(r.target_id);
          if (w) {
            what = `${w.title}${w.is_visible ? "" : " (숨김)"}`;
            href = `/webtoon/${r.target_id}`;
            hideWebtoonId = w.is_visible ? r.target_id : null;
          }
        } else if (r.target_type === "episode") {
          const e = episodeMap.get(r.target_id);
          if (e) {
            what = `${e.webtoonTitle} ${e.number}화 ${e.title}`;
            href = `/webtoon/${e.webtoonId}/${e.number}`;
            hideWebtoonId = e.webtoonId;
          }
        } else {
          const c = commentMap.get(r.target_id);
          if (c) {
            what = `${c.author}: "${c.body.length > 80 ? `${c.body.slice(0, 80)}…` : c.body}"`;
            href = c.ep ? `/webtoon/${c.ep.webtoon_id}/${c.ep.number}` : null;
          }
        }
        const targetGone = what === "(지워진 대상)";

        return (
          <li key={r.id} className="rounded-xl border p-4">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-destructive/15 px-2 text-xs font-semibold leading-5 text-destructive">
                {TYPE_LABEL[r.target_type]}
              </span>
              <span className="min-w-0 font-medium break-words">{what}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              이유: <b className="text-foreground">{r.reason}</b> · 신고한 사람{" "}
              {r.reporter_id ? (reporterMap.get(r.reporter_id) ?? "(지워진 회원)") : "(지워진 회원)"} · {formatDate(r.created_at)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {href ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={href} target="_blank">
                    보러 가기
                  </Link>
                </Button>
              ) : null}
              {r.target_type === "comment" && !targetGone ? (
                <form action={deleteReportedComment}>
                  <input type="hidden" name="targetId" value={r.target_id} />
                  <Button type="submit" size="sm" variant="destructive">
                    댓글 지우기
                  </Button>
                </form>
              ) : null}
              {hideWebtoonId ? (
                <form action={hideReportedWebtoon}>
                  <input type="hidden" name="webtoonId" value={hideWebtoonId} />
                  <input type="hidden" name="reportId" value={r.id} />
                  <Button type="submit" size="sm" variant="destructive">
                    웹툰 숨기기
                  </Button>
                </form>
              ) : null}
              <form action={resolveReport}>
                <input type="hidden" name="reportId" value={r.id} />
                <Button type="submit" size="sm" variant="ghost">
                  {targetGone ? "목록에서 빼기" : "문제 없음 (처리 완료)"}
                </Button>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
