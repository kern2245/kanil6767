import type { MetadataRoute } from "next";
import { siteConfig } from "@/site.config";
import { getEpisodes, getWebtoons } from "@/lib/data";

/* sitemap.xml — 검색 로봇에게 주는 "우리 사이트 페이지 목록" (지도)
   첫 화면 + 약관 + 모든 웹툰 + 모든 회차. 1시간마다 새로 만듭니다. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const pages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // 예시 웹툰(데이터베이스 연결 전)은 진짜 페이지가 없으니 id 가 sample 로 시작하면 뺍니다
  const webtoons = (await getWebtoons()).filter((w) => !w.id.startsWith("sample"));
  const lists = await Promise.all(webtoons.map((w) => getEpisodes(w.id)));

  webtoons.forEach((w, i) => {
    const episodes = lists[i];
    const latest = episodes.at(-1);
    pages.push({
      url: `${base}/webtoon/${w.id}`,
      lastModified: latest?.publish_at ?? latest?.created_at ?? w.created_at,
      changeFrequency: "weekly",
      priority: 0.8,
    });
    for (const ep of episodes) {
      pages.push({
        url: `${base}/webtoon/${w.id}/${ep.number}`,
        lastModified: ep.publish_at ?? ep.created_at,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  });

  return pages;
}
