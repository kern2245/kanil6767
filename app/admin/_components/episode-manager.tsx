"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { deleteEpisode, saveEpisode, uploadEpisodeImage } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

const inputClass =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50";

type EpisodeRow = { id: string; number: number; title: string; imageCount: number };

/** 웹툰 한 개의 회차 관리: 회차 추가(그림 여러 장) + 올린 회차 목록·삭제
    그림은 파일 이름 순서대로(001, 002 …) 위에서 아래로 붙습니다. */
export function EpisodeManager({ webtoonId, episodes }: { webtoonId: string; episodes: EpisodeRow[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ ok?: boolean; message: string } | null>(null);
  const nextNumber = episodes.length > 0 ? Math.max(...episodes.map((e) => e.number)) + 1 : 1;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const number = Number(data.get("number"));
    const title = String(data.get("title") ?? "");
    // 파일 이름 순서대로 정렬 (1, 2, 10 처럼 숫자도 자연스럽게)
    const files = (data.getAll("images") as File[])
      .filter((f) => f.size > 0)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (files.length === 0) {
      setStatus({ message: "만화 그림을 한 장 이상 골라 주세요." });
      return;
    }

    setPending(true);
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setStatus({ message: `그림 올리는 중… ${i + 1} / ${files.length}` });
      const one = new FormData();
      one.set("webtoon_id", webtoonId);
      one.set("file", files[i]);
      const result = await uploadEpisodeImage(one);
      if (!result.ok) {
        setStatus({ message: result.message });
        setPending(false);
        return;
      }
      urls.push(result.url);
    }

    setStatus({ message: "회차 저장 중…" });
    const saved = await saveEpisode({ webtoonId, number, title, imageUrls: urls });
    setStatus({ ok: saved.ok, message: saved.message ?? "" });
    setPending(false);
    if (saved.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }

  return (
    <div className="grid gap-6">
      {/* 회차 추가 */}
      <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">회차 번호 *</span>
            <input
              key={nextNumber}
              name="number"
              type="number"
              min={1}
              required
              defaultValue={nextNumber}
              className={inputClass}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">회차 제목 *</span>
            <input name="title" required placeholder="예: 첫 만남" className={inputClass} />
          </label>
        </div>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">만화 그림 * (여러 장 한 번에 선택, 한 장 4MB 이하)</span>
          <input name="images" type="file" accept="image/*" multiple required className="text-sm" />
          <span className="text-xs text-muted-foreground">
            파일 이름 순서대로 위에서 아래로 붙습니다. (예: 001.jpg, 002.jpg, 003.jpg)
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "올리는 중..." : "회차 올리기"}
          </Button>
          {status ? (
            <p className={status.ok || pending ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
              {status.message}
            </p>
          ) : null}
        </div>
      </form>

      {/* 올린 회차 목록 */}
      <div>
        <p className="mb-2 text-sm font-medium">올린 회차 ({episodes.length})</p>
        {episodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 없습니다.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {episodes.map((ep) => (
              <li key={ep.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="w-10 shrink-0 text-muted-foreground">{ep.number}화</span>
                <span className="min-w-0 flex-1 truncate">{ep.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">그림 {ep.imageCount}장</span>
                <form
                  action={async (fd) => {
                    await deleteEpisode(fd);
                    router.refresh();
                  }}
                  onSubmit={(e) => {
                    if (!window.confirm(`${ep.number}화를 삭제할까요? 그림도 함께 지워지고 되돌릴 수 없습니다.`))
                      e.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={ep.id} />
                  <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                    <Trash2 />
                    삭제
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
