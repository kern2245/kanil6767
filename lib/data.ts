import { sampleItems, sampleWebtoons, siteConfig } from "@/site.config";
import { getPublicClient } from "@/lib/supabase";
import type { ContactTexts, Episode, HeroTexts, Item, Webtoon } from "@/lib/types";

/**
 * 특정 섹션의 카드 목록을 가져옵니다.
 * - Supabase가 연결 안 됐으면: site.config.ts 의 예시 카드를 보여줌
 * - 연결됐으면: 데이터베이스에서 '보이기'로 설정된 카드만 순서대로 가져옴
 */
export async function getItems(section: string): Promise<Item[]> {
  const supabase = getPublicClient();
  const samples = sampleItems.filter((item) => item.section === section);
  if (!supabase) return samples;

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("section", section)
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getItems] Supabase 읽기 실패:", error.message);
    return samples;
  }
  return (data ?? []) as Item[];
}

/**
 * 첫 화면(히어로) 글자를 가져옵니다.
 * - Supabase가 연결 안 됐거나 비어 있는 칸은: site.config.ts 의 hero 글자를 그대로 씀
 * - 관리자 페이지에서 저장한 칸은: 그 글자로 바꿔서 보여줌
 */
export async function getHeroTexts(): Promise<HeroTexts> {
  const { hero } = siteConfig;
  const fallback: HeroTexts = {
    eyebrow: hero.eyebrow,
    title: hero.title,
    description: hero.description,
    primaryLabel: hero.primaryCta.label,
    secondaryLabel: hero.secondaryCta.label,
  };

  const supabase = getPublicClient();
  if (!supabase) return fallback;

  const { data, error } = await supabase.from("hero").select("*").eq("id", 1).maybeSingle();
  if (error) {
    console.error("[getHeroTexts] Supabase 읽기 실패:", error.message);
    return fallback;
  }

  return {
    eyebrow: data?.eyebrow || fallback.eyebrow,
    title: data?.title || fallback.title,
    description: data?.description || fallback.description,
    primaryLabel: data?.primary_label || fallback.primaryLabel,
    secondaryLabel: data?.secondary_label || fallback.secondaryLabel,
  };
}

/**
 * 요일별 웹툰 목록을 가져옵니다.
 * - Supabase가 연결 안 됐거나, 웹툰이 하나도 없으면: site.config.ts 의 예시 웹툰을 보여줌
 * - 있으면: '보이기'로 설정된 웹툰만 순서대로 가져옴
 */
export async function getWebtoons(): Promise<Webtoon[]> {
  const supabase = getPublicClient();
  if (!supabase) return sampleWebtoons;

  const { data, error } = await supabase
    .from("webtoons")
    .select("*")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getWebtoons] Supabase 읽기 실패:", error.message);
    return sampleWebtoons;
  }
  return data && data.length > 0 ? (data as Webtoon[]) : sampleWebtoons;
}

/** 웹툰 한 개 (웹툰 페이지·뷰어용). 없거나 숨김이면 null. */
export async function getWebtoon(id: string): Promise<Webtoon | null> {
  const supabase = getPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("webtoons")
    .select("*")
    .eq("id", id)
    .eq("is_visible", true)
    .maybeSingle();
  if (error) {
    console.error("[getWebtoon] Supabase 읽기 실패:", error.message);
    return null;
  }
  return (data as Webtoon) ?? null;
}

/** 웹툰의 회차 목록 (그림 주소는 빼고, 회차 번호 순서대로) */
export async function getEpisodes(webtoonId: string): Promise<Omit<Episode, "image_urls">[]> {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("episodes")
    .select("id, webtoon_id, number, title, created_at")
    .eq("webtoon_id", webtoonId)
    .order("number", { ascending: true });
  if (error) {
    console.error("[getEpisodes] Supabase 읽기 실패:", error.message);
    return [];
  }
  return data ?? [];
}

/** 회차 하나 (뷰어용, 그림 주소 포함). 없으면 null. */
export async function getEpisode(webtoonId: string, number: number): Promise<Episode | null> {
  const supabase = getPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("webtoon_id", webtoonId)
    .eq("number", number)
    .maybeSingle();
  if (error) {
    console.error("[getEpisode] Supabase 읽기 실패:", error.message);
    return null;
  }
  return (data as Episode) ?? null;
}

/** 웹툰 제목 검색 (검색 페이지용). 대소문자 구분 없이 제목에 검색어가 들어간 웹툰. */
export async function searchWebtoons(query: string): Promise<Webtoon[]> {
  const q = query.trim();
  const supabase = getPublicClient();
  if (!q || !supabase) return [];

  // % 와 _ 는 검색 기호라서 글자 그대로 찾도록 앞에 \ 를 붙임
  const escaped = q.replace(/[\\%_]/g, (c) => "\\" + c);
  const { data, error } = await supabase
    .from("webtoons")
    .select("*")
    .eq("is_visible", true)
    .ilike("title", `%${escaped}%`)
    .order("title", { ascending: true })
    .limit(60);

  if (error) {
    console.error("[searchWebtoons] Supabase 읽기 실패:", error.message);
    return [];
  }
  return (data ?? []) as Webtoon[];
}

/**
 * TEA TIME(연락처) 칸 글자를 가져옵니다.
 * - Supabase가 연결 안 됐거나 비어 있는 칸은: site.config.ts 의 contact 글자를 그대로 씀
 * - 회장 페이지 "TEA TIME" 탭에서 저장한 칸은: 그 글자로 바꿔서 보여줌
 */
export async function getContactTexts(): Promise<ContactTexts> {
  const { contact } = siteConfig;
  const fallback: ContactTexts = {
    eyebrow: contact.eyebrow,
    title: contact.title,
    description: contact.description,
  };

  const supabase = getPublicClient();
  if (!supabase) return fallback;

  const { data, error } = await supabase.from("contact_texts").select("*").eq("id", 1).maybeSingle();
  if (error) {
    console.error("[getContactTexts] Supabase 읽기 실패:", error.message);
    return fallback;
  }

  return {
    eyebrow: data?.eyebrow || fallback.eyebrow,
    title: data?.title || fallback.title,
    description: data?.description || fallback.description,
  };
}
