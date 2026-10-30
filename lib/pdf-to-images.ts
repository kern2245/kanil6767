/* PDF → 그림(JPG) 바꾸기 — 브라우저(관리자 화면)에서만 실행됩니다.
   - PDF 한 쪽을 가로 1000px 그림으로 그립니다.
   - 세로로 아주 긴 쪽(웹툰 원고)은 4000px 높이씩 잘라서 여러 장으로 만듭니다.
   - 한 장이 4MB 를 넘으면 화질을 조금씩 낮춰 다시 만듭니다. */

const TARGET_WIDTH = 1000; // 그림 가로 크기(px)
const SLICE_HEIGHT = 4000; // 긴 쪽을 자르는 높이(px)
const MAX_BYTES = 4 * 1024 * 1024; // 4MB
const QUALITIES = [0.9, 0.8, 0.7, 0.6, 0.5];

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("그림 만들기 실패"))), "image/jpeg", quality),
  );
}

async function toSmallJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  let blob = await canvasToJpeg(canvas, QUALITIES[0]);
  for (const q of QUALITIES.slice(1)) {
    if (blob.size <= MAX_BYTES) break;
    blob = await canvasToJpeg(canvas, q);
  }
  return blob;
}

/**
 * PDF 파일을 쪽 순서대로 JPG 그림 파일들로 바꿉니다.
 * @param onProgress 진행 상황 (몇 쪽째 / 전체 쪽 수)
 */
export async function pdfToImages(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<File[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const base = file.name.replace(/\.pdf$/i, "");
  const images: File[] = [];

  try {
    for (let p = 1; p <= pdf.numPages; p++) {
      onProgress?.(p, pdf.numPages);
      const page = await pdf.getPage(p);
      const scale = TARGET_WIDTH / page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale });
      const width = Math.round(viewport.width);
      const fullHeight = Math.round(viewport.height);

      // 긴 쪽은 SLICE_HEIGHT 씩 잘라서 그림
      for (let top = 0, part = 1; top < fullHeight; top += SLICE_HEIGHT, part++) {
        const height = Math.min(SLICE_HEIGHT, fullHeight - top);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("그림판을 만들 수 없습니다.");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        await page.render({
          canvas,
          canvasContext: ctx,
          viewport,
          transform: [1, 0, 0, 1, 0, -top],
          // "print": 화면 애니메이션 타이밍을 기다리지 않음 → 다른 탭으로 옮겨도 변환이 멈추지 않음
          intent: "print",
        }).promise;

        const blob = await toSmallJpeg(canvas);
        const name = `${base}-${String(p).padStart(3, "0")}-${String(part).padStart(2, "0")}.jpg`;
        images.push(new File([blob], name, { type: "image/jpeg" }));
      }
      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }

  return images;
}
