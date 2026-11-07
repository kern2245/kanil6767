/** 글·댓글 쓴 사람 표시: "익명" 또는 이름. 회장에게만 익명 글의 실명이 작게 같이 보임. */
export function AuthorLabel({
  displayName,
  realNameForOwner,
  isMine,
  isPostAuthor = false,
}: {
  displayName: string;
  realNameForOwner: string | null;
  isMine: boolean;
  isPostAuthor?: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="font-semibold">{displayName}</span>
      {isPostAuthor ? (
        <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-medium leading-4 text-primary">글쓴이</span>
      ) : null}
      {isMine ? <span className="text-xs text-muted-foreground">(나)</span> : null}
      {realNameForOwner ? (
        <span className="rounded-full border px-1.5 text-[10px] leading-4 text-muted-foreground">
          실명: {realNameForOwner} · 회장만 보임
        </span>
      ) : null}
    </span>
  );
}

/** 날짜를 "2026. 11. 8. 오후 3:20" 처럼 (한국 시간) */
export function formatCommunityDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
