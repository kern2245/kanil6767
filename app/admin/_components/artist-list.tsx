import { getAdminClient } from "@/lib/supabase-admin";
import type { Artist, ArtistStatus } from "@/lib/types";
import { approveArtist, blockArtist, demoteArtist } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { DeleteArtistButton } from "./delete-artist-button";

/* 회장 페이지 "회원" 탭: 가입한 회원 목록 (독자·작가 한 계정)
   - 독자 → "작가로 승급" ("작가" 표시 + 작가 커뮤니티 입장. 웹툰 올리기는 독자도 가능)
   - 작가 → "독자로 내리기"
   - 막기 / 막기 풀기(→ 독자) / 삭제
   작가가 맨 위, 그다음 독자, 막힌 회원은 맨 아래 */

const STATUS_LABEL: Record<ArtistStatus, string> = {
  approved: "작가",
  member: "독자",
  pending: "독자",
  blocked: "막힘",
};

const STATUS_CLASS: Record<ArtistStatus, string> = {
  approved: "border-primary bg-primary text-primary-foreground",
  member: "border-muted-foreground/40 text-muted-foreground",
  pending: "border-muted-foreground/40 text-muted-foreground",
  blocked: "border-destructive text-destructive",
};

function ActionButton({
  action,
  id,
  label,
  variant = "outline",
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
  variant?: "default" | "outline" | "ghost";
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant={variant}>
        {label}
      </Button>
    </form>
  );
}

export async function ArtistList({ query = "" }: { query?: string }) {
  const supabase = getAdminClient();
  if (!supabase) return <p className="text-sm text-destructive">Supabase가 연결되지 않았습니다.</p>;

  // 검색: 닉네임 또는 이메일에 검색어가 들어간 회원만
  // (검색 문법에 쓰이는 기호 % _ , ( ) \ * 는 빼고 찾음 → 이상한 검색어로 목록이 깨지지 않게)
  const q = query.trim().slice(0, 50).replace(/[%_,()\\*]/g, "");
  let request = supabase
    .from("artists")
    .select("id, email, name, status, created_at")
    .order("created_at", { ascending: false });
  if (q) request = request.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
  const { data, error } = await request;
  const { data: webtoonRows } = await supabase.from("webtoons").select("artist_id");

  if (error) {
    return (
      <p className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
        회원 목록을 불러오지 못했습니다: {error.message}
      </p>
    );
  }

  const order: ArtistStatus[] = ["approved", "member", "pending", "blocked"];
  const members = ((data ?? []) as Artist[]).sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  const countOf = (id: string) => (webtoonRows ?? []).filter((w: { artist_id: string | null }) => w.artist_id === id).length;
  const artistCount = members.filter((m) => m.status === "approved").length;

  const searchBox = (
    <form action="/admin" className="mb-4 flex gap-2" role="search">
      <input type="hidden" name="section" value="artist" />
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder="닉네임이나 이메일로 찾기"
        aria-label="회원 찾기"
        className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring/50 sm:text-sm"
      />
      <Button type="submit" size="sm" variant="outline" className="h-10">
        찾기
      </Button>
    </form>
  );

  if (members.length === 0) {
    return (
      <>
        {searchBox}
        <p className="text-sm text-muted-foreground">
          {q ? `"${q}"(이)가 들어간 회원이 없어요.` : "아직 가입한 회원이 없어요. 맨 위 ‘로그인’에서 가입하면 여기에 보여요."}
        </p>
      </>
    );
  }

  return (
    <>
      {searchBox}
      <p className="mb-3 text-sm text-muted-foreground">
        {q ? `"${q}" 검색 결과 ` : "전체 "}
        {members.length}명 · 작가 {artistCount}명
      </p>
      <ul className="space-y-3">
        {members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-medium">
                <span className="truncate">{m.name}</span>
                <span className={`shrink-0 rounded-full border px-2 text-xs leading-5 ${STATUS_CLASS[m.status]}`}>
                  {STATUS_LABEL[m.status]}
                </span>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {m.email}
                {countOf(m.id) > 0 ? ` · 웹툰 ${countOf(m.id)}개` : ""} · 가입{" "}
                {new Date(m.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {m.status === "approved" ? (
                <ActionButton action={demoteArtist} id={m.id} label="독자로 내리기" />
              ) : m.status === "blocked" ? (
                <ActionButton action={demoteArtist} id={m.id} label="막기 풀기" />
              ) : (
                <ActionButton action={approveArtist} id={m.id} label="작가로 승급" variant="default" />
              )}
              {m.status !== "blocked" ? <ActionButton action={blockArtist} id={m.id} label="막기" variant="ghost" /> : null}
              <DeleteArtistButton id={m.id} name={m.name} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
