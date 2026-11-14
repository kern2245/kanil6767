import { sampleItems, sampleWebtoons, siteConfig } from "@/site.config";
import { getPublicClient } from "@/lib/supabase";
import type { Ad, Comment, ContactTexts, Episode, HeroTexts, Item, Webtoon } from "@/lib/types";

/** 회차 댓글 목록 (오래된 것부터). Supabase 연결이 없거나 댓글 표가 아직 없으면 빈 목록. */
export async function getComments(episodeId: string): Promise<Comment[]> {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("episode_id", episodeId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[getComments] Supabase 읽기 실패:", error.message);
    return [];
  }
  return (data as Comment[]) ?? [];
}

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
export async function getWebtoons(lang?: "ko" | "en"): Promise<Webtoon[]> {
  // lang 을 주면 그 언어 웹툰만 (한국판 / 영어판), 안 주면 전부 (sitemap 용)
  // 예시 웹툰(sample)은 한국어 화면에서만 보여줌
  const samples = lang === "en" ? [] : sampleWebtoons;
  const supabase = getPublicClient();
  if (!supabase) return samples;

  let query = supabase.from("webtoons").select(WEBTOON_WITH_LATEST_EPISODE).eq("is_visible", true);
  if (lang) query = query.eq("lang", lang);
  const { data, error } = await query
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("publish_at", { referencedTable: "episodes", ascending: false })
    .limit(1, { referencedTable: "episodes" });

  if (error) {
    console.error("[getWebtoons] Supabase 읽기 실패:", error.message);
    return samples;
  }
  return data && data.length > 0 ? data.map(withNewFlag) : samples;
}

/* ---------- UP 표시 (새 회차) ----------
   새 회차가 공개된 "그날(한국 날짜)"에만 웹툰 카드에 UP 이 붙고, 자정이 지나 다음 날이 되면 사라집니다.
   (예: 토요일 밤 11시에 올려도 일요일 0시에 UP 이 사라짐 / 예약 회차는 공개된 날 하루)
   (회장·작가 페이지에서 "UP 항상 표시"를 켠 웹툰은 날짜와 상관없이 붙음) */

/** 한국 날짜를 "2026-11-14" 처럼 */
function koreanDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(value));
}

/** 웹툰 + 가장 최근에 공개된 회차의 공개 시간 (회차가 여러 개여도 맨 마지막 1개만 가져옴) */
const WEBTOON_WITH_LATEST_EPISODE = "*, episodes(publish_at)";

type WebtoonRowWithEpisodes = Webtoon & { episodes?: { publish_at: string }[] | null };

/** 데이터베이스에서 읽은 웹툰에 "오늘(한국 날짜) 새 회차가 공개됐는지(is_new)" 를 붙임 */
function withNewFlag(row: WebtoonRowWithEpisodes): Webtoon {
  const { episodes, ...webtoon } = row;
  const latest = episodes?.[0]?.publish_at ?? null;
  const isNew = latest !== null && koreanDate(latest) === koreanDate(new Date());
  return { ...webtoon, latest_episode_at: latest, is_new: isNew };
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

/** 웹툰의 회차 목록 (그림 주소는 빼고, 회차 번호 순서대로)
    공개 시간이 안 된 예약 회차는 Supabase 보안 규칙 때문에 여기서 빠집니다. */
export async function getEpisodes(webtoonId: string): Promise<Omit<Episode, "image_urls">[]> {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("episodes")
    .select("id, webtoon_id, number, title, title_en, created_at, publish_at, thumbnail_url")
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
export async function searchWebtoons(query: string, lang?: "ko" | "en"): Promise<Webtoon[]> {
  const q = query.trim();
  const supabase = getPublicClient();
  if (!q || !supabase) return [];

  // % 와 _ 는 검색 기호라서 글자 그대로 찾도록 앞에 \ 를 붙임
  const escaped = q.replace(/[\\%_]/g, (c) => "\\" + c);
  // 지금 화면 언어의 웹툰 중에서 제목에 검색어가 들어간 웹툰
  let search = supabase
    .from("webtoons")
    .select(WEBTOON_WITH_LATEST_EPISODE)
    .eq("is_visible", true)
    .ilike("title", `%${escaped}%`);
  if (lang) search = search.eq("lang", lang);
  const { data, error } = await search
    .order("title", { ascending: true })
    .limit(60)
    .order("publish_at", { referencedTable: "episodes", ascending: false })
    .limit(1, { referencedTable: "episodes" });

  if (error) {
    console.error("[searchWebtoons] Supabase 읽기 실패:", error.message);
    return [];
  }
  return (data ?? []).map(withNewFlag);
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

/**
 * 광고판 목록 (메인 화면 자동 슬라이드용).
 * - Supabase가 연결 안 됐거나 하나도 없으면: site.config.ts 의 contact 글자로 광고판 1장
 * - 있으면: '보이기'로 설정된 광고판을 먼저 만든 순서대로
 */
export async function getAds(): Promise<Ad[]> {
  const { contact } = siteConfig;
  const fallback: Ad[] = [
    {
      id: "sample-ad",
      eyebrow: contact.eyebrow,
      title: contact.title,
      description: contact.description,
      link_url: null,
      is_visible: true,
      created_at: "2026-01-01T00:00:00Z",
    },
  ];

  const supabase = getPublicClient();
  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from("ads")
    .select("*")
    .eq("is_visible", true)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[getAds] Supabase 읽기 실패:", error.message);
    return fallback;
  }
  return data && data.length > 0 ? (data as Ad[]) : fallback;
}
