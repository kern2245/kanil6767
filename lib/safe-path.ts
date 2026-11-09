/* 로그인 뒤 돌아갈 주소 검사 (가짜 사이트로 넘기는 "주소 돌려보내기" 공격 막기)
   - 우리 사이트 안의 주소(/로 시작)만 허용
   - "//다른사이트", "/\다른사이트" 처럼 브라우저가 다른 사이트로 읽는 주소는 막음
   - 이상하면 첫 화면("/")으로 */

export function safeNextPath(raw: unknown): string {
  if (typeof raw !== "string") return "/";
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  // 역슬래시(\), 눈에 안 보이는 글자(줄바꿈·탭 등)가 들어가면 막음
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  // 마지막으로 진짜 주소처럼 풀어 봐서 우리 사이트 밖으로 나가면 막음
  try {
    const base = "http://sekai.local";
    if (new URL(value, base).origin !== base) return "/";
  } catch {
    return "/";
  }
  return value;
}
