import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 외부 이미지를 허용할 주소 목록 (Supabase 저장소, Unsplash)
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  experimental: {
    serverActions: {
      // 관리자 페이지에서 올릴 수 있는 이미지 최대 크기
      bodySizeLimit: "5mb",
    },
  },
  // 보안 헤더 (모든 페이지)
  async headers() {
    return [
      {
        // 게임 파일(/games/...)만 빼고 모든 페이지
        source: "/((?!games/).*)",
        headers: [
          // 다른 사이트가 세카이를 몰래 끼워 넣지 못하게 (클릭재킹 막기)
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // 브라우저가 파일 종류를 멋대로 바꿔 읽지 못하게
          { key: "X-Content-Type-Options", value: "nosniff" },
          // 다른 사이트로 넘어갈 때 우리 주소를 다 알려주지 않게
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // 카메라·마이크·위치는 안 씀
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // 게임 파일: 세카이 안(/game 페이지)에서만 끼워 넣기 허용, 다른 사이트는 여전히 막음
        source: "/games/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
