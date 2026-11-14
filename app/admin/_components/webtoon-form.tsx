"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookCheck, Trash2 } from "lucide-react";

import {
  deleteWebtoon,
  saveWebtoon,
  setWebtoonCompleted,
  updateWebtoonCover,
  type ActionState,
} from "@/app/admin/actions";
import { ImageSlotButtons } from "./image-slot-buttons";
import { fileInputClass } from "./form-styles";
import { uploadEpisode } from "./upload-episode";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/site.config";
import { publishOptions } from "@/lib/publish-time";
import type { Webtoon, Weekday } from "@/lib/types";

const inputClass =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50";

/** 웹툰 추가/수정 입력 칸. webtoon 을 넘기면 '수정', 안 넘기면 '새로 추가' 모드.
    완결 체크는 여기 없음 → 회장 페이지 웹툰 목록의 "완결로 넘기기" 버튼(CompleteButton)으로만 */
export function WebtoonForm({ webtoon }: { webtoon?: Webtoon }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveWebtoon, {});
  const formRef = useRef<HTMLFormElement>(null);

  // 새로 추가에 성공하면 입력 칸 비우기
  useEffect(() => {
    if (state.ok && !webtoon) formRef.current?.reset();
  }, [state, webtoon]);

  return (
    <form ref={formRef} action={action} className="grid gap-4">
      {webtoon ? <input type="hidden" name="id" value={webtoon.id} /> : null}

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">제목 *</span>
        <input name="title" required defaultValue={webtoon?.title ?? ""} className={inputClass} />
      </label>

      <LangSelect defaultValue={webtoon?.lang ?? "ko"} />

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">연재 요일 *</span>
        <select name="weekday" defaultValue={webtoon?.weekday ?? "mon"} className={inputClass}>
          {siteConfig.webtoons.weekdays.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}요일
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">표지 그림 (선택, 5MB 이하, 세로로 긴 그림 추천)</span>
        <input name="cover" type="file" accept="image/*" className={fileInputClass} />
      </label>

      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_visible" defaultChecked={webtoon?.is_visible ?? true} />
          사이트에 보이기
        </label>
        {webtoon?.cover_url ? (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="remove_cover" />
            무프사로 (표지 빼기)
          </label>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : webtoon ? "수정 저장" : "추가하기"}
        </Button>
        {state.message ? (
          <p className={state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

/** 한국판 / 영어판 고르기 — 서로 따로인 웹툰이라, 한국어 화면엔 한국판만 · 영어 화면(EN)엔 영어판만 보여요 */
function LangSelect({ defaultValue }: { defaultValue: "ko" | "en" }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">언어 *</span>
      <select name="lang" defaultValue={defaultValue} className={inputClass}>
        <option value="ko">한국판 (한국어 화면에 보임)</option>
        <option value="en">영어판 (영어 화면 EN 에 보임)</option>
      </select>
    </label>
  );
}

/** "새 웹툰 만들기" 칸 — 웹툰 정보 + (선택) 1화를 한 번에
    1화 칸을 비워 두면 웹툰만 만들어지고, 만화 그림·PDF 를 고르면 웹툰을 만든 뒤 바로 1화까지 올라가요.
    1화 올리는 과정은 회차 관리와 같음 (upload-episode.ts) */
export function NewWebtoonForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [weekday, setWeekday] = useState<Weekday>("mon");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<ActionState | null>(null);
  // 1화 공개 날짜 목록 (고른 연재 요일에 맞춰 바뀜)
  const choices = useMemo(() => publishOptions(weekday, false), [weekday]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const images = (data.getAll("ep_images") as File[]).filter((f) => f.size > 0);
    const epTitle = String(data.get("ep_title") ?? "").trim();
    if (images.length > 0 && !epTitle) {
      setStatus({ message: "1화를 같이 올리려면 1화 제목을 입력해 주세요." });
      return;
    }

    setPending(true);
    setStatus({ message: "웹툰 만드는 중…" });
    const created = await saveWebtoon({}, data);
    if (!created.ok || !created.id) {
      setStatus(created);
      setPending(false);
      return;
    }

    if (images.length > 0) {
      const thumb = data.get("ep_thumbnail");
      const episode = await uploadEpisode(
        {
          webtoonId: created.id,
          number: 1,
          title: epTitle,
          picked: images,
          thumbnail: thumb instanceof File ? thumb : null,
          publishAt: String(data.get("ep_publishAt") ?? "") || undefined,
        },
        (message) => setStatus({ message }),
      );
      setStatus(
        episode.ok
          ? { ok: true, message: `웹툰을 만들고 ${episode.message}` }
          : { message: `웹툰은 만들었어요. 1화는 실패: ${episode.message} (카드의 "회차 관리"에서 다시 올려 주세요)` },
      );
    } else {
      setStatus(created);
    }

    setPending(false);
    formRef.current?.reset();
    setWeekday("mon");
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">제목 *</span>
        <input name="title" required className={inputClass} />
      </label>

      <LangSelect defaultValue="ko" />

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">연재 요일 *</span>
        <select
          name="weekday"
          value={weekday}
          onChange={(e) => setWeekday(e.target.value as Weekday)}
          className={inputClass}
        >
          {siteConfig.webtoons.weekdays.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}요일
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">표지 그림 (선택, 5MB 이하, 세로로 긴 그림 추천)</span>
        <input name="cover" type="file" accept="image/*" className={fileInputClass} />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_visible" defaultChecked />
        사이트에 보이기
      </label>

      {/* 1화 같이 올리기 (선택) */}
      <fieldset className="grid gap-4 rounded-xl border border-dashed p-4">
        <legend className="px-1 text-sm font-semibold">1화 같이 올리기 (선택)</legend>
        <p className="-mt-2 text-xs text-muted-foreground">
          비워 두면 웹툰만 만들어져요. 1화는 나중에 카드의 &quot;회차 관리&quot;에서 올려도 돼요.
        </p>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">1화 제목</span>
          <input name="ep_title" placeholder="예: 첫 만남" className={inputClass} />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">만화 그림 또는 PDF (여러 개 한 번에 선택, 그림은 한 장 4MB 이하)</span>
          <input name="ep_images" type="file" accept="image/*,application/pdf,.pdf" multiple className={fileInputClass} />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">공개 날짜</span>
          <select key={weekday} name="ep_publishAt" defaultValue={choices[0]?.value} className={inputClass}>
            {choices.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">1화 썸네일 (선택, 안 고르면 무프사)</span>
          <input name="ep_thumbnail" type="file" accept="image/*" className={fileInputClass} />
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "올리는 중..." : "웹툰 만들기"}
        </Button>
        {status?.message ? (
          <p className={status.ok || pending ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
            {status.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

/** 웹툰 목록의 표지 버튼: "표지 바꾸기" / "무프사로"(표지 없는 기본 모양) */
export function CoverButtons({ id, hasCover }: { id: string; hasCover: boolean }) {
  return <ImageSlotButtons id={id} hasImage={hasCover} label="표지" fileField="cover" action={updateWebtoonCover} />;
}

/** 회장 전용: "완결로 넘기기" / "연재로 되돌리기" 버튼 (한 번 더 물어봄) */
export function CompleteButton({ id, completed }: { id: string; completed: boolean }) {
  return (
    <form
      action={setWebtoonCompleted}
      onSubmit={(e) => {
        const message = completed
          ? "이 웹툰을 다시 연재 중으로 되돌릴까요? 요일별 웹툰으로 돌아가요."
          : "이 웹툰을 완결로 넘길까요? 요일별 웹툰에서 빠지고 완결 웹툰으로 옮겨져요.";
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="completed" value={completed ? "off" : "on"} />
      <Button type="submit" variant="ghost" size="sm">
        <BookCheck />
        {completed ? "연재로 되돌리기" : "완결로 넘기기"}
      </Button>
    </form>
  );
}

/** 웹툰 삭제 버튼 — 실수 방지를 위해 한 번 더 물어봅니다. */
export function DeleteWebtoonButton({ id, coverUrl }: { id: string; coverUrl: string | null }) {
  return (
    <form
      action={deleteWebtoon}
      onSubmit={(e) => {
        if (!window.confirm("정말 삭제할까요? 되돌릴 수 없습니다.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="cover_url" value={coverUrl ?? ""} />
      <Button type="submit" variant="ghost" size="sm" className="text-destructive">
        <Trash2 />
        삭제
      </Button>
    </form>
  );
}
