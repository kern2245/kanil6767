/** 관리자 페이지에서 관리하는 카드(항목) 한 개의 모양. supabase/schema.sql 의 items 테이블과 같습니다. */
export type Item = {
  id: string;
  /** 어느 섹션에 속하는지 (예: "features") */
  section: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  /** 작은 숫자가 먼저 보임 */
  sort_order: number;
  /** false 면 사이트에서 숨김 */
  is_visible: boolean;
  created_at: string;
};

/** 관리자 페이지에서 바꿀 수 있는 히어로 글자. supabase/schema.sql 의 hero 테이블과 같습니다. */
export type HeroTexts = {
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
};

/** 연재 요일 (월~일) */
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** 요일별 목록에 보이는 웹툰 한 개. supabase/schema.sql 의 webtoons 테이블과 같습니다. */
export type Webtoon = {
  id: string;
  title: string;
  weekday: Weekday;
  cover_url: string | null;
  /** true 면 제목 앞에 UP 표시 */
  is_up: boolean;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
};

/** 웹툰 회차 한 개. supabase/schema.sql 의 episodes 테이블과 같습니다. */
export type Episode = {
  id: string;
  webtoon_id: string;
  /** 회차 번호 (1, 2, 3 ...) */
  number: number;
  title: string;
  /** 만화 그림 주소들 (위에서 아래 순서) */
  image_urls: string[];
  created_at: string;
};
