import { startSocialLogin } from "../actions";

/* 구글 · 카카오로 시작하기 버튼 (로그인과 가입이 한 번에 — 처음이면 자동으로 회원 가입)
   진짜 구글/카카오 계정만 쓸 수 있어서 가짜 이메일 가입을 막아요. */

const PROVIDERS = [
  { key: "kakao", label: "카카오로 시작하기", mark: "K" },
  { key: "google", label: "구글로 시작하기", mark: "G" },
] as const;

export function SocialButtons({ next }: { next: string }) {
  return (
    <div className="mx-auto grid w-full max-w-sm gap-2">
      {PROVIDERS.map((p) => (
        <form key={p.key} action={startSocialLogin}>
          <input type="hidden" name="provider" value={p.key} />
          <input type="hidden" name="next" value={next} />
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full border bg-background text-sm font-semibold transition-colors hover:bg-muted"
          >
            <span
              aria-hidden
              className="flex size-6 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background"
            >
              {p.mark}
            </span>
            {p.label}
          </button>
        </form>
      ))}
    </div>
  );
}
