import Link from "next/link";

import { startSocialLogin } from "../actions";
import type { Dict } from "@/lib/i18n";

/* 구글로 시작하기 버튼 (로그인과 가입이 한 번에 — 처음이면 자동으로 회원 가입)
   진짜 구글 계정만 쓸 수 있어서 가짜 이메일 가입을 막아요.
   버튼 모양은 구글이 권하는 흰 바탕 + 4색 G 로고 (로고 색은 구글 공식 색이라 그대로 씀) */

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-5">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

/* 나이 확인 + 약관 동의 체크 (체크해야 구글 버튼이 눌림 — 서버에서도 한 번 더 확인)
   한국어: 만 14세 이상 (한국 개인정보 보호법) / 영어: 13세 이상 (미국 어린이 개인정보 보호법 COPPA) */
export function SocialButtons({ next, t }: { next: string; t: Dict["login"] }) {
  return (
    <form action={startSocialLogin} className="space-y-4">
      <input type="hidden" name="provider" value="google" />
      <input type="hidden" name="next" value={next} />
      <label className="flex cursor-pointer items-start gap-2.5 text-left text-xs leading-relaxed text-muted-foreground">
        <input type="checkbox" name="agree" value="yes" required className="mt-0.5 size-4 shrink-0 accent-primary" />
        <span>
          {t.agePrefix}
          <Link href="/terms" target="_blank" className="underline hover:text-foreground">
            {t.ageTerms}
          </Link>
          {t.ageAnd}
          <Link href="/privacy" target="_blank" className="underline hover:text-foreground">
            {t.agePrivacy}
          </Link>
          {t.ageSuffix}
        </span>
      </label>
      <button
        type="submit"
        className="flex h-12 w-full items-center justify-center gap-3 rounded-full bg-white text-[15px] font-semibold text-neutral-900 shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5 active:translate-y-0"
      >
        <GoogleLogo />
        {t.google}
      </button>
    </form>
  );
}
