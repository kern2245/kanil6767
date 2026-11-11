import "server-only";
import { cookies, headers } from "next/headers";

import { getDict, LANG_COOKIE, type Lang } from "@/lib/i18n";

/* 지금 화면 언어 고르기 (서버에서)
   1) "EN / 한" 버튼으로 고른 적이 있으면 그 언어 (쿠키에 1년 기억)
   2) 처음 온 사람: 브라우저 언어가 한국어면 한국어, 아니면 영어 (미국 독자는 자동으로 영어) */
export async function getLang(): Promise<Lang> {
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  if (saved === "ko" || saved === "en") return saved;
  const accept = (await headers()).get("accept-language") ?? "";
  return accept.trim().toLowerCase().startsWith("ko") || accept === "" ? "ko" : "en";
}

/** 지금 언어의 글자 사전 */
export async function getT() {
  const lang = await getLang();
  return { lang, t: getDict(lang) };
}
