/* 올릴 수 있는 그림 종류 검사 — JPG · PNG · WEBP · GIF 만
   SVG 는 그림 안에 코드(스크립트)를 숨길 수 있어서 표지·회차·썸네일·프사로는 받지 않아요. */

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];

/** 괜찮은 그림 파일이면 true (종류와 파일 이름 끝 둘 다 확인) */
export function isAllowedImage(file: File) {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  return ALLOWED_IMAGE_TYPES.includes(file.type) && ALLOWED_EXTENSIONS.includes(ext);
}

/** 저장할 때 쓸 파일 끝 이름 (그림 종류에서 정함 → 이상한 이름으로 저장되지 않게) */
export function imageExtension(file: File) {
  return file.type === "image/jpeg" ? "jpg" : file.type.replace("image/", "");
}

export const IMAGE_ONLY_MESSAGE = "JPG · PNG · WEBP · GIF 그림만 올릴 수 있어요. (SVG는 안 돼요)";
