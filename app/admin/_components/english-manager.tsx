"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe, Trash2 } from "lucide-react";

import { saveEpisodeEnglish, saveWebtoonTitleEn, type ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { fileInputClass } from "./form-styles";
import { uploadPages } from "./upload-episode";

/* 스튜디오 "영어판 🌐" 탭 — 외국 독자용
   - 웹툰 영어 제목
   - 회차마다: 영어 회차 제목 + 영어판 그림(그림 여러 장 또는 PDF)
   영어 화면(맨 위 EN)에서 영어판이 있으면 영어판, 없으면 원래 한국어 그림이 보여요. */

const inputClass =
  "h-10 w-full rounded-lg border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring/50 sm:text-sm";

export type EnglishEpisodeRow = { id: string; number: number; title: string; titleEn: string; enImageCount: number };

function Status({ status }: { status: ActionState | null }) {
  if (!status?.message) return null;
  return <p className={status.ok ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>{status.message}</p>;
}

function WebtoonTitleEn({ webtoonId, titleEn }: { webtoonId: string; titleEn: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<ActionState | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="grid gap-2"
      action={async (fd) => {
        setPending(true);
        const result = await saveWebtoonTitleEn(fd);
        setStatus(result);
        setPending(false);
        if (result.ok) router.refresh();
      }}
    >
      <input type="hidden" name="id" value={webtoonId} />
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">웹툰 영어 제목</span>
        <div className="flex gap-2">
          <input name="title_en" defaultValue={titleEn} placeholder="예: Ttungsik's Day" maxLength={100} className={inputClass} />
          <Button type="submit" size="sm" className="h-10 shrink-0" disabled={pending}>
            저장
          </Button>
        </div>
      </label>
      <Status status={status} />
    </form>
  );
}

function EpisodeEnglish({ webtoonId, ep }: { webtoonId: string; ep: EnglishEpisodeRow }) {
  const router = useRouter();
  const [status, setStatus] = useState<ActionState | null>(null);
  const [pending, setPending] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const files = (data.getAll("pages") as File[]).filter((f) => f.size > 0);
    setPending(true);
    let imageUrls: string[] | undefined;
    if (files.length > 0) {
      const uploaded = await uploadPages(webtoonId, files, (message) => setStatus({ message }));
      if (!uploaded.ok) {
        setStatus({ message: uploaded.message });
        setPending(false);
        return;
      }
      imageUrls = uploaded.urls;
    }
    const result = await saveEpisodeEnglish({ episodeId: ep.id, titleEn: String(data.get("title_en") ?? ""), imageUrls });
    setStatus(result);
    setPending(false);
    if (result.ok) router.refresh();
  }

  async function removePages() {
    if (!window.confirm(`${ep.number}화 영어판 그림을 뺄까요? (원래 한국어 그림은 그대로예요)`)) return;
    setPending(true);
    const result = await saveEpisodeEnglish({ episodeId: ep.id, titleEn: ep.titleEn, imageUrls: [] });
    setStatus(result);
    setPending(false);
    if (result.ok) router.refresh();
  }

  return (
    <li className="grid gap-3 px-3 py-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-10 shrink-0 text-muted-foreground">{ep.number}화</span>
        <span className="min-w-0 flex-1 truncate font-medium">{ep.title}</span>
        {ep.enImageCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            <Check className="size-3" />
            영어판 그림 {ep.enImageCount}장
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">영어판 없음</span>
        )}
      </div>
      <form onSubmit={save} className="grid gap-2">
        <input name="title_en" defaultValue={ep.titleEn} placeholder="영어 회차 제목 (예: Day 1)" maxLength={100} className={inputClass} />
        <input name="pages" type="file" accept="image/*,application/pdf,.pdf" multiple className={fileInputClass} />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "저장 중..." : "저장"}
          </Button>
          {ep.enImageCount > 0 ? (
            <Button type="button" size="sm" variant="ghost" className="text-destructive" disabled={pending} onClick={removePages}>
              <Trash2 />
              영어판 그림 빼기
            </Button>
          ) : null}
        </div>
        <Status status={status} />
      </form>
    </li>
  );
}

export function EnglishManager({
  webtoonId,
  titleEn,
  episodes,
}: {
  webtoonId: string;
  titleEn: string;
  episodes: EnglishEpisodeRow[];
}) {
  return (
    <div className="grid gap-6">
      <p className="flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
        <Globe className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>
          외국 독자가 맨 위 <b>EN</b>을 누르면, 여기서 넣은 영어 제목과 영어판 그림이 보여요. 영어판이 없는 회차는 원래
          그림이 그대로 보여요. 말풍선 글자만 영어로 바꾼 그림을 한국어판과 같은 순서로 올려 주세요. (그림 여러 장 또는 PDF)
        </span>
      </p>
      <WebtoonTitleEn webtoonId={webtoonId} titleEn={titleEn} />
      <div>
        <p className="mb-2 text-sm font-medium">회차별 영어판 ({episodes.length})</p>
        {episodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">먼저 &ldquo;회차 관리&rdquo;에서 회차를 올려 주세요.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {episodes.map((ep) => (
              <EpisodeEnglish key={ep.id} webtoonId={webtoonId} ep={ep} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
