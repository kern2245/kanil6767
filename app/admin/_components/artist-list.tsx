import { getAdminClient } from "@/lib/supabase-admin";
import type { Artist, ArtistStatus } from "@/lib/types";
import { approveArtist, blockArtist } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { DeleteArtistButton } from "./delete-artist-button";

const STATUS_LABEL: Record<ArtistStatus, string> = {
  pending: "승인 대기",
  approved: "승인됨",
  blocked: "막힘",
};

const STATUS_CLASS: Record<ArtistStatus, string> = {
  pending: "border-up text-up",
  approved: "border-primary text-primary",
  blocked: "border-destructive text-destructive",
};

/** 회장 페이지 "작가" 탭: 가입한 작가 목록 + 승인 / 막기 / 삭제 (승인 대기가 맨 위) */
export async function ArtistList() {
  const supabase = getAdminClient();
  if (!supabase) return <p className="text-sm text-destructive">Supabase가 연결되지 않았습니다.</p>;

  const { data, error } = await supabase
    .from("artists")
    .select("id, email, name, status, created_at")
    .order("created_at", { ascending: false });
  const { data: webtoonRows } = await supabase.from("webtoons").select("artist_id");

  if (error) {
    return (
      <p className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
        작가 목록을 불러오지 못했습니다: {error.message}
      </p>
    );
  }

  const order: ArtistStatus[] = ["pending", "approved", "blocked"];
  const artists = ((data ?? []) as Artist[]).sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  const countOf = (id: string) => (webtoonRows ?? []).filter((w: { artist_id: string | null }) => w.artist_id === id).length;

  if (artists.length === 0) {
    return <p className="text-sm text-muted-foreground">아직 가입한 작가가 없어요. 작가 페이지에서 가입하면 여기에 보여요.</p>;
  }

  return (
    <ul className="space-y-3">
      {artists.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-medium">
              <span className="truncate">{a.name}</span>
              <span className={`shrink-0 rounded-full border px-2 text-xs leading-5 ${STATUS_CLASS[a.status]}`}>
                {STATUS_LABEL[a.status]}
              </span>
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {a.email} · 웹툰 {countOf(a.id)}개 · 가입 {new Date(a.created_at).toLocaleDateString("ko-KR")}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {a.status !== "approved" ? (
              <form action={approveArtist}>
                <input type="hidden" name="id" value={a.id} />
                <Button type="submit" size="sm">
                  승인
                </Button>
              </form>
            ) : null}
            {a.status !== "blocked" ? (
              <form action={blockArtist}>
                <input type="hidden" name="id" value={a.id} />
                <Button type="submit" size="sm" variant="outline">
                  막기
                </Button>
              </form>
            ) : null}
            <DeleteArtistButton id={a.id} name={a.name} />
          </div>
        </li>
      ))}
    </ul>
  );
}
