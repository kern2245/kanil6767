import { ImageResponse } from "next/og";

/* 카톡·SNS 에 세카이 주소를 공유하면 보이는 미리보기 그림 (1200×630)
   - 보라→분홍 배경 + 세카이 아이콘("セ") + SEKAI 글자
   - 한글 글꼴을 따로 불러오지 않아도 되도록 글자는 영어만 씁니다.
   - 웹툰 페이지는 웹툰 표지가 대신 보입니다 (app/webtoon/[id]/page.tsx) */

export const alt = "SEKAI — webtoon site";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a0b2e 0%, #3b0f5c 55%, #7a2a5c 100%)",
          color: "#ffffff",
        }}
      >
        <svg width="220" height="220" viewBox="0 0 32 32">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#a855f7" />
              <stop offset="1" stopColor="#fa897b" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="8" fill="url(#g)" />
          <path d="M7 13.5 H24.5 L20 18.5" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13 7.5 V21.5 Q13 25 16.5 25 H24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ marginTop: 40, fontSize: 120, fontWeight: 800, letterSpacing: 12 }}>SEKAI</div>
        <div style={{ marginTop: 8, fontSize: 40, opacity: 0.85 }}>Draw it. Post it. Read it — webtoons every day.</div>
      </div>
    ),
    size,
  );
}
