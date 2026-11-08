import { saveEpisode, uploadEpisodeImage, type ActionState } from "@/app/admin/actions";
import { pdfToImages } from "@/lib/pdf-to-images";

/* 회차 하나 올리기 (브라우저에서 실행) — "회차 관리"와 "새 웹툰 만들기(1화 같이)"가 같이 씀
   1) PDF 는 쪽마다 그림(JPG)으로 바꿈
   2) 썸네일(선택) → 만화 그림을 한 장씩 올림 (한 번에 보낼 수 있는 크기 제한 때문)
   3) 회차 저장 (공개 날짜 포함) */

export type EpisodeUpload = {
  webtoonId: string;
  number: number;
  title: string;
  /** 고른 만화 그림·PDF (아직 정렬 안 된 상태여도 됨) */
  picked: File[];
  thumbnail: File | null;
  /** "now" 또는 연재 요일 0시 날짜 — 비우면 다음 연재일 */
  publishAt?: string;
};

export async function uploadEpisode(input: EpisodeUpload, onStatus: (message: string) => void): Promise<ActionState> {
  // 파일 이름 순서대로 정렬 (1, 2, 10 처럼 숫자도 자연스럽게)
  const picked = input.picked
    .filter((f) => f.size > 0)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  if (picked.length === 0) return { message: "만화 그림이나 PDF를 하나 이상 골라 주세요." };

  // PDF 는 쪽마다 그림(JPG)으로 바꾸고, 그림 파일은 그대로 사용
  const files: File[] = [];
  for (const f of picked) {
    if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
      try {
        files.push(...(await pdfToImages(f, (p, total) => onStatus(`PDF를 그림으로 바꾸는 중… ${f.name} ${p} / ${total}쪽`))));
      } catch {
        return { message: `${f.name}: PDF를 읽지 못했습니다. 다른 PDF로 해 보거나 그림 파일로 올려 주세요.` };
      }
    } else {
      files.push(f);
    }
  }

  async function uploadOne(file: File) {
    const one = new FormData();
    one.set("webtoon_id", input.webtoonId);
    one.set("file", file);
    return uploadEpisodeImage(one);
  }

  // 썸네일 (선택) — 안 고르면 무프사
  let thumbnailUrl: string | null = null;
  if (input.thumbnail && input.thumbnail.size > 0) {
    onStatus("썸네일 올리는 중…");
    const result = await uploadOne(input.thumbnail);
    if (!result.ok) return { message: `썸네일: ${result.message}` };
    thumbnailUrl = result.url;
  }

  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    onStatus(`그림 올리는 중… ${i + 1} / ${files.length}`);
    const result = await uploadOne(files[i]);
    if (!result.ok) return { message: result.message };
    urls.push(result.url);
  }

  onStatus("회차 저장 중…");
  return saveEpisode({
    webtoonId: input.webtoonId,
    number: input.number,
    title: input.title,
    imageUrls: urls,
    thumbnailUrl,
    publishAt: input.publishAt,
  });
}
