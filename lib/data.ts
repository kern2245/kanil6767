import { sampleItems, siteConfig } from "@/site.config";
import { getPublicClient } from "@/lib/supabase";
import type { HeroTexts, Item } from "@/lib/types";

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
