"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImageIcon, Trash2 } from "lucide-react";

import {
  deleteEpisode,
  saveEpisode,
  updateEpisodePublishAt,
  updateEpisodeThumbnail,
  uploadEpisodeImage,
  type ActionState,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { pdfToImages } from "@/lib/pdf-to-images";
import type { PublishOption } from "@/lib/publish-time";
import { ImageSlotButtons } from "./image-slot-buttons";

/** 예약 회차의 공개 날짜 바꾸기 / 지금 바로 공개 */
function RescheduleControls({ episodeId, choices: allChoices }: { episodeId: string; choices: PublishOption[] }) {
  const router = useRouter();
  const choices = allChoices.filter((c) => c.value !== "now"); // 날짜만 (완결 웹툰이면 비어 있음)
  const [value, setValue] = useState(choices[0]?.value ?? "now");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<ActionState | null>(null);

  async function send(publishAt: string) {
    if (publishAt === "now" && !window.confirm("이 회차를 지금 바로 독자에게 공개할까요?")) return;
    setPending(true);
    const data = new FormData();
    data.set("id", episodeId);
    data.set("publishAt", publishAt);
    const result = await updateEpisodePublishAt(data);
    setStatus(result);
    setPending(false);
    if (result.ok) router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {choices.length > 0 ? (
        <>
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="공개 날짜 고르기"
            className="h-8 rounded-lg border bg-background px-2 text-base sm:text-sm"
          >
            {choices.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => send(value)}>
            공개 날짜 바꾸기
          </Button>
        </>
      ) : null}
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => send("now")}>
        지금 바로 공개
      </Button>
      {status?.message ? (
        <span className={status.ok ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>{status.message}</span>
      ) : null}
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50";

type EpisodeRow = {
  id: string;
  number: number;
  title: string;
  imageCount: number;
  /** 공개 전(예약)이면 공개 예정 시간 글자, 이미 공개됐으면 null */
  scheduledLabel: string | null;
  /** 회차 썸네일 (없으면 무프사) */
  thumbnailUrl: string | null;
};

/** 회차 썸네일 작은 그림. 없으면 무프사(그림 아이콘) */
function EpisodeThumb({ url }: { url: string | null }) {
  return (
    <div className="relative aspect-[5/3] w-14 shrink-0 overflow-hidden rounded bg-muted">
      {url ? (
        <Image src={url} alt="" fill sizes="56px" className="object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <ImageIcon className="size-4" />
        </div>
      )}
    </div>
  );
}

/** 웹툰 한 개의 회차 관리: 회차 추가(그림 여러 장 또는 PDF + 썸네일) + 올린 회차 목록·썸네일 바꾸기·삭제
    그림은 파일 이름 순서대로(001, 002 …) 위에서 아래로 붙습니다.
    PDF 는 브라우저에서 쪽마다 JPG 로 바꾼 뒤 한 장씩 올립니다. (lib/pdf-to-images.ts) */
export function EpisodeManager({
  webtoonId,
  episodes,
  publishChoices,
  canDelete = true,
}: {
  webtoonId: string;
  episodes: EpisodeRow[];
  /** 고를 수 있는 공개 날짜 (연재 요일 0시, 최대 1년 뒤 + "지금 바로") — 첫 번째가 기본값 */
  publishChoices: PublishOption[];
  /** false 면 회차 삭제 버튼을 숨김 (작가 페이지). 삭제는 서버에서도 회장만 가능 */
  canDelete?: boolean;
}) {
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
    const publishAt = String(data.get("publishAt") ?? "") || undefined;
    // 파일 이름 순서대로 정렬 (1, 2, 10 처럼 숫자도 자연스럽게)
    const picked = (data.getAll("images") as File[])
      .filter((f) => f.size > 0)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (picked.length === 0) {
      setStatus({ message: "만화 그림이나 PDF를 하나 이상 골라 주세요." });
      return;
    }

    setPending(true);

    // PDF 는 쪽마다 그림(JPG)으로 바꾸고, 그림 파일은 그대로 사용
    const files: File[] = [];
    for (const f of picked) {
      if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
        try {
          const pages = await pdfToImages(f, (p, total) =>
            setStatus({ message: `PDF를 그림으로 바꾸는 중… ${f.name} ${p} / ${total}쪽` }),
          );
          files.push(...pages);
        } catch {
          setStatus({ message: `${f.name}: PDF를 읽지 못했습니다. 다른 PDF로 해 보거나 그림 파일로 올려 주세요.` });
          setPending(false);
          return;
        }
      } else {
        files.push(f);
      }
    }
    // 썸네일 (선택) — 먼저 한 장 올림. 안 고르면 무프사
    let thumbnailUrl: string | null = null;
    const thumb = data.get("thumbnail");
    if (thumb instanceof File && thumb.size > 0) {
      setStatus({ message: "썸네일 올리는 중…" });
      const one = new FormData();
      one.set("webtoon_id", webtoonId);
      one.set("file", thumb);
      const result = await uploadEpisodeImage(one);
      if (!result.ok) {
        setStatus({ message: `썸네일: ${result.message}` });
        setPending(false);
        return;
      }
      thumbnailUrl = result.url;
    }

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
    const saved = await saveEpisode({ webtoonId, number, title, imageUrls: urls, thumbnailUrl, publishAt });
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
          <span className="font-medium">만화 그림 또는 PDF * (여러 개 한 번에 선택, 그림은 한 장 4MB 이하)</span>
          <input
            name="images"
            type="file"
            accept="image/*,application/pdf,.pdf"
            multiple
            required
            className="text-sm"
          />
          <span className="text-xs text-muted-foreground">
            연재 요일이 아닌 날 올리면 다음 연재 요일 0시에 공개돼요(예약). 연재 요일 당일에 올리면 바로 공개돼요.
            <br />
            파일 이름 순서대로 위에서 아래로 붙습니다. (예: 001.jpg, 002.jpg) PDF는 쪽 순서대로 그림으로 바뀌어 올라갑니다.
          </span>
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">공개 날짜</span>
          <select name="publishAt" defaultValue={publishChoices[0]?.value} className={inputClass}>
            {publishChoices.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            연재 요일 0시 중에서 최대 1년 뒤까지 고를 수 있어요. 공개 전까지는 독자에게 안 보여요.
          </span>
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">회차 썸네일 (선택, 4MB 이하, 가로로 긴 그림 추천)</span>
          <input name="thumbnail" type="file" accept="image/*" className="text-sm" />
          <span className="text-xs text-muted-foreground">
            안 고르면 무프사(그림 없는 기본 모양)로 보여요. 나중에 회차 목록에서 바꿀 수 있어요.
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
              <li key={ep.id} className="px-3 py-2 text-sm">
                <div className="flex items-center gap-3">
                <EpisodeThumb url={ep.thumbnailUrl} />
                <span className="w-10 shrink-0 text-muted-foreground">{ep.number}화</span>
                <span className="min-w-0 flex-1 truncate">{ep.title}</span>
                {ep.scheduledLabel ? (
                  <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                    예약 · {ep.scheduledLabel} 공개
                  </span>
                ) : null}
                <span className="shrink-0 text-xs text-muted-foreground">그림 {ep.imageCount}장</span>
                {canDelete ? (
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
                ) : null}
                </div>
                {/* 예약 회차: 공개 날짜 바꾸기 / 지금 바로 공개 */}
                {ep.scheduledLabel ? (
                  <div className="mt-2 pl-1">
                    <RescheduleControls episodeId={ep.id} choices={publishChoices} />
                  </div>
                ) : null}
                {/* 썸네일 바꾸기 / 무프사로 */}
                <div className="mt-1 pl-1">
                  <ImageSlotButtons
                    id={ep.id}
                    hasImage={Boolean(ep.thumbnailUrl)}
                    label="썸네일"
                    fileField="thumbnail"
                    action={updateEpisodeThumbnail}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
