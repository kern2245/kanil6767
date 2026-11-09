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
  /** 올린 작가 (없으면 회장이 관리하는 웹툰) */
  artist_id?: string | null;
  /** (예전 "UP 항상 표시" 값 — 지금은 안 씀. UP 은 is_new 로 자동) */
  is_up: boolean;
  /** 가장 최근 회차를 올린 시간 (첫 화면·검색에서만 채워짐) */
  latest_episode_at?: string | null;
  /** 오늘(한국 날짜) 새 회차가 공개됐으면 true → UP 표시, 다음 날이 되면 false (lib/data.ts 에서 계산) */
  is_new?: boolean;
  /** true 면 완결 — 첫 화면에서 요일 탭 대신 "완결" 탭에만 보임 (예전 데이터엔 없을 수 있음) */
  is_completed?: boolean;
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
  /** 독자에게 공개되는 시간 (연재 요일이 아닌 날 올리면 다음 연재 요일 0시 — lib/publish-time.ts) */
  publish_at?: string;
  /** 회차 목록에 보이는 작은 대표 그림. 없으면 무프사(기본 모양) */
  thumbnail_url?: string | null;
};

/** 회원(계정) 상태 — 독자·작가가 한 계정 (artists 표)
    member: 독자(가입하면 기본, 댓글 가능) / approved: 작가(회장이 승급, 웹툰 올리기 가능)
    pending: 예전 "승인 대기" (지금은 독자와 같음) / blocked: 막힘 */
export type ArtistStatus = "member" | "pending" | "approved" | "blocked";

/** 작가 계정 (비밀번호는 빼고). supabase/schema.sql 의 artists 테이블과 같습니다. */
export type Artist = {
  id: string;
  email: string;
  name: string;
  status: ArtistStatus;
  created_at: string;
};

/** 회장 페이지에서 바꿀 수 있는 TEA TIME(연락처) 칸 글자. supabase/schema.sql 의 contact_texts 테이블과 같습니다. */
export type ContactTexts = {
  eyebrow: string;
  title: string;
  description: string;
};

/** 독자 계정 (비밀번호는 빼고). supabase/schema.sql 의 readers 테이블과 같습니다. */
export type Reader = {
  id: string;
  email: string;
  nickname: string;
};

/** 회차 댓글 한 개. supabase/schema.sql 의 comments 테이블과 같습니다. */
export type Comment = {
  id: string;
  episode_id: string;
  /** 독자가 쓴 댓글이면 독자 id (작가 댓글이면 null) */
  reader_id: string | null;
  /** 회장이 승인한 작가 계정으로 쓴 댓글이면 작가 id ("작가" 표시) */
  artist_id?: string | null;
  /** 회장이 쓴 댓글이면 true ("회장" 표시) */
  is_owner?: boolean;
  author_name: string;
  body: string;
  created_at: string;
};

/** 광고판 한 장. supabase/schema.sql 의 ads 테이블과 같습니다. */
export type Ad = {
  id: string;
  eyebrow: string | null;
  title: string;
  description: string | null;
  /** 넣으면 "자세히 보기" 버튼이 생김 */
  link_url: string | null;
  is_visible: boolean;
  created_at: string;
};
