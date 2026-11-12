import type { MetadataRoute } from "next";
import { siteConfig } from "@/site.config";

/* robots.txt — 구글·네이버 같은 검색 로봇에게 "여기는 봐도 돼 / 여기는 보지 마" 알려주는 안내문
   관리자·작가 스튜디오·설정·로그인 화면은 검색에 안 나오게 막습니다. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/artist", "/settings", "/auth", "/login"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
